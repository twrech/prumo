/**
 * Prumo — estrutura do espaço partidário (etapa 2).
 *
 *   node ferramentas/estrutura.js
 *
 * Responde a uma pergunta que o projeto inteiro assume sem ter verificado:
 * os cinco eixos medem cinco coisas diferentes NOS PARTIDOS?
 *
 * A resposta, com os dados da legislatura 2023-2027, é não. Os eixos andam
 * quase juntos: partido pró-Estado é também progressista, garantista e
 * preservacionista; partido pró-mercado é também conservador, punitivista e
 * desenvolvimentista. Um único componente explica a maior parte da variação.
 *
 * POR QUE ISSO NÃO É DEFEITO DO INSTRUMENTO
 *
 * A suspeita óbvia é que a correlação tenha sido fabricada pelos vetores: se
 * uma mesma votação recebe peso em `eco` e em `amb`, ela correlaciona os dois
 * por construção. Por isso este script refaz a conta duas vezes — com todas as
 * votações e SÓ com as de eixo único, que não compartilham nenhum item entre
 * eixos. A correlação sobrevive à segunda conta. Ela está nos dados, não no
 * método.
 *
 * O QUE FAZER COM ISSO
 *
 * Não mexer nos arquétipos para aproximá-los dos partidos. Os arquétipos
 * descrevem ELEITORES, e eleitor não é obrigado a caber na reta em que os
 * partidos se organizaram. Colapsar o modelo do eleitor sobre a reta dos
 * partidos destruiria justamente a informação mais útil que o Prumo tem a dar:
 * "esta combinação de posições não é oferecida por nenhum partido brasileiro".
 *
 * RESSALVA IMPORTANTE SOBRE O EIXO `sob`
 *
 * Só existe UMA votação de eixo único em `sob` no catálogo. Na conta restrita,
 * portanto, o "eixo sob" é literalmente aquela votação, e a correlação dele com
 * os demais não significa nada — inclusive troca de sinal entre as duas contas.
 * Leia as linhas e colunas de `sob` da segunda tabela como ruído.
 */

import { readFileSync } from 'node:fs';
import { EIXOS } from '../js/motor.js';
import { fileURLToPath } from 'node:url';

const BANCADA_MINIMA = 3;

function ler(nome) {
  return JSON.parse(readFileSync(fileURLToPath(new URL(`../dados/${nome}`, import.meta.url)), 'utf8'));
}

/** Posições dos partidos a partir de um subconjunto do catálogo. */
function posicoes(votacoes, extracao) {
  const M = {};
  for (const k of EIXOS) M[k] = 0;
  for (const v of votacoes) for (const k of EIXOS) M[k] += Math.abs(v.vetor[k] || 0);

  const acc = {};
  for (const v of votacoes) {
    const d = extracao.votacoes[v.id];
    if (!d) continue;
    for (const [sigla, c] of Object.entries(d.partidos)) {
      const t = c.s + c.n;
      if (t < 1) continue;
      acc[sigla] = acc[sigla] || { S: {}, bancada: 0 };
      acc[sigla].bancada = Math.max(acc[sigla].bancada, t);
      for (const k of EIXOS) {
        const w = v.vetor[k] || 0;
        if (!w) continue;
        acc[sigla].S[k] = (acc[sigla].S[k] || 0) + ((c.s - c.n) / t) * w;
      }
    }
  }

  const out = {};
  for (const [sigla, p] of Object.entries(acc)) {
    if (sigla === 'S.PART.' || p.bancada < BANCADA_MINIMA) continue;
    out[sigla] = EIXOS.map((k) => (M[k] ? (100 * (p.S[k] || 0)) / M[k] : 0));
  }
  return out;
}

function covariancia(pos) {
  const P = Object.values(pos);
  const n = P.length;
  const mu = EIXOS.map((_, j) => P.reduce((a, r) => a + r[j], 0) / n);
  const C = Array.from({ length: 5 }, () => Array(5).fill(0));
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
      let s = 0;
      for (const r of P) s += (r[i] - mu[i]) * (r[j] - mu[j]);
      C[i][j] = s / (n - 1);
    }
  }
  return { C, n, mu };
}

/** Maior componente principal, por iteração de potência. */
function principal(C) {
  let v = [1, 1, 1, 1, 1];
  for (let it = 0; it < 500; it++) {
    const w = Array(5).fill(0);
    for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) w[i] += C[i][j] * v[j];
    const norma = Math.hypot(...w);
    if (!norma) break;
    v = w.map((x) => x / norma);
  }
  const w = Array(5).fill(0);
  for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) w[i] += C[i][j] * v[j];
  const lambda = v.reduce((a, x, i) => a + x * w[i], 0);
  const traco = [0, 1, 2, 3, 4].reduce((a, i) => a + C[i][i], 0);
  return { direcao: v, fracao: traco ? lambda / traco : 0 };
}

function tabela(rotulo, pos, ressalva) {
  const { C, n } = covariancia(pos);
  const { direcao, fracao } = principal(C);

  console.log(`\n${rotulo} — ${n} partidos`);
  console.log('        ' + EIXOS.map((k) => k.padStart(7)).join(''));
  for (let i = 0; i < 5; i++) {
    const linha = EIXOS.map((_, j) => (C[i][j] / Math.sqrt(C[i][i] * C[j][j])).toFixed(2).padStart(7)).join('');
    console.log('  ' + EIXOS[i].padEnd(6) + linha);
  }
  console.log(`  Um componente só explica ${(100 * fracao).toFixed(0)}% da variação entre os partidos.`);
  if (ressalva) console.log(`  ${ressalva}`);
  return { direcao, fracao, C };
}

function main() {
  const catalogo = ler('votacoes.json');
  const extracao = ler('votos-partidos.json');

  const eixoUnico = catalogo.votacoes.filter((v) => EIXOS.filter((k) => v.vetor[k]).length === 1);
  const contagem = Object.fromEntries(EIXOS.map((k) => [k, eixoUnico.filter((v) => v.vetor[k]).length]));

  console.log(`Catálogo: ${catalogo.votacoes.length} votações, das quais ${eixoUnico.length} medem um eixo só.`);
  console.log(`Votações de eixo único por eixo: ${EIXOS.map((k) => `${k}=${contagem[k]}`).join('  ')}`);

  const todas = tabela('COM TODAS AS VOTAÇÕES', posicoes(catalogo.votacoes, extracao));

  const magros = EIXOS.filter((k) => contagem[k] < 2);
  tabela(
    'SÓ COM AS DE EIXO ÚNICO (nenhum item compartilhado entre eixos)',
    posicoes(eixoUnico, extracao),
    magros.length
      ? `Ressalva: ${magros.join(', ')} tem menos de 2 votações de eixo único aqui — a linha e a coluna desse eixo são ruído, não leia.`
      : null
  );

  // A reta em que os partidos se organizam
  const pos = posicoes(catalogo.votacoes, extracao);
  const { mu } = covariancia(pos);
  const v = todas.direcao;
  const sinal = v[0] < 0 ? -1 : 1;   // orienta para que + seja o lado do mercado
  console.log('\nA reta em que os partidos de fato se organizam');
  console.log('  composição: ' + EIXOS.map((k, i) => `${k} ${(sinal * v[i]).toFixed(2)}`).join('  '));
  const proj = Object.entries(pos)
    .map(([s, r]) => [s, sinal * r.reduce((a, x, j) => a + (x - mu[j]) * v[j], 0)])
    .sort((a, b) => a[1] - b[1]);
  const largura = Math.max(...proj.map(([, x]) => Math.abs(x)));
  for (const [s, x] of proj) {
    const col = Math.round(30 + (28 * x) / largura);
    console.log('  ' + s.padEnd(15) + ' '.repeat(Math.max(0, col)) + '•');
  }

  console.log('\nConclusão: ver o cabeçalho deste arquivo. Em resumo — os partidos');
  console.log('vivem numa reta; o eleitor, não. Os arquétipos descrevem eleitores e');
  console.log('NÃO devem ser aproximados dos partidos.');
}

main();
