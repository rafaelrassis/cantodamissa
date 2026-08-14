interface Props {
  onAtualizar: () => void;
}

export function AtualizacaoDisponivelBanner({ onAtualizar }: Props) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-between gap-3 bg-[var(--accent)] px-4 py-2.5 text-sm text-[var(--accent-fg)] md:bottom-4 md:left-1/2 md:right-auto md:w-full md:max-w-md md:-translate-x-1/2 md:rounded-full md:shadow-lg">
      <span>Nova versão disponível</span>
      <button onClick={onAtualizar} className="font-bold underline">
        Atualizar
      </button>
    </div>
  );
}
