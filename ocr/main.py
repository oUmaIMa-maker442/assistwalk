"""
AssistWalk OCR — Groq Vision + OCR.space + Local fallback

Priorité :
1. Groq Vision API
2. OCR.space API
3. OCR local ocr_engine.py
"""

import base64
import os
import tempfile
import time

import cv2
import requests
from dotenv import load_dotenv
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse

from ocr_engine import extract_text

load_dotenv()

app = FastAPI(
    title="AssistWalk OCR Service",
    description="Groq Vision OCR with OCR.space and local fallback",
    version="3.0.0",
)

USE_GROQ = os.getenv("USE_GROQ", "true").lower() == "true"
USE_OCR_SPACE = os.getenv("USE_OCR_SPACE", "false").lower() == "true"

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = os.getenv("GROQ_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct")

OCR_SPACE_KEY = os.getenv("OCR_SPACE_KEY", "helloworld")
OCR_SPACE_URL = "https://api.ocr.space/parse/image"

_ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/bmp"}


@app.get("/health")
def health():
    return {"status": "ok"}


def _image_to_base64_data_url(image_path: str) -> str:
    ext = os.path.splitext(image_path)[1].lower()
    mime = "image/jpeg"

    if ext == ".png":
        mime = "image/png"
    elif ext == ".webp":
        mime = "image/webp"
    elif ext == ".bmp":
        mime = "image/bmp"

    with open(image_path, "rb") as f:
        encoded = base64.b64encode(f.read()).decode("utf-8")

    return f"data:{mime};base64,{encoded}"


def extract_with_groq(image_path: str) -> dict:
    if not GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY missing")

    image_url = _image_to_base64_data_url(image_path)

    payload = {
        "model": GROQ_MODEL,
        "temperature": 0,
        "max_tokens": 800,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are an OCR engine for an accessibility app. "
                    "Extract ONLY the readable text from the image. "
                    "Keep line breaks. Do not explain. "
                    "Support French, English, and Arabic. "
                    "If no readable text exists, return: No text detected."
                ),
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": "Read all visible text in this image exactly as possible.",
                    },
                    {
                        "type": "image_url",
                        "image_url": {"url": image_url},
                    },
                ],
            },
        ],
    }

    response = requests.post(
        GROQ_URL,
        headers={
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=25,
    )

    if response.status_code != 200:
        raise RuntimeError(f"Groq HTTP {response.status_code}: {response.text[:300]}")

    data = response.json()
    text = data["choices"][0]["message"]["content"].strip()

    if not text:
        raise RuntimeError("Groq returned empty text")

    return {
        "text": text,
        "confidence": 0.98,
        "source": "groq",
    }


def extract_with_ocr_space(image_path: str) -> dict:
    with open(image_path, "rb") as f:
        response = requests.post(
            OCR_SPACE_URL,
            files={"file": f},
            data={
                "apikey": OCR_SPACE_KEY,
                "language": "auto",
                "OCREngine": 3,
                "scale": True,
                "detectOrientation": True,
            },
            timeout=12,
        )

    if response.status_code != 200:
        raise RuntimeError(f"OCR.space HTTP {response.status_code}")

    data = response.json()

    if data.get("IsErroredOnProcessing"):
        raise RuntimeError(str(data.get("ErrorMessage") or data.get("ErrorDetails")))

    parsed = data.get("ParsedResults", [])
    if not parsed:
        raise RuntimeError("OCR.space returned no result")

    text = parsed[0].get("ParsedText", "").strip()

    if not text:
        raise RuntimeError("OCR.space returned empty text")

    return {
        "text": text,
        "confidence": 0.95,
        "source": "ocr_space",
    }


def extract_with_local(image_path: str) -> dict:
    result = extract_text(image_path)
    result["source"] = "local"
    return result


@app.post("/extract")
async def extract(image: UploadFile = File(...)):
    if image.content_type not in _ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid image type: {image.content_type}",
        )

    content = await image.read()

    if not content:
        raise HTTPException(status_code=400, detail="Empty image")

    suffix = os.path.splitext(image.filename or "upload.jpg")[1] or ".jpg"
    tmp_path = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        if cv2.imread(tmp_path) is None:
            raise HTTPException(status_code=400, detail="Invalid image")

        t0 = time.time()

        if USE_GROQ:
            try:
                result = extract_with_groq(tmp_path)
                print(f"[GROQ OCR] {time.time() - t0:.2f}s")
                return JSONResponse(result)
            except Exception as e:
                print(f"[GROQ FAILED] {e}")

        if USE_OCR_SPACE:
            try:
                result = extract_with_ocr_space(tmp_path)
                print(f"[OCR.SPACE] {time.time() - t0:.2f}s")
                return JSONResponse(result)
            except Exception as e:
                print(f"[OCR.SPACE FAILED] {e}")

        try:
            result = extract_with_local(tmp_path)
            print(f"[LOCAL OCR] {time.time() - t0:.2f}s")
            return JSONResponse(result)
        except Exception as e:
            print(f"[LOCAL FAILED] {e}")

        return JSONResponse(
            {
                "text": "OCR failed",
                "confidence": 0.0,
                "source": "none",
            },
            status_code=500,
        )

    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)