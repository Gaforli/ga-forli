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
  const [tab, setTab] = useState<"ev" | "tema" | "posters" | "monthly" | "prayers">("ev");

  const utils = trpc.useUtils();
  const eventsQuery = trpc.content.listEvents.useQuery(undefined, { enabled: isAdmin });
  const temaQuery = trpc.content.getTema.useQuery(undefined, { enabled: isAdmin });
  const postersQuery = trpc.content.getPosters.useQuery(undefined, { enabled: isAdmin });
  const monthlyQuery = trpc.content.getMonthly.useQuery(undefined, { enabled: isAdmin });
  const pendingPrayersQuery = trpc.content.listPendingPrayers.useQuery(undefined, { enabled: isAdmin });
  const prayersQuery = trpc.content.listPrayers.useQuery(undefined, { enabled: isAdmin });

  const approvePrayer = trpc.content.approvePrayer.useMutation({
    onSuccess: () => {
      utils.content.listPendingPrayers.invalidate();
      utils.content.listPrayers.invalidate();
    },
  });

  const deletePrayer = trpc.content.deletePrayer.useMutation({
    onSuccess: () => {
      utils.content.listPendingPrayers.invalidate();
      utils.content.listPrayers.invalidate();
    },
  });

  // ── Locandine home (multiple) ──
  const [postersList, setPostersList] = useState<string[]>([]);
  const [postersLoaded, setPostersLoaded] = useState(false);
  const [postersMsg, setPostersMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [posterNewImg, setPosterNewImg] = useState<string | null>(null);

  useEffect(() => {
    if (postersQuery.data && !postersLoaded) {
      setPostersList(postersQuery.data.images);
      setPostersLoaded(true);
    }
  }, [postersQuery.data, postersLoaded]);

  const savePosters = trpc.content.savePosters.useMutation({
    onSuccess: () => {
      utils.content.getPosters.invalidate();
      setPostersMsg({ text: t("adm_pdone"), ok: true });
      setTimeout(() => setPostersMsg(null), 3000);
    },
    onError: () => setPostersMsg({ text: t("adm_perr"), ok: false }),
  });

  const pickNewPoster = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setPosterNewImg(await fileToPosterDataUrl(file));
      setPostersMsg(null);
    } catch {
      setPostersMsg({ text: t("adm_perr"), ok: false });
    }
  };

  const addPoster = () => {
    if (!posterNewImg) return;
    setPostersList((prev) => [...prev, posterNewImg]);
    setPosterNewImg(null);
  };

  const movePoster = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= postersList.length) return;
    setPostersList((prev) => {
      const arr = [...prev];
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return arr;
    });
  };

  const removePoster = (i: number) => {
    setPostersList((prev) => prev.filter((_, idx) => idx !== i));
  };

  const submitPosters = () => {
    savePosters.mutate({ images: postersList });
  };

  // ── Locandina mensile ──
  const [monthlyImg, setMonthlyImg] = useState<string | null>(null);
  const [monthlyMsg, setMonthlyMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const saveMonthly = trpc.content.saveMonthly.useMutation({
    onSuccess: () => {
      utils.content.getMonthly.invalidate();
      setMonthlyImg(null);
      setMonthlyMsg({ text: t("adm_mdone"), ok: true });
      setTimeout(() => setMonthlyMsg(null), 3000);
    },
    onError: () => setMonthlyMsg({ text: t("adm_perr"), ok: false }),
  });

  const pickMonthly = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setMonthlyImg(await fileToPosterDataUrl(file));
      setMonthlyMsg(null);
    } catch {
      setMonthlyMsg({ text: t("adm_perr"), ok: false });
    }
  };

  const submitMonthly = () => {
    if (monthlyImg) saveMonthly.mutate({ image: monthlyImg });
  };

  const removeMonthly = () => {
    saveMonthly.mutate({ image: "" });
  };

  // ── Login / Eventi / Tema (invariati) ──
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
  const [evImg, setEvImg] = useState<string | null>(null);
  const [evMsg, setEvMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const pickEvImg = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setEvImg(await fileToPosterDataUrl(file));
    } catch {
      setEvMsg({ text: t("adm_perr"), ok: false });
    }
  };

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
      setEvTitle(""); setEvDate(""); setEvTime(""); setEvDesc(""); setEvImg(null);
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
    addEvent.mutate({ date: evDate, time: evTime, title: evTitle.trim(), cat: evCat, desc: evDesc.trim(), image: evImg ?? "" });
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
        <button className={tab === "posters" ? "on" : ""} onClick={() => setTab("posters")}>{t("adm_posters")}</button>
        <button className={tab === "monthly" ? "on" : ""} onClick={() => setTab("monthly")}>{t("adm_monthly")}</button>
        <button className={tab === "prayers" ? "on" : ""} onClick={() => setTab("prayers")}>
          {t("adm_prayers")}{(pendingPrayersQuery.data?.length ?? 0) > 0 ? ` (${pendingPrayersQuery.data!.length})` : ""}
        </button>
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
            <label className="flabel" htmlFor="evImg">{t("f_img")}</label>
            <input className="finput" id="evImg" type="file" accept="image/*" onChange={pickEvImg} />
            {evImg ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "8px 0 4px" }}>
                <img src={evImg} alt={t("adm_poster_prev")} style={{ width: 84, height: 84, objectFit: "cover", borderRadius: 12, border: "1px solid var(--color-border)" }} />
                <button className="logoutbtn" style={{ padding: "6px 12px", fontSize: 14 }} onClick={() => setEvImg(null)}>{t("f_img_del")}</button>
              </div>
            ) : (
              <p className="sub" style={{ margin: "4px 0 10px", fontSize: ".85rem" }}>{t("f_img_hint")}</p>
            )}
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

      {tab === "posters" && (
        <div className="formcard">
          <h4>{t("adm_posters")}</h4>
          <p className="sub" style={{ marginBottom: 14 }}>{t("adm_posters_d")}</p>

          {postersList.length === 0 && (
            <p className="noevents" style={{ textAlign: "left", padding: "4px 0 14px" }}>{t("adm_posters_none")}</p>
          )}
          {postersList.map((img, i) => (
            <div className="admposter" key={i}>
              <div className="postercard" style={{ margin: 0, flex: "0 0 80px", maxWidth: 80 }}>
                <img src={img} alt={`Locandina ${i + 1}`} />
              </div>
              <div className="admposter-actions">
                <span className="admposter-num">{i + 1}</span>
                <button className="logoutbtn" style={{ padding: "6px 12px", fontSize: 14 }} onClick={() => movePoster(i, -1)} disabled={i === 0} aria-label="Sposta su">↑</button>
                <button className="logoutbtn" style={{ padding: "6px 12px", fontSize: 14 }} onClick={() => movePoster(i, 1)} disabled={i === postersList.length - 1} aria-label="Sposta giù">↓</button>
                <button className="logoutbtn" style={{ padding: "6px 12px", fontSize: 14, borderColor: "var(--color-danger)", color: "var(--color-danger)" }} onClick={() => removePoster(i)} aria-label={t("adm_del")}>🗑</button>
              </div>
            </div>
          ))}

          <label className="flabel" htmlFor="posterFile" style={{ marginTop: 16 }}>{t("adm_poster_new")}</label>
          <input className="finput" id="posterFile" type="file" accept="image/*" onChange={pickNewPoster} />
          {posterNewImg && (
            <>
              <span className="flabel" style={{ marginTop: 14 }}>{t("adm_poster_prev")}</span>
              <div className="postercard" style={{ margin: "6px 0 14px" }}>
                <img src={posterNewImg} alt={t("adm_poster_prev")} />
              </div>
              <button className="savebtn" onClick={addPoster}>{t("adm_poster_add")}</button>
            </>
          )}

          {postersList.length > 0 && (
            <button className="savebtn" style={{ marginTop: 16 }} onClick={submitPosters} disabled={savePosters.isPending}>
              {t("adm_posters_save")}
            </button>
          )}
          {postersMsg && <span className="savedmsg" style={postersMsg.ok ? {} : { color: "var(--color-danger)" }}>{postersMsg.text}</span>}
        </div>
      )}

      {tab === "monthly" && (
        <div className="formcard">
          <h4>{t("adm_monthly")}</h4>
          <p className="sub" style={{ marginBottom: 14 }}>{t("adm_monthly_d")}</p>

          <span className="flabel">{t("adm_monthly_cur")}</span>
          {monthlyQuery.data?.image ? (
            <div className="postercard" style={{ margin: "6px 0 18px" }}>
              <img src={monthlyQuery.data.image} alt={t("adm_monthly_cur")} />
            </div>
          ) : (
            <p className="noevents" style={{ textAlign: "left", padding: "4px 0 14px" }}>{t("adm_monthly_none")}</p>
          )}

          <label className="flabel" htmlFor="monthlyFile">{t("adm_poster_new")}</label>
          <input className="finput" id="monthlyFile" type="file" accept="image/*" onChange={pickMonthly} />
          {monthlyImg && (
            <>
              <span className="flabel" style={{ marginTop: 14 }}>{t("adm_poster_prev")}</span>
              <div className="postercard" style={{ margin: "6px 0 14px" }}>
                <img src={monthlyImg} alt={t("adm_poster_prev")} />
              </div>
              <button className="savebtn" onClick={submitMonthly} disabled={saveMonthly.isPending}>
                {t("adm_poster_save")}
              </button>
            </>
          )}
          {!monthlyImg && monthlyQuery.data?.image && (
            <button className="logoutbtn" onClick={removeMonthly} disabled={saveMonthly.isPending}>
              {t("adm_poster_del")}
            </button>
          )}
          {monthlyMsg && <span className="savedmsg" style={monthlyMsg.ok ? {} : { color: "var(--color-danger)" }}>{monthlyMsg.text}</span>}
        </div>
      )}

      {tab === "prayers" && (
        <div>
          <div className="formcard">
            <h4>{t("adm_prayers_pending")}</h4>
            <p className="sub" style={{ marginBottom: 12 }}>{t("adm_prayers_d")}</p>
            {(pendingPrayersQuery.data ?? []).length === 0 && <div className="noevents">{t("adm_prayers_none")}</div>}
            {(pendingPrayersQuery.data ?? []).map((p) => (
              <div className="admposter" key={p.id} style={{ alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ color: "var(--color-text-strong)" }}>{p.title}</b>
                  <p style={{ margin: "4px 0 0", fontSize: ".9rem", color: "var(--color-text-muted)" }}>{p.body}</p>
                  {p.author && <small style={{ color: "var(--color-text-muted)" }}>— {p.author}</small>}
                </div>
                <div className="admposter-actions" style={{ flex: "0 0 auto" }}>
                  <button className="savebtn" style={{ width: "auto", padding: "8px 14px", fontSize: 14 }} onClick={() => approvePrayer.mutate({ id: p.id })}>✓ {t("adm_approve")}</button>
                  <button className="del" style={{ width: 40, height: 40, borderRadius: 8, border: "1.5px solid var(--color-border)", background: "none", cursor: "pointer" }} onClick={() => deletePrayer.mutate({ id: p.id })} aria-label={t("adm_del")}>🗑</button>
                </div>
              </div>
            ))}
          </div>
          <div className="formcard">
            <h4>{t("adm_prayers_pub")}</h4>
            {(prayersQuery.data ?? []).length === 0 && <div className="noevents">{t("adm_prayers_nopub")}</div>}
            {(prayersQuery.data ?? []).map((p) => (
              <div className="adminev" key={p.id}>
                <span className="edot" style={{ background: "var(--color-secondary)" }} />
                <div className="em">
                  <b>{p.title}</b>
                  <small>♥ {p.prayed}</small>
                </div>
                <button className="del" onClick={() => deletePrayer.mutate({ id: p.id })} aria-label={t("adm_del")}>🗑</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
