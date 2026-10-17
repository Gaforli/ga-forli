import type { ReactNode } from "react";
import type { Page } from "@/types";

interface Props {
  t: (k: string) => string;
  goPage: (p: Page) => void;
  icoCal: ReactNode;
}

export default function ProfiloPage({ t, goPage, icoCal }: Props) {
  return (
    <>
      <h2 className="ptitle">{t("t_prof")}</h2>
      <p className="sub">{t("s_prof")}</p>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <img src="assets/logo_big.png" alt="Logo Giovani Avventisti Forlì" style={{ width: "min(240px,60vw)", borderRadius: "50%", boxShadow: "var(--shadow-md)" }} />
      </div>
      <div className="profcard">
        <h4>
          <span className="pico" style={{ background: "var(--color-secondary-soft)" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2F5D47" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true"><circle cx="8.5" cy="8.5" r="3" /><circle cx="16.5" cy="10" r="2.4" /><path d="M3.5 19.5c.4-3.4 2.5-5.2 5-5.2s4.6 1.8 5 5.2M14.6 14.8c2.2.4 3.7 2 4.1 4.7" /></svg>
          </span>
          GA Forlì · Giovani Avventisti
        </h4>
        <p>{t("prof_intro")}</p>
      </div>
      <div className="profcard">
        <h4>
          <span className="pico" style={{ background: "var(--color-warning-soft)" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8A6A12" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="16" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>
          </span>
          <span>{t("prof_when")}</span>
        </h4>
        <p>{t("prof_when_d")}</p>
      </div>
      <div className="profcard">
        <h4>
          <span className="pico" style={{ background: "var(--color-accent-soft)" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9A4F2E" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true"><rect x="3" y="5.5" width="18" height="14" rx="3" /><path d="m4 7 8 6 8-6" /></svg>
          </span>
          <span>{t("prof_contact")}</span>
        </h4>
        <p>
          <button className="socialbtn" onClick={() => window.open("https://www.instagram.com/ga_forli", "_blank")}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" /></svg>
            @ga_forli
          </button>
        </p>
        <button className="btn btn-primary" onClick={() => goPage("eventi")}>{icoCal}<span>{t("cta_events")}</span></button>
      </div>
    </>
  );
}
