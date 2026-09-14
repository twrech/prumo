/**
 * Prumo — item 2j: revisão adversarial dos vetores das votações.
 *
 *   node ferramentas/revisao-2j/montar-prompts.js
 *
 * Monta os prompts da atribuição CEGA: cada revisor recebe só o registro
 * primário da Câmara (ementa, descrição da votação, objeto do destaque,
 * placar) e as definições dos eixos. Não recebe os vetores atuais nem os
 * resumos do catálogo, para não ser ancorado por eles.
 *
 * O partido que pediu o destaque é apagado do texto ("DTQ 6 (NOVO)" vira
 * "DTQ 6"), pela mesma razão registrada em votacoes.json → sobre_o_sinal:
 * inferir a direção pelo autor do destaque é medir o partido pela identidade
 * que já lhe atribuímos.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const fonte = JSON.parse(readFileSync(`${raiz}dados/revisao-2j/fonte-primaria.json`, 'utf8'));
const eixos = JSON.parse(readFileSync(`${raiz}dados/eixos.json`, 'utf8')).eixos;

const LOTES = 4;

function semPartido(texto) {
  // "DTQ 6 (NOVO):" / "DTQ 2 (PL, Federação ..., PRD):" / "DTQ 6 (PSB):" → "DTQ 6:"
  // e o formato antigo "DTQ 13: PL: Destaque..." → "DTQ 13: Destaque..."
  return (texto || '')
    .replace(/DTQ (\d+) \([^)]*\)/g, 'DTQ $1')
    .replace(/DTQ (\d+): [A-ZÀ-Úa-z.]+: /g, 'DTQ $1: ');
}

const cabecalho = `Você é revisor independente de um instrumento de medição política brasileiro. Sua tarefa é atribuir, do zero e sem ver a atribuição de mais ninguém, um vetor de cinco eixos a cada votação nominal da Câmara dos Deputados listada abaixo.

## Os cinco eixos

${eixos.map((e) => `- **${e.codigo}** (${e.nome}) — polo − "${e.polo_negativo.nome}": ${e.polo_negativo.resumo} | polo + "${e.polo_positivo.nome}": ${e.polo_positivo.resumo}`).join('\n')}

## A convenção do vetor

Cada eixo recebe um peso inteiro de −3 a +3. **Votar SIM na votação aponta para o sinal do peso.** Exemplos: se o SIM aprova uma lei que aumenta imposto sobre os mais ricos, eco é negativo (polo Estado). Se o SIM aprova algo que afrouxa regra ambiental, amb é positivo (polo Desenvolvimento). Zero significa que a votação não diz nada sobre aquele eixo.

Magnitude: 3 = a votação é sobre isso, de forma central e inequívoca; 2 = componente forte, mas não o único; 1 = componente secundário, real mas fraco. Prefira poucos eixos com peso alto a muitos eixos com peso baixo. Um vetor típico tem um ou dois eixos não nulos.

## O que o SIM significa em cada tipo de votação

- "Aprovado o Projeto / o Substitutivo / a Subemenda Substitutiva Global": SIM aprova o texto do relator. A direção é a da matéria.
- "Mantido o texto" em Destaque para Votação em Separado (DVS): alguém pediu para tirar um dispositivo do texto; SIM **mantém** o dispositivo. A direção é a do dispositivo mantido — e só dele, não da lei inteira.
- "Aprovada a Redação Final": SIM aprova o texto final consolidado.
- Votação de emenda: SIM aprova a emenda (mesmo que o resultado registrado diga "Rejeitada").
- Sustação de decreto/resolução (PDL): SIM susta, ou seja, derruba o ato do Executivo ou do conselho.
- Parecer sobre prisão de parlamentar (CMC): SIM segue o parecer, que aqui é pela manutenção da prisão.

## Regras que você deve seguir

1. Use **somente** o registro abaixo e o seu próprio conhecimento do conteúdo dessas proposições. Quando o registro não diz o que o dispositivo destacado contém (por exemplo, "art. 26 do substitutivo"), diga o que você sabe sobre ele e marque a origem: "registro", "conhecimento" ou "desconhecido".
2. **Nunca** infira a direção pelo partido que pediu o destaque ou pelo placar. O placar está aí só para você saber se a votação foi apertada; ele não diz para que lado o SIM aponta.
3. Se, mesmo com o seu conhecimento, você não consegue dizer o que o SIM significava em substância, marque sinal_recuperavel: false e não invente vetor — deixe todos os pesos em zero.
4. Se a votação parece não pertencer a um catálogo de votações discriminantes (quase unânime, procedimental, simbólica sem conteúdo de política pública), diga em recomendacao: "excluir" com o motivo. Caso contrário, "manter".
5. Não use linguagem partidária nem julgue o mérito. Você está medindo, não opinando.

## Formato da resposta

Escreva o resultado em JSON, **e nada mais**, no arquivo indicado no fim. Um objeto por votação, com a chave sendo o id:

\`\`\`json
{
  "ID-DA-VOTACAO": {
    "o_que_o_sim_faz": "uma frase concreta, em português simples",
    "dispositivo_em_jogo": "qual texto estava em votação e o que ele faz (para DVS, o dispositivo destacado)",
    "origem_da_informacao": "registro | conhecimento | desconhecido",
    "sinal_recuperavel": true,
    "vetor": { "eco": 0, "soc": 0, "pod": 0, "sob": 0, "amb": 0 },
    "justificativa": { "eco": "por que esse peso e esse sinal (só para eixos não nulos)" },
    "confianca": "alta | media | baixa",
    "recomendacao": "manter | excluir",
    "motivo_recomendacao": "só se excluir"
  }
}
\`\`\`
`;

mkdirSync(`${raiz}dados/revisao-2j/prompts`, { recursive: true });

const ids = Object.keys(fonte);
const tamanho = Math.ceil(ids.length / LOTES);
for (let i = 0; i < LOTES; i++) {
  const lote = ids.slice(i * tamanho, (i + 1) * tamanho);
  const itens = lote.map((id) => {
    const v = fonte[id];
    const linhas = [
      `### ${id} — ${v.materia} (${v.data})`,
      `- Resultado registrado: ${v.votacao}`,
      `- Objeto da votação: ${semPartido(v.objeto_da_votacao)}`,
      `- Ementa da proposição: ${v.ementa}`,
    ];
    if (v.palavras_chave) linhas.push(`- Palavras-chave da Câmara: ${v.palavras_chave}`);
    if (v.textos_em_jogo?.length) linhas.push(`- Textos em jogo: ${v.textos_em_jogo.filter((t) => !/: $/.test(t)).join(' || ')}`);
    if (v.objeto_votado) linhas.push(`- Objeto votado: ${v.objeto_votado}`);
    return linhas.join('\n');
  }).join('\n\n');

  const saida = `${raiz}dados/revisao-2j/cego-${i + 1}.json`;
  const prompt = `${cabecalho}\n## As votações deste lote (${lote.length})\n\n${itens}\n\n## Onde escrever\n\nEscreva o JSON completo, com as ${lote.length} votações acima, no arquivo \`${saida}\` usando a ferramenta Write. Depois responda em uma linha só: quantas votações ficaram com sinal_recuperavel false e quantas com recomendacao excluir. Nada além disso.\n`;
  writeFileSync(`${raiz}dados/revisao-2j/prompts/lote-${i + 1}.md`, prompt);
  console.log(`lote ${i + 1}: ${lote.length} votações, ${prompt.length} chars → prompts/lote-${i + 1}.md`);
}
