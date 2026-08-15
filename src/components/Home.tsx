import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, Search, X } from 'lucide-react';
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
import { useDebounce } from '../lib/useDebounce';
import { useHistoricoMusicas } from '../lib/useHistoricoMusicas';
import { useProximosRepertoriosHome } from '../lib/useProximosRepertoriosHome';
import { useQtdRepertoriosHome } from '../lib/preferenciaRepertoriosHome';
import { proximoDomingoCalculado, diasAte } from '../lib/liturgicalCalendar';
import { LABEL_TEMPO, LABEL_MOMENTO } from '../lib/labels';
import {
  obterRepertorioPorToken,
  type Repertorio as RepertorioTipo,
} from '../lib/repertorios';
import { useRepertorios } from '../lib/repertoriosContext';
import { useSubmissoes } from '../lib/useSubmissoes';
import type { Theme } from '../lib/useTheme';
import type { Ministerio } from '../lib/useMinisterio';
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
  onAbrirBusca?: () => void;
  onAbrirMinisterio?: () => void;
  onAbrirAreaAdmin?: () => void;
  isAdmin?: boolean;
  onAbrirTopMusicas?: () => void;
  onAbrirTopArtistas?: () => void;
  onAbrirRepertorio: (id: string) => void;
  onAbrirEscala: (escalaId: string) => void;
  onSelectArtista?: (artista: string) => void;
  onSelectCantor?: (slug: string) => void;
  theme: Theme;
  onToggleTheme: () => void;
  corPersonalizada: string | null;
  onDefinirCorPersonalizada: (hex: string | null) => void;
  ministerio: Ministerio;
  isLoggedIn: boolean;
  userName: string | null;
  foto: string | null;
  dataNascimento: string | null;
  onLoginUsuario: () => void;
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
  onAbrirBusca,
  onAbrirMinisterio,
  onAbrirAreaAdmin,
  isAdmin,
  onAbrirTopMusicas,
  onAbrirTopArtistas,
  onSelectArtista,
  onSelectCantor,
  onAbrirRepertorio,
  onAbrirEscala,
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
  // A consulta só sai quando a digitação para (ver useDebounce); `query`
  // continua controlando o input, pra ele não engasgar.
  const queryBuscada = useDebounce(query.trim(), 300);
  const buscando = queryBuscada.length > 0;

  const { repertorios, adicionarMusica, duplicar } = useRepertorios();
  const [repertorioCompartilhado, setRepertorioCompartilhado] = useState<RepertorioTipo | null>(
    null
  );

  // "Meus próximos repertórios" — escalas futuras do ministério ativo em
  // que eu participo, cruzadas com o repertório vinculado a cada uma (1
  // escala = 1 repertório). qtdRepertoriosHome = 0 esconde o bloco.
  // Consulta dedicada e enxuta (não usa useEscalas/useRepertorios
  // completos) — ver useProximosRepertoriosHome.ts.
  const [qtdRepertoriosHome, definirQtdRepertoriosHome] = useQtdRepertoriosHome();
  const { itens: proximosRepertorios } = useProximosRepertoriosHome(
    ministerio.id,
    ministerio.meuMembroId,
    qtdRepertoriosHome
  );

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('rep');
    if (!token) return;
    obterRepertorioPorToken(token).then(setRepertorioCompartilhado);
  }, []);
  const { criar: criarSubmissao } = useSubmissoes();
  const [formularioAberto, setFormularioAberto] = useState(false);
  // Só o link "Repertórios" do header desktop usa isso — no mobile a
  // barra inferior global (App.tsx → BottomNavBar) não tem mais esse
  // atalho, e no desktop a sidebar "Meus repertórios" já fica visível o
  // tempo todo; este sheet é só um atalho extra pro link do header.
  const [repertorioSheetAberto, setRepertorioSheetAberto] = useState(false);
  const [loginAberto, setLoginAberto] = useState(false);
  const [personalizarAberto, setPersonalizarAberto] = useState(false);
  const notificacoes = ministerio.souAdmin ? ministerio.solicitacoes : [];
  const { historico, remover: removerHistorico, limpar: limparHistorico } = useHistoricoMusicas();

  async function abrirDoHistorico(id: string) {
    const musica = await getMusicaById(id);
    if (musica) onSelectMusica(musica);
  }

  function adicionar(repertorioId: string, musica: Musica, rito: string) {
    adicionarMusica(repertorioId, {
      musicaId: musica.id,
      title: musica.title,
      artist: musica.artist,
      tone: musica.originalTone,
      momento: rito,
    });
  }

  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    const filtro = { tempo, momento };
    const promise = buscando ? searchMusicas(queryBuscada, filtro) : getTop50(filtro, 15);
    promise.then((lista) => {
      if (!cancelado) {
        setResultados(lista);
        setCarregando(false);
      }
    });
    return () => {
      cancelado = true;
    };
  }, [queryBuscada, tempo, momento, buscando]);

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
        <div className="hidden items-center justify-between px-10 py-4 md:flex">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
              <img src="/logo-header.png" alt="" className="h-8 w-8" />
              Canto da Missa
            </div>
            <nav className="flex items-center gap-1 text-sm font-medium">
              <NavItemDesktop label="Início" ativo />
              <NavItemDesktop label="Buscar" onClick={onAbrirBusca} />
              <NavItemDesktop label="Calendário" onClick={onAbrirCalendario} />
              <NavItemDesktop label="Repertórios" onClick={() => setRepertorioSheetAberto(true)} />
              <NavItemDesktop label="Ministério" onClick={onAbrirMinisterio} />
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
        <div className="flex items-center justify-between px-4 pt-4 md:hidden">
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

        <div className="px-4 pb-5 pt-4 md:px-10 md:pb-6">
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
          <h1 className="text-xl font-extrabold tracking-tight md:text-[34px] md:tracking-[-0.02em]">
            {domingoAtual.nome}
          </h1>
          <p className="mt-0.5 text-sm opacity-80">
            Ciclo {domingoAtual.ciclo} · {LABEL_TEMPO[domingoAtual.tempo]}
          </p>

          <div className="mt-4 flex items-center gap-2 rounded-xl bg-white/15 px-4 md:h-14 md:rounded-2xl">
            <Search size={18} className="shrink-0 opacity-70" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por título, letra ou artista..."
              className="w-full bg-transparent py-2.5 text-sm placeholder:text-white/60 focus:outline-none md:py-0"
            />
            <span className="hidden shrink-0 rounded-md bg-white/15 px-1.5 py-0.5 font-mono text-[11px] opacity-80 md:inline">
              ⌘K
            </span>
          </div>
        </div>
      </header>

      {/* Faixa de filtro litúrgico (momento) */}
      <div className="flex gap-2 overflow-x-auto border-b border-[var(--border)] px-4 py-3 md:px-10 md:py-[18px]">
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
      <div className="flex flex-1 flex-col md:flex-row md:gap-6 md:px-10 md:py-6">
        <div className="flex-1">
          {isLoggedIn && !buscando && proximosRepertorios.length > 0 && (
            <div className="px-4 py-3 md:px-0">
              <h2 className="mb-2 text-sm font-semibold text-[var(--muted)]">
                Meus próximos repertórios
              </h2>
              <div className="flex flex-col gap-2 md:rounded-2xl md:border md:border-[var(--border)] md:gap-0">
                {proximosRepertorios.map(({ escala, repertorioId }, i) => (
                  <div
                    key={escala.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onAbrirRepertorio(repertorioId)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onAbrirRepertorio(repertorioId);
                    }}
                    className={`flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-[var(--border)] px-4 py-3 hover:bg-[var(--surface)] md:rounded-none md:border-x-0 md:border-t-0 ${
                      i === proximosRepertorios.length - 1 ? 'md:border-b-0' : ''
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold text-[var(--text)]">
                        {escala.titulo}
                      </p>
                      <p className="truncate text-xs text-[var(--muted)]">
                        {new Date(`${escala.data}T00:00:00`).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAbrirEscala(escala.id);
                      }}
                      className="shrink-0 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--accent)] hover:bg-[var(--accent-soft)]"
                    >
                      Ver escala
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!buscando && historico.length > 0 && (
            <div className="px-4 py-3 md:px-0">
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
                  <div className="md:rounded-2xl md:border md:border-[var(--border)]">
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

          <div className="flex items-center justify-between px-4 py-3 md:px-0">
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
            <div className="md:rounded-2xl md:border md:border-[var(--border)]">
              {resultados.map((musica) => (
                <MusicaCard
                  key={musica.id}
                  musica={musica}
                  posicao={undefined}
                  onClick={() => onSelectMusica(musica)}
                  repertorios={repertorios}
                  onAddToRepertorio={(repertorioId, rito) => adicionar(repertorioId, musica, rito)}
                />
              ))}
            </div>
          ) : (
            <PaginatedCarousel
              items={resultados}
              pageSize={5}
              renderPage={(pageItems, pageIndex) => (
                <div className="md:rounded-2xl md:border md:border-[var(--border)]">
                  {pageItems.map((musica, i) => (
                    <MusicaCard
                      key={musica.id}
                      musica={musica}
                      posicao={pageIndex * 5 + i + 1}
                      onClick={() => onSelectMusica(musica)}
                      repertorios={repertorios}
                  onAddToRepertorio={(repertorioId, rito) => adicionar(repertorioId, musica, rito)}
                    />
                  ))}
                </div>
              )}
            />
          )}

          {!buscando && (
            <div className="mt-6">
              <div className="flex items-center justify-between px-4 py-3 md:px-0">
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
              <div className="md:rounded-2xl md:border md:border-[var(--border)]">
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
        <aside className="hidden w-[340px] shrink-0 flex-col gap-3 md:flex">
          <h2 className="text-sm font-semibold text-[var(--muted)]">Meus repertórios</h2>
          <PainelRepertorios
            repertorios={repertorios}
            repertorioCompartilhado={repertorioCompartilhado}
            onAbrirRepertorio={onAbrirRepertorio}
            onSelectMusica={onSelectMusica}
            onClonar={duplicar}
          />
        </aside>
      </div>

      {/* Ad-slot: some no modo leitor, aqui fica acima da bottom nav no mobile */}
      <footer
        id="ad-slot"
        className="flex h-14 items-center justify-center border-t border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--muted)] md:sticky md:bottom-0"
      >
        espaço reservado para anúncio
      </footer>

      {isAdmin && onAbrirAreaAdmin && (
        <button
          onClick={onAbrirAreaAdmin}
          className="border-t border-[var(--border)] py-2 text-center text-[11px] text-[var(--muted)] underline-offset-2 hover:underline"
        >
          Área Admin
        </button>
      )}

      {formularioAberto && (
        <SubmissaoForm
          modo="nova"
          onClose={() => setFormularioAberto(false)}
          onSubmit={async (dados) => {
            await criarSubmissao({ ...dados, tipo: 'nova' });
          }}
        />
      )}

      {loginAberto && (
        <UserLoginModal
          onLogin={() => {
            onLoginUsuario();
            setLoginAberto(false);
          }}
          onClose={() => setLoginAberto(false)}
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
          qtdRepertoriosHome={qtdRepertoriosHome}
          onDefinirQtdRepertoriosHome={definirQtdRepertoriosHome}
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

      {repertorioSheetAberto && (
        <div className="fixed inset-0 z-40 flex flex-col bg-[var(--bg)]">
          <header className="flex items-center justify-between bg-[var(--accent)] px-4 py-4 text-[var(--accent-fg)]">
            <h2 className="text-lg font-bold">Meus repertórios</h2>
            <button
              onClick={() => setRepertorioSheetAberto(false)}
              aria-label="Fechar"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/16"
            >
              <X size={18} />
            </button>
          </header>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="mx-auto flex max-w-md flex-col gap-3">
              <PainelRepertorios
                repertorios={repertorios}
                repertorioCompartilhado={repertorioCompartilhado}
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

function NavItemDesktop({ label, onClick, ativo }: { label: string; onClick?: () => void; ativo?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick && !ativo}
      className={`rounded-lg px-3 py-2 transition-colors ${
        ativo ? 'bg-white/15 text-[var(--accent-fg)]' : 'text-[var(--accent-fg)]/85 hover:bg-white/10 hover:text-[var(--accent-fg)]'
      }`}
    >
      {label}
    </button>
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
