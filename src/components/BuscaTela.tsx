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
  const { repertorios, adicionarMusica } = useRepertorios();

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
      <header className="bg-[var(--accent)] px-4 py-5 text-[var(--accent-fg)] lg:px-10 lg:pb-[26px]">
        <button onClick={onBack} className="mb-2 flex items-center gap-1 text-xs opacity-80">
          <ChevronLeft size={14} strokeWidth={2.75} /> Voltar
        </button>
        <h1 className="text-[30px]">Busca</h1>

        <div className="mt-[18px] flex h-14 items-center gap-3 rounded-full bg-[var(--accent-fg)]/20 px-[22px]">
          <Search size={19} strokeWidth={2.75} className="shrink-0 opacity-75" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por título, letra ou artista..."
            className="w-full bg-transparent text-[15px] placeholder:text-[var(--accent-fg)]/65 focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} aria-label="Limpar busca" className="shrink-0">
              <X size={17} strokeWidth={2.75} />
            </button>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-4 lg:px-0 lg:py-[26px]">
        {buscando ? (
          <>
            <div className="mb-2.5 flex items-center justify-between">
              <p className="text-[13.5px] font-bold text-[#4d5648]">
                Resultados para "{query}"
              </p>
              <span className="text-[12.5px] text-[var(--muted)]">
                {carregando ? 'carregando…' : `${resultados.length} músicas`}
              </span>
            </div>

            {!carregando && resultados.length === 0 && (
              <div className="px-4 py-10 text-center text-[var(--muted)]">
                Nenhuma música encontrada. Tente outro termo.
              </div>
            )}

            <div className="rounded-[24px] border border-[var(--border)]">
              {resultados.map((musica) => (
                <MusicaCard
                  key={musica.id}
                  musica={musica}
                  onClick={() => onSelectMusica(musica)}
                  repertorios={repertorios}
                  onAddToRepertorio={(repertorioId, rito) => adicionar(repertorioId, musica, rito)}
                />
              ))}
            </div>
          </>
        ) : (
          <>
            {historico.length > 0 && (
              <div className="mb-[30px]">
                <div className="mb-2.5 flex items-center justify-between">
                  <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--muted)]">
                    Histórico
                  </p>
                  <button
                    onClick={limparHistorico}
                    className="text-[13px] text-[var(--muted)] hover:text-[var(--text)]"
                  >
                    limpar
                  </button>
                </div>
                <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)]">
                  {historico.map((h) => (
                    <div
                      key={h.id}
                      className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3.5 last:border-b-0"
                    >
                      <button
                        onClick={() => abrirDoHistorico(h.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate text-[15px] font-semibold text-[var(--text)]">
                          {h.title}
                        </p>
                        {h.artist && (
                          <p className="truncate text-[12.5px] text-[var(--muted)]">{h.artist}</p>
                        )}
                      </button>
                      <button
                        onClick={() => removerHistorico(h.id)}
                        aria-label={`remover ${h.title} do histórico`}
                        className="ml-2 shrink-0 text-[var(--muted)] hover:text-[var(--text)]"
                      >
                        <X size={15} strokeWidth={2.75} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="mb-2.5 text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--muted)]">
                Explorar
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {onAbrirTopMusicas && (
                  <button
                    onClick={onAbrirTopMusicas}
                    className="flex items-center gap-3 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] px-[18px] py-[18px] text-left hover:bg-[var(--surface2)]"
                  >
                    <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)]">
                      <TrendingUp size={16} strokeWidth={2.75} className="text-[var(--accent)]" />
                    </span>
                    <span className="text-[14.5px] font-bold">Músicas em alta</span>
                  </button>
                )}
                {onAbrirTopArtistas && (
                  <button
                    onClick={onAbrirTopArtistas}
                    className="flex items-center gap-3 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] px-[18px] py-[18px] text-left hover:bg-[var(--surface2)]"
                  >
                    <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)]">
                      <ListMusic size={16} strokeWidth={2.75} className="text-[var(--accent)]" />
                    </span>
                    <span className="text-[14.5px] font-bold">Artistas mais ouvidos</span>
                  </button>
                )}
                {onAbrirCalendario && (
                  <button
                    onClick={onAbrirCalendario}
                    className="flex items-center gap-3 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] px-[18px] py-[18px] text-left hover:bg-[var(--surface2)]"
                  >
                    <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)]">
                      <CalendarDays size={16} strokeWidth={2.75} className="text-[var(--accent)]" />
                    </span>
                    <span className="text-[14.5px] font-bold">Calendário litúrgico</span>
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
