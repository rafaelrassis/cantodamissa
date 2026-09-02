import { createClient } from '@supabase/supabase-js';

// Fallback pro projeto real: a publishable key é segura de expor (é o que
// já vai em todo build web público, protegida por RLS), então builds que
// esquecerem de definir VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY (ex.:
// `npm run android:sync` local sem .env) continuam funcionando em vez de
// cair num client mock quebrado.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://cmgqkzgicjeblckeqyvw.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_0JOqZ4g46Z1Fo3_eHxQ5mw_Y4Z7C_gC';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// flowType 'pkce': no fluxo implícito o provider devolve o access_token no
// fragmento da URL de retorno, e no Android essa URL é um deep link de
// esquema próprio (app.cantodamissa.mobile://) que qualquer outro app
// instalado pode declarar também — quem chegasse primeiro ficaria com o
// token. Com PKCE volta só um código de uso único, que sem o verifier
// guardado neste app não vale nada.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { flowType: 'pkce' },
});
