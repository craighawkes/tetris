import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves project sites under /<repo>/ — apply that base only for production builds
// so `npm run dev` keeps working at http://localhost:5173/.
export default defineConfig(({ command }) => {
  const isProd = command === 'build'
  const base = isProd ? '/tetris/' : '/'
  return {
    base,
    plugins: [
      svelte(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icons/icon.svg', 'icons/apple-touch-icon.png'],
        manifest: {
          name: 'Tetris',
          short_name: 'Tetris',
          description: 'Stack falling tetrominoes and clear lines.',
          theme_color: '#0f1226',
          background_color: '#0f1226',
          display: 'standalone',
          orientation: 'portrait',
          scope: base,
          start_url: base,
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest}'],
        },
      }),
    ],
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
  }
})
