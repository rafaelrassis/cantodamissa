import * as cheerio from 'cheerio';
import { parseCifraClubTexto } from '../src/lib/cifraClubParser.js';
import { extractLyrics } from '../src/lib/chordpro.js';

export const config = { runtime: 'nodejs' };

/**
 * Busca uma página do Cifra Club no servidor (evita CORS do navegador) e
 * extrai título, artista, tom e a cifra convertida pra ChordPro.
 *
 * Os seletores abaixo (h1.t1, h2.t3 etc.) são baseados no layout observado
 * do site em ago/2026 e têm fallback por regex no texto puro — o Cifra
 * Club pode mudar o HTML sem aviso, então se a extração falhar o endpoint
 * ainda retorna o `<pre>` bruto pra edição manual em vez de dar erro.
 */
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return json({ error: 'Método não permitido' }, 405);
  }

  let url: string;
  try {
    const body = await req.json();
    url = String(body.url ?? '');
  } catch {
    return json({ error: 'Corpo inválido, esperado { url }' }, 400);
  }

  if (!/^https?:\/\/(www\.)?cifraclub\.com\.br\//i.test(url)) {
    return json({ error: 'Só links do cifraclub.com.br são aceitos' }, 400);
  }

  let html: string;
  try {
    const resp = await fetch(url, {
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; CantoDaMissaBot/1.0)' },
    });
    if (!resp.ok) return json({ error: `Cifra Club respondeu ${resp.status}` }, 502);
    html = await resp.text();
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'erro desconhecido';
    return json({ error: `Falha ao buscar a página: ${msg}` }, 502);
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
    return json(
      { error: 'Não encontrei o bloco de cifra (<pre>) nessa página — o layout pode ter mudado.' },
      422
    );
  }

  const chordsContent = parseCifraClubTexto(maiorPre);
  const lyrics = extractLyrics(chordsContent);

  return json({
    title,
    artist,
    originalTone,
    chordsContent,
    lyrics,
    sourceUrl: url,
  });
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
