import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base is set relative so the build works on GitHub Pages project sites
// (https://user.github.io/recipe-planner/) and on Vercel/Netlify root alike.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
