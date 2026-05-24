<script lang="ts">
  import { COLS, ROWS, ghostPiece, pieceCells, type Board, type PieceKind, type Piece } from '../lib/engine';

  interface Props {
    board: Board;
    active: Piece | null;
    showGhost?: boolean;
  }
  let { board, active, showGhost = true }: Props = $props();

  // Build the render grid: locked cells from board, overlay ghost (dim) then active (solid).
  type RenderCell = { kind: PieceKind; tag: 'locked' | 'ghost' | 'active' } | null;

  const grid = $derived.by<RenderCell[][]>(() => {
    const g: RenderCell[][] = board.map((row) => row.map((c) => (c === null ? null : { kind: c, tag: 'locked' })));
    if (showGhost && active) {
      const ghost = ghostPiece({
        board,
        active,
        queue: [],
        hold: null,
        canHold: true,
        bag: [],
        score: 0,
        lines: 0,
        level: 0,
        status: 'playing',
      });
      if (ghost && ghost.row !== active.row) {
        for (const { row, col } of pieceCells(ghost)) {
          if (row >= 0 && row < ROWS && col >= 0 && col < COLS && g[row][col] === null) {
            g[row][col] = { kind: ghost.kind, tag: 'ghost' };
          }
        }
      }
    }
    if (active) {
      for (const { row, col } of pieceCells(active)) {
        if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
          g[row][col] = { kind: active.kind, tag: 'active' };
        }
      }
    }
    return g;
  });
</script>

<div class="board" style:--cols={COLS} style:--rows={ROWS}>
  {#each grid as row, r}
    {#each row as cell, c (r * COLS + c)}
      {#if cell}
        <div
          class="cell filled tag-{cell.tag}"
          style:--p="var(--p-{cell.kind})"
          style:grid-column={c + 1}
          style:grid-row={r + 1}
        ></div>
      {:else}
        <div class="cell" style:grid-column={c + 1} style:grid-row={r + 1}></div>
      {/if}
    {/each}
  {/each}
</div>

<style>
  .board {
    position: relative;
    width: 100%;
    aspect-ratio: var(--cols) / var(--rows);
    background: var(--board-bg);
    border-radius: 10px;
    padding: 6px;
    display: grid;
    grid-template-columns: repeat(var(--cols), 1fr);
    grid-template-rows: repeat(var(--rows), 1fr);
    gap: 2px;
    box-shadow: var(--shadow), inset 0 0 0 1px rgba(255, 255, 255, 0.04);
    container-type: inline-size;
  }
  .cell {
    background: var(--cell-bg);
    border-radius: 3px;
  }
  .filled {
    background: var(--p);
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.25),
      inset 0 -3px 0 rgba(0, 0, 0, 0.25);
  }
  .tag-ghost {
    background: transparent;
    box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--p) 55%, transparent);
  }
  .tag-active {
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.45),
      inset 0 -3px 0 rgba(0, 0, 0, 0.25);
  }
</style>
