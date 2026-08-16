import type { StructuredLine } from '../lib/chordpro';

interface Props {
  line: StructuredLine;
  /** No modo letra, esconde tudo que é só acorde: progressões
   * instrumentais somem por completo, e o acorde acima da sílaba não é
   * renderizado (só o texto). */
  modoLetra?: boolean;
}

/**
 * Renderiza uma linha de cifra estruturada. O acorde é um span
 * `position:absolute` ancorado sobre o token de texto — não duas linhas de
 * texto separadas — pra cair exatamente sobre a sílaba certa mesmo depois
 * de transpor. O tamanho da fonte vem do container pai (classe
 * `cifra-content`, ver index.css), então tudo aqui usa unidades `em`.
 */
export function ChordLine({ line, modoLetra = false }: Props) {
  if (line.type === 'section') {
    return (
      <div className="pt-[0.8em] font-sans text-[0.6em] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
        {line.label}
      </div>
    );
  }

  if (line.type === 'blank') {
    return <div>{' '}</div>;
  }

  // progressão de acordes sem letra (ex: intro/ponte) — não tem sílaba pra
  // ancorar; no modo letra é só acorde puro, então não faz sentido exibir
  if (line.type === 'chord-progression') {
    if (modoLetra) return null;
    return (
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 pb-[0.3em] pt-[0.5em]">
        {line.label && (
          <span className="font-sans text-[0.6em] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
            {line.label}
          </span>
        )}
        {line.chords.map((chord, i) => (
          <span key={i} className="font-bold text-[var(--chord)]">
            {chord}
          </span>
        ))}
      </div>
    );
  }

  if (line.tokens.length === 0) {
    return <div>{' '}</div>;
  }

  return (
    <div className="relative whitespace-pre-wrap break-words">
      {line.tokens.map((token, i) => (
        <span key={i} className="relative inline-block align-bottom">
          {token.chord && !modoLetra && (
            <span className="absolute -top-[1.05em] left-0 text-[0.82em] font-bold text-[var(--chord)]">
              {token.chord}
            </span>
          )}
          <span>{token.text || ' '}</span>
        </span>
      ))}
    </div>
  );
}
