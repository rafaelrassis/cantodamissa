import { useState } from 'react';
import { Check, ChevronLeft, ListMusic, Plus, X } from 'lucide-react';
import { ritoSugeridoParaMomento, type Repertorio } from '../lib/repertorios';
import type { Musica } from '../types/musica';

interface Props {
  musica: Musica;
  repertorios: Repertorio[];
  onCriar: (nome: string) => Promise<Repertorio>;
  onAdicionar: (repertorioId: string, rito: string) => void;
  onFechar: () => void;
}

type Etapa = 'lista' | 'criar' | 'ritos';

/**
 * Bottom sheet de "Salvar" no repertório — layout inspirado no CifraClub
 * (lista cheia em vez de menu ancorado pequeno, "Criar uma nova lista"
 * como primeira opção). Compartilhado entre o botão "+" da cifra
 * (AddToRepertorioMenu) e o "..." das listas de música (CifraOptionsMenu)
 * pra não duplicar esse fluxo em dois lugares.
 * Sem o rodapé Cancelar/Salvar do CifraClub: aqui cada linha já executa a
 * ação na hora (selecionar repertório avança pro rito), não é multi-seleção.
 */
export function RepertorioPickerSheet({ musica, repertorios, onCriar, onAdicionar, onFechar }: Props) {
  const [etapa, setEtapa] = useState<Etapa>('lista');
  const [repertorioEscolhido, setRepertorioEscolhido] = useState<Repertorio | null>(null);
  const [nomeNovo, setNomeNovo] = useState('');
  const [criando, setCriando] = useState(false);
  const ritoSugerido = ritoSugeridoParaMomento(musica.momento[0] ?? null);

  async function handleCriar() {
    if (!nomeNovo.trim()) return;
    setCriando(true);
    try {
      const novo = await onCriar(nomeNovo.trim());
      setRepertorioEscolhido(novo);
      setEtapa('ritos');
    } finally {
      setCriando(false);
    }
  }

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
        className="max-h-[80vh] w-full max-w-sm overflow-y-auto rounded-t-2xl bg-[var(--bg)] p-6 text-[var(--text)] lg:rounded-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          {etapa === 'lista' ? (
            <h2 className="text-lg font-bold">Salvar</h2>
          ) : (
            <button
              onClick={() => setEtapa('lista')}
              className="flex items-center gap-1 text-sm font-medium text-[var(--muted)]"
            >
              <ChevronLeft size={16} /> voltar
            </button>
          )}
          <button onClick={onFechar} aria-label="Fechar" className="text-[var(--muted)]">
            <X size={20} />
          </button>
        </div>

        {etapa === 'lista' && (
          <div className="flex flex-col gap-1">
            <button
              onClick={() => setEtapa('criar')}
              className="flex items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-[var(--surface)]"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-dashed border-[var(--border)] text-[var(--accent)]">
                <Plus size={18} />
              </span>
              <span className="text-sm font-semibold">Criar uma nova lista</span>
            </button>

            {repertorios.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  setRepertorioEscolhido(r);
                  setEtapa('ritos');
                }}
                className="flex items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-[var(--surface)]"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                  <ListMusic size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{r.nome}</span>
                  <span className="block text-xs text-[var(--muted)]">
                    {r.itens.length} música{r.itens.length === 1 ? '' : 's'}
                  </span>
                </span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted)]">
                  <Plus size={15} />
                </span>
              </button>
            ))}
          </div>
        )}

        {etapa === 'criar' && (
          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--muted)]">Nome da lista</label>
            <input
              autoFocus
              value={nomeNovo}
              onChange={(e) => setNomeNovo(e.target.value)}
              placeholder="Ex: Missa de domingo"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
            />
            <button
              onClick={handleCriar}
              disabled={!nomeNovo.trim() || criando}
              className="mt-4 w-full rounded-lg bg-[var(--accent)] py-2.5 text-sm font-semibold text-[var(--accent-fg)] disabled:opacity-40"
            >
              {criando ? 'Criando…' : 'Criar'}
            </button>
          </div>
        )}

        {etapa === 'ritos' && repertorioEscolhido && (
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
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
                    className="flex items-center justify-between rounded-xl px-2 py-2.5 text-left text-sm hover:bg-[var(--surface)]"
                  >
                    <span className="truncate">{rito}</span>
                    {rito === ritoSugerido && (
                      <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-[var(--accent)]">
                        <Check size={13} /> sugerido
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
