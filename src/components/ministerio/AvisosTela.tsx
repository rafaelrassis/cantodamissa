import { useState } from 'react';
import { Megaphone, Plus, X } from 'lucide-react';
import type { Aviso } from '../../types/ministerio';

interface Props {
  souAdmin: boolean;
  avisos: Aviso[];
  onCriar: (titulo: string, descricao: string, emDestaque: boolean) => void;
}

export function AvisosTela({ avisos, onCriar, souAdmin }: Props) {
  const [formAberto, setFormAberto] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [emDestaque, setEmDestaque] = useState(false);

  const ativos = avisos.filter((a) => !a.arquivado);

  function salvar() {
    if (!titulo || !descricao) return;
    onCriar(titulo, descricao, emDestaque);
    setTitulo('');
    setDescricao('');
    setEmDestaque(false);
    setFormAberto(false);
  }

  return (
    <div className="px-4 pb-24 pt-4 lg:px-8">
      {ativos.length === 0 ? (
        <p className="mt-8 text-center text-sm text-[var(--muted)]">Lista vazia.</p>
      ) : (
        <ul className="flex flex-col gap-2 lg:grid lg:grid-cols-2 lg:gap-3 xl:grid-cols-3">
          {ativos.map((a) => (
            <li
              key={a.id}
              className="flex gap-3 rounded-[20px] border border-[var(--border)] bg-[var(--surface)] px-[14px] py-3"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                <Megaphone size={16} strokeWidth={2.75} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--text)]">
                  {a.titulo}{' '}
                  {a.emDestaque && (
                    <span className="text-[10.5px] font-bold text-[var(--accent)]">· destaque</span>
                  )}
                </p>
                <p className="mt-0.5 text-xs leading-[1.45] text-[var(--muted)]">{a.descricao}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {souAdmin && (
        <button
          onClick={() => setFormAberto(true)}
          aria-label="Novo aviso"
          className="fixed bottom-24 right-4 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-fg)] shadow-[0_8px_20px_rgba(30,42,20,.24)] lg:bottom-8 lg:right-8"
        >
          <Plus size={22} strokeWidth={2.75} />
        </button>
      )}

      {souAdmin && formAberto && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 lg:items-center">
          <div className="w-full max-w-sm rounded-t-[28px] bg-[var(--bg)] p-[22px] shadow-[0_12px_30px_rgba(30,42,20,.18)] lg:rounded-[28px]">
            <div className="mb-3.5 flex items-center justify-between">
              <h2 className="text-[20px] text-[var(--text)]">Novo aviso</h2>
              <button onClick={() => setFormAberto(false)} aria-label="Fechar" className="text-[var(--muted)]">
                <X size={18} strokeWidth={2.75} />
              </button>
            </div>

            <label className="mb-3 block">
              <span className="mb-[5px] block text-xs font-bold text-[var(--muted)]">Título *</span>
              <input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                maxLength={40}
                placeholder="até 40 caracteres"
                className="input-field w-full text-[var(--text)] placeholder:text-[#99a390] focus:outline-none"
              />
            </label>

            <label className="mb-3 block">
              <span className="mb-[5px] block text-xs font-bold text-[var(--muted)]">Descrição *</span>
              <textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                maxLength={2000}
                rows={4}
                placeholder="detalhes do aviso"
                className="input-field w-full resize-none text-[var(--text)] placeholder:text-[#99a390] focus:outline-none"
              />
            </label>

            <button
              type="button"
              onClick={() => setEmDestaque((v) => !v)}
              aria-pressed={emDestaque}
              className="mb-4 flex w-full items-center justify-between rounded-[20px] border border-[var(--border)] bg-[var(--surface)] px-4 py-[11px] text-left"
            >
              <span className="text-sm text-[var(--text)]">Em destaque (aparece na Início)</span>
              <span
                className={`h-[26px] w-11 shrink-0 rounded-full transition ${
                  emDestaque ? 'bg-[var(--accent)]' : 'border border-[var(--border)] bg-[var(--bg)]'
                }`}
              >
                <span
                  className={`block h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_rgba(30,42,20,.3)] transition ${
                    emDestaque ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </span>
            </button>

            <button
              onClick={salvar}
              disabled={!titulo || !descricao}
              className="w-full rounded-full bg-[var(--accent)] py-3 text-sm font-bold text-[var(--accent-fg)] disabled:opacity-40"
            >
              Salvar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
