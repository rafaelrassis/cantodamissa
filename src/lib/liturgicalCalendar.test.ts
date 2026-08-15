import { afterAll, describe, expect, test } from 'vitest';
import {
  calcularPascoa,
  cicloDoAno,
  diasAte,
  domingoMaisProximo,
  gerarDomingosDoAnoLiturgico,
  proximoDomingoCalculado,
} from './liturgicalCalendar';

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Acha um domingo pelo nome exato dentro de um ano litúrgico. */
function acharPorNome(anoCivil: number, nome: string) {
  return gerarDomingosDoAnoLiturgico(anoCivil).find((d) => d.nome === nome);
}

function acharPorData(anoCivil: number, data: string) {
  return gerarDomingosDoAnoLiturgico(anoCivil).find((d) => iso(d.data) === data);
}

describe('calcularPascoa', () => {
  // datas conferidas contra o calendário gregoriano oficial
  test.each([
    [2023, '2023-04-09'],
    [2024, '2024-03-31'],
    [2025, '2025-04-20'],
    [2026, '2026-04-05'],
    [2027, '2027-03-28'],
    [2030, '2030-04-21'],
    [2038, '2038-04-25'], // limite superior possível
    [2285, '2285-03-22'], // limite inferior possível
  ])('Páscoa de %i é %s', (ano, esperado) => {
    expect(iso(calcularPascoa(ano))).toBe(esperado);
  });
});

describe('cicloDoAno', () => {
  test.each([
    [2025, 'C'],
    [2026, 'A'],
    [2027, 'B'],
    [2028, 'C'],
  ] as const)('ano litúrgico %i é do ciclo %s', (ano, ciclo) => {
    expect(cicloDoAno(ano)).toBe(ciclo);
  });
});

describe('estrutura do ano litúrgico', () => {
  test('todo item da lista é realmente um domingo', () => {
    for (let ano = 2020; ano <= 2035; ano++) {
      for (const d of gerarDomingosDoAnoLiturgico(ano)) {
        expect(
          d.data.getDay(),
          `${d.nome} (${iso(d.data)}) do ano ${ano} não é domingo`
        ).toBe(0);
      }
    }
  });

  test('não há duas celebrações no mesmo domingo', () => {
    for (let ano = 2020; ano <= 2035; ano++) {
      const datas = gerarDomingosDoAnoLiturgico(ano).map((d) => iso(d.data));
      expect(new Set(datas).size, `ano ${ano} tem domingo duplicado`).toBe(datas.length);
    }
  });

  test('a lista vem em ordem cronológica', () => {
    const datas = gerarDomingosDoAnoLiturgico(2026).map((d) => d.data.getTime());
    expect([...datas].sort((a, b) => a - b)).toEqual(datas);
  });

  test('Cristo Rei é o domingo anterior ao 1º Domingo do Advento seguinte', () => {
    const lista = gerarDomingosDoAnoLiturgico(2026);
    const cristoRei = lista.find((d) => d.nome.startsWith('Nosso Senhor Jesus Cristo'))!;
    const advento1 = lista.filter((d) => d.nome === '1º Domingo do Advento').at(-1)!;
    expect((advento1.data.getTime() - cristoRei.data.getTime()) / 86_400_000).toBe(7);
  });
});

describe('Natal e oitava', () => {
  test('Sagrada Família é o domingo depois do Natal quando o Natal não cai em domingo', () => {
    // Natal de 2025 é quinta -> Sagrada Família em 28/12/2025
    expect(iso(acharPorNome(2026, 'Sagrada Família de Jesus, Maria e José')!.data)).toBe(
      '2025-12-28'
    );
  });

  test('quando o Natal cai em domingo, a oitava vira Natal + Santa Maria Mãe de Deus', () => {
    // Natal de 2022 caiu num domingo: a Sagrada Família foi celebrada na
    // sexta 30/12 (fora desta lista, que só traz domingos) e 1º/01/2023 é
    // Santa Maria Mãe de Deus — não Sagrada Família, como o código
    // devolvia antes.
    const lista = gerarDomingosDoAnoLiturgico(2023);
    expect(lista.find((d) => d.nome === 'Natal do Senhor')).toBeDefined();
    expect(iso(lista.find((d) => d.nome === 'Santa Maria, Mãe de Deus')!.data)).toBe('2023-01-01');
    expect(lista.find((d) => d.nome === 'Sagrada Família de Jesus, Maria e José')).toBeUndefined();
    expect(acharPorData(2023, '2023-01-01')!.nome).toBe('Santa Maria, Mãe de Deus');
  });
});

describe('Epifania e Batismo do Senhor', () => {
  test('Batismo é o domingo seguinte à Epifania no caso normal', () => {
    // Epifania 2026 em 04/01 -> Batismo em 11/01
    expect(iso(acharPorNome(2026, 'Epifania do Senhor')!.data)).toBe('2026-01-04');
    expect(iso(acharPorNome(2026, 'Batismo do Senhor')!.data)).toBe('2026-01-11');
  });

  test('com Epifania em 7 ou 8/jan o Batismo sai da lista de domingos', () => {
    // Epifania de 2023 caiu em 08/01, então o Batismo foi na segunda 09/01
    // e o domingo 15/01 já é o 2º do Tempo Comum. O código antigo punha o
    // Batismo em 15/01 e empurrava todo o Tempo Comum uma semana.
    expect(iso(acharPorNome(2023, 'Epifania do Senhor')!.data)).toBe('2023-01-08');
    expect(acharPorNome(2023, 'Batismo do Senhor')).toBeUndefined();
    expect(acharPorData(2023, '2023-01-15')!.nome).toBe('2º Domingo do Tempo Comum');
    expect(acharPorData(2023, '2023-02-19')!.nome).toBe('7º Domingo do Tempo Comum');
  });
});

describe('Quaresma e Páscoa', () => {
  test('domingos da Quaresma de 2026 (Páscoa em 05/04)', () => {
    expect(iso(acharPorNome(2026, '1º Domingo da Quaresma')!.data)).toBe('2026-02-22');
    expect(iso(acharPorNome(2026, 'Domingo de Ramos da Paixão do Senhor')!.data)).toBe('2026-03-29');
  });

  test('Pentecostes é 49 dias depois da Páscoa', () => {
    const pascoa = calcularPascoa(2026);
    const pentecostes = acharPorNome(2026, 'Pentecostes')!;
    expect((pentecostes.data.getTime() - pascoa.getTime()) / 86_400_000).toBe(49);
  });

  test('o 4º Domingo da Quaresma e o 3º do Advento são rosa', () => {
    expect(acharPorNome(2026, '4º Domingo da Quaresma')!.corLiturgica).toBe('rosa');
    expect(acharPorNome(2026, '3º Domingo do Advento')!.corLiturgica).toBe('rosa');
  });
});

describe('Tempo Comum depois de Pentecostes', () => {
  test('o domingo seguinte a Pentecostes é a Santíssima Trindade', () => {
    for (const [ano, data] of [
      [2023, '2023-06-04'],
      [2025, '2025-06-15'],
      [2026, '2026-05-31'],
    ] as const) {
      const trindade = acharPorNome(ano, 'Santíssima Trindade')!;
      expect(iso(trindade.data), `ano ${ano}`).toBe(data);
      expect(trindade.corLiturgica).toBe('branco');
    }
  });

  test('a numeração continua fechando em 33 antes de Cristo Rei', () => {
    const lista = gerarDomingosDoAnoLiturgico(2026);
    const ultimoNumerado = lista.filter((d) => d.nome.endsWith('º Domingo do Tempo Comum')).at(-1)!;
    expect(ultimoNumerado.nome).toBe('33º Domingo do Tempo Comum');
  });
});

describe('navegação por data', () => {
  test('proximoDomingoCalculado devolve hoje quando hoje é domingo', () => {
    const domingo = new Date(2026, 4, 31); // 31/05/2026, domingo
    expect(iso(proximoDomingoCalculado(domingo).data)).toBe('2026-05-31');
  });

  test('proximoDomingoCalculado nunca volta pro passado', () => {
    const terca = new Date(2026, 5, 2); // 02/06/2026
    const proximo = proximoDomingoCalculado(terca);
    expect(iso(proximo.data)).toBe('2026-06-07');
  });

  test('domingoMaisProximo pode voltar pro domingo anterior', () => {
    const segunda = new Date(2026, 5, 1); // 01/06/2026, um dia depois da Trindade
    expect(iso(domingoMaisProximo(segunda).data)).toBe('2026-05-31');
  });

  test('diasAte ignora a hora do dia', () => {
    expect(diasAte(new Date(2026, 5, 7, 0, 0), new Date(2026, 5, 2, 23, 59))).toBe(5);
    expect(diasAte(new Date(2026, 5, 2, 1, 0), new Date(2026, 5, 2, 23, 0))).toBe(0);
  });
});

describe('fusos com horário de verão', () => {
  const tzOriginal = process.env.TZ;
  afterAll(() => {
    process.env.TZ = tzOriginal;
  });

  // Somar dias em milissegundos (24h fixas) escorrega quando o fuso muda
  // de offset à meia-noite — era o caso do Brasil até 2019 e continua
  // sendo o de vários fusos. Aqui o ano litúrgico inteiro é gerado dentro
  // desses fusos e todo item precisa continuar caindo num domingo.
  test.each(['America/Sao_Paulo', 'Europe/Lisbon', 'America/New_York', 'Pacific/Auckland'])(
    'gera domingos corretos em %s',
    (tz) => {
      process.env.TZ = tz;
      for (let ano = 2016; ano <= 2020; ano++) {
        for (const d of gerarDomingosDoAnoLiturgico(ano)) {
          expect(d.data.getDay(), `${d.nome} (${iso(d.data)}) em ${tz}/${ano}`).toBe(0);
          // Em fuso que adianta o relógio à meia-noite (São Paulo até
          // 2019), o dia da virada simplesmente não tem 00:00 e o Date
          // normaliza pra 01:00 — isso é aceitável. O que não pode
          // acontecer é a hora escorregar pra 23:00, porque aí a data já
          // está no dia anterior.
          expect(
            d.data.getHours(),
            `${d.nome} em ${tz}/${ano} escorregou pro dia anterior`
          ).toBeLessThan(2);
        }
      }
    }
  );
});
