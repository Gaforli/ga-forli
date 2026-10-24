export const TOWER_CONFIG_VERSION = 1;

export const TOWER_CONFIG = {
  tickRate: 60,
  baseSize: 4.4,
  blockHeight: 0.56,
  travel: 5.2,
  initialSpeed: 2.35,
  speedPerFloor: 0.055,
  maxSpeed: 5.4,
  perfectTolerance: 0.13,
  placementLockTicks: 12,
  maxTicks: 60 * 60 * 12,
  maxCommands: 1000,
} as const;

export type Axis = "x" | "z";
export type TowerBlock = { x: number; z: number; width: number; depth: number; level: number };
export type TowerCommand = { tick: number };
export type TowerDebris = { x: number; z: number; width: number; depth: number; level: number; axis: Axis; side: number };
export type Placement =
  | { kind: "placed"; perfect: boolean; debris: TowerDebris | null }
  | { kind: "miss"; debris: TowerDebris }
  | { kind: "ignored" };

export type TowerState = {
  tick: number;
  score: number;
  perfects: number;
  over: boolean;
  lockedUntil: number;
  blocks: TowerBlock[];
  active: TowerBlock;
  activeBorn: number;
  axis: Axis;
};

const round = (n: number) => Math.round(n * 1_000_000) / 1_000_000;

export function speedForLevel(level: number) {
  return Math.min(TOWER_CONFIG.maxSpeed, TOWER_CONFIG.initialSpeed + level * TOWER_CONFIG.speedPerFloor);
}

/** Deterministic triangle wave in game units; rendering frame rate is irrelevant. */
export function activePosition(state: TowerState, tick = state.tick) {
  const elapsed = Math.max(0, tick - state.activeBorn) / TOWER_CONFIG.tickRate;
  const span = TOWER_CONFIG.travel * 2;
  const phase = ((elapsed * speedForLevel(state.score)) % (span * 2) + span * 2) % (span * 2);
  const offset = phase <= span ? phase - TOWER_CONFIG.travel : span * 2 - phase - TOWER_CONFIG.travel;
  return round(offset);
}

export function createTowerState(): TowerState {
  const base: TowerBlock = { x: 0, z: 0, width: TOWER_CONFIG.baseSize, depth: TOWER_CONFIG.baseSize, level: -1 };
  const active: TowerBlock = { x: 0, z: 0, width: base.width, depth: base.depth, level: 0 };
  return { tick: 0, score: 0, perfects: 0, over: false, lockedUntil: 0, blocks: [base], active, activeBorn: 0, axis: "x" };
}

export function placeTowerBlock(state: TowerState, tick: number): Placement {
  if (state.over || !Number.isInteger(tick) || tick <= state.tick || tick < state.lockedUntil) return { kind: "ignored" };
  state.tick = tick;
  const previous = state.blocks[state.blocks.length - 1];
  const axis = state.axis;
  const moving = { ...state.active };
  const offset = activePosition(state, tick);
  moving[axis] = offset;
  const sizeKey = axis === "x" ? "width" : "depth";
  const delta = round(offset - previous[axis]);
  const overlap = round(previous[sizeKey] - Math.abs(delta));
  const level = state.score;

  if (overlap <= 0) {
    state.over = true;
    return { kind: "miss", debris: { ...moving, [axis]: offset, level, axis, side: Math.sign(delta) || 1 } };
  }

  const perfect = Math.abs(delta) <= TOWER_CONFIG.perfectTolerance;
  let debris: TowerDebris | null = null;
  if (perfect) {
    moving.x = previous.x;
    moving.z = previous.z;
    state.perfects += 1;
  } else {
    const direction = Math.sign(delta);
    moving[axis] = round(previous[axis] + delta / 2);
    moving[sizeKey] = overlap;
    debris = {
      ...moving,
      [axis]: round(previous[axis] + direction * (previous[sizeKey] / 2 + overlap / 2)),
      [sizeKey]: round(Math.abs(delta)),
      level,
      axis,
      side: direction,
    };
  }

  state.blocks.push(moving);
  state.score += 1;
  state.axis = axis === "x" ? "z" : "x";
  state.activeBorn = tick;
  state.lockedUntil = tick + TOWER_CONFIG.placementLockTicks;
  state.active = { x: moving.x, z: moving.z, width: moving.width, depth: moving.depth, level: state.score };
  return { kind: "placed", perfect, debris };
}

export function replayTower(commands: TowerCommand[], maxTicks = TOWER_CONFIG.maxTicks) {
  if (commands.length > TOWER_CONFIG.maxCommands) throw new Error("Troppi comandi");
  const state = createTowerState();
  let previousTick = 0;
  const placements: Placement[] = [];
  for (const command of commands) {
    if (!Number.isInteger(command.tick) || command.tick <= previousTick || command.tick > maxTicks) throw new Error("Sequenza temporale non valida");
    previousTick = command.tick;
    const placement = placeTowerBlock(state, command.tick);
    if (placement.kind === "ignored") throw new Error("Comando durante una transizione");
    placements.push(placement);
    if (state.over && command !== commands[commands.length - 1]) throw new Error("Comandi dopo la fine della partita");
  }
  return { state, placements };
}

export function normalizeNickname(value: string) {
  return value.normalize("NFC").trim().replace(/\s+/g, " ");
}

export function validNickname(value: string) {
  const name = normalizeNickname(value);
  return name.length >= 2 && name.length <= 20 && /^[\p{L}\p{N}][\p{L}\p{N} ._'-]*$/u.test(name);
}

/** Start of the current Europe/Rome week (Monday 00:00), DST-safe. */
export function romeWeekStart(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const sinceMonday = (days.indexOf(get("weekday")) + 6) % 7;
  const wall = Date.UTC(Number(get("year")), Number(get("month")) - 1, Number(get("day")) - sinceMonday);
  const probe = new Date(wall);
  const rome = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(probe);
  const val = (type: string) => Number(rome.find((p) => p.type === type)?.value ?? 0);
  const represented = Date.UTC(val("year"), val("month") - 1, val("day"), val("hour"), val("minute"), val("second"));
  const offset = represented - probe.getTime();
  return new Date(wall - offset);
}
