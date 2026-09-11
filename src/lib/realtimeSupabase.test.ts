import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';

// Canal de Realtime de mentira: guarda o que foi assinado e deixa o teste
// disparar os eventos na mão. Assim dá pra verificar os filtros que vão
// pro servidor (é onde mora o risco: filtro errado = evento que nunca
// chega, ou mudança de ministério alheio chegando).
const espiao = vi.hoisted(() => ({
  assinaturas: [] as { canal: string; tabela: string; filtro?: string; handler: () => void }[],
  removidos: [] as string[],
  limpar() {
    this.assinaturas = [];
    this.removidos = [];
  },
}));

vi.mock('./supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    channel(nome: string) {
      const canal = {
        nome,
        on(_evento: string, cfg: { table: string; filter?: string }, handler: () => void) {
          espiao.assinaturas.push({ canal: nome, tabela: cfg.table, filtro: cfg.filter, handler });
          return canal;
        },
        subscribe: () => canal,
      };
      return canal;
    },
    removeChannel: (c: { nome: string }) => {
      espiao.removidos.push(c.nome);
    },
    realtime: { setAuth: async () => {} },
  },
}));

vi.mock('./supabaseAuth', () => ({ garantirSessaoAnonima: async () => 'uid-1' }));

const { assinarTabelas } = await import('./realtimeSupabase');
const { assinarAtualizacoesMinisterio } = await import('./ministerioApi');

/** A montagem do canal espera duas promises (sessão e setAuth). */
async function esperarMontagem() {
  for (let i = 0; i < 5; i++) await Promise.resolve();
}

beforeEach(() => espiao.limpar());
afterEach(() => vi.useRealTimers());

describe('assinarAtualizacoesMinisterio', () => {
  it('sem ministério, observa só a própria linha de membro (é o "fui aprovado")', async () => {
    const cancelar = assinarAtualizacoesMinisterio(null, () => {});
    await esperarMontagem();

    expect(espiao.assinaturas.map((a) => [a.tabela, a.filtro])).toEqual([
      ['ministerio_membros', 'auth_uid=eq.uid-1'],
    ]);
    cancelar();
  });

  it('com ministério ativo, observa também solicitações e membros dele', async () => {
    const cancelar = assinarAtualizacoesMinisterio('min-9', () => {});
    await esperarMontagem();

    expect(espiao.assinaturas.map((a) => [a.tabela, a.filtro])).toEqual([
      ['ministerio_membros', 'auth_uid=eq.uid-1'],
      ['solicitacoes_ingresso', 'ministerio_id=eq.min-9'],
      ['ministerio_membros', 'ministerio_id=eq.min-9'],
    ]);
    cancelar();
  });
});

describe('assinarTabelas', () => {
  it('junta a rajada de eventos numa recarga só', async () => {
    vi.useFakeTimers();
    const recarregar = vi.fn();
    const cancelar = assinarTabelas('t', [{ tabela: 'avisos' }], recarregar);
    await esperarMontagem();

    // Aprovar ingresso apaga a solicitação e cria o membro: dois eventos.
    espiao.assinaturas.forEach((a) => a.handler());
    espiao.assinaturas.forEach((a) => a.handler());

    vi.advanceTimersByTime(300);
    expect(recarregar).toHaveBeenCalledTimes(1);
    cancelar();
  });

  it('cancelar antes da sessão resolver não chega a abrir canal', async () => {
    const cancelar = assinarTabelas('t', [{ tabela: 'avisos' }], () => {});
    cancelar();
    await esperarMontagem();

    expect(espiao.assinaturas).toEqual([]);
    expect(espiao.removidos).toEqual([]);
  });

  it('não dispara recarga depois de cancelado', async () => {
    vi.useFakeTimers();
    const recarregar = vi.fn();
    const cancelar = assinarTabelas('t', [{ tabela: 'avisos' }], recarregar);
    await esperarMontagem();

    espiao.assinaturas.forEach((a) => a.handler());
    cancelar();
    vi.advanceTimersByTime(300);

    expect(recarregar).not.toHaveBeenCalled();
  });
});
