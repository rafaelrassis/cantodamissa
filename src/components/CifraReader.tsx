import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, Flag, Moon, Pause, Play, Sun, Users, Video, X } from 'lucide-react';
import type { Musica } from '../types/musica';
import {
  extractChordsUsed,
  parseContentToStructuredLines,
  semitonesBetween,
  transposeChord,
  transposeContent,
} from '../lib/chordpro';
import { useAutoScroll } from '../lib/useAutoScroll';
import { useKeepAwake } from '../lib/useKeepAwake';
import { loadReaderState, saveReaderState } from '../lib/readerState';
import { useShowChordDiagrams } from '../lib/useShowChordDiagrams';
import { obterRepertorio, type Repertorio } from '../lib/repertorios';
import { getMusicaById } from '../lib/musicasApi';
import { getCantorSlugById } from '../lib/cantoresApi';
import { useRepertorios } from '../lib/useRepertorios';
import { useHistoricoMusicas } from '../lib/useHistoricoMusicas';
import { useSubmissoes } from '../lib/useSubmissoes';
import { SubmissaoForm } from './SubmissaoForm';
import { AddToRepertorioMenu } from './AddToRepertorioMenu';
import { TomSeletor } from './TomSeletor';
import { LABEL_MOMENTO, LABEL_TEMPO } from '../lib/labels';
import type { Theme } from '../lib/useTheme';
import { ChordLine } from './ChordLine';
import { CifraToolsSidebar } from './CifraToolsSidebar';
import { ChordDictionary } from './ChordDictionary';
import { ChordDiagramStrip } from './ChordDiagramStrip';
import { CifraBottomBar } from './CifraBottomBar';
import { CifraBottomSheet } from './CifraBottomSheet';

const MIN_FONT = 15;

interface Props {
  musica: Musica;
  onClose?: () => void;
  theme: Theme;
  onToggleTheme: () => void;
  fontSize: number;
  onIncFont: () => void;
  onDecFont: () => void;
  repertorioId?: string | null;
  onSelectMusica?: (musica: Musica) => void;
  onAbrirCantor?: (slug: string) => void;
  onAbrirArtista?: (artista: string) => void;
  tomForcado?: string | null;
  userName?: string | null;
}

export function CifraReader({
  musica,
  onClose,
  theme,
  onToggleTheme,
  fontSize,
  onIncFont,
  onDecFont,
  repertorioId = null,
  onSelectMusica,
  onAbrirCantor,
  onAbrirArtista,
  tomForcado = null,
  userName = null,
}: Props) {
  const [semitones, setSemitones] = useState(0);
  const [capo, setCapo] = useState(musica.capo);
  const [useFlats, setUseFlats] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const { show: showDiagrams, toggle: setShowDiagrams } = useShowChordDiagrams();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [repertorio, setRepertorio] = useState<Repertorio | null>(null);
  const [formularioCorrecaoAberto, setFormularioCorrecaoAberto] = useState(false);
  const [colaboradoresAbertos, setColaboradoresAbertos] = useState(false);
  const [tomSeletorAberto, setTomSeletorAberto] = useState(false);
  const { submissoes, criar: criarSubmissao } = useSubmissoes();
  const { repertorios, adicionarMusica } = useRepertorios();
  const { registrarAbertura } = useHistoricoMusicas();

  useEffect(() => {
    registrarAbertura({
      id: musica.id,
      slug: musica.slug,
      title: musica.title,
      artist: musica.artist,
    });
  }, [musica.id, musica.slug, musica.title, musica.artist, registrarAbertura]);

  const [cantorSlug, setCantorSlug] = useState<string | null>(null);
  useEffect(() => {
    let ativo = true;
    setCantorSlug(null);
    if (musica.cantorId) {
      getCantorSlugById(musica.cantorId).then((slug) => {
        if (ativo) setCantorSlug(slug);
      });
    }
    return () => {
      ativo = false;
    };
  }, [musica.cantorId]);

  // com cantor cadastrado, prioriza a página dele (foto, cadastro); sem
  // cantor associado, cai pra página do artista pelo texto livre — mesma
  // rota usada pela lista "Artistas mais ouvidos" da Home
  function abrirPaginaDoArtista() {
    if (cantorSlug && onAbrirCantor) onAbrirCantor(cantorSlug);
    else if (musica.artist && onAbrirArtista) onAbrirArtista(musica.artist);
  }
  const artistaClicavel = Boolean(musica.artist && (onAbrirCantor || onAbrirArtista));

  const scrollRef = useRef<HTMLDivElement>(null);
  const autoScroll = useAutoScroll(scrollRef);
  const keepAwake = useKeepAwake();

  // esconde o menu "Mais" assim que a rolagem automática começa — tela
  // limpa é o objetivo, não faz sentido o painel ficar em cima do texto
  useEffect(() => {
    if (autoScroll.playing) setSheetOpen(false);
  }, [autoScroll.playing]);

  // carrega o repertório real (se a música foi aberta a partir de um)
  useEffect(() => {
    if (repertorioId) {
      obterRepertorio(repertorioId).then(setRepertorio);
    } else {
      setRepertorio(null);
    }
  }, [repertorioId, musica.id]);

  async function trocarParaMusicaDoRepertorio(musicaId: string) {
    if (!onSelectMusica) return;
    const nova = await getMusicaById(musicaId);
    if (nova) onSelectMusica(nova);
  }

  // carrega estado salvo (tom/capo/grafia) desta música ao trocar de canção
  // — exceto se veio um `tomForcado` (o organizador do repertório escolheu
  // um tom específico pra essa missa), que sempre tem prioridade
  useEffect(() => {
    if (tomForcado) {
      setSemitones(semitonesBetween(musica.originalTone, tomForcado));
      setCapo(musica.capo);
      setUseFlats(tomForcado.includes('b'));
      setSheetOpen(false);
      return;
    }
    const saved = loadReaderState(musica.slug, { semitones: 0, capo: musica.capo, flats: false });
    setSemitones(saved.semitones);
    setCapo(saved.capo);
    setUseFlats(saved.flats);
    setSheetOpen(false);
  }, [musica.slug, musica.capo, musica.originalTone, tomForcado]);

  useEffect(() => {
    saveReaderState(musica.slug, { semitones, capo, flats: useFlats });
  }, [musica.slug, semitones, capo, useFlats]);

  const currentTone = useMemo(
    () => transposeChord(musica.originalTone, semitones, useFlats),
    [musica.originalTone, semitones, useFlats]
  );

  // adicionar ao repertório salva o TOM ATUAL (já transposto na tela), não o
  // tom original da música — é isso que o organizador do repertório
  // escolheu pra essa missa específica
  function adicionarAoRepertorio(repertorioId: string, rito: string) {
    adicionarMusica(repertorioId, {
      musicaId: musica.id,
      title: musica.title,
      artist: musica.artist,
      tone: currentTone,
      momento: rito,
    });
  }

  async function compartilhar() {
    const texto = `${musica.title}${musica.artist ? ` - ${musica.artist}` : ''} (tom ${currentTone}) · Canto da Missa`;
    if (navigator.share) {
      try {
        await navigator.share({ title: musica.title, text: texto, url: window.location.href });
        return;
      } catch {
        // usuário cancelou o compartilhamento nativo — cai pro clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      window.prompt('Copie:', texto);
    }
  }

  const transposedContent = useMemo(
    () => transposeContent(musica.chordsContent, semitones, useFlats),
    [musica.chordsContent, semitones, useFlats]
  );

  const lines = useMemo(
    () => parseContentToStructuredLines(transposedContent),
    [transposedContent]
  );
  const chordsUsed = useMemo(() => extractChordsUsed(transposedContent), [transposedContent]);

  // Créditos: nomes de quem teve uma sugestão de correção aprovada pra essa
  // música — dado que já existia (Submissao.autorNome), só exibido aqui
  // agora. Sem "quem criou" porque isso ainda não é rastreado em lugar
  // nenhum (a aprovação de sugestão hoje só muda o status, não aplica a
  // correção nem grava autoria na música em si).
  const colaboradores = useMemo(() => {
    const nomes = submissoes
      .filter((s) => s.tipo === 'correcao' && s.status === 'aprovada' && s.musicaOriginalId === musica.id)
      .map((s) => s.autorNome);
    return Array.from(new Set(nomes));
  }, [submissoes, musica.id]);

  const semitonesLabel = semitones === 0 ? '±0' : semitones > 0 ? `+${semitones}` : String(semitones);
  const capoLabel = capo === 0 ? 'sem capo' : `${capo}ª casa`;
  const tempoLabel = musica.tempoLiturgico[0] ? LABEL_TEMPO[musica.tempoLiturgico[0]] : '';

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[var(--bg)] font-sans text-[var(--text)]">
      {/* Header desktop */}
      <header className="hidden items-center justify-between gap-4 bg-[var(--accent)] px-6 py-4 text-[var(--accent-fg)] lg:flex">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={onClose}
            className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] bg-white/16"
            aria-label="Voltar"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-extrabold tracking-tight">{musica.title}</h1>
            <p className="truncate text-[13px] opacity-80">
              {artistaClicavel ? (
                <button
                  onClick={abrirPaginaDoArtista}
                  className="underline underline-offset-2 hover:opacity-100"
                >
                  {musica.artist}
                </button>
              ) : (
                musica.artist
              )}
              {tempoLabel && ` · ${tempoLabel}`}
            </p>
          </div>
          <div className="flex gap-1.5">
            {musica.momento.slice(0, 2).map((m) => (
              <span
                key={m}
                className="whitespace-nowrap rounded-full bg-white/16 px-3 py-1 text-xs font-semibold"
              >
                {LABEL_MOMENTO[m]}
              </span>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <HeaderCard label="capo" value={capo === 0 ? '—' : String(capo)} />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <CifraToolsSidebar
          currentTone={currentTone}
          semitonesLabel={semitonesLabel}
          onIncTone={() => setSemitones((s) => Math.min(11, s + 1))}
          onDecTone={() => setSemitones((s) => Math.max(-11, s - 1))}
          onResetTone={() => setSemitones(0)}
          flats={useFlats}
          onToggleFlats={() => setUseFlats((f) => !f)}
          capoLabel={capoLabel}
          onIncCapo={() => setCapo((c) => Math.min(7, c + 1))}
          onDecCapo={() => setCapo((c) => Math.max(0, c - 1))}
          playing={autoScroll.playing}
          onTogglePlay={autoScroll.toggle}
          speed={autoScroll.speed}
          onSpeedChange={autoScroll.setSpeed}
          fontSize={fontSize}
          onIncFont={onIncFont}
          onDecFont={onDecFont}
          currentMusicaId={musica.id}
          repertorio={repertorio}
          onSelectRepertorioItem={trocarParaMusicaDoRepertorio}
        />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {/* Toolbar desktop */}
          <div className="hidden items-center gap-2.5 border-b border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 lg:flex">
            <button
              onClick={autoScroll.toggle}
              aria-label="Alternar rolagem automática"
              className={`flex h-[34px] items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold ${
                autoScroll.playing
                  ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                  : 'border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]'
              }`}
            >
              {autoScroll.playing ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <div className="h-6 w-px bg-[var(--border)]" />
            <ToolbarToggle
              active={showDiagrams}
              onClick={setShowDiagrams}
              ariaLabel="Alternar diagramas de acorde"
            >
              {showDiagrams ? 'acordes visíveis' : 'acordes ocultos'}
            </ToolbarToggle>
            <ToolbarToggle active={theme === 'dark'} onClick={onToggleTheme} ariaLabel="Alternar tema">
              {theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
            </ToolbarToggle>
            {musica.youtubeUrl && (
              <ToolbarToggle
                active={showVideo}
                onClick={() => setShowVideo((v) => !v)}
                ariaLabel="Alternar vídeo"
              >
                <Video size={14} />
              </ToolbarToggle>
            )}
            <div className="flex-1" />
            <AddToRepertorioMenu musica={musica} repertorios={repertorios} onAdd={adicionarAoRepertorio} />
            <span className="text-xs font-medium text-[var(--muted)]">
              {musica.viewsCount.toLocaleString('pt-BR')} acessos
            </span>
          </div>

          {showVideo && musica.youtubeUrl && (
            <div className="aspect-video w-full border-b border-[var(--border)] bg-black">
              <iframe
                className="h-full w-full"
                src={toYoutubeEmbed(musica.youtubeUrl)}
                title="Vídeo de referência"
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
            </div>
          )}

          {showDiagrams && <ChordDiagramStrip chords={chordsUsed} onHide={setShowDiagrams} />}

          <div
            ref={scrollRef}
            className="cifra-content min-h-0 flex-1 overflow-y-auto px-5 pb-24 pt-8 font-mono lg:px-10"
            style={
              {
                lineHeight: 2.35,
                '--font-cifra': `${fontSize}px`,
                '--font-cifra-mobile': `${Math.max(MIN_FONT, fontSize - 3)}px`,
              } as React.CSSProperties
            }
          >
            <div className="mx-auto max-w-[840px]">
              {/* Header mobile — vive dentro da área rolável de propósito, então
                  some conforme o usuário rola pra baixo (não fica fixo/preso). */}
              <header className="-mx-5 -mt-8 mb-6 bg-[var(--accent)] px-4 pb-3 pt-4 font-sans text-[var(--accent-fg)] lg:hidden">
                <button onClick={onClose} className="mb-1 text-xs opacity-80">
                  {repertorio ? `← Repertório · ${repertorio.nome}` : '← Voltar'}
                </button>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h1 className="truncate text-lg font-extrabold">{musica.title}</h1>
                    {artistaClicavel ? (
                      <button
                        onClick={abrirPaginaDoArtista}
                        className="truncate text-sm underline underline-offset-2 opacity-80 hover:opacity-100"
                      >
                        {musica.artist}
                      </button>
                    ) : (
                      <p className="truncate text-sm opacity-80">{musica.artist}</p>
                    )}
                  </div>
                </div>
              </header>

              {lines.map((line, i) => (
                <ChordLine key={i} line={line} />
              ))}

              <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-[var(--border)] pb-4 pt-6 font-sans">
                <button
                  onClick={() => setFormularioCorrecaoAberto(true)}
                  className="flex h-[34px] items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 text-xs font-semibold text-[var(--muted)] hover:bg-[var(--surface2)]"
                >
                  <Flag size={13} /> sugerir correção
                </button>

                {colaboradores.length > 0 && (
                  <button
                    onClick={() => setColaboradoresAbertos(true)}
                    className="flex items-center gap-1 text-xs font-semibold text-[var(--accent)] underline-offset-2 hover:underline"
                  >
                    <Users size={13} />
                    Editado por {colaboradores[0]}
                    {colaboradores.length > 1 ? ` e mais ${colaboradores.length - 1}` : ''} · ver todos
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {showDiagrams && <ChordDictionary chords={chordsUsed} />}
      </div>

      {colaboradoresAbertos && (
        <div
          onClick={() => setColaboradoresAbertos(false)}
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 font-sans lg:items-center"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-t-2xl bg-[var(--bg)] p-6 lg:rounded-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-[var(--text)]">Colaboradores desta cifra</h2>
              <button onClick={() => setColaboradoresAbertos(false)} aria-label="Fechar" className="text-[var(--muted)]">
                <X size={18} />
              </button>
            </div>
            <ul className="divide-y divide-[var(--border)]">
              {colaboradores.map((nome) => (
                <li key={nome} className="py-2.5 text-sm text-[var(--text)]">
                  {nome}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <CifraBottomBar
        currentTone={currentTone}
        onDecTone={() => setSemitones((s) => Math.max(-11, s - 1))}
        onIncTone={() => setSemitones((s) => Math.min(11, s + 1))}
        onOpenTomSeletor={() => setTomSeletorAberto(true)}
        playing={autoScroll.playing}
        onTogglePlay={autoScroll.toggle}
        onDecFont={onDecFont}
        onIncFont={onIncFont}
        sheetOpen={sheetOpen}
        onToggleSheet={() => setSheetOpen((s) => !s)}
      />
      <CifraBottomSheet
        open={sheetOpen}
        speed={autoScroll.speed}
        onSpeedChange={autoScroll.setSpeed}
        capoLabel={capoLabel}
        onIncCapo={() => setCapo((c) => Math.min(7, c + 1))}
        onDecCapo={() => setCapo((c) => Math.max(0, c - 1))}
        diagrams={showDiagrams}
        onToggleDiagrams={setShowDiagrams}
        theme={theme}
        onToggleTheme={onToggleTheme}
        awakeActive={keepAwake.active}
        awakeSupported={keepAwake.supported}
        onToggleAwake={keepAwake.toggle}
        musica={musica}
        repertorios={repertorios}
        onAddToRepertorio={adicionarAoRepertorio}
        onCompartilhar={compartilhar}
      />

      {formularioCorrecaoAberto && (
        <SubmissaoForm
          modo="correcao"
          musicaBase={musica}
          userName={userName}
          onClose={() => setFormularioCorrecaoAberto(false)}
          onSubmit={(dados) =>
            criarSubmissao({ ...dados, tipo: 'correcao', musicaOriginalId: musica.id })
          }
        />
      )}

      {tomSeletorAberto && (
        <div
          onClick={() => setTomSeletorAberto(false)}
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 pb-24"
        >
          <TomSeletor
            originalTone={musica.originalTone}
            currentTone={currentTone}
            useFlats={useFlats}
            onSelecionarTom={(novoSemitones) => setSemitones(novoSemitones)}
            onMeioTom={(direcao) => setSemitones((s) => s + direcao)}
            onResetar={() => setSemitones(0)}
            onClose={() => setTomSeletorAberto(false)}
          />
        </div>
      )}
    </div>
  );
}

function HeaderCard({
  label,
  value,
  onClick,
}: {
  label: string;
  value: string;
  onClick?: () => void;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className="rounded-[10px] bg-white/16 px-3 py-1.5 text-center"
    >
      <div className="text-[9px] font-semibold uppercase tracking-[0.16em] opacity-75">
        {label}
      </div>
      <div className="font-mono text-[22px] font-bold leading-none">{value}</div>
    </Tag>
  );
}

function ToolbarToggle({
  active,
  onClick,
  children,
  ariaLabel,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  ariaLabel?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className={`flex h-[34px] items-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold ${
        active
          ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
          : 'border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]'
      }`}
    >
      {children}
    </button>
  );
}

function toYoutubeEmbed(url: string): string {
  const match = url.match(/(?:v=|youtu\.be\/)([\w-]+)/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : url;
}
