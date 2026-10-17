import { useState, useEffect } from "react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { CATS } from "@/i18n";
import { fmtDate } from "@/lib/utils";
import type { Lang, Page, EventCategory } from "@/types";

interface Props {
  t: (k: string) => string;
  lang: Lang;
  goPage: (p: Page) => void;
}

export default function AdminPage({ t, lang, goPage }: Props) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const isAdmin = isAuthenticated && user?.role === "admin";
  const [tab, setTab] = useState<"ev" | "tema">("ev");

  const utils = trpc.useUtils();
  const eventsQuery = trpc.content.listEvents.useQuery(undefined, { enabled: isAdmin });
  const temaQuery = trpc.content.getTema.useQuery(undefined, { enabled: isAdmin });

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
    </div>
  );
}
