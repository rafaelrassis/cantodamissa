import { useMemo, useState } from 'react';
import { Check, ChevronLeft, Search } from 'lucide-react';
import { normalizar } from '../../lib/musicasApi';
import type { Equipe, FuncaoMinisterio, MembroMinisterio } from '../../types/ministerio';

interface Props {
  membros: MembroMinisterio[];
  funcoes: FuncaoMinisterio[];
  equipes: Equipe[];
  selecionadosIniciais: string[]; // ids de membro já na escala
  /** ids de membro com indisponibilidade cadastrada pra data da escala —
   * ficam bloqueados pra adicionar (mas dá pra remover se já tiverem sido
   * adicionados antes da indisponibilidade existir). */
  indisponiveisIds?: Set<string>;
  abaInicial?: AbaLista;
  onCancelar: () => void;
  onConfirmar: (selecionados: { membroId: string; funcaoId: string }[]) => void;
}

type AbaLista = 'todos' | 'selecionados' | 'funcoes' | 'equipes';

export function MembrosSelecionarTela({
  membros,
  funcoes,
  equipes,
  selecionadosIniciais,
  indisponiveisIds = new Set(),
  abaInicial = 'todos',
  onCancelar,
  onConfirmar,
}: Props) {
  const [busca, setBusca] = useState('');
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set(selecionadosIniciais));
  const [aba, setAba] = useState<AbaLista>(abaInicial);

  const filtrados = useMemo(() => {
    const termo = normalizar(busca);
    if (!termo) return membros;
    return membros.filter((m) => {
      const nomesFuncoes = m.funcoes.map((fid) => funcoes.find((f) => f.id === fid)?.nome ?? '');
      return normalizar(m.nome).includes(termo) || nomesFuncoes.some((n) => normalizar(n).includes(termo));
    });
  }, [busca, membros, funcoes]);

  const listaExibida = aba === 'selecionados' ? membros.filter((m) => selecionados.has(m.id)) : filtrados;

  function toggle(id: string) {
    if (indisponiveisIds.has(id) && !selecionados.has(id)) return; // indisponível: só permite remover, não adicionar
    setSelecionados((prev) => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  function selecionarTodos() {
    setSelecionados((prev) => new Set([...prev, ...filtrados.filter((m) => !indisponiveisIds.has(m.id)).map((m) => m.id)]));
  }

  function limpar() {
    setSelecionados(new Set());
  }

  function toggleFuncao(funcaoId: string) {
    const membrosDaFuncao = membros.filter((m) => m.funcoes.includes(funcaoId)).map((m) => m.id);
    const todosJaSelecionados = membrosDaFuncao.every((id) => selecionados.has(id));
    setSelecionados((prev) => {
      const novo = new Set(prev);
      membrosDaFuncao.forEach((id) => {
        if (todosJaSelecionados) novo.delete(id);
        else if (!indisponiveisIds.has(id)) novo.add(id);
      });
      return novo;
    });
  }

  function toggleEquipe(equipe: Equipe) {
    const todosJaSelecionados = equipe.membroIds.every((id) => selecionados.has(id));
    setSelecionados((prev) => {
      const novo = new Set(prev);
      equipe.membroIds.forEach((id) => {
        if (todosJaSelecionados) novo.delete(id);
        else if (!indisponiveisIds.has(id)) novo.add(id);
      });
      return novo;
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--bg)] font-sans text-[var(--text)]">
      <header className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-4">
        <button onClick={onCancelar} aria-label="Voltar">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-lg font-extrabold tracking-tight">Membros</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5">
          <Search size={16} className="text-[var(--muted)]" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou função"
            className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--muted)]"
          />
        </div>

        <div className="mt-3 flex items-center justify-between text-xs font-semibold text-[var(--accent)]">
          <button onClick={selecionarTodos}>✓✓ Selecionar todos</button>
          <button onClick={limpar} className="text-[var(--muted)]">
            Limpar
          </button>
        </div>

        <div className="mt-3 flex rounded-full bg-[var(--surface)] p-1 text-xs font-semibold">
          {(
            [
              ['todos', `Todos (${membros.length})`],
              ['selecionados', `Selecionados (${selecionados.size})`],
              ['funcoes', `Funções (${funcoes.length})`],
              ['equipes', `Equipes (${equipes.length})`],
            ] as [AbaLista, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setAba(id)}
              className={`flex-1 rounded-full py-1.5 ${
                aba === id ? 'bg-[var(--accent)] text-[var(--accent-fg)]' : 'text-[var(--muted)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {aba === 'todos' || aba === 'selecionados' ? (
          <ul className="mt-3 flex flex-col gap-1">
            {listaExibida.length === 0 && (
              <li className="py-8 text-center text-sm text-[var(--muted)]">Nenhum membro encontrado.</li>
            )}
            {listaExibida.map((m) => {
              const indisponivel = indisponiveisIds.has(m.id);
              return (
                <li key={m.id} className="flex items-center gap-3 rounded-lg px-2 py-2.5">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${m.avatarCor} ${
                      indisponivel ? 'opacity-40' : ''
                    }`}
                  >
                    {m.nome[0]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm font-medium ${indisponivel ? 'text-[var(--muted)]' : ''}`}>
                      {m.nome}
                    </span>
                    {indisponivel && (
                      <span className="block text-xs text-amber-500">Indisponível nesta data</span>
                    )}
                  </span>
                  <button
                    onClick={() => toggle(m.id)}
                    disabled={indisponivel && !selecionados.has(m.id)}
                    aria-label={selecionados.has(m.id) ? 'Remover' : 'Adicionar'}
                    className={`h-6 w-11 shrink-0 rounded-full transition disabled:opacity-30 ${
                      selecionados.has(m.id) ? 'bg-[var(--accent)]' : 'border border-[var(--border)] bg-[var(--surface)]'
                    }`}
                  >
                    <span
                      className={`block h-5 w-5 rounded-full bg-white shadow transition ${
                        selecionados.has(m.id) ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : aba === 'funcoes' ? (
          <ul className="mt-3 flex flex-col gap-1">
            {funcoes.map((f) => {
              const membrosDaFuncao = membros.filter((m) => m.funcoes.includes(f.id));
              const todosSelecionados =
                membrosDaFuncao.length > 0 && membrosDaFuncao.every((m) => selecionados.has(m.id));
              return (
                <li key={f.id}>
                  <button
                    onClick={() => toggleFuncao(f.id)}
                    disabled={membrosDaFuncao.length === 0}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left disabled:opacity-40"
                  >
                    <span className="text-lg">{f.icone}</span>
                    <span className="flex-1 text-sm font-medium">
                      {f.nome} <span className="text-xs text-[var(--muted)]">({membrosDaFuncao.length})</span>
                    </span>
                    {todosSelecionados && <Check size={16} className="text-[var(--accent)]" />}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <ul className="mt-3 flex flex-col gap-1">
            {equipes.length === 0 && (
              <li className="py-8 text-center text-sm text-[var(--muted)]">
                Nenhuma equipe criada ainda (Equipe → aba Equipes).
              </li>
            )}
            {equipes.map((eq) => {
              const todosSelecionados =
                eq.membroIds.length > 0 && eq.membroIds.every((id) => selecionados.has(id));
              return (
                <li key={eq.id}>
                  <button
                    onClick={() => toggleEquipe(eq)}
                    disabled={eq.membroIds.length === 0}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left disabled:opacity-40"
                  >
                    <span className="flex-1 text-sm font-medium">
                      {eq.nome} <span className="text-xs text-[var(--muted)]">({eq.membroIds.length})</span>
                    </span>
                    {todosSelecionados && <Check size={16} className="text-[var(--accent)]" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <footer className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3">
        <span className="text-sm font-semibold">{selecionados.size} participantes</span>
        <button
          onClick={() =>
            onConfirmar(
              Array.from(selecionados).map((id) => ({
                membroId: id,
                funcaoId: membros.find((m) => m.id === id)?.funcoes[0] ?? funcoes[0]?.id ?? '',
              }))
            )
          }
          className="flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-[var(--accent-fg)]"
        >
          <Check size={15} /> Salvar
        </button>
      </footer>
    </div>
  );
}
