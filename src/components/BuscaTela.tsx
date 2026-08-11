import { useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ListMusic, Search, TrendingUp, X } from 'lucide-react';
import type { Musica } from '../types/musica';
import { getMusicaById, searchMusicas } from '../lib/musicasApi';
import { useHistoricoMusicas } from '../lib/useHistoricoMusicas';
import { useRepertorios } from '../lib/useRepertorios';
import { MusicaCard } from './MusicaCard';

interface Props {
  onBack: () => void;
  onSelectMusica: (musica: Musica) => void;
  onAbrirTopMusicas?: () => void;
  onAbrirTopArtistas?: () => void;
  onAbrirCalendario?: () => void;
}

/** Tela dedicada de busca — histórico + explorar quando vazia, resultados ao digitar. */
export function BuscaTela({
  onBack,
  onSelectMusica,
  onAbrirTopMusicas,
  onAbrirTopArtistas,
  onAbrirCalendario,
}: Props) {
  const [query, setQuery] = useState('');
  const [resultados, setResultados] = useState<Musica[]>([]);
  const [carregando, setCarregando] = useState(false);
  const buscando = query.trim().length > 0;
  const inputRef = useRef<HTMLInputElement>(null);

  const { historico, remover: removerHistorico, limpar: limparHistorico } = useHistoricoMusicas();
  const { repertorios, criar, adicionarMusica } = useRepertorios();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!buscando) {
      setResultados([]);
      return;
    }
    let cancelado = false;
    setCarregando(true);
    searchMusicas(query).then((lista) => {
      if (!cancelado) {
        setResultados(lista);
        setCarregando(false);
      }
    });
    return () => {
      cancelado = true;
    };
  }, [query, buscando]);

  async function abrirDoHistorico(id: string) {
    const musica = await getMusicaById(id);
    if (musica) onSelectMusica(musica);
  }

  function adicionar(repertorioId: string, musica: Musica, rito: string) {
    adicionarMusica(repertorioId, {
      musicaId: musica.id,
      title: musica.title,
      artist: musica.artist,
      tone: musica.originalTone,
      momento: rito,
    });
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] font-sans text-[var(--text)]">
      <header className="bg-[var(--accent)] px-4 py-4 text-[var(--accent-fg)] lg:px-10">
        <button onClick={onBack} className="mb-2 flex items-center gap-1 text-xs opacity-80">
          <ChevronLeft size={14} /> Voltar
        </button>
        <h1 className="text-xl font-extrabold tracking-tight">Busca</h1>

        <div className="mt-4 flex items-center gap-2 rounded-xl bg-white/15 px-4 lg:h-14 lg:rounded-2xl">
          <Search size={18} className="shrink-0 opacity-70" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por título, letra ou artista..."
            className="w-full bg-transparent py-2.5 text-sm placeholder:text-white/60 focus:outline-none lg:py-0"
          />
          {query && (
            <button onClick={() => setQuery('')} aria-label="Limpar busca" className="shrink-0">
              <X size={16} />
            </button>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-4 lg:px-0">
        {buscando ? (
          <>
            <div className="flex items-center justify-between py-2">
              <h2 className="text-sm font-semibold text-[var(--muted)]">
                Resultados para "{query}"
              </h2>
              <span className="text-xs text-[var(--muted)]">
                {carregando ? 'carregando…' : `${resultados.length} músicas`}
              </span>
            </div>

            {!carregando && resultados.length === 0 && (
              <div className="px-4 py-10 text-center text-[var(--muted)]">
                Nenhuma música encontrada. Tente outro termo.
              </div>
            )}

            <div className="lg:rounded-2xl lg:border lg:border-[var(--border)]">
              {resultados.map((musica) => (
                <MusicaCard
                  key={musica.id}
                  musica={musica}
                  onClick={() => onSelectMusica(musica)}
                  repertorios={repertorios}
                  onCriarRepertorio={criar}
              onAddToRepertorio={(repertorioId, rito) => adicionar(repertorioId, musica, rito)}
                />
              ))}
            </div>
          </>
        ) : (
          <>
            {historico.length > 0 && (
              <div className="mb-6">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-[var(--muted)]">Histórico</h2>
                  <button
                    onClick={limparHistorico}
                    className="text-xs text-[var(--muted)] hover:text-[var(--text)]"
                  >
                    limpar
                  </button>
                </div>
                <div className="lg:rounded-2xl lg:border lg:border-[var(--border)]">
                  {historico.map((h) => (
                    <div
                      key={h.id}
                      className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3 last:border-b-0"
                    >
                      <button
                        onClick={() => abrirDoHistorico(h.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate text-[15px] font-semibold text-[var(--text)]">
                          {h.title}
                        </p>
                        {h.artist && (
                          <p className="truncate text-xs text-[var(--muted)]">{h.artist}</p>
                        )}
                      </button>
                      <button
                        onClick={() => removerHistorico(h.id)}
                        aria-label={`remover ${h.title} do histórico`}
                        className="ml-2 shrink-0 text-[var(--muted)] hover:text-[var(--text)]"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h2 className="mb-2 text-sm font-semibold text-[var(--muted)]">Explorar</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {onAbrirTopMusicas && (
                  <button
                    onClick={onAbrirTopMusicas}
                    className="flex items-center gap-3 rounded-2xl border border-[var(--border)] px-4 py-4 text-left hover:bg-[var(--surface)]"
                  >
                    <TrendingUp size={18} className="shrink-0 text-[var(--accent)]" />
                    <span className="text-sm font-semibold">Músicas em alta</span>
                  </button>
                )}
                {onAbrirTopArtistas && (
                  <button
                    onClick={onAbrirTopArtistas}
                    className="flex items-center gap-3 rounded-2xl border border-[var(--border)] px-4 py-4 text-left hover:bg-[var(--surface)]"
                  >
                    <ListMusic size={18} className="shrink-0 text-[var(--accent)]" />
                    <span className="text-sm font-semibold">Artistas mais ouvidos</span>
                  </button>
                )}
                {onAbrirCalendario && (
                  <button
                    onClick={onAbrirCalendario}
                    className="flex items-center gap-3 rounded-2xl border border-[var(--border)] px-4 py-4 text-left hover:bg-[var(--surface)]"
                  >
                    <CalendarDays size={18} className="shrink-0 text-[var(--accent)]" />
                    <span className="text-sm font-semibold">Calendário litúrgico</span>
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
