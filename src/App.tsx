import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import { I18N, CATS } from "@/i18n";
import type { Lang, Page } from "@/types";
import HomePage from "@/pages/HomePage";
import EventiPage from "@/pages/EventiPage";
import InnarioPage from "@/pages/InnarioPage";
import VersettoPage from "@/pages/VersettoPage";
import TemaPage from "@/pages/TemaPage";
import ProfiloPage from "@/pages/ProfiloPage";
import AdminPage from "@/pages/AdminPage";
import AttivitaPage from "@/pages/AttivitaPage";
import ArchivioLocandinePage from "@/pages/ArchivioLocandinePage";
import PreghierePage from "@/pages/PreghierePage";
import GratitudinePage from "@/pages/GratitudinePage";

const GiochiPage = lazy(() => import("@/pages/GiochiPage"));

const ICO_CAL = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
);
const ICO_JOIN = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /><path d="M18 8v6M15 11h6" /></svg>
);

export default function App() {
  const [lang, setLangState] = useState<Lang>(() => (localStorage.getItem("ga_lang") as Lang) || "it");
  const [page, setPage] = useState<Page>("home");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const songOpenRef = useRef<(() => void) | null>(null);

  const t = useCallback((k: string) => I18N[lang][k] ?? k, [lang]);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("ga_lang", l);
  };

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const showPage = useCallback((p: Page) => {
    setPage(p);
    setDrawerOpen(false);
    window.scrollTo(0, 0);
  }, []);

  const goPage = useCallback((p: Page) => {
    if (p === "innario" && songOpenRef.current) songOpenRef.current();
    window.history.pushState({ page: p }, "");
    showPage(p);
  }, [showPage]);

  useEffect(() => {
    window.history.replaceState({ page: "home" }, "");
    const onPop = (e: PopStateEvent) => {
      setDrawerOpen(false);
      const st = (e.state || { page: "home" }) as { page?: Page; song?: string };
      if (!st.song && songOpenRef.current) songOpenRef.current();
      showPage(st.page || "home");
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [showPage]);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 500);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const openDrawer = () => {
    setDrawerOpen(true);
    window.history.pushState({ drawer: true }, "");
  };

  return (
    <>
      <header className="header">
        <div className="header-in">
          <button className="logo" onClick={() => goPage("home")} aria-label="GA Forlì — Home">
            <img src="assets/logo.png" alt="Logo Giovani Avventisti Forlì" width="42" height="42" />
            <b>GA Forlì</b>
          </button>
          <button className="burger" onClick={openDrawer} aria-label="Apri menu">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" strokeWidth="2.4" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
        </div>
      </header>

      <aside className={`drawer${drawerOpen ? " open" : ""}`} aria-label="Menu">
        <div className="dhead">
          <b>Menu</b>
          <button className="dclose" onClick={closeDrawer} aria-label="Chiudi menu">✕</button>
        </div>
        <nav>
          <button onClick={() => goPage("tema")}><span className="ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5z" /></svg></span><span>{t("m_tema")}</span></button>
          <button onClick={() => goPage("versetto")}><span className="ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 6.5C10.6 5 8.6 4.2 6 4.2c-1 0-1.9.1-2.5.4v13.6c.6-.3 1.5-.4 2.5-.4 2.6 0 4.6.8 6 2.3 1.4-1.5 3.4-2.3 6-2.3 1 0 1.9.1 2.5.4V4.6c-.6-.3-1.5-.4-2.5-.4-2.6 0-4.6.8-6 2.3z" /><path d="M12 6.5v13.6" /></svg></span><span>{t("m_verse")}</span></button>
          <button onClick={() => goPage("attivita")}><span className="ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="17" rx="3" /><path d="M3 9h18M8 2v4M16 2v4" /></svg></span><span>{t("m_attivita")}</span></button>
          <button onClick={() => goPage("archivio")}><span className="ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7.5h16v13H4zM3 3.5h18v4H3z" /><path d="M9 12h6" /></svg></span><span>{t("m_archive")}</span></button>
          <button onClick={() => goPage("preghiere")}><span className="ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v8M9.5 5.5 12 3l2.5 2.5" /><path d="M7 21c0-4 2-6 5-6s5 2 5 6" /><path d="M9 13c-1.5 1-2 2.5-2 4M15 13c1.5 1 2 2.5 2 4" /></svg></span><span>{t("m_pray")}</span></button>
          <button onClick={() => goPage("profilo")}><span className="ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="9" cy="8.5" r="3.2" /><path d="M3.5 19c.6-3.2 2.9-5 5.5-5s4.9 1.8 5.5 5" /><path d="M16 5.5a3.2 3.2 0 0 1 0 6M17.5 14.3c1.7.7 2.8 2.3 3.1 4.7" /></svg></span><span>{t("m_join")}</span></button>
          <button onClick={() => goPage("gratitudine")}><span className="ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 3.5h8M9 3.5c-2.6 1.4-4 3.9-4 7.2v6.1c0 2.5 2.6 3.7 7 3.7s7-1.2 7-3.7v-6.1c0-3.3-1.4-5.8-4-7.2" /><path d="m9.5 12.5 2 2 3.5-3.8" /></svg></span><span>{t("m_grat")}</span></button>
          <button onClick={() => goPage("giochi")}><span className="ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20h16M6 20v-5h12v5M8 15v-5h8v5M10 10V5h4v5" /></svg></span><span>Giochi</span></button>
          <button onClick={() => goPage("admin")}><span className="ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><rect x="5" y="10.5" width="14" height="9.5" rx="2.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></svg></span><span>{t("adm_title")}</span></button>
        </nav>
        <div className="langbox">
          <p>{t("m_lang")}</p>
          <div className="flags">
            <button className={lang === "it" ? "on" : ""} onClick={() => setLang("it")} aria-label="Italiano">🇮🇹 IT</button>
            <button className={lang === "en" ? "on" : ""} onClick={() => setLang("en")} aria-label="English">🇬🇧 EN</button>
            <button className={lang === "es" ? "on" : ""} onClick={() => setLang("es")} aria-label="Español">🇪🇸 ES</button>
            <button className={lang === "pt" ? "on" : ""} onClick={() => setLang("pt")} aria-label="Português">🇧🇷 PT</button>
          </div>
        </div>
      </aside>
      <button className={`scrim${drawerOpen ? " show" : ""}`} onClick={closeDrawer} aria-hidden="true" tabIndex={-1} />

      <main className="main">
        {page === "home" && <div className="page"><HomePage t={t} lang={lang} goPage={goPage} icoCal={ICO_CAL} icoJoin={ICO_JOIN} /></div>}
        {page === "eventi" && <div className="page"><EventiPage t={t} lang={lang} /></div>}
        {page === "innario" && <div className="page"><InnarioPage t={t} lang={lang} songOpenRef={songOpenRef} /></div>}
        {page === "versetto" && <div className="page"><VersettoPage t={t} /></div>}
        {page === "tema" && <div className="page"><TemaPage t={t} /></div>}
        {page === "profilo" && <div className="page"><ProfiloPage t={t} goPage={goPage} icoCal={ICO_CAL} /></div>}
        {page === "admin" && <div className="page"><AdminPage t={t} lang={lang} goPage={goPage} /></div>}
        {page === "attivita" && <div className="page"><AttivitaPage t={t} /></div>}
        {page === "archivio" && <div className="page"><ArchivioLocandinePage t={t} lang={lang} /></div>}
        {page === "preghiere" && <div className="page"><PreghierePage t={t} lang={lang} /></div>}
        {page === "gratitudine" && <div className="page"><GratitudinePage t={t} lang={lang} goPage={goPage} /></div>}
        {page === "giochi" && <div className="page page-game"><Suspense fallback={<div className="tower-game"><div className="tower-loading"><span className="tower-spinner" />Caricamento del gioco…</div></div>}><GiochiPage /></Suspense></div>}
      </main>

      <nav className="tabbar" aria-label="Navigazione principale">
        <div className="tabbar-in">
          <button className={page === "home" ? "active" : ""} onClick={() => goPage("home")}>
            <svg width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10.5V20h13v-9.5" /></svg>
            <span>{t("tab_home")}</span>
          </button>
          <button className={page === "eventi" ? "active" : ""} onClick={() => goPage("eventi")}>
            <svg width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="16" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>
            <span>{t("tab_events")}</span>
          </button>
          <button className={page === "innario" ? "active" : ""} onClick={() => goPage("innario")}>
            <svg width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 18V5.5L21 3v12.5" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="18.5" cy="15.5" r="2.5" /></svg>
            <span>{t("tab_songs")}</span>
          </button>
          <button className={page === "profilo" ? "active" : ""} onClick={() => goPage("profilo")}>
            <svg width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="8" r="3.6" /><path d="M5 20c.7-3.8 3.6-6 7-6s6.3 2.2 7 6" /></svg>
            <span>{t("tab_prof")}</span>
          </button>
        </div>
      </nav>

      {showTop && (
        <button id="toTop" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Torna su">↑</button>
      )}
    </>
  );
}

export { CATS };
