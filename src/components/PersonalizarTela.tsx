import { useState } from 'react';
import { Cake, Check, ChevronLeft, ChevronRight, ListPlus, LogOut, Moon, Palette, Sun } from 'lucide-react';
import type { Theme } from '../lib/useTheme';

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
  onSair: () => void;
  onFechar: () => void;
  onCriarCifra: () => void;
}

const CORES_SUGERIDAS = [
  '#4f6135', // verde da marca (padrão)
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
  onSair,
  onFechar,
  onCriarCifra,
}: Props) {
  const [editandoFoto, setEditandoFoto] = useState(false);
  const [fotoRascunho, setFotoRascunho] = useState(foto ?? '🙂');

  const corAtual = corPersonalizada ?? '#4f6135';

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-[var(--bg)] font-sans text-[var(--text)]">
      <header className="flex items-center gap-2.5 border-b border-[var(--border)] px-[22px] py-[15px]">
        <button onClick={onFechar} aria-label="Voltar">
          <ChevronLeft size={20} strokeWidth={2.75} />
        </button>
        <h1 className="text-[19px]">Personalizar</h1>
      </header>

      <div className="mx-auto w-full max-w-2xl px-4 py-6 lg:px-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setEditandoFoto((v) => !v)}
            aria-label="Alterar foto"
            className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[26px] text-[var(--accent-fg)]"
          >
            {foto ?? userName[0]?.toUpperCase()}
          </button>
          <p className="text-lg font-bold">{userName}</p>
        </div>

        <button
          onClick={onCriarCifra}
          className="mt-4 flex w-full items-center gap-3 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] px-[18px] py-[14px] text-left"
        >
          <ListPlus size={18} strokeWidth={2.75} className="shrink-0 text-[var(--accent)]" />
          <span className="flex-1 text-sm font-semibold">Criar nova cifra</span>
          <ChevronRight size={16} strokeWidth={2.75} className="shrink-0 text-[var(--muted)]" />
        </button>

        {editandoFoto && (
          <div className="mt-3 flex items-center gap-2.5 rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-3.5">
            <input
              autoFocus
              value={fotoRascunho}
              onChange={(e) => setFotoRascunho(e.target.value)}
              maxLength={2}
              className="w-14 rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-2 py-2 text-center text-xl"
            />
            <p className="flex-1 text-xs text-[var(--muted)]">Emoji como foto — escolha o que quiser.</p>
            <button
              onClick={() => {
                onDefinirFoto(fotoRascunho.trim() || null);
                setEditandoFoto(false);
              }}
              className="shrink-0 rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-bold text-[var(--accent-fg)]"
            >
              Ok
            </button>
          </div>
        )}

        <h2 className="mt-[26px] mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">
          Data de nascimento
        </h2>
        <div className="flex items-center gap-3 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] px-[18px] py-[14px]">
          <Cake size={18} strokeWidth={2.75} className="shrink-0 text-[var(--accent)]" />
          <input
            type="date"
            value={dataNascimento ?? ''}
            onChange={(e) => onDefinirDataNascimento(e.target.value || null)}
            max={new Date().toISOString().slice(0, 10)}
            className="w-full bg-transparent font-mono text-sm outline-none"
          />
        </div>
        <p className="mt-1.5 text-xs text-[var(--muted)]">Usada pro seu aniversário aparecer no Ministério.</p>

        <h2 className="mt-[26px] mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">Aparência</h2>
        <div className="flex gap-1.5 rounded-[24px] bg-[var(--surface)] p-1.5">
          <button
            onClick={() => theme === 'dark' && onToggleTheme()}
            className={`flex flex-1 items-center justify-center gap-2 rounded-[18px] py-[11px] text-sm font-bold ${
              theme === 'light' ? 'bg-[var(--accent)] text-[var(--accent-fg)]' : 'text-[var(--muted)]'
            }`}
          >
            <Sun size={16} strokeWidth={2.75} /> Claro
          </button>
          <button
            onClick={() => theme === 'light' && onToggleTheme()}
            className={`flex flex-1 items-center justify-center gap-2 rounded-[18px] py-[11px] text-sm font-bold ${
              theme === 'dark' ? 'bg-[var(--accent)] text-[var(--accent-fg)]' : 'text-[var(--muted)]'
            }`}
          >
            <Moon size={16} strokeWidth={2.75} /> Escuro
          </button>
        </div>

        <h2 className="mt-[26px] mb-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">Cor do app</h2>
        <p className="mb-3 text-sm text-[var(--muted)]">Escolha a cor de destaque que preferir.</p>

        <div className="flex items-center gap-3.5 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] px-[18px] py-[14px]">
          <div className="relative flex h-[46px] w-[46px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--border)]">
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
              <Palette size={14} strokeWidth={2.75} /> {corAtual}
            </p>
            <p className="text-xs text-[var(--muted)]">Toque no círculo pra abrir o seletor de cor</p>
          </div>
        </div>

        <div className="mt-[14px] flex flex-wrap gap-3">
          {CORES_SUGERIDAS.map((cor) => (
            <button
              key={cor}
              onClick={() => onDefinirCorPersonalizada(cor === '#4f6135' ? null : cor)}
              className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{ background: cor }}
              title={cor}
              aria-label={`Usar cor ${cor}`}
            >
              {(corPersonalizada ?? '#4f6135') === cor && <Check size={16} strokeWidth={2.75} className="text-white" />}
            </button>
          ))}
        </div>

        {corPersonalizada && (
          <button
            onClick={() => onDefinirCorPersonalizada(null)}
            className="mt-[14px] text-xs font-bold text-[var(--accent)] underline-offset-2 hover:underline"
          >
            Restaurar cor padrão
          </button>
        )}

        <button
          onClick={onSair}
          className="mt-[28px] flex w-full items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg)] py-[14px] text-sm font-bold"
        >
          <LogOut size={16} strokeWidth={2.75} /> Sair
        </button>
      </div>
    </div>
  );
}
