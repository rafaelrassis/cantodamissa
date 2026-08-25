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
    <div className="pb-24">
      <div className="mx-4 mt-3 flex gap-1 rounded-full bg-[var(--surface)] p-1 text-xs font-semibold">
        <button
          onClick={() => {
            setAba('proximas');
            setVerTudo(false);
          }}
          className={`flex-1 rounded-full py-2 transition ${
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
          className={`flex-1 rounded-full py-2 transition ${
            aba === 'anteriores' ? 'bg-[var(--accent)] text-[var(--accent-fg)]' : 'text-[var(--muted)]'
          }`}
        >
          Anteriores
        </button>
      </div>

      {lista.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-2 px-4 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
            <Plus size={20} />
          </span>
          <p className="text-sm text-[var(--muted)]">
            Nenhuma escala por aqui ainda. Toque em ( + ) para criar a primeira.
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-2 px-4">
          {lista.map((e) => {
            const confirmados = e.participantes.filter((p) => p.status === 'confirmado').length;
            return (
              <li key={e.id}>
                <button
                  onClick={() => onAbrirEscala(e.id)}
                  className="flex w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-left"
                >
                  <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-[var(--accent)] text-[var(--accent-fg)]">
                    <span className="text-[10px] font-semibold uppercase leading-none">
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
                className="w-full rounded-xl border border-dashed border-[var(--border)] py-3 text-center text-sm font-semibold text-[var(--accent)]"
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
          className="fixed bottom-24 right-4 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-fg)] shadow-[var(--shadow)]"
        >
          <Plus size={22} />
        </button>
      )}
    </div>
  );
}
