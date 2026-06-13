-- V6 — Timestamp de création du compte
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP;

UPDATE users SET created_at = NOW() WHERE created_at IS NULL;
