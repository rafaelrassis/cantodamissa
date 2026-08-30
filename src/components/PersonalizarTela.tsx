import { useState } from 'react';
import { Cake, Check, ChevronLeft, ChevronRight, FileText, ListPlus, LogOut, Mail, Moon, Music, Palette, Sun } from 'lucide-react';
import type { Theme } from '../lib/useTheme';
import type { ModoExibicao } from '../lib/modoExibicao';

interface Props {
  userName: string;
  foto: string | null;
  onDefinirFoto: (emoji: string | null) => void;
  dataNascimento: string | null;
  onDefinirDataNascimento: (iso: string | null) => void;
  theme: Theme;
  onToggleTheme: () => void;
  corPersonalizada: string | null;
  onDefinirCorPersonalizada: (hex: string | null) => void;
  qtdRepertoriosHome: number;
  onDefinirQtdRepertoriosHome: (qtd: number) => void;
  modoExibicaoPadrao: ModoExibicao;
  onDefinirModoExibicaoPadrao: (modo: ModoExibicao) => void;
  onSair: () => void;
  onFechar: () => void;
  onCriarCifra: () => void;
}

const EMAIL_SUPORTE = 'rafaelrassis@hotmail.com';

const CATEGORIAS_REPORTE = [
  { valor: 'bug', label: 'Erro / bug' },
  { valor: 'melhoria', label: 'Sugestão de melhoria' },
  { valor: 'outro', label: 'Outro' },
] as const;

const CORES_SUGERIDAS = [
  '#186420', // verde da marca (padrão)
  '#2563eb', // azul
  '#a3111d', // vermelho
  '#5b2d90', // roxo litúrgico
  '#c9a227', // dourado
  '#0891b2', // ciano
  '#db2777', // rosa
  '#78716c', // pedra/neutro
];

export function PersonalizarTela({
  userName,
  foto,
  onDefinirFoto,
  dataNascimento,
  onDefinirDataNascimento,
  theme,
  onToggleTheme,
  corPersonalizada,
  onDefinirCorPersonalizada,
  qtdRepertoriosHome,
  onDefinirQtdRepertoriosHome,
  modoExibicaoPadrao,
  onDefinirModoExibicaoPadrao,
  onSair,
  onFechar,
  onCriarCifra,
}: Props) {
  const [editandoFoto, setEditandoFoto] = useState(false);
  const [fotoRascunho, setFotoRascunho] = useState(foto ?? '🙂');
  const [categoriaReporte, setCategoriaReporte] = useState<(typeof CATEGORIAS_REPORTE)[number]['valor']>('bug');
  const [mensagemReporte, setMensagemReporte] = useState('');

  const corAtual = corPersonalizada ?? '#186420';

  function enviarReporte() {
    const categoriaLabel = CATEGORIAS_REPORTE.find((c) => c.valor === categoriaReporte)?.label ?? '';
    const assunto = `[Canto da Missa] ${categoriaLabel}`;
    const corpo = `${mensagemReporte}\n\n---\nUsuário: ${userName}\nApp: Canto da Missa`;
    window.location.href = `mailto:${EMAIL_SUPORTE}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-[var(--bg)] font-sans text-[var(--text)]">
      <header className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-4">
        <button onClick={onFechar} aria-label="Voltar">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-lg font-extrabold tracking-tight">Personalizar</h1>
      </header>

      <div className="mx-auto w-full max-w-2xl px-4 py-5 md:px-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setEditandoFoto((v) => !v)}
            aria-label="Alterar foto"
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-3xl text-[var(--accent-fg)]"
          >
            {foto ?? userName[0]?.toUpperCase()}
          </button>
          <p className="text-lg font-bold">{userName}</p>
        </div>

        <button
          onClick={onCriarCifra}
          className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 text-left"
        >
          <ListPlus size={18} className="shrink-0 text-[var(--accent)]" />
          <span className="flex-1 text-sm font-semibold">Criar nova cifra</span>
          <ChevronRight size={16} className="shrink-0 text-[var(--muted)]" />
        </button>

        {editandoFoto && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
            <input
              autoFocus
              value={fotoRascunho}
              onChange={(e) => setFotoRascunho(e.target.value)}
              maxLength={2}
              className="w-14 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-2 text-center text-xl"
            />
            <p className="flex-1 text-xs text-[var(--muted)]">Emoji como foto — escolha o que quiser.</p>
            <button
              onClick={() => {
                onDefinirFoto(fotoRascunho.trim() || null);
                setEditandoFoto(false);
              }}
              className="shrink-0 rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-[var(--accent-fg)]"
            >
              Ok
            </button>
          </div>
        )}

        <h2 className="mt-8 text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
          Data de nascimento
        </h2>
        <div className="mt-2 flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <Cake size={18} className="shrink-0 text-[var(--accent)]" />
          <input
            type="date"
            value={dataNascimento ?? ''}
            onChange={(e) => onDefinirDataNascimento(e.target.value || null)}
            max={new Date().toISOString().slice(0, 10)}
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
        <p className="mt-1 text-xs text-[var(--muted)]">Usada pro seu aniversário aparecer no Ministério.</p>

        <h2 className="mt-8 text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Aparência</h2>
        <div className="mt-2 flex gap-2 rounded-2xl bg-[var(--surface)] p-1.5">
          <button
            onClick={() => theme === 'dark' && onToggleTheme()}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold ${
              theme === 'light' ? 'bg-[var(--accent)] text-[var(--accent-fg)]' : 'text-[var(--muted)]'
            }`}
          >
            <Sun size={16} /> Claro
          </button>
          <button
            onClick={() => theme === 'light' && onToggleTheme()}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold ${
              theme === 'dark' ? 'bg-[var(--accent)] text-[var(--accent-fg)]' : 'text-[var(--muted)]'
            }`}
          >
            <Moon size={16} /> Escuro
          </button>
        </div>

        <h2 className="mt-8 text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Modo de exibição</h2>
        <p className="mt-0.5 text-sm text-[var(--muted)]">
          Como abrir as músicas por padrão. Não afeta o repertório da assembleia, que sempre abre em letra.
        </p>
        <div className="mt-2 flex gap-2 rounded-2xl bg-[var(--surface)] p-1.5">
          <button
            onClick={() => onDefinirModoExibicaoPadrao('cifra')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold ${
              modoExibicaoPadrao === 'cifra' ? 'bg-[var(--accent)] text-[var(--accent-fg)]' : 'text-[var(--muted)]'
            }`}
          >
            <Music size={16} /> Cifra
          </button>
          <button
            onClick={() => onDefinirModoExibicaoPadrao('letra')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold ${
              modoExibicaoPadrao === 'letra' ? 'bg-[var(--accent)] text-[var(--accent-fg)]' : 'text-[var(--muted)]'
            }`}
          >
            <FileText size={16} /> Letra
          </button>
        </div>

        <h2 className="mt-8 text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Cor do app</h2>
        <p className="mt-0.5 text-sm text-[var(--muted)]">Escolha a cor de destaque que preferir.</p>

        <div className="mt-3 flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--border)]">
            <input
              type="color"
              value={corAtual}
              onChange={(e) => onDefinirCorPersonalizada(e.target.value)}
              aria-label="Escolher cor personalizada"
              className="h-16 w-16 cursor-pointer border-none p-0"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <Palette size={14} /> {corAtual}
            </p>
            <p className="text-xs text-[var(--muted)]">Toque no círculo pra abrir o seletor de cor</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-3">
          {CORES_SUGERIDAS.map((cor) => (
            <button
              key={cor}
              onClick={() => onDefinirCorPersonalizada(cor === '#186420' ? null : cor)}
              className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{ background: cor }}
              title={cor}
              aria-label={`Usar cor ${cor}`}
            >
              {(corPersonalizada ?? '#186420') === cor && <Check size={16} className="text-white" />}
            </button>
          ))}
        </div>

        {corPersonalizada && (
          <button
            onClick={() => onDefinirCorPersonalizada(null)}
            className="mt-3 text-xs font-semibold text-[var(--accent)] underline-offset-2 hover:underline"
          >
            Restaurar cor padrão
          </button>
        )}

        <h2 className="mt-8 text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Início</h2>
        <div className="mt-2 flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Meus próximos repertórios</p>
            <p className="text-xs text-[var(--muted)]">Quantos mostrar na tela inicial</p>
          </div>
          <select
            value={qtdRepertoriosHome}
            onChange={(e) => onDefinirQtdRepertoriosHome(Number(e.target.value))}
            className="shrink-0 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm outline-none"
          >
            <option value={0}>Não mostrar</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <h2 className="mt-8 text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Suporte</h2>
        <div className="mt-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="flex items-center gap-2">
            <Mail size={16} className="shrink-0 text-[var(--accent)]" />
            <p className="text-sm font-semibold">Reportar erro ou sugerir melhoria</p>
          </div>

          <div className="mt-3 flex gap-2 rounded-xl bg-[var(--bg)] p-1">
            {CATEGORIAS_REPORTE.map((c) => (
              <button
                key={c.valor}
                onClick={() => setCategoriaReporte(c.valor)}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold ${
                  categoriaReporte === c.valor
                    ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                    : 'text-[var(--muted)]'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <textarea
            value={mensagemReporte}
            onChange={(e) => setMensagemReporte(e.target.value)}
            placeholder="Descreva o que aconteceu..."
            rows={4}
            className="mt-3 w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm outline-none"
          />

          <button
            onClick={enviarReporte}
            disabled={!mensagemReporte.trim()}
            className="mt-3 w-full rounded-xl bg-[var(--accent)] py-2.5 text-sm font-semibold text-[var(--accent-fg)] disabled:opacity-40"
          >
            Enviar por e-mail
          </button>
          <p className="mt-1.5 text-center text-xs text-[var(--muted)]">Abre seu app de e-mail com a mensagem pronta</p>
        </div>

        <button
          onClick={onSair}
          className="mt-10 flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] py-3 text-sm font-semibold"
        >
          <LogOut size={16} /> Sair
        </button>
      </div>
    </div>
  );
}
