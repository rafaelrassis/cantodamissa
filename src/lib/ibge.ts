/**
 * Estados e cidades do Brasil, pro cadastro de igreja pedir cidade/estado
 * como seleção em vez de texto livre. Estados são uma lista fixa (27, não
 * muda); cidades vêm da API pública do IBGE, cacheadas em memória por UF
 * pra não repetir a chamada ao trocar de estado e voltar.
 */

export interface Estado {
  sigla: string;
  nome: string;
}

export const ESTADOS: Estado[] = [
  { sigla: 'AC', nome: 'Acre' },
  { sigla: 'AL', nome: 'Alagoas' },
  { sigla: 'AP', nome: 'Amapá' },
  { sigla: 'AM', nome: 'Amazonas' },
  { sigla: 'BA', nome: 'Bahia' },
  { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' },
  { sigla: 'ES', nome: 'Espírito Santo' },
  { sigla: 'GO', nome: 'Goiás' },
  { sigla: 'MA', nome: 'Maranhão' },
  { sigla: 'MT', nome: 'Mato Grosso' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' },
  { sigla: 'PA', nome: 'Pará' },
  { sigla: 'PB', nome: 'Paraíba' },
  { sigla: 'PR', nome: 'Paraná' },
  { sigla: 'PE', nome: 'Pernambuco' },
  { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' },
  { sigla: 'RN', nome: 'Rio Grande do Norte' },
  { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'RO', nome: 'Rondônia' },
  { sigla: 'RR', nome: 'Roraima' },
  { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'São Paulo' },
  { sigla: 'SE', nome: 'Sergipe' },
  { sigla: 'TO', nome: 'Tocantins' },
];

const cidadesPorUf = new Map<string, string[]>();

/** Cidades de um estado (sigla, ex: 'SP') — cacheadas por UF. */
export async function listarCidades(uf: string): Promise<string[]> {
  const cache = cidadesPorUf.get(uf);
  if (cache) return cache;

  const res = await fetch(
    `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`
  );
  if (!res.ok) throw new Error('Não deu pra carregar as cidades desse estado agora.');
  const dados = (await res.json()) as Array<{ nome: string }>;
  const nomes = dados.map((c) => c.nome);
  cidadesPorUf.set(uf, nomes);
  return nomes;
}
