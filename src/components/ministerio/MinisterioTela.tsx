import { useState } from 'react';
import { BarChart3, CalendarDays, ChevronDown, ChevronLeft, Home, ListMusic, Megaphone, Settings, Users } from 'lucide-react';
import { useRepertorios } from '../../lib/useRepertorios';
import { useEscalas } from '../../lib/useEscalas';
import { useAvisos } from '../../lib/useAvisos';
import { useIndisponibilidades } from '../../lib/useIndisponibilidades';
import { useEquipes } from '../../lib/useEquipes';
import { LIMITE_MINISTERIOS } from '../../lib/ministerioApi';
import type { Ministerio } from '../../lib/useMinisterio';
import type { Musica } from '../../types/musica';
import type { Escala } from '../../types/ministerio';
import { InicioTela } from './InicioTela';
import { EscalasTela } from './EscalasTela';
import { EscalaDetalheTela } from './EscalaDetalheTela';
import { NovaEscalaTela } from './NovaEscalaTela';
import { EquipeTela } from './EquipeTela';
import { AvisosTela } from './AvisosTela';
import { PanoramaTela } from './PanoramaTela';
import { AdicionarMinisterioTela } from './AdicionarMinisterioTela';
import { ConfiguracoesMinisterioTela } from './ConfiguracoesMinisterioTela';
import { MinisterioRepertoriosTela } from './MinisterioRepertoriosTela';
import { RepertorioDetalheTela } from '../RepertorioDetalheTela';
import { SeletorMinisterioSheet } from './SeletorMinisterioSheet';

interface Props {
  onBack: () => void;
  onAbrirMusica: (musica: Musica, repertorioId?: string | null, tom?: string | null) => void;
  ministerio: Ministerio;
}

type SubTela = 'inicio' | 'escalas' | 'equipe' | 'avisos' | 'panorama' | 'repertorio';

const ABAS: { id: SubTela; label: string; icon: React.ReactNode }[] = [
  { id: 'inicio', label: 'Início', icon: <Home size={16} /> },
  { id: 'escalas', label: 'Escalas', icon: <CalendarDays size={16} /> },
  { id: 'repertorio', label: 'Repertório', icon: <ListMusic size={16} /> },
  { id: 'equipe', label: 'Equipe', icon: <Users size={16} /> },
  { id: 'avisos', label: 'Avisos', icon: <Megaphone size={16} /> },
  { id: 'panorama', label: 'Panorama', icon: <BarChart3 size={16} /> },
];

/**
 * Módulo "Ministério" — Início/Escalas/Equipe/Avisos/Panorama rodam 100%
 * sobre Supabase (ver useEscalas/useAvisos/useIndisponibilidades/
 * useEquipes/useModelosRoteiro). A identidade do ministério (pertence/
 * nome/membros/admins/solicitações) vem de fora via prop `ministerio`
 * (hook levantado até App.tsx — ver useMinisterio.ts) pra sobreviver à
 * desmontagem deste componente e alimentar o alerta global de
 * solicitação pendente.
 * A aba Repertório reaproveita a feature real já existente (useRepertorios
 * + RepertorioDetalheTela) — não é ministério-scoped no schema ainda, só
 * trazida pra dentro do módulo. Todo repertório aqui nasce vinculado a uma
 * Escala (ver MinisterioRepertoriosTela e garantirRepertorioDaEscala); é a
 * mesma amarração usada na aba "Músicas" de cada Escala (ver
 * EscalaDetalheTela) — 1 escala = 1 repertório, então os dois caminhos
 * sempre abrem o mesmo registro. `repertoriosApi` é instanciado aqui uma
 * única vez e passado adiante pras duas pontas, pra não duplicar a busca.
 * Login já é exigido antes de chegar aqui (ver App.tsx).
 */
export function MinisterioTela({ onBack, onAbrirMusica, ministerio }: Props) {
  const [subTela, setSubTela] = useState<SubTela>('inicio');
  const escalasApi = useEscalas(ministerio.id);
  const avisosApi = useAvisos(ministerio.id);
  const indisponibilidadesApi = useIndisponibilidades(ministerio.id);
  const equipesApi = useEquipes(ministerio.id);
  const [escalaAbertaId, setEscalaAbertaId] = useState<string | null>(null);
  const [formularioEscala, setFormularioEscala] = useState<'nova' | Escala | null>(null);
  const [configuracoesAbertas, setConfiguracoesAbertas] = useState(false);
  const [seletorMinisterioAberto, setSeletorMinisterioAberto] = useState(false);
  const [adicionandoMinisterio, setAdicionandoMinisterio] = useState(false);
  const [erroCadastroMinisterio, setErroCadastroMinisterio] = useState<string | null>(null);

  const repertoriosApi = useRepertorios();
  const [repertorioAbertoId, setRepertorioAbertoId] = useState<string | null>(null);

  if (!ministerio.pertence || adicionandoMinisterio) {
    const primeiroMinisterio = !ministerio.pertence;
    return (
      <AdicionarMinisterioTela
        onBack={primeiroMinisterio ? onBack : () => setAdicionandoMinisterio(false)}
        erroCadastro={erroCadastroMinisterio}
        onConcluir={(nome, funcoesCustom) => {
          if (nome) {
            setErroCadastroMinisterio(null);
            ministerio
              .cadastrar(nome, funcoesCustom)
              .then(() => setAdicionandoMinisterio(false))
              .catch((e) => {
                console.error('Falha ao criar ministério', e);
                setErroCadastroMinisterio(
                  e instanceof Error && e.message === 'LIMITE_MINISTERIOS'
                    ? `Limite de ${LIMITE_MINISTERIOS} ministérios atingido.`
                    : 'Não foi possível salvar agora. Tente de novo.'
                );
              });
          } else {
            setAdicionandoMinisterio(false);
          }
        }}
        validarCodigo={ministerio.ingressarComCodigo}
      />
    );
  }

  const escalaAberta = escalasApi.escalas.find((e) => e.id === escalaAbertaId) ?? null;
  const repertorioAberto = repertoriosApi.repertorios.find((r) => r.id === repertorioAbertoId) ?? null;

  if (formularioEscala) {
    const editando = formularioEscala !== 'nova' ? formularioEscala : undefined;
    return (
      <NovaEscalaTela
        membros={ministerio.membros}
        funcoes={ministerio.funcoes}
        equipes={equipesApi.equipes}
        escalaExistente={editando}
        indisponibilidades={indisponibilidadesApi.indisponibilidades}
        onCancelar={() => setFormularioEscala(null)}
        onSalvar={(escala) => {
          if (editando) {
            escalasApi
              .atualizar(escala)
              .then(() => setFormularioEscala(null))
              .catch((e) => console.error('Falha ao atualizar escala', e));
          } else {
            escalasApi
              .criar(escala)
              .then((nova) => {
                setFormularioEscala(null);
                setEscalaAbertaId(nova.id);
              })
              .catch((e) => console.error('Falha ao criar escala', e));
          }
        }}
      />
    );
  }

  if (escalaAberta) {
    return (
      <EscalaDetalheTela
        escala={escalaAberta}
        membros={ministerio.membros}
        funcoes={ministerio.funcoes}
        equipes={equipesApi.equipes}
        meuMembroId={ministerio.meuMembroId}
        souAdmin={ministerio.souAdmin}
        indisponibilidades={indisponibilidadesApi.indisponibilidades}
        onBack={() => setEscalaAbertaId(null)}
        onAtualizar={(atualizada) =>
          escalasApi.atualizar(atualizada).catch((e) => console.error('Falha ao atualizar escala', e))
        }
        onEditar={() => setFormularioEscala(escalaAberta)}
        onExcluir={(id) => escalasApi.excluir(id)}
      />
    );
  }

  if (repertorioAberto) {
    return (
      <RepertorioDetalheTela
        repertorio={repertorioAberto}
        onBack={() => setRepertorioAbertoId(null)}
        onSelectMusica={(m, tom) => onAbrirMusica(m, repertorioAberto.id, tom)}
        removerMusica={repertoriosApi.removerMusica}
        moverMusicaParaRito={repertoriosApi.moverMusicaParaRito}
        adicionarRito={repertoriosApi.adicionarRito}
        removerRito={repertoriosApi.removerRito}
        reordenarRitos={repertoriosApi.reordenarRitos}
        onExcluirRepertorio={repertoriosApi.remover}
        podeEditar={ministerio.souAdmin}
      />
    );
  }

  if (configuracoesAbertas) {
    return (
      <ConfiguracoesMinisterioTela
        nome={ministerio.nome}
        foto={ministerio.foto}
        souAdmin={ministerio.souAdmin}
        qtdAdmins={ministerio.qtdAdmins}
        codigoConvite={ministerio.codigoConvite}
        onBack={() => setConfiguracoesAbertas(false)}
        onRenomear={ministerio.renomear}
        onAtualizarFoto={ministerio.atualizarFoto}
        onRegenerarCodigo={ministerio.regenerarCodigo}
        onSair={() => {
          ministerio.sair();
          setConfiguracoesAbertas(false);
        }}
        onExcluir={() => {
          ministerio.excluir();
          setConfiguracoesAbertas(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] font-sans text-[var(--text)]">
      <header className="bg-[var(--accent)] px-4 py-4 text-[var(--accent-fg)] lg:px-10">
        <div className="mb-2 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-1 text-xs opacity-80">
            <ChevronLeft size={14} /> Voltar
          </button>
          <button
            onClick={() => setConfiguracoesAbertas(true)}
            aria-label="Configurações do ministério"
            className="text-xs opacity-80"
          >
            <Settings size={16} />
          </button>
        </div>
        <button
          onClick={() => setSeletorMinisterioAberto(true)}
          className="flex w-full items-center gap-3 text-left"
        >
          {ministerio.foto && <span className="text-2xl">{ministerio.foto}</span>}
          <div className="min-w-0 flex-1">
            <span className="flex items-center gap-1">
              <h1 className="truncate text-xl font-extrabold tracking-tight">{ministerio.nome}</h1>
              <ChevronDown size={18} className="shrink-0 opacity-80" />
            </span>
            <p className="mt-0.5 text-sm opacity-80">{ministerio.membros.length} membros · área restrita</p>
          </div>
        </button>
      </header>

      <SeletorMinisterioSheet
        open={seletorMinisterioAberto}
        onClose={() => setSeletorMinisterioAberto(false)}
        ministerios={ministerio.meusMinisterios}
        ministerioAtivoId={ministerio.id}
        onTrocar={(id) => ministerio.trocarMinisterio(id)}
        onAdicionar={() => setAdicionandoMinisterio(true)}
      />

      <nav className="mx-auto flex max-w-2xl overflow-x-auto border-b border-[var(--border)] bg-[var(--surface)]">
        {ABAS.map((a) => (
          <button
            key={a.id}
            onClick={() => setSubTela(a.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap px-3 py-3 text-xs font-semibold ${
              subTela === a.id
                ? 'border-b-2 border-[var(--accent)] text-[var(--accent)]'
                : 'text-[var(--muted)]'
            }`}
          >
            {a.icon}
            {a.label}
          </button>
        ))}
      </nav>

      <div className="mx-auto max-w-2xl">
        {subTela === 'inicio' && (
          <InicioTela
            nomeMinisterio={ministerio.nome}
            membros={ministerio.membros}
            escalas={escalasApi.escalas}
            repertorios={repertoriosApi.repertorios}
            avisos={avisosApi.avisos}
            souAdmin={ministerio.souAdmin}
            solicitacoes={ministerio.solicitacoes}
            onAprovarSolicitacao={ministerio.aprovarSolicitacao}
            onRecusarSolicitacao={ministerio.recusarSolicitacao}
            onAbrirEscala={setEscalaAbertaId}
            onVerEscalas={() => setSubTela('escalas')}
            onVerAvisos={() => setSubTela('avisos')}
          />
        )}

        {subTela === 'escalas' && (
          <EscalasTela
            escalas={escalasApi.escalas}
            onAbrirEscala={setEscalaAbertaId}
            onCriarEscala={() => setFormularioEscala('nova')}
            souAdmin={ministerio.souAdmin}
          />
        )}

        {subTela === 'repertorio' && (
          <MinisterioRepertoriosTela
            repertorios={repertoriosApi.repertorios}
            escalas={escalasApi.escalas}
            garantirRepertorioDaEscala={repertoriosApi.garantirRepertorioDaEscala}
            onAbrirRepertorio={setRepertorioAbertoId}
            onIrParaEscalas={() => setSubTela('escalas')}
            souAdmin={ministerio.souAdmin}
          />
        )}

        {subTela === 'equipe' && (
          <EquipeTela
            membros={ministerio.membros}
            funcoes={ministerio.funcoes}
            equipes={equipesApi.equipes}
            indisponibilidades={indisponibilidadesApi.indisponibilidades}
            onAdicionarIndisponibilidade={(data, motivo) => {
              if (ministerio.meuMembroId) {
                indisponibilidadesApi
                  .criar(ministerio.meuMembroId, data, motivo)
                  .catch((e) => console.error('Falha ao adicionar indisponibilidade', e));
              }
            }}
            souAdmin={ministerio.souAdmin}
            codigoConvite={ministerio.codigoConvite}
            solicitacoes={ministerio.solicitacoes}
            onAprovarSolicitacao={ministerio.aprovarSolicitacao}
            onRecusarSolicitacao={ministerio.recusarSolicitacao}
            onTornarAdmin={ministerio.tornarAdmin}
            onRemoverAdmin={ministerio.removerAdmin}
            onRemoverMembro={ministerio.removerMembro}
            onCriarFuncao={ministerio.criarFuncao}
            onEditarFuncao={ministerio.editarFuncao}
            onRemoverFuncao={ministerio.removerFuncao}
            onCriarEquipe={equipesApi.criar}
            onEditarEquipe={equipesApi.editar}
            onRemoverEquipe={equipesApi.excluir}
          />
        )}

        {subTela === 'avisos' && (
          <AvisosTela
            avisos={avisosApi.avisos}
            onCriar={(titulo, descricao, emDestaque) =>
              avisosApi.criar(titulo, descricao, emDestaque).catch((e) => console.error('Falha ao criar aviso', e))
            }
            souAdmin={ministerio.souAdmin}
          />
        )}

        {subTela === 'panorama' && (
          <PanoramaTela
            escalas={escalasApi.escalas}
            repertorios={repertoriosApi.repertorios}
            indisponibilidades={indisponibilidadesApi.indisponibilidades}
            totalMembros={ministerio.membros.length}
          />
        )}
      </div>
    </div>
  );
}
