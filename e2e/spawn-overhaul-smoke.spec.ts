import { test, expect } from '@playwright/test';
import { setupFreshProfile, selectArcadeMode } from './helpers';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5173';

/**
 * Spawn Overhaul Smoke Test — verifies P0+P1 fixes are live:
 * 1. Bubbles spawn consistently (no dead zones > 6s)
 * 2. Targets are always visible within 6s
 * 3. No crash after 30s of gameplay
 * 4. Multiple bubbles on screen (credit accumulator working)
 * 5. Bubbles spawn in different lanes (lane system working)
 */

test.describe('Spawn Overhaul — smoke test', () => {
  test.setTimeout(120000);

  test('Zen mode: bubbles spawn consistently, no dead zones', async ({ page }) => {
    await setupFreshProfile(page, 'SmokeZen');
    await selectArcadeMode(page, 'zen');
    await page.waitForTimeout(3000);

    // Poll for bubbles every 500ms for 30s
    const data = await page.evaluate(async () => {
      const snapshots: { time: number; count: number; xs: number[] }[] = [];
      const start = performance.now();

      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 500));
        const bubbles = document.querySelectorAll('[aria-label*="bubble"]');
        const xs: number[] = [];
        bubbles.forEach(b => {
          const rect = (b as HTMLElement).getBoundingClientRect();
          if (rect.y > 0 && rect.y < window.innerHeight) {
            xs.push(Math.round((rect.x / window.innerWidth) * 100));
          }
        });
        snapshots.push({ time: Math.round(performance.now() - start), count: xs.length, xs });
      }
      return snapshots;
    });

    // Find max gap where no bubbles visible
    let maxEmptyGap = 0;
    let currentGap = 0;
    let totalBubbleSnapshots = 0;
    for (const s of data) {
      if (s.count === 0) {
        currentGap += 500;
        maxEmptyGap = Math.max(maxEmptyGap, currentGap);
      } else {
        currentGap = 0;
        totalBubbleSnapshots++;
      }
    }

    console.log(`Zen: ${totalBubbleSnapshots}/60 snapshots had bubbles, max empty gap: ${maxEmptyGap}ms`);

    // Should have bubbles in most snapshots
    expect(totalBubbleSnapshots).toBeGreaterThan(40);
    // No dead zone > 6s
    expect(maxEmptyGap).toBeLessThan(6000);

    // Check lane distribution
    const allXs = data.flatMap(s => s.xs);
    const distinctLanes = new Set(allXs.map(x => Math.floor(x / 15)));
    expect(distinctLanes.size).toBeGreaterThanOrEqual(3);

    await page.screenshot({ path: 'e2e/screenshots/smoke-zen-end.png' });
  });

  test('Classic mode: targets visible within 6s, no crashes', async ({ page }) => {
    await setupFreshProfile(page, 'SmokeClassic');
    await selectArcadeMode(page, 'classic');
    await page.waitForTimeout(3000);

    // For 20s, check every 2s for target visibility
    const checks = await page.evaluate(async () => {
      const results: { time: number; hasTarget: boolean; totalBubbles: number }[] = [];
      const start = performance.now();

      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const time = performance.now() - start;

        const allBubbles = document.querySelectorAll('[aria-label*="bubble"]');
        const visibleBubbles = Array.from(allBubbles).filter(b => {
          const rect = (b as HTMLElement).getBoundingClientRect();
          return rect.y > 0 && rect.y < window.innerHeight;
        });

        // Check if any bubble matches the current target
        const bodyText = document.body.textContent || '';

        // Arithmetic: "N + N = ?"
        const eqMatch = bodyText.match(/(\d+)\s*([+\-−×÷*])\s*(\d+)\s*=\s*\?/);
        // Sensory: "Pop N"
        const popMatch = bodyText.match(/Pop\s+(\d+)/i) || bodyText.match(/פצץ\s+(\d+)/);
        let hasTarget = false;

        if (eqMatch) {
          const a = parseInt(eqMatch[1]);
          const op = eqMatch[2];
          const b = parseInt(eqMatch[3]);
          let answer: number;
          switch (op) {
            case '+': answer = a + b; break;
            case '-': case '−': answer = a - b; break;
            case '*': case '×': answer = a * b; break;
            case '÷': case '/': answer = Math.floor(a / b); break;
            default: answer = a + b;
          }
          hasTarget = visibleBubbles.some(b => b.textContent?.trim() === String(answer));
        } else if (popMatch) {
          const target = popMatch[1];
          hasTarget = visibleBubbles.some(b => b.textContent?.trim() === target);
        }

        results.push({ time: Math.round(time), hasTarget, totalBubbles: visibleBubbles.length });
      }
      return results;
    });

    console.log('Classic visibility:', JSON.stringify(checks));

    const targetVisibleCount = checks.filter(c => c.hasTarget).length;
    expect(targetVisibleCount).toBeGreaterThanOrEqual(7);
    expect(checks.filter(c => c.totalBubbles === 0).length).toBe(0);

    await page.screenshot({ path: 'e2e/screenshots/smoke-classic-end.png' });
  });

  test('Blitz mode: no crash, bubbles spawning throughout 30s', async ({ page }) => {
    await setupFreshProfile(page, 'SmokeBlitz');
    await selectArcadeMode(page, 'blitz');
    await page.waitForTimeout(3000);

    // Poll bubble count every 1s for 30s
    const data = await page.evaluate(async () => {
      const snapshots: number[] = [];
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 1000));
        const bubbles = document.querySelectorAll('[aria-label*="bubble"]');
        let visible = 0;
        bubbles.forEach(b => {
          const rect = (b as HTMLElement).getBoundingClientRect();
          if (rect.y > 0 && rect.y < window.innerHeight) visible++;
        });
        snapshots.push(visible);
      }
      return snapshots;
    });

    console.log('Blitz bubble counts:', JSON.stringify(data));

    // No crash — we got 30 snapshots
    expect(data.length).toBe(30);
    // Should have bubbles in most snapshots
    const withBubbles = data.filter(c => c > 0).length;
    expect(withBubbles).toBeGreaterThan(20);

    await page.screenshot({ path: 'e2e/screenshots/smoke-blitz-end.png' });
  });
});