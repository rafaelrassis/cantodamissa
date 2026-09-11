-- ==========================================================
-- Tokens de push por dispositivo
-- ==========================================================
-- O alerta de solicitação de ingresso só existia com o app aberto: quem
-- administra o ministério não tinha como saber que alguém pediu pra
-- entrar enquanto o celular estava no bolso. Esta tabela guarda o token
-- FCM de cada aparelho pra que /api/notificar-solicitacao consiga
-- avisar (ver api/notificar-solicitacao.ts).
--
-- O token é a chave: o mesmo aparelho reinstalando o app recebe um token
-- novo, e o antigo é apagado pelo endpoint quando o FCM responde que não
-- existe mais.
--
-- Ninguém lê token de ninguém — nem admin do ministério. O envio é feito
-- pelo servidor com a service role, que passa por cima da RLS; a policy
-- aqui existe pro dispositivo cadastrar e apagar o próprio registro.

create table if not exists public.dispositivos_push (
  token text primary key,
  auth_uid uuid not null,
  plataforma text not null default 'android',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists dispositivos_push_auth_uid_idx
  on public.dispositivos_push (auth_uid);

alter table public.dispositivos_push enable row level security;

drop policy if exists "dispositivos_push_dono_le" on public.dispositivos_push;
create policy "dispositivos_push_dono_le" on public.dispositivos_push
  for select using (auth_uid = auth.uid());

drop policy if exists "dispositivos_push_dono_cadastra" on public.dispositivos_push;
create policy "dispositivos_push_dono_cadastra" on public.dispositivos_push
  for insert with check (auth_uid = auth.uid());

-- O upsert do app cai aqui quando o mesmo token é reenviado (o plugin
-- reemite o token a cada abertura).
drop policy if exists "dispositivos_push_dono_atualiza" on public.dispositivos_push;
create policy "dispositivos_push_dono_atualiza" on public.dispositivos_push
  for update using (auth_uid = auth.uid()) with check (auth_uid = auth.uid());

drop policy if exists "dispositivos_push_dono_apaga" on public.dispositivos_push;
create policy "dispositivos_push_dono_apaga" on public.dispositivos_push
  for delete using (auth_uid = auth.uid());
