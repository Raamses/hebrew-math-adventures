import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('playwright.config.ts', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    // Ensure test env vars are unset for default tests
    delete process.env.PW_TRACE;
    delete process.env.PW_WORKERS;
    delete process.env.E2E_BASE_URL;
    delete process.env.CI;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('defaults to trace=on-first-retry and workers=3 when env vars are unset', async () => {
    const config = (await import('../../playwright.config.ts')).default;
    expect(config.use?.trace).toBe('on-first-retry');
    expect(config.workers).toBe(3);
  });

  it('respects PW_TRACE=off and PW_WORKERS=1 when set', async () => {
    process.env.PW_TRACE = 'off';
    process.env.PW_WORKERS = '1';
    vi.resetModules();
    const config = (await import('../../playwright.config.ts')).default;
    expect(config.use?.trace).toBe('off');
    expect(config.workers).toBe(1);
  });

});
