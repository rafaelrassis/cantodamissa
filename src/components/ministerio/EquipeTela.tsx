import { useState } from 'react';
import { Check, Copy, MoreVertical, Plus, Shield, ShieldOff, Trash2, UserMinus, UserPlus, X } from 'lucide-react';
import { formatarDataLonga } from '../../lib/ministerioUtils';
import type { FuncaoMinisterio, Indisponibilidade, MembroMinisterio, SolicitacaoIngresso } from '../../types/ministerio';
import { FuncaoEditorTela } from './FuncaoEditorTela';

interface Props {
  membros: MembroMinisterio[];
  funcoes: FuncaoMinisterio[];
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
}

export function EquipeTela({
  membros,
  funcoes,
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
}: Props) {
  const [aba, setAba] = useState<'membros' | 'funcoes' | 'indisponibilidades'>('membros');
  const [convidarAberto, setConvidarAberto] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [novaData, setNovaData] = useState('');
  const [novoMotivo, setNovoMotivo] = useState('');
  const [menuMembroId, setMenuMembroId] = useState<string | null>(null);
  const [funcaoEditor, setFuncaoEditor] = useState<{ id: string | null; nome: string; icone: string } | null>(null);

  const qtdAdmins = membros.filter((m) => m.admin).length;

  function copiarCodigo() {
    navigator.clipboard?.writeText(codigoConvite).catch(() => {});
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  }

  if (funcaoEditor) {
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

  return (
    <div className="pb-6">
      <div className="mx-4 mt-3 flex gap-1 rounded-full bg-[var(--surface)] p-1 text-xs font-semibold">
        {(['membros', 'funcoes', 'indisponibilidades'] as const).map((k) => (
          <button
            key={k}
            onClick={() => setAba(k)}
            className={`flex-1 rounded-full py-2 capitalize transition ${
              aba === k ? 'bg-[var(--accent)] text-[var(--accent-fg)]' : 'text-[var(--muted)]'
            }`}
          >
            {k === 'funcoes' ? 'Funções' : k}
          </button>
        ))}
      </div>

      {aba === 'membros' && (
        <div className="mt-4 px-4">
          {souAdmin && (
            <button
              onClick={() => setConvidarAberto(true)}
              className="mb-4 flex w-full items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
                <UserPlus size={16} /> Convidar membros
              </span>
              <span className="text-xs text-[var(--muted)]">Ver código</span>
            </button>
          )}

          {souAdmin && solicitacoes.length > 0 && (
            <div className="mb-4 rounded-xl border border-[var(--accent)]/40 bg-[var(--accent)]/10 p-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--accent)]">
                Solicitações pendentes ({solicitacoes.length})
              </p>
              {solicitacoes.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-1.5 text-sm">
                  <span className="text-[var(--text)]">{s.nome}</span>
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

          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
            Membros ({membros.length})
          </p>
          <ul className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)]">
            {membros.map((m) => (
              <li key={m.id} className="relative flex items-center gap-3 px-4 py-3">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${m.avatarCor}`}
                >
                  {m.nome[0]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--text)]">
                    {m.nome} {m.admin && <span className="text-[10px] font-normal text-[var(--accent)]">· admin</span>}
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
                    <MoreVertical size={16} />
                  </button>
                )}

                {menuMembroId === m.id && (
                  <div className="absolute right-4 top-12 z-10 w-52 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)]">
                    {m.admin ? (
                      <button
                        onClick={() => {
                          if (qtdAdmins <= 1) return;
                          onRemoverAdmin(m.id);
                          setMenuMembroId(null);
                        }}
                        disabled={qtdAdmins <= 1}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm disabled:opacity-40"
                      >
                        <ShieldOff size={14} /> Remover admin
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          onTornarAdmin(m.id);
                          setMenuMembroId(null);
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm"
                      >
                        <Shield size={14} /> Tornar admin
                      </button>
                    )}
                    <button
                      onClick={() => {
                        onRemoverMembro(m.id);
                        setMenuMembroId(null);
                      }}
                      disabled={m.admin && qtdAdmins <= 1}
                      className="flex w-full items-center gap-2 border-t border-[var(--border)] px-4 py-2.5 text-left text-sm text-red-500 disabled:opacity-40"
                    >
                      <UserMinus size={14} /> Remover do ministério
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {aba === 'funcoes' && (
        <div className="mt-4 px-4">
          <ul className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)]">
            {funcoes.map((f) => (
              <li key={f.id} className="flex items-center justify-between px-4 py-3">
                <button
                  onClick={() => setFuncaoEditor({ id: f.id, nome: f.nome, icone: f.icone })}
                  className="flex flex-1 items-center gap-2 text-left text-sm text-[var(--text)]"
                >
                  <span>{f.icone}</span> {f.nome}
                </button>
                <button onClick={() => onRemoverFuncao(f.id)} aria-label={`Remover ${f.nome}`}>
                  <Trash2 size={14} className="text-[var(--muted)]" />
                </button>
              </li>
            ))}
          </ul>
          <button
            onClick={() => setFuncaoEditor({ id: null, nome: '', icone: '🎵' })}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border)] py-3 text-sm font-semibold text-[var(--accent)]"
          >
            <Plus size={16} /> Adicionar função
          </button>
        </div>
      )}

      {aba === 'indisponibilidades' && (
        <div className="mt-4 px-4">
          <div className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
              Marcar indisponibilidade
            </p>
            <div className="flex gap-2">
              <input
                type="date"
                value={novaData}
                onChange={(e) => setNovaData(e.target.value)}
                className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-sm text-[var(--text)]"
              />
              <input
                type="text"
                placeholder="Motivo"
                value={novoMotivo}
                onChange={(e) => setNovoMotivo(e.target.value)}
                className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-sm text-[var(--text)]"
              />
            </div>
            <button
              onClick={() => {
                if (!novaData) return;
                onAdicionarIndisponibilidade(novaData, novoMotivo || 'Sem motivo informado');
                setNovaData('');
                setNovoMotivo('');
              }}
              className="mt-2 w-full rounded-lg bg-[var(--accent)] py-2 text-sm font-semibold text-[var(--accent-fg)]"
            >
              Adicionar
            </button>
          </div>

          {indisponibilidades.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--muted)]">Lista vazia.</p>
          ) : (
            <ul className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)]">
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
          <div className="w-full max-w-sm rounded-t-2xl bg-[var(--bg)] p-6 lg:rounded-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--text)]">Convidar membros</h2>
              <button onClick={() => setConvidarAberto(false)} aria-label="Fechar" className="text-[var(--muted)]">
                <X size={20} />
              </button>
            </div>
            <p className="mb-3 text-sm text-[var(--muted)]">
              Compartilhe este código com quem você quer convidar para o ministério.
            </p>
            <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
              <span className="font-mono text-lg font-bold tracking-wider text-[var(--text)]">
                {codigoConvite}
              </span>
              <button onClick={copiarCodigo} className="text-[var(--accent)]" aria-label="Copiar código">
                <Copy size={18} />
              </button>
            </div>
            {copiado && <p className="mt-2 text-center text-xs text-[var(--accent)]">Copiado!</p>}
          </div>
        </div>
      )}
    </div>
  );
}
