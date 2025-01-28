import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    alias: {
      ':core': path.resolve(__dirname, 'src/core'),
      ':util': path.resolve(__dirname, 'src/util'),
      ':features': path.resolve(__dirname, 'src/features'),
      ':sign': path.resolve(__dirname, 'src/sign'),
    },
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.mjs'],
  },
});
