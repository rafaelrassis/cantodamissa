import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, Mic2, X } from 'lucide-react';
import type { Cantor } from '../types/cantor';
import {
  listarCantores,
  criarCantor,
  atualizarCantor,
  excluirCantor,
  type DadosCantor,
} from '../lib/cantoresApi';

const FORM_VAZIO: DadosCantor = { nome: '', fotoUrl: null };

export function CantoresAdmin() {
  const [cantores, setCantores] = useState<Cantor[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [editando, setEditando] = useState<Cantor | null | 'novo'>(null);

  const recarregar = useCallback(() => {
    setCarregando(true);
    setErro(null);
    listarCantores()
      .then(setCantores)
      .catch((err) => setErro(err instanceof Error ? err.message : 'Falha ao carregar cantores'))
      .finally(() => setCarregando(false));
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  async function handleSalvar(dados: DadosCantor) {
    if (editando === 'novo') {
      await criarCantor(dados);
    } else if (editando) {
      await atualizarCantor(editando.id, dados);
    }
    setEditando(null);
    recarregar();
  }

  async function handleExcluir(cantor: Cantor) {
    if (!confirm(`Excluir "${cantor.nome}"? As músicas ligadas a ele ficam sem cantor.`)) return;
    try {
      await excluirCantor(cantor.id);
      recarregar();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Falha ao excluir');
    }
  }

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-[var(--muted)]">{cantores.length} cantor(es)</p>
        <button
          onClick={() => setEditando('novo')}
          className="flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-[18px] py-2.5 text-[13.5px] font-bold text-[var(--accent-fg)]"
        >
          <Plus size={15} strokeWidth={2.75} /> Novo cantor
        </button>
      </div>

      {carregando && (
        <p className="flex items-center justify-center gap-2 py-14 text-sm text-[var(--muted)]">
          <Loader2 size={16} className="animate-spin" /> Carregando...
        </p>
      )}

      {erro && <p className="rounded-2xl bg-[#a3111d]/10 px-4 py-3 text-sm text-[#a3111d]">{erro}</p>}

      {!carregando && !erro && cantores.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-14 text-center">
          <Mic2 size={28} strokeWidth={2.75} className="text-[var(--muted)]" />
          <p className="rounded-full bg-[var(--accent-soft)] px-4 py-2 text-sm font-semibold text-[#3b4a27]">
            Nenhum cantor cadastrado ainda.
          </p>
        </div>
      )}

      <div className="grid gap-2 lg:grid-cols-2 lg:items-start">
        {cantores.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between gap-2.5 rounded-[20px] border border-[var(--border)] px-[18px] py-[11px]"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              {c.fotoUrl ? (
                <img src={c.fotoUrl} alt="" className="h-[34px] w-[34px] shrink-0 rounded-full object-cover" />
              ) : (
                <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] font-mono text-[13px] font-bold text-[#3b4a27]">
                  {c.nome.charAt(0).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{c.nome}</p>
                <p className="truncate font-mono text-[11.5px] text-[var(--muted)]">/{c.slug}</p>
              </div>
            </div>
            <div className="flex shrink-0 gap-1">
              <button
                onClick={() => setEditando(c)}
                className="flex h-[30px] w-[30px] items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--surface2)]"
                title="Editar"
              >
                <Pencil size={15} strokeWidth={2.75} />
              </button>
              <button
                onClick={() => handleExcluir(c)}
                className="flex h-[30px] w-[30px] items-center justify-center rounded-full text-[#a3111d] hover:bg-[#a3111d]/10"
                title="Excluir"
              >
                <Trash2 size={15} strokeWidth={2.75} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {editando && (
        <CantorFormModal
          cantorExistente={editando === 'novo' ? null : editando}
          onSalvar={handleSalvar}
          onFechar={() => setEditando(null)}
        />
      )}
    </div>
  );
}

function CantorFormModal({
  cantorExistente,
  onSalvar,
  onFechar,
}: {
  cantorExistente: Cantor | null;
  onSalvar: (dados: DadosCantor) => Promise<void>;
  onFechar: () => void;
}) {
  const [form, setForm] = useState<DadosCantor>(
    cantorExistente
      ? { nome: cantorExistente.nome, fotoUrl: cantorExistente.fotoUrl }
      : FORM_VAZIO
  );
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function handleSalvar() {
    setErro(null);
    if (!form.nome.trim()) {
      setErro('Nome é obrigatório.');
      return;
    }
    setSalvando(true);
    try {
      await onSalvar({ nome: form.nome.trim(), fotoUrl: form.fotoUrl?.trim() || null });
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha ao salvar');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-[22px] text-[var(--text)] shadow-[0_12px_30px_rgba(30,42,20,.18)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl">{cantorExistente ? 'Editar cantor' : 'Novo cantor'}</h2>
          <button onClick={onFechar} className="text-[var(--muted)] hover:text-[var(--text)]">
            <X size={18} strokeWidth={2.75} />
          </button>
        </div>

        {erro && (
          <p className="mb-4 rounded-2xl bg-[#a3111d]/10 px-4 py-3 text-sm text-[#a3111d]">{erro}</p>
        )}

        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-[var(--muted)]">Nome *</span>
            <input
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              className="input-field w-full bg-[var(--bg)]"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-[var(--muted)]">
              URL da foto (ex: Vercel Blob)
            </span>
            <input
              value={form.fotoUrl ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, fotoUrl: e.target.value }))}
              className="input-field w-full bg-[var(--bg)]"
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onFechar}
            className="rounded-full border border-[var(--border)] bg-[var(--bg)] px-5 py-2.5 text-[13.5px] font-bold"
          >
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            disabled={salvando}
            className="flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-[22px] py-2.5 text-[13.5px] font-bold text-[var(--accent-fg)] disabled:opacity-40"
          >
            {salvando && <Loader2 size={14} className="animate-spin" />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
