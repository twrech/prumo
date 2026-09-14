/**
 * Prumo — testes do motor e do código de perfil.
 *
 *   node testes/motor.test.js
 *
 * Casos obrigatórios da spec: tudo SIM, tudo NÃO, tudo PULAR e um respondente
 * por arquétipo. Mais os invariantes do código de perfil.
 */

import { readFileSync } from 'node:fs';
import {
  EIXOS, pontuar, intensidade, rotular, gerarPerfil, ordenarPerguntas, rngSemente,
} from '../js/motor.js';
import { codificar, decodificar } from '../js/perfil.js';
import { responderTudo } from '../ferramentas/simular.js';
import { fileURLToPath } from 'node:url';

function carregar(nome) {
  return JSON.parse(readFileSync(fileURLToPath(new URL(`../dados/${nome}`, import.meta.url)), 'utf8'));
}

const banco = carregar('perguntas.json');
const arquetipos = carregar('arquetipos.json');
const perguntas = banco.perguntas.filter((q) => q.ativa !== false);

let passou = 0;
const falhas = [];

function teste(nome, fn) {
  try {
    fn();
    passou++;
    console.log(`  ok   ${nome}`);
  } catch (e) {
    falhas.push({ nome, erro: e.message });
    console.log(`  FALHA ${nome}`);
    console.log(`        ${e.message}`);
  }
}

function igual(obtido, esperado, contexto = '') {
  if (obtido !== esperado) {
    throw new Error(`${contexto} esperado ${JSON.stringify(esperado)}, obtido ${JSON.stringify(obtido)}`);
  }
}

function perto(obtido, esperado, tolerancia, contexto = '') {
  if (Math.abs(obtido - esperado) > tolerancia) {
    throw new Error(`${contexto} esperado ${esperado} ±${tolerancia}, obtido ${obtido}`);
  }
}

function verdadeiro(condicao, mensagem) {
  if (!condicao) throw new Error(mensagem);
}

function todos(valor) {
  const r = {};
  for (const q of perguntas) r[q.id] = valor;
  return r;
}

/** Posição teórica de quem responde SIM a tudo: 100 × Σw / Σ|w| por eixo. */
function posicaoTudoSim() {
  const alvo = {};
  for (const k of EIXOS) {
    let s = 0;
    let m = 0;
    for (const q of perguntas) { s += q.vetor[k] || 0; m += Math.abs(q.vetor[k] || 0); }
    alvo[k] = m === 0 ? 0 : Math.round((100 * s) / m);
  }
  return alvo;
}

console.log('motor.js\n');

teste('tudo SIM bate com a fórmula e dá confiança 100 em todos os eixos', () => {
  const p = pontuar(perguntas, todos('sim'), banco.config);
  const alvo = posicaoTudoSim();
  for (const k of EIXOS) {
    igual(p.posicao[k], alvo[k], `posição ${k}:`);
    igual(p.confianca[k], 100, `confiança ${k}:`);
  }
  igual(p.respondidas, perguntas.length);
});

teste('tudo NÃO é o espelho de tudo SIM', () => {
  const sim = pontuar(perguntas, todos('sim'), banco.config);
  const nao = pontuar(perguntas, todos('nao'), banco.config);
  for (const k of EIXOS) {
    perto(nao.posicao[k], -sim.posicao[k], 1, `posição ${k}:`);
    igual(nao.confianca[k], 100, `confiança ${k}:`);
  }
});

teste('tudo PULAR zera a confiança e segue o status quo com peso reduzido', () => {
  const p = pontuar(perguntas, todos('pular'), banco.config);
  for (const k of EIXOS) {
    igual(p.confianca[k], 0, `confiança ${k}:`);

    let s = 0;
    let m = 0;
    for (const q of perguntas) {
      const w = q.vetor[k] || 0;
      if (w === 0) continue;
      const dir = q.status_quo === 'sim' ? 1 : q.status_quo === 'nao' ? -1 : 0;
      s += banco.config.fator_pulo * dir * w;
      m += Math.abs(w);
    }
    igual(p.posicao[k], m === 0 ? 0 : Math.round((100 * s) / m), `posição ${k}:`);
  }
  igual(p.respondidas, 0);
  igual(p.apresentadas, perguntas.length);
});

teste('pular nunca chega perto de responder: fica dentro de ±30% do eixo', () => {
  const p = pontuar(perguntas, todos('pular'), banco.config);
  for (const k of EIXOS) {
    verdadeiro(Math.abs(p.posicao[k]) <= 30, `eixo ${k} chegou a ${p.posicao[k]} só pulando`);
  }
});

teste('resposta ausente não entra no cálculo nem no denominador', () => {
  const parcial = {};
  perguntas.slice(0, 10).forEach((q) => { parcial[q.id] = 'sim'; });
  const p = pontuar(perguntas, parcial, banco.config);
  igual(p.apresentadas, 10);
  igual(p.respondidas, 10);
});

teste('banco vazio não quebra e devolve centro com confiança zero', () => {
  const p = pontuar([], {}, banco.config);
  for (const k of EIXOS) { igual(p.posicao[k], 0); igual(p.confianca[k], 0); }
  igual(p.intensidade, 0);
});

teste('intensidade: centro = 0%, extremo em tudo = 100%', () => {
  igual(intensidade({ eco: 0, soc: 0, pod: 0, sob: 0, amb: 0 }), 0);
  igual(intensidade({ eco: 100, soc: 100, pod: 100, sob: 100, amb: 100 }), 100);
  igual(intensidade({ eco: -100, soc: -100, pod: -100, sob: -100, amb: -100 }), 100);
});

/**
 * Respondentes sintéticos por arquétipo.
 *
 * Usa o modo `realista` do simulador: quem tem convicção fraca num eixo
 * discorda de si mesmo às vezes. O modo `coerente` (responder sempre pelo sinal
 * da projeção) descreve um fanático, não uma pessoa, e empurra todo mundo para
 * o extremo — foi assim que a primeira versão destes testes concluiu, errado,
 * que social-democrata e conservador eram inalcançáveis.
 *
 * A simulação roda com o ganho de rótulo que o banco declara em `config`, ou
 * seja, com a configuração que de fato vai ao ar. Os limiares abaixo são rede
 * de segurança contra regressão, calibrados com margem sobre o medido — não são
 * a meta de qualidade.
 */
const AMOSTRAS_POR_ARQUETIPO = 200;

function simularArquetipos(ganho = 1) {
  const rng = rngSemente(20260913);
  const resultado = [];
  for (const arq of arquetipos.arquetipos) {
    let primeiro = 0;
    let doisPrimeiros = 0;
    const soma = {};
    for (const k of EIXOS) soma[k] = 0;

    for (let i = 0; i < AMOSTRAS_POR_ARQUETIPO; i++) {
      const respostas = responderTudo(perguntas, arq.coordenadas, rng, 'realista', 0.08);
      const p = pontuar(perguntas, respostas, banco.config);
      const r = rotular(p.posicao, arquetipos, { intensidade: p.intensidade, ganho });
      if (r.rotulo === arq.id) primeiro++;
      if (r.rotulo === arq.id || r.rotulo2 === arq.id) doisPrimeiros++;
      for (const k of EIXOS) soma[k] += p.posicao[k] / 100;
    }

    const medio = {};
    for (const k of EIXOS) medio[k] = soma[k] / AMOSTRAS_POR_ARQUETIPO;
    resultado.push({
      id: arq.id,
      coordenadas: arq.coordenadas,
      medio,
      taxa: (100 * primeiro) / AMOSTRAS_POR_ARQUETIPO,
      taxaTop2: (100 * doisPrimeiros) / AMOSTRAS_POR_ARQUETIPO,
    });
  }
  return resultado;
}

const simulacao = simularArquetipos(banco.config.ganho_rotulo ?? 1);

teste('todo arquétipo aparece em 1º ou 2º lugar para a grande maioria dos seus', () => {
  const fracos = simulacao
    .filter((s) => s.taxaTop2 < 85)
    .map((s) => `${s.id} ${s.taxaTop2.toFixed(0)}%`);
  verdadeiro(fracos.length === 0, `abaixo de 85% em 1º/2º: ${fracos.join('; ')}`);
});

teste('nenhum arquétipo é inalcançável em 1º lugar', () => {
  const fracos = simulacao
    .filter((s) => s.taxa < 55)
    .map((s) => `${s.id} ${s.taxa.toFixed(0)}%`);
  verdadeiro(fracos.length === 0, `abaixo de 55% em 1º lugar: ${fracos.join('; ')}`);
});

teste('média de acerto em 1º lugar não regride', () => {
  const media = simulacao.reduce((a, s) => a + s.taxa, 0) / simulacao.length;
  verdadeiro(media >= 78, `média caiu para ${media.toFixed(1)}% (piso 78%)`);
});

teste('nenhum eixo perde o sinal: o vetor recuperado aponta para o lado certo', () => {
  const problemas = [];
  for (const s of simulacao) {
    for (const k of EIXOS) {
      const real = s.coordenadas[k] || 0;
      if (Math.abs(real) < 0.3) continue;          // convicção fraca: sinal não é exigível
      if (Math.sign(s.medio[k]) !== Math.sign(real)) {
        problemas.push(`${s.id}/${k}: real ${real}, recuperado ${s.medio[k].toFixed(2)}`);
      }
    }
  }
  verdadeiro(problemas.length === 0, `sinal invertido em ${problemas.join('; ')}`);
});

teste('nenhum eixo está comprimido além do resto: inclinação ≥ 0,5 em todos', () => {
  const problemas = [];
  for (const k of EIXOS) {
    let num = 0;
    let den = 0;
    for (const s of simulacao) {
      const real = s.coordenadas[k] || 0;
      num += real * s.medio[k];
      den += real * real;
    }
    const inclinacao = den === 0 ? 0 : num / den;
    if (inclinacao < 0.5) problemas.push(`${k}: ${inclinacao.toFixed(2)}`);
  }
  verdadeiro(problemas.length === 0, `eixos comprimidos: ${problemas.join('; ')}`);
});

teste('abaixo do limiar de intensidade o rótulo é centrista', () => {
  const r = rotular({ eco: 2, soc: -1, pod: 0, sob: 1, amb: -2 }, arquetipos);
  igual(r.rotulo, 'centrista');
});

teste('gerarPerfil devolve o formato da seção 5.4 e nenhuma resposta', () => {
  const perfil = gerarPerfil(perguntas, todos('sim'), arquetipos, banco.config, '2026-09-13');
  igual(perfil.v, 1);
  igual(perfil.data, '2026-09-13');
  verdadeiro(typeof perfil.rotulo === 'string' && perfil.rotulo.length > 0, 'rótulo ausente');
  const chaves = Object.keys(perfil).sort().join(',');
  igual(chaves, 'confianca,data,intensidade,posicao,rotulo,rotulo2,v', 'chaves do perfil:');
  verdadeiro(!JSON.stringify(perfil).includes('q001'), 'o perfil vazou um id de pergunta');
});

console.log('\nordenação\n');

teste('ordenação respeita os blocos de nível e não perde item', () => {
  const ordem = ordenarPerguntas(perguntas, rngSemente(7));
  igual(ordem.length, perguntas.length);
  let ultimo = 0;
  for (const q of ordem) {
    verdadeiro(q.nivel >= ultimo, `nível ${q.nivel} veio depois de ${ultimo}`);
    ultimo = q.nivel;
  }
});

teste('ordenação embaralha de sessão para sessão', () => {
  const a = ordenarPerguntas(perguntas, rngSemente(1)).map((q) => q.id).join();
  const b = ordenarPerguntas(perguntas, rngSemente(2)).map((q) => q.id).join();
  verdadeiro(a !== b, 'duas sessões produziram exatamente a mesma ordem');
});

teste('nenhum tema aparece duas vezes seguidas', () => {
  for (const semente of [1, 2, 3, 42, 2026]) {
    const ordem = ordenarPerguntas(perguntas, rngSemente(semente));
    for (let i = 1; i < ordem.length; i++) {
      verdadeiro(
        ordem[i].tema !== ordem[i - 1].tema,
        `semente ${semente}: tema "${ordem[i].tema}" repetiu na posição ${i}`
      );
    }
  }
});

console.log('\nperfil.js\n');

teste('codificar e decodificar devolve o mesmo vetor, em 16 caracteres', () => {
  const perfil = gerarPerfil(perguntas, todos('sim'), arquetipos, banco.config, '2026-09-13');
  const codigo = codificar(perfil);
  igual(codigo.length, 16, 'tamanho do código:');
  const volta = decodificar(codigo);
  for (const k of EIXOS) {
    igual(volta.posicao[k], perfil.posicao[k], `posição ${k}:`);
    igual(volta.confianca[k], perfil.confianca[k], `confiança ${k}:`);
  }
});

teste('extremos negativos e positivos sobrevivem à ida e volta', () => {
  const perfil = {
    v: 1,
    posicao: { eco: -100, soc: 100, pod: -1, sob: 0, amb: 99 },
    confianca: { eco: 0, soc: 100, pod: 55, sob: 1, amb: 100 },
  };
  const volta = decodificar(codificar(perfil));
  for (const k of EIXOS) {
    igual(volta.posicao[k], perfil.posicao[k], `posição ${k}:`);
    igual(volta.confianca[k], perfil.confianca[k], `confiança ${k}:`);
  }
});

teste('o código usa só caracteres seguros em URL', () => {
  const perfil = { v: 1, posicao: { eco: -100, soc: -99, pod: -50, sob: 100, amb: 73 }, confianca: { eco: 100, soc: 99, pod: 44, sob: 0, amb: 12 } };
  const codigo = codificar(perfil);
  verdadeiro(/^[A-Za-z0-9_-]{16}$/.test(codigo), `código fora do alfabeto base64url: ${codigo}`);
});

teste('código adulterado é recusado pelo checksum', () => {
  const perfil = { v: 1, posicao: { eco: 10, soc: 20, pod: 30, sob: 40, amb: 50 }, confianca: { eco: 90, soc: 80, pod: 70, sob: 60, amb: 50 } };
  const codigo = codificar(perfil);
  const trocado = (codigo[0] === 'A' ? 'B' : 'A') + codigo.slice(1);
  let lancou = false;
  try { decodificar(trocado); } catch { lancou = true; }
  verdadeiro(lancou, 'aceitou um código adulterado');
});

teste('código truncado é recusado', () => {
  let lancou = false;
  try { decodificar('AAAA'); } catch { lancou = true; }
  verdadeiro(lancou, 'aceitou um código curto');
});

teste('mil perfis aleatórios fazem a ida e a volta sem perda', () => {
  const rng = rngSemente(99);
  for (let i = 0; i < 1000; i++) {
    const posicao = {};
    const confianca = {};
    for (const k of EIXOS) {
      posicao[k] = Math.round(rng() * 200) - 100;
      confianca[k] = Math.round(rng() * 100);
    }
    const volta = decodificar(codificar({ v: 1, posicao, confianca }));
    for (const k of EIXOS) {
      igual(volta.posicao[k], posicao[k], `iteração ${i}, posição ${k}:`);
      igual(volta.confianca[k], confianca[k], `iteração ${i}, confiança ${k}:`);
    }
  }
});

console.log(`\n${passou} passaram, ${falhas.length} falharam`);
if (falhas.length) process.exit(1);
