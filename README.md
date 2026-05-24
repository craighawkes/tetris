# Tetris

A small Tetris PWA built with Svelte 5 + TypeScript + Vite. Mirrors the stack used by the sibling `2048` project.

## Develop

```sh
npm install
npm run dev
```

Then open <http://localhost:5173>.

## Test

```sh
npm test
```

## Build

```sh
npm run build
```

Output goes to `dist/`. The Vite config sets `base: '/tetris/'` for production builds so the app works when served from `https://<user>.github.io/tetris/`. Locally `base` stays `/`.

## Deploy

`.github/workflows/deploy.yml` deploys `dist/` to GitHub Pages on every push to `main`. Enable Pages → Source = "GitHub Actions" in the repo settings.

## Controls

- Arrow keys to move/soft-drop, Z/X (or ↑) to rotate, Space to hard drop, C/Shift to hold, P to pause.
- Touch: swipe horizontally to move, swipe down to soft-drop, fast flick down to hard-drop, tap to rotate.
