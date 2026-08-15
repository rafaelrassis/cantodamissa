import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';

/**
 * "Área Admin" não tem login próprio — é o mesmo login Google do app.
 * Quem é admin sai da tabela `admins` no Supabase, a mesma fonte que as
 * policies de RLS consultam (ver 0012_admin_real_catalogo.sql): a policy
 * de leitura devolve a linha só pra quem está na lista, então "veio linha"
 * já é a resposta.
 *
 * Antes isto comparava o e-mail da sessão contra VITE_ADMIN_EMAILS, uma
 * variável do cliente — o que nunca protegeu nada (a escrita no banco
 * estava liberada pra todo mundo) e agora também estaria errado na outra
 * direção: mostrar a Área Admin pra quem o banco vai recusar.
 *
 * Continua sendo só decisão de interface. Quem autoriza é o banco.
 */
export function useAdminAuth(email: string | null) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [verificando, setVerificando] = useState(false);

  useEffect(() => {
    if (!email || !isSupabaseConfigured) {
      setIsAdmin(false);
      return;
    }

    let ativo = true;
    setVerificando(true);
    supabase
      .from('admins')
      .select('email')
      .limit(1)
      .then(({ data, error }) => {
        if (!ativo) return;
        if (error) console.error('useAdminAuth:', error.message);
        setIsAdmin(!error && (data?.length ?? 0) > 0);
        setVerificando(false);
      });

    return () => {
      ativo = false;
    };
  }, [email]);

  return { isAdmin, verificando };
}
