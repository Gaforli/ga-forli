import { useCallback, useEffect, useRef, useState } from "react";
import TowerCanvas from "@/components/game/TowerCanvas";
import type { GameQuality, GameResult, RenderStatus } from "@/game/tower-renderer";
import { trpc } from "@/providers/trpc";

type SavedInfo = { duplicate: boolean; newAbsoluteRecord: boolean };
type PendingResult = GameResult & { nickname?: string };

function readPending(): PendingResult | null {
  try {
    const value = JSON.parse(localStorage.getItem("ga_tower_pending") ?? "null");
    return value && typeof value.sessionId === "string" && Array.isArray(value.commands) && Number.isInteger(value.score) ? value : null;
  } catch { return null; }
}

function GameAudio() {
  let context: AudioContext | null = null;
  let enabled = true;
  const unlock = () => { context ??= new AudioContext(); void context.resume(); };
  const tone = (frequency: number, duration: number, volume: number, type: OscillatorType = "sine") => {
    if (!enabled || !context) return;
    const ctx = context, oscillator = ctx.createOscillator(), gain = ctx.createGain();
    oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(45, frequency * 0.55), ctx.currentTime + duration);
    gain.gain.setValueAtTime(volume, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    oscillator.connect(gain).connect(ctx.destination); oscillator.start(); oscillator.stop(ctx.currentTime + duration);
  };
  return {
    unlock,
    setEnabled(value: boolean) { enabled = value; if (value) unlock(); },
    dispose() { enabled = false; const current = context; context = null; if (current) void current.close(); },
    stone() { tone(125, 0.13, 0.16, "triangle"); },
    perfect() { tone(660, 0.18, 0.09); setTimeout(() => tone(880, 0.2, 0.07), 75); },
    fall() { tone(90, 0.38, 0.18, "sawtooth"); },
  };
}

function Leaderboard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [scope, setScope] = useState<"all" | "week">("all");
  const query = trpc.game.leaderboard.useQuery({ scope }, { enabled: open });
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (open) closeRef.current?.focus(); }, [open]);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="game-modal-backdrop" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="game-modal leaderboard" role="dialog" aria-modal="true" aria-labelledby="leaderboard-title">
        <button ref={closeRef} className="game-close" onClick={onClose} aria-label="Chiudi classifica">×</button>
        <span className="game-eyebrow">TORRE DI BABELE</span>
        <h2 id="leaderboard-title">Classifica</h2>
        <div className="leaderboard-tabs" role="tablist">
          <button role="tab" aria-selected={scope === "all"} className={scope === "all" ? "active" : ""} onClick={() => setScope("all")}>Assoluta</button>
          <button role="tab" aria-selected={scope === "week"} className={scope === "week" ? "active" : ""} onClick={() => setScope("week")}>Questa settimana</button>
        </div>
        {query.isLoading && <p className="game-loading-text">Caricamento dei risultati…</p>}
        {query.isError && <div className="game-error" role="alert">Classifica non disponibile. <button onClick={() => query.refetch()}>Riprova</button></div>}
        {query.data && !query.data.top.length && <p className="game-empty">Nessun risultato qui. La prima torre record può essere la tua!</p>}
        {!!query.data?.top.length && (
          <ol className="leaderboard-list">
            {query.data.top.map((row) => <li key={row.rank} className={row.mine ? "mine" : ""}>
              <span className="rank">{row.rank}</span><span className="player"><b>{row.nickname}</b><small>{new Date(row.achievedAt).toLocaleDateString("it-IT")}</small></span>
              <span className="score"><b>{row.score}</b><small>piani</small></span><span className="perfect-count">{row.perfects} perfetti</span>
            </li>)}
          </ol>
        )}
        {query.data?.mine && !query.data.top.some((r) => r.mine) && <p className="personal-rank">La tua posizione: <b>#{query.data.mine.rank}</b> · {query.data.mine.score} piani · {query.data.mine.perfects} perfetti</p>}
        <p className="leaderboard-note">Un miglior risultato per giocatore. La settimana inizia lunedì alle 00:00, ora italiana.</p>
      </section>
    </div>
  );
}

export default function GiochiPage() {
  const champion = trpc.game.champion.useQuery();
  const startSession = trpc.game.startSession.useMutation();
  const submitRun = trpc.game.submitRun.useMutation();
  const utils = trpc.useUtils();
  const [status, setStatus] = useState<RenderStatus>(() => readPending() ? "over" : "intro");
  const [sessionId, setSessionId] = useState("");
  const [sceneReady, setSceneReady] = useState(false);
  const [score, setScore] = useState(0);
  const [perfects, setPerfects] = useState(0);
  const [perfectFlash, setPerfectFlash] = useState(false);
  const [result, setResult] = useState<PendingResult | null>(() => readPending());
  const [nickname, setNickname] = useState(() => localStorage.getItem("ga_tower_nickname") ?? "");
  const [saved, setSaved] = useState<SavedInfo | null>(null);
  const [saveError, setSaveError] = useState("");
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [quality, setQuality] = useState<GameQuality>(() => (localStorage.getItem("ga_tower_quality") as GameQuality) || "auto");
  const [audioOn, setAudioOn] = useState(() => localStorage.getItem("ga_tower_audio") !== "off");
  const [personalRecord, setPersonalRecord] = useState(false);
  const audio = useRef<ReturnType<typeof GameAudio> | null>(null);
  if (!audio.current) audio.current = GameAudio();
  const autoLight = useRef(false);

  useEffect(() => { audio.current?.setEnabled(audioOn); localStorage.setItem("ga_tower_audio", audioOn ? "on" : "off"); }, [audioOn]);
  useEffect(() => () => { audio.current?.dispose(); }, []);
  useEffect(() => { localStorage.setItem("ga_tower_quality", quality); }, [quality]);
  useEffect(() => {
    const visibility = () => { if (document.hidden) setStatus((s) => s === "playing" ? "paused" : s); };
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, []);

  const play = async () => {
    audio.current?.unlock();
    setSaveError(""); setSaved(null); setPerfectFlash(false); setSceneReady(false);
    try {
      const session = await startSession.mutateAsync();
      setScore(0); setPerfects(0); setResult(null); setPersonalRecord(false); autoLight.current = false;
      setSessionId(session.sessionId); setStatus("playing");
    } catch (error) { setSaveError(error instanceof Error ? error.message : "Non riesco ad avviare la partita. Riprova."); }
  };

  const gameOver = useCallback((run: GameResult) => {
    setResult(run); setStatus("over");
    localStorage.setItem("ga_tower_pending", JSON.stringify(run));
    const best = Number(localStorage.getItem("ga_tower_best") ?? 0);
    if (run.score > best) { setPersonalRecord(true); localStorage.setItem("ga_tower_best", String(run.score)); }
  }, []);

  const save = async () => {
    if (!result) return;
    setSaveError(""); setSaved(null);
    const name = nickname.normalize("NFC").trim().replace(/\s+/g, " ");
    try {
      const response = await submitRun.mutateAsync({ sessionId: result.sessionId, nickname: name, commands: result.commands, ended: true });
      setSaved({ duplicate: response.duplicate, newAbsoluteRecord: response.newAbsoluteRecord });
      localStorage.setItem("ga_tower_nickname", name); localStorage.removeItem("ga_tower_pending");
      await Promise.all([utils.game.champion.invalidate(), utils.game.leaderboard.invalidate()]);
    } catch (error) {
      localStorage.setItem("ga_tower_pending", JSON.stringify({ ...result, nickname: name }));
      setSaveError(error instanceof Error ? error.message : "Salvataggio non riuscito. Il risultato è ancora qui: puoi riprovare.");
    }
  };

  const openLeaderboard = () => { if (status === "playing") setStatus("paused"); setLeaderboardOpen(true); };
  const perfect = useCallback(() => { setPerfectFlash(true); window.setTimeout(() => setPerfectFlash(false), 700); audio.current?.perfect(); }, []);
  const performance = useCallback((value: number) => {
    if (quality === "auto" && value < 42 && !autoLight.current) { autoLight.current = true; setQuality("light"); }
  }, [quality]);

  return (
    <div className={`tower-game status-${status}`}>
      {sessionId && status !== "intro" && <TowerCanvas key={sessionId} sessionId={sessionId} status={status} quality={quality} onReady={() => setSceneReady(true)} onScore={(s, p) => { setScore(s); setPerfects(p); }} onPerfect={perfect} onStone={() => audio.current?.stone()} onFall={() => audio.current?.fall()} onOver={gameOver} onPerformance={performance} />}

      <div className="tower-topline"><span>GA FORLÌ</span><span>TORRE DI BABELE</span></div>
      {status !== "intro" && <div className="tower-tools">
        <button onClick={() => setStatus(status === "paused" ? "playing" : "paused")} disabled={status === "over"} aria-label={status === "paused" ? "Riprendi" : "Pausa"}>{status === "paused" ? "▶" : "Ⅱ"}</button>
        <button onClick={() => setAudioOn(!audioOn)} aria-label={audioOn ? "Disattiva audio" : "Attiva audio"}>{audioOn ? <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M5 9v6h4l5 4V5L9 9H5Z" /><path d="M17 9c1.4 1.6 1.4 4.4 0 6M19.5 6.5c3 3 3 8 0 11" /></svg> : <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M5 9v6h4l5 4V5L9 9H5Z" /><path d="m17 9 5 6m0-6-5 6" /></svg>}</button>
      </div>}

      {(status === "playing" || status === "paused") && <div className="tower-hud" aria-live="polite"><strong>{score}</strong><span>PIANI</span><div>RECORD · {champion.data ? `${champion.data.nickname} · ${champion.data.score}` : "DA STABILIRE"} · PERFETTI {perfects}</div></div>}
      {perfectFlash && <div className="perfect-flash">PERFETTO!</div>}
      {status === "playing" && sceneReady && score === 0 && <div className="tower-hint">Tocca per posare il blocco <small>oppure premi la barra spaziatrice</small></div>}
      {status === "playing" && !sceneReady && <div className="tower-loading"><span className="tower-spinner" />Costruisco la scena 3D…</div>}

      {status === "intro" && <div className="tower-intro">
        <div className="intro-ziggurat" aria-hidden="true"><i /><i /><i /><i /></div>
        <span className="game-eyebrow">IL GIOCO DELLA GA</span><h1>Torre<br />di Babele</h1>
        <p className="intro-lead">Impila i blocchi, raggiungi nuove altezze e batti il record della GA!</p>
        <div className="intro-record"><span>RECORD ASSOLUTO</span><b>{champion.data ? `${champion.data.score} piani · ${champion.data.nickname}` : "Ancora da conquistare"}</b></div>
        {saveError && <p className="game-error" role="alert">{saveError}</p>}
        <button className="game-primary" onClick={play} disabled={startSession.isPending}>{startSession.isPending ? "Preparazione…" : "Gioca"}</button>
        <button className="game-secondary" onClick={openLeaderboard}>Classifica</button>
        <p className="intro-instructions">Tocca, clicca o premi spazio per posare il blocco. Le parti sporgenti vengono tagliate: la precisione è tutto.</p>
      </div>}

      {status === "paused" && !leaderboardOpen && <div className="game-modal-backdrop"><section className="game-modal pause-card" role="dialog" aria-modal="true" aria-labelledby="pause-title"><span className="game-eyebrow">PARTITA IN PAUSA</span><h2 id="pause-title">Prenditi un respiro</h2><p>La torre ti aspetta. Riprendi solo quando sei pronto.</p><button className="game-primary" onClick={() => setStatus("playing")}>Riprendi</button><button className="game-secondary" onClick={openLeaderboard}>Classifica</button></section></div>}

      {status === "over" && result && <div className="game-modal-backdrop game-over-backdrop"><section className="game-modal game-over" role="dialog" aria-modal="true" aria-labelledby="over-title">
        <span className="game-eyebrow">TORRE COMPLETATA</span><h2 id="over-title">La tua torre</h2>
        <div className="result-numbers"><div><b>{result.score}</b><span>piani</span></div><div><b>{result.perfects}</b><span>perfetti</span></div></div>
        {personalRecord && <p className="new-personal">Nuovo record personale!</p>}
        {saved?.newAbsoluteRecord && <p className="new-record">Nuovo record assoluto della GA!</p>}
        {saved && <p className="save-success" role="status">✓ Risultato salvato in classifica{saved.duplicate ? " (invio già registrato)" : ""}.</p>}
        {!saved && result.score > 0 && <div className="save-run"><label htmlFor="tower-nickname">Il tuo nome o nickname</label><input id="tower-nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={20} autoComplete="nickname" placeholder="Es. Luigi" /><button className="game-primary" onClick={save} disabled={submitRun.isPending || nickname.trim().length < 2}>{submitRun.isPending ? "Salvataggio…" : saveError ? "Riprova a salvare" : "Salva in classifica"}</button></div>}
        {!saved && result.score === 0 && <p className="game-empty">Posa almeno un piano per entrare in classifica.</p>}
        {saveError && <p className="game-error" role="alert">{saveError} Il risultato resta disponibile per un nuovo tentativo.</p>}
        <div className="over-actions"><button className="game-secondary" onClick={play} disabled={startSession.isPending}>Riprova</button><button className="game-secondary" onClick={openLeaderboard}>Vedi classifica</button></div>
      </section></div>}

      {status !== "intro" && <div className="tower-bottom"><button onClick={openLeaderboard}>Classifica</button><label>Qualità<select value={quality} onChange={(e) => setQuality(e.target.value as GameQuality)}><option value="auto">Automatica</option><option value="high">Alta</option><option value="light">Leggera</option></select></label></div>}
      <Leaderboard open={leaderboardOpen} onClose={() => setLeaderboardOpen(false)} />
    </div>
  );
}
