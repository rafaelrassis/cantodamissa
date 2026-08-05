import { parseLineToTokens } from '../lib/chordpro';

interface Props {
  line: string;
  fontSize: number;
}

export function ChordLine({ line, fontSize }: Props) {
  if (line.trim() === '') {
    return <div style={{ height: fontSize * 1.4 }} />;
  }

  const tokens = parseLineToTokens(line);

  return (
    <div
      className="whitespace-pre font-mono leading-tight"
      style={{ fontSize, paddingTop: fontSize * 1.15, marginBottom: fontSize * 0.3 }}
    >
      {tokens.map((token, i) => (
        <span key={i} className="relative inline-block align-bottom">
          {token.chord && (
            <span
              className="absolute -top-[1.15em] left-0 font-bold text-brand-green"
              style={{ fontSize: fontSize * 0.85 }}
            >
              {token.chord}
            </span>
          )}
          <span className="text-neutral-900">{token.text || '\u00A0'}</span>
        </span>
      ))}
    </div>
  );
}
