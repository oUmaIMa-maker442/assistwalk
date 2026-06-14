# AssistWalk

Application d'assistance à la mobilité pour personnes malvoyantes.

## Prérequis
- Java 17, Docker, Flutter 3.x, Python 3.11

## Démarrage rapide (tout en Docker)

```bash
# 1. Copier les variables d'environnement
cp .env.example .env          # puis éditer .env
cp ocr/.env.example ocr/.env  # puis éditer ocr/.env (clé Groq, etc.)

# 2. Lancer toute la stack
cd docker && docker compose up -d --build
```

Services exposés :
- `web` (front admin) : http://localhost:3000
- `backend` (Spring Boot) : http://localhost:8081
- `ocr-service` (FastAPI) : http://localhost:8000
- `backend-navigation` (Flask) : http://localhost:5001
- `postgres` : localhost:5432

```bash
# (Dev B) Lancer l'app mobile
cd mobile && flutter run
```

## Démarrage rapide (dev local, sans Docker pour le backend)

```bash
# 1. Copier les variables d'environnement
cp .env.example .env  # puis éditer .env

# 2. Lancer PostgreSQL + OCR
cd docker && docker compose up -d postgres ocr-service

# 3. Lancer le backend
cd backend && ./mvnw spring-boot:run

# 4. (Dev B) Lancer l'app mobile
cd mobile && flutter run
```

## Équipe
- Dev A : Backend + OCR
- Dev B : Mobile + Web

## Documentation API
Voir [docs/api.md](docs/api.md)