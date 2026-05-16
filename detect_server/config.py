import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "model", "best2.pt")   #  trained model

CONF_THRESHOLD = 0.3
IOU_THRESHOLD = 0.45
IMG_SIZE = 640

COLLISION_IOU_THRESH = 0.9
SPEED_DROP_THRESH = 0.9
OBSTACLE_PERSIST_FRAMES = 20

# Detection Mode: 'ai', 'rulebased', or 'both'
DETECTION_MODE = 'ai'

CLASSIFIER_MODEL_PATH = os.path.join(BASE_DIR, "model", "best_accident_classifier.pth") # accident classifier
CLASSIFIER_THRESHOLD = 0.5
CLASSIFIER_FRAMES = 40
CLASSIFIER_IMG_SIZE = 320

HOST = '0.0.0.0'
PORT = 5000
