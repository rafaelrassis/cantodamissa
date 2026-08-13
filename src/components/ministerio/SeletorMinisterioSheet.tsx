import { Check, Plus, Users } from 'lucide-react';
import type { MinisterioResumo } from '../../lib/ministerioApi';
import { LIMITE_MINISTERIOS } from '../../lib/ministerioApi';

interface Props {
  open: boolean;
  onClose: () => void;
  ministerios: MinisterioResumo[];
  ministerioAtivoId: string | null;
  onTrocar: (id: string) => void;
  onAdicionar: () => void;
}

/**
 * Sheet acionado pelo nome do ministério no header de MinisterioTela.
 * Lista os ministérios que este device já integra (até LIMITE_MINISTERIOS)
 * pra trocar o ativo, e oferece "Adicionar ministério" (cadastrar novo ou
 * entrar com código) — abre AdicionarMinisterioTela em modo "adicionar"
 * (ver MinisterioTela.tsx).
 */
export function SeletorMinisterioSheet({
  open,
  onClose,
  ministerios,
  ministerioAtivoId,
  onTrocar,
  onAdicionar,
}: Props) {
  const cheio = ministerios.length >= LIMITE_MINISTERIOS;

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-30 bg-black/40 transition-opacity ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      <div
        className={`fixed inset-x-0 bottom-0 z-40 max-h-[75vh] rounded-t-[28px] rounded-b-[36px] border-t border-[var(--border)] bg-[var(--surface)] pb-6 pt-3.5 shadow-[0_-18px_40px_rgba(30,42,20,.14)] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="mx-auto mb-4 h-1 w-11 rounded-full bg-[var(--border)]" />

        <div className="px-[18px]">
          <h2 className="text-[19px] text-[var(--text)]">Meus ministérios</h2>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            {ministerios.length}/{LIMITE_MINISTERIOS}
          </p>
        </div>

        <div className="mt-3 flex max-h-[45vh] flex-col gap-1 overflow-y-auto px-3.5">
          {ministerios.map((m) => {
            const ativo = m.id === ministerioAtivoId;
            return (
              <button
                key={m.id}
                onClick={() => {
                  if (!ativo) onTrocar(m.id);
                  onClose();
                }}
                className={`flex items-center gap-3 rounded-[20px] px-3.5 py-[11px] text-left transition ${
                  ativo ? 'bg-[var(--accent-soft)]' : 'hover:bg-[var(--bg)]'
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[17px] text-[var(--accent-fg)]">
                  {m.foto ?? <Users size={16} strokeWidth={2.75} />}
                </div>
                <span className="flex-1 truncate text-[14.5px] font-semibold text-[var(--text)]">{m.nome}</span>
                {ativo && <Check size={18} strokeWidth={2.75} className="shrink-0 text-[var(--accent)]" />}
              </button>
            );
          })}
        </div>

        <div className="mt-3.5 px-[18px]">
          <button
            onClick={() => {
              onClose();
              onAdicionar();
            }}
            disabled={cheio}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-dashed border-[var(--border)] py-[13px] text-sm font-bold text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus size={16} strokeWidth={2.75} /> Adicionar ministério
          </button>
          {cheio && (
            <p className="mt-2 text-center text-xs text-[var(--muted)]">
              Limite de {LIMITE_MINISTERIOS} ministérios atingido.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
