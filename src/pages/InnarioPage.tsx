import { useState, useEffect, useRef, useCallback } from "react";
import type { MutableRefObject } from "react";
import { SONGS } from "@/data/songs";
import { normalize, isChordy, titleCase } from "@/lib/utils";
import type { Song } from "@/types";

const SPEEDS = [0.7, 1.3, 2.1, 3.2];
const LETTERS = "ABCDEFGHILMNOPQRSTUVZ".split("");

interface Props {
  t: (k: string) => string;
  lang: string;
  songOpenRef: MutableRefObject<(() => void) | null>;
}

export default function InnarioPage({ t, songOpenRef }: Props) {
  const [query, setQuery] = useState("");
  const [song, setSong] = useState<Song | null>(null);
  const [fs, setFs] = useState(() => parseFloat(localStorage.getItem("ga_fs") || "0.95"));
  const [speedIdx, setSpeedIdx] = useState(1);
  const [playing, setPlaying] = useState(false);
  const playTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    document.documentElement.style.setProperty("--song-font", fs + "rem");
    localStorage.setItem("ga_fs", String(fs));
  }, [fs]);

  const stopPlay = useCallback(() => {
    setPlaying(false);
    if (playTimer.current) { clearInterval(playTimer.current); playTimer.current = null; }
  }, []);

  const togglePlay = useCallback(() => {
    if (playing) { stopPlay(); return; }
    setPlaying(true);
    playTimer.current = setInterval(() => {
      window.scrollBy(0, SPEEDS[speedIdx]);
      if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 2) stopPlay();
    }, 40);
  }, [playing, speedIdx, stopPlay]);

  useEffect(() => () => { if (playTimer.current) clearInterval(playTimer.current); }, []);

  const closeSongView = useCallback(() => {
    stopPlay();
    setSong(null);
  }, [stopPlay]);

  useEffect(() => { songOpenRef.current = song ? closeSongView : null; }, [song, closeSongView, songOpenRef]);

  const openSong = (num: string) => {
    const s = SONGS.find((x) => x.num === num);
    if (!s) return;
    window.history.pushState({ page: "innario", song: num }, "");
    setSong(s);
    window.scrollTo(0, 0);
  };

  const closeSong = () => {
    if (!song) return;
    window.history.back();
  };

  const q = normalize(query);
  const list = SONGS.filter((s) =>
    !q || normalize(s.title).includes(q) || s.num.includes(q) ||
   ofs(s).includes(q)
  );
  function ofs(s: Song) {
    return normalize(s.lines.map((e) => (e.t === "text" ? e.l : e.t === "pair" ? e.l : "")).join(" "));
  }

  const jumpTo = (i: number) => {
    const rows = document.querySelectorAll(".songrow");
    if (rows[i]) rows[i].scrollIntoView({ behavior: "smooth", block: "center" });
  };

  if (song) {
    return (
      <div>
        <button className="backlink" onClick={closeSong}>← <span>{t("back")}</span></button>
        <div className="readhead">
          <span className="num">{song.num}</span>
          <h2>{titleCase(song.title)}</h2>
          <div className="toolbar">
            <div className="toolgroup" role="group" aria-label="Dimensione testo">
              <span className="lbl">{t("fontsize")}</span>
              <button onClick={() => setFs((v) => Math.max(0.75, +(v - 0.1).toFixed(2)))} aria-label="Riduci dimensione testo">A−</button>
              <button onClick={() => setFs((v) => Math.min(2.6, +(v + 0.1).toFixed(2)))} aria-label="Aumenta dimensione testo">A+</button>
            </div>
            <div className="toolgroup" role="group" aria-label="Scorrimento automatico">
              <span className="lbl">{t("autoplay")}</span>
              <button className={`play${playing ? " playing" : ""}`} onClick={togglePlay} aria-label="Avvia o ferma lo scorrimento automatico">{playing ? "⏸" : "▶"}</button>
              {SPEEDS.map((_, i) => (
                <button key={i} className={`speed${speedIdx === i ? " on" : ""}`} onClick={() => setSpeedIdx(i)}>{i + 1}×</button>
              ))}
            </div>
          </div>
        </div>
        <div className="songbody">
          {song.lines.map((e, i) => {
            if (e.t === "gap") return <div key={i} className="sgap" />;
            if (e.t === "text") {
              const chordy = isChordy(e.l);
              return <p key={i} className="sg"><span className={chordy ? "sc" : "sl"}>{e.l}</span></p>;
            }
            if (e.t === "chords") return <p key={i} className="sg"><span className="sc">{e.c}</span></p>;
            return (
              <p key={i} className="sg">
                {e.c.map((c, j) => <span key={j} className="sc">{c}</span>)}
                <span className="sl">{e.l}</span>
              </p>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="stagger-in">
      <h2 className="ptitle">{t("t_inn")}</h2>
      <p className="sub">{t("s_inn")}</p>
      <div className="searchwrap">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("ph_search")} aria-label="Cerca un canto" />
      </div>
      <div className="indexbar" aria-label="Indice alfabetico">
        {LETTERS.map((L) => {
          const hit = list.findIndex((s) => normalize(s.title).startsWith(normalize(L)));
          return hit >= 0
            ? <button key={L} onClick={() => jumpTo(hit)} aria-label={"Salta a " + L}>{L}</button>
            : <button key={L} className="disabled" disabled aria-label={"Salta a " + L}>{L}</button>;
        })}
      </div>
      <div className="count" role="status">{list.length} {t("found")}</div>
      <div className="songlist">
        {list.map((s) => (
          <button className="songrow" key={s.num} onClick={() => openSong(s.num)}>
            <span className="num">{s.num}</span>
            <span className="t"><b>{titleCase(s.title)}</b>{s.tag ? <small>🏷 {s.tag}</small> : null}</span>
            <span className="go" aria-hidden="true">›</span>
          </button>
        ))}
      </div>
    </div>
  );
}
