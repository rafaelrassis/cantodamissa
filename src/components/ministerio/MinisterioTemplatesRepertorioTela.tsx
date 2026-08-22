import { useState } from 'react';
import { ChevronLeft, LayoutTemplate, Plus, Trash2 } from 'lucide-react';
import { useCanalErro } from '../../lib/erroContext';
import { LIMITE_TEMPLATES_REPERTORIO, type RepertorioTemplate } from '../../lib/repertorioTemplatesApi';

interface Props {
  templates: RepertorioTemplate[];
  onCriar: (nome: string) => Promise<RepertorioTemplate>;
  onRemover: (id: string) => Promise<void>;
  onAbrirTemplate: (id: string) => void;
  onBack: () => void;
  souAdmin: boolean;
}

/**
 * Repertórios template do ministério — até LIMITE_TEMPLATES_REPERTORIO.
 * Útil quando as músicas de um tipo de missa se repetem: monta o
 * template uma vez aqui, e ao criar o repertório de cada nova Escala dá
 * pra aplicar ele (ver seletor em MinisterioRepertoriosTela) em vez de
 * escolher música por música de novo.
 */
export function MinisterioTemplatesRepertorioTela({
  templates,
  onCriar,
  onRemover,
  onAbrirTemplate,
  onBack,
  souAdmin,
}: Props) {
  const [criando, setCriando] = useState(false);
  const [nomeNovo, setNomeNovo] = useState('');
  const [salvando, setSalvando] = useState(false);
  const { reportar } = useCanalErro();

  const cheio = templates.length >= LIMITE_TEMPLATES_REPERTORIO;

  async function criar() {
    setSalvando(true);
    try {
      const criado = await onCriar(nomeNovo);
      setCriando(false);
      setNomeNovo('');
      onAbrirTemplate(criado.id);
    } catch (err) {
      if (err instanceof Error && err.message === 'LIMITE_TEMPLATES_REPERTORIO') {
        reportar(err, `Limite de ${LIMITE_TEMPLATES_REPERTORIO} templates atingido.`);
      } else {
        reportar(err, 'Não foi possível criar o template.');
      }
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <button onClick={onBack} className="flex w-fit items-center gap-1 text-xs font-medium text-[var(--muted)]">
        <ChevronLeft size={14} /> voltar
      </button>

      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-[var(--text)]">Templates de repertório</h2>
        <span className="text-xs text-[var(--muted)]">
          {templates.length}/{LIMITE_TEMPLATES_REPERTORIO}
        </span>
      </div>
      <p className="text-xs text-[var(--muted)]">
        Pra missas cujas músicas se repetem: monte o template uma vez e aplique nos repertórios dos eventos, trocando
        só o que muda naquele mês.
      </p>

      {templates.length === 0 && (
        <div className="rounded-xl bg-[var(--accent-soft)] p-3 text-xs text-[var(--muted)]">
          Nenhum template ainda.
        </div>
      )}

      {templates.map((t) => (
        <div
          key={t.id}
          className="flex w-full items-center gap-2 rounded-xl border border-[var(--border)] p-3 hover:bg-[var(--surface)]"
        >
          <button onClick={() => onAbrirTemplate(t.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
              <LayoutTemplate size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[var(--text)]">{t.nome}</p>
              <p className="truncate text-xs text-[var(--muted)]">
                {t.itens.length} música{t.itens.length === 1 ? '' : 's'} · {t.ritos.length} rito
                {t.ritos.length === 1 ? '' : 's'}
              </p>
            </div>
          </button>
          {souAdmin && (
            <button
              onClick={() => onRemover(t.id)}
              title="Excluir template"
              aria-label={`Excluir ${t.nome}`}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      ))}

      {souAdmin && !cheio && (
        <>
          {!criando ? (
            <button
              onClick={() => setCriando(true)}
              className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border)] p-3 text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent-soft)]"
            >
              <Plus size={16} /> Novo template
            </button>
          ) : (
            <div className="flex flex-col gap-2 rounded-xl border border-[var(--border)] p-3">
              <input
                autoFocus
                value={nomeNovo}
                onChange={(e) => setNomeNovo(e.target.value)}
                placeholder="Nome do template (ex: Missa dominical)"
                className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && nomeNovo.trim() && !salvando && criar()}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setCriando(false);
                    setNomeNovo('');
                  }}
                  className="flex-1 rounded-lg border border-[var(--border)] py-2 text-sm font-medium text-[var(--muted)]"
                >
                  Cancelar
                </button>
                <button
                  onClick={criar}
                  disabled={!nomeNovo.trim() || salvando}
                  className="flex-1 rounded-lg bg-[var(--accent)] py-2 text-sm font-medium text-[var(--accent-fg)] disabled:opacity-50"
                >
                  Criar
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {souAdmin && cheio && (
        <p className="text-center text-xs text-[var(--muted)]">
          Limite de {LIMITE_TEMPLATES_REPERTORIO} templates atingido. Exclua um pra criar outro.
        </p>
      )}
    </div>
  );
}
