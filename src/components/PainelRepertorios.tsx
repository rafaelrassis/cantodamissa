import { Share2, X } from 'lucide-react';
import type { Musica } from '../types/musica';
import type { Repertorio } from '../lib/repertorios';
import { getMusicaById } from '../lib/musicasApi';

interface Props {
  repertorios: Repertorio[];
  repertorioCompartilhado: Repertorio | null;
  repertorioAberto: string | null;
  setRepertorioAberto: (id: string | null) => void;
  novoNome: string;
  setNovoNome: (nome: string) => void;
  criar: (nome: string) => void;
  remover: (id: string) => void;
  removerMusica: (repertorioId: string, musicaId: string) => void;
  copiarLinkRepertorio: (token: string) => void;
  linkCopiadoId: string | null;
  onSelectMusica: (musica: Musica, repertorioId?: string) => void;
}

/**
 * Conteúdo do painel "Meus repertórios" — reutilizado como sidebar fixa no
 * desktop (Home.tsx) e como tela cheia no mobile (a aside original era
 * `hidden lg:flex`, ou seja, sumia por completo em telas pequenas; esse
 * componente existe pra consertar isso).
 */
export function PainelRepertorios({
  repertorios,
  repertorioCompartilhado,
  repertorioAberto,
  setRepertorioAberto,
  novoNome,
  setNovoNome,
  criar,
  remover,
  removerMusica,
  copiarLinkRepertorio,
  linkCopiadoId,
  onSelectMusica,
}: Props) {
  return (
    <>
      {repertorioCompartilhado && (
        <div className="rounded-xl border-2 border-[var(--accent)] p-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[var(--accent)]">
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
              className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-[var(--surface)]"
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
        <div className="rounded-xl bg-[var(--accent-soft)] p-3 text-xs text-[var(--muted)]">
          Você ainda não tem repertórios. Crie um abaixo ou clique no ícone{' '}
          <span className="font-semibold">+</span> ao lado de uma música.
        </div>
      )}

      {repertorios.map((r) => {
        const aberto = repertorioAberto === r.id;
        return (
          <div key={r.id} className="rounded-xl border border-[var(--border)]">
            <button
              onClick={() => setRepertorioAberto(aberto ? null : r.id)}
              className="flex w-full items-center gap-3 p-3 text-left"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] font-mono text-sm font-bold text-[var(--accent)]">
                {r.itens.length}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[var(--text)]">{r.nome}</p>
                <p className="truncate text-xs text-[var(--muted)]">
                  {r.itens.length} música{r.itens.length === 1 ? '' : 's'}
                </p>
              </div>
            </button>

            {aberto && (
              <div className="border-t border-[var(--border)] p-2">
                {r.itens.length === 0 && (
                  <p className="px-2 py-2 text-xs text-[var(--muted)]">
                    Nenhuma música ainda — use o botão + nas músicas ao lado.
                  </p>
                )}
                {r.itens.map((item) => (
                  <div
                    key={item.musicaId}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--surface)]"
                  >
                    <button
                      onClick={async () => {
                        const musica = await getMusicaById(item.musicaId);
                        if (musica) onSelectMusica(musica, r.id);
                      }}
                      className="min-w-0 flex-1 truncate text-left text-sm text-[var(--text)]"
                    >
                      {item.title}
                    </button>
                    <span className="shrink-0 font-mono text-xs font-bold text-[var(--accent)]">
                      {item.tone}
                    </span>
                    <button
                      onClick={() => removerMusica(r.id, item.musicaId)}
                      aria-label="Remover música do repertório"
                      className="shrink-0 text-[var(--muted)] hover:text-[var(--text)]"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {r.shareToken && (
                  <button
                    onClick={() => copiarLinkRepertorio(r.shareToken!)}
                    className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] py-1.5 text-center text-xs font-medium text-[var(--text)] hover:bg-[var(--surface2)]"
                  >
                    <Share2 size={13} />
                    {linkCopiadoId === r.id ? 'Link copiado!' : 'Compartilhar link'}
                  </button>
                )}
                <button
                  onClick={() => {
                    remover(r.id);
                    setRepertorioAberto(null);
                  }}
                  className="mt-2 w-full rounded-lg py-1.5 text-center text-xs font-medium text-red-500 hover:bg-[var(--surface)]"
                >
                  Excluir repertório
                </button>
              </div>
            )}
          </div>
        );
      })}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!novoNome.trim()) return;
          criar(novoNome);
          setNovoNome('');
        }}
        className="flex gap-2"
      >
        <input
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          placeholder="Nome do novo repertório"
          className="w-full rounded-xl border border-dashed border-[var(--border)] px-3 py-2 text-sm text-[var(--text)] focus:outline-none"
        />
        <button
          type="submit"
          className="shrink-0 rounded-xl bg-[var(--accent)] px-3 text-sm font-semibold text-[var(--accent-fg)]"
        >
          Criar
        </button>
      </form>

      <div className="rounded-xl bg-[var(--accent-soft)] p-3 text-xs text-[var(--muted)]">
        Monte o repertório da missa e compartilhe com o ministério.
      </div>
    </>
  );
}
