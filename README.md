# AssistWalk

**Plateforme intelligente d'assistance à la mobilité pour personnes malvoyantes**

AssistWalk combine vision par ordinateur, reconnaissance de texte et communication temps réel pour aider les personnes malvoyantes à se déplacer en autonomie, tout en gardant leurs accompagnateurs informés en cas de besoin.

---

## Sommaire

- [Aperçu du projet](#aperçu-du-projet)
- [Fonctionnalités principales](#fonctionnalités-principales)
- [Architecture](#architecture)
- [Stack technique](#stack-technique)
- [Modèle IA — Fine-tuning YOLOv8](#modèle-ia--fine-tuning-yolov8)
- [Prérequis](#prérequis)
- [Démarrage rapide avec Docker](#démarrage-rapide-avec-docker)
- [Démarrage en développement local](#démarrage-en-développement-local)
- [Variables d'environnement](#variables-denvironnement)
- [Structure du projet](#structure-du-projet)
- [Documentation API](#documentation-api)
- [Licence](#licence)

---

## Aperçu du projet

Les personnes malvoyantes font face à des difficultés quotidiennes pour détecter les obstacles, lire des documents ou alerter rapidement un proche en cas de danger. AssistWalk propose une réponse complète à ces problématiques à travers trois interfaces complémentaires :

- une **application mobile** (Flutter) pour la personne malvoyante : détection d'obstacles en temps réel, lecture de texte (OCR) et déclenchement d'alertes SOS ;
- un **dashboard web** (React) pour les accompagnateurs : suivi en temps réel sur carte, réception des alertes ;
- un **espace d'administration** (React) : gestion des utilisateurs, des associations et des tickets de support.

---

## Fonctionnalités principales

| Fonctionnalité | Description |
|---|---|
| Détection d'obstacles | Modèle YOLOv8 fine-tuné, exécuté en temps réel sur le flux caméra |
| Reconnaissance de texte (OCR) | Lecture de documents et panneaux via Tesseract, EasyOCR et Groq Vision API |
| Alertes SOS | Notification instantanée de l'accompagnateur via WebSocket, push FCM et email |
| Suivi en temps réel | Géolocalisation affichée sur carte côté accompagnateur |
| Gestion des comptes | Authentification JWT, rôles (malvoyant / accompagnateur / administrateur), mot de passe temporaire à la création |
| Support utilisateur | Système de tickets intégré entre accompagnateurs et administrateurs |

---

## Architecture

AssistWalk repose sur une architecture en microservices conteneurisés, exposés derrière une passerelle Nginx unique :

```
                         ┌────────────────────────────────────────┐
   Mobile / Navigateur ─▶│        Gateway Nginx (port 80)          │
                         └───────────────┬──────────────────────────┘
                                         │
        ┌───────────────┬───────────────┼───────────────┐
        │               │               │               │
   ┌──────────┐   ┌─────────────┐  ┌─────────────┐  ┌───────────┐
   │   web    │   │   backend   │  │  navigation  │  │    ocr    │
   │ (React)  │   │(Spring Boot)│  │(Flask+YOLOv8)│  │ (FastAPI) │
   └──────────┘   └──────┬──────┘  └─────────────┘  └─────┬─────┘
                          │                                 │
                    ┌─────▼─────┐                    ┌──────▼──────┐
                    │ PostgreSQL │                    │ Groq Vision │
                    └───────────┘                    │   API (ext) │
                                                       └─────────────┘
```

Le gateway Nginx constitue le **point d'entrée unique** du système : il route chaque requête vers le microservice concerné en fonction du préfixe de chemin (`/api`, `/auth`, `/navigation`, `/ocr`, `/ws`), simplifiant ainsi la configuration côté client (mobile et web) qui n'a besoin de connaître qu'une seule adresse.

| Service | Technologie | Rôle |
|---|---|---|
| `gateway` | Nginx | Reverse proxy, point d'entrée unique |
| `web` | React + Vite | Dashboard accompagnateur / administration |
| `backend` | Spring Boot | API principale : auth, utilisateurs, alertes, WebSocket |
| `backend-navigation` | Flask + YOLOv8 | Détection d'obstacles en temps réel |
| `ocr-service` | FastAPI | Reconnaissance de texte (OCR) |
| `postgres` | PostgreSQL 16 | Base de données relationnelle |

---

## Stack technique

**Backend** — Spring Boot, PostgreSQL, JWT, WebSocket (STOMP)
**Intelligence artificielle** — YOLOv8 (Ultralytics), Flask, OpenCV, FastAPI, Tesseract OCR, EasyOCR, Groq Vision API
**Frontend web** — React, Vite
**Mobile** — Flutter
**Infrastructure** — Docker, Docker Compose, Nginx
**Outils** — Git/GitHub, Postman, draw.io

---

## Modèle IA — Fine-tuning YOLOv8

Le modèle de détection d'obstacles utilisé par le service `backend-navigation` est un **YOLOv8 fine-tuné** sur un jeu de données personnalisé, ciblant des classes d'obstacles pertinentes pour la mobilité d'une personne malvoyante, notamment :

- **escaliers** (`stairs`)
- **portes** (`doors`)
- obstacles urbains complémentaires

Le fine-tuning a permis d'améliorer significativement la précision de détection sur ces classes spécifiques par rapport au modèle YOLOv8 pré-entraîné de base, mieux adapté aux contraintes réelles d'usage (angles de vue bas, conditions de luminosité variables, environnements intérieurs et extérieurs).

---

## Prérequis

- [Docker](https://www.docker.com/) et Docker Compose
- [Flutter](https://flutter.dev/) 3.x (pour l'application mobile)
- Java 17 et Python 3.11 (uniquement requis en développement local sans Docker)

---

## Démarrage rapide avec Docker

L'ensemble de la stack (base de données, backend, microservices IA, frontend web et gateway) est conteneurisé et s'exécute avec une seule commande.

### 1. Configuration des variables d'environnement

```bash
cp .env.example .env
cp ocr/.env.example ocr/.env
```

Éditez `.env` et `ocr/.env` afin de renseigner vos identifiants (base de données, secret JWT, clé API Groq, etc.).

### 2. Lancement de la stack complète

```bash
cd docker
docker compose up -d --build
```

### 3. Vérification

```bash
docker compose ps
```

Tous les conteneurs doivent afficher un statut `running` (et `healthy` pour `postgres` et `gateway`).

### Accès aux services

| Service | URL |
|---|---|
| Application web | http://localhost (via le gateway) |
| API Backend | http://localhost/api |
| Service OCR | http://localhost/ocr |
| Service Navigation | http://localhost/navigation |

> En accès direct (sans passer par le gateway), les services restent également exposés sur leurs ports respectifs : `web` (3000), `backend` (8081), `ocr-service` (8000), `backend-navigation` (5001), `postgres` (5432).

### Arrêt de la stack

```bash
docker compose down
```

Pour supprimer également les volumes (réinitialisation complète de la base de données) :

```bash
docker compose down -v
```

### Lancement de l'application mobile

```bash
cd mobile
flutter pub get
flutter run --dart-define=GATEWAY_HOST=<IP_DE_VOTRE_MACHINE>
```

Remplacez `<IP_DE_VOTRE_MACHINE>` par l'adresse IP locale de la machine exécutant `docker compose` (le téléphone et l'ordinateur doivent être connectés au même réseau).

---

## Démarrage en développement local

Pour le développement actif du backend sans reconstruire l'image Docker à chaque modification :

```bash
# 1. Variables d'environnement
cp .env.example .env

# 2. Démarrer uniquement la base de données et les microservices IA
cd docker
docker compose up -d postgres ocr-service backend-navigation

# 3. Lancer le backend en local
cd ../backend
./mvnw spring-boot:run

# 4. Lancer le frontend web en local
cd ../web
npm install
npm run dev

# 5. Lancer l'application mobile
cd ../mobile
flutter run
```

---

## Variables d'environnement

| Variable | Description | Exemple |
|---|---|---|
| `POSTGRES_DB` | Nom de la base de données | `assistwalk` |
| `POSTGRES_USER` | Utilisateur PostgreSQL | `assistwalk_user` |
| `POSTGRES_PASSWORD` | Mot de passe PostgreSQL | — |
| `JWT_SECRET` | Clé secrète de signature des jetons JWT | — |
| `JWT_EXPIRATION_MS` | Durée de validité du token (session normale) | `28800000` (8h) |
| `JWT_EXPIRATION_REMEMBER_MS` | Durée de validité du token ("rester connecté") | `2592000000` (30j) |
| `FRONTEND_URL` | URL du frontend, utilisée pour les liens dans les emails | `http://localhost` |
| `OCR_SERVICE_URL` | URL interne du service OCR (résolue automatiquement en Docker) | `http://ocr-service:8000` |

Le détail complet des variables requises pour le service OCR (clé API Groq, etc.) figure dans `ocr/.env.example`.

---

## Structure du projet

```
assistwalk/
├── backend/                # API principale — Spring Boot
├── backend-navigation/     # Détection d'obstacles — Flask + YOLOv8
├── ocr/                    # Reconnaissance de texte — FastAPI
├── web/                    # Dashboard accompagnateur / admin — React
├── mobile/                 # Application mobile — Flutter
├── docker/
│   ├── docker-compose.yml
│   └── gateway/             # Configuration du reverse proxy Nginx
├── docs/
│   └── api.md
├── .env.example
└── README.md
```

---

## Documentation API

La documentation détaillée des endpoints de l'API est disponible dans [docs/api.md](docs/api.md).

---

## Licence

Projet développé dans le cadre d'un projet de fin d'annee au sein de ENSIAS.