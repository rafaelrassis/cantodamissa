import { useState } from 'react';
import { Plus } from 'lucide-react';
import { formatarDataCurta, formatarDataLonga } from '../../lib/ministerioUtils';
import type { Escala } from '../../types/ministerio';

interface Props {
  escalas: Escala[];
  onAbrirEscala: (id: string) => void;
  onCriarEscala: () => void;
  souAdmin: boolean;
}

const LIMITE_LISTA = 10;

export function EscalasTela({ escalas, onAbrirEscala, onCriarEscala, souAdmin }: Props) {
  const [aba, setAba] = useState<'proximas' | 'anteriores'>('proximas');
  const [verTudo, setVerTudo] = useState(false);
  const hoje = new Date().toISOString().slice(0, 10);

  const listaCompleta = escalas
    .filter((e) => (aba === 'proximas' ? e.data >= hoje : e.data < hoje))
    .sort((a, b) => (aba === 'proximas' ? a.data.localeCompare(b.data) : b.data.localeCompare(a.data)));

  const lista = verTudo ? listaCompleta : listaCompleta.slice(0, LIMITE_LISTA);
  const restantes = listaCompleta.length - lista.length;

  return (
    <div className="pb-24 lg:px-4">
      <div className="mx-4 mt-3 flex gap-1 rounded-full bg-[var(--surface)] p-1 text-[12.5px] font-bold lg:mx-0">
        <button
          onClick={() => {
            setAba('proximas');
            setVerTudo(false);
          }}
          className={`flex-1 rounded-full py-[9px] transition ${
            aba === 'proximas' ? 'bg-[var(--accent)] text-[var(--accent-fg)]' : 'text-[var(--muted)]'
          }`}
        >
          Próximas
        </button>
        <button
          onClick={() => {
            setAba('anteriores');
            setVerTudo(false);
          }}
          className={`flex-1 rounded-full py-[9px] transition ${
            aba === 'anteriores' ? 'bg-[var(--accent)] text-[var(--accent-fg)]' : 'text-[var(--muted)]'
          }`}
        >
          Anteriores
        </button>
      </div>

      {lista.length === 0 ? (
        <p className="mt-10 px-4 text-center text-sm text-[var(--muted)] lg:px-0">
          Lista vazia. Toque em ( + ) para cadastrar uma escala.
        </p>
      ) : (
        <ul className="mt-4 space-y-2 px-4 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0 lg:px-0 xl:grid-cols-3">
          {lista.map((e) => {
            const confirmados = e.participantes.filter((p) => p.status === 'confirmado').length;
            return (
              <li key={e.id}>
                <button
                  onClick={() => onAbrirEscala(e.id)}
                  className="flex w-full items-center gap-3 rounded-[20px] border border-[var(--border)] bg-[var(--surface)] px-4 py-[11px] text-left"
                >
                  <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl bg-[var(--accent)] text-[var(--accent-fg)]">
                    <span className="text-[10px] font-bold uppercase leading-none">
                      {formatarDataCurta(e.data).split(' ')[1]}
                    </span>
                    <span className="text-base font-extrabold leading-none">
                      {formatarDataCurta(e.data).split(' ')[0]}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--text)]">{e.titulo}</p>
                    <p className="truncate text-xs capitalize text-[var(--muted)]">
                      {formatarDataLonga(e.data)} · {e.hora}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {confirmados}/{e.participantes.length} confirmados
                      {!e.publicada && ' · rascunho'}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
          {restantes > 0 && (
            <li>
              <button
                onClick={() => setVerTudo(true)}
                className="w-full rounded-[20px] border border-dashed border-[var(--border)] py-3 text-center text-sm font-bold text-[var(--accent)]"
              >
                Ver mais {restantes}
              </button>
            </li>
          )}
        </ul>
      )}

      {souAdmin && (
        <button
          onClick={onCriarEscala}
          aria-label="Nova escala"
          className="fixed bottom-24 right-4 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-fg)] shadow-[0_8px_20px_rgba(30,42,20,.24)] lg:bottom-8 lg:right-8"
        >
          <Plus size={22} strokeWidth={2.75} />
        </button>
      )}
    </div>
  );
}
