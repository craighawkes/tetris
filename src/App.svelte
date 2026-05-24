<script lang="ts">
  import Board from './components/Board.svelte';
  import PiecePreview from './components/PiecePreview.svelte';
  import Overlay from './components/Overlay.svelte';
  import HelpModal from './components/HelpModal.svelte';
  import { game } from './lib/game.svelte';

  let showHelp = $state(false);

  function handleKey(e: KeyboardEvent) {
    if (showHelp) {
      if (e.key === 'Escape') showHelp = false;
      return;
    }
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        game.left();
        break;
      case 'ArrowRight':
        e.preventDefault();
        game.right();
        break;
      case 'ArrowDown':
        e.preventDefault();
        game.softDrop();
        break;
      case 'ArrowUp':
      case 'x':
      case 'X':
        e.preventDefault();
        game.rotateCW();
        break;
      case 'z':
      case 'Z':
        e.preventDefault();
        game.rotateCCW();
        break;
      case ' ':
        e.preventDefault();
        game.hardDrop();
        break;
      case 'c':
      case 'C':
      case 'Shift':
        e.preventDefault();
        game.hold();
        break;
      case 'p':
      case 'P':
        e.preventDefault();
        game.togglePause();
        break;
    }
  }

  // --- touch controls ---
  // Tap = rotate, horizontal swipe = move, downward swipe = soft drop,
  // fast downward flick = hard drop.
  const SWIPE_CELL = 28; // px per discrete left/right step
  const HARD_DROP_DY = 80;
  const HARD_DROP_VELOCITY = 0.7; // px/ms
  const TAP_MAX_DURATION = 220;
  const TAP_MAX_DISTANCE = 10;

  let touchStart: { x: number; y: number; t: number; lastStepX: number; lastSoftAt: number } | null = null;
  let touchMoved = false;
  let hardDropped = false;

  function onTouchStart(e: TouchEvent) {
    if (e.touches.length !== 1) {
      touchStart = null;
      return;
    }
    const t = e.touches[0];
    touchStart = { x: t.clientX, y: t.clientY, t: performance.now(), lastStepX: t.clientX, lastSoftAt: 0 };
    touchMoved = false;
    hardDropped = false;
  }

  function onTouchMove(e: TouchEvent) {
    if (!touchStart || hardDropped) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStart.lastStepX;
    const dyTotal = t.clientY - touchStart.y;
    const dtTotal = performance.now() - touchStart.t;

    if (Math.abs(dx) >= SWIPE_CELL) {
      const steps = Math.trunc(dx / SWIPE_CELL);
      for (let i = 0; i < Math.abs(steps); i++) {
        if (steps > 0) game.right();
        else game.left();
      }
      touchStart.lastStepX += steps * SWIPE_CELL;
      touchMoved = true;
    }

    if (dyTotal > HARD_DROP_DY && dyTotal / Math.max(1, dtTotal) > HARD_DROP_VELOCITY) {
      e.preventDefault();
      game.hardDrop();
      hardDropped = true;
      touchMoved = true;
      return;
    }

    // Continuous soft drop while finger moves down.
    if (dyTotal > 16) {
      const now = performance.now();
      if (now - touchStart.lastSoftAt > 60) {
        game.softDrop();
        touchStart.lastSoftAt = now;
        touchMoved = true;
      }
    }
  }

  function onTouchEnd() {
    if (!touchStart) return;
    const duration = performance.now() - touchStart.t;
    if (!touchMoved && duration < TAP_MAX_DURATION) {
      game.rotateCW();
    }
    touchStart = null;
    touchMoved = false;
    hardDropped = false;
  }

  function onTouchCancel() {
    touchStart = null;
    touchMoved = false;
    hardDropped = false;
  }

  function primaryButtonAction() {
    if (game.state.status === 'lost') game.newGame();
    else if (game.paused) game.togglePause();
  }
</script>

<svelte:window on:keydown={handleKey} />

<main>
  <header>
    <h1>Tetris</h1>
    <div class="scores">
      <div class="score-box">
        <div class="label">Score</div>
        <div class="value">{game.state.score}</div>
      </div>
      <div class="score-box">
        <div class="label">Best</div>
        <div class="value">{game.bestScore}</div>
      </div>
      <button type="button" class="help-btn" aria-label="How to play" onclick={() => (showHelp = true)}>?</button>
    </div>
  </header>

  <div class="layout">
    <aside class="side hold">
      <PiecePreview kind={game.state.hold} label="Hold" dim={!game.state.canHold} />
      <div class="stats">
        <div class="stat">
          <div class="stat-label">Lines</div>
          <div class="stat-value">{game.state.lines}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Level</div>
          <div class="stat-value">{game.state.level}</div>
        </div>
      </div>
    </aside>

    <div
      class="board-wrap"
      role="application"
      aria-label="Tetris game board"
      ontouchstart={onTouchStart}
      ontouchmove={onTouchMove}
      ontouchend={onTouchEnd}
      ontouchcancel={onTouchCancel}
    >
      <Board board={game.state.board} active={game.state.active} />
      {#if game.state.status === 'lost' || game.paused}
        <Overlay
          status={game.state.status === 'lost' ? 'lost' : 'paused'}
          score={game.state.score}
          onAction={primaryButtonAction}
        />
      {/if}
    </div>

    <aside class="side next">
      <div class="next-list">
        {#each game.state.queue.slice(0, 4) as kind, i (i)}
          <PiecePreview {kind} label={i === 0 ? 'Next' : ''} />
        {/each}
      </div>
    </aside>
  </div>

  <div class="controls">
    <p class="hint">Arrows · Z/X rotate · Space drop · C hold · P pause</p>
    <div class="buttons">
      <button type="button" onclick={() => game.togglePause()} disabled={game.state.status !== 'playing'}>
        {game.paused ? 'Resume' : 'Pause'}
      </button>
      <button type="button" class="primary" onclick={() => game.newGame()}>New Game</button>
    </div>
  </div>

  {#if showHelp}
    <HelpModal onClose={() => (showHelp = false)} />
  {/if}
</main>

<style>
  main {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }
  h1 {
    font-size: clamp(28px, 7vw, 40px);
    margin: 0;
    font-weight: 800;
    color: var(--text);
    line-height: 1;
    letter-spacing: 0.02em;
  }
  .scores {
    display: flex;
    gap: 6px;
    align-items: stretch;
  }
  .score-box {
    background: var(--panel-bg);
    color: var(--text);
    padding: 4px 8px;
    border-radius: 6px;
    text-align: center;
    min-width: 56px;
  }
  @media (min-width: 460px) {
    .score-box { padding: 6px 12px; min-width: 70px; }
  }
  .help-btn {
    align-self: stretch;
    background: var(--panel-bg);
    color: var(--text);
    border: none;
    border-radius: 6px;
    width: 32px;
    font-size: 18px;
    font-weight: 700;
    padding: 0;
  }
  @media (min-width: 460px) {
    .help-btn { width: 36px; font-size: 20px; }
  }
  .help-btn:hover {
    filter: brightness(1.1);
  }
  .help-btn:focus-visible {
    outline: 3px solid var(--accent);
    outline-offset: 2px;
  }
  .label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-dim);
    font-weight: 700;
  }
  .value {
    font-size: 20px;
    font-weight: 700;
    line-height: 1.2;
  }

  .layout {
    display: flex;
    gap: 8px;
    justify-content: center;
    align-items: stretch;
  }
  .side {
    flex: 0 0 60px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
  }
  @media (min-width: 460px) {
    .layout { gap: 10px; }
    .side { flex-basis: 96px; }
  }
  .next-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .stats {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .stat {
    background: var(--panel-bg);
    border-radius: 8px;
    padding: 6px 8px;
  }
  @media (min-width: 460px) {
    .stat { padding: 8px 10px; }
  }
  .stat-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-dim);
    font-weight: 700;
  }
  .stat-value {
    font-size: 20px;
    font-weight: 700;
  }

  .board-wrap {
    position: relative;
    /* Take whatever horizontal room is left after the side panels, but cap
       the board width at half the available vertical room (chrome ~170px),
       so it never grows so tall it pushes the controls off the screen. */
    flex: 1 1 0;
    min-width: 0;
    max-width: min(380px, calc((100svh - 170px) / 2));
    aspect-ratio: 1 / 2;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
    -webkit-tap-highlight-color: transparent;
  }

  .controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }
  .hint {
    color: var(--text-dim);
    font-size: 13px;
    margin: 0;
  }
  .buttons {
    display: flex;
    gap: 8px;
  }
  .buttons button {
    background: var(--panel-bg);
    color: var(--text);
    border: none;
    padding: 8px 14px;
    border-radius: 6px;
    font-weight: 600;
  }
  .buttons button.primary {
    background: var(--accent);
    color: #1a1611;
  }
  .buttons button:hover:not(:disabled) {
    filter: brightness(1.08);
  }
  .buttons button:focus-visible {
    outline: 3px solid var(--accent);
    outline-offset: 2px;
  }
  .buttons button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
</style>
