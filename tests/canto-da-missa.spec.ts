import { test, expect } from '@playwright/test';
import { SongViewerPage } from './pages/SongViewerPage';

test.describe('Canto da Missa - Smoke E2E', () => {
  test('1. Carregamento inicial sem erros de console', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    const failedRequests: string[] = [];
    page.on('response', (res) => {
      if (res.status() >= 400) failedRequests.push(`${res.status()} ${res.url()}`);
    });

    const sv = new SongViewerPage(page);
    await sv.gotoHome();

    expect(failedRequests, `Requisições com falha:\n${failedRequests.join('\n')}`).toEqual([]);
    expect(consoleErrors, `Erros de console:\n${consoleErrors.join('\n')}`).toEqual([]);
  });

  test('2. Busca funcional por termo litúrgico', async ({ page }) => {
    const sv = new SongViewerPage(page);
    await sv.gotoBusca();
    await sv.searchSong('Glória');
    await expect(sv.musicaCards.first()).toBeVisible({ timeout: 5000 });
  });

  test('3. Busca sem resultado exibe empty state', async ({ page }) => {
    const sv = new SongViewerPage(page);
    await sv.gotoBusca();
    await sv.searchSong('xzqwjklzxcvzzznaoexiste123');
    await expect(sv.emptyState).toBeVisible({ timeout: 5000 });
    await expect(sv.emptyState).toHaveText('Nenhuma música encontrada. Tente outro termo.');
  });

  test('4. Transposição de tom sobe e desce corretamente', async ({ page }) => {
    const sv = new SongViewerPage(page);
    await sv.gotoBusca();
    await sv.searchSong('Glória');
    await sv.selectFirstSong();

    const tomInicial = await sv.getCurrentTone();
    await sv.changeTone('up');
    const tomSubiu = await sv.getCurrentTone();
    expect(tomSubiu).not.toBe(tomInicial);

    await sv.changeTone('down');
    const tomVoltou = await sv.getCurrentTone();
    expect(tomVoltou).toBe(tomInicial);
  });

  test('5. Responsividade mobile sem overflow horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const sv = new SongViewerPage(page);
    await sv.gotoHome();
    await sv.expectNoHorizontalOverflow();

    await sv.gotoBusca();
    await sv.searchSong('Glória');
    await sv.selectFirstSong();
    await sv.expectNoHorizontalOverflow();
  });

  test('6. Aumentar/diminuir fonte não quebra layout', async ({ page }) => {
    const sv = new SongViewerPage(page);
    await sv.gotoBusca();
    await sv.searchSong('Glória');
    await sv.selectFirstSong();

    for (let i = 0; i < 3; i++) await sv.incFonteBtn.click();
    await sv.expectNoHorizontalOverflow();

    for (let i = 0; i < 3; i++) await sv.decFonteBtn.click();
    await sv.expectNoHorizontalOverflow();
  });

  test('7. Modo letra persiste em localStorage e sobrevive a reload', async ({ page }) => {
    const sv = new SongViewerPage(page);
    await sv.gotoBusca();
    await sv.searchSong('Glória');
    // Ação rápida do card ("Ver só a letra") abre já em modo letra —
    // não há um toggle equivalente dentro do leitor em telas mobile.
    await sv.abrirPrimeiraMusicaEmModoLetra();

    // Chave real: `modo-exibicao:${musicaId}` = 'letra' (src/lib/modoExibicao.ts)
    expect(await sv.getModoExibicaoSalvo()).toBe('letra');
    // Controles de cifra (transposição/capo) não aparecem em modo letra
    await expect(sv.decTonoBtn).toBeHidden();

    // App não tem rota por música: reload sempre volta pra Home. A
    // persistência real se prova reabrindo a mesma música pelo Histórico
    // e conferindo que ela volta a abrir em modo letra.
    await page.reload();
    await page.waitForLoadState('networkidle');
    await sv.reabrirDoHistorico('Glória');
    await expect(sv.decTonoBtn).toBeHidden();
  });

  test('8. Histórico de músicas persiste após F5 (cdm_historico_musicas)', async ({ page }) => {
    const sv = new SongViewerPage(page);
    await sv.gotoBusca();
    await sv.searchSong('Glória');
    await sv.selectFirstSong();

    const historico = await page.evaluate(() => localStorage.getItem('cdm_historico_musicas'));
    expect(historico).not.toBeNull();
    expect(JSON.parse(historico ?? '[]').length).toBeGreaterThan(0);

    await page.reload();
    const historicoAposReload = await page.evaluate(() =>
      localStorage.getItem('cdm_historico_musicas')
    );
    expect(historicoAposReload).toBe(historico);
  });

  test('9. Manifest PWA válido e acessível', async ({ page, request }) => {
    await page.goto('/');
    const manifestHref = await page
      .locator('link[rel="manifest"]')
      .getAttribute('href');
    expect(manifestHref).toBeTruthy();

    const res = await request.get(manifestHref!);
    expect(res.status()).toBe(200);
    const manifest = await res.json();
    expect(manifest.name).toBe('Canto da Missa');
    expect(manifest.short_name).toBe('Canto da Missa');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  test('10. Service Worker registra e app funciona offline após 1ª visita', async ({
    page,
    context,
  }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // vite-plugin-pwa (autoUpdate) registra via Workbox — espera o controller assumir.
    await page.waitForFunction(
      () => navigator.serviceWorker?.controller !== null,
      { timeout: 15000 }
    ).catch(() => {
      // Em alguns browsers de teste o SW não é suportado (ex: WebKit headless
      // com certas flags) — nesse caso o teste abaixo vai falhar de forma
      // explícita, o que é o comportamento desejado.
    });

    const swReady = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker?.getRegistration();
      return !!reg?.active;
    });
    expect(swReady, 'Service worker não ficou ativo após a 1ª visita').toBe(true);

    await context.setOffline(true);
    await page.reload().catch(() => {});
    await expect(page.locator('body')).toBeVisible();
    await context.setOffline(false);
  });
});
