import { useState } from 'react';
import { BarChart3, CalendarDays, ChevronLeft, Home, ListMusic, Megaphone, Settings, Users } from 'lucide-react';
import { AVISOS, INDISPONIBILIDADES } from '../../lib/mockMinisterio';
import { useRepertorios } from '../../lib/useRepertorios';
import { useEscalas } from '../../lib/useEscalas';
import type { Ministerio } from '../../lib/useMinisterio';
import type { Aviso, Indisponibilidade } from '../../types/ministerio';
import type { Musica } from '../../types/musica';
import { InicioTela } from './InicioTela';
import { EscalasTela } from './EscalasTela';
import { EscalaDetalheTela } from './EscalaDetalheTela';
import { NovaEscalaTela } from './NovaEscalaTela';
import { EquipeTela } from './EquipeTela';
import { AvisosTela } from './AvisosTela';
import { PanoramaTela } from './PanoramaTela';
import { AdicionarMinisterioTela } from './AdicionarMinisterioTela';
import { ConfiguracoesMinisterioTela } from './ConfiguracoesMinisterioTela';
import { PainelRepertorios } from '../PainelRepertorios';
import { RepertorioDetalheTela } from '../RepertorioDetalheTela';

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
 * Módulo "Ministério" — mock só de UX/fluxo PARA Início/Escalas/Equipe/
 * Avisos/Panorama. A identidade do ministério (pertence/nome/membros/
 * admins/solicitações) vem de fora via prop `ministerio` (hook levantado
 * até App.tsx — ver useMinisterioMock.ts) pra sobreviver à desmontagem
 * deste componente e alimentar o alerta global de solicitação pendente.
 * A aba Repertório reaproveita a feature real já existente (useRepertorios
 * + PainelRepertorios + RepertorioDetalheTela) — não é ministério-scoped
 * no schema ainda, só trazida pra dentro do módulo. Além dela, cada Escala
 * também pode ganhar seu próprio repertório vinculado (escalaId) — aba
 * "Músicas" de cada Escala (ver EscalaDetalheTela). `repertoriosApi` é
 * instanciado aqui uma única vez e passado adiante pras duas pontas, pra
 * não duplicar a busca.
 * Login já é exigido antes de chegar aqui (ver App.tsx).
 */
export function MinisterioTela({ onBack, onAbrirMusica, ministerio }: Props) {
  const [subTela, setSubTela] = useState<SubTela>('inicio');
  const escalasApi = useEscalas(ministerio.id);
  const [avisos, setAvisos] = useState<Aviso[]>(AVISOS);
  const [indisponibilidades, setIndisponibilidades] = useState<Indisponibilidade[]>(INDISPONIBILIDADES);
  const [escalaAbertaId, setEscalaAbertaId] = useState<string | null>(null);
  const [criandoEscala, setCriandoEscala] = useState(false);
  const [configuracoesAbertas, setConfiguracoesAbertas] = useState(false);

  const repertoriosApi = useRepertorios();
  const [repertorioAbertoId, setRepertorioAbertoId] = useState<string | null>(null);
  const [novoNomeRepertorio, setNovoNomeRepertorio] = useState('');

  if (!ministerio.pertence) {
    return (
      <AdicionarMinisterioTela
        onBack={onBack}
        onConcluir={(nome, funcoesCustom) => {
          if (nome) ministerio.cadastrar(nome, funcoesCustom).catch((e) => console.error('Falha ao criar ministério', e));
        }}
        validarCodigo={ministerio.ingressarComCodigo}
      />
    );
  }

  const escalaAberta = escalasApi.escalas.find((e) => e.id === escalaAbertaId) ?? null;
  const repertorioAberto = repertoriosApi.repertorios.find((r) => r.id === repertorioAbertoId) ?? null;

  if (criandoEscala) {
    return (
      <NovaEscalaTela
        membros={ministerio.membros}
        funcoes={ministerio.funcoes}
        onCancelar={() => setCriandoEscala(false)}
        onSalvar={(rascunho) => {
          escalasApi
            .criar(rascunho)
            .then((nova) => {
              setCriandoEscala(false);
              setEscalaAbertaId(nova.id);
            })
            .catch((e) => console.error('Falha ao criar escala', e));
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
        meuMembroId={ministerio.meuMembroId}
        onBack={() => setEscalaAbertaId(null)}
        onAtualizar={(atualizada) =>
          escalasApi.atualizar(atualizada).catch((e) => console.error('Falha ao atualizar escala', e))
        }
        onAbrirMusica={onAbrirMusica}
        repertoriosApi={repertoriosApi}
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
        <div className="flex items-center gap-3">
          {ministerio.foto && <span className="text-2xl">{ministerio.foto}</span>}
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">{ministerio.nome}</h1>
            <p className="mt-0.5 text-sm opacity-80">{ministerio.membros.length} membros · área restrita</p>
          </div>
        </div>
      </header>

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
            avisos={avisos}
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
            onCriarEscala={() => setCriandoEscala(true)}
          />
        )}

        {subTela === 'repertorio' && (
          <div className="flex flex-col gap-3 p-4">
            <PainelRepertorios
              repertorios={repertoriosApi.repertorios}
              repertorioCompartilhado={null}
              novoNome={novoNomeRepertorio}
              setNovoNome={setNovoNomeRepertorio}
              criar={repertoriosApi.criar}
              onAbrirRepertorio={setRepertorioAbertoId}
              onSelectMusica={(m, repId) => onAbrirMusica(m, repId ?? null)}
              onClonar={repertoriosApi.duplicar}
            />
          </div>
        )}

        {subTela === 'equipe' && (
          <EquipeTela
            membros={ministerio.membros}
            funcoes={ministerio.funcoes}
            indisponibilidades={indisponibilidades}
            onAdicionarIndisponibilidade={(data, motivo) =>
              setIndisponibilidades((prev) => [
                ...prev,
                { id: `i${prev.length + 1}`, membroId: 'm1', data, motivo },
              ])
            }
            souAdmin={ministerio.souAdmin}
            codigoConvite={ministerio.codigoConvite}
            solicitacoes={ministerio.solicitacoes}
            onAprovarSolicitacao={ministerio.aprovarSolicitacao}
            onRecusarSolicitacao={ministerio.recusarSolicitacao}
            onTornarAdmin={ministerio.tornarAdmin}
            onRemoverAdmin={ministerio.removerAdmin}
            onRemoverMembro={ministerio.removerMembro}
          />
        )}

        {subTela === 'avisos' && (
          <AvisosTela
            avisos={avisos}
            onCriar={(titulo, descricao, emDestaque) =>
              setAvisos((prev) => [
                {
                  id: `a${prev.length + 1}`,
                  titulo,
                  descricao,
                  emDestaque,
                  arquivado: false,
                  criadoEm: new Date().toISOString(),
                },
                ...prev,
              ])
            }
          />
        )}

        {subTela === 'panorama' && (
          <PanoramaTela
            escalas={escalasApi.escalas}
            repertorios={repertoriosApi.repertorios}
            indisponibilidades={indisponibilidades}
          />
        )}
      </div>
    </div>
  );
}
