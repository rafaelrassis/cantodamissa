import { lazy, Suspense, useEffect, useState } from 'react';
import { Home } from './components/Home';
import { CifraReader } from './components/CifraReader';
import { obterRepertorioPublico } from './lib/igrejas';
import {
  listarIdsFavoritos,
  favoritarMinisterio,
  desfavoritarMinisterio,
} from './lib/favoritosMinisterio';
import type { Repertorio } from './lib/repertorios';
import { BuscaTela } from './components/BuscaTela';
import { UserLoginModal } from './components/UserLoginModal';
import { CompletarPerfilModal } from './components/CompletarPerfilModal';
import { AtualizacaoDisponivelBanner } from './components/AtualizacaoDisponivelBanner';
import { AlertaTopo } from './components/AlertaTopo';
import { BottomNavBar } from './components/BottomNavBar';
import { useTheme } from './lib/useTheme';
import { useRepertorios } from './lib/repertoriosContext';
import { useAdminAuth } from './lib/useAdminAuth';
import { useUserAuth } from './lib/useUserAuth';
import { useMinisterio } from './lib/useMinisterio';
import { RepertorioTemplatesProvider } from './lib/RepertorioTemplatesProvider';
import { useServiceWorkerAtualizacao } from './lib/useServiceWorkerAtualizacao';
import { useCanalErro } from './lib/erroContext';
import type { Musica, TempoLiturgico } from './types/musica';

// A Área Admin carrega só quando é aberta: ela traz junto o formulário de
// música, o importador em lote e o `fflate` (leitura de .zip) — peso que
// não faz sentido baixar no primeiro acesso de quem só quer ver uma cifra.
const AdminPanel = lazy(() =>
  import('./components/AdminPanel').then((m) => ({ default: m.AdminPanel }))
);

// Idem pro módulo Ministério (escalas, equipes, avisos, roteiro): só quem
// participa de um ministério abre essas telas, e elas são a maior parte
// das telas do app.
const MinisterioTela = lazy(() =>
  import('./components/ministerio/MinisterioTela').then((m) => ({ default: m.MinisterioTela }))
);

// Telas secundárias (um clique a mais que Home/busca/leitor de cifra, que
// ficam eager pra abrir sem flash de "carregando…"): cada uma só é
// visitada por uma fração de quem abre o app, então não faz sentido
// pesar no bundle inicial de quem só quer ver uma cifra no domingo.
const CalendarioLiturgico = lazy(() =>
  import('./components/CalendarioLiturgico').then((m) => ({ default: m.CalendarioLiturgico }))
);
const TopMusicasTela = lazy(() =>
  import('./components/TopMusicasTela').then((m) => ({ default: m.TopMusicasTela }))
);
const TopArtistasTela = lazy(() =>
  import('./components/TopArtistasTela').then((m) => ({ default: m.TopArtistasTela }))
);
const RepertorioDetalheTela = lazy(() =>
  import('./components/RepertorioDetalheTela').then((m) => ({ default: m.RepertorioDetalheTela }))
);
const IgrejaPublicaTela = lazy(() =>
  import('./components/IgrejaPublicaTela').then((m) => ({ default: m.IgrejaPublicaTela }))
);
const BuscarMinisterioTela = lazy(() =>
  import('./components/BuscarMinisterioTela').then((m) => ({ default: m.BuscarMinisterioTela }))
);
const CantorTela = lazy(() =>
  import('./components/CantorTela').then((m) => ({ default: m.CantorTela }))
);
const ArtistaTela = lazy(() =>
  import('./components/ArtistaTela').then((m) => ({ default: m.ArtistaTela }))
);
const LegalTela = lazy(() =>
  import('./components/LegalTela').then((m) => ({ default: m.LegalTela }))
);

const MIN_FONT = 15;
const MAX_FONT = 34;
const DEFAULT_FONT = 21;

type Tela =
  | 'home'
  | 'calendario'
  | 'admin'
  | 'top-musicas'
  | 'top-artistas'
  | 'repertorio-detalhe'
  | 'cantor'
  | 'artista'
  | 'busca'
  | 'ministerio'
  | 'igreja-publica'
  | 'buscar-ministerio'
  | 'privacidade'
  | 'termos';

function App() {
  const [tela, setTela] = useState<Tela>('home');
  const [musicaAtual, setMusicaAtual] = useState<Musica | null>(null);
  const [repertorioId, setRepertorioId] = useState<string | null>(null);
  const [musicaPublica, setMusicaPublica] = useState(false);
  const [tomForcado, setTomForcado] = useState<string | null>(null);
  const [filtroTempo, setFiltroTempo] = useState<TempoLiturgico | undefined>();
  const [cantorSlug, setCantorSlug] = useState<string | null>(null);
  const [artistaNome, setArtistaNome] = useState<string | null>(null);
  // Atalho "Ver escala" a partir do bloco "Meus próximos repertórios" na
  // Início — abre o módulo Ministério já direto na EscalaDetalheTela.
  const [escalaAlvoId, setEscalaAlvoId] = useState<string | null>(null);
  // Acesso público da assembleia via igreja (busca por nome/código ou
  // link direto `?igreja=CODIGO`) — repertório aberto em modo letra,
  // sem login, sem edição. Ver lib/igrejas.ts.
  const [igrejaCodigoInicial, setIgrejaCodigoInicial] = useState<string | null>(null);
  const [repertorioPublico, setRepertorioPublico] = useState<Repertorio | null>(null);
  const [favoritoRepertorioPublico, setFavoritoRepertorioPublico] = useState(false);
  const [alternandoFavoritoPublico, setAlternandoFavoritoPublico] = useState(false);

  const { theme, toggleTheme, corPersonalizada, definirCorPersonalizada } = useTheme();
  const [fontSize, setFontSize] = useState(DEFAULT_FONT);
  const {
    isLoggedIn,
    userName,
    userEmail,
    foto,
    dataNascimento,
    perfilCarregado,
    login: loginUsuario,
    logout: logoutUsuario,
    definirFoto,
    definirDataNascimento,
  } = useUserAuth();
  const { isAdmin } = useAdminAuth(userEmail);
  const { precisaAtualizar, atualizarAgora } = useServiceWorkerAtualizacao();
  const { erro, limpar: limparErro } = useCanalErro();
  const [loginParaMinisterioAberto, setLoginParaMinisterioAberto] = useState(false);
  const [escalaAlvoPosLogin, setEscalaAlvoPosLogin] = useState<string | null>(null);
  const [perfilPulado, setPerfilPulado] = useState(false);

  // Login Google é redirect (a página sai e volta) — a intenção "ir pro
  // Ministério depois de logar" (com ou sem uma escala específica em
  // mente, ver abrirEscala) não sobrevive ao remount sozinha, então fica
  // guardada aqui e é consumida assim que a sessão aparecer. Valor '1' =
  // só ir pro Ministério; qualquer outro valor = id da escala alvo.
  const CHAVE_POS_LOGIN = 'cdm_pos_login_ir_ministerio';
  useEffect(() => {
    if (!isLoggedIn) return;
    const valor = sessionStorage.getItem(CHAVE_POS_LOGIN);
    if (!valor) return;
    sessionStorage.removeItem(CHAVE_POS_LOGIN);
    if (valor !== '1') setEscalaAlvoId(valor);
    setTela('ministerio');
  }, [isLoggedIn]);

  // Levantado até aqui (em vez de ficar dentro de MinisterioTela) pra
  // sobreviver à troca de tela e alimentar o alerta global abaixo.
  // dataNascimento (da conta) sobrescreve o aniversário salvo de "você".
  const ministerio = useMinisterio({ nome: userName, dataNascimento });

  function abrirMinisterio() {
    if (isLoggedIn) {
      setTela('ministerio');
    } else {
      setEscalaAlvoPosLogin(null);
      setLoginParaMinisterioAberto(true);
    }
  }

  function abrirEscala(escalaId: string) {
    if (isLoggedIn) {
      setEscalaAlvoId(escalaId);
      setTela('ministerio');
    } else {
      setEscalaAlvoPosLogin(escalaId);
      setLoginParaMinisterioAberto(true);
    }
  }

  // Estado do favorito do ministério do repertório público aberto — só
  // busca se tiver ministerio_id (repertório da assembleia) e usuário logado.
  useEffect(() => {
    const ministerioId = repertorioPublico?.ministerioId;
    if (!ministerioId || !isLoggedIn) {
      setFavoritoRepertorioPublico(false);
      return;
    }
    listarIdsFavoritos().then((ids) => setFavoritoRepertorioPublico(ids.has(ministerioId)));
  }, [repertorioPublico?.ministerioId, isLoggedIn]);

  async function alternarFavoritoRepertorioPublico() {
    const ministerioId = repertorioPublico?.ministerioId;
    if (!ministerioId) return;
    setAlternandoFavoritoPublico(true);
    try {
      if (favoritoRepertorioPublico) {
        await desfavoritarMinisterio(ministerioId);
        setFavoritoRepertorioPublico(false);
      } else {
        await favoritarMinisterio(ministerioId);
        setFavoritoRepertorioPublico(true);
      }
    } finally {
      setAlternandoFavoritoPublico(false);
    }
  }

  const repertoriosApi = useRepertorios();
  const repertorioAtual = repertoriosApi.repertorios.find((r) => r.id === repertorioId) ?? null;

  function abrirMusica(
    musica: Musica,
    deRepertorioId: string | null = null,
    tom: string | null = null,
    publico = false
  ) {
    setMusicaAtual(musica);
    setRepertorioId(deRepertorioId);
    setTomForcado(tom);
    setMusicaPublica(publico);
  }

  function irParaHomeComFiltro(tempo: TempoLiturgico) {
    setFiltroTempo(tempo);
    setTela('home');
  }

  function abrirArtista(artista: string) {
    setMusicaAtual(null);
    setArtistaNome(artista);
    setTela('artista');
  }

  function abrirCantor(slug: string) {
    setMusicaAtual(null);
    setCantorSlug(slug);
    setTela('cantor');
  }

  // Link direto pra página do cantor via URL (ex: compartilhado a partir do
  // admin), no mesmo padrão do `?rep=` usado pra repertório compartilhado
  // em Home.tsx.
  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get('cantor');
    if (slug) abrirCantor(slug);
  }, []);

  // Link direto pra igreja via URL (ex: cartaz com QR code na entrada da
  // paróquia): `?igreja=CODIGO` abre já a lista de repertórios abertos.
  useEffect(() => {
    const codigo = new URLSearchParams(window.location.search).get('igreja');
    if (codigo) {
      setIgrejaCodigoInicial(codigo);
      setTela('igreja-publica');
    }
  }, []);

  const [telaOrigemRepertorioPublico, setTelaOrigemRepertorioPublico] = useState<Tela>('home');

  async function abrirRepertorioPublico(id: string) {
    setTelaOrigemRepertorioPublico(tela === 'buscar-ministerio' ? 'buscar-ministerio' : 'home');
    const rep = await obterRepertorioPublico(id);
    setRepertorioPublico(rep);
    setTela('igreja-publica');
  }

  // Alerta global: admin do ministério com solicitação de ingresso
  // pendente, visível em qualquer tela — exceto dentro do leitor de
  // cifra (modo missa ao vivo não deve ter distração, mesma lógica do
  // ad-slot que também some lá).
  const mostrarAlertaGlobal =
    isLoggedIn && !musicaAtual && ministerio.souAdmin && ministerio.solicitacoes.length > 0;

  // BottomNavBar: fixa em todas as telas, exceto no leitor de cifra
  // (mesma exceção do alerta acima). `comAlerta` decide a tela ativa da
  // barra a partir de `tela`; a barra é `position: fixed`, então cada
  // chamada também injeta um spacer no fim do documento pra o
  // conteúdo da tela não ficar por baixo dela.
  function telaNavAtiva(): 'home' | 'busca' | 'calendario' | 'ministerio' {
    if (tela === 'busca') return 'busca';
    if (tela === 'calendario') return 'calendario';
    if (tela === 'ministerio') return 'ministerio';
    return 'home';
  }

  function comAlerta(conteudo: React.ReactNode, opts?: { semNav?: boolean }) {
    return (
      <RepertorioTemplatesProvider ministerioId={ministerio.pertence ? ministerio.id : null}>
        {/* Falha de qualquer ação do app (ex.: gravação barrada por falta
            de permissão), reportada pelo canal único — ver erroContext.ts. */}
        {erro && <AlertaTopo tipo="erro" mensagem={erro} onFechar={limparErro} />}
        {mostrarAlertaGlobal && (
          <AlertaTopo
            mensagem={`${ministerio.solicitacoes.length} solicitação${
              ministerio.solicitacoes.length === 1 ? '' : 'ões'
            } pendente${ministerio.solicitacoes.length === 1 ? '' : 's'} no ${ministerio.nome}`}
            onClick={() => setTela('ministerio')}
          />
        )}
        {conteudo}
        {precisaAtualizar && <AtualizacaoDisponivelBanner onAtualizar={atualizarAgora} />}
        {!opts?.semNav && (
          <>
            <div className="h-16 md:hidden" aria-hidden />
            <BottomNavBar
              ativa={telaNavAtiva()}
              onIrHome={() => setTela('home')}
              onIrBusca={() => setTela('busca')}
              onIrCalendario={() => setTela('calendario')}
              onIrMinisterio={abrirMinisterio}
            />
          </>
        )}
      </RepertorioTemplatesProvider>
    );
  }

  if (musicaAtual) {
    return comAlerta(
      <CifraReader
        musica={musicaAtual}
        onClose={() => setMusicaAtual(null)}
        theme={theme}
        onToggleTheme={toggleTheme}
        fontSize={fontSize}
        onIncFont={() => setFontSize((f) => Math.min(MAX_FONT, f + 2))}
        onDecFont={() => setFontSize((f) => Math.max(MIN_FONT, f - 2))}
        repertorioId={repertorioId}
        publico={musicaPublica}
        tomForcado={tomForcado}
        onSelectMusica={(m) => abrirMusica(m, repertorioId, null, musicaPublica)}
        onAbrirCantor={abrirCantor}
        onAbrirArtista={abrirArtista}
      />,
      { semNav: true }
    );
  }

  if (tela === 'calendario') {
    return comAlerta(
      <Suspense fallback={<TelaCarregando />}>
        <CalendarioLiturgico onBack={() => setTela('home')} onFiltrarTempo={irParaHomeComFiltro} />
      </Suspense>
    );
  }

  if (tela === 'privacidade' || tela === 'termos') {
    return (
      <Suspense fallback={<TelaCarregando />}>
        <LegalTela
          documento={tela === 'privacidade' ? 'privacidade' : 'termos'}
          onBack={() => setTela('home')}
        />
      </Suspense>
    );
  }

  if (tela === 'admin') {
    if (!isAdmin) {
      return comAlerta(
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[var(--bg)] px-4 text-center text-[var(--text)]">
          <p className="text-sm text-[var(--muted)]">Acesso restrito.</p>
          <button onClick={() => setTela('home')} className="text-sm font-semibold text-[var(--accent)] underline">
            Voltar
          </button>
        </div>,
        { semNav: true }
      );
    }
    return comAlerta(
      <Suspense fallback={<TelaCarregando />}>
        <AdminPanel
          onBack={() => setTela('home')}
          onLogout={() => {
            logoutUsuario();
            setTela('home');
          }}
        />
      </Suspense>
    );
  }

  if (tela === 'top-musicas') {
    return comAlerta(
      <Suspense fallback={<TelaCarregando />}>
        <TopMusicasTela onBack={() => setTela('home')} onSelectMusica={(m) => abrirMusica(m)} />
      </Suspense>
    );
  }

  if (tela === 'top-artistas') {
    return comAlerta(
      <Suspense fallback={<TelaCarregando />}>
        <TopArtistasTela onBack={() => setTela('home')} onSelectArtista={abrirArtista} />
      </Suspense>
    );
  }

  if (tela === 'busca') {
    return comAlerta(
      <BuscaTela
        onBack={() => setTela('home')}
        onSelectMusica={(m) => abrirMusica(m)}
        onAbrirTopMusicas={() => setTela('top-musicas')}
        onAbrirTopArtistas={() => setTela('top-artistas')}
        onAbrirCalendario={() => setTela('calendario')}
      />
    );
  }

  if (tela === 'ministerio' && isLoggedIn) {
    return comAlerta(
      <Suspense fallback={<TelaCarregando />}>
        <MinisterioTela
          onBack={() => setTela('home')}
          onAbrirMusica={abrirMusica}
          ministerio={ministerio}
          escalaInicialId={escalaAlvoId}
        />
      </Suspense>
    );
  }

  if (tela === 'cantor' && cantorSlug) {
    return comAlerta(
      <Suspense fallback={<TelaCarregando />}>
        <CantorTela slug={cantorSlug} onBack={() => setTela('home')} onSelectMusica={(m) => abrirMusica(m)} />
      </Suspense>
    );
  }

  if (tela === 'artista' && artistaNome) {
    return comAlerta(
      <Suspense fallback={<TelaCarregando />}>
        <ArtistaTela artista={artistaNome} onBack={() => setTela('home')} onSelectMusica={(m) => abrirMusica(m)} />
      </Suspense>
    );
  }

  if (tela === 'igreja-publica' && repertorioPublico) {
    return (
      <Suspense fallback={<TelaCarregando />}>
        <RepertorioDetalheTela
          repertorio={repertorioPublico}
          onBack={() => {
            setRepertorioPublico(null);
            if (!igrejaCodigoInicial) setTela(telaOrigemRepertorioPublico);
          }}
          onSelectMusica={(m, tom) => abrirMusica(m, repertorioPublico.id, tom, true)}
          removerMusica={() => {}}
          moverMusicaParaRito={() => {}}
          adicionarRito={() => {}}
          removerRito={() => {}}
          reordenarRitos={() => {}}
          onExcluirRepertorio={async () => {}}
          podeEditar={false}
          abaInicial="letra"
          isLoggedIn={isLoggedIn}
          favorito={favoritoRepertorioPublico}
          alternandoFavorito={alternandoFavoritoPublico}
          onAlternarFavorito={alternarFavoritoRepertorioPublico}
          onEntrarParaFavoritar={() => setLoginParaMinisterioAberto(true)}
        />
        {loginParaMinisterioAberto && (
          <UserLoginModal
            onLogin={() => {
              loginUsuario();
              setLoginParaMinisterioAberto(false);
            }}
            onClose={() => setLoginParaMinisterioAberto(false)}
          />
        )}
      </Suspense>
    );
  }

  if (tela === 'igreja-publica') {
    return (
      <Suspense fallback={<TelaCarregando />}>
        <IgrejaPublicaTela
          codigoInicial={igrejaCodigoInicial}
          onBack={() => {
            setIgrejaCodigoInicial(null);
            setTela('home');
          }}
          onAbrirRepertorio={abrirRepertorioPublico}
        />
      </Suspense>
    );
  }

  if (tela === 'buscar-ministerio') {
    return (
      <Suspense fallback={<TelaCarregando />}>
        <BuscarMinisterioTela
          isLoggedIn={isLoggedIn}
          onBack={() => setTela('home')}
          onEntrar={() => setLoginParaMinisterioAberto(true)}
          onFavoritosAlterados={() => {}}
          onAbrirRepertorio={abrirRepertorioPublico}
        />
        {loginParaMinisterioAberto && (
          <UserLoginModal
            onLogin={() => {
              loginUsuario();
              setLoginParaMinisterioAberto(false);
            }}
            onClose={() => setLoginParaMinisterioAberto(false)}
          />
        )}
      </Suspense>
    );
  }

  if (tela === 'repertorio-detalhe' && repertorioAtual) {
    return comAlerta(
      <Suspense fallback={<TelaCarregando />}>
        <RepertorioDetalheTela
          repertorio={repertorioAtual}
          onBack={() => setTela('home')}
          onSelectMusica={(m, tom) => abrirMusica(m, repertorioAtual.id, tom)}
          removerMusica={repertoriosApi.removerMusica}
          moverMusicaParaRito={repertoriosApi.moverMusicaParaRito}
          adicionarRito={repertoriosApi.adicionarRito}
          removerRito={repertoriosApi.removerRito}
          reordenarRitos={repertoriosApi.reordenarRitos}
          onExcluirRepertorio={repertoriosApi.remover}
        />
      </Suspense>
    );
  }

  return comAlerta(
    <>
      <Home
        onSelectMusica={(m, repId) => abrirMusica(m, repId ?? null)}
        filtroInicial={filtroTempo}
        onAbrirCalendario={() => setTela('calendario')}
        onAbrirBusca={() => setTela('busca')}
        onAbrirPrivacidade={() => setTela('privacidade')}
        onAbrirTermos={() => setTela('termos')}
        onAbrirMinisterio={abrirMinisterio}
        onAbrirBuscarMinisterio={() => setTela('buscar-ministerio')}
        onAbrirRepertorioPublico={abrirRepertorioPublico}
        onAbrirAreaAdmin={() => setTela('admin')}
        isAdmin={isAdmin}
        onAbrirTopMusicas={() => setTela('top-musicas')}
        onAbrirTopArtistas={() => setTela('top-artistas')}
        onSelectArtista={abrirArtista}
        onSelectCantor={abrirCantor}
        onAbrirRepertorio={(id) => {
          setRepertorioId(id);
          setTela('repertorio-detalhe');
        }}
        onAbrirEscala={abrirEscala}
        theme={theme}
        onToggleTheme={toggleTheme}
        corPersonalizada={corPersonalizada}
        onDefinirCorPersonalizada={definirCorPersonalizada}
        ministerio={ministerio}
        isLoggedIn={isLoggedIn}
        userName={userName}
        foto={foto}
        dataNascimento={dataNascimento}
        onLoginUsuario={loginUsuario}
        onLogoutUsuario={logoutUsuario}
        onDefinirFoto={definirFoto}
        onDefinirDataNascimento={definirDataNascimento}
      />

      {loginParaMinisterioAberto && (
        <UserLoginModal
          onLogin={() => {
            sessionStorage.setItem(CHAVE_POS_LOGIN, escalaAlvoPosLogin ?? '1');
            loginUsuario();
            setLoginParaMinisterioAberto(false);
          }}
          onClose={() => setLoginParaMinisterioAberto(false)}
        />
      )}

      {isLoggedIn && perfilCarregado && !dataNascimento && !perfilPulado && (
        <CompletarPerfilModal
          onSalvar={(iso) => definirDataNascimento(iso)}
          onPular={() => setPerfilPulado(true)}
        />
      )}
    </>
  );
}

function TelaCarregando() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] text-sm text-[var(--muted)]">
      Carregando…
    </div>
  );
}

export default App;
