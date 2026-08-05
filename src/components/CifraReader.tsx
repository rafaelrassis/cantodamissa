import { useMemo, useRef, useState } from 'react';
import type { Musica } from '../types/musica';
import { transposeContent } from '../lib/chordpro';
import { useAutoScroll } from '../lib/useAutoScroll';
import { useKeepAwake } from '../lib/useKeepAwake';
import { ChordLine } from './ChordLine';

const MIN_FONT = 14;
const MAX_FONT = 32;
const DEFAULT_FONT = 20;

interface Props {
  musica: Musica;
  onClose?: () => void;
}

export function CifraReader({ musica, onClose }: Props) {
  const [semitones, setSemitones] = useState(0);
  const [fontSize, setFontSize] = useState(DEFAULT_FONT);
  const [useFlats, setUseFlats] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const autoScroll = useAutoScroll(scrollRef);
  const keepAwake = useKeepAwake();

  const currentTone = useMemo(() => {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const base = notes.indexOf(musica.originalTone);
    if (base === -1) return musica.originalTone;
    return notes[((base + semitones) % 12 + 12) % 12];
  }, [musica.originalTone, semitones]);

  const transposedContent = useMemo(
    () => transposeContent(musica.chordsContent, semitones, useFlats),
    [musica.chordsContent, semitones, useFlats]
  );

  const lines = transposedContent.split('\n');

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      {/* Header: título, artista, tom */}
      <header className="flex items-center justify-between gap-3 border-b border-neutral-200 bg-brand-green px-4 py-3 text-white">
        <div className="min-w-0">
          {onClose && (
            <button
              onClick={onClose}
              className="mb-1 text-xs text-white/70 hover:text-white"
            >
              ← voltar
            </button>
          )}
          <h1 className="truncate text-lg font-semibold leading-tight">
            {musica.title}
          </h1>
          {musica.artist && (
            <p className="truncate text-sm text-white/80">{musica.artist}</p>
          )}
        </div>
        <div className="shrink-0 rounded-md bg-white/15 px-3 py-1 text-center">
          <div className="text-[10px] uppercase tracking-wide text-white/70">
            tom
          </div>
          <div className="font-mono text-lg font-bold leading-none">
            {currentTone}
          </div>
        </div>
      </header>

      {/* Toolbar de controles: fixa, não cobre a área de leitura */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-neutral-200 bg-white/95 px-3 py-2 backdrop-blur">
        {/* Transposição */}
        <div className="flex items-center gap-1 rounded-lg border border-neutral-200 p-1">
          <button
            aria-label="Diminuir tom"
            onClick={() => setSemitones((s) => s - 1)}
            className="h-8 w-8 rounded-md text-lg font-bold text-brand-green hover:bg-brand-green-light"
          >
            −
          </button>
          <span className="w-10 text-center font-mono text-sm text-neutral-600">
            {semitones > 0 ? `+${semitones}` : semitones}
          </span>
          <button
            aria-label="Aumentar tom"
            onClick={() => setSemitones((s) => s + 1)}
            className="h-8 w-8 rounded-md text-lg font-bold text-brand-green hover:bg-brand-green-light"
          >
            +
          </button>
        </div>

        <button
          onClick={() => setUseFlats((f) => !f)}
          className="rounded-lg border border-neutral-200 px-2 py-1.5 font-mono text-xs text-neutral-600 hover:bg-neutral-50"
          title="Alternar sustenido/bemol"
        >
          {useFlats ? '♭ bemol' : '♯ sustenido'}
        </button>

        {/* Fonte */}
        <div className="flex items-center gap-1 rounded-lg border border-neutral-200 p-1">
          <button
            aria-label="Diminuir fonte"
            onClick={() => setFontSize((f) => Math.max(MIN_FONT, f - 2))}
            className="h-8 w-8 rounded-md text-sm text-neutral-600 hover:bg-neutral-50"
          >
            A-
          </button>
          <button
            aria-label="Aumentar fonte"
            onClick={() => setFontSize((f) => Math.min(MAX_FONT, f + 2))}
            className="h-8 w-8 rounded-md text-base text-neutral-600 hover:bg-neutral-50"
          >
            A+
          </button>
        </div>

        {/* Auto-scroll */}
        <div className="flex items-center gap-1 rounded-lg border border-neutral-200 p-1">
          <button
            onClick={autoScroll.toggle}
            className={`h-8 rounded-md px-3 text-sm font-medium ${
              autoScroll.playing
                ? 'bg-brand-green text-white'
                : 'text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            {autoScroll.playing ? '⏸ pausar' : '▶ rolar'}
          </button>
          <button
            aria-label="Diminuir velocidade"
            onClick={autoScroll.decreaseSpeed}
            className="h-8 w-7 rounded-md text-neutral-500 hover:bg-neutral-50"
          >
            −
          </button>
          <span className="w-4 text-center text-xs text-neutral-500">
            {autoScroll.speed}
          </span>
          <button
            aria-label="Aumentar velocidade"
            onClick={autoScroll.increaseSpeed}
            className="h-8 w-7 rounded-md text-neutral-500 hover:bg-neutral-50"
          >
            +
          </button>
        </div>

        {/* Keep awake */}
        {keepAwake.supported && (
          <button
            onClick={keepAwake.toggle}
            title="Manter tela acesa"
            className={`h-8 rounded-lg border px-2 text-sm ${
              keepAwake.active
                ? 'border-brand-green bg-brand-green-light text-brand-green'
                : 'border-neutral-200 text-neutral-500 hover:bg-neutral-50'
            }`}
          >
            {keepAwake.active ? '🔆 tela acesa' : '🔅 tela'}
          </button>
        )}

        {musica.youtubeUrl && (
          <button
            onClick={() => setShowVideo((v) => !v)}
            className="ml-auto h-8 rounded-lg border border-neutral-200 px-2 text-sm text-neutral-500 hover:bg-neutral-50"
          >
            {showVideo ? 'ocultar vídeo' : '▶ vídeo'}
          </button>
        )}
      </div>

      {showVideo && musica.youtubeUrl && (
        <div className="aspect-video w-full border-b border-neutral-200 bg-black">
          <iframe
            className="h-full w-full"
            src={toYoutubeEmbed(musica.youtubeUrl)}
            title="Vídeo de referência"
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
        </div>
      )}

      {/* Área de leitura: rolagem automática + padding pra não ficar embaixo do slot de anúncio */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 pb-20">
        {lines.map((line, i) => (
          <ChordLine key={i} line={line} fontSize={fontSize} />
        ))}
      </div>

      {/* Slot de anúncio: some no modo leitor pra não atrapalhar o auto-scroll */}
    </div>
  );
}

function toYoutubeEmbed(url: string): string {
  const match = url.match(/(?:v=|youtu\.be\/)([\w-]+)/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : url;
}
