-- V5 — Mot de passe temporaire + Remember Me
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT TRUE;

-- Les utilisateurs existants n'ont pas besoin de changer leur mot de passe
UPDATE users SET must_change_password = FALSE;

-- Index pour accélérer la vérification au login
CREATE INDEX IF NOT EXISTS idx_users_must_change ON users(must_change_password);