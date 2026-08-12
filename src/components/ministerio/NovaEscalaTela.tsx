import { useMemo, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  Info,
  Palette,
  Plus,
  Shuffle,
  Trash2,
  Users,
  UsersRound,
} from 'lucide-react';
import { PALETAS_CORES } from '../../lib/ministerioUtils';
import type { Equipe, Escala, FuncaoMinisterio, Indisponibilidade, MembroMinisterio, ParticipanteEscala } from '../../types/ministerio';
import { MembrosSelecionarTela } from './MembrosSelecionarTela';

interface Props {
  membros: MembroMinisterio[];
  funcoes: FuncaoMinisterio[];
  equipes: Equipe[];
  indisponibilidades: Indisponibilidade[];
  escalaExistente?: Escala;
  onCancelar: () => void;
  onSalvar: (escala: Escala) => void;
}

type Aba = 'detalhes' | 'participantes';

export function NovaEscalaTela({ membros, funcoes, equipes, indisponibilidades, escalaExistente, onCancelar, onSalvar }: Props) {
  const [aba, setAba] = useState<Aba>('detalhes');
  const [abaMembrosSelecionar, setAbaMembrosSelecionar] = useState<'todos' | 'equipes'>('todos');

  const [titulo, setTitulo] = useState(escalaExistente?.titulo ?? '');
  const [data, setData] = useState(escalaExistente?.data ?? '');
  const [hora, setHora] = useState(escalaExistente?.hora ?? '19:00');
  const [observacoes, setObservacoes] = useState(escalaExistente?.observacoes ?? '');
  const [publicada, setPublicada] = useState(escalaExistente?.publicada ?? true);
  const [solicitarConfirmacao, setSolicitarConfirmacao] = useState(escalaExistente?.solicitarConfirmacao ?? true);
  const [corPaleta, setCorPaleta] = useState<string | undefined>(escalaExistente?.corPaleta);
  const [seletorPaletaAberto, setSeletorPaletaAberto] = useState(false);

  const [participantes, setParticipantes] = useState<ParticipanteEscala[]>(escalaExistente?.participantes ?? []);

  const [selecionandoMembros, setSelecionandoMembros] = useState(false);

  const podeSalvar = titulo.trim() && data;

  const indisponiveisIds = useMemo(
    () => new Set(indisponibilidades.filter((i) => i.data === data).map((i) => i.membroId)),
    [indisponibilidades, data]
  );

  const participantesIndisponiveis = participantes.filter((p) => indisponiveisIds.has(p.membroId));

  function handleSalvar() {
    if (!podeSalvar) return;
    if (participantesIndisponiveis.length > 0) {
      const nomes = participantesIndisponiveis
        .map((p) => membros.find((m) => m.id === p.membroId)?.nome ?? '?')
        .join(', ');
      alert(`Remova antes de salvar: ${nomes} — indisponíve${participantesIndisponiveis.length > 1 ? 'is' : 'l'} nesta data.`);
      setAba('participantes');
      return;
    }
    onSalvar({
      id: escalaExistente?.id ?? `e${Date.now()}`,
      titulo: titulo.trim(),
      data,
      hora,
      observacoes,
      publicada,
      solicitarConfirmacao,
      corPaleta,
      participantes,
      roteiro: escalaExistente?.roteiro ?? [], // Roteiro (e Músicas, via repertório) fica pra tela da escala já salva.
    });
  }

  function sortear() {
    const jaSelecionados = new Set(participantes.map((p) => p.membroId));
    const disponiveis = membros.filter((m) => !jaSelecionados.has(m.id) && !indisponiveisIds.has(m.id));
    if (disponiveis.length === 0) return;
    const escolhidos = [...disponiveis].sort(() => Math.random() - 0.5).slice(0, Math.min(4, disponiveis.length));
    setParticipantes((prev) => [
      ...prev,
      ...escolhidos.map((m) => ({
        membroId: m.id,
        funcaoId: m.funcoes[0] ?? funcoes[0]?.id ?? '',
        status: 'pendente' as const,
      })),
    ]);
  }

  if (selecionandoMembros) {
    return (
      <MembrosSelecionarTela
        membros={membros}
        funcoes={funcoes}
        equipes={equipes}
        abaInicial={abaMembrosSelecionar}
        selecionadosIniciais={participantes.map((p) => p.membroId)}
        indisponiveisIds={indisponiveisIds}
        onCancelar={() => setSelecionandoMembros(false)}
        onConfirmar={(sel) => {
          setParticipantes(sel.map((s) => ({ ...s, status: 'pendente' })));
          setSelecionandoMembros(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] font-sans text-[var(--text)]">
      <header className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-4 lg:px-10">
        <button onClick={onCancelar} aria-label="Voltar">
          <ChevronLeft size={20} />
        </button>
        <h1 className="flex-1 text-lg font-extrabold tracking-tight">
          {escalaExistente ? 'Editar escala' : 'Nova escala'}
        </h1>
        <button
          onClick={handleSalvar}
          disabled={!podeSalvar || participantesIndisponiveis.length > 0}
          className="flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 py-1.5 text-sm font-semibold text-[var(--accent-fg)] disabled:opacity-40"
        >
          <Check size={15} /> Salvar
        </button>
      </header>

      <div className="mx-auto max-w-2xl px-4 pb-24 pt-4 lg:px-10">
        <div className="flex rounded-2xl bg-[var(--surface)] p-1.5">
          <TabBtn icon={<Info size={18} />} label="Detalhes" active={aba === 'detalhes'} onClick={() => setAba('detalhes')} />
          <TabBtn
            icon={<Users size={18} />}
            count={participantes.length}
            label="Participantes"
            active={aba === 'participantes'}
            onClick={() => setAba('participantes')}
          />
        </div>

        {aba === 'detalhes' && (
          <div className="mt-4 flex flex-col gap-4">
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Título *"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-sm outline-none focus:border-[var(--accent)]"
            />

            <div className="flex gap-3">
              <label className="flex-1">
                <span className="mb-1 block text-xs font-semibold text-[var(--muted)]">Data</span>
                <input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
                />
              </label>
              <label className="flex-1">
                <span className="mb-1 block text-xs font-semibold text-[var(--muted)]">Hora</span>
                <input
                  type="time"
                  value={hora}
                  onChange={(e) => setHora(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
                />
              </label>
            </div>

            <div>
              <textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value.slice(0, 500))}
                placeholder="Observações"
                rows={3}
                className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-sm outline-none focus:border-[var(--accent)]"
              />
              <p className="mt-1 text-right text-xs text-[var(--muted)]">{observacoes.length}/500</p>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <Eye size={18} className="shrink-0 text-[var(--accent)]" />
              <span className="flex-1">
                <span className="block text-sm font-semibold">Visibilidade</span>
                <span className="mt-0.5 block text-xs text-[var(--accent)]">
                  {publicada ? 'Publicada, visível para todos os membros.' : 'Rascunho, visível só para você.'}
                </span>
              </span>
              <ToggleBtn ativo={publicada} onClick={() => setPublicada((v) => !v)} />
            </div>

            <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
              <button
                onClick={() => setSeletorPaletaAberto((v) => !v)}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
              >
                <Palette size={18} className="shrink-0 text-[var(--muted)]" />
                <span className="flex-1 text-sm font-semibold">Paleta de cores</span>
                {corPaleta && (
                  <span
                    className="h-4 w-4 shrink-0 rounded-full"
                    style={{ background: PALETAS_CORES.find((p) => p.id === corPaleta)?.cor }}
                  />
                )}
                <ChevronRight size={16} className="shrink-0 text-[var(--muted)]" />
              </button>
              {seletorPaletaAberto && (
                <div className="flex flex-wrap gap-3 border-t border-[var(--border)] px-4 py-3">
                  {PALETAS_CORES.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setCorPaleta(p.id)}
                      className="flex h-9 w-9 items-center justify-center rounded-full"
                      style={{ background: p.cor }}
                      title={p.nome}
                      aria-label={p.nome}
                    >
                      {corPaleta === p.id && <Check size={16} className="text-white" />}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-3 border-t border-[var(--border)] px-4 py-3.5">
                <span className="flex-1 text-sm font-semibold">Solicitar confirmação dos participantes</span>
                <ToggleBtn ativo={solicitarConfirmacao} onClick={() => setSolicitarConfirmacao((v) => !v)} />
              </div>
            </div>
          </div>
        )}

        {aba === 'participantes' && (
          <div className="mt-4">
            <div className="flex gap-2">
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

            {participantesIndisponiveis.length > 0 && (
              <div className="mt-3 rounded-lg bg-amber-500/15 px-3 py-2 text-xs text-amber-500">
                {participantesIndisponiveis.length} participante{participantesIndisponiveis.length > 1 ? 's' : ''} indisponíve
                {participantesIndisponiveis.length > 1 ? 'is' : 'l'} nesta data — remova antes de salvar.
              </div>
            )}

            {participantes.length === 0 ? (
              <EmptyState
                icon={<Users size={40} />}
                texto="Para adicionar um participante, toque no botão: ( + Adicionar )"
              />
            ) : (
              <ul className="mt-4 flex flex-col gap-1">
                {participantes.map((p) => {
                  const membro = membros.find((m) => m.id === p.membroId);
                  const funcao = funcoes.find((f) => f.id === p.funcaoId);
                  const indisponivel = indisponiveisIds.has(p.membroId);
                  if (!membro) return null;
                  return (
                    <li key={p.membroId} className="flex items-center gap-3 rounded-lg px-2 py-2.5">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${membro.avatarCor} ${
                          indisponivel ? 'opacity-40' : ''
                        }`}
                      >
                        {membro.nome[0]}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{membro.nome}</span>
                        <span className="block truncate text-xs text-[var(--muted)]">
                          {funcao?.icone} {funcao?.nome}
                        </span>
                        {indisponivel && (
                          <span className="block text-xs font-semibold text-amber-500">Indisponível nesta data</span>
                        )}
                      </span>
                      <button
                        onClick={() => setParticipantes((prev) => prev.filter((x) => x.membroId !== p.membroId))}
                        aria-label="Remover participante"
                        className="text-[var(--muted)]"
                      >
                        <Trash2 size={15} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TabBtn({
  icon,
  label,
  count,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 flex-col items-center gap-1 rounded-xl py-2.5 text-[11px] font-semibold ${
        active ? 'bg-[var(--accent)] text-[var(--accent-fg)]' : 'text-[var(--muted)]'
      }`}
    >
      <span className="flex items-center gap-1">
        {icon}
        {count !== undefined && count}
      </span>
      {label}
    </button>
  );
}

function ToggleBtn({ ativo, onClick }: { ativo: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={ativo}
      className={`h-6 w-11 shrink-0 rounded-full transition ${
        ativo ? 'bg-[var(--accent)]' : 'border border-[var(--border)] bg-[var(--bg)]'
      }`}
    >
      <span
        className={`block h-5 w-5 rounded-full bg-white shadow transition ${ativo ? 'translate-x-5' : 'translate-x-0.5'}`}
      />
    </button>
  );
}

function EmptyState({ icon, texto }: { icon: React.ReactNode; texto: string }) {
  return (
    <div className="mt-10 flex flex-col items-center text-center">
      <span className="flex h-24 w-24 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--accent)]">
        {icon}
      </span>
      <p className="mt-4 max-w-xs text-sm text-[var(--muted)]">{texto}</p>
    </div>
  );
}
