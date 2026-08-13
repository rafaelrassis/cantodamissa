import { Copy } from 'lucide-react';
import type { Musica } from '../types/musica';
import type { Repertorio } from '../lib/repertorios';
import { getMusicaById } from '../lib/musicasApi';

interface Props {
  repertorios: Repertorio[];
  repertorioCompartilhado: Repertorio | null;
  onAbrirRepertorio: (id: string) => void;
  onSelectMusica: (musica: Musica, repertorioId?: string) => void;
  onClonar?: (id: string) => void;
}

/**
 * Lista de "Meus repertórios" — reutilizada como sidebar fixa no desktop
 * (Home.tsx) e como tela cheia no mobile. Clicar num repertório abre a
 * página dedicada dele (`RepertorioDetalheTela`), onde de fato dá pra
 * gerenciar ritos, reordenar, exportar etc.
 *
 * Só lista — repertório se cria exclusivamente no menu Ministério (ver
 * MinisterioRepertoriosTela), sempre vinculado a uma Escala.
 */
export function PainelRepertorios({
  repertorios,
  repertorioCompartilhado,
  onAbrirRepertorio,
  onSelectMusica,
  onClonar,
}: Props) {
  return (
    <>
      {repertorioCompartilhado && (
        <div className="rounded-[24px] border-2 border-[var(--accent)] p-[14px]">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--accent)]">
            Compartilhado com você
          </p>
          <p className="mb-2 text-sm font-semibold text-[var(--text)]">
            {repertorioCompartilhado.nome}
          </p>
          {repertorioCompartilhado.itens.map((item) => (
            <button
              key={item.musicaId}
              onClick={async () => {
                const musica = await getMusicaById(item.musicaId);
                if (musica) onSelectMusica(musica, repertorioCompartilhado.id);
              }}
              className="flex w-full items-center justify-between gap-2 rounded-[14px] px-2 py-1.5 text-left hover:bg-[var(--surface)]"
            >
              <span className="min-w-0 flex-1 truncate text-sm text-[var(--text)]">
                {item.title}
              </span>
              <span className="shrink-0 font-mono text-xs font-bold text-[var(--accent)]">
                {item.tone}
              </span>
            </button>
          ))}
        </div>
      )}

      {repertorios.length === 0 && (
        <div className="rounded-[24px] bg-[var(--accent-soft)] p-[14px] text-xs text-[var(--muted)]">
          Você ainda não tem repertórios. É necessário criar um repertório no menu Ministério.
        </div>
      )}

      {repertorios.map((r) => (
        <div
          key={r.id}
          className="flex w-full items-center gap-[10px] rounded-[24px] border border-[var(--border)] p-[14px] hover:bg-[var(--surface)]"
        >
          <button onClick={() => onAbrirRepertorio(r.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[var(--accent-soft)] font-mono text-sm font-bold text-[#3b4a27]">
              {r.itens.length}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[var(--text)]">{r.nome}</p>
              <p className="truncate text-xs text-[var(--muted)]">
                {r.itens.length} música{r.itens.length === 1 ? '' : 's'} · {r.ritos.length} rito
                {r.ritos.length === 1 ? '' : 's'}
              </p>
            </div>
          </button>
          {onClonar && (
            <button
              onClick={() => onClonar(r.id)}
              title="Clonar repertório"
              aria-label={`Clonar ${r.nome}`}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
            >
              <Copy size={15} strokeWidth={2.75} />
            </button>
          )}
        </div>
      ))}

      <div className="rounded-[24px] bg-[var(--accent-soft)] p-[14px] text-xs text-[var(--muted)]">
        Monte o repertório da missa por rito e compartilhe com o ministério.
      </div>
    </>
  );
}
