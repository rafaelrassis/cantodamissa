import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabase';
import { garantirSessaoAnonima } from './supabaseAuth';

/** Uma tabela observada; `filtro` é a sintaxe do Realtime (ex.: `ministerio_id=eq.<id>`). */
export type TabelaObservada = {
  tabela: string;
  /** Sem filtro, a RLS de select é quem decide o que chega (ver 0013). */
  filtro?: string;
};

/**
 * Assina mudanças de um conjunto de tabelas e avisa quando alguma muda —
 * sem dizer o que mudou: quem chama refaz a busca, que é barata e sempre
 * consistente (mesmo racional do `recarregar` dos hooks).
 *
 * Só as tabelas das publications 0031/0032 emitem evento. A revalidação
 * por foco/intervalo (useRevalidarEmFoco) continua como fallback pra
 * quando o canal cai — no celular isso acontece toda vez que a rede
 * troca de Wi-Fi pra dados.
 *
 * Retorna o cancelamento síncrono (pra usar direto no cleanup do
 * useEffect); a montagem do canal é assíncrona porque depende da sessão.
 */
export function assinarTabelas(
  nomeCanal: string,
  /** Função quando algum filtro depende do auth.uid(), que só é conhecido depois da sessão. */
  tabelas: TabelaObservada[] | ((authUid: string) => TabelaObservada[]),
  aoMudar: () => void,
  debounceMs = 300
): () => void {
  if (!isSupabaseConfigured) return () => {};

  let canal: RealtimeChannel | null = null;
  let cancelado = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  // Uma ação costuma mexer em mais de uma linha (aprovar ingresso apaga a
  // solicitação e cria o membro; salvar escala reescreve participantes e
  // roteiro): o debounce junta a rajada numa busca só.
  const avisar = () => {
    clearTimeout(timer);
    timer = setTimeout(aoMudar, debounceMs);
  };

  (async () => {
    const authUid = await garantirSessaoAnonima();
    if (cancelado || !authUid) return;
    // Sem o JWT da sessão o canal entra como anônimo e a RLS não deixa
    // passar evento nenhum.
    await supabase.realtime.setAuth();

    const lista = typeof tabelas === 'function' ? tabelas(authUid) : tabelas;
    if (lista.length === 0) return;

    const c = supabase.channel(`${nomeCanal}:${authUid}`);
    for (const { tabela, filtro } of lista) {
      c.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tabela, ...(filtro ? { filter: filtro } : {}) },
        avisar
      );
    }
    c.subscribe();

    if (cancelado) supabase.removeChannel(c);
    else canal = c;
  })();

  return () => {
    cancelado = true;
    clearTimeout(timer);
    if (canal) supabase.removeChannel(canal);
  };
}
