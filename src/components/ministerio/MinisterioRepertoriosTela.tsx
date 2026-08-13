import { useState } from 'react';
import { Plus } from 'lucide-react';
import { formatarDataCurta } from '../../lib/ministerioUtils';
import type { Repertorio } from '../../lib/repertorios';
import type { Escala } from '../../types/ministerio';

interface Props {
  repertorios: Repertorio[];
  escalas: Escala[];
  garantirRepertorioDaEscala: (escalaId: string, nomeEscala: string) => Promise<Repertorio>;
  onAbrirRepertorio: (id: string) => void;
  onIrParaEscalas: () => void;
  souAdmin: boolean;
}

/**
 * Diferente de PainelRepertorios (usado em Home.tsx pro público geral,
 * onde repertório avulso faz sentido): aqui, dentro do Ministério, todo
 * repertório precisa nascer vinculado a uma Escala existente — "criar"
 * é escolher o evento, não digitar um nome. Reaproveita
 * garantirRepertorioDaEscala (mesma função usada na aba Músicas de
 * EscalaDetalheTela — 1 escala = 1 repertório), então abrir o
 * repertório de um evento aqui ou por lá dá sempre no mesmo registro.
 */
export function MinisterioRepertoriosTela({
  repertorios,
  escalas,
  garantirRepertorioDaEscala,
  onAbrirRepertorio,
  onIrParaEscalas,
  souAdmin,
}: Props) {
  const [escolhendoEvento, setEscolhendoEvento] = useState(false);
  const [criandoParaId, setCriandoParaId] = useState<string | null>(null);
  const [verTudoEventos, setVerTudoEventos] = useState(false);

  const comRepertorio = escalas
    .map((escala) => ({ escala, repertorio: repertorios.find((r) => r.escalaId === escala.id) ?? null }))
    .filter((x): x is { escala: Escala; repertorio: Repertorio } => x.repertorio !== null)
    .sort((a, b) => b.escala.data.localeCompare(a.escala.data));

  const semRepertorioCompleto = escalas
    .filter((e) => !repertorios.some((r) => r.escalaId === e.id))
    .sort((a, b) => a.data.localeCompare(b.data));
  const semRepertorio = verTudoEventos ? semRepertorioCompleto : semRepertorioCompleto.slice(0, 10);
  const restantesEventos = semRepertorioCompleto.length - semRepertorio.length;

  async function criarPara(escala: Escala) {
    setCriandoParaId(escala.id);
    try {
      const rep = await garantirRepertorioDaEscala(escala.id, escala.titulo);
      setEscolhendoEvento(false);
      onAbrirRepertorio(rep.id);
    } catch (err) {
      console.error('criarPara (criar repertório da escala):', err);
      alert('Não deu pra criar o repertório desse evento. Veja o console.');
    } finally {
      setCriandoParaId(null);
    }
  }

  return (
    <div className="flex flex-col gap-3 p-5">
      {comRepertorio.length === 0 && (
        <div className="rounded-[20px] bg-[var(--accent-soft)] px-4 py-[13px] text-[12.5px] leading-[1.45] text-[#4d5648]">
          Nenhum repertório ainda. Todo repertório aqui é vinculado a um evento — crie um abaixo.
        </div>
      )}

      {comRepertorio.map(({ escala, repertorio }) => (
        <button
          key={repertorio.id}
          onClick={() => onAbrirRepertorio(repertorio.id)}
          className="flex w-full items-center gap-3 rounded-[20px] border border-[var(--border)] px-4 py-3 text-left transition hover:bg-[var(--surface)]"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[var(--accent-soft)] font-mono text-sm font-bold text-brand-green-dark">
            {repertorio.itens.length}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--text)]">{escala.titulo}</p>
            <p className="truncate text-xs text-[var(--muted)]">
              {formatarDataCurta(escala.data)} · {repertorio.itens.length} música
              {repertorio.itens.length === 1 ? '' : 's'} · {repertorio.ritos.length} rito
              {repertorio.ritos.length === 1 ? '' : 's'}
            </p>
          </div>
        </button>
      ))}

      {!souAdmin ? null : escalas.length === 0 ? (
        <button
          onClick={onIrParaEscalas}
          className="rounded-full border border-dashed border-[var(--border)] px-4 py-3 text-center text-sm font-bold text-[var(--accent)]"
        >
          Crie um evento primeiro, na aba Escalas
        </button>
      ) : semRepertorioCompleto.length === 0 ? (
        <div className="rounded-[20px] bg-[var(--accent-soft)] px-4 py-[13px] text-[12.5px] leading-[1.45] text-[#4d5648]">
          Todos os eventos já têm repertório.
        </div>
      ) : !escolhendoEvento ? (
        <button
          onClick={() => setEscolhendoEvento(true)}
          className="flex items-center justify-center gap-2 rounded-full border border-dashed border-[var(--border)] py-3 text-sm font-bold text-[var(--accent)]"
        >
          <Plus size={16} strokeWidth={2.75} /> Criar repertório de um evento
        </button>
      ) : (
        <div className="rounded-[20px] border border-[var(--border)] p-[10px]">
          <p className="mb-1.5 px-2 pt-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-[var(--muted)]">
            Escolha o evento
          </p>
          <ul className="flex flex-col gap-1">
            {semRepertorio.map((e) => (
              <li key={e.id}>
                <button
                  onClick={() => criarPara(e)}
                  disabled={criandoParaId === e.id}
                  className="flex w-full items-center gap-3 rounded-[16px] px-2 py-[9px] text-left hover:bg-[var(--surface)] disabled:opacity-50"
                >
                  <span className="flex-1 truncate text-sm font-medium text-[var(--text)]">{e.titulo}</span>
                  <span className="shrink-0 text-xs text-[var(--muted)]">{formatarDataCurta(e.data)}</span>
                </button>
              </li>
            ))}
            {restantesEventos > 0 && (
              <li>
                <button
                  onClick={() => setVerTudoEventos(true)}
                  className="w-full rounded-[16px] py-[9px] text-center text-xs font-bold text-[var(--accent)]"
                >
                  Ver mais {restantesEventos}
                </button>
              </li>
            )}
          </ul>
          <button
            onClick={() => {
              setEscolhendoEvento(false);
              setVerTudoEventos(false);
            }}
            className="mt-1 w-full rounded-[16px] py-2 text-center text-xs text-[var(--muted)]"
          >
            Cancelar
          </button>
        </div>
      )}

      <div className="rounded-[20px] bg-[var(--accent-soft)] px-4 py-[13px] text-[12.5px] leading-[1.45] text-[#4d5648]">
        Monte o repertório da missa por rito e compartilhe com o ministério.
      </div>
    </div>
  );
}
