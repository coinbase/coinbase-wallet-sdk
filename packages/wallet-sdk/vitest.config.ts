import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    alias: {
      ':core': path.resolve(__dirname, 'src/core'),
      ':util': path.resolve(__dirname, 'src/util'),
    },
    environment: 'jsdom',
    globals: true,
  },
});
