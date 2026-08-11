import { useState } from 'react';
import { BarChart3, CalendarDays, ChevronLeft, Home, ListMusic, Megaphone, Users } from 'lucide-react';
import {
  AVISOS,
  ESCALAS,
  INDISPONIBILIDADES,
  MEMBROS,
} from '../../lib/mockMinisterio';
import { useRepertorios } from '../../lib/useRepertorios';
import type { Aviso, Escala, Indisponibilidade } from '../../types/ministerio';
import type { Musica } from '../../types/musica';
import { InicioTela } from './InicioTela';
import { EscalasTela } from './EscalasTela';
import { EscalaDetalheTela } from './EscalaDetalheTela';
import { NovaEscalaTela } from './NovaEscalaTela';
import { EquipeTela } from './EquipeTela';
import { AvisosTela } from './AvisosTela';
import { PanoramaTela } from './PanoramaTela';
import { AdicionarMinisterioTela } from './AdicionarMinisterioTela';
import { PainelRepertorios } from '../PainelRepertorios';
import { RepertorioDetalheTela } from '../RepertorioDetalheTela';

interface Props {
  onBack: () => void;
  onAbrirMusica: (musica: Musica, repertorioId?: string | null, tom?: string | null) => void;
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
 * Módulo "Ministério" — mock só de UX/fluxo (dados em memória, sem
 * Supabase) PARA Início/Escalas/Equipe/Avisos/Panorama. A aba Repertório é
 * exceção: reaproveita a feature real já existente (useRepertorios +
 * PainelRepertorios + RepertorioDetalheTela, Supabase-backed com fallback
 * localStorage), só trazida pra dentro do módulo — mesmos dados de
 * "Meus repertórios" acessível pela Home, não é uma cópia nem é
 * ministério-scoped (schema não tem esse vínculo ainda).
 * Login já é exigido antes de chegar aqui (ver App.tsx).
 */
export function MinisterioTela({ onBack, onAbrirMusica }: Props) {
  // Mock: usuário logado ainda não participa de nenhum ministério até
  // ingressar (código de convite) ou cadastrar um novo — replica o fluxo
  // do LouveApp, com o tema visual do app em vez do design de referência.
  const [pertenceMinisterio, setPertenceMinisterio] = useState(false);
  const [nomeMinisterioAtual, setNomeMinisterioAtual] = useState('Ministério');

  const [subTela, setSubTela] = useState<SubTela>('inicio');
  const [escalas, setEscalas] = useState<Escala[]>(ESCALAS);
  const [avisos, setAvisos] = useState<Aviso[]>(AVISOS);
  const [indisponibilidades, setIndisponibilidades] = useState<Indisponibilidade[]>(INDISPONIBILIDADES);
  const [escalaAbertaId, setEscalaAbertaId] = useState<string | null>(null);
  const [criandoEscala, setCriandoEscala] = useState(false);

  const repertoriosApi = useRepertorios();
  const [repertorioAbertoId, setRepertorioAbertoId] = useState<string | null>(null);
  const [novoNomeRepertorio, setNovoNomeRepertorio] = useState('');

  if (!pertenceMinisterio) {
    return (
      <AdicionarMinisterioTela
        onBack={onBack}
        onConcluir={(nome) => {
          if (nome) setNomeMinisterioAtual(nome);
          setPertenceMinisterio(true);
        }}
      />
    );
  }

  const escalaAberta = escalas.find((e) => e.id === escalaAbertaId) ?? null;
  const repertorioAberto = repertoriosApi.repertorios.find((r) => r.id === repertorioAbertoId) ?? null;

  if (criandoEscala) {
    return (
      <NovaEscalaTela
        onCancelar={() => setCriandoEscala(false)}
        onSalvar={(nova) => {
          setEscalas((prev) => [...prev, nova]);
          setCriandoEscala(false);
          setEscalaAbertaId(nova.id);
        }}
      />
    );
  }

  if (escalaAberta) {
    return (
      <EscalaDetalheTela
        escala={escalaAberta}
        onBack={() => setEscalaAbertaId(null)}
        onAtualizar={(atualizada) =>
          setEscalas((prev) => prev.map((e) => (e.id === atualizada.id ? atualizada : e)))
        }
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

  return (
    <div className="min-h-screen bg-[var(--bg)] font-sans text-[var(--text)]">
      <header className="bg-[var(--accent)] px-4 py-4 text-[var(--accent-fg)] lg:px-10">
        <button onClick={onBack} className="mb-2 flex items-center gap-1 text-xs opacity-80">
          <ChevronLeft size={14} /> Voltar
        </button>
        <h1 className="text-xl font-extrabold tracking-tight">{nomeMinisterioAtual}</h1>
        <p className="mt-0.5 text-sm opacity-80">{MEMBROS.length} membros · área restrita</p>
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
            nomeMinisterio={nomeMinisterioAtual}
            membros={MEMBROS}
            escalas={escalas}
            avisos={avisos}
            onAbrirEscala={setEscalaAbertaId}
            onVerEscalas={() => setSubTela('escalas')}
            onVerAvisos={() => setSubTela('avisos')}
          />
        )}

        {subTela === 'escalas' && (
          <EscalasTela
            escalas={escalas}
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
            membros={MEMBROS}
            indisponibilidades={indisponibilidades}
            onAdicionarIndisponibilidade={(data, motivo) =>
              setIndisponibilidades((prev) => [
                ...prev,
                { id: `i${prev.length + 1}`, membroId: 'm1', data, motivo },
              ])
            }
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
          <PanoramaTela escalas={escalas} indisponibilidades={indisponibilidades} />
        )}
      </div>
    </div>
  );
}
