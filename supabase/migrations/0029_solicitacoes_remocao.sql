-- ==========================================================
-- Solicitações de remoção (notice-and-takedown)
-- ==========================================================
-- O modelo de direitos autorais do produto (ver SPEC.md, seção 8) é
-- notice-and-takedown: quem detém os direitos de uma letra/cifra pode
-- pedir a remoção, e o app se compromete a atender no prazo declarado
-- nos Termos de Uso. Isso só é real se existir um jeito de registrar o
-- pedido em algum lugar que o admin de fato veja — daí esta tabela, no
-- mesmo espírito de `submissoes` (0012_admin_real_catalogo.sql): sem
-- ela, "solicitar remoção" seria só um botão que não vai a lugar nenhum.
--
-- `musica_id`/`cantor_id` ficam nulos em cascata (on delete set null) e
-- não em cascade: o pedido é o registro de que "alguém reclamou disso",
-- que precisa sobreviver mesmo depois que o admin já removeu o conteúdo
-- (é a prova de que o prazo foi cumprido). `alvo_descricao` guarda uma
-- cópia do título/nome no momento do pedido pelo mesmo motivo — não dá
-- pra confiar que a linha original ainda vai existir pra mostrar isso.
create table if not exists public.solicitacoes_remocao (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pendente' check (status in ('pendente', 'concluida', 'rejeitada')),
  alvo_tipo text not null check (alvo_tipo in ('musica', 'cantor')),
  musica_id uuid references public.musicas(id) on delete set null,
  cantor_id uuid references public.cantores(id) on delete set null,
  alvo_descricao text not null,
  solicitante_nome text not null,
  solicitante_email text not null,
  motivo text not null,
  resposta_admin text not null default '',
  autor_auth_uid uuid,
  criado_em timestamptz not null default now()
);
create index if not exists idx_solicitacoes_remocao_status
  on public.solicitacoes_remocao (status, criado_em desc);

alter table public.solicitacoes_remocao enable row level security;

-- Só admin lê: diferente de `submissoes`, aqui não faz sentido o
-- solicitante "ver a própria linha" (não é um crédito público, é uma
-- reclamação, geralmente contendo e-mail de terceiro).
drop policy if exists "solicitacoes_remocao_select_admin" on public.solicitacoes_remocao;
create policy "solicitacoes_remocao_select_admin" on public.solicitacoes_remocao
  for select using (public.eh_admin_global());

-- Igual a `submissoes`: exige sessão (anônima ou não) pra dificultar
-- spam automatizado direto na API — não impede um humano mal-intencionado,
-- mas tira o caso trivial de script sem custo nenhum de sessão.
drop policy if exists "solicitacoes_remocao_insert_autenticado" on public.solicitacoes_remocao;
create policy "solicitacoes_remocao_insert_autenticado" on public.solicitacoes_remocao
  for insert with check (auth.uid() is not null and autor_auth_uid = auth.uid());

drop policy if exists "solicitacoes_remocao_admin_modera" on public.solicitacoes_remocao;
create policy "solicitacoes_remocao_admin_modera" on public.solicitacoes_remocao
  for update using (public.eh_admin_global()) with check (public.eh_admin_global());
drop policy if exists "solicitacoes_remocao_admin_exclui" on public.solicitacoes_remocao;
create policy "solicitacoes_remocao_admin_exclui" on public.solicitacoes_remocao
  for delete using (public.eh_admin_global());
