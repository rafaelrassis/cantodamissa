import { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Share2, X } from 'lucide-react';
import type { Musica } from '../types/musica';
import type { Repertorio } from '../lib/repertorios';
import { RITO_SEM_SECAO } from '../lib/repertorios';
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
  moverMusicaParaRito: (repertorioId: string, musicaId: string, novoRito: string) => void;
  adicionarRito: (repertorioId: string, nome: string) => void;
  removerRito: (repertorioId: string, nome: string) => void;
  copiarLinkRepertorio: (token: string) => void;
  linkCopiadoId: string | null;
  onSelectMusica: (musica: Musica, repertorioId?: string) => void;
}

/**
 * Conteúdo do painel "Meus repertórios" — reutilizado como sidebar fixa no
 * desktop (Home.tsx) e como tela cheia no mobile.
 *
 * Cada repertório é agrupado pelos seus ritos (seções da missa), na ordem
 * cadastrada. Músicas sem rito reconhecido caem no grupo
 * "Sem rito definido".
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
  moverMusicaParaRito,
  adicionarRito,
  removerRito,
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
                  {r.itens.length} música{r.itens.length === 1 ? '' : 's'} · {r.ritos.length} rito
                  {r.ritos.length === 1 ? '' : 's'}
                </p>
              </div>
            </button>

            {aberto && (
              <RepertorioDetalhe
                repertorio={r}
                removerMusica={removerMusica}
                moverMusicaParaRito={moverMusicaParaRito}
                adicionarRito={adicionarRito}
                removerRito={removerRito}
                copiarLinkRepertorio={copiarLinkRepertorio}
                linkCopiado={linkCopiadoId === r.id}
                onSelectMusica={onSelectMusica}
                onExcluir={() => {
                  remover(r.id);
                  setRepertorioAberto(null);
                }}
              />
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
        Monte o repertório da missa por rito e compartilhe com o ministério.
      </div>
    </>
  );
}

// ---------- Detalhe expandido de um repertório (agrupado por rito) ----------

function RepertorioDetalhe({
  repertorio,
  removerMusica,
  moverMusicaParaRito,
  adicionarRito,
  removerRito,
  copiarLinkRepertorio,
  linkCopiado,
  onSelectMusica,
  onExcluir,
}: {
  repertorio: Repertorio;
  removerMusica: (repertorioId: string, musicaId: string) => void;
  moverMusicaParaRito: (repertorioId: string, musicaId: string, novoRito: string) => void;
  adicionarRito: (repertorioId: string, nome: string) => void;
  removerRito: (repertorioId: string, nome: string) => void;
  copiarLinkRepertorio: (token: string) => void;
  linkCopiado: boolean;
  onSelectMusica: (musica: Musica, repertorioId?: string) => void;
  onExcluir: () => void;
}) {
  const [novoRito, setNovoRito] = useState('');
  const [ritoColapsado, setRitoColapsado] = useState<Record<string, boolean>>({});

  const itensPorRito = new Map<string, typeof repertorio.itens>();
  for (const nome of repertorio.ritos) itensPorRito.set(nome, []);
  const orfaos: typeof repertorio.itens = [];
  for (const item of repertorio.itens) {
    if (item.momento && itensPorRito.has(item.momento)) {
      itensPorRito.get(item.momento)!.push(item);
    } else {
      orfaos.push(item);
    }
  }

  const gruposParaExibir = [...repertorio.ritos, ...(orfaos.length ? [RITO_SEM_SECAO] : [])];
  if (orfaos.length) itensPorRito.set(RITO_SEM_SECAO, orfaos);

  const opcoesDeRito = [...repertorio.ritos, ...(orfaos.length ? [RITO_SEM_SECAO] : [])];

  return (
    <div className="border-t border-[var(--border)] p-2">
      {gruposParaExibir.map((nomeRito) => {
        const itens = itensPorRito.get(nomeRito) ?? [];
        const colapsado = ritoColapsado[nomeRito];
        const removivel = nomeRito !== RITO_SEM_SECAO;

        return (
          <div key={nomeRito} className="mb-1">
            <div className="flex items-center gap-1 px-1 py-1">
              <button
                onClick={() =>
                  setRitoColapsado((s) => ({ ...s, [nomeRito]: !s[nomeRito] }))
                }
                className="flex flex-1 items-center gap-1 text-left"
              >
                {colapsado ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">
                  {nomeRito}
                </span>
                <span className="text-[10px] text-[var(--muted)]">({itens.length})</span>
              </button>
              {removivel && itens.length === 0 && (
                <button
                  onClick={() => removerRito(repertorio.id, nomeRito)}
                  aria-label={`Excluir rito ${nomeRito}`}
                  title="Excluir rito"
                  className="shrink-0 text-[var(--muted)] hover:text-red-500"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {!colapsado && (
              <>
                {itens.length === 0 && (
                  <p className="px-2 py-1 text-xs text-[var(--muted)]">Nenhuma música aqui.</p>
                )}
                {itens.map((item) => (
                  <div
                    key={item.musicaId}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--surface)]"
                  >
                    <button
                      onClick={async () => {
                        const musica = await getMusicaById(item.musicaId);
                        if (musica) onSelectMusica(musica, repertorio.id);
                      }}
                      className="min-w-0 flex-1 truncate text-left text-sm text-[var(--text)]"
                    >
                      {item.title}
                    </button>
                    <span className="shrink-0 font-mono text-xs font-bold text-[var(--accent)]">
                      {item.tone}
                    </span>
                    <select
                      value={nomeRito}
                      onChange={(e) =>
                        moverMusicaParaRito(repertorio.id, item.musicaId, e.target.value)
                      }
                      aria-label="Mover música pra outro rito"
                      className="shrink-0 rounded-md border border-[var(--border)] bg-[var(--bg)] px-1 py-0.5 text-[10px] text-[var(--text)]"
                    >
                      {opcoesDeRito.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => removerMusica(repertorio.id, item.musicaId)}
                      aria-label="Remover música do repertório"
                      className="shrink-0 text-[var(--muted)] hover:text-[var(--text)]"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        );
      })}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!novoRito.trim()) return;
          adicionarRito(repertorio.id, novoRito);
          setNovoRito('');
        }}
        className="mt-2 flex gap-1.5"
      >
        <input
          value={novoRito}
          onChange={(e) => setNovoRito(e.target.value)}
          placeholder="Novo rito (ex: Bênção Final)"
          className="w-full rounded-lg border border-dashed border-[var(--border)] px-2 py-1 text-xs text-[var(--text)] focus:outline-none"
        />
        <button
          type="submit"
          aria-label="Adicionar rito"
          className="flex shrink-0 items-center justify-center rounded-lg bg-[var(--accent)] px-2 text-[var(--accent-fg)]"
        >
          <Plus size={14} />
        </button>
      </form>

      {repertorio.shareToken && (
        <button
          onClick={() => copiarLinkRepertorio(repertorio.shareToken!)}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] py-1.5 text-center text-xs font-medium text-[var(--text)] hover:bg-[var(--surface2)]"
        >
          <Share2 size={13} />
          {linkCopiado ? 'Link copiado!' : 'Compartilhar link'}
        </button>
      )}
      <button
        onClick={onExcluir}
        className="mt-2 w-full rounded-lg py-1.5 text-center text-xs font-medium text-red-500 hover:bg-[var(--surface)]"
      >
        Excluir repertório
      </button>
    </div>
  );
}
