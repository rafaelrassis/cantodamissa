import { useEffect, useState } from 'react';
import { X, Link2, Upload, PenLine, Loader2, FolderSearch, FileText } from 'lucide-react';
import type { Musica, TempoLiturgico, CicloDominical, MomentoMissa } from '../types/musica';
import type { DadosMusica } from '../lib/musicasApi';
import type { Cantor } from '../types/cantor';
import { listarCantores } from '../lib/cantoresApi';
import { LABEL_TEMPO, LABEL_MOMENTO } from '../lib/labels';

interface Props {
  musicaExistente: Musica | null;
  onSalvar: (dados: DadosMusica) => Promise<void>;
  onFechar: () => void;
}

type ModoEntrada = 'manual' | 'upload' | 'link';

interface ArquivoBlob {
  url: string;
  pathname: string;
  size: number;
  uploadedAt: string;
}

const TODOS_TEMPOS: TempoLiturgico[] = ['Advento', 'Natal', 'Quaresma', 'Pascoa', 'TempoComum'];
const TODOS_CICLOS: CicloDominical[] = ['A', 'B', 'C'];
const TODOS_MOMENTOS: MomentoMissa[] = [
  'Entrada', 'AtoPenitencial', 'Gloria', 'SalmoResponsorial', 'AclamacaoEvangelho',
  'Ofertorio', 'Santo', 'Cordeiro', 'Comunhao', 'PosComunhao', 'Envio',
];

const FORM_VAZIO: DadosMusica = {
  title: '',
  artist: '',
  cantorId: null,
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
          cantorId: musicaExistente.cantorId,
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
  const [arquivosExistentes, setArquivosExistentes] = useState<ArquivoBlob[] | null>(null);
  const [carregandoArquivos, setCarregandoArquivos] = useState(false);
  const [filtroArquivos, setFiltroArquivos] = useState('');
  const [cantores, setCantores] = useState<Cantor[]>([]);

  useEffect(() => {
    listarCantores()
      .then(setCantores)
      .catch(() => setCantores([]));
  }, []);

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

  async function carregarArquivosExistentes() {
    setErro(null);
    setCarregandoArquivos(true);
    try {
      const resp = await fetch('/api/blob-list?prefix=cifra');
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Falha ao listar arquivos');
      setArquivosExistentes(data.blobs);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha ao listar arquivos');
    } finally {
      setCarregandoArquivos(false);
    }
  }

  function escolherArquivoExistente(url: string) {
    atualizar('sourceFileUrl', url);
    setModo('manual'); // arquivo é só referência — cifra ainda é preenchida/colada manualmente
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

  const campoPill =
    'w-full rounded-full border border-[var(--border)] bg-[var(--bg)] px-4 py-[11px] text-sm outline-none focus:border-[var(--accent)]';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[28px] bg-[var(--surface)] p-6 text-[var(--text)] shadow-[var(--shadow)]">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl">{musicaExistente ? 'Editar música' : 'Nova música'}</h2>
          <button onClick={onFechar} className="text-[var(--muted)] hover:text-[var(--text)]">
            <X size={18} strokeWidth={2.75} />
          </button>
        </div>

        {!musicaExistente && (
          <div className="mb-5 flex max-w-xl gap-1 rounded-full border border-[var(--border)] bg-[var(--bg)] p-1">
            <AbaModo icon={PenLine} label="Manual" ativo={modo === 'manual'} onClick={() => setModo('manual')} />
            <AbaModo icon={Upload} label="Upload de arquivo" ativo={modo === 'upload'} onClick={() => setModo('upload')} />
            <AbaModo icon={Link2} label="Link Cifra Club" ativo={modo === 'link'} onClick={() => setModo('link')} />
          </div>
        )}

        {erro && (
          <p className="mb-4 rounded-[20px] bg-red-500/10 px-4 py-2.5 text-sm text-red-600">{erro}</p>
        )}

        {modo === 'upload' && (
          <div className="mb-5 rounded-[28px] border border-dashed border-[var(--border)] bg-[var(--bg)] p-6 text-center">
            <p className="mb-3.5 text-sm text-[var(--muted)]">
              Sobe o PDF/imagem da cifra pro Vercel Blob — vira um link de referência anexado à
              música. Não faz OCR: o texto da cifra ainda precisa ser colado no campo abaixo.
            </p>
            <label
              className={`mx-auto flex w-fit items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-[22px] py-[11px] text-[13.5px] font-bold ${
                enviandoArquivo ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
              }`}
            >
              <Upload size={15} strokeWidth={2.75} /> Escolher arquivo
              <input
                type="file"
                accept="application/pdf,image/png,image/jpeg,image/webp"
                disabled={enviandoArquivo}
                onChange={(e) => e.target.files?.[0] && enviarArquivo(e.target.files[0])}
                className="hidden"
              />
            </label>
            {enviandoArquivo && (
              <p className="mt-2.5 flex items-center justify-center gap-1.5 text-xs text-[var(--muted)]">
                <Loader2 size={12} strokeWidth={2.75} className="animate-spin" /> Enviando...
              </p>
            )}
            {form.sourceFileUrl && (
              <a
                href={form.sourceFileUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2.5 block truncate text-xs text-[var(--accent)] underline"
              >
                {form.sourceFileUrl}
              </a>
            )}

            <div className="mt-4 border-t border-[var(--border)] pt-4 text-left">
              {arquivosExistentes === null ? (
                <button
                  type="button"
                  onClick={carregarArquivosExistentes}
                  disabled={carregandoArquivos}
                  className="mx-auto flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] hover:underline disabled:opacity-50"
                >
                  {carregandoArquivos ? (
                    <Loader2 size={12} strokeWidth={2.75} className="animate-spin" />
                  ) : (
                    <FolderSearch size={12} strokeWidth={2.75} />
                  )}
                  Ver arquivos já enviados
                </button>
              ) : (
                <>
                  <input
                    value={filtroArquivos}
                    onChange={(e) => setFiltroArquivos(e.target.value)}
                    placeholder="Filtrar por nome ou cantor..."
                    className="mb-2.5 w-full rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-[9px] text-[12.5px] outline-none focus:border-[var(--accent)]"
                  />
                  <div className="max-h-48 space-y-1 overflow-y-auto">
                    {arquivosExistentes
                      .filter((a) => a.pathname.toLowerCase().includes(filtroArquivos.toLowerCase()))
                      .map((a) => (
                        <button
                          type="button"
                          key={a.url}
                          onClick={() => escolherArquivoExistente(a.url)}
                          className={`flex w-full items-center gap-1.5 truncate rounded-[14px] px-2.5 py-2 text-left text-xs hover:bg-[var(--surface)] ${
                            form.sourceFileUrl === a.url ? 'bg-[var(--surface)] font-semibold' : ''
                          }`}
                          title={a.pathname}
                        >
                          <FileText size={12} strokeWidth={2.75} className="shrink-0 text-[var(--muted)]" />
                          <span className="truncate">{a.pathname.replace(/^cifra\//, '')}</span>
                        </button>
                      ))}
                    {arquivosExistentes.length === 0 && (
                      <p className="py-2 text-center text-xs text-[var(--muted)]">
                        Nenhum arquivo encontrado.
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {modo === 'link' && (
          <div className="mb-5 rounded-[28px] border border-[var(--border)] bg-[var(--bg)] p-5">
            <p className="mb-3.5 text-sm text-[var(--muted)]">
              Cola o link de uma música no cifraclub.com.br — título, artista, tom e cifra vêm
              preenchidos automaticamente pra revisão.
            </p>
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://www.cifraclub.com.br/artista/musica/"
                value={linkCifraClub}
                onChange={(e) => setLinkCifraClub(e.target.value)}
                className="flex-1 rounded-full border border-[var(--border)] bg-[var(--surface)] px-[18px] py-[11px] text-[13.5px] outline-none focus:border-[var(--accent)]"
              />
              <button
                onClick={importarDoCifraClub}
                disabled={importando || !linkCifraClub.trim()}
                className="flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-5 py-[11px] text-[13.5px] font-bold text-[var(--accent-fg)] disabled:opacity-50"
              >
                {importando ? <Loader2 size={14} strokeWidth={2.75} className="animate-spin" /> : <Link2 size={14} strokeWidth={2.75} />}
                Importar
              </button>
            </div>
          </div>
        )}

        {/* Form manual — sempre visível, é onde tudo (manual, upload, link) converge pra revisão final */}
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <Campo label="Título *">
              <input
                value={form.title}
                onChange={(e) => atualizar('title', e.target.value)}
                className={campoPill}
              />
            </Campo>
            <Campo label="Artista/comunidade">
              <input
                value={form.artist ?? ''}
                onChange={(e) => atualizar('artist', e.target.value)}
                className={campoPill}
              />
            </Campo>
            <Campo label="Cantor (página do cantor — opcional, cadastrado na aba Cantores)">
              <select
                value={form.cantorId ?? ''}
                onChange={(e) => atualizar('cantorId', e.target.value || null)}
                className={campoPill}
              >
                <option value="">Nenhum</option>
                {cantores.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </Campo>

            <Campo label="Tom original">
              <input
                value={form.originalTone}
                onChange={(e) => atualizar('originalTone', e.target.value)}
                className={`${campoPill} font-mono`}
              />
            </Campo>
            <Campo label="Capotraste">
              <input
                type="number"
                value={form.capo}
                onChange={(e) => atualizar('capo', Number(e.target.value))}
                className={`${campoPill} font-mono`}
              />
            </Campo>
            <Campo label="Dificuldade (1-5)">
              <input
                type="number"
                min={1}
                max={5}
                value={form.difficulty ?? ''}
                onChange={(e) => atualizar('difficulty', e.target.value ? Number(e.target.value) : null)}
                className={`${campoPill} font-mono`}
              />
            </Campo>

            <Campo label="Link do YouTube" className="lg:col-span-3">
              <input
                value={form.youtubeUrl ?? ''}
                onChange={(e) => atualizar('youtubeUrl', e.target.value)}
                className={campoPill}
              />
            </Campo>

            <Campo label="Cifra (formato ChordPro: [G]texto [Em]mais texto) *" className="lg:col-span-3">
              <textarea
                value={form.chordsContent}
                onChange={(e) => atualizar('chordsContent', e.target.value)}
                rows={10}
                className="w-full rounded-[24px] border border-[var(--border)] bg-[var(--bg)] px-[18px] py-3.5 font-mono text-[12.5px] leading-[1.9] outline-none focus:border-[var(--accent)]"
              />
            </Campo>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-[18px]">
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
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onFechar} className="rounded-full border border-[var(--border)] bg-[var(--bg)] px-[22px] py-[11px] text-sm font-bold">
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            disabled={salvando}
            className="flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-6 py-[11px] text-sm font-bold text-[var(--accent-fg)] disabled:opacity-50"
          >
            {salvando && <Loader2 size={14} strokeWidth={2.75} className="animate-spin" />}
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
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-[12.5px] font-semibold ${
        ativo ? 'bg-[var(--accent)] text-[var(--accent-fg)]' : 'text-[var(--muted)]'
      }`}
    >
      <Icon size={13} strokeWidth={2.75} /> {label}
    </button>
  );
}

function Campo({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="mb-1.5 block text-xs font-semibold text-[var(--muted)]">{label}</span>
      {children}
    </label>
  );
}

function Chip({ label, ativo, onClick }: { label: string; ativo: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-[13px] py-1.5 text-xs font-semibold ${
        ativo
          ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)]'
          : 'border-[var(--border)] text-[var(--muted)]'
      }`}
    >
      {label}
    </button>
  );
}
