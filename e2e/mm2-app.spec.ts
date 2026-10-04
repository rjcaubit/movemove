import { test, expect, type Page } from '@playwright/test';

// MoveMove 2.0 — fluxo do app (sem pose real: ?debug=1 libera teclas
// p = pular preparação, r = rep boa, s = rep rasa, n = próxima fase).

async function passPrepare(page: Page): Promise<void> {
  await expect(page.getByText(/Entre no contorno|Câmera baixa, de lado/)).toBeVisible();
  await page.locator('.overlay').evaluateAll((els) => els.forEach((e) => e.remove()));
  await page.keyboard.press('p');
  await page.locator('.s-count, .land-card').first().waitFor({ timeout: 15_000 });
}

test('treino ponta a ponta: montar → preparar → treinar → resumo → histórico', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app/?debug=1#/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByText('Monte um treino')).toBeVisible();
  await page.getByRole('button', { name: 'Montar treino' }).click();
  await page.getByRole('radio', { name: 'Pernas' }).click();
  await page.getByRole('radio', { name: '5 min', exact: true }).click();
  await expect(page.getByText(/exercícios · 40s cada · 5s de descanso/)).toBeVisible();
  await page.getByRole('button', { name: 'Gerar treino' }).click();
  await passPrepare(page);
  await expect(page.locator('.s-count .big')).toHaveText('0');
  await page.keyboard.press('r');
  await page.keyboard.press('s');
  await expect(page.locator('.s-count .big')).toHaveText('2');
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press('n');
    // Troca pra exercício no chão pede nova preparação.
    if (await page.getByText('Câmera baixa, de lado').isVisible()) await page.keyboard.press('p');
    if (page.url().includes('/resumo')) break;
    await page.waitForTimeout(150);
  }
  await expect(page.getByText('Treino concluído')).toBeVisible();
  await page.getByRole('button', { name: 'Voltar ao início' }).click();
  await page.getByRole('button', { name: 'Histórico' }).click();
  await expect(page.getByText('Pernas · Força')).toBeVisible();
  await expect(page.getByText('Salvo só neste aparelho')).toBeVisible();
});

test('desafio por link entre dois navegadores', async ({ browser }) => {
  const a = await (await browser.newContext({ ignoreHTTPSErrors: true })).newPage();
  await a.goto('/app/?debug=1#/desafios/novo');
  await a.getByRole('button', { name: 'Fazer minha marca' }).click();
  await passPrepare(a);
  await a.keyboard.press('s'); // rasa: não conta
  for (let i = 0; i < 20; i++) await a.keyboard.press('r');
  await expect(a.getByText('Sua marca', { exact: true })).toBeVisible();
  await a.getByPlaceholder(/Seu nome/).fill('Ana');
  await a.getByRole('button', { name: 'Copiar link' }).isEnabled();
  const waHref = await a.evaluate(async () => {
    let opened = '';
    window.open = ((u: string) => { opened = u; return null; }) as typeof window.open;
    [...document.querySelectorAll('button')].find((b) => b.textContent === 'Enviar no WhatsApp')!.click();
    return opened;
  });
  expect(waHref).toMatch(/^https:\/\/wa\.me\/\?text=/);
  const link = decodeURIComponent(waHref).match(/https?:\/\/\S+#\/desafio\/\S+/)![0];

  const b = await (await browser.newContext({ ignoreHTTPSErrors: true })).newPage();
  const url = new URL(link);
  await b.goto(`/app/?debug=1${url.hash}`);
  await expect(b.getByText('Ana te desafiou')).toBeVisible();
  await expect(b.getByText('20 repetições no menor tempo')).toBeVisible();
  await b.getByRole('button', { name: 'Aceitar desafio' }).click();
  await passPrepare(b);
  for (let i = 0; i < 20; i++) await b.keyboard.press('r');
  await expect(b.getByText(/Você venceu|Ana venceu|Empate/)).toBeVisible();
  await expect(b.getByRole('button', { name: 'Desafiar de volta' })).toBeVisible();
  await b.getByRole('button', { name: 'Ver desafios' }).click();
  await expect(b.getByText('Agachamento 20×')).toBeVisible();
});
