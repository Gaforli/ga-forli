import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/providers/trpc";
import type { Lang } from "@/types";

interface Props {
  t: (k: string) => string;
  lang: Lang;
}

type GratTab = "pending" | "approved" | "discarded" | "settings";

// Gestione del Barattolo della gratitudine (solo Direttore GA, controlli server-side).
export default function GratitudeAdmin({ t, lang }: Props) {
  const utils = trpc.useUtils();
  const collsQuery = trpc.content.listGratitudeCollections.useQuery();
  // Garantisce che la raccolta dell'anno in corso esista (la crea se manca).
  const ensureQuery = trpc.content.getGratitudePublic.useQuery(undefined);
  useEffect(() => {
    if (collsQuery.data?.length === 0 && ensureQuery.data) {
      utils.content.listGratitudeCollections.invalidate();
    }
  }, [collsQuery.data, ensureQuery.data, utils]);
  const [collectionId, setCollectionId] = useState<number | null>(null);
  const [sub, setSub] = useState<GratTab>("pending");
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const colls = collsQuery.data ?? [];
  const current = useMemo(
    () => colls.find((c) => c.id === collectionId) ?? colls[0] ?? null,
    [colls, collectionId],
  );
  const collId = current?.id ?? 0;

  const notesQuery = trpc.content.listGratitudeAdmin.useQuery(
    { collectionId: collId, status: sub === "settings" ? "pending" : sub },
    { enabled: collId > 0 && sub !== "settings" },
  );
  const pendingQuery = trpc.content.listGratitudeAdmin.useQuery(
    { collectionId: collId, status: "pending" },
    { enabled: collId > 0 },
  );
  const pubQuery = trpc.content.getGratitudePublic.useQuery(
    collId > 0 ? { collectionId: collId } : undefined,
    { enabled: collId > 0 },
  );

  const refresh = () => {
    utils.content.listGratitudeAdmin.invalidate();
    utils.content.listGratitudeCollections.invalidate();
    utils.content.getGratitudePublic.invalidate();
  };

  const approve = trpc.content.approveGratitude.useMutation({
    onSuccess: (r) => {
      refresh();
      if (r.collectionOpen) setMsg({ text: t("adm_grat_open_warn"), ok: true });
    },
  });
  const discard = trpc.content.discardGratitude.useMutation({ onSuccess: refresh });
  const del = trpc.content.deleteGratitude.useMutation({ onSuccess: refresh });
  const setOpen = trpc.content.setGratitudeOpen.useMutation({ onSuccess: refresh });
  const saveIntro = trpc.content.saveGratitudeIntro.useMutation({
    onSuccess: () => { refresh(); setMsg({ text: t("adm_grat_intro_done"), ok: true }); },
    onError: (e) => setMsg({ text: e.message, ok: false }),
  });

  // ── Impostazioni: messaggio introduttivo ──
  const [introDraft, setIntroDraft] = useState<string | null>(null);
  const introValue = introDraft ?? pubQuery.data?.collection.introMessage ?? "";

  const fmtDate = (d: string | Date | null | undefined) =>
    d ? new Intl.DateTimeFormat(lang, { day: "numeric", month: "short", year: "numeric" }).format(new Date(d)) : "";

  if (collsQuery.isLoading) return <div className="noevents">{t("adm_loading")}</div>;
  if (!current) return <div className="noevents">{t("adm_grat_none")}</div>;

  const notes = notesQuery.data ?? [];

  return (
    <div>
      <div className="formcard">
        <h4>{t("adm_grat_collection")}</h4>
        <div className="grat-years" style={{ marginBottom: 4 }}>
          {colls.map((c) => (
            <button key={c.id} className={`grat-year${c.id === current.id ? " on" : ""}`} onClick={() => { setCollectionId(c.id); setIntroDraft(null); setMsg(null); }}>
              {c.label} · {c.count}{c.isOpen ? " 🔓" : ""}
            </button>
          ))}
        </div>
        <div className="admintabs grat-subtabs">
          <button className={sub === "pending" ? "on" : ""} onClick={() => setSub("pending")}>
            {t("adm_grat_pending")}{(pendingQuery.data?.length ?? 0) > 0 ? ` (${pendingQuery.data!.length})` : ""}
          </button>
          <button className={sub === "approved" ? "on" : ""} onClick={() => setSub("approved")}>{t("adm_grat_approved")}</button>
          <button className={sub === "discarded" ? "on" : ""} onClick={() => setSub("discarded")}>{t("adm_grat_discarded")}</button>
          <button className={sub === "settings" ? "on" : ""} onClick={() => setSub("settings")}>{t("adm_grat_settings")}</button>
        </div>
        {msg && <p className="savedmsg" style={{ display: "block", ...(msg.ok ? {} : { color: "var(--color-danger)" }) }}>{msg.text}</p>}
      </div>

      {sub !== "settings" && (
        <div className="formcard">
          {notes.length === 0 && <div className="noevents">{t("adm_grat_empty")}</div>}
          {notes.map((n) => (
            <div className="admposter" key={n.id} style={{ alignItems: "flex-start" }}>
              <span className="grat-dot" style={{ background: n.color }} aria-hidden="true" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: ".95rem", color: "var(--color-text-strong)", whiteSpace: "pre-wrap" }}>{n.body}</p>
                <small style={{ color: "var(--color-text-muted)" }}>
                  — {n.signature || t("grat_anon")} · {fmtDate(n.createdAt)} · {current.label}
                </small>
              </div>
              <div className="admposter-actions" style={{ flex: "0 0 auto" }}>
                {sub === "pending" && (
                  <>
                    <button className="savebtn" style={{ width: "auto", padding: "8px 14px", fontSize: 14 }} onClick={() => approve.mutate({ id: n.id })}>
                      ✓ {t("adm_grat_approve")}
                    </button>
                    <button className="btn btn-secondary" style={{ padding: "8px 14px", fontSize: 14 }} onClick={() => discard.mutate({ id: n.id })}>
                      {t("adm_grat_discard")}
                    </button>
                  </>
                )}
                {sub === "approved" && (
                  <button className="btn btn-secondary" style={{ padding: "8px 14px", fontSize: 14 }} onClick={() => discard.mutate({ id: n.id })}>
                    {t("adm_grat_remove")}
                  </button>
                )}
                {sub === "discarded" && (
                  <button
                    className="del"
                    style={{ width: 40, height: 40, borderRadius: 8, border: "1.5px solid var(--color-border)", background: "none", cursor: "pointer" }}
                    onClick={() => { if (window.confirm(t("adm_grat_del_confirm"))) del.mutate({ id: n.id }); }}
                    aria-label={t("adm_del")}
                  >🗑</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {sub === "settings" && (
        <>
          <div className="formcard">
            <h4>{t("adm_grat_intro")}</h4>
            <p className="sub" style={{ marginBottom: 12 }}>{t("adm_grat_intro_d")}</p>
            <textarea
              className="ftext"
              maxLength={500}
              style={{ minHeight: 90 }}
              value={introValue}
              onChange={(e) => setIntroDraft(e.target.value)}
            />
            <p className="grat-counter">{introValue.trim().length}/500</p>
            {introValue.trim() && (
              <>
                <span className="flabel">{t("grat_preview")}</span>
                <p className="grat-intro-prev">{introValue}</p>
              </>
            )}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                className="savebtn"
                style={{ width: "auto", padding: "10px 20px" }}
                disabled={!introValue.trim() || saveIntro.isPending}
                onClick={() => saveIntro.mutate({ collectionId: current.id, introMessage: introValue.trim() })}
              >
                {t("adm_grat_intro_save")}
              </button>
              <button className="btn btn-secondary" onClick={() => setIntroDraft("")}>
                {t("adm_grat_intro_clear")}
              </button>
            </div>
          </div>

          <div className="formcard">
            <h4>{t("adm_grat_openclose")}</h4>
            <p className="sub" style={{ marginBottom: 12 }}>
              {current.isOpen ? t("adm_grat_close_d") : t("adm_grat_open_d")}
            </p>
            {current.isOpen ? (
              <button
                className="btn btn-secondary"
                onClick={() => { if (window.confirm(t("adm_grat_close_confirm"))) setOpen.mutate({ collectionId: current.id, open: false }); }}
              >
                {t("adm_grat_close_btn")}
              </button>
            ) : (
              <button
                className="savebtn"
                style={{ width: "auto", padding: "10px 20px" }}
                onClick={() => { if (window.confirm(t("adm_grat_open_confirm"))) setOpen.mutate({ collectionId: current.id, open: true }); }}
              >
                {t("adm_grat_open_btn")}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
