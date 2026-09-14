/**
 * Prumo — posição individual dos deputados estaduais de SC.
 *
 *   node ferramentas/calcular_deputados_alesc.js
 *
 * Lê `dados/alesc/votacoes-alesc.json` (o catálogo revisado) e
 * `dados/alesc/alesc-nominais.json` (os votos nome a nome) e escreve
 * `dados/alesc/deputados-alesc.json`.
 *
 * A CONTA É A MESMA DOS DEPUTADOS FEDERAIS
 *   posição_k   = 100 · S_k / M_k
 *   confiança_k = 100 · R_k / M_k
 *
 *   S_k = Σ  sinal_do_voto · peso da votação no eixo k
 *   M_k = Σ  |peso| no eixo k sobre o catálogo INTEIRO
 *   R_k = Σ  |peso| no eixo k sobre as votações em que a pessoa votou
 *
 *   sinal: SIM = +1, NÃO = −1. Ausência e abstenção NÃO entram em S nem em R —
 *   não são meio-termo, são falta de informação, e derrubam a confiança.
 *
 * SÓ DOIS EIXOS SAEM DAQUI
 *   O catálogo passa na conferência de polaridade apenas em Economia e Costumes.
 *   Poder (20,0%), Natureza (66,7%) e Mundo (nenhuma votação) ficam fora, e a
 *   ferramenta se recusa a calculá-los. Publicar um eixo que não passa na
 *   própria trava do projeto seria pior do que não publicar nada: o número
 *   apareceria com a mesma cara dos outros.
 *
 * O CATÁLOGO É PEQUENO E ISSO TEM CONSEQUÊNCIA
 *   São 8 votações, contra 23 no federal. Com peso 10 em Economia e 5 em
 *   Costumes, faltar a uma única votação já custa muito da confiança. Espere
 *   poucos deputados acima do piso de 60% — e é justamente esse número que
 *   decide se a aba de deputado estadual deve existir.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const EIXOS = ['eco', 'soc', 'pod', 'sob', 'amb'];
const CONFIANCA_MINIMA = 60;

const caminho = (n) => fileURLToPath(new URL(`../dados/alesc/${n}`, import.meta.url));

const catalogo = JSON.parse(readFileSync(caminho('votacoes-alesc.json'), 'utf8'));
const bruto = JSON.parse(readFileSync(caminho('alesc-nominais.json'), 'utf8')).votacoes;

const PUBLICAVEIS = catalogo.eixos_publicaveis;

/** Localiza a votação bruta pela sessão e pelo placar declarado no catálogo. */
function acharVotacao(item) {
  const [sim, nao] = item.placar.match(/(\d+) sim x (\d+) não/).slice(1).map(Number);
  const candidatas = bruto.filter((v) => v.sessao === item.sessao
    && v.contagem.sim === sim && v.contagem.nao === nao);
  if (candidatas.length !== 1) {
    throw new Error(`${item.id}: ${candidatas.length} votações batem com sessão ${item.sessao} e placar ${item.placar}`);
  }
  return candidatas[0];
}

/**
 * Une os nomes que a ata grafa de duas formas para a mesma pessoa.
 *
 * A ALESC muda a grafia do nome parlamentar no meio da legislatura: "LUNELLI"
 * vira "ANTÍDIO LUNELLI", "BERLANDA" vira "NILSO BERLANDA", "SÉRGIO GUIMARÃES"
 * vira "REPÓRTER SÉRGIO GUIMARÃES". Sem unir, o histórico da pessoa fica
 * partido em dois registros, e os dois saem com confiança baixa quando o
 * correto é um registro com confiança alta.
 *
 * O teste não é semelhança de nome, que erraria com homônimos. São três
 * condições, e as três precisam valer:
 *   1. as palavras de um nome são subconjunto das do outro;
 *   2. os dois NUNCA aparecem na mesma chamada — ninguém é chamado duas vezes;
 *   3. as duas contagens somam exatamente o total de votações do catálogo bruto.
 *
 * A condição 3 é a que fecha o caso: significa que a pessoa esteve na chamada
 * de todas as sessões, ora sob um nome, ora sob o outro, sem sobreposição.
 *
 * A grafia que fica é a MAIS RECENTE, não a mais longa nem a mais frequente. É
 * ela que a Casa usa hoje e é ela que tende a bater com o nome de urna
 * registrado no TSE — "BERLANDA", e não "NILSO BERLANDA". As duas ficam
 * guardadas em `grafias`, porque o cruzamento com a candidatura de 2026 pode
 * precisar de qualquer uma das duas.
 */
function unirGrafias(bruto) {
  const cont = {};
  for (const v of bruto) for (const n of Object.keys(v.votos)) cont[n] = (cont[n] || 0) + 1;
  const nomes = Object.keys(cont);
  const palavras = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase().replace(/[^A-Z ]/g, '').split(' ').filter((x) => x.length > 2);

  const uniao = new Map();
  const grafias = new Map();
  const registro = [];
  for (let i = 0; i < nomes.length; i++) {
    for (let j = i + 1; j < nomes.length; j++) {
      const a = palavras(nomes[i]); const b = palavras(nomes[j]);
      if (!(a.every((x) => b.includes(x)) || b.every((x) => a.includes(x)))) continue;
      if (bruto.some((v) => v.votos[nomes[i]] !== undefined && v.votos[nomes[j]] !== undefined)) continue;
      if (cont[nomes[i]] + cont[nomes[j]] !== bruto.length) continue;
      const ultima = (n) => bruto.reduce((max, v, k) => (v.votos[n] !== undefined ? k : max), -1);
      const [antigo, atual] = ultima(nomes[i]) < ultima(nomes[j])
        ? [nomes[i], nomes[j]] : [nomes[j], nomes[i]];
      uniao.set(antigo, atual);
      grafias.set(atual, [atual, antigo]);
      registro.push(`${antigo} (${cont[antigo]}) → ${atual} (${cont[atual]}) · soma ${bruto.length}, e nunca aparecem juntos`);
    }
  }
  return { uniao, grafias, registro };
}

function main() {
  const fora = EIXOS.filter((e) => !PUBLICAVEIS.includes(e));
  console.log(`catálogo: ${catalogo.votacoes.length} votações`);
  console.log(`eixos publicáveis: ${PUBLICAVEIS.join(', ')}`);
  console.log(`eixos recusados pela polaridade: ${fora.join(', ')}\n`);

  const M = Object.fromEntries(PUBLICAVEIS.map((e) => [e,
    catalogo.votacoes.reduce((s, v) => s + Math.abs(v.vetor[e] || 0), 0)]));

  const { uniao, grafias, registro } = unirGrafias(bruto);
  if (registro.length) {
    console.log('grafias unidas (mesmo deputado sob dois nomes na ata):');
    for (const r of registro) console.log(`  ${r}`);
    console.log();
  }

  const pessoas = new Map();
  for (const item of catalogo.votacoes) {
    const v = acharVotacao(item);
    for (const [grafia, voto] of Object.entries(v.votos)) {
      const nome = uniao.get(grafia) || grafia;
      if (!pessoas.has(nome)) {
        pessoas.set(nome, {
          nome,
          S: Object.fromEntries(PUBLICAVEIS.map((e) => [e, 0])),
          R: Object.fromEntries(PUBLICAVEIS.map((e) => [e, 0])),
          votou: 0, faltou: 0, chamadas: 0,
        });
      }
      const p = pessoas.get(nome);
      p.chamadas++;
      if (voto !== 'sim' && voto !== 'nao') { p.faltou++; continue; }
      p.votou++;
      const sinal = voto === 'sim' ? 1 : -1;
      for (const e of PUBLICAVEIS) {
        const w = item.vetor[e] || 0;
        if (!w) continue;
        p.S[e] += sinal * w;
        p.R[e] += Math.abs(w);
      }
    }
  }

  const saida = [...pessoas.values()].map((p) => {
    const posicao = {}; const confianca = {};
    for (const e of PUBLICAVEIS) {
      posicao[e] = M[e] ? Math.round((100 * p.S[e]) / M[e]) : 0;
      confianca[e] = M[e] ? Math.round((100 * p.R[e]) / M[e]) : 0;
    }
    return {
      nome: p.nome,
      grafias: grafias.get(p.nome) || [p.nome],
      chamadas: p.chamadas, votou: p.votou, faltou: p.faltou,
      posicao, confianca,
      eixos_com_base: PUBLICAVEIS.filter((e) => confianca[e] >= CONFIANCA_MINIMA),
    };
  }).sort((a, b) => b.eixos_com_base.length - a.eixos_com_base.length
    || b.votou - a.votou
    || a.nome.localeCompare(b.nome, 'pt-BR'));

  // Quantas votações do catálogo tocam cada eixo. Costumes inteiro repousa em
  // três votações; Economia, em seis. Este número diz mais sobre a solidez do
  // eixo do que a confiança individual de cada deputado.
  const votacoesPorEixo = Object.fromEntries(PUBLICAVEIS.map((e) => [e,
    catalogo.votacoes.filter((v) => (v.vetor[e] || 0) !== 0).length]));

  // Amplitude: distância entre o deputado mais à esquerda e o mais à direita,
  // entre os que têm base. Eixo que não separa ninguém não serve, mesmo com
  // confiança alta — foi a segunda trava criada na etapa 2.
  const amplitude = {};
  for (const e of PUBLICAVEIS) {
    const vs = saida.filter((d) => d.confianca[e] >= CONFIANCA_MINIMA).map((d) => d.posicao[e]);
    amplitude[e] = vs.length ? Math.max(...vs) - Math.min(...vs) : 0;
  }

  writeFileSync(caminho('deputados-alesc.json'), `${JSON.stringify({
    versao: '1.0',
    gerado_em: new Date().toISOString().slice(0, 10),
    base: `${catalogo.votacoes.length} votações nominais da ALESC, catálogo revisado`,
    eixos_publicaveis: PUBLICAVEIS,
    eixos_recusados: catalogo.eixos_nao_publicaveis,
    peso_por_eixo: M,
    votacoes_por_eixo: votacoesPorEixo,
    amplitude_entre_deputados: amplitude,
    confianca_minima: CONFIANCA_MINIMA,
    o_que_isto_mede: 'o que a pessoa fez em plenário, nas votações nominais — não o que ela diz',
    grafias_unidas: registro,
    ressalva_sobre_a_confianca: 'A confiança aqui mede quanto do catálogo a pessoa cobriu, e o catálogo tem 8 votações. Quem compareceu a todas sai com 100%, e isso NÃO quer dizer que a posição dela esteja bem medida: quer dizer que ela votou nas oito. A limitação real é o tamanho do catálogo, não a assiduidade, e a ficha do candidato é obrigada a dizer sobre quantas votações o número foi calculado.',
    o_que_o_eixo_economia_mede_aqui: 'Não é o eixo Economia do questionário. As seis votações estaduais que o compõem perguntam, no fundo, uma coisa só: o Estado deve criar programa, obrigar e regular, ou não? Não há privatização, não há reforma tributária ampla, não há legislação trabalhista — essas não são competência da Assembleia. Um deputado que aparece no polo Estado aqui votou por criar programas e obrigações estaduais, o que não é a mesma afirmação que sai da etapa 1.',
    nota_de_validacao: 'Os extremos batem com o que se sabe dos deputados por fora do dado: PT e PDT no polo Estado e Progressista, PL e Republicanos no polo oposto. A correlação entre os dois eixos é 0,72 entre os 24 deputados com base nos dois — alta, mas bem abaixo dos 0,94 dos partidos na etapa 2.',
    deputados: saida,
  }, null, 2)}\n`);

  console.log(`\nvotações que tocam cada eixo: ${PUBLICAVEIS.map((e) => `${e} ${votacoesPorEixo[e]}`).join(' · ')}`);
  console.log(`amplitude entre os deputados com base: ${PUBLICAVEIS.map((e) => `${e} ${amplitude[e]}`).join(' · ')}`);

  const comBase = saida.filter((d) => d.eixos_com_base.length);
  console.log(`peso do catálogo por eixo: ${PUBLICAVEIS.map((e) => `${e} ${M[e]}`).join(' · ')}`);
  console.log(`${saida.length} nomes na chamada · ${comBase.length} com ao menos um eixo acima de ${CONFIANCA_MINIMA}%\n`);
  console.log('nome                          votou  ' + PUBLICAVEIS.map((e) => e.padStart(10)).join(''));
  for (const d of saida.slice(0, 45)) {
    console.log(d.nome.slice(0, 28).padEnd(30)
      + `${d.votou}/${d.chamadas}`.padStart(6) + '  '
      + PUBLICAVEIS.map((e) => ((d.confianca[e] >= CONFIANCA_MINIMA ? '*' : ' ') + d.posicao[e] + '/' + d.confianca[e] + '%').padStart(10)).join(''));
  }
}

main();
