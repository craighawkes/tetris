import {
  createInitialState,
  gravityIntervalMs,
  hardDrop,
  holdPiece,
  moveHorizontal,
  rotate,
  softDrop,
  tick,
  type GameState,
} from './engine';
import { loadBestScore, saveBestScore } from './storage';

class Game {
  state: GameState = $state(createInitialState());
  bestScore: number = $state(loadBestScore());
  paused: boolean = $state(false);

  #timer: ReturnType<typeof setTimeout> | null = null;
  #lastLevel = 0;

  constructor() {
    this.#scheduleTick();
  }

  // ----- actions -----

  left() {
    if (!this.#active()) return;
    this.state = moveHorizontal(this.state, -1);
  }

  right() {
    if (!this.#active()) return;
    this.state = moveHorizontal(this.state, 1);
  }

  rotateCW() {
    if (!this.#active()) return;
    this.state = rotate(this.state, 1);
  }

  rotateCCW() {
    if (!this.#active()) return;
    this.state = rotate(this.state, -1);
  }

  softDrop() {
    if (!this.#active()) return;
    this.state = softDrop(this.state);
    this.#updateBest();
  }

  hardDrop() {
    if (!this.#active()) return;
    const result = hardDrop(this.state);
    this.state = result.state;
    this.#afterTick();
  }

  hold() {
    if (!this.#active()) return;
    this.state = holdPiece(this.state);
  }

  togglePause() {
    if (this.state.status !== 'playing') return;
    this.paused = !this.paused;
    if (!this.paused) this.#scheduleTick();
    else this.#clearTimer();
  }

  newGame() {
    this.#clearTimer();
    this.state = createInitialState();
    this.paused = false;
    this.#lastLevel = 0;
    this.#scheduleTick();
  }

  // ----- internals -----

  #active(): boolean {
    return this.state.status === 'playing' && !this.paused && this.state.active !== null;
  }

  #scheduleTick() {
    this.#clearTimer();
    if (this.state.status !== 'playing' || this.paused) return;
    this.#timer = setTimeout(() => {
      const result = tick(this.state);
      this.state = result.state;
      this.#afterTick();
    }, gravityIntervalMs(this.state.level));
  }

  #afterTick() {
    this.#updateBest();
    if (this.state.level !== this.#lastLevel) this.#lastLevel = this.state.level;
    this.#scheduleTick();
  }

  #updateBest() {
    if (this.state.score > this.bestScore) {
      this.bestScore = this.state.score;
      saveBestScore(this.bestScore);
    }
  }

  #clearTimer() {
    if (this.#timer) {
      clearTimeout(this.#timer);
      this.#timer = null;
    }
  }
}

export const game = new Game();
