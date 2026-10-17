import { useState } from "react";
import { VERSES } from "@/i18n";
import { dayOfYear } from "@/lib/utils";

export default function VersettoPage({ t }: { t: (k: string) => string }) {
  const [verse, setVerse] = useState(() => VERSES[dayOfYear() % VERSES.length]);

  return (
    <>
      <h2 className="ptitle">{t("t_ver")}</h2>
      <p className="sub">{t("s_ver")}</p>
      <div className="versecard">
        <img className="bg" src="assets/verse.jpg" alt="" />
        <div className="veil" />
        <div className="vinner">
          <span className="vlabel2">{t("t_ver")}</span>
          <p className="q">{verse.t}</p>
          <p className="ref">{verse.r}</p>
          <button className="btn2" onClick={() => setVerse(VERSES[Math.floor(Math.random() * VERSES.length)])}>
            {t("another")}
          </button>
        </div>
      </div>
    </>
  );
}
