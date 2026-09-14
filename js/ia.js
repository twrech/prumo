/**
 * Prumo — camada opcional de IA.
 *
 * DESLIGADA por padrão. Existe só para redigir, em linguagem simples, uma
 * leitura do resultado. Ela NUNCA altera pontuação, vetor, confiança ou
 * rótulo: recebe o perfil já calculado e devolve texto.
 *
 * Por que a chave é do usuário: o site é estático e público. Qualquer chave
 * embutida no código seria lida por qualquer pessoa e usada por conta de
 * quem a colocou lá. Não há alternativa sem servidor, e servidor implicaria
 * ver o que a pessoa respondeu — o oposto do projeto.
 *
 * O que sai do navegador: as cinco posições, as cinco confianças, a
 * intensidade e o rótulo. As respostas individuais não existem aqui: a
 * função nem as recebe.
 */

import { EIXOS, faixaIntensidade, faixaConfianca } from './motor.js';

const API = 'https://api.anthropic.com/v1';
const VERSAO_API = '2023-06-01';
const MODELO_RESERVA = 'claude-sonnet-4-5';

function cabecalhos(chave) {
  return {
    'content-type': 'application/json',
    'x-api-key': chave,
    'anthropic-version': VERSAO_API,
    // Necessário para chamar a API direto do navegador, sem servidor no meio.
    'anthropic-dangerous-direct-browser-access': 'true',
  };
}

/**
 * Escolhe um modelo barato sem fixar um identificador que envelhece:
 * pergunta à API quais existem e pega o Sonnet mais recente.
 */
async function escolherModelo(chave) {
  try {
    const r = await fetch(`${API}/models?limit=50`, { headers: cabecalhos(chave) });
    if (!r.ok) return MODELO_RESERVA;
    const { data } = await r.json();
    const sonnets = (data || []).filter((m) => /sonnet/i.test(m.id));
    return (sonnets[0] || data?.[0])?.id || MODELO_RESERVA;
  } catch {
    return MODELO_RESERVA;
  }
}

/** O que a IA vê: números agregados, nunca respostas. */
function resumoDoPerfil(perfil, eixos, arquetipos) {
  const linhas = EIXOS.map((k) => {
    const eixo = eixos.find((e) => e.codigo === k);
    const valor = perfil.posicao[k];
    const polo = valor === 0 ? 'centro' : (valor < 0 ? eixo.polo_negativo : eixo.polo_positivo).nome;
    return `- ${eixo.nome}: ${Math.abs(valor)}% na direção "${polo}" `
      + `(o outro polo é "${valor < 0 ? eixo.polo_positivo.nome : eixo.polo_negativo.nome}"); `
      + `posição ${faixaConfianca(perfil.confianca[k])}, ${perfil.confianca[k]}% de certeza.`;
  });

  const principal = arquetipos.arquetipos.find((a) => a.id === perfil.rotulo);
  const segundo = arquetipos.arquetipos.find((a) => a.id === perfil.rotulo2);

  return [
    `Rótulo calculado: ${principal?.nome || perfil.rotulo}${segundo ? `, com traços de ${segundo.nome}` : ''}.`,
    `Intensidade global: ${perfil.intensidade}% (${faixaIntensidade(perfil.intensidade)}).`,
    '',
    'Posições:',
    ...linhas,
  ].join('\n');
}

const INSTRUCOES = `Você escreve para o Prumo, uma ferramenta brasileira gratuita que ajuda qualquer pessoa a entender a própria posição política.

Escreva três parágrafos curtos, em português do Brasil, para a pessoa cujo resultado está abaixo:
1. O que esse conjunto de posições significa no dia a dia, em coisas concretas.
2. Onde ela é coerente e onde há tensão entre duas posições dela — sem dizer que está errada.
3. O que o resultado NÃO diz: ele mede opinião sobre políticas, não valor pessoal, e não indica em quem votar.

Regras:
- Linguagem de ensino fundamental. Frases curtas. Sem jargão.
- Fale com a pessoa, por "você". Nunca escreva "o usuário".
- Nunca diga se a posição dela é boa ou ruim, certa ou errada.
- Nunca cite nome de político vivo nem de partido.
- Nunca sugira em quem votar nem diga que ela deveria mudar de opinião.
- Onde a certeza for baixa, diga com todas as letras que ali o resultado é frágil porque ela pulou perguntas.
- No máximo 220 palavras no total. Devolva só o texto, sem título e sem lista.`;

/**
 * Gera a explicação. Lança com mensagem em português se algo falhar.
 *
 * @param {Object} perfil      saída de gerarPerfil (sem respostas)
 * @param {Array}  eixos       lista de eixos.json
 * @param {Object} arquetipos  arquetipos.json
 * @param {string} chave       chave da API, que só existe na memória da aba
 */
export async function explicar(perfil, eixos, arquetipos, chave) {
  if (!chave) throw new Error('falta a chave da API.');

  const modelo = await escolherModelo(chave);

  let resposta;
  try {
    resposta = await fetch(`${API}/messages`, {
      method: 'POST',
      headers: cabecalhos(chave),
      body: JSON.stringify({
        model: modelo,
        max_tokens: 700,
        system: INSTRUCOES,
        messages: [{ role: 'user', content: resumoDoPerfil(perfil, eixos, arquetipos) }],
      }),
    });
  } catch {
    throw new Error('não foi possível falar com a API. Confira sua conexão.');
  }

  if (resposta.status === 401) throw new Error('a chave foi recusada. Confira se copiou a chave inteira.');
  if (resposta.status === 429) throw new Error('a API pediu para esperar um pouco. Tente de novo em instantes.');
  if (!resposta.ok) {
    let detalhe = `erro ${resposta.status}`;
    try {
      const corpo = await resposta.json();
      if (corpo?.error?.message) detalhe = corpo.error.message;
    } catch { /* mantém o genérico */ }
    throw new Error(detalhe);
  }

  const corpo = await resposta.json();
  const texto = (corpo.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();

  if (!texto) throw new Error('a resposta veio vazia.');
  return texto;
}
