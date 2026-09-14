/**
 * Prumo — monta os prompts cegos da revisão adversarial do catálogo da ALESC.
 *
 *   node ferramentas/revisao-alesc/montar-prompts.js
 *
 * Escreve `dados/revisao-alesc/prompts/lote-N.md`.
 *
 * O QUE "CEGO" SIGNIFICA AQUI, E POR QUE IMPORTA
 *   O revisor recebe APENAS o trecho literal da ata — a fonte primária, o mesmo
 *   texto que os deputados ouviram antes de apertar o botão. Não recebe:
 *     · o vetor que eu atribuí, nem qualquer parte dele;
 *     · minha justificativa;
 *     · se eu incluí ou excluí a votação do catálogo;
 *     · o nome do autor da matéria quando ele sinaliza o campo político.
 *
 *   A revisão do item 2j mostrou por que isso não é cerimônia: ver o vetor
 *   original ancorava o revisor, e a versão cega derrubou 9 de 28 vetores, com
 *   deslocamento médio de 54 pontos. Revisão que enxerga a resposta não é
 *   revisão, é conferência de digitação.
 *
 * A PERGUNTA CENTRAL DESTE LOTE É O SINAL
 *   A maioria destas votações é de veto, e em veto o "sim" MANTÉM o veto — ou
 *   seja, aponta contra o projeto. O prompt entrega a frase literal do
 *   Presidente da sessão e pede que o revisor determine, antes de qualquer
 *   vetor, o que o SIM significa em termos de política pública. Se o revisor
 *   errar aí, todo o resto se inverte, e é justamente isso que queremos detectar.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const SAIDA = join(RAIZ, 'dados/revisao-alesc/prompts');

const contexto = JSON.parse(readFileSync(join(RAIZ, 'dados/alesc/contexto-das-22.json'), 'utf8'));
const nominais = JSON.parse(readFileSync(join(RAIZ, 'dados/alesc/alesc-nominais.json'), 'utf8')).votacoes;

/** Só entram na revisão as que receberam vetor ou ficaram marcadas 'verificar'. */
const EM_REVISAO = [186, 180, 166, 119, 90, 71, 29, 23, 87, 67, 172];

const CABECALHO = `# Revisão adversarial cega — votações nominais da ALESC

Você recebe abaixo trechos **literais** das atas de sessões plenárias da Assembleia
Legislativa de Santa Catarina, cada um terminando no momento imediatamente anterior
a uma votação nominal. É a fonte primária: o texto que os deputados ouviram antes de
votar.

Sua tarefa é, para cada item, e **sem nenhuma informação além do trecho**:

## 1. Determinar o que o SIM significa

Esta é a parte mais importante e a que mais erra. Em votação de veto, o Presidente
diz "os srs. deputados que votarem 'sim' mantêm o veto" — ou seja, o SIM aponta
**contra** o projeto vetado. Em votação de projeto, o SIM aprova. Há ainda casos de
votação de parecer, de destaque e de emenda, em que "a matéria" pode não ser o que
parece.

Escreva, em uma frase, o que uma pessoa que votou SIM quis que acontecesse com a
política pública — não com o trâmite.

## 2. Julgar se a votação deve entrar num catálogo de posicionamento político

Recuse a votação se ela for processual (destaque, requerimento de votação em
separado, questão de ordem), se for homenagem ou data comemorativa sem conteúdo
normativo, se for de interesse puramente local ou técnico, ou se o que foi
efetivamente votado não puder ser identificado no trecho. Diga qual dos casos.

## 3. Atribuir um vetor de cinco eixos, se ela passar

Os eixos, com os polos:

| eixo | polo − | polo + |
|---|---|---|
| \`eco\` | Estado | Mercado |
| \`soc\` | Progressista | Conservador |
| \`pod\` | Liberdade | Ordem |
| \`sob\` | Abertura | Soberania |
| \`amb\` | Preservação | Desenvolvimento |

Peso inteiro de −3 a +3 por eixo, zero onde não houver conteúdo. **A convenção é
que o vetor aponta na direção do SIM**: se votar SIM significa mais mercado, \`eco\`
é positivo.

Regras que valem:

- O vetor é do que foi **efetivamente votado**, não do assunto geral da lei. Se o
  que foi a voto é um dispositivo específico, é o dispositivo que conta.
- Zero em todos os eixos é uma resposta legítima e significa "não mede nada".
- Não invente conteúdo que não está no trecho. Se o trecho não permite decidir,
  diga que não permite.

## Formato da resposta

Para cada item, exatamente assim:

\`\`\`
### <id>
sentido_do_sim: <uma frase>
entra_no_catalogo: sim | nao
motivo: <uma frase>
vetor: { "eco": 0, "soc": 0, "pod": 0, "sob": 0, "amb": 0 }
confianca: alta | media | baixa
observacao: <só se houver algo que o trecho não resolve>
\`\`\`

---

`;

function main() {
  mkdirSync(SAIDA, { recursive: true });

  const itens = EM_REVISAO.map((i) => {
    const bloco = contexto.find((c) => c.i === i);
    const v = nominais[i];
    const s = Object.values(v.votos);
    const sim = s.filter((x) => x === 'sim').length;
    const nao = s.filter((x) => x === 'nao').length;
    // Duas limpezas, e as duas são de método, não de estética.
    //
    // A primeira: o trecho bruto arrasta a chamada nominal da votação ANTERIOR —
    // dezenas de nomes com seus votos. Isso não é contexto da matéria, é o mapa
    // de como a Casa se divide, e entregá-lo ao revisor é deixá-lo inferir o
    // vetor pelo campo político de quem votou o quê, em vez de pelo texto. O
    // corte começa no anúncio da matéria.
    //
    // A segunda: o nome do autor sinaliza o campo político sozinho, e é omitido.
    const bruto = bloco.ctx || '';
    const anuncio = Math.max(
      bruto.lastIndexOf('Discussão e votação'),
      bruto.lastIndexOf('Votação em turno único'),
      bruto.lastIndexOf('Votação em primeiro turno')
    );
    const trecho = (anuncio > 0 ? bruto.slice(anuncio) : bruto.slice(-1200))
      .replace(/de autoria d[oa]s? (sr\.|sra\.|senhor|senhora)?\s*(Deputad[oa]|Governador|Tribunal|Comissão|Bancada)[^,]{0,60},/gi, 'de autoria de [autor omitido],');
    return { id: `al${i}`, data: v.data, sim, nao, trecho };
  });

  const POR_LOTE = 4;
  for (let l = 0; l * POR_LOTE < itens.length; l++) {
    const fatia = itens.slice(l * POR_LOTE, (l + 1) * POR_LOTE);
    const corpo = fatia.map((x) => [
      `## ${x.id}`,
      '',
      `Sessão de ${x.data}. Resultado: ${x.sim} votos "sim", ${x.nao} votos "não".`,
      '',
      'Trecho literal da ata, terminando no instante anterior à votação:',
      '',
      '> ' + x.trecho.replace(/\n/g, ' ').trim(),
      '',
    ].join('\n')).join('\n---\n\n');

    writeFileSync(join(SAIDA, `lote-${l + 1}.md`), `${CABECALHO}${corpo}`);
  }

  console.log(`${itens.length} votações · ${Math.ceil(itens.length / POR_LOTE)} lotes em dados/revisao-alesc/prompts/`);
  for (const x of itens) console.log(`  ${x.id}  ${x.data}  ${x.sim}x${x.nao}  ${x.trecho.length} chars`);
}

main();
