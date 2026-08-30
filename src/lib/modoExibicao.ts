import { getModoExibicaoPadrao } from './preferenciaModoExibicao';

const PREFIX = 'modo-exibicao:';

export type ModoExibicao = 'cifra' | 'letra';

/**
 * Modo de exibição (cifra completa ou só letra) persistido por música —
 * cada música guarda sua própria preferência, sobrevive entre sessões.
 * Usado tanto pelo CifraReader (pra abrir já no modo certo) quanto pelo
 * botão rápido no MusicaCard e pelas abas Cifra/Letra do repertório
 * (que forçam o modo de uma música antes de abri-la).
 *
 * Sem preferência salva pra essa música, cai no padrão global do usuário
 * (Personalizar > Modo de exibição — ver preferenciaModoExibicao.ts).
 */
export function loadModoExibicao(musicaId: string): ModoExibicao {
  try {
    const salvo = localStorage.getItem(PREFIX + musicaId);
    if (salvo === 'letra' || salvo === 'cifra') return salvo;
    return getModoExibicaoPadrao();
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
