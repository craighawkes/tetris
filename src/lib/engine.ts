export const COLS = 10;
export const ROWS = 20;

export type PieceKind = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';
export type Cell = PieceKind | null;
export type Board = readonly (readonly Cell[])[];
export type Status = 'playing' | 'paused' | 'lost';
export type Rotation = 0 | 1 | 2 | 3;
export type Rng = () => number;

export interface Piece {
  readonly kind: PieceKind;
  readonly rotation: Rotation;
  readonly row: number;
  readonly col: number;
}

export interface GameState {
  readonly board: Board;
  readonly active: Piece | null;
  readonly queue: readonly PieceKind[];
  readonly hold: PieceKind | null;
  readonly canHold: boolean;
  readonly bag: readonly PieceKind[];
  readonly score: number;
  readonly lines: number;
  readonly level: number;
  readonly status: Status;
}

export interface TickResult {
  readonly state: GameState;
  readonly locked: boolean;
  readonly clearedLines: number;
}

// Cell offsets (dr, dc) from a piece's anchor row/col for each rotation 0/1/2/3.
// Mostly matches SRS bounding boxes — I uses a 4-wide row, others use a 3-tall box.
type Shape = readonly (readonly [number, number])[];
const SHAPES: Record<PieceKind, readonly [Shape, Shape, Shape, Shape]> = {
  I: [
    [[1, 0], [1, 1], [1, 2], [1, 3]],
    [[0, 2], [1, 2], [2, 2], [3, 2]],
    [[2, 0], [2, 1], [2, 2], [2, 3]],
    [[0, 1], [1, 1], [2, 1], [3, 1]],
  ],
  O: [
    [[0, 1], [0, 2], [1, 1], [1, 2]],
    [[0, 1], [0, 2], [1, 1], [1, 2]],
    [[0, 1], [0, 2], [1, 1], [1, 2]],
    [[0, 1], [0, 2], [1, 1], [1, 2]],
  ],
  T: [
    [[0, 1], [1, 0], [1, 1], [1, 2]],
    [[0, 1], [1, 1], [1, 2], [2, 1]],
    [[1, 0], [1, 1], [1, 2], [2, 1]],
    [[0, 1], [1, 0], [1, 1], [2, 1]],
  ],
  S: [
    [[0, 1], [0, 2], [1, 0], [1, 1]],
    [[0, 1], [1, 1], [1, 2], [2, 2]],
    [[1, 1], [1, 2], [2, 0], [2, 1]],
    [[0, 0], [1, 0], [1, 1], [2, 1]],
  ],
  Z: [
    [[0, 0], [0, 1], [1, 1], [1, 2]],
    [[0, 2], [1, 1], [1, 2], [2, 1]],
    [[1, 0], [1, 1], [2, 1], [2, 2]],
    [[0, 1], [1, 0], [1, 1], [2, 0]],
  ],
  J: [
    [[0, 0], [1, 0], [1, 1], [1, 2]],
    [[0, 1], [0, 2], [1, 1], [2, 1]],
    [[1, 0], [1, 1], [1, 2], [2, 2]],
    [[0, 1], [1, 1], [2, 0], [2, 1]],
  ],
  L: [
    [[0, 2], [1, 0], [1, 1], [1, 2]],
    [[0, 1], [1, 1], [2, 1], [2, 2]],
    [[1, 0], [1, 1], [1, 2], [2, 0]],
    [[0, 0], [0, 1], [1, 1], [2, 1]],
  ],
};

const KINDS: readonly PieceKind[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

// Wall-kick offsets (dr, dc) tried in order when a rotation lands on a collision.
// Not full SRS, but enough to feel right — tries the obvious sideways nudges first.
const KICKS: readonly (readonly [number, number])[] = [
  [0, 0],
  [0, -1],
  [0, 1],
  [-1, 0],
  [0, -2],
  [0, 2],
  [-1, -1],
  [-1, 1],
];

export function emptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(null));
}

export function pieceCells(piece: Piece): Array<{ row: number; col: number }> {
  const shape = SHAPES[piece.kind][piece.rotation];
  return shape.map(([dr, dc]) => ({ row: piece.row + dr, col: piece.col + dc }));
}

function isValid(board: Board, piece: Piece): boolean {
  for (const { row, col } of pieceCells(piece)) {
    if (col < 0 || col >= COLS || row >= ROWS) return false;
    if (row < 0) continue; // above board is fine while piece is descending
    if (board[row][col] !== null) return false;
  }
  return true;
}

function spawnFor(kind: PieceKind): Piece {
  // Anchor row 0 keeps pieces fully visible on spawn — close enough to standard.
  // Column 3 puts I-piece cells at cols 3-6 and 3-cell-wide pieces at cols 3-5.
  return { kind, rotation: 0, row: 0, col: 3 };
}

function shuffledBag(rng: Rng): PieceKind[] {
  const bag = [...KINDS];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

const QUEUE_TARGET = 5;

function fillQueue(
  queue: readonly PieceKind[],
  bag: readonly PieceKind[],
  rng: Rng,
): { queue: PieceKind[]; bag: PieceKind[] } {
  const q = [...queue];
  let b = [...bag];
  while (q.length < QUEUE_TARGET) {
    if (b.length === 0) b = shuffledBag(rng);
    q.push(b.shift()!);
  }
  return { queue: q, bag: b };
}

function spawnFromQueue(state: GameState, rng: Rng): GameState {
  const filled = fillQueue(state.queue, state.bag, rng);
  const [next, ...rest] = filled.queue;
  const refilled = fillQueue(rest, filled.bag, rng);
  const active = spawnFor(next);
  if (!isValid(state.board, active)) {
    return {
      ...state,
      active: null,
      queue: refilled.queue,
      bag: refilled.bag,
      canHold: true,
      status: 'lost',
    };
  }
  return {
    ...state,
    active,
    queue: refilled.queue,
    bag: refilled.bag,
    canHold: true,
  };
}

export function createInitialState(rng: Rng = Math.random): GameState {
  const base: GameState = {
    board: emptyBoard(),
    active: null,
    queue: [],
    hold: null,
    canHold: true,
    bag: [],
    score: 0,
    lines: 0,
    level: 0,
    status: 'playing',
  };
  return spawnFromQueue(base, rng);
}

export function moveHorizontal(state: GameState, dx: -1 | 1): GameState {
  if (state.status !== 'playing' || !state.active) return state;
  const next = { ...state.active, col: state.active.col + dx };
  return isValid(state.board, next) ? { ...state, active: next } : state;
}

export function rotate(state: GameState, dir: 1 | -1): GameState {
  if (state.status !== 'playing' || !state.active) return state;
  const piece = state.active;
  if (piece.kind === 'O') return state;
  const rotation = (((piece.rotation + dir) % 4) + 4) % 4 as Rotation;
  for (const [dr, dc] of KICKS) {
    const candidate: Piece = { ...piece, rotation, row: piece.row + dr, col: piece.col + dc };
    if (isValid(state.board, candidate)) return { ...state, active: candidate };
  }
  return state;
}

export function softDrop(state: GameState): GameState {
  if (state.status !== 'playing' || !state.active) return state;
  const next = { ...state.active, row: state.active.row + 1 };
  if (!isValid(state.board, next)) return state;
  return { ...state, active: next, score: state.score + 1 };
}

function lockPiece(state: GameState, rng: Rng, dropDistance: number): TickResult {
  if (!state.active) return { state, locked: false, clearedLines: 0 };
  const cells = pieceCells(state.active);
  // Top-out: any locked cell above the visible board.
  if (cells.some(({ row }) => row < 0)) {
    return {
      state: { ...state, active: null, status: 'lost' },
      locked: true,
      clearedLines: 0,
    };
  }

  const newBoard = state.board.map((r) => [...r]);
  for (const { row, col } of cells) newBoard[row][col] = state.active.kind;

  const kept: Cell[][] = [];
  let cleared = 0;
  for (const row of newBoard) {
    if (row.every((c) => c !== null)) cleared += 1;
    else kept.push(row);
  }
  while (kept.length < ROWS) kept.unshift(Array<Cell>(COLS).fill(null));

  const lineScore = LINE_SCORE[cleared] ?? 0;
  const totalLines = state.lines + cleared;
  const level = Math.floor(totalLines / 10);
  const scoreAdded = lineScore * (state.level + 1) + dropDistance * 2;

  const afterClear: GameState = {
    ...state,
    board: kept,
    active: null,
    score: state.score + scoreAdded,
    lines: totalLines,
    level,
  };

  const spawned = spawnFromQueue(afterClear, rng);
  return { state: spawned, locked: true, clearedLines: cleared };
}

const LINE_SCORE: Record<number, number> = {
  0: 0,
  1: 40,
  2: 100,
  3: 300,
  4: 1200,
};

export function tick(state: GameState, rng: Rng = Math.random): TickResult {
  if (state.status !== 'playing' || !state.active) {
    return { state, locked: false, clearedLines: 0 };
  }
  const moved = { ...state.active, row: state.active.row + 1 };
  if (isValid(state.board, moved)) {
    return { state: { ...state, active: moved }, locked: false, clearedLines: 0 };
  }
  return lockPiece(state, rng, 0);
}

export function hardDrop(state: GameState, rng: Rng = Math.random): TickResult {
  if (state.status !== 'playing' || !state.active) {
    return { state, locked: false, clearedLines: 0 };
  }
  let piece = state.active;
  let distance = 0;
  while (true) {
    const next = { ...piece, row: piece.row + 1 };
    if (!isValid(state.board, next)) break;
    piece = next;
    distance += 1;
  }
  return lockPiece({ ...state, active: piece }, rng, distance);
}

export function holdPiece(state: GameState, rng: Rng = Math.random): GameState {
  if (state.status !== 'playing' || !state.active || !state.canHold) return state;
  const currentKind = state.active.kind;
  if (state.hold === null) {
    const next = spawnFromQueue({ ...state, hold: currentKind, active: null }, rng);
    return { ...next, canHold: false };
  }
  const swappedKind = state.hold;
  const swapped = spawnFor(swappedKind);
  if (!isValid(state.board, swapped)) {
    return { ...state, active: null, hold: currentKind, status: 'lost', canHold: false };
  }
  return { ...state, active: swapped, hold: currentKind, canHold: false };
}

export function ghostPiece(state: GameState): Piece | null {
  if (!state.active) return null;
  let piece = state.active;
  while (true) {
    const next = { ...piece, row: piece.row + 1 };
    if (!isValid(state.board, next)) return piece;
    piece = next;
  }
}

// Classic NES-style gravity intervals per level (ms per row). Caps at level 19+.
const GRAVITY_MS = [
  800, 720, 630, 550, 470, 380, 300, 220, 130, 100,
  80, 80, 80, 70, 70, 70, 50, 50, 50, 30,
];

export function gravityIntervalMs(level: number): number {
  if (level < 0) return GRAVITY_MS[0];
  if (level >= GRAVITY_MS.length) return GRAVITY_MS[GRAVITY_MS.length - 1];
  return GRAVITY_MS[level];
}

// --- Test helpers ---

export function setBoardCell(board: Board, row: number, col: number, kind: Cell): Board {
  return board.map((r, ri) => (ri === row ? r.map((c, ci) => (ci === col ? kind : c)) : [...r]));
}

export function boardFromRows(rows: readonly string[]): Board {
  // Each row string is 10 chars; '.' = empty, any other char = filled with that kind (or 'X' default).
  const parsed: Cell[][] = rows.map((line) =>
    Array.from(line.padEnd(COLS, '.')).slice(0, COLS).map((ch) => (ch === '.' ? null : (ch as PieceKind))),
  );
  while (parsed.length < ROWS) parsed.unshift(Array<Cell>(COLS).fill(null));
  return parsed;
}
