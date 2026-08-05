import { useState } from 'react';
import { Home } from './components/Home';
import { CifraReader } from './components/CifraReader';
import type { Musica } from './types/musica';

function App() {
  const [musicaAtual, setMusicaAtual] = useState<Musica | null>(null);

  if (musicaAtual) {
    return <CifraReader musica={musicaAtual} onClose={() => setMusicaAtual(null)} />;
  }

  return <Home onSelectMusica={setMusicaAtual} />;
}

export default App;
