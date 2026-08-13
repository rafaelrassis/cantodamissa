import { useState } from 'react';
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Info,
  LogIn,
  Pencil,
  Plus,
  Send,
  Trash2,
} from 'lucide-react';
import { FUNCOES_PADRAO } from '../../lib/ministerioApi';
import type { FuncaoMinisterio } from '../../types/ministerio';
import { FuncaoEditorTela } from './FuncaoEditorTela';

interface Props {
  onBack: () => void;
  onConcluir: (nomeMinisterio?: string, funcoesCustom?: { nome: string; icone: string }[]) => void | Promise<void>;
  validarCodigo: (codigo: string) => Promise<boolean>;
  erroCadastro?: string | null;
}

type Passo = 'opcoes' | 'ingressar' | 'cadastrar';

/**
 * Estado exibido quando o usuário está logado mas ainda não pertence a
 * nenhum ministério — mesmo fluxo do LouveApp (ingressar por código de
 * convite, com solicitação sujeita a aprovação do admin; ou cadastrar um
 * ministério novo, com nome e funções iniciais), com o tema visual do
 * Canto da Missa em vez de copiar o design de referência.
 *
 * A personalização de funções feita aqui é enviada como lista inicial de
 * funções do ministério (ver ministerioApi.ts → criarMinisterio) quando
 * o formulário é salvo.
 */
export function AdicionarMinisterioTela({ onBack, onConcluir, validarCodigo, erroCadastro }: Props) {
  const [passo, setPasso] = useState<Passo>('opcoes');

  // ---- Ingressar ----
  const [codigo, setCodigo] = useState('');
  const [erroCodigo, setErroCodigo] = useState('');
  const [solicitacaoEnviada, setSolicitacaoEnviada] = useState(false);
  const [passoAPassoAberto, setPassoAPassoAberto] = useState(true);

  const [enviandoCodigo, setEnviandoCodigo] = useState(false);

  async function handleSolicitarEntrada() {
    setEnviandoCodigo(true);
    setErroCodigo('');
    try {
      const ok = await validarCodigo(codigo);
      if (ok) {
        setSolicitacaoEnviada(true);
      } else {
        setErroCodigo('Código inválido. Confira com o administrador do ministério.');
      }
    } catch (e) {
      setErroCodigo(
        e instanceof Error && e.message === 'JA_MEMBRO'
          ? 'Você já faz parte desse ministério.'
          : 'Não foi possível enviar agora. Tente de novo.'
      );
    } finally {
      setEnviandoCodigo(false);
    }
  }

  // ---- Cadastrar ----
  const [nomeMinisterio, setNomeMinisterio] = useState('');
  const [funcoes, setFuncoes] = useState<FuncaoMinisterio[]>(FUNCOES_PADRAO.map((f, i) => ({ ...f, id: `padrao-${i}` })));
  const [funcaoEditor, setFuncaoEditor] = useState<{ id: string | null; nome: string; icone: string } | null>(
    null
  );

  function abrirNovaFuncao() {
    setFuncaoEditor({ id: null, nome: '', icone: '🎵' });
  }

  function abrirEdicaoFuncao(f: FuncaoMinisterio) {
    setFuncaoEditor({ id: f.id, nome: f.nome, icone: f.icone });
  }

  function salvarFuncaoEditor(nome: string, icone: string) {
    setFuncoes((prev) =>
      funcaoEditor?.id
        ? prev.map((f) => (f.id === funcaoEditor.id ? { ...f, nome, icone } : f))
        : [...prev, { id: `custom-${Date.now()}`, nome, icone }]
    );
    setFuncaoEditor(null);
  }

  function removerFuncao(id: string) {
    setFuncoes((prev) => prev.filter((f) => f.id !== id));
  }

  const [salvandoMinisterio, setSalvandoMinisterio] = useState(false);

  async function handleSalvarMinisterio() {
    if (!nomeMinisterio.trim() || salvandoMinisterio) return;
    setSalvandoMinisterio(true);
    try {
      await onConcluir(
        nomeMinisterio.trim(),
        funcoes.map((f) => ({ nome: f.nome, icone: f.icone }))
      );
    } catch {
      // Erro já é tratado/exibido pelo chamador (erroCadastro) — aqui só
      // liberamos o botão de novo pra permitir tentar salvar outra vez.
      setSalvandoMinisterio(false);
    }
  }

  function voltar() {
    if (passo !== 'opcoes') {
      setPasso('opcoes');
      setSolicitacaoEnviada(false);
      setErroCodigo('');
      setCodigo('');
    } else {
      onBack();
    }
  }

  if (funcaoEditor) {
    return (
      <FuncaoEditorTela
        titulo={funcaoEditor.id ? 'Editar função' : 'Nova função'}
        nomeInicial={funcaoEditor.nome}
        iconeInicial={funcaoEditor.icone}
        onVoltar={() => setFuncaoEditor(null)}
        onSalvar={salvarFuncaoEditor}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] font-sans text-[var(--text)]">
      <header className="sticky top-0 z-10 flex items-center gap-2.5 border-b border-[var(--border)] bg-[var(--bg)] px-5 py-4 lg:px-8">
        <button onClick={voltar} aria-label="Voltar" className="text-[var(--text)]">
          <ChevronLeft size={20} strokeWidth={2.75} />
        </button>
        <h1 className="text-[19px] leading-none">
          {passo === 'opcoes' && 'Ministério'}
          {passo === 'ingressar' && 'Ingressar'}
          {passo === 'cadastrar' && 'Novo ministério'}
        </h1>
        {passo === 'cadastrar' && (
          <button
            onClick={handleSalvarMinisterio}
            disabled={!nomeMinisterio.trim() || salvandoMinisterio}
            className="ml-auto flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-[18px] py-2 text-[13.5px] font-bold text-[var(--accent-fg)] disabled:opacity-40"
          >
            <Check size={15} strokeWidth={2.75} /> {salvandoMinisterio ? 'Salvando...' : 'Salvar'}
          </button>
        )}
      </header>

      <div className="mx-auto max-w-2xl px-5 py-6 lg:px-8">
        {passo === 'opcoes' && (
          <>
            <h2 className="font-sans text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">
              Adicionar ministério
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">
              Você ainda não participa de nenhum ministério. Selecione uma opção para continuar:
            </p>

            <div className="mt-[22px] flex flex-col gap-3">
              <OpcaoCard
                icon={<LogIn size={20} strokeWidth={2.75} />}
                titulo="Ingressar em um ministério"
                descricao="Entre com o código de convite de um ministério."
                onClick={() => setPasso('ingressar')}
              />
              <OpcaoCard
                icon={<Plus size={20} strokeWidth={2.75} />}
                titulo="Cadastrar novo ministério"
                descricao="Crie um novo ministério para começar a organizar sua equipe."
                onClick={() => setPasso('cadastrar')}
              />
            </div>
          </>
        )}

        {passo === 'ingressar' && !solicitacaoEnviada && (
          <>
            <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_4px_14px_rgba(30,42,20,0.08)]">
              <h2 className="text-[19px]">Informe o código do convite</h2>
              <p className="mt-1.5 text-[13.5px] leading-[1.45] text-[var(--muted)]">
                Digite o código compartilhado pelo administrador do ministério.
              </p>

              <input
                value={codigo}
                onChange={(e) => {
                  setCodigo(e.target.value.toUpperCase());
                  setErroCodigo('');
                }}
                placeholder="Código do convite"
                className="mt-4 w-full rounded-full border border-[var(--border)] bg-[var(--bg)] px-[18px] py-3 font-mono text-sm tracking-[0.06em] text-[var(--text)] outline-none placeholder:text-[#99a390] focus:border-[var(--accent)]"
              />
              {erroCodigo && (
                <p className="mt-3 rounded-[16px] bg-[#fbe9e9] px-4 py-2.5 text-[13px] leading-[1.4] text-[#a3111d]">
                  {erroCodigo}
                </p>
              )}

              <button
                onClick={handleSolicitarEntrada}
                disabled={!codigo.trim() || enviandoCodigo}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-4 py-3 text-sm font-bold text-[var(--accent-fg)] disabled:opacity-50"
              >
                <Send size={15} strokeWidth={2.75} /> Solicitar entrada
              </button>
            </div>

            <div className="mt-3.5 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5">
              <button
                onClick={() => setPassoAPassoAberto((v) => !v)}
                className="flex w-full items-center gap-2.5 text-left"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-fg)]">
                  <Info size={14} strokeWidth={2.75} />
                </span>
                <span className="flex-1 text-sm font-bold">Passo a passo</span>
                {passoAPassoAberto ? (
                  <ChevronUp size={16} strokeWidth={2.75} className="text-[var(--muted)]" />
                ) : (
                  <ChevronDown size={16} strokeWidth={2.75} className="text-[var(--muted)]" />
                )}
              </button>

              {passoAPassoAberto && (
                <ol className="mt-4 flex flex-col gap-4">
                  {[
                    {
                      titulo: 'Receba um convite',
                      texto: 'Peça ao administrador do ministério o código de convite gerado para entrada.',
                    },
                    {
                      titulo: 'Envie sua solicitação',
                      texto: 'Digite o código nesta tela para registrar seu pedido de participação.',
                    },
                    {
                      titulo: 'Aguarde a aprovação',
                      texto: 'Após o envio, um administrador do grupo precisará aprovar sua entrada no ministério.',
                    },
                  ].map((p, i) => (
                    <li key={p.titulo} className="flex gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-[var(--accent-fg)]">
                        {i + 1}
                      </span>
                      <span>
                        <span className="block text-sm font-semibold">{p.titulo}</span>
                        <span className="mt-0.5 block text-[13.5px] leading-[1.45] text-[var(--muted)]">{p.texto}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </>
        )}

        {passo === 'ingressar' && solicitacaoEnviada && (
          <div className="flex flex-col items-center rounded-[28px] border border-[var(--border)] bg-[var(--surface)] px-[26px] py-[34px] text-center">
            <CheckCircle2 size={52} strokeWidth={2} className="text-[var(--accent)]" />
            <h2 className="mt-3.5 text-[20px]">Solicitação enviada</h2>
            <p className="mt-1.5 text-[13.5px] leading-[1.5] text-[var(--muted)]">
              Aguarde um administrador do ministério aprovar sua entrada. Você poderá tentar novamente
              a qualquer momento com um novo código.
            </p>
            <button
              onClick={onBack}
              className="mt-5 rounded-full border border-[var(--border)] bg-[var(--bg)] px-[22px] py-[11px] text-sm font-bold text-[var(--text)]"
            >
              Voltar ao início
            </button>
          </div>
        )}

        {passo === 'cadastrar' && (
          <>
            {erroCadastro && (
              <p className="mb-4 rounded-[16px] bg-[#fbe9e9] px-4 py-2.5 text-[13.5px] leading-[1.4] text-[#a3111d]">
                {erroCadastro}
              </p>
            )}
            <input
              value={nomeMinisterio}
              onChange={(e) => setNomeMinisterio(e.target.value)}
              placeholder="Nome do ministério *"
              className="input-field w-full text-[var(--text)] placeholder:text-[#99a390] focus:outline-none"
            />

            <div className="mt-[22px] flex items-center justify-between">
              <span>
                <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">
                  Funções{' '}
                  <span className="ml-1 rounded-full bg-[var(--surface)] px-2 py-0.5 text-[10.5px] normal-case tracking-normal">
                    {funcoes.length}
                  </span>
                </h3>
                <p className="mt-1 text-[13.5px] leading-[1.45] text-[var(--muted)]">
                  Defina os papéis que os membros poderão assumir neste ministério
                </p>
              </span>
            </div>

            <button
              onClick={abrirNovaFuncao}
              className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-full border border-dashed border-[var(--border)] px-4 py-3 text-sm font-bold text-[var(--accent)]"
            >
              <Plus size={15} strokeWidth={2.75} /> Adicionar função
            </button>

            <ul className="mt-3.5 flex flex-col gap-2">
              {funcoes.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center gap-3 rounded-[20px] border border-[var(--border)] bg-[var(--surface)] px-4 py-[11px]"
                >
                  <span className="text-lg">{f.icone}</span>
                  <span className="flex-1 text-sm font-medium">{f.nome}</span>
                  <button
                    onClick={() => abrirEdicaoFuncao(f)}
                    aria-label="Editar função"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--bg)]"
                  >
                    <Pencil size={14} strokeWidth={2.75} />
                  </button>
                  <button
                    onClick={() => removerFuncao(f.id)}
                    aria-label="Remover função"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[#a3111d] hover:bg-[var(--bg)]"
                  >
                    <Trash2 size={14} strokeWidth={2.75} />
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function OpcaoCard({
  icon,
  titulo,
  descricao,
  onClick,
}: {
  icon: React.ReactNode;
  titulo: string;
  descricao: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-start gap-3.5 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4 text-left transition hover:bg-[var(--surface2)]"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-fg)]">
        {icon}
      </span>
      <span className="flex-1">
        <span className="block text-[15.5px] font-semibold text-[var(--text)]">{titulo}</span>
        <span className="mt-[3px] block text-[13.5px] leading-[1.45] text-[var(--muted)]">{descricao}</span>
      </span>
      <ChevronRight size={18} strokeWidth={2.75} className="mt-2.5 shrink-0 text-[var(--muted)]" />
    </button>
  );
}
