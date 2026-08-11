import { useMemo, useState } from 'react';
import { Check, ChevronLeft, Music, Search, X } from 'lucide-react';
import { mockMusicas } from '../../lib/mockMusicas';
import { normalizar } from '../../lib/musicasApi';
import type { EscalaMusica } from '../../types/ministerio';

interface Props {
  jaAdicionadas: string[]; // musicaIds já na escala
  onCancelar: () => void;
  onConfirmar: (musicas: EscalaMusica[]) => void;
}

type AbaLista = 'musicas' | 'artistas';

export function MusicasSelecionarTela({ jaAdicionadas, onCancelar, onConfirmar }: Props) {
  const [busca, setBusca] = useState('');
  const [aba, setAba] = useState<AbaLista>('musicas');
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set(jaAdicionadas));

  const artistas = useMemo(() => {
    const nomes = new Set(mockMusicas.map((m) => m.artist).filter(Boolean) as string[]);
    return Array.from(nomes).sort();
  }, []);

  const filtradas = useMemo(() => {
    const termo = normalizar(busca);
    if (!termo) return mockMusicas;
    return mockMusicas.filter(
      (m) => normalizar(m.title).includes(termo) || normalizar(m.artist ?? '').includes(termo)
    );
  }, [busca]);

  function toggle(id: string) {
    setSelecionadas((prev) => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--bg)] font-sans text-[var(--text)]">
      <header className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-4">
        <button onClick={onCancelar} aria-label="Voltar">
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-extrabold tracking-tight">{selecionadas.size} Selecionadas</h1>
          <p className="text-xs text-[var(--muted)]">Repertório</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex rounded-full bg-[var(--surface)] p-1 text-xs font-semibold">
          {(
            [
              ['musicas', `Músicas (${mockMusicas.length})`],
              ['artistas', `Artistas (${artistas.length})`],
            ] as [AbaLista, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setAba(id)}
              className={`flex-1 rounded-full py-1.5 ${
                aba === id ? 'bg-[var(--accent)] text-[var(--accent-fg)]' : 'text-[var(--muted)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5">
          <Search size={16} className="text-[var(--muted)]" />
          <input
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setAba('musicas');
            }}
            placeholder="Título ou artista"
            className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--muted)]"
          />
          {busca && (
            <button onClick={() => setBusca('')} aria-label="Limpar busca">
              <X size={14} className="text-[var(--muted)]" />
            </button>
          )}
        </div>

        {aba === 'musicas' ? (
          <ul className="mt-3 flex flex-col gap-1">
            {filtradas.length === 0 && (
              <li className="py-8 text-center text-sm text-[var(--muted)]">Lista vazia.</li>
            )}
            {filtradas.map((m) => (
              <li key={m.id}>
                <button
                  onClick={() => toggle(m.id)}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--accent)]">
                    <Music size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{m.title}</span>
                    <span className="block truncate text-xs text-[var(--muted)]">{m.artist ?? '—'}</span>
                  </span>
                  {selecionadas.has(m.id) && <Check size={16} className="shrink-0 text-[var(--accent)]" />}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="mt-3 flex flex-col gap-1">
            {artistas.map((a) => (
              <li key={a}>
                <button
                  onClick={() => {
                    setBusca(a);
                    setAba('musicas');
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-2.5 text-left text-sm font-medium"
                >
                  {a}
                  <span className="text-xs text-[var(--muted)]">
                    {mockMusicas.filter((m) => m.artist === a).length}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <footer className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3">
        <span className="text-sm font-semibold">{selecionadas.size} Selecionadas</span>
        <button
          onClick={() =>
            onConfirmar(
              Array.from(selecionadas).map((id) => {
                const musica = mockMusicas.find((m) => m.id === id);
                return { musicaId: id, tom: musica?.originalTone ?? 'C', momento: 'Entrada' };
              })
            )
          }
          disabled={selecionadas.size === 0}
          className="flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-[var(--accent-fg)] disabled:opacity-40"
        >
          <Check size={15} /> Incluir
        </button>
      </footer>
    </div>
  );
}
