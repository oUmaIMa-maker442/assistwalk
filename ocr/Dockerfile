# ─────────────────────────────────────────────────────────
# AssistWalk — Dockerfile OCR micro-service
# Image de base : python:3.11-slim (Debian Bookworm)
# ─────────────────────────────────────────────────────────

FROM python:3.11-slim

# ── Métadonnées ───────────────────────────────────────────
LABEL maintainer="AssistWalk"
LABEL description="Micro-service OCR : Tesseract + EasyOCR via FastAPI"

# ── Variables d'environnement ─────────────────────────────
# Chemin Tesseract dans le conteneur (Linux)
ENV TESSERACT_CMD=/usr/bin/tesseract
# Pas de buffering Python → logs visibles en temps réel
ENV PYTHONUNBUFFERED=1
# EasyOCR stocke ses modèles ici — monté en volume optionnel
# pour éviter de re-télécharger à chaque redémarrage
ENV EASYOCR_MODULE_PATH=/root/.EasyOCR

WORKDIR /app

# ── Dépendances système ───────────────────────────────────
# tesseract-ocr       : moteur principal
# tesseract-ocr-fra   : données de langue française
# tesseract-ocr-eng   : données de langue anglaise
# tesseract-ocr-ara   : données de langue arabe
# libglib2.0-0        : requis par OpenCV
# libsm6 libxext6 libxrender1 : bibliothèques X11 minimales
#                               (opencv-python-headless en a quand même besoin)
# curl                : utilisé par le healthcheck Docker
RUN apt-get update && apt-get install -y --no-install-recommends \
        tesseract-ocr \
        tesseract-ocr-fra \
        tesseract-ocr-eng \
        tesseract-ocr-ara \
        libglib2.0-0 \
        libsm6 \
        libxext6 \
        libxrender1 \
        curl \
    && rm -rf /var/lib/apt/lists/*

# ── Dépendances Python ────────────────────────────────────
# Copie du requirements.txt seul d'abord → cache Docker
# invalidé uniquement si les dépendances changent
COPY requirements.txt .

# torch CPU-only : réduit la taille de l'image (~1,5 Go de moins)
# Le flag --extra-index-url est nécessaire pour l'artefact CPU
RUN pip install --no-cache-dir \
        torch==2.3.0 torchvision==0.18.0 \
        --extra-index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r requirements.txt

# ── Code applicatif ───────────────────────────────────────
COPY ocr_engine.py .
COPY main.py .

# ── Préchargement des modèles EasyOCR ────────────────────
# Exécuté au build → les modèles sont dans l'image, pas
# téléchargés à chaque démarrage du conteneur.
# Si vous préférez un volume externe, supprimez cette ligne
# et montez $EASYOCR_MODULE_PATH dans docker-compose.
RUN python - <<'EOF'
import easyocr
print("[BUILD] Préchargement EasyOCR fr+en...")
easyocr.Reader(['fr', 'en'], gpu=False)
print("[BUILD] Préchargement EasyOCR ar...")
easyocr.Reader(['ar'], gpu=False)
print("[BUILD] Modèles EasyOCR prêts.")
EOF

EXPOSE 8000

# ── Healthcheck ───────────────────────────────────────────
HEALTHCHECK --interval=15s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]