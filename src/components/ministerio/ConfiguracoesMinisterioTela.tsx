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
      <header className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-4 lg:px-10">
        <button onClick={onBack} aria-label="Voltar">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-lg font-extrabold tracking-tight">Configurações do ministério</h1>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-5 lg:px-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => souAdmin && setEditandoFoto((v) => !v)}
            disabled={!souAdmin}
            aria-label="Alterar foto"
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent)] text-3xl text-[var(--accent-fg)] disabled:opacity-80"
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
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                />
                <button
                  onClick={() => {
                    if (nomeRascunho.trim()) onRenomear(nomeRascunho.trim());
                    setEditandoNome(false);
                  }}
                  className="shrink-0 rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-[var(--accent-fg)]"
                >
                  Ok
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="truncate text-lg font-bold">{nome}</p>
                {souAdmin && (
                  <button
                    onClick={() => {
                      setNomeRascunho(nome);
                      setEditandoNome(true);
                    }}
                    aria-label="Renomear ministério"
                  >
                    <Pencil size={14} className="text-[var(--muted)]" />
                  </button>
                )}
              </div>
            )}
            {!souAdmin && <p className="mt-0.5 text-xs text-[var(--muted)]">Só admins podem alterar foto e nome.</p>}
          </div>
        </div>

        {editandoFoto && souAdmin && (
          <div className="mt-3 flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
            <input
              autoFocus
              value={fotoRascunho}
              onChange={(e) => setFotoRascunho(e.target.value)}
              maxLength={2}
              className="w-14 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-2 text-center text-xl"
            />
            <p className="flex-1 text-xs text-[var(--muted)]">
              Foto como emoji por ora — upload de imagem de verdade fica pra quando tiver Storage ligado ao
              Ministério.
            </p>
            <button
              onClick={() => {
                onAtualizarFoto(fotoRascunho.trim() || null);
                setEditandoFoto(false);
              }}
              className="shrink-0 rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-[var(--accent-fg)]"
            >
              Ok
            </button>
          </div>
        )}

        {souAdmin && (
          <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5">
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Código de convite</p>
            <div className="mt-1.5 flex items-center justify-between">
              <span className="font-mono text-base font-bold tracking-wider">{codigoConvite}</span>
              <div className="flex items-center gap-3">
                <button onClick={copiarCodigo} aria-label="Copiar código" className="text-[var(--accent)]">
                  <Copy size={16} />
                </button>
                <button onClick={onRegenerarCodigo} aria-label="Gerar novo código" className="text-[var(--accent)]">
                  <RefreshCw size={16} />
                </button>
              </div>
            </div>
            {copiado && <p className="mt-1 text-xs text-[var(--accent)]">Copiado!</p>}
            <p className="mt-1 text-xs text-[var(--muted)]">Gerar novo código invalida o anterior.</p>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3">
          {souAdmin && !podeSair && (
            <p className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-600">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              Você é o único admin. Torne outro membro admin (na aba Equipe) antes de sair.
            </p>
          )}
          <button
            onClick={() => (confirmandoSaida ? onSair() : setConfirmandoSaida(true))}
            disabled={!podeSair}
            className="flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] py-3 text-sm font-semibold disabled:opacity-40"
          >
            <LogOut size={16} /> {confirmandoSaida ? 'Confirmar saída' : 'Sair do ministério'}
          </button>

          {souAdmin && (
            <button
              onClick={() => (confirmandoExclusao ? onExcluir() : setConfirmandoExclusao(true))}
              className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold ${
                confirmandoExclusao ? 'bg-red-600 text-white' : 'border border-red-500/40 text-red-500'
              }`}
            >
              <Trash2 size={16} /> {confirmandoExclusao ? 'Confirmar exclusão (irreversível)' : 'Excluir ministério'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
