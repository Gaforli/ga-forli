import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { CATS, EVENT_IMG, MONTHS } from "@/i18n";
import { fmtDate, upcomingEvents } from "@/lib/utils";
import type { Lang, AppEvent } from "@/types";

const DOW = ["L", "M", "M", "G", "V", "S", "D"];

function keyOf(y: number, m: number, d: number) {
  return y + "-" + String(m + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0");
}

function EventCard({ e, t, lang }: { e: AppEvent; t: (k: string) => string; lang: Lang }) {
  const isLibero = e.title.trim().toLowerCase() === "libero";
  return (
    <div className={`eventcard cat-${e.cat}${isLibero ? " libero" : ""}`}>
      <img className="ethumb" src={e.image || EVENT_IMG[e.cat]} alt="" loading="lazy" />
      <div className="emain">
        <span className="ecat">{t("cat_" + e.cat)}</span>
        <h5>{e.title}</h5>
        <div className="ewhen">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7A8794" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
          {fmtDate(e.date, e.time, lang)}
        </div>
        <p className="edesc">{e.desc}</p>
      </div>
    </div>
  );
}

export default function EventiPage({ t, lang }: { t: (k: string) => string; lang: Lang }) {
  const eventsQuery = trpc.content.listEvents.useQuery();
  const events = eventsQuery.data ?? [];
  const [cal, setCal] = useState(() => new Date());
  const [selKey, setSelKey] = useState<string | null>(null);

  const y = cal.getFullYear(), m = cal.getMonth();
  const first = (new Date(y, m, 1).getDay() + 6) % 7;
  const days = new Date(y, m + 1, 0).getDate();
  const today = new Date();
  const eventsOn = (k: string) => events.filter((e) => e.date === k);

  const calMove = (d: number) => {
    const n = new Date(cal);
    n.setMonth(n.getMonth() + d);
    setCal(n);
    setSelKey(null);
  };

  const cells = [];
  for (let i = 0; i < first; i++) cells.push(<div key={"e" + i} className="day empty" />);
  for (let d = 1; d <= days; d++) {
    const k = keyOf(y, m, d);
    const evs = eventsOn(k);
    const isT = d === today.getDate() && m === today.getMonth() && y === today.getFullYear();
    cells.push(
      <button
        key={k}
        className={"day" + (isT ? " today" : "") + (k === selKey ? " selected" : "")}
        onClick={() => setSelKey(k)}
        aria-label={`${d} ${MONTHS[lang][m]}${evs.length ? `, ${evs.length} eventi` : ""}`}
      >
        {d}
        <span className="dots">{evs.slice(0, 3).map((e, i) => <i key={i} className="dot" style={{ background: CATS[e.cat].color }} />)}</span>
      </button>
    );
  }

  const selEvents = selKey ? eventsOn(selKey) : [];
  const selLabel = selKey
    ? (() => { const p = selKey.split("-"); return `${t("events_of")} ${+p[2]} ${MONTHS[lang][+p[1] - 1]} ${p[0]}`; })()
    : "";

  return (
    <div className="stagger-in">
      <h2 className="ptitle">{t("t_cal")}</h2>
      <p className="sub">{t("s_cal")}</p>
      <div className="calwrap">
        <div className="calhead">
          <button onClick={() => calMove(-1)} aria-label="Mese precedente">‹</button>
          <h3>{MONTHS[lang][m]} {y}</h3>
          <button onClick={() => calMove(1)} aria-label="Mese successivo">›</button>
        </div>
        <div className="calendar">
          {DOW.map((d, i) => <div key={i} className="dow">{d}</div>)}
          {cells}
        </div>
        <div className="legend">
          {Object.keys(CATS).map((c) => (
            <span key={c}><i style={{ background: CATS[c].color }} />{t("cat_" + c)}</span>
          ))}
        </div>
        {selKey && (
          <div className="events">
            <h4>{selLabel}</h4>
            {selEvents.length
              ? selEvents.map((e) => <EventCard key={e.id} e={e} t={t} lang={lang} />)
              : <div className="noevents">{t("noevents")}</div>}
          </div>
        )}
        <div className="upcoming">
          <h4>{t("h_upcoming")}</h4>
          <div style={{ marginTop: 12 }}>
            {eventsQuery.isLoading && (
              <>
                <div className="sk-evcard"><div className="sk sk-img" /><div className="sk-lines"><div className="sk w40" /><div className="sk w80" /><div className="sk w60" /></div></div>
                <div className="sk-evcard"><div className="sk sk-img" /><div className="sk-lines"><div className="sk w40" /><div className="sk w80" /><div className="sk w60" /></div></div>
              </>
            )}
            {upcomingEvents(events).map((e) => <EventCard key={e.id} e={e} t={t} lang={lang} />)}
            {!eventsQuery.isLoading && !events.length && <div className="noevents">{t("noevents")}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
