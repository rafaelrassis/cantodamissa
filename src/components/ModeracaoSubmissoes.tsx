import { ChevronLeft, Check, X as XIcon } from 'lucide-react';
import { useSubmissoes } from '../lib/useSubmissoes';
import { useCanalErro } from '../lib/erroContext';
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
  aprovada: '#186420',
  rejeitada: '#a3111d',
};

export function ModeracaoSubmissoes({ onBack, onLogout, embedded }: Props) {
  const { submissoes, atualizarStatus } = useSubmissoes();
  const { reportar } = useCanalErro();

  // A moderação grava no banco e só admin pode: se a permissão não
  // estiver mais lá, o usuário precisa ver o motivo em vez de o botão
  // simplesmente não fazer nada.
  function moderar(id: string, status: 'aprovada' | 'rejeitada') {
    void atualizarStatus(id, status).catch((e) =>
      reportar(e, 'Não foi possível salvar a moderação.')
    );
  }
  const pendentes = submissoes.filter((s) => s.status === 'pendente');
  const resolvidas = submissoes.filter((s) => s.status !== 'pendente');

  const conteudo = (
    <div className="mx-auto max-w-2xl px-4 py-4 md:px-10">
        {submissoes.length === 0 && (
          <p className="py-10 text-center text-sm text-[var(--muted)]">
            Nenhuma sugestão enviada ainda.
          </p>
        )}

        {pendentes.map((s) => (
          <div key={s.id} className="mb-3 rounded-xl border border-[var(--border)] p-4">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {s.title}
                  {s.artist && <span className="font-normal text-[var(--muted)]"> · {s.artist}</span>}
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {s.tipo === 'nova' ? 'Música nova' : 'Correção'} · por {s.autorNome} · tom{' '}
                  {s.originalTone}
                </p>
                {s.observacao && (
                  <p className="mt-1 text-xs italic text-[var(--muted)]">"{s.observacao}"</p>
                )}
              </div>
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                style={{ backgroundColor: COR_STATUS[s.status] }}
              >
                {LABEL_STATUS[s.status]}
              </span>
            </div>

            <pre className="mb-3 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-lg bg-[var(--surface)] p-2 font-mono text-xs text-[var(--text)]">
              {s.chordsContent}
            </pre>

            <div className="flex gap-2">
              <button
                onClick={() => moderar(s.id, 'aprovada')}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--accent)] py-2 text-xs font-semibold text-[var(--accent-fg)]"
              >
                <Check size={14} /> Aprovar
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
              Já revisadas
            </p>
            {resolvidas.map((s) => (
              <div
                key={s.id}
                className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] px-3 py-2"
              >
                <p className="truncate text-sm">
                  {s.title} <span className="text-xs text-[var(--muted)]">· {s.autorNome}</span>
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

  if (embedded) return conteudo;

  return (
    <div className="min-h-screen bg-[var(--bg)] font-sans text-[var(--text)]">
      <header className="bg-[var(--accent)] px-4 py-4 text-[var(--accent-fg)] md:px-10">
        <div className="mb-2 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-1 text-xs opacity-80">
            <ChevronLeft size={14} /> Voltar
          </button>
          <button onClick={onLogout} className="text-xs opacity-80 hover:underline">
            Sair
          </button>
        </div>
        <h1 className="text-xl font-extrabold tracking-tight">Moderação de sugestões</h1>
        <p className="mt-0.5 text-sm opacity-80">
          {pendentes.length} pendente{pendentes.length === 1 ? '' : 's'}
        </p>
      </header>
      {conteudo}
    </div>
  );
}
