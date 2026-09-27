import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

// Capacitor, uygulamayı yerel dosya sisteminden yüklediği için göreli (./) yol şarttır.
export default defineConfig({
  base: './',
  plugins: [preact()],
  build: {
    target: ['es2020', 'safari15'],
    outDir: 'dist',
    assetsInlineLimit: 4096,
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
  },
  server: {
    port: 5173,
  },
});
