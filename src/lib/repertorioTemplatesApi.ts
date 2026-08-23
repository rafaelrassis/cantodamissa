import { supabase } from './supabase';
import { exigirLinha } from './supabaseUtils';
import * as repertoriosApi from './repertorios';
import { RITOS_PADRAO, type ItemRepertorio } from './repertorios';

/**
 * Templates de repertório do Ministério: mesma forma de um repertório
 * (ritos + músicas, ver repertorios.ts) mas sem vínculo com Escala — só
 * um molde reutilizável, escopado por ministerio_id. Ministério-scoped
 * como avisos/equipes/escalas, então sem fallback de localStorage nem
 * device_key: quem pode ler/escrever é decidido pela RLS de
 * eh_membro/eh_admin (ver migration 0018_repertorio_templates.sql).
 */

export const LIMITE_TEMPLATES_REPERTORIO = 10;

export interface RepertorioTemplate {
  id: string;
  nome: string;
  criadoEm: string; // ISO
  ritos: string[]; // ordenados
  itens: ItemRepertorio[];
}

interface LinhaTemplateSupabase {
  id: string;
  nome: string;
  criado_em: string;
  repertorio_template_ritos: { nome: string; ordem: number }[];
  repertorio_template_musicas: {
    musica_id: string;
    momento: string | null;
    tom_escolhido: string | null;
    ordem: number;
    musicas: { title: string; artist: string | null; original_tone: string } | null;
  }[];
}

const SELECT_TEMPLATE =
  'id, nome, criado_em, ' +
  'repertorio_template_ritos(nome, ordem), ' +
  'repertorio_template_musicas(musica_id, momento, tom_escolhido, ordem, musicas(title, artist, original_tone))';

function mapearTemplate(row: LinhaTemplateSupabase): RepertorioTemplate {
  const itens = [...row.repertorio_template_musicas]
    .sort((a, b) => a.ordem - b.ordem)
    .map((r) => ({
      musicaId: r.musica_id,
      title: r.musicas?.title ?? '(música removida)',
      artist: r.musicas?.artist ?? null,
      tone: r.tom_escolhido ?? r.musicas?.original_tone ?? '',
      momento: r.momento,
    }));

  const ritos = [...row.repertorio_template_ritos].sort((a, b) => a.ordem - b.ordem).map((r) => r.nome);

  return {
    id: row.id,
    nome: row.nome,
    criadoEm: row.criado_em,
    ritos,
    itens,
  };
}

async function proximaOrdem(
  tabela: 'repertorio_template_ritos' | 'repertorio_template_musicas',
  templateId: string
): Promise<number> {
  const { data } = await supabase
    .from(tabela)
    .select('ordem')
    .eq('template_id', templateId)
    .order('ordem', { ascending: false })
    .limit(1);
  const maior = (data ?? [])[0]?.ordem;
  return typeof maior === 'number' ? maior + 1 : 0;
}

export async function listarTemplates(ministerioId: string): Promise<RepertorioTemplate[]> {
  const { data, error } = await supabase
    .from('repertorio_templates')
    .select(SELECT_TEMPLATE)
    .eq('ministerio_id', ministerioId)
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as LinhaTemplateSupabase[]).map(mapearTemplate);
}

export async function obterTemplate(id: string): Promise<RepertorioTemplate | null> {
  const { data, error } = await supabase.from('repertorio_templates').select(SELECT_TEMPLATE).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? mapearTemplate(data as unknown as LinhaTemplateSupabase) : null;
}

export async function criarTemplate(ministerioId: string, nome: string): Promise<RepertorioTemplate> {
  const nomeFinal = nome.trim() || 'Template sem nome';

  const { count, error: erroContagem } = await supabase
    .from('repertorio_templates')
    .select('id', { count: 'exact', head: true })
    .eq('ministerio_id', ministerioId);
  if (erroContagem) throw new Error(`criarTemplate: ${erroContagem.message}`);
  if ((count ?? 0) >= LIMITE_TEMPLATES_REPERTORIO) throw new Error('LIMITE_TEMPLATES_REPERTORIO');

  const { data, error } = await supabase
    .from('repertorio_templates')
    .insert({ ministerio_id: ministerioId, nome: nomeFinal })
    .select('id')
    .single();
  if (error) throw new Error(`criarTemplate: ${error.message}`);

  // seed dos ritos padrão da missa, mesmo ponto de partida de um repertório de evento
  const { error: erroRitos } = await supabase
    .from('repertorio_template_ritos')
    .insert(RITOS_PADRAO.map((nome, ordem) => ({ template_id: data.id, nome, ordem })));
  if (erroRitos) console.error('criarTemplate (seed ritos):', erroRitos.message);

  const criado = await obterTemplate(data.id);
  if (!criado) throw new Error('criarTemplate: falha ao recarregar após criar');
  return criado;
}

export async function removerTemplate(id: string): Promise<void> {
  await exigirLinha(supabase.from('repertorio_templates').delete().eq('id', id).select('id'), 'removerTemplate');
}

// ---------- Ritos ----------

export async function adicionarRito(templateId: string, nome: string): Promise<void> {
  const nomeFinal = nome.trim();
  if (!nomeFinal) return;

  await exigirLinha(
    supabase
      .from('repertorio_template_ritos')
      .insert({ template_id: templateId, nome: nomeFinal, ordem: await proximaOrdem('repertorio_template_ritos', templateId) })
      .select('id'),
    'adicionarRito (template)'
  );
}

export async function removerRito(templateId: string, nome: string): Promise<void> {
  await exigirLinha(
    supabase.from('repertorio_template_ritos').delete().eq('template_id', templateId).eq('nome', nome).select('id'),
    'removerRito (template)'
  );
}

export async function reordenarRitos(templateId: string, nomesOrdenados: string[]): Promise<void> {
  await Promise.all(
    nomesOrdenados.map((nome, ordem) =>
      supabase.from('repertorio_template_ritos').update({ ordem }).eq('template_id', templateId).eq('nome', nome)
    )
  );
}

// ---------- Músicas dentro do template ----------

export async function adicionarMusica(templateId: string, item: ItemRepertorio): Promise<void> {
  const { error } = await supabase.from('repertorio_template_musicas').insert({
    template_id: templateId,
    musica_id: item.musicaId,
    momento: item.momento,
    tom_escolhido: item.tone,
    ordem: await proximaOrdem('repertorio_template_musicas', templateId),
  });

  // conflito de chave primária (template_id, musica_id) = música já está lá — ignora
  if (error && !error.message.includes('duplicate')) {
    throw new Error(`adicionarMusica (template): ${error.message}`);
  }
}

export async function removerMusica(templateId: string, musicaId: string): Promise<void> {
  await exigirLinha(
    supabase
      .from('repertorio_template_musicas')
      .delete()
      .eq('template_id', templateId)
      .eq('musica_id', musicaId)
      .select('musica_id'),
    'removerMusica (template)'
  );
}

export async function moverMusicaParaRito(templateId: string, musicaId: string, novoRito: string): Promise<void> {
  await exigirLinha(
    supabase
      .from('repertorio_template_musicas')
      .update({ momento: novoRito })
      .eq('template_id', templateId)
      .eq('musica_id', musicaId)
      .select('musica_id'),
    'moverMusicaParaRito (template)'
  );
}

/**
 * Substitui ritos + músicas do repertório de um evento pelos do template —
 * oferecido ao criar o repertório de uma Escala nova (ver
 * AplicarTemplateSheet) e ao aplicar manualmente num já existente (ver
 * RepertorioDetalheTela). "Aplicar" é uma cópia de verdade: apaga as
 * músicas e os ritos que o repertório já tinha antes de trazer os do
 * template, senão o repertório vira uma mistura dos dois e a ordem dos
 * ritos não bate com a do template.
 */
export async function aplicarAoRepertorio(templateId: string, repertorioId: string): Promise<void> {
  const template = await obterTemplate(templateId);
  if (!template) throw new Error('aplicarAoRepertorio: template não encontrado');

  const repertorioAtual = await repertoriosApi.obterRepertorio(repertorioId);
  if (!repertorioAtual) throw new Error('aplicarAoRepertorio: repertório não encontrado');

  await Promise.all(
    repertorioAtual.itens.map((item) => repertoriosApi.removerMusica(repertorioId, item.musicaId))
  );

  const ritosParaRemover = repertorioAtual.ritos.filter((r) => !template.ritos.includes(r));
  await Promise.all(ritosParaRemover.map((r) => repertoriosApi.removerRito(repertorioId, r)));

  const ritosParaAdicionar = template.ritos.filter((r) => !repertorioAtual.ritos.includes(r));
  for (const rito of ritosParaAdicionar) {
    await repertoriosApi.adicionarRito(repertorioId, rito);
  }
  await repertoriosApi.reordenarRitos(repertorioId, template.ritos);

  for (const item of template.itens) {
    await repertoriosApi.adicionarMusica(repertorioId, item);
  }
}
