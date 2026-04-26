import { test, expect } from '@playwright/test';
import path from 'node:path';

const SCREENSHOT_DIR = path.resolve(
  process.cwd(),
  'load-tests/results/issue-2-journey/screenshots',
);

test.describe('Fase 0 — Issue #2 — CT06 click-by-click', () => {
  test('CT06 — fluxo + keyboard fallback (?debug=1, fake camera)', async ({ browser }) => {
    const context = await browser.newContext({ permissions: ['camera'] });
    const page = await context.newPage();

    await page.goto('/?debug=1');

    // Welcome
    const welcomeH1 = page.locator('#screen-welcome h1');
    await expect(welcomeH1).toBeVisible();
    await expect(welcomeH1).toHaveText(/Olá/);
    const cta = page.getByRole('button', { name: 'Ligar câmera' });
    await expect(cta).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-welcome.png') });

    // Click "Ligar câmera"
    await cta.click();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-after-click-cta.png') });

    // Toggle debug panel deve estar acessível assim que entrar no video stage
    // (z-index 100, position fixed) — esperar até 10s
    const toggle = page.locator('#debug-toggle');
    await expect(toggle).toBeVisible({ timeout: 15_000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-after-loading.png') });

    // Toggle debug panel
    await toggle.click({ force: true });
    const panel = page.locator('#debug-panel');
    await expect(panel).not.toHaveClass(/hidden/);
    await expect(panel).toContainText('FPS');
    await expect(panel).toContainText('Conf.');
    await expect(panel).toContainText('Lane');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-debug-panel.png') });

    // CT04: keyboard fallback deve disparar eventos com prefixo [KBD]
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('KeyJ');
    // Cadência on
    await page.keyboard.press('KeyR');
    await page.waitForTimeout(800);

    const log = page.locator('#debug-panel .log');
    await expect(log).toContainText('[KBD]');
    await expect(log).toContainText('jump');
    await expect(log).toContainText('lane=-1');
    await expect(log).toContainText('duck');
    await expect(log).toContainText('lane=1');
    await expect(log).toContainText('jumping_jack');
    await expect(log).toContainText('cadence=');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-keyboard-fired.png') });

    // Cadência off
    await page.keyboard.press('KeyR');

    await context.close();
  });

  test('CT02 — câmera negada exibe Error screen com mensagem PT-BR', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Stub getUserMedia para sempre rejeitar com NotAllowedError, simulando
    // o usuário negando a permissão no prompt do navegador.
    await page.addInitScript(() => {
      const denied = new DOMException('Permission denied', 'NotAllowedError');
      Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
        configurable: true,
        value: () => Promise.reject(denied),
      });
    });

    await page.goto('/');
    await expect(page.locator('#screen-welcome h1')).toBeVisible();
    await page.getByRole('button', { name: 'Ligar câmera' }).click();

    const errorScreen = page.locator('#screen-error');
    await expect(errorScreen).toBeVisible({ timeout: 10_000 });
    await expect(errorScreen).toContainText(/permitir a câmera/i);
    await expect(page.getByRole('button', { name: 'Tentar de novo' })).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07-camera-denied.png') });

    await context.close();
  });
});
