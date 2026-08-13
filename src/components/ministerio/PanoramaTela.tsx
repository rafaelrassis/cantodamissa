import type { Repertorio } from '../../lib/repertorios';
import type { Escala, Indisponibilidade } from '../../types/ministerio';

interface Props {
  escalas: Escala[];
  repertorios: Repertorio[];
  indisponibilidades: Indisponibilidade[];
  totalMembros: number;
}

export function PanoramaTela({ escalas, repertorios, indisponibilidades, totalMembros }: Props) {
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
  const pctEscalados = totalMembros ? Math.round((membrosEscalados.size / totalMembros) * 100) : 0;
  const pctConfirmacao = totalEscalacoes ? Math.round((totalConfirmados / totalEscalacoes) * 100) : 0;

  const musicasCount: Record<string, { title: string; count: number }> = {};
  repertorios.forEach((r) =>
    r.itens.forEach((item) => {
      const atual = musicasCount[item.musicaId] ?? { title: item.title, count: 0 };
      musicasCount[item.musicaId] = { title: atual.title, count: atual.count + 1 };
    })
  );

  return (
    <div className="px-4 py-4 lg:px-8 lg:py-6">
      <div className="grid grid-cols-3 gap-[10px]">
        <Card titulo="Membros escalados" valor={`${membrosEscalados.size}/${totalMembros}`} sub={`${pctEscalados}%`} />
        <Card titulo="Total de escalações" valor={String(totalEscalacoes)} />
        <Card titulo="Confirmações" valor={`${pctConfirmacao}%`} sub={`${totalConfirmados}/${totalEscalacoes}`} />
        <Card titulo="Faltas" valor={String(totalFaltas)} />
        <Card titulo="Indisponibilidades" valor={String(indisponibilidades.length)} />
        <Card titulo="Escalas cadastradas" valor={String(escalas.length)} />
      </div>

      <div className="mt-3 rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-4">
        <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--muted)]">
          Relatório de músicas
        </p>
        {Object.keys(musicasCount).length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Nenhuma música escalada ainda.</p>
        ) : (
          <ul className="flex flex-col">
            {Object.entries(musicasCount).map(([id, info]) => (
              <li key={id} className="flex items-center justify-between py-[5px] text-sm">
                <span className="text-[var(--text)]">{info.title}</span>
                <span className="font-bold text-[var(--accent)]">{info.count}x</span>
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
    <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="font-display text-[26px] leading-[1.1] text-[var(--text)]">{valor}</p>
      <p className="mt-1.5 text-xs font-semibold leading-[1.3] text-[var(--text)]">{titulo}</p>
      {sub && <p className="mt-px text-[10.5px] text-[var(--muted)]">{sub}</p>}
    </div>
  );
}
