# Canto da Missa — Especificação do Projeto

> Documento de contexto para o Claude Code dar continuidade ao desenvolvimento.
> Todo o código referenciado aqui já foi escrito e validado (build passando) em uma sessão anterior no Claude web — este documento consolida as decisões pra reconstrução/commit inicial no repositório real.

Repositório: https://github.com/rafaelrassis/cantodamissa

---

## 1. Contexto & Objetivo

Aplicativo de cifras voltado para ministérios de música litúrgica católica. Resolve a logística de escolha de música, ajuste de tom e organização de repertório para a missa — algo que sites como "Músicas para Missa" fazem de forma básica demais (só filtram por tempo litúrgico, sem cruzar ciclo dominical, momento da missa ou tema das leituras).

## 2. Plataformas & Fases de entrega

**Fase 1 (agora)**: Web responsivo (desktop + mobile via navegador), sem instalação, online.
**Fase 2 (depois)**: Android instalável pela Google Play, com uso offline.

## 3. Stack Tecnológica

- **Frontend**: React + Vite + TypeScript + Tailwind CSS v4
- **Backend/DB**: Supabase (PostgreSQL + Auth + Storage)
- **Offline (Fase 2)**: Dexie.js (IndexedDB) + Capacitor (empacotamento Android)
- **Fontes**: Inter (UI) via Google Fonts, JetBrains Mono (cifra)
- **Sem PWA** — decisão explícita do cliente, web fica só navegador padrão na Fase 1.
- **Sem Electron/Tauri** para desktop — não há build nativo desktop no roadmap atual.

## 4. Identidade Visual

```css
--color-brand-green: #186420;       /* cor primária — tempo comum, marca */
--color-brand-green-dark: #0f3f14;
--color-brand-green-light: #e6f2e7;
--color-brand-gold: #c9a227;

--color-liturgico-advento: #5b2d90;   /* roxo */
--color-liturgico-quaresma: #5b2d90;  /* roxo */
--color-liturgico-pascoa: #eae0c8;    /* branco/dourado */
--color-liturgico-natal: #eae0c8;
--color-liturgico-comum: #186420;     /* verde */
--color-liturgico-martir: #a3111d;    /* vermelho, festas de mártires */

--font-sans: 'Inter', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', ui-monospace, monospace;
```

Nome do produto: **Canto da Missa**.

**Dark mode**: implementado via tokens semânticos em `src/index.css` (`--bg --surface --surface2
--border --text --muted --accent --accent-soft --accent-fg --chord --shadow`), que trocam de valor
por `:root[data-theme="dark"]`. Tema global, alternado pelo hook `src/lib/useTheme.ts`, persistido
em `localStorage` e respeitando `prefers-color-scheme` no primeiro load. Paleta estritamente
branco + verde em ambos os modos.

## 5. Modelo de Dados (Supabase/Postgres)

Ver migration completa em `supabase/migrations/0001_init.sql` (anexo/já escrita). Resumo das entidades:

- **profiles** — estende `auth.users`; campos `is_pro`, `pro_expires_at`
- **musicas** — `slug`, `title`, `artist`, `original_tone`, `difficulty`, `capo`, `youtube_url`, `lyrics`, `chords_content` (formato ChordPro), `views_count`, `search_vector` (full-text gerado, ignora acento via `unaccent`)
- **musica_acordes** — acordes usados, cacheados por performance
- **musica_tempo_liturgico**, **musica_ciclo**, **musica_momento** — relações N:N (enums `tempo_liturgico`, `ciclo_dominical`, `momento_missa`)
- **domingos** — calendário litúrgico (data, tempo, ciclo, cor); **calculado por algoritmo** (Páscoa/Meeus + regras do lecionário), não populado manualmente
- **repertorios** / **repertorio_musicas** / **repertorio_membros** — módulo banda/ministério, com `share_token` para compartilhar por link
- RLS habilitado: músicas são públicas para leitura; repertórios só para dono/membros

**Pendente de adicionar ao schema**: tabela `submissoes` (usuário sugere música nova ou correção → status pending/aprovado/rejeitado) e campo de colaboradores/créditos na música (`colaboradores: profile_id[]`), conforme decisão da seção 8.

## 6. Engine ChordPro (`src/lib/chordpro.ts`)

Já implementado e testado:

- `extractLyrics(chordsContent)` — letra pura sem marcação de acorde, pra indexação full-text
- `extractChordsUsed(chordsContent)` — lista de acordes únicos, na ordem de aparição
- `transposeChord(chord, semitones, useFlats)` — transpõe um acorde único (suporta sufixos como `m7`, `sus4`, baixo invertido `C/E`)
- `transposeContent(chordsContent, semitones, useFlats)` — transpõe a música inteira
- `semitonesBetween(fromTone, toTone)` — distância entre dois tons
- `parseLineToTokens(line)` — quebra uma linha em tokens `{ chord, text }` pra renderizar acorde acima da sílaba certa

Formato de armazenamento: **ChordPro** — `"[G]Como são belos os [Em]pés..."`.

## 7. Componentes já construídos

- **`CifraReader`** (`src/components/CifraReader.tsx`) — tela do leitor de cifra, com:
  - Transposição ±semitom, toggle sustenido/bemol
  - Ajuste de fonte (14–32px)
  - Auto-scroll com velocidade ajustável (hook `useAutoScroll`), para sozinho no fim do conteúdo
  - Keep Awake via Wake Lock API (hook `useKeepAwake`), com fallback gracioso se não suportado
  - Player de vídeo YouTube em toggle (embed, não ocupa tela por padrão)
  - **Sem slot de anúncio nesta tela** — decisão de UX: modo leitor no altar não deve ter distração
- **`ChordLine`** (`src/components/ChordLine.tsx`) — renderiza uma linha de cifra com acordes posicionados acima da sílaba exata, fonte monoespaçada (JetBrains Mono)

## 8. Decisões de Produto (registro de refinamento)

1. **Direitos autorais**: modelo notice-and-takedown. Botão "solicitar remoção" em toda música/cantor. Atende em prazo declarado nos Termos de Uso. Não reivindicar autoria da letra/melodia original. **Risco jurídico reconhecido e aceito pelo cliente.**
2. **Autenticação**: só necessária para salvar offline e participar de grupo/repertório compartilhado. Google OAuth. **Fica pra Fase 2.**
3. **Cadastro de músicas**: usuários comuns podem **sugerir** música nova ou correção (tabela `submissoes`). Só admin publica de fato. Colaboradores que ajudaram em correções recebem crédito visível na música.
4. **Calendário litúrgico**: calculado automaticamente por algoritmo (não manual). Terá tela pública de calendário anual navegável (mês a mês, mostrando tempo/ciclo/cor de cada domingo) — não fica restrito só à busca de música.
5. **Seed inicial de músicas**: sem número fixo definido. Cliente tem cifras em PDF/Word para fornecer — vai exigir pipeline de extração (parser de texto e/ou OCR conforme o formato dos arquivos, a definir após ver amostras).
6. **Diagrama de acordes**: ~~dataset estático~~ **decisão revista**: geração algorítmica (`src/lib/chordShapes.ts`), portada do handoff de design. Cobre os acordes abertos comuns via dicionário (`OPEN`) e gera pestanas (barre) a partir das formas de E/A pra qualquer outro acorde/transposição — sem dataset a manter, sem fallback "não disponível".
7. **Monetização**: banner fixo no rodapé (Google AdSense na Fase 1 web; troca para AdMob nativo na Fase 2 Android). Proibido interstitial/pop-up ou vídeo com som automático — uso em celebração ao vivo. Layout já reserva `<div id="ad-slot">` mesmo sem anúncio real ativo ainda. Falha de carregamento (ex: offline) deve esconder o slot graciosamente, sem erro visível. Opção de remover anúncio via assinatura/pagamento único — estado "Pro" tem que validar contra Supabase quando online (não só LocalStorage/Dexie, que é cache, não fonte de verdade).
8. **LGPD/Termos**: rascunho de Política de Privacidade e Termos de Uso fica pra antes da publicação (não bloqueia desenvolvimento agora).

## 9. Próximos passos sugeridos (ordem)

1. Reconstituir os arquivos já escritos no repositório real (setup Vite/Tailwind, migration SQL, engine ChordPro, componentes do leitor) — commit inicial
2. Criar projeto real no Supabase, rodar a migration, configurar `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) — nunca commitar o `.env` real, só `.env.example`
3. Implementar algoritmo do calendário litúrgico (Páscoa/Meeus + lecionário) e popular/cachear `domingos`
4. Tela Home: Top 50 + busca full-text
5. Tela de calendário litúrgico público
6. Fluxo de submissão de música/correção + moderação admin
7. Dataset de diagramas de acorde + componente visual
8. Módulo de Repertório (banda/ministério)
9. Fase 2: Capacitor, Dexie, AdMob, Google OAuth, Keep Awake nativo

## 10. Restrições e convenções de projeto

- Gerenciador de pacotes: **npm**
- Commits direto na `main` (sem PRs intermediários, conforme preferência do cliente)
- `pip`/outras stacks não se aplicam — projeto é 100% Node/TypeScript
- Nunca commitar `.env` real (já está no `.gitignore`)
