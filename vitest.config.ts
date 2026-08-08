import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    // Exclude git worktrees (duplicate copies of the same tests) and e2e specs.
    // Without this, vitest picks up ~4x the test files and the suite times out.
    exclude: [
      'e2e/**',
      'node_modules/**',
      'test-results/**',
      '.worktrees/**',
      '**/e2e/**',
    ],
    // Cap workers to avoid memory exhaustion on the 8GB Pi.
    maxWorkers: 2,
    // Guard against individual tests hanging indefinitely.
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
