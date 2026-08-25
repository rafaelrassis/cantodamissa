# QA Automation - Canto da Missa

Suite Playwright E2E (`tests/`). Os `data-testid` que ela usa já estão
aplicados em `src/components/{BuscaTela,MusicaCard,CifraBottomBar}.tsx`.

## Rodando

```bash
npm i
npx playwright install --with-deps
npm run test:e2e
npx playwright show-report
```

Por padrão os testes rodam contra `https://canto-da-missa.vercel.app/`
(`playwright.config.ts`). Para rodar contra um build local:

```bash
npm run build && npm run preview -- --port 4173
BASE_URL=http://localhost:4173/ npm run test:e2e
```

Rodar contra `npm run dev` também funciona para a maior parte da suite,
exceto os testes 9 e 10 (manifest PWA / service worker): o
`vite-plugin-pwa` só injeta manifest e registra o SW em build de produção
(`devOptions.enabled: false` em `vite.config.ts`) — use `preview`, não
`dev`, para esses dois.

## Validação

Os 20 casos (10 testes × Desktop Chrome / mobile) foram executados de
verdade neste ambiente contra um build de produção local (Chromium; a
suite roda WebKit — `devices['iPhone 14']` — normalmente em máquinas com
`playwright install` completo, não disponível neste sandbox) e passaram
de forma estável em rodadas repetidas. Dois bugs reais na suite original
(escrita só por leitura de código, sem execução) foram corrigidos depois
de reproduzir a falha:

- **`gotoBusca()`**: `getByRole('button', { name: /busca/i })` casava
  também com o botão "Buscar ministério" da Home (que vem antes no DOM),
  abrindo a tela errada. Trocado para nome exato `'Buscar'`.
- **Teste 7 (modo letra)**: assumia que a URL mudava por música
  (`url.split('/').pop()`) e que existia um botão "Ver só a letra" dentro
  do leitor — nenhum dos dois existe. A navegação em `App.tsx` é só
  estado em memória (sem rotas), e "Ver só a letra" é uma ação rápida no
  card de resultado que abre a música já em modo letra. O teste agora usa
  essa ação e, para provar a persistência após reload (que sempre volta
  pra Home, já que não há URL por música), reabre a mesma música pelo
  Histórico e confere que ela volta em modo letra.

## Notas / limitações conhecidas

- Testes 4 e 6 dependem de "Glória" retornar resultado com tom/fonte —
  cobre tanto os dados mock (`src/lib/mockMusicas.ts`, usados sem
  `VITE_SUPABASE_URL`) quanto o Supabase real, mas em produção depende do
  conteúdo cadastrado.
- Teste 10 (offline) depende do Service Worker já ter instalado no
  navegador de teste; pode falhar no primeiro run frio — rodar 2x.
- `retries: 1` no config de produção (`playwright.config.ts`) cobre
  variação de rede real contra o Vercel; não foi necessário nas rodadas
  locais.
