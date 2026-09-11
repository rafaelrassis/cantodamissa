-- ==========================================================
-- Realtime: escalas, participantes e avisos
-- ==========================================================
-- Complemento de 0031. Duas pessoas montando a mesma escala, ou um
-- integrante confirmando presença enquanto o admin olha a tela, agora se
-- veem sem esperar a revalidação por intervalo.
--
-- `escala_participantes` entra junto porque a confirmação de presença
-- (status) mora lá, não em `escalas` — sem ela o evento mais frequente do
-- módulo ficaria de fora.
--
-- RLS de select (0013) continua decidindo quem recebe cada linha.

do $$
declare
  t text;
begin
  foreach t in array array['escalas', 'escala_participantes', 'avisos'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end
$$;
