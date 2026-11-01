-- Archivio locandine: locandine libere (non legate a un evento) e attività del mese.
-- Modifica solo la tabella poster_archive: nessun dato esistente viene perso.
-- La colonna cat passa a un enum dedicato che include 'libera'.
ALTER TABLE "poster_archive" ALTER COLUMN "cat" TYPE text;
DROP TYPE IF EXISTS "archive_cat" CASCADE;
CREATE TYPE "archive_cat" AS ENUM ('spiritualita', 'natura', 'musica', 'comunita', 'formazione', 'libera');
ALTER TABLE "poster_archive" ALTER COLUMN "cat" TYPE "archive_cat" USING "cat"::"archive_cat";
ALTER TABLE "poster_archive" ALTER COLUMN "event_date" SET DEFAULT '';
UPDATE "poster_archive" SET "event_date" = '' WHERE "event_date" IS NULL;
ALTER TABLE "poster_archive" ALTER COLUMN "event_date" SET NOT NULL;
