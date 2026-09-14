/**
 * Prumo — validador do catálogo de votações (etapa 2).
 *
 *   node ferramentas/validar-votacoes.js [caminho/para/votacoes.json]
 *
 * Irmão de validar.js, com uma diferença importante de método.
 *
 * POR QUE A REGRA DE POLARIDADE NÃO SE APLICA AQUI
 *
 * No banco de perguntas, exigir que o SIM aponte para o polo + em 40% a 60% do
 * peso de cada eixo combate o viés de concordância: gente cansada tende a dizer
 * SIM a tudo, e um banco desequilibrado transformaria esse cansaço em posição
 * política.
 *
 * Partido não responde questionário. Vota projeto de lei, sob pressão de
 * bancada, e não tem viés de concordância nenhum. Se todas as votações de um
 * eixo tiverem SIM na mesma direção, o eixo continua medindo: quem vota SIM em
 * todas vai para uma ponta, quem vota NÃO em todas vai para a outra, e quem
 * mistura fica no meio. A escala segue ancorada.
 *
 * O que de fato ameaça o catálogo é outra coisa: eixo com peso pequeno demais
 * para posicionar, e eixo que não separa os partidos. É isso que se confere.
 *
 * Sai com código 1 se houver erro.
 */

import { readFileSync } from 'node:fs';
import { EIXOS } from '../js/motor.js';
import { fileURLToPath } from 'node:url';

const erros = [];
const avisos = [];

function main() {
  const caminho = process.argv[2] || fileURLToPath(new URL('../dados/votacoes.json', import.meta.url));
  const cat = JSON.parse(readFileSync(caminho, 'utf8'));
  const vs = cat.votacoes || [];

  const vistos = new Set();
  for (const v of vs) {
    const id = v.id || '(sem id)';
    for (const campo of ['id', 'materia', 'data', 'titulo', 'resumo', 'vetor', 'placar']) {
      if (v[campo] === undefined) erros.push(`${id}: campo obrigatório ausente: ${campo}`);
    }
    if (vistos.has(v.id)) erros.push(`${id}: id duplicado`);
    vistos.add(v.id);

    let afetados = 0;
    for (const k of EIXOS) {
      const w = v.vetor?.[k];
      if (w === undefined) { erros.push(`${id}: vetor sem o eixo ${k}`); continue; }
      if (!Number.isInteger(w) || w < -3 || w > 3) erros.push(`${id}: peso inválido em ${k}: ${w}`);
      if (w !== 0) afetados++;
    }
    if (afetados === 0) erros.push(`${id}: vetor nulo — a votação não mede nada`);
    if (afetados > 3) avisos.push(`${id}: vetor afeta ${afetados} eixos`);

    const { sim = 0, nao = 0 } = v.placar || {};
    const t = sim + nao;
    if (t < 250) avisos.push(`${id}: quórum baixo (${t})`);
    if (t > 0 && Math.min(sim, nao) / t < 0.15) {
      erros.push(`${id}: quase unânime (${sim} a ${nao}) — não distingue partido nenhum`);
    }
    if (!v.resumo || v.resumo.length < 25) avisos.push(`${id}: resumo curto demais`);
  }

  // Peso e dispersão por eixo
  const peso = {};
  const positivo = {};
  for (const k of EIXOS) { peso[k] = 0; positivo[k] = 0; }
  for (const v of vs) {
    for (const k of EIXOS) {
      const w = v.vetor?.[k] || 0;
      peso[k] += Math.abs(w);
      if (w > 0) positivo[k] += Math.abs(w);
    }
  }
  const total = EIXOS.reduce((a, k) => a + peso[k], 0);

  console.log(`Catálogo: ${caminho}`);
  console.log(`Versão ${cat.versao} · ${vs.length} votações\n`);
  console.log('eixo   itens   peso   % do total   SIM→polo+');

  for (const k of EIXOS) {
    const itens = vs.filter((v) => (v.vetor?.[k] || 0) !== 0).length;
    const fracao = total === 0 ? 0 : (100 * peso[k]) / total;
    const pol = peso[k] === 0 ? 0 : (100 * positivo[k]) / peso[k];

    // Um eixo pode ficar abaixo do piso desde que o catálogo assuma isso por
    // escrito, em calibracao.eixos_com_confianca_reduzida, com motivo e com o
    // que a interface tem de mostrar. Rebaixar em silêncio é que não pode.
    const reduzido = cat.calibracao?.eixos_com_confianca_reduzida?.[k];

    let marca = '';
    if (fracao < 15) {
      if (reduzido?.motivo && reduzido?.efeito_exigido_na_interface) {
        avisos.push(`eixo ${k}: ${fracao.toFixed(1)}% do peso, abaixo do piso de 15% — assumido como confiança reduzida`);
        marca = '  <-- confiança reduzida (declarada)';
      } else {
        erros.push(`eixo ${k}: só ${fracao.toFixed(1)}% do peso do catálogo (mínimo 15%)`);
        marca = '  <-- magro demais';
      }
    } else if (itens < 3) { avisos.push(`eixo ${k}: só ${itens} votações`); marca = '  <-- poucas votações'; }

    console.log(
      `${k.padEnd(6)} ${String(itens).padStart(5)} ${String(peso[k]).padStart(6)} ` +
      `${fracao.toFixed(1).padStart(11)}% ${pol.toFixed(0).padStart(10)}%${marca}`
    );
  }

  const reduzidos = Object.keys(cat.calibracao?.eixos_com_confianca_reduzida || {});
  if (reduzidos.length) {
    console.log(`\nEixos assumidos com confiança reduzida: ${reduzidos.join(', ')}.`);
    console.log('A interface é obrigada a exibir o selo — ver efeito_exigido_na_interface no catálogo.');
  }

  console.log('\nA coluna SIM→polo+ é informativa: ao contrário do banco de perguntas,');
  console.log('não há faixa exigida aqui (ver o cabeçalho deste arquivo). Se o eixo');
  console.log('separa mesmo os partidos, só dá para saber depois de extrair os votos:');
  console.log('essa conferência fica em calcular_revelado, não aqui.');

  if (avisos.length) {
    console.log(`\n${avisos.length} aviso(s):`);
    for (const a of avisos) console.log(`  · ${a}`);
  }
  if (erros.length) {
    console.log(`\n${erros.length} ERRO(s):`);
    for (const e of erros) console.log(`  ✗ ${e}`);
    console.log('\nCatálogo reprovado.');
    process.exit(1);
  }
  console.log('\nCatálogo aprovado.');
}

main();
