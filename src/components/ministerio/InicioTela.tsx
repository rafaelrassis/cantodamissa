import { Bell, CalendarDays, Cake, Check, ChevronRight, Megaphone, Music2, Users, X } from 'lucide-react';
import { formatarDataCurta } from '../../lib/ministerioUtils';
import type { Repertorio } from '../../lib/repertorios';
import type { Aviso, Escala, MembroMinisterio, SolicitacaoIngresso } from '../../types/ministerio';

interface Props {
  nomeMinisterio: string;
  membros: MembroMinisterio[];
  escalas: Escala[];
  repertorios: Repertorio[];
  avisos: Aviso[];
  souAdmin: boolean;
  solicitacoes: SolicitacaoIngresso[];
  onAprovarSolicitacao: (s: SolicitacaoIngresso) => void;
  onRecusarSolicitacao: (id: string) => void;
  onAbrirEscala: (id: string) => void;
  onVerEscalas: () => void;
  onVerAvisos: () => void;
}

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export function InicioTela({
  nomeMinisterio,
  membros,
  escalas,
  repertorios,
  avisos,
  souAdmin,
  solicitacoes,
  onAprovarSolicitacao,
  onRecusarSolicitacao,
  onAbrirEscala,
  onVerEscalas,
  onVerAvisos,
}: Props) {
  const hoje = new Date();
  const hojeISO = hoje.toISOString().slice(0, 10);
  const mesAtual = hoje.getMonth();

  const avisosDestaque = avisos.filter((a) => a.emDestaque && !a.arquivado);
  const proximasEscalas = escalas
    .filter((e) => e.data >= hojeISO)
    .sort((a, b) => a.data.localeCompare(b.data))
    .slice(0, 3);
  const totalMusicas = new Set(repertorios.flatMap((r) => r.itens.map((i) => i.musicaId))).size;
  const aniversariantes = membros
    .filter((m) => m.aniversario && new Date(m.aniversario + 'T00:00:00').getMonth() === mesAtual)
    .sort((a, b) => new Date(a.aniversario!).getDate() - new Date(b.aniversario!).getDate());

  return (
    <div className="px-4 py-5 md:px-10">
      <div className="rounded-2xl bg-[var(--accent)] p-4 text-[var(--accent-fg)]">
        <p className="text-base font-bold">{nomeMinisterio}</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <StatChip icon={<CalendarDays size={14} />} valor={`${escalas.filter((e) => e.publicada).length}/${escalas.length}`} label="escalas" />
          <StatChip icon={<Music2 size={14} />} valor={String(totalMusicas)} label="músicas" />
          <StatChip icon={<Users size={14} />} valor={String(membros.length)} label="membros" />
        </div>
      </div>

      {souAdmin && solicitacoes.length > 0 && (
        <div className="mt-4 rounded-2xl border border-[var(--accent)]/40 bg-[var(--accent)]/10 p-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[var(--accent)]">
            <Bell size={13} /> Solicitações pendentes ({solicitacoes.length})
          </p>
          {solicitacoes.map((s) => (
            <div key={s.id} className="flex items-center justify-between py-1.5 text-sm">
              <span>{s.nome}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => onAprovarSolicitacao(s)}
                  className="rounded-full bg-[var(--accent)] p-1.5 text-[var(--accent-fg)]"
                  aria-label="Aprovar"
                >
                  <Check size={14} />
                </button>
                <button
                  onClick={() => onRecusarSolicitacao(s.id)}
                  className="rounded-full bg-[var(--border)] p-1.5 text-[var(--muted)]"
                  aria-label="Recusar"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Secao titulo="Avisos em destaque" contagem={`${avisosDestaque.length}`} onVerTodos={onVerAvisos}>
        {avisosDestaque.length === 0 ? (
          <ItemVazio icon={<Megaphone size={20} />} texto="Nenhum aviso em destaque no momento." />
        ) : (
          avisosDestaque.map((a) => (
            <li key={a.id} className="flex items-center gap-3 px-3 py-3">
              <Megaphone size={16} className="shrink-0 text-[var(--accent)]" />
              <span className="truncate text-sm">{a.titulo}</span>
            </li>
          ))
        )}
      </Secao>

      <Secao titulo="Próximas escalas" contagem={`${proximasEscalas.length}`} onVerTodos={onVerEscalas}>
        {proximasEscalas.length === 0 ? (
          <ItemVazio icon={<CalendarDays size={20} />} texto="Você ainda não está em nenhuma escala futura." />
        ) : (
          proximasEscalas.map((e) => (
            <li key={e.id}>
              <button
                onClick={() => onAbrirEscala(e.id)}
                className="flex w-full items-center gap-3 px-3 py-3 text-left"
              >
                <CalendarDays size={16} className="shrink-0 text-[var(--accent)]" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{e.titulo}</span>
                  <span className="block text-xs text-[var(--muted)]">
                    {formatarDataCurta(e.data)} · {e.hora}
                  </span>
                </span>
                <ChevronRight size={14} className="shrink-0 text-[var(--muted)]" />
              </button>
            </li>
          ))
        )}
      </Secao>

      <Secao titulo={`Aniversariantes de ${MESES[mesAtual]}`} contagem={`${aniversariantes.length}`}>
        {aniversariantes.length === 0 ? (
          <ItemVazio icon={<Cake size={20} />} texto="Ninguém faz aniversário este mês." />
        ) : (
          aniversariantes.map((m) => (
            <li key={m.id} className="flex items-center gap-3 px-3 py-3">
              <Cake size={16} className="shrink-0 text-[var(--accent)]" />
              <span className="flex-1 truncate text-sm">{m.nome}</span>
              <span className="text-xs text-[var(--muted)]">
                {new Date(m.aniversario! + 'T00:00:00').getDate().toString().padStart(2, '0')}/
                {(mesAtual + 1).toString().padStart(2, '0')}
              </span>
            </li>
          ))
        )}
      </Secao>
    </div>
  );
}

function StatChip({ icon, valor, label }: { icon: React.ReactNode; valor: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-xl bg-white/10 py-2">
      <span className="flex items-center gap-1 text-sm font-bold">
        {icon} {valor}
      </span>
      <span className="text-[10px] uppercase tracking-wide opacity-70">{label}</span>
    </div>
  );
}

function Secao({
  titulo,
  contagem,
  onVerTodos,
  children,
}: {
  titulo: string;
  contagem: string;
  onVerTodos?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-[var(--text)]">
          {titulo}
          <span className="rounded-full bg-[var(--surface)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--muted)]">{contagem}</span>
        </h2>
        {onVerTodos && (
          <button onClick={onVerTodos} className="flex items-center gap-0.5 text-xs font-semibold text-[var(--accent)]">
            Ver todos <ChevronRight size={12} />
          </button>
        )}
      </div>
      <ul className="mt-2 divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        {children}
      </ul>
    </div>
  );
}

function ItemVazio({ icon, texto }: { icon: React.ReactNode; texto: string }) {
  return (
    <li className="flex flex-col items-center gap-2 px-4 py-6 text-center">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
        {icon}
      </span>
      <span className="text-xs text-[var(--muted)]">{texto}</span>
    </li>
  );
}
