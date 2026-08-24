import { defineConfig, devices } from '@playwright/test';

// Support both local dev server and deployed Firebase URL.
// Default: local dev server (vite dev on port 5173).
// Set E2E_BASE_URL=https://hebrew-math-adventures-2025.web.app to test deployed site.
const baseURL = process.env.E2E_BASE_URL || 'http://localhost:5173';
const isDeployed = !!process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  // retries: 1 enabled after the workers:3 validation completed and the
  // bubble-overflow flake was root-caused and fixed (8/8 green, geometry
  // verified flush at the boundary across 719 observations).
  // See vault/decisions/2026-08-bubble-spawn-x-overflow-clamp.md
  retries: 1,
  // Mac E2E hub: MacBookPro16,1 — 6 physical cores / 16GB, ~2.7GB swap already
  // in use. 3 workers ≈ 1.5-1.8GB Chromium RSS, leaves cores for vite + avoids
  // thermal throttle on the i7-9750H. Timing-sensitive spawn assertions
  // (rAF-driven spawnCredits, 4s target visibility, 6s drought net) skew under
  // CPU contention, so we deliberately stay below the 6-worker default.
  workers: 3,
  reporter: 'list',
  timeout: 180000,
  expect: {
    // Raise default expect timeout from 5s to 15s. Deployed Firebase site
    // has CDN cold-start, service-worker interception, and network latency
    // that make the Playwright default 5s assertion timeout too tight.
    // Specs that need longer can still pass explicit timeout values.
    timeout: 15000,
  },
  use: {
    baseURL,
    headless: true,
    viewport: { width: 390, height: 844 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    // Action timeout: 20s for clicks/fills on deployed site
    actionTimeout: 20000,
    // Navigation timeout: 45s for deployed Firebase cold loads
    navigationTimeout: 45000,
    launchOptions: {
      args: [
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-component-update',
        '--mute-audio',
        '--js-flags=--max-old-space-size=1024',
      ],
    },
  },
  // Auto-start vite dev server for local tests
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: true,
        timeout: 30000,
      },
  projects: [
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
});
