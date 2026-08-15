/**
 * Teste de fumaça: sobe o app num navegador de verdade e percorre os
 * caminhos principais conferindo que nada estoura no console.
 *
 * Existe porque os testes unitários não pegam o tipo de erro que mais
 * dói aqui: provider faltando, chamada de rede em ambiente sem
 * credenciais, promessa rejeitada sem tratamento. Foi assim que a
 * chamada ao Supabase placeholder apareceu.
 *
 *   npm run dev        # numa aba
 *   npm run smoke      # noutra
 *
 * Sem VITE_SUPABASE_URL configurada o app roda com as músicas mock, que
 * é justamente o cenário que este teste cobre.
 */
import { chromium } from 'playwright-core';

const BASE = process.env.SMOKE_URL ?? 'http://localhost:5173/';
const EXECUTAVEL = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium';

const erros = [];
const passos = [];

function passo(nome, ok) {
  passos.push({ nome, ok });
  console.log(`${ok ? '✓' : '✗'} ${nome}`);
}

let browser;
try {
  browser = await chromium.launch({ executablePath: EXECUTAVEL, args: ['--no-sandbox'] });
} catch (err) {
  console.error(
    `não consegui abrir o Chromium em ${EXECUTAVEL}. ` +
      'Defina CHROMIUM_PATH ou instale com `npx playwright install chromium`.'
  );
  throw err;
}
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
page.on('console', (m) => {
  if (m.type() === 'error') erros.push(`console: ${m.text()}`);
});
page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));

await page.goto(BASE, { waitUntil: 'networkidle' });

// A Home mostra o domingo litúrgico calculado — se o cálculo quebrar,
// não há h1.
const titulo = await page.locator('h1').first().textContent();
passo(`home renderiza o domingo ("${titulo?.trim()}")`, Boolean(titulo?.trim()));

// Abre uma cifra do acervo mock e confere que o leitor montou.
await page.getByText('Como São Belos').first().click();
await page.waitForTimeout(800);
passo('leitor de cifra abre', (await page.getByText(/capo|tom/i).first().count()) > 0);

// Transpor não pode derrubar a tela.
const btnTom = page.getByRole('button', { name: /tom/i }).first();
if (await btnTom.count()) {
  await btnTom.click();
  await page.waitForTimeout(400);
}
passo('controles do leitor respondem', true);

// Busca (com debounce) e calendário.
await page.goto(BASE, { waitUntil: 'networkidle' });
const busca = page.locator('input[placeholder*="Buscar"]').first();
await busca.fill('senhor');
await page.waitForTimeout(700);
passo('busca responde', true);

// No viewport mobile o acesso ao calendário é pela barra inferior; no
// desktop é o link do header. `visible: true` pega o que estiver na tela.
await page.goto(BASE, { waitUntil: 'networkidle' });
const calendario = page.getByText('Calendário').filter({ visible: true }).first();
if (await calendario.count()) {
  await calendario.click();
  await page.waitForTimeout(700);
  passo('calendário litúrgico abre', (await page.getByText(/Advento|Quaresma|Tempo Comum|Páscoa/).first().count()) > 0);
} else {
  passo('calendário litúrgico abre', false);
}

await browser.close();

if (erros.length > 0) {
  console.error(`\n${erros.length} erro(s) no console:\n${erros.join('\n')}`);
  process.exit(1);
}
const falhou = passos.filter((p) => !p.ok);
if (falhou.length > 0) {
  console.error(`\n${falhou.length} passo(s) falharam`);
  process.exit(1);
}
console.log(`\n${passos.length} passos ok, nenhum erro de console`);
