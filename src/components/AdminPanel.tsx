import { useState } from 'react';
import { ChevronLeft, ClipboardList, Music, ListMusic } from 'lucide-react';
import { ModeracaoSubmissoes } from './ModeracaoSubmissoes';
import { MusicasAdmin } from './MusicasAdmin';
import { useSubmissoes } from '../lib/useSubmissoes';

interface Props {
  onBack: () => void;
  onLogout: () => void;
}

type Aba = 'sugestoes' | 'musicas' | 'repertorios';

export function AdminPanel({ onBack, onLogout }: Props) {
  const [aba, setAba] = useState<Aba>('sugestoes');
  const { submissoes } = useSubmissoes();
  const pendentes = submissoes.filter((s) => s.status === 'pendente').length;

  const abas: { id: Aba; label: string; icon: typeof ClipboardList; badge?: number }[] = [
    { id: 'sugestoes', label: 'Sugestões', icon: ClipboardList, badge: pendentes || undefined },
    { id: 'musicas', label: 'Músicas', icon: Music },
    { id: 'repertorios', label: 'Repertórios', icon: ListMusic },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] font-sans text-[var(--text)]">
      <header className="bg-[var(--accent)] px-4 py-4 text-[var(--accent-fg)] lg:px-10">
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

      <nav className="flex gap-1 border-b border-[var(--border)] bg-[var(--surface)] px-4 lg:px-10">
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

      {aba === 'musicas' && <MusicasAdmin />}

      {aba === 'repertorios' && (
        <div className="mx-auto max-w-2xl px-4 py-10 text-center lg:px-10">
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
