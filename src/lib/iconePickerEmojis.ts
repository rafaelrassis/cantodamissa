export interface CategoriaIcone {
  id: string;
  label: string;
  emojis: string[];
}

export const CATEGORIAS_ICONE: CategoriaIcone[] = [
  {
    id: 'musica',
    label: 'Música',
    emojis: ['🎤', '🎙️', '🎚️', '🎛️', '📯', '🎺', '🎷', '🎸', '🪕', '🎻', '🪘', '🥁', '🎹', '🪗', '📢', '🎵', '🎶', '🔊'],
  },
  {
    id: 'objetos',
    label: 'Objetos',
    emojis: ['📖', '📚', '📝', '🎫', '🕯️', '💡', '📷', '🎬', '🖼️', '🎨', '📻', '💻', '📱', '⏰', '🗓️', '📅', '🔔', '🖥️'],
  },
  {
    id: 'papeis',
    label: 'Papéis',
    emojis: ['🎭', '🗣️', '👑', '⭐', '🌟', '✨', '🏆', '🥇', '🎯', '🎪', '🎗️', '🏅'],
  },
  {
    id: 'pessoas',
    label: 'Pessoas',
    emojis: ['🧑', '👩', '👨', '👧', '👦', '🧓', '👶', '🧑‍🎤', '🧑‍🏫', '🧑‍🤝‍🧑', '👥', '🙋'],
  },
  {
    id: 'ferramentas',
    label: 'Ferramentas',
    emojis: ['🔧', '🔨', '🛠️', '⚙️', '🧰', '🔌', '🪛', '🧵', '🪡', '📏', '✂️', '🖇️'],
  },
  {
    id: 'igreja',
    label: 'Igreja',
    emojis: ['⛪', '✝️', '🕊️', '📿', '🍇', '🍞', '🕎', '🙏', '🔔', '👼', '🌿', '🕯️'],
  },
];
