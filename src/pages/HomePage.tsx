import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { trpc } from "@/providers/trpc";
import { VERSES } from "@/i18n";
import { upcomingEvents, dayOfYear } from "@/lib/utils";
import EventDetailDialog from "@/components/EventDetailDialog";
import EventPosterButton from "@/components/EventPosterButton";
import type { AppEvent, Lang, Page } from "@/types";

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
  // Tutti gli eventi futuri nel carosello, senza limite di numero.
  const upcoming = upcomingEvents(events);
  const postersQuery = trpc.content.getPosters.useQuery();
  const posters = postersQuery.data?.images ?? [];
  const verse = VERSES[dayOfYear() % VERSES.length];
  const [liked, setLiked] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null);
  const homePostersRef = useRef<HTMLDivElement>(null);
  const postersRef = useRef<HTMLDivElement>(null);

  const scrollCarousel = (ref: React.RefObject<HTMLDivElement | null>) => {
    const scroller = ref.current;
    if (!scroller) return;
    const atEnd = scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 8;
    scroller.scrollTo({
      left: atEnd ? 0 : scroller.scrollLeft + scroller.clientWidth * 0.85,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  };
  const championQuery = trpc.game.champion.useQuery();
  const champion = championQuery.data;
  // Testi della card "I nostri valori": se il Direttore GA li ha salvati
  // dall'area riservata usiamo quelli, altrimenti i testi delle traduzioni.
  const valuesQuery = trpc.content.getValues.useQuery();
  const savedValues = valuesQuery.data?.values?.[lang];
  const valueText = (key: "v1_t" | "v1_d" | "v2_t" | "v2_d" | "v3_t" | "v3_d") => {
    const saved = savedValues?.[key];
    return saved && saved.trim() ? saved : t(key);
  };
  // Anteprima delle prime 4 richieste di preghiera approvate per la card in home.
  const prayersQuery = trpc.content.listPrayers.useQuery();
  const prayerPreview = (prayersQuery.data ?? []).slice(0, 4);

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

      {postersQuery.isLoading && (
        <div className="postercard" aria-hidden="true"><div className="sk" style={{ height: 300 }} /></div>
      )}
      {!postersQuery.isLoading && posters.length > 0 && (
        <section aria-label={t("adm_posters")}>
          <button
            type="button"
            className="poster-scroll-cue"
            onClick={() => scrollCarousel(homePostersRef)}
            aria-label={t("home_scroll_posters")}
          >
            <span>{t("home_scroll_posters")}</span>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6" /></svg>
          </button>
          <div className="posterscroll" ref={homePostersRef}>
            {posters.map((img, i) => (
              <div className="postercard" key={i}>
                <img src={img} alt={`Locandina ${i + 1} del gruppo GA Forlì`} loading="lazy" draggable={false} />
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="sechead home-events-head">
        <h3>{t("h_upcoming")}</h3>
        <button className="all" onClick={() => goPage("eventi")}><span>{t("see_all")}</span> ›</button>
      </div>
      {eventsQuery.isLoading && (
        <div className="postercard" aria-hidden="true"><div className="sk" style={{ height: 300 }} /></div>
      )}
      {!eventsQuery.isLoading && upcoming.length > 0 && (
        <>
          <button
            type="button"
            className="poster-scroll-cue"
            onClick={() => scrollCarousel(postersRef)}
            aria-label={t("home_scroll_events")}
          >
            <span>{t("home_scroll_events")}</span>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6" /></svg>
          </button>
          <div className="posterscroll" ref={postersRef} aria-label={t("h_upcoming")}>
            {upcoming.map((event) => (
              <EventPosterButton key={event.id} event={event} onOpen={setSelectedEvent} t={t} lang={lang} />
            ))}
          </div>
        </>
      )}
      {!eventsQuery.isLoading && !upcoming.length && <div className="noevents">{t("noevents")}</div>}

      <section className="hpray" aria-labelledby="hpray-title">
        <div className="sechead"><h3 id="hpray-title">{t("t_pray")}</h3></div>
        {prayersQuery.isLoading && (
          <div className="hpray-board" aria-hidden="true">
            <div className="postit hpray-postit" style={{ ["--tilt" as string]: "-1.4deg", background: "#FFF3B8" }}><div className="sk" style={{ height: 84 }} /></div>
            <div className="postit hpray-postit" style={{ ["--tilt" as string]: "1.3deg", background: "#DDE8C8" }}><div className="sk" style={{ height: 84 }} /></div>
          </div>
        )}
        {!prayersQuery.isLoading && prayerPreview.length > 0 && (
          <div className="hpray-board">
            {prayerPreview.map((p, i) => (
              <button
                key={p.id}
                className="postit hpray-postit"
                style={{ ["--tilt" as string]: ["-1.4deg", "1.3deg", "-0.9deg", "1.1deg"][i % 4], background: p.color || "#FFF3B8" }}
                onClick={() => goPage("preghiere")}
                aria-label={`${t("pray_for")} ${p.title}`}
              >
                <span className="pin" style={{ background: ["#C96F4A", "#5B7B9A", "#7A9A5B", "#9A5B7B"][i % 4] }} aria-hidden="true" />
                <span className="ptitle2">{p.title}</span>
                <span className="pbody">{p.body}</span>
              </button>
            ))}
          </div>
        )}
        {!prayersQuery.isLoading && prayerPreview.length === 0 && (
          <p className="sub" style={{ margin: "0 0 10px" }}>{t("home_pray_empty")}</p>
        )}
        <button className="hpray-cta" onClick={() => goPage("preghiere")}>
          <span>{t("home_pray_all")}</span>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6" /></svg>
        </button>
      </section>

      <section className="gamehome" aria-labelledby="gamehome-title">
        <span className="gamehome-kicker">TORRE DI BABELE · IL GIOCO 3D</span>
        <h3 id="gamehome-title">Batti il record dei GA</h3>
        <p>Un blocco alla volta, costruisci la torre più alta. Precisione, pazienza e un pizzico di sfida.</p>
        <p className="gamehome-champion">{champion ? <>Campione attuale: <b>{champion.nickname}</b> · {champion.score} piani</> : <><b>Il primo record è ancora da conquistare.</b></>}</p>
        <button onClick={() => goPage("giochi")}>Gioca ora <span aria-hidden="true">→</span></button>
      </section>

      <div className="sechead"><h3>{t("h_values")}</h3></div>
      <div className="values">
        <div className="value">
          <span className="vico" style={{ background: "var(--color-secondary-soft)" }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2F5D47" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true"><circle cx="8" cy="9" r="3" /><circle cx="17" cy="10" r="2.4" /><path d="M2.8 19c.4-3.2 2.6-5 5.2-5s4.8 1.8 5.2 5M14.5 14.6c2.3.3 3.9 1.9 4.3 4.4" /></svg>
          </span>
          <div><h5>{valueText("v1_t")}</h5><p>{valueText("v1_d")}</p></div>
        </div>
        <div className="value">
          <span className="vico" style={{ background: "var(--color-info-soft)" }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#33586E" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true"><path d="M5 19C5 9 12 4 20 4c0 9-5 15-15 15Z" /><path d="M5 19c3-5 7-9 11-11" /></svg>
          </span>
          <div><h5>{valueText("v2_t")}</h5><p>{valueText("v2_d")}</p></div>
        </div>
        <div className="value">
          <span className="vico" style={{ background: "var(--color-warning-soft)" }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#8A6A12" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 19 L9 8 L13 14 L16 9 L21 19 Z" /></svg>
          </span>
          <div><h5>{valueText("v3_t")}</h5><p>{valueText("v3_d")}</p></div>
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

      <EventDetailDialog event={selectedEvent} onClose={() => setSelectedEvent(null)} t={t} lang={lang} />
    </>
  );
}
