import { useMemo, useState } from "react";
import { trpc } from "@/providers/trpc";
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
  color: string;
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

  // ── Form richiesta: aperto a tutti, con approvazione del Direttore GA ──
  const [writeOpen, setWriteOpen] = useState(false);
  const [prTitle, setPrTitle] = useState("");
  const [prBody, setPrBody] = useState("");
  const [prName, setPrName] = useState("");
  const [prAnonymous, setPrAnonymous] = useState(false);
  const [prColor, setPrColor] = useState(POSTIT_COLORS[0]);
  const [prDone, setPrDone] = useState(false);
  const [prErr, setPrErr] = useState<string | null>(null);

  const submitPrayer = trpc.content.submitPrayer.useMutation({
    onSuccess: () => {
      setPrDone(true);
      setPrTitle(""); setPrBody(""); setPrName(""); setPrAnonymous(false); setPrColor(POSTIT_COLORS[0]);
    },
    onError: () => setPrErr("pray_fill"),
  });

  const sendPrayer = () => {
    setPrErr(null);
    if (!prTitle.trim() || !prBody.trim()) { setPrErr("pray_fill"); return; }
    if (!prAnonymous && !prName.trim()) { setPrErr("pray_err_name"); return; }
    submitPrayer.mutate({
      title: prTitle.trim(),
      body: prBody.trim(),
      name: prName.trim(),
      anonymous: prAnonymous,
      color: prColor,
    });
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
                background: POSTIT_COLORS.includes(p.color) ? p.color : POSTIT_COLORS[i % POSTIT_COLORS.length],
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

      <button className="btn btn-primary praywrite" onClick={() => { setWriteOpen(true); setPrDone(false); setPrErr(null); }}>
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
            ) : (
              <>
                <p className="sub" style={{ marginBottom: 12 }}>{t("pray_form_d")}</p>
                <label className="flabel" htmlFor="prTitle">{t("pray_forwhom")}</label>
                <input className="finput" id="prTitle" maxLength={120} value={prTitle} onChange={(e) => setPrTitle(e.target.value)} placeholder={t("pray_title_ph")} />
                <label className="flabel" htmlFor="prBody">{t("pray_body")}</label>
                <textarea className="ftext" id="prBody" maxLength={1000} style={{ minHeight: 110 }} value={prBody} onChange={(e) => setPrBody(e.target.value)} placeholder={t("pray_body_ph")} />
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 180px" }}>
                    <label className="flabel" htmlFor="prName">{t("pray_name")}</label>
                    <input className="finput" id="prName" maxLength={120} value={prName} disabled={prAnonymous} onChange={(e) => setPrName(e.target.value)} placeholder={t("pray_name_ph")} />
                  </div>
                  <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 34, cursor: "pointer", fontWeight: 600 }}>
                    <input type="checkbox" checked={prAnonymous} onChange={(e) => { setPrAnonymous(e.target.checked); if (e.target.checked) setPrErr(null); }} />
                    {t("pray_anonymous")}
                  </label>
                </div>
                <fieldset className="colorfield">
                  <legend className="flabel">{t("pray_color")}</legend>
                  <div className="colorchoices" role="group" aria-label={t("pray_color")}>
                    {POSTIT_COLORS.map((color, i) => (
                      <button
                        key={color}
                        type="button"
                        className={`colorchoice${prColor === color ? " selected" : ""}`}
                        style={{ background: color }}
                        aria-label={t(`pray_color_${i}`)}
                        aria-pressed={prColor === color}
                        title={t(`pray_color_${i}`)}
                        onClick={() => setPrColor(color)}
                      >
                        {prColor === color && <span aria-hidden="true">✓</span>}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <span className="flabel">{t("pray_preview")}</span>
                <div className="postit postit-preview" style={{ background: prColor, ["--tilt" as string]: "-1.2deg" }} aria-label={t("pray_preview")}>
                  <span className="pin" style={{ background: PIN_COLORS[POSTIT_COLORS.indexOf(prColor)] }} aria-hidden="true" />
                  <span className="ptitle2">{prTitle || t("pray_preview_title")}</span>
                  <span className="pbody">{prBody || t("pray_preview_body")}</span>
                </div>
                {prErr && <p className="err">{t(prErr)}</p>}
                <button className="savebtn" onClick={sendPrayer} disabled={submitPrayer.isPending}>{t("pray_send")}</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
