/**
 * Ajusta os números do README ao catálogo atual.
 * Uso pontual, depois da segunda fase da revisão adversarial.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const p = fileURLToPath(new URL('../../README.md', import.meta.url));
let t = readFileSync(p, 'utf8');
const trocas = [];
const troca = (de, para) => {
  if (!t.includes(de)) throw new Error(`não achei: ${de.slice(0, 70)}`);
  t = t.replace(de, para);
  trocas.push(de.slice(0, 50));
};

troca(
  'De **19 votações nominais do plenário da Câmara**',
  'De **23 votações nominais do plenário da Câmara**'
);

troca(
  '| **19** | sobreviveram à revisão adversarial descrita adiante |',
  '| **23** | sobreviveram à revisão adversarial descrita adiante |'
);

troca(
  `- **17 com vetor equivalente** — mesmos eixos, mesmos sinais.
- **9 removidas.**
- **2 com o sinal corrigido.**`,
  `- **17 com vetor equivalente** — mesmos eixos, mesmos sinais.
- **2 com o sinal corrigido.**
- **9 removidas**, das quais **4 voltaram** numa segunda fase, depois que o
  dispositivo destacado foi finalmente lido (ver adiante).`
);

troca(
  `Nenhuma votação nova entra no catálogo sem que o dispositivo em jogo esteja lido
e descrito.`,
  `Nenhuma votação nova entra no catálogo sem que o dispositivo em jogo esteja lido
e descrito.

### A segunda fase: atrás do texto dos destaques

Cinco votações tinham saído por "dispositivo não lido". Eram votações boas —
disputadas, sobre matéria real —, então valia ir atrás do texto na Câmara. O
obstáculo foi técnico e vale registrar: **parte dos PDFs da Câmara não tem camada
de texto**; são imagem, e nem o pdf.js extrai nada legível. Nesses casos o
dispositivo veio da redação final aprovada na mesma sessão, o que está declarado
em \`fonte_do_dispositivo\` de cada votação, com o risco de renumeração assumido.

Quatro voltaram. **Ler o dispositivo mudou a resposta em três dos quatro casos:**

| Votação | O que o destaque realmente era | Vetor antigo | Vetor novo |
|---|---|---|---|
| Estratégia Nacional de Saúde | licitação reservada a fabricante brasileiro | \`eco −2 sob +2\` | \`eco −2 sob +2\` |
| Programa Mover | multa de 20% a quem vende carro sem assumir metas | \`eco +1 sob +2 amb −1\` | \`eco −2 amb −1\` |
| Atualização patrimonial (Rearp) | fechamento de brechas de compensação tributária | \`eco +2\` | \`eco −2\` |
| Minerais críticos | triagem estatal de investimento estrangeiro na mineração | \`sob +2 amb +2\` | \`eco −1 sob +3\` |

O caso do Rearp é o mais instrutivo: a lei favorece o contribuinte, mas o artigo
destacado **restringe** a compensação de créditos, e portanto aponta para o lado
oposto. Medir a lei em vez do dispositivo tinha invertido o sinal.

A quinta continua fora, mas agora por um motivo lido em vez de ignorância: o
inciso II do art. 193 do PL 1466/2025 transforma 1.955 cargos efetivos vagos em
cargos em comissão. É organização da administração pública, e não mede nenhum dos
cinco eixos.`
);

// Seção dos eixos fracos: reescrita inteira
const inicio = t.indexOf('### Dois eixos têm confiança reduzida, e a interface diz isso');
const fim = t.indexOf('### O alinhamento: similaridade de direção, não distância');
if (inicio < 0 || fim < 0) throw new Error('não localizei a seção dos eixos fracos');
t = t.slice(0, inicio) + `### Dois defeitos diferentes, dois selos diferentes

Um eixo pode falhar de duas maneiras que não se confundem, e a ficha do partido
mostra um selo distinto para cada uma.

**Poucas votações no catálogo** — é o caso de **Costumes**, com 12,1% do peso
contra o piso de 15%. O motivo é um fato sobre esta legislatura, não falha de
busca: aborto, drogas e identidade de gênero foram resolvidos por urgência, por
acordo simbólico, ou não chegaram ao plenário em votação nominal. Sobraram quatro
votações: o marco temporal (componente secundário), a resolução do Conanda, o
feriado da Consciência Negra e o dia dos defensores de direitos humanos. O eixo
perdeu na revisão as duas votações de armas que antes o sustentavam — uma media
saneamento, a outra virou item de Poder.

**Os partidos não divergem** — é o caso de **Mundo**, e é um defeito mais sutil,
porque não aparece na conferência de peso: o eixo tem 18,2% do catálogo, folgado
acima do piso, e mesmo assim **a amplitude entre o partido mais aberto e o mais
soberanista é de 37 pontos, contra 200 nos eixos que separam**. A razão é que as
bancadas votaram parecido nas duas pontas: aprovaram a entrada da Bolívia no
Mercosul e aprovaram a triagem estatal de investimento estrangeiro na mineração.
Não existe, nestas votações, uma divisão partidária entre abertura e soberania.

Esse segundo defeito só ficou visível depois da segunda fase da revisão: as duas
votações recuperadas *aumentaram* o peso do eixo e *reduziram* sua amplitude,
porque acrescentaram peso sem acrescentar divergência. **Peso no catálogo e poder
de separação não são a mesma coisa**, e desde então o Prumo mede as duas coisas —
\`ferramentas/discriminacao.js\` mostra votação por votação.

Duas saídas foram testadas e descartadas para Costumes:

- **O Senado.** Varridas as 423 votações nominais da legislatura, 72 sobraram
  após os filtros e **nenhuma** era de costumes — a pauta nominal do Senado é
  dominada por matéria tributária e fiscal. Pesa contra também que 81 senadores
  dão de 1 a 3 por partido, ruidoso demais.
- **Subir o peso de um item** limparia a barra na hora. Não foi feito, pela mesma
  razão da polaridade: seria mexer no instrumento para passar no próprio teste.

A saída adotada foi declarar.

Uma terceira coisa a declarar: **Economia concentra 31,8% do peso.** Não é
escolha de projeto — as votações nominais de plenário desta legislatura são, em
boa parte, matéria tributária e fiscal. Os cinco eixos não têm o mesmo lastro, e
o catálogo diz isso em \`calibracao.observacao_sobre_eco\`.

` + t.slice(fim);

// Tabela de correlação
const iCorr = t.indexOf('|  | eco | soc | pod | sob | amb |');
const fimCorr = t.indexOf('\n\n', t.indexOf('| **amb**', iCorr));
t = t.slice(0, iCorr) + `|  | eco | soc | pod | sob | amb |
|---|---|---|---|---|---|
| **eco** | 1,00 | 0,94 | 0,29 | −0,70 | 0,83 |
| **soc** | 0,94 | 1,00 | 0,47 | −0,63 | 0,89 |
| **pod** | 0,29 | 0,47 | 1,00 | 0,11 | 0,60 |
| **sob** | −0,70 | −0,63 | 0,11 | 1,00 | −0,33 |
| **amb** | 0,83 | 0,89 | 0,60 | −0,33 | 1,00 |` + t.slice(fimCorr);

troca(
  'Ele correlaciona 0,40 com `eco` na\nconta cheia e −0,65 na conta só com votações de eixo único',
  'Ele correlaciona 0,29 com `eco` na\nconta cheia e troca de sinal na conta só com votações de eixo único'
);

troca(
  `   arquétipos contra os partidos medidos, seis encontram alguém entre 88 e 98;
   **libertário para em 62, liberal-progressista em 63 e trabalhista em 62**, e os
   três disparam o aviso. O caso do trabalhista é o mais interessante: um perfil
   pró-Estado na economia e protecionista no comércio não tem casa, porque nestas
   votações os partidos que defendem mais Estado são os mesmos que votaram a favor
   de acordos internacionais.`,
  `   arquétipos contra os partidos medidos, sete encontram alguém entre 88 e 99;
   **libertário para em 66 e liberal-progressista em 56**, e os dois disparam o
   aviso. O motivo é estrutural: os partidos pró-mercado do Brasil não são os
   mesmos que limitam o poder do Estado sobre o indivíduo, de modo que essa
   combinação não é oferecida por ninguém.`
);

// Pendências
troca(
  `- **Os cinco destaques cujo dispositivo não foi lido.** Saíram do catálogo em vez
  de entrar com o vetor errado, mas eram votações boas: disputadas e sobre matéria
  real. Recuperar o texto dos dispositivos destacados (Programa Mover art. 5º,
  Estratégia Nacional de Saúde art. 26, carreiras art. 193 II, atualização
  patrimonial art. 37, minerais críticos § 2º do art. 3º) devolveria o eixo Mundo
  ao piso e daria fôlego a Economia. **É a maior melhoria disponível hoje.**`,
  `- **O eixo Mundo não separa os partidos** (amplitude 37 contra 200). Está
  declarado na interface, mas o conserto de verdade seria achar votações nominais
  em que as bancadas de fato divergem sobre abertura e soberania. Pode não haver
  nenhuma nesta legislatura — o que seria, em si, um achado a publicar.
- **Dois dos vinte e três dispositivos vieram da redação final**, e não do
  substitutivo votado, porque o PDF do substitutivo é imagem sem camada de texto
  (Programa Mover e minerais críticos). O risco de renumeração está declarado em
  \`fonte_do_dispositivo\`. Ler esses dois PDFs por OCR fecharia a última brecha.`
);

troca('dados/votacoes.json   as 19 votações, seus vetores e o registro metodológico',
  'dados/votacoes.json   as 23 votações, seus vetores e o registro metodológico');

troca('node ferramentas/estrutura.js          # a análise de dimensionalidade acima',
  'node ferramentas/estrutura.js          # a análise de dimensionalidade acima\nnode ferramentas/discriminacao.js      # o quanto cada votação separa os partidos');

writeFileSync(p, t);
console.log(`README atualizado · ${trocas.length} trocas pontuais + 2 blocos reescritos`);
