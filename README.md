# Prumo

Uma bússola política gratuita, anônima e sem lado, para a eleição de outubro de 2026.

O Prumo faz três coisas, nesta ordem:

1. **Onde você está** — 114 perguntas sobre políticas públicas concretas colocam
   você em cinco eixos.
2. **Onde os partidos estão** — não pelo que dizem de si, mas pelo que suas
   bancadas votaram, voto a voto, na Câmara dos Deputados.
3. **Os candidatos** — quem concorre por cada partido, com a evidência que existe
   sobre cada um: voto medido, mandato anterior, ou nada além do registro.

É um site estático: HTML, CSS e JavaScript, sem servidor, sem banco de dados e
sem build. Abrir o `index.html` já funciona.

Este documento é a metodologia inteira, em aberto. Ele existe porque uma
ferramenta que diz "aqui está seu lugar na política" sem mostrar a conta não
merece confiança nenhuma — inclusive a minha.

---

## Privacidade

Não é promessa de política de uso, é propriedade do código:

- **Nenhuma resposta sai do seu aparelho.** Não há servidor para onde enviar.
- **Nada é armazenado.** Nem `localStorage`, nem `sessionStorage`, nem cookie.
  Fechou a aba, acabou.
- **Sem analytics, sem rastreador, sem fonte externa.** A única coisa que o site
  busca na rede são os próprios arquivos de dados dele.
- **O código do perfil** (`?p=...` na URL entre a etapa 1 e a 2) carrega só as
  cinco posições e as cinco confianças — 12 bytes. Não dá para reconstruir
  nenhuma resposta a partir dele, porque as respostas não estão lá.
- A **explicação por IA**, opcional, é o único momento em que algo trafega: ela
  usa uma chave da Anthropic que **você** cola, que fica só na memória da aba, e
  envia apenas os cinco números do resultado — nunca as respostas. Se você não
  pedir, nada acontece.

---

## Etapa 1 — onde você está

### Os cinco eixos

| Código | Nome | Polo − | Polo + |
|---|---|---|---|
| `eco` | Economia | Estado | Mercado |
| `soc` | Costumes | Progressista | Conservador |
| `pod` | Poder | Liberdade | Ordem |
| `sob` | Mundo | Abertura | Soberania |
| `amb` | Natureza | Preservação | Desenvolvimento |

Cada posição vai de −100 a +100.

### As perguntas

São 114 itens em `dados/perguntas.json`. Todos seguem cinco regras, e
`ferramentas/validar.js` recusa o banco se alguma for quebrada:

1. **Linguagem de ensino fundamental**, uma ideia por pergunta, formulação
   afirmativa.
2. **Nunca "continuar", "voltar a" ou "manter"** no enunciado. A pergunta é
   sobre a política em si, não sobre preservá-la — senão quem não sabe qual é a
   regra atual responde outra coisa.
3. **Nenhum nome de político vivo ou de partido** dentro de uma pergunta.
4. **Todo item declara o `status_quo`** (o que a lei diz hoje) com fonte
   primária em `fonte_status_quo`. Isso fica fora do enunciado e só é usado para
   a conta do PULAR.
5. **Peso inteiro de −3 a +3 por eixo.** Um item pode pesar em mais de um eixo.

### A conta

Para cada item respondido, e para cada eixo `k` em que ele tem peso `w`:

```
SIM    →  soma  +w
NÃO    →  soma  −w
PULAR  →  soma  +0,3 · direção(status_quo) · w
```

O PULAR não é zero porque não responder, na prática, é deixar as coisas como
estão. O fator 0,3 diz: conta como uma adesão fraca ao status quo, não como uma
adesão plena. Quem pula tudo não sai no centro perfeito — sai de onde a lei
brasileira está hoje, que é a leitura honesta de "tanto faz".

A posição final no eixo é `100 · soma_k / peso_total_apresentado_k`.

### A confiança

Cada eixo vem com um número de confiança próprio:

```
confiança_k = 100 · (peso efetivamente respondido) / (peso apresentado)
```

Quem pulou metade das perguntas de Natureza recebe a posição de Natureza com
confiança baixa, e o gráfico desenha isso: vértice vazado abaixo de 40% e um
traço ao longo do raio tão longo quanto a incerteza. A ferramenta prefere dizer
"não sei" a fingir precisão.

### Checagem de polaridade

Um questionário em que o SIM sempre puxa para o mesmo lado mede vontade de
concordar, não opinião. Antes de publicar qualquer lote, `validar.js` confere,
eixo por eixo, a fração do peso em que o SIM aponta para o polo +. Ela precisa
ficar **entre 40% e 60%**. Fora disso, o banco é recusado.

Isso já custou caro uma vez: `pod` ficou em 60,2% e foi preciso escrever um item
novo (câmera corporal na farda policial, `pod −3`) em vez de mexer no peso de um
item existente. Ajustar peso para passar no teste seria falsificar o instrumento
com a desculpa de validá-lo.

### O rótulo, e por que existe um ganho de 1,5

Dez arquétipos em `dados/arquetipos.json` têm coordenadas nos cinco eixos; o
rótulo é o mais próximo, por distância euclidiana, e some quando a intensidade
é baixa demais (aí você é "centrista", sem grau).

Só que há uma compressão medida no instrumento: como muitos itens pesam em mais
de um eixo, cada eixo é diluído, e um respondente sintético colocado num
arquétipo puro volta com o vetor em cerca de **dois terços** da escala
(inclinações de 0,64 a 0,69, uniformes entre os eixos). Sem correção, todo mundo
parece mais moderado do que é e o centro vence sempre.

A correção é `config.ganho_rotulo = 1,5`, aplicada **só na hora de comparar com
os arquétipos** — nunca no número que aparece na tela nem no código do perfil.
Os 23 testes em `testes/motor.test.js` usam o ganho que está no banco e exigem
que o arquétipo correto apareça no top 2 em pelo menos 85% das simulações.

### O respondente sintético

Os testes simulam pessoas, e a primeira versão estava errada de um jeito
instrutivo: ela respondia pelo **sinal** da projeção do item no arquétipo, ou
seja, era uma fanática — concordava com intensidade máxima com qualquer coisa
levemente alinhada. Ela declarou os arquétipos social-democrata e conservador
"inalcançáveis", o que era conclusão falsa sobre o instrumento.

A versão atual é probabilística: `P(sim) = (1 + a) / 2`, com
`a = Σ wₖcₖ / Σ|wₖ|`. Convicção forte gera concordância quase certa; convicção
morna gera moeda quase justa. Os dois modos estão em `ferramentas/simular.js`.

---

## Etapa 2 — onde os partidos estão

### De onde vem a posição

De **23 votações nominais do plenário da Câmara**, legislatura 57 (2023–2027),
extraídas da API de Dados Abertos da Câmara dos Deputados. Cada votação recebeu
um vetor de cinco eixos, na mesma convenção do questionário: **SIM da bancada
aponta para o sinal do vetor**.

O funil, registrado em `dados/votacoes-candidatas.json` e `dados/votacoes.json`:

| | |
|---:|---|
| 887 | votações nominais de plenário na legislatura |
| 297 | substantivas e discriminantes (o resto é procedimental ou quase unânime) |
| 144 | proposições distintas |
| 102 | proposições com ao menos uma votação de sinal recuperável |
| 33 | votações candidatas, das quais 15 caíram por sinal e 2 por unanimidade |
| 28 | com vetor atribuído |
| **23** | sobreviveram à revisão adversarial descrita adiante |

Para o partido `p` e o eixo `k`:

```
pos_v = (SIM − NÃO) / (SIM + NÃO)        na votação v, entre −1 e +1
S_k   = Σ_v  pos_v · w_v[k]
M_k   = Σ_v  |w_v[k]|                     sobre TODO o catálogo
R_k   = Σ_v  |w_v[k]|                     só onde a bancada votou

posição_k   = 100 · S_k / M_k
confiança_k = 100 · R_k / M_k
```

Dividir por `M_k` (o catálogo inteiro) e não por `R_k` (só onde o partido
apareceu) é deliberado: quem faltou não ganha posição extrema de graça. Fica
perto do centro **e** com confiança baixa, e a interface trata os dois fatos
como coisas diferentes.

Obstrução é contada na direção majoritária da bancada. Partidos com menos de 3
deputados na maior votação ficam fora — abaixo disso o ruído domina.

### A regra do sinal recuperável, e o atalho que foi recusado

Uma votação só entra no catálogo se der para saber **o que o SIM significava**.
Entram as do tipo "Aprovado o Substitutivo/Projeto/Subemenda" e "Mantido o
texto", e os destaques cujo campo `descUltimaAberturaVotacao` descreve a
substância do que se votava.

Ficaram de fora **15 votações candidatas**, quase todas destaques em que esse
campo só informa *qual partido pediu o destaque* — por exemplo, "DTQ 7: Bloco
Fdr PSOL-REDE: Emenda nº 8".

Seria trivial inferir a direção daí: emenda do PSOL puxa para a esquerda. E é
exatamente o que não se pode fazer. O instrumento passaria a medir os partidos
pela identidade que nós já lhes atribuímos, e depois encontraria essa identidade
de volta nos dados, com cara de descoberta. Toda votação nessa condição foi
descartada. O registro está em `dados/votacoes.json`, campo `sobre_o_sinal`.

### A revisão adversarial, e o que ela encontrou

Os vetores acima são um julgamento humano — o meu — sobre o que cada votação
significa. Era o único ponto do Prumo sem nenhuma conferência independente, e por
isso ele passou por uma **revisão cega**: quatro revisores receberam apenas o
registro primário da Câmara (ementa, descrição da votação, objeto do destaque,
placar) e as definições dos eixos, e atribuíram os vetores do zero. Não viram os
vetores do catálogo nem os resumos em linguagem simples. O partido que pediu cada
destaque foi apagado do texto, pela mesma razão que exclui votações cujo sinal só
se conhece pelo autor do destaque.

Os prompts e as respostas estão em `dados/revisao-2j/`. O resultado, de 28
votações revisadas:

- **17 com vetor equivalente** — mesmos eixos, mesmos sinais.
- **2 com o sinal corrigido.**
- **9 removidas**, das quais **4 voltaram** numa segunda fase, depois que o
  dispositivo destacado foi finalmente lido (ver adiante).

O que saiu, e por quê:

| Problema | Votações | Exemplo |
|---|---:|---|
| Vetor da lei inteira aplicado a um destaque que ninguém leu | 5 | Programa Mover: o vetor media a lei (carro limpo, taxa das compras no exterior); a votação era um destaque ao art. 5º |
| Mede disputa institucional, não o eixo | 2 | PEC das prerrogativas parlamentares: a clivagem é Legislativo × Judiciário e atravessa os campos |
| Assunto errado | 1 | PDL 98/2023 estava descrito como a derrubada do decreto das armas; ele susta decretos do **saneamento básico** |
| Sinal não recuperável | 1 | Perdão de dívidas rurais: os dois sinais em `eco` são defensáveis, e o `amb` não tinha base no texto |

E as duas correções de sinal: a votação sobre progressão de regime dos condenados
de 8 de janeiro estava marcada como polo Ordem enquanto o próprio resumo dizia
que a regra *abranda* a pena; e o projeto sobre o art. 15 do Estatuto do
Desarmamento estava descrito como ampliação do porte, quando o artigo trata de
**pena por disparo** — é agravamento de pena, não política de acesso a arma.

**Sete dos nove problemas têm a mesma origem:** o vetor foi atribuído ao assunto
da lei em vez do que estava efetivamente em votação. Em destaque, o que se vota é
um dispositivo, e a regra do catálogo sempre disse isso — mas a regra não foi
seguida na hora de atribuir os pesos.

O efeito medido foi grande: aplicar as decisões deslocou a posição dos partidos
em **54 pontos no pior eixo de cada um, em média, e até 86 pontos** num caso. O
catálogo anterior não media o que dizia medir. `ferramentas/revisao-2j/simular-correcao.js`
reproduz a comparação.

Nenhuma votação nova entra no catálogo sem que o dispositivo em jogo esteja lido
e descrito.

### A segunda fase: atrás do texto dos destaques

Cinco votações tinham saído por "dispositivo não lido". Eram votações boas —
disputadas, sobre matéria real —, então valia ir atrás do texto na Câmara. O
obstáculo foi técnico e vale registrar: **parte dos PDFs da Câmara não tem camada
de texto**; são imagem, e nem o pdf.js extrai nada legível. Nesses casos o
dispositivo veio da redação final aprovada na mesma sessão, o que está declarado
em `fonte_do_dispositivo` de cada votação, com o risco de renumeração assumido.

Quatro voltaram. **Ler o dispositivo mudou a resposta em três dos quatro casos:**

| Votação | O que o destaque realmente era | Vetor antigo | Vetor novo |
|---|---|---|---|
| Estratégia Nacional de Saúde | licitação reservada a fabricante brasileiro | `eco −2 sob +2` | `eco −2 sob +2` |
| Programa Mover | multa de 20% a quem vende carro sem assumir metas | `eco +1 sob +2 amb −1` | `eco −2 amb −1` |
| Atualização patrimonial (Rearp) | fechamento de brechas de compensação tributária | `eco +2` | `eco −2` |
| Minerais críticos | triagem estatal de investimento estrangeiro na mineração | `sob +2 amb +2` | `eco −1 sob +3` |

O caso do Rearp é o mais instrutivo: a lei favorece o contribuinte, mas o artigo
destacado **restringe** a compensação de créditos, e portanto aponta para o lado
oposto. Medir a lei em vez do dispositivo tinha invertido o sinal.

A quinta continua fora, mas agora por um motivo lido em vez de ignorância: o
inciso II do art. 193 do PL 1466/2025 transforma 1.955 cargos efetivos vagos em
cargos em comissão. É organização da administração pública, e não mede nenhum dos
cinco eixos.

### Dois defeitos diferentes, dois selos diferentes

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
`ferramentas/discriminacao.js` mostra votação por votação.

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
o catálogo diz isso em `calibracao.observacao_sobre_eco`.

### O alinhamento: similaridade de direção, não distância

O alinhamento entre você e um partido é o **cosseno** entre os dois vetores,
ponderado pela sua confiança em cada eixo, reescalado para 0–100:

```
alinhamento = 50 · (1 + cos θ)
```

O cosseno foi escolhido depois que a distância euclidiana falhou, e a falha vale
a pena registrar: o vetor do partido vem de votação nominal e chega perto de
±100; o seu vem do questionário e sai comprimido a dois terços. A primeira
tentativa foi aplicar o ganho de 1,5 também aqui. Piorou: o ganho saturava nos
extremos (um socialista batia em −100 em dois eixos e perdia informação) e
deixava a pessoa **mais extrema que qualquer partido real**, de modo que o
vencedor passava a ser simplesmente o partido menos extremo. Trocou-se um viés de
centro por outro.

O cosseno ignora escala por construção. Duas pessoas que pensam igual, uma com
convicção forte e outra com convicção morna, apontam para o mesmo lugar — e é
disso que a pergunta "quais partidos pensam como eu" trata.

### Quatro travas de honestidade

Todas em `js/alinhamento.js`, todas nascidas de rodar a conta com dados reais e
olhar o resultado:

1. **Confiança mínima de 60%** para entrar no ranking. O PATRIOTA (7 votações de
   28, confiança 27%) aparecia no top 3 de arquétipos opostos entre si, porque
   perto da origem é perto de todo mundo. Ele e o PSC (4 votações) saem para uma
   lista à parte, com selo e contagem de votações. Ficam **20 partidos** no
   ranking, de 22 medidos.
2. **Intensidade mínima de 12** na sua própria posição. Abaixo disso a direção do
   seu vetor é ruído, e a lista deixa de ser apresentada como ranking.
3. **Alinhamento mínimo de 70 no primeiro colocado.** Abaixo disso, a lista
   continua visível mas com aviso: nem o mais parecido se parece de verdade. Não
   é defeito do método — há perfis sem partido no Brasil. Rodando os dez
   arquétipos contra os partidos medidos, sete encontram alguém entre 88 e 99;
   **libertário para em 66 e liberal-progressista em 56**, e os dois disparam o
   aviso. O motivo é estrutural: os partidos pró-mercado do Brasil não são os
   mesmos que limitam o poder do Estado sobre o indivíduo, de modo que essa
   combinação não é oferecida por ninguém.
4. **Faixa de empate de 6 pontos.** Partidos a menos de 6 pontos do primeiro
   colocado são apresentados como um grupo empatado, sem ordem entre si.

O quarto número não foi escolhido, foi medido. `ferramentas/empate.js` faz um
jackknife: tira uma votação do catálogo de cada vez, refaz a conta inteira e vê
o quanto cada nota balança. Noventa por cento das notas balançam menos de 5,1
pontos — daí os 6. E o mesmo teste revelou por que a trava era necessária:

> **Sete dos nove arquétipos trocam de primeiro colocado quando se remove uma
> única votação das 23.**

Sem a trava, o encarte diria "o partido mais parecido com você é SOLIDARIEDADE,
99%" quando PSB, PV, PT, PDT, PCdoB e PSOL estão todos entre 94 e 99 — uma
diferença menor que o erro do próprio método. O instrumento distingue muito bem
um bloco do outro, e **não distingue partidos dentro de um bloco**. Dizer isso é
mais útil, e mais verdadeiro, do que fabricar uma classificação.

### Três dos cinco eixos quase não são três

Medida a correlação entre os eixos **nos partidos**:

|  | eco | soc | pod | sob | amb |
|---|---|---|---|---|---|
| **eco** | 1,00 | 0,94 | 0,29 | −0,70 | 0,83 |
| **soc** | 0,94 | 1,00 | 0,47 | −0,63 | 0,89 |
| **pod** | 0,29 | 0,47 | 1,00 | 0,11 | 0,60 |
| **sob** | −0,70 | −0,63 | 0,11 | 1,00 | −0,33 |
| **amb** | 0,83 | 0,89 | 0,60 | −0,33 | 1,00 |

Um único componente explica **87%** da variação entre os partidos, e ele é feito
essencialmente de `eco`, `soc` e `amb`: partido pró-Estado é também progressista
e preservacionista, e o inverso.

**`pod` é a exceção, e isso é notícia boa.** Ele correlaciona 0,29 com `eco` na
conta cheia e troca de sinal na conta só com votações de eixo único — um eixo que troca de
sinal assim não tem relação estável com os demais, ou seja, mede coisa própria.
Antes da revisão adversarial ele aparecia a 0,83 com `eco`; boa parte daquela
correlação vinha das duas votações que mediam disputa institucional e saíram do
catálogo. Consequência prática: **não dá para dizer, com estas votações, que um
lado do espectro brasileiro é mais punitivista que o outro.**

A suspeita óbvia é que a correlação restante tenha sido fabricada pelos vetores:
se uma mesma votação pesa em `eco` e em `amb`, ela correlaciona os dois por
construção. Por isso a conta é refeita **só com as votações de eixo único**, que
não compartilham item nenhum entre eixos. O núcleo sobrevive, em **75%**. Ele
está nos dados, não no método. (Ressalva: só existe uma votação de eixo único em
`sob`; leia a linha e a coluna de `sob` da segunda tabela como ruído.)

**Os arquétipos não foram aproximados dessa reta, e não devem ser.** Eles
descrevem *eleitores*, e eleitor não é obrigado a caber na reta em que os
partidos se organizaram. Colapsar um sobre o outro destruiria a informação mais
útil que o Prumo tem a dar: a de que certa combinação de posições não é oferecida
por partido brasileiro nenhum. Por isso a interface diz, em uma frase, que nos
partidos esses eixos andam quase juntos — sem isso o radar promete cinco
informações independentes que não existem.

---

---

## Etapa 3 — os candidatos

Da aba de um partido, o eleitor abre a lista de quem concorre por ele no seu
estado. Cada candidato recebe a ficha que a evidência sobre ele permite — e só
essa.

### Por que a etapa 3 precisa existir

A etapa 2 mede partidos. Medindo os deputados federais de Santa Catarina um a
um, com a mesma conta, aparece o motivo de isso não bastar:

| | amplitude interna no eixo Economia | bancada nacional |
|---|---:|---:|
| **PL em SC** | 95 pontos (Goetten +5 · Zé Trovão +100) | +80 |
| **MDB em SC** | 76 pontos (Cobalchini +24 · Pezenti +100) | **−34** |
| PT em SC | 10 pontos | −99 |

O caso do MDB é o mais eloquente: a bancada nacional está do lado do Estado, e
os dois deputados catarinenses mensuráveis estão do lado do mercado. Um eleitor
de SC que chegasse ao MDB pelo ranking de partidos receberia, sobre os seus
próprios deputados, a informação trocada.

Medindo todos os deputados de SC, a amplitude no eixo econômico é **200** — a
mesma dos vinte partidos nacionais. O rótulo partidário carrega muito menos
informação do que a etapa 2 sugere, e a etapa 3 existe para dizer isso.

### A escada de evidência

A evidência sobre um candidato é desigual, e a ficha diz **qual** evidência
existe em vez de fingir que é a mesma para todos. Com os 244 candidatos de SC a
deputado federal e ao Senado:

| Nível | Quantos | O que a ficha mostra |
|---|---:|---|
| **medido** | 14 | posição nos cinco eixos e índice de compatibilidade com o eleitor |
| medido-fraco | 3 | esteve na Câmara mas faltou demais; sem posição |
| **com mandato** | 66 | os mandatos exercidos e onde procurar o registro |
| já concorreu | 88 | as candidaturas anteriores |
| estreante | 73 | o que o TSE registra e o link que a própria pessoa declarou |

Só 30% são estreantes absolutos. Dois terços deixaram algum rastro público, e
34% já exerceram mandato — o registro deles existe, apenas não na Câmara.

### A regra inviolável da etapa 3

> **A posição do partido nunca é atribuída ao candidato.**

Aqui a tentação é máxima, porque o eleitor chega pela aba do partido: seria fácil
escrever "o PL está em +80, logo este candidato do PL está em +80". Seria também
a inferência por identidade que a revisão adversarial tirou da etapa 2 — a mesma
que colou um vetor de armas numa votação de saneamento. Quem não tem voto medido
não recebe posição. A regra está no cabeçalho de
`ferramentas/montar_candidatos.js` e no próprio arquivo de dados.

Três consequências visíveis na interface:

- **Só quem tem voto medido mostra um número.** Os demais mostram fatos, não
  índices.
- **Troca de legenda é declarada.** Cinco dos dezessete deputados de SC que
  buscam reeleição votaram sob outro partido; a ficha diz "este histórico foi
  feito pelo PSD, a pessoa concorre pelo PL".
- **Registro pendente é marcado.** Dezesseis das 244 candidaturas de SC estão
  como renúncia, indeferida ou aguardando julgamento. Quem pode não ir à urna
  aparece sinalizado.

### O que a etapa 3 não cobre

- **Deputado estadual.** A ALESC não entrou no projeto; se publicar votação
  nominal, o mesmo método serve.
- **Presidente e governador.** São os únicos cargos cujos candidatos registram
  plano de governo no TSE — 13 e 8, todos entregues. Ler esses planos é a
  próxima etapa, e ela mede o que a pessoa **diz**, nunca o que ela fez.
- **A comparação "diz × fez"** não existe hoje, e não por descuido: quem tem
  plano registrado (executivo) não tem voto nominal nosso, e quem tem voto
  nominal (deputado federal) não registra plano. As duas bases não se cruzam.

### Fontes da etapa 3

Voto individual: API de Dados Abertos da Câmara, `/votacoes/{id}/votos`, as
mesmas 23 votações do catálogo. Registro de candidatura: DivulgaCandContas do
TSE, eleição 20322002026. O cruzamento entre as duas bases é conferido nome a
nome em `dados/candidaturas-sc.json`, e não automático: "Cobalchini" casa com
dois candidatos que são pessoas diferentes, um federal e um estadual.

## O que o Prumo não faz

- **Não recomenda voto.** Diz onde você está e onde os partidos estão. A
  conclusão é sua.
- **Não mede o que os partidos dizem**, só o que votaram em plenário, em votação
  nominal, nesta legislatura. Programa partidário não entra.
- **Não mede deputado individual**, só bancada. Nem candidato — essa é a etapa 3.
- **Não vale para sempre.** O `status_quo` de vários itens depende de
  jurisprudência pendente e de lei recente. O banco precisa ser rechecado antes
  de cada eleição, e `validar.js` recusa publicar se algum item ainda estiver
  marcado como `verificar`.

### Pendências conhecidas

- **O eixo Mundo não separa os partidos** (amplitude 37 contra 200). Está
  declarado na interface, mas o conserto de verdade seria achar votações nominais
  em que as bancadas de fato divergem sobre abertura e soberania. Pode não haver
  nenhuma nesta legislatura — o que seria, em si, um achado a publicar.
- **Dois dos vinte e três dispositivos vieram da redação final**, e não do
  substitutivo votado, porque o PDF do substitutivo é imagem sem camada de texto
  (Programa Mover e minerais críticos). O risco de renumeração está declarado em
  `fonte_do_dispositivo`. Ler esses dois PDFs por OCR fecharia a última brecha.
- **O eixo Poder depende de uma votação delicada.** A do 8 de janeiro é uma norma
  geral sobre progressão de pena, e por isso ficou; mas boa parte do que ela
  separa pode ser posição sobre aquele episódio, e não punitivismo em geral. Fica
  registrado como limite conhecido.
- `dados/partidos-nomes.json` traz o número eleitoral de cada partido como
  `null`. É dado do TSE e será preenchido da fonte, não de memória.
- Licença de uso: a definir.

---

## Como conferir por conta própria

```bash
node testes/motor.test.js              # 23 testes do motor de pontuação
node ferramentas/validar.js            # banco de perguntas: esquema, polaridade, redação
node ferramentas/validar-votacoes.js   # catálogo de votações da etapa 2
node ferramentas/simular.js            # respondentes sintéticos nos dez arquétipos
node ferramentas/calcular_revelado.js  # recalcula as posições dos partidos do zero
node ferramentas/estrutura.js          # a análise de dimensionalidade acima
node ferramentas/discriminacao.js      # o quanto cada votação separa os partidos
node ferramentas/empate.js             # jackknife: o ranking distingue mesmo os primeiros?
node ferramentas/calcular_deputados.js SC   # posição individual dos deputados da UF
node ferramentas/montar_candidatos.js SC    # catálogo de candidatos com a escada de evidência
node ferramentas/revisao-2j/comparar.js          # revisão cega x catálogo, item a item
node ferramentas/revisao-2j/simular-correcao.js  # o efeito das decisões da revisão
```

`calcular_revelado.js` regenera `dados/partidos-revelado.json` inteiro,
metadados inclusive — nada ali é escrito à mão, justamente para que não fique
desatualizado em relação aos dados.

`ferramentas/extrair_votos.js` é o extrator da API da Câmara. Ele roda no console
do navegador, não no Node, e o cabeçalho do arquivo explica as quatro
peculiaridades da API que custaram tempo (`/votos` recusa paginação; `/votacoes`
aceita janela de no máximo 3 meses; `/proposicoes/{id}/votacoes` não aceita
parâmetro; orientações vêm por bloco, não por partido).

## Os arquivos

```
index.html            etapa 1: o questionário
etapa2/index.html     etapa 2: o encarte das legendas
js/motor.js           pontuação pura — sem DOM, sem armazenamento
js/perfil.js          o código de 12 bytes que liga as duas etapas
js/grafico.js         o radar em SVG
js/alinhamento.js     o ranking da etapa 2 e suas quatro travas
dados/perguntas.json  114 itens, com status_quo e fonte primária
dados/eixos.json      os cinco eixos e seus polos
dados/arquetipos.json os dez arquétipos e suas coordenadas
dados/votacoes.json   as 23 votações, seus vetores e o registro metodológico
dados/revisao-2j/     os prompts cegos e as respostas da revisão adversarial
dados/deputados-revelado-sc.json  posição individual de cada deputado de SC
dados/candidatos-sc.json         os 244 candidatos de SC e sua escada de evidência
dados/votos-partidos.json    como cada bancada votou em cada uma
dados/partidos-revelado.json posições calculadas (gerado, não editado)
PRUMO-spec-v1.md      o contrato do projeto; a seção 12 registra cada decisão
```

---

Feito por [twrech](https://github.com/twrech). Erro encontrado é contribuição:
abra uma issue em [github.com/twrech/prumo](https://github.com/twrech/prumo).
