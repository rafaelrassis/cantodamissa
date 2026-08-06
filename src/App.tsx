import { useState } from 'react';
import { Home } from './components/Home';
import { CifraReader } from './components/CifraReader';
import { CalendarioLiturgico } from './components/CalendarioLiturgico';
import { ModeracaoSubmissoes } from './components/ModeracaoSubmissoes';
import { useTheme } from './lib/useTheme';
import type { Musica, TempoLiturgico } from './types/musica';

const MIN_FONT = 15;
const MAX_FONT = 34;
const DEFAULT_FONT = 21;

type Tela = 'home' | 'calendario' | 'moderacao';

function App() {
  const [tela, setTela] = useState<Tela>('home');
  const [musicaAtual, setMusicaAtual] = useState<Musica | null>(null);
  const [repertorioId, setRepertorioId] = useState<string | null>(null);
  const [filtroTempo, setFiltroTempo] = useState<TempoLiturgico | undefined>();
  const { theme, toggleTheme } = useTheme();
  const [fontSize, setFontSize] = useState(DEFAULT_FONT);

  function abrirMusica(musica: Musica, deRepertorioId: string | null = null) {
    setMusicaAtual(musica);
    setRepertorioId(deRepertorioId);
  }

  function irParaHomeComFiltro(tempo: TempoLiturgico) {
    setFiltroTempo(tempo);
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
    return <ModeracaoSubmissoes onBack={() => setTela('home')} />;
  }

  return (
    <Home
      onSelectMusica={(m, repId) => abrirMusica(m, repId ?? null)}
      filtroInicial={filtroTempo}
      onAbrirCalendario={() => setTela('calendario')}
      onAbrirModeracao={() => setTela('moderacao')}
    />
  );
}

export default App;
