import { useMemo } from "react";

export type JarNote = { id: number; color: string };

type Props = {
  notes: JarNote[];
  capacity: number;
  /** Se true i bigliettini sono selezionabili (barattolo aperto). */
  selectable?: boolean;
  selectedId?: number | null;
  onSelect?: (id: number) => void;
};

// PRNG deterministico: la posizione/piegatura di ogni bigliettino dipende dal
// suo id, quindi resta identica a ogni visita (niente ri-mescolamenti a schermo).
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Slot = { x: number; y: number; rot: number; w: number };

// Riempimento progressivo dal fondo: file di bigliettini piegati che salgono
// man mano che i pensieri approvati aumentano. Oltre la capacità "visiva"
// i bigliettini continuano verso l'imboccatura.
function slotFor(index: number, id: number): Slot {
  const perRow = (row: number) => (row < 8 ? 5 : 4);
  let row = 0;
  let i = index;
  while (i >= perRow(row)) {
    i -= perRow(row);
    row += 1;
  }
  const cols = perRow(row);
  const rng = mulberry32(id * 2654435761 + 97);
  const jx = (rng() - 0.5) * 9;
  const jy = (rng() - 0.5) * 4;
  const rot = (rng() - 0.5) * 52;
  const w = 15 + rng() * 3; // larghezza in % del contenitore
  const x = cols === 1 ? 50 : 12 + (i * 76) / (cols - 1);
  const y = 91 - row * 8.6;
  return { x: x + jx, y: y + jy, rot, w };
}

function JarBackGlass() {
  return (
    <svg className="gjar-svg gjar-back" viewBox="0 0 300 400" aria-hidden="true">
      {/* vetro posteriore del barattolo */}
      <path
        d="M84,48 C58,64 44,96 44,136 L44,326 C44,360 72,380 150,380 C228,380 256,360 256,326 L256,136 C256,96 242,64 216,48"
        fill="rgba(255,255,255,0.28)"
        stroke="rgba(84,104,84,0.4)"
        strokeWidth="3"
      />
      {/* imboccatura aperta */}
      <ellipse cx="150" cy="46" rx="68" ry="15" fill="rgba(255,255,255,0.35)" stroke="rgba(84,104,84,0.4)" strokeWidth="3" />
      <ellipse cx="150" cy="46" rx="54" ry="10" fill="rgba(120,140,125,0.12)" stroke="rgba(84,104,84,0.25)" strokeWidth="2" />
    </svg>
  );
}

function JarFrontGlass() {
  return (
    <svg className="gjar-svg gjar-front" viewBox="0 0 300 400" aria-hidden="true">
      {/* riflessi delicati: livello anteriore, non intercetta i click */}
      <path
        d="M70,120 C62,160 62,260 70,320 C73,338 86,336 84,318 C78,260 78,166 86,128 C89,112 73,106 70,120 Z"
        fill="rgba(255,255,255,0.5)"
      />
      <path
        d="M232,150 C228,190 228,250 232,290 C234,302 244,300 243,288 C239,248 239,192 243,156 C245,144 234,140 232,150 Z"
        fill="rgba(255,255,255,0.32)"
      />
      <ellipse cx="150" cy="46" rx="68" ry="15" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
    </svg>
  );
}

export function GratitudeJar({ notes, capacity, selectable = false, selectedId = null, onSelect }: Props) {
  const slots = useMemo(
    () => notes.map((n, i) => ({ note: n, slot: slotFor(i, n.id) })),
    [notes],
  );
  const fill = Math.min(1, notes.length / Math.max(1, capacity));
  return (
    <div className="gjar" role="img" aria-label={`Barattolo della gratitudine con ${notes.length} bigliettini`}>
      <JarBackGlass />
      <div className="gjar-fill" style={{ height: `${6 + fill * 74}%` }} aria-hidden="true" />
      <div className="gjar-notes">
        {slots.map(({ note, slot }) =>
          selectable ? (
            <button
              key={note.id}
              type="button"
              className={`gjar-note${selectedId === note.id ? " sel" : ""}`}
              style={{
                left: `${slot.x}%`,
                top: `${slot.y}%`,
                width: `${slot.w}%`,
                background: note.color,
                transform: `translate(-50%,-50%) rotate(${slot.rot}deg)`,
              }}
              onClick={() => onSelect?.(note.id)}
              aria-label="Apri il bigliettino"
            />
          ) : (
            <span
              key={note.id}
              className="gjar-note"
              style={{
                left: `${slot.x}%`,
                top: `${slot.y}%`,
                width: `${slot.w}%`,
                background: note.color,
                transform: `translate(-50%,-50%) rotate(${slot.rot}deg)`,
              }}
            />
          ),
        )}
      </div>
      <JarFrontGlass />
      <div className="gjar-label">I nostri grazie</div>
    </div>
  );
}
