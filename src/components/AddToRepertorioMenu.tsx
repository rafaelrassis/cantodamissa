import { useState } from 'react';
import { ChevronLeft, ListPlus } from 'lucide-react';
import { ritoSugeridoParaMomento, type Repertorio } from '../lib/repertorios';
import type { Musica } from '../types/musica';

interface Props {
  musica: Musica;
  repertorios: Repertorio[];
  onAdd: (repertorioId: string, rito: string) => void;
}

/**
 * Botão "+" que abre a lista de repertórios existentes pra adicionar a
 * música — e, escolhido o repertório, uma segunda etapa pra escolher em
 * qual rito dele a música entra (o rito sugerido pelo momento da música
 * já vem marcado, mas dá pra trocar). Criar repertório novo só é feito na
 * página de Repertórios — não tem atalho de criação aqui de propósito
 * (evita duplicar o fluxo em vários lugares do app).
 */
export function AddToRepertorioMenu({ musica, repertorios, onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [repertorioEscolhido, setRepertorioEscolhido] = useState<Repertorio | null>(null);
  const ritoSugerido = ritoSugeridoParaMomento(musica.momento[0] ?? null);

  function fechar() {
    setOpen(false);
    setRepertorioEscolhido(null);
  }

  return (
    <div
      className="relative shrink-0"
      onBlur={(e) => {
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
          {!repertorioEscolhido ? (
            repertorios.length === 0 ? (
              <p className="px-2 py-1.5 text-xs text-[var(--muted)]">
                Você ainda não tem repertórios. Crie um na aba Repertórios.
              </p>
            ) : (
              repertorios.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRepertorioEscolhido(r)}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm text-[var(--text)] hover:bg-[var(--surface)]"
                >
                  <span className="truncate">{r.nome}</span>
                  <span className="shrink-0 text-xs text-[var(--muted)]">{r.itens.length}</span>
                </button>
              ))
            )
          ) : (
            <>
              <button
                onClick={() => setRepertorioEscolhido(null)}
                className="mb-1 flex items-center gap-1 px-2 py-1 text-xs font-medium text-[var(--muted)]"
              >
                <ChevronLeft size={13} /> voltar
              </button>
              <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">
                Rito em {repertorioEscolhido.nome}
              </p>
              {repertorioEscolhido.ritos.map((rito) => (
                <button
                  key={rito}
                  onClick={() => {
                    onAdd(repertorioEscolhido.id, rito);
                    fechar();
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm text-[var(--text)] hover:bg-[var(--surface)]"
                >
                  <span className="truncate">{rito}</span>
                  {rito === ritoSugerido && (
                    <span className="shrink-0 text-[10px] font-semibold text-[var(--accent)]">sugerido</span>
                  )}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
