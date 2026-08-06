-- ==========================================================
-- Ritos do repertório (seções da missa: Entrada, Ato Penitencial, etc.)
-- ==========================================================
-- Cada repertório tem sua própria lista ordenada de "ritos" (seções),
-- pra agrupar as músicas visualmente como a ordem real da celebração.
-- Nasce com os 11 ritos padrão, mas o usuário pode adicionar outros
-- (ex: "Ofertório de Flores", "Bênção Especial") ou excluir os que não
-- vai usar naquela missa.
--
-- `repertorio_musicas.momento` era o enum `momento_missa` (fixo); vira
-- texto livre pra aceitar nomes de rito customizados — o valor guardado
-- ali é o *nome* do rito daquele item, casando com `repertorio_ritos.nome`.

alter table public.repertorio_musicas
  alter column momento type text using momento::text;

create table public.repertorio_ritos (
  id uuid primary key default gen_random_uuid(),
  repertorio_id uuid references public.repertorios(id) on delete cascade,
  nome text not null,
  ordem smallint not null,
  created_at timestamptz not null default now()
);

create index idx_repertorio_ritos_repertorio on public.repertorio_ritos (repertorio_id, ordem);

alter table public.repertorio_ritos enable row level security;

-- mesmo esquema temporário de acesso público (sem auth ainda) das outras
-- tabelas de repertório — ver migration 0003_repertorios_sem_auth.sql
create policy "acesso público temporário — repertorio_ritos (sem auth ainda)"
  on public.repertorio_ritos for all
  using (true)
  with check (true);
