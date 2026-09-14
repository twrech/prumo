/**
 * Prumo — radar de cinco eixos em SVG puro.
 *
 * Sem dependência externa e sem canvas: o SVG vai direto no DOM e também
 * serve de fonte para a imagem do PDF.
 *
 * Convenção do desenho: o anel do MEIO é o zero. Quem está no centro absoluto
 * desenha um pentágono regular sobre esse anel. Para dentro é o polo −, para
 * fora o polo +. Isso preserva o sinal, que um radar comum perderia.
 *
 * A confiança vira a espessura de um traço ao longo do raio: quanto menos
 * definida a posição, mais longo o traço. Posição com confiança abaixo de 40%
 * ganha vértice vazado, para que ninguém leia como certeza o que é chute.
 */

import { EIXOS } from './motor.js';

const TAMANHO = 480;
const CENTRO = TAMANHO / 2;
const RAIO = 130;
const RAIO_ROTULO = 1.15;   // onde os rótulos ficam, em múltiplos do raio

/** Ponto de um eixo: valor em [−100, 100] → coordenada na tela. */
function ponto(indice, valor, raio = RAIO) {
  const angulo = (Math.PI * 2 * indice) / 5 - Math.PI / 2;
  const r = (raio * (Math.max(-100, Math.min(100, valor)) + 100)) / 200;
  return [CENTRO + r * Math.cos(angulo), CENTRO + r * Math.sin(angulo)];
}

function poligono(valores, raio = RAIO) {
  return valores.map((v, i) => ponto(i, v, raio).join(',')).join(' ');
}

function escapar(texto) {
  return String(texto).replace(/[&<>"]/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
  ));
}

/**
 * Desenha o radar.
 *
 * @param {Object} posicao    { eco, soc, pod, sob, amb } em [−100, 100]
 * @param {Object} confianca  { eco, … } em [0, 100]
 * @param {Array}  eixos      lista de `eixos.json` (nome e nomes dos polos)
 * @param {Object} [opcoes]   { cor, corTexto, corGrade, corFundo, comparacao }
 *   comparacao: { posicao, cor } desenha uma segunda figura tracejada por baixo
 *   — na etapa 2, o vetor do partido sob o vetor da pessoa.
 * @returns {string} markup SVG
 */
export function radar(posicao, confianca, eixos, opcoes = {}) {
  const cor = opcoes.cor || '#9c5a24';
  const corTexto = opcoes.corTexto || '#55575c';
  const corForte = opcoes.corTextoForte || '#1b1c1e';
  const corGrade = opcoes.corGrade || '#d9d5cf';
  const corFundo = opcoes.corFundo || 'transparent';

  const valores = EIXOS.map((k) => posicao[k] || 0);
  const partes = [];

  partes.push(
    `<svg viewBox="0 0 ${TAMANHO} ${TAMANHO}" xmlns="http://www.w3.org/2000/svg" ` +
    `role="img" aria-label="Gráfico dos cinco eixos">`
  );
  if (corFundo !== 'transparent') {
    partes.push(`<rect width="${TAMANHO}" height="${TAMANHO}" fill="${corFundo}"/>`);
  }

  // Anéis: −100 (centro), −50, 0, +50, +100.
  for (const nivel of [-50, 0, 50, 100]) {
    const zero = nivel === 0;
    partes.push(
      `<polygon points="${poligono([nivel, nivel, nivel, nivel, nivel])}" fill="none" ` +
      `stroke="${zero ? corTexto : corGrade}" stroke-width="${zero ? 1.4 : 1}" ` +
      `${zero ? '' : 'stroke-dasharray="2 3" '}opacity="${zero ? .55 : .8}"/>`
    );
  }

  // Raios.
  for (let i = 0; i < 5; i++) {
    const [x, y] = ponto(i, 100);
    partes.push(`<line x1="${CENTRO}" y1="${CENTRO}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${corGrade}" stroke-width="1"/>`);
  }

  // Faixa de confiança: traço ao longo do raio, tão longo quanto a incerteza.
  for (let i = 0; i < 5; i++) {
    const v = valores[i];
    const incerteza = (100 - (confianca[EIXOS[i]] || 0)) / 2;
    if (incerteza < 2) continue;
    const [x1, y1] = ponto(i, Math.max(-100, v - incerteza));
    const [x2, y2] = ponto(i, Math.min(100, v + incerteza));
    partes.push(
      `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" ` +
      `stroke="${cor}" stroke-width="9" stroke-linecap="round" opacity=".22"/>`
    );
  }

  // Figura de comparação, quando houver (usada na etapa 2: o partido por baixo
  // do usuário). Vem tracejada e sem preenchimento, para que a figura principal
  // continue sendo a da pessoa.
  if (opcoes.comparacao) {
    const outros = EIXOS.map((k) => opcoes.comparacao.posicao[k] || 0);
    const corB = opcoes.comparacao.cor || corTexto;
    partes.push(
      `<polygon points="${poligono(outros)}" fill="none" stroke="${corB}" ` +
      `stroke-width="2" stroke-dasharray="6 4" stroke-linejoin="round" opacity=".85"/>`
    );
  }

  // A figura.
  partes.push(
    `<polygon points="${poligono(valores)}" fill="${cor}" fill-opacity=".16" ` +
    `stroke="${cor}" stroke-width="2.5" stroke-linejoin="round"/>`
  );

  // Vértices: vazado quando a posição é pouco definida.
  for (let i = 0; i < 5; i++) {
    const [x, y] = ponto(i, valores[i]);
    const definida = (confianca[EIXOS[i]] || 0) >= 40;
    partes.push(
      `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" ` +
      `fill="${definida ? cor : corFundo === 'transparent' ? '#fff' : corFundo}" stroke="${cor}" stroke-width="2.5"/>`
    );
  }

  // Rótulos: nome do eixo, polo em que a pessoa está, percentual.
  // Sempre centralizados no raio: com âncora à esquerda ou à direita, nomes
  // longos como "Desenvolvimento 21%" saíam para fora da área do desenho.
  for (let i = 0; i < 5; i++) {
    const eixo = eixos.find((e) => e.codigo === EIXOS[i]) || {};
    const v = valores[i];
    const polo = v === 0 ? 'centro' : (v < 0 ? eixo.polo_negativo : eixo.polo_positivo)?.nome || '';
    const [bx, by] = ponto(i, 100);
    const x = CENTRO + (bx - CENTRO) * RAIO_ROTULO;
    const y = CENTRO + (by - CENTRO) * RAIO_ROTULO;
    const acima = by - CENTRO < -12;

    partes.push(
      `<text x="${x.toFixed(1)}" y="${(y + (acima ? -8 : 16)).toFixed(1)}" text-anchor="middle" ` +
      `font-family="system-ui, sans-serif" font-size="15" font-weight="600" fill="${corForte}">${escapar(eixo.nome || EIXOS[i])}</text>`,
      `<text x="${x.toFixed(1)}" y="${(y + (acima ? 10 : 34)).toFixed(1)}" text-anchor="middle" ` +
      `font-family="system-ui, sans-serif" font-size="12.5" fill="${corTexto}">${escapar(polo)} ${Math.abs(v)}%</text>`
    );
  }

  partes.push('</svg>');
  return partes.join('');
}

/** Converte o SVG em PNG no navegador, para embutir no PDF. */
export function svgParaPng(svg, escala = 2) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      const tela = document.createElement('canvas');
      tela.width = TAMANHO * escala;
      tela.height = TAMANHO * escala;
      const ctx = tela.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, tela.width, tela.height);
      ctx.drawImage(img, 0, 0, tela.width, tela.height);
      URL.revokeObjectURL(url);
      resolve(tela.toDataURL('image/png'));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Falha ao desenhar o gráfico.')); };
    img.src = url;
  });
}
