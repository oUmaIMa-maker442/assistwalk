
# step3_yolo_detection.py
import os
USE_84CLS_MODEL = False
MODELS_DIR = "models"
os.makedirs(MODELS_DIR, exist_ok=True)

# ASSISTWALK_MODEL=new  -> modèle 84 classes : phase2_best.pt
# ASSISTWALK_MODEL=old  -> ancien modèle COCO : yolov8n.pt

print(
    f"[YOLO] Modèle actif : "
    f"{'84 classes (nouveau .pt)' if USE_84CLS_MODEL else '80 classes (ancien)'}"
)


class PTDetector:
    def __init__(self, model_path, confidence=0.05):
        from ultralytics import YOLO

        print(f"[Étape 3] Chargement YOLO : {model_path}...")
        self.model = YOLO(model_path)
        self.confidence = confidence
        self.names = self.model.names
        print("[Étape 3] YOLO prêt ✓")

    def detect(self, frame):
        results = self.model(frame, verbose=False)[0]
        detected = []

        for box in results.boxes:
            conf = float(box.conf)

            if conf >= self.confidence:
                detected.append(
                    {
                        "class": self.model.names[int(box.cls)],
                        "bbox": tuple(map(int, box.xyxy[0])),
                        "confidence": round(conf, 2),
                    }
                )

        return detected


class YOLODetector:
    def __init__(self, model_name="phase2_best.pt", confidence=0.05):
        """
        model_name : nom du fichier modèle .pt
        Par défaut : phase2_best.pt
        """

        if USE_84CLS_MODEL:
            model_path = os.path.join(MODELS_DIR, "phase2_best.pt")
        else:
            model_path = os.path.join(MODELS_DIR, model_name)

        if not os.path.exists(model_path):
            alt_path = model_name

            if os.path.exists(alt_path):
                model_path = alt_path
            else:
                raise FileNotFoundError(
                    f"Modèle introuvable : {model_path}\n"
                    f"Place le fichier .pt dans : {MODELS_DIR}/\n"
                    f"Exemple attendu : {MODELS_DIR}/yolov8n.pt"
                )

        self._impl = PTDetector(model_path, confidence)

    def detect(self, frame):
        return self._impl.detect(frame)