import { useState } from "react";
import type { ReactNode } from "react";
import { trpc } from "@/providers/trpc";
import { CATS, EVENT_IMG, VERSES } from "@/i18n";
import { fmtDate, upcomingEvents, dayOfYear } from "@/lib/utils";
import type { Lang, Page } from "@/types";

interface Props {
  t: (k: string) => string;
  lang: Lang;
  goPage: (p: Page) => void;
  icoCal: ReactNode;
  icoJoin: ReactNode;
}

export default function HomePage({ t, lang, goPage, icoCal, icoJoin }: Props) {
  const eventsQuery = trpc.content.listEvents.useQuery();
  const events = eventsQuery.data ?? [];
  const upcoming = upcomingEvents(events).slice(0, 5);
  const verse = VERSES[dayOfYear() % VERSES.length];
  const [liked, setLiked] = useState(false);
  const posterQuery = trpc.content.getPoster.useQuery();
  const poster = posterQuery.data?.image;

  return (
    <>
      <div className="hero">
        <img className="bg" src="assets/hero.jpg" alt="Giovani del gruppo GA Forlì seduti sull'erba al tramonto" />
        <div className="veil" />
        <div className="hbody">
          <div className="hand" aria-hidden="true">Fede · Amicizia · Servizio</div>
          <h2>Giovani Avventisti<br />Forlì</h2>
          <p className="tagline">{t("tagline")}</p>
          <div className="ctas">
            <button className="btn btn-primary" onClick={() => goPage("eventi")}>{icoCal}<span>{t("cta_events")}</span></button>
            <button className="btn btn-light" onClick={() => goPage("profilo")}>{icoJoin}<span>{t("cta_join")}</span></button>
          </div>
        </div>
      </div>

      {posterQuery.isLoading && (
        <div className="postercard" aria-hidden="true"><div className="sk" style={{ height: 300 }} /></div>
      )}
      {!posterQuery.isLoading && poster && (
        <div className="postercard">
          <img src={poster} alt="Locandina degli appuntamenti del mese del gruppo GA Forlì" />
        </div>
      )}

      <div className="sechead">
        <h3>{t("h_upcoming")}</h3>
        <button className="all" onClick={() => goPage("eventi")}><span>{t("see_all")}</span> ›</button>
      </div>
      <div className="evscroll">
        {eventsQuery.isLoading && (
          <>
            <div className="evcard" aria-hidden="true"><div className="sk" style={{ height: 132 }} /><div className="ebody"><div className="sk" style={{ height: 11, width: "55%", marginBottom: 8 }} /><div className="sk" style={{ height: 14, width: "85%" }} /><div className="sk" style={{ height: 11, width: "65%", marginTop: 6 }} /></div></div>
            <div className="evcard" aria-hidden="true"><div className="sk" style={{ height: 132 }} /><div className="ebody"><div className="sk" style={{ height: 11, width: "45%", marginBottom: 8 }} /><div className="sk" style={{ height: 14, width: "80%" }} /><div className="sk" style={{ height: 11, width: "60%", marginTop: 6 }} /></div></div>
          </>
        )}
        {upcoming.map((e) => (
          <button className="evcard" key={e.id} onClick={() => goPage("eventi")}>
            <div className="thumb">
              <img src={e.image || EVENT_IMG[e.cat]} alt="" loading="lazy" />
            </div>
            <div className="ebody">
              <span className="badge"><i style={{ background: CATS[e.cat].color }} />{t("cat_" + e.cat)}</span>
              <div className="when">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7A8794" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
                {fmtDate(e.date, e.time, lang)}
              </div>
              <h5>{e.title}</h5>
              <p>{e.desc}</p>
            </div>
          </button>
        ))}
        {!eventsQuery.isLoading && !upcoming.length && <div className="noevents" style={{ flex: 1 }}>{t("noevents")}</div>}
      </div>

      <div className="sechead"><h3>{t("h_values")}</h3></div>
      <div className="values">
        <div className="value">
          <span className="vico" style={{ background: "var(--color-secondary-soft)" }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2F5D47" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true"><circle cx="8" cy="9" r="3" /><circle cx="17" cy="10" r="2.4" /><path d="M2.8 19c.4-3.2 2.6-5 5.2-5s4.8 1.8 5.2 5M14.5 14.6c2.3.3 3.9 1.9 4.3 4.4" /></svg>
          </span>
          <div><h5>{t("v1_t")}</h5><p>{t("v1_d")}</p></div>
        </div>
        <div className="value">
          <span className="vico" style={{ background: "var(--color-info-soft)" }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#33586E" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true"><path d="M5 19C5 9 12 4 20 4c0 9-5 15-15 15Z" /><path d="M5 19c3-5 7-9 11-11" /></svg>
          </span>
          <div><h5>{t("v2_t")}</h5><p>{t("v2_d")}</p></div>
        </div>
        <div className="value">
          <span className="vico" style={{ background: "var(--color-warning-soft)" }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#8A6A12" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 19 L9 8 L13 14 L16 9 L21 19 Z" /></svg>
          </span>
          <div><h5>{t("v3_t")}</h5><p>{t("v3_d")}</p></div>
        </div>
      </div>

      <div className="hverse">
        <img className="bg" src="assets/verse.jpg" alt="" />
        <div className="veil" />
        <div className="vbody">
          <p className="vlabel">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#243B53" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v18H6.5A2.5 2.5 0 0 0 4 23Z" /><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v18h4.5A2.5 2.5 0 0 1 20 23Z" /></svg>
            <span>{t("t_ver")}</span>
          </p>
          <p className="q">{verse.t}</p>
          <p className="ref">{verse.r}</p>
        </div>
        <button className={`heart${liked ? " liked" : ""}`} onClick={() => setLiked(!liked)} aria-label="Aggiungi ai preferiti">
          <svg width="24" height="24" viewBox="0 0 24 24" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20.5C7 16.5 3.5 13.4 3.5 9.6 3.5 7 5.5 5 8 5c1.6 0 3.1.8 4 2.1C12.9 5.8 14.4 5 16 5c2.5 0 4.5 2 4.5 4.6 0 3.8-3.5 6.9-8.5 10.9Z" /></svg>
        </button>
      </div>
    </>
  );
}
