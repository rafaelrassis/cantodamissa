import { useEffect, useState } from 'react';
import { ChevronLeft, Clock, Info, ListMusic, Lock, Plus, Trash2, Users } from 'lucide-react';
import { formatarDataLonga, itensRoteiroComMusicas } from '../../lib/mockMinisterio';
import type { RepertoriosApi } from '../../lib/useRepertorios';
import type { Escala, FuncaoMinisterio, ItemRoteiro, MembroMinisterio, StatusConfirmacao } from '../../types/ministerio';
import type { Musica } from '../../types/musica';
import { MembrosSelecionarTela } from './MembrosSelecionarTela';
import { EventoRoteiroTela } from './EventoRoteiroTela';
import { RepertorioDetalheTela } from '../RepertorioDetalheTela';

interface Props {
  escala: Escala;
  membros: MembroMinisterio[];
  funcoes: FuncaoMinisterio[];
  meuMembroId: string | null;
  onBack: () => void;
  onAtualizar: (escala: Escala) => void;
  onAbrirMusica: (musica: Musica, repertorioId?: string | null, tom?: string | null) => void;
  repertoriosApi: RepertoriosApi;
}

const STATUS_LABEL: Record<StatusConfirmacao, { texto: string; cor: string }> = {
  confirmado: { texto: 'Confirmado', cor: 'text-emerald-500' },
  pendente: { texto: 'Pendente', cor: 'text-amber-500' },
  recusado: { texto: 'Recusado', cor: 'text-rose-500' },
};

/**
 * Aba "Músicas" NÃO é mais uma lista própria da escala — é a tela real do
 * Repertorio vinculado a ela (1 escala = 1 repertório, ver
 * useRepertorios().garantirRepertorioDaEscala). Se a escala ainda não tem
 * um (ex: criada antes dessa mudança), um repertório vazio é criado na
 * hora, na primeira vez que essa tela monta.
 */
export function EscalaDetalheTela({ escala, membros, funcoes, meuMembroId, onBack, onAtualizar, onAbrirMusica, repertoriosApi }: Props) {
  const [aba, setAba] = useState<'detalhes' | 'participantes' | 'musicas' | 'roteiro'>('detalhes');
  const [selecionandoMembros, setSelecionandoMembros] = useState(false);
  const [criandoEvento, setCriandoEvento] = useState(false);
  const [verRepertorio, setVerRepertorio] = useState(false);

  const repertorioDaEscala = repertoriosApi.obterPorEscala(escala.id);

  useEffect(() => {
    if (!repertoriosApi.carregando && !repertorioDaEscala) {
      repertoriosApi.garantirRepertorioDaEscala(escala.id, escala.titulo);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repertoriosApi.carregando, repertorioDaEscala, escala.id]);

  function confirmarMinhaPresenca(status: StatusConfirmacao) {
    const participantes = escala.participantes.map((p) =>
      p.membroId === meuMembroId ? { ...p, status } : p
    );
    onAtualizar({ ...escala, participantes });
  }

  function removerItemRoteiro(item: ItemRoteiro) {
    if (item.tipo === 'musica') {
      if (repertorioDaEscala) repertoriosApi.removerMusica(repertorioDaEscala.id, item.musicaId!);
    } else {
      onAtualizar({ ...escala, roteiro: escala.roteiro.filter((r) => r.id !== item.id) });
    }
  }

  const minhaParticipacao = escala.participantes.find((p) => p.membroId === meuMembroId);
  const itensRoteiro = itensRoteiroComMusicas(escala.roteiro, repertorioDaEscala);

  if (selecionandoMembros) {
    return (
      <MembrosSelecionarTela
        membros={membros}
        funcoes={funcoes}
        selecionadosIniciais={escala.participantes.map((p) => p.membroId)}
        onCancelar={() => setSelecionandoMembros(false)}
        onConfirmar={(sel) => {
          const participantes = sel.map((s) => {
            const existente = escala.participantes.find((p) => p.membroId === s.membroId);
            return existente ?? { ...s, status: 'pendente' as StatusConfirmacao };
          });
          onAtualizar({ ...escala, participantes });
          setSelecionandoMembros(false);
        }}
      />
    );
  }

  if (criandoEvento) {
    return (
      <EventoRoteiroTela
        nomeEscala={escala.titulo}
        onCancelar={() => setCriandoEvento(false)}
        onSalvar={(evento) => {
          onAtualizar({ ...escala, roteiro: [...escala.roteiro, evento] });
          setCriandoEvento(false);
        }}
      />
    );
  }

  if (verRepertorio && repertorioDaEscala) {
    return (
      <RepertorioDetalheTela
        repertorio={repertorioDaEscala}
        onBack={() => setVerRepertorio(false)}
        onSelectMusica={(m, tom) => onAbrirMusica(m, repertorioDaEscala.id, tom)}
        removerMusica={repertoriosApi.removerMusica}
        moverMusicaParaRito={repertoriosApi.moverMusicaParaRito}
        adicionarRito={repertoriosApi.adicionarRito}
        removerRito={repertoriosApi.removerRito}
        reordenarRitos={repertoriosApi.reordenarRitos}
        onExcluirRepertorio={repertoriosApi.remover}
        ocultarExcluir
      />
    );
  }

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
            label={`Músicas (${repertorioDaEscala?.itens.length ?? 0})`}
            active={aba === 'musicas'}
            onClick={() => setAba('musicas')}
          />
          <AbaBtn
            icon={<Clock size={14} />}
            label={`Roteiro (${itensRoteiro.length})`}
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
              const membro = membros.find((m) => m.id === p.membroId);
              const funcao = funcoes.find((f) => f.id === p.funcaoId);
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
              <button
                onClick={() => setSelecionandoMembros(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border)] py-3 text-sm font-semibold text-[var(--accent)]"
              >
                <Plus size={16} /> Adicionar participante
              </button>
            </li>
          </ul>
        )}

        {aba === 'musicas' && (
          <div className="p-4">
            {!repertorioDaEscala ? (
              <p className="flex items-center gap-2 py-8 text-center text-sm text-[var(--muted)]">
                <Lock size={16} /> Preparando o repertório desta escala…
              </p>
            ) : (
              <button
                onClick={() => setVerRepertorio(true)}
                className="flex w-full items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-left"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                  <ListMusic size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{repertorioDaEscala.nome}</span>
                  <span className="block text-xs text-[var(--muted)]">
                    {repertorioDaEscala.itens.length} música{repertorioDaEscala.itens.length === 1 ? '' : 's'} ·{' '}
                    {repertorioDaEscala.ritos.length} ritos — organizar por rito
                  </span>
                </span>
              </button>
            )}
          </div>
        )}

        {aba === 'roteiro' && (
          <ul className="divide-y divide-[var(--border)]">
            {itensRoteiro.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-[var(--muted)]">Lista vazia.</li>
            ) : (
              itensRoteiro.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-8 shrink-0 text-center text-lg">
                    {r.tipo === 'musica' ? <ListMusic size={16} className="mx-auto text-[var(--accent)]" /> : r.icone}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-[var(--text)]">{r.titulo}</span>
                    {r.tipo === 'musica' && (
                      <span className="block text-xs text-[var(--muted)]">
                        {r.momento} · Tom: {r.tom}
                      </span>
                    )}
                  </span>
                  <button onClick={() => removerItemRoteiro(r)} aria-label="Remover item">
                    <Trash2 size={14} className="text-[var(--muted)]" />
                  </button>
                </li>
              ))
            )}
            <li className="p-4">
              <button
                onClick={() => setCriandoEvento(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border)] py-3 text-sm font-semibold text-[var(--accent)]"
              >
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
