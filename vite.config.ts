import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

/**
 * `base` matters for GitHub Pages project sites, which serve from
 * https://<user>.github.io/<repo>/ rather than a domain root. Every asset URL,
 * every prerendered link and the router's path matching derive from it, so it
 * is set once here and read everywhere through import.meta.env.BASE_URL.
 *
 *   VITE_BASE=/Awning/   # GitHub Pages project site
 *   VITE_BASE=/          # own domain (default)
 */
export default defineConfig({
  base: process.env['VITE_BASE'] ?? '/',
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    restoreMocks: true,
  },
})
