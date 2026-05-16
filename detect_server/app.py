import cv2
import numpy as np
import os
import time
import multiprocessing as mp
import threading
import json
from datetime import datetime
from collections import deque
from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit

from config import (
    MODEL_PATH, CONF_THRESHOLD, HOST, PORT,
    CLASSIFIER_MODEL_PATH, CLASSIFIER_THRESHOLD,
    CLASSIFIER_FRAMES, CLASSIFIER_IMG_SIZE,
    DETECTION_MODE
)
from utils.alert import log_alert
from worker import detection_worker

# ------------------------------------------------------------
# Configuration
# ------------------------------------------------------------
FRAME_SKIP = 1
TARGET_WIDTH = 640
JPEG_QUALITY = 50

app = Flask(__name__)
app.config['SECRET_KEY'] = 'utwatch_secret'
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading', ping_timeout=60, ping_interval=25)

# ---------- System Stats Tracker ----------
class StatsTracker:
    def __init__(self):
        self.total_vehicles = 0
        self.total_accidents = 0
        self.total_persons = 0
        self.start_time = datetime.now()
        self.camera_stats = {} # cam_id -> counts
        self.density_history = deque(maxlen=60) # Last 60 minutes/intervals
        self.detection_history = deque(maxlen=60)
        self.lock = threading.Lock()

    def update(self, result):
        with self.lock:
            cam_id = result['camera_id']
            counts = result['counts']
            
            # Cumulative
            self.total_vehicles += counts.get('vehicle', 0)
            self.total_accidents += counts.get('accident', 0)
            self.total_persons += counts.get('person', 0)
            
            # Per camera
            self.camera_stats[cam_id] = counts
            
            # History for charts
            now = datetime.now().strftime("%H:%M:%S")
            self.density_history.append({"time": now, "value": sum(counts.values())})
            self.detection_history.append({
                "time": now, 
                "vehicle": counts.get('vehicle', 0),
                "person": counts.get('person', 0),
                "accident": counts.get('accident', 0)
            })

    def get_summary(self):
        with self.lock:
            return {
                "total_vehicles": self.total_vehicles,
                "total_accidents": self.total_accidents,
                "total_persons": self.total_persons,
                "uptime": str(datetime.now() - self.start_time).split('.')[0],
                "active_cameras": len(self.camera_stats),
                "density_history": list(self.density_history),
                "detection_history": list(self.detection_history),
                "camera_breakdown": self.camera_stats
            }

stats_tracker = StatsTracker()

# ---------- Multiprocessing Setup ----------
input_queue = None
output_queue = None
current_detection_mode = DETECTION_MODE

def get_worker_config():
    return {
        'CONF_THRESHOLD': CONF_THRESHOLD,
        'DEVICE': 'cuda' if os.environ.get('CUDA_VISIBLE_DEVICES') else 'cpu',
        'CLASSIFIER_FRAMES': CLASSIFIER_FRAMES,
        'CLASSIFIER_IMG_SIZE': CLASSIFIER_IMG_SIZE,
        'CLASSIFIER_THRESHOLD': CLASSIFIER_THRESHOLD,
        'TARGET_WIDTH': TARGET_WIDTH,
        'JPEG_QUALITY': JPEG_QUALITY,
        'DETECTION_MODE': current_detection_mode
    }

# ---------- Result Relay ----------
fps_stats = {
    'count': 0,
    'start_time': time.time(),
    'current_fps': 0
}

def result_relay():
    print("Background relay thread started")
    global fps_stats
    
    while True:
        try:
            if output_queue:
                try:
                    result = output_queue.get(timeout=0.1)
                except:
                    continue
                
                # Update Stats
                stats_tracker.update(result)
                
                # Update FPS
                fps_stats['count'] += 1
                now = time.time()
                elapsed = now - fps_stats['start_time']
                if elapsed >= 1.0:
                    fps_stats['current_fps'] = fps_stats['count'] / elapsed
                    fps_stats['count'] = 0
                    fps_stats['start_time'] = now
                
                metrics = result.get('metrics', {})
                metrics['fps'] = fps_stats['current_fps']
                # Emit detection result
                socketio.emit('detection_result', {
                    'camera_id': result['camera_id'],
                    'detections': result.get('detections', []),
                    'counts': result.get('counts', {}),
                    'metrics': metrics
                })

                # Periodically emit global stats
                if fps_stats['count'] % 5 == 0: # Every few results
                    socketio.emit('stats_update', stats_tracker.get_summary())

                
                if result.get('accident_detected'):
                    alert_payload = {
                        'type': result['accident_type'],
                        'details': result.get('accident_details', 'N/A'),
                        'camera_id': result['camera_id'],
                        'timestamp': time.time()
                    }
                    log_alert(alert_payload)
                    socketio.emit('accident_alert', alert_payload)
            else:
                time.sleep(1)
        except Exception as e:
            print(f"Error in relay thread: {e}")
            time.sleep(1)

@socketio.on('connect')
def handle_connect():
    print(f'Client connected: {request.sid}')
    emit('connected', {'status': 'ok', 'detection_mode': current_detection_mode})

@socketio.on('frame')
def handle_frame(data):
    if input_queue is None:
        return
    camera_id = data.get('camera_id')
    image_data = data.get('image')
    if not camera_id or not image_data: return
    try:
        np_arr = np.frombuffer(image_data, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if frame is not None:
            try:
                input_queue.put_nowait({'camera_id': camera_id, 'frame': frame})
            except: pass
    except Exception as e:
        print(f"Error handling frame: {e}")

@socketio.on('request_initial_state')
def send_initial_state():
    emit('initial_state', {
        'supported_classes': ['vehicle', 'accident', 'person', 'animal', 'obstacle'],
        'conf_threshold': CONF_THRESHOLD,
        'detection_mode': current_detection_mode,
        'stats': stats_tracker.get_summary()
    })

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS'
    return response

@app.route('/api/alerts')
def get_alerts():
    if not os.path.exists("alerts.jsonl"):
        return {"alerts": []}
    alerts = []
    with open("alerts.jsonl", "r") as f:
        for line in f:
            if line.strip():
                alerts.append(json.loads(line))
    return {"alerts": alerts[::-1][:50]}

@app.route('/api/alerts/clear', methods=['POST'])
def clear_alerts():
    global stats_tracker
    try:
        # 1. Clear the file
        if os.path.exists("alerts.jsonl"):
            os.remove("alerts.jsonl")
        
        # 2. Reset cumulative accident stats in tracker
        with stats_tracker.lock:
            stats_tracker.total_accidents = 0
            # We don't reset vehicles/persons as they are session-wide traffic flow
        
        return jsonify({"status": "success", "message": "Alert history cleared"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/metrics')
def get_metrics():
    return jsonify(stats_tracker.get_summary())

@app.route('/api/settings', methods=['GET', 'POST'])
def handle_settings():
    global current_detection_mode
    if request.method == 'POST':
        data = request.json
        mode = data.get('detection_mode')
        if mode in ['ai', 'rulebased', 'both']:
            current_detection_mode = mode
            print(f"Setting detection mode to: {mode}")
            return jsonify({"status": "success", "detection_mode": current_detection_mode})
        return jsonify({"status": "error", "message": "Invalid mode"}), 400
    
    return jsonify({
        "detection_mode": current_detection_mode,
        "conf_threshold": CONF_THRESHOLD,
        "iou_threshold": COLLISION_IOU_THRESH if 'COLLISION_IOU_THRESH' in locals() else 0.5
    })

@app.route('/')
def index():
    return "UTWatch Backend Optimized (Threading) Running"

if __name__ == '__main__':
    manager = mp.Manager()
    input_queue = manager.Queue(maxsize=15)
    output_queue = manager.Queue(maxsize=15)
    
    p = mp.Process(target=detection_worker, args=(
        input_queue, output_queue, MODEL_PATH, CLASSIFIER_MODEL_PATH, get_worker_config()
    ))
    p.daemon = True
    p.start()
    print(f"Started worker process PID: {p.pid}")
    
    relay_thread = threading.Thread(target=result_relay, daemon=True)
    relay_thread.start()
    
    socketio.run(app, host=HOST, port=PORT, debug=False)
