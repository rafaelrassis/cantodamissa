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
    <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-[var(--border)] bg-[var(--surface)] px-2 pb-3 pt-2.5 lg:hidden">
      <TabItem icon={<HomeIcon size={20} strokeWidth={2.75} />} label="Início" active={ativa === 'home'} onClick={onIrHome} />
      <TabItem icon={<Search size={20} strokeWidth={2.75} />} label="Buscar" active={ativa === 'busca'} onClick={onIrBusca} />
      <TabItem
        icon={<CalendarDays size={20} strokeWidth={2.75} />}
        label="Calendário"
        active={ativa === 'calendario'}
        onClick={onIrCalendario}
      />
      <TabItem icon={<Users size={20} strokeWidth={2.75} />} label="Ministério" active={ativa === 'ministerio'} onClick={onIrMinisterio} />
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
      className={`flex min-h-14 min-w-16 flex-col items-center justify-center gap-1 rounded-[20px] px-3 ${
        active ? 'bg-[var(--accent-soft)] text-[#3d472b]' : 'text-[var(--muted)]'
      }`}
    >
      {icon}
      <span className="text-[11px] font-extrabold">{label}</span>
    </button>
  );
}
