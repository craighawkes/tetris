<script lang="ts">
  import { fade, scale } from 'svelte/transition';
  import { backOut } from 'svelte/easing';

  interface Props {
    onClose: () => void;
  }
  let { onClose }: Props = $props();

  function onBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }
</script>

<div
  class="backdrop"
  role="presentation"
  onclick={onBackdropClick}
  transition:fade={{ duration: 150 }}
>
  <div
    class="modal"
    role="dialog"
    aria-modal="true"
    aria-labelledby="help-title"
    transition:scale={{ duration: 200, start: 0.92, easing: backOut }}
  >
    <header>
      <h2 id="help-title">How to play</h2>
      <button type="button" class="close" aria-label="Close help" onclick={onClose}>×</button>
    </header>
    <div class="body">
      <h3>Goal</h3>
      <p>Clear lines by filling rows with falling tetrominoes. Score more by clearing multiple lines at once.</p>

      <h3>Keyboard</h3>
      <ul>
        <li><strong>← →</strong> move left / right</li>
        <li><strong>↓</strong> soft drop (+1 / cell)</li>
        <li><strong>Space</strong> hard drop (+2 / cell)</li>
        <li><strong>↑</strong> or <strong>X</strong> rotate clockwise</li>
        <li><strong>Z</strong> rotate counter-clockwise</li>
        <li><strong>C</strong> or <strong>Shift</strong> hold piece</li>
        <li><strong>P</strong> pause / resume</li>
      </ul>

      <h3>Touch</h3>
      <ul>
        <li>Swipe left / right to move</li>
        <li>Swipe down to soft drop, fast flick down to hard drop</li>
        <li>Tap to rotate</li>
      </ul>

      <h3>Scoring</h3>
      <ul>
        <li>1 line: 40 × (level + 1)</li>
        <li>2 lines: 100 × (level + 1)</li>
        <li>3 lines: 300 × (level + 1)</li>
        <li>4 lines (tetris): 1200 × (level + 1)</li>
        <li>Levels rise every 10 lines, and the pieces fall faster.</li>
      </ul>
    </div>
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 16px;
  }
  .modal {
    background: var(--panel-bg);
    color: var(--text);
    border-radius: 10px;
    max-width: 460px;
    width: 100%;
    max-height: calc(100vh - 32px);
    display: flex;
    flex-direction: column;
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }
  h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
  }
  .close {
    background: transparent;
    border: none;
    font-size: 28px;
    color: var(--text);
    width: 32px;
    height: 32px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    padding: 0;
  }
  .close:hover {
    background: rgba(255, 255, 255, 0.08);
  }
  .close:focus-visible {
    outline: 3px solid var(--accent);
    outline-offset: 2px;
  }
  .body {
    padding: 14px 20px 20px;
    overflow-y: auto;
    font-size: 14.5px;
    line-height: 1.5;
  }
  h3 {
    margin: 14px 0 6px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-dim);
    font-weight: 700;
  }
  h3:first-child { margin-top: 0; }
  p { margin: 0; }
  ul {
    margin: 0;
    padding-left: 18px;
  }
  li {
    margin-bottom: 4px;
  }
  li:last-child { margin-bottom: 0; }
</style>
