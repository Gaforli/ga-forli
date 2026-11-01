import { CATS, EVENT_IMG } from "@/i18n";
import { fmtDate } from "@/lib/utils";
import type { AppEvent, ArchivedPoster, Lang } from "@/types";

interface Props {
  event: AppEvent | ArchivedPoster;
  onOpen: (event: AppEvent | ArchivedPoster) => void;
  t: (key: string) => string;
  lang: Lang;
}

export default function EventPosterButton({ event, onOpen, t, lang }: Props) {
  return (
    <button
      type="button"
      className="postercard eventposter"
      onClick={() => onOpen(event)}
      aria-label={`${t("event_open")}: ${event.title}`}
    >
      <img
        src={event.image || EVENT_IMG[event.cat]}
        alt={`${t("event_poster_alt")}: ${event.title}`}
        loading="lazy"
        draggable={false}
      />
      <span className="eventposter-caption">
        <span className="eventposter-meta">
          <span className="eventposter-cat"><i style={{ background: CATS[event.cat].color }} />{t("cat_" + event.cat)}</span>
          <span>{event.date ? fmtDate(event.date, event.time, lang) : t("event_nodate")}</span>
        </span>
        <span className="eventposter-title">{event.title}</span>
        <span className="eventposter-more">{t("event_open")} <span aria-hidden="true">→</span></span>
      </span>
    </button>
  );
}
