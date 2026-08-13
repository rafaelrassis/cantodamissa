import { Bell, CalendarDays, Cake, ChevronRight, Megaphone, Music2, Users } from 'lucide-react';
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
    <div className="px-4 py-5 lg:px-8 lg:py-6">
      <div className="rounded-[24px] bg-[var(--accent)] p-4 text-[var(--accent-fg)] lg:p-5">
        <p className="text-base font-bold">{nomeMinisterio}</p>
        <div className="mt-2 flex items-center gap-4 text-xs opacity-90">
          <span className="flex items-center gap-1.5">
            <CalendarDays size={14} strokeWidth={2.75} /> {escalas.filter((e) => e.publicada).length}/{escalas.length}
          </span>
          <span className="flex items-center gap-1.5">
            <Music2 size={14} strokeWidth={2.75} /> {totalMusicas}
          </span>
          <span className="flex items-center gap-1.5">
            <Users size={14} strokeWidth={2.75} /> {membros.length}
          </span>
        </div>
      </div>

      {souAdmin && solicitacoes.length > 0 && (
        <div className="mt-4 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-[18px]">
          <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
            <Bell size={13} strokeWidth={2.75} /> Solicitações pendentes ({solicitacoes.length})
          </p>
          <div className="divide-y divide-[var(--border)]">
            {solicitacoes.map((s) => (
              <div key={s.id} className="flex items-center gap-3 py-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-bold text-[var(--accent-fg)]">
                  {s.nome[0]}
                </span>
                <span className="flex-1 truncate text-sm font-semibold text-[var(--text)]">{s.nome}</span>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => onAprovarSolicitacao(s)}
                    className="rounded-full bg-[var(--accent)] px-4 py-1.5 text-xs font-bold text-[var(--accent-fg)]"
                  >
                    Aprovar
                  </button>
                  <button
                    onClick={() => onRecusarSolicitacao(s.id)}
                    className="rounded-full border border-[var(--border)] bg-[var(--bg)] px-4 py-1.5 text-xs font-bold text-[var(--muted)]"
                  >
                    Recusar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="lg:grid lg:grid-cols-2 lg:gap-6">
        <Secao titulo="Próximas escalas" contagem={`${proximasEscalas.length}`} subtitulo="Minhas escalas" onVerTodos={onVerEscalas}>
          {proximasEscalas.length === 0 ? (
            <ItemVazio icon={<CalendarDays size={16} strokeWidth={2.75} />} />
          ) : (
            proximasEscalas.map((e) => (
              <li key={e.id}>
                <button
                  onClick={() => onAbrirEscala(e.id)}
                  className="flex w-full items-center gap-3 rounded-[20px] border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-left"
                >
                  <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-2xl bg-[var(--accent)] text-[var(--accent-fg)]">
                    <span className="text-[10px] font-bold uppercase leading-none">
                      {formatarDataCurta(e.data).split(' ')[1]}
                    </span>
                    <span className="text-[15px] font-extrabold leading-tight">
                      {formatarDataCurta(e.data).split(' ')[0]}
                    </span>
                  </div>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[var(--text)]">{e.titulo}</span>
                    <span className="block truncate text-xs text-[var(--muted)]">
                      {formatarDataCurta(e.data)} · {e.hora}
                    </span>
                  </span>
                  <ChevronRight size={14} strokeWidth={2.75} className="shrink-0 text-[var(--muted)]" />
                </button>
              </li>
            ))
          )}
        </Secao>

        <Secao titulo="Avisos" contagem={`${avisosDestaque.length}`} subtitulo="Em destaque" onVerTodos={onVerAvisos}>
          {avisosDestaque.length === 0 ? (
            <ItemVazio icon={<Megaphone size={16} strokeWidth={2.75} />} />
          ) : (
            avisosDestaque.map((a) => (
              <li key={a.id} className="flex items-start gap-3 rounded-[20px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                  <Megaphone size={16} strokeWidth={2.75} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-[var(--text)]">{a.titulo}</span>
                  <span className="mt-0.5 block truncate text-xs text-[var(--muted)]">{a.descricao}</span>
                </span>
              </li>
            ))
          )}
        </Secao>
      </div>

      <Secao titulo="Aniversariantes" contagem={`${aniversariantes.length}`} subtitulo={MESES[mesAtual]}>
        {aniversariantes.length === 0 ? (
          <ItemVazio icon={<Cake size={16} strokeWidth={2.75} />} />
        ) : (
          aniversariantes.map((m) => (
            <li key={m.id} className="flex items-center gap-3 rounded-[20px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${m.avatarCor}`}
              >
                {m.nome[0]}
              </span>
              <span className="flex-1 truncate text-sm font-semibold text-[var(--text)]">{m.nome}</span>
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

function Secao({
  titulo,
  contagem,
  subtitulo,
  onVerTodos,
  children,
}: {
  titulo: string;
  contagem: string;
  subtitulo: string;
  onVerTodos?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-6">
      <div className="flex items-baseline justify-between">
        <h3 className="text-[19px]">
          {titulo} <span className="align-middle text-xs font-semibold text-[var(--muted)]">({contagem})</span>
        </h3>
        {onVerTodos && (
          <button onClick={onVerTodos} className="flex items-center gap-0.5 text-[13px] font-semibold text-[var(--accent)]">
            Ver todos <ChevronRight size={12} strokeWidth={2.75} />
          </button>
        )}
      </div>
      <p className="mt-0.5 text-xs text-[var(--muted)]">{subtitulo}</p>
      <ul className="mt-2.5 flex flex-col gap-2">
        {children}
      </ul>
    </div>
  );
}

function ItemVazio({ icon }: { icon: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 rounded-[20px] border border-dashed border-[var(--border)] px-4 py-4">
      <span className="shrink-0 text-[var(--muted)]">{icon}</span>
      <span className="text-sm text-[var(--muted)]">Lista vazia.</span>
    </li>
  );
}
