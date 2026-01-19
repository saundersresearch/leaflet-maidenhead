// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.js',
      name: 'LeafletMaidenhead',
      formats: ['umd'],
      fileName: () => 'leaflet-maidenhead.js'
    },
    rollupOptions: {
      external: ['leaflet'],
      output: {
        globals: {
          leaflet: 'L'
        }
      }
    },
    outDir: 'dist',
    emptyOutDir: true
  }
});
