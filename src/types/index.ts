export type SongLine =
  | { t: "gap" }
  | { t: "text"; l: string }
  | { t: "chords"; c: string }
  | { t: "pair"; c: string[]; l: string };

export interface Song {
  num: string;
  title: string;
  tag: string;
  lines: SongLine[];
}

export type EventCategory =
  | "spiritualita"
  | "natura"
  | "musica"
  | "comunita"
  | "formazione";

export interface AppEvent {
  id: number;
  date: string;
  time: string;
  title: string;
  cat: EventCategory;
  desc: string;
  image?: string;
}

export interface TemaContent {
  title: string;
  tag: string;
  body: string;
}

export type Lang = "it" | "en" | "es" | "pt";
export type Page = "home" | "eventi" | "innario" | "versetto" | "tema" | "profilo" | "admin";
