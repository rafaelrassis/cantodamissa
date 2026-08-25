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
    <div className="mx-auto max-w-2xl px-4 py-4 md:px-10">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-[var(--muted)]">{cantores.length} cantor(es)</p>
        <button
          onClick={() => setEditando('novo')}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--accent-fg)]"
        >
          <Plus size={15} /> Novo cantor
        </button>
      </div>

      {carregando && (
        <p className="flex items-center justify-center gap-2 py-10 text-sm text-[var(--muted)]">
          <Loader2 size={16} className="animate-spin" /> Carregando...
        </p>
      )}

      {erro && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">{erro}</p>}

      {!carregando && !erro && cantores.length === 0 && (
        <div className="py-10 text-center text-sm text-[var(--muted)]">
          <Mic2 size={28} className="mx-auto mb-2" />
          Nenhum cantor cadastrado ainda.
        </div>
      )}

      {cantores.map((c) => (
        <div
          key={c.id}
          className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] px-3 py-2"
        >
          <div className="flex min-w-0 items-center gap-2">
            {c.fotoUrl ? (
              <img src={c.fotoUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
            ) : (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] font-mono text-xs font-bold text-[var(--accent)]">
                {c.nome.charAt(0).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{c.nome}</p>
              <p className="truncate text-xs text-[var(--muted)]">/{c.slug}</p>
            </div>
          </div>
          <div className="flex shrink-0 gap-1">
            <button
              onClick={() => setEditando(c)}
              className="rounded-md p-1.5 text-[var(--muted)] hover:bg-[var(--bg)]"
              title="Editar"
            >
              <Pencil size={15} />
            </button>
            <button
              onClick={() => handleExcluir(c)}
              className="rounded-md p-1.5 text-red-600 hover:bg-red-500/10"
              title="Excluir"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      ))}

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
      <div className="w-full max-w-md rounded-2xl bg-[var(--surface)] p-5 text-[var(--text)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{cantorExistente ? 'Editar cantor' : 'Novo cantor'}</h2>
          <button onClick={onFechar} className="text-[var(--muted)] hover:text-[var(--text)]">
            <X size={20} />
          </button>
        </div>

        {erro && (
          <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">{erro}</p>
        )}

        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Nome *</span>
            <input
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-[var(--muted)]">
              URL da foto
            </span>
            <input
              value={form.fotoUrl ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, fotoUrl: e.target.value }))}
              className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onFechar} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm">
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            disabled={salvando}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-fg)] disabled:opacity-50"
          >
            {salvando && <Loader2 size={14} className="animate-spin" />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
