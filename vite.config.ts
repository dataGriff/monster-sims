import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    outDir: 'dist',
    target: 'es2022',
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        styleguide: resolve(import.meta.dirname, 'styleguide.html'),
      },
    },
  },
  test: {
    include: ['tests/**/*.spec.ts'],
  },
});
