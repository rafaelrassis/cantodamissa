import { LayoutTemplate, X } from 'lucide-react';
import type { RepertorioTemplate } from '../../lib/repertorioTemplatesApi';

interface Props {
  templates: RepertorioTemplate[];
  onEscolher: (templateId: string) => void;
  onPular: () => void;
}

/** Sheet mostrado ao criar o repertório de uma Escala nova, quando o
 * ministério já tem algum template — deixa aplicar de cara em vez de
 * montar o repertório do zero. "Começar vazio" segue o fluxo de sempre. */
export function AplicarTemplateSheet({ templates, onEscolher, onPular }: Props) {
  return (
    <div onClick={onPular} className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 font-sans md:items-center">
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[80vh] w-full max-w-sm overflow-y-auto rounded-t-2xl bg-[var(--bg)] p-6 text-[var(--text)] md:rounded-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Usar um template?</h2>
          <button onClick={onPular} aria-label="Fechar" className="text-[var(--muted)]">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-1">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => onEscolher(t.id)}
              className="flex items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-[var(--surface)]"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                <LayoutTemplate size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{t.nome}</span>
                <span className="block text-xs text-[var(--muted)]">
                  {t.itens.length} música{t.itens.length === 1 ? '' : 's'}
                </span>
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={onPular}
          className="mt-3 w-full rounded-xl border border-[var(--border)] py-2.5 text-sm font-medium text-[var(--muted)] hover:bg-[var(--surface)]"
        >
          Começar vazio
        </button>
      </div>
    </div>
  );
}
