import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages project sites serve from /<repo-name>/, not the domain
  // root — asset paths break without this.
  base: '/pearl-playground/',
  plugins: [react()],
})
