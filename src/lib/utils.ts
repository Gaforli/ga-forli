import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { MONTHS, DAYS_SHORT } from "@/i18n";
import type { Lang, AppEvent } from "@/types";

export function fmtDate(iso: string, time: string | undefined, lang: Lang): string {
  const d = new Date(iso + "T12:00:00");
  const dayName = DAYS_SHORT[lang][d.getDay()];
  const s = dayName.charAt(0).toUpperCase() + dayName.slice(1) + " " + d.getDate() + " " + MONTHS[lang][d.getMonth()].slice(0, 3);
  return time ? s + " · " + time : s;
}

export function upcomingEvents(events: AppEvent[]): AppEvent[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sorted = events.slice().sort((a, b) => (a.date < b.date ? -1 : 1));
  const up = sorted.filter((e) => new Date(e.date + "T12:00:00") >= today);
  return up.length ? up : sorted;
}

export function dayOfYear(): number {
  const n = new Date();
  return Math.floor((n.getTime() - new Date(n.getFullYear(), 0, 0).getTime()) / 864e5);
}

export function isChordy(l: string): boolean {
  const toks = l.trim().split(/\s+/);
  if (!toks.length || toks.length > 6) return false;
  const N = ["DO", "RE", "MI", "FA", "SOL", "LA", "SI", "A", "B", "C", "D", "E", "F", "G"];
  return toks.every((tok) => {
    const m = tok.match(/^([A-Za-zÀ-ÿ]+[#b]?)/);
    return (m && N.includes(m[1].toUpperCase().replace(/IS$/, ""))) || /^[xX×]?\d+$/.test(tok);
  });
}

export function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** "APRI I MIEI OCCHI" -> "Apri i Miei Occhi" (small Italian words stay lowercase, handles apostrophes) */
const TC_SMALL = new Set(["a", "e", "o", "i", "di", "da", "in", "con", "su", "per", "tra", "fra", "il", "lo", "la", "le", "gli", "un", "una", "del", "della", "dei", "nel", "nella", "al", "alla", "the", "of", "and"]);
export function titleCase(s: string): string {
  let first = true;
  return s.toLowerCase().replace(/\p{L}[\p{L}'’]*/gu, (w) => {
    const bare = w.replace(/['’].*$/, "");
    if (!first && TC_SMALL.has(bare)) return w;
    first = false;
    return w.replace(/(^|['’\-])(\p{L})/gu, (_m, p, c) => p + c.toUpperCase());
  });
}
