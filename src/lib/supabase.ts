import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.warn(
    'VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY não definidos — o app usa dados mock (ver musicasApi.ts).'
  );
}

// Cliente é sempre criado (com string vazia se não configurado) pra evitar
// checagem de null espalhada pelo app; `isSupabaseConfigured` é o guard real
// usado em musicasApi.ts antes de qualquer query.
//
// flowType 'pkce': no fluxo implícito o provider devolve o access_token no
// fragmento da URL de retorno, e no Android essa URL é um deep link de
// esquema próprio (com.cantodamissa.app://) que qualquer outro app
// instalado pode declarar também — quem chegasse primeiro ficaria com o
// token. Com PKCE volta só um código de uso único, que sem o verifier
// guardado neste app não vale nada.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  { auth: { flowType: 'pkce' } }
);
