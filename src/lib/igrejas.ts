import { supabase, isSupabaseConfigured } from './supabase';
import { mapearRepertorio, type Repertorio, type LinhaRepertorioSupabase } from './repertorios';

/**
 * Igrejas: acesso público (sem login) pra assembleia buscar por nome ou
 * código e abrir o repertório da missa em modo letra. Tudo passa por RPCs
 * `security definer` (migration 0019_igrejas.sql) — nunca lê `repertorios`
 * ou `escalas` direto, pra não expor colunas sensíveis a `anon`.
 */

export interface Igreja {
  id: string;
  nome: string;
  codigo: string;
  cidade: string | null;
}

export interface RepertorioAbertoResumo {
  repertorioId: string;
  nome: string;
  data: string; // ISO date
  hora: string;
  ministerioNome: string;
}

function mapearIgreja(row: {
  id: string;
  nome: string;
  codigo: string;
  cidade: string | null;
}): Igreja {
  return { id: row.id, nome: row.nome, codigo: row.codigo, cidade: row.cidade };
}

/** Autocomplete por nome ou código — mínimo 2 caracteres. */
export async function buscarIgrejas(termo: string): Promise<Igreja[]> {
  if (!isSupabaseConfigured || termo.trim().length < 2) return [];

  const { data, error } = await supabase.rpc('buscar_igrejas', { p_termo: termo.trim() });
  if (error) {
    console.error('buscarIgrejas:', error.message);
    return [];
  }
  return ((data ?? []) as Array<{ id: string; nome: string; codigo: string; cidade: string | null }>).map(
    mapearIgreja
  );
}

/** Repertórios abertos (escala publicada, data >= hoje) de uma igreja por código exato. */
export async function listarRepertoriosAbertosPorIgreja(
  codigo: string
): Promise<RepertorioAbertoResumo[]> {
  if (!isSupabaseConfigured || !codigo.trim()) return [];

  const { data, error } = await supabase.rpc('repertorios_abertos_por_igreja', {
    p_codigo: codigo.trim(),
  });
  if (error) {
    console.error('listarRepertoriosAbertosPorIgreja:', error.message);
    return [];
  }
  const linhas = (data ?? []) as Array<{
    repertorio_id: string;
    nome: string;
    data: string;
    hora: string;
    ministerio_nome: string;
  }>;
  return linhas.map((l) => ({
    repertorioId: l.repertorio_id,
    nome: l.nome,
    data: l.data,
    hora: l.hora,
    ministerioNome: l.ministerio_nome,
  }));
}

/** Abre um repertório público específico (mesma checagem de janela aberta). */
export async function obterRepertorioPublico(repertorioId: string): Promise<Repertorio | null> {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase.rpc('repertorio_publico_por_id', {
    p_repertorio_id: repertorioId,
  });
  if (error) {
    console.error('obterRepertorioPublico:', error.message);
    return null;
  }
  return data ? mapearRepertorio(data as unknown as LinhaRepertorioSupabase) : null;
}

/** Igreja atualmente vinculada a um ministério (null se nenhuma). */
export async function obterIgrejaDoMinisterio(ministerioId: string): Promise<Igreja | null> {
  const { data, error } = await supabase
    .from('ministerios')
    .select('igreja:igrejas(id, nome, codigo, cidade)')
    .eq('id', ministerioId)
    .maybeSingle();
  if (error) {
    console.error('obterIgrejaDoMinisterio:', error.message);
    return null;
  }
  const igreja = (data as { igreja: { id: string; nome: string; codigo: string; cidade: string | null } | null } | null)
    ?.igreja;
  return igreja ? mapearIgreja(igreja) : null;
}

/** Vincula/desvincula a igreja do ministério — só admin (RLS garante). */
export async function definirIgrejaDoMinisterio(
  ministerioId: string,
  igrejaId: string | null
): Promise<void> {
  const { error } = await supabase
    .from('ministerios')
    .update({ igreja_id: igrejaId })
    .eq('id', ministerioId);
  if (error) throw new Error(`definirIgrejaDoMinisterio: ${error.message}`);
}

/** Cria uma igreja nova — código único, normalizado pra maiúsculas. */
export async function criarIgreja(nome: string, codigo: string, cidade: string): Promise<Igreja> {
  const codigoNormalizado = codigo.trim().toUpperCase();
  const { data, error } = await supabase
    .from('igrejas')
    .insert({ nome: nome.trim(), codigo: codigoNormalizado, cidade: cidade.trim() || null })
    .select('id, nome, codigo, cidade')
    .single();
  if (error) throw new Error(`criarIgreja: ${error.message}`);
  return mapearIgreja(data);
}
