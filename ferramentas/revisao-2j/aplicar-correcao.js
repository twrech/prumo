/**
 * Prumo — item 2j: aplica no catálogo as decisões da revisão adversarial.
 *
 *   node ferramentas/revisao-2j/aplicar-correcao.js
 *
 * Roda uma vez. Reescreve dados/votacoes.json removendo as votações que não
 * sobreviveram à revisão e corrigindo as duas que estavam com o sinal trocado,
 * e deixa dentro do próprio arquivo o registro do que saiu e por quê — para que
 * ninguém precise confiar na memória de ninguém para saber o que aconteceu.
 *
 * As decisões estão documentadas em dados/revisao-2j/ (prompts cegos, respostas
 * dos revisores e a comparação). Ver também ferramentas/revisao-2j/comparar.js.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const arq = `${raiz}dados/votacoes.json`;
const catalogo = JSON.parse(readFileSync(arq, 'utf8'));

const EXCLUIR = {
  '2355135-49': {
    motivo: 'assunto errado',
    detalhe: 'O catálogo descrevia esta votação como a derrubada do decreto que restringiu armas. '
      + 'O PDL 98/2023 susta dispositivos dos Decretos 11.466 e 11.467/2023, que regulamentam o marco legal '
      + 'do SANEAMENTO BÁSICO. Os PDLs de armas de 2023 são outros (3, 12, 13, 15, 16, 17, 18, 20, 25, 39, 47, '
      + '79, 187-196). O vetor soc +2 / pod -1 media política de armas e estava colado numa votação de saneamento.',
  },
  '2270800-175': {
    motivo: 'não mede o eixo',
    detalhe: 'A PEC das prerrogativas parlamentares cria privilégio para uma classe de agentes públicos. '
      + 'O eixo Poder é definido por garantias que valem para TODOS (ver eixos.json). A clivagem observável '
      + 'aqui é Legislativo contra Judiciário, que atravessa os campos ideológicos: o item mede corporativismo, '
      + 'não posição sobre o poder de coerção do Estado.',
  },
  '2423268-40': {
    motivo: 'caso individual',
    detalhe: 'Deliberação sobre a prisão de um parlamentar determinado, sem norma geral em votação. '
      + 'O voto mistura julgamento do caso concreto, lealdade partidária e defesa corporativa da imunidade. '
      + 'Mesmo problema do item anterior, e com o agravante de o catálogo ter atribuído pod -3 a um voto que '
      + 'mantém alguém preso.',
  },
  '2422697-69': { motivo: 'DVS não lido', detalhe: 'O vetor atribuído era o da lei inteira (Programa Mover e taxação de compras no exterior). A votação foi um Destaque para Votação em Separado do art. 5º do substitutivo, e a regra do próprio catálogo manda usar a direção do dispositivo destacado, não a da lei. O art. 5º não foi lido.' },
  '2252295-130': { motivo: 'DVS não lido', detalhe: 'Vetor da lei inteira (Estratégia Nacional de Saúde) aplicado a um DVS do art. 26 do substitutivo, que não foi lido.' },
  '2494408-43': { motivo: 'DVS não lido', detalhe: 'Vetor da lei inteira (carreiras do Executivo federal) aplicado a um DVS do inciso II do art. 193, que não foi lido.' },
  '2279186-104': { motivo: 'DVS não lido', detalhe: 'Vetor da lei inteira (atualização patrimonial com alíquota reduzida) aplicado a um DVS do art. 37 do substitutivo, que não foi lido.' },
  '2447259-99': { motivo: 'DVS não lido', detalhe: 'Vetor da lei inteira (minerais críticos) aplicado a um DVS do § 2º do art. 3º do substitutivo, que não foi lido.' },
  '2398530-73': {
    motivo: 'sinal não recuperável',
    detalhe: 'Perdão e renegociação de dívidas de crédito rural. O catálogo marcava eco +1 e amb +2; a revisão '
      + 'cega chegou a eco -1 e amb 0. Os dois sinais em eco são defensáveis (o Estado assume custo de dívida '
      + 'privada, mas o beneficiário é o produtor), o que significa que o sinal não é recuperável. O amb +2 não '
      + 'tem base no texto: veio de associar o setor a uma posição ambiental, que é a inferência por identidade '
      + 'que o projeto proíbe.',
  },
};

const CORRIGIR = {
  '2358548-81': {
    vetor: { eco: 0, soc: 0, pod: -2, sob: 0, amb: 0 },
    detalhe: 'Estava pod +2. O DVS manteve a nova redação do art. 112 da Lei de Execução Penal, que ABRANDA '
      + 'a progressão de regime — o próprio resumo do catálogo dizia "abranda" enquanto o vetor apontava para Ordem. '
      + 'Voto pela pena mais branda é o polo Liberdade.',
  },
  '264726-144': {
    vetor: { eco: 0, soc: 0, pod: 2, sob: 0, amb: 0 },
    titulo: 'Aumento da pena por disparo de arma de fogo',
    resumo: 'Aumentou a pena de prisão de quem atira com arma de fogo em lugar público, ainda mais se a arma for de uso restrito.',
    detalhe: 'Estava soc +2 / pod -1, com o resumo dizendo que a lei "ampliou quem pode andar armado". O art. 15 '
      + 'do Estatuto do Desarmamento não trata de porte: tipifica o disparo de arma de fogo. A ementa e as '
      + 'palavras-chave da Câmara dizem "aumento, pena de reclusão, disparo, arma de fogo de uso restrito". '
      + 'É agravamento de pena, ou seja, polo Ordem — e não é item de costumes.',
  },
};

const antes = catalogo.votacoes.length;
const removidas = catalogo.votacoes.filter((v) => EXCLUIR[v.id]);

catalogo.votacoes = catalogo.votacoes
  .filter((v) => !EXCLUIR[v.id])
  .map((v) => {
    const c = CORRIGIR[v.id];
    if (!c) return v;
    return { ...v, titulo: c.titulo ?? v.titulo, resumo: c.resumo ?? v.resumo, vetor: c.vetor };
  });

catalogo.versao = '1.0';
catalogo.nota = catalogo.nota.replace(
  / Rascunho:.*$/,
  ' Os vetores passaram pela revisão adversarial do item 2j em 13/09/2026: ver revisao_adversarial abaixo.'
);

catalogo.revisao_adversarial = {
  data: '2026-09-13',
  metodo: 'Quatro revisores independentes receberam apenas o registro primário da Câmara (ementa, descrição da '
    + 'votação, objeto do destaque, placar) e as definições dos eixos, e atribuíram os vetores do zero. Não viram '
    + 'os vetores do catálogo nem os resumos. O partido autor de cada destaque foi apagado do texto, pela razão '
    + 'registrada em sobre_o_sinal. Os prompts e as respostas estão em dados/revisao-2j/.',
  resultado: `${antes} votações revisadas: 17 com vetor equivalente, ${Object.keys(EXCLUIR).length} removidas, `
    + `${Object.keys(CORRIGIR).length} com o sinal corrigido.`,
  efeito_medido: 'Aplicar estas decisões deslocou a posição dos partidos em 54 pontos no pior eixo de cada um, '
    + 'em média, e até 86 pontos num caso. O catálogo anterior não media o que dizia medir. Rode '
    + 'ferramentas/revisao-2j/simular-correcao.js para reproduzir a comparação.',
  licao: 'Sete dos nove problemas têm a mesma origem: o vetor foi atribuído ao ASSUNTO DA LEI e não ao que estava '
    + 'efetivamente em votação. Em Destaque para Votação em Separado, o que se vota é um dispositivo, e a regra do '
    + 'catálogo sempre disse isso — mas a regra não foi seguida na hora de atribuir os pesos. Nenhuma votação nova '
    + 'deve entrar sem que o dispositivo em jogo esteja lido e descrito.',
  removidas: Object.fromEntries(
    removidas.map((v) => [v.id, { materia: v.materia, titulo_antigo: v.titulo, vetor_antigo: v.vetor, ...EXCLUIR[v.id] }])
  ),
  corrigidas: Object.fromEntries(
    Object.entries(CORRIGIR).map(([id, c]) => {
      const v = removidas.find((x) => x.id === id);
      return [id, { vetor_novo: c.vetor, detalhe: c.detalhe }];
    })
  ),
};

writeFileSync(arq, `${JSON.stringify(catalogo, null, 1)}\n`);
console.log(`${antes} → ${catalogo.votacoes.length} votações.`);
console.log(`Removidas: ${Object.keys(EXCLUIR).join(', ')}`);
console.log(`Corrigidas: ${Object.keys(CORRIGIR).join(', ')}`);
