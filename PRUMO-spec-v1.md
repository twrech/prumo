# PRUMO — Documento de Projeto (v1)

Projeto guarda-chuva: **Ajudando a Votar**
Etapa 1: **Prumo — seu perfil político**
Data: 09/09/2026 · Autor: Talyz (com Claude Fable 5.1) · Repositório: github.com/twrech (a criar: `prumo`)

> Este documento é o contrato do projeto. Qualquer sessão futura (Opus, Claude Code, Sonnet) deve lê-lo integralmente antes de produzir código ou conteúdo. Decisões aqui registradas só mudam por decisão explícita do Talyz, e a mudança deve ser anotada na seção 12 (registro de decisões).

---

## 1. Visão

Ferramenta gratuita, anônima, estática (sem servidor), publicada no GitHub Pages, que ajuda **qualquer pessoa**, independentemente de escolaridade ou consciência política, a descobrir seu posicionamento político por meio de perguntas de **SIM / NÃO / PULAR**. O resultado é um **vetor em cinco eixos**, um rótulo aproximado e um percentual global — e esse vetor é a entrada das etapas 2 (partidos) e 3 (candidatos).

Princípio central: **o vetor é o produto**. Se o diagnóstico falhar, as etapas seguintes confundem em vez de ajudar. Toda decisão de design se subordina à precisão e à neutralidade do vetor.

Etapas do projeto maior (para referência; detalhamento em 10):

- Etapa 1 — Prumo: perfil político (este documento).
- Etapa 2 — Encarte das legendas: base de dados dos partidos brasileiros atuais (história, movimentos, votações-chave desde 1988 e antes), posicionadas no mesmo espaço de 5 eixos; ranking de alinhamento com o vetor do usuário; painel de mudança de posicionamento entre eleições.
- Etapa 3 — Candidatos: presidente e governador (análise profunda de planos de governo); senadores, deputados federais e estaduais de SC (eixos principais de campanha); **histórico de feitos relevantes** de todos os candidatos ao Executivo e dos legislativos mais relevantes; espaço para expansão a outros estados.

---

## 2. Princípios inegociáveis

1. **Anonimato total.** Nenhuma resposta é transmitida ou armazenada fora do dispositivo. Nada de analytics, cookies de rastreamento ou coleta de respostas para calibração (juridicamente exigiria consentimento e estrutura de pesquisa que não temos).
2. **Determinístico por padrão.** O núcleo funciona 100% sem IA. IA é camada opcional, desligável, e nunca altera a pontuação.
3. **Neutralidade verificável.** Cada pergunta passa pelo checklist da seção 7 antes de entrar no banco. O viés do criador é combatido estruturalmente (matriz multieixo, polaridade alternada, embaralhamento), não por boa intenção.
4. **Acessibilidade linguística.** Texto no nível do ensino fundamental: frases curtas, uma ideia por pergunta, sem jargão, com exemplo concreto quando ajudar.
5. **Sem tema proibido.** Aborto, armas, pena de morte, drogas, religião, ditadura — tudo entra, formulado com neutralidade.
6. **Mobile-first.** A maioria dos eleitores vai responder no celular.
7. **Esqueleto extensível.** O motor e os dados são separados; o mesmo motor serve às etapas 2 e 3 e a um eventual uso além das eleições (feedback pedagógico, versão educacional).

---

## 3. Os cinco eixos

Convenção de sinal: cada eixo vai de **−100% a +100%**. O sinal não carrega juízo de valor; é apenas convenção interna. Na interface, mostrar sempre os **dois polos nomeados**, nunca o número com sinal.

| Código | Eixo | Polo − (−100%) | Polo + (+100%) | O que mede |
|---|---|---|---|---|
| `eco` | Econômico | Estado (redistribuição, estatais, regulação, tributação progressiva) | Mercado (privatização, menos impostos, menos regulação) | Papel do Estado na economia e na distribuição de riqueza |
| `soc` | Social / costumes | Progressista (autonomia individual, minorias, laicidade, mudança) | Conservador (tradição, família, religião, ordem moral) | Valores sobre modos de vida, moral e identidade |
| `pod` | Poder / liberdades | Libertário (liberdades civis, limites ao Estado, garantias) | Autoritário (ordem, vigilância, punição, concentração de poder) | Quanto o Estado pode coagir; inclui confiança em instituições (STF, urnas, imprensa, Forças Armadas) |
| `sob` | Soberania | Internacionalista (abertura, integração, cooperação, imigração) | Nacionalista (protecionismo, soberania, controle de fronteiras) | Relação do país com o mundo |
| `amb` | Ambiente | Preservação (limites ecológicos, povos originários, clima) | Desenvolvimento (exploração, licenciamento ágil, crescimento) | Prioridade entre proteção ambiental e atividade econômica |

Notas:
- Questões "institucionais" (golpe, urnas, STF, imprensa) entram em `pod` com pesos altos, e às vezes em `soc`.
- Questões "federativas" (União vs. estados/municípios) entram em `eco` e/ou `pod` — relevantes para governador.
- Um eixo pode ter mais perguntas ou mais peso que outro. O que importa é que cada eixo fique **bem definido**; não há cota fixa.

---

## 4. Modelo de pontuação (matriz dinâmica)

### 4.1 Vetor da pergunta
Cada pergunta `q` carrega um vetor `w_q = [eco, soc, pod, sob, amb]`, cada componente inteiro em **−3..+3** (0 = eixo não afetado). Uma pergunta pode afetar 1, 2 ou 3 eixos, com pesos diferentes.

Semântica: **responder SIM soma `w_q`** ao acumulador; **responder NÃO subtrai `w_q`**.

Escala de peso (orientação, não regra rígida):
- ±3 — a resposta praticamente define a posição no eixo (pena de morte para `pod`; privatizar Petrobras para `eco`).
- ±2 — forte indicador.
- ±1 — indicador secundário, frequentemente o "eixo lateral" de uma pergunta multieixo.

O peso **não** acompanha a complexidade da pergunta. Pergunta simples pode ter peso 3; pergunta complexa pode ter peso 1.

### 4.2 PULAR
Cada pergunta define `status_quo ∈ {sim, nao}`: qual resposta representa a situação vigente / a posição das estruturas ideologicamente dominantes no Brasil hoje. Pular aplica:

```
acumulador += 0,3 × direcao(status_quo) × w_q
```
onde `direcao(sim) = +1` e `direcao(nao) = −1`.

Racional: quem pula "vai com a corrente" (pensa como os pais / como a maioria), mas com peso reduzido. Além disso, pular reduz a **confiança** do eixo (4.4). O fator 0,3 é parâmetro global editável (`config.fator_pulo`).

Se para uma pergunta não houver status quo claro, usar `status_quo: "neutro"` → pular não pontua, só reduz confiança. Usar com parcimônia.

### 4.3 Pontuação por eixo
Para cada eixo `k`:

```
S_k = Σ_q  contribuição_q[k]                     (SIM: +w, NÃO: −w, PULAR: 0,3·dir·w)
M_k = Σ_q  |w_q[k]|   sobre as perguntas apresentadas
posição_k = 100 × S_k / M_k                      → intervalo [−100, +100]
```

### 4.4 Confiança por eixo
```
R_k = Σ_q |w_q[k]| sobre perguntas efetivamente respondidas (SIM ou NÃO)
confiança_k = 100 × R_k / M_k                    → [0, 100]
```
Na interface: confiança < 40% → "posição pouco definida"; 40–70% → "razoável"; > 70% → "bem definida".

### 4.5 Vetor global e percentual global
```
v = [posição_eco, posição_soc, posição_pod, posição_sob, posição_amb] / 100     (cada componente em [−1, 1])
intensidade = |v| / √5 × 100                     → 0% = centro absoluto; 100% = extremo em todos os eixos
```
Texto: "Você é **levemente X** (12%). Sua posição é equilibrada em 3 de 5 eixos e mais marcada em Ambiente e Poder."

Faixas de intensidade: 0–15% equilibrado/centrista; 15–35% levemente; 35–60% moderadamente; 60–80% fortemente; >80% extremamente.

### 4.6 Rótulo (arquétipos)
Arquétipos são pontos no espaço de 5 dimensões (arquivo `arquetipos.json`). O rótulo é o arquétipo de **menor distância euclidiana** ao vetor `v`. Mostrar também o segundo mais próximo ("com traços de Y").

Coordenadas iniciais (provisórias; **a fonte da verdade é `dados/arquetipos.json`**, ajustado após simulação em 09/09/2026; **devem ser revalidadas na etapa 2**, quando os partidos forem posicionados — os arquétipos precisam cobrir o espaço onde os partidos realmente estão):

| Arquétipo | eco | soc | pod | sob | amb |
|---|---|---|---|---|---|
| Socialista | −0,8 | −0,6 | +0,2 | +0,3 | −0,3 |
| Trabalhista / desenvolvimentista | −0,6 | 0,0 | +0,1 | +0,6 | +0,3 |
| Social-democrata | −0,4 | −0,5 | −0,3 | −0,3 | −0,4 |
| Verde / ecossocialista | −0,4 | −0,7 | −0,4 | −0,3 | −0,9 |
| Liberal-progressista | +0,6 | −0,6 | −0,5 | −0,6 | −0,2 |
| Libertário | +0,9 | −0,3 | −0,9 | −0,3 | +0,3 |
| Liberal-conservador | +0,7 | +0,5 | 0,0 | −0,2 | +0,4 |
| Conservador tradicionalista | +0,2 | +0,8 | +0,3 | +0,4 | +0,3 |
| Nacionalista-autoritário | +0,3 | +0,8 | +0,8 | +0,9 | +0,6 |
| Centrista / pragmático | 0,0 | 0,0 | 0,0 | 0,0 | 0,0 |

Regra: se `intensidade < 15%`, o rótulo é "Centrista" independentemente do arquétipo mais próximo.

**Ganho de rótulo (decisão de 13/09/2026).** A simulação com respondentes
sintéticos realistas mostrou que o vetor recuperado sai comprimido em ~⅔ em
relação às coordenadas dos arquétipos, e na mesma proporção nos cinco eixos
(inclinações de 0,64 a 0,69). A causa é estrutural: em itens multieixo a
concordância do respondente é a média ponderada dos eixos afetados, o que dilui
cada eixo isoladamente. Em consequência, os arquétipos de coordenada alta
ficavam fora do alcance prático e quem pertencia a eles caía no vizinho
moderado.

Correção adotada: a posição é multiplicada por `config.ganho_rotulo` **antes**
de comparar com os arquétipos, e só para isso. A posição exibida ao usuário, a
confiança, a intensidade e o código de perfil não mudam. Valor em vigor: **1,5**
(o ótimo é chato entre 1,4 e 1,6). Efeito medido, com 500 respondentes por
arquétipo e 8% de ruído: acerto do rótulo em 1º lugar sobe de 71,5% para 86,3%,
e em 1º ou 2º de 94,4% para 97,6%.

Esse ganho é uma correção de escala provisória. Quando os partidos forem
posicionados na etapa 2 e as coordenadas dos arquétipos forem revalidadas
contra o espaço real, reavaliar se ele ainda é necessário.

### 4.7 Ordem das perguntas
- Cada pergunta tem `nivel ∈ {1, 2, 3}` (fácil, médio, difícil).
- Apresentação: bloco 1 inteiro, depois bloco 2, depois bloco 3 — **embaralhado dentro de cada bloco** a cada sessão. Isso escalona a dificuldade e impede que o respondente perceba qual eixo está sendo medido.
- Nunca exibir duas perguntas seguidas do mesmo `tema` (checagem simples no embaralhamento).

### 4.8 Anti-viés de concordância
- Para cada eixo, a soma dos pesos em que **SIM aponta para o polo +** deve ficar entre 40% e 60% do total de |pesos| do eixo. O script `validar.js` (seção 8) confere isso e falha se violado.
- Pergunta nunca contém "não" na formulação ("Você é contra…?" é proibido; sempre afirmativa direta).

---

## 5. Esquema de dados

### 5.1 `dados/perguntas.json`
```json
{
  "versao": "1.0",
  "config": { "fator_pulo": 0.3 },
  "perguntas": [
    {
      "id": "q001",
      "nivel": 1,
      "tema": "pena-de-morte",
      "texto": "A pena de morte deveria existir no Brasil para crimes muito graves, como estupro seguido de morte?",
      "contexto": "",
      "vetor": { "eco": 0, "soc": 2, "pod": 3, "sob": 0, "amb": 0 },
      "status_quo": "nao",
      "fonte_status_quo": "CF/88 art. 5º XLVII veda pena de morte salvo guerra declarada",
      "ativa": true
    }
  ]
}
```
- `contexto`: uma frase opcional, exibida em letra menor, situando o caso concreto ("Em 2024, o Congresso discutiu…"). Deve ser factual e neutro.
- `fonte_status_quo`: justificativa interna (não exibida) de por que aquela resposta é o status quo. Obrigatória.
- `ativa`: permite desligar perguntas sem apagar.
- **Rechecagem obrigatória antes de cada eleição**: itens de jurisprudência pendente (q020 banheiro trans, q039 Tema 1291, q100 Lei 14.197, q106 criptografia) e de lei recente (q047 Foz do Amazonas, q063 Mercosul-UE, q110 licenciamento). `validar.js` deve recusar o banco publicado se algum `status_quo` for `verificar` ou se alguma `fonte_status_quo` contiver "conferir".

### 5.2 `dados/eixos.json`
Nomes, descrições em linguagem simples, nomes dos polos, texto explicativo de cada faixa (o que significa estar em −70% em `soc`, etc.).

### 5.3 `dados/arquetipos.json`
Lista de arquétipos com coordenadas (4.6), descrição curta em linguagem simples e descrição longa (para a tela de resultado).

### 5.4 Perfil do usuário (saída da etapa 1, entrada das etapas 2 e 3)
```json
{
  "v": 1,
  "posicao":   { "eco": -34, "soc": -58, "pod": -12, "sob": 21, "amb": -70 },
  "confianca": { "eco": 85, "soc": 92, "pod": 61, "sob": 44, "amb": 78 },
  "intensidade": 43,
  "rotulo": "social-democrata",
  "rotulo2": "verde",
  "data": "2026-09-09"
}
```
**As respostas individuais nunca fazem parte do perfil.** Só posições e confianças.

### 5.5 Código de perfil
Codificação compacta do perfil para transportar entre etapas sem servidor: versão (1 byte) + 5 posições (int8) + 5 confianças (uint8) + checksum (1 byte) → 12 bytes → base64url (16 caracteres). Ex.: `AaX8...`. Vai como parâmetro de URL (`etapa2/?p=CODIGO`) e impresso no PDF. Não permite recuperar respostas (só há posições agregadas).

---

## 6. Fluxo da interface

1. **Abertura** — nome, uma frase de propósito, três garantias (anônimo, gratuito, sem lado), tempo estimado, botão "Começar". Link discreto "Como funciona" (explica os eixos e a pontuação em linguagem simples; transparência metodológica).
2. **Perguntas** — uma por tela. Texto grande, `contexto` opcional em menor, três botões grandes: **SIM · NÃO · PULAR**. Barra de progresso. Botão "voltar" (permite mudar a resposta anterior). Sem indicação de eixo. Sem contador de "pontos".
3. **Resultado** —
   - Gráfico radar/pentágono com os 5 eixos (posição e faixa de confiança).
   - Rótulo principal + secundário + intensidade global + texto-síntese.
   - Cinco cartões (um por eixo): polo, percentual, nível de confiança, explicação de uma frase do que a posição significa.
   - Botões: **Gerar PDF (minha colinha)** · **Ir para os partidos (etapa 2)** · **Refazer**.
   - Feedback pedagógico: componente existe, `config.feedback_pedagogico = false` por padrão (ver 9).
4. **Autodestruição** — ao fechar/atualizar a página, nada persiste. Nenhum `localStorage`. O único "estado" que sobrevive é o código de perfil que a pessoa levar consigo (PDF ou URL).

Diretrizes visuais: identidade **neutra** — sem vermelho/azul/verde-amarelo como cor dominante (todos carregam lado no Brasil). Sugestão: paleta de grafite + um tom de cobre/âmbar (remete a prumo/ferramenta de medir), tipografia sóbria e legível. Sem ícones partidários. Sem imagens de políticos.

Acessibilidade: contraste AA, fonte ≥ 18px em mobile, botões ≥ 48px, navegação por teclado, `aria-labels`.

---

## 7. Diretrizes de redação e checklist de neutralidade

### 7.1 Redação
- Uma ideia por pergunta. Se tem "e", provavelmente são duas perguntas.
- Frase afirmativa, resposta SIM/NÃO sem ambiguidade. Nunca "Você é contra…".
- Perguntar sempre a política em si, nunca sua manutenção: evitar "continuar", "voltar a", "manter" no enunciado. O status quo fica só no campo `status_quo`. (Regra extraída da revisão adversarial de 09/09/2026.)
- Nomes de países e programas só quando forem o objeto da política, nunca como gatilho ("Cuba", "Bolsa Família" sozinhos contaminam a resposta); quando inevitável, citar os dois lados ou descrever a política em vez do nome.
- Vocabulário do fundamental. Se precisar de termo técnico, dar exemplo ("empresas do governo, como a Petrobras e os Correios").
- Preferir **casos concretos** — reais, brasileiros, atuais ou históricos — a abstrações. Casos estrangeiros são bem-vindos quando iluminam uma ideologia (ex.: sistema de saúde, drogas em Portugal, armas nos EUA).
- Perguntas de nível 3 podem ser filosóficas ("Se a maioria votasse para tirar direitos de uma minoria, isso deveria valer?"), desde que desnudem uma ideologia.
- Não citar nomes de políticos vivos nem de partidos nas perguntas (contamina com simpatia/antipatia pessoal). Nomear políticas, leis e instituições, sim.

### 7.2 Checklist (toda pergunta responde SIM a todas)
1. Um eleitor de esquerda e um de direita leriam esta pergunta sem sentir que ela foi escrita "pelo outro lado"?
2. A formulação evita adjetivos carregados ("justo", "abusivo", "radical", "corrupto")?
3. Os pesos do vetor refletem o que a resposta **revela**, não o que o autor acha da resposta?
4. O `status_quo` está factualmente correto e justificado em `fonte_status_quo`?
5. A pergunta discrimina de fato (pessoas diferentes responderiam diferente)? Pergunta em que 95% respondem igual tem peso ~0 e deve sair.
6. Há ao menos uma pergunta no banco que, para o mesmo eixo, tenha polaridade oposta e peso comparável?

### 7.3 Inspirações
Estrutura inspirada em Political Compass, 8values, PolitiScales e baterias do Pew Research; itens **100% próprios**, escritos para o cotidiano brasileiro. Não copiar itens.

---

## 8. Arquitetura técnica

```
prumo/
├── index.html               # etapa 1 (SPA simples)
├── css/prumo.css
├── js/
│   ├── motor.js             # pontuação pura (sem DOM) — testável isoladamente
│   ├── perfil.js            # codificação/decodificação do código de perfil
│   ├── ui.js                # fluxo de telas
│   ├── grafico.js           # radar SVG (sem dependência externa)
│   ├── pdf.js               # geração do PDF no cliente (jsPDF via CDN)
│   └── ia.js                # camada opcional de IA (desligável)
├── dados/
│   ├── perguntas.json
│   ├── eixos.json
│   ├── arquetipos.json
│   ├── partidos.json        # etapa 2
│   └── candidatos-sc.json   # etapa 3 (estrutura por UF para expansão)
├── etapa2/index.html        # encarte + ranking de alinhamento (lê ?p=CODIGO)
├── etapa3/index.html        # candidatos
├── ferramentas/
│   ├── validar.js           # valida schema, polaridade 40–60%, temas duplicados, status_quo
│   └── simular.js           # gera respondentes sintéticos e confere que os arquétipos são alcançáveis
├── testes/motor.test.js
└── README.md                # metodologia pública ("Como funciona")
```

- Vanilla HTML/CSS/JS ou Vite + vanilla; **sem framework pesado**, sem build obrigatório para rodar. GitHub Pages serve direto.
- `motor.js` recebe `(perguntas, respostas)` e devolve o perfil (5.4). Zero efeito colateral. Testes obrigatórios com casos: tudo SIM, tudo NÃO, tudo PULAR, respondente sintético de cada arquétipo.
- Nenhum `localStorage`/`sessionStorage`/cookie. Estado só em memória.
- `ia.js`: opcional. Como o site é público, **não pode haver chave de API embutida** (seria roubada). Modo padrão: campo onde a pessoa cola a própria chave (Anthropic), guardada só em memória da sessão, usada para gerar explicação personalizada do resultado. Modelo sugerido: Sonnet (custo baixo). Toggle "Usar IA" desligado por padrão. A IA **nunca** altera pontuação, rótulo ou vetor; só redige texto explicativo a partir do perfil (5.4), sem receber as respostas individuais.
- PDF: gerado no navegador (jsPDF); contém gráfico, posições, confianças, rótulo, texto-síntese, código de perfil e data. Nunca contém respostas.

---

## 9. Feedback pedagógico (esqueleto, desligado)

Objetivo futuro: apontar contradições ("você apoia X e também Y, que costumam se opor") e explicar em linguagem simples o que cada posição implica. Risco reconhecido: desanimar quem tem pouca familiaridade ("será que devo refazer?"). Decisão v1: **desligado por padrão**, existe como flag `config.feedback_pedagogico`. Estrutura prevista: pares de perguntas marcados como `tensao: ["q012","q047"]` em `perguntas.json`; se respondidas em direções que geram tensão, o resultado mostra um cartão "Para pensar", nunca antes do resultado e nunca sugerindo refazer. Calibrar em versão futura.

---

## 10. Ganchos para as etapas 2 e 3 (registrados desde já)

Etapa 2 — Encarte das legendas
- Cada partido vira um ponto no mesmo espaço de 5 eixos (posição declarada em programa + posição revelada em votações-chave). Ranking = distância ao vetor do usuário; exibir, por eixo, onde o partido concorda e discorda ("faz sentido procurar candidatos desse partido porque pensam como você em `soc` e `amb`").
- Módulo isolado: navegável sem ter feito o teste (história, movimentos, filiações, grandes nomes, trocas de legenda, votações em normativos de grande impacto desde 1988 e antes).
- Painel "Como os partidos mudaram": posição por eleição (2010, 2014, 2018, 2022, 2026) — fiscalização eleitoral como exercício diário.
- Todos os partidos avaliáveis, inclusive os menos alinhados.

Etapa 3 — Candidatos
- Presidente e governador: análise profunda dos planos de governo, posicionados no espaço de 5 eixos, comparados ao "basal" do partido e ao vetor do usuário.
- Senadores, deputados federais e estaduais de SC: eixos principais de campanha.
- **Histórico de feitos relevantes**: para todo candidato ao Executivo e para os legislativos mais relevantes — atuação na legislatura anterior, projetos, votações, cargos. Objetivo: evitar o "candidato perfeito que só a família vota" e a reeleição de programa bonito sem atuação correspondente.
- Estrutura de dados por UF para expansão além de SC.

Requisito comum: a transição da etapa 1 para a 2 é instantânea (um clique, código de perfil na URL); a 2 para a 3, idem.

---

## 11. Roteiro de execução e alocação de motor

| # | Entrega | Motor recomendado | Esforço | Observações |
|---|---|---|---|---|
| 1a | Esta spec | Fable | alto | ✔ concluída |
| 1b | Banco de perguntas (70–90 itens com vetor, nível, tema, status quo, fonte) | **Fable** enquanto houver crédito; senão Opus com raciocínio estendido | **máximo** | Coração do projeto. Produzir em lotes por nível (1, 2, 3), cada lote já passando pelo checklist 7.2. Formato: JSON final, não prosa. |
| 1c | `eixos.json` e `arquetipos.json` (textos em linguagem simples + coordenadas) | Opus | alto | Coordenadas provisórias vêm da seção 4.6. |
| 1d | `motor.js` + `perfil.js` + testes + `validar.js` + `simular.js` | **Claude Code** (Opus) no repositório | médio | Lógica está toda em 4 e 5; é implementação direta. Rodar `simular.js` para checar que cada arquétipo é alcançável e que nenhum eixo fica "preso". |
| 1e | Interface (`index.html`, `ui.js`, `grafico.js`, CSS) | Claude Code (Opus) | médio | Mobile-first, paleta neutra, sem dependências além de jsPDF. |
| 1f | PDF + código de perfil + camada de IA opcional | Claude Code (Opus) | baixo | |
| 1g | Revisão de neutralidade do banco (leitura adversarial: "como um militante de cada lado leria") | Fable se houver crédito; senão Opus | alto | Pode ser feita em várias sessões curtas, 15–20 perguntas por vez. |
| 1h | Testes com pessoas reais (você, amigos de perfis diferentes) e ajuste de pesos | humano + Opus | médio | Ajustar pesos/fator_pulo/arquétipos com base em resultados que "não fizeram sentido". |
| 2 | Encarte das legendas | Opus + pesquisa web/Deep Research para coleta; **Fable** (quando houver crédito) para posicionar partidos nos eixos | alto | Coleta é volume (Opus/Sonnet); posicionamento é julgamento (Fable/Opus). |
| 3 | Candidatos | idem etapa 2 | alto | Depende do calendário eleitoral e de fontes (TSE, planos de governo, Câmara/Senado/ALESC). |

Regra geral: **julgamento e neutralidade → Fable; volume e implementação → Opus/Claude Code**. Se o crédito do Fable acabar no meio de 1b, o Opus continua no mesmo formato JSON, usando os itens já produzidos como padrão.

Estimativa em turnos (não em créditos, que não são visíveis ao modelo): 1b = 2–3 turnos pesados; 1c = 1; 1d–1f = 3–5 sessões curtas de Claude Code; 1g = 3–4 turnos médios.

---

## 12. Registro de decisões

| Data | Decisão | Quem |
|---|---|---|
| 09/09/2026 | Cinco eixos: eco, soc, pod, sob, amb | Talyz |
| 09/09/2026 | Respostas SIM/NÃO/PULAR; sem escala Likert | Talyz |
| 09/09/2026 | Pular = 0,3 × direção do status quo + redução de confiança | Talyz/Claude |
| 09/09/2026 | Matriz multieixo com pesos −3..+3, independentes da complexidade | Talyz |
| 09/09/2026 | Embaralhar dentro de blocos de dificuldade | Talyz |
| 09/09/2026 | Site estático no GitHub Pages, mobile-first | Talyz |
| 09/09/2026 | Nome: Prumo (guarda-chuva: Ajudando a Votar) | Talyz |
| 09/09/2026 | Zero persistência; PDF sem respostas; código de perfil de 16 caracteres | Talyz/Claude |
| 09/09/2026 | IA opcional, desligada por padrão, chave do próprio usuário | Claude (motivo: chave embutida seria roubada) |
| 09/09/2026 | Feedback pedagógico: esqueleto presente, desligado | Talyz |
| 09/09/2026 | Etapa 3 inclui histórico de feitos dos candidatos | Talyz |
| 09/09/2026 | Banco revisado (v1.1, 113 itens); regras 'sem continuar/voltar/manter' e 'sem nome-gatilho' em 7.1; `validar.js` deve checar ambas | Claude |
| 09/09/2026 | Simulação: todos os arquétipos alcançáveis ≥94%; social-democrata e conservador reposicionados; 6 itens adicionados para desacoplar amb de eco e pod de eco | Claude |
| 09/09/2026 | Status quo de todos os 113 itens conferido em fontes primárias; banco v1.2, zero pendências. Reformulados q010 (imposto sobre grandes fortunas), q063 (livre comércio genérico), q079 (maconha) para não envelhecerem | Claude |
| 13/09/2026 | Ganho de rótulo `config.ganho_rotulo = 1,5`, aplicado só na comparação com arquétipos (ver 4.6). Motivo: compressão uniforme de ⅔ medida na simulação | Claude, por delegação expressa do Talyz |
| 13/09/2026 | Item q114 (câmera corporal em policial, `pod` −3) acrescentado para tirar o eixo `pod` dos 60,2% de polaridade; banco passa a v1.3 com 114 itens | Claude, por delegação expressa do Talyz |
| 13/09/2026 | Respondente sintético passa a ser probabilístico (SIM com probabilidade (1+a)/2, a = concordância latente). O modo determinístico anterior descreve um fanático e dava arquétipos moderados como inalcançáveis | Claude |
| 13/09/2026 | Etapa 2: a regra de polaridade 40–60% NÃO se aplica ao catálogo de votações. Partido não tem viés de concordância; o que se confere é peso mínimo por eixo | Claude, por delegação |
| 13/09/2026 | Etapa 2: só entram votações cujo sinal é recuperável — pela descrição ou por descUltimaAberturaVotacao. Recusado o atalho de inferir a direção pelo partido que pediu o destaque, por ser circular | Claude, por delegação |
| 13/09/2026 | Eixo `soc` assumido com confiança reduzida no catálogo de votações (14,6%): a legislatura quase não votou costumes nominalmente. Interface obrigada a exibir o selo | Talyz |
| 13/09/2026 | Alinhamento (seção 6 da spec da etapa 2) passa de distância euclidiana para similaridade de direção (cosseno). Motivo: os vetores da pessoa e do partido vivem em escalas diferentes, e tanto a distância crua quanto a correção por ganho produziam viés — primeiro para o centro, depois para o extremo | Talyz |
| 13/09/2026 | Partido com confiança média abaixo de 60% sai do ranking e vai para lista à parte com selo. Motivo: quem falta a votação fica perto da origem e casava com arquétipos opostos | Talyz |
| 13/09/2026 | Ranking exibe aviso quando a pessoa está no centro (intensidade < 12) ou quando nem o topo passa de 70 de alinhamento — há perfis sem partido correspondente no Brasil | Claude, por delegação |
| 13/09/2026 | Arquétipos NÃO serão aproximados dos partidos, apesar da previsão de revalidação na seção 4.6. Motivo: os partidos são quase unidimensionais (89% da variação num componente; 74% mesmo usando só votações de eixo único) e os eleitores não. Aproximar destruiria a capacidade de dizer que um perfil não tem partido correspondente | Talyz |
| 13/09/2026 | A ficha do partido é obrigada a informar que, nos partidos brasileiros, os cinco eixos andam quase juntos — o radar sugere cinco informações independentes que não existem | Claude, por delegação |
| 13/09/2026 | **Item 2j executado: revisão adversarial cega dos vetores do catálogo.** Quatro revisores independentes receberam só o registro primário da Câmara (ementa, descrição da votação, objeto do destaque, placar) e as definições dos eixos, sem ver os vetores nem os resumos, e atribuíram tudo do zero. O partido autor de cada destaque foi apagado do texto. Prompts e respostas em `dados/revisao-2j/` | Talyz |
| 13/09/2026 | Catálogo da etapa 2 cai de 28 para 19 votações. Saíram 9: cinco destaques cujo dispositivo nunca foi lido (o vetor era o da lei inteira), duas que medem Legislativo × Judiciário e não o eixo Poder, uma com o assunto errado (PDL 98/2023 é saneamento básico, estava descrito como o decreto das armas) e uma sem sinal recuperável | Claude, por delegação expressa do Talyz |
| 13/09/2026 | Dois vetores com o sinal corrigido: 8 de janeiro (o art. 112 da LEP abranda a pena, logo `pod` −2, estava +2) e art. 15 do Estatuto do Desarmamento (é pena por disparo, não porte, logo `pod` +2, estava `soc` +2 / `pod` −1) | Claude, por delegação |
| 13/09/2026 | Efeito medido da revisão: a posição dos partidos se deslocou 54 pontos no pior eixo de cada um, em média, e até 86 pontos num caso. O catálogo anterior não media o que dizia medir | — |
| 13/09/2026 | Regra nova, decorrente da revisão: nenhuma votação entra no catálogo sem que o dispositivo efetivamente em votação esteja lido e descrito. Em destaque, o que se vota é o dispositivo, não a lei | Talyz |
| 13/09/2026 | Eixo `sob` passa a ser declarado com confiança reduzida (13,2%, três votações) ao lado de `soc` (15,1%). O `soc` continua declarado mesmo acima do piso porque subiu por encolhimento do catálogo, não por votação nova. Selo por eixo, com texto próprio | Claude, por delegação |
| 13/09/2026 | Números de dimensionalidade atualizados: um componente explica 87% (75% só com votações de eixo único), e o `pod` deixa de acompanhar os demais (0,40 com `eco` na conta cheia, −0,65 na restrita). A decisão de não aproximar os arquétipos dos partidos permanece | Claude, por delegação |
| 14/09/2026 | **Segunda fase do item 2j.** Os cinco destaques removidos por "dispositivo não lido" foram atrás do texto na Câmara. Quatro voltaram ao catálogo, que sobe de 19 para 23 votações, com vetor derivado do dispositivo destacado e não do assunto da lei | Talyz |
| 14/09/2026 | Ler o dispositivo mudou a resposta em três dos quatro casos recuperados: Mover passa de `eco +1 sob +2 amb −1` para `eco −2 amb −1`; Rearp inverte de `eco +2` para `eco −2` (a lei favorece o contribuinte, o artigo destacado fecha brecha de compensação); minerais críticos passa de `sob +2 amb +2` para `eco −1 sob +3`. Só a Estratégia Nacional de Saúde confirmou o vetor antigo | Claude, por delegação |
| 14/09/2026 | O inciso II do art. 193 do PL 1466/2025 continua fora, agora por motivo lido: transforma 1.955 cargos efetivos vagos em cargos em comissão, matéria de organização administrativa que não mede nenhum dos cinco eixos | Claude, por delegação |
| 14/09/2026 | Limite técnico registrado: parte dos PDFs da Câmara não tem camada de texto (são imagem). Em duas votações o dispositivo veio da redação final aprovada na mesma sessão, e não do substitutivo votado; o risco de renumeração fica declarado em `fonte_do_dispositivo` de cada votação | — |
| 14/09/2026 | **Regra nova: peso no catálogo não é poder de separação.** As duas votações recuperadas em `sob` aumentaram o peso do eixo e reduziram sua amplitude, porque acrescentaram peso sem acrescentar divergência partidária. Passa a haver uma segunda conferência, por amplitude, em `calcular_revelado.js`, e a ferramenta `discriminacao.js` para inspecionar votação por votação | Talyz |
| 14/09/2026 | Passam a existir DOIS selos distintos na ficha do partido, porque são dois defeitos diferentes: `eixos_com_confianca_reduzida` (poucas votações no catálogo — hoje só `soc`, com 12,1%) e `eixos_que_separam_pouco` (amplitude abaixo de 60 pontos — hoje só `sob`, com 37 contra 200 dos demais) | Claude, por delegação |
| 14/09/2026 | A lista de eixos declarados deixa de ser fixa e passa a sair do cálculo, em `atualizar-calibracao.js`, para que a declaração nunca descreva um catálogo que não existe mais | Claude, por delegação |
| 14/09/2026 | Declarada também a concentração do eixo Economia (31,8% do peso): não é escolha de projeto, é o perfil da pauta nominal desta legislatura, e o radar não deve sugerir que os cinco eixos têm o mesmo lastro | Claude, por delegação |

---

## Anexo A — Perguntas-exemplo (padrão a seguir no banco)

Estas 10 ilustram o formato e o espírito; **não** são o banco final e devem ser revisadas junto com ele.

```json
[
  {
    "id": "ex01", "nivel": 1, "tema": "pena-de-morte",
    "texto": "A pena de morte deveria existir no Brasil para crimes muito graves, como estupro seguido de morte?",
    "contexto": "",
    "vetor": { "eco": 0, "soc": 2, "pod": 3, "sob": 0, "amb": 0 },
    "status_quo": "nao",
    "fonte_status_quo": "CF/88, art. 5º, XLVII, a — vedada salvo em guerra declarada"
  },
  {
    "id": "ex02", "nivel": 1, "tema": "transferencia-de-renda",
    "texto": "O governo deve pagar todo mês um valor em dinheiro para famílias muito pobres, como faz o Bolsa Família?",
    "contexto": "",
    "vetor": { "eco": -2, "soc": 0, "pod": 0, "sob": 0, "amb": 0 },
    "status_quo": "sim",
    "fonte_status_quo": "Programa vigente (Lei 14.601/2023)"
  },
  {
    "id": "ex03", "nivel": 1, "tema": "aborto",
    "texto": "Uma mulher deve poder interromper a gravidez nos primeiros meses, se assim decidir?",
    "contexto": "",
    "vetor": { "eco": 0, "soc": -3, "pod": -1, "sob": 0, "amb": 0 },
    "status_quo": "nao",
    "fonte_status_quo": "CP arts. 124–128: permitido só em estupro, risco de vida e anencefalia (STF ADPF 54)"
  },
  {
    "id": "ex04", "nivel": 2, "tema": "religiao-e-estado",
    "texto": "Igrejas e templos devem continuar sem pagar impostos?",
    "contexto": "Hoje a Constituição proíbe cobrar impostos de templos de qualquer religião.",
    "vetor": { "eco": 1, "soc": 2, "pod": 0, "sob": 0, "amb": 0 },
    "status_quo": "sim",
    "fonte_status_quo": "CF/88, art. 150, VI, b"
  },
  {
    "id": "ex05", "nivel": 1, "tema": "privatizacao",
    "texto": "Empresas do governo, como a Petrobras e os Correios, deveriam ser vendidas para empresas privadas?",
    "contexto": "",
    "vetor": { "eco": 3, "soc": 0, "pod": 0, "sob": -1, "amb": 0 },
    "status_quo": "nao",
    "fonte_status_quo": "Ambas permanecem estatais (verificar Correios na data de publicação)"
  },
  {
    "id": "ex06", "nivel": 1, "tema": "armas",
    "texto": "Uma pessoa comum deve poder comprar uma arma e guardá-la em casa com facilidade?",
    "contexto": "",
    "vetor": { "eco": 0, "soc": 2, "pod": -1, "sob": 0, "amb": 0 },
    "status_quo": "nao",
    "fonte_status_quo": "Estatuto do Desarmamento (Lei 10.826/2003) e Decreto 11.615/2023 restringem"
  },
  {
    "id": "ex07", "nivel": 2, "tema": "terras-estrangeiros",
    "texto": "Uma empresa estrangeira deve poder comprar grandes áreas de terra no Brasil, como fazendas inteiras?",
    "contexto": "",
    "vetor": { "eco": 1, "soc": 0, "pod": 0, "sob": -3, "amb": 0 },
    "status_quo": "nao",
    "fonte_status_quo": "Lei 5.709/1971 e parecer AGU LA-01/2010 limitam"
  },
  {
    "id": "ex08", "nivel": 2, "tema": "policia-e-garantias",
    "texto": "A polícia deve poder entrar em uma casa sem ordem de um juiz quando suspeita que ali se vende droga?",
    "contexto": "",
    "vetor": { "eco": 0, "soc": 1, "pod": 3, "sob": 0, "amb": 0 },
    "status_quo": "nao",
    "fonte_status_quo": "CF/88, art. 5º, XI (salvo flagrante); STF RE 603.616 exige fundadas razões"
  },
  {
    "id": "ex09", "nivel": 2, "tema": "petroleo-amazonia",
    "texto": "O Brasil deve explorar petróleo no mar perto da foz do rio Amazonas, se isso gerar empregos e dinheiro para o governo?",
    "contexto": "",
    "vetor": { "eco": 1, "soc": 0, "pod": 0, "sob": 1, "amb": 3 },
    "status_quo": "verificar",
    "fonte_status_quo": "Situação do licenciamento (Ibama/Petrobras, bloco FZA-M-59) deve ser conferida na data do banco"
  },
  {
    "id": "ex10", "nivel": 3, "tema": "maioria-e-minorias",
    "texto": "Se a maioria dos brasileiros votasse para tirar um direito de um grupo pequeno de pessoas, o resultado da votação deveria valer?",
    "contexto": "",
    "vetor": { "eco": 0, "soc": 1, "pod": 3, "sob": 0, "amb": 0 },
    "status_quo": "nao",
    "fonte_status_quo": "Cláusulas pétreas, CF/88 art. 60, §4º"
  }
]
```

Observação sobre `status_quo: "verificar"`: valor temporário permitido só durante a redação; `validar.js` deve rejeitar o banco publicado se algum item ainda o contiver.
