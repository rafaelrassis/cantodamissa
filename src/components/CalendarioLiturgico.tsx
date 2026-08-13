import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronLeft as Back } from 'lucide-react';
import {
  gerarDomingosDoAnoLiturgico,
  domingoMaisProximo,
  type DomingoCalculado,
} from '../lib/liturgicalCalendar';
import { LABEL_TEMPO } from '../lib/labels';
import type { TempoLiturgico } from '../types/musica';

interface Props {
  onBack: () => void;
  onFiltrarTempo?: (tempo: TempoLiturgico) => void;
}

const COR_HEX: Record<DomingoCalculado['corLiturgica'], string> = {
  roxo: '#5b2d90',
  branco: '#c9a227',
  verde: '#186420',
  vermelho: '#a3111d',
  rosa: '#d88bb0',
};

function anoLiturgicoAncoraAtual(): number {
  const hoje = domingoMaisProximo(new Date());
  const anoCivil = new Date().getFullYear();
  // o domingo mais próximo pode pertencer ao ano litúrgico ancorado em
  // anoCivil ou em anoCivil+1 (se já entramos no Advento) — testa os dois
  const candidatoA = gerarDomingosDoAnoLiturgico(anoCivil);
  if (candidatoA.some((d) => d.data.getTime() === hoje.data.getTime())) return anoCivil;
  return anoCivil + 1;
}

function formatarData(data: Date): { dia: string; mes: string } {
  return {
    dia: data.toLocaleDateString('pt-BR', { day: '2-digit' }),
    mes: data.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
  };
}

export function CalendarioLiturgico({ onBack, onFiltrarTempo }: Props) {
  const [anoAncora, setAnoAncora] = useState(anoLiturgicoAncoraAtual);

  const domingos = useMemo(() => gerarDomingosDoAnoLiturgico(anoAncora), [anoAncora]);
  const hoje = useMemo(() => domingoMaisProximo(new Date()), []);
  const ciclo = domingos[0]?.ciclo ?? 'A';

  const labelPeriodo = useMemo(() => {
    if (domingos.length === 0) return '';
    const inicio = domingos[0].data;
    const fim = domingos[domingos.length - 1].data;
    return `${inicio.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })} — ${fim.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}`;
  }, [domingos]);

  return (
    <div className="min-h-screen bg-[var(--bg)] font-sans text-[var(--text)]">
      <header className="bg-[var(--accent)] px-4 py-5 text-[var(--accent-fg)] lg:px-10 lg:pb-6">
        <button onClick={onBack} className="mb-2 flex items-center gap-1 text-xs opacity-80">
          <Back size={14} strokeWidth={2.75} /> Voltar
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[30px]">Calendário Litúrgico</h1>
            <p className="mt-1 text-[14.5px] opacity-85">
              Ano litúrgico {labelPeriodo} · Ciclo {ciclo}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              onClick={() => setAnoAncora((a) => a - 1)}
              aria-label="Ano litúrgico anterior"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-fg)]/20"
            >
              <ChevronLeft size={16} strokeWidth={2.75} />
            </button>
            <button
              onClick={() => setAnoAncora((a) => a + 1)}
              aria-label="Próximo ano litúrgico"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-fg)]/20"
            >
              <ChevronRight size={16} strokeWidth={2.75} />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-4 lg:px-0 lg:py-[24px]">
        {domingos.map((d, i) => {
          const isHoje = d.data.getTime() === hoje.data.getTime();
          const { dia, mes } = formatarData(d.data);
          const primeiroDoMes =
            i === 0 || domingos[i - 1].data.getMonth() !== d.data.getMonth();

          return (
            <div key={d.data.toISOString()}>
              {primeiroDoMes && (
                <p className="mb-3 mt-5 text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--muted)] first:mt-0">
                  {d.data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </p>
              )}
              <button
                onClick={() => onFiltrarTempo?.(d.tempo)}
                className={`flex w-full items-center gap-3.5 rounded-[24px] border px-4 py-3 text-left transition-colors ${
                  isHoje
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                    : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface2)]'
                }`}
                style={{ marginBottom: 8 }}
              >
                <span
                  className="h-[38px] w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: COR_HEX[d.corLiturgica] }}
                  aria-hidden
                />
                <div className="w-11 shrink-0 text-center">
                  <div className="font-mono text-[17px] font-bold leading-none">{dia}</div>
                  <div className="text-[10.5px] uppercase text-[var(--muted)]">{mes}</div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14.5px] font-semibold">
                    {d.nome}
                    {isHoje && (
                      <span className="ml-2 rounded-full bg-[var(--accent)] px-2.5 py-1 text-[11px] font-extrabold text-[var(--accent-fg)]">
                        próximo
                      </span>
                    )}
                  </p>
                  <p className="truncate text-[12.5px] text-[var(--muted)]">
                    {LABEL_TEMPO[d.tempo]}
                    {d.numeroSemana ? ` · ${d.numeroSemana}ª semana` : ''}
                  </p>
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
