/**
 * Prumo — item 2j, segunda fase: devolve ao catálogo os destaques cujo
 * dispositivo foi finalmente lido.
 *
 *   node ferramentas/revisao-2j/restaurar-destaques.js
 *
 * A primeira fase tirou cinco votações porque o vetor descrevia o assunto da lei
 * e não o dispositivo destacado, que ninguém tinha lido. Esta fase foi atrás do
 * texto na Câmara. Quatro voltaram, com vetor derivado do dispositivo; uma ficou
 * fora, agora por um motivo lido e não por ignorância.
 *
 * SOBRE A FONTE DE CADA UMA
 *
 * Os PDFs da Câmara nem sempre têm camada de texto. Nos casos do Programa Mover
 * e dos minerais críticos, o substitutivo votado é imagem — nem o pdf.js extrai —
 * e o texto veio da REDAÇÃO FINAL aprovada na mesma sessão. Como a votação foi
 * "Mantido o texto", o dispositivo sobreviveu inteiro até a redação final; ainda
 * assim o risco de renumeração existe e está declarado em `fonte_do_dispositivo`.
 * Nos outros dois o texto saiu do próprio substitutivo votado.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const arq = `${raiz}dados/votacoes.json`;
const c = JSON.parse(readFileSync(arq, 'utf8'));

const VOLTAM = [
  {
    id: '2422697-69',
    materia: 'PL 914/2024',
    data: '2024-05-28',
    titulo: 'Multa para quem vende carro sem assumir metas de emissão',
    resumo: 'Manteve no texto a multa de 20% sobre a venda para a montadora ou a importadora que colocar carro novo no mercado sem registrar os compromissos de eficiência e de emissão.',
    vetor: { eco: -2, soc: 0, pod: 0, sob: 0, amb: -1 },
    placar: { sim: 266, nao: 139 },
    dispositivo: 'Art. 5º do texto do Programa Mover: a importação ou comercialização de veículos sem o registro dos compromissos do art. 2º acarreta multa compensatória de 20% sobre a receita da venda; em veículo importado, a multa incide na nacionalização.',
    fonte_do_dispositivo: 'Redação Final do PL 914-A/2024 (codteor 2430982), aprovada na mesma sessão. O substitutivo votado (codteor 2430563) é PDF sem camada de texto.',
    por_que_este_vetor: 'eco -2 porque é o Estado impondo sanção pesada a fabricante e importador para fazer valer obrigação de política industrial. amb -1 porque os compromissos cuja falta se pune são metas de eficiência e emissão, mas o artigo trata do registro, não da meta — componente secundário.',
  },
  {
    id: '2252295-130',
    materia: 'PL 2583/2020',
    data: '2025-07-08',
    titulo: 'Compra pública reservada a fabricante brasileiro de saúde',
    resumo: 'Manteve no texto a regra que deixa o governo abrir licitação só para remédio, equipamento e insumo feitos por empresa brasileira considerada estratégica para a saúde.',
    vetor: { eco: -2, soc: 0, pod: 0, sob: 2, amb: 0 },
    placar: { sim: 316, nao: 110 },
    dispositivo: 'Art. 26 do substitutivo: a Administração Pública poderá realizar procedimento licitatório destinado exclusivamente à aquisição de produto estratégico para a saúde produzido ou desenvolvido por empresa estratégica de saúde.',
    fonte_do_dispositivo: 'Substitutivo votado (codteor 2951335), lido diretamente.',
    por_que_este_vetor: 'eco -2 porque usa o poder de compra do Estado como política industrial, restringindo a concorrência. sob +2 porque reserva o mercado público à produção nacional. O vetor bate com o que o catálogo já tinha — neste caso o dispositivo destacado carregava mesmo a política da lei inteira.',
  },
  {
    id: '2279186-104',
    materia: 'PL 458/2021',
    data: '2025-10-29',
    titulo: 'Fechamento de brechas no abatimento de impostos',
    resumo: 'Manteve no texto a regra que impede a empresa de abater imposto usando crédito baseado em documento que não existe ou crédito sem ligação com o que ela faz.',
    vetor: { eco: -2, soc: 0, pod: 0, sob: 0, amb: 0 },
    placar: { sim: 293, nao: 143 },
    dispositivo: 'Art. 37 do substitutivo: altera o art. 74, § 12, II, da Lei 9.430/1996 para acrescentar hipóteses de compensação não declarada — crédito decorrente de pagamento indevido com base em documento de arrecadação inexistente, e crédito de PIS/Cofins não cumulativo sem relação com a atividade econômica do contribuinte.',
    fonte_do_dispositivo: 'Substitutivo votado (codteor 3034350), lido diretamente.',
    por_que_este_vetor: 'eco -2 porque fecha brecha de compensação tributária e reforça a arrecadação sobre a empresa. Atenção: o catálogo tinha eco +2, o sinal oposto, porque media a lei (atualização de patrimônio com alíquota reduzida, favorável ao contribuinte) em vez do dispositivo destacado, que vai na direção contrária.',
  },
  {
    id: '2447259-99',
    materia: 'PL 2780/2024',
    data: '2026-05-06',
    titulo: 'Controle do governo sobre a mineração estratégica',
    resumo: 'Manteve no texto a regra que submete a mineração de minerais estratégicos à soberania nacional e exige autorização do governo para vender mineradora ou para empresa estrangeira entrar nesse setor.',
    vetor: { eco: -1, soc: 0, pod: 0, sob: 3, amb: 0 },
    placar: { sim: 343, nao: 97 },
    dispositivo: '§ 2º do art. 3º: as atividades da Política Nacional de Minerais Críticos e Estratégicos subordinam-se aos princípios da soberania nacional e da supremacia do interesse público, com mecanismo de triagem pelo qual o Poder Público homologa mudança de controle societário de titular de direitos minerários, acesso estrangeiro a informação geológica estratégica ou participação relevante de estrangeiro, e contratos internacionais do setor.',
    fonte_do_dispositivo: 'Redação Final do PL 2.780-A/2024 (codteor 3131056). A Subemenda Substitutiva votada (codteor 3125328) é PDF sem camada de texto.',
    por_que_este_vetor: 'sob +3 porque é um regime de triagem de investimento estrangeiro fundado expressamente na soberania nacional, e isso é o núcleo do dispositivo. eco -1 porque o poder público ganha veto sobre negócio privado, componente real mas secundário. O amb +2 que o catálogo trazia não tem base nenhuma neste texto.',
  },
];

const CONTINUA_FORA = {
  id: '2494408-43',
  motivo_novo: 'dispositivo lido, não mede nenhum dos cinco eixos',
  dispositivo: 'Inciso II do art. 193: dos 14.989 cargos efetivos vagos transformados, 1.955 viram cargos em comissão e funções de confiança no Executivo federal.',
  fonte_do_dispositivo: 'Parecer do relator com o texto do substitutivo (codteor 2915591), lido diretamente.',
  detalhe: 'Transformar cargo efetivo vago em cargo de livre nomeação é matéria de organização da administração pública. Não é mercado contra Estado, não é coerção do Estado sobre o indivíduo, e não é nenhum dos outros três eixos. O catálogo tinha eco -2 por medir a lei (criação de carreiras públicas), quando o dispositivo destacado vai em sentido quase oposto: troca cargo de concurso por cargo de indicação.',
};

// ---------------------------------------------------------------- aplicação
const rev = c.revisao_adversarial;
const idsQueVoltam = new Set(VOLTAM.map((v) => v.id));

for (const v of VOLTAM) {
  const { dispositivo, fonte_do_dispositivo, por_que_este_vetor, ...entrada } = v;
  c.votacoes.push({ ...entrada, dispositivo_destacado: dispositivo, fonte_do_dispositivo });
  const r = rev.removidas[v.id];
  if (r) {
    rev.recuperadas = rev.recuperadas || {};
    rev.recuperadas[v.id] = {
      materia: v.materia,
      vetor_antigo: r.vetor_antigo,
      vetor_novo: v.vetor,
      dispositivo,
      fonte_do_dispositivo,
      por_que_este_vetor,
    };
    delete rev.removidas[v.id];
  }
}

if (rev.removidas[CONTINUA_FORA.id]) {
  Object.assign(rev.removidas[CONTINUA_FORA.id], {
    motivo: CONTINUA_FORA.motivo_novo,
    dispositivo_destacado: CONTINUA_FORA.dispositivo,
    fonte_do_dispositivo: CONTINUA_FORA.fonte_do_dispositivo,
    detalhe: CONTINUA_FORA.detalhe,
  });
}

c.votacoes.sort((a, b) => a.data.localeCompare(b.data));

rev.segunda_fase = {
  data: '2026-09-14',
  o_que_foi_feito: 'Os cinco destaques removidos por "dispositivo não lido" foram atrás do texto na Câmara. '
    + 'Quatro voltaram ao catálogo com vetor derivado do dispositivo; um continua fora, agora porque o dispositivo '
    + 'foi lido e não mede nenhum dos cinco eixos.',
  obstaculo_tecnico: 'Parte dos PDFs da Câmara não tem camada de texto — são imagem, e nem o pdf.js extrai. '
    + 'Nesses casos o dispositivo veio da redação final aprovada na mesma sessão, o que está declarado em '
    + 'fonte_do_dispositivo de cada votação, com o risco de renumeração assumido.',
  achado: 'Dos quatro recuperados, um confirmou o vetor antigo (saúde), um teve o sinal invertido (o destaque do '
    + 'Rearp fecha brecha tributária, enquanto a lei favorece o contribuinte) e dois trocaram de eixo. Ou seja: '
    + 'ler o dispositivo mudou a resposta em três de quatro casos.',
};

rev.resultado = '28 votações revisadas: 17 com vetor equivalente, 2 com o sinal corrigido, 5 removidas de vez e '
  + '4 recuperadas na segunda fase, depois de lido o dispositivo destacado.';

writeFileSync(arq, `${JSON.stringify(c, null, 1)}\n`);
console.log(`catálogo: ${c.votacoes.length} votações`);
console.log(`recuperadas: ${VOLTAM.map((v) => v.id).join(', ')}`);
console.log(`segue fora: ${Object.keys(rev.removidas).join(', ')}`);
