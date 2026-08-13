import { useState } from 'react';
import { Check, ChevronLeft, ListMusic, Plus, X } from 'lucide-react';
import { ritoSugeridoParaMomento, type Repertorio } from '../lib/repertorios';
import type { Musica } from '../types/musica';

interface Props {
  musica: Musica;
  repertorios: Repertorio[];
  onAdicionar: (repertorioId: string, rito: string) => void;
  onFechar: () => void;
}

type Etapa = 'lista' | 'ritos';

/**
 * Bottom sheet de "Salvar" no repertório — layout inspirado no CifraClub
 * (lista cheia em vez de menu ancorado pequeno). Compartilhado entre o
 * botão "+" da cifra (AddToRepertorioMenu) e o "..." das listas de música
 * (CifraOptionsMenu) pra não duplicar esse fluxo em dois lugares.
 * Sem o rodapé Cancelar/Salvar do CifraClub: aqui cada linha já executa a
 * ação na hora (selecionar repertório avança pro rito), não é multi-seleção.
 *
 * Repertório só se cria pelo Ministério (1 escala = 1 repertório — ver
 * useRepertorios().garantirRepertorioDaEscala), então só listamos aqui os
 * repertórios já vinculados a uma escala (escalaId != null); sem nenhum,
 * pedimos pra criar por lá em vez de oferecer criação avulsa.
 */
export function RepertorioPickerSheet({ musica, repertorios, onAdicionar, onFechar }: Props) {
  const [etapa, setEtapa] = useState<Etapa>('lista');
  const [repertorioEscolhido, setRepertorioEscolhido] = useState<Repertorio | null>(null);
  const ritoSugerido = ritoSugeridoParaMomento(musica.momento[0] ?? null);

  const repertoriosDoMinisterio = repertorios.filter((r) => r.escalaId !== null);

  const ritosDisponiveis = repertorioEscolhido
    ? repertorioEscolhido.ritos.filter(
        (r) => !repertorioEscolhido.itens.some((i) => i.momento === r)
      )
    : [];

  return (
    <div
      onClick={onFechar}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 font-sans lg:items-center"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[80vh] w-full max-w-sm overflow-y-auto rounded-t-[28px] bg-[var(--bg)] p-6 text-[var(--text)] shadow-[0_12px_30px_rgba(30,42,20,0.18)] lg:rounded-[28px]"
      >
        <div className="mb-4 flex items-center justify-between">
          {etapa === 'lista' ? (
            <h2 className="text-xl">Salvar</h2>
          ) : (
            <button
              onClick={() => setEtapa('lista')}
              className="flex items-center gap-1 text-sm font-medium text-[var(--muted)]"
            >
              <ChevronLeft size={16} strokeWidth={2.75} /> voltar
            </button>
          )}
          <button onClick={onFechar} aria-label="Fechar" className="text-[var(--muted)]">
            <X size={20} strokeWidth={2.75} />
          </button>
        </div>

        {etapa === 'lista' &&
          (repertoriosDoMinisterio.length === 0 ? (
            <p className="px-2 py-2 text-sm text-[var(--muted)]">
              Nenhum repertório disponível. É necessário criar um repertório no menu Ministério.
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {repertoriosDoMinisterio.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setRepertorioEscolhido(r);
                    setEtapa('ritos');
                  }}
                  className="flex items-center gap-3 rounded-[20px] px-[10px] py-2 text-left hover:bg-[var(--surface)]"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-[var(--accent-soft)] text-[var(--accent)]">
                    <ListMusic size={18} strokeWidth={2.75} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{r.nome}</span>
                    <span className="block text-xs text-[var(--muted)]">
                      {r.itens.length} música{r.itens.length === 1 ? '' : 's'}
                    </span>
                  </span>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted)]">
                    <Plus size={15} strokeWidth={2.75} />
                  </span>
                </button>
              ))}
            </div>
          ))}

        {etapa === 'ritos' && repertorioEscolhido && (
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--muted)]">
              Rito em {repertorioEscolhido.nome}
            </p>
            {ritosDisponiveis.length === 0 ? (
              <p className="px-2 py-2 text-sm text-[var(--muted)]">Todos os ritos deste repertório já têm música.</p>
            ) : (
              <div className="flex flex-col gap-1">
                {ritosDisponiveis.map((rito) => (
                  <button
                    key={rito}
                    onClick={() => {
                      onAdicionar(repertorioEscolhido.id, rito);
                      onFechar();
                    }}
                    className="flex items-center justify-between rounded-[20px] px-[10px] py-[9px] text-left text-sm hover:bg-[var(--surface)]"
                  >
                    <span className="truncate">{rito}</span>
                    {rito === ritoSugerido && (
                      <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-[var(--accent)]">
                        <Check size={13} strokeWidth={2.75} /> sugerido
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
