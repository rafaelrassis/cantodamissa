import { CalendarDays, Home as HomeIcon, Search, Users } from 'lucide-react';

export type TelaNav = 'home' | 'busca' | 'calendario' | 'ministerio';

interface Props {
  ativa: TelaNav;
  onIrHome: () => void;
  onIrBusca: () => void;
  onIrCalendario: () => void;
  onIrMinisterio: () => void;
}

/**
 * Barra fixa (mobile) presente em todas as telas exceto o leitor de
 * cifra (CifraReader) — mesma exceção do alerta global de solicitação
 * pendente em App.tsx, modo missa ao vivo não deve ter distração.
 * "Repertórios" saiu da barra (removido a pedido); no desktop o acesso
 * continua pela sidebar "Meus repertórios" em Home.tsx.
 */
export function BottomNavBar({ ativa, onIrHome, onIrBusca, onIrCalendario, onIrMinisterio }: Props) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-[var(--border)] bg-[var(--surface)] py-2 lg:hidden">
      <TabItem icon={<HomeIcon size={18} />} label="Início" active={ativa === 'home'} onClick={onIrHome} />
      <TabItem icon={<Search size={18} />} label="Buscar" active={ativa === 'busca'} onClick={onIrBusca} />
      <TabItem
        icon={<CalendarDays size={18} />}
        label="Calendário"
        active={ativa === 'calendario'}
        onClick={onIrCalendario}
      />
      <TabItem icon={<Users size={18} />} label="Ministério" active={ativa === 'ministerio'} onClick={onIrMinisterio} />
    </nav>
  );
}

function TabItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex min-w-16 flex-col items-center gap-1 py-1.5 ${
        active ? 'text-[var(--accent)]' : 'text-[var(--muted)]'
      }`}
    >
      {icon}
      <span className="text-[10px] font-semibold">{label}</span>
    </button>
  );
}
