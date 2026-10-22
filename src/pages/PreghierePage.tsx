import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/providers/trpc";
import { getSupabase } from "@/lib/supabase";
import type { Lang } from "@/types";

interface Props {
  t: (k: string) => string;
  lang: Lang;
}

interface Prayer {
  id: number;
  title: string;
  body: string;
  prayed: number;
}

const POSTIT_COLORS = ["#FFF3B8", "#DDE8C8", "#FFD9CF", "#FFE9B0", "#E3F0DA", "#FADCD5"];
const POSTIT_TILTS = ["-1.8deg", "1.4deg", "-1.2deg", "1.8deg", "-1.5deg", "1.1deg"];
const PIN_COLORS = ["#4C8C6B", "#C9A227", "#C4605C", "#7A8794", "#2F5D47", "#B5651D"];
const PRAYED_KEY = "ga_prayed";

function loadPrayed(): number[] {
  try { return JSON.parse(localStorage.getItem(PRAYED_KEY) ?? "[]"); } catch { return []; }
}

export default function PreghierePage({ t, lang }: Props) {
  const utils = trpc.useUtils();
  const prayersQuery = trpc.content.listPrayers.useQuery();
  const prayers = useMemo(() => (prayersQuery.data ?? []) as Prayer[], [prayersQuery.data]);

  const monthLabel = useMemo(
    () => new Intl.DateTimeFormat(lang, { month: "long", year: "numeric" }).format(new Date()).toUpperCase(),
    [lang],
  );

  // Foglio di lettura (post-it aperto)
  const [openId, setOpenId] = useState<number | null>(null);
  const [prayedIds, setPrayedIds] = useState<number[]>(loadPrayed);
  const openPrayer = prayers.find((p) => p.id === openId) ?? null;

  const prayFor = trpc.content.prayFor.useMutation({
    onSuccess: () => utils.content.listPrayers.invalidate(),
  });

  const joinPrayer = (id: number) => {
    if (prayedIds.includes(id)) return;
    const next = [...prayedIds, id];
    setPrayedIds(next);
    localStorage.setItem(PRAYED_KEY, JSON.stringify(next));
    prayFor.mutate({ id });
  };

  // ── Login Supabase (serve solo per inviare una richiesta) ──
  const supabase = getSupabase();
  const [sbUser, setSbUser] = useState<string | null>(null);
  const [sbToken, setSbToken] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<"choice" | "email">("choice");
  const [authEmail, setAuthEmail] = useState("");
  const [authPass, setAuthPass] = useState("");
  const [authErr, setAuthErr] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      const s = data.session;
      if (s) {
        setSbToken(s.access_token);
        setSbUser(s.user.user_metadata?.full_name || s.user.email || null);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSbToken(s?.access_token ?? null);
      setSbUser(s ? (s.user.user_metadata?.full_name || s.user.email || null) : null);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  const oauthLogin = async (provider: "google" | "facebook") => {
    if (!supabase) return;
    setAuthBusy(true);
    await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.href } });
    setAuthBusy(false);
  };

  const emailAuth = async (mode: "login" | "signup") => {
    if (!supabase || !authEmail.trim() || !authPass) { setAuthErr(true); return; }
    setAuthBusy(true);
    setAuthErr(false);
    const fn = mode === "login" ? supabase.auth.signInWithPassword : supabase.auth.signUp;
    const { error } = await fn({ email: authEmail.trim(), password: authPass });
    setAuthBusy(false);
    if (error) setAuthErr(true);
  };

  // ── Form richiesta ──
  const [writeOpen, setWriteOpen] = useState(false);
  const [prTitle, setPrTitle] = useState("");
  const [prBody, setPrBody] = useState("");
  const [prDone, setPrDone] = useState(false);
  const [prErr, setPrErr] = useState(false);

  const submitPrayer = trpc.content.submitPrayer.useMutation({
    onSuccess: () => {
      setPrDone(true);
      setPrTitle(""); setPrBody("");
    },
    onError: () => setPrErr(true),
  });

  const sendPrayer = () => {
    setPrErr(false);
    if (!prTitle.trim() || !prBody.trim() || !sbToken) { setPrErr(true); return; }
    submitPrayer.mutate({ title: prTitle.trim(), body: prBody.trim(), token: sbToken });
  };

  return (
    <div className="adminwrap">
      <div className="prayhead">
        <h2 className="ptitle">{t("t_pray")}</h2>
        <span className="monthpill">{monthLabel}</span>
      </div>
      <p className="sub">{t("s_pray")}</p>

      {prayersQuery.isLoading && (
        <div className="board" aria-hidden="true">
          <div className="postit" style={{ ["--tilt" as string]: "-1.5deg", background: POSTIT_COLORS[0] }}><div className="sk" style={{ height: 110 }} /></div>
          <div className="postit" style={{ ["--tilt" as string]: "1.4deg", background: POSTIT_COLORS[1] }}><div className="sk" style={{ height: 110 }} /></div>
        </div>
      )}

      {!prayersQuery.isLoading && prayers.length > 0 && (
        <div className="board">
          {prayers.map((p, i) => (
            <button
              className="postit"
              key={p.id}
              style={{
                ["--tilt" as string]: POSTIT_TILTS[i % POSTIT_TILTS.length],
                background: POSTIT_COLORS[i % POSTIT_COLORS.length],
              }}
              onClick={() => setOpenId(p.id)}
            >
              <span className="pin" style={{ background: PIN_COLORS[i % PIN_COLORS.length] }} aria-hidden="true" />
              <span className="ptitle2">{p.title}</span>
              <span className="pbody">{p.body}</span>
              <span className="pread">{t("pray_read")} ↗</span>
            </button>
          ))}
        </div>
      )}

      {!prayersQuery.isLoading && prayers.length === 0 && (
        <div className="board board-empty">
          <p className="noevents" style={{ margin: 0 }}>{t("pray_empty")}</p>
        </div>
      )}

      <button className="btn btn-primary praywrite" onClick={() => { setWriteOpen(true); setPrDone(false); setPrErr(false); }}>
        <span>{t("pray_write")}</span>
      </button>

      {openPrayer && (
        <div className="sheetwrap" role="dialog" aria-modal="true" aria-label={openPrayer.title}>
          <button className="scrim show" onClick={() => setOpenId(null)} aria-hidden="true" tabIndex={-1} />
          <div className="praysheet">
            <button className="dclose" onClick={() => setOpenId(null)} aria-label={t("close")}>✕</button>
            <span className="chip">{t("pray_open")}</span>
            <h3>{t("pray_for")} {openPrayer.title}</h3>
            <p className="q">{openPrayer.body}</p>
            <button
              className={`savebtn prayjoin${prayedIds.includes(openPrayer.id) ? " joined" : ""}`}
              onClick={() => joinPrayer(openPrayer.id)}
              disabled={prayedIds.includes(openPrayer.id)}
            >
              {prayedIds.includes(openPrayer.id) ? "♥" : "♡"} {prayedIds.includes(openPrayer.id) ? t("pray_joined") : t("pray_join")}
              {openPrayer.prayed > 0 && <small style={{ marginLeft: 6, fontWeight: 600 }}>· {openPrayer.prayed + (prayedIds.includes(openPrayer.id) ? 1 : 0)}</small>}
            </button>
          </div>
        </div>
      )}

      {writeOpen && (
        <div className="sheetwrap" role="dialog" aria-modal="true" aria-label={t("pray_write")}>
          <button className="scrim show" onClick={() => setWriteOpen(false)} aria-hidden="true" tabIndex={-1} />
          <div className="praysheet">
            <button className="dclose" onClick={() => setWriteOpen(false)} aria-label={t("close")}>✕</button>
            <h3>{t("pray_write")}</h3>

            {prDone ? (
              <p className="savedmsg" style={{ display: "block", textAlign: "center", padding: "18px 0" }}>{t("pray_sent")}</p>
            ) : !supabase ? (
              <p className="err">{t("pray_noconfig")}</p>
            ) : !sbToken ? (
              <>
                <p className="sub" style={{ marginBottom: 12 }}>{t("pray_login_d")}</p>
                {authMode === "choice" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <button className="savebtn" style={{ background: "#fff", color: "#243B53", border: "1.5px solid var(--color-border)" }} onClick={() => oauthLogin("google")} disabled={authBusy}>
                      G · {t("pray_google")}
                    </button>
                    <button className="savebtn" style={{ background: "#1877F2" }} onClick={() => oauthLogin("facebook")} disabled={authBusy}>
                      f · {t("pray_facebook")}
                    </button>
                    <button className="savebtn" style={{ background: "var(--color-secondary)" }} onClick={() => setAuthMode("email")}>
                      ✉ · {t("pray_email")}
                    </button>
                  </div>
                )}
                {authMode === "email" && (
                  <form onSubmit={(e) => { e.preventDefault(); emailAuth("login"); }}>
                    <label className="flabel" htmlFor="prEmail">{t("adm_email")}</label>
                    <input className="finput" id="prEmail" type="email" autoComplete="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} />
                    <label className="flabel" htmlFor="prPass">{t("adm_password")}</label>
                    <input className="finput" id="prPass" type="password" autoComplete="current-password" value={authPass} onChange={(e) => setAuthPass(e.target.value)} />
                    {authErr && <p className="err">{t("pray_autherr")}</p>}
                    <button className="savebtn" type="submit" disabled={authBusy}>{t("adm_enter_local")}</button>
                    <button className="logoutbtn" type="button" style={{ marginTop: 8, width: "100%" }} onClick={() => emailAuth("signup")} disabled={authBusy}>
                      {t("pray_signup")}
                    </button>
                    <button className="logoutbtn" type="button" style={{ marginTop: 8, width: "100%" }} onClick={() => { setAuthMode("choice"); setAuthErr(false); }}>
                      ← {t("back")}
                    </button>
                  </form>
                )}
              </>
            ) : (
              <>
                <p className="sub" style={{ marginBottom: 12 }}>{t("pray_as")} <b>{sbUser}</b></p>
                <label className="flabel" htmlFor="prTitle">{t("pray_title")}</label>
                <input className="finput" id="prTitle" maxLength={120} value={prTitle} onChange={(e) => setPrTitle(e.target.value)} placeholder={t("pray_title_ph")} />
                <label className="flabel" htmlFor="prBody">{t("pray_body")}</label>
                <textarea className="ftext" id="prBody" maxLength={1000} style={{ minHeight: 110 }} value={prBody} onChange={(e) => setPrBody(e.target.value)} placeholder={t("pray_body_ph")} />
                {prErr && <p className="err">{t("pray_fill")}</p>}
                <button className="savebtn" onClick={sendPrayer} disabled={submitPrayer.isPending}>{t("pray_send")}</button>
                <button className="logoutbtn" style={{ marginTop: 8, width: "100%" }} onClick={() => { void supabase.auth.signOut(); }}>
                  {t("adm_logout")}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
