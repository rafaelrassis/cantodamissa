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

interface Props {
  isLoggedIn: boolean;
  onBack: () => void;
  onEntrar: () => void;
  onFavoritosAlterados: () => void;
  onAbrirRepertorio: (repertorioId: string) => void;
}

type Modo = 'codigo' | 'igreja';

/** Buscar ministério (por código de convite, ou por igreja+UF+cidade) e
 * favoritar sem pedir ingresso — pra acompanhar o repertório da próxima
 * escala na Início. Ver AdicionarMinisterioTela pro fluxo de ingressar
 * de verdade (que exige aprovação do admin). */
export function BuscarMinisterioTela({
  isLoggedIn,
  onBack,
  onEntrar,
  onFavoritosAlterados,
  onAbrirRepertorio,
}: Props) {
  const [modo, setModo] = useState<Modo>('igreja');

  const [codigo, setCodigo] = useState('');
  const [igreja, setIgreja] = useState('');
  const [estado, setEstado] = useState('');
  const [cidade, setCidade] = useState('');
  const [cidades, setCidades] = useState<string[]>([]);

  const [resultados, setResultados] = useState<MinisterioPublico[]>([]);
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

  async function buscar() {
    setBuscando(true);
    setJaBuscou(true);
    try {
      const lista = await buscarMinisteriosPublicos(
        modo === 'codigo' ? { codigo } : { igreja, estado, cidade }
      );
      setResultados(lista);
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

  const podeBuscar =
    modo === 'codigo' ? codigo.trim().length >= 3 : Boolean(igreja.trim() || estado || cidade);

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
            onClick={() => setModo('igreja')}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold ${modo === 'igreja' ? 'bg-[var(--accent)] text-[var(--accent-fg)]' : 'text-[var(--muted)]'}`}
          >
            Igreja / cidade
          </button>
          <button
            onClick={() => setModo('codigo')}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold ${modo === 'codigo' ? 'bg-[var(--accent)] text-[var(--accent-fg)]' : 'text-[var(--muted)]'}`}
          >
            Código
          </button>
        </div>

        {modo === 'codigo' ? (
          <input
            autoFocus
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            placeholder="Código do ministério"
            className="mt-4 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm tracking-wide outline-none focus:border-[var(--accent)]"
          />
        ) : (
          <div className="mt-4 flex flex-col gap-2.5">
            <input
              value={igreja}
              onChange={(e) => setIgreja(e.target.value)}
              placeholder="Nome da igreja"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
            />
            <div className="flex gap-2.5">
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
          </div>
        )}

        <button
          onClick={buscar}
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
      </div>
    </div>
  );
}
