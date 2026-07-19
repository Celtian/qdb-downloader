import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['projects/electron/electron/**/*.test.ts', 'projects/electron/shared/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'cobertura'],
      reportsDirectory: 'coverage/electron-main',
    },
  },
});
