import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    alias: {
      ':core': path.resolve(__dirname, 'src/core'),
      ':stores': path.resolve(__dirname, 'src/stores'),
      ':sign': path.resolve(__dirname, 'src/sign'),
      ':util': path.resolve(__dirname, 'src/util'),
    },
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
});
