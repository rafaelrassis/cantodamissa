import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  erro: Error | null;
}

/**
 * Sem isso, um erro de render em qualquer componente (provider faltando,
 * acesso a propriedade de undefined etc.) derrubava a árvore inteira do
 * React pra uma tela branca, sem log visível nem jeito de continuar sem
 * fechar e reabrir o app — pior ainda em modo missa ao vivo, tela cheia,
 * sem acesso ao console. O reload é a única recuperação genérica possível
 * aqui: um error boundary não sabe o que quebrou, só que quebrou.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { erro: null };

  static getDerivedStateFromError(erro: Error): State {
    return { erro };
  }

  componentDidCatch(erro: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary capturou um erro:', erro, info.componentStack);
  }

  render() {
    if (this.state.erro) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--bg)] px-6 text-center font-sans text-[var(--text)]">
          <p className="text-lg font-bold">Algo deu errado</p>
          <p className="max-w-sm text-sm text-[var(--muted)]">
            O app encontrou um erro inesperado. Recarregar a página costuma resolver.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-[var(--accent-fg)]"
          >
            Recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
