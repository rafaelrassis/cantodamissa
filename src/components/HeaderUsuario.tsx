import { useState } from 'react';
import { Bell, Check, X } from 'lucide-react';
import type { SolicitacaoIngresso } from '../types/ministerio';

interface Props {
  isLoggedIn: boolean;
  userName: string | null;
  foto: string | null;
  onEntrar: () => void;
  onAbrirPersonalizar: () => void;
  notificacoes: SolicitacaoIngresso[];
  onAprovarNotificacao: (s: SolicitacaoIngresso) => void;
  onRecusarNotificacao: (id: string) => void;
}

/** Avatar + sino de notificações do header — só aparece logado; deslogado
 * continua sendo o botão "Entrar" de sempre. */
export function HeaderUsuario({
  isLoggedIn,
  userName,
  foto,
  onEntrar,
  onAbrirPersonalizar,
  notificacoes,
  onAprovarNotificacao,
  onRecusarNotificacao,
}: Props) {
  const [painelAberto, setPainelAberto] = useState(false);

  if (!isLoggedIn || !userName) {
    return (
      <button
        onClick={onEntrar}
        title="Entrar"
        className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-[var(--accent)]"
      >
        Entrar
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <button
          onClick={() => setPainelAberto((v) => !v)}
          aria-label="Notificações"
          className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/16"
        >
          <Bell size={16} />
          {notificacoes.length > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-[var(--accent)]">
              {notificacoes.length}
            </span>
          )}
        </button>

        {painelAberto && (
          <>
            <button
              aria-label="Fechar notificações"
              onClick={() => setPainelAberto(false)}
              className="fixed inset-0 z-40 cursor-default"
            />
            <div className="absolute right-0 top-11 z-50 w-72 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] shadow-[var(--shadow)]">
              <p className="border-b border-[var(--border)] px-4 py-3 text-sm font-bold">Notificações</p>
              {notificacoes.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-[var(--muted)]">
                  Nenhuma notificação por enquanto.
                </p>
              ) : (
                <ul className="divide-y divide-[var(--border)]">
                  {notificacoes.map((s) => (
                    <li key={s.id} className="px-4 py-3">
                      <p className="text-sm">
                        <span className="font-semibold">{s.nome}</span> pediu pra entrar no ministério
                      </p>
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => onAprovarNotificacao(s)}
                          className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-[var(--accent)] py-1.5 text-xs font-semibold text-[var(--accent-fg)]"
                        >
                          <Check size={13} /> Aprovar
                        </button>
                        <button
                          onClick={() => onRecusarNotificacao(s.id)}
                          className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-[var(--border)] py-1.5 text-xs font-semibold text-[var(--muted)]"
                        >
                          <X size={13} /> Recusar
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>

      <button
        onClick={onAbrirPersonalizar}
        aria-label="Personalizar"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-base font-semibold text-[var(--accent)]"
      >
        {foto ?? userName[0]?.toUpperCase()}
      </button>
    </div>
  );
}
