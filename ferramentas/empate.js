/**
 * Prumo — o ranking distingue mesmo os primeiros colocados?
 *
 *   node ferramentas/empate.js
 *
 * O ranking mostra "SOLIDARIEDADE 99%, PSB 97%, PT 96%" e isso sugere uma ordem
 * que os dados podem não sustentar. Este script mede o RUÍDO do instrumento por
 * jackknife: recalcula o alinhamento tirando uma votação do catálogo de cada
 * vez, e vê o quanto a nota de cada partido balança.
 *
 * Se a nota de um partido varia 4 pontos só por tirar uma votação, então uma
 * diferença de 3 pontos entre o primeiro e o terceiro colocado não significa
 * nada — são empate, e a interface tem que dizer isso em vez de fingir uma
 * classificação.
 *
 * O resultado alimenta a constante FAIXA_DE_EMPATE de js/alinhamento.js.
 */

import { readFileSync } from 'node:fs';
import { EIXOS } from '../js/motor.js';
import { fileURLToPath } from 'node:url';

const BANCADA_MINIMA = 3;
const CONF_MIN = 60;

const raiz = fileURLToPath(new URL('../', import.meta.url));
const ler = (n) => JSON.parse(readFileSync(`${raiz}dados/${n}`, 'utf8'));

const catalogo = ler('votacoes.json');
const extracao = ler('votos-partidos.json');
const arquetipos = ler('arquetipos.json').arquetipos ?? ler('arquetipos.json');

/** Posições dos partidos a partir de um subconjunto do catálogo. */
function posicoes(votacoes) {
  const M = Object.fromEntries(EIXOS.map((k) => [k, 0]));
  for (const v of votacoes) for (const k of EIXOS) M[k] += Math.abs(v.vetor[k] || 0);

  const acc = {};
  for (const v of votacoes) {
    const d = extracao.votacoes[v.id];
    if (!d) continue;
    for (const [sigla, c] of Object.entries(d.partidos)) {
      const t = c.s + c.n;
      if (t < 1) continue;
      acc[sigla] = acc[sigla] || { S: {}, R: {}, bancada: 0 };
      acc[sigla].bancada = Math.max(acc[sigla].bancada, t);
      for (const k of EIXOS) {
        const w = v.vetor[k] || 0;
        if (!w) continue;
        acc[sigla].S[k] = (acc[sigla].S[k] || 0) + ((c.s - c.n) / t) * w;
        acc[sigla].R[k] = (acc[sigla].R[k] || 0) + Math.abs(w);
      }
    }
  }

  const out = {};
  for (const [sigla, p] of Object.entries(acc)) {
    if (sigla === 'S.PART.' || p.bancada < BANCADA_MINIMA) continue;
    const conf = EIXOS.reduce((a, k) => a + (M[k] ? (100 * (p.R[k] || 0)) / M[k] : 0), 0) / 5;
    if (conf < CONF_MIN) continue;
    out[sigla] = Object.fromEntries(EIXOS.map((k) => [k, M[k] ? (100 * (p.S[k] || 0)) / M[k] : 0]));
  }
  return out;
}

const alinhamento = (pessoa, partido) => {
  let prod = 0;
  let na = 0;
  let nb = 0;
  for (const k of EIXOS) { const u = pessoa[k] || 0; const v = partido[k] || 0; prod += u * v; na += u * u; nb += v * v; }
  if (!na || !nb) return 50;
  return 50 * (1 + prod / Math.sqrt(na * nb));
};

// --------------------------------------------------------------- jackknife
const completo = posicoes(catalogo.votacoes);
const amostras = catalogo.votacoes.map((fora) => posicoes(catalogo.votacoes.filter((v) => v.id !== fora.id)));

const desvios = [];
const trocasDeLider = [];

for (const a of arquetipos) {
  if (a.id === 'centrista') continue;
  const pessoa = Object.fromEntries(EIXOS.map((k) => [k, (a.coordenadas[k] || 0) * 100]));

  const base = Object.entries(completo)
    .map(([s, p]) => [s, alinhamento(pessoa, p)])
    .sort((x, y) => y[1] - x[1]);
  const lider = base[0][0];

  const lideres = new Set([lider]);
  for (const am of amostras) {
    const r = Object.entries(am).map(([s, p]) => [s, alinhamento(pessoa, p)]).sort((x, y) => y[1] - x[1]);
    lideres.add(r[0][0]);
    for (const [s, nota] of r) {
      const original = base.find((b) => b[0] === s);
      if (original) desvios.push(Math.abs(nota - original[1]));
    }
  }
  trocasDeLider.push({ arquetipo: a.id, lider, quantosLideraram: lideres.size, quem: [...lideres] });
}

desvios.sort((x, y) => x - y);
const p50 = desvios[Math.floor(desvios.length * 0.5)];
const p90 = desvios[Math.floor(desvios.length * 0.9)];
const p99 = desvios[Math.floor(desvios.length * 0.99)];

console.log(`Jackknife: ${catalogo.votacoes.length} recálculos, tirando uma votação por vez.\n`);
console.log('De quanto a nota de alinhamento balança só por tirar UMA votação do catálogo:');
console.log(`  mediana ${p50.toFixed(1)} pontos · 90% abaixo de ${p90.toFixed(1)} · 99% abaixo de ${p99.toFixed(1)}`);

console.log('\nO primeiro colocado é estável?');
for (const t of trocasDeLider) {
  const marca = t.quantosLideraram > 1 ? `  <-- trocou: ${t.quem.join(', ')}` : '';
  console.log(`  ${t.arquetipo.padEnd(26)} ${t.lider.padEnd(15)}${marca}`);
}

const instaveis = trocasDeLider.filter((t) => t.quantosLideraram > 1).length;
console.log(`\n${instaveis} de ${trocasDeLider.length} arquétipos mudam de primeiro colocado quando se tira uma única votação.`);
console.log(`\nSugestão de FAIXA_DE_EMPATE: ${Math.ceil(p90)} pontos (o percentil 90 do balanço).`);
console.log('Partidos dentro dessa faixa do primeiro colocado devem ser apresentados como');
console.log('empatados, não como 1º, 2º e 3º.');
