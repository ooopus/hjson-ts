import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/hjson.ts',
      formats: ['es', 'cjs', 'umd', 'iife'],
      name: 'Hjson',
      fileName: (format) => `hjson.${format}.js`
    },
    rollupOptions: {
      output: {
        exports: 'named'
      }
    }
  },
  plugins: [
    nodePolyfills({
      include: ['os']
    }),
    dts({
      outDir: 'dist/types',
      include: ['src']
    })
  ]
});