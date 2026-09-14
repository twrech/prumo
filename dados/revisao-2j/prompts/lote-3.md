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

### 2603342-42 — MSC 112/2026 (2026-02-25)
- Resultado registrado: Aprovado o Projeto de Decreto Legislativo nº 50, de 2026, adotado pelo relator da Comissão de Relações Exteriores e de Defesa Nacional. Sim: 307; Não: 136; Abstenção: 1; Total: 444.
- Objeto da votação: Votação em turno único.
- Ementa da proposição: Acordo sobre a 15ª Reunião da Conferência das Partes da Convenção sobre a Conservação das Espécies Migratórias de Animais Silvestres, assinado em Nairóbi, Quênia, em 21 de dezembro de 2025
- Textos em jogo: PRLP 1: Acordo sobre a 15ª Reunião da Conferência das Partes da Convenção sobre a Conservação das Espécies Migratórias de Animais Silvestres, assinado em Nairóbi, Quênia, em 21 de dezembro de 2025.

### 2579832-62 — PL 5582/2025 (2025-11-18)
- Resultado registrado: Aprovado o Substitutivo ao Projeto de Lei nº 5.582, de 2025, adotado pelo relator da Comissão de Segurança Pública e Combate ao Crime Organizado, ressalvados os destaques. Sim: 370; Não: 110; Abstenção: 3; Total: 483.
- Objeto da votação: Votação em turno único.
- Ementa da proposição: Altera a Lei nº 12.850, de 2 de agosto de 2013, o Decreto-Lei nº 2.848, de 7 de dezembro de 1940 – Código Penal, o Decreto-Lei nº 3.689, de 3 de outubro de 1941 – Código de Processo Penal, a Lei nº 8.072, de 25 de julho de 1990, a Lei nº 7.960, de 21 de dezembro de 1989, e a Lei nº 7.210, de 11 de julho de 1984, para dispor sobre o combate às organizações criminosas no País.
- Palavras-chave da Câmara: Alteração, Lei de Combate ao Crime Organizado (2013), Código Penal (1940), Código de Processo Penal (1941), Lei dos Crimes Hediondos (1990), Lei da Prisão Temporária (1989), Lei de Execução Penal (1984), enfrentamento, Organização criminosa, Crime organizado, Crime organizado transnacional, aumento da pena, Medida assecuratória, apreensão, bens, mo

### 2355135-49 — PDL 98/2023 (2023-05-03)
- Resultado registrado: Aprovado o Substitutivo ao Projeto de Decreto Legislativo nº 98, de 2023, adotado pelo relator da Comissão de Desenvolvimento Urbano. Sim: 295; não: 136; abstenção: 1; total: 432.
- Objeto da votação: Votação em turno único.
- Ementa da proposição: Susta os efeitos dos dispositivos do decreto nº 11.467, de 5 de abril de 2023, que dispõe sobre a prestação regionalizada dos serviços públicos de saneamento básico, o apoio técnico e financeiro de que trata o art. 13 da Lei nº 14.026, de 15 de julho de 2020, a alocação de recursos públicos federais e os financiamentos com recursos da União ou geridos ou operados por órgãos ou entidades da União de que trata o art. 50 da Lei nº 11.445, de 5 de janeiro de 2007, e a alteração do Decreto nº 7.217, de 21 de junho de 2010, e do Decreto nº 10.430, de 20 de julho de 2020. NOVA EMENTA: Susta os §§ 1º, 2º e 3º do art. 1º e o art. 10 do Decreto nº 11.466, de 5 de abril de 2023, e os §§ 13 a 17 do art. 6º do Decreto nº 11.467, de 5 de abril de 2023, que regulamentam dispositivos do marco legal do saneamento básico.
- Palavras-chave da Câmara: Sustação, Decreto, alteração, Marco Legal do Saneamento Básico, regionalização, serviços, saneamento básico, ausência, licitação.
- Textos em jogo: PRLP 2: Susta os efeitos dos dispositivos do decreto nº 11.467, de 5 de abril de 2023, que dispõe sobre a prestação regionalizada dos serviços públicos de saneamento básico, o apoio técnico e financeiro de que trata o art. 13 da Lei nº 14.026, de 15 de julho de 2020, a alocação de recursos públicos federais || PRLP 1: Susta os efeitos dos dispositivos do decreto nº 11.467, de 5 de abril de 2023, que dispõe sobre a prestação regionalizada dos serviços públicos de saneamento básico, o apoio técnico e financeiro de que trata o art. 13 da Lei nº 14.026, de 15 de julho de 2020, a alocação de recursos públicos federais

### 264726-144 — PL 2876/2025 (2025-06-11)
- Resultado registrado: Aprovada a Subemenda Substitutiva Global ao Projeto de Lei nº 4.149, de 2004, adotada pelo relator da Comissão de Constituição e Justiça e de Cidadania, ressalvados os destaques. Sim: 273; Não: 153; Abstenção: 1; Total: 427.
- Objeto da votação: Votação em turno único.
- Ementa da proposição: Dá nova redação ao art. 15 da Lei nº 10.826, de 22 de dezembro de 2003, que "Dispõe sobre registro, posse e comercialização de armas de fogo e munição, sobre o Sistema Nacional de Armas-Sinarm, define crimes e dá outras providências."
- Palavras-chave da Câmara: Alteração, Estatuto do Desarmamento, Sistema Nacional de Armas (Sinarm), aumento, pena de reclusão, disparo, arma de fogo de uso restrito.
- Textos em jogo: PRLE 1: PARECER ÀS EMENDAS DE PLENÁRIO AO PROJETO DE LEI Nº 4.149, DE 2004 PROJETO DE LEI Nº 4.149, DE 2004 Apensados: PL nº 3.182/2015, PL nº 9.203/2017 e PL nº 5.352/2023 Dá nova redação ao art. 15 da Lei nº 10.826, de 22 de dezembro de 2003, que "Dispõe sobre registro, posse e comercialização de armas de

### 2482078-57 — PDL 3/2025 (2025-11-05)
- Resultado registrado: Aprovado o Projeto de Decreto Legislativo nº 3, de 2025. Sim: 317; Não: 111; Abstenção: 1; Total: 429.
- Objeto da votação: Votação em turno único.
- Ementa da proposição: Susta os efeitos da Resolução nº 258, de 23 de dezembro de 2024, do Conselho Nacional dos Direitos da Criança e do Adolescente (CONANDA).
- Palavras-chave da Câmara: Sustação, Resolução, competência, Conselho Nacional dos Direitos da Criança e do Adolescente (Conanda), atendimento, criança, adolescente, vítima, violência sexual.

### 2299903-53 — PL 3268/2021 (2023-11-29)
- Resultado registrado: Aprovado o Projeto de Lei nº 3.268, de 2021. Sim: 286; não: 121; abstenção: 2; total: 409.
- Objeto da votação: Votação em turno único.
- Ementa da proposição: Declara feriado nacional o Dia Nacional de Zumbi e da Consciência Negra.
- Palavras-chave da Câmara: Declaração, feriado nacional, Dia Nacional de Zumbi e da Consciência Negra, data comemorativa, novembro.

### 2233324-100 — PL 6366/2019 (2025-05-26)
- Resultado registrado: Mantido o texto. Sim: 231; Não: 202; Abstenção: 8; Total: 441.
- Objeto da votação: Votação do DTQ 2: Destaque para Votação em Separado da expressão "Dia Marielle Franco", constante do artigo 1º do substitutivo para fins de sua supressão, apresentado ao PL 6366/2019. (161, I).
- Ementa da proposição: Institui o Dia Nacional das Defensoras e Defensores de Direitos Humanos.
- Palavras-chave da Câmara: Criação, Dia Nacional das Defensoras e Defensores de Direitos Humanos, data comemorativa, março.

## Onde escrever

Escreva o JSON completo, com as 7 votações acima, no arquivo `/home/claude/prumo/dados/revisao-2j/cego-3.json` usando a ferramenta Write. Depois responda em uma linha só: quantas votações ficaram com sinal_recuperavel false e quantas com recomendacao excluir. Nada além disso.
