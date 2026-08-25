-- ==========================================================
-- Perfis de usuário (foto emoji + data de nascimento)
-- ==========================================================
-- Antes vivia só em localStorage, namespaced por user.id (ver
-- useUserAuth.ts) — dado por conta, mas preso ao navegador: trocar de
-- aparelho ou limpar dados apagava. Migra pra tabela própria, 1:1 com
-- auth.users, dono é o único que lê/escreve a própria linha.
create table if not exists public.perfis_usuario (
  auth_uid uuid primary key references auth.users(id) on delete cascade,
  foto_emoji text,
  data_nascimento date,
  atualizado_em timestamptz not null default now()
);

alter table public.perfis_usuario enable row level security;

drop policy if exists "perfis_usuario_dono_le" on public.perfis_usuario;
create policy "perfis_usuario_dono_le" on public.perfis_usuario
  for select using (auth.uid() = auth_uid);

drop policy if exists "perfis_usuario_dono_insere" on public.perfis_usuario;
create policy "perfis_usuario_dono_insere" on public.perfis_usuario
  for insert with check (auth.uid() = auth_uid);

drop policy if exists "perfis_usuario_dono_atualiza" on public.perfis_usuario;
create policy "perfis_usuario_dono_atualiza" on public.perfis_usuario
  for update using (auth.uid() = auth_uid) with check (auth.uid() = auth_uid);
