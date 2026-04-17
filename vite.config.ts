import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/dfa_nfa_simulator/',
  plugins: [
    react(),
    tailwindcss(),
  ],
});
