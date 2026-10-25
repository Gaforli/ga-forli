-- Crea soltanto l'archivio storico delle locandine: nessun dato esistente viene modificato.
-- event_id è un riferimento logico, senza cancellazione a cascata dall'evento originale.
CREATE TABLE "poster_archive" (
  "id" serial PRIMARY KEY NOT NULL,
  "event_id" integer NOT NULL,
  "archive_month" varchar(7) NOT NULL,
  "event_date" varchar(10) NOT NULL,
  "event_time" varchar(5) DEFAULT '' NOT NULL,
  "title" varchar(255) NOT NULL,
  "cat" "event_cat" NOT NULL,
  "desc" text,
  "image" text NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "poster_archive_event_unique" ON "poster_archive" ("event_id");
CREATE INDEX "poster_archive_month_idx" ON "poster_archive" ("archive_month");
