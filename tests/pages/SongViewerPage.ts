import { Page, Locator, expect } from '@playwright/test';

/**
 * Seletores confirmados no código-fonte real (repo rafaelrassis/cantodamissa):
 * - BuscaTela.tsx: input com data-testid="busca-input" (patch aplicado)
 * - Empty state: data-testid="busca-empty-state"
 * - MusicaCard.tsx: data-testid="musica-card" (patch aplicado); botão
 *   "Ver só a letra" é uma ação rápida DENTRO do card (abre a música já em
 *   modo letra), não um controle do leitor.
 * - CifraBottomBar.tsx: aria-label="Diminuir tom" / "Aumentar tom" /
 *   "Abrir seletor de tom"; tom exibido em data-testid="tom-atual" (patch aplicado)
 * - Diminuir/Aumentar fonte: aria-label="Diminuir fonte" / "Aumentar fonte"
 * - Rolagem automática: aria-label="Alternar rolagem automática" (desktop, dentro do leitor)
 *
 * A navegação entre telas (App.tsx) é só estado em memória — não há rotas
 * nem URL por música, então `page.url()` nunca muda e um reload volta pra
 * Home (não reabre o leitor).
 *
 * Os 3 data-testid acima exigem aplicar patch-data-testid.diff no repo antes de rodar.
 */
export class SongViewerPage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly musicaCards: Locator;
  readonly emptyState: Locator;
  readonly decTonoBtn: Locator;
  readonly incTonoBtn: Locator;
  readonly tomAtual: Locator;
  readonly decFonteBtn: Locator;
  readonly incFonteBtn: Locator;
  readonly rolagemBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.getByTestId('busca-input');
    this.musicaCards = page.getByTestId('musica-card');
    this.emptyState = page.getByTestId('busca-empty-state');
    this.decTonoBtn = page.getByRole('button', { name: 'Diminuir tom' });
    this.incTonoBtn = page.getByRole('button', { name: 'Aumentar tom' });
    this.tomAtual = page.getByTestId('tom-atual');
    this.decFonteBtn = page.getByRole('button', { name: 'Diminuir fonte' });
    this.incFonteBtn = page.getByRole('button', { name: 'Aumentar fonte' });
    this.rolagemBtn = page.getByRole('button', { name: 'Alternar rolagem automática' });
  }

  async gotoHome() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  async gotoBusca() {
    // Não é uma rota própria: BuscaTela é uma tela interna trocada via
    // estado em App.tsx. Nome exato "Buscar" — a Home também tem um botão
    // "Buscar ministério" que casaria com um match parcial/regex.
    await this.page.goto('/');
    await this.page.getByRole('button', { name: 'Buscar', exact: true }).first().click();
  }

  async searchSong(termo: string) {
    await this.searchInput.fill(termo);
    await this.page.waitForTimeout(400); // debounce real: 300ms (useDebounce)
  }

  async selectFirstSong() {
    await this.musicaCards.first().click();
    await this.page.waitForLoadState('networkidle');
  }

  /** Ação rápida no card: abre a primeira música já em modo letra. */
  async abrirPrimeiraMusicaEmModoLetra() {
    await this.musicaCards
      .first()
      .getByRole('button', { name: 'Ver só a letra' })
      .click();
    await this.page.waitForLoadState('networkidle');
  }

  /** Lê o modo salvo (lib/modoExibicao.ts) pra música aberta mais recentemente. */
  async getModoExibicaoSalvo(): Promise<string | null> {
    return this.page.evaluate(() => {
      const chave = Object.keys(localStorage).find((k) => k.startsWith('modo-exibicao:'));
      return chave ? localStorage.getItem(chave) : null;
    });
  }

  /** Reabre pelo Histórico (BuscaTela) a música cujo título é passado. */
  async reabrirDoHistorico(titulo: string) {
    await this.gotoBusca();
    await this.page.getByRole('button', { name: titulo, exact: false }).first().click();
    await this.page.waitForLoadState('networkidle');
  }

  async changeTone(direction: 'up' | 'down') {
    const btn = direction === 'up' ? this.incTonoBtn : this.decTonoBtn;
    await btn.click();
  }

  async getCurrentTone(): Promise<string> {
    return (await this.tomAtual.textContent())?.trim() ?? '';
  }

  async expectNoHorizontalOverflow() {
    const hasOverflow = await this.page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasOverflow).toBeFalsy();
  }
}
