import { useState } from 'react';
import { Check, X as XIcon } from 'lucide-react';
import { useSolicitacoesRemocao } from '../lib/useSolicitacoesRemocao';
import { useCanalErro } from '../lib/erroContext';
import type { StatusSolicitacaoRemocao } from '../lib/solicitacoesRemocao';

const LABEL_STATUS: Record<StatusSolicitacaoRemocao, string> = {
  pendente: 'Pendente',
  concluida: 'Concluída',
  rejeitada: 'Rejeitada',
};

const COR_STATUS: Record<StatusSolicitacaoRemocao, string> = {
  pendente: 'var(--accent)',
  concluida: '#186420',
  rejeitada: '#a3111d',
};

/**
 * Moderação dos pedidos de remoção (notice-and-takedown). Concluir aqui só
 * registra a decisão — remover a música/cantor de fato continua sendo uma
 * ação manual nas abas Músicas/Cantores, igual já era o combinado no SPEC.
 */
export function ModeracaoRemocoes() {
  const { solicitacoes, atualizarStatus } = useSolicitacoesRemocao();
  const { reportar } = useCanalErro();
  const [respostas, setRespostas] = useState<Record<string, string>>({});

  function moderar(id: string, status: 'concluida' | 'rejeitada') {
    void atualizarStatus(id, status, respostas[id]?.trim() || undefined).catch((e) =>
      reportar(e, 'Não foi possível salvar a moderação.')
    );
  }

  const pendentes = solicitacoes.filter((s) => s.status === 'pendente');
  const resolvidas = solicitacoes.filter((s) => s.status !== 'pendente');

  return (
    <div className="mx-auto max-w-2xl px-4 py-4 md:px-10">
      {solicitacoes.length === 0 && (
        <p className="py-10 text-center text-sm text-[var(--muted)]">
          Nenhum pedido de remoção enviado ainda.
        </p>
      )}

      {pendentes.map((s) => (
        <div key={s.id} className="mb-3 rounded-xl border border-[var(--border)] p-4">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{s.alvoDescricao}</p>
              <p className="text-xs text-[var(--muted)]">
                {s.alvoTipo === 'musica' ? 'Música' : 'Cantor/artista'} · pedido de{' '}
                {s.solicitanteNome} ({s.solicitanteEmail})
              </p>
            </div>
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
              style={{ backgroundColor: COR_STATUS[s.status] }}
            >
              {LABEL_STATUS[s.status]}
            </span>
          </div>

          <p className="mb-3 whitespace-pre-wrap rounded-lg bg-[var(--surface)] p-2 text-xs text-[var(--text)]">
            {s.motivo}
          </p>

          <input
            value={respostas[s.id] ?? ''}
            onChange={(e) => setRespostas((r) => ({ ...r, [s.id]: e.target.value }))}
            placeholder="Resposta ao solicitante (opcional)"
            className="input-field mb-2 text-xs"
          />

          <div className="flex gap-2">
            <button
              onClick={() => moderar(s.id, 'concluida')}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--accent)] py-2 text-xs font-semibold text-[var(--accent-fg)]"
            >
              <Check size={14} /> Concluir (remover conteúdo)
            </button>
            <button
              onClick={() => moderar(s.id, 'rejeitada')}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] py-2 text-xs font-semibold text-[var(--muted)]"
            >
              <XIcon size={14} /> Rejeitar
            </button>
          </div>
        </div>
      ))}

      {resolvidas.length > 0 && (
        <>
          <p className="mb-2 mt-6 text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
            Já revisados
          </p>
          {resolvidas.map((s) => (
            <div
              key={s.id}
              className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] px-3 py-2"
            >
              <p className="truncate text-sm">
                {s.alvoDescricao}{' '}
                <span className="text-xs text-[var(--muted)]">· {s.solicitanteNome}</span>
              </p>
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                style={{ backgroundColor: COR_STATUS[s.status] }}
              >
                {LABEL_STATUS[s.status]}
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
