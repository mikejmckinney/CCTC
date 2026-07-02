import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Relative base for local/file preview; GitHub Pages sets VITE_BASE_PATH=/CCTC/ in CI.
  base: process.env.VITE_BASE_PATH ?? './',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts'
  }
});