/**
 * Prumo — item 2j: compara a atribuição cega com o catálogo.
 *
 *   node ferramentas/revisao-2j/comparar.js
 *
 * Lê dados/revisao-2j/cego-*.json (revisores que não viram o catálogo) e
 * dados/votacoes.json (vetores atuais) e classifica cada votação:
 *
 *   IGUAL       — mesmos eixos, mesmos sinais, magnitudes iguais ou a 1 de distância
 *   MAGNITUDE   — mesmos sinais, alguma magnitude difere em 2 ou mais
 *   EIXO        — um lado marcou um eixo que o outro deixou em zero (peso ≥ 2)
 *   SINAL       — o mesmo eixo tem sinais opostos (o erro grave)
 *   SEM SINAL   — o revisor cego não conseguiu recuperar o sinal
 *   EXCLUIR     — o revisor cego recomenda tirar do catálogo
 *
 * Só imprime; a decisão sobre cada divergência é humana e vai à fonte primária.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { EIXOS } from '../../js/motor.js';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const catalogo = JSON.parse(readFileSync(`${raiz}dados/votacoes.json`, 'utf8'));
const dir = `${raiz}dados/revisao-2j/`;
const cego = {};
for (const f of readdirSync(dir).filter((n) => /^cego-\d+\.json$/.test(n))) {
  Object.assign(cego, JSON.parse(readFileSync(dir + f, 'utf8')));
}

const v = (x) => `[${EIXOS.map((k) => String(x[k] || 0).padStart(2)).join(' ')}]`;

const classes = { IGUAL: [], MAGNITUDE: [], EIXO: [], SINAL: [], 'SEM SINAL': [], EXCLUIR: [] };

for (const item of catalogo.votacoes) {
  const c = cego[item.id];
  if (!c) { console.log(`!! ${item.id} sem revisão cega`); continue; }
  const meu = item.vetor;
  const dele = c.vetor;

  const tags = [];
  if (c.recomendacao === 'excluir') tags.push('EXCLUIR');
  if (c.sinal_recuperavel === false) tags.push('SEM SINAL');
  else {
    let sinal = false, eixo = false, mag = false;
    for (const k of EIXOS) {
      const a = meu[k] || 0, b = dele[k] || 0;
      if (a && b && Math.sign(a) !== Math.sign(b)) sinal = true;
      else if ((a && !b && Math.abs(a) >= 2) || (b && !a && Math.abs(b) >= 2)) eixo = true;
      else if (a && b && Math.abs(a - b) >= 2) mag = true;
    }
    if (sinal) tags.push('SINAL');
    else if (eixo) tags.push('EIXO');
    else if (mag) tags.push('MAGNITUDE');
    else tags.push('IGUAL');
  }

  const linha = { id: item.id, titulo: item.titulo, meu, dele, cego: c, tags };
  for (const t of tags) classes[t].push(linha);
}

console.log(`Cabeçalho do vetor: ${EIXOS.join('  ')}\n`);
for (const [nome, lista] of Object.entries(classes)) {
  if (!lista.length) continue;
  console.log(`━━━ ${nome} (${lista.length}) ━━━`);
  for (const l of lista) {
    console.log(`\n${l.id}  ${l.titulo}`);
    console.log(`  catálogo ${v(l.meu)}   cego ${v(l.dele)}   confiança ${l.cego.confianca} · origem ${l.cego.origem_da_informacao}`);
    if (nome !== 'IGUAL') {
      console.log(`  SIM faz: ${l.cego.o_que_o_sim_faz}`);
      console.log(`  em jogo: ${l.cego.dispositivo_em_jogo}`);
      for (const [k, j] of Object.entries(l.cego.justificativa || {})) console.log(`  ${k}: ${j}`);
      if (l.cego.motivo_recomendacao) console.log(`  motivo p/ excluir: ${l.cego.motivo_recomendacao}`);
    }
  }
  console.log('');
}

const n = catalogo.votacoes.length;
console.log(`Resumo: ${classes.IGUAL.length}/${n} iguais · ${classes.MAGNITUDE.length} magnitude · ${classes.EIXO.length} eixo · ${classes.SINAL.length} sinal · ${classes['SEM SINAL'].length} sem sinal · ${classes.EXCLUIR.length} excluir`);
