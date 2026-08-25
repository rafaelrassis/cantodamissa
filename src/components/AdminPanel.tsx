import { useState } from 'react';
import { ChevronLeft, ClipboardList, Music, Mic2, ListMusic, ShieldAlert } from 'lucide-react';
import { ModeracaoSubmissoes } from './ModeracaoSubmissoes';
import { ModeracaoRemocoes } from './ModeracaoRemocoes';
import { MusicasAdmin } from './MusicasAdmin';
import { CantoresAdmin } from './CantoresAdmin';
import { useSubmissoes } from '../lib/useSubmissoes';
import { useSolicitacoesRemocao } from '../lib/useSolicitacoesRemocao';

interface Props {
  onBack: () => void;
  onLogout: () => void;
}

type Aba = 'sugestoes' | 'remocoes' | 'musicas' | 'cantores' | 'repertorios';

export function AdminPanel({ onBack, onLogout }: Props) {
  const [aba, setAba] = useState<Aba>('sugestoes');
  const { submissoes } = useSubmissoes();
  const { solicitacoes } = useSolicitacoesRemocao();
  const pendentes = submissoes.filter((s) => s.status === 'pendente').length;
  const pedidosRemocaoPendentes = solicitacoes.filter((s) => s.status === 'pendente').length;

  const abas: { id: Aba; label: string; icon: typeof ClipboardList; badge?: number }[] = [
    { id: 'sugestoes', label: 'Sugestões', icon: ClipboardList, badge: pendentes || undefined },
    {
      id: 'remocoes',
      label: 'Remoções',
      icon: ShieldAlert,
      badge: pedidosRemocaoPendentes || undefined,
    },
    { id: 'musicas', label: 'Músicas', icon: Music },
    { id: 'cantores', label: 'Cantores', icon: Mic2 },
    { id: 'repertorios', label: 'Repertórios', icon: ListMusic },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] font-sans text-[var(--text)]">
      <header className="bg-[var(--accent)] px-4 py-4 text-[var(--accent-fg)] md:px-10">
        <div className="mb-2 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-1 text-xs opacity-80">
            <ChevronLeft size={14} /> Voltar
          </button>
          <button onClick={onLogout} className="text-xs opacity-80 hover:underline">
            Sair
          </button>
        </div>
        <h1 className="text-xl font-extrabold tracking-tight">Painel administrativo</h1>
      </header>

      <nav className="flex gap-1 border-b border-[var(--border)] bg-[var(--surface)] px-4 md:px-10">
        {abas.map(({ id, label, icon: Icon, badge }) => (
          <button
            key={id}
            onClick={() => setAba(id)}
            className={`relative flex items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium transition ${
              aba === id
                ? 'border-[var(--accent)] text-[var(--text)]'
                : 'border-transparent text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            <Icon size={15} />
            {label}
            {badge ? (
              <span className="ml-1 rounded-full bg-[var(--accent)] px-1.5 text-[10px] font-bold text-[var(--accent-fg)]">
                {badge}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      {aba === 'sugestoes' && (
        <ModeracaoSubmissoesEmbed />
      )}

      {aba === 'remocoes' && <ModeracaoRemocoes />}

      {aba === 'musicas' && <MusicasAdmin />}

      {aba === 'cantores' && <CantoresAdmin />}

      {aba === 'repertorios' && (
        <div className="mx-auto max-w-2xl px-4 py-10 text-center md:px-10">
          <ListMusic size={28} className="mx-auto mb-3 text-[var(--muted)]" />
          <p className="text-sm text-[var(--muted)]">
            Montagem de repertório por domingo/ciclo — em breve nesta aba.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Reaproveita ModeracaoSubmissoes sem o header próprio dela (já temos
 * header + abas aqui). onBack/onLogout viram no-op pra não duplicar nav.
 */
function ModeracaoSubmissoesEmbed() {
  return <ModeracaoSubmissoes onBack={() => {}} onLogout={() => {}} embedded />;
}
