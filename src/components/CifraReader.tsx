import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, Flag, Moon, Pause, Play, Sun, Video } from 'lucide-react';
import type { Musica } from '../types/musica';
import {
  extractChordsUsed,
  parseContentToStructuredLines,
  transposeChord,
  transposeContent,
} from '../lib/chordpro';
import { useAutoScroll } from '../lib/useAutoScroll';
import { useKeepAwake } from '../lib/useKeepAwake';
import { loadReaderState, saveReaderState } from '../lib/readerState';
import { useShowChordDiagrams } from '../lib/useShowChordDiagrams';
import { obterRepertorio, type Repertorio } from '../lib/repertorios';
import { getMusicaById } from '../lib/musicasApi';
import { useSubmissoes } from '../lib/useSubmissoes';
import { SubmissaoForm } from './SubmissaoForm';
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
}: Props) {
  const [semitones, setSemitones] = useState(0);
  const [capo, setCapo] = useState(musica.capo);
  const [useFlats, setUseFlats] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const { show: showDiagrams, toggle: setShowDiagrams } = useShowChordDiagrams();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [repertorio, setRepertorio] = useState<Repertorio | null>(null);
  const [formularioCorrecaoAberto, setFormularioCorrecaoAberto] = useState(false);
  const { criar: criarSubmissao } = useSubmissoes();

  const scrollRef = useRef<HTMLDivElement>(null);
  const autoScroll = useAutoScroll(scrollRef);
  const keepAwake = useKeepAwake();

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
  useEffect(() => {
    const saved = loadReaderState(musica.slug, { semitones: 0, capo: musica.capo, flats: false });
    setSemitones(saved.semitones);
    setCapo(saved.capo);
    setUseFlats(saved.flats);
    setSheetOpen(false);
  }, [musica.slug, musica.capo]);

  useEffect(() => {
    saveReaderState(musica.slug, { semitones, capo, flats: useFlats });
  }, [musica.slug, semitones, capo, useFlats]);

  const currentTone = useMemo(
    () => transposeChord(musica.originalTone, semitones, useFlats),
    [musica.originalTone, semitones, useFlats]
  );

  const transposedContent = useMemo(
    () => transposeContent(musica.chordsContent, semitones, useFlats),
    [musica.chordsContent, semitones, useFlats]
  );

  const lines = useMemo(
    () => parseContentToStructuredLines(transposedContent),
    [transposedContent]
  );
  const chordsUsed = useMemo(() => extractChordsUsed(transposedContent), [transposedContent]);

  const semitonesLabel = semitones === 0 ? '±0' : semitones > 0 ? `+${semitones}` : String(semitones);
  const capoLabel = capo === 0 ? 'sem capo' : `${capo}ª casa`;
  const tempoLabel = musica.tempoLiturgico[0] ? LABEL_TEMPO[musica.tempoLiturgico[0]] : '';

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg)] font-sans text-[var(--text)]">
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
              {musica.artist}
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
          <HeaderCard label="tom" value={currentTone} />
          <HeaderCard label="capo" value={capo === 0 ? '—' : String(capo)} />
        </div>
      </header>

      {/* Header mobile */}
      <header className="bg-[var(--accent)] px-4 pb-3 pt-4 text-[var(--accent-fg)] lg:hidden">
        <button onClick={onClose} className="mb-1 text-xs opacity-80">
          {repertorio ? `← Repertório · ${repertorio.nome}` : '← Voltar'}
        </button>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-extrabold">{musica.title}</h1>
            <p className="truncate text-sm opacity-80">{musica.artist}</p>
          </div>
          <HeaderCard label="tom" value={currentTone} />
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
            <button
              onClick={() => setFormularioCorrecaoAberto(true)}
              className="flex h-[34px] items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 text-xs font-semibold text-[var(--muted)] hover:bg-[var(--surface2)]"
            >
              <Flag size={13} /> sugerir correção
            </button>
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
              {lines.map((line, i) => (
                <ChordLine key={i} line={line} />
              ))}
            </div>
          </div>
        </div>

        {showDiagrams && <ChordDictionary chords={chordsUsed} />}
      </div>

      <CifraBottomBar
        currentTone={currentTone}
        onDecTone={() => setSemitones((s) => Math.max(-11, s - 1))}
        onIncTone={() => setSemitones((s) => Math.min(11, s + 1))}
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
      />

      {formularioCorrecaoAberto && (
        <SubmissaoForm
          modo="correcao"
          musicaBase={musica}
          onClose={() => setFormularioCorrecaoAberto(false)}
          onSubmit={(dados) =>
            criarSubmissao({ ...dados, tipo: 'correcao', musicaOriginalId: musica.id })
          }
        />
      )}
    </div>
  );
}

function HeaderCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] bg-white/16 px-3 py-1.5 text-center">
      <div className="text-[9px] font-semibold uppercase tracking-[0.16em] opacity-75">
        {label}
      </div>
      <div className="font-mono text-[22px] font-bold leading-none">{value}</div>
    </div>
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
