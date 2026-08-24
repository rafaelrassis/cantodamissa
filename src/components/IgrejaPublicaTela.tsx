import { useEffect, useState } from 'react';
import { ChevronLeft, Church, Search } from 'lucide-react';
import {
  buscarIgrejas,
  listarRepertoriosAbertosPorIgreja,
  type Igreja,
  type RepertorioAbertoResumo,
} from '../lib/igrejas';

interface Props {
  /** Código vindo do link (`?igreja=CODIGO`) — se presente, pula a busca
   * e já carrega a lista dessa igreja. */
  codigoInicial: string | null;
  onBack: () => void;
  onAbrirRepertorio: (repertorioId: string) => void;
}

/**
 * Acesso público (sem login) pra assembleia: busca a igreja por nome ou
 * código e mostra os repertórios abertos (escala publicada, hoje em
 * diante) pra acompanhar as músicas da missa em modo letra.
 */
export function IgrejaPublicaTela({ codigoInicial, onBack, onAbrirRepertorio }: Props) {
  const [termo, setTermo] = useState('');
  const [resultados, setResultados] = useState<Igreja[]>([]);
  const [igrejaAtiva, setIgrejaAtiva] = useState<Igreja | null>(null);
  const [repertorios, setRepertorios] = useState<RepertorioAbertoResumo[]>([]);
  const [carregando, setCarregando] = useState(Boolean(codigoInicial));

  // Autocomplete conforme digita (debounce simples)
  useEffect(() => {
    if (igrejaAtiva) return;
    if (termo.trim().length < 2) {
      setResultados([]);
      return;
    }
    const id = setTimeout(() => {
      buscarIgrejas(termo).then(setResultados);
    }, 250);
    return () => clearTimeout(id);
  }, [termo, igrejaAtiva]);

  // Link direto (?igreja=CODIGO): carrega a lista logo de cara
  useEffect(() => {
    if (!codigoInicial) return;
    setCarregando(true);
    listarRepertoriosAbertosPorIgreja(codigoInicial).then((lista) => {
      setIgrejaAtiva({ id: '', nome: codigoInicial, codigo: codigoInicial, cidade: null });
      setRepertorios(lista);
      setCarregando(false);
    });
  }, [codigoInicial]);

  async function selecionarIgreja(igreja: Igreja) {
    setIgrejaAtiva(igreja);
    setCarregando(true);
    const lista = await listarRepertoriosAbertosPorIgreja(igreja.codigo);
    setRepertorios(lista);
    setCarregando(false);
  }

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950">
        <button
          onClick={onBack}
          className="rounded-full p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          aria-label="Voltar"
        >
          <ChevronLeft size={22} />
        </button>
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
          Repertório da minha igreja
        </h1>
      </header>

      <div className="mx-auto max-w-lg px-4 py-6">
        {!igrejaAtiva && (
          <>
            <label className="relative block">
              <Search
                size={18}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
              />
              <input
                autoFocus
                value={termo}
                onChange={(e) => setTermo(e.target.value)}
                placeholder="Nome ou código da igreja"
                className="w-full rounded-xl border border-neutral-300 bg-white py-3 pl-10 pr-3 text-base text-neutral-900 outline-none focus:border-brand-green dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
              />
            </label>

            <ul className="mt-3 space-y-1">
              {resultados.map((igreja) => (
                <li key={igreja.id}>
                  <button
                    onClick={() => selecionarIgreja(igreja)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  >
                    <Church size={18} className="shrink-0 text-brand-green" />
                    <span>
                      <span className="block font-medium text-neutral-900 dark:text-neutral-50">
                        {igreja.nome}
                      </span>
                      <span className="block text-sm text-neutral-500">
                        {igreja.codigo}
                        {igreja.cidade ? ` · ${igreja.cidade}` : ''}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            {termo.trim().length >= 2 && resultados.length === 0 && (
              <p className="mt-4 text-sm text-neutral-500">Nenhuma igreja encontrada.</p>
            )}
          </>
        )}

        {igrejaAtiva && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
                  {igrejaAtiva.nome}
                </h2>
                <p className="text-sm text-neutral-500">{igrejaAtiva.codigo}</p>
              </div>
              {!codigoInicial && (
                <button
                  onClick={() => {
                    setIgrejaAtiva(null);
                    setRepertorios([]);
                    setTermo('');
                  }}
                  className="text-sm font-medium text-brand-green"
                >
                  Trocar
                </button>
              )}
            </div>

            {carregando && <p className="text-sm text-neutral-500">Carregando…</p>}

            {!carregando && repertorios.length === 0 && (
              <p className="text-sm text-neutral-500">
                Nenhum repertório aberto no momento pra essa igreja.
              </p>
            )}

            <ul className="space-y-2">
              {repertorios.map((r) => (
                <li key={r.repertorioId}>
                  <button
                    onClick={() => onAbrirRepertorio(r.repertorioId)}
                    className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-left hover:border-brand-green dark:border-neutral-800"
                  >
                    <span className="block font-medium text-neutral-900 dark:text-neutral-50">
                      {r.nome}
                    </span>
                    <span className="block text-sm text-neutral-500">
                      {new Date(`${r.data}T00:00:00`).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'long',
                      })}{' '}
                      · {r.hora} · {r.ministerioNome}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
