import { useEffect, useState } from 'react';
import { Home } from './components/Home';
import { CifraReader } from './components/CifraReader';
import { CalendarioLiturgico } from './components/CalendarioLiturgico';
import { AdminPanel } from './components/AdminPanel';
import { AdminLogin } from './components/AdminLogin';
import { TopMusicasTela } from './components/TopMusicasTela';
import { TopArtistasTela } from './components/TopArtistasTela';
import { RepertorioDetalheTela } from './components/RepertorioDetalheTela';
import { CantorTela } from './components/CantorTela';
import { ArtistaTela } from './components/ArtistaTela';
import { BuscaTela } from './components/BuscaTela';
import { MinisterioTela } from './components/ministerio/MinisterioTela';
import { UserLoginModal } from './components/UserLoginModal';
import { AlertaTopo } from './components/AlertaTopo';
import { useTheme } from './lib/useTheme';
import { useRepertorios } from './lib/useRepertorios';
import { useAdminAuth } from './lib/useAdminAuth';
import { useUserAuth } from './lib/useUserAuth';
import { useMinisterioMock } from './lib/useMinisterioMock';
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
  const { theme, toggleTheme, corPersonalizada, definirCorPersonalizada } = useTheme();
  const [fontSize, setFontSize] = useState(DEFAULT_FONT);
  const { isAdmin, login, logout } = useAdminAuth();
  const {
    isLoggedIn,
    userName,
    foto,
    dataNascimento,
    login: loginUsuario,
    logout: logoutUsuario,
    definirFoto,
    definirDataNascimento,
  } = useUserAuth();
  const [loginParaMinisterioAberto, setLoginParaMinisterioAberto] = useState(false);

  // Levantado até aqui (em vez de ficar dentro de MinisterioTela) pra
  // sobreviver à troca de tela e alimentar o alerta global abaixo.
  // dataNascimento (da conta) sobrescreve o aniversário mockado de "você".
  const ministerio = useMinisterioMock(dataNascimento);

  function abrirMinisterio() {
    if (isLoggedIn) {
      setTela('ministerio');
    } else {
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
  const mostrarAlertaGlobal = !musicaAtual && ministerio.souAdmin && ministerio.solicitacoes.length > 0;

  function comAlerta(conteudo: React.ReactNode) {
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
      />
    );
  }

  if (tela === 'calendario') {
    return comAlerta(
      <CalendarioLiturgico onBack={() => setTela('home')} onFiltrarTempo={irParaHomeComFiltro} />
    );
  }

  if (tela === 'admin') {
    if (!isAdmin) {
      return comAlerta(<AdminLogin onLogin={login} onBack={() => setTela('home')} />);
    }
    return comAlerta(
      <AdminPanel
        onBack={() => setTela('home')}
        onLogout={() => {
          logout();
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
      <MinisterioTela onBack={() => setTela('home')} onAbrirMusica={abrirMusica} ministerio={ministerio} />
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
        onAbrirModeracao={() => setTela('admin')}
        onAbrirLoginAdmin={() => setTela('admin')}
        onAbrirTopMusicas={() => setTela('top-musicas')}
        onAbrirTopArtistas={() => setTela('top-artistas')}
        onAbrirBusca={() => setTela('busca')}
        onSelectArtista={abrirArtista}
        onSelectCantor={abrirCantor}
        onAbrirRepertorio={(id) => {
          setRepertorioId(id);
          setTela('repertorio-detalhe');
        }}
        onAbrirMinisterio={abrirMinisterio}
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
          precisaDataNascimento={!dataNascimento}
          onLogin={(nascimento) => {
            loginUsuario(nascimento);
            setLoginParaMinisterioAberto(false);
            setTela('ministerio');
          }}
          onClose={() => setLoginParaMinisterioAberto(false)}
          onAdminLogin={() => {
            setLoginParaMinisterioAberto(false);
            setTela('admin');
          }}
        />
      )}
    </>
  );
}

export default App;
