-- ==========================================================
-- Templates de repertório do Ministério
-- ==========================================================
-- Pra missas cujas músicas se repetem (ex: "Missa dominical"), o
-- ministério monta um template uma vez — mesma forma de um repertório
-- (ritos + músicas) mas sem vínculo com Escala nenhuma — e aplica nos
-- repertórios dos eventos, em vez de escolher música por música toda
-- semana (ver AplicarTemplateSheet, oferecido ao criar o repertório de
-- uma Escala nova quando o ministério já tem algum template).
--
-- Schema espelha repertorio_ritos/repertorio_musicas (mesmo par
-- ritos+músicas ordenados por `ordem`), só que preso a um
-- repertorio_templates escopado por ministerio_id em vez de a um
-- repertorio avulso. RLS segue o padrão já consolidado em 0013 pras
-- demais tabelas do módulo: leitura de membro, escrita só admin.

create table if not exists public.repertorio_templates (
  id uuid primary key default gen_random_uuid(),
  ministerio_id uuid not null references public.ministerios(id) on delete cascade,
  nome text not null,
  criado_em timestamptz not null default now()
);
create index if not exists idx_repertorio_templates_ministerio on public.repertorio_templates (ministerio_id);

create table if not exists public.repertorio_template_ritos (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.repertorio_templates(id) on delete cascade,
  nome text not null,
  ordem int not null default 0
);
create index if not exists idx_repertorio_template_ritos_template on public.repertorio_template_ritos (template_id);

create table if not exists public.repertorio_template_musicas (
  template_id uuid not null references public.repertorio_templates(id) on delete cascade,
  musica_id uuid not null references public.musicas(id) on delete cascade,
  momento text,
  tom_escolhido text,
  ordem int not null default 0,
  primary key (template_id, musica_id)
);
create index if not exists idx_repertorio_template_musicas_template on public.repertorio_template_musicas (template_id);

alter table public.repertorio_templates enable row level security;
alter table public.repertorio_template_ritos enable row level security;
alter table public.repertorio_template_musicas enable row level security;

create policy "repertorio_templates_select_membro" on public.repertorio_templates
  for select using (public.eh_membro(ministerio_id));
create policy "repertorio_templates_admin_escreve" on public.repertorio_templates
  for all using (public.eh_admin(ministerio_id)) with check (public.eh_admin(ministerio_id));

create policy "repertorio_template_ritos_select_membro" on public.repertorio_template_ritos
  for select using (
    public.eh_membro((select ministerio_id from public.repertorio_templates where id = repertorio_template_ritos.template_id))
  );
create policy "repertorio_template_ritos_admin_escreve" on public.repertorio_template_ritos
  for all
  using (public.eh_admin((select ministerio_id from public.repertorio_templates where id = repertorio_template_ritos.template_id)))
  with check (public.eh_admin((select ministerio_id from public.repertorio_templates where id = repertorio_template_ritos.template_id)));

create policy "repertorio_template_musicas_select_membro" on public.repertorio_template_musicas
  for select using (
    public.eh_membro((select ministerio_id from public.repertorio_templates where id = repertorio_template_musicas.template_id))
  );
create policy "repertorio_template_musicas_admin_escreve" on public.repertorio_template_musicas
  for all
  using (public.eh_admin((select ministerio_id from public.repertorio_templates where id = repertorio_template_musicas.template_id)))
  with check (public.eh_admin((select ministerio_id from public.repertorio_templates where id = repertorio_template_musicas.template_id)));
