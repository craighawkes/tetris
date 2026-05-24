<script lang="ts">
  import type { PieceKind } from '../lib/engine';

  interface Props {
    kind: PieceKind | null;
    label: string;
    dim?: boolean;
  }
  let { kind, label, dim = false }: Props = $props();

  // Minimal 4x2 shape strings — kept simple, just for the preview slot.
  const SHAPES: Record<PieceKind, readonly (readonly [number, number])[]> = {
    I: [[1, 0], [1, 1], [1, 2], [1, 3]],
    O: [[0, 1], [0, 2], [1, 1], [1, 2]],
    T: [[0, 1], [1, 0], [1, 1], [1, 2]],
    S: [[0, 1], [0, 2], [1, 0], [1, 1]],
    Z: [[0, 0], [0, 1], [1, 1], [1, 2]],
    J: [[0, 0], [1, 0], [1, 1], [1, 2]],
    L: [[0, 2], [1, 0], [1, 1], [1, 2]],
  };
  const COLS = 4;
  const ROWS = 2;
  const cells = Array.from({ length: COLS * ROWS });
  const filled = $derived(kind ? new Set(SHAPES[kind].map(([r, c]) => `${r},${c}`)) : new Set<string>());
</script>

<div class="wrap" class:dim>
  <div class="label">{label}</div>
  <div class="grid">
    {#each cells as _, idx}
      {@const r = Math.floor(idx / COLS)}
      {@const c = idx % COLS}
      {#if kind && filled.has(`${r},${c}`)}
        <div class="cell filled" style:--p="var(--p-{kind})"></div>
      {:else}
        <div class="cell"></div>
      {/if}
    {/each}
  </div>
</div>

<style>
  .wrap {
    background: var(--panel-bg);
    border-radius: 8px;
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }
  @media (min-width: 460px) {
    .wrap { padding: 8px 10px 10px; gap: 6px; }
  }
  .wrap.dim {
    opacity: 0.45;
  }
  .label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-dim);
    font-weight: 700;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    grid-template-rows: repeat(2, 1fr);
    gap: 2px;
    aspect-ratio: 4 / 2;
  }
  .cell {
    background: rgba(255, 255, 255, 0.03);
    border-radius: 3px;
  }
  .filled {
    background: var(--p);
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.25),
      inset 0 -2px 0 rgba(0, 0, 0, 0.25);
  }
</style>
