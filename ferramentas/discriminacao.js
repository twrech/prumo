/**
 * Prumo — o quanto cada votação SEPARA os partidos.
 *
 *   node ferramentas/discriminacao.js
 *
 * O piso de 15% por eixo mede peso no catálogo, que não é a mesma coisa que
 * poder de discriminação. Uma votação em que todas as bancadas votaram igual
 * acrescenta peso ao eixo e não acrescenta informação nenhuma: empurra todo
 * mundo para o mesmo lugar e, pior, encolhe a amplitude do eixo, porque o
 * denominador cresce sem que o numerador varie.
 *
 * Este script mede, para cada votação, o desvio-padrão entre as bancadas da
 * proporção (SIM − NÃO) / (SIM + NÃO). Perto de 0 significa consenso entre os
 * partidos; perto de 1, partidos em lados opostos.
 *
 * Depois agrega por eixo, ponderando pelo peso, para mostrar quanto de cada
 * eixo é feito de votação que de fato separa.
 */

import { readFileSync } from 'node:fs';
import { EIXOS } from '../js/motor.js';
import { fileURLToPath } from 'node:url';

const BANCADA_MINIMA = 3;
const CONSENSO = 0.35;   // abaixo disso a votação praticamente não separa

const raiz = fileURLToPath(new URL('../', import.meta.url));
const ler = (n) => JSON.parse(readFileSync(`${raiz}dados/${n}`, 'utf8'));

const catalogo = ler('votacoes.json');
const extracao = ler('votos-partidos.json');

const linhas = [];
for (const v of catalogo.votacoes) {
  const d = extracao.votacoes[v.id];
  if (!d) continue;
  const props = [];
  for (const [sigla, c] of Object.entries(d.partidos)) {
    const t = c.s + c.n;
    if (sigla === 'S.PART.' || t < BANCADA_MINIMA) continue;
    props.push((c.s - c.n) / t);
  }
  if (props.length < 5) continue;
  const media = props.reduce((a, b) => a + b, 0) / props.length;
  const dp = Math.sqrt(props.reduce((a, x) => a + (x - media) ** 2, 0) / props.length);
  linhas.push({
    id: v.id,
    titulo: v.titulo,
    eixos: EIXOS.filter((k) => v.vetor[k]).map((k) => `${k}${v.vetor[k] > 0 ? '+' : ''}${v.vetor[k]}`).join(' '),
    dp,
    media,
    partidos: props.length,
    vetor: v.vetor,
  });
}

linhas.sort((a, b) => a.dp - b.dp);

console.log(`${linhas.length} votações · desvio-padrão entre bancadas da proporção (SIM−NÃO)/(SIM+NÃO)\n`);
console.log('  dp   média  eixos              votação');
for (const l of linhas) {
  const marca = l.dp < CONSENSO ? '  <-- consenso entre os partidos' : '';
  console.log(
    `${l.dp.toFixed(2)}  ${l.media.toFixed(2).padStart(5)}  ${l.eixos.padEnd(18)} ${l.titulo}${marca}`
  );
}

console.log('\nPor eixo: quanto do peso vem de votação que separa (dp ≥ %s)', CONSENSO);
console.log('eixo   peso   peso que separa   fração');
for (const k of EIXOS) {
  let total = 0;
  let util = 0;
  for (const l of linhas) {
    const w = Math.abs(l.vetor[k] || 0);
    if (!w) continue;
    total += w;
    if (l.dp >= CONSENSO) util += w;
  }
  if (!total) continue;
  const f = (100 * util) / total;
  const marca = f < 60 ? '  <-- eixo feito sobretudo de consenso' : '';
  console.log(`${k.padEnd(6)} ${String(total).padStart(4)} ${String(util).padStart(13)}   ${f.toFixed(0).padStart(3)}%${marca}`);
}

console.log(
  '\nLeitura: peso alto com fração baixa é o pior caso — o eixo parece bem medido\n'
  + 'na conferência do catálogo e não distingue partido nenhum na prática.'
);
