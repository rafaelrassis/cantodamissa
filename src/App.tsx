import { useEffect, useState } from 'react';
import { Home } from './components/Home';
import { CifraReader } from './components/CifraReader';
import { CalendarioLiturgico } from './components/CalendarioLiturgico';
import { AdminPanel } from './components/AdminPanel';
import { TopMusicasTela } from './components/TopMusicasTela';
import { TopArtistasTela } from './components/TopArtistasTela';
import { RepertorioDetalheTela } from './components/RepertorioDetalheTela';
import { CantorTela } from './components/CantorTela';
import { ArtistaTela } from './components/ArtistaTela';
import { BuscaTela } from './components/BuscaTela';
import { MinisterioTela } from './components/ministerio/MinisterioTela';
import { UserLoginModal } from './components/UserLoginModal';
import { CompletarPerfilModal } from './components/CompletarPerfilModal';
import { AlertaTopo } from './components/AlertaTopo';
import { BottomNavBar } from './components/BottomNavBar';
import { useTheme } from './lib/useTheme';
import { useRepertorios } from './lib/useRepertorios';
import { useAdminAuth } from './lib/useAdminAuth';
import { useUserAuth } from './lib/useUserAuth';
import { useMinisterio } from './lib/useMinisterio';
import type { Musica, TempoLiturgico } from './types/musica';

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
  | 'ministerio';

function App() {
  const [tela, setTela] = useState<Tela>('home');
  const [musicaAtual, setMusicaAtual] = useState<Musica | null>(null);
  const [repertorioId, setRepertorioId] = useState<string | null>(null);
  const [tomForcado, setTomForcado] = useState<string | null>(null);
  const [filtroTempo, setFiltroTempo] = useState<TempoLiturgico | undefined>();
  const [cantorSlug, setCantorSlug] = useState<string | null>(null);
  const [artistaNome, setArtistaNome] = useState<string | null>(null);
  // Atalho "Ver escala" a partir do bloco "Meus próximos repertórios" na
  // Início — abre o módulo Ministério já direto na EscalaDetalheTela.
  const [escalaAlvoId, setEscalaAlvoId] = useState<string | null>(null);
  const { theme, toggleTheme, corPersonalizada, definirCorPersonalizada } = useTheme();
  const [fontSize, setFontSize] = useState(DEFAULT_FONT);
  const {
    isLoggedIn,
    userName,
    userEmail,
    foto,
    dataNascimento,
    login: loginUsuario,
    logout: logoutUsuario,
    definirFoto,
    definirDataNascimento,
  } = useUserAuth();
  const { isAdmin } = useAdminAuth(userEmail);
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
  const ministerio = useMinisterio(dataNascimento);

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

  const repertoriosApi = useRepertorios();
  const repertorioAtual = repertoriosApi.repertorios.find((r) => r.id === repertorioId) ?? null;

  function abrirMusica(musica: Musica, deRepertorioId: string | null = null, tom: string | null = null) {
    setMusicaAtual(musica);
    setRepertorioId(deRepertorioId);
    setTomForcado(tom);
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
      <>
        {mostrarAlertaGlobal && (
          <AlertaTopo
            mensagem={`${ministerio.solicitacoes.length} solicitação${
              ministerio.solicitacoes.length === 1 ? '' : 'ões'
            } pendente${ministerio.solicitacoes.length === 1 ? '' : 's'} no ${ministerio.nome}`}
            onClick={() => setTela('ministerio')}
          />
        )}
        {conteudo}
        {!opts?.semNav && (
          <>
            <div className="h-16 lg:hidden" aria-hidden />
            <BottomNavBar
              ativa={telaNavAtiva()}
              onIrHome={() => setTela('home')}
              onIrBusca={() => setTela('busca')}
              onIrCalendario={() => setTela('calendario')}
              onIrMinisterio={abrirMinisterio}
            />
          </>
        )}
      </>
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
        tomForcado={tomForcado}
        onSelectMusica={(m) => abrirMusica(m, repertorioId)}
        onAbrirCantor={abrirCantor}
        onAbrirArtista={abrirArtista}
      />,
      { semNav: true }
    );
  }

  if (tela === 'calendario') {
    return comAlerta(
      <CalendarioLiturgico onBack={() => setTela('home')} onFiltrarTempo={irParaHomeComFiltro} />
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
      <AdminPanel
        onBack={() => setTela('home')}
        onLogout={() => {
          logoutUsuario();
          setTela('home');
        }}
      />
    );
  }

  if (tela === 'top-musicas') {
    return comAlerta(
      <TopMusicasTela onBack={() => setTela('home')} onSelectMusica={(m) => abrirMusica(m)} />
    );
  }

  if (tela === 'top-artistas') {
    return comAlerta(<TopArtistasTela onBack={() => setTela('home')} onSelectArtista={abrirArtista} />);
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
      <MinisterioTela
        onBack={() => setTela('home')}
        onAbrirMusica={abrirMusica}
        ministerio={ministerio}
        escalaInicialId={escalaAlvoId}
      />
    );
  }

  if (tela === 'cantor' && cantorSlug) {
    return comAlerta(
      <CantorTela slug={cantorSlug} onBack={() => setTela('home')} onSelectMusica={(m) => abrirMusica(m)} />
    );
  }

  if (tela === 'artista' && artistaNome) {
    return comAlerta(
      <ArtistaTela artista={artistaNome} onBack={() => setTela('home')} onSelectMusica={(m) => abrirMusica(m)} />
    );
  }

  if (tela === 'repertorio-detalhe' && repertorioAtual) {
    return comAlerta(
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
    );
  }

  return comAlerta(
    <>
      <Home
        onSelectMusica={(m, repId) => abrirMusica(m, repId ?? null)}
        filtroInicial={filtroTempo}
        onAbrirCalendario={() => setTela('calendario')}
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

      {isLoggedIn && !dataNascimento && !perfilPulado && (
        <CompletarPerfilModal
          onSalvar={(iso) => definirDataNascimento(iso)}
          onPular={() => setPerfilPulado(true)}
        />
      )}
    </>
  );
}

export default App;
