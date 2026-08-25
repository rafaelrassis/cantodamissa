import { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { criarSolicitacaoRemocao } from '../lib/solicitacoesRemocao';
import { SolicitarRemocaoForm } from './SolicitarRemocaoForm';
import type { AlvoRemocao } from '../lib/solicitacoesRemocao';

interface Props {
  alvoTipo: AlvoRemocao;
  /** Título da música ou nome do cantor/artista — vira o snapshot salvo no pedido. */
  alvoDescricao: string;
  musicaId?: string;
  cantorId?: string;
  className?: string;
}

/**
 * Botão "solicitar remoção" + modal (notice-and-takedown, SPEC.md seção 8).
 * Reaproveitado no leitor de cifra (por música) e nas páginas de
 * cantor/artista (pelo conjunto de cifras da pessoa).
 */
export function SolicitarRemocaoLink({
  alvoTipo,
  alvoDescricao,
  musicaId,
  cantorId,
  className,
}: Props) {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className={
          className ??
          'flex h-[34px] items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 text-xs font-semibold text-[var(--muted)] hover:bg-[var(--surface2)]'
        }
      >
        <ShieldAlert size={13} /> solicitar remoção
      </button>

      {aberto && (
        <SolicitarRemocaoForm
          alvoTipo={alvoTipo}
          alvoDescricao={alvoDescricao}
          musicaId={musicaId}
          cantorId={cantorId}
          onClose={() => setAberto(false)}
          onSubmit={async (dados) => {
            await criarSolicitacaoRemocao(dados);
          }}
        />
      )}
    </>
  );
}
