import { useState } from 'react';
import { X } from 'lucide-react';
import type { Musica } from '../types/musica';

interface Props {
  modo: 'nova' | 'correcao';
  musicaBase?: Musica;
  onSubmit: (dados: {
    title: string;
    artist: string;
    originalTone: string;
    chordsContent: string;
    autorNome: string;
    observacao?: string;
  }) => void;
  onClose: () => void;
}

export function SubmissaoForm({ modo, musicaBase, onSubmit, onClose }: Props) {
  const [title, setTitle] = useState(musicaBase?.title ?? '');
  const [artist, setArtist] = useState(musicaBase?.artist ?? '');
  const [tone, setTone] = useState(musicaBase?.originalTone ?? '');
  const [chordsContent, setChordsContent] = useState(musicaBase?.chordsContent ?? '');
  const [autorNome, setAutorNome] = useState('');
  const [observacao, setObservacao] = useState('');
  const [enviado, setEnviado] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !tone.trim() || !chordsContent.trim() || !autorNome.trim()) return;
    onSubmit({
      title: title.trim(),
      artist: artist.trim(),
      originalTone: tone.trim(),
      chordsContent,
      autorNome: autorNome.trim(),
      observacao: observacao.trim() || undefined,
    });
    setEnviado(true);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 lg:items-center">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-[28px] bg-[var(--bg)] p-[22px] shadow-[0_12px_30px_rgba(30,42,20,0.18)] lg:max-w-lg lg:rounded-[28px]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl text-[var(--text)]">
            {modo === 'nova' ? 'Sugerir nova música' : 'Sugerir correção'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="text-[var(--muted)] hover:text-[var(--text)]"
          >
            <X size={18} strokeWidth={2.75} />
          </button>
        </div>

        {enviado ? (
          <div className="py-6 text-center">
            <p className="mb-1 text-base font-semibold text-[var(--text)]">
              Sugestão enviada! 🙏
            </p>
            <p className="mb-4 text-sm text-[var(--muted)]">
              Um administrador vai revisar antes de publicar. Os colaboradores recebem crédito na
              música quando aprovada.
            </p>
            <button
              onClick={onClose}
              className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-bold text-[var(--accent-fg)]"
            >
              Fechar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <Campo label="Título" required>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="input-field"
              />
            </Campo>
            <Campo label="Artista / Autor">
              <input value={artist} onChange={(e) => setArtist(e.target.value)} className="input-field" />
            </Campo>
            <Campo label="Tom original" required>
              <input
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                required
                placeholder="ex: G, Am, D"
                className="input-field w-28 font-mono"
              />
            </Campo>
            <Campo label="Cifra (formato ChordPro: [G]texto [Em]mais texto)" required>
              <textarea
                value={chordsContent}
                onChange={(e) => setChordsContent(e.target.value)}
                required
                rows={8}
                className="input-field font-mono text-sm"
                placeholder="[G]Como são belos os [Em]pés do mensa[Am]geiro..."
              />
            </Campo>
            {modo === 'correcao' && (
              <Campo label="O que você corrigiu?">
                <input
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="ex: acorde do refrão estava errado"
                  className="input-field"
                />
              </Campo>
            )}
            <Campo label="Seu nome (pra receber crédito)" required>
              <input
                value={autorNome}
                onChange={(e) => setAutorNome(e.target.value)}
                required
                className="input-field"
              />
            </Campo>

            <button
              type="submit"
              className="mt-2 rounded-full bg-[var(--accent)] py-[14px] text-sm font-bold text-[var(--accent-fg)]"
            >
              Enviar sugestão
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Campo({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-bold text-[var(--muted)]">
        {label}
        {required && <span className="text-[var(--accent)]"> *</span>}
      </span>
      {children}
    </label>
  );
}
