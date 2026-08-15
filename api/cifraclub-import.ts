import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as cheerio from 'cheerio';
import { parseCifraClubTexto } from '../src/lib/cifraClubParser.js';
import { extractLyrics } from '../src/lib/chordpro.js';
import { exigirAdmin } from './_auth.js';

/**
 * Busca uma página do Cifra Club no servidor (evita CORS do navegador) e
 * extrai título, artista, tom e a cifra convertida pra ChordPro.
 *
 * Os seletores abaixo (h1.t1, h2.t3 etc.) são baseados no layout observado
 * do site em ago/2026 e têm fallback por regex no texto puro — o Cifra
 * Club pode mudar o HTML sem aviso, então se a extração falhar o endpoint
 * ainda retorna o `<pre>` bruto pra edição manual em vez de dar erro.
 *
 * Usa a assinatura legada (request, response) do @vercel/node — a
 * assinatura Web-padrão (Request) => Response só vale pra Edge Functions
 * ou rotas do Next.js App Router; numa function Node.js "solta" como esta,
 * `request` é um IncomingMessage e devolver um `Response` sem chamar
 * `response.end()`/`.json()` deixa a conexão pendurada até o timeout.
 */
export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Método não permitido' });
    return;
  }

  // Restrito a admin (ver _auth.ts): sem isso o endpoint é um proxy
  // aberto, que busca páginas de terceiros com a identidade do nosso
  // domínio pra quem pedir.
  if (!(await exigirAdmin(request, response))) return;

  const url = String(request.body?.url ?? '');

  if (!/^https?:\/\/(www\.)?cifraclub\.com\.br\//i.test(url)) {
    response.status(400).json({ error: 'Só links do cifraclub.com.br são aceitos' });
    return;
  }

  let html: string;
  try {
    const resp = await fetch(url, {
      headers: {
        // UA de navegador real — um UA de bot explícito faz alguns sites
        // aceitarem a conexão e nunca responderem.
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) {
      response.status(502).json({ error: `Cifra Club respondeu ${resp.status}` });
      return;
    }
    html = await resp.text();
  } catch (err) {
    const timeout = err instanceof Error && err.name === 'TimeoutError';
    const msg = timeout
      ? 'Cifra Club não respondeu a tempo (timeout de 15s)'
      : err instanceof Error
        ? err.message
        : 'erro desconhecido';
    response.status(502).json({ error: `Falha ao buscar a página: ${msg}` });
    return;
  }

  const $ = cheerio.load(html);

  const title =
    $('h1.t1').first().text().trim() ||
    $('meta[property="og:title"]').attr('content')?.split(' - ')[0]?.trim() ||
    $('title').text().split(' - ')[0]?.trim() ||
    '';

  const artist =
    $('h2.t3 a').first().text().trim() ||
    $('h2.t3').first().text().trim() ||
    null;

  // tom aparece como "Tom: G" ou num link com classe relacionada a tom;
  // fallback por regex no texto inteiro da página
  let originalTone: string | null = null;
  const tomMatch = $.text().match(/Tom:\s*([A-G](?:#|b)?m?)/);
  if (tomMatch) originalTone = tomMatch[1];

  // pega o maior <pre> da página — é onde o Cifra Club renderiza a cifra
  let maiorPre = '';
  $('pre').each((_, el) => {
    const texto = $(el).text();
    if (texto.length > maiorPre.length) maiorPre = texto;
  });

  if (!maiorPre) {
    response.status(422).json({
      error: 'Não encontrei o bloco de cifra (<pre>) nessa página — o layout pode ter mudado.',
    });
    return;
  }

  const chordsContent = parseCifraClubTexto(maiorPre);
  const lyrics = extractLyrics(chordsContent);

  response.status(200).json({
    title,
    artist,
    originalTone,
    chordsContent,
    lyrics,
    sourceUrl: url,
  });
}
