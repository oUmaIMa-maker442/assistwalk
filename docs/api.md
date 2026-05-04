# AssistWalk — Contrat API

## Authentification

### POST /auth/login
Headers : Content-Type: application/json
Body    : { "email": "...", "password": "..." }
Response 200 : { "token": "...", "role": "...", "userId": 1 }
Erreurs : 401 credentials invalides

### POST /auth/register
Headers : Content-Type: application/json
Body    : { "email": "...", "password": "...", "role": "VISUAL_IMPAIRED" }
Response 201 : { "token": "...", "role": "...", "userId": 1 }
Erreurs : 409 email déjà utilisé

---

## OCR

### POST /api/v1/ocr/process
Auth    : Bearer token (tous rôles)
Body    : multipart/form-data — champ "image" (jpg, png)
Response 200 :
{
"id": 1,
"text": "Texte extrait",
"confidence": 0.94
}
Erreurs : 400 image manquante, 503 service OCR indisponible

---

## Alertes SOS

### POST /api/v1/alerts/sos
Auth    : Bearer token (rôle VISUAL_IMPAIRED)
Body    :
{
"latitude": 48.8566,
"longitude": 2.3522,
"obstacleType": "stairs"
}
Response 201 :
{
"id": 1,
"status": "ACTIVE",
"createdAt": "2026-04-22T10:00:00"
}
Erreurs : 401 non authentifié, 403 rôle insuffisant

### GET /api/v1/alerts/active
Auth    : Bearer token (rôle COMPANION ou ADMIN)
Response 200 :
[
{
"id": 1,
"userId": 3,
"latitude": 48.8566,
"longitude": 2.3522,
"obstacleType": "stairs",
"status": "ACTIVE",
"createdAt": "2026-04-22T10:00:00",
"resolvedAt": null
}
]
Notes   : retourne uniquement les alertes des malvoyants
associés à l'accompagnateur connecté

### PATCH /api/v1/alerts/{id}/resolve
Auth    : Bearer token (rôle COMPANION ou ADMIN)
Response 200 :
{
"id": 1,
"status": "RESOLVED",
"resolvedAt": "2026-04-22T10:15:00",
...
}
Erreurs : 404 alerte introuvable, 403 alerte hors périmètre,
409 alerte déjà résolue

---

## Tokens FCM

### PUT /api/v1/users/fcm-token
Auth    : Bearer token (tous rôles)
Body    :
{
"fcmToken": "eKy7z...",
"deviceName": "Pixel 7"
}
Response 200 : { "message": "Token FCM enregistré" }
Erreurs : 400 fcmToken manquant

---

## Administration — Utilisateurs

Tous ces endpoints nécessitent : Bearer token (rôle ADMIN)

### GET /api/v1/admin/users
Response 200 : [ { "id": 1, "email": "...", "role": "...",
"nom": "...", "prenom": "...",
"telephone": "..." }, ... ]

### GET /api/v1/admin/users/{id}
Response 200 : { "id": 1, "email": "...", ... }
Erreurs : 404 introuvable

### POST /api/v1/admin/users
Body :
{
"email": "nouveau@test.com",
"password": "motdepasse",
"role": "COMPANION",
"nom": "Dupont",
"prenom": "Jean",
"telephone": "0612345678"
}
Response 201 : { "id": 5, "email": "...", "role": "COMPANION", ... }
Erreurs : 400 validation, 409 email déjà utilisé

### PUT /api/v1/admin/users/{id}
Body (tous les champs optionnels) :
{
"nom": "Dupont",
"prenom": "Marie",
"telephone": "0698765432",
"adresse": "12 rue de la Paix"
}
Response 200 : utilisateur mis à jour
Erreurs : 404 introuvable

### DELETE /api/v1/admin/users/{id}
Response 204 No Content
Erreurs : 404 introuvable

---

## Administration — Associations

Tous ces endpoints nécessitent : Bearer token (rôle ADMIN)

### GET /api/v1/admin/associations
Response 200 :
[
{
"id": 1,
"malvoyantId": 3,
"malvoyantEmail": "malvoyant@test.com",
"accompagnateurId": 2,
"accompagnateurEmail": "companion@test.com",
"createdAt": "2026-04-22T09:00:00"
}
]

### POST /api/v1/admin/associations
Body :
{
"malvoyantId": 3,
"accompagnateurId": 2
}
Response 201 : AssociationDto complet
Erreurs : 404 utilisateur introuvable, 409 association déjà existante

### DELETE /api/v1/admin/associations/{id}
Response 204 No Content
Erreurs : 404 introuvable

---

## WebSocket STOMP

Endpoint de connexion : ws://localhost:8081/ws (avec fallback SockJS)

Abonnement accompagnateur :
/topic/alerts/{companionId}

Message reçu lors d'un SOS :
{
"alertId": 1,
"userId": 3,
"latitude": 48.8566,
"longitude": 2.3522,
"obstacleType": "stairs",
"status": "ACTIVE",
"createdAt": "2026-04-22T10:00:00"
}