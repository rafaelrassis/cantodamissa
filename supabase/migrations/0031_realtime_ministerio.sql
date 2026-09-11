-- ==========================================================
-- Realtime: solicitações de ingresso e membros
-- ==========================================================
-- O app só buscava esses dados ao montar (e, desde useRevalidarEmFoco,
-- também ao voltar pro primeiro plano e por intervalo). Faltava o
-- imediato: admin com o app aberto não via a solicitação chegar, e quem
-- pediu ingresso não via a aprovação acontecer.
--
-- Só estas duas tabelas entram na publication — é o que precisa ser
-- instantâneo. O resto (escalas, avisos) continua por revalidação, que
-- não gasta conexão de Realtime.
--
-- RLS continua valendo: o Realtime avalia as policies de select com o JWT
-- de cada assinante antes de entregar INSERT/UPDATE, então um assinante
-- só recebe a linha que já poderia ler por query (ver 0013). Eventos de
-- DELETE carregam apenas a PK.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'solicitacoes_ingresso'
  ) then
    alter publication supabase_realtime add table public.solicitacoes_ingresso;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'ministerio_membros'
  ) then
    alter publication supabase_realtime add table public.ministerio_membros;
  end if;
end
$$;
