import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// ============================================================
// OSPITELY — Configurazione Vite
// base: '/' perché il progetto usa un dominio personalizzato
// (ospitely.com) su GitHub Pages, non il classico
// username.github.io/nome-repo — se in futuro si pubblica senza
// dominio custom, questo valore va cambiato in '/nome-repo/'
// ============================================================
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
  },
});
