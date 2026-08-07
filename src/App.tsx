import { useState } from 'react';
import { Home } from './components/Home';
import { CifraReader } from './components/CifraReader';
import { CalendarioLiturgico } from './components/CalendarioLiturgico';
import { ModeracaoSubmissoes } from './components/ModeracaoSubmissoes';
import { AdminLogin } from './components/AdminLogin';
import { TopMusicasTela } from './components/TopMusicasTela';
import { TopArtistasTela } from './components/TopArtistasTela';
import { RepertorioDetalheTela } from './components/RepertorioDetalheTela';
import { useTheme } from './lib/useTheme';
import { useRepertorios } from './lib/useRepertorios';
import { useAdminAuth } from './lib/useAdminAuth';
import type { Musica, TempoLiturgico } from './types/musica';

const MIN_FONT = 15;
const MAX_FONT = 34;
const DEFAULT_FONT = 21;

type Tela =
  | 'home'
  | 'calendario'
  | 'moderacao'
  | 'top-musicas'
  | 'top-artistas'
  | 'repertorio-detalhe';

function App() {
  const [tela, setTela] = useState<Tela>('home');
  const [musicaAtual, setMusicaAtual] = useState<Musica | null>(null);
  const [repertorioId, setRepertorioId] = useState<string | null>(null);
  const [tomForcado, setTomForcado] = useState<string | null>(null);
  const [filtroTempo, setFiltroTempo] = useState<TempoLiturgico | undefined>();
  const [buscaArtista, setBuscaArtista] = useState<string | undefined>();
  const { theme, toggleTheme } = useTheme();
  const [fontSize, setFontSize] = useState(DEFAULT_FONT);
  const { isAdmin, login, logout } = useAdminAuth();

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

  function irParaHomeComArtista(artista: string) {
    setBuscaArtista(artista);
    setTela('home');
  }

  if (musicaAtual) {
    return (
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
      />
    );
  }

  if (tela === 'calendario') {
    return (
      <CalendarioLiturgico onBack={() => setTela('home')} onFiltrarTempo={irParaHomeComFiltro} />
    );
  }

  if (tela === 'moderacao') {
    if (!isAdmin) {
      return <AdminLogin onLogin={login} onBack={() => setTela('home')} />;
    }
    return (
      <ModeracaoSubmissoes
        onBack={() => setTela('home')}
        onLogout={() => {
          logout();
          setTela('home');
        }}
      />
    );
  }

  if (tela === 'top-musicas') {
    return (
      <TopMusicasTela onBack={() => setTela('home')} onSelectMusica={(m) => abrirMusica(m)} />
    );
  }

  if (tela === 'top-artistas') {
    return (
      <TopArtistasTela onBack={() => setTela('home')} onSelectArtista={irParaHomeComArtista} />
    );
  }

  if (tela === 'repertorio-detalhe' && repertorioAtual) {
    return (
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

  return (
    <Home
      onSelectMusica={(m, repId) => abrirMusica(m, repId ?? null)}
      filtroInicial={filtroTempo}
      buscaInicial={buscaArtista}
      onAbrirCalendario={() => setTela('calendario')}
      onAbrirModeracao={() => setTela('moderacao')}
      onAbrirLoginAdmin={() => setTela('moderacao')}
      onAbrirTopMusicas={() => setTela('top-musicas')}
      onAbrirTopArtistas={() => setTela('top-artistas')}
      onSelectArtista={irParaHomeComArtista}
      onAbrirRepertorio={(id) => {
        setRepertorioId(id);
        setTela('repertorio-detalhe');
      }}
    />
  );
}

export default App;
