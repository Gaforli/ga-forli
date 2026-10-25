-- Allarga soltanto la locandina degli eventi: nessuna tabella o riga viene eliminata.
ALTER TABLE "events" ALTER COLUMN "image" TYPE text;
