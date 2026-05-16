# utils/alert.py
import json
import os
from datetime import datetime

ALERT_LOG_FILE = "alerts.jsonl" # Use JSONL for faster appends

def log_alert(alert_data):
    alert_data['timestamp'] = datetime.now().isoformat()
    try:
        with open(ALERT_LOG_FILE, 'a') as f:
            f.write(json.dumps(alert_data) + '\n')
    except Exception as e:
        print(f"Error logging alert: {e}")