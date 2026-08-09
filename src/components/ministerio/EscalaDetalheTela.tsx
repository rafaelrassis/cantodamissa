import { useState } from 'react';
import { ChevronLeft, Clock, Info, ListMusic, Plus, Trash2, Users } from 'lucide-react';
import { FUNCOES, MEMBROS, formatarDataLonga } from '../../lib/mockMinisterio';
import type { Escala, StatusConfirmacao } from '../../types/ministerio';

interface Props {
  escala: Escala;
  onBack: () => void;
  onAtualizar: (escala: Escala) => void;
}

const STATUS_LABEL: Record<StatusConfirmacao, { texto: string; cor: string }> = {
  confirmado: { texto: 'Confirmado', cor: 'text-emerald-500' },
  pendente: { texto: 'Pendente', cor: 'text-amber-500' },
  recusado: { texto: 'Recusado', cor: 'text-rose-500' },
};

export function EscalaDetalheTela({ escala, onBack, onAtualizar }: Props) {
  const [aba, setAba] = useState<'detalhes' | 'participantes' | 'musicas' | 'roteiro'>('detalhes');

  function confirmarMinhaPresenca(status: StatusConfirmacao) {
    // "Você" == m1 no mock — na versão real viria do usuário logado.
    const participantes = escala.participantes.map((p) =>
      p.membroId === 'm1' ? { ...p, status } : p
    );
    onAtualizar({ ...escala, participantes });
  }

  const minhaParticipacao = escala.participantes.find((p) => p.membroId === 'm1');

  return (
    <div className="min-h-screen bg-[var(--bg)] font-sans text-[var(--text)]">
      <header className="bg-[var(--accent)] px-4 py-4 text-[var(--accent-fg)] lg:px-10">
        <button onClick={onBack} className="mb-2 flex items-center gap-1 text-xs opacity-80">
          <ChevronLeft size={14} /> Voltar
        </button>
        <h1 className="text-xl font-extrabold tracking-tight">{escala.titulo}</h1>
        <p className="mt-0.5 text-sm capitalize opacity-80">
          {formatarDataLonga(escala.data)} · {escala.hora}
        </p>
      </header>

      <div className="mx-auto max-w-2xl">
        <div className="flex border-b border-[var(--border)] px-2">
          <AbaBtn icon={<Info size={14} />} label="Detalhes" active={aba === 'detalhes'} onClick={() => setAba('detalhes')} />
          <AbaBtn
            icon={<Users size={14} />}
            label={`Participantes (${escala.participantes.length})`}
            active={aba === 'participantes'}
            onClick={() => setAba('participantes')}
          />
          <AbaBtn
            icon={<ListMusic size={14} />}
            label={`Músicas (${escala.musicas.length})`}
            active={aba === 'musicas'}
            onClick={() => setAba('musicas')}
          />
          <AbaBtn
            icon={<Clock size={14} />}
            label={`Roteiro (${escala.roteiro.length})`}
            active={aba === 'roteiro'}
            onClick={() => setAba('roteiro')}
          />
        </div>

        {aba === 'detalhes' && (
          <div className="space-y-3 p-4">
            {minhaParticipacao && (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <p className="mb-2 text-sm font-semibold text-[var(--text)]">Sua presença</p>
                <p className={`mb-3 text-xs font-semibold ${STATUS_LABEL[minhaParticipacao.status].cor}`}>
                  Status atual: {STATUS_LABEL[minhaParticipacao.status].texto}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => confirmarMinhaPresenca('confirmado')}
                    className="flex-1 rounded-lg bg-[var(--accent)] py-2 text-xs font-semibold text-[var(--accent-fg)]"
                  >
                    Confirmar presença
                  </button>
                  <button
                    onClick={() => confirmarMinhaPresenca('recusado')}
                    className="flex-1 rounded-lg border border-[var(--border)] py-2 text-xs font-semibold text-[var(--muted)]"
                  >
                    Não poderei ir
                  </button>
                </div>
              </div>
            )}

            <InfoRow label="Observações" valor={escala.observacoes || '—'} />
            <InfoRow
              label="Visibilidade"
              valor={escala.publicada ? 'Publicada, visível para todos os membros' : 'Rascunho'}
            />
            <InfoRow
              label="Confirmação de presença"
              valor={escala.solicitarConfirmacao ? 'Solicitada aos participantes' : 'Não solicitada'}
            />
          </div>
        )}

        {aba === 'participantes' && (
          <ul className="divide-y divide-[var(--border)]">
            {escala.participantes.map((p) => {
              const membro = MEMBROS.find((m) => m.id === p.membroId);
              const funcao = FUNCOES.find((f) => f.id === p.funcaoId);
              if (!membro) return null;
              return (
                <li key={p.membroId} className="flex items-center gap-3 px-4 py-3">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${membro.avatarCor}`}
                  >
                    {membro.nome[0]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--text)]">{membro.nome}</p>
                    <p className="truncate text-xs text-[var(--muted)]">
                      {funcao?.icone} {funcao?.nome}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold ${STATUS_LABEL[p.status].cor}`}>
                    {STATUS_LABEL[p.status].texto}
                  </span>
                </li>
              );
            })}
            <li className="p-4">
              <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border)] py-3 text-sm font-semibold text-[var(--accent)]">
                <Plus size={16} /> Adicionar participante
              </button>
            </li>
          </ul>
        )}

        {aba === 'musicas' && (
          <ul className="divide-y divide-[var(--border)]">
            {escala.musicas.map((m, idx) => (
              <li key={idx} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--text)]">Bondade de Deus</p>
                  <p className="text-xs text-[var(--muted)]">
                    {m.momento} · Tom: {m.tom}
                  </p>
                </div>
                <Trash2 size={14} className="text-[var(--muted)]" />
              </li>
            ))}
            <li className="p-4">
              <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border)] py-3 text-sm font-semibold text-[var(--accent)]">
                <Plus size={16} /> Adicionar música do repertório
              </button>
            </li>
          </ul>
        )}

        {aba === 'roteiro' && (
          <ul className="divide-y divide-[var(--border)]">
            {escala.roteiro.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-[var(--muted)]">Lista vazia.</li>
            ) : (
              escala.roteiro.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-12 shrink-0 font-mono text-sm text-[var(--accent)]">{r.horario}</span>
                  <span className="text-sm text-[var(--text)]">{r.descricao}</span>
                </li>
              ))
            )}
            <li className="p-4">
              <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border)] py-3 text-sm font-semibold text-[var(--accent)]">
                <Plus size={16} /> Adicionar item ao roteiro
              </button>
            </li>
          </ul>
        )}
      </div>
    </div>
  );
}

function AbaBtn({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 flex-col items-center gap-1 whitespace-nowrap px-2 py-3 text-[11px] font-semibold ${
        active ? 'border-b-2 border-[var(--accent)] text-[var(--accent)]' : 'text-[var(--muted)]'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function InfoRow({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className="mt-0.5 text-sm text-[var(--text)]">{valor}</p>
    </div>
  );
}
