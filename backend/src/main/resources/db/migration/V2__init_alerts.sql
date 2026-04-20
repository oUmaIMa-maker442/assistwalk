CREATE TABLE alerts (
                        id            BIGSERIAL PRIMARY KEY,
                        user_id       BIGINT       NOT NULL REFERENCES users(id),
                        latitude      DOUBLE PRECISION NOT NULL,
                        longitude     DOUBLE PRECISION NOT NULL,
                        obstacle_type VARCHAR(100),
                        status        VARCHAR(50)  NOT NULL DEFAULT 'ACTIVE',
                        created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

ALTER TABLE alerts
    ADD CONSTRAINT chk_alert_status
        CHECK (status IN ('ACTIVE', 'RESOLVED'));

CREATE INDEX idx_alerts_user_id ON alerts(user_id);
CREATE INDEX idx_alerts_status  ON alerts(status);