Você é revisor independente de um instrumento de medição política brasileiro. Sua tarefa é atribuir, do zero e sem ver a atribuição de mais ninguém, um vetor de cinco eixos a cada votação nominal da Câmara dos Deputados listada abaixo.

## Os cinco eixos

- **eco** (Economia) — polo − "Estado": O governo deve garantir serviços, distribuir renda, ter empresas próprias e cobrar mais de quem tem mais. | polo + "Mercado": As pessoas e as empresas devem ter liberdade para produzir e negociar, com menos impostos, menos regras e menos governo.
- **soc** (Costumes) — polo − "Progressista": Cada pessoa decide sobre a própria vida; a lei deve proteger minorias e aceitar mudanças nos costumes. | polo + "Conservador": A família, a religião e a tradição são a base da sociedade; mudanças nos costumes devem ser lentas e cuidadosas.
- **pod** (Poder) — polo − "Liberdade": O governo deve ter limites claros; direitos e garantias valem para todos, inclusive para quem erra. | polo + "Ordem": O governo precisa de força para garantir segurança e ordem, mesmo que isso reduza algumas liberdades.
- **sob** (Mundo) — polo − "Abertura": Comércio, cooperação e imigração fazem o país crescer; o Brasil ganha mais se integrando ao mundo. | polo + "Soberania": O Brasil deve proteger sua indústria, suas terras, suas fronteiras e decidir sozinho o seu destino.
- **amb** (Natureza) — polo − "Preservação": Floresta, água, clima e povos tradicionais vêm primeiro; o crescimento tem que respeitar esses limites. | polo + "Desenvolvimento": Empregos, obras e produção vêm primeiro; a natureza deve ser usada com responsabilidade, mas usada.

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

```json
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
```

## As votações deste lote (7)

### 2149303-50 — PDC 745/2017 (2023-10-18)
- Resultado registrado: Aprovado o Projeto de Decreto Legislativo nº 745, de 2017. Sim: 323; não: 98; abstenção: 3; total: 424.
- Objeto da votação: Votação em turno único.
- Ementa da proposição: Aprova o texto do Protocolo de Adesão do Estado Plurinacional da Bolívia ao Mercosul, celebrado em Brasília, em 17 de julho de 2015.
- Palavras-chave da Câmara: Aprovação, ato internacional, Protocolo de Adesão do Estado Plurinacional da Bolívia ao Mercosul (2015).
- Textos em jogo: RDF 1: Aprova o texto do Protocolo de Adesão do Estado Plurinacional da Bolívia ao Mercosul, celebrado em Brasília, em 17 de julho de 2015.

### 2157806-137 — PL 8889/2017 (2025-11-04)
- Resultado registrado: Aprovada a Subemenda Substitutiva Global ao Projeto de Lei nº 8.889, de 2017, adotada pelo relator da Comissão Especial, ressalvados os destaques. Sim: 330; Não: 118; Abstenção: 3; Total: 451.
- Objeto da votação: Votação em turno único.
- Ementa da proposição: Dispõe sobre a provisão de conteúdo audiovisual por demanda (CAvD) e dá outras providências.
- Palavras-chave da Câmara: Normatização, Conteúdo audiovisual por demanda (CAvD), Provedor de aplicações, Provedora de conteúdo audiovisual por demanda (CAvD), internet, televisão por assinatura, oferta, seleção, conteúdo local, Serviço de comunicação audiovisual sob demanda. _Alteração, medida provisória, conceituação, Provedora de conteúdo audiovisual por demanda (CAvD), e

### 2422697-69 — PL 914/2024 (2024-05-28)
- Resultado registrado: Mantido o texto. Sim: 266; não: 139; abstenção: 1; total: 406.
- Objeto da votação: Votação do DTQ 17: Destaque para Votação em Separado do artigo 5º, apresentado ao PL 914/2024 (art. 161, I).
- Ementa da proposição: Institui o Programa Mobilidade Verde e Inovação - Programa Mover. NOVA EMENTA: Institui o Programa Mobilidade Verde e Inovação (Programa Mover); altera o Decreto-Lei nº 1.804, de 3 de setembro de 1980; e revoga dispositivos da Lei nº 13.755, de 10 de dezembro de 2018.
- Palavras-chave da Câmara: Criação, Programa Mobilidade Verde e Inovação (Programa MOVER), descarbonização, Desenvolvimento tecnológico, Sustentabilidade ambiental, indústria automotiva, competitividade internacional, veículo nacional. _ Requisito, caráter obrigatório, comercialização, veículo novo, rotulagem veicular, eficiência energética, Sistema de reciclagem, Tecnologia

### 2270800-175 — PEC 3/2021 (2025-09-17)
- Resultado registrado: Aprovada a Emenda Aglutinativa de Plenário nº 1. Sim: 314; Não: 168; Total: 482.
- Objeto da votação: Votação da Emenda Aglutinativa de Plenário nº 1.
- Ementa da proposição: Altera os arts. 14, 27, 53, 102 e 105 da Constituição Federal, para dispor sobre as prerrogativas parlamentares e dá outras providências.
- Palavras-chave da Câmara: Alteração, Constituição Federal (1988), Imunidade parlamentar, Imunidade material, Foro privilegiado, Supremo Tribunal Federal (STF), Prerrogativa de poder, Prerrogativa constitucional, Prisão em flagrante, crime inafiançável, definição, custódia, Câmara dos Deputados, Senado Federal, proibição, Afastamento cautelar, Deputado Federal, Senador, Pode
- Textos em jogo: EMA 1: Altera os arts. 53 e 102 da Constituição Federal para dispor sobre prerrogativas parlamentares. || RDF 1: Redação Final ao PEC 3/2021
- Objeto votado: PPR 1: Parecer Reformulado de Plenário, pelo Dep. Claudio Cajado (PP-BA), pela: • Comissão Especial, que conclui pela aprovação da Proposta de Emenda à Constituição nº 3, 2021, na forma do Substitutivo adotado.

### 2423268-40 — CMC 1/2024 (2024-04-10)
- Resultado registrado: Aprovado o parecer da Comissão de Constituição e Justiça e de Cidadania à Comunicação de Medida Cautelar nº 1/2024. Sim: 277; não: 129; abstenção: 28; total: 434.
- Objeto da votação: Votação do parecer da Comissão de Constituição e Justiça e de Cidadania à Comunicação de Medida Cautelar nº 1, de 2024, pela manutenção dos efeitos da decisão judicial.
- Ementa da proposição: Nos termos do artigo 53, §2° da Constituição Federal, COMUNICO a Vossa Excelência a prisão preventiva de JOÃO FRANCISCO INACIO BRAZÃO (Deputado Federal pelo Rio de Janeiro), por mim decretada em decisão de 23/3/2024, efetivada pela Polícia Federal em 24/3/2024 e, na data de hoje, referendada por unanimidade pela PRIMEIRA TURMA do SUPREMO TRIBUNAL FEDERAL em face de flagrante delito pela prática do crime de obstrução de Justiça em organização criminosa, tipificado no artigo 2°, § 3° e 4°, II, da Lei 12.850/2013, no curso das investigações do Inquérito 4.954, que apura a prática dos crimes nos artigos 121, § 2°, incisos I e IV; 121, § 2°, incisos I, IV e V e 121, § 2°, incisos I, IV e V, c/c 14, II, na forma do artigo 69, todos do Código Penal.

### 2358548-81 — PL 2162/2023 (2025-12-10)
- Resultado registrado: Mantido o texto. Sim: 218; Não: 136; Abstenção: 1; Total: 355.
- Objeto da votação: Votação do DTQ 6: Destaque para Votação em Separado do art. 112 da Lei nº 7.210, de 11 de julho de 1984, com redação conferida pelo art. 1º do Substitutivo, apresentado ao PL 2162/2023. (161, I)
- Ementa da proposição: Concede anistia aos participantes das manifestações reivindicatórias de motivação política ocorridas entre o dia 30 de outubro de 2022 e o dia de entrada em vigor desta Lei, e dá outras providências.
- Palavras-chave da Câmara: Concessão, anistia, participante, Patrocinador, Manifestação pública, motivação política, Extinção da punibilidade, crime, motivação eleitoral, diretrizes.
- Textos em jogo: PRLE 1: Concede anistia aos participantes das manifestações reivindicatórias de motivação política ocorridas entre o dia 30 de outubro de 2022 e o dia de entrada em vigor desta Lei, e dá outras providências.

### 2345368-78 — MPV 1150/2022 (2023-05-24)
- Resultado registrado: Rejeitada a Emenda nº 1 e restabelecidos os dispositivos aprovados pela câmara consubstanciados no Projeto de Lei de Conversão nº 6, de 2023. Sim: 66; não: 364; abtenção: 2; total: 432.
- Objeto da votação: Votação da Emenda nº 1; e das Emendas Supressivas do Senado Federal referentes aos arts. 4º e 78-b da Lei n. 12.651/2012, constantes do art. 1º; e aos arts. 14, 17, 25 e 31 da Lei nº 11.428/2006, constantes do art. 2º ambos do Projeto de Lei de Conversão nº 6, de 2023; na parte que suprime a alteração aprovada por esta casa ao §4º do art. 59 da Lei nº 12.651, de 25 de maio de 2012, proposta pelo art. 1º Projeto de Lei de Conversão nº 6, de 2023, restabelecendo o texto aprovado, com parecer pela rejeição, ressalvados os destaques.
- Ementa da proposição: Altera a Lei nº 12.651, de 25 de maio de 2012, que dispõe sobre a proteção da vegetação nativa. NOVA EMENTA: Altera a Lei nº 12.651, de 25 de maio de 2012, de forma a regulamentar prazos e condições para a adesão ao Programa de Regularização Ambiental (PRA), e a Lei n° 11.428, de 22 de dezembro de 2006.
- Palavras-chave da Câmara: Alteração, Código Florestal (2012), Programa de Regularização Ambiental (PRA), prazo, inscrição, Cadastro Ambiental Rural (CAR), imóvel rural.
- Textos em jogo: PRLP 4: Altera a Lei nº 12.651, de 25 de maio de 2012, que dispõe sobre a proteção da vegetação nativa. || PRLE 1: Altera a Lei nº 12.651, de 25 de maio de 2012, que dispõe sobre a proteção da vegetação nativa.

## Onde escrever

Escreva o JSON completo, com as 7 votações acima, no arquivo `/home/claude/prumo/dados/revisao-2j/cego-4.json` usando a ferramenta Write. Depois responda em uma linha só: quantas votações ficaram com sinal_recuperavel false e quantas com recomendacao excluir. Nada além disso.
