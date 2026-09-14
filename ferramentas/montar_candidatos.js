/**
 * Prumo — monta o catálogo de candidatos da etapa 3.
 *
 *   node ferramentas/montar_candidatos.js [UF]
 *
 * Lê os arquivos `dados/candidatos-<uf>-N.psv` (extraídos do DivulgaCand do TSE)
 * e o `dados/deputados-revelado-<uf>.json` (posição medida por voto nominal), e
 * escreve `dados/candidatos-<uf>.json`, que é o que a interface carrega.
 *
 * O CORAÇÃO DISTO É A ESCADA DE EVIDÊNCIA
 *
 * A evidência sobre um candidato é desigual, e a ficha tem que dizer QUAL
 * evidência existe em vez de fingir que é a mesma para todos. Quatro níveis:
 *
 *   medido      — tem voto nominal na Câmara nesta legislatura. Posição nos
 *                 cinco eixos e índice de compatibilidade com o eleitor.
 *   com-mandato — já foi eleito para algum cargo, mas não há voto nominal
 *                 nosso. Não recebe posição; a ficha mostra os mandatos e diz
 *                 onde procurar (câmara municipal, assembleia).
 *   tentou      — já concorreu e nunca se elegeu. Sem posição; a ficha mostra
 *                 as tentativas, que também dizem algo sobre a trajetória.
 *   estreante   — nunca concorreu. Sem posição e sem histórico. A ficha mostra
 *                 o que o TSE tem e o link que a própria pessoa registrou.
 *
 * NUNCA se atribui posição por partido. O partido do candidato não vira a
 * posição dele: seria a inferência por identidade que a revisão da etapa 2
 * tirou do projeto. Na etapa 3 essa tentação é ainda maior, porque o eleitor
 * chega ali justamente pela aba do partido — e é justamente por isso que a
 * regra tem que ser explícita.
 *
 * FONTE
 *   TSE, DivulgaCandContas, eleição 20322002026. Campos usados: nome de urna,
 *   número, partido, coligação, ocupação declarada, situação do registro,
 *   patrimônio declarado, sites declarados pela própria pessoa e o histórico de
 *   candidaturas anteriores (`eleicoesAnteriores`).
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { EIXOS } from '../js/motor.js';

const raiz = fileURLToPath(new URL('../', import.meta.url));
const uf = (process.argv[2] || 'SC').toUpperCase();
const min = uf.toLowerCase();

const CARGO = { DF: 'Deputado Federal', SEN: 'Senador', DE: 'Deputado Estadual' };
const ELEITO = /^Eleito/i;   // "Eleito", "Eleito por QP", "Eleito por média"

/** Uma linha do .psv vira um candidato. */
function lerLinha(linha) {
  const [id, cargo, nome, numero, partido, ocupacao, situacao, coligacao, bens, url, anteriores] = linha.split('|');
  const ant = (anteriores || '')
    .split(';')
    .filter(Boolean)
    .map((a) => {
      const [ano, cargoAnt, partidoAnt, resultado, local] = a.split('~');
      return { ano, cargo: cargoAnt, partido: partidoAnt, resultado, local };
    });
  return {
    id,
    cargo: CARGO[cargo] || cargo,
    nome,
    numero: Number(numero) || null,
    partido,
    coligacao: coligacao || null,
    ocupacao: ocupacao || null,
    situacao_do_registro: situacao || 'Deferido',
    patrimonio_declarado: bens === '' ? null : Number(bens),
    site_declarado: url || null,
    candidaturas_anteriores: ant,
  };
}

const linhas = [];
for (let i = 1; i <= 9; i++) {
  const arq = `${raiz}dados/candidatos-${min}-${i}.psv`;
  if (!existsSync(arq)) continue;
  for (const l of readFileSync(arq, 'utf8').split('\n')) if (l.trim()) linhas.push(l);
}
if (!linhas.length) throw new Error(`nenhum dados/candidatos-${min}-N.psv encontrado`);

const candidatos = linhas.map(lerLinha);

// ------------------------------------------------- casa com o voto medido
const revelado = JSON.parse(readFileSync(`${raiz}dados/deputados-revelado-${min}.json`, 'utf8'));
const porNomeDeUrna = new Map();
for (const d of revelado.deputados) {
  if (d.candidatura_2026?.nome_urna) porNomeDeUrna.set(d.candidatura_2026.nome_urna, d);
}

let medidos = 0;
for (const c of candidatos) {
  const d = porNomeDeUrna.get(c.nome);
  if (!d) continue;
  medidos++;
  c.medicao = {
    fonte: 'voto nominal na Câmara dos Deputados, legislatura 2023-2027',
    id_camara: d.id,
    partido_na_epoca: d.partido,
    mudou_de_partido: d.candidatura_2026.mudou_de_partido,
    posicao: d.posicao,
    confianca: d.confianca,
    confianca_media: d.confianca_media,
    votacoes_com_posicao: d.votacoes_com_posicao,
    votacoes_do_catalogo: d.votacoes_do_catalogo,
    medivel: d.medivel,
  };
}

// ------------------------------- casa com o voto medido na Assembleia estadual
//
// Um deputado ESTADUAL que se candidata a federal ou ao Senado tem voto medido —
// só que na ALESC, não na Câmara. É evidência real e não pode ser jogada fora,
// mas também não é a mesma coisa: são 8 votações em vez de 23, e só dois eixos
// passam na conferência de polaridade. Por isso vira um degrau PRÓPRIO da
// escada, `medido-alesc`, e nunca se mistura com `medido`.
//
// O arquivo de candidaturas é entrada, não é gerado aqui — o cruzamento entre
// deputado e candidatura é conferido à mão, pela mesma razão de sempre:
// "CHICA DO ESKUDLARK" concorre a estadual pelo PL e NÃO é Maurício Eskudlark.
let medidosAlesc = 0;
try {
  const liga = JSON.parse(readFileSync(`${raiz}dados/alesc/candidaturas-alesc.json`, 'utf8'));
  const alesc = JSON.parse(readFileSync(`${raiz}dados/alesc/deputados-alesc.json`, 'utf8'));
  const porNome = new Map(alesc.deputados.map((d) => [d.nome, d]));

  for (const x of liga.deputados) {
    if (!x.candidatura) continue;
    const c = candidatos.find((y) => String(y.id) === String(x.candidatura.id));
    if (!c || c.medicao) continue; // voto na Câmara, quando existe, tem precedência
    const d = porNome.get(x.deputado);
    if (!d) continue;
    medidosAlesc++;
    c.medicao_alesc = {
      fonte: 'voto nominal na Assembleia Legislativa de Santa Catarina, legislatura 2023-2027',
      nome_na_assembleia: x.deputado,
      eixos_medidos: alesc.eixos_publicaveis,
      posicao: d.posicao,
      confianca: d.confianca,
      eixos_com_base: d.eixos_com_base,
      votou: d.votou,
      votacoes_do_catalogo: alesc.base,
      ressalva: alesc.o_que_o_eixo_economia_mede_aqui,
    };
  }
} catch { /* sem ALESC, a escada segue com os cinco degraus originais */ }

// ------------------------------------------------------ escada de evidência
for (const c of candidatos) {
  const eleicoes = c.candidaturas_anteriores;
  const mandatos = eleicoes.filter((e) => ELEITO.test(e.resultado || ''));

  if (c.medicao?.medivel) {
    c.evidencia = 'medido';
    c.evidencia_texto = `Votou em ${c.medicao.votacoes_com_posicao} das ${c.medicao.votacoes_do_catalogo} votações do catálogo. A posição abaixo vem desses votos.`;
  } else if (c.medicao) {
    // tem voto, mas faltou demais para a posição ser confiável
    c.evidencia = 'medido-fraco';
    c.evidencia_texto = `Esteve na Câmara nesta legislatura, mas só votou em ${c.medicao.votacoes_com_posicao} das ${c.medicao.votacoes_do_catalogo} votações do catálogo — pouco para dizer onde está.`;
  } else if (c.medicao_alesc?.eixos_com_base.length) {
    c.evidencia = 'medido-alesc';
    const n = c.medicao_alesc.eixos_com_base.length;
    c.evidencia_texto = `Não há voto na Câmara, mas há na Assembleia de Santa Catarina: votou em ${c.medicao_alesc.votou} das 8 votações do catálogo estadual. Isso posiciona a pessoa em ${n === 1 ? 'um eixo' : `${n} eixos`}, não nos cinco — e mede política estadual, que não é a mesma coisa.`;
  } else if (mandatos.length) {
    c.evidencia = 'com-mandato';
    c.mandatos = mandatos;
    const m = mandatos[0];
    c.evidencia_texto = `Não há voto nominal na Câmara para medir. Já exerceu mandato: ${m.cargo.toLowerCase()} em ${m.local.toLowerCase()} (${m.ano}). O registro do que fez está lá, não aqui.`;
  } else if (eleicoes.length) {
    c.evidencia = 'tentou';
    c.evidencia_texto = `Nunca exerceu mandato, então não há registro de voto para medir. Já concorreu ${eleicoes.length === 1 ? 'uma vez' : `${eleicoes.length} vezes`}.`;
  } else {
    c.evidencia = 'estreante';
    c.evidencia_texto = 'Primeira candidatura registrada no TSE. Não há mandato nem voto para medir — só o que a própria pessoa declarou.';
  }
}

// ----------------------------------------------------------------- saída
const contagem = {};
for (const c of candidatos) contagem[c.evidencia] = (contagem[c.evidencia] || 0) + 1;

candidatos.sort((a, b) => a.partido.localeCompare(b.partido) || a.nome.localeCompare(b.nome));

writeFileSync(`${raiz}dados/candidatos-${min}.json`, `${JSON.stringify({
  versao: '0.1',
  uf,
  montado_em: new Date().toISOString().slice(0, 10),
  fonte: `TSE, DivulgaCandContas, eleição 20322002026 (cargos ${[...new Set(candidatos.map((c) => c.cargo))].join(', ')} de ${uf})`,
  cargos: [...new Set(candidatos.map((c) => c.cargo))],
  escada_de_evidencia: {
    medido: 'voto nominal na Câmara desta legislatura; recebe posição e índice de compatibilidade',
    'medido-fraco': 'esteve na Câmara mas faltou demais; a posição não é confiável e não é exibida como medida',
    'medido-alesc': 'voto nominal na Assembleia de SC; posição em dois eixos apenas, sobre um catálogo de 8 votações de competência estadual',
    'com-mandato': 'já foi eleito para algum cargo; sem voto nominal nosso, a ficha aponta onde procurar',
    tentou: 'já concorreu e nunca se elegeu; sem posição',
    estreante: 'primeira candidatura; sem posição',
  },
  regra_inviolavel: 'A posição do partido NUNCA é atribuída ao candidato. Quem não tem voto medido não recebe posição, ponto.',
  contagem,
  total: candidatos.length,
  candidatos,
}, null, 1)}\n`);

console.log(`${uf}: ${candidatos.length} candidatos (${[...new Set(candidatos.map((c) => c.cargo))].join(', ')})\n`);
console.log('escada de evidência:');
for (const [k, v] of Object.entries(contagem).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(14)} ${String(v).padStart(3)}  ${(100 * v / candidatos.length).toFixed(0)}%`);
}
console.log(`\ncasados com o voto medido na Câmara: ${medidos}`);
console.log(`casados com o voto medido na ALESC: ${medidosAlesc}`);
const semRegistro = candidatos.filter((c) => c.situacao_do_registro !== 'Deferido');
console.log(`registro não deferido: ${semRegistro.length} — ${semRegistro.map((c) => `${c.nome} (${c.situacao_do_registro})`).slice(0, 6).join(', ')}`);
console.log(`\nEscrito em dados/candidatos-${min}.json`);
