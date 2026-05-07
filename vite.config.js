import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  // Set base to subpath for GitHub Pages, root for Vercel/Netlify
  base: process.env.GITHUB_PAGES === 'true' ? '/sch3-reviewer/' : '/',

  build: {
    outDir: 'dist',
    sourcemap: false
  },

  // pdfjs-dist ships pre-built ESM; exclude from Vite pre-bundling
  // to avoid "Cannot use import statement" errors in the worker thread
  optimizeDeps: {
    exclude: ['pdfjs-dist']
  },

  worker: {
    format: 'es'
  }
});
