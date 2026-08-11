import { useState } from 'react';
import { ChevronLeft, ChevronRight, LogIn, Plus } from 'lucide-react';
import { CODIGO_CONVITE } from '../../lib/mockMinisterio';

interface Props {
  onBack: () => void;
  onConcluir: (nomeMinisterio?: string) => void;
}

type Passo = 'opcoes' | 'ingressar' | 'cadastrar';

/**
 * Estado exibido quando o usuário está logado mas ainda não pertence a
 * nenhum ministério — mesmo fluxo do LouveApp (ingressar por código de
 * convite ou cadastrar um ministério novo), com o tema visual do
 * Canto da Missa em vez de copiar o design de referência.
 */
export function AdicionarMinisterioTela({ onBack, onConcluir }: Props) {
  const [passo, setPasso] = useState<Passo>('opcoes');
  const [codigo, setCodigo] = useState('');
  const [erroCodigo, setErroCodigo] = useState('');
  const [nomeMinisterio, setNomeMinisterio] = useState('');

  function handleIngressar() {
    if (codigo.trim().toUpperCase() === CODIGO_CONVITE) {
      onConcluir();
    } else {
      setErroCodigo('Código inválido. Confira com o administrador do ministério.');
    }
  }

  function handleCadastrar() {
    if (nomeMinisterio.trim()) {
      onConcluir(nomeMinisterio.trim());
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] font-sans text-[var(--text)]">
      <header className="bg-[var(--accent)] px-4 py-4 text-[var(--accent-fg)] lg:px-10">
        <button
          onClick={passo === 'opcoes' ? onBack : () => setPasso('opcoes')}
          className="mb-2 flex items-center gap-1 text-xs opacity-80"
        >
          <ChevronLeft size={14} /> Voltar
        </button>
        <h1 className="text-xl font-extrabold tracking-tight">Ministério</h1>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6 lg:px-10">
        {passo === 'opcoes' && (
          <>
            <h2 className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
              Adicionar ministério
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Você ainda não participa de nenhum ministério. Selecione uma opção para continuar:
            </p>

            <div className="mt-6 flex flex-col gap-3">
              <OpcaoCard
                icon={<LogIn size={20} />}
                titulo="Ingressar em um ministério"
                descricao="Entre com o código de convite de um ministério."
                onClick={() => {
                  setErroCodigo('');
                  setPasso('ingressar');
                }}
              />
              <OpcaoCard
                icon={<Plus size={20} />}
                titulo="Cadastrar novo ministério"
                descricao="Crie um novo ministério para começar a organizar sua equipe."
                onClick={() => setPasso('cadastrar')}
              />
            </div>
          </>
        )}

        {passo === 'ingressar' && (
          <>
            <h2 className="text-lg font-bold">Ingressar em um ministério</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Peça o código de convite para o administrador do ministério.
            </p>

            <label className="mt-6 block text-xs font-semibold text-[var(--muted)]">
              Código de convite
            </label>
            <input
              value={codigo}
              onChange={(e) => {
                setCodigo(e.target.value.toUpperCase());
                setErroCodigo('');
              }}
              placeholder="Ex: CDM-4F2K"
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
            />
            {erroCodigo && <p className="mt-1.5 text-xs text-red-500">{erroCodigo}</p>}

            <button
              onClick={handleIngressar}
              disabled={!codigo.trim()}
              className="mt-5 w-full rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-fg)] disabled:opacity-50"
            >
              Ingressar
            </button>
          </>
        )}

        {passo === 'cadastrar' && (
          <>
            <h2 className="text-lg font-bold">Cadastrar novo ministério</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Defina um nome para identificar seu ministério. Você poderá convidar a equipe em seguida.
            </p>

            <label className="mt-6 block text-xs font-semibold text-[var(--muted)]">
              Nome do ministério
            </label>
            <input
              value={nomeMinisterio}
              onChange={(e) => setNomeMinisterio(e.target.value)}
              placeholder="Ex: Ministério de Música - Paróquia Santa Rita"
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
            />

            <button
              onClick={handleCadastrar}
              disabled={!nomeMinisterio.trim()}
              className="mt-5 w-full rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-fg)] disabled:opacity-50"
            >
              Criar ministério
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function OpcaoCard({
  icon,
  titulo,
  descricao,
  onClick,
}: {
  icon: React.ReactNode;
  titulo: string;
  descricao: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-start gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-left shadow-[var(--shadow)] transition hover:shadow-md"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-fg)]">
        {icon}
      </span>
      <span className="flex-1">
        <span className="block text-base font-semibold text-[var(--text)]">{titulo}</span>
        <span className="mt-0.5 block text-sm text-[var(--muted)]">{descricao}</span>
      </span>
      <ChevronRight size={18} className="mt-3 shrink-0 text-[var(--muted)]" />
    </button>
  );
}
