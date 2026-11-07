import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const aqui = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: aqui,
  plugins: [react()],
  resolve: { alias: { '@shared': fileURLToPath(new URL('../shared', import.meta.url)) } },
  server: { port: 3000, proxy: { '/api': 'http://localhost:3001' } },
  build: { outDir: fileURLToPath(new URL('../dist/app', import.meta.url)), emptyOutDir: true, chunkSizeWarningLimit: 900 },
});
