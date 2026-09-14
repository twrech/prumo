/**
 * Prumo — reescreve o bloco de calibração a partir do catálogo atual.
 *
 *   node ferramentas/revisao-2j/atualizar-calibracao.js
 *
 * Declara com confiança reduzida os eixos que ficam abaixo do piso de 15% do
 * peso do catálogo. A lista não é fixa: sai do cálculo, para que a declaração
 * nunca descreva um catálogo que não existe mais. O motivo de cada eixo fraco
 * fica na tabela MOTIVOS abaixo e só é usado se aquele eixo estiver mesmo
 * abaixo do piso.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { EIXOS } from '../../js/motor.js';
import { fileURLToPath } from 'node:url';

const PISO = 15;

const MOTIVOS = {
  soc: {
    motivo: 'Esta legislatura quase não levou questão de costumes a voto nominal em plenário. Aborto, drogas e '
      + 'identidade de gênero foram resolvidos por urgência, por acordo simbólico ou não chegaram ao plenário. '
      + 'É um fato sobre a Câmara desta legislatura, não uma falha de busca. Sobraram o marco temporal (componente '
      + 'secundário), a resolução do Conanda, o feriado da Consciência Negra e o dia dos defensores de direitos humanos.',
    o_que_o_derrubou: 'Perdeu na revisão adversarial as duas votações de armas que a declaração anterior citava como '
      + 'parte do que o sustentava: uma media saneamento e não armas, e a outra trata de pena por disparo e foi para o '
      + 'eixo Poder.',
    texto_do_selo: 'Nesta legislatura a Câmara quase não votou temas de costumes em votação aberta. Com poucas '
      + 'votações, a posição dos partidos neste eixo é menos firme que nos outros.',
  },
  sob: {
    motivo: 'Poucas votações do catálogo tratam da relação do Brasil com o mundo.',
    texto_do_selo: 'Poucas votações do catálogo tratam da relação do Brasil com o mundo, então a posição dos '
      + 'partidos neste eixo é menos firme que nos outros.',
  },
  pod: {
    motivo: 'Poucas votações do catálogo tratam do poder de coerção do Estado sobre o indivíduo.',
    texto_do_selo: 'Poucas votações do catálogo tratam do poder do Estado sobre o indivíduo, então a posição dos '
      + 'partidos neste eixo é menos firme que nos outros.',
  },
  eco: { motivo: 'Poucas votações econômicas no catálogo.', texto_do_selo: 'Poucas votações do catálogo tratam de economia, então a posição dos partidos neste eixo é menos firme que nos outros.' },
  amb: { motivo: 'Poucas votações ambientais no catálogo.', texto_do_selo: 'Poucas votações do catálogo tratam de meio ambiente, então a posição dos partidos neste eixo é menos firme que nos outros.' },
};

const SELO = 'A ficha do partido e o ranking de alinhamento devem exibir a posição neste eixo com selo de confiança '
  + 'baixa e a frase de texto_do_selo. O eixo NÃO deve ser omitido nem pesar igual aos demais no ranking sem aviso.';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const arq = `${raiz}dados/votacoes.json`;
const c = JSON.parse(readFileSync(arq, 'utf8'));

const M = Object.fromEntries(EIXOS.map((k) => [k, 0]));
for (const v of c.votacoes) for (const k of EIXOS) M[k] += Math.abs(v.vetor[k] || 0);
const total = EIXOS.reduce((a, k) => a + M[k], 0);
const frac = (k) => (100 * M[k]) / total;
const pct = (k) => `${frac(k).toFixed(1).replace('.', ',')}%`;
const itens = (k) => c.votacoes.filter((v) => v.vetor[k]).length;

const fracos = EIXOS.filter((k) => frac(k) < PISO);

const senado = c.calibracao?.senado_varredura ?? c.senado_varredura;

c.calibracao = {
  nota: `Catálogo de ${c.votacoes.length} votações após a revisão adversarial (duas fases, 13 e 14/09/2026). `
    + `Peso por eixo: ${EIXOS.map((k) => `${k} ${pct(k)} (${itens(k)} votações)`).join(', ')}.`,
  piso_por_eixo: `${PISO}%`,

  eixos_com_confianca_reduzida: Object.fromEntries(fracos.map((k) => [k, {
    peso_no_catalogo: pct(k),
    votacoes: itens(k),
    piso_padrao: `${PISO}%`,
    ...MOTIVOS[k],
    alternativas_descartadas: k === 'soc' ? [
      'Senado: varridas 423 votações nominais da legislatura, 72 úteis depois dos filtros. Nenhuma de costumes — '
        + 'a pauta nominal do Senado é dominada por matéria tributária e fiscal.',
      'Aumentar o peso de um item para clarear a barra: seria falsificar o instrumento com a desculpa de validá-lo.',
    ] : undefined,
    efeito_exigido_na_interface: SELO,
  }])),

  eixos_no_piso: Object.fromEntries(EIXOS.filter((k) => !fracos.includes(k)).map((k) => [k, pct(k)])),

  observacao_sobre_eco: frac('eco') > 30
    ? `O eixo Economia concentra ${pct('eco')} do peso. Não é escolha de projeto: as votações nominais de plenário `
      + 'desta legislatura são, em grande parte, matéria tributária e fiscal. A concentração está declarada aqui para '
      + 'que ninguém leia o radar como se os cinco eixos tivessem o mesmo lastro.'
    : undefined,

  senado_varredura: senado,
};

if (c.senado_varredura) delete c.senado_varredura;

writeFileSync(arq, `${JSON.stringify(c, null, 1)}\n`);
console.log(`Calibração reescrita · ${c.votacoes.length} votações`);
for (const k of EIXOS) {
  console.log(`  ${k}  ${pct(k).padStart(6)}  ${String(itens(k)).padStart(2)} votações${fracos.includes(k) ? '   <-- declarado com confiança reduzida' : ''}`);
}
