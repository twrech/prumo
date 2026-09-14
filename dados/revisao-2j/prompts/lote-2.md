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

### 2349493-82 — PL 709/2023 (2024-05-21)
- Resultado registrado: Aprovada a Subemenda Substitutiva Global ao Projeto de Lei nº 709, de 2023, adotada pelo relator da Comissão de Constituição e Justiça e de Cidadania, ressalvados os destaques. Sim: 336; não: 120; abstenção: 1; total: 457.
- Objeto da votação: Votação em turno único.
- Ementa da proposição: Dispõe sobre impedimentos aplicados aos ocupantes e invasores de propriedades em todo território nacional. NOVA EMENTA: Altera a Lei nº 8.629, de 25 de fevereiro de 1993, para dispor sobre impedimentos aplicados aos ocupantes e invasores de propriedades em todo o território nacional.
- Palavras-chave da Câmara: Penalidade administrativa, Invasão de propriedade, Esbulho possessório, Movimento social, impedimento, auxílio, benefício, Programa social, Governo Federal, Posse em cargo público, Função pública.

### 2398530-73 — PL 5122/2023 (2025-07-16)
- Resultado registrado: Aprovado o Substitutivo Reformulado ao Projeto de Lei nº 5.122, de 2023, adotado pelo relator da Comissão de Agricultura, Pecuária, Abastecimento e Desenvolvimento Rural, ressalvado o destaque. Sim: 346; Não: 93; Abstenção: 1; Total: 440.
- Objeto da votação: Votação em turno único.
- Ementa da proposição: Dispõe sobre a liquidação, anistia, renegociação e rebate de dívidas originárias de crédito rural para agricultores, pecuaristas, piscicultores, pescadores e carcinicultores, em geral, e dá outras providências, bem como altera a Lei no 14.554, de 20 de abril de 2023, que altera as Leis nos 13.999, de 18 de maio de 2020, 14.166, de 10 de junho de 2021, 11.540, de 12 de novembro de 2007, e 14.042, de 19 de agosto de 2020, para tratar do refinanciamento de dívidas e altera a Lei no 7.827, de 27 de setembro de 1989, a fim de sanar omissão legislativa.
- Palavras-chave da Câmara: Alteração, Lei Federal, Lei dos Fundos Constitucionais (1989), diretrizes, Renegociação extraordinária, crédito rural, seca, estiagem, Fundo Constitucional, diretrizes, renegociação, quitação, anistia, dívida, crédito rural, agricultor, pecuarista, piscicultor, pescador, carcinicultor, decorrência, Fenômeno meteorológico adverso, Calamidade pública
- Textos em jogo: PRLP 4: Autoriza a liquidação, anistia, renegociação e rebate de dívidas originárias de crédito rural para agricultores, pecuaristas, piscicultores, pescadores e carcinicultores. || PRLE 1: Autoriza a liquidação, anistia, renegociação e rebate de dívidas originárias de crédito rural para agricultores, pecuaristas, piscicultores, pescadores e carcinicultores.
- Objeto votado: PPR 1: Parecer Reformulado de Plenário, Dep. Afonso Hamm (PP-RS) pela: • Comissão de Agricultura, Pecuária, Abastecimento e Desenvolvimento Rural, que conclui pela aprovação do Projeto de Lei nº 5.122, de 2023, e de seus apensos, Projetos de Lei nº 5.221, de 2023; nº 165, nº 510, nº 691, nº 2.204 e nº 4.67

### 345311-270 — PL 490/2007 (2023-05-30)
- Resultado registrado: Aprovada a Subemenda Substitutiva Global ao Projeto de Lei nº 490, de 2007, adotada pelo relator da Comissão de Constituição e Justiça e de Cidadania, ressalvados os destaques. Sim: 283; não: 155; abstenção: 1; total: 439.
- Objeto da votação: Votação em turno único.
- Ementa da proposição: Altera a Lei n° 6.001, de 19 de dezembro de 1973, que dispõe sobre o Estatuto do Índio. NOVA EMENTA: Regulamenta o art. 231 da Constituição Federal, para dispor sobre o reconhecimento, a demarcação, o uso e a gestão de terras indígenas; e altera as Leis nºs 11.460, de 21 de março de 2007, 4.132, de 10 de setembro de 1962, e 6.001, de 19 de dezembro de 1973.
- Palavras-chave da Câmara: Alteração, Estatuto do Índio, competência, Congresso Nacional, lei federal, demarcação, terras indígenas, registro de imóveis, contrato imobiliário.
- Textos em jogo: PRLE 1: Altera a Lei n° 6.001, de 19 de dezembro de 1973, que dispõe sobre o Estatuto do Índio.

### 257161-483 — PL 2159/2021 (2025-07-17)
- Resultado registrado: Aprovada a Redação Final assinada pelo Relator, Dep. Zé Vitor (PL-MG). Sim: 231; Não: 87; Total: 318.
- Objeto da votação: Votação da Redação Final.
- Ementa da proposição: Dispõe sobre o licenciamento ambiental, regulamenta o inciso IV do § 1º do art. 225 da Constituição Federal, e dá outras providências. NOVA EMENTA: Dispõe sobre o licenciamento ambiental; regulamenta o inciso IV do § 1º do art. 225 da Constituição Federal; altera as Leis nºs 9.605, de 12 de fevereiro de 1998, e 9.985, de 18 de julho de 2000; revoga dispositivo da Lei nº 7.661, de 16 de maio de 1988; e dá outras providências.
- Palavras-chave da Câmara: Regulamentação, Constituição Federal, normas, União, Estado (ente federado), Distrito Federal (Brasil), Município, licenciamento ambiental, órgão público, Sistema Nacional do Meio Ambiente (SISNAMA), publicidade, INTERNET, exigência, Estudo de Impacto Ambiental, Relatório de impacto ambiental, implantação, plano, programa, ampliação, obra civil, ob
- Objeto votado: PSS 2: Parecer às Emendas do Senado Federal proferido pelo Relator, Dep. Zé Vitor (PL-MG) pela: • Comissão de Agricultura, Pecuária, Abastecimento e Desenvolvimento Rural, que conclui pela aprovação, nos termos do Parecer da Comissão de Meio Ambiente e Desenvolvimento Sustentável. • Comissão de Meio Ambien

### 2324721-94 — PL 1366/2022 (2024-05-08)
- Resultado registrado: Aprovado o Projeto de Lei nº 1.366, de 2022. Sim: 309; não: 131; abstenção: 2; total: 442.
- Objeto da votação: Votação em turno único.
- Ementa da proposição: Altera a descrição do Código 20 do Anexo VIII da Lei nº 6.938, de 31 de agosto de 1981, acrescido pela Lei nº 10.165, de 27 de dezembro de 2000, para excluir a silvicultura do rol de atividades potencialmente poluidoras e utilizadoras de recursos ambientais.
- Palavras-chave da Câmara: Alteração, Lei da Política Nacional do Meio Ambiente, exclusão, silvicultura, relação, atividade, poluente, usufrutuário, recursos ambientais.

### 2471177-56 — PL 4497/2024 (2025-06-10)
- Resultado registrado: Aprovado o Substitutivo ao Projeto de Lei nº 4.497, de 2024, adotado pela relatora da Comissão de Relações Exteriores e de Defesa Nacional, ressalvados os destaques. Sim: 328; Não: 100; Abstenção: 1; Total: 429.
- Objeto da votação: Votação em turno único.
- Ementa da proposição: Dispõe sobre a ratificação dos registros imobiliários decorrentes de alienações e concessões de terras públicas situadas nas faixas de fronteira e altera a Lei nº 13.178, de 22 de outubro de 2015.
- Palavras-chave da Câmara: Alteração, Lei Federal, diretrizes, ratificação, registro de imóvel, imóvel rural, alienação, concessão, terras públicas, faixa de fronteira, requisitos.
- Textos em jogo: PRLE 1: Dispõe sobre a ratificação dos registros imobiliários decorrentes de alienações e concessões de terras públicas situadas nas faixas de fronteira e altera a Lei nº 13.178, de 22 de outubro de 2015. || EMP 1: Emenda ao PL 4497/2024

### 2447259-99 — PL 2780/2024 (2026-05-06)
- Resultado registrado: Mantido o texto. Sim: 343; Não: 97; Abstenção: 1; Total: 441.
- Objeto da votação: Votação do DTQ 3: Destaque para Votação em Separado do § 2° do art. 3° do Substitutivo apresentado pelo relator, com fins de supressão (161, I).
- Ementa da proposição: Institui a Política Nacional de Minerais Críticos e Estratégicos (PNMCE), o Comitê de Minerais Críticos e Estratégicos (CMCE), vinculado ao Conselho Nacional de Política Mineral, e dá outras providências.
- Palavras-chave da Câmara: Comitê de Minerais Críticos e Estratégicos (CMCE), Conselho Nacional de Política Mineral (CNPM), fomento, pesquisa, Lavra mineral, processamento, mineral, garantia, segurança alimentar, segurança energética, diretrizes. _ Alteração, Lei do Bem (2005), Lei Federal, dedução tributária, Imposto de Renda das Pessoas Jurídicas (IRPJ), Contribuição Socia
- Textos em jogo: PRLE 2: Institui a Política Nacional de Minerais Críticos e Estratégicos (PNMCE), o Comitê de Minerais Críticos e Estratégicos (CMCE), vinculado ao Conselho Nacional de Política Mineral, e dá outras providências. || SSP 1: Subemenda Substitutiva Reformulada.
- Objeto votado: PPR 1: Parecer Reformulado às Emendas de Plenário pelo Relator, Dep. Arnaldo Jardim (CIDADANIA-SP) pela: • Comissão Especial, que conclui pela pela compatibilidade e adequação financeira e orçamentária, constitucionalidade, juridicidade e boa técnica legislativa de todas as Emendas de Plenário; e, quanto a

## Onde escrever

Escreva o JSON completo, com as 7 votações acima, no arquivo `/home/claude/prumo/dados/revisao-2j/cego-2.json` usando a ferramenta Write. Depois responda em uma linha só: quantas votações ficaram com sinal_recuperavel false e quantas com recomendacao excluir. Nada além disso.
