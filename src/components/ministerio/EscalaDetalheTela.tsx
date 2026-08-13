import { useMemo, useState } from 'react';
import { ChevronLeft, Info, Pencil, Plus, Shuffle, Trash2, Users, UsersRound } from 'lucide-react';
import { formatarDataLonga } from '../../lib/ministerioUtils';
import { obterRepertorioPorEscala } from '../../lib/repertorios';
import type { Equipe, Escala, FuncaoMinisterio, Indisponibilidade, MembroMinisterio, StatusConfirmacao } from '../../types/ministerio';
import { MembrosSelecionarTela } from './MembrosSelecionarTela';

interface Props {
  escala: Escala;
  membros: MembroMinisterio[];
  funcoes: FuncaoMinisterio[];
  equipes: Equipe[];
  indisponibilidades: Indisponibilidade[];
  meuMembroId: string | null;
  souAdmin: boolean;
  onBack: () => void;
  onAtualizar: (escala: Escala) => void;
  onEditar: () => void;
  onExcluir: (escalaId: string) => Promise<void>;
}

const STATUS_LABEL: Record<StatusConfirmacao, { texto: string; cor: string }> = {
  confirmado: { texto: 'Confirmado', cor: 'text-emerald-500' },
  pendente: { texto: 'Pendente', cor: 'text-amber-500' },
  recusado: { texto: 'Recusado', cor: 'text-rose-500' },
};

/**
 * Abas "Músicas" e "Roteiro" foram removidas — a criação de escala
 * (NovaEscalaTela) não tem mais esses passos, então mantê-los aqui só
 * confundia. Repertório da missa agora vive só na aba "Repertório" do
 * Ministério (ver MinisterioRepertoriosTela).
 */
export function EscalaDetalheTela({
  escala,
  membros,
  funcoes,
  equipes,
  indisponibilidades,
  meuMembroId,
  souAdmin,
  onBack,
  onAtualizar,
  onEditar,
  onExcluir,
}: Props) {
  const [aba, setAba] = useState<'detalhes' | 'participantes'>('detalhes');
  const [selecionandoMembros, setSelecionandoMembros] = useState(false);
  const [abaMembrosSelecionar, setAbaMembrosSelecionar] = useState<'todos' | 'equipes'>('todos');
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [repertorioVinculado, setRepertorioVinculado] = useState<{ id: string; nome: string } | null | undefined>(
    undefined // undefined = ainda não verificado
  );

  const indisponiveisIds = useMemo(
    () => new Set(indisponibilidades.filter((i) => i.data === escala.data).map((i) => i.membroId)),
    [indisponibilidades, escala.data]
  );

  async function excluir() {
    if (!confirmandoExclusao) {
      setConfirmandoExclusao(true);
      // Verifica se há repertório vinculado pra avisar antes de excluir —
      // deletar a escala não apaga o repertório (fica órfão, sem tela de
      // acesso), então o aviso é a única chance de o usuário perceber.
      try {
        const rep = await obterRepertorioPorEscala(escala.id);
        setRepertorioVinculado(rep ? { id: rep.id, nome: rep.nome } : null);
      } catch (err) {
        console.error('verificar repertório vinculado:', err);
        setRepertorioVinculado(null);
      }
      return;
    }
    try {
      await onExcluir(escala.id);
      onBack();
    } catch (err) {
      console.error('excluir escala:', err);
      alert('Não foi possível excluir a escala. Veja o console.');
      setConfirmandoExclusao(false);
    }
  }

  function confirmarMinhaPresenca(status: StatusConfirmacao) {
    const participantes = escala.participantes.map((p) =>
      p.membroId === meuMembroId ? { ...p, status } : p
    );
    onAtualizar({ ...escala, participantes });
  }

  function sortear() {
    const jaSelecionados = new Set(escala.participantes.map((p) => p.membroId));
    const disponiveis = membros.filter((m) => !jaSelecionados.has(m.id) && !indisponiveisIds.has(m.id));
    if (disponiveis.length === 0) return;
    const escolhidos = [...disponiveis].sort(() => Math.random() - 0.5).slice(0, Math.min(4, disponiveis.length));
    const participantes = [
      ...escala.participantes,
      ...escolhidos.map((m) => ({
        membroId: m.id,
        funcaoId: m.funcoes[0] ?? funcoes[0]?.id ?? '',
        status: 'pendente' as StatusConfirmacao,
      })),
    ];
    onAtualizar({ ...escala, participantes });
  }

  const minhaParticipacao = escala.participantes.find((p) => p.membroId === meuMembroId);

  if (selecionandoMembros) {
    return (
      <MembrosSelecionarTela
        membros={membros}
        funcoes={funcoes}
        equipes={equipes}
        abaInicial={abaMembrosSelecionar}
        selecionadosIniciais={escala.participantes.map((p) => p.membroId)}
        indisponiveisIds={indisponiveisIds}
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

  return (
    <div className="min-h-screen bg-[var(--bg)] font-sans text-[var(--text)]">
      <header className="bg-[var(--accent)] px-4 py-4 text-[var(--accent-fg)] lg:px-10">
        <div className="mb-2 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-1 text-xs opacity-80">
            <ChevronLeft size={14} /> Voltar
          </button>
          {souAdmin && (
            <div className="flex items-center gap-4">
              <button onClick={onEditar} aria-label="Editar escala" className="opacity-80">
                <Pencil size={16} />
              </button>
              <button onClick={excluir} aria-label="Excluir escala" className="opacity-80">
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>
        <h1 className="text-xl font-extrabold tracking-tight">{escala.titulo}</h1>
        <p className="mt-0.5 text-sm capitalize opacity-80">
          {formatarDataLonga(escala.data)} · {escala.hora}
        </p>
        {confirmandoExclusao && (
          <div className="mt-3 rounded-lg bg-black/20 px-3 py-2 text-xs">
            {repertorioVinculado === undefined ? (
              <span className="opacity-80">Verificando repertório vinculado...</span>
            ) : (
              <>
                <p className="mb-1.5">
                  {repertorioVinculado
                    ? `Excluir esta escala também deixará o repertório "${repertorioVinculado.nome}" órfão — ele não será apagado, mas ficará sem escala vinculada. Excluir mesmo assim?`
                    : 'Excluir esta escala e tudo relacionado a ela?'}
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={excluir} className="font-bold underline">
                    Excluir
                  </button>
                  <button
                    onClick={() => {
                      setConfirmandoExclusao(false);
                      setRepertorioVinculado(undefined);
                    }}
                    className="opacity-80"
                  >
                    Cancelar
                  </button>
                </div>
              </>
            )}
          </div>
        )}
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
          <div>
            {souAdmin && (
              <div className="flex gap-2 p-4 pb-0">
                <button
                  onClick={() => {
                    setAbaMembrosSelecionar('todos');
                    setSelecionandoMembros(true);
                  }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-fg)]"
                >
                  <Plus size={16} /> Adicionar
                </button>
                <button
                  onClick={() => {
                    setAbaMembrosSelecionar('equipes');
                    setSelecionandoMembros(true);
                  }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full border border-[var(--border)] px-4 py-2.5 text-sm font-semibold text-[var(--text)]"
                >
                  <UsersRound size={16} /> Equipes
                </button>
                <button
                  onClick={sortear}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full border border-[var(--border)] px-4 py-2.5 text-sm font-semibold text-[var(--text)]"
                >
                  <Shuffle size={16} /> Sortear
                </button>
              </div>
            )}

            <ul className="mt-2 divide-y divide-[var(--border)]">
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
            </ul>
          </div>
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
