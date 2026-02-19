import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
    mockReset: true,
    testTimeout: 10_000,
    hookTimeout: 15_000,
    pool: 'forks',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/__tests__/**', 'src/types/**'],
    },
    // ESM project — no CJS transforms needed
    alias: {},
  },
});
