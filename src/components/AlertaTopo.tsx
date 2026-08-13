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
      className="sticky top-0 z-50 flex w-full items-center gap-2 bg-[var(--accent)] px-4 py-2.5 text-left text-sm font-semibold text-[var(--accent-fg)]"
    >
      <Bell size={15} className="shrink-0" />
      <span className="min-w-0 flex-1 truncate">{mensagem}</span>
      {onClick && <ChevronRight size={15} className="shrink-0" />}
    </Tag>
  );
}
