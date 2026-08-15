/**
 * Helpers pra escrita no Supabase.
 *
 * O PostgREST não avisa quando uma policy de RLS barra um update ou um
 * delete: a resposta volta sem erro e com zero linhas afetadas. Como o app
 * quase sempre recarregava os dados logo depois da mutação, uma escrita
 * negada aparecia pro usuário como "salvou e desfez sozinho" — pior que um
 * erro, porque some sem deixar rastro. `exigirLinhas` transforma esse
 * silêncio em exceção, e a UI trata como qualquer outra falha.
 */

export type RespostaSupabase<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

export class ErroPermissao extends Error {
  constructor(contexto: string) {
    super(`${contexto}: sem permissão para esta operação (ou o item não existe mais)`);
    this.name = 'ErroPermissao';
  }
}

/**
 * Roda uma mutação que precisa afetar pelo menos uma linha e devolve as
 * linhas afetadas. Exige `.select(...)` no final da query — sem ele o
 * PostgREST não devolve as linhas e não há como contar.
 */
export async function exigirLinhas<T>(
  operacao: PromiseLike<RespostaSupabase<T>>,
  contexto: string
): Promise<T[]> {
  const { data, error } = await operacao;
  if (error) throw new Error(`${contexto}: ${error.message}`);
  if (!data || data.length === 0) throw new ErroPermissao(contexto);
  return data;
}

/** Mesma ideia, pra mutação que devolve no máximo uma linha. */
export async function exigirLinha<T>(
  operacao: PromiseLike<RespostaSupabase<T>>,
  contexto: string
): Promise<T> {
  const linhas = await exigirLinhas(operacao, contexto);
  return linhas[0];
}

/** Mensagem curta pra mostrar na interface. */
export function mensagemDeErro(err: unknown, padrao = 'Não foi possível concluir'): string {
  if (err instanceof ErroPermissao) return 'Você não tem permissão para isso.';
  if (err instanceof Error && err.message) return err.message;
  return padrao;
}
