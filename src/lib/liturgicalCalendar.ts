/**
 * Calendário Litúrgico — cálculo automático.
 *
 * Referências:
 * - Páscoa: algoritmo de Meeus/Jones/Butcher (calendário gregoriano)
 * - Ciclo dominical A/B/C: definido pelo ano civil em que cai a maior parte
 *   do ano litúrgico (ano%3==1 -> A, ano%3==2 -> B, ano%3==0 -> C)
 * - Tempos: Advento, Natal, Tempo Comum I, Quaresma, Páscoa, Tempo Comum II
 *
 * Escopo desta v1: cobre domingos (é o que o app precisa pra sugestão de
 * música). Solenidades fixas fora de domingo (ex: Assunção 15/ago) ficam
 * pra uma v2 do calendário de santos.
 */

import type { CicloDominical, TempoLiturgico } from '../types/musica';

export interface DomingoCalculado {
  data: Date;
  nome: string;
  tempo: TempoLiturgico;
  numeroSemana: number | null; // ex: 3 = "3º Domingo do Advento"
  ciclo: CicloDominical;
  corLiturgica: 'roxo' | 'branco' | 'verde' | 'vermelho' | 'rosa';
}

/**
 * Soma dias no calendário (não 24h fixas). Somar `dias * 86400000` parece
 * equivalente, mas quebra em fuso com horário de verão: como as datas aqui
 * nascem à meia-noite local, atravessar a virada devolve 23:00 do dia
 * anterior (ou 01:00 do seguinte) e `getDay()` passa a apontar o dia
 * errado, contaminando todo o resto do cálculo. `setDate` deixa o próprio
 * Date resolver o offset e mantém a meia-noite local.
 */
function addDias(data: Date, dias: number): Date {
  const d = new Date(data.getFullYear(), data.getMonth(), data.getDate() + dias);
  return d;
}

function proximoDomingo(data: Date): Date {
  const dia = data.getDay(); // 0 = domingo
  return dia === 0 ? data : addDias(data, 7 - dia);
}

/** Primeiro domingo estritamente depois da data (nunca a própria data). */
function domingoSeguinte(data: Date): Date {
  return proximoDomingo(addDias(data, 1));
}

function domingoAnteriorOuIgual(data: Date): Date {
  const dia = data.getDay();
  return dia === 0 ? data : addDias(data, -dia);
}

/**
 * Data da Páscoa (domingo) para um ano civil, calendário gregoriano.
 * Algoritmo de Meeus/Jones/Butcher.
 */
export function calcularPascoa(ano: number): Date {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31); // 3 = março, 4 = abril
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
}

/**
 * Ciclo dominical (A/B/C) do ano civil onde cai a maior parte do ano litúrgico
 * (ou seja, o ano civil "normal" — não o de Advento do ano anterior).
 */
export function cicloDoAno(anoCivil: number): CicloDominical {
  const ciclos: CicloDominical[] = ['C', 'A', 'B']; // índice = anoCivil % 3
  return ciclos[anoCivil % 3];
}

/**
 * Gera todos os domingos do ano litúrgico que tem sua maior parte no
 * `anoCivil` informado — ou seja, do 1º Domingo do Advento (novembro/dezembro
 * do ano anterior) até o Domingo de Cristo Rei (novembro do próprio anoCivil).
 */
export function gerarDomingosDoAnoLiturgico(anoCivil: number): DomingoCalculado[] {
  const ciclo = cicloDoAno(anoCivil);
  const domingos: DomingoCalculado[] = [];

  // ---------- Datas-chave ----------
  const pascoaAtual = calcularPascoa(anoCivil);

  const quartaCinzasAtual = addDias(pascoaAtual, -46);
  const pentecostesAtual = addDias(pascoaAtual, 49);

  const natalAnterior = new Date(anoCivil - 1, 11, 25);

  // 4º Domingo do Advento = domingo anterior-ou-igual a 24/dez
  const domAdvento4Anterior = domingoAnteriorOuIgual(new Date(anoCivil - 1, 11, 24));
  const domAdvento1Anterior = addDias(domAdvento4Anterior, -21);

  const domAdvento4Atual = domingoAnteriorOuIgual(new Date(anoCivil, 11, 24));
  const domAdvento1Atual = addDias(domAdvento4Atual, -21);

  // Epifania: domingo entre 2 e 8 de janeiro
  const epifania = proximoDomingo(new Date(anoCivil, 0, 2));
  // Batismo do Senhor: domingo seguinte à Epifania — MAS quando a
  // Epifania cai em 7 ou 8 de janeiro, o Batismo é na segunda-feira
  // imediatamente seguinte (Normas Universais do Ano Litúrgico, n. 38).
  // Nesses anos ele não é domingo e por isso não entra na lista abaixo;
  // ignorar a exceção deslocava em uma semana a numeração de todos os
  // domingos do Tempo Comum até a Quaresma.
  const epifaniaTransferida = epifania.getDate() >= 7;
  const batismoSenhor = epifaniaTransferida ? addDias(epifania, 1) : addDias(epifania, 7);

  // Cristo Rei = domingo imediatamente anterior ao 1º Domingo do Advento atual
  const cristoRei = addDias(domAdvento1Atual, -7);

  // ---------- 1. Advento (do ano anterior, termina no Natal atual) ----------
  for (let semana = 1; semana <= 4; semana++) {
    const data = addDias(domAdvento1Anterior, (semana - 1) * 7);
    if (data >= natalAnterior) break; // não deveria acontecer, guarda de segurança
    domingos.push({
      data,
      nome: `${semana}º Domingo do Advento`,
      tempo: 'Advento',
      numeroSemana: semana,
      ciclo,
      corLiturgica: semana === 3 ? 'rosa' : 'roxo',
    });
  }

  // ---------- 2. Natal (oitava + Epifania + Batismo) ----------
  // A Sagrada Família é o domingo dentro da oitava do Natal. Quando o
  // próprio Natal cai em domingo não existe esse domingo: a festa vai
  // pra sexta 30/dez (fora do escopo desta lista, que só devolve
  // domingos) e os domingos da oitava passam a ser o próprio Natal e,
  // uma semana depois, Santa Maria Mãe de Deus em 1º/jan.
  if (natalAnterior.getDay() === 0) {
    domingos.push({
      data: natalAnterior,
      nome: 'Natal do Senhor',
      tempo: 'Natal',
      numeroSemana: null,
      ciclo,
      corLiturgica: 'branco',
    });
    domingos.push({
      data: new Date(anoCivil, 0, 1),
      nome: 'Santa Maria, Mãe de Deus',
      tempo: 'Natal',
      numeroSemana: null,
      ciclo,
      corLiturgica: 'branco',
    });
  } else {
    domingos.push({
      data: proximoDomingo(natalAnterior),
      nome: 'Sagrada Família de Jesus, Maria e José',
      tempo: 'Natal',
      numeroSemana: null,
      ciclo,
      corLiturgica: 'branco',
    });
  }

  domingos.push({
    data: epifania,
    nome: 'Epifania do Senhor',
    tempo: 'Natal',
    numeroSemana: null,
    ciclo,
    corLiturgica: 'branco',
  });

  // Só entra quando é domingo — nos anos de Epifania transferida pra 7 ou
  // 8/jan o Batismo cai na segunda-feira seguinte (ver acima).
  if (batismoSenhor.getDay() === 0) {
    domingos.push({
      data: batismoSenhor,
      nome: 'Batismo do Senhor',
      tempo: 'Natal',
      numeroSemana: null,
      ciclo,
      corLiturgica: 'branco',
    });
  }

  // ---------- 3. Tempo Comum I (Batismo do Senhor -> véspera da Quarta de Cinzas) ----------
  let cursor = domingoSeguinte(batismoSenhor);
  let semanaComum = 2; // 1ª semana é a que contém a segunda-feira após o Batismo
  while (cursor < quartaCinzasAtual) {
    domingos.push({
      data: cursor,
      nome: `${semanaComum}º Domingo do Tempo Comum`,
      tempo: 'TempoComum',
      numeroSemana: semanaComum,
      ciclo,
      corLiturgica: 'verde',
    });
    cursor = addDias(cursor, 7);
    semanaComum++;
  }

  // ---------- 4. Quaresma (Quarta de Cinzas -> véspera do Domingo de Páscoa) ----------
  const domRamos = addDias(pascoaAtual, -7);
  let domQuaresma = proximoDomingo(quartaCinzasAtual);
  for (let semana = 1; semana <= 5; semana++) {
    domingos.push({
      data: domQuaresma,
      nome: `${semana}º Domingo da Quaresma`,
      tempo: 'Quaresma',
      numeroSemana: semana,
      ciclo,
      corLiturgica: semana === 4 ? 'rosa' : 'roxo',
    });
    domQuaresma = addDias(domQuaresma, 7);
  }
  domingos.push({
    data: domRamos,
    nome: 'Domingo de Ramos da Paixão do Senhor',
    tempo: 'Quaresma',
    numeroSemana: 6,
    ciclo,
    corLiturgica: 'vermelho',
  });

  // ---------- 5. Páscoa (Domingo de Páscoa -> Pentecostes) ----------
  // 8 domingos ao todo: Páscoa (semana 0) até Pentecostes (semana 7, +49 dias)
  for (let semana = 0; semana <= 7; semana++) {
    const data = addDias(pascoaAtual, semana * 7);
    domingos.push({
      data,
      nome:
        semana === 0
          ? 'Domingo de Páscoa da Ressurreição do Senhor'
          : semana === 7
          ? 'Pentecostes'
          : `${semana + 1}º Domingo da Páscoa`,
      tempo: 'Pascoa',
      numeroSemana: semana + 1,
      ciclo,
      corLiturgica: semana === 7 ? 'vermelho' : 'branco',
    });
  }

  // ---------- 6. Tempo Comum II (depois de Pentecostes -> véspera do Advento) ----------
  // Cristo Rei é sempre a 34ª semana do Tempo Comum, então a numeração aqui
  // conta de trás pra frente a partir dele — não é uma continuação direta de
  // onde a Quaresma interrompeu a 1ª parte do Tempo Comum. Dependendo do ano
  // isso pula alguns números (as leituras dessas semanas não são usadas
  // naquele ano), exatamente como no calendário litúrgico oficial.
  const datasComumII: Date[] = [];
  cursor = addDias(pentecostesAtual, 7);
  while (cursor < cristoRei) {
    datasComumII.push(cursor);
    cursor = addDias(cursor, 7);
  }
  const totalComumII = datasComumII.length;
  datasComumII.forEach((data, indice) => {
    const numero = 34 - totalComumII + indice;
    // O domingo seguinte a Pentecostes é sempre a Solenidade da
    // Santíssima Trindade: ocupa a semana do Tempo Comum (por isso a
    // numeração dos demais não muda), mas tem celebração e cor próprias.
    const ehTrindade = indice === 0;
    domingos.push({
      data,
      nome: ehTrindade
        ? 'Santíssima Trindade'
        : `${numero}º Domingo do Tempo Comum`,
      tempo: 'TempoComum',
      numeroSemana: numero,
      ciclo,
      corLiturgica: ehTrindade ? 'branco' : 'verde',
    });
  });

  domingos.push({
    data: cristoRei,
    nome: 'Nosso Senhor Jesus Cristo, Rei do Universo',
    tempo: 'TempoComum',
    numeroSemana: null,
    ciclo,
    corLiturgica: 'branco',
  });

  // ---------- 7. Início do próximo Advento (já entra no próximo ano litúrgico) ----------
  const cicloProximo = cicloDoAno(anoCivil + 1);
  for (let semana = 1; semana <= 4; semana++) {
    const data = addDias(domAdvento1Atual, (semana - 1) * 7);
    domingos.push({
      data,
      nome: `${semana}º Domingo do Advento`,
      tempo: 'Advento',
      numeroSemana: semana,
      ciclo: cicloProximo,
      corLiturgica: semana === 3 ? 'rosa' : 'roxo',
    });
  }

  return domingos.sort((a, b) => a.data.getTime() - b.data.getTime());
}

/**
 * Retorna o domingo (calculado) cuja data mais se aproxima da data informada
 * — usado pra achar "o domingo desta semana" a partir de hoje.
 */
export function domingoMaisProximo(data: Date): DomingoCalculado {
  const anoCivil = data.getFullYear();
  // gera o ano litúrgico corrente e o seguinte pra cobrir a virada de Advento
  const candidatos = [
    ...gerarDomingosDoAnoLiturgico(anoCivil),
    ...gerarDomingosDoAnoLiturgico(anoCivil + 1),
  ];
  let melhor = candidatos[0];
  let menorDiferenca = Infinity;
  for (const d of candidatos) {
    const diff = Math.abs(d.data.getTime() - data.getTime());
    if (diff < menorDiferenca) {
      menorDiferenca = diff;
      melhor = d;
    }
  }
  return melhor;
}

/**
 * Retorna o PRÓXIMO domingo a partir de hoje: se hoje já é domingo, retorna
 * hoje mesmo; senão, o domingo futuro mais próximo (nunca um domingo passado).
 * Diferente de domingoMaisProximo, que pode voltar pro domingo anterior se
 * ele estiver cronologicamente mais perto (ex: terça-feira).
 */
export function proximoDomingoCalculado(data: Date): DomingoCalculado {
  const anoCivil = data.getFullYear();
  const candidatos = [
    ...gerarDomingosDoAnoLiturgico(anoCivil),
    ...gerarDomingosDoAnoLiturgico(anoCivil + 1),
  ].sort((a, b) => a.data.getTime() - b.data.getTime());

  const inicioHoje = new Date(data.getFullYear(), data.getMonth(), data.getDate()).getTime();

  return (
    candidatos.find((d) => {
      const inicioDomingo = new Date(
        d.data.getFullYear(),
        d.data.getMonth(),
        d.data.getDate()
      ).getTime();
      return inicioDomingo >= inicioHoje;
    }) ?? candidatos[candidatos.length - 1]
  );
}

/**
 * Quantos dias faltam até a data alvo (0 = hoje), comparando só o dia
 * civil (ignora hora).
 */
export function diasAte(alvo: Date, hoje: Date): number {
  const a = new Date(alvo.getFullYear(), alvo.getMonth(), alvo.getDate()).getTime();
  const h = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).getTime();
  return Math.round((a - h) / 86_400_000);
}

