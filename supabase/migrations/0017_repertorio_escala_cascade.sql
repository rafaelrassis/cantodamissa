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
