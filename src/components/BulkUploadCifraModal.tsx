import { useState } from 'react';
import { X, FolderUp, Files, Loader2, CheckCircle2, XCircle, Trash2 } from 'lucide-react';

interface Props {
  onFechar: () => void;
}

type StatusItem = 'pendente' | 'enviando' | 'ok' | 'erro';

interface ItemUpload {
  file: File;
  musica: string;
  cantor: string;
  status: StatusItem;
  erro?: string;
}

const PASTA_BASE = 'cifra';
const TIPOS_PERMITIDOS = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

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

export function BulkUploadCifraModal({ onFechar }: Props) {
  const [itens, setItens] = useState<ItemUpload[]>([]);
  const [enviando, setEnviando] = useState(false);

  function adicionarArquivos(files: FileList | null) {
    if (!files) return;
    const novos: ItemUpload[] = Array.from(files)
      .filter((f) => TIPOS_PERMITIDOS.includes(f.type))
      .map((f) => ({ file: f, status: 'pendente', ...chuteInicial(f.name) }));
    setItens((atual) => [...atual, ...novos]);
  }

  function removerItem(idx: number) {
    setItens((atual) => atual.filter((_, i) => i !== idx));
  }

  function atualizarCampo(idx: number, campo: 'musica' | 'cantor', valor: string) {
    setItens((atual) => atual.map((it, i) => (i === idx ? { ...it, [campo]: valor } : it)));
  }

  const todosPreenchidos = itens.length > 0 && itens.every((it) => it.musica.trim() && it.cantor.trim());

  async function enviarTodos() {
    setEnviando(true);
    for (let i = 0; i < itens.length; i++) {
      const item = itens[i];
      if (item.status === 'ok') continue;
      setItens((atual) => atual.map((it, idx) => (idx === i ? { ...it, status: 'enviando' } : it)));
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
        setItens((atual) => atual.map((it, idx) => (idx === i ? { ...it, status: 'ok' } : it)));
      } catch (err) {
        setItens((atual) =>
          atual.map((it, idx) =>
            idx === i
              ? { ...it, status: 'erro', erro: err instanceof Error ? err.message : 'Falha desconhecida' }
              : it
          )
        );
      }
    }
    setEnviando(false);
  }

  const enviadosOk = itens.filter((it) => it.status === 'ok').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-[var(--surface)] p-5 text-[var(--text)]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Upload em massa de cifras</h2>
            <p className="text-xs text-[var(--muted)]">
              Sobe arquivos direto pra pasta <code>{PASTA_BASE}/</code> no Blob, organizados por
              cantor. Só guarda o arquivo — não cria música no banco. Nome da música e do cantor são
              obrigatórios pra cada arquivo.
            </p>
          </div>
          <button onClick={onFechar} className="shrink-0 text-[var(--muted)] hover:text-[var(--text)]">
            <X size={20} />
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
        </div>

        {itens.length === 0 && (
          <p className="py-8 text-center text-sm text-[var(--muted)]">
            Nenhum arquivo selecionado. PDFs e imagens (JPG/PNG/WebP) são aceitos.
          </p>
        )}

        {itens.length > 0 && (
          <div className="space-y-2">
            {itens.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 rounded-lg border border-[var(--border)] p-2"
              >
                <div className="w-6 shrink-0 text-center">
                  {item.status === 'ok' && <CheckCircle2 size={16} className="text-green-600" />}
                  {item.status === 'enviando' && <Loader2 size={16} className="animate-spin" />}
                  {item.status === 'erro' && <XCircle size={16} className="text-red-600" />}
                </div>
                <p className="w-32 shrink-0 truncate text-xs text-[var(--muted)]" title={item.file.name}>
                  {item.file.name}
                </p>
                <input
                  placeholder="Música *"
                  value={item.musica}
                  disabled={enviando}
                  onChange={(e) => atualizarCampo(idx, 'musica', e.target.value)}
                  className={`min-w-0 flex-1 rounded-md border bg-transparent px-2 py-1.5 text-sm ${
                    !item.musica.trim() ? 'border-red-500/50' : 'border-[var(--border)]'
                  }`}
                />
                <input
                  placeholder="Cantor *"
                  value={item.cantor}
                  disabled={enviando}
                  onChange={(e) => atualizarCampo(idx, 'cantor', e.target.value)}
                  className={`min-w-0 flex-1 rounded-md border bg-transparent px-2 py-1.5 text-sm ${
                    !item.cantor.trim() ? 'border-red-500/50' : 'border-[var(--border)]'
                  }`}
                />
                <button
                  onClick={() => removerItem(idx)}
                  disabled={enviando}
                  className="shrink-0 rounded-md p-1.5 text-red-600 hover:bg-red-500/10 disabled:opacity-30"
                >
                  <Trash2 size={14} />
                </button>
                {item.erro && <p className="w-full text-xs text-red-600">{item.erro}</p>}
              </div>
            ))}
          </div>
        )}

        <div className="mt-5 flex items-center justify-between gap-2">
          <p className="text-xs text-[var(--muted)]">
            {itens.length > 0 && `${enviadosOk}/${itens.length} enviado(s)`}
          </p>
          <div className="flex gap-2">
            <button onClick={onFechar} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm">
              Fechar
            </button>
            <button
              onClick={enviarTodos}
              disabled={!todosPreenchidos || enviando}
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
