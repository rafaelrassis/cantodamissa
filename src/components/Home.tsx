import { useEffect, useMemo, useRef, useState } from 'react';
import { Home as HomeIcon, ListMusic, Music2, Search, User, X } from 'lucide-react';
import type { Musica, MomentoMissa, TempoLiturgico } from '../types/musica';
import { getMusicaById, getTop50, searchMusicas } from '../lib/musicasApi';
import { domingoMaisProximo } from '../lib/liturgicalCalendar';
import { LABEL_TEMPO, LABEL_MOMENTO } from '../lib/labels';
import { useRepertorios } from '../lib/useRepertorios';
import { MusicaCard } from './MusicaCard';

interface Props {
  onSelectMusica: (musica: Musica) => void;
}

const TEMPOS: TempoLiturgico[] = ['Advento', 'Natal', 'Quaresma', 'Pascoa', 'TempoComum'];
const MOMENTOS: MomentoMissa[] = [
  'Entrada',
  'AtoPenitencial',
  'Gloria',
  'SalmoResponsorial',
  'AclamacaoEvangelho',
  'Ofertorio',
  'Santo',
  'Cordeiro',
  'Comunhao',
  'PosComunhao',
  'Envio',
];

export function Home({ onSelectMusica }: Props) {
  const [query, setQuery] = useState('');
  const [tempo, setTempo] = useState<TempoLiturgico | undefined>();
  const [momento, setMomento] = useState<MomentoMissa | undefined>();
  const [resultados, setResultados] = useState<Musica[]>([]);
  const [carregando, setCarregando] = useState(true);

  const searchRef = useRef<HTMLInputElement>(null);
  const domingoAtual = useMemo(() => domingoMaisProximo(new Date()), []);
  const buscando = query.trim().length > 0;

  const { repertorios, criar, remover, adicionarMusica, removerMusica } = useRepertorios();
  const [repertorioAberto, setRepertorioAberto] = useState<string | null>(null);
  const [novoNome, setNovoNome] = useState('');

  function adicionar(repertorioId: string, musica: Musica) {
    adicionarMusica(repertorioId, {
      musicaId: musica.id,
      title: musica.title,
      artist: musica.artist,
      tone: musica.originalTone,
      momento: musica.momento[0] ?? null,
    });
  }

  function criarECriarAdicionar(nome: string, musica: Musica) {
    const novo = criar(nome);
    adicionar(novo.id, musica);
  }

  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    const filtro = { tempo, momento };
    const promise = buscando ? searchMusicas(query, filtro) : getTop50(filtro);
    promise.then((lista) => {
      if (!cancelado) {
        setResultados(lista);
        setCarregando(false);
      }
    });
    return () => {
      cancelado = true;
    };
  }, [query, tempo, momento, buscando]);

  useEffect(() => {
    function onKeydown(e: KeyboardEvent) {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  }, []);

  const listTitle = momento ? `Momento: ${LABEL_MOMENTO[momento]}` : 'Top 50 mais acessadas';

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg)] font-sans text-[var(--text)]">
      {/* Header */}
      <header className="bg-[var(--accent)] text-[var(--accent-fg)]">
        {/* Nav desktop */}
        <div className="hidden items-center justify-between px-10 py-4 lg:flex">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
              <Music2 size={20} />
              Canto da Missa
            </div>
            <nav className="flex items-center gap-6 text-sm font-medium opacity-90">
              <span>Músicas</span>
              <span>Calendário</span>
              <span>Repertórios</span>
            </nav>
          </div>
          <span className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-[var(--accent)]">
            Entrar
          </span>
        </div>

        <div className="px-4 pb-5 pt-4 lg:px-10 lg:pb-6">
          <h1 className="text-xl font-extrabold tracking-tight lg:text-[34px] lg:tracking-[-0.02em]">
            {domingoAtual.nome}
          </h1>
          <p className="mt-0.5 text-sm opacity-80">
            Ciclo {domingoAtual.ciclo} · {LABEL_TEMPO[domingoAtual.tempo]}
          </p>

          <div className="mt-4 flex items-center gap-2 rounded-xl bg-white/15 px-4 lg:h-14 lg:rounded-2xl">
            <Search size={18} className="shrink-0 opacity-70" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por título, letra ou artista..."
              className="w-full bg-transparent py-2.5 text-sm placeholder:text-white/60 focus:outline-none lg:py-0"
            />
            <span className="hidden shrink-0 rounded-md bg-white/15 px-1.5 py-0.5 font-mono text-[11px] opacity-80 lg:inline">
              ⌘K
            </span>
          </div>
        </div>
      </header>

      {/* Faixa de filtro litúrgico (momento) */}
      <div className="flex gap-2 overflow-x-auto border-b border-[var(--border)] px-4 py-3 lg:px-10 lg:py-[18px]">
        <FiltroChip
          ativo={momento === undefined}
          label="Todos"
          onClick={() => setMomento(undefined)}
        />
        {MOMENTOS.map((m) => (
          <FiltroChip
            key={m}
            ativo={momento === m}
            label={LABEL_MOMENTO[m]}
            onClick={() => setMomento(momento === m ? undefined : m)}
          />
        ))}
      </div>

      {/* Filtro por tempo litúrgico (secundário) */}
      <div className="flex gap-2 overflow-x-auto border-b border-[var(--border)] px-4 py-2 lg:px-10">
        <FiltroChip
          ativo={tempo === undefined}
          label="Todos os tempos"
          onClick={() => setTempo(undefined)}
          pequeno
        />
        {TEMPOS.map((t) => (
          <FiltroChip
            key={t}
            ativo={tempo === t}
            label={LABEL_TEMPO[t]}
            onClick={() => setTempo(tempo === t ? undefined : t)}
            pequeno
          />
        ))}
      </div>

      {/* Corpo */}
      <div className="flex flex-1 flex-col lg:flex-row lg:gap-6 lg:px-10 lg:py-6">
        <div className="flex-1">
          <div className="flex items-center justify-between px-4 py-3 lg:px-0">
            <h2 className="text-sm font-semibold text-[var(--muted)]">
              {buscando ? `Resultados para "${query}"` : listTitle}
            </h2>
            <span className="text-xs text-[var(--muted)]">
              {carregando ? 'carregando…' : `${resultados.length} músicas`}
            </span>
          </div>

          {!carregando && resultados.length === 0 && (
            <div className="px-4 py-10 text-center text-[var(--muted)]">
              Nenhuma música encontrada. Tente outro termo ou remova os filtros.
            </div>
          )}

          <div className="lg:rounded-2xl lg:border lg:border-[var(--border)]">
            {resultados.map((musica, i) => (
              <MusicaCard
                key={musica.id}
                musica={musica}
                posicao={buscando ? undefined : i + 1}
                onClick={() => onSelectMusica(musica)}
                repertorios={repertorios}
                onAddToRepertorio={(repertorioId) => adicionar(repertorioId, musica)}
                onCreateRepertorioAndAdd={(nome) => criarECriarAdicionar(nome, musica)}
              />
            ))}
          </div>
        </div>

        {/* Meus repertórios (desktop) */}
        <aside className="hidden w-[340px] shrink-0 flex-col gap-3 lg:flex">
          <h2 className="text-sm font-semibold text-[var(--muted)]">Meus repertórios</h2>

          {repertorios.length === 0 && (
            <div className="rounded-xl bg-[var(--accent-soft)] p-3 text-xs text-[var(--muted)]">
              Você ainda não tem repertórios. Crie um abaixo ou clique no ícone{' '}
              <span className="font-semibold">+</span> ao lado de uma música.
            </div>
          )}

          {repertorios.map((r) => {
            const aberto = repertorioAberto === r.id;
            return (
              <div key={r.id} className="rounded-xl border border-[var(--border)]">
                <button
                  onClick={() => setRepertorioAberto(aberto ? null : r.id)}
                  className="flex w-full items-center gap-3 p-3 text-left"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] font-mono text-sm font-bold text-[var(--accent)]">
                    {r.itens.length}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--text)]">{r.nome}</p>
                    <p className="truncate text-xs text-[var(--muted)]">
                      {r.itens.length} música{r.itens.length === 1 ? '' : 's'}
                    </p>
                  </div>
                </button>

                {aberto && (
                  <div className="border-t border-[var(--border)] p-2">
                    {r.itens.length === 0 && (
                      <p className="px-2 py-2 text-xs text-[var(--muted)]">
                        Nenhuma música ainda — use o botão + nas músicas ao lado.
                      </p>
                    )}
                    {r.itens.map((item) => (
                      <div
                        key={item.musicaId}
                        className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--surface)]"
                      >
                        <button
                          onClick={async () => {
                            const musica = await getMusicaById(item.musicaId);
                            if (musica) onSelectMusica(musica);
                          }}
                          className="min-w-0 flex-1 truncate text-left text-sm text-[var(--text)]"
                        >
                          {item.title}
                        </button>
                        <span className="shrink-0 font-mono text-xs font-bold text-[var(--accent)]">
                          {item.tone}
                        </span>
                        <button
                          onClick={() => removerMusica(r.id, item.musicaId)}
                          aria-label="Remover música do repertório"
                          className="shrink-0 text-[var(--muted)] hover:text-[var(--text)]"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        remover(r.id);
                        setRepertorioAberto(null);
                      }}
                      className="mt-2 w-full rounded-lg py-1.5 text-center text-xs font-medium text-red-500 hover:bg-[var(--surface)]"
                    >
                      Excluir repertório
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!novoNome.trim()) return;
              criar(novoNome);
              setNovoNome('');
            }}
            className="flex gap-2"
          >
            <input
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              placeholder="Nome do novo repertório"
              className="w-full rounded-xl border border-dashed border-[var(--border)] px-3 py-2 text-sm text-[var(--text)] focus:outline-none"
            />
            <button
              type="submit"
              className="shrink-0 rounded-xl bg-[var(--accent)] px-3 text-sm font-semibold text-[var(--accent-fg)]"
            >
              Criar
            </button>
          </form>

          <div className="rounded-xl bg-[var(--accent-soft)] p-3 text-xs text-[var(--muted)]">
            Monte o repertório da missa e compartilhe com o ministério.
          </div>
        </aside>
      </div>

      {/* Ad-slot: some no modo leitor, aqui fica acima da bottom nav no mobile */}
      <footer
        id="ad-slot"
        className="flex h-14 items-center justify-center border-t border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--muted)] lg:sticky lg:bottom-0"
      >
        espaço reservado para anúncio
      </footer>

      {/* Bottom navigation (mobile) */}
      <nav className="sticky bottom-0 flex items-center justify-around border-t border-[var(--border)] bg-[var(--surface)] py-2 lg:hidden">
        <TabItem icon={<HomeIcon size={18} />} label="Início" active />
        <TabItem icon={<Search size={18} />} label="Buscar" />
        <TabItem icon={<ListMusic size={18} />} label="Repertórios" />
        <TabItem icon={<User size={18} />} label="Perfil" />
      </nav>
    </div>
  );
}

function FiltroChip({
  label,
  ativo,
  onClick,
  pequeno,
}: {
  label: string;
  ativo: boolean;
  onClick: () => void;
  pequeno?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-full border font-semibold transition-colors ${
        pequeno ? 'h-8 px-3 text-xs' : 'h-9 px-4 text-[13px]'
      } ${
        ativo
          ? 'border-transparent bg-[var(--accent)] text-[var(--accent-fg)]'
          : 'border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface)]'
      }`}
    >
      {label}
    </button>
  );
}

function TabItem({
  icon,
  label,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className={`flex min-w-16 flex-col items-center gap-1 py-1.5 ${
        active ? 'text-[var(--accent)]' : 'text-[var(--muted)]'
      }`}
    >
      {icon}
      <span className="text-[10px] font-semibold">{label}</span>
    </div>
  );
}
