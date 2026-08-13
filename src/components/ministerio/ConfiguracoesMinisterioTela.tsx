import { useState } from 'react';
import { AlertTriangle, ChevronLeft, Copy, LogOut, Pencil, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  nome: string;
  foto: string | null;
  souAdmin: boolean;
  qtdAdmins: number;
  codigoConvite: string;
  onBack: () => void;
  onRenomear: (nome: string) => void;
  onAtualizarFoto: (emoji: string | null) => void;
  onRegenerarCodigo: () => void;
  onSair: () => void;
  onExcluir: () => void;
}

/**
 * Menu de administração do ministério. Ações restritas a admin (foto,
 * nome, código, excluir) ficam escondidas pra quem não é — só "Sair"
 * aparece pra todo mundo. Sair fica bloqueado pro admin se ele for o
 * único admin (precisa promover outro antes).
 */
export function ConfiguracoesMinisterioTela({
  nome,
  foto,
  souAdmin,
  qtdAdmins,
  codigoConvite,
  onBack,
  onRenomear,
  onAtualizarFoto,
  onRegenerarCodigo,
  onSair,
  onExcluir,
}: Props) {
  const [editandoNome, setEditandoNome] = useState(false);
  const [nomeRascunho, setNomeRascunho] = useState(nome);
  const [editandoFoto, setEditandoFoto] = useState(false);
  const [fotoRascunho, setFotoRascunho] = useState(foto ?? '⛪');
  const [copiado, setCopiado] = useState(false);
  const [confirmandoSaida, setConfirmandoSaida] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

  const podeSair = !souAdmin || qtdAdmins > 1;

  function copiarCodigo() {
    navigator.clipboard?.writeText(codigoConvite).catch(() => {});
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] font-sans text-[var(--text)]">
      <header className="flex items-center gap-2.5 border-b border-[var(--border)] px-5 py-4 lg:px-8">
        <button onClick={onBack} aria-label="Voltar">
          <ChevronLeft size={20} strokeWidth={2.75} />
        </button>
        <h1 className="text-[20px] leading-none">Configurações do ministério</h1>
      </header>

      <div className="mx-auto max-w-2xl px-5 py-6 lg:px-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => souAdmin && setEditandoFoto((v) => !v)}
            disabled={!souAdmin}
            aria-label="Alterar foto"
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[24px] bg-[var(--accent)] text-[28px] text-[var(--accent-fg)] disabled:opacity-80"
          >
            {foto ?? nome[0]?.toUpperCase()}
          </button>
          <div className="min-w-0 flex-1">
            {editandoNome ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={nomeRascunho}
                  onChange={(e) => setNomeRascunho(e.target.value)}
                  className="w-full rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm outline-none focus:border-[var(--accent)]"
                />
                <button
                  onClick={() => {
                    if (nomeRascunho.trim()) onRenomear(nomeRascunho.trim());
                    setEditandoNome(false);
                  }}
                  className="shrink-0 rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-bold text-[var(--accent-fg)]"
                >
                  Ok
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="truncate text-[19px] font-bold">{nome}</p>
                {souAdmin && (
                  <button
                    onClick={() => {
                      setNomeRascunho(nome);
                      setEditandoNome(true);
                    }}
                    aria-label="Renomear ministério"
                  >
                    <Pencil size={14} strokeWidth={2.75} className="text-[var(--muted)]" />
                  </button>
                )}
              </div>
            )}
            {!souAdmin && (
              <p className="mt-0.5 text-xs text-[var(--muted)]">Só admins podem alterar foto e nome.</p>
            )}
          </div>
        </div>

        {editandoFoto && souAdmin && (
          <div className="mt-3.5 flex items-center gap-3 rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-[14px]">
            <input
              autoFocus
              value={fotoRascunho}
              onChange={(e) => setFotoRascunho(e.target.value)}
              maxLength={2}
              className="w-14 rounded-[14px] border border-[var(--border)] bg-[var(--bg)] px-2 py-[9px] text-center text-[20px]"
            />
            <p className="flex-1 text-[12.5px] leading-[1.45] text-[var(--muted)]">
              Foto como emoji por ora — upload de imagem de verdade fica pra quando tiver Storage ligado ao
              Ministério.
            </p>
            <button
              onClick={() => {
                onAtualizarFoto(fotoRascunho.trim() || null);
                setEditandoFoto(false);
              }}
              className="shrink-0 rounded-full bg-[var(--accent)] px-[18px] py-[9px] text-[12.5px] font-bold text-[var(--accent-fg)]"
            >
              Ok
            </button>
          </div>
        )}

        {souAdmin && (
          <div className="mt-6 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">Código de convite</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="font-mono text-[17px] font-bold tracking-[0.08em]">{codigoConvite}</span>
              <div className="flex items-center gap-[14px]">
                <button onClick={copiarCodigo} aria-label="Copiar código" className="text-[var(--accent)]">
                  <Copy size={16} strokeWidth={2.75} />
                </button>
                <button onClick={onRegenerarCodigo} aria-label="Gerar novo código" className="text-[var(--accent)]">
                  <RefreshCw size={16} strokeWidth={2.75} />
                </button>
              </div>
            </div>
            {copiado && <p className="mt-1 text-xs text-[var(--accent)]">Copiado!</p>}
            <p className="mt-2 text-[12.5px] text-[var(--muted)]">Gerar novo código invalida o anterior.</p>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3">
          {souAdmin && !podeSair && (
            <p className="flex items-start gap-2.5 rounded-[20px] border border-[rgba(166,122,31,0.35)] bg-[rgba(166,122,31,0.10)] px-4 py-[13px] text-[12.5px] leading-[1.45] text-[#8a651a]">
              <AlertTriangle size={14} strokeWidth={2.75} className="mt-0.5 shrink-0" />
              Você é o único admin. Torne outro membro admin (na aba Equipe) antes de sair.
            </p>
          )}
          <button
            onClick={() => (confirmandoSaida ? onSair() : setConfirmandoSaida(true))}
            disabled={!podeSair}
            className={`flex items-center justify-center gap-2 rounded-full border py-[14px] text-sm font-bold disabled:opacity-40 ${
              confirmandoSaida
                ? 'border-transparent bg-[#a3111d] text-white'
                : 'border-[var(--border)] bg-[var(--bg)] text-[var(--text)]'
            }`}
          >
            <LogOut size={16} strokeWidth={2.75} /> {confirmandoSaida ? 'Confirmar saída' : 'Sair do ministério'}
          </button>

          {souAdmin && (
            <button
              onClick={() => (confirmandoExclusao ? onExcluir() : setConfirmandoExclusao(true))}
              className={`flex items-center justify-center gap-2 rounded-full py-[14px] text-sm font-bold ${
                confirmandoExclusao ? 'bg-[#a3111d] text-white' : 'border border-[rgba(163,17,29,0.4)] text-[#a3111d]'
              }`}
            >
              <Trash2 size={16} strokeWidth={2.75} /> {confirmandoExclusao ? 'Confirmar exclusão (irreversível)' : 'Excluir ministério'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
