/**
 * Prumo — simulador de respondentes sintéticos.
 *
 *   node ferramentas/simular.js [n_por_arquetipo] [ruido]
 *
 * Para cada arquétipo, gera respondentes que pensam como ele e verifica se o
 * motor os devolve com o rótulo certo. Responde a duas perguntas:
 *
 *   1. Cada arquétipo é alcançável? (taxa de acerto do rótulo)
 *   2. Que eixos ficam mal definidos? (erro entre a posição recuperada e a real)
 *
 * DOIS MODOS DE RESPONDENTE
 *
 * `coerente` — responde pelo sinal da projeção: SIM a tudo que empurra na sua
 *   direção, NÃO a tudo que empurra contra, sem exceção. É um fanático: ignora
 *   a intensidade da própria convicção. Serve para achar o extremo alcançável
 *   de cada direção, e não para representar gente.
 *
 * `realista` — responde com probabilidade proporcional à força da convicção.
 *   Concordância latente a = (Σ wₖ·cₖ) / (Σ |wₖ|) ∈ [−1, 1]; responde SIM com
 *   probabilidade (1 + a)/2. Quem tem coordenada 0,4 num eixo discorda de si
 *   mesmo às vezes — que é como gente moderada de fato responde. Este modo
 *   recupera as coordenadas do arquétipo em esperança, e é o que vale para
 *   avaliar o banco.
 *
 * O `ruido` acrescenta respostas fora de padrão por cima disso: distração,
 * desconhecimento do tema, chute.
 */

import { readFileSync } from 'node:fs';
import { EIXOS, pontuar, rotular, rngSemente } from '../js/motor.js';
import { fileURLToPath } from 'node:url';

export function carregarDados() {
  const ler = (nome) => JSON.parse(
    readFileSync(fileURLToPath(new URL(`../dados/${nome}`, import.meta.url)), 'utf8')
  );
  return { banco: ler('perguntas.json'), arquetipos: ler('arquetipos.json') };
}

/** Concordância latente do arquétipo com uma pergunta, em [−1, 1]. */
export function concordancia(pergunta, coordenadas) {
  let projecao = 0;
  let peso = 0;
  for (const k of EIXOS) {
    const w = pergunta.vetor[k] || 0;
    if (w === 0) continue;
    projecao += w * (coordenadas[k] || 0);
    peso += Math.abs(w);
  }
  return peso === 0 ? 0 : projecao / peso;
}

/** Uma resposta sintética. Ver os dois modos no cabeçalho. */
export function responder(pergunta, coordenadas, rng, modo = 'realista', ruido = 0) {
  if (ruido > 0 && rng() < ruido) {
    const sorteio = rng();
    return sorteio < 0.45 ? 'sim' : sorteio < 0.9 ? 'nao' : 'pular';
  }

  const a = concordancia(pergunta, coordenadas);

  if (modo === 'coerente') {
    return a > 0 ? 'sim' : a < 0 ? 'nao' : 'pular';
  }

  if (a === 0) return rng() < 0.5 ? 'sim' : 'nao';
  return rng() < (1 + a) / 2 ? 'sim' : 'nao';
}

/** Um respondente completo. */
export function responderTudo(perguntas, coordenadas, rng, modo, ruido) {
  const respostas = {};
  for (const q of perguntas) respostas[q.id] = responder(q, coordenadas, rng, modo, ruido);
  return respostas;
}

function main() {
  const { banco, arquetipos } = carregarDados();
  const n = Number(process.argv[2] || 500);
  const ruido = Number(process.argv[3] ?? 0.08);

  const perguntas = banco.perguntas.filter((q) => q.ativa !== false);
  const rng = rngSemente(20260913);
  const ganho = banco.config.ganho_rotulo ?? 1;

  console.log(`Simulação: ${n} respondentes por arquétipo, ruído de ${(ruido * 100).toFixed(0)}%`);
  console.log(`Banco ${banco.versao} · ${perguntas.length} itens ativos · ganho de rótulo ${ganho}\n`);

  const erroPorEixo = {};
  const confiancaPorEixo = {};
  const recuperado = {};
  for (const k of EIXOS) { erroPorEixo[k] = 0; confiancaPorEixo[k] = 0; recuperado[k] = []; }
  let amostras = 0;

  const linhas = [];

  for (const arq of arquetipos.arquetipos) {
    let acertos = 0;
    let acertosTop2 = 0;
    let somaIntensidade = 0;

    for (let i = 0; i < n; i++) {
      const respostas = responderTudo(perguntas, arq.coordenadas, rng, 'realista', ruido);
      const p = pontuar(perguntas, respostas, banco.config);
      const r = rotular(p.posicao, arquetipos, { intensidade: p.intensidade, ganho });

      if (r.rotulo === arq.id) acertos++;
      if (r.rotulo === arq.id || r.rotulo2 === arq.id) acertosTop2++;
      somaIntensidade += p.intensidade;

      for (const k of EIXOS) {
        erroPorEixo[k] += Math.abs(p.posicao[k] / 100 - (arq.coordenadas[k] || 0));
        confiancaPorEixo[k] += p.confianca[k];
        recuperado[k].push([arq.coordenadas[k] || 0, p.posicao[k] / 100]);
      }
      amostras++;
    }

    // Respondente coerente ao extremo: até onde o banco deixa ir naquela direção.
    const fanatico = responderTudo(perguntas, arq.coordenadas, rng, 'coerente', 0);
    const pf = pontuar(perguntas, fanatico, banco.config);
    const rf = rotular(pf.posicao, arquetipos, { intensidade: pf.intensidade, ganho });

    linhas.push({
      nome: arq.nome,
      taxa: (100 * acertos) / n,
      taxaTop2: (100 * acertosTop2) / n,
      intensidade: somaIntensidade / n,
      extremo: rf.rotulo,
      extremoOk: rf.rotulo === arq.id,
      intensidadeExtremo: pf.intensidade,
    });
  }

  console.log('Taxa de acerto do rótulo, por arquétipo (respondente realista)');
  console.log('arquétipo                     1º lugar   1º ou 2º   intensidade   no extremo');
  for (const l of linhas) {
    const marca = l.taxa < 60 ? '  <--' : '';
    console.log(
      `${l.nome.padEnd(29)} ${l.taxa.toFixed(0).padStart(7)}%  ${l.taxaTop2.toFixed(0).padStart(8)}%   ` +
      `${l.intensidade.toFixed(0).padStart(10)}%   ${(l.extremoOk ? 'ok' : `→ ${l.extremo}`).padStart(10)}${marca}`
    );
  }

  const media = linhas.reduce((a, l) => a + l.taxa, 0) / linhas.length;
  const mediaTop2 = linhas.reduce((a, l) => a + l.taxaTop2, 0) / linhas.length;
  console.log(`\nMédia: ${media.toFixed(1)}% em 1º lugar, ${mediaTop2.toFixed(1)}% em 1º ou 2º`);

  console.log('\nDefinição dos eixos');
  console.log('eixo   erro médio   inclinação   confiança média');
  for (const k of EIXOS) {
    const erro = erroPorEixo[k] / amostras;
    const conf = confiancaPorEixo[k] / amostras;

    // Inclinação da reta posição_recuperada ≈ b × coordenada_real.
    // b ≈ 1 é um eixo que mede o que promete; b baixo é um eixo comprimido.
    let num = 0;
    let den = 0;
    for (const [real, obtido] of recuperado[k]) { num += real * obtido; den += real * real; }
    const inclinacao = den === 0 ? 0 : num / den;

    const marca = inclinacao < 0.6 ? '  <-- comprimido' : erro > 0.25 ? '  <-- frágil' : '';
    console.log(
      `${k.padEnd(6)} ${erro.toFixed(3).padStart(10)}   ${inclinacao.toFixed(2).padStart(10)}   ${conf.toFixed(0).padStart(14)}%${marca}`
    );
  }
}

const executadoDireto = process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop());
if (executadoDireto) main();
