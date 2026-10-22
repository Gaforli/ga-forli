# Guida attivazione — Pagina "Questo mese preghiamo per…"

La pagina Preghiere è già nel codice e la bacheca funziona subito. Per attivare **l'invio delle richieste** (login Google/Facebook/email + email di notifica) servono 4 configurazioni da fare una sola volta. Circa 30 minuti in tutto.

---

## Passo 1 — Carica i file su GitHub

Carica i file allegati nella chat nelle stesse cartelle del repo (sovrascrivi dove esistono già). Vercel ripubblica da solo.

## Passo 2 — Prendi le chiavi Supabase

1. Apri **supabase.com** → il tuo progetto
2. In basso a sinistra: **Project Settings** (ingranaggio) → **API**
3. Copia:
   - **Project URL** (tipo `https://onfccljgwcdhmruzbobi.supabase.co`)
   - **anon public key** (nella sezione "API Keys", quella pubblica — NON la service_role)
4. Sempre in Supabase: **Authentication → Sign In / Providers**:
   - **Email**: lascia attivo, ma **disattiva "Confirm email"** (così l'accesso è immediato)
5. **Authentication → URL Configuration**:
   - **Site URL**: `https://gaforli.vercel.app`
   - **Redirect URLs** → Add: `https://gaforli.vercel.app/**`

## Passo 3 — Attiva il login Google

1. Vai su **console.cloud.google.com** (accedi con l'account Google che preferisci)
2. Crea un progetto nuovo (nome: `ga-forli`)
3. Menu → **APIs & Services → OAuth consent screen** → External → compila solo nome app ed email → Salva
4. **Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**
   - Authorized redirect URIs: `https://onfccljgwcdhmruzbobi.supabase.co/auth/v1/callback`
5. Copia **Client ID** e **Client Secret**
6. Torna su Supabase → **Authentication → Providers → Google** → attiva, incolla Client ID e Secret → **Save**

## Passo 4 — Attiva il login Facebook

1. Vai su **developers.facebook.com** → **My Apps → Create App**
2. Tipo: **Consumer**, nome: `GA Forlì`
3. Nell'app: **Add Product → Facebook Login → Settings**
4. In **Valid OAuth Redirect URIs** metti: `https://onfccljgwcdhmruzbobi.supabase.co/auth/v1/callback`
5. **Settings → Basic**: copia **App ID** e **App Secret**, e porta l'app in modalità **Live** (interruttore in alto)
6. Su Supabase → **Authentication → Providers → Facebook** → attiva, incolla App ID e Secret → **Save**

## Passo 5 — Attiva le email di notifica (Resend)

1. Vai su **resend.com** → registrati con **luigifrancescasposi@gmail.com** (gratis)
   - importante: con questo indirizzo le email di prova arrivano senza configurare domini
2. **API Keys → Create API Key** → nome `ga-forli` → copia la chiave (`re_...`)

## Passo 6 — Variabili su Vercel

Vai su **vercel.com → ga-forli → Settings → Environment Variables** e aggiungi (Production + Preview):

| Nome | Valore |
|---|---|
| `SUPABASE_URL` | il Project URL del passo 2 |
| `SUPABASE_ANON_KEY` | la anon public key del passo 2 |
| `VITE_SUPABASE_URL` | lo stesso Project URL |
| `VITE_SUPABASE_ANON_KEY` | la stessa anon public key |
| `RESEND_API_KEY` | la chiave del passo 5 |

Poi: **Deployments → ⋯ sull'ultimo → Redeploy** (serve perché le variabili VITE_ entrano nel sito solo al momento del build).

## Fatto!

Da quel momento:
- chiunque può leggere la bacheca dalla scheda **Preghiere**
- per scrivere una richiesta si accede con Google, Facebook o email
- tu ricevi l'email e approvi da **Direttore GA → Preghiere**
- il tasto ♥ "Mi unisco alla preghiera" conta le adesioni
