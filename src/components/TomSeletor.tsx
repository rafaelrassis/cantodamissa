import { RotateCcw, X } from 'lucide-react';
import { gerarOpcoesDeTom, semitonesEntreAcordes } from '../lib/chordpro';

interface Props {
  originalTone: string;
  currentTone: string;
  useFlats: boolean;
  onSelecionarTom: (semitones: number) => void;
  onMeioTom: (direcao: 1 | -1) => void;
  onResetar: () => void;
  onClose: () => void;
}

/**
 * Seletor de tom completo — grade com as 12 opções (mesma qualidade do tom
 * original: só maiores ou só menores, conforme a música), botões de meio
 * tom, e reset pro tom original. Renderizado como popover ancorado perto
 * de onde foi aberto (mobile: cabeçalho; desktop: sidebar de ferramentas).
 */
export function TomSeletor({
  originalTone,
  currentTone,
  useFlats,
  onSelecionarTom,
  onMeioTom,
  onResetar,
  onClose,
}: Props) {
  const opcoes = gerarOpcoesDeTom(originalTone, useFlats);

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-3 shadow-[var(--shadow)]"
    >
      <div className="mb-2 flex items-center gap-2">
        <button
          onClick={onResetar}
          aria-label="Voltar ao tom original"
          title="Tom original"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"
        >
          <RotateCcw size={16} />
        </button>
        <button
          onClick={() => onMeioTom(-1)}
          className="h-10 flex-1 rounded-xl bg-[var(--surface)] text-sm font-semibold text-[var(--text)]"
        >
          − 1/2 tom
        </button>
        <button
          onClick={() => onMeioTom(1)}
          className="h-10 flex-1 rounded-xl bg-[var(--surface)] text-sm font-semibold text-[var(--text)]"
        >
          + 1/2 tom
        </button>
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--muted)]"
        >
          <X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-6 gap-1.5">
        {opcoes.map((tom) => {
          const ativo = tom === currentTone;
          const original = tom === originalTone;
          return (
            <button
              key={tom}
              onClick={() => onSelecionarTom(semitonesEntreAcordes(originalTone, tom))}
              className={`rounded-lg py-2 text-sm font-semibold ${
                ativo
                  ? 'bg-white text-black'
                  : original
                    ? 'bg-[var(--surface)] text-[var(--text)] ring-2 ring-inset ring-[var(--text)] hover:bg-[var(--surface2)]'
                    : 'bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface2)]'
              }`}
            >
              {tom}
            </button>
          );
        })}
      </div>
    </div>
  );
}
