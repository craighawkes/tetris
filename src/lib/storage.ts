const BEST_SCORE_KEY = 'tetris.bestScore';

export function loadBestScore(): number {
  try {
    const raw = localStorage.getItem(BEST_SCORE_KEY);
    if (!raw) return 0;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function saveBestScore(value: number): void {
  try {
    localStorage.setItem(BEST_SCORE_KEY, String(value));
  } catch {
    // ignore quota / privacy errors
  }
}
