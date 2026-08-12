import { useState } from 'react';
import { Clock, Save, Trash2, X } from 'lucide-react';
import type { ItemRoteiro, ModeloRoteiro } from '../../types/ministerio';

interface Props {
  modelos: ModeloRoteiro[];
  roteiroAtual: ItemRoteiro[]; // eventos do rascunho atual — habilita "salvar como modelo"
  onUsar: (modelo: ModeloRoteiro) => void;
  onSalvarComoModelo: (nome: string) => void;
  onExcluirModelo: (id: string) => void;
  onClose: () => void;
}

export function ModelosRoteiroSheet({
  modelos,
  roteiroAtual,
  onUsar,
  onSalvarComoModelo,
  onExcluirModelo,
  onClose,
}: Props) {
  const [nomeNovo, setNomeNovo] = useState('');
  const eventosAtuais = roteiroAtual.filter((r) => (r.tipo ?? 'evento') === 'evento');

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 lg:items-center">
      <div className="max-h-[80vh] w-full max-w-sm overflow-y-auto rounded-t-2xl bg-[var(--bg)] p-6 lg:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--text)]">Modelos de roteiro</h2>
          <button onClick={onClose} aria-label="Fechar" className="text-[var(--muted)]">
            <X size={20} />
          </button>
        </div>

        {modelos.length === 0 ? (
          <p className="py-4 text-center text-sm text-[var(--muted)]">Nenhum modelo salvo ainda.</p>
        ) : (
          <ul className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)]">
            {modelos.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/15 text-[var(--accent)]">
                  <Clock size={16} />
                </span>
                <button onClick={() => onUsar(m)} className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-sm font-semibold text-[var(--text)]">{m.nome}</span>
                  <span className="block text-xs text-[var(--muted)]">{m.itens.length} itens</span>
                </button>
                <button onClick={() => onExcluirModelo(m.id)} aria-label={`Excluir modelo ${m.nome}`}>
                  <Trash2 size={14} className="text-[var(--muted)]" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
            Salvar roteiro atual como modelo
          </p>
          {eventosAtuais.length === 0 ? (
            <p className="text-xs text-[var(--muted)]">Adicione itens ao roteiro primeiro.</p>
          ) : (
            <div className="flex gap-2">
              <input
                value={nomeNovo}
                onChange={(e) => setNomeNovo(e.target.value)}
                placeholder="Nome do modelo"
                className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              />
              <button
                onClick={() => {
                  if (!nomeNovo.trim()) return;
                  onSalvarComoModelo(nomeNovo.trim());
                  setNomeNovo('');
                }}
                disabled={!nomeNovo.trim()}
                aria-label="Salvar modelo"
                className="shrink-0 rounded-lg bg-[var(--accent)] px-3 py-2 text-[var(--accent-fg)] disabled:opacity-40"
              >
                <Save size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
