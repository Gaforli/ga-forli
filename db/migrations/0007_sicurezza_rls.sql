-- Sicurezza: abilita Row-Level Security su TUTTE le tabelle pubbliche.
--
-- Perche': Supabase espone automaticamente un'API REST pubblica (PostgREST)
-- per ogni tabella, raggiungibile con la chiave "anon" + l'URL del progetto.
-- Il sito GA Forli' NON usa quell'API: il suo server si collega direttamente
-- al database (ruolo postgres, proprietario delle tabelle), quindi con RLS
-- attivo continua a funzionare invariato, mentre l'accesso pubblico via API
-- viene chiuso completamente (nessuna policy = nessun accesso per anon/
-- authenticated).
--
-- Non tocca i dati: cambia solo le regole di accesso. Eseguire UNA VOLTA.

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "poster_archive" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "site_content" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "admin_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prayer_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "game_identities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "game_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "game_runs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "gratitude_collections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "gratitude_notes" ENABLE ROW LEVEL SECURITY;

-- Verifica: dopo l'esecuzione tutte le righe devono mostrare rowsecurity = true
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
