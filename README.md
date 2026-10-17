# GA Forlì — Giovani Avventisti Forlì

Sito del gruppo Giovani Avventisti di Forlì: eventi, innario, versetto del giorno, tema dell'anno, area Direttore.

**Stack**: React 19 + Vite + Tailwind (frontend) · Hono + tRPC + Drizzle (API) · Supabase Postgres (database) · Vercel (hosting)

👉 **Per pubblicare il sito leggi [DEPLOY.md](DEPLOY.md)** — guida passo passo, tutto gratuito.

## Sviluppo

```bash
cp .env.example .env   # compila DATABASE_URL e APP_SECRET
npm install
npm run dev            # http://localhost:3000
```

## Comandi utili

| Comando | Cosa fa |
|---|---|
| `npm run dev` | Sviluppo locale con hot reload |
| `npm run build` | Build frontend per Vercel |
| `npm run check` | Controllo TypeScript |
| `npx drizzle-kit push` | Crea/aggiorna le tabelle su Supabase |
| `npx tsx db/import-data.ts` | Importa i dati iniziali (eventi, tema, admin) |
| `npx tsx db/create-admin.ts <email> <password> [nome]` | Crea/aggiorna un account Direttore |
