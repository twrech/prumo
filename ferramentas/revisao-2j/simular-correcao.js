/**
 * Prumo — item 2j: simula a cirurgia no catálogo, sem gravar nada.
 *
 *   node ferramentas/revisao-2j/simular-correcao.js
 *
 * Mostra o que acontece com os pesos por eixo, com as posições dos partidos e
 * com o ranking se as decisões da revisão adversarial forem aplicadas.
 * Nada é escrito: serve para decidir com número na mão, não com impressão.
 */

import { readFileSync } from 'node:fs';
import { EIXOS } from '../../js/motor.js';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const ler = (n) => JSON.parse(readFileSync(`${raiz}dados/${n}`, 'utf8'));

const EXCLUIR = {
  '2355135-49': 'assunto errado: o vetor é de armas, a votação é de saneamento básico (PDL 98/2023)',
  '2270800-175': 'mede Legislativo x Judiciário, não o eixo Liberdade–Ordem',
  '2423268-40': 'deliberação sobre caso individual, sem política pública geral',
  '2422697-69': 'DVS: o vetor é da lei inteira, não do art. 5º destacado',
  '2252295-130': 'DVS: o vetor é da lei inteira, não do art. 26 destacado',
  '2494408-43': 'DVS: o vetor é da lei inteira, não do inciso II do art. 193 destacado',
  '2279186-104': 'DVS: o vetor é da lei inteira, não do art. 37 destacado',
  '2447259-99': 'DVS: o vetor é da lei inteira, não do § 2º do art. 3º destacado',
  '2398530-73': 'eco sem sinal defensável e amb sem base no texto',
};

const CORRIGIR = {
  '2358548-81': { eco: 0, soc: 0, pod: -2, sob: 0, amb: 0 },  // abranda progressão = Liberdade
  '264726-144': { eco: 0, soc: 0, pod: 2, sob: 0, amb: 0 },   // art. 15: aumenta pena de disparo = Ordem
};

const BANCADA_MINIMA = 3;
const CONF_MIN = 60;

function posicoes(votacoes, extracao) {
  const M = Object.fromEntries(EIXOS.map((k) => [k, 0]));
  for (const v of votacoes) for (const k of EIXOS) M[k] += Math.abs(v.vetor[k] || 0);

  const acc = {};
  for (const v of votacoes) {
    const d = extracao.votacoes[v.id];
    if (!d) continue;
    for (const [sigla, c] of Object.entries(d.partidos)) {
      const t = c.s + c.n;
      if (t < 1) continue;
      acc[sigla] = acc[sigla] || { S: {}, R: {}, bancada: 0, n: 0 };
      acc[sigla].bancada = Math.max(acc[sigla].bancada, t);
      acc[sigla].n++;
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
    out[sigla] = {
      posicao: Object.fromEntries(EIXOS.map((k) => [k, M[k] ? Math.round((100 * (p.S[k] || 0)) / M[k]) : 0])),
      confianca: Object.fromEntries(EIXOS.map((k) => [k, M[k] ? Math.round((100 * (p.R[k] || 0)) / M[k]) : 0])),
      votacoes: p.n,
    };
  }
  return { M, partidos: out };
}

const catalogo = ler('votacoes.json');
const extracao = ler('votos-partidos.json');

const depois = catalogo.votacoes
  .filter((v) => !EXCLUIR[v.id])
  .map((v) => (CORRIGIR[v.id] ? { ...v, vetor: CORRIGIR[v.id] } : v));

const A = posicoes(catalogo.votacoes, extracao);
const B = posicoes(depois, extracao);

console.log(`ANTES: ${catalogo.votacoes.length} votações · DEPOIS: ${depois.length} (${Object.keys(EXCLUIR).length} fora, ${Object.keys(CORRIGIR).length} com vetor corrigido)\n`);

const totalA = EIXOS.reduce((a, k) => a + A.M[k], 0);
const totalB = EIXOS.reduce((a, k) => a + B.M[k], 0);
console.log('Peso por eixo (e fração do catálogo; piso do projeto = 15%)');
console.log('eixo    antes          depois');
for (const k of EIXOS) {
  const fa = (100 * A.M[k]) / totalA;
  const fb = (100 * B.M[k]) / totalB;
  const alerta = fb < 15 ? '  <-- abaixo do piso' : '';
  console.log(`${k.padEnd(6)} ${String(A.M[k]).padStart(3)} (${fa.toFixed(1).padStart(4)}%)   ${String(B.M[k]).padStart(3)} (${fb.toFixed(1).padStart(4)}%)${alerta}`);
}

const media = (p) => EIXOS.reduce((a, k) => a + p.confianca[k], 0) / 5;
const noRankA = Object.entries(A.partidos).filter(([, p]) => media(p) >= CONF_MIN);
const noRankB = Object.entries(B.partidos).filter(([, p]) => media(p) >= CONF_MIN);
console.log(`\nPartidos com confiança média ≥ ${CONF_MIN}%: antes ${noRankA.length}/${Object.keys(A.partidos).length} · depois ${noRankB.length}/${Object.keys(B.partidos).length}`);

console.log('\nDeslocamento da posição de cada partido (pontos, por eixo)');
console.log('partido           eco    soc    pod    sob    amb    maior');
const linhas = [];
for (const [sigla, pb] of Object.entries(B.partidos)) {
  const pa = A.partidos[sigla];
  if (!pa) continue;
  const d = EIXOS.map((k) => pb.posicao[k] - pa.posicao[k]);
  linhas.push([sigla, d, Math.max(...d.map(Math.abs))]);
}
linhas.sort((x, y) => y[2] - x[2]);
for (const [sigla, d, max] of linhas) {
  console.log(`${sigla.padEnd(16)} ${d.map((x) => String(x > 0 ? `+${x}` : x).padStart(5)).join('  ')}   ${max}`);
}
const medios = linhas.map((l) => l[2]);
console.log(`\nDeslocamento máximo médio: ${(medios.reduce((a, b) => a + b, 0) / medios.length).toFixed(1)} pontos · pior caso: ${Math.max(...medios)} pontos`);

// A ordem no eixo econômico muda?
const ordem = (P) => Object.entries(P.partidos).sort((a, b) => a[1].posicao.eco - b[1].posicao.eco).map(([s]) => s);
console.log(`\nOrdem no eixo econômico\n  antes:  ${ordem(A).join(' ')}\n  depois: ${ordem(B).join(' ')}`);
