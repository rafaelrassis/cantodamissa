const PREFIX = 'modo-exibicao:';

export type ModoExibicao = 'cifra' | 'letra';

/**
 * Modo de exibição (cifra completa ou só letra) persistido por música —
 * cada música guarda sua própria preferência, sobrevive entre sessões.
 * Usado tanto pelo CifraReader (pra abrir já no modo certo) quanto pelo
 * botão rápido no MusicaCard e pelas abas Cifra/Letra do repertório
 * (que forçam o modo de uma música antes de abri-la).
 */
export function loadModoExibicao(musicaId: string): ModoExibicao {
  try {
    return localStorage.getItem(PREFIX + musicaId) === 'letra' ? 'letra' : 'cifra';
  } catch {
    return 'cifra';
  }
}

export function saveModoExibicao(musicaId: string, modo: ModoExibicao): void {
  try {
    localStorage.setItem(PREFIX + musicaId, modo);
  } catch {
    // localStorage indisponível (modo privado etc.) — segue sem persistir
  }
}
