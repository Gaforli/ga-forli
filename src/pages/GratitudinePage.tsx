import { useMemo, useRef, useState } from "react";
import { trpc } from "@/providers/trpc";
import { GratitudeJar } from "@/components/GratitudeJar";
import type { Lang, Page } from "@/types";

interface Props {
  t: (k: string) => string;
  lang: Lang;
  goPage: (p: Page) => void;
}

// Colori pastello dei bigliettini: devono corrispondere a GRATITUDE_COLORS del backend.
const GRAT_COLORS = ["#F5DFA7", "#CFE0C3", "#F6C6C6", "#F9D9B8", "#CDE3EE"] as const;

type PublicNote = { id: number; body: string; signature: string; color: string; createdAt: string | Date };

export default function GratitudinePage({ t, lang, goPage }: Props) {
  const [collectionId, setCollectionId] = useState<number | null>(null);
  const collsQuery = trpc.content.listGratitudeCollections.useQuery();
  const pubQuery = trpc.content.getGratitudePublic.useQuery(
    collectionId ? { collectionId } : undefined,
  );

  const data = pubQuery.data;
  const notes = useMemo(() => (data?.notes ?? []) as PublicNote[], [data]);
  const isOpen = data?.collection.isOpen ?? false;
  const fmtDate = (d: string | Date) =>
    new Intl.DateTimeFormat(lang, { day: "numeric", month: "long", year: "numeric" }).format(new Date(d));

  // ── Lettura (barattolo aperto) ──
  const [readId, setReadId] = useState<number | null>(null);
  const [readAll, setReadAll] = useState(false);
  const [drawnIds, setDrawnIds] = useState<number[]>([]);
  const [collective, setCollective] = useState<{ idx: number } | null>(null);
  const readNote = notes.find((n) => n.id === readId) ?? null;

  const drawOne = () => {
    const pool = notes.filter((n) => !drawnIds.includes(n.id));
    const source = pool.length > 0 ? pool : notes; // esauriti: si ricomincia
    if (pool.length === 0) setDrawnIds([]);
    if (source.length === 0) return;
    const pick = source[Math.floor(Math.random() * source.length)];
    setDrawnIds((prev) => (pool.length > 0 ? [...prev, pick.id] : [pick.id]));
    setReadId(pick.id);
  };

  // ── Invio pensiero ──
  const [writeOpen, setWriteOpen] = useState(false);
  const [body, setBody] = useState("");
  const [name, setName] = useState("");
  const [noName, setNoName] = useState(false);
  const [color, setColor] = useState<(typeof GRAT_COLORS)[number]>(GRAT_COLORS[0]);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const tokenRef = useRef<string>("");

  const submit = trpc.content.submitGratitude.useMutation({
    onSuccess: () => {
      setDone(true);
      setBody(""); setName(""); setNoName(false); setColor(GRAT_COLORS[0]);
    },
    onError: (e) => setErr(e.message || t("grat_err_body")), // il testo resta nel campo
  });

  const openForm = () => {
    tokenRef.current = crypto.randomUUID(); // token idempotente: doppio tap/retry = un solo invio
    setWriteOpen(true); setDone(false); setErr(null);
  };

  const send = () => {
    setErr(null);
    const text = body.trim();
    if (text.length < 5 || text.length > 500) { setErr(t("grat_err_body")); return; }
    submit.mutate({
      clientToken: tokenRef.current,
      body: text,
      signature: name.trim(),
      anonymous: noName,
      color,
    });
  };

  const colls = collsQuery.data ?? [];

  return (
    <div className="adminwrap grat">
      <button className="grat-back" onClick={() => goPage("home")}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
        {t("grat_back")}
      </button>

      <h2 className="ptitle">{t("grat_title")}</h2>
      <div className="grat-badges">
        <span className="grat-badge year">{data?.collection.label ?? "…"}</span>
        <span className={`grat-badge state${isOpen ? " open" : ""}`}>
          {isOpen ? t("grat_state_open") : t("grat_state_closed")}
        </span>
      </div>
      <p className="sub">{data?.collection.introMessage ?? ""}</p>

      {colls.length > 1 && (
        <div className="grat-years" role="group" aria-label={t("grat_years")}>
          {colls.map((c) => (
            <button
              key={c.id}
              className={`grat-year${(collectionId ?? data?.collection.id) === c.id ? " on" : ""}`}
              onClick={() => { setCollectionId(c.id); setReadId(null); setReadAll(false); setCollective(null); setDrawnIds([]); }}
            >
              {c.label} · {c.count}
            </button>
          ))}
        </div>
      )}

      {data && !data.isCurrent && (
        <p className="grat-pastnote">{t("grat_past_note")}</p>
      )}

      <div className="grat-jar-wrap">
        <GratitudeJar
          notes={notes.map((n) => ({ id: n.id, color: n.color }))}
          capacity={data?.capacity ?? 50}
          selectable={isOpen && notes.length > 0}
          selectedId={readId}
          onSelect={(id) => setReadId(id)}
        />
      </div>

      <p className="grat-count" aria-live="polite">
        <b>{data?.count ?? 0}</b> {t("grat_count")}
      </p>

      {data && data.count === 0 && (
        <p className="grat-empty">{t("grat_empty")}</p>
      )}

      {!isOpen && data && data.count > 0 && (
        <p className="grat-sealed">{t("grat_sealed")}</p>
      )}

      {isOpen && notes.length > 0 && (
        <div className="grat-readbar">
          <button className="btn btn-primary" onClick={drawOne}>{t("grat_extract")}</button>
          <button className="btn btn-secondary" onClick={() => setReadAll(true)}>{t("grat_readall")}</button>
          <button className="btn btn-secondary" onClick={() => setCollective({ idx: 0 })}>{t("grat_collective")}</button>
        </div>
      )}

      <button className="btn btn-primary grat-add" onClick={openForm}>
        {t("grat_add")}
      </button>

      {/* ── Foglio: bigliettino singolo ── */}
      {readNote && (
        <div className="sheetwrap" role="dialog" aria-modal="true" aria-label={t("grat_title")}>
          <button className="scrim show" onClick={() => setReadId(null)} aria-hidden="true" tabIndex={-1} />
          <div className="praysheet grat-sheet">
            <button className="dclose" onClick={() => setReadId(null)} aria-label={t("close")}>✕</button>
            <div className="grat-ticket" style={{ background: readNote.color }}>
              <p className="grat-ticket-body">{readNote.body}</p>
              <p className="grat-ticket-sign">{readNote.signature || t("grat_anon")}</p>
              <p className="grat-ticket-date">{fmtDate(readNote.createdAt)}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Foglio: leggi tutti ── */}
      {readAll && (
        <div className="sheetwrap" role="dialog" aria-modal="true" aria-label={t("grat_readall")}>
          <button className="scrim show" onClick={() => setReadAll(false)} aria-hidden="true" tabIndex={-1} />
          <div className="praysheet grat-sheet">
            <button className="dclose" onClick={() => setReadAll(false)} aria-label={t("close")}>✕</button>
            <h3>{t("grat_readall")}</h3>
            <div className="grat-all">
              {notes.map((n) => (
                <div key={n.id} className="grat-ticket" style={{ background: n.color }}>
                  <p className="grat-ticket-body">{n.body}</p>
                  <p className="grat-ticket-sign">{n.signature || t("grat_anon")}</p>
                  <p className="grat-ticket-date">{fmtDate(n.createdAt)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Lettura collettiva da proiezione ── */}
      {collective && notes[collective.idx] && (
        <div className="grat-proj" role="dialog" aria-modal="true" aria-label={t("grat_collective")}>
          <button className="grat-proj-close" onClick={() => setCollective(null)} aria-label={t("close")}>✕</button>
          <p className="grat-proj-count">{collective.idx + 1} / {notes.length}</p>
          <blockquote className="grat-proj-body">{notes[collective.idx].body}</blockquote>
          <p className="grat-proj-sign">{notes[collective.idx].signature || t("grat_anon")}</p>
          <button
            className="btn btn-primary grat-proj-next"
            onClick={() => setCollective({ idx: (collective.idx + 1) % notes.length })}
          >
            {t("grat_next")}
          </button>
        </div>
      )}

      {/* ── Foglio: aggiungi il tuo grazie ── */}
      {writeOpen && (
        <div className="sheetwrap" role="dialog" aria-modal="true" aria-label={t("grat_add")}>
          <button className="scrim show" onClick={() => setWriteOpen(false)} aria-hidden="true" tabIndex={-1} />
          <div className="praysheet">
            <button className="dclose" onClick={() => setWriteOpen(false)} aria-label={t("close")}>✕</button>
            <h3>{t("grat_form_title")}</h3>
            {done ? (
              <p className="savedmsg" style={{ display: "block", textAlign: "center", padding: "18px 0" }}>{t("grat_sent")}</p>
            ) : (
              <>
                <label className="flabel" htmlFor="grBody">{t("grat_form_title")}</label>
                <textarea
                  className="ftext"
                  id="grBody"
                  maxLength={500}
                  style={{ minHeight: 110 }}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={t("grat_body_ph")}
                />
                <p className="grat-counter">{body.trim().length}/500</p>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 180px" }}>
                    <label className="flabel" htmlFor="grName">{t("grat_name")}</label>
                    <input
                      className="finput"
                      id="grName"
                      maxLength={30}
                      value={name}
                      disabled={noName}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t("grat_name_ph")}
                    />
                  </div>
                  <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 34, cursor: "pointer", fontWeight: 600 }}>
                    <input type="checkbox" checked={noName} onChange={(e) => setNoName(e.target.checked)} />
                    {t("grat_noname")}
                  </label>
                </div>
                <fieldset className="colorfield">
                  <legend className="flabel">{t("grat_color")}</legend>
                  <div className="colorchoices" role="group" aria-label={t("grat_color")}>
                    {GRAT_COLORS.map((c, i) => (
                      <button
                        key={c}
                        type="button"
                        className={`colorchoice${color === c ? " selected" : ""}`}
                        style={{ background: c }}
                        aria-label={t(`grat_color_${i}`)}
                        aria-pressed={color === c}
                        title={t(`grat_color_${i}`)}
                        onClick={() => setColor(c)}
                      >
                        {color === c && <span aria-hidden="true">✓</span>}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <span className="flabel">{t("grat_preview")}</span>
                <div className="grat-ticket grat-preview" style={{ background: color }}>
                  <p className="grat-ticket-body">{body || t("grat_body_ph")}</p>
                  <p className="grat-ticket-sign">{noName ? t("grat_anon") : (name || t("grat_name_ph"))}</p>
                </div>
                {err && <p className="err">{err}</p>}
                <button className="savebtn" onClick={send} disabled={submit.isPending || done}>
                  {t("grat_send")}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
