import { useEffect, useState } from 'react';
import { ChevronLeft, Church, Search, Star } from 'lucide-react';
import {
  buscarMinisteriosPublicos,
  favoritarMinisterio,
  desfavoritarMinisterio,
  listarIdsFavoritos,
  type MinisterioPublico,
} from '../lib/favoritosMinisterio';
import { ESTADOS, listarCidades } from '../lib/ibge';
import { useCanalErro } from '../lib/erroContext';

interface Props {
  isLoggedIn: boolean;
  onBack: () => void;
  onEntrar: () => void;
  onFavoritosAlterados: () => void;
  onAbrirRepertorio: (repertorioId: string) => void;
}

type Modo = 'codigo' | 'nome' | 'uf';

const POR_PAGINA = 20;

/** Buscar ministério por código da igreja vinculada, por nome (parte do
 * nome) ou por UF+cidade, e favoritar sem pedir ingresso — pra
 * acompanhar o repertório da próxima escala na Início. Ver
 * AdicionarMinisterioTela pro fluxo de ingressar de verdade (que exige
 * aprovação do admin, via código de convite do ministério — diferente
 * do código da igreja usado aqui). */
export function BuscarMinisterioTela({
  isLoggedIn,
  onBack,
  onEntrar,
  onFavoritosAlterados,
  onAbrirRepertorio,
}: Props) {
  const { reportar: reportarErro } = useCanalErro();
  const [modo, setModo] = useState<Modo>('nome');

  const [codigo, setCodigo] = useState('');
  const [nome, setNome] = useState('');
  const [estado, setEstado] = useState('');
  const [cidade, setCidade] = useState('');
  const [cidades, setCidades] = useState<string[]>([]);

  const [resultados, setResultados] = useState<MinisterioPublico[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pagina, setPagina] = useState(0);
  const [buscando, setBuscando] = useState(false);
  const [jaBuscou, setJaBuscou] = useState(false);
  const [favoritos, setFavoritos] = useState<Set<string>>(new Set());
  const [alterando, setAlterando] = useState<string | null>(null);

  useEffect(() => {
    if (isLoggedIn) listarIdsFavoritos().then(setFavoritos);
  }, [isLoggedIn]);

  useEffect(() => {
    setCidade('');
    if (!estado) {
      setCidades([]);
      return;
    }
    listarCidades(estado).then(setCidades);
  }, [estado]);

  async function buscar(novaPagina = 0) {
    setBuscando(true);
    setJaBuscou(true);
    try {
      const { itens, totalCount } = await buscarMinisteriosPublicos({
        codigo: modo === 'codigo' ? codigo : undefined,
        nome: modo === 'nome' ? nome : undefined,
        estado: modo === 'uf' ? estado : undefined,
        cidade: modo === 'uf' ? cidade : undefined,
        offset: novaPagina * POR_PAGINA,
        limit: POR_PAGINA,
      });
      setResultados(itens);
      setTotalCount(totalCount);
      setPagina(novaPagina);
    } catch (e) {
      reportarErro(e, 'Não foi possível buscar. Tenta de novo.');
      setJaBuscou(false);
    } finally {
      setBuscando(false);
    }
  }

  async function alternarFavorito(m: MinisterioPublico) {
    if (!isLoggedIn) {
      onEntrar();
      return;
    }
    setAlterando(m.ministerioId);
    try {
      if (favoritos.has(m.ministerioId)) {
        await desfavoritarMinisterio(m.ministerioId);
        setFavoritos((prev) => {
          const novo = new Set(prev);
          novo.delete(m.ministerioId);
          return novo;
        });
      } else {
        await favoritarMinisterio(m.ministerioId);
        setFavoritos((prev) => new Set(prev).add(m.ministerioId));
      }
      onFavoritosAlterados();
    } finally {
      setAlterando(null);
    }
  }

  function trocarModo(novoModo: Modo) {
    setModo(novoModo);
    setResultados([]);
    setTotalCount(0);
    setJaBuscou(false);
  }

  const podeBuscar =
    modo === 'codigo'
      ? codigo.trim().length >= 3
      : modo === 'nome'
        ? nome.trim().length >= 2
        : Boolean(estado) && Boolean(cidade);
  const totalPaginas = Math.max(1, Math.ceil(totalCount / POR_PAGINA));

  return (
    <div className="min-h-screen bg-[var(--bg)] font-sans text-[var(--text)]">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-[var(--border)] bg-[var(--bg)] px-4 py-3">
        <button onClick={onBack} aria-label="Voltar" className="rounded-full p-1.5 text-[var(--muted)] hover:bg-[var(--surface)]">
          <ChevronLeft size={22} />
        </button>
        <h1 className="text-lg font-bold">Buscar ministério</h1>
      </header>

      <div className="mx-auto max-w-lg px-4 py-6">
        <div className="flex gap-2 rounded-xl bg-[var(--surface)] p-1">
          <button
            onClick={() => trocarModo('codigo')}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold ${modo === 'codigo' ? 'bg-[var(--accent)] text-[var(--accent-fg)]' : 'text-[var(--muted)]'}`}
          >
            Código
          </button>
          <button
            onClick={() => trocarModo('nome')}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold ${modo === 'nome' ? 'bg-[var(--accent)] text-[var(--accent-fg)]' : 'text-[var(--muted)]'}`}
          >
            Nome
          </button>
          <button
            onClick={() => trocarModo('uf')}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold ${modo === 'uf' ? 'bg-[var(--accent)] text-[var(--accent-fg)]' : 'text-[var(--muted)]'}`}
          >
            UF / cidade
          </button>
        </div>

        {modo === 'codigo' && (
          <input
            autoFocus
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            placeholder="Código da igreja"
            className="mt-4 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm tracking-wide outline-none focus:border-[var(--accent)]"
          />
        )}

        {modo === 'nome' && (
          <input
            autoFocus
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome do ministério"
            className="mt-4 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
          />
        )}

        {modo === 'uf' && (
          <div className="mt-4 flex gap-2.5">
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="w-28 shrink-0 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="">UF</option>
              {ESTADOS.map((e) => (
                <option key={e.sigla} value={e.sigla}>
                  {e.sigla}
                </option>
              ))}
            </select>
            <select
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              disabled={!estado}
              className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-2.5 text-sm outline-none focus:border-[var(--accent)] disabled:opacity-50"
            >
              <option value="">Cidade</option>
              {cidades.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          onClick={() => buscar(0)}
          disabled={!podeBuscar || buscando}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-fg)] disabled:opacity-50"
        >
          <Search size={15} /> {buscando ? 'Buscando...' : 'Buscar'}
        </button>

        {!isLoggedIn && (
          <p className="mt-3 text-xs text-[var(--muted)]">
            Entre com sua conta pra favoritar e ver o repertório na Início.
          </p>
        )}

        <ul className="mt-5 flex flex-col gap-2">
          {resultados.map((m) => (
            <li
              key={m.ministerioId}
              className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3"
            >
              <button
                onClick={() => m.proximo && onAbrirRepertorio(m.proximo.repertorioId)}
                disabled={!m.proximo}
                className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-default"
              >
                <Church size={18} className="shrink-0 text-[var(--accent)]" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{m.nome}</p>
                  <p className="truncate text-xs text-[var(--muted)]">
                    {m.igrejaNome
                      ? `${m.igrejaNome} · ${m.igrejaCidade}/${m.igrejaEstado}`
                      : 'Sem igreja vinculada'}
                  </p>
                  {m.proximo ? (
                    <p className="truncate text-xs font-semibold text-[var(--accent)]">
                      {m.proximo.nome} ·{' '}
                      {new Date(`${m.proximo.data}T00:00:00`).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'long',
                      })}{' '}
                      · {m.proximo.hora}
                    </p>
                  ) : (
                    <p className="truncate text-xs text-[var(--muted)]">Nenhuma escala aberta</p>
                  )}
                </div>
              </button>
              <button
                onClick={() => alternarFavorito(m)}
                disabled={alterando === m.ministerioId}
                aria-label={favoritos.has(m.ministerioId) ? 'Desfavoritar' : 'Favoritar'}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--bg)] disabled:opacity-50"
              >
                <Star
                  size={18}
                  className={favoritos.has(m.ministerioId) ? 'fill-[var(--accent)] text-[var(--accent)]' : ''}
                />
              </button>
            </li>
          ))}
        </ul>

        {jaBuscou && !buscando && resultados.length === 0 && (
          <p className="mt-4 text-sm text-[var(--muted)]">Nenhum ministério encontrado.</p>
        )}

        {totalCount > POR_PAGINA && (
          <div className="mt-4 flex items-center justify-between text-sm">
            <button
              onClick={() => buscar(pagina - 1)}
              disabled={pagina === 0 || buscando}
              className="rounded-lg border border-[var(--border)] px-3 py-1.5 font-semibold disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="text-xs text-[var(--muted)]">
              Página {pagina + 1} de {totalPaginas}
            </span>
            <button
              onClick={() => buscar(pagina + 1)}
              disabled={pagina + 1 >= totalPaginas || buscando}
              className="rounded-lg border border-[var(--border)] px-3 py-1.5 font-semibold disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
