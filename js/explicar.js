/**
 * Prumo — "por que você ficou aqui".
 *
 * Duas explicações, ambas deterministas e sem IA, feitas na própria aba:
 *
 * 1. A BALANÇA DE CADA EIXO (precisa das respostas). Cada resposta empurra o
 *    eixo para um polo. A posição final é onde a balança parou. Mostramos o
 *    que pesou de cada lado — as respostas que mais puxaram para um polo e
 *    para o outro — e quanto os pulos empurraram. É a mesma conta do motor
 *    (seção 4.3), só que aberta: soma dos dois pratos = S, e S/M = posição.
 *
 * 2. O RÓTULO (precisa só do vetor). O rótulo é o perfil típico mais próximo;
 *    o segundo mais próximo vem logo atrás. Dizemos em qual eixo a disputa
 *    entre os dois se decidiu. Funciona também com o código recuperado.
 *
 * Nada disto é "feedback pedagógico" (seção 9, desligado): não aponta
 * contradição, não sugere refazer, não julga. Só abre a conta.
 */

import { EIXOS } from './motor.js';

function direcaoStatusQuo(sq) {
  if (sq === 'sim') return 1;
  if (sq === 'nao') return -1;
  return 0;
}

/**
 * Balança por eixo.
 *
 * @returns {Object} por eixo: {
 *   negativo: { pontos, respostas: [{id, texto, resposta, pontos}] },
 *   positivo: { ...idem },
 *   pulos:    { quantidade, pontos }   // pontos com sinal
 *   total                              // M do eixo: peso das perguntas apresentadas
 * }
 * `pontos` estão na mesma escala da posição (−100..100): somando os dois
 * pratos e os pulos chega-se à posição exibida, a menos de arredondamento.
 */
export function balanca(perguntas, respostas, config = {}, porLado = 3) {
  const fatorPulo = typeof config.fator_pulo === 'number' ? config.fator_pulo : 0.3;
  const saida = {};
  for (const k of EIXOS) {
    saida[k] = {
      negativo: { pontos: 0, respostas: [] },
      positivo: { pontos: 0, respostas: [] },
      pulos: { quantidade: 0, pontos: 0 },
      total: 0,
    };
  }

  // Primeiro o peso total (M), para pôr tudo na escala da posição.
  for (const q of perguntas) {
    const r = respostas[q.id];
    if (r !== 'sim' && r !== 'nao' && r !== 'pular') continue;
    for (const k of EIXOS) saida[k].total += Math.abs(q.vetor[k] || 0);
  }

  for (const q of perguntas) {
    const r = respostas[q.id];
    if (r !== 'sim' && r !== 'nao' && r !== 'pular') continue;
    for (const k of EIXOS) {
      const w = q.vetor[k] || 0;
      if (!w || !saida[k].total) continue;
      const escala = 100 / saida[k].total;

      if (r === 'pular') {
        saida[k].pulos.quantidade += 1;
        saida[k].pulos.pontos += fatorPulo * direcaoStatusQuo(q.status_quo) * w * escala;
        continue;
      }
      const c = (r === 'sim' ? 1 : -1) * w * escala;
      const prato = c < 0 ? saida[k].negativo : saida[k].positivo;
      prato.pontos += Math.abs(c);
      prato.respostas.push({ id: q.id, texto: q.texto, resposta: r, pontos: Math.abs(c) });
    }
  }

  for (const k of EIXOS) {
    for (const lado of ['negativo', 'positivo']) {
      const prato = saida[k][lado];
      prato.quantidade = prato.respostas.length;
      prato.respostas.sort((a, b) => b.pontos - a.pontos || a.id.localeCompare(b.id));
      prato.respostas = prato.respostas.slice(0, porLado);
      prato.pontos = Math.round(prato.pontos);
      for (const x of prato.respostas) x.pontos = Math.round(x.pontos * 10) / 10;
    }
    saida[k].pulos.pontos = Math.round(saida[k].pulos.pontos);
  }
  return saida;
}

/**
 * Onde se decidiu o rótulo.
 *
 * Com a posição já multiplicada pelo ganho (a mesma que o motor usa para
 * rotular), a diferença entre os quadrados das distâncias ao 2º e ao 1º
 * colocado se reparte, exatamente, eixo por eixo. O eixo com a maior parcela
 * positiva é o que mais afastou você do segundo e aproximou do primeiro.
 *
 * @returns {{ centrista:boolean, primeiro, segundo, eixos:[{eixo, parcela, pessoa, primeiro, segundo}] }}
 */
export function decisaoDoRotulo(perfil, arquetipos, config = {}) {
  const lista = arquetipos.arquetipos;
  const ganho = config.ganho_rotulo ?? 1;
  const limiar = arquetipos.limiar_centrista ?? 15;
  const alvo = {};
  for (const k of EIXOS) alvo[k] = Math.max(-1, Math.min(1, ((perfil.posicao[k] || 0) * ganho) / 100));

  const a1 = lista.find((a) => a.id === perfil.rotulo);
  const a2 = lista.find((a) => a.id === perfil.rotulo2);
  const centrista = perfil.rotulo === 'centrista' && perfil.intensidade < limiar;

  if (!a1 || !a2 || centrista) {
    return { centrista, limiar, primeiro: a1 || null, segundo: a2 || null, eixos: [] };
  }

  const eixos = EIXOS.map((k) => {
    const d1 = alvo[k] - (a1.coordenadas[k] || 0);
    const d2 = alvo[k] - (a2.coordenadas[k] || 0);
    return {
      eixo: k,
      parcela: d2 * d2 - d1 * d1,        // > 0: este eixo favorece o 1º
      pessoa: perfil.posicao[k] || 0,
      primeiro: Math.round((a1.coordenadas[k] || 0) * 100),
      segundo: Math.round((a2.coordenadas[k] || 0) * 100),
    };
  }).sort((x, y) => y.parcela - x.parcela);

  return { centrista: false, limiar, primeiro: a1, segundo: a2, eixos };
}
