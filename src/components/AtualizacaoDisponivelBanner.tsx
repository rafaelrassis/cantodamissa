interface Props {
  onAtualizar: () => void;
}

export function AtualizacaoDisponivelBanner({ onAtualizar }: Props) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-between gap-3 bg-[var(--accent)] px-4 py-2.5 text-sm text-[var(--accent-fg)] lg:bottom-4 lg:left-1/2 lg:right-auto lg:w-full lg:max-w-md lg:-translate-x-1/2 lg:rounded-full lg:shadow-lg">
      <span>Nova versão disponível</span>
      <button onClick={onAtualizar} className="font-bold underline">
        Atualizar
      </button>
    </div>
  );
}
