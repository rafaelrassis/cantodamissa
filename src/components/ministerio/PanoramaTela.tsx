import { MEMBROS } from '../../lib/mockMinisterio';
import type { Repertorio } from '../../lib/repertorios';
import type { Escala, Indisponibilidade } from '../../types/ministerio';

interface Props {
  escalas: Escala[];
  repertorios: Repertorio[];
  indisponibilidades: Indisponibilidade[];
}

export function PanoramaTela({ escalas, repertorios, indisponibilidades }: Props) {
  const totalEscalacoes = escalas.reduce((acc, e) => acc + e.participantes.length, 0);
  const totalConfirmados = escalas.reduce(
    (acc, e) => acc + e.participantes.filter((p) => p.status === 'confirmado').length,
    0
  );
  const totalFaltas = escalas.reduce(
    (acc, e) => acc + e.participantes.filter((p) => p.status === 'recusado').length,
    0
  );
  const membrosEscalados = new Set(escalas.flatMap((e) => e.participantes.map((p) => p.membroId)));
  const pctEscalados = Math.round((membrosEscalados.size / MEMBROS.length) * 100);
  const pctConfirmacao = totalEscalacoes ? Math.round((totalConfirmados / totalEscalacoes) * 100) : 0;

  const musicasCount: Record<string, { title: string; count: number }> = {};
  repertorios.forEach((r) =>
    r.itens.forEach((item) => {
      const atual = musicasCount[item.musicaId] ?? { title: item.title, count: 0 };
      musicasCount[item.musicaId] = { title: atual.title, count: atual.count + 1 };
    })
  );

  return (
    <div className="grid grid-cols-2 gap-3 px-4 py-4">
      <Card titulo="Membros escalados" valor={`${membrosEscalados.size}/${MEMBROS.length}`} sub={`${pctEscalados}%`} />
      <Card titulo="Total de escalações" valor={String(totalEscalacoes)} />
      <Card titulo="Confirmações de presença" valor={`${pctConfirmacao}%`} sub={`${totalConfirmados}/${totalEscalacoes}`} />
      <Card titulo="Faltas" valor={String(totalFaltas)} />
      <Card titulo="Indisponibilidades" valor={String(indisponibilidades.length)} />
      <Card titulo="Escalas cadastradas" valor={String(escalas.length)} />

      <div className="col-span-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Relatório de músicas</p>
        {Object.keys(musicasCount).length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Nenhuma música escalada ainda.</p>
        ) : (
          <ul className="space-y-1.5">
            {Object.entries(musicasCount).map(([id, info]) => (
              <li key={id} className="flex items-center justify-between text-sm">
                <span className="text-[var(--text)]">{info.title}</span>
                <span className="font-semibold text-[var(--accent)]">{info.count}x</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Card({ titulo, valor, sub }: { titulo: string; valor: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-2xl font-extrabold text-[var(--text)]">{valor}</p>
      <p className="mt-1 text-xs font-semibold text-[var(--text)]">{titulo}</p>
      {sub && <p className="text-[10px] text-[var(--muted)]">{sub}</p>}
    </div>
  );
}
