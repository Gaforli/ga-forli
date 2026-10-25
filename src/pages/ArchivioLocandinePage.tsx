import { useMemo, useState } from "react";
import { trpc } from "@/providers/trpc";
import EventDetailDialog from "@/components/EventDetailDialog";
import EventPosterButton from "@/components/EventPosterButton";
import { fmtArchiveMonth } from "@/lib/utils";
import type { AppEvent, ArchivedPoster, Lang } from "@/types";

export default function ArchivioLocandinePage({ t, lang }: { t: (key: string) => string; lang: Lang }) {
  const archiveQuery = trpc.content.listPosterArchive.useQuery();
  const [selected, setSelected] = useState<AppEvent | null>(null);
  const groups = useMemo(() => {
    const byMonth = new Map<string, ArchivedPoster[]>();
    for (const poster of archiveQuery.data ?? []) {
      const items = byMonth.get(poster.archiveMonth) ?? [];
      items.push(poster);
      byMonth.set(poster.archiveMonth, items);
    }
    return Array.from(byMonth, ([month, items]) => ({ month, items }));
  }, [archiveQuery.data]);

  return (
    <div className="stagger-in archive-page">
      <h2 className="ptitle">{t("t_archive")}</h2>
      <p className="sub">{t("s_archive")}</p>

      {archiveQuery.isLoading && (
        <div className="archive-grid" aria-hidden="true">
          <div className="archive-skeleton"><div className="sk" style={{ height: 330 }} /><div className="sk" style={{ height: 18, width: "72%", margin: 14 }} /></div>
          <div className="archive-skeleton"><div className="sk" style={{ height: 330 }} /><div className="sk" style={{ height: 18, width: "58%", margin: 14 }} /></div>
        </div>
      )}
      {archiveQuery.isError && <div className="noevents" role="alert">{t("archive_error")}</div>}
      {!archiveQuery.isLoading && !archiveQuery.isError && groups.length === 0 && (
        <div className="archive-empty">
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="17" rx="3" /><path d="M3 9h18M8 2v4M16 2v4M8 14h8" /></svg>
          <h3>{t("archive_empty")}</h3>
          <p>{t("archive_empty_d")}</p>
        </div>
      )}

      {groups.map(({ month, items }) => (
        <section className="archive-month" key={month} aria-labelledby={`archive-month-${month}`}>
          <div className="archive-month-head">
            <h3 id={`archive-month-${month}`}>{fmtArchiveMonth(month, lang)}</h3>
            <span>{items.length} {items.length === 1 ? t("archive_one") : t("archive_many")}</span>
          </div>
          <div className="archive-grid">
            {items.map((poster) => (
              <EventPosterButton key={poster.id} event={poster} onOpen={setSelected} t={t} lang={lang} />
            ))}
          </div>
        </section>
      ))}

      <EventDetailDialog event={selected} onClose={() => setSelected(null)} t={t} lang={lang} />
    </div>
  );
}
