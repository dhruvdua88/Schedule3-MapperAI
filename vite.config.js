import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  // Set base to subpath for GitHub Pages, root for Vercel/Netlify.
  // Repo published as Schedule3-MapperAI → Pages serves under that path.
  base: process.env.GITHUB_PAGES === 'true' ? '/Schedule3-MapperAI/' : '/',

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
