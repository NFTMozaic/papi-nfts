import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    testTimeout: 120_000,
    // Run tests sequentially to avoid state conflicts
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    // Ensure tests don't run in parallel
    maxConcurrency: 1,
    // Add isolation between tests
    isolate: true,
  },
}) 