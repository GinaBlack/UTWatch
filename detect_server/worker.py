import cv2
import numpy as np
import multiprocessing as mp
import os
import time
from utils.detector import TrafficDetector
from utils.video_classifier import VideoAccidentClassifier

def detection_worker(input_queue, output_queue, model_path, classifier_path, config):
    # Load models in the worker process
    detector = TrafficDetector(model_path, config['CONF_THRESHOLD'])
    
    device = config['DEVICE']
    classifier = VideoAccidentClassifier(
        model_path=classifier_path,
        device=device,
        frames_per_clip=config['CLASSIFIER_FRAMES'],
        img_size=(config['CLASSIFIER_IMG_SIZE'], config['CLASSIFIER_IMG_SIZE']),
        threshold=config['CLASSIFIER_THRESHOLD']
    )
    
    print(f"Worker process started on {device}")
    
    # Warmup
    dummy = np.zeros((480, 640, 3), dtype=np.uint8)
    detector.process_frame(dummy)
    print("Worker models warmed up")
    
    while True:
        try:
            item = input_queue.get()
            if item is None: 
                print("Worker received shutdown signal")
                break
            
            camera_id = item['camera_id']
            frame = item['frame']
            
            start_time = time.time()
            
            # Resizing for YOLO
            h, w = frame.shape[:2]
            target_width = config['TARGET_WIDTH']
            if w > target_width:
                new_h = int(target_width * h / w)
                frame_resized = cv2.resize(frame, (target_width, new_h))
            else:
                frame_resized = frame
            
            # YOLO detection
            yolo_start = time.time()
            detections, annotated, accident_detected, accident_type, accident_info = detector.process_frame(frame_resized)
            yolo_time = time.time() - yolo_start
            
            # Rule-based filtering: Skip if mode is 'ai' only
            if config.get('DETECTION_MODE') == 'ai':
                accident_detected = False
            
            # Accident classifier (AI)
            classifier_start = time.time()
            classifier_accident = False
            prob = 0
            classifier_ran = False
            
            # AI filtering: Run only if mode is 'ai' or 'both'
            if config.get('DETECTION_MODE') in ['ai', 'both']:
                classifier.add_frame(camera_id, frame)
                if classifier.is_ready(camera_id):
                    classifier_ran = True
                    prob = classifier.predict(camera_id)
                    if prob is not None and prob > config['CLASSIFIER_THRESHOLD']:
                        classifier_accident = True
                    classifier.clear_buffer(camera_id)
            
            classifier_time = time.time() - classifier_start
            
            # Determine accident status and details
            final_accident_detected = accident_detected or classifier_accident
            final_type = None
            final_details = ""
            
            if accident_detected:
                final_type = accident_type
                if accident_type == "collision":
                    # accident_info is (det_a, det_b)
                    a, b = accident_info
                    iou = detector._compute_iou(a['bbox'], b['bbox'])
                    final_details = f"Collision (IoU: {iou:.2f})"
                elif accident_type == "yolo_accident":
                    final_details = f"YOLO Detection (Conf: {accident_info['confidence']:.2f})"
                else:
                    final_details = f"Rule-based: {accident_type}"
            elif classifier_accident:
                final_type = "convlstm_accident"
                final_details = f"AI Classifier (Prob: {prob:.2f})"

            total_time = time.time() - start_time
            
            result = {
                'camera_id': camera_id,
                'detections': detections,
                'counts': {
                    'vehicle': sum(1 for d in detections if d['class_name'] == 'vehicle'),
                    'accident': sum(1 for d in detections if d['class_name'] == 'accident'),
                    'person': sum(1 for d in detections if d['class_name'] == 'person'),
                    'animal': sum(1 for d in detections if d['class_name'] == 'animal'),
                    'obstacle': sum(1 for d in detections if d['class_name'] == 'obstacle')
                },
                'accident_detected': final_accident_detected,
                'accident_type': final_type,
                'accident_details': final_details,
                'accident_prob': prob,
                'metrics': {
                    'yolo_time': yolo_time,
                    'classifier_time': classifier_time,
                    'classifier_ran': classifier_ran,
                    'total_time': total_time,
                    'input_queue_size': input_queue.qsize()
                }
            }
            output_queue.put(result)
            
        except Exception as e:
            print(f"Worker error for {camera_id if 'camera_id' in locals() else 'unknown'}: {e}")
