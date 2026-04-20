"""
AssistWalk — Micro-service OCR
FastAPI wrapper autour du module ocr_engine.py existant.

Endpoint principal : POST /extract
  Body  : multipart/form-data  →  champ "image" (fichier image)
  Retour: {"text": str, "confidence": float}
"""

import os
import tempfile
import time

import cv2
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

# Import de la couche d'adaptation (fin de ocr_engine.py)
from ocr_engine import extract_text

app = FastAPI(
    title="AssistWalk OCR Service",
    description="Extraction de texte via Tesseract + EasyOCR",
    version="1.0.0",
)

# ── Types MIME acceptés ───────────────────────────────────
_ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/bmp"}


@app.get("/health")
def health():
    """Healthcheck pour docker-compose et Spring Boot Actuator."""
    return {"status": "ok"}


@app.post("/extract")
async def extract(image: UploadFile = File(...)):
    """
    Extrait le texte d'une image.

    - **image** : fichier image (JPEG, PNG, WebP, BMP)
    - Retourne `{"text": "...", "confidence": 0.xx}`
    """
    # ── Validation du type MIME ───────────────────────────
    if image.content_type not in _ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Type de fichier non supporté : {image.content_type}. "
                f"Types acceptés : {', '.join(sorted(_ALLOWED_TYPES))}"
            ),
        )

    # ── Lecture et validation des octets ──────────────────
    content = await image.read()
    if not content:
        raise HTTPException(status_code=400, detail="Fichier image vide.")

    # ── Sauvegarde temporaire ─────────────────────────────
    suffix = os.path.splitext(image.filename or "upload.jpg")[1] or ".jpg"
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(
                delete=False, suffix=suffix
        ) as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        # ── Vérification décodable par OpenCV ─────────────
        test_img = cv2.imread(tmp_path)
        if test_img is None:
            raise HTTPException(
                status_code=400,
                detail="Impossible de décoder l'image. Vérifiez que le fichier n'est pas corrompu.",
            )

        # ── Appel OCR ────────────────────────────────────
        t0 = time.time()
        result = extract_text(tmp_path)
        elapsed = round(time.time() - t0, 2)

        print(
            f"[API] {image.filename}  →  "
            f"conf={result['confidence']}  t={elapsed}s"
        )
        return JSONResponse(content=result)

    except HTTPException:
        raise
    except Exception as exc:
        print(f"[API ERROR] {exc}")
        raise HTTPException(
            status_code=500,
            detail=f"Erreur interne OCR : {exc}",
        )
    finally:
        # Nettoyage systématique du fichier temporaire
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)