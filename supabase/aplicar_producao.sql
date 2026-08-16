-- ==========================================================
-- Canto da Missa — pacote de segurança (migrations 0012 a 0017)
-- ==========================================================
-- Arquivo gerado a partir de supabase/migrations/0012..0017 para ser
-- colado de uma vez no SQL Editor do Supabase. É idêntico aos arquivos
-- individuais, na mesma ordem; se preferir, aplique um por um.
--
-- Rodar isto NÃO cria administrador nenhum. Depois de aplicar, cadastre
-- o seu e-mail (ver o final do arquivo), senão ninguém consegue mais
-- cadastrar música — inclusive você.
--
-- Pode rodar de novo sem medo: está tudo em create/drop ... if exists,
-- create or replace ou bloco condicional. Vai dentro de uma transação,
-- então ou passa inteiro ou não muda nada.
--
-- Duas partes mexem em dado existente:
--
--   * a conversão de repertorios.escala_id para uuid (0014): vínculos que
--     apontam pra escalas inexistentes (ids do protótipo antigo, tipo
--     "e169...") viram nulos, e o repertório passa a ser avulso em vez de
--     ligado a uma escala que não existe;
--
--   * o backfill de repertórios de escala (0017): toda escala que ainda
--     não tem repertório ganha um, vazio, com os 11 ritos padrão. Só
--     insere o que falta — rodar de novo não duplica nada.
-- ==========================================================

begin;


-- ==========================================================
-- supabase/migrations/0012_admin_real_catalogo.sql
-- ==========================================================
-- ==========================================================
-- Escrita do catálogo restrita a admin de verdade
-- ==========================================================
-- Substitui as policies "acesso público temporário" de 0005/0007, que
-- liberavam insert/update/delete de `musicas` e `cantores` pro role
-- `anon`. Como a anon key vai no bundle do front, aquilo significava que
-- qualquer visitante podia reescrever ou apagar o acervo inteiro com uma
-- chamada direta ao PostgREST — a checagem de admin do app
-- (useAdminAuth.ts + VITE_ADMIN_EMAILS) nunca passou de enfeite de UI.
--
-- O login Google já é real (ver src/lib/useAuth.ts), então dá pra decidir
-- "é admin?" a partir do e-mail assinado dentro do JWT em vez de confiar
-- em variável de ambiente do cliente.
--
-- IMPORTANTE — passo manual depois de aplicar esta migration: popular a
-- tabela `admins` com os e-mails que hoje estão em VITE_ADMIN_EMAILS,
-- senão ninguém consegue mais cadastrar música:
--
--   insert into public.admins (email) values ('voce@gmail.com');
--
-- (rodar pelo SQL Editor do dashboard, que usa a service role e ignora RLS)

create table if not exists public.admins (
  email text primary key,
  criado_em timestamptz not null default now()
);

alter table public.admins enable row level security;

-- Cada um só enxerga a própria linha: dá pro app perguntar "sou admin?"
-- sem expor a lista de administradores pra quem quiser lê-la.
drop policy if exists "admins_le_a_propria_linha" on public.admins;
create policy "admins_le_a_propria_linha" on public.admins
  for select using (lower(email) = lower(nullif(auth.jwt() ->> 'email', '')));

-- Alteração da lista é só pela service role (dashboard/SQL editor): sem
-- policy de insert/update/delete, o PostgREST barra todo mundo.

create or replace function public.eh_admin_global()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins a
    where lower(a.email) = lower(nullif(auth.jwt() ->> 'email', ''))
  );
$$;

-- ----------------------------------------------------------
-- musicas: leitura pública (é um app de cifras), escrita só admin
-- ----------------------------------------------------------
drop policy if exists "acesso público temporário — musicas (sem auth ainda)" on public.musicas;
drop policy if exists "acesso público temporário — musicas update (sem auth ainda)" on public.musicas;
drop policy if exists "acesso público temporário — musicas delete (sem auth ainda)" on public.musicas;

drop policy if exists "musicas_admin_insere" on public.musicas;
create policy "musicas_admin_insere" on public.musicas
  for insert with check (public.eh_admin_global());
drop policy if exists "musicas_admin_altera" on public.musicas;
create policy "musicas_admin_altera" on public.musicas
  for update using (public.eh_admin_global()) with check (public.eh_admin_global());
drop policy if exists "musicas_admin_exclui" on public.musicas;
create policy "musicas_admin_exclui" on public.musicas
  for delete using (public.eh_admin_global());

-- ----------------------------------------------------------
-- cantores: idem
-- ----------------------------------------------------------
drop policy if exists "acesso público temporário — cantores (sem auth ainda)" on public.cantores;
drop policy if exists "acesso público temporário — cantores update (sem auth ainda)" on public.cantores;
drop policy if exists "acesso público temporário — cantores delete (sem auth ainda)" on public.cantores;

drop policy if exists "cantores_admin_insere" on public.cantores;
create policy "cantores_admin_insere" on public.cantores
  for insert with check (public.eh_admin_global());
drop policy if exists "cantores_admin_altera" on public.cantores;
create policy "cantores_admin_altera" on public.cantores
  for update using (public.eh_admin_global()) with check (public.eh_admin_global());
drop policy if exists "cantores_admin_exclui" on public.cantores;
create policy "cantores_admin_exclui" on public.cantores
  for delete using (public.eh_admin_global());

-- ----------------------------------------------------------
-- Tabelas que nunca tiveram RLS ligada (0001_init.sql só habilitou em 5
-- das 10 tabelas criadas lá). Sem `enable row level security`, o grant
-- padrão do Supabase pro role anon já dá CRUD completo — ou seja,
-- estavam abertas pra escrita mesmo com o app inteiro correto.
-- ----------------------------------------------------------
alter table public.musica_acordes enable row level security;
alter table public.musica_tempo_liturgico enable row level security;
alter table public.musica_ciclo enable row level security;
alter table public.musica_momento enable row level security;
alter table public.domingos enable row level security;

drop policy if exists "musica_acordes_select_publico" on public.musica_acordes;
create policy "musica_acordes_select_publico" on public.musica_acordes for select using (true);
drop policy if exists "musica_acordes_admin_escreve" on public.musica_acordes;
create policy "musica_acordes_admin_escreve" on public.musica_acordes for all
  using (public.eh_admin_global()) with check (public.eh_admin_global());

drop policy if exists "musica_tempo_select_publico" on public.musica_tempo_liturgico;
create policy "musica_tempo_select_publico" on public.musica_tempo_liturgico for select using (true);
drop policy if exists "musica_tempo_admin_escreve" on public.musica_tempo_liturgico;
create policy "musica_tempo_admin_escreve" on public.musica_tempo_liturgico for all
  using (public.eh_admin_global()) with check (public.eh_admin_global());

drop policy if exists "musica_ciclo_select_publico" on public.musica_ciclo;
create policy "musica_ciclo_select_publico" on public.musica_ciclo for select using (true);
drop policy if exists "musica_ciclo_admin_escreve" on public.musica_ciclo;
create policy "musica_ciclo_admin_escreve" on public.musica_ciclo for all
  using (public.eh_admin_global()) with check (public.eh_admin_global());

drop policy if exists "musica_momento_select_publico" on public.musica_momento;
create policy "musica_momento_select_publico" on public.musica_momento for select using (true);
drop policy if exists "musica_momento_admin_escreve" on public.musica_momento;
create policy "musica_momento_admin_escreve" on public.musica_momento for all
  using (public.eh_admin_global()) with check (public.eh_admin_global());

drop policy if exists "domingos_select_publico" on public.domingos;
create policy "domingos_select_publico" on public.domingos for select using (true);
drop policy if exists "domingos_admin_escreve" on public.domingos;
create policy "domingos_admin_escreve" on public.domingos for all
  using (public.eh_admin_global()) with check (public.eh_admin_global());

-- `profiles` já tinha RLS com select do próprio perfil; faltava permitir
-- que a pessoa criasse/editasse a própria linha.
drop policy if exists "profiles_insere_o_proprio" on public.profiles;
create policy "profiles_insere_o_proprio" on public.profiles
  for insert with check (auth.uid() = id);
drop policy if exists "profiles_altera_o_proprio" on public.profiles;
create policy "profiles_altera_o_proprio" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- ----------------------------------------------------------
-- Contador de acessos
-- ----------------------------------------------------------
-- views_count é a base do "Top 50", das "Músicas em alta" e dos
-- "Artistas mais ouvidos", mas nada no app jamais incrementava a coluna —
-- os rankings ordenavam por um número congelado no seed. Agora que
-- `musicas` só aceita escrita de admin, o incremento precisa de uma
-- função security definer: ela sobe só esse contador, sem abrir o resto
-- da linha. Não há proteção contra chamar em loop pra inflar o número —
-- pra essa fase do produto o custo/benefício de rate limit não compensa.
create or replace function public.registrar_visualizacao(p_musica_id uuid)
returns void
language sql
volatile
security definer
set search_path = public
as $$
  update public.musicas set views_count = views_count + 1 where id = p_musica_id;
$$;

grant execute on function public.registrar_visualizacao(uuid) to anon, authenticated;

-- ----------------------------------------------------------
-- Submissões da comunidade (sugestão de música nova / correção de cifra)
-- ----------------------------------------------------------
-- Antes isso vivia só em localStorage (src/lib/submissoes.ts), o que
-- significava que a tela de moderação do admin só enxergava o que tinha
-- sido enviado no próprio navegador dele: nenhuma sugestão de usuário
-- real chegava a ser moderada.
create table if not exists public.submissoes (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('nova', 'correcao')),
  status text not null default 'pendente' check (status in ('pendente', 'aprovada', 'rejeitada')),
  autor_nome text not null default '',
  autor_auth_uid uuid,
  musica_original_id uuid references public.musicas(id) on delete set null,
  title text not null,
  artist text not null default '',
  original_tone text not null default '',
  chords_content text not null default '',
  observacao text not null default '',
  criado_em timestamptz not null default now()
);
create index if not exists idx_submissoes_status on public.submissoes (status, criado_em desc);

alter table public.submissoes enable row level security;

-- Quem enviou vê a própria sugestão (pra saber se foi aprovada); admin vê
-- todas. Autoria de sugestão aprovada aparece nos créditos da cifra, então
-- o autor_nome de aprovadas também é público.
drop policy if exists "submissoes_select" on public.submissoes;
create policy "submissoes_select" on public.submissoes
  for select using (
    public.eh_admin_global()
    or (autor_auth_uid is not null and autor_auth_uid = auth.uid())
    or status = 'aprovada'
  );
drop policy if exists "submissoes_insert_autenticado" on public.submissoes;
create policy "submissoes_insert_autenticado" on public.submissoes
  for insert with check (auth.uid() is not null and autor_auth_uid = auth.uid());
drop policy if exists "submissoes_admin_modera" on public.submissoes;
create policy "submissoes_admin_modera" on public.submissoes
  for update using (public.eh_admin_global()) with check (public.eh_admin_global());
drop policy if exists "submissoes_admin_exclui" on public.submissoes;
create policy "submissoes_admin_exclui" on public.submissoes
  for delete using (public.eh_admin_global());

-- ==========================================================
-- supabase/migrations/0013_ministerio_rls_por_membro.sql
-- ==========================================================
-- ==========================================================
-- Ministério: fecha as brechas de escalonamento e a leitura pública
-- ==========================================================
-- Duas falhas graves nas policies de 0011 (reproduzidas em
-- supabase/test/rls_ministerio.sql):
--
-- 1) `membros_insert_self_ou_admin` permitia inserir uma linha de membro
--    com `admin = true` desde que `auth_uid = auth.uid()`. Como
--    `ministerios` tinha select público, qualquer visitante lia o id de
--    um ministério, abria uma sessão anônima e se inseria como admin
--    dele — ganhando poder de apagar escalas, membros e o ministério.
--
-- 2) `membros_vincula_auth_uid_legado` (o self-heal de linhas antigas)
--    dava UPDATE em qualquer linha com auth_uid nulo sem restringir as
--    demais colunas — dava pra reivindicar a linha E se promover a admin
--    no mesmo comando. Policies do mesmo comando são OR'd, então essa
--    valia como bypass da policy de admin ao lado.
--
-- Além disso, tudo no módulo tinha `select using (true)`: nomes,
-- aniversários, avisos e escalas de qualquer ministério eram legíveis por
-- qualquer um com a anon key.
--
-- A correção troca "confia no que o cliente mandou" por três coisas:
-- leitura restrita a membros, escrita de estruturas restrita a admin, e
-- os fluxos que precisam furar isso (fundar ministério, pedir ingresso,
-- aprovar, vincular device antigo) viram RPC `security definer` — que
-- valida a regra do lado do banco em vez de depender da policy.

-- ----------------------------------------------------------
-- Helpers
-- ----------------------------------------------------------
create or replace function public.eh_membro(p_ministerio_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.ministerio_membros
    where ministerio_id = p_ministerio_id
      and auth_uid is not null
      and auth_uid = auth.uid()
  );
$$;

-- Usada nas policies de insert de membro: só o fundador entra sozinho, e
-- só enquanto o ministério ainda não tem ninguém. Precisa ser security
-- definer porque uma subquery na própria tabela dentro da policy dela
-- mesma dispara recursão infinita de RLS.
create or replace function public.ministerio_esta_vazio(p_ministerio_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.ministerio_membros where ministerio_id = p_ministerio_id
  );
$$;

-- ----------------------------------------------------------
-- Trigger: colunas de poder só mudam por mão de admin
-- ----------------------------------------------------------
-- RLS decide linha, não coluna. Como o próprio membro precisa poder
-- editar nome/avatar/aniversário da própria linha, a garantia de que ele
-- não se promove a admin (nem se muda de ministério, nem rouba a linha de
-- outro auth_uid) fica neste trigger.
create or replace function public.protege_colunas_membro()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.eh_admin(old.ministerio_id) then
    return new;
  end if;
  if new.admin is distinct from old.admin then
    raise exception 'só admin do ministério pode alterar o campo admin';
  end if;
  if new.ministerio_id is distinct from old.ministerio_id then
    raise exception 'não é possível mover um membro de ministério';
  end if;
  if new.auth_uid is distinct from old.auth_uid then
    raise exception 'não é possível alterar o vínculo de conta de um membro';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protege_colunas_membro on public.ministerio_membros;
create trigger trg_protege_colunas_membro
  before update on public.ministerio_membros
  for each row execute function public.protege_colunas_membro();

-- ----------------------------------------------------------
-- ministerios
-- ----------------------------------------------------------
drop policy if exists "ministerios_select_publico" on public.ministerios;
drop policy if exists "ministerios_insert_livre" on public.ministerios;
drop policy if exists "ministerios_admin_altera" on public.ministerios;
drop policy if exists "ministerios_admin_exclui" on public.ministerios;

drop policy if exists "ministerios_select_membro" on public.ministerios;
create policy "ministerios_select_membro" on public.ministerios
  for select using (public.eh_membro(id));
-- Criar ministério é livre, mas a linha nasce órfã: só vira "meu" quando
-- o membro fundador é inserido (ver policy membros_insert_fundador). O
-- app faz os dois passos dentro de public.criar_ministerio().
drop policy if exists "ministerios_insert_livre" on public.ministerios;
create policy "ministerios_insert_livre" on public.ministerios
  for insert with check (true);
drop policy if exists "ministerios_admin_altera" on public.ministerios;
create policy "ministerios_admin_altera" on public.ministerios
  for update using (public.eh_admin(id)) with check (public.eh_admin(id));
drop policy if exists "ministerios_admin_exclui" on public.ministerios;
create policy "ministerios_admin_exclui" on public.ministerios
  for delete using (public.eh_admin(id));

-- ----------------------------------------------------------
-- ministerio_membros
-- ----------------------------------------------------------
drop policy if exists "membros_select_publico" on public.ministerio_membros;
drop policy if exists "membros_insert_self_ou_admin" on public.ministerio_membros;
drop policy if exists "membros_admin_altera" on public.ministerio_membros;
drop policy if exists "membros_vincula_auth_uid_legado" on public.ministerio_membros;
drop policy if exists "membros_admin_remove" on public.ministerio_membros;
drop policy if exists "membros_sai_sozinho" on public.ministerio_membros;

-- Leitura: a equipe se enxerga; e a própria linha sempre (necessário pro
-- app descobrir a que ministérios a conta pertence).
drop policy if exists "membros_select_equipe" on public.ministerio_membros;
create policy "membros_select_equipe" on public.ministerio_membros
  for select using (
    (auth_uid is not null and auth_uid = auth.uid())
    or public.eh_membro(ministerio_id)
  );

-- Entrar sozinho só como fundador do ministério recém-criado. Todo o
-- resto (aprovar solicitação) passa por public.aprovar_solicitacao().
drop policy if exists "membros_insert_fundador" on public.ministerio_membros;
create policy "membros_insert_fundador" on public.ministerio_membros
  for insert with check (
    auth_uid is not null
    and auth_uid = auth.uid()
    and public.ministerio_esta_vazio(ministerio_id)
  );

drop policy if exists "membros_admin_altera" on public.ministerio_membros;
create policy "membros_admin_altera" on public.ministerio_membros
  for update using (public.eh_admin(ministerio_id)) with check (public.eh_admin(ministerio_id));
-- O próprio membro edita a própria linha; o trigger acima garante que
-- `admin`, `ministerio_id` e `auth_uid` continuam fora do alcance dele.
drop policy if exists "membros_edita_a_propria_linha" on public.ministerio_membros;
create policy "membros_edita_a_propria_linha" on public.ministerio_membros
  for update using (auth_uid is not null and auth_uid = auth.uid())
  with check (auth_uid is not null and auth_uid = auth.uid());

drop policy if exists "membros_admin_remove" on public.ministerio_membros;
create policy "membros_admin_remove" on public.ministerio_membros
  for delete using (public.eh_admin(ministerio_id));
drop policy if exists "membros_sai_sozinho" on public.ministerio_membros;
create policy "membros_sai_sozinho" on public.ministerio_membros
  for delete using (auth_uid is not null and auth_uid = auth.uid());

-- ----------------------------------------------------------
-- solicitacoes_ingresso
-- ----------------------------------------------------------
drop policy if exists "solicitacoes_select_publico" on public.solicitacoes_ingresso;
drop policy if exists "solicitacoes_insert_livre" on public.solicitacoes_ingresso;
drop policy if exists "solicitacoes_admin_resolve" on public.solicitacoes_ingresso;

drop policy if exists "solicitacoes_select_admin_ou_autor" on public.solicitacoes_ingresso;
create policy "solicitacoes_select_admin_ou_autor" on public.solicitacoes_ingresso
  for select using (
    public.eh_admin(ministerio_id)
    or (auth_uid is not null and auth_uid = auth.uid())
  );
-- Insert só via public.solicitar_ingresso(): sem select público em
-- `ministerios`, o cliente nem consegue mais resolver código -> id sozinho.
drop policy if exists "solicitacoes_admin_resolve" on public.solicitacoes_ingresso;
create policy "solicitacoes_admin_resolve" on public.solicitacoes_ingresso
  for delete using (
    public.eh_admin(ministerio_id)
    or (auth_uid is not null and auth_uid = auth.uid())
  );

-- ----------------------------------------------------------
-- Demais tabelas do ministério: leitura de membro, escrita de admin
-- ----------------------------------------------------------
drop policy if exists "funcoes_select_publico" on public.funcoes;
drop policy if exists "funcoes_select_membro" on public.funcoes;
create policy "funcoes_select_membro" on public.funcoes for select using (public.eh_membro(ministerio_id));

drop policy if exists "membro_funcoes_select_publico" on public.membro_funcoes;
drop policy if exists "membro_funcoes_select_membro" on public.membro_funcoes;
create policy "membro_funcoes_select_membro" on public.membro_funcoes for select
  using (public.eh_membro((select ministerio_id from public.funcoes where id = membro_funcoes.funcao_id)));

drop policy if exists "avisos_select_publico" on public.avisos;
drop policy if exists "avisos_select_membro" on public.avisos;
create policy "avisos_select_membro" on public.avisos for select using (public.eh_membro(ministerio_id));

drop policy if exists "equipes_select_publico" on public.equipes;
drop policy if exists "equipes_select_membro" on public.equipes;
create policy "equipes_select_membro" on public.equipes for select using (public.eh_membro(ministerio_id));

drop policy if exists "equipe_membros_select_publico" on public.equipe_membros;
drop policy if exists "equipe_membros_select_membro" on public.equipe_membros;
create policy "equipe_membros_select_membro" on public.equipe_membros for select
  using (public.eh_membro((select ministerio_id from public.equipes where id = equipe_membros.equipe_id)));

drop policy if exists "modelos_roteiro_select_publico" on public.modelos_roteiro;
drop policy if exists "modelos_roteiro_select_membro" on public.modelos_roteiro;
create policy "modelos_roteiro_select_membro" on public.modelos_roteiro for select
  using (public.eh_membro(ministerio_id));

drop policy if exists "modelo_roteiro_itens_select_publico" on public.modelo_roteiro_itens;
drop policy if exists "modelo_roteiro_itens_select_membro" on public.modelo_roteiro_itens;
create policy "modelo_roteiro_itens_select_membro" on public.modelo_roteiro_itens for select
  using (public.eh_membro((select ministerio_id from public.modelos_roteiro where id = modelo_roteiro_itens.modelo_id)));

drop policy if exists "escalas_select_publico" on public.escalas;
drop policy if exists "escalas_select_membro" on public.escalas;
create policy "escalas_select_membro" on public.escalas for select using (public.eh_membro(ministerio_id));

drop policy if exists "roteiro_itens_select_publico" on public.roteiro_itens;
drop policy if exists "roteiro_itens_select_membro" on public.roteiro_itens;
create policy "roteiro_itens_select_membro" on public.roteiro_itens for select
  using (public.eh_membro((select ministerio_id from public.escalas where id = roteiro_itens.escala_id)));

drop policy if exists "participantes_select_publico" on public.escala_participantes;
drop policy if exists "participantes_select_membro" on public.escala_participantes;
create policy "participantes_select_membro" on public.escala_participantes for select
  using (public.eh_membro((select ministerio_id from public.escalas where id = escala_participantes.escala_id)));

drop policy if exists "indisponibilidades_select_publico" on public.indisponibilidades;
drop policy if exists "indisponibilidades_select_membro" on public.indisponibilidades;
create policy "indisponibilidades_select_membro" on public.indisponibilidades for select
  using (public.eh_membro(ministerio_id));

-- ----------------------------------------------------------
-- RPCs dos fluxos que precisam furar as policies acima
-- ----------------------------------------------------------

/** Limite de ministérios por conta — espelha LIMITE_MINISTERIOS no app. */
create or replace function public.limite_ministerios()
returns integer language sql immutable as $$ select 5 $$;

create or replace function public.gerar_codigo_convite()
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  alfabeto constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidato text;
  i integer;
begin
  -- tenta até achar um código livre: o espaço é pequeno (32^4), então
  -- colidir é plausível e o unique da coluna derrubaria o insert.
  for tentativa in 1..50 loop
    candidato := 'CDM-';
    for i in 1..4 loop
      candidato := candidato || substr(alfabeto, 1 + floor(random() * length(alfabeto))::int, 1);
    end loop;
    if not exists (select 1 from public.ministerios where codigo_convite = candidato) then
      return candidato;
    end if;
  end loop;
  raise exception 'não foi possível gerar um código de convite livre';
end;
$$;

/**
 * Funda um ministério: cria a linha, o membro admin e as funções numa
 * transação só. Antes isso eram três inserts soltos no cliente — se o
 * segundo falhasse, sobrava um ministério fantasma sem dono (e sem dono
 * ninguém consegue apagar, porque delete exige eh_admin).
 */
create or replace function public.criar_ministerio(
  p_nome text,
  p_device_key text,
  p_nome_membro text default 'Você',
  p_aniversario date default null,
  p_funcoes jsonb default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_qtd integer;
begin
  if v_uid is null then
    raise exception 'é preciso uma sessão ativa pra criar um ministério';
  end if;

  select count(*) into v_qtd from public.ministerio_membros where auth_uid = v_uid;
  if v_qtd >= public.limite_ministerios() then
    raise exception 'LIMITE_MINISTERIOS';
  end if;

  insert into public.ministerios (nome, codigo_convite, criado_por_device_key)
  values (p_nome, public.gerar_codigo_convite(), p_device_key)
  returning id into v_id;

  insert into public.ministerio_membros (ministerio_id, device_key, auth_uid, nome, avatar_cor, admin, aniversario)
  values (v_id, p_device_key, v_uid, coalesce(nullif(p_nome_membro, ''), 'Você'), 'bg-teal-500', true, p_aniversario);

  insert into public.funcoes (ministerio_id, nome, icone)
  select v_id, item ->> 'nome', coalesce(item ->> 'icone', '🎵')
  from jsonb_array_elements(coalesce(p_funcoes, '[]'::jsonb)) as item;

  return v_id;
end;
$$;

/**
 * Pede ingresso por código. Resolve código -> ministério do lado do banco
 * (o cliente não enxerga mais `ministerios` de que não participa) e
 * devolve um status pro app traduzir em mensagem.
 */
create or replace function public.solicitar_ingresso(
  p_codigo text,
  p_nome text,
  p_device_key text
)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ministerio_id uuid;
  v_qtd integer;
begin
  if v_uid is null then
    raise exception 'é preciso uma sessão ativa pra pedir ingresso';
  end if;

  select id into v_ministerio_id from public.ministerios
   where codigo_convite = upper(trim(p_codigo));
  if v_ministerio_id is null then
    return 'CODIGO_INVALIDO';
  end if;

  if exists (select 1 from public.ministerio_membros
              where ministerio_id = v_ministerio_id and auth_uid = v_uid) then
    return 'JA_MEMBRO';
  end if;

  select count(*) into v_qtd from public.ministerio_membros where auth_uid = v_uid;
  if v_qtd >= public.limite_ministerios() then
    return 'LIMITE_MINISTERIOS';
  end if;

  if exists (select 1 from public.solicitacoes_ingresso
              where ministerio_id = v_ministerio_id and auth_uid = v_uid and status = 'pendente') then
    return 'JA_SOLICITADO';
  end if;

  insert into public.solicitacoes_ingresso (ministerio_id, device_key, auth_uid, nome, codigo_usado)
  values (v_ministerio_id, p_device_key, v_uid, p_nome, upper(trim(p_codigo)));

  return 'OK';
end;
$$;

/**
 * Aprova uma solicitação: cria o membro (sempre não-admin) e apaga a
 * solicitação. Só admin do ministério em questão.
 */
create or replace function public.aprovar_solicitacao(p_solicitacao_id uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_sol public.solicitacoes_ingresso;
  v_membro_id uuid;
begin
  select * into v_sol from public.solicitacoes_ingresso where id = p_solicitacao_id;
  if v_sol.id is null then
    raise exception 'solicitação não encontrada';
  end if;
  if not public.eh_admin(v_sol.ministerio_id) then
    raise exception 'só admin do ministério pode aprovar ingresso';
  end if;

  insert into public.ministerio_membros (ministerio_id, device_key, auth_uid, nome, avatar_cor, admin)
  values (v_sol.ministerio_id, v_sol.device_key, v_sol.auth_uid, v_sol.nome, 'bg-slate-500', false)
  on conflict (ministerio_id, device_key) do update set auth_uid = excluded.auth_uid
  returning id into v_membro_id;

  delete from public.solicitacoes_ingresso where id = p_solicitacao_id;
  return v_membro_id;
end;
$$;

/**
 * Vincula a sessão atual a uma linha de membro criada antes de existir
 * auth_uid (device_key é o único identificador que ela tem). Grava só o
 * auth_uid — nunca `admin` —, que é o que faltava na policy antiga.
 * Retorna o id do membro vinculado, ou null se não havia linha órfã.
 */
create or replace function public.vincular_membro_legado(p_device_key text)
returns setof uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or p_device_key is null or p_device_key = '' then
    return;
  end if;
  return query
    update public.ministerio_membros
       set auth_uid = v_uid
     where device_key = p_device_key
       and auth_uid is null
    returning id;
end;
$$;

/** Ministérios da conta atual (id + nome), em ordem de ingresso. */
create or replace function public.meus_ministerios()
returns table (id uuid, nome text)
language sql
stable
security definer
set search_path = public
as $$
  select m.id, m.nome
    from public.ministerio_membros mm
    join public.ministerios m on m.id = mm.ministerio_id
   where mm.auth_uid = auth.uid()
   order by mm.criado_em asc;
$$;

grant execute on function public.criar_ministerio(text, text, text, date, jsonb) to authenticated;
grant execute on function public.solicitar_ingresso(text, text, text) to authenticated;
grant execute on function public.aprovar_solicitacao(uuid) to authenticated;
grant execute on function public.vincular_membro_legado(text) to authenticated;
grant execute on function public.meus_ministerios() to authenticated;
grant execute on function public.eh_membro(uuid) to anon, authenticated;

-- ==========================================================
-- supabase/migrations/0014_repertorios_dono_real.sql
-- ==========================================================
-- ==========================================================
-- Repertórios: dono de verdade (auth_uid) e vínculo real com escalas
-- ==========================================================
-- Até aqui um repertório era "de quem tem a device_key" — um texto que o
-- próprio cliente manda na query, ou seja, nenhum controle: com select
-- público, qualquer um listava (e editava) os repertórios de todo mundo.
-- Agora o dono é o auth.uid() da sessão (anônima ou Google), que vem
-- assinado no JWT. device_key continua na tabela só pro backfill das
-- linhas antigas (ver reivindicar_repertorios_do_device abaixo).
--
-- escala_id também vira uuid com FK de verdade: quando a coluna nasceu
-- (0008) o módulo Ministério ainda era mock em memória e guardava ids do
-- tipo "e1699999999999". Valores que não são uuid viram null aqui — são
-- vínculos pra escalas que nunca existiram no banco.

alter table public.repertorios add column if not exists auth_uid uuid;
create index if not exists idx_repertorios_auth_uid on public.repertorios (auth_uid);

-- Condicional pra que reaplicar a migration não quebre: numa coluna que
-- já é uuid, o `using` com operador de regex nem faria sentido.
do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'repertorios'
       and column_name = 'escala_id' and data_type <> 'uuid'
  ) then
    alter table public.repertorios
      alter column escala_id type uuid
      using (case when escala_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                  then escala_id::uuid end);
  end if;
end
$$;

-- Descarta vínculos apontando pra escalas inexistentes antes de criar a FK
-- (o módulo mock podia deixar órfãos).
update public.repertorios r
   set escala_id = null
 where escala_id is not null
   and not exists (select 1 from public.escalas e where e.id = r.escala_id);

alter table public.repertorios
  drop constraint if exists repertorios_escala_id_fkey;
alter table public.repertorios
  add constraint repertorios_escala_id_fkey
  foreign key (escala_id) references public.escalas(id) on delete set null;

-- 1 escala = 1 repertório (o app já assume isso em obterRepertorioPorEscala)
create unique index if not exists idx_repertorios_escala_unica
  on public.repertorios (escala_id) where escala_id is not null;

-- ----------------------------------------------------------
-- Quem pode ver / editar
-- ----------------------------------------------------------
create or replace function public.pode_ver_repertorio(p_repertorio_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select (r.auth_uid is not null and r.auth_uid = auth.uid())
            or (r.escala_id is not null
                and public.eh_membro((select e.ministerio_id from public.escalas e where e.id = r.escala_id)))
       from public.repertorios r where r.id = p_repertorio_id),
    false);
$$;

create or replace function public.pode_editar_repertorio(p_repertorio_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select case
              -- repertório de uma Escala é documento do ministério: quem
              -- edita é admin, não quem por acaso criou a linha
              when r.escala_id is not null
                then public.eh_admin((select e.ministerio_id from public.escalas e where e.id = r.escala_id))
              else r.auth_uid is not null and r.auth_uid = auth.uid()
            end
       from public.repertorios r where r.id = p_repertorio_id),
    false);
$$;

drop policy if exists "repertorios_select_publico" on public.repertorios;
drop policy if exists "repertorios_insert_livre" on public.repertorios;
drop policy if exists "repertorios_altera_conforme_dono" on public.repertorios;
drop policy if exists "repertorios_exclui_conforme_dono" on public.repertorios;

drop policy if exists "repertorios_select_dono_ou_ministerio" on public.repertorios;
create policy "repertorios_select_dono_ou_ministerio" on public.repertorios
  for select using (
    (auth_uid is not null and auth_uid = auth.uid())
    or (escala_id is not null
        and public.eh_membro((select e.ministerio_id from public.escalas e where e.id = repertorios.escala_id)))
  );
drop policy if exists "repertorios_insert_proprio" on public.repertorios;
create policy "repertorios_insert_proprio" on public.repertorios
  for insert with check (auth_uid is not null and auth_uid = auth.uid());
drop policy if exists "repertorios_update" on public.repertorios;
create policy "repertorios_update" on public.repertorios
  for update using (public.pode_editar_repertorio(id)) with check (public.pode_editar_repertorio(id));
drop policy if exists "repertorios_delete" on public.repertorios;
create policy "repertorios_delete" on public.repertorios
  for delete using (public.pode_editar_repertorio(id));

drop policy if exists "repertorio_musicas_select_publico" on public.repertorio_musicas;
drop policy if exists "repertorio_musicas_escreve_conforme_dono" on public.repertorio_musicas;
drop policy if exists "repertorio_musicas_select" on public.repertorio_musicas;
create policy "repertorio_musicas_select" on public.repertorio_musicas
  for select using (public.pode_ver_repertorio(repertorio_id));
drop policy if exists "repertorio_musicas_escreve" on public.repertorio_musicas;
create policy "repertorio_musicas_escreve" on public.repertorio_musicas
  for all using (public.pode_editar_repertorio(repertorio_id))
  with check (public.pode_editar_repertorio(repertorio_id));

drop policy if exists "repertorio_ritos_select_publico" on public.repertorio_ritos;
drop policy if exists "repertorio_ritos_escreve_conforme_dono" on public.repertorio_ritos;
drop policy if exists "repertorio_ritos_select" on public.repertorio_ritos;
create policy "repertorio_ritos_select" on public.repertorio_ritos
  for select using (public.pode_ver_repertorio(repertorio_id));
drop policy if exists "repertorio_ritos_escreve" on public.repertorio_ritos;
create policy "repertorio_ritos_escreve" on public.repertorio_ritos
  for all using (public.pode_editar_repertorio(repertorio_id))
  with check (public.pode_editar_repertorio(repertorio_id));

-- ----------------------------------------------------------
-- Compartilhamento por link
-- ----------------------------------------------------------
-- O link com share_token precisa abrir pra quem não é dono — mas isso não
-- pode virar "select using (true)", senão volta a dar pra listar tudo.
-- A RPC devolve um repertório só, e só se o token bater exatamente.
create or replace function public.repertorio_por_token(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select to_jsonb(r) || jsonb_build_object(
    'repertorio_ritos', coalesce((
      select jsonb_agg(jsonb_build_object('nome', rr.nome, 'ordem', rr.ordem) order by rr.ordem)
        from public.repertorio_ritos rr where rr.repertorio_id = r.id), '[]'::jsonb),
    'repertorio_musicas', coalesce((
      select jsonb_agg(jsonb_build_object(
               'musica_id', rm.musica_id,
               'momento', rm.momento,
               'tom_escolhido', rm.tom_escolhido,
               'ordem', rm.ordem,
               'musicas', (select jsonb_build_object('title', m.title, 'artist', m.artist, 'original_tone', m.original_tone)
                             from public.musicas m where m.id = rm.musica_id)
             ) order by rm.ordem)
        from public.repertorio_musicas rm where rm.repertorio_id = r.id), '[]'::jsonb)
  )
  from public.repertorios r
  where p_token is not null and p_token <> '' and r.share_token = p_token;
$$;

/**
 * Backfill do dono nas linhas antigas: repertórios criados antes desta
 * migration só têm device_key, então ficariam invisíveis pro próprio
 * criador. O app chama isso uma vez por sessão passando a device_key
 * local; como device_key é um uuid v4 aleatório do localStorage (não
 * enumerável) e a linha órfã some do alcance assim que é reivindicada, a
 * janela de risco é a mesma já aceita no self-heal de membros.
 */
create or replace function public.reivindicar_repertorios_do_device(p_device_key text)
returns integer
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_qtd integer;
begin
  if v_uid is null or p_device_key is null or p_device_key = '' then
    return 0;
  end if;
  update public.repertorios
     set auth_uid = v_uid
   where device_key = p_device_key and auth_uid is null;
  get diagnostics v_qtd = row_count;
  return v_qtd;
end;
$$;

grant execute on function public.repertorio_por_token(text) to anon, authenticated;
grant execute on function public.reivindicar_repertorios_do_device(text) to authenticated;

-- ==========================================================
-- supabase/migrations/0015_device_key_nao_e_identidade.sql
-- ==========================================================
-- ==========================================================
-- device_key deixa de valer como identidade dentro do ministério
-- ==========================================================
-- Sobrou um caminho de escalonamento depois de 0013: a aprovação de
-- ingresso casava a solicitação com a linha de membro pela device_key
-- (`on conflict (ministerio_id, device_key) do update set auth_uid`).
-- Como a device_key de todo mundo era legível por qualquer membro do
-- mesmo ministério, um membro comum podia pedir ingresso informando a
-- device_key do admin: ao aprovar — uma ação de boa-fé, que parece só
-- aceitar um pedido — o admin repassava a própria linha (e o próprio
-- admin=true) pro auth_uid de quem pediu.
--
-- Reproduzido em supabase/test/rls_ministerio.sql (seção 5).
--
-- Três mudanças fecham isso:
--   1. device_key sai do alcance da leitura (grant por coluna);
--   2. a identidade única do membro passa a ser o auth_uid;
--   3. a aprovação nunca mais toca numa linha que já existe.

-- ----------------------------------------------------------
-- 1. Ninguém lê a device_key alheia
-- ----------------------------------------------------------
-- O app não usa mais essa coluna em leitura nenhuma (ver ministerioApi.ts);
-- ela só serve pro self-heal das linhas antigas, feito por RPC security
-- definer, onde quem informa a chave é o próprio dono (localStorage).
--
-- Revogar só a coluna não adiantaria: enquanto existe SELECT na tabela
-- inteira, ele cobre todas as colunas. O caminho é tirar o SELECT da
-- tabela e devolvê-lo coluna a coluna.
revoke select on public.ministerio_membros from anon, authenticated;
grant select (id, ministerio_id, nome, avatar_cor, admin, aniversario, criado_em, auth_uid)
  on public.ministerio_membros to anon, authenticated;

-- ----------------------------------------------------------
-- 2. Identidade do membro = auth_uid
-- ----------------------------------------------------------
-- A unique antiga (ministerio_id, device_key) fazia dois papéis: evitar
-- duplicata do mesmo aparelho e servir de chave de conflito na aprovação.
-- O primeiro papel agora é do auth_uid; o segundo deixa de existir.
-- Linhas legadas (auth_uid nulo) ficam de fora da nova unique — elas ainda
-- esperam o dono aparecer.
alter table public.ministerio_membros
  drop constraint if exists ministerio_membros_ministerio_id_device_key_key;

create unique index if not exists idx_membros_ministerio_auth_uid
  on public.ministerio_membros (ministerio_id, auth_uid)
  where auth_uid is not null;

-- ----------------------------------------------------------
-- 3. Aprovação só cria linha nova
-- ----------------------------------------------------------
create or replace function public.aprovar_solicitacao(p_solicitacao_id uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_sol public.solicitacoes_ingresso;
  v_membro_id uuid;
begin
  select * into v_sol from public.solicitacoes_ingresso where id = p_solicitacao_id;
  if v_sol.id is null then
    raise exception 'solicitação não encontrada';
  end if;
  if not public.eh_admin(v_sol.ministerio_id) then
    raise exception 'só admin do ministério pode aprovar ingresso';
  end if;
  if v_sol.auth_uid is null then
    raise exception 'solicitação sem conta vinculada';
  end if;

  -- Já é membro: consome a solicitação e devolve a linha existente, sem
  -- alterar coisa nenhuma nela.
  select id into v_membro_id from public.ministerio_membros
   where ministerio_id = v_sol.ministerio_id and auth_uid = v_sol.auth_uid;

  if v_membro_id is null then
    insert into public.ministerio_membros (ministerio_id, device_key, auth_uid, nome, avatar_cor, admin)
    values (v_sol.ministerio_id, v_sol.device_key, v_sol.auth_uid, v_sol.nome, 'bg-slate-500', false)
    returning id into v_membro_id;
  end if;

  delete from public.solicitacoes_ingresso where id = p_solicitacao_id;
  return v_membro_id;
end;
$$;

-- ----------------------------------------------------------
-- 4. Nenhum insert direto de membro
-- ----------------------------------------------------------
-- `membros_insert_fundador` existia pro app criar a própria linha ao
-- fundar um ministério; desde 0013 isso acontece dentro de
-- public.criar_ministerio(), que é security definer e não passa por
-- policy. O que sobrava era uma porta aberta pra um caso estranho: um
-- ministério que ficou sem nenhum membro (todos saíram) mas ainda tem
-- escalas, avisos e repertórios continuava "vazio" — e qualquer pessoa
-- podia se inserir nele como admin. Sem a policy, entrar em ministério só
-- pelas duas portas normais: fundar ou ser aprovado.
drop policy if exists "membros_insert_fundador" on public.ministerio_membros;

-- ----------------------------------------------------------
-- 5. Self-heal só resolve linha órfã do próprio ministério
-- ----------------------------------------------------------
-- Mesma função de antes, com uma guarda a mais: se esta conta já é membro
-- do ministério daquela linha órfã, não reivindica — senão daria pra
-- acumular duas linhas (e a nova unique recusaria de qualquer forma, com
-- um erro feio no meio do carregamento).
create or replace function public.vincular_membro_legado(p_device_key text)
returns setof uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or p_device_key is null or p_device_key = '' then
    return;
  end if;
  return query
    update public.ministerio_membros m
       set auth_uid = v_uid
     where m.device_key = p_device_key
       and m.auth_uid is null
       and not exists (
         select 1 from public.ministerio_membros outro
          where outro.ministerio_id = m.ministerio_id
            and outro.auth_uid = v_uid
       )
    returning m.id;
end;
$$;

-- ==========================================================
-- supabase/migrations/0016_corrige_vinculo_legado.sql
-- ==========================================================
-- ==========================================================
-- Conserta o vínculo das linhas legadas, que 0013 tinha travado
-- ==========================================================
-- O trigger protege_colunas_membro (0013) recusa qualquer alteração de
-- auth_uid feita por quem não é admin do ministério. A intenção era
-- fechar o sequestro de linha; o efeito colateral era travar justamente
-- a migração de todo mundo:
--
--   vincular_membro_legado() é security definer, então passa por cima das
--   policies — mas trigger não é policy: ele roda sempre, inclusive
--   dentro de uma função security definer. Como o usuário legado ainda
--   não está vinculado, eh_admin() é falso pra ele e o próprio self-heal
--   levantava "não é possível alterar o vínculo de conta de um membro".
--
-- Na prática: depois do deploy, todo usuário que já usava o app veria o
-- ministério sumir da tela, sem forma de recuperar pela interface.
-- Reproduzido em supabase/test/rls_ministerio.sql (seção 6).
--
-- A saída é o trigger reconhecer a única transição legítima — de auth_uid
-- nulo pro dono que está se apresentando — e só quando ela vem de dentro
-- da RPC, que é quem confere a device_key. A marca é um GUC local, que
-- vale só até o fim da transação e não pode ser forjado pelo PostgREST
-- (`set local` não é acessível por quem só faz REST).

create or replace function public.protege_colunas_membro()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vinculando boolean := coalesce(current_setting('app.vinculo_legado', true), '') = 'on';
begin
  if public.eh_admin(old.ministerio_id) then
    return new;
  end if;
  if new.admin is distinct from old.admin then
    raise exception 'só admin do ministério pode alterar o campo admin';
  end if;
  if new.ministerio_id is distinct from old.ministerio_id then
    raise exception 'não é possível mover um membro de ministério';
  end if;
  if new.auth_uid is distinct from old.auth_uid then
    -- Única exceção: adotar uma linha órfã, de dentro de
    -- vincular_membro_legado() e em nome de quem está pedindo.
    if not (v_vinculando and old.auth_uid is null and new.auth_uid = auth.uid()) then
      raise exception 'não é possível alterar o vínculo de conta de um membro';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.vincular_membro_legado(p_device_key text)
returns setof uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or p_device_key is null or p_device_key = '' then
    return;
  end if;

  -- `set local`: vale só nesta transação, some ao terminar.
  perform set_config('app.vinculo_legado', 'on', true);

  return query
    update public.ministerio_membros m
       set auth_uid = v_uid
     where m.device_key = p_device_key
       and m.auth_uid is null
       and not exists (
         select 1 from public.ministerio_membros outro
          where outro.ministerio_id = m.ministerio_id
            and outro.auth_uid = v_uid
       )
    returning m.id;
end;
$$;


-- ==========================================================
-- supabase/migrations/0017_repertorio_escala_cascade.sql
-- ==========================================================
-- ==========================================================
-- 1 escala = 1 repertório, sem órfão possível
-- ==========================================================
-- 0014 já criou a FK repertorios.escala_id -> escalas(id), mas como
-- `on delete set null`: apagar a escala não apagava o repertório, só
-- desvinculava — o repertório ficava pra sempre na tabela sem dono de
-- fato (escala_id null, mas não é um repertório pessoal, é lixo).
--
-- Troca pra `on delete cascade`: repertório de evento nasce e morre
-- junto com a escala. Repertórios pessoais (escala_id null desde a
-- criação) não são afetados.
--
-- Também faz o backfill: a partir de agora criarEscala() sempre cria o
-- repertório junto (deixa de ser sob demanda), então toda escala que já
-- existe sem repertório ganha um aqui.

alter table public.repertorios
  drop constraint if exists repertorios_escala_id_fkey;
alter table public.repertorios
  add constraint repertorios_escala_id_fkey
  foreign key (escala_id) references public.escalas(id) on delete cascade;

insert into public.repertorios (nome, escala_id, auth_uid)
select e.titulo, e.id, null
  from public.escalas e
 where not exists (select 1 from public.repertorios r where r.escala_id = e.id);

insert into public.repertorio_ritos (repertorio_id, nome, ordem)
select r.id, rito.nome, rito.ordem
  from public.repertorios r
  cross join (values
    ('Entrada', 0), ('Ato Penitencial', 1), ('Glória', 2),
    ('Salmo Responsorial', 3), ('Aclamação ao Evangelho', 4),
    ('Ofertório', 5), ('Santo', 6), ('Cordeiro', 7),
    ('Comunhão', 8), ('Pós-Comunhão', 9), ('Envio', 10)
  ) as rito(nome, ordem)
 where r.escala_id is not null
   and not exists (select 1 from public.repertorio_ritos rr where rr.repertorio_id = r.id);


commit;

-- ==========================================================
-- PASSO FINAL (obrigatório): cadastre os administradores
-- ==========================================================
-- Troque pelo(s) e-mail(s) da(s) conta(s) Google que administram o app.
-- Sem pelo menos uma linha aqui, a Área Admin não aparece pra ninguém e
-- nenhuma música pode ser cadastrada ou editada.
--
--   insert into public.admins (email) values ('voce@gmail.com')
--   on conflict (email) do nothing;
--
-- Conferir depois:
--   select * from public.admins;
