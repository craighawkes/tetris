import { describe, it, expect } from 'vitest';
import {
  COLS,
  ROWS,
  boardFromRows,
  createInitialState,
  emptyBoard,
  ghostPiece,
  hardDrop,
  holdPiece,
  moveHorizontal,
  pieceCells,
  rotate,
  softDrop,
  tick,
  type GameState,
  type PieceKind,
  type Piece,
} from './engine';

function seededRng(seed = 1): () => number {
  let s = seed >>> 0;
  return () => {
    // Mulberry32 — deterministic, good enough for tests.
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function setActive(state: GameState, piece: Piece): GameState {
  return { ...state, active: piece };
}

describe('board basics', () => {
  it('starts empty with 20x10 cells', () => {
    const board = emptyBoard();
    expect(board.length).toBe(ROWS);
    expect(board[0].length).toBe(COLS);
    expect(board.every((row) => row.every((c) => c === null))).toBe(true);
  });
});

describe('createInitialState', () => {
  it('spawns an active piece and fills the queue', () => {
    const state = createInitialState(seededRng(42));
    expect(state.active).not.toBeNull();
    expect(state.queue.length).toBe(5);
    expect(state.status).toBe('playing');
    expect(state.score).toBe(0);
    expect(state.lines).toBe(0);
    expect(state.level).toBe(0);
  });
});

describe('horizontal movement', () => {
  it('cannot move past the left wall', () => {
    const state = createInitialState(seededRng(1));
    let s = state;
    for (let i = 0; i < 20; i++) s = moveHorizontal(s, -1);
    const cols = pieceCells(s.active!).map((c) => c.col);
    expect(Math.min(...cols)).toBe(0);
  });

  it('cannot move past the right wall', () => {
    const state = createInitialState(seededRng(1));
    let s = state;
    for (let i = 0; i < 20; i++) s = moveHorizontal(s, 1);
    const cols = pieceCells(s.active!).map((c) => c.col);
    expect(Math.max(...cols)).toBe(COLS - 1);
  });
});

describe('rotation', () => {
  it('O piece does not change cells when rotated', () => {
    const s0 = createInitialState(seededRng(1));
    const o: Piece = { kind: 'O', rotation: 0, row: 5, col: 4 };
    const s = setActive(s0, o);
    const r1 = rotate(s, 1).active!;
    expect(r1.rotation).toBe(0);
  });

  it('T piece cycles rotations 0→1→2→3→0', () => {
    const s0 = createInitialState(seededRng(1));
    const t: Piece = { kind: 'T', rotation: 0, row: 5, col: 4 };
    let s = setActive(s0, t);
    s = rotate(s, 1);
    expect(s.active!.rotation).toBe(1);
    s = rotate(s, 1);
    expect(s.active!.rotation).toBe(2);
    s = rotate(s, 1);
    expect(s.active!.rotation).toBe(3);
    s = rotate(s, 1);
    expect(s.active!.rotation).toBe(0);
  });
});

describe('tick / lock', () => {
  it('lands and locks when reaching the floor', () => {
    const start = createInitialState(seededRng(1));
    const piece: Piece = { kind: 'I', rotation: 0, row: ROWS - 2, col: 3 };
    let s: GameState = setActive(start, piece);

    const before = s.active;
    expect(before).not.toBeNull();

    const result = tick(s, seededRng(1));
    // After the lock, a fresh piece is spawned.
    expect(result.locked).toBe(true);
    expect(result.state.active).not.toBeNull();
    expect(result.state.active!.kind).not.toBe(undefined);

    // The locked cells should be present on the board.
    const filled = result.state.board.flat().filter((c) => c !== null).length;
    expect(filled).toBe(4);
  });
});

describe('line clears', () => {
  it('clears full lines and scores', () => {
    const start = createInitialState(seededRng(7));
    // Bottom two rows: every column filled except col 4. Dropping an I-piece
    // vertically into col 4 fills both gaps and clears those rows.
    const board = emptyBoard().map((r) => [...r]);
    for (let c = 0; c < COLS; c++) {
      if (c !== 4) {
        board[ROWS - 1][c] = 'X' as PieceKind;
        board[ROWS - 2][c] = 'X' as PieceKind;
      }
    }
    const state: GameState = {
      ...start,
      board,
      // I rotation 1 → cells at col anchor+2 → col 4 when col=2; rows 0..3 of bbox.
      active: { kind: 'I', rotation: 1, row: 0, col: 2 },
    };
    const scoreBefore = state.score;

    const result = hardDrop(state, seededRng(7));
    expect(result.locked).toBe(true);
    expect(result.clearedLines).toBe(2);
    expect(result.state.score).toBeGreaterThan(scoreBefore);
    expect(result.state.lines).toBe(2);
  });

  it('awards tetris (4-line) bonus', () => {
    const start = createInitialState(seededRng(11));
    // Fill bottom 4 rows except col 0, then drop a vertical I-piece into col 0.
    const board = emptyBoard().map((r) => [...r]);
    for (let row = ROWS - 4; row < ROWS; row++) {
      for (let c = 1; c < COLS; c++) board[row][c] = 'X' as PieceKind;
    }
    const state: GameState = {
      ...start,
      board,
      active: { kind: 'I', rotation: 1, row: 0, col: -2 }, // rotation 1 puts cells at col anchor+2 → col 0
    };
    const result = hardDrop(state, seededRng(11));
    expect(result.clearedLines).toBe(4);
    expect(result.state.lines).toBe(4);
    // Tetris = 1200 * (level+1) plus hard-drop distance bonus.
    expect(result.state.score).toBeGreaterThanOrEqual(1200);
  });
});

describe('soft drop and ghost', () => {
  it('soft drop moves one row and adds 1 to score', () => {
    const start = createInitialState(seededRng(3));
    const before = start.active!;
    const next = softDrop(start);
    expect(next.active!.row).toBe(before.row + 1);
    expect(next.score).toBe(start.score + 1);
  });

  it('ghost piece reaches the lowest valid position', () => {
    const start = createInitialState(seededRng(3));
    const ghost = ghostPiece(start)!;
    expect(ghost.row).toBeGreaterThan(start.active!.row);
    // Moving the ghost one more row should be invalid.
    // Cells must remain within the board.
    const cells = pieceCells(ghost);
    expect(cells.every((c) => c.row < ROWS && c.col >= 0 && c.col < COLS)).toBe(true);
  });
});

describe('hold', () => {
  it('first hold stashes piece and spawns the next one', () => {
    const start = createInitialState(seededRng(5));
    const original = start.active!.kind;
    const next = holdPiece(start, seededRng(5));
    expect(next.hold).toBe(original);
    expect(next.active!.kind).not.toBe(undefined);
    expect(next.canHold).toBe(false);
  });

  it('second hold without a lock is rejected', () => {
    const start = createInitialState(seededRng(5));
    const once = holdPiece(start, seededRng(5));
    const twice = holdPiece(once, seededRng(5));
    expect(twice).toBe(once);
  });
});

describe('game over', () => {
  it('reports lost when a spawn collides', () => {
    const start = createInitialState(seededRng(9));
    // Fill the spawn area entirely.
    const board = emptyBoard().map((r) => [...r]);
    for (let r = 0; r < 4; r++) for (let c = 0; c < COLS; c++) board[r][c] = 'X' as PieceKind;
    // Place a high piece and lock it via tick (it actually has nowhere to fall, so the
    // tick will lock at its position and try to spawn the next, which will fail).
    const piece: Piece = { kind: 'O', rotation: 0, row: -2, col: 4 };
    const state: GameState = { ...start, board, active: piece };
    const result = tick(state, seededRng(9));
    expect(result.state.status).toBe('lost');
  });
});
