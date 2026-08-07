import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, Download, GripVertical, Plus, Share2, Trash2, X } from 'lucide-react';
import type { Musica } from '../types/musica';
import type { Repertorio } from '../lib/repertorios';
import { RITO_SEM_SECAO } from '../lib/repertorios';
import { getMusicaById } from '../lib/musicasApi';

interface Props {
  repertorio: Repertorio;
  onBack: () => void;
  onSelectMusica: (musica: Musica, tomEscolhido: string) => void;
  removerMusica: (repertorioId: string, musicaId: string) => void;
  moverMusicaParaRito: (repertorioId: string, musicaId: string, novoRito: string) => void;
  adicionarRito: (repertorioId: string, nome: string) => void;
  removerRito: (repertorioId: string, nome: string) => void;
  reordenarRitos: (repertorioId: string, nomesOrdenados: string[]) => void;
  onExcluirRepertorio: (repertorioId: string) => Promise<void>;
}

/**
 * Página dedicada de um repertório — ritos em sequência (reordenáveis por
 * arrastar), cada um com suas músicas (nome, cantor, tom escolhido pra essa
 * missa). Substitui o painel inline por uma tela própria, com espaço pra
 * gerenciar de verdade: criar/excluir/reordenar rito, exportar.
 */
export function RepertorioDetalheTela({
  repertorio,
  onBack,
  onSelectMusica,
  removerMusica,
  moverMusicaParaRito,
  adicionarRito,
  removerRito,
  reordenarRitos,
  onExcluirRepertorio,
}: Props) {
  const [novoRito, setNovoRito] = useState('');
  const [ordem, setOrdem] = useState<string[]>(repertorio.ritos);
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

  async function excluir() {
    if (!confirmandoExclusao) {
      setConfirmandoExclusao(true);
      return;
    }
    await onExcluirRepertorio(repertorio.id);
    onBack();
  }

  async function copiarLink() {
    if (!repertorio.shareToken) return;
    const url = `${window.location.origin}${window.location.pathname}?rep=${repertorio.shareToken}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Copie o link:', url);
    }
    setLinkCopiado(true);
    setTimeout(() => setLinkCopiado(false), 2000);
  }

  // ressincroniza a ordem local quando o repertório recarrega (ex: depois
  // de criar/excluir rito), preservando o que já foi arrastado nesta sessão
  useEffect(() => {
    setOrdem(repertorio.ritos);
  }, [repertorio.ritos]);

  const itensPorRito = useMemo(() => {
    const mapa = new Map<string, typeof repertorio.itens>();
    for (const nome of repertorio.ritos) mapa.set(nome, []);
    const orfaos: typeof repertorio.itens = [];
    for (const item of repertorio.itens) {
      if (item.momento && mapa.has(item.momento)) {
        mapa.get(item.momento)!.push(item);
      } else {
        orfaos.push(item);
      }
    }
    if (orfaos.length) mapa.set(RITO_SEM_SECAO, orfaos);
    return mapa;
  }, [repertorio]);

  const gruposParaExibir = [
    ...ordem,
    ...(itensPorRito.has(RITO_SEM_SECAO) ? [RITO_SEM_SECAO] : []),
  ];
  const opcoesDeRito = gruposParaExibir;

  async function abrirMusica(item: { musicaId: string; tone: string }) {
    const musica = await getMusicaById(item.musicaId);
    if (musica) onSelectMusica(musica, item.tone);
  }

  function baixarRepertorio() {
    const linhas: string[] = [repertorio.nome, ''];
    for (const nome of gruposParaExibir) {
      const itens = itensPorRito.get(nome) ?? [];
      if (itens.length === 0) continue;
      linhas.push(`## ${nome}`);
      for (const item of itens) {
        linhas.push(`- ${item.title}${item.artist ? ` — ${item.artist}` : ''} (tom: ${item.tone})`);
      }
      linhas.push('');
    }
    const blob = new Blob([linhas.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${repertorio.nome.replace(/[^\w-]+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // ---------- arrastar pra reordenar ritos ----------
  const linhaRefs = useRef(new Map<string, HTMLDivElement>());
  const [arrastando, setArrastando] = useState<string | null>(null);

  function onPointerDownRito(e: React.PointerEvent, nome: string) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setArrastando(nome);
  }

  function onPointerMoveRito(e: React.PointerEvent) {
    if (!arrastando) return;
    const y = e.clientY;
    let novaOrdem = ordem;
    for (const nome of ordem) {
      if (nome === arrastando) continue;
      const el = linhaRefs.current.get(nome);
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      const meio = rect.top + rect.height / 2;
      const idxAtual = novaOrdem.indexOf(arrastando);
      const idxAlvo = novaOrdem.indexOf(nome);
      if (idxAtual < idxAlvo && y > meio) {
        novaOrdem = trocarPosicao(novaOrdem, idxAtual, idxAlvo);
      } else if (idxAtual > idxAlvo && y < meio) {
        novaOrdem = trocarPosicao(novaOrdem, idxAtual, idxAlvo);
      }
    }
    if (novaOrdem !== ordem) setOrdem(novaOrdem);
  }

  function onPointerUpRito() {
    if (arrastando) reordenarRitos(repertorio.id, ordem);
    setArrastando(null);
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] font-sans text-[var(--text)]">
      <header className="bg-[var(--accent)] px-4 py-4 text-[var(--accent-fg)] lg:px-10">
        <button onClick={onBack} className="mb-2 flex items-center gap-1 text-xs opacity-80">
          <ChevronLeft size={14} /> Voltar
        </button>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-extrabold tracking-tight">{repertorio.nome}</h1>
            <p className="mt-0.5 text-sm opacity-80">
              {repertorio.itens.length} música{repertorio.itens.length === 1 ? '' : 's'} ·{' '}
              {ordem.length} rito{ordem.length === 1 ? '' : 's'}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            {repertorio.shareToken && (
              <button
                onClick={copiarLink}
                aria-label="Compartilhar"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/16"
              >
                <Share2 size={16} />
              </button>
            )}
            <button
              onClick={baixarRepertorio}
              aria-label="Baixar repertório"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/16"
            >
              <Download size={16} />
            </button>
            <button
              onClick={excluir}
              onBlur={() => setConfirmandoExclusao(false)}
              aria-label="Excluir repertório"
              className={`flex h-9 w-9 items-center justify-center rounded-full ${
                confirmandoExclusao ? 'bg-red-500' : 'bg-white/16'
              }`}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        {linkCopiado && <p className="mt-1 text-xs opacity-90">Link copiado!</p>}
        {confirmandoExclusao && (
          <p className="mt-1 text-xs font-semibold opacity-90">
            Toca de novo pra confirmar — essa ação não pode ser desfeita.
          </p>
        )}
      </header>

      <div className="mx-auto max-w-2xl px-4 py-4 lg:px-10">
        {gruposParaExibir.map((nomeRito) => {
          const itens = itensPorRito.get(nomeRito) ?? [];
          const removivel = nomeRito !== RITO_SEM_SECAO;
          const reordenavel = ordem.includes(nomeRito);

          return (
            <div
              key={nomeRito}
              ref={(el) => {
                if (el) linhaRefs.current.set(nomeRito, el);
                else linhaRefs.current.delete(nomeRito);
              }}
              onPointerMove={onPointerMoveRito}
              onPointerUp={onPointerUpRito}
              className={`mb-3 rounded-2xl border transition-shadow ${
                arrastando === nomeRito
                  ? 'border-[var(--accent)] shadow-[var(--shadow)]'
                  : 'border-[var(--border)]'
              }`}
            >
              <div className="flex items-center gap-2 px-3 py-2.5">
                {reordenavel && (
                  <button
                    onPointerDown={(e) => onPointerDownRito(e, nomeRito)}
                    aria-label={`Arrastar pra reordenar ${nomeRito}`}
                    className="shrink-0 cursor-grab touch-none text-[var(--muted)] active:cursor-grabbing"
                  >
                    <GripVertical size={16} />
                  </button>
                )}
                <span className="flex-1 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
                  {nomeRito}
                </span>
                <span className="text-xs text-[var(--muted)]">{itens.length}</span>
                {removivel && itens.length === 0 && (
                  <button
                    onClick={() => removerRito(repertorio.id, nomeRito)}
                    aria-label={`Excluir rito ${nomeRito}`}
                    className="shrink-0 text-[var(--muted)] hover:text-red-500"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {itens.length === 0 ? (
                <p className="px-3 pb-3 text-xs text-[var(--muted)]">Nenhuma música aqui.</p>
              ) : (
                <div className="border-t border-[var(--border)]">
                  {itens.map((item) => (
                    <div
                      key={item.musicaId}
                      className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2.5 last:border-b-0"
                    >
                      <button
                        onClick={() => abrirMusica(item)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate text-sm font-semibold text-[var(--text)]">
                          {item.title}
                        </p>
                        <p className="truncate text-xs text-[var(--muted)]">
                          {item.artist ?? 'Artista desconhecido'}
                        </p>
                      </button>
                      <span className="shrink-0 rounded-md bg-[var(--accent-soft)] px-2 py-1 font-mono text-xs font-bold text-[var(--accent)]">
                        {item.tone}
                      </span>
                      <select
                        value={nomeRito}
                        onChange={(e) =>
                          moverMusicaParaRito(repertorio.id, item.musicaId, e.target.value)
                        }
                        aria-label="Mover pra outro rito"
                        className="shrink-0 rounded-md border border-[var(--border)] bg-[var(--bg)] px-1 py-1 text-[10px] text-[var(--text)]"
                      >
                        {opcoesDeRito.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => removerMusica(repertorio.id, item.musicaId)}
                        aria-label="Remover música"
                        className="shrink-0 text-[var(--muted)] hover:text-[var(--text)]"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
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
          className="flex gap-2"
        >
          <input
            value={novoRito}
            onChange={(e) => setNovoRito(e.target.value)}
            placeholder="Novo rito (ex: Bênção Final)"
            className="w-full rounded-xl border border-dashed border-[var(--border)] px-3 py-2 text-sm text-[var(--text)] focus:outline-none"
          />
          <button
            type="submit"
            aria-label="Adicionar rito"
            className="flex shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] px-3 text-[var(--accent-fg)]"
          >
            <Plus size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}

function trocarPosicao<T>(lista: T[], de: number, para: number): T[] {
  const copia = [...lista];
  const [item] = copia.splice(de, 1);
  copia.splice(para, 0, item);
  return copia;
}
