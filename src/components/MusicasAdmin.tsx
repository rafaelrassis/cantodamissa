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
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-[var(--muted)]">{musicas.length} música(s)</p>
        <div className="flex gap-2">
          <button
            onClick={() => setUploadEmMassa(true)}
            className="flex items-center gap-1.5 rounded-full border border-[var(--border)] px-[18px] py-2.5 text-[13.5px] font-bold"
          >
            <FolderUp size={15} strokeWidth={2.75} /> Upload em massa
          </button>
          <button
            onClick={() => setEditando('nova')}
            className="flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-[18px] py-2.5 text-[13.5px] font-bold text-[var(--accent-fg)]"
          >
            <Plus size={15} strokeWidth={2.75} /> Nova música
          </button>
        </div>
      </div>

      {carregando && (
        <p className="flex items-center justify-center gap-2 py-14 text-sm text-[var(--muted)]">
          <Loader2 size={16} className="animate-spin" /> Carregando...
        </p>
      )}

      {erro && (
        <p className="rounded-2xl bg-[#a3111d]/10 px-4 py-3 text-sm text-[#a3111d]">{erro}</p>
      )}

      {!carregando && !erro && musicas.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-14 text-center">
          <Music size={28} strokeWidth={2.75} className="text-[var(--muted)]" />
          <p className="rounded-full bg-[var(--accent-soft)] px-4 py-2 text-sm font-semibold text-[#3b4a27]">
            Nenhuma música cadastrada ainda.
          </p>
        </div>
      )}

      <div className="grid gap-2 lg:grid-cols-2 lg:items-start">
        {musicas.map((m) => (
          <div
            key={m.id}
            className="flex items-center justify-between gap-2.5 rounded-[20px] border border-[var(--border)] px-[18px] py-[11px]"
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
                className="flex h-[30px] w-[30px] items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--surface2)]"
                title="Editar"
              >
                <Pencil size={15} strokeWidth={2.75} />
              </button>
              <button
                onClick={() => handleExcluir(m)}
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
