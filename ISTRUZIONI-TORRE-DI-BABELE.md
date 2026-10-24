# GA Forlì — Torre di Babele 3D

## Stato della consegna

Implementazione completa del minigioco, della card in Home e della classifica persistente. La versione Kimi è salvata e pronta per l’anteprima (ID versione: **543cbf0**).

**Il sito pubblico `https://gaforli.vercel.app` non è stato aggiornato da questa consegna.** La classifica online pubblica diventerà utilizzabile soltanto dopo aver caricato questi file su GitHub e aver completato il deploy Vercel.

L’immagine fornita è stata usata soltanto come riferimento estetico: non è uno sfondo del gioco. La scena è composta da geometrie Three.js reali, materiali illuminati, camera prospettica, città instanziata, ziggurat, frammenti con gravità e polvere.

## File inclusi

- `contracts/tower-game.ts` — simulazione deterministica condivisa tra client e server.
- `server/game-router.ts` — sessioni, salvataggio validato, record e classifiche.
- `server/router.ts` — registrazione del router `game`.
- `db/schema.ts` — tabelle Drizzle per identità, sessioni e storico risultati.
- `db/migrations/0002_tower_game.sql` — migrazione Supabase/PostgreSQL.
- `src/game/tower-renderer.ts` — scena 3D, animazioni e rilascio risorse.
- `src/components/game/TowerCanvas.tsx` — canvas React e input touch/mouse/tastiera.
- `src/pages/GiochiPage.tsx` — intro, HUD, pausa, game over, salvataggio e classifica.
- `src/pages/HomePage.tsx` — card “Batti il record della GA”.
- `src/pages/PreghierePage.tsx` — soltanto correzioni di tipi necessarie alla compilazione; nessuna modifica funzionale.
- `src/App.tsx` — voce Giochi e caricamento lazy della pagina.
- `src/types/index.ts` — nuovo identificatore pagina `giochi`.
- `src/index.css` — stili Home e gioco.
- `package.json`, `package-lock.json` — Three.js e relativi tipi.
- `api/server.mjs` — backend Vercel già rigenerato con le API del gioco.

## Funzioni implementate

- Base quadrata iniziale non conteggiata.
- Movimento alternato sugli assi X e Z.
- Taglio della parte non sovrapposta, frammento decorativo e polvere.
- Tolleranza “Perfetto!”, senza recupero dimensioni, bonus o vite.
- Velocità progressiva con limite massimo.
- Game over quando la sovrapposizione è nulla.
- Simulazione a 60 tick/s, indipendente dalla frequenza dei fotogrammi e riverificata sul server.
- Camera a tre quarti con avanzamento dolce.
- Modalità qualità Automatica, Alta e Leggera.
- Touch, mouse e barra spaziatrice senza duplicazioni.
- Pausa su perdita di visibilità e all’apertura della classifica.
- Nickname Unicode da 2 a 20 caratteri; nessuna registrazione richiesta.
- Identità anonima persistente tramite cookie backend `ga_tower_id`, separata dal nickname.
- Recupero del risultato non salvato dopo errore di rete, con invio idempotente.
- Classifica assoluta e settimanale Europe/Rome, Top 20, miglior risultato per identità e storico completo delle partite.
- Conferma di un nuovo record assoluto soltanto dopo la risposta del server.
- Rilascio di canvas, contesto WebGL, geometrie, materiali, texture e audio all’uscita.

## Verifiche eseguite

### Compilazione

- Variante Supabase/Vercel: `npm run check` — superato.
- Variante Supabase/Vercel: `npm run build` — superato.
- Bundle `api/server.mjs` — rigenerato con successo.
- Variante Kimi/MySQL: `npm run check` — superato.
- Variante Kimi/MySQL: `npm run build` — superato.
- Bundle Kimi avviato in modalità produzione da una cartella senza `node_modules`; endpoint `ping` raggiunto correttamente.

Il bundler segnala soltanto l’avviso ordinario sulla dimensione dei chunk oltre 500 kB. La pagina Giochi è caricata lazy e non appesantisce l’avvio della Home.

### Motore e sicurezza

Test superati per:

- taglio X e taglio Z;
- dimensioni conservate sull’asse non attivo;
- posa perfetta e frammento assente;
- mancata sovrapposizione e game over;
- base non conteggiata;
- replay identico client/server;
- comandi fuori ordine, durante il lock e dopo il game over rifiutati;
- limite della velocità;
- nickname Unicode e caratteri non ammessi;
- cinque casi di settimana Europe/Rome, inclusi i cambi CET/CEST del 2026.

Sono inoltre stati verificati su Supabase reale:

- sessioni e cookie indipendenti;
- salvataggio e classifica condivisa tra due identità;
- invio duplicato con lo stesso `runId` e `duplicate: true`;
- rifiuto HTTP 403 della sessione di un’altra identità;
- rifiuto HTTP 400 di una sequenza falsificata su una sessione nuova;
- classifica settimanale.

Su MySQL sono stati verificati salvataggio e idempotenza: dopo il doppio invio è presente un solo risultato.

### Browser e risorse

- Home card presente e navigazione alla pagina Giochi funzionante.
- Partita reale completata e salvata; risultato visibile da una seconda sessione.
- Touch, mouse e spazio verificati senza doppie pose; `event.repeat` ignorato.
- Classifica e perdita di visibilità mettono in pausa.
- Uscita dalla pagina: canvas rimosso e rilascio esplicito del contesto WebGL verificato; nessun errore console.
- Screenshot intro, classifica, scena mobile e scena desktop catturati dall’implementazione reale.

I test grafici automatici hanno usato Chromium con rendering software SwiftShader, non un telefono fisico. **Non è stata certificata una frequenza di 60 fps su hardware reale.** In quell’ambiente software sono stati osservati anche valori molto bassi; per questo il gioco misura gli FPS e, in modalità Automatica, passa alla qualità Leggera sotto 42 fps.

Tutti i risultati, le sessioni e le identità di prova sono stati eliminati da Supabase e MySQL. Le classifiche iniziano vuote.

## Configurazione necessaria

Non servono nuove variabili d’ambiente.

Per la produzione mantieni le configurazioni esistenti:

- `DATABASE_URL` di Supabase nelle variabili ambiente Vercel;
- le variabili `VITE_` già configurate per il sito;
- HTTPS, necessario al cookie anonimo `Secure`.

La migrazione `0002_tower_game.sql` è **già stata applicata a Supabase**. Non è necessario applicarla di nuovo. Se in futuro prepari un database nuovo, esegui quel file nel SQL Editor di Supabase prima di usare il gioco.

Non inserire password del database, password amministratore o chiavi `service_role` nel frontend o nel repository.

## Pubblicazione con GitHub Desktop

1. Estrai `ga-forli-torre-di-babele.zip` in una cartella temporanea.
2. Apri la cartella estratta: contiene le directory `api`, `contracts`, `db`, `server`, `src`, i due file package e queste istruzioni.
3. Copia **il contenuto** della cartella estratta nella cartella locale del repository `ga-forli`, mantenendo invariati i percorsi e scegliendo di sostituire i file esistenti quando richiesto.
4. Non copiare il file ZIP dentro il repository e non aggiungere file `.env`.
5. Apri GitHub Desktop e controlla che siano presenti i 16 file applicativi elencati sopra, in particolare `api/server.mjs` e `db/migrations/0002_tower_game.sql`.
6. Crea il commit, per esempio con titolo `Aggiungi Torre di Babele 3D e classifica`.
7. Premi **Push origin**.
8. Attendi che Vercel completi il deploy collegato al repository.

Il file `ISTRUZIONI-TORRE-DI-BABELE.md` può essere escluso dal commit se preferisci mantenere il repository senza documentazione aggiuntiva; non è necessario all’esecuzione.

## Prova dopo il deploy

1. Apri `https://gaforli.vercel.app`.
2. Dal menu apri **Giochi**.
3. Avvia una partita e posa alcuni blocchi.
4. Al game over inserisci un nickname e salva.
5. Apri la classifica Assoluta e Questa settimana.
6. Verifica da un altro browser o da finestra anonima che il risultato sia visibile.
7. Controlla che la card in Home mostri il campione aggiornato.

Solo dopo questi passaggi la classifica online pubblica potrà essere considerata attiva.

## Avvio locale

```bash
npm install
npm run dev
```

Controlli e build:

```bash
npm run check
npm run build
node scripts/build-server.mjs
```

Il progetto Vercel usa `api/server.mjs`, già incluso e aggiornato. Se modifichi in futuro il backend, rigenera quel file con `node scripts/build-server.mjs` prima del commit.

## Limiti della protezione anti-cheat

Il server non accetta un punteggio arbitrario: deriva piani e perfetti dal replay deterministico dei comandi, verifica proprietà e scadenza della sessione, limita le richieste e usa un vincolo unico per impedire duplicati. Queste misure ostacolano invii falsificati e abusi ordinari, ma non possono dimostrare che dietro una sequenza valida ci sia una persona: un bot sufficientemente avanzato potrebbe generare partite formalmente valide. Per un gioco di gruppo questa è una protezione proporzionata, non un sistema anti-bot garantito.
