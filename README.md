# AssistWalk

Application d'assistance à la mobilité pour personnes malvoyantes.

## Prérequis
- Java 17, Docker, Flutter 3.x, Python 3.11

## Démarrage rapide

```bash
# 1. Copier les variables d'environnement
cp .env.example .env  # puis éditer .env

# 2. Lancer PostgreSQL
docker compose up -d postgres

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