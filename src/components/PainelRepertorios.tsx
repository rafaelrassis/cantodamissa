import { Copy } from 'lucide-react';
import type { Musica } from '../types/musica';
import type { Repertorio } from '../lib/repertorios';
import { getMusicaById } from '../lib/musicasApi';

interface Props {
  repertorios: Repertorio[];
  repertorioCompartilhado: Repertorio | null;
  novoNome?: string;
  setNovoNome?: (nome: string) => void;
  criar?: (nome: string) => void;
  onAbrirRepertorio: (id: string) => void;
  onSelectMusica: (musica: Musica, repertorioId?: string) => void;
  onClonar?: (id: string) => void;
}

/**
 * Lista de "Meus repertórios" — reutilizada como sidebar fixa no desktop
 * (Home.tsx) e como tela cheia no mobile, e também na aba "Repertório" do
 * Ministério (MinisterioTela). Clicar num repertório abre a página
 * dedicada dele (`RepertorioDetalheTela`), onde de fato dá pra gerenciar
 * ritos, reordenar, exportar etc.
 *
 * `novoNome`/`setNovoNome`/`criar` só vêm preenchidos a partir do
 * Ministério — repertório só se cria por lá (1 escala pode ganhar o seu, ou
 * um avulso nesta aba). Em outros usos (Home.tsx) esses props ficam de
 * fora e o formulário de criação não aparece.
 */
export function PainelRepertorios({
  repertorios,
  repertorioCompartilhado,
  novoNome,
  setNovoNome,
  criar,
  onAbrirRepertorio,
  onSelectMusica,
  onClonar,
}: Props) {
  const podeCriar = criar !== undefined && setNovoNome !== undefined;
  return (
    <>
      {repertorioCompartilhado && (
        <div className="rounded-xl border-2 border-[var(--accent)] p-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[var(--accent)]">
            Compartilhado com você
          </p>
          <p className="mb-2 text-sm font-semibold text-[var(--text)]">
            {repertorioCompartilhado.nome}
          </p>
          {repertorioCompartilhado.itens.map((item) => (
            <button
              key={item.musicaId}
              onClick={async () => {
                const musica = await getMusicaById(item.musicaId);
                if (musica) onSelectMusica(musica, repertorioCompartilhado.id);
              }}
              className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-[var(--surface)]"
            >
              <span className="min-w-0 flex-1 truncate text-sm text-[var(--text)]">
                {item.title}
              </span>
              <span className="shrink-0 font-mono text-xs font-bold text-[var(--accent)]">
                {item.tone}
              </span>
            </button>
          ))}
        </div>
      )}

      {repertorios.length === 0 && (
        <div className="rounded-xl bg-[var(--accent-soft)] p-3 text-xs text-[var(--muted)]">
          {podeCriar
            ? 'Você ainda não tem repertórios. Crie um abaixo.'
            : 'Você ainda não tem repertórios. É necessário criar um repertório no menu Ministério.'}
        </div>
      )}

      {repertorios.map((r) => (
        <div
          key={r.id}
          className="flex w-full items-center gap-2 rounded-xl border border-[var(--border)] p-3 hover:bg-[var(--surface)]"
        >
          <button onClick={() => onAbrirRepertorio(r.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] font-mono text-sm font-bold text-[var(--accent)]">
              {r.itens.length}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[var(--text)]">{r.nome}</p>
              <p className="truncate text-xs text-[var(--muted)]">
                {r.itens.length} música{r.itens.length === 1 ? '' : 's'} · {r.ritos.length} rito
                {r.ritos.length === 1 ? '' : 's'}
              </p>
            </div>
          </button>
          {onClonar && (
            <button
              onClick={() => onClonar(r.id)}
              title="Clonar repertório"
              aria-label={`Clonar ${r.nome}`}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
            >
              <Copy size={15} />
            </button>
          )}
        </div>
      ))}

      {podeCriar && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!novoNome?.trim()) return;
            criar?.(novoNome);
            setNovoNome?.('');
          }}
          className="flex gap-2"
        >
          <input
            value={novoNome}
            onChange={(e) => setNovoNome?.(e.target.value)}
            placeholder="Nome do novo repertório"
            className="w-full rounded-xl border border-dashed border-[var(--border)] px-3 py-2 text-sm text-[var(--text)] focus:outline-none"
          />
          <button
            type="submit"
            className="shrink-0 rounded-xl bg-[var(--accent)] px-3 text-sm font-semibold text-[var(--accent-fg)]"
          >
            Criar
          </button>
        </form>
      )}

      <div className="rounded-xl bg-[var(--accent-soft)] p-3 text-xs text-[var(--muted)]">
        Monte o repertório da missa por rito e compartilhe com o ministério.
      </div>
    </>
  );
}
