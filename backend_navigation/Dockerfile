FROM python:3.11-slim
LABEL maintainer="AssistWalk"
ENV PYTHONUNBUFFERED=1
WORKDIR /app

# OpenCV / Ultralytics ont besoin de libs systeme + curl pour le healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
        libglib2.0-0 libsm6 libxext6 libxrender1 libgl1 \
        curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# torch CPU-only : evite ~1 Go de dependances CUDA inutiles
# tirees par ultralytics (memes versions que ocr/Dockerfile)
RUN pip install --no-cache-dir \
        torch==2.3.0 torchvision==0.18.0 \
        --extra-index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r requirements.txt

COPY app_flask.py navigation_message.py ./
COPY assistwalk_vision ./assistwalk_vision

EXPOSE 5001

HEALTHCHECK --interval=15s --timeout=10s --start-period=20s --retries=3 \
    CMD curl -f http://localhost:5001/health || exit 1

CMD ["python", "app_flask.py"]
