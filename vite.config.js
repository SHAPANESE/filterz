import { defineConfig } from 'vite'

export default defineConfig({
  // For GitHub Pages project sites the app is served from /<repo>/.
  // The deploy workflow sets VITE_BASE; local dev/build defaults to '/'.
  base: process.env.VITE_BASE || '/',
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
})
