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

/**
 * Recuperador: aceita o que a pessoa colar e acha o código dentro.
 *
 * Quem fez o teste noutro aparelho chega com uma de três coisas: o código
 * puro (anotado ou copiado do PDF), o endereço inteiro da etapa 2 com `?p=`,
 * ou o código com espaços e quebras de linha que o leitor de PDF acrescenta.
 * As três viram o mesmo código. O que não der para ler vira erro com frase
 * em português simples, porque a pessoa vai ler a mensagem, não o console.
 *
 * Devolve { codigo, perfil } — o código limpo e o perfil decodificado.
 */
export function recuperar(texto) {
  const bruto = String(texto ?? '').trim();
  if (!bruto) throw new Error('Cole o código do seu resultado no campo.');

  let candidato = bruto;
  const noEndereco = bruto.match(/[?&]p=([A-Za-z0-9_\-\s]+)/);
  if (noEndereco) candidato = noEndereco[1];
  candidato = candidato.replace(/\s+/g, '');

  if (candidato.length !== 16) {
    throw new Error(
      `O código tem 16 caracteres, e o que foi colado tem ${candidato.length}. `
      + 'Confira se não ficou faltando ou sobrando alguma letra.'
    );
  }
  if (!/^[A-Za-z0-9_-]{16}$/.test(candidato)) {
    throw new Error('O código só tem letras, números, hífen e sublinhado. Tem algum outro sinal no meio.');
  }
  try {
    return { codigo: candidato, perfil: decodificar(candidato) };
  } catch (e) {
    if (/checksum/.test(e.message)) {
      throw new Error(
        'Esse código não confere: provavelmente alguma letra foi trocada ao copiar. '
        + 'Atenção a maiúsculas e minúsculas, e a letras parecidas como l, I e 1, ou O e 0.'
      );
    }
    if (/versão/.test(e.message)) {
      throw new Error('Esse código é de outra versão do Prumo e não pode ser lido aqui. Será preciso refazer o teste.');
    }
    throw e;
  }
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
