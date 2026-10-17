# GA Forlì — Guida al deploy (Supabase + Vercel)

Questa è la versione del sito pensata per essere ospitata **gratuitamente** fuori da Kimi:

- **Frontend + API**: Vercel (piano Hobby, gratis)
- **Database**: Supabase Postgres (piano Free, gratis)
- **Keep-alive**: GitHub Actions (gratis)

Il codice continui a modificarlo con Kimi: fai le modifiche, poi `git push` e Vercel ripubblica da solo.

---

## 1. Account necessari

| Servizio | Dove | Piano |
|---|---|---|
| GitHub | github.com | Free |
| Supabase | supabase.com (accedi con GitHub) | Free |
| Vercel | vercel.com (accedi con GitHub) | Hobby |

## 2. Supabase: crea il database

1. Su supabase.com → **New project** → nome `ga-forli`, regione **Frankfurt**
2. Scegli la **password del database** e **salvala**: non viene più mostrata
3. Nella pagina del progetto, clicca il pulsante **«Connect»** in alto
4. Nella scheda **«ORM»** trovi due righe da copiare **entrambe**:
   - `DATABASE_URL` — *transaction-mode pooler*, porta **6543** → serve all'app
   - `DIRECT_URL` — *session-mode pooler*, porta **5432** → serve per creare le tabelle
5. In entrambe sostituisci `[YOUR-PASSWORD]` — parentesi incluse — con la password del database.
   Se la password contiene caratteri speciali (`@ # & ?` o spazi) vanno codificati: `@` → `%40`, `#` → `%23`, `&` → `%26`, spazio → `%20`

## 3. Prepara il progetto in locale (o con Kimi)

```bash
cp .env.example .env
```

Compila in `.env`:

- `DATABASE_URL` e `DIRECT_URL` = le due righe del punto 2
- `APP_SECRET` = la stringa casuale che ti ha dato Kimi (la userai identica su Vercel)

Poi crea le tabelle e importa i dati attuali del sito (eventi, tema dell'anno, account Direttore):

```bash
npm install
npx drizzle-kit push      # crea le tabelle su Supabase (conferma se chiesto)
npx tsx db/import-data.ts # importa eventi, tema e account admin
```

L'account **direttore@gaforli.it** viene importato con la stessa password attuale (l'hash viene copiato, la password non passa mai in chiaro).

## 4. GitHub: carica il codice

```bash
git init
git add .
git commit -m "GA Forlì — versione Supabase"
git remote add origin https://github.com/TUO-UTENTE/ga-forli.git
git push -u origin main
```

⚠️ Il file `.env` è già in `.gitignore`: **non finirà mai su GitHub** (le password restano al sicuro).

## 5. Vercel: pubblica

1. Su vercel.com → **Add New → Project** → importa il repo `ga-forli`
2. Vercel riconosce Vite da solo; la configurazione è già nel repo (`vercel.json`)
3. In **Environment Variables** aggiungi (ambiente Production):
   - `DATABASE_URL` = la stringa transaction pooler di Supabase (porta 6543)
   - `APP_SECRET` = la stessa del `.env`
4. **Deploy** → in ~1 minuto il sito è online su `https://ga-forli.vercel.app` (o nome simile)

## 6. Keep-alive (evita la pausa di Supabase)

Supabase sospende i progetti gratuiti dopo 7 giorni senza attività. Il repo include già un workflow GitHub (`.github/workflows/keep-alive.yml`) che chiama il sito due volte a settimana.

Dopo il deploy, **modifica una sola riga** nel file: sostituisci `https://IL-TUO-SITO.vercel.app` con l'URL reale del sito, poi `git push`. Da GitHub → Actions puoi verificare che giri.

## 7. Lavorare sul sito d'ora in poi

- **Modifiche con Kimi**: apri questa cartella del progetto, chiedi le modifiche, poi `git push` → Vercel aggiorna il sito automaticamente
- **Aggiungere un altro admin**: `npx tsx db/create-admin.ts email@esempio.it password "Nome"`
- **Sviluppo in locale**: `npm run dev` (serve il `.env` compilato)

## Struttura

```
api/[...path].ts   → entry point serverless per Vercel
server/            → backend Hono + tRPC (login, eventi, tema)
db/schema.ts       → tabelle Postgres (Drizzle)
db/import-data.ts  → importazione dati iniziale
src/               → frontend React
```
