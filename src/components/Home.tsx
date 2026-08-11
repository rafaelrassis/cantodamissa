import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronRight, Home as HomeIcon, ListMusic, Search, Users, X } from 'lucide-react';
import type { Musica, MomentoMissa, TempoLiturgico } from '../types/musica';
import type { Cantor } from '../types/cantor';
import {
  getArtistasEmAlta,
  getMusicaById,
  getTop50,
  searchMusicas,
  type ArtistaEmAlta,
} from '../lib/musicasApi';
import { getCantoresPopulares } from '../lib/cantoresApi';
import { useHistoricoMusicas } from '../lib/useHistoricoMusicas';
import { proximoDomingoCalculado, diasAte } from '../lib/liturgicalCalendar';
import { LABEL_TEMPO, LABEL_MOMENTO } from '../lib/labels';
import {
  obterRepertorioPorToken,
  ritoSugeridoParaMomento,
  type Repertorio as RepertorioTipo,
} from '../lib/repertorios';
import { useRepertorios } from '../lib/useRepertorios';
import { useSubmissoes } from '../lib/useSubmissoes';
import type { Theme } from '../lib/useTheme';
import type { MinisterioMock } from '../lib/useMinisterioMock';
import { CantoresPopularesSection } from './CantoresPopularesSection';
import { HeaderUsuario } from './HeaderUsuario';
import { MusicaCard } from './MusicaCard';
import { PaginatedCarousel } from './PaginatedCarousel';
import { PainelRepertorios } from './PainelRepertorios';
import { PersonalizarTela } from './PersonalizarTela';
import { SubmissaoForm } from './SubmissaoForm';
import { UserLoginModal } from './UserLoginModal';

interface Props {
  onSelectMusica: (musica: Musica, repertorioId?: string) => void;
  filtroInicial?: TempoLiturgico;
  onAbrirCalendario?: () => void;
  onAbrirModeracao?: () => void;
  onAbrirLoginAdmin?: () => void;
  onAbrirTopMusicas?: () => void;
  onAbrirTopArtistas?: () => void;
  onAbrirBusca?: () => void;
  onAbrirRepertorio: (id: string) => void;
  onSelectArtista?: (artista: string) => void;
  onSelectCantor?: (slug: string) => void;
  onAbrirMinisterio?: () => void;
  theme: Theme;
  onToggleTheme: () => void;
  corPersonalizada: string | null;
  onDefinirCorPersonalizada: (hex: string | null) => void;
  ministerio: MinisterioMock;
  isLoggedIn: boolean;
  userName: string | null;
  foto: string | null;
  dataNascimento: string | null;
  onLoginUsuario: (dataNascimento?: string) => void;
  onLogoutUsuario: () => void;
  onDefinirFoto: (emoji: string | null) => void;
  onDefinirDataNascimento: (iso: string | null) => void;
}

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

export function Home({
  onSelectMusica,
  filtroInicial,
  onAbrirCalendario,
  onAbrirModeracao,
  onAbrirLoginAdmin,
  onAbrirTopMusicas,
  onAbrirTopArtistas,
  onAbrirBusca,
  onSelectArtista,
  onSelectCantor,
  onAbrirRepertorio,
  onAbrirMinisterio,
  theme,
  onToggleTheme,
  corPersonalizada,
  onDefinirCorPersonalizada,
  ministerio,
  isLoggedIn,
  userName,
  foto,
  dataNascimento,
  onLoginUsuario,
  onLogoutUsuario,
  onDefinirFoto,
  onDefinirDataNascimento,
}: Props) {
  const [query, setQuery] = useState('');
  const [artistas, setArtistas] = useState<ArtistaEmAlta[]>([]);
  const [cantoresPopulares, setCantoresPopulares] = useState<Cantor[]>([]);

  useEffect(() => {
    getArtistasEmAlta(5).then(setArtistas);
    getCantoresPopulares(20).then(setCantoresPopulares);
  }, []);
  // sem chip de tempo litúrgico na UI mais, mas o valor inicial (vindo do
  // Calendário, via filtroInicial) ainda filtra a lista uma vez
  const [tempo] = useState<TempoLiturgico | undefined>(filtroInicial);
  const [momento, setMomento] = useState<MomentoMissa | undefined>();
  const [resultados, setResultados] = useState<Musica[]>([]);
  const [carregando, setCarregando] = useState(true);

  const searchRef = useRef<HTMLInputElement>(null);
  const domingoAtual = useMemo(() => proximoDomingoCalculado(new Date()), []);
  const diasParaDomingo = useMemo(() => diasAte(domingoAtual.data, new Date()), [domingoAtual]);
  const ehHoje = diasParaDomingo === 0;
  const buscando = query.trim().length > 0;

  const { repertorios, criar, adicionarMusica, duplicar } = useRepertorios();
  const [novoNome, setNovoNome] = useState('');
  const [repertorioCompartilhado, setRepertorioCompartilhado] = useState<RepertorioTipo | null>(
    null
  );

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('rep');
    if (!token) return;
    obterRepertorioPorToken(token).then(setRepertorioCompartilhado);
  }, []);
  const { criar: criarSubmissao } = useSubmissoes();
  const [formularioAberto, setFormularioAberto] = useState(false);
  const [repertoriosMobileAberto, setRepertoriosMobileAberto] = useState(false);
  const [loginAberto, setLoginAberto] = useState(false);
  const [personalizarAberto, setPersonalizarAberto] = useState(false);
  const notificacoes = ministerio.souAdmin ? ministerio.solicitacoes : [];
  const { historico, remover: removerHistorico, limpar: limparHistorico } = useHistoricoMusicas();

  async function abrirDoHistorico(id: string) {
    const musica = await getMusicaById(id);
    if (musica) onSelectMusica(musica);
  }

  function adicionar(repertorioId: string, musica: Musica) {
    adicionarMusica(repertorioId, {
      musicaId: musica.id,
      title: musica.title,
      artist: musica.artist,
      tone: musica.originalTone,
      momento: ritoSugeridoParaMomento(musica.momento[0] ?? null),
    });
  }

  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    const filtro = { tempo, momento };
    const promise = buscando ? searchMusicas(query, filtro) : getTop50(filtro, 15);
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

  const listTitle = momento ? `Momento: ${LABEL_MOMENTO[momento]}` : 'Músicas em alta';

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg)] font-sans text-[var(--text)]">
      {/* Header */}
      <header className="bg-[var(--accent)] text-[var(--accent-fg)]">
        {/* Nav desktop */}
        <div className="hidden items-center justify-between px-10 py-4 lg:flex">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
              <img src="/logo-header.png" alt="" className="h-8 w-8" />
              Canto da Missa
            </div>
            <nav className="flex items-center gap-6 text-sm font-medium opacity-90">
              <span>Músicas</span>
              <button onClick={onAbrirCalendario} className="hover:opacity-100">
                Calendário
              </button>
              <button onClick={() => setRepertoriosMobileAberto(true)} className="hover:opacity-100">
                Repertórios
              </button>
            </nav>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <HeaderUsuario
              isLoggedIn={isLoggedIn}
              userName={userName}
              foto={foto}
              onEntrar={() => setLoginAberto(true)}
              onAbrirPersonalizar={() => setPersonalizarAberto(true)}
              notificacoes={notificacoes}
              onAprovarNotificacao={ministerio.aprovarSolicitacao}
              onRecusarNotificacao={ministerio.recusarSolicitacao}
            />
          </div>
        </div>

        {/* Nav mobile */}
        <div className="flex items-center justify-between px-4 pt-4 lg:hidden">
          <div className="flex items-center gap-2 text-base font-extrabold tracking-tight">
            <img src="/logo-header.png" alt="" className="h-8 w-8" />
            Canto da Missa
          </div>
          <HeaderUsuario
            isLoggedIn={isLoggedIn}
            userName={userName}
            foto={foto}
            onEntrar={() => setLoginAberto(true)}
            onAbrirPersonalizar={() => setPersonalizarAberto(true)}
            notificacoes={notificacoes}
            onAprovarNotificacao={ministerio.aprovarSolicitacao}
            onRecusarNotificacao={ministerio.recusarSolicitacao}
          />
        </div>

        <div className="px-4 pb-5 pt-4 lg:px-10 lg:pb-6">
          {ehHoje ? (
            <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-[var(--accent)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
              Hoje é domingo
            </div>
          ) : (
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-70">
              Próximo domingo · {domingoAtual.data.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
              })}
              {' · '}
              {diasParaDomingo === 1 ? 'amanhã' : `daqui a ${diasParaDomingo} dias`}
            </p>
          )}
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

      {/* Corpo */}
      <div className="flex flex-1 flex-col lg:flex-row lg:gap-6 lg:px-10 lg:py-6">
        <div className="flex-1">
          {!buscando && historico.length > 0 && (
            <div className="px-4 py-3 lg:px-0">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[var(--muted)]">Visto recentemente</h2>
                <button
                  onClick={limparHistorico}
                  className="text-xs text-[var(--muted)] hover:text-[var(--text)]"
                >
                  limpar
                </button>
              </div>
              <PaginatedCarousel
                items={historico.slice(0, 9)}
                pageSize={3}
                renderPage={(pageItems) => (
                  <div className="lg:rounded-2xl lg:border lg:border-[var(--border)]">
                    {pageItems.map((h) => (
                      <div
                        key={h.id}
                        className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3 last:border-b-0"
                      >
                        <button
                          onClick={() => abrirDoHistorico(h.id)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <p className="truncate text-[15px] font-semibold text-[var(--text)]">
                            {h.title}
                          </p>
                          {h.artist && (
                            <p className="truncate text-xs text-[var(--muted)]">{h.artist}</p>
                          )}
                        </button>
                        <button
                          onClick={() => removerHistorico(h.id)}
                          aria-label={`remover ${h.title} do histórico`}
                          className="ml-2 shrink-0 text-[var(--muted)] hover:text-[var(--text)]"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              />
            </div>
          )}

          {!buscando && onSelectCantor && (
            <CantoresPopularesSection cantores={cantoresPopulares} onSelectCantor={onSelectCantor} />
          )}

          <div className="flex items-center justify-between px-4 py-3 lg:px-0">
            <h2 className="text-sm font-semibold text-[var(--muted)]">
              {buscando ? `Resultados para "${query}"` : listTitle}
            </h2>
            {!buscando && onAbrirTopMusicas ? (
              <button
                onClick={onAbrirTopMusicas}
                aria-label="Ver top 50 completo"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface)]"
              >
                <ChevronRight size={16} />
              </button>
            ) : (
              <span className="text-xs text-[var(--muted)]">
                {carregando ? 'carregando…' : `${resultados.length} músicas`}
              </span>
            )}
          </div>

          {!carregando && resultados.length === 0 && (
            <div className="px-4 py-10 text-center text-[var(--muted)]">
              Nenhuma música encontrada. Tente outro termo ou remova os filtros.
            </div>
          )}

          {buscando ? (
            <div className="lg:rounded-2xl lg:border lg:border-[var(--border)]">
              {resultados.map((musica) => (
                <MusicaCard
                  key={musica.id}
                  musica={musica}
                  posicao={undefined}
                  onClick={() => onSelectMusica(musica)}
                  repertorios={repertorios}
                  onAddToRepertorio={(repertorioId) => adicionar(repertorioId, musica)}
                />
              ))}
            </div>
          ) : (
            <PaginatedCarousel
              items={resultados}
              pageSize={5}
              renderPage={(pageItems, pageIndex) => (
                <div className="lg:rounded-2xl lg:border lg:border-[var(--border)]">
                  {pageItems.map((musica, i) => (
                    <MusicaCard
                      key={musica.id}
                      musica={musica}
                      posicao={pageIndex * 5 + i + 1}
                      onClick={() => onSelectMusica(musica)}
                      repertorios={repertorios}
                      onAddToRepertorio={(repertorioId) => adicionar(repertorioId, musica)}
                    />
                  ))}
                </div>
              )}
            />
          )}

          {!buscando && (
            <div className="mt-6">
              <div className="flex items-center justify-between px-4 py-3 lg:px-0">
                <h2 className="text-sm font-semibold text-[var(--muted)]">
                  Artistas mais ouvidos
                </h2>
                {onAbrirTopArtistas && (
                  <button
                    onClick={onAbrirTopArtistas}
                    aria-label="Ver top 20 artistas"
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface)]"
                  >
                    <ChevronRight size={16} />
                  </button>
                )}
              </div>
              <div className="lg:rounded-2xl lg:border lg:border-[var(--border)]">
                {artistas.map((a, i) => (
                  <button
                    key={a.artist}
                    onClick={() => onSelectArtista?.(a.artist)}
                    className="flex w-full items-center gap-3 border-b border-[var(--border)] px-4 py-3 text-left last:border-b-0 hover:bg-[var(--surface)]"
                  >
                    <span className="w-6 shrink-0 text-right font-mono text-sm text-[var(--muted)]">
                      {i + 1}
                    </span>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] font-mono text-xs font-bold text-[var(--accent)]">
                      {a.artist.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[var(--text)]">
                        {a.artist}
                      </p>
                      <p className="truncate text-xs text-[var(--muted)]">
                        {a.songCount} música{a.songCount === 1 ? '' : 's'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Meus repertórios (desktop) */}
        <aside className="hidden w-[340px] shrink-0 flex-col gap-3 lg:flex">
          <h2 className="text-sm font-semibold text-[var(--muted)]">Meus repertórios</h2>
          <PainelRepertorios
            repertorios={repertorios}
            repertorioCompartilhado={repertorioCompartilhado}
            novoNome={novoNome}
            setNovoNome={setNovoNome}
            criar={criar}
            onAbrirRepertorio={onAbrirRepertorio}
            onSelectMusica={onSelectMusica}
            onClonar={duplicar}
          />
        </aside>
      </div>

      {/* Ad-slot: some no modo leitor, aqui fica acima da bottom nav no mobile */}
      <footer
        id="ad-slot"
        className="flex h-14 items-center justify-center border-t border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--muted)] lg:sticky lg:bottom-0"
      >
        espaço reservado para anúncio
      </footer>

      {onAbrirModeracao && (
        <button
          onClick={onAbrirModeracao}
          className="border-t border-[var(--border)] py-2 text-center text-[11px] text-[var(--muted)] underline-offset-2 hover:underline"
        >
          Revisar sugestões da comunidade
        </button>
      )}

      {/* Bottom navigation (mobile) */}
      <nav className="sticky bottom-0 flex items-center justify-around border-t border-[var(--border)] bg-[var(--surface)] py-2 lg:hidden">
        <TabItem icon={<HomeIcon size={18} />} label="Início" active />
        <TabItem icon={<Search size={18} />} label="Buscar" onClick={onAbrirBusca} />
        <TabItem
          icon={<ListMusic size={18} />}
          label="Repertórios"
          onClick={() => setRepertoriosMobileAberto(true)}
        />
        <TabItem icon={<CalendarDays size={18} />} label="Calendário" onClick={onAbrirCalendario} />
        <TabItem icon={<Users size={18} />} label="Ministério" onClick={onAbrirMinisterio} />
      </nav>

      {formularioAberto && (
        <SubmissaoForm
          modo="nova"
          userName={userName}
          onClose={() => setFormularioAberto(false)}
          onSubmit={(dados) => criarSubmissao({ ...dados, tipo: 'nova' })}
        />
      )}

      {loginAberto && (
        <UserLoginModal
          precisaDataNascimento={!dataNascimento}
          onLogin={(nascimento) => {
            onLoginUsuario(nascimento);
            setLoginAberto(false);
          }}
          onClose={() => setLoginAberto(false)}
          onAdminLogin={() => {
            setLoginAberto(false);
            onAbrirLoginAdmin?.();
          }}
        />
      )}

      {personalizarAberto && userName && (
        <PersonalizarTela
          userName={userName}
          foto={foto}
          onDefinirFoto={onDefinirFoto}
          dataNascimento={dataNascimento}
          onDefinirDataNascimento={onDefinirDataNascimento}
          theme={theme}
          onToggleTheme={onToggleTheme}
          corPersonalizada={corPersonalizada}
          onDefinirCorPersonalizada={onDefinirCorPersonalizada}
          onSair={() => {
            onLogoutUsuario();
            setPersonalizarAberto(false);
          }}
          onFechar={() => setPersonalizarAberto(false)}
          onCriarCifra={() => {
            setPersonalizarAberto(false);
            setFormularioAberto(true);
          }}
        />
      )}

      {repertoriosMobileAberto && (
        <div className="fixed inset-0 z-40 flex flex-col bg-[var(--bg)] lg:hidden">
          <header className="flex items-center justify-between bg-[var(--accent)] px-4 py-4 text-[var(--accent-fg)]">
            <h2 className="text-lg font-bold">Meus repertórios</h2>
            <button
              onClick={() => setRepertoriosMobileAberto(false)}
              aria-label="Fechar"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/16"
            >
              <X size={18} />
            </button>
          </header>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex flex-col gap-3">
              <PainelRepertorios
                repertorios={repertorios}
                repertorioCompartilhado={repertorioCompartilhado}
                novoNome={novoNome}
                setNovoNome={setNovoNome}
                criar={criar}
                onAbrirRepertorio={onAbrirRepertorio}
                onSelectMusica={onSelectMusica}
                onClonar={duplicar}
              />
            </div>
          </div>
        </div>
      )}
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
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex min-w-16 flex-col items-center gap-1 py-1.5 ${
        active ? 'text-[var(--accent)]' : 'text-[var(--muted)]'
      }`}
    >
      {icon}
      <span className="text-[10px] font-semibold">{label}</span>
    </button>
  );
}
