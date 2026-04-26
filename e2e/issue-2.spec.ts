import { test, expect } from '@playwright/test';
import path from 'node:path';

const SCREENSHOT_DIR = path.resolve(
  process.cwd(),
  'load-tests/results/issue-2-journey/screenshots',
);

test.describe('Fase 0 — Issue #2 — CT06 click-by-click', () => {
  test('navegação completa com keyboard fallback', async ({ browser }) => {
    const context = await browser.newContext({
      permissions: ['camera'],
    });
    const page = await context.newPage();

    await page.goto('/?debug=1');

    // Welcome
    await expect(page.locator('#screen-welcome h1')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ligar câmera' })).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-welcome.png') });

    // Click "Ligar câmera"
    await page.getByRole('button', { name: 'Ligar câmera' }).click();

    // Loading visível em algum momento
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-after-click-cta.png') });

    // Aguardar transição: pode ir para calibration (camera fake), error, ou stay loading
    await page.waitForTimeout(8000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-after-loading.png') });

    // Toggle debug panel
    const toggle = page.locator('#debug-toggle');
    if (await toggle.isVisible()) {
      await toggle.click();
      await expect(page.locator('#debug-panel')).not.toHaveClass(/hidden/);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-debug-panel.png') });
    }

    // Keyboard fallback
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('KeyJ');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-keyboard-fired.png') });

    // Recalibrate (se visível)
    const recalibrate = page.locator('#recalibrate-btn');
    if (await recalibrate.isVisible()) {
      await recalibrate.click();
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-after-recalibrate.png') });
    }

    await context.close();
  });

  test('CT02 erro de câmera (negada)', async ({ browser }) => {
    // Sem permissão de camera
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('/');
    await expect(page.locator('#screen-welcome h1')).toBeVisible();
    await page.getByRole('button', { name: 'Ligar câmera' }).click();

    // Esperar Error screen aparecer (NotAllowedError)
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07-camera-denied.png') });

    await context.close();
  });
});
