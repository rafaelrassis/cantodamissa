import { useState } from 'react';
import { X, Link2, Upload, PenLine, Loader2 } from 'lucide-react';
import type { Musica, TempoLiturgico, CicloDominical, MomentoMissa } from '../types/musica';
import type { DadosMusica } from '../lib/musicasApi';
import { LABEL_TEMPO, LABEL_MOMENTO } from '../lib/labels';

interface Props {
  musicaExistente: Musica | null;
  onSalvar: (dados: DadosMusica) => Promise<void>;
  onFechar: () => void;
}

type ModoEntrada = 'manual' | 'upload' | 'link';

const TODOS_TEMPOS: TempoLiturgico[] = ['Advento', 'Natal', 'Quaresma', 'Pascoa', 'TempoComum'];
const TODOS_CICLOS: CicloDominical[] = ['A', 'B', 'C'];
const TODOS_MOMENTOS: MomentoMissa[] = [
  'Entrada', 'AtoPenitencial', 'Gloria', 'SalmoResponsorial', 'AclamacaoEvangelho',
  'Ofertorio', 'Santo', 'Cordeiro', 'Comunhao', 'PosComunhao', 'Envio',
];

const FORM_VAZIO: DadosMusica = {
  title: '',
  artist: '',
  originalTone: 'C',
  difficulty: null,
  capo: 0,
  youtubeUrl: '',
  lyrics: '',
  chordsContent: '',
  tempoLiturgico: [],
  ciclo: [],
  momento: [],
  sourceUrl: null,
  sourceFileUrl: null,
};

export function MusicaFormModal({ musicaExistente, onSalvar, onFechar }: Props) {
  const [modo, setModo] = useState<ModoEntrada>('manual');
  const [form, setForm] = useState<DadosMusica>(
    musicaExistente
      ? {
          title: musicaExistente.title,
          artist: musicaExistente.artist ?? '',
          originalTone: musicaExistente.originalTone,
          difficulty: musicaExistente.difficulty,
          capo: musicaExistente.capo,
          youtubeUrl: musicaExistente.youtubeUrl ?? '',
          lyrics: musicaExistente.lyrics ?? '',
          chordsContent: musicaExistente.chordsContent,
          tempoLiturgico: musicaExistente.tempoLiturgico,
          ciclo: musicaExistente.ciclo,
          momento: musicaExistente.momento,
        }
      : FORM_VAZIO
  );
  const [linkCifraClub, setLinkCifraClub] = useState('');
  const [importando, setImportando] = useState(false);
  const [enviandoArquivo, setEnviandoArquivo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  function atualizar<K extends keyof DadosMusica>(campo: K, valor: DadosMusica[K]) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  function alternarNaLista<T extends string>(lista: T[], valor: T): T[] {
    return lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor];
  }

  async function importarDoCifraClub() {
    setErro(null);
    if (!linkCifraClub.trim()) return;
    setImportando(true);
    try {
      const resp = await fetch('/api/cifraclub-import', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: linkCifraClub.trim() }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Falha ao importar');
      setForm((f) => ({
        ...f,
        title: data.title || f.title,
        artist: data.artist || f.artist,
        originalTone: data.originalTone || f.originalTone,
        chordsContent: data.chordsContent || f.chordsContent,
        lyrics: data.lyrics || f.lyrics,
        sourceUrl: data.sourceUrl,
      }));
      setModo('manual'); // depois de importar, revisão final é sempre no form manual
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha ao importar do Cifra Club');
    } finally {
      setImportando(false);
    }
  }

  async function enviarArquivo(file: File) {
    setErro(null);
    setEnviandoArquivo(true);
    try {
      const resp = await fetch('/api/blob-upload', {
        method: 'POST',
        headers: { 'content-type': file.type, 'x-filename': file.name },
        body: file,
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Falha no upload');
      atualizar('sourceFileUrl', data.url);
      setModo('manual'); // arquivo é só referência — cifra ainda é preenchida/colada manualmente
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha no upload do arquivo');
    } finally {
      setEnviandoArquivo(false);
    }
  }

  async function handleSalvar() {
    setErro(null);
    if (!form.title.trim() || !form.chordsContent.trim()) {
      setErro('Título e cifra (chordsContent) são obrigatórios.');
      return;
    }
    setSalvando(true);
    try {
      await onSalvar({ ...form, artist: form.artist?.trim() || null, youtubeUrl: form.youtubeUrl?.trim() || null });
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha ao salvar');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-[var(--surface)] p-5 text-[var(--text)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{musicaExistente ? 'Editar música' : 'Nova música'}</h2>
          <button onClick={onFechar} className="text-[var(--muted)] hover:text-[var(--text)]">
            <X size={20} />
          </button>
        </div>

        {!musicaExistente && (
          <div className="mb-4 flex gap-1 rounded-lg border border-[var(--border)] p-1">
            <AbaModo icon={PenLine} label="Manual" ativo={modo === 'manual'} onClick={() => setModo('manual')} />
            <AbaModo icon={Upload} label="Upload de arquivo" ativo={modo === 'upload'} onClick={() => setModo('upload')} />
            <AbaModo icon={Link2} label="Link Cifra Club" ativo={modo === 'link'} onClick={() => setModo('link')} />
          </div>
        )}

        {erro && (
          <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">{erro}</p>
        )}

        {modo === 'upload' && (
          <div className="mb-4 rounded-lg border border-dashed border-[var(--border)] p-4 text-center">
            <p className="mb-2 text-sm text-[var(--muted)]">
              Sobe o PDF/imagem da cifra pro Vercel Blob — vira um link de referência anexado à
              música. Não faz OCR: o texto da cifra ainda precisa ser colado no campo abaixo.
            </p>
            <input
              type="file"
              accept="application/pdf,image/png,image/jpeg,image/webp"
              disabled={enviandoArquivo}
              onChange={(e) => e.target.files?.[0] && enviarArquivo(e.target.files[0])}
              className="mx-auto text-sm"
            />
            {enviandoArquivo && (
              <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-[var(--muted)]">
                <Loader2 size={12} className="animate-spin" /> Enviando...
              </p>
            )}
            {form.sourceFileUrl && (
              <a
                href={form.sourceFileUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 block truncate text-xs text-[var(--accent)] underline"
              >
                {form.sourceFileUrl}
              </a>
            )}
          </div>
        )}

        {modo === 'link' && (
          <div className="mb-4 rounded-lg border border-[var(--border)] p-4">
            <p className="mb-2 text-sm text-[var(--muted)]">
              Cola o link de uma música no cifraclub.com.br — título, artista, tom e cifra vêm
              preenchidos automaticamente pra revisão.
            </p>
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://www.cifraclub.com.br/artista/musica/"
                value={linkCifraClub}
                onChange={(e) => setLinkCifraClub(e.target.value)}
                className="flex-1 rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
              />
              <button
                onClick={importarDoCifraClub}
                disabled={importando || !linkCifraClub.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--accent-fg)] disabled:opacity-50"
              >
                {importando ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
                Importar
              </button>
            </div>
          </div>
        )}

        {/* Form manual — sempre visível, é onde tudo (manual, upload, link) converge pra revisão final */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Título *">
              <input
                value={form.title}
                onChange={(e) => atualizar('title', e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
              />
            </Campo>
            <Campo label="Artista/comunidade">
              <input
                value={form.artist ?? ''}
                onChange={(e) => atualizar('artist', e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
              />
            </Campo>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Campo label="Tom original">
              <input
                value={form.originalTone}
                onChange={(e) => atualizar('originalTone', e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
              />
            </Campo>
            <Campo label="Capotraste">
              <input
                type="number"
                value={form.capo}
                onChange={(e) => atualizar('capo', Number(e.target.value))}
                className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
              />
            </Campo>
            <Campo label="Dificuldade (1-5)">
              <input
                type="number"
                min={1}
                max={5}
                value={form.difficulty ?? ''}
                onChange={(e) => atualizar('difficulty', e.target.value ? Number(e.target.value) : null)}
                className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
              />
            </Campo>
          </div>

          <Campo label="Link do YouTube">
            <input
              value={form.youtubeUrl ?? ''}
              onChange={(e) => atualizar('youtubeUrl', e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
            />
          </Campo>

          <Campo label="Cifra (formato ChordPro: [G]texto [Em]mais texto) *">
            <textarea
              value={form.chordsContent}
              onChange={(e) => atualizar('chordsContent', e.target.value)}
              rows={10}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 font-mono text-xs"
            />
          </Campo>

          <Campo label="Tempo litúrgico">
            <div className="flex flex-wrap gap-1.5">
              {TODOS_TEMPOS.map((t) => (
                <Chip
                  key={t}
                  label={LABEL_TEMPO[t]}
                  ativo={form.tempoLiturgico.includes(t)}
                  onClick={() => atualizar('tempoLiturgico', alternarNaLista(form.tempoLiturgico, t))}
                />
              ))}
            </div>
          </Campo>

          <Campo label="Ciclo dominical">
            <div className="flex flex-wrap gap-1.5">
              {TODOS_CICLOS.map((c) => (
                <Chip
                  key={c}
                  label={c}
                  ativo={form.ciclo.includes(c)}
                  onClick={() => atualizar('ciclo', alternarNaLista(form.ciclo, c))}
                />
              ))}
            </div>
          </Campo>

          <Campo label="Momento da missa">
            <div className="flex flex-wrap gap-1.5">
              {TODOS_MOMENTOS.map((m) => (
                <Chip
                  key={m}
                  label={LABEL_MOMENTO[m]}
                  ativo={form.momento.includes(m)}
                  onClick={() => atualizar('momento', alternarNaLista(form.momento, m))}
                />
              ))}
            </div>
          </Campo>
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

function AbaModo({
  icon: Icon,
  label,
  ativo,
  onClick,
}: {
  icon: typeof PenLine;
  label: string;
  ativo: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium ${
        ativo ? 'bg-[var(--accent)] text-[var(--accent-fg)]' : 'text-[var(--muted)]'
      }`}
    >
      <Icon size={13} /> {label}
    </button>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-[var(--muted)]">{label}</span>
      {children}
    </label>
  );
}

function Chip({ label, ativo, onClick }: { label: string; ativo: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-xs ${
        ativo
          ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)]'
          : 'border-[var(--border)] text-[var(--muted)]'
      }`}
    >
      {label}
    </button>
  );
}
