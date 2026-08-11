import { useState } from 'react';
import { BarChart3, CalendarDays, ChevronLeft, Megaphone, Users } from 'lucide-react';
import {
  AVISOS,
  ESCALAS,
  INDISPONIBILIDADES,
  MEMBROS,
} from '../../lib/mockMinisterio';
import type { Aviso, Escala, Indisponibilidade } from '../../types/ministerio';
import { EscalasTela } from './EscalasTela';
import { EscalaDetalheTela } from './EscalaDetalheTela';
import { NovaEscalaModal } from './NovaEscalaModal';
import { EquipeTela } from './EquipeTela';
import { AvisosTela } from './AvisosTela';
import { PanoramaTela } from './PanoramaTela';
import { AdicionarMinisterioTela } from './AdicionarMinisterioTela';

interface Props {
  onBack: () => void;
}

type SubTela = 'escalas' | 'equipe' | 'avisos' | 'panorama';

const ABAS: { id: SubTela; label: string; icon: React.ReactNode }[] = [
  { id: 'escalas', label: 'Escalas', icon: <CalendarDays size={16} /> },
  { id: 'equipe', label: 'Equipe', icon: <Users size={16} /> },
  { id: 'avisos', label: 'Avisos', icon: <Megaphone size={16} /> },
  { id: 'panorama', label: 'Panorama', icon: <BarChart3 size={16} /> },
];

/**
 * Módulo "Ministério" — mock só de UX/fluxo (dados em memória, sem
 * Supabase). Login já é exigido antes de chegar aqui (ver App.tsx).
 * Escopo fechado no chat: Escalas + Equipe + Avisos + Panorama.
 * Deixado de fora de propósito: Mensagens, Metrônomo, Módulos,
 * Integrações, Classificações — ver justificativa na conversa.
 */
export function MinisterioTela({ onBack }: Props) {
  // Mock: usuário logado ainda não participa de nenhum ministério até
  // ingressar (código de convite) ou cadastrar um novo — replica o fluxo
  // do LouveApp, com o tema visual do app em vez do design de referência.
  const [pertenceMinisterio, setPertenceMinisterio] = useState(false);
  const [nomeMinisterioAtual, setNomeMinisterioAtual] = useState('Ministério');

  const [subTela, setSubTela] = useState<SubTela>('escalas');
  const [escalas, setEscalas] = useState<Escala[]>(ESCALAS);
  const [avisos, setAvisos] = useState<Aviso[]>(AVISOS);
  const [indisponibilidades, setIndisponibilidades] = useState<Indisponibilidade[]>(INDISPONIBILIDADES);
  const [escalaAbertaId, setEscalaAbertaId] = useState<string | null>(null);
  const [novaEscalaAberta, setNovaEscalaAberta] = useState(false);

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
        {subTela === 'escalas' && (
          <EscalasTela
            escalas={escalas}
            onAbrirEscala={setEscalaAbertaId}
            onCriarEscala={() => setNovaEscalaAberta(true)}
          />
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

      {novaEscalaAberta && (
        <NovaEscalaModal
          onClose={() => setNovaEscalaAberta(false)}
          onSalvar={(titulo, data, hora) => {
            const nova: Escala = {
              id: `e${escalas.length + 1}`,
              titulo,
              data,
              hora,
              observacoes: '',
              publicada: false,
              solicitarConfirmacao: true,
              participantes: [],
              musicas: [],
              roteiro: [],
            };
            setEscalas((prev) => [...prev, nova]);
            setNovaEscalaAberta(false);
            setEscalaAbertaId(nova.id);
          }}
        />
      )}
    </div>
  );
}
