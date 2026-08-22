import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { searchMusicas } from '../../lib/musicasApi';
import { ritoSugeridoParaMomento, type ItemRepertorio } from '../../lib/repertorios';
import type { Musica } from '../../types/musica';

interface Props {
  onAdicionar: (item: ItemRepertorio) => void;
  onFechar: () => void;
}

/** Busca + adiciona música direto num template (o template não tem cifra
 * reader próprio — diferente do repertório de evento, que ganha músicas
 * pelo botão "Salvar" na leitura da cifra). Tom e rito nascem do padrão
 * da música; dá pra ajustar depois no template como num repertório normal. */
export function AdicionarMusicaTemplateSheet({ onAdicionar, onFechar }: Props) {
  const [termo, setTermo] = useState('');
  const [resultados, setResultados] = useState<Musica[]>([]);
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    let ativo = true;
    setBuscando(true);
    const timeout = setTimeout(async () => {
      const r = await searchMusicas(termo);
      if (ativo) {
        setResultados(r.slice(0, 20));
        setBuscando(false);
      }
    }, 250);
    return () => {
      ativo = false;
      clearTimeout(timeout);
    };
  }, [termo]);

  return (
    <div onClick={onFechar} className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 font-sans md:items-center">
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[80vh] w-full max-w-sm flex-col overflow-hidden rounded-t-2xl bg-[var(--bg)] p-6 text-[var(--text)] md:rounded-2xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Adicionar música</h2>
          <button onClick={onFechar} aria-label="Fechar" className="text-[var(--muted)]">
            <X size={20} />
          </button>
        </div>

        <div className="mb-3 flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2">
          <Search size={16} className="text-[var(--muted)]" />
          <input
            autoFocus
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Buscar por título ou artista"
            className="w-full bg-transparent text-sm focus:outline-none"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {buscando && <p className="px-2 py-2 text-sm text-[var(--muted)]">Buscando…</p>}
          {!buscando && resultados.length === 0 && (
            <p className="px-2 py-2 text-sm text-[var(--muted)]">Nenhuma música encontrada.</p>
          )}
          <div className="flex flex-col gap-1">
            {resultados.map((m) => (
              <button
                key={m.id}
                onClick={() =>
                  onAdicionar({
                    musicaId: m.id,
                    title: m.title,
                    artist: m.artist,
                    tone: m.originalTone,
                    momento: ritoSugeridoParaMomento(m.momento[0] ?? null),
                  })
                }
                className="flex items-center justify-between rounded-xl px-2 py-2.5 text-left hover:bg-[var(--surface)]"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{m.title}</span>
                  {m.artist && <span className="block truncate text-xs text-[var(--muted)]">{m.artist}</span>}
                </span>
                <span className="shrink-0 font-mono text-xs font-bold text-[var(--accent)]">{m.originalTone}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
