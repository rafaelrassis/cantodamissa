import { useState } from 'react';
import { ListPlus } from 'lucide-react';
import type { Repertorio } from '../lib/repertorios';

interface Props {
  repertorios: Repertorio[];
  onAdd: (repertorioId: string) => void;
  onCreateAndAdd: (nome: string) => void;
}

/**
 * Botão "+" que abre um menu simples: lista de repertórios existentes +
 * opção de criar um novo já adicionando a música nele. Fecha ao escolher
 * ou ao clicar fora (via onBlur no container, já que é só um <div> com
 * tabIndex — sem dependência de portal/overlay lib).
 */
export function AddToRepertorioMenu({ repertorios, onAdd, onCreateAndAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [criando, setCriando] = useState(false);
  const [nomeNovo, setNomeNovo] = useState('');

  function fechar() {
    setOpen(false);
    setCriando(false);
    setNomeNovo('');
  }

  return (
    <div
      className="relative shrink-0"
      onBlur={(e) => {
        // só fecha se o foco saiu de todo o container (não de um filho pro outro)
        if (!e.currentTarget.contains(e.relatedTarget as Node)) fechar();
      }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label="Adicionar ao repertório"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--muted)] hover:bg-[var(--surface2)]"
      >
        <ListPlus size={16} />
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-9 z-30 w-56 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-1.5 shadow-[var(--shadow)]"
        >
          {repertorios.length === 0 && !criando && (
            <p className="px-2 py-1.5 text-xs text-[var(--muted)]">
              Você ainda não tem repertórios.
            </p>
          )}

          {!criando &&
            repertorios.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  onAdd(r.id);
                  fechar();
                }}
                className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm text-[var(--text)] hover:bg-[var(--surface)]"
              >
                <span className="truncate">{r.nome}</span>
                <span className="shrink-0 text-xs text-[var(--muted)]">{r.itens.length}</span>
              </button>
            ))}

          {!criando && <div className="my-1 h-px bg-[var(--border)]" />}

          {criando ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!nomeNovo.trim()) return;
                onCreateAndAdd(nomeNovo);
                fechar();
              }}
              className="flex gap-1 p-1"
            >
              <input
                autoFocus
                value={nomeNovo}
                onChange={(e) => setNomeNovo(e.target.value)}
                placeholder="Nome do repertório"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm text-[var(--text)] focus:outline-none"
              />
              <button
                type="submit"
                className="shrink-0 rounded-lg bg-[var(--accent)] px-2 text-xs font-semibold text-[var(--accent-fg)]"
              >
                Criar
              </button>
            </form>
          ) : (
            <button
              onClick={() => setCriando(true)}
              className="w-full rounded-lg px-2 py-1.5 text-left text-sm font-medium text-[var(--accent)] hover:bg-[var(--surface)]"
            >
              + novo repertório
            </button>
          )}
        </div>
      )}
    </div>
  );
}
