/**
 * Prumo — código de perfil.
 *
 * Codificação compacta do perfil (seção 5.5), para levar o resultado da etapa 1
 * para as etapas 2 e 3 sem servidor e sem armazenar nada.
 *
 * Layout, 12 bytes:
 *   [0]      versão (uint8)
 *   [1..5]   posições eco, soc, pod, sob, amb (int8, −100..100)
 *   [6..10]  confianças eco, soc, pod, sob, amb (uint8, 0..100)
 *   [11]     checksum (soma dos bytes 0..10 módulo 256)
 *
 * 12 bytes → 16 caracteres em base64url, sem preenchimento.
 *
 * O código NÃO permite recuperar as respostas: só existem posições agregadas.
 */

import { EIXOS } from './motor.js';

export const VERSAO_PERFIL = 1;

const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function paraBase64url(bytes) {
  let saida = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    saida += ALFABETO[b0 >> 2];
    saida += ALFABETO[((b0 & 3) << 4) | (b1 === undefined ? 0 : b1 >> 4)];
    if (b1 === undefined) break;
    saida += ALFABETO[((b1 & 15) << 2) | (b2 === undefined ? 0 : b2 >> 6)];
    if (b2 === undefined) break;
    saida += ALFABETO[b2 & 63];
  }
  return saida;
}

function deBase64url(texto) {
  const bytes = [];
  let acumulador = 0;
  let bits = 0;
  for (const ch of texto) {
    const valor = ALFABETO.indexOf(ch);
    if (valor === -1) throw new Error('Código de perfil inválido: caractere não permitido.');
    acumulador = (acumulador << 6) | valor;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((acumulador >> bits) & 0xff);
    }
  }
  return bytes;
}

function limitar(valor, minimo, maximo) {
  const n = Math.round(Number(valor) || 0);
  return Math.max(minimo, Math.min(maximo, n));
}

function checksum(bytes) {
  let soma = 0;
  for (let i = 0; i < 11; i++) soma = (soma + bytes[i]) & 0xff;
  return soma;
}

/**
 * Codifica um perfil (seção 5.4) em 16 caracteres.
 * Ignora rótulo, intensidade e data: todos são recalculáveis a partir do vetor.
 */
export function codificar(perfil) {
  const bytes = new Array(12).fill(0);
  bytes[0] = perfil.v || VERSAO_PERFIL;

  EIXOS.forEach((k, i) => {
    const pos = limitar(perfil.posicao[k], -100, 100);
    bytes[1 + i] = pos < 0 ? pos + 256 : pos;          // int8 em complemento de dois
    bytes[6 + i] = limitar(perfil.confianca[k], 0, 100);
  });

  bytes[11] = checksum(bytes);
  return paraBase64url(bytes);
}

/**
 * Decodifica um código de perfil. Lança se o formato, a versão ou o checksum
 * não baterem — um código truncado ou adulterado nunca vira perfil silencioso.
 *
 * Devolve { v, posicao, confianca, intensidade } — sem rótulo e sem data, que
 * quem recebe recalcula com `rotular` e os arquétipos vigentes.
 */
export function decodificar(codigo) {
  if (typeof codigo !== 'string' || codigo.length !== 16) {
    throw new Error('Código de perfil inválido: deve ter 16 caracteres.');
  }

  const bytes = deBase64url(codigo);
  if (bytes.length < 12) throw new Error('Código de perfil inválido: tamanho insuficiente.');
  if (bytes[11] !== checksum(bytes)) {
    throw new Error('Código de perfil inválido: checksum não confere.');
  }
  if (bytes[0] !== VERSAO_PERFIL) {
    throw new Error(`Código de perfil de versão ${bytes[0]}, incompatível com esta versão (${VERSAO_PERFIL}).`);
  }

  const posicao = {};
  const confianca = {};
  EIXOS.forEach((k, i) => {
    const bruto = bytes[1 + i];
    posicao[k] = bruto > 127 ? bruto - 256 : bruto;
    confianca[k] = bytes[6 + i];
  });

  return { v: bytes[0], posicao, confianca };
}

/** Lê o código de perfil de uma URL (`?p=CODIGO`). Devolve null se não houver. */
export function lerDaUrl(url = (typeof location !== 'undefined' ? location.href : '')) {
  try {
    const p = new URL(url).searchParams.get('p');
    return p ? decodificar(p) : null;
  } catch {
    return null;
  }
}
