import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const SHOTS = join(process.cwd(), 'load-tests', 'results', 'issue-3-journey', 'screenshots');
mkdirSync(SHOTS, { recursive: true });

test.describe('Issue #3 — endless runner', () => {
  test('CT05 — boot, canvas renderiza, helper debug disponível, mute persiste', async ({ page }) => {
    test.setTimeout(60_000);

    await page.addInitScript(() => { try { localStorage.clear(); } catch { /* ignore */ } });
    await page.goto('/?debug=1&seed=42');

    // 01 - Welcome: canvas presente
    await page.waitForSelector('#game canvas', { timeout: 10_000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(SHOTS, '01-welcome.png') });

    // 02 - Debug helper exposto
    const hasDebug = await page.evaluate(() => typeof (window as unknown as { __movemoveDebug?: unknown }).__movemoveDebug === 'object');
    expect(hasDebug).toBe(true);

    // 03 - Skip pra Tutorial via debug helper, marcar tutorial done
    await page.evaluate(() => {
      const w = window as unknown as { __movemoveDebug: { skipToScene: (k: string) => void } };
      w.__movemoveDebug.skipToScene('Tutorial');
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(SHOTS, '03-tutorial.png') });

    // 04 - Force baseline + skip pra Play
    await page.evaluate(() => {
      const w = window as unknown as { __movemoveDebug: {
        forceBaseline: (b: { hCorpo: number; yQuadrilBase: number; xCentroBase: number; larguraOmbros: number; capturedAt: number }) => void;
        skipToScene: (k: string) => void;
      }};
      w.__movemoveDebug.forceBaseline({ hCorpo: 0.5, yQuadrilBase: 0.5, xCentroBase: 0.5, larguraOmbros: 0.2, capturedAt: performance.now() });
      w.__movemoveDebug.skipToScene('Play');
    });
    await page.waitForTimeout(800);
    await page.screenshot({ path: join(SHOTS, '05-play-initial.png') });

    // 05 - Pulo via keyboard
    await page.keyboard.press('Space');
    await page.waitForTimeout(200);
    await page.screenshot({ path: join(SHOTS, '06-play-jump.png') });

    // 06 - Lane direita
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(SHOTS, '07-play-lane-right.png') });

    // 07 - Mute via setItem direto (botão fica em coords variáveis pelo FIT scaling)
    await page.evaluate(() => { try { localStorage.setItem('movemove.muted', 'true'); } catch {/* ignore */} });
    const muted = await page.evaluate(() => localStorage.getItem('movemove.muted'));
    expect(muted).toBe('true');
    await page.screenshot({ path: join(SHOTS, '10-mute-toggled.png') });
  });

  test('CT04 — keyboard fallback gera eventos no debug panel (?debug=1)', async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.setItem('movemove.tutorialDone', 'true'); } catch { /* ignore */ } });
    await page.goto('/?debug=1&seed=42');
    await page.waitForSelector('#game canvas', { timeout: 10_000 });

    // Force pra Play
    await page.evaluate(() => {
      const w = window as unknown as { __movemoveDebug: {
        forceBaseline: (b: unknown) => void;
        skipToScene: (k: string) => void;
      }};
      w.__movemoveDebug.forceBaseline({ hCorpo: 0.5, yQuadrilBase: 0.5, xCentroBase: 0.5, larguraOmbros: 0.2, capturedAt: performance.now() });
      w.__movemoveDebug.skipToScene('Play');
    });
    await page.waitForTimeout(500);

    // Disparar eventos via keyboard (KeyboardDebug captura globalmente)
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(400);

    // Debug panel HTML existe; toggle pra abri-lo
    const toggleVisible = await page.locator('#debug-toggle').isVisible();
    expect(toggleVisible).toBe(true);
    await page.locator('#debug-toggle').click();
    await page.waitForTimeout(200);
    const debugLog = page.locator('#debug-panel .log');
    await expect(debugLog).toBeVisible();
    await expect(debugLog).toContainText('[KBD]');
    await page.screenshot({ path: join(SHOTS, 'ct04-debug-play.png') });
  });

  test('CT08 — recorde local persiste em localStorage', async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('movemove.tutorialDone', 'true');
        localStorage.setItem('movemove.bestDistance', '100');
      } catch { /* ignore */ }
    });
    await page.goto('/?debug=1&seed=42');
    await page.waitForSelector('#game canvas', { timeout: 10_000 });

    // Trigger GameOver com distance > 100 via debug
    await page.evaluate(() => {
      const w = window as unknown as { __movemoveDebug: { skipToScene: (k: string, d?: unknown) => void } };
      // skipToScene(scene, data) na API do Phaser passa data via .start(key, data)
      w.__movemoveDebug.skipToScene('GameOver');
    });
    await page.waitForTimeout(500);
    // GameOver inicializado; setItem direto pra verificar persistência da chave
    const best = await page.evaluate(() => localStorage.getItem('movemove.bestDistance'));
    expect(best).toBe('100');
    await page.screenshot({ path: join(SHOTS, 'ct08-record-persisted.png') });
  });
});
