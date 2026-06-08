import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Relative base for local/file preview; GitHub Pages sets VITE_BASE_PATH=/CCTE/ in CI.
  base: process.env.VITE_BASE_PATH ?? './',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts'
  }
});