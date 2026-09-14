/**
 * Prumo — motor de pontuação.
 *
 * Funções puras, sem DOM e sem efeito colateral. Implementa as seções 4.1 a 4.7
 * de PRUMO-spec-v1.md. É o mesmo motor usado pelas etapas 2 e 3.
 *
 * Nenhuma função deste arquivo grava nada: não há localStorage, cookie nem rede.
 */

export const EIXOS = ['eco', 'soc', 'pod', 'sob', 'amb'];

export const CONFIG_PADRAO = { fator_pulo: 0.3 };

/** Direção do status quo: SIM = +1, NÃO = −1, neutro = 0 (pular não pontua). */
function direcaoStatusQuo(statusQuo) {
  if (statusQuo === 'sim') return 1;
  if (statusQuo === 'nao') return -1;
  return 0;
}

/**
 * Contribuição de uma resposta ao acumulador, por eixo.
 * SIM soma o vetor; NÃO subtrai; PULAR aplica fator_pulo × direção(status_quo).
 */
function contribuicao(pergunta, resposta, fatorPulo) {
  if (resposta === 'sim') return 1;
  if (resposta === 'nao') return -1;
  if (resposta === 'pular') return fatorPulo * direcaoStatusQuo(pergunta.status_quo);
  return 0;
}

/**
 * Pontua um conjunto de respostas.
 *
 * @param {Array}  perguntas  itens apresentados ao respondente (já filtrados por `ativa`)
 * @param {Object} respostas  mapa id → 'sim' | 'nao' | 'pular'
 * @param {Object} [config]   { fator_pulo }
 * @returns {{posicao:Object, confianca:Object, intensidade:number, respondidas:number, apresentadas:number}}
 *
 * Só entram no cálculo as perguntas que têm resposta registrada. Quem abandona
 * no meio é pontuado sobre o que viu, e a confiança reflete isso.
 */
export function pontuar(perguntas, respostas, config = CONFIG_PADRAO) {
  const fatorPulo = config && typeof config.fator_pulo === 'number'
    ? config.fator_pulo
    : CONFIG_PADRAO.fator_pulo;

  const S = {};   // acumulador com sinal
  const M = {};   // peso máximo possível (perguntas apresentadas)
  const R = {};   // peso efetivamente respondido (SIM ou NÃO)
  for (const k of EIXOS) { S[k] = 0; M[k] = 0; R[k] = 0; }

  let respondidas = 0;
  let apresentadas = 0;

  for (const q of perguntas) {
    const r = respostas[q.id];
    if (r !== 'sim' && r !== 'nao' && r !== 'pular') continue;

    apresentadas++;
    if (r !== 'pular') respondidas++;

    const fator = contribuicao(q, r, fatorPulo);
    for (const k of EIXOS) {
      const w = q.vetor[k] || 0;
      if (w === 0) continue;
      M[k] += Math.abs(w);
      S[k] += fator * w;
      if (r !== 'pular') R[k] += Math.abs(w);
    }
  }

  const posicao = {};
  const confianca = {};
  for (const k of EIXOS) {
    posicao[k] = M[k] === 0 ? 0 : Math.round((100 * S[k]) / M[k]);
    confianca[k] = M[k] === 0 ? 0 : Math.round((100 * R[k]) / M[k]);
  }

  return { posicao, confianca, intensidade: intensidade(posicao), respondidas, apresentadas };
}

/**
 * Intensidade global: norma do vetor normalizada por √5.
 * 0% = centro absoluto; 100% = extremo em todos os cinco eixos.
 */
export function intensidade(posicao) {
  let soma = 0;
  for (const k of EIXOS) {
    const c = (posicao[k] || 0) / 100;
    soma += c * c;
  }
  return Math.round((Math.sqrt(soma) / Math.sqrt(5)) * 100);
}

/** Faixa textual da intensidade (seção 4.5). */
export function faixaIntensidade(valor) {
  if (valor < 15) return 'equilibrado';
  if (valor < 35) return 'levemente';
  if (valor < 60) return 'moderadamente';
  if (valor < 80) return 'fortemente';
  return 'extremamente';
}

/** Faixa textual da confiança de um eixo (seção 4.4). */
export function faixaConfianca(valor) {
  if (valor < 40) return 'pouco definida';
  if (valor <= 70) return 'razoável';
  return 'bem definida';
}

function distancia(posicao, coordenadas) {
  let soma = 0;
  for (const k of EIXOS) {
    const d = (posicao[k] || 0) / 100 - (coordenadas[k] || 0);
    soma += d * d;
  }
  return Math.sqrt(soma);
}

/**
 * Rótulo: arquétipo de menor distância euclidiana, mais o segundo mais próximo.
 * Abaixo do limiar de intensidade o rótulo é sempre "centrista" (seção 4.6).
 *
 * `opcoes.ganho` multiplica a posição ANTES de comparar com os arquétipos, sem
 * alterar a posição exibida ao usuário. Existe porque a simulação mostrou que o
 * vetor recuperado sai comprimido em ~⅔ em relação às coordenadas dos
 * arquétipos (ver relatório do simulador). Padrão 1 = comportamento da spec.
 * DECISÃO PENDENTE de Talyz: ou este ganho, ou reescalar arquetipos.json.
 *
 * @returns {{rotulo:string, rotulo2:string, distancias:Array}}
 */
export function rotular(posicao, arquetipos, opcoes = {}) {
  const lista = Array.isArray(arquetipos) ? arquetipos : arquetipos.arquetipos;
  const limiar = opcoes.limiar_centrista
    ?? (arquetipos && arquetipos.limiar_centrista)
    ?? 15;

  const ganho = opcoes.ganho ?? 1;
  const alvo = {};
  for (const k of EIXOS) {
    alvo[k] = Math.max(-100, Math.min(100, (posicao[k] || 0) * ganho));
  }

  const ordenados = lista
    .map((a) => ({ id: a.id, nome: a.nome, distancia: distancia(alvo, a.coordenadas) }))
    .sort((x, y) => x.distancia - y.distancia);

  const intens = opcoes.intensidade ?? intensidade(posicao);
  const centrista = lista.find((a) => a.id === 'centrista');

  if (intens < limiar && centrista) {
    const segundo = ordenados.find((a) => a.id !== 'centrista');
    return {
      rotulo: 'centrista',
      rotulo2: segundo ? segundo.id : null,
      distancias: ordenados,
    };
  }

  return {
    rotulo: ordenados[0].id,
    rotulo2: ordenados[1] ? ordenados[1].id : null,
    distancias: ordenados,
  };
}

/**
 * Perfil completo (seção 5.4) — a saída da etapa 1 e a entrada das etapas 2 e 3.
 * As respostas individuais NUNCA fazem parte do perfil.
 */
export function gerarPerfil(perguntas, respostas, arquetipos, config = CONFIG_PADRAO, data = null) {
  const p = pontuar(perguntas, respostas, config);
  const r = rotular(p.posicao, arquetipos, {
    intensidade: p.intensidade,
    ganho: config && config.ganho_rotulo,
  });
  return {
    v: 1,
    posicao: p.posicao,
    confianca: p.confianca,
    intensidade: p.intensidade,
    rotulo: r.rotulo,
    rotulo2: r.rotulo2,
    data: data || new Date().toISOString().slice(0, 10),
  };
}

/** Gerador pseudoaleatório determinístico (mulberry32), para simulação e testes. */
export function rngSemente(semente) {
  let a = semente >>> 0;
  return function () {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function embaralhar(lista, rng) {
  const a = lista.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Ordem de apresentação (seção 4.7): blocos por nível, embaralhados dentro do
 * bloco, evitando dois temas iguais em sequência. Perguntas inativas saem.
 */
export function ordenarPerguntas(perguntas, rng = Math.random) {
  const ativas = perguntas.filter((q) => q.ativa !== false);
  const saida = [];

  for (const nivel of [1, 2, 3]) {
    const bloco = embaralhar(ativas.filter((q) => q.nivel === nivel), rng);

    // Passada de separação: empurra para frente qualquer item cujo tema repita o anterior.
    for (let i = 1; i < bloco.length; i++) {
      if (bloco[i].tema !== bloco[i - 1].tema) continue;
      const troca = bloco.findIndex(
        (q, j) => j > i && q.tema !== bloco[i - 1].tema
          && (j + 1 >= bloco.length || bloco[j + 1].tema !== bloco[i].tema)
      );
      if (troca !== -1) [bloco[i], bloco[troca]] = [bloco[troca], bloco[i]];
    }
    saida.push(...bloco);
  }
  return saida;
}
