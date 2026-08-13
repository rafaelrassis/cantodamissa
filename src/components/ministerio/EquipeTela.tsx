import { useState } from 'react';
import { Copy, MoreVertical, Plus, Shield, ShieldOff, Trash2, UserMinus, UserPlus, X } from 'lucide-react';
import { formatarDataLonga } from '../../lib/ministerioUtils';
import type { Equipe, FuncaoMinisterio, Indisponibilidade, MembroMinisterio, SolicitacaoIngresso } from '../../types/ministerio';
import { FuncaoEditorTela } from './FuncaoEditorTela';
import { EquipeEditorTela } from './EquipeEditorTela';

interface Props {
  membros: MembroMinisterio[];
  funcoes: FuncaoMinisterio[];
  equipes: Equipe[];
  indisponibilidades: Indisponibilidade[];
  onAdicionarIndisponibilidade: (data: string, motivo: string) => void;
  souAdmin: boolean;
  codigoConvite: string;
  solicitacoes: SolicitacaoIngresso[];
  onAprovarSolicitacao: (s: SolicitacaoIngresso) => void;
  onRecusarSolicitacao: (id: string) => void;
  onTornarAdmin: (membroId: string) => void;
  onRemoverAdmin: (membroId: string) => void;
  onRemoverMembro: (membroId: string) => void;
  onCriarFuncao: (nome: string, icone: string) => void;
  onEditarFuncao: (funcaoId: string, nome: string, icone: string) => void;
  onRemoverFuncao: (funcaoId: string) => void;
  onCriarEquipe: (nome: string, membroIds: string[]) => void;
  onEditarEquipe: (equipeId: string, nome: string, membroIds: string[]) => void;
  onRemoverEquipe: (equipeId: string) => void;
}

export function EquipeTela({
  membros,
  funcoes,
  equipes,
  indisponibilidades,
  onAdicionarIndisponibilidade,
  souAdmin,
  codigoConvite,
  solicitacoes,
  onAprovarSolicitacao,
  onRecusarSolicitacao,
  onTornarAdmin,
  onRemoverAdmin,
  onRemoverMembro,
  onCriarFuncao,
  onEditarFuncao,
  onRemoverFuncao,
  onCriarEquipe,
  onEditarEquipe,
  onRemoverEquipe,
}: Props) {
  const [aba, setAba] = useState<'membros' | 'funcoes' | 'equipes' | 'indisponibilidades'>('membros');
  const [convidarAberto, setConvidarAberto] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [novaData, setNovaData] = useState('');
  const [novoMotivo, setNovoMotivo] = useState('');
  const [menuMembroId, setMenuMembroId] = useState<string | null>(null);
  const [funcaoEditor, setFuncaoEditor] = useState<{ id: string | null; nome: string; icone: string } | null>(null);
  const [equipeEditor, setEquipeEditor] = useState<{ id: string | null; nome: string; membroIds: string[] } | null>(
    null
  );

  const qtdAdmins = membros.filter((m) => m.admin).length;

  function copiarCodigo() {
    navigator.clipboard?.writeText(codigoConvite).catch(() => {});
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  }

  if (funcaoEditor && souAdmin) {
    return (
      <FuncaoEditorTela
        titulo={funcaoEditor.id ? 'Editar função' : 'Nova função'}
        nomeInicial={funcaoEditor.nome}
        iconeInicial={funcaoEditor.icone}
        onVoltar={() => setFuncaoEditor(null)}
        onSalvar={(nome, icone) => {
          if (funcaoEditor.id) onEditarFuncao(funcaoEditor.id, nome, icone);
          else onCriarFuncao(nome, icone);
          setFuncaoEditor(null);
        }}
      />
    );
  }

  if (equipeEditor && souAdmin) {
    return (
      <EquipeEditorTela
        titulo={equipeEditor.id ? 'Editar equipe' : 'Nova equipe'}
        nomeInicial={equipeEditor.nome}
        membroIdsIniciais={equipeEditor.membroIds}
        membros={membros}
        onVoltar={() => setEquipeEditor(null)}
        onSalvar={(nome, membroIds) => {
          if (equipeEditor.id) onEditarEquipe(equipeEditor.id, nome, membroIds);
          else onCriarEquipe(nome, membroIds);
          setEquipeEditor(null);
        }}
      />
    );
  }

  return (
    <div className="pb-6">
      <div className="flex overflow-x-auto border-b border-[var(--border)] px-2 lg:px-6">
        {(['membros', 'funcoes', 'equipes', 'indisponibilidades'] as const).map((k) => (
          <button
            key={k}
            onClick={() => setAba(k)}
            className={`flex-1 whitespace-nowrap px-2 py-[13px] text-[11.5px] font-bold capitalize transition ${
              aba === k ? 'border-b-2 border-[var(--accent)] text-[var(--accent)]' : 'text-[var(--muted)]'
            }`}
          >
            {k === 'funcoes' ? 'Funções' : k}
          </button>
        ))}
      </div>

      {aba === 'membros' && (
        <div className="mt-4 px-4 lg:px-8">
          {souAdmin && (
            <button
              onClick={() => setConvidarAberto(true)}
              className="mb-3.5 flex w-full items-center justify-between rounded-[20px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
                <UserPlus size={16} strokeWidth={2.75} /> Convidar membros
              </span>
              <span className="text-xs font-semibold text-[var(--accent)]">Ver código</span>
            </button>
          )}

          {souAdmin && solicitacoes.length > 0 && (
            <div className="mb-3.5 rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-[14px]">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">
                Solicitações pendentes · {solicitacoes.length}
              </p>
              <div className="divide-y divide-[var(--border)]">
                {solicitacoes.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 py-[9px]">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-bold text-[var(--accent-fg)]">
                      {s.nome[0]}
                    </span>
                    <span className="flex-1 truncate text-sm font-semibold text-[var(--text)]">{s.nome}</span>
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => onAprovarSolicitacao(s)}
                        className="rounded-full bg-[var(--accent)] px-4 py-[7px] text-xs font-bold text-[var(--accent-fg)]"
                      >
                        Aprovar
                      </button>
                      <button
                        onClick={() => onRecusarSolicitacao(s.id)}
                        className="rounded-full border border-[var(--border)] bg-[var(--bg)] px-4 py-[7px] text-xs font-bold text-[var(--muted)]"
                      >
                        Recusar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">
            Membros ({membros.length})
          </p>
          <ul className="divide-y divide-[var(--border)] rounded-[20px] border border-[var(--border)] bg-[var(--surface)]">
            {membros.map((m) => (
              <li key={m.id} className="relative flex items-center gap-3 px-4 py-[10px]">
                <span
                  className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${m.avatarCor}`}
                >
                  {m.nome[0]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14.5px] font-semibold text-[var(--text)]">
                    {m.nome} {m.admin && <span className="text-[11px] font-normal text-[var(--accent)]">· admin</span>}
                  </p>
                  <p className="truncate text-xs text-[var(--muted)]">
                    {m.funcoes.map((f) => funcoes.find((x) => x.id === f)?.nome).join(', ') || 'Sem função'}
                  </p>
                </div>

                {souAdmin && (
                  <button
                    onClick={() => setMenuMembroId((atual) => (atual === m.id ? null : m.id))}
                    aria-label="Mais opções"
                    className="shrink-0 text-[var(--muted)]"
                  >
                    <MoreVertical size={16} strokeWidth={2.75} />
                  </button>
                )}

                {menuMembroId === m.id && (
                  <div className="absolute right-4 top-12 z-10 w-52 overflow-hidden rounded-[20px] border border-[var(--border)] bg-[var(--bg)] shadow-[0_12px_30px_rgba(30,42,20,.18)]">
                    {m.admin ? (
                      <button
                        onClick={() => {
                          if (qtdAdmins <= 1) return;
                          onRemoverAdmin(m.id);
                          setMenuMembroId(null);
                        }}
                        disabled={qtdAdmins <= 1}
                        className="flex w-full items-center gap-2 px-4 py-[11px] text-left text-sm text-[var(--text)] disabled:opacity-40"
                      >
                        <ShieldOff size={14} strokeWidth={2.75} /> Remover admin
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          onTornarAdmin(m.id);
                          setMenuMembroId(null);
                        }}
                        className="flex w-full items-center gap-2 px-4 py-[11px] text-left text-sm text-[var(--text)]"
                      >
                        <Shield size={14} strokeWidth={2.75} /> Tornar admin
                      </button>
                    )}
                    <button
                      onClick={() => {
                        onRemoverMembro(m.id);
                        setMenuMembroId(null);
                      }}
                      disabled={m.admin && qtdAdmins <= 1}
                      className="flex w-full items-center gap-2 border-t border-[var(--border)] px-4 py-[11px] text-left text-sm text-[#a3111d] disabled:opacity-40"
                    >
                      <UserMinus size={14} strokeWidth={2.75} /> Remover do ministério
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {aba === 'funcoes' && (
        <div className="mt-4 px-4 lg:px-8">
          <ul className="divide-y divide-[var(--border)] rounded-[20px] border border-[var(--border)] bg-[var(--surface)]">
            {funcoes.map((f) => (
              <li key={f.id} className="flex items-center justify-between px-4 py-3">
                {souAdmin ? (
                  <button
                    onClick={() => setFuncaoEditor({ id: f.id, nome: f.nome, icone: f.icone })}
                    className="flex flex-1 items-center gap-2 text-left text-sm text-[var(--text)]"
                  >
                    <span className="text-base">{f.icone}</span> {f.nome}
                  </button>
                ) : (
                  <span className="flex flex-1 items-center gap-2 text-sm text-[var(--text)]">
                    <span className="text-base">{f.icone}</span> {f.nome}
                  </span>
                )}
                {souAdmin && (
                  <button onClick={() => onRemoverFuncao(f.id)} aria-label={`Remover ${f.nome}`}>
                    <Trash2 size={14} strokeWidth={2.75} className="text-[var(--muted)]" />
                  </button>
                )}
              </li>
            ))}
          </ul>
          {souAdmin && (
            <button
              onClick={() => setFuncaoEditor({ id: null, nome: '', icone: '🎵' })}
              className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-full border border-dashed border-[var(--border)] py-3 text-sm font-bold text-[var(--accent)]"
            >
              <Plus size={16} strokeWidth={2.75} /> Adicionar função
            </button>
          )}
        </div>
      )}

      {aba === 'equipes' && (
        <div className="mt-4 px-4 lg:px-8">
          {equipes.length === 0 ? (
            <p className="mb-3 text-center text-sm text-[var(--muted)]">Nenhuma equipe criada ainda.</p>
          ) : (
            <ul className="divide-y divide-[var(--border)] rounded-[20px] border border-[var(--border)] bg-[var(--surface)]">
              {equipes.map((eq) => (
                <li key={eq.id} className="flex items-center justify-between px-4 py-3">
                  {souAdmin ? (
                    <button
                      onClick={() => setEquipeEditor({ id: eq.id, nome: eq.nome, membroIds: eq.membroIds })}
                      className="flex-1 text-left"
                    >
                      <span className="block text-sm font-semibold text-[var(--text)]">{eq.nome}</span>
                      <span className="block text-xs text-[var(--muted)]">{eq.membroIds.length} membros</span>
                    </button>
                  ) : (
                    <span className="flex-1">
                      <span className="block text-sm font-semibold text-[var(--text)]">{eq.nome}</span>
                      <span className="block text-xs text-[var(--muted)]">{eq.membroIds.length} membros</span>
                    </span>
                  )}
                  {souAdmin && (
                    <button onClick={() => onRemoverEquipe(eq.id)} aria-label={`Excluir ${eq.nome}`}>
                      <Trash2 size={14} strokeWidth={2.75} className="text-[var(--muted)]" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {souAdmin && (
            <button
              onClick={() => setEquipeEditor({ id: null, nome: '', membroIds: [] })}
              className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-full border border-dashed border-[var(--border)] py-3 text-sm font-bold text-[var(--accent)]"
            >
              <Plus size={16} strokeWidth={2.75} /> Nova equipe
            </button>
          )}
        </div>
      )}

      {aba === 'indisponibilidades' && (
        <div className="mt-4 px-4 lg:px-8">
          <div className="mb-3.5 rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-[14px]">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">
              Marcar indisponibilidade
            </p>
            <div className="flex gap-2">
              <input
                type="date"
                value={novaData}
                onChange={(e) => setNovaData(e.target.value)}
                className="flex-1 rounded-full border border-[var(--border)] bg-[var(--bg)] px-3 py-[7px] text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
              />
              <input
                type="text"
                placeholder="Motivo"
                value={novoMotivo}
                onChange={(e) => setNovoMotivo(e.target.value)}
                className="flex-1 rounded-full border border-[var(--border)] bg-[var(--bg)] px-3 py-[7px] text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
              />
            </div>
            <button
              onClick={() => {
                if (!novaData) return;
                onAdicionarIndisponibilidade(novaData, novoMotivo || 'Sem motivo informado');
                setNovaData('');
                setNovoMotivo('');
              }}
              className="mt-2 w-full rounded-full bg-[var(--accent)] py-2 text-sm font-bold text-[var(--accent-fg)]"
            >
              Adicionar
            </button>
          </div>

          {indisponibilidades.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--muted)]">Lista vazia.</p>
          ) : (
            <ul className="divide-y divide-[var(--border)] rounded-[20px] border border-[var(--border)] bg-[var(--surface)]">
              {indisponibilidades.map((i) => (
                <li key={i.id} className="px-4 py-3">
                  <p className="text-sm font-semibold capitalize text-[var(--text)]">
                    {formatarDataLonga(i.data)}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {membros.find((m) => m.id === i.membroId)?.nome} · {i.motivo}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {convidarAberto && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 lg:items-center">
          <div className="w-full max-w-sm rounded-t-[28px] bg-[var(--bg)] p-[22px] shadow-[0_12px_30px_rgba(30,42,20,.18)] lg:rounded-[28px]">
            <div className="mb-3.5 flex items-center justify-between">
              <h2 className="text-[20px] text-[var(--text)]">Convidar membros</h2>
              <button onClick={() => setConvidarAberto(false)} aria-label="Fechar" className="text-[var(--muted)]">
                <X size={18} strokeWidth={2.75} />
              </button>
            </div>
            <p className="mb-3 text-sm text-[var(--muted)]">
              Compartilhe este código com quem você quer convidar para o ministério.
            </p>
            <div className="flex items-center justify-between rounded-[20px] bg-[var(--accent-soft)] px-4 py-[13px]">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#3b4a27]">Código de convite</p>
                <p className="mt-0.5 font-mono text-[18px] font-bold tracking-[0.08em] text-[#3b4a27]">
                  {codigoConvite}
                </p>
              </div>
              <button
                onClick={copiarCodigo}
                aria-label="Copiar código"
                className="flex items-center gap-1.5 rounded-full border border-[var(--accent)] px-4 py-2 text-[12.5px] font-bold text-[#3b4a27]"
              >
                <Copy size={14} strokeWidth={2.75} /> Copiar
              </button>
            </div>
            {copiado && <p className="mt-2 text-center text-xs font-semibold text-[var(--accent)]">Copiado!</p>}
          </div>
        </div>
      )}
    </div>
  );
}
