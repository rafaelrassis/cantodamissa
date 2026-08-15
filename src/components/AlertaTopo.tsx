import { AlertTriangle, Bell, ChevronRight, X } from 'lucide-react';

interface Props {
  mensagem: string;
  onClick?: () => void;
  /** 'erro' pinta de vermelho e troca o sino por um aviso. */
  tipo?: 'aviso' | 'erro';
  /** Quando presente, mostra um "x" para dispensar o alerta. */
  onFechar?: () => void;
}

/**
 * Alerta fixo no topo, acima de qualquer tela do app (renderizado no
 * App.tsx, não dentro de uma tela específica). Genérico de propósito —
 * usado pra solicitação de ingresso pendente no Ministério e pra falha de
 * uma ação (ex.: gravação barrada por falta de permissão).
 */
export function AlertaTopo({ mensagem, onClick, tipo = 'aviso', onFechar }: Props) {
  const Tag = onClick ? 'button' : 'div';
  const cores =
    tipo === 'erro'
      ? 'bg-red-600 text-white'
      : 'bg-[var(--accent)] text-[var(--accent-fg)]';
  return (
    <div className={`sticky top-0 z-50 flex w-full items-center gap-2 px-4 py-2.5 text-sm font-semibold ${cores}`}>
      {tipo === 'erro' ? (
        <AlertTriangle size={15} className="shrink-0" />
      ) : (
        <Bell size={15} className="shrink-0" />
      )}
      <Tag onClick={onClick} className="min-w-0 flex-1 truncate text-left">
        {mensagem}
      </Tag>
      {onClick && <ChevronRight size={15} className="shrink-0" />}
      {onFechar && (
        <button onClick={onFechar} aria-label="Fechar aviso" className="shrink-0 opacity-80 hover:opacity-100">
          <X size={15} />
        </button>
      )}
    </div>
  );
}
