-- Reproduz os grants padrão que o Supabase aplica no schema public: sem RLS
-- habilitada, anon já tem CRUD completo — é justamente por isso que "tabela
-- sem RLS" equivale a tabela aberta na internet.
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all functions in schema public to anon, authenticated, service_role;
