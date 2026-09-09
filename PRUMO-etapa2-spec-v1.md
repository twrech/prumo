# PRUMO — Etapa 2: Encarte das Legendas (spec v1)

Data: 09/09/2026 · Depende de: `PRUMO-spec-v1.md` (seções 3, 4, 5.4, 5.5, 10) · Status: planejamento

> Este documento complementa a spec principal. O espaço de 5 eixos, a convenção de sinal (−100..+100) e o código de perfil são os mesmos da etapa 1. Nada aqui altera o motor de pontuação do usuário.

---

## 1. Objetivo

Construir a base de dados dos partidos políticos brasileiros com registro ativo no TSE, cada um posicionado no mesmo espaço de 5 eixos do usuário, e sobre ela dois produtos:

1. **Encarte** — módulo isolado, navegável sem ter feito o teste: história, linhagem, movimentos ideológicos, grandes nomes, governos, votações-chave, mudanças de posição ao longo do tempo.
2. **Alinhamento** — dado um código de perfil (etapa 1), ranking de partidos por proximidade, com explicação eixo a eixo ("pensam como você em Costumes e Natureza; divergem em Economia") e acesso igual aos partidos menos alinhados.

Princípio: **posição revelada vale mais que posição declarada.** Programa partidário diz o que o partido quer parecer; votação nominal diz o que ele fez. O eleitor precisa dos dois, sabendo qual é qual.

---

## 2. Escopo

- **Partidos**: todos com registro ativo no TSE na data de publicação (conferir lista: em 2026 são cerca de 29, contando federações como PT–PCdoB–PV, PSDB–Cidadania e PSOL–Rede). Partidos extintos ou incorporados (PFL/DEM, PSL, PRB, PMDB, PPS, PHS…) entram como **linhagem** dos atuais, não como entradas próprias.
- **Período analisado para posição revelada**: legislaturas de 1991 a 2027 (Câmara), com prioridade para 2011 em diante (dados abertos completos). Antes de 1988: só história narrativa.
- **Casa de referência**: Câmara dos Deputados (bancadas maiores, votações mais numerosas, API pública). Senado como complemento para votações que só passaram lá.
- Fora de escopo nesta etapa: candidatos, diretórios estaduais, ALESC (etapa 3).

---

## 3. Modelo de posicionamento

Cada partido recebe **três vetores** no espaço `[eco, soc, pod, sob, amb]`, todos em −100..+100:

| Vetor | Origem | Como se calcula |
|---|---|---|
| `declarado` | Programa, estatuto, manifesto, autodefinição no site | Julgamento de modelo (Fable/Opus) a partir de trechos citados, com a mesma escala de peso das perguntas; **cada componente vem com justificativa e citação** |
| `revelado[legislatura]` | Votações nominais da Câmara em normativos-chave (seção 4) | **Calculado por script**, sem julgamento: para cada votação `v` com vetor `w_v`, `pos_v = (%SIM − %NÃO)` da bancada, ajustado pela orientação de liderança; `revelado_k = 100 × Σ pos_v·w_v[k] / Σ|w_v[k]|` |
| `atual` | Composição | `atual = 0,35·declarado + 0,65·revelado[legislatura mais recente]`; se o partido tem bancada < 5 deputados, `revelado` é pouco confiável e o peso vira 0,6/0,4 com aviso na interface |

Regras:
- Obstrução e abstenção orientadas contam como voto na direção da orientação do líder; ausência não conta.
- Partido sem bancada na legislatura: `revelado` = nulo, interface mostra só `declarado` com aviso "nunca votou no Congresso".
- Cada vetor traz `confianca` (0–100): para `revelado`, proporção do peso total das votações-chave em que o partido tinha bancada e votou; para `declarado`, quantidade e clareza das fontes.
- **Validação externa obrigatória**: comparar o eixo `eco`+`soc` resultante com as séries de pesquisas de especialistas (Brazilian Legislative Surveys, Power & Zucco; e Zucco & Power 2024) e com pesquisas de elite parlamentar. Divergência grande = revisar pesos das votações, não a pesquisa.

---

## 4. Catálogo de votações-chave (`dados/votacoes.json`)

Cada votação é tratada exatamente como uma pergunta do banco: recebe vetor `w_v` (−3..+3 por eixo), `peso_historico` (1–3, importância na vida dos brasileiros) e `resumo` em linguagem simples. SIM da bancada aponta para o sinal de `w_v`.

Lista inicial a validar (o Opus deve conferir número, data e resultado; o Fable/Opus atribui vetores com a mesma disciplina da seção 7 da spec principal):

| Ano | Matéria | Eixos prováveis |
|---|---|---|
| 1993 | Plebiscito: sistema e forma de governo (posição dos partidos) | pod |
| 1994–95 | Plano Real; emendas de abertura (fim do monopólio do petróleo, telecom, capital estrangeiro) | eco, sob |
| 1997 | Emenda da reeleição | pod |
| 1998 | Reforma da Previdência (EC 20) | eco |
| 2000 | Lei de Responsabilidade Fiscal | eco |
| 2001 | Estatuto da Cidade | eco, amb |
| 2003 | Reforma da Previdência (EC 41); Estatuto do Desarmamento | eco; soc, pod |
| 2004 | Lei do Bolsa Família; Lei de Biossegurança (2005) | eco; soc, amb |
| 2006 | Lei Maria da Penha; Lei de Drogas | soc; soc, pod |
| 2008 | Lei Seca | pod |
| 2010 | Lei da Ficha Limpa; Marco do Pré-sal (partilha) | pod; eco, sob |
| 2012 | Cotas (Lei 12.711); Código Florestal | soc, eco; amb |
| 2013 | Lei Anticorrupção; PEC 37 (rejeitada) | pod |
| 2014 | Marco Civil da Internet | pod |
| 2015 | Redução da maioridade penal (PEC 171, 1º turno); terceirização (PL 4330) | pod, soc; eco |
| 2016 | Impeachment; PEC do Teto (EC 95); Lei Antiterrorismo | pod, eco; eco; pod |
| 2017 | Reforma trabalhista; terceirização irrestrita; denúncias contra o presidente (2 votações) | eco; eco; pod |
| 2018 | Intervenção federal no RJ; cadastro positivo | pod; eco |
| 2019 | Reforma da Previdência (EC 103); pacote anticrime; Lei da Liberdade Econômica | eco; pod; eco |
| 2020 | Autonomia do Banco Central (aprov. 2021); Fundeb permanente | eco, pod; eco |
| 2021 | PEC do voto impresso (rejeitada); privatização da Eletrobras; marco do saneamento (2020) | pod; eco; eco |
| 2022 | PEC Kamikaze/Transição; Lei do piso da enfermagem | eco |
| 2023 | Arcabouço fiscal; Reforma tributária (EC 132); Marco temporal (Lei 14.701); Lei das apostas; derrubada de vetos ambientais | eco; eco; amb, soc; soc, eco; amb |
| 2024 | PEC das drogas (Senado); PL 1904 (aborto, urgência); regulação de plataformas; saidinha; PL da anistia partidária | soc, pod; soc; pod; pod; pod |
| 2025 | Lei do licenciamento ambiental (Lei 15.190); PEC da blindagem/anistia 8 de janeiro; isenção do IR até R$ 5 mil; PEC da segurança; escala 6x1 | amb; pod; eco; pod; eco |
| 2026 | Votações relevantes do ano eleitoral — completar na publicação | — |

Meta: 50–70 votações com vetor, distribuídas para que cada eixo tenha peso suficiente (mesma checagem de `validar.js`: nenhum eixo com menos de 15% do peso total; `sob` e `amb` são os que exigem busca ativa).

---

## 5. Esquema de dados

### 5.1 `dados/partidos.json` (um objeto por partido)
```json
{
  "id": "pt", "sigla": "PT", "nome": "Partido dos Trabalhadores", "numero": 13,
  "registro_tse": "1982-02-11", "federacao": "brasil-da-esperanca",
  "linhagem": [],
  "autodefinicao": "citação curta do estatuto/programa",
  "espectro_declarado": "esquerda",
  "familia": "trabalhista/socialista",
  "historia": [ { "ano": 1980, "titulo": "Fundação", "texto": "…", "fonte": "url" } ],
  "movimentos": ["sindicalismo", "teologia da libertação", "…"],
  "grandes_nomes": [ { "nome": "…", "papel": "…", "periodo": "…" } ],
  "governos": { "presidencia": ["2003-2010", "2011-2016", "2023-"], "governos_estaduais_atuais": ["…"] },
  "trocas_de_legenda_relevantes": [ { "nome": "…", "de": "…", "para": "…", "ano": 0 } ],
  "bancada": { "camara": 0, "senado": 0, "legislatura": "2023-2027" },
  "vetores": {
    "declarado": { "pos": { "eco": -60, "soc": -50, "pod": -10, "sob": 30, "amb": -30 }, "confianca": 80,
                   "justificativas": { "eco": { "texto": "…", "fonte": "…" } } },
    "revelado": { "2011-2015": { "pos": {}, "confianca": 0 }, "2015-2019": {}, "2019-2023": {}, "2023-2027": {} },
    "atual": { "pos": {}, "confianca": 0 }
  },
  "fontes": ["url", "url"]
}
```

### 5.2 `dados/votacoes.json`
```json
{ "id": "v2017-reforma-trabalhista", "data": "2017-04-26", "casa": "camara", "materia": "PL 6787/2016",
  "titulo": "Reforma trabalhista", "resumo": "Mudou mais de cem pontos da CLT: acordo entre patrão e empregado passou a valer mais que a lei em vários temas.",
  "impacto": "…", "vetor": { "eco": 3, "soc": 0, "pod": -1, "sob": 0, "amb": 0 }, "peso_historico": 3,
  "resultado": "aprovada 296-177",
  "votos_por_partido": { "pt": { "sim": 0, "nao": 55, "abst": 0, "obstrucao": 0, "orientacao": "nao" } },
  "fonte": "url da API da Câmara" }
```

### 5.3 `dados/federacoes.json` — nome, partidos, ano, vetor derivado (média ponderada por bancada).

### 5.4 Snapshot por eleição (para o painel "como mudaram")
Arquivo `dados/snapshots.json`: para cada partido e cada ano eleitoral (2010, 2014, 2018, 2022, 2026), o vetor `revelado` da legislatura anterior + apoio presidencial no 1º e 2º turno. Mudança > 20 pontos em um eixo entre duas eleições vira um "marco" exibido no painel, com o link para as votações que o explicam.

---

## 6. Algoritmo de alinhamento

Entrada: perfil do usuário `u` (posições e confianças) e `atual` de cada partido.

```
d(u, p) = sqrt( Σ_k  c_k · (u_k − p_k)² )        com c_k = confianca_usuario_k / 100
alinhamento = 100 − d / d_max × 100               (d_max = distância no cubo −100..100 com c_k=1)
```
- Eixos em que o usuário tem baixa confiança pesam menos — o ranking não deve ser decidido por um eixo que a pessoa mal respondeu.
- Exibir por partido: alinhamento global, e por eixo a diferença em três faixas: **concordam** (|Δ| ≤ 25), **parcial** (25–50), **divergem** (> 50), com uma frase automática: "Vocês concordam em Costumes e Natureza; em Economia, o partido está bem mais ao lado do Mercado do que você."
- Mostrar ao lado do ranking a confiança do vetor do partido; partido pequeno com vetor só declarado aparece com selo "posição declarada, sem histórico de votos".
- Ranking completo, sem corte: o usuário deve poder abrir o último colocado.

---

## 7. Interface do encarte (`etapa2/`)

1. **Entrada** — com `?p=CODIGO`: abre direto no ranking. Sem código: abre na galeria de partidos, com botão "Fazer o teste".
2. **Galeria** — todos os partidos, ordenados por bancada; filtro por família e por federação; busca por sigla, número ou nome antigo (linhagem).
3. **Ficha do partido** — abas: *Resumo* (vetor atual em radar, declarado vs. revelado lado a lado), *História* (linha do tempo), *Votações* (lista das votações-chave com o voto da bancada e o que significou), *Nomes e governos*, *Mudanças* (vetor por legislatura).
4. **Ranking** (com código de perfil) — radar do usuário sobreposto ao do partido selecionado; lista ordenada; explicação eixo a eixo.
5. **Painel "Como mudaram"** — gráfico de linhas por eixo, um partido por vez ou comparação de até 3, marcos anotados.
6. Mesmas regras de privacidade da etapa 1: nada persiste; o código de perfil vive só na URL.

---

## 8. Fontes e ferramentas

- **Câmara dos Deputados — Dados Abertos** (`dadosabertos.camara.leg.br`): votações, votos por deputado, orientação de bancada, filiação. É a espinha dorsal do `revelado`; extração por script, não por leitura de modelo.
- **Senado — Dados Abertos** para votações complementares.
- **TSE**: registro dos partidos, estatutos, programas, federações, resultados por eleição.
- Sites e programas oficiais dos partidos (para `declarado`, sempre com citação).
- **Brazilian Legislative Surveys** (Power & Zucco) e trabalhos de Zucco & Power sobre posicionamento partidário — validação externa.
- Wikipédia apenas como índice para achar fontes primárias; nunca como fonte final.
- Livros/artigos de referência para a história (Mainwaring; Kinzo; Nicolau; Limongi & Figueiredo) — o Opus cita, não copia.

---

## 9. Roteiro e alocação de motor

| # | Entrega | Motor | Esforço | Observações |
|---|---|---|---|---|
| 2a | Esta spec | Fable | alto | ✔ |
| 2b | Lista final de partidos e federações (TSE, data de publicação) | Opus + busca | baixo | 1 sessão |
| 2c | `votacoes.json` — 50–70 votações com data, matéria, resultado, resumo | Opus + Deep Research | alto | Volume; validar cada número na Câmara |
| 2d | Vetores das votações (`w_v`, `peso_historico`) | **Fable** quando houver crédito; senão Opus raciocínio estendido | máximo | Mesmo checklist das perguntas; polaridade por eixo |
| 2e | Script `ferramentas/extrair_votos.py` (API da Câmara → `votos_por_partido`) + `calcular_revelado.py` | Claude Code | médio | Determinístico; roda de novo a cada nova votação |
| 2f | Dossiês dos partidos (história, movimentos, nomes, governos, trocas) | Opus + Deep Research, um partido por sessão | alto | ~29 sessões; formato JSON direto |
| 2g | Vetor `declarado` de cada partido, com justificativas citadas | **Fable** ou Opus | máximo | Fazer em lotes de 5 partidos, comparando entre si para manter escala |
| 2h | Validação externa contra BLS/Zucco-Power e ajuste de pesos | Opus | alto | Se `revelado` discordar da literatura, revisar `w_v` |
| 2i | Interface do encarte + ranking + painel de mudanças | Claude Code | médio | Reaproveita `motor.js`, radar e código de perfil |
| 2j | Revisão adversarial dos textos (um militante de cada partido leria sua ficha como justa?) | Fable/Opus | alto | Lotes de 5 fichas |

Estimativa em turnos: 2c 4–6; 2d 3–4 (Fable); 2e 2–3 sessões de Claude Code; 2f ~29 sessões curtas de Opus (é o maior volume do projeto inteiro); 2g 6 lotes; 2h 2; 2i 3–5 sessões; 2j 6 lotes.

Ordem recomendada: 2b → 2c → 2d → 2e (para ter `revelado` cedo e checar se o método funciona antes de escrever 29 dossiês) → 2g → 2h → 2f → 2i → 2j.

---

## 10. Decisões tomadas e perguntas abertas

Decididas (mudam só por decisão explícita do Talyz):
- Revelado pesa 0,65 e declarado 0,35 no vetor atual.
- Câmara é a casa de referência; Senado complementa.
- Partidos extintos entram como linhagem, não como fichas.
- Snapshots em 2010, 2014, 2018, 2022, 2026.
- Ranking pondera pela confiança do usuário por eixo.

Abertas (responder antes de 2c):
1. Profundidade das fichas: alvo de ~600 palavras de história por partido grande e ~250 por partido pequeno? Ou uniforme?
2. Votações pré-1991 (Constituinte, Diretas Já) entram no catálogo com vetor, ou só na narrativa? (Recomendação: só narrativa; dados nominais incompletos.)
3. Incluir "apoio a governos" (base aliada × oposição em cada mandato presidencial) como sinal adicional de `pod`/`eco`? (Recomendação: exibir como informação, não pontuar — fisiologismo não é ideologia.)
4. Partido novo sem votações e com programa vago (frequente entre nanicos): exibir com vetor `declarado` de baixa confiança, ou omitir do ranking com aviso? (Recomendação: exibir ao final, com selo.)
