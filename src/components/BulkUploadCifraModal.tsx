import { useState } from 'react';
import { unzipSync } from 'fflate';
import {
  X,
  FolderUp,
  Files,
  FileArchive,
  Loader2,
  CheckCircle2,
  XCircle,
  Trash2,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Copy,
} from 'lucide-react';
import { criarMusica, listarTodasMusicas, normalizar } from '../lib/musicasApi';

interface Props {
  onFechar: () => void;
}

type StatusItem = 'pendente' | 'extraindo' | 'pronto' | 'enviando' | 'ok' | 'erro' | 'duplicada';

interface ItemUpload {
  id: string;
  file: File;
  musica: string;
  cantor: string;
  musicaSugeridaDoNome: string; // chute inicial vindo do nome do arquivo — se o usuário editar, não sobrescreve mais com o título extraído do PDF
  status: StatusItem;
  chordsContent: string; // extraído do PDF (editável) — vazio pra imagens ou PDF sem camada de texto
  mostrarCifra: boolean;
  erro?: string;
}

const PASTA_BASE = 'cifra';
const TIPOS_PERMITIDOS = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

function gerarId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// Tenta separar "Musica - Cantor.pdf" ou "Cantor - Musica.pdf" pra pré-preencher.
// Sempre exige revisão manual: heurística só economiza digitação.
function chuteInicial(nomeArquivo: string): { musica: string; cantor: string } {
  const semExtensao = nomeArquivo.replace(/\.[^.]+$/, '');
  const partes = semExtensao.split(/\s*-\s*/);
  if (partes.length >= 2) {
    return { musica: partes[0].trim(), cantor: partes.slice(1).join(' - ').trim() };
  }
  return { musica: semExtensao.trim(), cantor: '' };
}

function sanitizarNomeArquivo(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-zA-Z0-9\- ]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

// Chave pra comparar música+cantor ignorando maiúsculas/acentos — evita
// criar duas músicas iguais no banco (ex: reenvio acidental do mesmo lote).
function chaveMusica(musica: string, cantor: string): string {
  return `${normalizar(musica)}|${normalizar(cantor)}`;
}

function extensaoParaMime(nome: string): string | null {
  const ext = nome.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return null;
}

// Ignora diretórios e arquivos ocultos/de metadado (ex: "__MACOSX/", ".DS_Store")
function caminhoIgnoravel(caminho: string): boolean {
  if (caminho.endsWith('/')) return true;
  return caminho.split('/').some((parte) => parte.startsWith('.') || parte === '__MACOSX');
}

async function extrairArquivosDoZip(zipFile: File): Promise<File[]> {
  const buffer = new Uint8Array(await zipFile.arrayBuffer());
  const entradas = unzipSync(buffer, {
    filter: (entry) => !caminhoIgnoravel(entry.name) && extensaoParaMime(entry.name) !== null,
  });
  return Object.entries(entradas).map(([caminho, bytes]) => {
    const nomeBase = caminho.split('/').pop() || caminho;
    return new File([bytes], nomeBase, { type: extensaoParaMime(nomeBase) ?? undefined });
  });
}

export function BulkUploadCifraModal({ onFechar }: Props) {
  const [itens, setItens] = useState<ItemUpload[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [processandoZip, setProcessandoZip] = useState(false);

  function atualizarItem(id: string, campos: Partial<ItemUpload>) {
    setItens((atual) => atual.map((it) => (it.id === id ? { ...it, ...campos } : it)));
  }

  async function extrairCifraItem(item: ItemUpload) {
    if (item.file.type !== 'application/pdf') return;
    atualizarItem(item.id, { status: 'extraindo' });
    try {
      const resp = await fetch('/api/cifra-pdf-extract', {
        method: 'POST',
        headers: { 'content-type': 'application/pdf' },
        body: item.file,
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Falha ao extrair cifra');
      setItens((atual) =>
        atual.map((it) => {
          if (it.id !== item.id) return it;
          // só usa o título extraído do PDF se o campo ainda tiver o chute
          // original do nome do arquivo — esse formato de PDF raramente tem
          // música/cantor no nome, então o título de dentro do arquivo
          // costuma ser mais confiável, mas não sobrescreve edição manual
          const musica =
            it.musica === it.musicaSugeridaDoNome && data.tituloSugerido ? data.tituloSugerido : it.musica;
          return { ...it, status: 'pronto', chordsContent: data.chordsContent ?? '', musica };
        })
      );
    } catch (err) {
      atualizarItem(item.id, {
        status: 'pronto',
        erro: err instanceof Error ? err.message : 'Falha ao extrair cifra do PDF',
      });
    }
  }

  async function adicionarArquivos(files: FileList | null) {
    if (!files) return;
    const brutos = Array.from(files);

    const zips = brutos.filter((f) => f.name.toLowerCase().endsWith('.zip'));
    const diretos = brutos.filter((f) => !f.name.toLowerCase().endsWith('.zip') && TIPOS_PERMITIDOS.includes(f.type));

    let doZip: File[] = [];
    if (zips.length > 0) {
      setProcessandoZip(true);
      try {
        const listas = await Promise.all(zips.map(extrairArquivosDoZip));
        doZip = listas.flat();
      } finally {
        setProcessandoZip(false);
      }
    }

    const novos: ItemUpload[] = [...diretos, ...doZip].map((f) => {
      const sugestao = chuteInicial(f.name);
      return {
        id: gerarId(),
        file: f,
        status: 'pendente',
        chordsContent: '',
        mostrarCifra: false,
        musicaSugeridaDoNome: sugestao.musica,
        ...sugestao,
      };
    });
    setItens((atual) => [...atual, ...novos]);

    for (const item of novos) {
      if (item.file.type === 'application/pdf') {
        void extrairCifraItem(item);
      }
    }
  }

  function removerItem(id: string) {
    setItens((atual) => atual.filter((it) => it.id !== id));
  }

  function atualizarCampo(id: string, campo: 'musica' | 'cantor' | 'chordsContent', valor: string) {
    atualizarItem(id, { [campo]: valor });
  }

  const todosPreenchidos = itens.length > 0 && itens.every((it) => it.musica.trim() && it.cantor.trim());
  const algumExtraindo = itens.some((it) => it.status === 'extraindo');

  async function enviarTodos() {
    setEnviando(true);

    const musicasExistentes = new Set(
      (await listarTodasMusicas()).map((m) => chaveMusica(m.title, m.artist ?? ''))
    );

    for (const item of itens) {
      if (item.status === 'ok') continue;

      const chave = chaveMusica(item.musica, item.cantor);
      if (item.chordsContent.trim() && musicasExistentes.has(chave)) {
        atualizarItem(item.id, {
          status: 'duplicada',
          erro: 'Já existe uma música com esse título e cantor — nada foi enviado. Edite o nome ou remova o item se for intencional.',
        });
        continue;
      }

      atualizarItem(item.id, { status: 'enviando', erro: undefined });
      try {
        const ext = item.file.name.split('.').pop() || 'pdf';
        const nomeFinal = `${sanitizarNomeArquivo(item.musica)} - ${sanitizarNomeArquivo(item.cantor)}.${ext}`;
        const pastaDestino = `${PASTA_BASE}/${sanitizarNomeArquivo(item.cantor) || 'Sem Cantor'}`;
        const resp = await fetch('/api/blob-upload', {
          method: 'POST',
          headers: {
            'content-type': item.file.type,
            'x-filename': nomeFinal,
            'x-folder': pastaDestino,
          },
          body: item.file,
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || 'Falha no upload');

        if (item.chordsContent.trim()) {
          await criarMusica({
            title: item.musica.trim(),
            artist: item.cantor.trim(),
            originalTone: 'C',
            difficulty: null,
            capo: 0,
            youtubeUrl: null,
            lyrics: null,
            chordsContent: item.chordsContent,
            tempoLiturgico: [],
            ciclo: [],
            momento: [],
            sourceFileUrl: data.url,
          });
          musicasExistentes.add(chave); // evita duplicar de novo dentro do mesmo lote
        }

        atualizarItem(item.id, { status: 'ok' });
      } catch (err) {
        atualizarItem(item.id, {
          status: 'erro',
          erro: err instanceof Error ? err.message : 'Falha desconhecida',
        });
      }
    }
    setEnviando(false);
  }

  const enviadosOk = itens.filter((it) => it.status === 'ok').length;
  const comCifraCount = itens.filter((it) => it.chordsContent.trim()).length;
  const duplicadasCount = itens.filter((it) => it.status === 'duplicada').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[28px] bg-[var(--surface)] p-6 text-[var(--text)] shadow-[var(--shadow)]">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl">Upload em massa de cifras</h2>
            <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
              Sobe os arquivos pra pasta <code className="font-mono">{PASTA_BASE}/</code> no Blob, organizados por
              cantor. PDFs com texto real têm a cifra extraída automaticamente (revise antes de enviar) e a
              música já é criada no banco; imagens e PDFs sem texto extraível só ficam guardados como
              referência. Nome da música e do cantor são obrigatórios pra cada arquivo.
            </p>
          </div>
          <button onClick={onFechar} className="shrink-0 text-[var(--muted)] hover:text-[var(--text)]">
            <X size={18} strokeWidth={2.75} />
          </button>
        </div>

        <div className="mb-5 flex flex-col gap-2 sm:flex-row">
          <label className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[20px] border border-dashed border-[var(--border)] bg-[var(--bg)] px-3 py-3.5 text-[13.5px] font-semibold">
            <Files size={16} strokeWidth={2.75} /> Selecionar arquivos
            <input
              type="file"
              multiple
              accept="application/pdf,image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => adicionarArquivos(e.target.files)}
            />
          </label>
          <label className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[20px] border border-dashed border-[var(--border)] bg-[var(--bg)] px-3 py-3.5 text-[13.5px] font-semibold">
            <FolderUp size={16} strokeWidth={2.75} /> Selecionar pasta (com subpastas)
            <input
              type="file"
              multiple
              // @ts-expect-error webkitdirectory não tá tipado no React mas funciona em Chrome/Edge/Safari
              webkitdirectory=""
              className="hidden"
              onChange={(e) => adicionarArquivos(e.target.files)}
            />
          </label>
          <label className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[20px] border border-dashed border-[var(--border)] bg-[var(--bg)] px-3 py-3.5 text-[13.5px] font-semibold">
            <FileArchive size={16} strokeWidth={2.75} /> Selecionar .zip
            <input
              type="file"
              multiple
              accept=".zip,application/zip"
              className="hidden"
              onChange={(e) => adicionarArquivos(e.target.files)}
            />
          </label>
        </div>

        {processandoZip && (
          <p className="mb-3 flex items-center gap-1.5 text-xs text-[var(--muted)]">
            <Loader2 size={12} strokeWidth={2.75} className="animate-spin" /> Descompactando zip...
          </p>
        )}

        {itens.length === 0 && !processandoZip && (
          <p className="py-8 text-center text-sm text-[var(--muted)]">
            Nenhum arquivo selecionado. PDFs, imagens (JPG/PNG/WebP) e .zip são aceitos.
          </p>
        )}

        {itens.length > 0 && (
          <div className="space-y-2">
            {itens.map((item) => (
              <div key={item.id} className="rounded-[20px] border border-[var(--border)] bg-[var(--bg)] p-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 shrink-0 text-center">
                    {item.status === 'ok' && <CheckCircle2 size={16} strokeWidth={2.75} className="text-green-600" />}
                    {(item.status === 'enviando' || item.status === 'extraindo') && (
                      <Loader2 size={16} strokeWidth={2.75} className="animate-spin" />
                    )}
                    {item.status === 'erro' && <XCircle size={16} strokeWidth={2.75} className="text-[#a3111d]" />}
                    {item.status === 'duplicada' && <Copy size={16} strokeWidth={2.75} className="text-[#8a651a]" />}
                  </div>
                  <p className="w-32 shrink-0 truncate text-xs text-[var(--muted)]" title={item.file.name}>
                    {item.file.name}
                  </p>
                  <input
                    placeholder="Música *"
                    value={item.musica}
                    disabled={enviando}
                    onChange={(e) => atualizarCampo(item.id, 'musica', e.target.value)}
                    className={`min-w-0 flex-1 rounded-full border bg-transparent px-3.5 py-2 text-sm outline-none focus:border-[var(--accent)] ${
                      !item.musica.trim() ? 'border-[#a3111d]/50' : 'border-[var(--border)]'
                    }`}
                  />
                  <input
                    placeholder="Cantor *"
                    value={item.cantor}
                    disabled={enviando}
                    onChange={(e) => atualizarCampo(item.id, 'cantor', e.target.value)}
                    className={`min-w-0 flex-1 rounded-full border bg-transparent px-3.5 py-2 text-sm outline-none focus:border-[var(--accent)] ${
                      !item.cantor.trim() ? 'border-[#a3111d]/50' : 'border-[var(--border)]'
                    }`}
                  />
                  <button
                    onClick={() => removerItem(item.id)}
                    disabled={enviando}
                    className="shrink-0 rounded-full p-1.5 text-[#a3111d] hover:bg-[#a3111d]/10 disabled:opacity-30"
                  >
                    <Trash2 size={14} strokeWidth={2.75} />
                  </button>
                </div>

                {item.file.type === 'application/pdf' && item.status !== 'extraindo' && (
                  <div className="mt-2 pl-8">
                    {item.chordsContent.trim() ? (
                      <button
                        type="button"
                        onClick={() => atualizarItem(item.id, { mostrarCifra: !item.mostrarCifra })}
                        className="flex items-center gap-1 text-xs font-semibold text-[var(--accent)] hover:underline"
                      >
                        {item.mostrarCifra ? <ChevronDown size={12} strokeWidth={2.75} /> : <ChevronRight size={12} strokeWidth={2.75} />}
                        Cifra extraída — revisar antes de enviar
                      </button>
                    ) : (
                      <p className="flex items-center gap-1 text-xs text-[#8a651a]">
                        <AlertTriangle size={12} strokeWidth={2.75} /> Sem texto extraído — só o arquivo será guardado
                        (edite manualmente depois)
                      </p>
                    )}
                    {item.mostrarCifra && (
                      <textarea
                        value={item.chordsContent}
                        disabled={enviando}
                        onChange={(e) => atualizarCampo(item.id, 'chordsContent', e.target.value)}
                        rows={8}
                        className="mt-2 w-full rounded-[18px] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 font-mono text-xs outline-none focus:border-[var(--accent)]"
                      />
                    )}
                  </div>
                )}

                {item.erro && (
                  <p
                    className={`mt-2 pl-8 text-xs ${
                      item.status === 'duplicada' ? 'text-[#8a651a]' : 'text-[#a3111d]'
                    }`}
                  >
                    {item.erro}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between gap-2">
          <p className="text-xs text-[var(--muted)]">
            {itens.length > 0 &&
              `${enviadosOk}/${itens.length} enviado(s) · ${comCifraCount} com cifra extraída` +
                (duplicadasCount > 0 ? ` · ${duplicadasCount} duplicada(s)` : '')}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onFechar}
              className="rounded-full border border-[var(--border)] bg-[var(--bg)] px-[22px] py-[11px] text-sm font-bold"
            >
              Fechar
            </button>
            <button
              onClick={enviarTodos}
              disabled={!todosPreenchidos || enviando || algumExtraindo}
              className="flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-6 py-[11px] text-sm font-bold text-[var(--accent-fg)] disabled:opacity-50"
            >
              {enviando && <Loader2 size={14} strokeWidth={2.75} className="animate-spin" />}
              Enviar todos
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
