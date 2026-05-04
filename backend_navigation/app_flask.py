import os
import sys
import cv2
import numpy as np
from flask import Flask, request

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(BASE_DIR, "assistwalk_vision"))

from src.step3_yolo_detection import YOLODetector
from src.step4_filtering import filter_objects
from navigation_message import generate_navigation_message

app = Flask(__name__)

model_path = os.path.join(
    BASE_DIR,
    "assistwalk_vision",
    "models",
    "yolov8n.pt"
)

print("Chargement du modèle navigation...")
detector = YOLODetector(model_name=model_path)
print("✅ Backend navigation prêt")


@app.route("/navigation/detect", methods=["POST"])
def detect_navigation():
    if "image" not in request.files:
        return "No image received", 400

    file = request.files["image"]
    image_bytes = np.frombuffer(file.read(), np.uint8)
    frame = cv2.imdecode(image_bytes, cv2.IMREAD_COLOR)

    if frame is None:
        return "Invalid image", 400

    try:
        raw_objects = detector.detect(frame)
        filtered_objects = filter_objects(raw_objects)

        message = generate_navigation_message(
            filtered_objects,
            frame.shape
        )

        return message, 200

    except Exception as e:
        print("[NAV ERROR]", e)
        return "Navigation analysis error", 500


@app.route("/health", methods=["GET"])
def health():
    return "OK", 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)