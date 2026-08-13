import { Bell, ChevronRight } from 'lucide-react';

interface Props {
  mensagem: string;
  onClick?: () => void;
}

/**
 * Alerta fixo no topo, acima de qualquer tela do app (renderizado no
 * App.tsx, não dentro de uma tela específica). Genérico de propósito —
 * hoje só usado pra solicitação de ingresso pendente no Ministério, mas
 * não é acoplado a esse caso.
 */
export function AlertaTopo({ mensagem, onClick }: Props) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className="sticky top-2 z-50 mx-2 flex items-center gap-2.5 rounded-2xl bg-[var(--accent)] px-5 py-3 text-left text-[14.5px] font-bold text-[var(--accent-fg)] shadow-[0_8px_22px_rgba(30,42,20,.16)] sm:mx-4 sm:max-w-[960px]"
    >
      <Bell size={16} strokeWidth={2.75} className="shrink-0" />
      <span className="min-w-0 flex-1 truncate">{mensagem}</span>
      {onClick && <ChevronRight size={16} strokeWidth={2.75} className="shrink-0" />}
    </Tag>
  );
}
