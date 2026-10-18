import { useState, useEffect } from "react";
import type { ChangeEvent } from "react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { CATS } from "@/i18n";
import { fmtDate } from "@/lib/utils";
import type { Lang, Page, EventCategory } from "@/types";

// Comprime l'immagine scelta dal Direttore GA (max 1400px, JPEG) e la
// converte in data URL, così può essere salvata nel database.
async function fileToPosterDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1400 / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas non disponibile");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.82);
}

interface Props {
  t: (k: string) => string;
  lang: Lang;
  goPage: (p: Page) => void;
}

export default function AdminPage({ t, lang, goPage }: Props) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const isAdmin = isAuthenticated && user?.role === "admin";
  const [tab, setTab] = useState<"ev" | "tema" | "poster">("ev");

  const utils = trpc.useUtils();
  const eventsQuery = trpc.content.listEvents.useQuery(undefined, { enabled: isAdmin });
  const temaQuery = trpc.content.getTema.useQuery(undefined, { enabled: isAdmin });
  const posterQuery = trpc.content.getPoster.useQuery(undefined, { enabled: isAdmin });

  const [posterImg, setPosterImg] = useState<string | null>(null);
  const [posterMsg, setPosterMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const savePoster = trpc.content.savePoster.useMutation({
    onSuccess: () => {
      utils.content.getPoster.invalidate();
      setPosterImg(null);
      setPosterMsg({ text: t("adm_pdone"), ok: true });
      setTimeout(() => setPosterMsg(null), 3000);
    },
    onError: () => setPosterMsg({ text: t("adm_perr"), ok: false }),
  });

  const pickPoster = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setPosterImg(await fileToPosterDataUrl(file));
      setPosterMsg(null);
    } catch {
      setPosterMsg({ text: t("adm_perr"), ok: false });
    }
  };

  const [leEmail, setLeEmail] = useState("");
  const [lePassword, setLePassword] = useState("");
  const [leError, setLeError] = useState(false);

  const loginLocal = trpc.auth.loginLocal.useMutation({
    onSuccess: (res) => {
      if (res.ok) {
        setLeError(false);
        utils.auth.me.invalidate();
      } else {
        setLeError(true);
      }
    },
    onError: () => setLeError(true),
  });

  const submitLocalLogin = () => {
    if (!leEmail.trim() || !lePassword) {
      setLeError(true);
      return;
    }
    loginLocal.mutate({ email: leEmail.trim(), password: lePassword });
  };

  const [evTitle, setEvTitle] = useState("");
  const [evDate, setEvDate] = useState("");
  const [evTime, setEvTime] = useState("");
  const [evCat, setEvCat] = useState<EventCategory>("spiritualita");
  const [evDesc, setEvDesc] = useState("");
  const [evMsg, setEvMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const [temaTitle, setTemaTitle] = useState("");
  const [temaTag, setTemaTag] = useState("");
  const [temaBody, setTemaBody] = useState("");
  const [temaMsg, setTemaMsg] = useState("");
  const [temaLoaded, setTemaLoaded] = useState(false);

  useEffect(() => {
    if (temaQuery.data && !temaLoaded) {
      setTemaTitle(temaQuery.data.title);
      setTemaTag(temaQuery.data.tag);
      setTemaBody(temaQuery.data.body);
      setTemaLoaded(true);
    }
  }, [temaQuery.data, temaLoaded]);

  const addEvent = trpc.content.addEvent.useMutation({
    onSuccess: () => {
      utils.content.listEvents.invalidate();
      setEvTitle(""); setEvDate(""); setEvTime(""); setEvDesc("");
      setEvMsg({ text: t("adm_evdone"), ok: true });
      setTimeout(() => setEvMsg(null), 3000);
    },
    onError: () => setEvMsg({ text: t("adm_fill"), ok: false }),
  });

  const deleteEvent = trpc.content.deleteEvent.useMutation({
    onSuccess: () => utils.content.listEvents.invalidate(),
  });

  const saveTema = trpc.content.saveTema.useMutation({
    onSuccess: () => {
      utils.content.getTema.invalidate();
      setTemaMsg(t("adm_tdone"));
      setTimeout(() => setTemaMsg(""), 3000);
    },
  });

  const submitEvent = () => {
    if (!evTitle.trim() || !evDate) {
      setEvMsg({ text: t("adm_fill"), ok: false });
      return;
    }
    addEvent.mutate({ date: evDate, time: evTime, title: evTitle.trim(), cat: evCat, desc: evDesc.trim() });
  };

  if (isLoading) {
    return (
      <div className="adminwrap">
        <h2 className="ptitle">{t("adm_title")}</h2>
        <p className="sub">{t("adm_loading")}</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="adminwrap">
        <h2 className="ptitle">{t("adm_title")}</h2>
        <p className="sub">{t("adm_sub")}</p>
        <div className="logincard">
          <span className="lock">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#2F5D47" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true"><rect x="4.5" y="10.5" width="15" height="10" rx="3" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /></svg>
          </span>
          <h3>{t("adm_login")}</h3>
          <p>{t("adm_login_d")}</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitLocalLogin();
            }}
          >
            <label className="flabel" htmlFor="leEmail">{t("adm_email")}</label>
            <input
              className="finput"
              id="leEmail"
              type="email"
              autoComplete="username"
              value={leEmail}
              onChange={(e) => setLeEmail(e.target.value)}
            />
            <label className="flabel" htmlFor="lePassword">{t("adm_password")}</label>
            <input
              className="finput"
              id="lePassword"
              type="password"
              autoComplete="current-password"
              value={lePassword}
              onChange={(e) => setLePassword(e.target.value)}
            />
            {leError && <p className="err">{t("adm_wrong")}</p>}
            <button className="btn btn-primary" type="submit" disabled={loginLocal.isPending}>
              <span>{t("adm_enter_local")}</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="adminwrap">
        <h2 className="ptitle">{t("adm_title")}</h2>
        <p className="sub">{t("adm_sub")}</p>
        <div className="logincard">
          <span className="lock">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#C4605C" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true"><rect x="4.5" y="10.5" width="15" height="10" rx="3" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /></svg>
          </span>
          <h3>{user?.name ?? "Utente"}</h3>
          <p className="err">{t("adm_denied")}</p>
          <button className="logoutbtn" onClick={() => logout()}>{t("adm_logout")}</button>
        </div>
      </div>
    );
  }

  const events = eventsQuery.data ?? [];

  return (
    <div className="adminwrap">
      <div className="adminhead">
        <div className="who">
          <span className="avatar">{user?.avatar ? <img src={user.avatar} alt="" /> : "★"}</span>
          <span>{t("adm_title")}{user?.name ? ` · ${user.name}` : ""}</span>
        </div>
        <button className="logoutbtn" onClick={() => { logout(); goPage("home"); }}>{t("adm_logout")}</button>
      </div>
      <div className="admintabs">
        <button className={tab === "ev" ? "on" : ""} onClick={() => setTab("ev")}>{t("adm_events")}</button>
        <button className={tab === "tema" ? "on" : ""} onClick={() => setTab("tema")}>{t("adm_theme")}</button>
        <button className={tab === "poster" ? "on" : ""} onClick={() => setTab("poster")}>{t("adm_poster")}</button>
      </div>

      {tab === "ev" && (
        <div>
          <div className="formcard">
            <h4>{t("adm_newev")}</h4>
            <label className="flabel" htmlFor="evTitle">{t("f_title")}</label>
            <input className="finput" id="evTitle" value={evTitle} onChange={(e) => setEvTitle(e.target.value)} placeholder={t("f_title_ph")} />
            <div className="frow">
              <div>
                <label className="flabel" htmlFor="evDate">{t("f_date")}</label>
                <input className="finput" type="date" id="evDate" value={evDate} onChange={(e) => setEvDate(e.target.value)} />
              </div>
              <div>
                <label className="flabel" htmlFor="evTime">{t("f_time")}</label>
                <input className="finput" type="time" id="evTime" value={evTime} onChange={(e) => setEvTime(e.target.value)} />
              </div>
            </div>
            <label className="flabel" htmlFor="evCat">{t("f_cat")}</label>
            <select className="fselect" id="evCat" value={evCat} onChange={(e) => setEvCat(e.target.value as EventCategory)}>
              {(["spiritualita", "natura", "musica", "comunita", "formazione"] as const).map((c) => (
                <option key={c} value={c}>{t("cat_" + c)}</option>
              ))}
            </select>
            <label className="flabel" htmlFor="evDesc">{t("f_desc")}</label>
            <textarea className="ftext" id="evDesc" value={evDesc} onChange={(e) => setEvDesc(e.target.value)} placeholder={t("f_desc_ph")} />
            <button className="savebtn" onClick={submitEvent} disabled={addEvent.isPending}>{t("adm_publish")}</button>
            {evMsg && <span className="savedmsg" style={evMsg.ok ? {} : { color: "var(--color-danger)" }}>{evMsg.text}</span>}
          </div>
          <div className="formcard">
            <h4>{t("adm_evh")}</h4>
            {events.length === 0 && <div className="noevents">{t("adm_noev")}</div>}
            {events.map((e) => (
              <div className="adminev" key={e.id}>
                <span className="edot" style={{ background: CATS[e.cat].color }} />
                <div className="em">
                  <b>{e.title}</b>
                  <small>{fmtDate(e.date, e.time, lang)} · {t("cat_" + e.cat)}</small>
                </div>
                <button className="del" onClick={() => deleteEvent.mutate({ id: e.id })} aria-label={t("adm_del")}>🗑</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "tema" && (
        <div className="formcard">
          <h4>{t("adm_theme")}</h4>
          <label className="flabel" htmlFor="temaTitle">{t("f_ttitle")}</label>
          <input className="finput" id="temaTitle" value={temaTitle} onChange={(e) => setTemaTitle(e.target.value)} />
          <label className="flabel" htmlFor="temaTag">{t("f_ttag")}</label>
          <input className="finput" id="temaTag" value={temaTag} onChange={(e) => setTemaTag(e.target.value)} />
          <label className="flabel" htmlFor="temaBody">{t("f_tbody")}</label>
          <textarea className="ftext" id="temaBody" style={{ minHeight: 180 }} value={temaBody} onChange={(e) => setTemaBody(e.target.value)} />
          <button className="savebtn" onClick={() => saveTema.mutate({ title: temaTitle.trim() || "—", tag: temaTag.trim(), body: temaBody })} disabled={saveTema.isPending}>
            {t("adm_savet")}
          </button>
          {temaMsg && <span className="savedmsg">{temaMsg}</span>}
        </div>
      )}

      {tab === "poster" && (
        <div className="formcard">
          <h4>{t("adm_poster")}</h4>
          <p className="sub" style={{ marginBottom: 14 }}>{t("adm_poster_d")}</p>
          <span className="flabel">{t("adm_poster_cur")}</span>
          {posterQuery.data?.image ? (
            <div className="postercard" style={{ margin: "6px 0 18px" }}>
              <img src={posterQuery.data.image} alt={t("adm_poster_cur")} />
            </div>
          ) : (
            <p className="noevents" style={{ textAlign: "left", padding: "4px 0 14px" }}>{t("adm_poster_none")}</p>
          )}
          <label className="flabel" htmlFor="posterFile">{t("adm_poster_new")}</label>
          <input className="finput" id="posterFile" type="file" accept="image/*" onChange={pickPoster} />
          {posterImg && (
            <>
              <span className="flabel" style={{ marginTop: 14 }}>{t("adm_poster_prev")}</span>
              <div className="postercard" style={{ margin: "6px 0 14px" }}>
                <img src={posterImg} alt={t("adm_poster_prev")} />
              </div>
              <button className="savebtn" onClick={() => savePoster.mutate({ image: posterImg })} disabled={savePoster.isPending}>
                {t("adm_poster_save")}
              </button>
            </>
          )}
          {!posterImg && posterQuery.data?.image && (
            <button className="logoutbtn" onClick={() => savePoster.mutate({ image: "" })} disabled={savePoster.isPending}>
              {t("adm_poster_del")}
            </button>
          )}
          {posterMsg && <span className="savedmsg" style={posterMsg.ok ? {} : { color: "var(--color-danger)" }}>{posterMsg.text}</span>}
        </div>
      )}
    </div>
  );
}
