/**
 * Prumo — posição revelada de cada DEPUTADO (etapa 3).
 *
 *   node ferramentas/calcular_deputados.js [UF]
 *
 * Mesma conta da etapa 2, aplicada a uma pessoa em vez de uma bancada. A
 * diferença é só que a proporção da bancada, que ia de −1 a +1, vira um voto
 * individual que é exatamente −1 ou +1.
 *
 *   pos_v  = +1 se votou SIM, −1 se votou NÃO
 *   S_k    = Σ_v  pos_v · w_v[k]
 *   M_k    = Σ_v  |w_v[k]|        sobre TODO o catálogo
 *   R_k    = Σ_v  |w_v[k]|        só onde a pessoa votou
 *   posição_k   = 100 · S_k / M_k
 *   confiança_k = 100 · R_k / M_k
 *
 * Abstenção, obstrução e artigo 17 NÃO entram como zero: entram como ausência.
 * Zero seria afirmar que a pessoa está no meio daquele tema, e ela não disse
 * isso — ela deixou de dizer. A diferença aparece na confiança, que é onde
 * deve aparecer.
 *
 * O piso de confiança é o mesmo da etapa 2: abaixo dele a posição é palpite, e
 * o deputado sai do ranking em vez de aparecer perto da origem como se fosse
 * moderado. Com um catálogo de 23 votações isso reprova quem faltou muito — e
 * faltar muito é, em si, informação que a ficha mostra.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { EIXOS } from '../js/motor.js';

const CONFIANCA_MINIMA = 60;

const raiz = fileURLToPath(new URL('../', import.meta.url));
const ler = (n) => JSON.parse(readFileSync(`${raiz}dados/${n}`, 'utf8'));

const uf = (process.argv[2] || 'SC').toUpperCase();
const catalogo = ler('votacoes.json');
const extracao = ler(`votos-deputados-${uf.toLowerCase()}.json`);

// A candidatura de 2026 é ARQUIVO DE ENTRADA, não anotação feita à mão na
// saída. Já perdemos metadado uma vez por escrever à mão num arquivo gerado;
// o cruzamento de nomes entre a Câmara e o TSE também não pode ser automático
// (há homônimos: "Cobalchini" casa com dois candidatos que são pessoas
// diferentes), então ele é conferido um a um e vive em candidaturas-<uf>.json.
let candidaturas = { candidaturas: {}, nao_concorrem: [] };
try { candidaturas = ler(`candidaturas-${uf.toLowerCase()}.json`); }
catch { console.warn(`aviso: sem candidaturas-${uf.toLowerCase()}.json — a saída não dirá quem concorre em 2026.`); }

const vetor = Object.fromEntries(catalogo.votacoes.map((v) => [v.id, v.vetor]));
const M = Object.fromEntries(EIXOS.map((k) => [k, 0]));
for (const v of catalogo.votacoes) for (const k of EIXOS) M[k] += Math.abs(v.vetor[k] || 0);

const saida = [];
for (const d of extracao.deputados) {
  const S = {};
  const R = {};
  let simNao = 0;
  let ausente = 0;
  const foraDoCatalogo = [];

  for (const [id, voto] of Object.entries(d.votos)) {
    const w = vetor[id];
    if (!w) { foraDoCatalogo.push(id); continue; }   // votação que saiu na revisão
    if (voto !== 'S' && voto !== 'N') { ausente++; continue; }
    simNao++;
    const sinal = voto === 'S' ? 1 : -1;
    for (const k of EIXOS) {
      const wk = w[k] || 0;
      if (!wk) continue;
      S[k] = (S[k] || 0) + sinal * wk;
      R[k] = (R[k] || 0) + Math.abs(wk);
    }
  }

  const posicao = {};
  const confianca = {};
  for (const k of EIXOS) {
    posicao[k] = M[k] ? Math.round((100 * (S[k] || 0)) / M[k]) : 0;
    confianca[k] = M[k] ? Math.round((100 * (R[k] || 0)) / M[k]) : 0;
  }
  const confMedia = EIXOS.reduce((a, k) => a + confianca[k], 0) / 5;

  const cand = candidaturas.candidaturas?.[d.nome] || null;

  saida.push({
    id: d.id,
    nome: d.nome,
    partido: d.partido,
    ...(d.partidosNaLegislatura ? { partidos_na_legislatura: d.partidosNaLegislatura } : {}),
    candidatura_2026: cand
      ? { ...cand, mudou_de_partido: cand.partido !== d.partido }
      : null,
    posicao,
    confianca,
    votacoes_com_posicao: simNao,
    votacoes_sem_posicao: ausente,
    votacoes_do_catalogo: catalogo.votacoes.length,
    medivel: confMedia >= CONFIANCA_MINIMA,
    confianca_media: Math.round(confMedia),
  });
}

saida.sort((a, b) => a.posicao.eco - b.posicao.eco);

const arquivo = `${raiz}dados/deputados-revelado-${uf.toLowerCase()}.json`;
writeFileSync(arquivo, `${JSON.stringify({
  versao: '0.1',
  uf,
  calculado_em: new Date().toISOString().slice(0, 10),
  base: `${catalogo.votacoes.length} votações nominais do plenário da Câmara, legislatura 2023-2027`,
  metodo: 'Ver o cabeçalho de ferramentas/calcular_deputados.js',
  confianca_minima: CONFIANCA_MINIMA,
  nota_ausencia: 'Abstenção e obstrução contam como ausência, não como posição de centro.',
  nota_candidatura: candidaturas.nota,
  fonte_candidatura: candidaturas.fonte,
  deputados: saida,
}, null, 1)}\n`);

// ------------------------------------------------------------------ relatório
console.log(`${uf}: ${saida.length} deputados · catálogo de ${catalogo.votacoes.length} votações\n`);
console.log('deputado                partido    eco   soc   pod   sob   amb   votou  conf');
for (const d of saida) {
  const marca = d.medivel ? '' : '  <-- abaixo do piso de confiança';
  console.log(
    `${d.nome.padEnd(22)} ${d.partido.padEnd(9)} ` +
    EIXOS.map((k) => String(d.posicao[k]).padStart(5)).join(' ') +
    `  ${String(d.votacoes_com_posicao).padStart(2)}/${d.votacoes_do_catalogo}  ${String(d.confianca_media).padStart(3)}%${marca}`
  );
}
const trocaram = saida.filter((d) => d.candidatura_2026?.mudou_de_partido);
const concorrem = saida.filter((d) => d.candidatura_2026);
console.log(`\n${concorrem.length}/${saida.length} concorrem em 2026 · ${trocaram.length} trocaram de partido desde os votos:`);
for (const d of trocaram) console.log(`  ${d.nome}: votou pelo ${d.partido}, concorre pelo ${d.candidatura_2026.partido} (${d.candidatura_2026.cargo})`);
const fora = saida.filter((d) => !d.medivel);
console.log(`\n${saida.length - fora.length} mensuráveis · ${fora.length} abaixo do piso: ${fora.map((d) => d.nome).join(', ') || '—'}`);
console.log(`\nEscrito em dados/deputados-revelado-${uf.toLowerCase()}.json`);
