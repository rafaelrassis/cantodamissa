import { useState } from 'react';
import { X } from 'lucide-react';
import { mensagemDeErro } from '../lib/supabaseUtils';
import type { AlvoRemocao, DadosSolicitacaoRemocao } from '../lib/solicitacoesRemocao';

interface Props {
  alvoTipo: AlvoRemocao;
  /** Título da música ou nome do cantor/artista — vira o snapshot salvo no pedido. */
  alvoDescricao: string;
  musicaId?: string;
  cantorId?: string;
  onSubmit: (dados: DadosSolicitacaoRemocao) => void | Promise<void>;
  onClose: () => void;
}

/**
 * Formulário do modelo notice-and-takedown (SPEC.md, seção 8): quem
 * detém os direitos de uma letra/cifra pede a remoção por aqui. Grava em
 * `solicitacoes_remocao` (só admin lê — ver 0029), não em `submissoes`,
 * que é sobre sugerir conteúdo, não reclamar dele.
 */
export function SolicitarRemocaoForm({
  alvoTipo,
  alvoDescricao,
  musicaId,
  cantorId,
  onSubmit,
  onClose,
}: Props) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [motivo, setMotivo] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !email.trim() || !motivo.trim()) return;
    setEnviando(true);
    setErro('');
    try {
      await onSubmit({
        alvoTipo,
        alvoDescricao,
        musicaId,
        cantorId,
        solicitanteNome: nome.trim(),
        solicitanteEmail: email.trim(),
        motivo: motivo.trim(),
      });
      setEnviado(true);
    } catch (err) {
      setErro(mensagemDeErro(err, 'Não foi possível enviar agora. Tente de novo.'));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 md:items-center">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-[var(--bg)] p-5 md:max-w-lg md:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--text)]">Solicitar remoção</h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface)]"
          >
            <X size={18} />
          </button>
        </div>

        {enviado ? (
          <div className="py-6 text-center">
            <p className="mb-1 text-base font-semibold text-[var(--text)]">Pedido enviado</p>
            <p className="mb-4 text-sm text-[var(--muted)]">
              Vamos analisar e responder pelo e-mail informado, dentro do prazo declarado nos
              Termos de Uso.
            </p>
            <button
              onClick={onClose}
              className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-fg)]"
            >
              Fechar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <p className="text-sm text-[var(--muted)]">
              Sobre: <span className="font-semibold text-[var(--text)]">{alvoDescricao}</span>
            </p>
            <Campo label="Seu nome" required>
              <input value={nome} onChange={(e) => setNome(e.target.value)} required className="input-field" />
            </Campo>
            <Campo label="Seu e-mail (pra retorno)" required>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-field"
              />
            </Campo>
            <Campo label="Motivo da solicitação" required>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                required
                rows={5}
                placeholder="ex: sou o detentor dos direitos autorais desta letra/cifra e não autorizo sua publicação aqui"
                className="input-field text-sm"
              />
            </Campo>

            {erro && (
              <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
                {erro}
              </p>
            )}

            <button
              type="submit"
              disabled={enviando}
              className="mt-2 rounded-xl bg-[var(--accent)] py-3 text-sm font-semibold text-[var(--accent-fg)] disabled:opacity-60"
            >
              {enviando ? 'Enviando…' : 'Enviar pedido'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Campo({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-[var(--muted)]">
        {label}
        {required && <span className="text-[var(--accent)]"> *</span>}
      </span>
      {children}
    </label>
  );
}
