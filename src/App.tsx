import { useState } from 'react';
import { Home } from './components/Home';
import { CifraReader } from './components/CifraReader';
import { useTheme } from './lib/useTheme';
import type { Musica } from './types/musica';

const MIN_FONT = 15;
const MAX_FONT = 34;
const DEFAULT_FONT = 21;

function App() {
  const [musicaAtual, setMusicaAtual] = useState<Musica | null>(null);
  const [repertorioId, setRepertorioId] = useState<string | null>(null);
  const { theme, toggleTheme } = useTheme();
  const [fontSize, setFontSize] = useState(DEFAULT_FONT);

  function abrirMusica(musica: Musica, deRepertorioId: string | null = null) {
    setMusicaAtual(musica);
    setRepertorioId(deRepertorioId);
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

  return <Home onSelectMusica={(m, repId) => abrirMusica(m, repId ?? null)} />;
}

export default App;
