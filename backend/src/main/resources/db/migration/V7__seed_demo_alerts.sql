-- =============================================================
-- V7 — Realistic demo alerts for analytics dashboard
-- 252 alerts over 90 days with natural fluctuations.
-- Uses only existing VISUAL_IMPAIRED users. Safe to re-run via
-- Flyway (runs exactly once).
-- =============================================================

DO $$
DECLARE
  vi_ids   BIGINT[];
  n_vi     INT;
  uid      BIGINT;
  d        INT;
  i        INT;
  j        INT;
  cnt      INT;
  obs      TEXT;
  obs_list TEXT[] := ARRAY[
    'pothole','stairs','barrier','tree','door','car','metallic_barrier'
  ];
  -- Weighted distribution matching desired ranking
  -- pothole:42 stairs:31 barrier:25 tree:18 door:14 car:11 metallic_barrier:8
  -- Cumulative weights → total 149
  obs_w    INT[]  := ARRAY[42, 73, 98, 116, 130, 141, 149];
  rv       DOUBLE PRECISION;
  hr       INT;
  ts       TIMESTAMP;
  res_ts   TIMESTAMP;
  st       TEXT;
  res_base INT;
  lat      DOUBLE PRECISION;
  lon      DOUBLE PRECISION;
BEGIN

  -- ── Collect all existing VISUAL_IMPAIRED users ─────────────
  SELECT ARRAY(SELECT id FROM users WHERE role = 'VISUAL_IMPAIRED')
    INTO vi_ids;
  n_vi := COALESCE(array_length(vi_ids, 1), 0);

  IF n_vi = 0 THEN
    RAISE NOTICE 'V7: No VISUAL_IMPAIRED users found — skipping alert seeding.';
    RETURN;
  END IF;

  RAISE NOTICE 'V7: Seeding alerts for % VI user(s)…', n_vi;

  -- ==========================================================
  -- DAILY ALERT COUNTS (90 days, non-uniform distribution)
  -- d = days ago   (d=89 → oldest,  d=0 → today)
  --
  -- Days 89-30: sparse background data  (~101 alerts)
  -- Days 29-0 : rich chart window       (~151 alerts)
  -- Total                               (~252 alerts)
  -- ==========================================================
  FOR d IN REVERSE 89..0 LOOP

    cnt := CASE d
      -- ── Old data (days 89-30): sparse, realistic background ─
      WHEN 89 THEN 0  WHEN 88 THEN 0  WHEN 87 THEN 1  WHEN 86 THEN 0  WHEN 85 THEN 1
      WHEN 84 THEN 1  WHEN 83 THEN 0  WHEN 82 THEN 0  WHEN 81 THEN 1  WHEN 80 THEN 1
      WHEN 79 THEN 1  WHEN 78 THEN 0  WHEN 77 THEN 2  WHEN 76 THEN 1  WHEN 75 THEN 0
      WHEN 74 THEN 2  WHEN 73 THEN 1  WHEN 72 THEN 0  WHEN 71 THEN 0  WHEN 70 THEN 2
      WHEN 69 THEN 1  WHEN 68 THEN 2  WHEN 67 THEN 1  WHEN 66 THEN 0  WHEN 65 THEN 0
      WHEN 64 THEN 3  WHEN 63 THEN 1  WHEN 62 THEN 0  WHEN 61 THEN 3  WHEN 60 THEN 2
      WHEN 59 THEN 0  WHEN 58 THEN 0  WHEN 57 THEN 3  WHEN 56 THEN 4  WHEN 55 THEN 2
      WHEN 54 THEN 1  WHEN 53 THEN 0  WHEN 52 THEN 3  WHEN 51 THEN 2  WHEN 50 THEN 5
      WHEN 49 THEN 3  WHEN 48 THEN 1  WHEN 47 THEN 0  WHEN 46 THEN 4  WHEN 45 THEN 2
      WHEN 44 THEN 0  WHEN 43 THEN 5  WHEN 42 THEN 6  WHEN 41 THEN 3  WHEN 40 THEN 1
      WHEN 39 THEN 1  WHEN 38 THEN 0  WHEN 37 THEN 3  WHEN 36 THEN 6  WHEN 35 THEN 3
      WHEN 34 THEN 1  WHEN 33 THEN 0  WHEN 32 THEN 4  WHEN 31 THEN 7  WHEN 30 THEN 4

      -- ── Last 30 days: clear peaks and valleys for chart ─────
      -- Pattern: quiet start → rising → peak mid-month → dip → spike → settle
      WHEN 29 THEN 2   -- Day -29: quiet
      WHEN 28 THEN 0   -- Day -28: zero day
      WHEN 27 THEN 4   -- Day -27: small rise
      WHEN 26 THEN 6   -- Day -26: building
      WHEN 25 THEN 3   -- Day -25: dip
      WHEN 24 THEN 0   -- Day -24: zero day
      WHEN 23 THEN 7   -- Day -23: first peak
      WHEN 22 THEN 9   -- Day -22: peak continues
      WHEN 21 THEN 5   -- Day -21: drop
      WHEN 20 THEN 1   -- Day -20: near zero
      WHEN 19 THEN 0   -- Day -19: zero day
      WHEN 18 THEN 4   -- Day -18: recovery
      WHEN 17 THEN 11  -- Day -17: major peak ▲
      WHEN 16 THEN 7   -- Day -16: high
      WHEN 15 THEN 3   -- Day -15: decline
      WHEN 14 THEN 1   -- Day -14: low
      WHEN 13 THEN 0   -- Day -13: zero day
      WHEN 12 THEN 8   -- Day -12: surge
      WHEN 11 THEN 13  -- Day -11: big peak ▲▲
      WHEN 10 THEN 6   -- Day -10: moderate
      WHEN  9 THEN 2   -- Day  -9: decline
      WHEN  8 THEN 0   -- Day  -8: zero day
      WHEN  7 THEN 10  -- Day  -7: strong rise
      WHEN  6 THEN 15  -- Day  -6: highest peak ▲▲▲
      WHEN  5 THEN 8   -- Day  -5: drop
      WHEN  4 THEN 4   -- Day  -4: settling
      WHEN  3 THEN 1   -- Day  -3: low
      WHEN  2 THEN 10  -- Day  -2: late spike
      WHEN  1 THEN 7   -- Day  -1: yesterday
      WHEN  0 THEN 4   -- Day   0: today (partial)
      ELSE 0
    END;

    -- ── Generate `cnt` alerts for this day ───────────────────
    FOR i IN 1..cnt LOOP

      -- Round-robin across available VI users
      uid := vi_ids[(((d * 7 + i) % n_vi) + 1)];

      -- Weighted obstacle selection (cumulative weight table)
      rv  := random() * 149;
      obs := 'pothole';
      FOR j IN 1..7 LOOP
        IF rv <= obs_w[j] THEN
          obs := obs_list[j];
          EXIT;
        END IF;
      END LOOP;

      -- Hour of day: morning-weighted distribution
      rv := random();
      hr := CASE
        WHEN rv < 0.35 THEN  8 + (random() * 3.99)::INT  -- 08-11 (35%)
        WHEN rv < 0.60 THEN 12 + (random() * 3.99)::INT  -- 12-15 (25%)
        WHEN rv < 0.80 THEN 16 + (random() * 3.99)::INT  -- 16-19 (20%)
        WHEN rv < 0.90 THEN 20 + (random() * 2.99)::INT  -- 20-22 (10%)
        WHEN rv < 0.95 THEN  4 + (random() * 3.99)::INT  -- 04-07  (5%)
        ELSE                      (random() * 3.99)::INT  -- 00-03  (5%)
      END;
      hr := GREATEST(0, LEAST(23, hr));

      -- Timestamp: midnight of (today - d days) + random hour + random minute
      ts := date_trunc('day', NOW() - (d * INTERVAL '1 day'))
            + (hr         * INTERVAL '1 hour')
            + (floor(random() * 60)::INT * INTERVAL '1 minute')
            + (floor(random() * 60)::INT * INTERVAL '1 second');

      -- Status: older alerts more likely resolved
      rv := random();
      st := CASE
        WHEN d >= 14 AND rv < 0.88 THEN 'RESOLVED'
        WHEN d >= 7  AND rv < 0.72 THEN 'RESOLVED'
        WHEN d >= 3  AND rv < 0.55 THEN 'RESOLVED'
        WHEN d >= 1  AND rv < 0.38 THEN 'RESOLVED'
        WHEN d  = 0  AND rv < 0.15 THEN 'RESOLVED'
        ELSE 'ACTIVE'
      END;

      -- Resolution time: obstacle-specific base ± 30% jitter
      IF st = 'RESOLVED' THEN
        res_base := CASE obs
          WHEN 'car'              THEN 360    --  6 min avg
          WHEN 'door'             THEN 480    --  8 min avg
          WHEN 'pothole'          THEN 720    -- 12 min avg
          WHEN 'tree'             THEN 660    -- 11 min avg
          WHEN 'metallic_barrier' THEN 840    -- 14 min avg
          WHEN 'barrier'          THEN 900    -- 15 min avg
          WHEN 'stairs'           THEN 1080   -- 18 min avg
          ELSE                         600
        END;
        -- ±30% jitter  →  multiply by factor in [0.70, 1.30]
        res_base := (res_base::DOUBLE PRECISION * (0.70 + random() * 0.60))::INT;
        res_ts   := ts + (res_base * INTERVAL '1 second');
      ELSE
        res_ts := NULL;
      END IF;

      -- Morocco coordinates (Casablanca / Rabat / Fès corridor)
      lat := 33.30 + random() * 1.30;   -- 33.30° N to 34.60° N
      lon := -6.40 - random() * 1.45;   -- -6.40° W to -7.85° W

      INSERT INTO alerts
        (user_id, latitude, longitude, obstacle_type, status, created_at, resolved_at)
      VALUES
        (uid, lat, lon, obs, st, ts, res_ts);

    END LOOP;
  END LOOP;

  RAISE NOTICE 'V7: Alert seeding complete (~252 alerts over 90 days).';
END $$;
