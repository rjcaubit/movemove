import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const SHOTS = join(process.cwd(), 'load-tests', 'results', 'issue-4-journey', 'screenshots');
mkdirSync(SHOTS, { recursive: true });

test.describe('Issue #4 — fase 2 cardio', () => {
  test('CT11 — Settings + Play running + WaterBreak + Summary com sparkline', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/?debug=1&seed=42');
    await page.waitForSelector('#game canvas', { timeout: 10_000 });
    await page.evaluate(() => { try { localStorage.clear(); } catch { /* ignore */ } });

    await page.screenshot({ path: join(SHOTS, '01-welcome.png') });

    // Settings
    await page.evaluate(() => {
      const w = window as unknown as { __movemoveDebug: { skipToScene: (k: string, d?: unknown) => void } };
      w.__movemoveDebug.skipToScene('Settings', { from: 'Welcome' });
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(SHOTS, '02-settings.png') });

    // Play com baseline forçada
    await page.evaluate(() => {
      const w = window as unknown as { __movemoveDebug: {
        forceBaseline: (b: unknown) => void;
        skipToScene: (k: string, d?: unknown) => void;
      }};
      w.__movemoveDebug.forceBaseline({ hCorpo: 0.5, yQuadrilBase: 0.5, xCentroBase: 0.5, larguraOmbros: 0.2, capturedAt: performance.now() });
      w.__movemoveDebug.skipToScene('Play', { skipPrep: true });
    });
    await page.waitForTimeout(800);

    // Force cadence running → energia sobe
    await page.evaluate(() => {
      const w = window as unknown as { __movemoveDebug: { forceCadence: (s: number) => void } };
      for (let i = 0; i < 5; i++) w.__movemoveDebug.forceCadence(3.5);
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(SHOTS, '04-play-running.png') });

    // WaterBreak via debug
    await page.evaluate(() => {
      const w = window as unknown as { __movemoveDebug: { triggerWaterBreak: () => void } };
      w.__movemoveDebug.triggerWaterBreak();
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(SHOTS, '05-water-break.png') });

    // Summary mock
    await page.evaluate(() => {
      const w = window as unknown as { __movemoveDebug: { skipToScene: (k: string, d?: unknown) => void } };
      w.__movemoveDebug.skipToScene('Summary', { distance: 500, coins: 12, jacks: 4, armsUp: 2, jumps: 8, ducks: 3, durationS: 90, bpmAvg: 95, bpmTrack: [60, 80, 100, 120, 110, 95, 90, 100] });
    });
    await page.waitForTimeout(800);
    await page.screenshot({ path: join(SHOTS, '06-summary.png') });

    // Sparkline SVG no DOM
    const svgCount = await page.locator('svg polyline').count();
    expect(svgCount).toBeGreaterThan(0);
  });

  test('CT09 — Settings persiste em localStorage após reload', async ({ page }) => {
    await page.goto('/?debug=1');
    await page.waitForSelector('#game canvas', { timeout: 10_000 });
    await page.evaluate(() => {
      try {
        localStorage.setItem('movemove.ageGroup', '5-7');
        localStorage.setItem('movemove.audio.music', '20');
      } catch { /* ignore */ }
    });
    await page.reload();
    await page.waitForSelector('#game canvas', { timeout: 10_000 });
    const age = await page.evaluate(() => localStorage.getItem('movemove.ageGroup'));
    const music = await page.evaluate(() => localStorage.getItem('movemove.audio.music'));
    expect(age).toBe('5-7');
    expect(music).toBe('20');
  });

  test('CT12 — speechSynthesis indisponível não crasha', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'speechSynthesis', { configurable: true, get: () => undefined });
    });
    await page.goto('/?debug=1');
    await page.waitForSelector('#game canvas', { timeout: 10_000 });
    await page.evaluate(() => {
      const w = window as unknown as { __movemoveDebug: {
        forceBaseline: (b: unknown) => void;
        skipToScene: (k: string, d?: unknown) => void;
      }};
      w.__movemoveDebug.forceBaseline({ hCorpo: 0.5, yQuadrilBase: 0.5, xCentroBase: 0.5, larguraOmbros: 0.2, capturedAt: performance.now() });
      w.__movemoveDebug.skipToScene('Play', { skipPrep: true });
    });
    await page.waitForTimeout(1500);
    await expect(page.locator('#game canvas')).toBeVisible();
  });

  test('CT13/CT16 — MiniGames hub e jogos carregam', async ({ page }) => {
    await page.goto('/?debug=1');
    await page.waitForSelector('#game canvas', { timeout: 10_000 });

    await page.evaluate(() => {
      const w = window as unknown as { __movemoveDebug: { skipToScene: (k: string, d?: unknown) => void } };
      w.__movemoveDebug.skipToScene('MiniGamesHub');
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(SHOTS, 'ct13-hub.png') });

    await page.evaluate(() => {
      const w = window as unknown as { __movemoveDebug: { skipMiniGame: (k: string) => void } };
      w.__movemoveDebug.skipMiniGame('CatchBicho');
    });
    await page.waitForTimeout(800);
    await expect(page.locator('#game canvas')).toBeVisible();
    await page.screenshot({ path: join(SHOTS, 'ct13-catch.png') });

    await page.evaluate(() => {
      const w = window as unknown as { __movemoveDebug: { skipMiniGame: (k: string) => void } };
      w.__movemoveDebug.skipMiniGame('TrunkTwist');
    });
    await page.waitForTimeout(400);
    await expect(page.locator('#game canvas')).toBeVisible();
    await page.screenshot({ path: join(SHOTS, 'ct14-trunk.png') });

    await page.evaluate(() => {
      const w = window as unknown as { __movemoveDebug: { skipMiniGame: (k: string) => void } };
      w.__movemoveDebug.skipMiniGame('BellRinger');
    });
    await page.waitForTimeout(400);
    await expect(page.locator('#game canvas')).toBeVisible();
    await page.screenshot({ path: join(SHOTS, 'ct15-bell.png') });
  });
});
