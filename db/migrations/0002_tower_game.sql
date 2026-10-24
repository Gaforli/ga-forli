CREATE TABLE IF NOT EXISTS "game_identities" (
  "id" varchar(36) PRIMARY KEY,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "game_sessions" (
  "id" varchar(36) PRIMARY KEY,
  "identity_id" varchar(36) NOT NULL,
  "config_version" integer NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "expires_at" timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS "game_sessions_identity_created_idx" ON "game_sessions" ("identity_id", "created_at");

CREATE TABLE IF NOT EXISTS "game_runs" (
  "id" varchar(36) PRIMARY KEY,
  "session_id" varchar(36) NOT NULL,
  "identity_id" varchar(36) NOT NULL,
  "nickname" varchar(20) NOT NULL,
  "score" integer NOT NULL,
  "perfects" integer NOT NULL,
  "ticks" integer NOT NULL,
  "config_version" integer NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "game_runs_session_unique" ON "game_runs" ("session_id");
CREATE INDEX IF NOT EXISTS "game_runs_identity_idx" ON "game_runs" ("identity_id");
CREATE INDEX IF NOT EXISTS "game_runs_created_idx" ON "game_runs" ("created_at");
CREATE INDEX IF NOT EXISTS "game_runs_rank_idx" ON "game_runs" ("score", "perfects", "created_at");
