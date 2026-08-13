import { ChevronLeft, Check, X as XIcon } from 'lucide-react';
import { useSubmissoes } from '../lib/useSubmissoes';
import type { StatusSubmissao } from '../lib/submissoes';

interface Props {
  onBack: () => void;
  onLogout: () => void;
  /** Quando usado dentro do AdminPanel, esconde o header próprio (já existe um no hub). */
  embedded?: boolean;
}

const LABEL_STATUS: Record<StatusSubmissao, string> = {
  pendente: 'Pendente',
  aprovada: 'Aprovada',
  rejeitada: 'Rejeitada',
};

const COR_STATUS: Record<StatusSubmissao, string> = {
  pendente: 'var(--accent)',
  aprovada: 'var(--accent)',
  rejeitada: '#a3111d',
};

export function ModeracaoSubmissoes({ onBack, onLogout, embedded }: Props) {
  const { submissoes, atualizarStatus } = useSubmissoes();
  const pendentes = submissoes.filter((s) => s.status === 'pendente');
  const resolvidas = submissoes.filter((s) => s.status !== 'pendente');

  const conteudo = (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
        {submissoes.length === 0 && (
          <p className="py-10 text-center text-sm text-[var(--muted)]">
            Nenhuma sugestão enviada ainda.
          </p>
        )}

        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          {pendentes.map((s) => (
            <div key={s.id} className="rounded-[24px] border border-[var(--border)] p-[18px]">
              <div className="mb-3 flex items-start justify-between gap-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[14.5px] font-semibold">
                    {s.title}
                    {s.artist && <span className="font-normal text-[var(--muted)]"> · {s.artist}</span>}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">
                    {s.tipo === 'nova' ? 'Música nova' : 'Correção'} · por {s.autorNome} · tom{' '}
                    {s.originalTone}
                  </p>
                  {s.observacao && (
                    <p className="mt-1 text-xs italic text-[var(--muted)]">"{s.observacao}"</p>
                  )}
                </div>
                <span
                  className="shrink-0 rounded-full px-[11px] py-[3px] text-[10.5px] font-extrabold text-white"
                  style={{ backgroundColor: COR_STATUS[s.status] }}
                >
                  {LABEL_STATUS[s.status]}
                </span>
              </div>

              <pre className="mb-3.5 max-h-[150px] overflow-y-auto whitespace-pre-wrap rounded-2xl bg-[var(--surface)] p-3.5 font-mono text-[12.5px] leading-[1.7] text-[var(--text)]">
                {s.chordsContent}
              </pre>

              <div className="flex gap-2">
                <button
                  onClick={() => atualizarStatus(s.id, 'aprovada')}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[var(--accent)] py-2.5 text-[12.5px] font-bold text-[var(--accent-fg)]"
                >
                  <Check size={14} strokeWidth={2.75} /> Aprovar
                </button>
                <button
                  onClick={() => atualizarStatus(s.id, 'rejeitada')}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-[var(--border)] py-2.5 text-[12.5px] font-bold text-[var(--muted)]"
                >
                  <XIcon size={14} strokeWidth={2.75} /> Rejeitar
                </button>
              </div>
            </div>
          ))}

          {resolvidas.length > 0 && (
            <div className="lg:col-span-2">
              <p className="mb-2.5 mt-6 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--muted)] lg:mt-3">
                Já revisadas
              </p>
              <div className="flex flex-col gap-2">
                {resolvidas.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-2.5 rounded-[20px] border border-[var(--border)] px-[18px] py-[11px]"
                  >
                    <p className="truncate text-sm">
                      {s.title} <span className="text-xs text-[var(--muted)]">· {s.autorNome}</span>
                    </p>
                    <span
                      className="shrink-0 rounded-full px-[11px] py-[3px] text-[10.5px] font-extrabold text-white"
                      style={{ backgroundColor: COR_STATUS[s.status] }}
                    >
                      {LABEL_STATUS[s.status]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
    </div>
  );

  if (embedded) return conteudo;

  return (
    <div className="min-h-screen bg-[var(--bg)] font-sans text-[var(--text)]">
      <header className="bg-[var(--accent)] px-4 pb-5 pt-4 text-[var(--accent-fg)] lg:px-8">
        <div className="mb-2 flex items-center justify-between text-xs opacity-85">
          <button onClick={onBack} className="flex items-center gap-1">
            <ChevronLeft size={14} strokeWidth={2.75} /> Voltar
          </button>
          <button onClick={onLogout} className="hover:underline">
            Sair
          </button>
        </div>
        <h1 className="text-2xl">Moderação de sugestões</h1>
        <p className="mt-0.5 text-sm opacity-85">
          {pendentes.length} pendente{pendentes.length === 1 ? '' : 's'}
        </p>
      </header>
      {conteudo}
    </div>
  );
}
