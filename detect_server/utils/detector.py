# utils/detector.py
import cv2
import numpy as np
from ultralytics import YOLO
import time

class TrafficDetector:
    def __init__(self, model_path, conf_thresh=0.5):
        self.model = YOLO(model_path)
        self.conf_thresh = conf_thresh
        self.class_names = ['vehicle', 'accident', 'person', 'animal', 'obstacle']
        self.next_id = 0
        self.tracks = {}
        self.frame_count = 0
        self.collision_iou_thresh = 0.5 # Increased from 0.4 to reduce false positives

    def detect(self, frame):
        results = self.model(frame, conf=self.conf_thresh, verbose=False)[0]
        detections = []
        for box in results.boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
            cls = int(box.cls[0])
            conf = float(box.conf[0])
            detections.append({
                'bbox': [x1, y1, x2, y2],
                'class_id': cls,
                'class_name': self.class_names[cls],
                'confidence': conf
            })
        return detections, results.plot()

    def update_tracking(self, detections):
        new_tracks = {}
        for det in detections:
            bbox = det['bbox']
            centroid = ((bbox[0] + bbox[2]) // 2, (bbox[1] + bbox[3]) // 2)
            best_id = None
            best_iou = 0
            for tid, track in self.tracks.items():
                iou = self._compute_iou(bbox, track['last_bbox'])
                if iou > best_iou and iou > 0.3:
                    best_iou = iou
                    best_id = tid
            if best_id is None:
                best_id = self.next_id
                self.next_id += 1
                det['object_id'] = best_id
                new_tracks[best_id] = {
                    'last_bbox': bbox,
                    'last_centroid': centroid,
                    'speeds': [],
                    'frame_count': 1,
                    'last_seen': self.frame_count
                }
            else:
                det['object_id'] = best_id
                old_centroid = self.tracks[best_id]['last_centroid']
                dist = np.linalg.norm(np.array(centroid) - np.array(old_centroid))
                speed = dist
                new_tracks[best_id] = {
                    'last_bbox': bbox,
                    'last_centroid': centroid,
                    'speeds': self.tracks[best_id]['speeds'] + [speed],
                    'frame_count': self.tracks[best_id]['frame_count'] + 1,
                    'last_seen': self.frame_count
                }
        self.tracks = new_tracks
        return detections

    def detect_accident(self, detections):
        # 1. Direct YOLO accident detection
        for det in detections:
            if det['class_id'] == 1 and det['confidence'] > 0.6:
                return True, "yolo_accident", det

        # 2. Collision between any two objects (IoU based)
        # We only care about high overlap which likely indicates actual contact
        for i, a in enumerate(detections):
            for j, b in enumerate(detections):
                if i >= j:
                    continue
                iou = self._compute_iou(a['bbox'], b['bbox'])
                if iou > self.collision_iou_thresh:
                    return True, "collision", (a, b)

        # 3. Sudden stop for vehicles
        for det in detections:
            if det['class_id'] == 0 and 'object_id' in det:
                tid = det['object_id']
                if tid in self.tracks:
                    speeds = self.tracks[tid]['speeds']
                    if len(speeds) >= 5:
                        avg_speed = sum(speeds[-5:-1]) / 4
                        curr_speed = speeds[-1]
                        if avg_speed > 15 and curr_speed < avg_speed * 0.1:
                            return True, "sudden_stop", det
        return False, None, None

    def _compute_iou(self, box1, box2):
        x1 = max(box1[0], box2[0])
        y1 = max(box1[1], box2[1])
        x2 = min(box1[2], box2[2])
        y2 = min(box1[3], box2[3])
        inter = max(0, x2 - x1) * max(0, y2 - y1)
        area1 = (box1[2] - box1[0]) * (box1[3] - box1[1])
        area2 = (box2[2] - box2[0]) * (box2[3] - box2[1])
        union = area1 + area2 - inter
        return inter / union if union > 0 else 0

    def process_frame(self, frame):
        detections, annotated_frame = self.detect(frame)
        detections = self.update_tracking(detections)
        accident_detected, accident_type, accident_info = self.detect_accident(detections)
        self.frame_count += 1
        return detections, annotated_frame, accident_detected, accident_type, accident_info
