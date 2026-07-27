import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    maxWorkers: 3,
    pool: 'threads',
    testTimeout: 10_000,
  },
});
