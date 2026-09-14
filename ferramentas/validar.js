/**
 * Prumo — validador do banco de perguntas.
 *
 *   node ferramentas/validar.js [caminho/para/perguntas.json]
 *
 * Confere schema, polaridade por eixo, pendências de status quo e as regras de
 * redação extraídas da revisão adversarial. Sai com código 1 se houver erro.
 *
 * ERRO  = o banco não pode ser publicado assim.
 * AVISO = merece olhada humana, mas não bloqueia.
 */

import { readFileSync } from 'node:fs';
import { EIXOS } from '../js/motor.js';
import { fileURLToPath } from 'node:url';

const STATUS_VALIDOS = ['sim', 'nao', 'neutro'];
const NIVEIS_VALIDOS = [1, 2, 3];

// Regra 7.1: perguntar a política em si, nunca sua manutenção.
const PROIBIDAS = [
  { regex: /\bcontinuar\b/i, termo: 'continuar' },
  { regex: /\bcontinuarem\b/i, termo: 'continuarem' },
  { regex: /\bvoltar a\b/i, termo: 'voltar a' },
  { regex: /\bmanter\b/i, termo: 'manter' },
  { regex: /\bmantida[s]?\b/i, termo: 'mantida' },
  { regex: /\bseguir sendo\b/i, termo: 'seguir sendo' },
];

const CARREGADOS = ['justo', 'injusto', 'abusivo', 'radical', 'corrupto', 'absurdo', 'escandaloso'];

const erros = [];
const avisos = [];

function erro(id, mensagem) { erros.push(`${id}: ${mensagem}`); }
function aviso(id, mensagem) { avisos.push(`${id}: ${mensagem}`); }

function validarItem(q, vistos) {
  const id = q.id || '(sem id)';

  for (const campo of ['id', 'nivel', 'tema', 'texto', 'vetor', 'status_quo', 'fonte_status_quo']) {
    if (q[campo] === undefined || q[campo] === null) erro(id, `campo obrigatório ausente: ${campo}`);
  }
  if (q.id && vistos.has(q.id)) erro(id, 'id duplicado');
  if (q.id) vistos.add(q.id);

  if (!NIVEIS_VALIDOS.includes(q.nivel)) erro(id, `nivel inválido: ${q.nivel}`);
  if (typeof q.tema !== 'string' || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(q.tema || '')) {
    erro(id, `tema deve estar em kebab-case: "${q.tema}"`);
  }
  if (typeof q.texto !== 'string' || q.texto.trim().length < 10) erro(id, 'texto vazio ou curto demais');
  if (q.contexto !== undefined && typeof q.contexto !== 'string') erro(id, 'contexto deve ser string');

  // Vetor
  if (q.vetor && typeof q.vetor === 'object') {
    const chaves = Object.keys(q.vetor);
    for (const k of chaves) if (!EIXOS.includes(k)) erro(id, `eixo desconhecido no vetor: ${k}`);
    let afetados = 0;
    for (const k of EIXOS) {
      const w = q.vetor[k];
      if (w === undefined) { erro(id, `vetor sem o eixo ${k}`); continue; }
      if (!Number.isInteger(w) || w < -3 || w > 3) erro(id, `peso inválido em ${k}: ${w} (esperado inteiro de −3 a 3)`);
      if (w !== 0) afetados++;
    }
    if (afetados === 0) erro(id, 'vetor nulo: o item não mede nada');
    if (afetados > 3) aviso(id, `vetor afeta ${afetados} eixos (a spec orienta no máximo 3)`);
  }

  // Status quo
  if (q.status_quo === 'verificar') {
    erro(id, 'status_quo continua "verificar" — banco não publicável');
  } else if (!STATUS_VALIDOS.includes(q.status_quo)) {
    erro(id, `status_quo inválido: "${q.status_quo}"`);
  }
  const fonte = String(q.fonte_status_quo || '');
  if (fonte.trim().length === 0) erro(id, 'fonte_status_quo vazia');
  if (/conferir/i.test(fonte)) erro(id, 'fonte_status_quo contém "conferir" — pendência não resolvida');

  // Redação
  const texto = String(q.texto || '');
  for (const p of PROIBIDAS) {
    if (p.regex.test(texto)) erro(id, `enunciado usa "${p.termo}": perguntar a política, não sua manutenção`);
  }
  if (/\bvocê é contra\b/i.test(texto)) erro(id, 'enunciado em formulação negativa ("você é contra")');
  for (const adj of CARREGADOS) {
    if (new RegExp(`\\b${adj}[ao]?s?\\b`, 'i').test(texto)) aviso(id, `adjetivo possivelmente carregado: "${adj}"`);
  }
  if (/\bnão\b/i.test(texto)) aviso(id, 'enunciado contém "não" — conferir se a formulação continua afirmativa');
  if (/\be\b.*\?$/i.test(texto) && texto.split(/\be\b/i).length > 2) {
    aviso(id, 'enunciado com vários "e" — conferir se não são duas perguntas');
  }
  if (!texto.trim().endsWith('?')) aviso(id, 'enunciado não termina em interrogação');
}

function polaridade(perguntas) {
  const linhas = [];
  for (const k of EIXOS) {
    let positivo = 0;
    let total = 0;
    let itens = 0;
    for (const q of perguntas) {
      const w = (q.vetor && q.vetor[k]) || 0;
      if (w === 0) continue;
      itens++;
      total += Math.abs(w);
      if (w > 0) positivo += Math.abs(w);
    }
    const fracao = total === 0 ? 0 : (100 * positivo) / total;
    linhas.push({ eixo: k, itens, peso: total, fracao });
    if (total === 0) {
      erro(`eixo ${k}`, 'nenhum item mede este eixo');
    } else if (fracao < 40 || fracao > 60) {
      erro(`eixo ${k}`, `polaridade em ${fracao.toFixed(1)}% (o permitido é 40–60%): o banco premia quem responde sempre igual`);
    }
  }
  return linhas;
}

function pesoRelativo(perguntas) {
  const pesos = {};
  let soma = 0;
  for (const k of EIXOS) {
    pesos[k] = perguntas.reduce((acc, q) => acc + Math.abs((q.vetor && q.vetor[k]) || 0), 0);
    soma += pesos[k];
  }
  return EIXOS.map((k) => ({ eixo: k, peso: pesos[k], fracao: soma === 0 ? 0 : (100 * pesos[k]) / soma }));
}

function main() {
  const caminho = process.argv[2] || fileURLToPath(new URL('../dados/perguntas.json', import.meta.url));
  const banco = JSON.parse(readFileSync(caminho, 'utf8'));

  if (!Array.isArray(banco.perguntas)) {
    console.error('ERRO: arquivo sem a lista "perguntas".');
    process.exit(1);
  }
  if (!banco.config || typeof banco.config.fator_pulo !== 'number') {
    erro('config', 'config.fator_pulo ausente ou não numérico');
  }

  const ativas = banco.perguntas.filter((q) => q.ativa !== false);
  const vistos = new Set();
  for (const q of banco.perguntas) validarItem(q, vistos);

  const pol = polaridade(ativas);
  const peso = pesoRelativo(ativas);

  console.log(`Banco: ${caminho}`);
  console.log(`Versão ${banco.versao} · ${banco.perguntas.length} itens (${ativas.length} ativos)\n`);

  console.log('Polaridade e peso por eixo');
  console.log('eixo   itens   peso   SIM→polo+   % do banco');
  for (let i = 0; i < EIXOS.length; i++) {
    const p = pol[i];
    const w = peso[i];
    const marca = p.fracao < 40 || p.fracao > 60 ? '  <-- fora da faixa' : '';
    console.log(
      `${p.eixo.padEnd(6)} ${String(p.itens).padStart(5)} ${String(p.peso).padStart(6)}   ${p.fracao.toFixed(1).padStart(6)}%     ${w.fracao.toFixed(1).padStart(5)}%${marca}`
    );
  }

  const porNivel = {};
  for (const q of ativas) porNivel[q.nivel] = (porNivel[q.nivel] || 0) + 1;
  console.log(`\nItens por nível: ${[1, 2, 3].map((n) => `${n}=${porNivel[n] || 0}`).join('  ')}`);

  const porStatus = {};
  for (const q of ativas) porStatus[q.status_quo] = (porStatus[q.status_quo] || 0) + 1;
  console.log(`Status quo: ${Object.entries(porStatus).map(([k, v]) => `${k}=${v}`).join('  ')}`);

  if (avisos.length) {
    console.log(`\n${avisos.length} aviso(s):`);
    for (const a of avisos) console.log(`  · ${a}`);
  }

  if (erros.length) {
    console.log(`\n${erros.length} ERRO(s):`);
    for (const e of erros) console.log(`  ✗ ${e}`);
    console.log('\nBanco reprovado.');
    process.exit(1);
  }

  console.log('\nBanco aprovado.');
}

main();
