-- ============================================================
-- V3 — Enrichissement du schéma (à appliquer après V1 et V2)
-- ============================================================

-- 1. Enrichissement de la table users existante
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS nom                VARCHAR(100),
    ADD COLUMN IF NOT EXISTS prenom             VARCHAR(100),
    ADD COLUMN IF NOT EXISTS telephone          VARCHAR(20),
    ADD COLUMN IF NOT EXISTS adresse            VARCHAR(255),
    ADD COLUMN IF NOT EXISTS derniere_connexion TIMESTAMP;

-- 2. Spécialisations de users (héritage par table jointe)
CREATE TABLE malvoyant (
                           id                  BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                           telephone_urgence   VARCHAR(20),
                           date_naissance      DATE,
                           groupe_sanguin      VARCHAR(5),
                           niveau_deficience   VARCHAR(50)
);

CREATE TABLE accompagnateur (
                                id                      BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                                telephone_professionnel VARCHAR(20),
                                date_embauche           DATE,
                                annees_experience       INTEGER
);

CREATE TABLE admin (
                       id                       BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                       niveau_acces             VARCHAR(50),
                       derniere_connexion_admin TIMESTAMP
);

-- 3. Associations malvoyant <-> accompagnateur
CREATE TABLE associations (
                              id                BIGSERIAL PRIMARY KEY,
                              malvoyant_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                              accompagnateur_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                              created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
                              UNIQUE(malvoyant_id, accompagnateur_id)
);

CREATE INDEX idx_associations_malvoyant   ON associations(malvoyant_id);
CREATE INDEX idx_associations_companion   ON associations(accompagnateur_id);

-- 4. Tokens FCM (un utilisateur peut avoir plusieurs appareils)
CREATE TABLE token_fcm (
                           id          BIGSERIAL PRIMARY KEY,
                           user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                           fcm_token   VARCHAR(255) NOT NULL UNIQUE,
                           device_name VARCHAR(100),
                           created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_token_fcm_user ON token_fcm(user_id);

-- 5. Enrichissement de la table alerts existante
ALTER TABLE alerts
    ADD COLUMN IF NOT EXISTS precision_gps      DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS obstacle_context   VARCHAR(255),
    ADD COLUMN IF NOT EXISTS resolved_at        TIMESTAMP;

-- 6. Résultats OCR
CREATE TABLE ocr_result (
                            id         BIGSERIAL PRIMARY KEY,
                            user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                            texte      TEXT,
                            confidence DOUBLE PRECISION,
                            created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ocr_result_user ON ocr_result(user_id);

-- 7. Rattacher les utilisateurs de test aux tables de spécialisation
-- (l'utilisateur malvoyant@test.com → table malvoyant)
INSERT INTO malvoyant (id)
SELECT id FROM users WHERE email = 'malvoyant@test.com'
    ON CONFLICT DO NOTHING;

-- (l'utilisateur admin@test.com → table admin)
INSERT INTO admin (id)
SELECT id FROM users WHERE email = 'admin@test.com'
    ON CONFLICT DO NOTHING;