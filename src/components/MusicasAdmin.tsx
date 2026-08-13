import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, Music, FolderUp } from 'lucide-react';
import type { Musica } from '../types/musica';
import {
  listarTodasMusicas,
  criarMusica,
  atualizarMusica,
  excluirMusica,
  type DadosMusica,
} from '../lib/musicasApi';
import { MusicaFormModal } from './MusicaFormModal';
import { BulkUploadCifraModal } from './BulkUploadCifraModal';

export function MusicasAdmin() {
  const [musicas, setMusicas] = useState<Musica[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [editando, setEditando] = useState<Musica | null | 'nova'>(null);
  const [uploadEmMassa, setUploadEmMassa] = useState(false);

  const recarregar = useCallback(() => {
    setCarregando(true);
    setErro(null);
    listarTodasMusicas()
      .then(setMusicas)
      .catch((err) => setErro(err instanceof Error ? err.message : 'Falha ao carregar músicas'))
      .finally(() => setCarregando(false));
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  async function handleSalvar(dados: DadosMusica) {
    if (editando === 'nova') {
      await criarMusica(dados);
    } else if (editando) {
      await atualizarMusica(editando.id, dados);
    }
    setEditando(null);
    recarregar();
  }

  async function handleExcluir(musica: Musica) {
    if (!confirm(`Excluir "${musica.title}"? Essa ação não pode ser desfeita.`)) return;
    try {
      await excluirMusica(musica.id);
      recarregar();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Falha ao excluir');
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-4 lg:px-10">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-[var(--muted)]">{musicas.length} música(s)</p>
        <div className="flex gap-2">
          <button
            onClick={() => setUploadEmMassa(true)}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold"
          >
            <FolderUp size={15} /> Upload em massa
          </button>
          <button
            onClick={() => setEditando('nova')}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--accent-fg)]"
          >
            <Plus size={15} /> Nova música
          </button>
        </div>
      </div>

      {carregando && (
        <p className="flex items-center gap-2 py-10 justify-center text-sm text-[var(--muted)]">
          <Loader2 size={16} className="animate-spin" /> Carregando...
        </p>
      )}

      {erro && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">{erro}</p>
      )}

      {!carregando && !erro && musicas.length === 0 && (
        <div className="py-10 text-center text-sm text-[var(--muted)]">
          <Music size={28} className="mx-auto mb-2" />
          Nenhuma música cadastrada ainda.
        </div>
      )}

      {musicas.map((m) => (
        <div
          key={m.id}
          className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] px-3 py-2"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{m.title}</p>
            <p className="truncate text-xs text-[var(--muted)]">
              {m.artist || 'sem artista'} · tom {m.originalTone}
              {m.tempoLiturgico.length > 0 && ` · ${m.tempoLiturgico.join(', ')}`}
            </p>
          </div>
          <div className="flex shrink-0 gap-1">
            <button
              onClick={() => setEditando(m)}
              className="rounded-md p-1.5 text-[var(--muted)] hover:bg-[var(--bg)]"
              title="Editar"
            >
              <Pencil size={15} />
            </button>
            <button
              onClick={() => handleExcluir(m)}
              className="rounded-md p-1.5 text-red-600 hover:bg-red-500/10"
              title="Excluir"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      ))}

      {editando && (
        <MusicaFormModal
          musicaExistente={editando === 'nova' ? null : editando}
          onSalvar={handleSalvar}
          onFechar={() => setEditando(null)}
        />
      )}

      {uploadEmMassa && <BulkUploadCifraModal onFechar={() => setUploadEmMassa(false)} />}
    </div>
  );
}
