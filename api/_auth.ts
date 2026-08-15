import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * Checagem de admin para os endpoints de importação de cifra.
 *
 * Eles são ferramentas da Área Admin, mas estavam abertos na internet:
 * qualquer um podia usar /api/cifraclub-import como proxy de scraping em
 * nome do domínio, ou mandar PDFs pro /api/cifra-pdf-extract e fazer o
 * pdf.js trabalhar de graça. A tela escondia o botão (useAdminAuth), o
 * que nunca protegeu a rota.
 *
 * O token vem no header Authorization (o mesmo access_token da sessão do
 * Supabase que o app já tem). Quem valida a assinatura é o Supabase, via
 * getUser(token); a autorização em si sai da tabela `admins`, lida com o
 * próprio token do usuário — a policy "admins_le_a_propria_linha" faz a
 * consulta devolver linha só pra quem está na lista, então nem service
 * role é preciso aqui.
 *
 * Arquivos com prefixo "_" não viram rota na Vercel.
 */

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? '';

function extrairToken(request: VercelRequest): string | null {
  const header = request.headers.authorization;
  const valor = Array.isArray(header) ? header[0] : header;
  if (!valor) return null;
  const [esquema, token] = valor.split(' ');
  if (esquema?.toLowerCase() !== 'bearer' || !token) return null;
  return token.trim() || null;
}

/**
 * Responde 401/403 e devolve false quando quem chamou não é admin.
 * Devolve true (sem responder nada) quando pode seguir.
 */
export async function exigirAdmin(
  request: VercelRequest,
  response: VercelResponse
): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    // Sem credenciais não dá pra verificar nada — negar é a única opção
    // segura, e o erro precisa ser explícito pra não parecer bug de login.
    response.status(500).json({
      error:
        'Endpoint sem SUPABASE_URL/SUPABASE_ANON_KEY configurados no ambiente do servidor.',
    });
    return false;
  }

  const token = extrairToken(request);
  if (!token) {
    response.status(401).json({ error: 'É preciso estar logado como administrador.' });
    return false;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: usuario, error: erroUsuario } = await supabase.auth.getUser(token);
  if (erroUsuario || !usuario.user || usuario.user.is_anonymous) {
    response.status(401).json({ error: 'Sessão inválida ou expirada.' });
    return false;
  }

  const { data: linhas, error: erroAdmin } = await supabase.from('admins').select('email').limit(1);
  if (erroAdmin) {
    response.status(500).json({ error: `Falha ao verificar permissão: ${erroAdmin.message}` });
    return false;
  }
  if (!linhas || linhas.length === 0) {
    response.status(403).json({ error: 'Esta ação é restrita a administradores.' });
    return false;
  }

  return true;
}
