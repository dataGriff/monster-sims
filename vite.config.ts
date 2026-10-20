import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/sim/index.ts',
      formats: ['es'],
      fileName: 'monster-manor',
    },
  },
  test: {
    include: ['tests/**/*.spec.ts'],
  },
});
