# test_backend_local.py
import cv2
import torch
import numpy as np
import os
import time
import argparse
from collections import deque
from pathlib import Path

# Add the backend directory to path so we can import utils
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import MODEL_PATH, CONF_THRESHOLD, CLASSIFIER_MODEL_PATH, CLASSIFIER_THRESHOLD, CLASSIFIER_FRAMES, CLASSIFIER_IMG_SIZE
from utils.detector import TrafficDetector
from utils.video_classifier import VideoAccidentClassifier

def parse_args():
    parser = argparse.ArgumentParser(description='Test UTWatch backend locally')
    parser.add_argument('--video', type=str, default=None, help='Path to video file. If not provided, webcam will be used.')
    parser.add_argument('--no-classifier', action='store_true', help='Disable accident classifier (YOLO only)')
    parser.add_argument('--fps', type=int, default=5, help='Target processing FPS (default: 5)')
    parser.add_argument('--skip', type=int, default=2, help='Process every Nth frame (default: 2)')
    return parser.parse_args()

def main():
    args = parse_args()

    # ---------- Load YOLO ----------
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"YOLO model not found: {MODEL_PATH}")
    detector = TrafficDetector(MODEL_PATH, CONF_THRESHOLD)
    print(f"YOLO model loaded from {MODEL_PATH}")

    # ---------- Load classifier (if enabled) ----------
    classifier = True
    if not args.no_classifier and os.path.exists(CLASSIFIER_MODEL_PATH):
        classifier = VideoAccidentClassifier(
            model_path=CLASSIFIER_MODEL_PATH,
            device='cpu',
            frames_per_clip=CLASSIFIER_FRAMES,
            img_size=(CLASSIFIER_IMG_SIZE, CLASSIFIER_IMG_SIZE),
            threshold=CLASSIFIER_THRESHOLD
        )
        print(f"Accident classifier loaded from {CLASSIFIER_MODEL_PATH}")
    elif not args.no_classifier:
        print("Classifier model not found. Running YOLO only.")
    else:
        print("Classifier disabled by flag.")

    # ---------- Open video source ----------
    if args.video and os.path.exists(args.video):
        cap = cv2.VideoCapture(args.video)
        print(f"Playing video: {args.video}")
    else:
        cap = cv2.VideoCapture(0)   # webcam
        print("No video file provided or file not found. Using webcam (index 0).")

    if not cap.isOpened():
        raise RuntimeError("Could not open video source.")

    # ---------- Processing settings ----------
    target_fps = args.fps
    frame_delay = 1.0 / target_fps if target_fps > 0 else 0
    skip_frames = args.skip
    frame_counter = 0

    # For classifier buffer (if enabled)
    buffer = deque(maxlen=CLASSIFIER_FRAMES) if classifier else None
    prev_time = time.time()
    inference_times = []

    print("\n=== Starting detection. Press 'q' to quit. ===\n")

    while True:
        ret, frame = cap.read()
        if not ret:
            print("End of video.")
            break

        frame_counter += 1
        if frame_counter % skip_frames != 0:
            # Still show the raw frame but skip processing
            cv2.imshow("UTWatch Test (raw)", frame)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
            continue

        # --- YOLO detection ---
        start = time.time()
        detections, annotated_frame, accident_detected, accident_type, accident_info = detector.process_frame(frame)
        inference_time = time.time() - start
        inference_times.append(inference_time)

        # --- Classifier buffer & prediction (if enabled) ---
        prob = None
        if classifier is not None:
            # Add frame to buffer (use original frame, not annotated)
            classifier.add_frame("test", frame)
            if classifier.is_ready("test"):
                prob = classifier.predict("test")
                if prob is not None and prob > CLASSIFIER_THRESHOLD:
                    # Draw red label on annotated frame
                    cv2.putText(annotated_frame, f"ACCIDENT! ({prob:.2f})", (10, 60),
                                cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
                    print(f"⚠️  ACCIDENT DETECTED! Probability: {prob:.2f}")
                classifier.clear_buffer("test")

        # --- Overlay stats on annotated frame ---
        vehicle_count = sum(1 for d in detections if d['class_name'] == 'vehicle')
        person_count = sum(1 for d in detections if d['class_name'] == 'person')
        animal_count = sum(1 for d in detections if d['class_name'] == 'animal')
        obstacle_count = sum(1 for d in detections if d['class_name'] == 'obstacle')
        accident_count = sum(1 for d in detections if d['class_name'] == 'accident')

        cv2.putText(annotated_frame, f"Vehicles: {vehicle_count}  Persons: {person_count}", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
        cv2.putText(annotated_frame, f"Animals: {animal_count}  Obstacles: {obstacle_count}  Accidents: {accident_count}", (10, 55),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
        cv2.putText(annotated_frame, f"Inference: {inference_time*1000:.1f} ms", (10, 80),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 0), 1)
        if prob is not None:
            cv2.putText(annotated_frame, f"Classifier: {prob:.2f}", (10, 100),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1)

        # --- Display ---
        cv2.imshow("UTWatch Test", annotated_frame)

        # --- Control FPS ---
        elapsed = time.time() - prev_time
        if elapsed < frame_delay:
            time.sleep(frame_delay - elapsed)
        prev_time = time.time()

        # --- Quit on 'q' ---
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    # --- Cleanup and summary ---
    cap.release()
    cv2.destroyAllWindows()
    if inference_times:
        avg = np.mean(inference_times) * 1000
        std = np.std(inference_times) * 1000
        print(f"\n=== Statistics ===")
        print(f"Average YOLO inference time: {avg:.1f} ms ± {std:.1f} ms")
        print(f"Processed {len(inference_times)} frames (skipping {skip_frames-1} between).")
        if target_fps > 0:
            print(f"Target FPS: {target_fps}, achieved ~{1.0/avg*1000:.1f} FPS on YOLO alone.")
    else:
        print("No frames processed.")

if __name__ == "__main__":
    main()
    