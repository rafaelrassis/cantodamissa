-- Seed gerado pelo pipeline scripts/extract_cifra_pdf.py a partir de PDF real
-- do Google Drive do usuário (pasta "Louvor", 01 - Deus É 10, formato Cifra Club).
-- Isso serve como exemplo de como o resultado do extrator vira uma linha na
-- tabela `musicas` (ver supabase/migrations/0001_init.sql).

insert into public.musicas (
  slug, title, artist, original_tone, capo, youtube_url, lyrics, chords_content
) values (
  'deus-e-10',
  'Deus É 10',
  'Músicas Católicas',
  'D',
  0,
  null,
  null, -- gerado automaticamente pela coluna computed `search_vector`/extractLyrics no client
  $$[Intro] [E] [A9] [E] [A9] [C#m7] [A9] [B4]
[D]Venha viver uma [G]grande [D]emoção e sentir no [G]peito uma [Bm]explosão
Um amor [G]verdadeiro Ele quer lhe [A]dar
[D]Vale a pena [G]abrir o [D]coração e deixar Deus [G]viver junto com [Bm]você
Ele é grande, Ele é [G]tudo, Ele é mais, Deus é [A]dez
Deus é [D]dez pra [G]mim, Deus é [D]dez pra [G]você
Deus é [Bm]dez pra todos [G]nós, Deus é [A]dez
[D]Venha viver uma [G]grande [D]emoção e sentir [G]no peito uma [Bm]explosão
Um amor [G]verdadeiro Ele quer lhe [A]dar
[D]Vale a pena [G]abrir o [D]coração e deixar Deus [G]viver junto com [Bm]você
Ele é grande, Ele é [G]tudo, Ele é mais, Deus é [A]dez
Quero [D]paz pra [G]mim, Quero [D]paz pra [G]você
Quero [Bm]paz pra todos [G]nós, Quero [A][A7]paz$$
)
on conflict (slug) do nothing;

insert into public.musica_tempo_liturgico (musica_id, tempo)
select id, 'TempoComum'::tempo_liturgico from public.musicas where slug = 'deus-e-10'
on conflict do nothing;

insert into public.musica_momento (musica_id, momento)
select id, 'Entrada'::momento_missa from public.musicas where slug = 'deus-e-10'
on conflict do nothing;

insert into public.musica_ciclo (musica_id, ciclo)
select id, unnest(array['A','B','C']::ciclo_dominical[]) from public.musicas where slug = 'deus-e-10'
on conflict do nothing;
