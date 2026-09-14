/**
 * Prumo — alinhamento entre o perfil da pessoa e os partidos (etapa 2).
 *
 * Implementa a seção 6 da spec da etapa 2 com três correções, todas nascidas de
 * rodar a conta com dados reais em 13/09/2026 e olhar o resultado.
 *
 * CORREÇÃO 1 — partido que falta a votação não pode ganhar o ranking
 *
 * A posição revelada divide pelo peso do catálogo inteiro, não só pelas
 * votações em que a bancada esteve presente. Isso é o certo — não se sabe onde
 * está quem não votou — mas joga esse partido para perto da origem, e perto da
 * origem é perto de todo mundo. O PATRIOTA (7 votações de 28, confiança 27%)
 * aparecia no top 3 de arquétipos opostos entre si. Quem tem confiança abaixo
 * do piso sai da lista principal e vai para uma lista à parte, com o selo.
 *
 * CORREÇÃO 2 — distância euclidiana comparava escalas diferentes
 *
 * O vetor do partido vem de votação nominal e chega perto de ±100. O da pessoa
 * vem do questionário e sai comprimido em cerca de dois terços. A primeira
 * tentativa foi multiplicar a pessoa por um ganho de 1,5, o mesmo usado para
 * escolher o arquétipo. Não funcionou, e o teste mostrou por quê: o ganho
 * saturava nos extremos (um socialista ia a −100 em dois eixos, grudando no
 * limite e perdendo informação) e deixava a pessoa MAIS extrema que qualquer
 * partido real — de modo que o partido vencedor passava a ser simplesmente o
 * menos extremo. Trocou-se um viés de centro por outro.
 *
 * A solução foi parar de consertar a escala e passar a ignorá-la: o alinhamento
 * agora é a SIMILARIDADE DE DIREÇÃO entre os dois vetores (cosseno). Duas
 * pessoas que pensam igual, uma com convicção forte e outra com convicção
 * morna, apontam para o mesmo lugar — e é isso que a pergunta "quais partidos
 * pensam como eu" quer saber. Some o ganho, some a saturação, some a constante
 * mágica.
 *
 * CORREÇÃO 3 — quem está no centro não tem direção
 *
 * O cosseno não significa nada para um vetor perto de zero: a direção vira
 * ruído. Abaixo de um limiar de intensidade o ranking não é exibido como
 * ranking; a interface precisa dizer que a pessoa está equilibrada demais para
 * que "o partido mais parecido" queira dizer alguma coisa.
 */

import { EIXOS, intensidade } from './motor.js';

/** Abaixo disso, a posição do partido é palpite, não medida. */
export const CONFIANCA_MINIMA = 60;

/** Abaixo disso, a direção do vetor da pessoa é ruído. */
export const INTENSIDADE_MINIMA = 12;

/**
 * Abaixo disso, nem o primeiro colocado se parece de verdade com a pessoa.
 *
 * Não é defeito do método: há perfis que simplesmente não têm partido no
 * Brasil. Um libertário — pró-mercado e contra o poder do Estado sobre o
 * indivíduo ao mesmo tempo — não encontra ninguém, porque os partidos
 * pró-mercado daqui são também os mais punitivistas. O teste com os dez
 * arquétipos mostra isso com clareza: socialista, verde e conservador acham
 * partido a 93, 93 e 96; libertário e liberal-progressista param em 65 e 59.
 *
 * Quando o topo fica abaixo deste valor, a lista continua sendo exibida, mas
 * como "os menos distantes", nunca como "os que pensam como você".
 */
export const ALINHAMENTO_MINIMO_DO_TOPO = 70;

/**
 * Diferença abaixo da qual dois partidos estão EMPATADOS, e não em 1º e 2º.
 *
 * Não é chute: é o percentil 90 do jackknife. Tirando uma votação do catálogo
 * de cada vez e refazendo a conta, 90% das notas balançam menos que 5,1 pontos.
 * Logo uma diferença de 3 pontos entre o primeiro e o terceiro colocado não
 * significa nada — e o teste é impiedoso: com o catálogo de 23 votações, SETE
 * dos nove arquétipos trocam de primeiro colocado quando se remove uma única
 * votação. Apresentar isso como uma classificação seria inventar precisão.
 *
 * Rode ferramentas/empate.js para refazer a medida quando o catálogo mudar.
 */
export const FAIXA_DE_EMPATE = 6;

function media(v) { return v.reduce((a, b) => a + b, 0) / v.length; }

/** Confiança média do vetor de um partido, em 0–100. */
export function confiancaDoPartido(partido) {
  return media(EIXOS.map((k) => partido.confianca[k] || 0));
}

/**
 * Similaridade de direção, ponderada pela confiança da PESSOA em cada eixo.
 * Eixo que ela mal respondeu pesa menos: o ranking não deve ser decidido por
 * um eixo sobre o qual ela não disse quase nada.
 *
 * @returns número em [−1, 1]: 1 = mesma direção, 0 = sem relação, −1 = oposta.
 */
function similaridade(posPessoa, confPessoa, posPartido) {
  let produto = 0;
  let normaPessoa = 0;
  let normaPartido = 0;
  for (const k of EIXOS) {
    const c = (confPessoa[k] ?? 100) / 100;
    if (c <= 0) continue;
    const u = posPessoa[k] || 0;
    const p = posPartido[k] || 0;
    produto += c * u * p;
    normaPessoa += c * u * u;
    normaPartido += c * p * p;
  }
  if (normaPessoa === 0 || normaPartido === 0) return 0;
  return produto / Math.sqrt(normaPessoa * normaPartido);
}

/**
 * Compatibilidade entre a pessoa e QUALQUER outro vetor medido — partido ou
 * candidato —, na mesma escala de 0 a 100 do ranking da etapa 2.
 *
 * Exportada porque a etapa 3 precisa dela para candidatos com voto medido. A
 * conta é a mesma; muda só o que está do outro lado da comparação. Candidato
 * SEM voto medido não passa por aqui: não recebe número nenhum.
 */
export function compatibilidade(posPessoa, confPessoa, posOutro) {
  return Math.round(50 * (1 + similaridade(posPessoa, confPessoa, posOutro)));
}

/**
 * Acordo em um eixo, em linguagem que não depende de escala.
 * Comparar "−34 contra −72" em número enganaria, porque os dois vetores vivem
 * em escalas diferentes. O que é honesto dizer é o lado, e quão firme é cada um.
 */
export function acordoNoEixo(valorPessoa, valorPartido) {
  const NEUTRO = 15;
  const pessoaNoMeio = Math.abs(valorPessoa) < NEUTRO;
  const partidoNoMeio = Math.abs(valorPartido) < NEUTRO;

  if (pessoaNoMeio && partidoNoMeio) return 'ambos no meio';
  if (pessoaNoMeio) return 'você está no meio';
  if (partidoNoMeio) return 'o partido está no meio';
  return Math.sign(valorPessoa) === Math.sign(valorPartido) ? 'mesmo lado' : 'lados opostos';
}

/**
 * Ranking de alinhamento.
 *
 * @param {Object} perfil   saída de gerarPerfil (posicao e confianca)
 * @param {Object} base     conteúdo de partidos-revelado.json
 * @param {Object} [opcoes] { confiancaMinima, intensidadeMinima }
 * @returns {{ranking, naoPosicionados, confiavel, intensidade}}
 *
 * `confiavel: false` significa que a pessoa está perto do centro e o ranking
 * não deve ser apresentado como resposta — ver correção 3 no cabeçalho.
 */
export function alinhar(perfil, base, opcoes = {}) {
  const minimaPartido = opcoes.confiancaMinima ?? base.confianca_minima_para_ranking ?? CONFIANCA_MINIMA;
  const minimaIntens = opcoes.intensidadeMinima ?? INTENSIDADE_MINIMA;
  const intens = perfil.intensidade ?? intensidade(perfil.posicao);

  const ranking = [];
  const naoPosicionados = [];

  for (const [sigla, partido] of Object.entries(base.partidos)) {
    const conf = confiancaDoPartido(partido);

    if (conf < minimaPartido) {
      naoPosicionados.push({
        sigla,
        confianca: Math.round(conf),
        bancada: partido.bancada,
        votacoes: partido.votacoes,
        motivo: `votou em ${partido.votacoes} das votações do catálogo — pouco para dizer onde está`,
      });
      continue;
    }

    const s = similaridade(perfil.posicao, perfil.confianca, partido.posicao);
    const porEixo = EIXOS.map((k) => ({
      eixo: k,
      acordo: acordoNoEixo(perfil.posicao[k] || 0, partido.posicao[k] || 0),
    }));

    ranking.push({
      sigla,
      // De −1..1 para 0..100. 50 é "sem relação nenhuma".
      alinhamento: Math.round(50 * (1 + s)),
      similaridade: Number(s.toFixed(3)),
      confianca: Math.round(conf),
      bancada: partido.bancada,
      porEixo,
      mesmoLado: porEixo.filter((e) => e.acordo === 'mesmo lado').map((e) => e.eixo),
      ladosOpostos: porEixo.filter((e) => e.acordo === 'lados opostos').map((e) => e.eixo),
    });
  }

  ranking.sort((a, b) => b.alinhamento - a.alinhamento);
  naoPosicionados.sort((a, b) => b.confianca - a.confianca);

  const topo = ranking.length ? ranking[0].alinhamento : 0;
  const semCentro = intens < minimaIntens;
  const semParecido = !semCentro && topo < (opcoes.alinhamentoMinimoDoTopo ?? ALINHAMENTO_MINIMO_DO_TOPO);

  let aviso = null;
  if (semCentro) {
    aviso = 'Suas posições ficaram perto do meio em todos os eixos. Quando isso acontece, '
      + 'não existe "o partido mais parecido com você": a lista abaixo é frágil, e pequenas '
      + 'mudanças nas suas respostas mudariam a ordem inteira.';
  } else if (semParecido) {
    aviso = 'Nenhum partido chega perto do seu perfil. A lista abaixo mostra os menos '
      + 'distantes, e não partidos que pensam como você — repare em quantos eixos vocês '
      + 'ficam em lados opostos. Isso acontece quando a combinação de posições da pessoa '
      + 'não existe entre os partidos brasileiros de hoje.';
  }

  // Correção 4: o topo do ranking costuma ser um empate, não uma classificação.
  // Quem está a menos de FAIXA_DE_EMPATE pontos do primeiro entra no mesmo
  // grupo, e a interface é obrigada a apresentá-los sem ordem entre si.
  const faixa = opcoes.faixaDeEmpate ?? FAIXA_DE_EMPATE;
  const empatados = ranking.filter((r) => topo - r.alinhamento <= faixa).map((r) => r.sigla);
  for (const r of ranking) r.empatadoNoTopo = empatados.includes(r.sigla);

  const avisoEmpate = empatados.length > 1
    ? `${empatados.length} partidos estão tecnicamente empatados no topo: ${empatados.join(', ')}. `
      + 'A diferença entre eles é menor que a margem de erro do método — tirar uma única votação do '
      + 'catálogo já troca a ordem. Trate-os como um grupo, não como primeiro e segundo lugar.'
    : null;

  return {
    ranking,
    naoPosicionados,
    intensidade: intens,
    alinhamentoDoTopo: topo,
    empatadosNoTopo: empatados,
    faixaDeEmpate: faixa,
    avisoEmpate,
    confiavel: !semCentro && !semParecido,
    motivo: semCentro ? 'pessoa-no-centro' : semParecido ? 'nenhum-partido-proximo' : null,
    aviso,
  };
}
