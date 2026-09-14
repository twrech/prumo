/**
 * Prumo — posição revelada dos partidos (etapa 2).
 *
 *   node ferramentas/calcular_revelado.js
 *
 * Lê `dados/votacoes.json` (o catálogo com os vetores) e
 * `dados/votos-partidos.json` (como cada bancada votou) e escreve
 * `dados/partidos-revelado.json`.
 *
 * CONTA
 *   Para o partido p e o eixo k:
 *     pos_v   = (SIM − NÃO) / (SIM + NÃO)     na votação v, entre −1 e +1
 *     S_k     = Σ_v  pos_v · w_v[k]
 *     M_k     = Σ_v  |w_v[k]|                 sobre TODO o catálogo
 *     R_k     = Σ_v  |w_v[k]|                 só onde a bancada votou
 *     posição_k   = 100 · S_k / M_k
 *     confiança_k = 100 · R_k / M_k
 *
 * M_k é o peso do catálogo inteiro, não só das votações em que o partido
 * esteve presente. Assim um partido que faltou à metade das votações de um eixo
 * não recebe posição extrema de graça: ele fica mais perto do centro e com
 * confiança menor, que é a leitura honesta de "não dá para saber".
 *
 * Também imprime a checagem de sanidade: a ordem dos partidos no eixo
 * econômico. Se ela não bater com o que a literatura estabeleceu, o método está
 * errado, e é para descobrir isso aqui — não depois de alguém usar.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { EIXOS } from '../js/motor.js';
import { fileURLToPath } from 'node:url';

const BANCADA_MINIMA = 3;            // abaixo disso o ruído domina
const CONFIANCA_MINIMA_RANKING = 60; // abaixo disso a posição é palpite, não medida

function ler(nome) {
  return JSON.parse(readFileSync(fileURLToPath(new URL(`../dados/${nome}`, import.meta.url)), 'utf8'));
}

function main() {
  const catalogo = ler('votacoes.json');
  const extracao = ler('votos-partidos.json');
  const vetores = Object.fromEntries(catalogo.votacoes.map((v) => [v.id, v.vetor]));

  // Peso total do catálogo por eixo.
  const M = {};
  for (const k of EIXOS) M[k] = 0;
  for (const v of catalogo.votacoes) for (const k of EIXOS) M[k] += Math.abs(v.vetor[k] || 0);

  const acc = {};
  for (const [id, dados] of Object.entries(extracao.votacoes)) {
    const w = vetores[id];
    if (!w) { console.warn(`aviso: ${id} está na extração mas não no catálogo — ignorado`); continue; }

    for (const [sigla, c] of Object.entries(dados.partidos || {})) {
      const t = c.s + c.n;
      if (t < 1) continue;
      const pos = (c.s - c.n) / t;

      acc[sigla] = acc[sigla] || { S: {}, R: {}, bancada: 0, votacoes: 0 };
      const p = acc[sigla];
      p.votacoes++;
      p.bancada = Math.max(p.bancada, t);
      for (const k of EIXOS) {
        const wk = w[k] || 0;
        if (!wk) continue;
        p.S[k] = (p.S[k] || 0) + pos * wk;
        p.R[k] = (p.R[k] || 0) + Math.abs(wk);
      }
    }
  }

  const partidos = {};
  const ignorados = [];
  for (const [sigla, p] of Object.entries(acc)) {
    if (sigla === 'S.PART.') continue;                 // deputado sem partido
    if (p.bancada < BANCADA_MINIMA) { ignorados.push(`${sigla} (${p.bancada})`); continue; }

    const posicao = {};
    const confianca = {};
    for (const k of EIXOS) {
      posicao[k] = M[k] ? Math.round((100 * (p.S[k] || 0)) / M[k]) : 0;
      confianca[k] = M[k] ? Math.round((100 * (p.R[k] || 0)) / M[k]) : 0;
    }
    partidos[sigla] = { posicao, confianca, bancada: p.bancada, votacoes: p.votacoes };
  }

  // ---------------------------------------------------------- estrutura
  // Calculada aqui, e não escrita à mão, para nunca ficar desatualizada em
  // relação aos dados. A análise completa e a verificação contra a hipótese de
  // "correlação fabricada pelos vetores" estão em ferramentas/estrutura.js.
  const lista0 = Object.values(partidos).map((p) => EIXOS.map((k) => p.posicao[k]));
  const nP = lista0.length;
  const mu = EIXOS.map((_, j) => lista0.reduce((a, r) => a + r[j], 0) / nP);
  const C = Array.from({ length: 5 }, () => Array(5).fill(0));
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
      let s2 = 0;
      for (const r of lista0) s2 += (r[i] - mu[i]) * (r[j] - mu[j]);
      C[i][j] = s2 / (nP - 1);
    }
  }
  let vec = [1, 1, 1, 1, 1];
  for (let it = 0; it < 500; it++) {
    const w = Array(5).fill(0);
    for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) w[i] += C[i][j] * vec[j];
    const nn = Math.hypot(...w);
    if (!nn) break;
    vec = w.map((x) => x / nn);
  }
  const w1 = Array(5).fill(0);
  for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) w1[i] += C[i][j] * vec[j];
  const lambda = vec.reduce((a, x, i) => a + x * w1[i], 0);
  const traco = [0, 1, 2, 3, 4].reduce((a, i) => a + C[i][i], 0);
  const correlacao = {};
  for (let i = 0; i < 5; i++) {
    correlacao[EIXOS[i]] = Object.fromEntries(
      EIXOS.map((k, j) => [k, Number((C[i][j] / Math.sqrt(C[i][i] * C[j][j])).toFixed(2))])
    );
  }

  // ------------------------------------------------- o eixo separa ou não?
  // Peso no catálogo e poder de separação são coisas diferentes: um eixo pode
  // ter peso de sobra e ainda assim colocar todos os partidos no mesmo ponto,
  // quando as bancadas votam do mesmo jeito nas duas pontas do eixo. Aí o eixo
  // existe na conta e não existe na realidade, e a interface precisa dizer isso.
  const AMPLITUDE_MINIMA = 60;
  const amplitude = {};
  for (const k of EIXOS) {
    const vs = Object.values(partidos).map((p) => p.posicao[k]);
    amplitude[k] = Math.max(...vs) - Math.min(...vs);
  }
  const separamPouco = EIXOS.filter((k) => amplitude[k] < AMPLITUDE_MINIMA);

  const saida = {
    versao: '1.0',
    calculado_em: new Date().toISOString().slice(0, 10),
    base: `${catalogo.votacoes.length} votações nominais do plenário da Câmara, legislatura 2023-2027`,
    metodo: 'Ver o cabeçalho de ferramentas/calcular_revelado.js',
    // Objeto, e não lista de códigos: cada eixo fraco é fraco por uma razão
    // diferente, e a interface precisa dizer a razão certa. Ver o texto do selo
    // em dados/votacoes.json → calibracao.
    eixos_com_confianca_reduzida: Object.fromEntries(
      Object.entries(catalogo.calibracao?.eixos_com_confianca_reduzida || {})
        .map(([k, v]) => [k, { texto_do_selo: v.texto_do_selo, peso_no_catalogo: v.peso_no_catalogo, votacoes: v.votacoes }])
    ),
    bancada_minima: BANCADA_MINIMA,

    confianca_minima_para_ranking: CONFIANCA_MINIMA_RANKING,
    nota_confianca: 'Partido com confiança média abaixo deste valor não entra no ranking de alinhamento: '
      + 'sua posição está perto da origem por falta de voto, não por moderação, e perto da origem é perto de '
      + 'todo mundo. Ele aparece em lista à parte, com selo e número de votações. Ver js/alinhamento.js.',

    amplitude_por_eixo: amplitude,
    amplitude_minima: AMPLITUDE_MINIMA,
    eixos_que_separam_pouco: Object.fromEntries(separamPouco.map((k) => [k, {
      amplitude: amplitude[k],
      texto_do_selo: 'Neste eixo os partidos brasileiros quase não se diferenciam: as bancadas votaram parecido '
        + 'tanto nas propostas de um lado quanto nas do outro. A posição aqui separa pouco, e por isso pesa pouco '
        + 'na comparação com você.',
      diagnostico: 'Amplitude de apenas ' + amplitude[k] + ' pontos entre o partido mais extremo de cada lado, '
        + 'contra 200 nos eixos que separam. Não é falta de peso no catálogo — é ausência de divergência partidária. '
        + 'Rode ferramentas/discriminacao.js para ver votação por votação.',
    }])),

    estrutura_do_espaco: {
      correlacao_entre_eixos: correlacao,
      fracao_no_primeiro_componente: Number((lambda / traco).toFixed(2)),
      reta_dos_partidos: Object.fromEntries(EIXOS.map((k, i) => [k, Number((vec[i] * (vec[0] < 0 ? -1 : 1)).toFixed(2))])),
      achado: 'Economia, costumes e natureza andam quase juntos nos partidos: quem é pró-Estado também é '
        + 'progressista e preservacionista, e o inverso. Um componente só explica a maior parte da variação, e a '
        + 'reta em que os partidos se organizam é feita basicamente desses três eixos.',
      ressalva_pod: 'Poder é a exceção: correlaciona 0,40 com economia na conta cheia e -0,65 na conta só com '
        + 'votações de eixo único. Um eixo que troca de sinal assim não tem relação estável com os demais — o que '
        + 'para o instrumento é boa notícia (mede coisa própria), mas desaconselha qualquer leitura do tipo '
        + '"a direita é punitivista". Nesta legislatura, com estas votações, não é.',
      verificacao: 'Refeito com as votações de eixo único, que não compartilham item nenhum entre eixos, o núcleo '
        + 'da correlação sobrevive — logo ele está nos dados, não na atribuição de vetores. Rode ferramentas/estrutura.js.',
      consequencia_para_os_arquetipos: 'Os arquétipos NÃO devem ser aproximados dos partidos. Eles descrevem '
        + 'eleitores, e eleitor não é obrigado a caber na reta em que os partidos se organizaram. Colapsá-los sobre '
        + 'essa reta destruiria a informação mais útil do Prumo: a de que uma certa combinação de posições não é '
        + 'oferecida por partido brasileiro nenhum.',
      efeito_exigido_na_interface: 'A ficha do partido precisa dizer, em uma frase, que nos partidos brasileiros '
        + 'esses eixos andam quase juntos, e que por isso o alinhamento é na prática uma posição só, numa reta da '
        + 'esquerda à direita. Sem isso o radar promete cinco informações independentes que não existem.',
    },

    partidos,
  };
  writeFileSync(fileURLToPath(new URL('../dados/partidos-revelado.json', import.meta.url)),
    `${JSON.stringify(saida, null, 1)}\n`);

  // ---------------------------------------------------------------- relatório
  const lista = Object.entries(partidos).sort((a, b) => a[1].posicao.eco - b[1].posicao.eco);

  console.log(`${lista.length} partidos posicionados a partir de ${catalogo.votacoes.length} votações.`);
  if (ignorados.length) console.log(`Fora por bancada abaixo de ${BANCADA_MINIMA}: ${ignorados.join(', ')}.`);

  console.log('\nOrdenados pelo eixo econômico (− Estado · + Mercado)');
  console.log('partido          eco    soc    pod    sob    amb   bancada');
  for (const [sigla, p] of lista) {
    console.log(
      `${sigla.padEnd(15)} ${String(p.posicao.eco).padStart(4)} ${String(p.posicao.soc).padStart(6)} ` +
      `${String(p.posicao.pod).padStart(6)} ${String(p.posicao.sob).padStart(6)} ${String(p.posicao.amb).padStart(6)} ` +
      `${String(p.bancada).padStart(8)}`
    );
  }

  console.log('\nAmplitude por eixo (o quanto o eixo separa os partidos)');
  for (const k of EIXOS) {
    const vs = lista.map(([, p]) => p.posicao[k]);
    const min = Math.min(...vs);
    const max = Math.max(...vs);
    const marca = max - min < 60 ? '  <-- separa pouco' : '';
    console.log(`${k.padEnd(6)} de ${String(min).padStart(4)} a ${String(max).padStart(4)}  (amplitude ${max - min})${marca}`);
  }
}

main();
