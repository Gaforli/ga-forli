-- Barattolo della gratitudine: raccolte annuali/straordinarie e bigliettini.
-- Crea soltanto le nuove tabelle: nessun dato esistente viene modificato.
CREATE TYPE "gratitude_kind" AS ENUM ('annual', 'special');
CREATE TYPE "gratitude_status" AS ENUM ('pending', 'approved', 'discarded');

CREATE TABLE "gratitude_collections" (
  "id" serial PRIMARY KEY,
  "year" integer,
  "label" varchar(120) NOT NULL,
  "kind" "gratitude_kind" NOT NULL DEFAULT 'annual',
  "intro_message" text NOT NULL,
  "is_open" integer NOT NULL DEFAULT 0,
  "opened_at" timestamp,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "gratitude_collections_label_unique" ON "gratitude_collections" ("label");
CREATE UNIQUE INDEX "gratitude_collections_annual_year_unique" ON "gratitude_collections" ("kind", "year");

CREATE TABLE "gratitude_notes" (
  "id" serial PRIMARY KEY,
  "collection_id" integer NOT NULL,
  "client_token" varchar(64) NOT NULL,
  "title" varchar(60) NOT NULL DEFAULT '',
  "body" text NOT NULL,
  "signature" varchar(30),
  "color" varchar(7) NOT NULL DEFAULT '#F5DFA7',
  "status" "gratitude_status" NOT NULL DEFAULT 'pending',
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "moderated_at" timestamp
);
CREATE UNIQUE INDEX "gratitude_notes_token_unique" ON "gratitude_notes" ("client_token");
CREATE INDEX "gratitude_notes_collection_status_idx" ON "gratitude_notes" ("collection_id", "status");
