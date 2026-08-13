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
        className="rounded-full bg-[var(--accent-fg)] px-[18px] py-2 text-sm font-bold text-[#3b4a27]"
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
          className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-fg)]/20"
        >
          <Bell size={16} strokeWidth={2.75} />
          {notificacoes.length > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[var(--accent-fg)] px-1 text-[10.5px] font-extrabold text-[#3b4a27]">
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
            <div className="absolute right-0 top-11 z-50 w-72 overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] shadow-[0_12px_30px_rgba(30,42,20,.18)]">
              <p className="border-b border-[var(--border)] px-[18px] py-3.5 text-[14.5px] font-extrabold">Notificações</p>
              {notificacoes.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-[var(--muted)]">
                  Nenhuma notificação por enquanto.
                </p>
              ) : (
                <ul className="divide-y divide-[var(--border)]">
                  {notificacoes.map((s) => (
                    <li key={s.id} className="px-[18px] py-3.5">
                      <p className="text-sm">
                        <span className="font-semibold">{s.nome}</span> pediu pra entrar no ministério
                      </p>
                      <div className="mt-2.5 flex gap-2">
                        <button
                          onClick={() => onAprovarNotificacao(s)}
                          className="flex flex-1 items-center justify-center gap-1 rounded-full bg-[var(--accent)] py-2 text-[12.5px] font-bold text-[var(--accent-fg)]"
                        >
                          <Check size={13} strokeWidth={2.75} /> Aprovar
                        </button>
                        <button
                          onClick={() => onRecusarNotificacao(s.id)}
                          className="flex flex-1 items-center justify-center gap-1 rounded-full border border-[var(--border)] py-2 text-[12.5px] font-bold text-[#4d5648]"
                        >
                          <X size={13} strokeWidth={2.75} /> Recusar
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
        className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-fg)] text-base font-bold text-[#3b4a27]"
      >
        {foto ?? userName[0]?.toUpperCase()}
      </button>
    </div>
  );
}
