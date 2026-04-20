CREATE TABLE users (
                       id          BIGSERIAL PRIMARY KEY,
                       email       VARCHAR(255) NOT NULL UNIQUE,
                       password    VARCHAR(255) NOT NULL,
                       role        VARCHAR(50)  NOT NULL DEFAULT 'VISUAL_IMPAIRED',
                       created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Contrainte sur les rôles autorisés
ALTER TABLE users
    ADD CONSTRAINT chk_role
        CHECK (role IN ('VISUAL_IMPAIRED', 'COMPANION', 'ADMIN'));

-- Index pour accélérer la recherche par email (utilisé à chaque login)
CREATE INDEX idx_users_email ON users(email);

-- Utilisateur de test pour le développement
-- Mot de passe : "password123" hashé avec BCrypt
INSERT INTO users (email, password, role)
VALUES ('malvoyant@test.com',
        '$2a$12$f4..dcWGmPTIP7tv/BtC/uDSGG1NmkaOdO3jIZhuzaX64YACl.QQW',
        'VISUAL_IMPAIRED');

INSERT INTO users (email, password, role)
VALUES ('admin@test.com',
        '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
        'ADMIN');