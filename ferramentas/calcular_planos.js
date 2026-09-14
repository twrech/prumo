/**
 * Prumo — posição de um candidato ao Executivo a partir do plano de governo.
 *
 *   node ferramentas/calcular_planos.js
 *
 * Lê `dados/planos/temas-planos.json` (o catálogo fixo) e
 * `dados/planos/respostas-planos.json` (o que cada plano respondeu, com a
 * passagem literal) e escreve `dados/planos/planos-revelado.json`.
 *
 * A CONTA É A MESMA DA ETAPA 2, DE PROPÓSITO
 *   posição_k  = 100 · S_k / M_k
 *   confiança_k = 100 · R_k / M_k
 *
 *   S_k = soma de sinal × peso do tema no eixo k, sobre os temas em que o plano
 *         tomou lado (favor = +1, contra = −1)
 *   M_k = soma de |peso| no eixo k sobre o catálogo INTEIRO
 *   R_k = soma de |peso| no eixo k sobre os temas respondidos
 *
 *   Dividir por M_k, e não pelo que o plano respondeu, é o ponto todo. É o mesmo
 *   que a etapa 2 faz com os partidos faltosos: se o denominador fosse só o que
 *   a pessoa falou, um plano que menciona um único tema de Economia sairia com
 *   posição extrema naquele eixo, de graça. Dividindo pelo catálogo inteiro, o
 *   plano curto sai perto da origem E com confiança baixa — e é a confiança que
 *   a ficha mostra, não a distância até o centro.
 *
 * SILÊNCIO NÃO É CENTRO
 *   Tema sem lado tomado não entra em S_k nem em R_k. Não empurra para o meio:
 *   apenas derruba a confiança daquele eixo. Plano omisso e plano moderado são
 *   coisas diferentes, e a ficha tem de conseguir distingui-las.
 *
 * DUAS TRAVAS QUE A FERRAMENTA APLICA SOZINHA
 *   1. Polaridade: recusa o catálogo se, em algum eixo, a fração de peso em que
 *      "favor" aponta para o polo + sair da faixa de 40% a 60%.
 *   2. Passagem: recusa a resposta 'favor' ou 'contra' que venha sem página e
 *      sem passagem literal. É a regra inviolável transformada em erro de
 *      execução, para não depender de disciplina de quem preenche.
 *
 * O QUE ISTO NÃO É
 *   Não é medição de comportamento. Plano de governo é o que a pessoa DIZ que
 *   fará. Voto nominal é o que ela fez. Os dois nunca entram no mesmo número, e
 *   o campo `tipo_de_evidencia` existe para que a interface não possa confundir
 *   os dois por descuido.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const EIXOS = ['eco', 'soc', 'pod', 'sob', 'amb'];
const caminho = (n) => fileURLToPath(new URL(`../dados/planos/${n}`, import.meta.url));

const catalogo = JSON.parse(readFileSync(caminho('temas-planos.json'), 'utf8'));
const entrada = JSON.parse(readFileSync(caminho('respostas-planos.json'), 'utf8'));

/** Trava 1 — polaridade por eixo. */
function conferirPolaridade(temas) {
  const fora = [];
  const tabela = {};
  for (const e of EIXOS) {
    let mais = 0; let menos = 0;
    for (const t of temas) {
      const w = t.vetor[e] || 0;
      if (w > 0) mais += w; else menos += -w;
    }
    const total = mais + menos;
    const fracao = total ? mais / total : 0;
    tabela[e] = { peso_total: total, fracao_favor_aponta_mais: Number((100 * fracao).toFixed(1)) };
    if (total === 0 || fracao < 0.4 || fracao > 0.6) fora.push(`${e} em ${(100 * fracao).toFixed(1)}%`);
  }
  if (fora.length) {
    throw new Error(`polaridade fora da faixa de 40% a 60%: ${fora.join(', ')}. Corrija o catálogo antes de publicar.`);
  }
  return tabela;
}

/** Trava 2 — posição exige passagem literal. */
function conferirPassagens(respostas, porId) {
  const erros = [];
  for (const r of respostas) {
    const vistos = new Set();
    for (const item of r.itens || []) {
      const onde = `${r.arquivo} · ${item.tema}`;
      if (!porId.has(item.tema)) erros.push(`${onde}: tema não existe no catálogo`);
      if (vistos.has(item.tema)) erros.push(`${onde}: tema repetido`);
      vistos.add(item.tema);

      if (!['favor', 'contra', 'silencio'].includes(item.valor)) {
        erros.push(`${onde}: valor '${item.valor}' inválido`);
        continue;
      }
      if (item.valor === 'silencio') {
        if (item.passagem || item.pagina) erros.push(`${onde}: silêncio não carrega passagem`);
        continue;
      }
      if (!item.passagem || String(item.passagem).trim().length < 15) {
        erros.push(`${onde}: '${item.valor}' sem passagem literal — sem passagem citada, sem posição`);
      }
      if (!Number.isInteger(item.pagina) || item.pagina < 1) {
        erros.push(`${onde}: '${item.valor}' sem página conferível no PDF`);
      }
    }
  }
  if (erros.length) throw new Error(`${erros.length} problema(s):\n  ${erros.join('\n  ')}`);
}

function calcular(itens, porId, M) {
  const S = Object.fromEntries(EIXOS.map((e) => [e, 0]));
  const R = Object.fromEntries(EIXOS.map((e) => [e, 0]));

  for (const item of itens) {
    if (item.valor === 'silencio') continue;
    const sinal = item.valor === 'favor' ? 1 : -1;
    const vetor = porId.get(item.tema).vetor;
    for (const e of EIXOS) {
      const w = vetor[e] || 0;
      if (!w) continue;
      S[e] += sinal * w;
      R[e] += Math.abs(w);
    }
  }

  const posicao = {}; const confianca = {};
  for (const e of EIXOS) {
    posicao[e] = M[e] ? Math.round((100 * S[e]) / M[e]) : 0;
    confianca[e] = M[e] ? Math.round((100 * R[e]) / M[e]) : 0;
  }
  return { posicao, confianca };
}

function main() {
  const porId = new Map(catalogo.temas.map((t) => [t.id, t]));
  const polaridade = conferirPolaridade(catalogo.temas);
  conferirPassagens(entrada.respostas, porId);

  const M = Object.fromEntries(EIXOS.map((e) => [e,
    catalogo.temas.reduce((s, t) => s + Math.abs(t.vetor[e] || 0), 0)]));

  const saida = entrada.respostas.map((r) => {
    const itens = r.itens || [];
    const { posicao, confianca } = calcular(itens, porId, M);
    const respondidos = itens.filter((i) => i.valor !== 'silencio');
    const confiancaMedia = Math.round(EIXOS.reduce((s, e) => s + confianca[e], 0) / EIXOS.length);

    return {
      id: r.id, nome: r.nome, partido: r.partido, cargo: r.cargo, ue: r.ue,
      arquivo: r.arquivo,
      tipo_de_evidencia: 'plano',
      o_que_isto_mede: 'o que a pessoa diz que fará, registrado no plano entregue ao TSE — não o que ela fez',
      temas_respondidos: respondidos.length,
      temas_no_catalogo: catalogo.temas.length,
      posicao,
      confianca,
      confianca_media: confiancaMedia,
      eixos_sem_base: EIXOS.filter((e) => confianca[e] < 40),
      passagens: respondidos.map((i) => ({
        tema: i.tema,
        titulo: porId.get(i.tema).titulo,
        valor: i.valor,
        pagina: i.pagina,
        passagem: i.passagem,
      })),
    };
  });

  const semTexto = (entrada.sem_camada_de_texto || []).map((x) => ({
    ...x, tipo_de_evidencia: 'plano-ilegivel',
    o_que_isto_mede: 'nada: o plano foi registrado como imagem e não há texto a citar',
  }));

  writeFileSync(caminho('planos-revelado.json'), `${JSON.stringify({
    versao: '1.0',
    gerado_em: new Date().toISOString().slice(0, 10),
    catalogo: { versao: catalogo.versao, temas: catalogo.temas.length },
    peso_por_eixo: M,
    polaridade,
    regra: catalogo.regra_inviolavel,
    candidatos: saida,
    sem_camada_de_texto: semTexto,
  }, null, 2)}\n`);

  console.log(`polaridade OK · ${saida.length} planos lidos · ${semTexto.length} ilegíveis\n`);
  console.log('nome                              part.  temas   eco  soc  pod  sob  amb   conf.');
  for (const c of saida) {
    const p = EIXOS.map((e) => String(c.posicao[e]).padStart(4)).join(' ');
    console.log(`${c.nome.slice(0, 32).padEnd(33)} ${String(c.partido).padEnd(6)} ${String(c.temas_respondidos).padStart(2)}/${c.temas_no_catalogo}  ${p}   ${String(c.confianca_media).padStart(3)}%`);
  }
  for (const c of semTexto) console.log(`${c.nome.slice(0, 32).padEnd(33)} ${String(c.partido).padEnd(6)} PLANO SEM CAMADA DE TEXTO`);
}

main();
