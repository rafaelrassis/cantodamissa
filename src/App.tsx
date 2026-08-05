import { CifraReader } from './components/CifraReader';
import { mockSong } from './lib/mockSong';

function App() {
  return <CifraReader musica={mockSong} />;
}

export default App;
