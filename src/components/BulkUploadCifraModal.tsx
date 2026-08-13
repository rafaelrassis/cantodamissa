import { useState } from 'react';
import { unzipSync } from 'fflate';
import {
  X,
  FolderUp,
  Files,
  FileArchive,
  Link2,
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
type Origem = 'arquivo' | 'url';

interface ItemUpload {
  id: string;
  origem: Origem;
  file: File | null; // null quando origem === 'url'
  url: string | null; // null quando origem === 'arquivo'
  musica: string;
  cantor: string;
  musicaSugeridaDoNome: string; // chute inicial (nome de arquivo ou URL) — se o usuário editar, não sobrescreve mais com o título extraído
  status: StatusItem;
  chordsContent: string; // extraído do PDF ou raspado do Cifra Club (editável)
  mostrarCifra: boolean;
  erro?: string;
}

const PASTA_BASE = 'cifra';
const TIPOS_PERMITIDOS = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const REGEX_CIFRACLUB = /^https?:\/\/(www\.)?cifraclub\.com\.br\/\S+$/i;

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
// criar duas músicas iguais no banco (ex: reenvio acidental do mesmo lote,
// ou a mesma música vindo por URL e por PDF no mesmo lote).
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
  const [textoUrls, setTextoUrls] = useState('');

  function atualizarItem(id: string, campos: Partial<ItemUpload>) {
    setItens((atual) => atual.map((it) => (it.id === id ? { ...it, ...campos } : it)));
  }

  // ---------- Fluxo PDF/imagem ----------

  async function extrairCifraDoArquivo(item: ItemUpload) {
    if (!item.file || item.file.type !== 'application/pdf') return;
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
        origem: 'arquivo',
        file: f,
        url: null,
        status: 'pendente',
        chordsContent: '',
        mostrarCifra: false,
        musicaSugeridaDoNome: sugestao.musica,
        ...sugestao,
      };
    });
    setItens((atual) => [...atual, ...novos]);

    for (const item of novos) {
      if (item.file?.type === 'application/pdf') {
        void extrairCifraDoArquivo(item);
      }
    }
  }

  // ---------- Fluxo URL Cifra Club ----------

  async function extrairCifraDaUrl(item: ItemUpload) {
    if (!item.url) return;
    atualizarItem(item.id, { status: 'extraindo' });
    try {
      const resp = await fetch('/api/cifraclub-import', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: item.url }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Falha ao importar do Cifra Club');
      setItens((atual) =>
        atual.map((it) => {
          if (it.id !== item.id) return it;
          const musica = it.musica === it.musicaSugeridaDoNome && data.title ? data.title : it.musica;
          const cantor = !it.cantor && data.artist ? data.artist : it.cantor;
          return { ...it, status: 'pronto', chordsContent: data.chordsContent ?? '', musica, cantor };
        })
      );
    } catch (err) {
      atualizarItem(item.id, {
        status: 'pronto',
        erro: err instanceof Error ? err.message : 'Falha ao importar do Cifra Club',
      });
    }
  }

  function adicionarUrls() {
    const linhas = textoUrls
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const validas: string[] = [];
    const invalidas: string[] = [];
    for (const linha of linhas) {
      if (REGEX_CIFRACLUB.test(linha)) validas.push(linha);
      else invalidas.push(linha);
    }

    const novos: ItemUpload[] = validas.map((url) => {
      const slug = url.replace(/\/$/, '').split('/').pop() || url;
      const musicaSugerida = slug.replace(/-/g, ' ');
      return {
        id: gerarId(),
        origem: 'url',
        file: null,
        url,
        status: 'pendente',
        chordsContent: '',
        mostrarCifra: false,
        musicaSugeridaDoNome: musicaSugerida,
        musica: musicaSugerida,
        cantor: '',
      };
    });
    setItens((atual) => [...atual, ...novos]);
    setTextoUrls(invalidas.join('\n')); // deixa as inválidas no campo pra corrigir

    for (const item of novos) {
      void extrairCifraDaUrl(item);
    }
  }

  // ---------- Comum ----------

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

      // URL do Cifra Club: sem blob, sem PDF — a própria URL já serve de
      // referência da fonte. Fluxo mais simples e mais confiável que PDF.
      if (item.origem === 'url') {
        try {
          if (!item.chordsContent.trim()) {
            throw new Error('Sem cifra importada dessa URL — nada foi salvo.');
          }
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
            sourceFileUrl: item.url ?? undefined,
          });
          musicasExistentes.add(chave);
          atualizarItem(item.id, { status: 'ok' });
        } catch (err) {
          atualizarItem(item.id, {
            status: 'erro',
            erro: err instanceof Error ? err.message : 'Falha desconhecida',
          });
        }
        continue;
      }

      // Arquivo (PDF/imagem): blob é só armazenamento de referência do
      // original — não deve bloquear a criação da música se estiver instável.
      let sourceFileUrl: string | undefined;
      let avisoBlob: string | undefined;
      try {
        const ext = item.file!.name.split('.').pop() || 'pdf';
        const nomeFinal = `${sanitizarNomeArquivo(item.musica)} - ${sanitizarNomeArquivo(item.cantor)}.${ext}`;
        const pastaDestino = `${PASTA_BASE}/${sanitizarNomeArquivo(item.cantor) || 'Sem Cantor'}`;
        const resp = await fetch('/api/blob-upload', {
          method: 'POST',
          headers: {
            'content-type': item.file!.type,
            'x-filename': nomeFinal,
            'x-folder': pastaDestino,
          },
          body: item.file,
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || 'Falha no upload');
        sourceFileUrl = data.url;
      } catch (err) {
        avisoBlob = `PDF original não guardado (blob falhou): ${
          err instanceof Error ? err.message : 'erro desconhecido'
        }`;
      }

      try {
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
            sourceFileUrl,
          });
          musicasExistentes.add(chave); // evita duplicar de novo dentro do mesmo lote
          atualizarItem(item.id, { status: 'ok', erro: avisoBlob });
        } else if (sourceFileUrl) {
          // sem cifra extraída: só faz sentido guardar se o blob funcionou
          atualizarItem(item.id, { status: 'ok' });
        } else {
          throw new Error('Sem cifra extraída e blob indisponível — nada foi salvo.');
        }
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
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-[var(--surface)] p-5 text-[var(--text)]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Upload em massa de cifras</h2>
            <p className="text-xs text-[var(--muted)]">
              URLs do Cifra Club são importadas direto (sem blob, extração mais confiável). PDFs têm a
              cifra extraída automaticamente quando têm texto real (revise antes de enviar); o arquivo
              original só é guardado se o blob estiver disponível — nunca bloqueia a criação da música.
              Nome da música e do cantor são obrigatórios pra cada item.
            </p>
          </div>
          <button onClick={onFechar} className="shrink-0 text-[var(--muted)] hover:text-[var(--text)]">
            <X size={20} />
          </button>
        </div>

        <div className="mb-3 rounded-lg border border-[var(--border)] p-3">
          <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
            <Link2 size={14} /> URLs do Cifra Club (uma por linha)
          </label>
          <textarea
            value={textoUrls}
            onChange={(e) => setTextoUrls(e.target.value)}
            placeholder={'https://www.cifraclub.com.br/artista/musica/\nhttps://www.cifraclub.com.br/artista/musica2/'}
            rows={3}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 font-mono text-xs"
          />
          <button
            onClick={adicionarUrls}
            disabled={!textoUrls.trim()}
            className="mt-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-fg)] disabled:opacity-50"
          >
            Adicionar URLs
          </button>
        </div>

        <div className="mb-4 flex gap-2">
          <label className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-[var(--border)] px-3 py-3 text-sm">
            <Files size={16} /> Selecionar arquivos
            <input
              type="file"
              multiple
              accept="application/pdf,image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => adicionarArquivos(e.target.files)}
            />
          </label>
          <label className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-[var(--border)] px-3 py-3 text-sm">
            <FolderUp size={16} /> Selecionar pasta (com subpastas)
            <input
              type="file"
              multiple
              // @ts-expect-error webkitdirectory não tá tipado no React mas funciona em Chrome/Edge/Safari
              webkitdirectory=""
              className="hidden"
              onChange={(e) => adicionarArquivos(e.target.files)}
            />
          </label>
          <label className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-[var(--border)] px-3 py-3 text-sm">
            <FileArchive size={16} /> Selecionar .zip
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
            <Loader2 size={12} className="animate-spin" /> Descompactando zip...
          </p>
        )}

        {itens.length === 0 && !processandoZip && (
          <p className="py-8 text-center text-sm text-[var(--muted)]">
            Nenhum item ainda. Cole URLs do Cifra Club ou selecione PDFs, imagens (JPG/PNG/WebP) e .zip.
          </p>
        )}

        {itens.length > 0 && (
          <div className="space-y-2">
            {itens.map((item) => (
              <div key={item.id} className="rounded-lg border border-[var(--border)] p-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 shrink-0 text-center">
                    {item.status === 'ok' && <CheckCircle2 size={16} className="text-green-600" />}
                    {(item.status === 'enviando' || item.status === 'extraindo') && (
                      <Loader2 size={16} className="animate-spin" />
                    )}
                    {item.status === 'erro' && <XCircle size={16} className="text-red-600" />}
                    {item.status === 'duplicada' && <Copy size={16} className="text-amber-600" />}
                  </div>
                  <p
                    className="w-32 shrink-0 truncate text-xs text-[var(--muted)]"
                    title={item.origem === 'url' ? item.url ?? '' : item.file?.name ?? ''}
                  >
                    {item.origem === 'url' ? <Link2 size={11} className="mr-0.5 inline" /> : null}
                    {item.origem === 'url' ? item.url : item.file?.name}
                  </p>
                  <input
                    placeholder="Música *"
                    value={item.musica}
                    disabled={enviando}
                    onChange={(e) => atualizarCampo(item.id, 'musica', e.target.value)}
                    className={`min-w-0 flex-1 rounded-md border bg-transparent px-2 py-1.5 text-sm ${
                      !item.musica.trim() ? 'border-red-500/50' : 'border-[var(--border)]'
                    }`}
                  />
                  <input
                    placeholder="Cantor *"
                    value={item.cantor}
                    disabled={enviando}
                    onChange={(e) => atualizarCampo(item.id, 'cantor', e.target.value)}
                    className={`min-w-0 flex-1 rounded-md border bg-transparent px-2 py-1.5 text-sm ${
                      !item.cantor.trim() ? 'border-red-500/50' : 'border-[var(--border)]'
                    }`}
                  />
                  <button
                    onClick={() => removerItem(item.id)}
                    disabled={enviando}
                    className="shrink-0 rounded-md p-1.5 text-red-600 hover:bg-red-500/10 disabled:opacity-30"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {(item.origem === 'url' || item.file?.type === 'application/pdf') && item.status !== 'extraindo' && (
                  <div className="mt-1.5 pl-8">
                    {item.chordsContent.trim() ? (
                      <button
                        type="button"
                        onClick={() => atualizarItem(item.id, { mostrarCifra: !item.mostrarCifra })}
                        className="flex items-center gap-1 text-xs text-[var(--accent)] hover:underline"
                      >
                        {item.mostrarCifra ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        Cifra {item.origem === 'url' ? 'importada' : 'extraída'} — revisar antes de enviar
                      </button>
                    ) : (
                      <p className="flex items-center gap-1 text-xs text-amber-600">
                        <AlertTriangle size={12} />
                        {item.origem === 'url'
                          ? 'Sem cifra importada — nada será salvo pra esse item'
                          : 'Sem texto extraído — só o arquivo será guardado (edite manualmente depois)'}
                      </p>
                    )}
                    {item.mostrarCifra && (
                      <textarea
                        value={item.chordsContent}
                        disabled={enviando}
                        onChange={(e) => atualizarCampo(item.id, 'chordsContent', e.target.value)}
                        rows={8}
                        className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 font-mono text-xs"
                      />
                    )}
                  </div>
                )}

                {item.erro && (
                  <p
                    className={`mt-1.5 pl-8 text-xs ${
                      item.status === 'duplicada' ? 'text-amber-600' : 'text-red-600'
                    }`}
                  >
                    {item.erro}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-5 flex items-center justify-between gap-2">
          <p className="text-xs text-[var(--muted)]">
            {itens.length > 0 &&
              `${enviadosOk}/${itens.length} enviado(s) · ${comCifraCount} com cifra pronta` +
                (duplicadasCount > 0 ? ` · ${duplicadasCount} duplicada(s)` : '')}
          </p>
          <div className="flex gap-2">
            <button onClick={onFechar} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm">
              Fechar
            </button>
            <button
              onClick={enviarTodos}
              disabled={!todosPreenchidos || enviando || algumExtraindo}
              className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-fg)] disabled:opacity-50"
            >
              {enviando && <Loader2 size={14} className="animate-spin" />}
              Enviar todos
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
