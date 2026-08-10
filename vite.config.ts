import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/** GitHub Pages project site: https://darmorey.github.io/wedding-organizer/ */
const GITHUB_PAGES_BASE = '/wedding-organizer/'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? GITHUB_PAGES_BASE : '/',
  plugins: [react(), tailwindcss()],
}))
