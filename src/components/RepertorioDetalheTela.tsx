import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  Copy,
  FileText,
  GripVertical,
  HelpCircle,
  LayoutTemplate,
  MessageCircle,
  Move,
  Music,
  Plus,
  Share2,
  Trash2,
  X,
} from 'lucide-react';
import type { Musica } from '../types/musica';
import type { Repertorio } from '../lib/repertorios';
import { RITO_SEM_SECAO } from '../lib/repertorios';
import { getMusicaById } from '../lib/musicasApi';
import { saveModoExibicao, type ModoExibicao } from '../lib/modoExibicao';
import type { RepertorioTemplate } from '../lib/repertorioTemplatesApi';

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
  /** Esconde o botão de excluir — usado quando aberto a partir de uma
   * Escala (o repertório é dela; excluir deixaria a escala sem repertório
   * até a próxima abertura recriar um vazio, o que só confunde). */
  ocultarExcluir?: boolean;
  /** Só leitura — esconde excluir/reordenar/criar/mover/remover rito e
   * música. Usado quando um membro não-admin abre o repertório pela aba
   * Ministério. Default true (demais usos do app seguem editáveis). */
  podeEditar?: boolean;
  /** Botão "Aplicar template" (admin) — só faz sentido em repertório de
   * evento, nunca dentro de um template em si. Omitido = botão escondido. */
  templatesDisponiveis?: RepertorioTemplate[];
  onAplicarTemplate?: (templateId: string) => Promise<void>;
  souAdmin?: boolean;
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
  ocultarExcluir,
  podeEditar = true,
  templatesDisponiveis,
  onAplicarTemplate,
  souAdmin,
}: Props) {
  const [novoRito, setNovoRito] = useState('');
  const [ordem, setOrdem] = useState<string[]>(repertorio.ritos);
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [menuCompartilharAberto, setMenuCompartilharAberto] = useState(false);
  const [ajudaAberta, setAjudaAberta] = useState(false);
  const [escolhendoTemplate, setEscolhendoTemplate] = useState(false);
  const [aplicandoTemplate, setAplicandoTemplate] = useState(false);
  // aba Cifra/Letra: cada música guarda seu próprio modo (lib/modoExibicao),
  // essa aba só define com qual modo a música é aberta a partir daqui
  const [abaModo, setAbaModo] = useState<ModoExibicao>('cifra');

  async function excluir() {
    if (!confirmandoExclusao) {
      setConfirmandoExclusao(true);
      return;
    }
    await onExcluirRepertorio(repertorio.id);
    onBack();
  }

  function linkCompartilhavel() {
    if (!repertorio.shareToken) return null;
    return `${window.location.origin}${window.location.pathname}?rep=${repertorio.shareToken}`;
  }

  async function copiarLink() {
    const url = linkCompartilhavel();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Copie o link:', url);
    }
    setMenuCompartilharAberto(false);
    setLinkCopiado(true);
    setTimeout(() => setLinkCopiado(false), 2000);
  }

  function compartilharWhatsapp() {
    const url = linkCompartilhavel();
    if (!url) return;
    const texto = `${repertorio.nome} · Canto da Missa\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
    setMenuCompartilharAberto(false);
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
    saveModoExibicao(item.musicaId, abaModo);
    const musica = await getMusicaById(item.musicaId);
    if (musica) onSelectMusica(musica, item.tone);
  }

  async function aplicarTemplate(templateId: string) {
    if (!onAplicarTemplate) return;
    setAplicandoTemplate(true);
    try {
      await onAplicarTemplate(templateId);
    } finally {
      setAplicandoTemplate(false);
      setEscolhendoTemplate(false);
    }
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
      <header className="bg-[var(--accent)] px-4 py-4 text-[var(--accent-fg)] md:px-10">
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
            <button
              onClick={() => setAjudaAberta(true)}
              aria-label="Ajuda sobre o repertório"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/16"
            >
              <HelpCircle size={16} />
            </button>
            {repertorio.shareToken && (
              <div className="relative">
                <button
                  onClick={() => setMenuCompartilharAberto((v) => !v)}
                  aria-label="Compartilhar"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/16"
                >
                  <Share2 size={16} />
                </button>
                {menuCompartilharAberto && (
                  <>
                    <button
                      aria-hidden
                      tabIndex={-1}
                      onClick={() => setMenuCompartilharAberto(false)}
                      className="fixed inset-0 z-10 cursor-default"
                    />
                    <div className="absolute right-0 z-20 mt-2 w-52 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] shadow-[var(--shadow)]">
                      <button
                        onClick={compartilharWhatsapp}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium hover:bg-[var(--accent-soft)]"
                      >
                        <MessageCircle size={15} /> Enviar pelo WhatsApp
                      </button>
                      <button
                        onClick={copiarLink}
                        className="flex w-full items-center gap-2 border-t border-[var(--border)] px-3 py-2.5 text-left text-sm font-medium hover:bg-[var(--accent-soft)]"
                      >
                        <Copy size={15} /> Copiar link
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
            {souAdmin && templatesDisponiveis && templatesDisponiveis.length > 0 && (
              <button
                onClick={() => setEscolhendoTemplate(true)}
                aria-label="Aplicar template"
                title="Aplicar template"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/16"
              >
                <LayoutTemplate size={16} />
              </button>
            )}
            {podeEditar && !ocultarExcluir && (
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
            )}
          </div>
        </div>
        {linkCopiado && <p className="mt-1 text-xs opacity-90">Link copiado!</p>}
        {ajudaAberta && (
          <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/50 md:items-center">
            <button
              aria-hidden
              tabIndex={-1}
              onClick={() => setAjudaAberta(false)}
              className="fixed inset-0 cursor-default"
            />
            <div className="relative z-10 w-full max-w-md rounded-t-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-[var(--text)] shadow-[var(--shadow)] md:rounded-2xl">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-bold">Sobre o repertório</h2>
                <button onClick={() => setAjudaAberta(false)} aria-label="Fechar">
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-3 text-sm text-[var(--text)]">
                <p>
                  O repertório reúne as músicas escolhidas pra uma missa, organizadas pelos
                  momentos da celebração (ritos) — Entrada, Ato Penitencial, Glória, e assim por
                  diante.
                </p>
                <p>
                  Ele fica vinculado à escala do ministério: quando a escala é excluída, o
                  repertório vai junto. Por isso não existe um botão de excluir por aqui — pra
                  apagar, exclua a escala com um admin do ministério.
                </p>
                <p className="flex items-start gap-2">
                  <Move size={16} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                  <span>
                    Dentro de uma música (cifra ou letra), arraste a tela pra esquerda ou direita
                    pra ir pra próxima ou voltar pra anterior — sem precisar sair e escolher na
                    lista de novo.
                  </span>
                </p>
                <p>
                  Toque em uma música pra abrir a cifra no tom já escolhido pra essa missa. Use as
                  abas Cifra/Letra pra definir com qual modo cada música abre.
                </p>
              </div>
            </div>
          </div>
        )}

        {escolhendoTemplate && templatesDisponiveis && (
          <div onClick={() => !aplicandoTemplate && setEscolhendoTemplate(false)} className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 font-sans md:items-center">
            <div
              onClick={(e) => e.stopPropagation()}
              className="max-h-[80vh] w-full max-w-sm overflow-y-auto rounded-t-2xl bg-[var(--bg)] p-6 text-[var(--text)] md:rounded-2xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold">Aplicar template</h2>
                <button onClick={() => setEscolhendoTemplate(false)} aria-label="Fechar" className="text-[var(--muted)]">
                  <X size={20} />
                </button>
              </div>
              <div className="flex flex-col gap-1">
                {templatesDisponiveis.map((t) => (
                  <button
                    key={t.id}
                    disabled={aplicandoTemplate}
                    onClick={() => aplicarTemplate(t.id)}
                    className="flex items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-[var(--surface)] disabled:opacity-50"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                      <LayoutTemplate size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{t.nome}</span>
                      <span className="block text-xs text-[var(--muted)]">
                        {t.itens.length} música{t.itens.length === 1 ? '' : 's'}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {confirmandoExclusao && (
          <p className="mt-1 text-xs font-semibold opacity-90">
            Toca de novo pra confirmar — essa ação não pode ser desfeita.
          </p>
        )}
      </header>

      <div className="mx-auto flex max-w-2xl gap-2 px-4 pt-4 md:px-10">
        <AbaModo active={abaModo === 'cifra'} onClick={() => setAbaModo('cifra')}>
          <Music size={14} /> Cifra
        </AbaModo>
        <AbaModo active={abaModo === 'letra'} onClick={() => setAbaModo('letra')}>
          <FileText size={14} /> Letra
        </AbaModo>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-4 md:px-10">
        {gruposParaExibir.map((nomeRito) => {
          const itens = itensPorRito.get(nomeRito) ?? [];
          const removivel = podeEditar && nomeRito !== RITO_SEM_SECAO;
          const reordenavel = podeEditar && ordem.includes(nomeRito);

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
                      {podeEditar && (
                        <>
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
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {podeEditar && (
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
        )}
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

function AbaModo({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold ${
        active
          ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
          : 'border border-[var(--border)] bg-[var(--bg)] text-[var(--muted)]'
      }`}
    >
      {children}
    </button>
  );
}
