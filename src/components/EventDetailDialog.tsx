import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { CATS, EVENT_IMG } from "@/i18n";
import { fmtDate } from "@/lib/utils";
import type { AppEvent, Lang } from "@/types";

interface Props {
  event: AppEvent | null;
  onClose: () => void;
  t: (key: string) => string;
  lang: Lang;
}

export default function EventDetailDialog({ event, onClose, t, lang }: Props) {
  const [lastEvent, setLastEvent] = useState<AppEvent | null>(event);

  useEffect(() => {
    if (event) setLastEvent(event);
  }, [event]);

  const shown = event ?? lastEvent;

  return (
    <Dialog.Root open={event !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      {shown && (
        <Dialog.Portal>
          <Dialog.Overlay className="event-dialog-overlay" />
          <Dialog.Content className="event-dialog" onOpenAutoFocus={(e) => {
            const target = e.currentTarget;
            if (target instanceof HTMLElement) target.scrollTop = 0;
          }}>
            <Dialog.Close className="event-dialog-close" aria-label={t("close")}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
            </Dialog.Close>
            <img
              className="event-dialog-poster"
              src={shown.image || EVENT_IMG[shown.cat]}
              alt={`${t("event_poster_alt")}: ${shown.title}`}
              draggable={false}
            />
            <div className="event-dialog-body">
              <span className={`event-dialog-cat cat-${shown.cat}`}>
                <i style={{ background: CATS[shown.cat].color }} />{t("cat_" + shown.cat)}
              </span>
              <Dialog.Title className="event-dialog-title">{shown.title}</Dialog.Title>
              <p className="event-dialog-when">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
                <span>{fmtDate(shown.date, shown.time, lang)}</span>
              </p>
              <Dialog.Description className="event-dialog-description">
                {shown.desc.trim() || t("event_no_description")}
              </Dialog.Description>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      )}
    </Dialog.Root>
  );
}
