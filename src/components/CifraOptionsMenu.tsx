import { useState } from 'react';
import { ChevronLeft, ListPlus, MoreVertical, Share2 } from 'lucide-react';
import { ritoSugeridoParaMomento, type Repertorio } from '../lib/repertorios';
import type { Musica } from '../types/musica';

interface Props {
  musica: Musica;
  repertorios: Repertorio[];
  onAdicionarAoRepertorio: (repertorioId: string, rito: string) => void;
  onCompartilhar: () => void;
  buttonClassName?: string;
}

/**
 * Menu "..." da cifra: compartilhar ou colocar num repertório existente
 * (escolhendo repertório e, depois, o rito dentro dele — o sugerido pelo
 * momento da música já vem marcado). Criar repertório novo não é uma
 * opção aqui de propósito — só na página de Repertórios (evita duplicar
 * esse fluxo em vários lugares do app).
 */
export function CifraOptionsMenu({
  musica,
  repertorios,
  onAdicionarAoRepertorio,
  onCompartilhar,
  buttonClassName,
}: Props) {
  const [open, setOpen] = useState(false);
  const [tela, setTela] = useState<'menu' | 'repertorios' | 'ritos'>('menu');
  const [repertorioEscolhido, setRepertorioEscolhido] = useState<Repertorio | null>(null);
  const ritoSugerido = ritoSugeridoParaMomento(musica.momento[0] ?? null);

  function fechar() {
    setOpen(false);
    setTela('menu');
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
        aria-label="Mais opções"
        className={
          buttonClassName ??
          'flex h-[34px] w-[34px] items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--muted)] hover:bg-[var(--surface2)]'
        }
      >
        <MoreVertical size={16} />
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-9 z-30 w-60 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-1.5 shadow-[var(--shadow)]"
        >
          {tela === 'menu' && (
            <>
              <button
                onClick={() => {
                  onCompartilhar();
                  fechar();
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-[var(--text)] hover:bg-[var(--surface)]"
              >
                <Share2 size={15} /> Compartilhar
              </button>
              <button
                onClick={() => setTela('repertorios')}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-[var(--text)] hover:bg-[var(--surface)]"
              >
                <ListPlus size={15} /> Colocar no repertório
              </button>
            </>
          )}

          {tela === 'repertorios' && (
            <>
              <button
                onClick={() => setTela('menu')}
                className="mb-1 flex items-center gap-1 px-2 py-1 text-xs font-medium text-[var(--muted)]"
              >
                <ChevronLeft size={13} /> voltar
              </button>
              {repertorios.length === 0 ? (
                <p className="px-2 py-1.5 text-xs text-[var(--muted)]">
                  Você ainda não tem repertórios. Crie um na aba Repertórios.
                </p>
              ) : (
                repertorios.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setRepertorioEscolhido(r);
                      setTela('ritos');
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm text-[var(--text)] hover:bg-[var(--surface)]"
                  >
                    <span className="truncate">{r.nome}</span>
                    <span className="shrink-0 text-xs text-[var(--muted)]">{r.itens.length}</span>
                  </button>
                ))
              )}
            </>
          )}

          {tela === 'ritos' && repertorioEscolhido && (
            <>
              <button
                onClick={() => setTela('repertorios')}
                className="mb-1 flex items-center gap-1 px-2 py-1 text-xs font-medium text-[var(--muted)]"
              >
                <ChevronLeft size={13} /> voltar
              </button>
              <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">
                Rito em {repertorioEscolhido.nome}
              </p>
              {(() => {
                const ritosPreenchidos = new Set(repertorioEscolhido.itens.map((i) => i.momento));
                const ritosDisponiveis = repertorioEscolhido.ritos.filter((r) => !ritosPreenchidos.has(r));
                if (ritosDisponiveis.length === 0) {
                  return (
                    <p className="px-2 py-1.5 text-xs text-[var(--muted)]">
                      Todos os ritos deste repertório já têm música.
                    </p>
                  );
                }
                return ritosDisponiveis.map((rito) => (
                  <button
                    key={rito}
                    onClick={() => {
                      onAdicionarAoRepertorio(repertorioEscolhido.id, rito);
                      fechar();
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm text-[var(--text)] hover:bg-[var(--surface)]"
                  >
                    <span className="truncate">{rito}</span>
                    {rito === ritoSugerido && (
                      <span className="shrink-0 text-[10px] font-semibold text-[var(--accent)]">sugerido</span>
                    )}
                  </button>
                ));
              })()}
            </>
          )}
        </div>
      )}
    </div>
  );
}
