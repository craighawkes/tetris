<script lang="ts">
  import { fade } from 'svelte/transition';

  interface Props {
    status: 'lost' | 'paused';
    score: number;
    onAction: () => void;
  }
  let { status, score, onAction }: Props = $props();
</script>

<div class="overlay" class:lost={status === 'lost'} class:paused={status === 'paused'} transition:fade={{ duration: 180 }}>
  <div class="card">
    <div class="title">{status === 'lost' ? 'Game over' : 'Paused'}</div>
    <div class="subtitle">Score {score}</div>
    <button type="button" onclick={onAction}>
      {status === 'lost' ? 'Play again' : 'Resume'}
    </button>
  </div>
</div>

<style>
  .overlay {
    position: absolute;
    inset: 0;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(3px);
  }
  .overlay.lost {
    background: rgba(15, 18, 38, 0.78);
  }
  .overlay.paused {
    background: rgba(15, 18, 38, 0.55);
  }
  .card {
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    color: var(--text);
  }
  .title {
    font-size: 44px;
    font-weight: 800;
    letter-spacing: 0.02em;
  }
  .subtitle {
    font-size: 15px;
    color: var(--text-dim);
  }
  button {
    background: var(--accent);
    color: #1a1611;
    border: none;
    padding: 10px 22px;
    border-radius: 6px;
    font-weight: 700;
    font-size: 15px;
  }
  button:hover {
    filter: brightness(1.05);
  }
  button:focus-visible {
    outline: 3px solid var(--accent);
    outline-offset: 3px;
  }
</style>
