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

### 2383287-43 — PL 4173/2023 (2023-10-25)
- Resultado registrado: Aprovada a Subemenda Substitutiva Global ao Projeto de Lei nº 4.173, de 2023, adotada pelo relator da Comissão de Finanças e Tributação, ressalvados os destaques. Sim: 323; não: 119; abstenção: 1; total: 443.
- Objeto da votação: Votação em turno único.
- Ementa da proposição: Dispõe sobre a tributação da renda auferida por pessoas físicas residentes no País em aplicações financeiras, entidades controladas e trusts no exterior. NOVA EMENTA: Dispõe sobre a tributação de aplicações em fundos de investimento no País e da renda auferida por pessoas físicas residentes no País em aplicações financeiras, entidades controladas e trusts no exterior; altera as Leis nºs 11.033, de 21 de dezembro de 2004, 8.668, de 25 de junho de 1993, e 10.406, de 10 de janeiro de 2002 (Código Civil); revoga dispositivos das Leis nºs 4.728, de 14 de julho de 1965, 9.250, de 26 de dezembro de 1995, 9.532, de 10 de dezembro de 1997, 10.426, de 24 de abril de 2002, e 10.892, de 13 de julho de 2004, do Decreto-Lei nº 2.287, de 23 de julho de 1986, e das Medidas Provisórias nºs 2.189-49, de 23 de agosto de 2001, e 2.158-35, de 24 de agosto de 2001; e dá outras providências.
- Palavras-chave da Câmara: Criação, tributo, Imposto sobre a Renda da Pessoa Física (IRPF), pessoa, residente, Brasil, ganho de capital, aplicação financeira, instituição financeira, país estrangeiro, truste.

### 2167882-83 — PL 9543/2018 (2024-02-28)
- Resultado registrado: Aprovada a Subemenda Substitutiva Global ao Projeto de Lei nº 9.543, de 2018, adotada pelo relator da Comissão de Minas e Energia. Sim: 325; não: 97; abstenção: 1; total: 423.
- Objeto da votação: Votação em turno único.
- Ementa da proposição: Cria a Tarifa Social de Água e Esgoto. NOVA EMENTA: Institui diretrizes para a Tarifa Social de Água e Esgoto em âmbito nacional.
- Palavras-chave da Câmara: Criação, Tarifa Social de Água e Esgoto, benefício, Família de baixa renda, Cadastro Único para Programas Sociais do Governo Federal (CadÚnico), desconto, tarifa, água, esgoto sanitário.
- Textos em jogo: PRLE 1: Cria a Tarifa Social de Água e Esgoto. || EMP 2: Cria a Tarifa Social de Água e Esgoto. || PRLP 2: Cria a Tarifa Social de Água e Esgoto.

### 2367064-82 — PL 2920/2023 (2023-07-07)
- Resultado registrado: Mantido o texto. Sim: 251; não: 206; total: 457.
- Objeto da votação: Votação do DTQ 13: Destaque para Votação em Separado do Inciso XVII do artigo 75 da Lei 14.133/21, alterada pelo artigo 25 da Subemenda Substitutiva apresentada, apresentado ao PL 2920/2023. (art. 161, I)
- Ementa da proposição: Institui o Programa de Aquisição de Alimentos e altera a Lei n.º 12.512, de 14 de outubro de 2011, e a Lei n.º 14.133, 1º de abril de 2021. NOVA EMENTA: Institui o Programa de Aquisição de Alimentos (PAA) e o Programa Cozinha Solidária; altera as Leis nºs 12.512, de 14 de outubro de 2011, e 14.133, de 1º de abril de 2021 (Lei de Licitações e Contratos Administrativos); e revoga dispositivos das Leis nºs 11.718, de 20 de junho de 2008, 11.775, de 17 de setembro de 2008, e 14.284, de 29 de dezembro de 2021.
- Palavras-chave da Câmara: Alteração, Lei Federal, criação, Programa de Aquisição de Alimentos (PAA), estímulo, agricultura familiar, pesca artesanal, incentivo fiscal, fomento, produção sustentável, inclusão econômica, dispensa de licitação, Estado (ente federado), Distrito Federal (Brasil), Município. _Criação, Programa Cozinha Solidária, alimentação, gratuidade, população

### 2497993-33 — PL 1708/2025 (2025-05-26)
- Resultado registrado: Aprovado o Projeto de Lei nº 1.708, de 2025. Sim: 289; Não: 136; Total: 425.
- Objeto da votação: Votação em turno único.
- Ementa da proposição: Autoriza o Banco do Nordeste do Brasil S.A. a constituir subsidiárias integrais ou controladas.
- Palavras-chave da Câmara: Autorização, Sociedade subsidiária, Sociedade subsidiária integral, Banco do Nordeste do Brasil (BNB), objeto social, atividade correlata, diretrizes, instituição financeira oficial.

### 2252295-130 — PL 2583/2020 (2025-07-08)
- Resultado registrado: Mantido o texto. Sim: 316; Não: 110; Total: 426.
- Objeto da votação: Votação do DTQ 6: Destaque para Votação em Separado do Art. 26 do substitutivo, apresentado ao PL 2583/2020 (161, I).
- Ementa da proposição: Institui a Estratégia Nacional de Saúde objetivando estabelecer uma estratégia nacional para incentivo às indústrias nacionais que produzam itens essenciais ao sistema de saúde nacional, bem como a pesquisa e desenvolvimento de produtos, insumos, medicamentos e materiais, com vistas a dar autonomia ao nosso país quanto a produção destes itens.
- Palavras-chave da Câmara: Criação, Estratégia Nacional de Saúde, diretrizes, Empresa Estratégica de Saúde (EES), regime especial de tributação, incentivo, indústria nacional, produto essencial, produção, Sistema Nacional de Saúde, pesquisa e desenvolvimento, produtos, insumo, medicamento, material médico-hospitalar,
- Textos em jogo: PRLE 1: Institui a Estratégia Nacional de Saúde objetivando estabelecer uma estratégia nacional para incentivo às indústrias nacionais que produzam itens essenciais ao sistema de saúde nacional, bem como a pesquisa e desenvolvimento de produtos, insumos, medicamentos e materiais, com vistas a dar autonomia 

### 2494408-43 — PL 1466/2025 (2025-05-21)
- Resultado registrado: Mantido o texto. Sim: 290; Não: 134; Total: 424.
- Objeto da votação: Votação do DTQ 2: Destaque para Votação em Separado do inciso II, do art. 193, apresentado ao PL 1.466/2025 (161, I).
- Ementa da proposição: Cria a Carreira de Desenvolvimento Socioeconômico, a Carreira de Desenvolvimento das Políticas de Justiça e Defesa e a Carreira de Fiscalização da Comissão de Valores Mobiliários, altera a remuneração de servidores e empregados públicos do Poder Executivo federal, altera a remuneração de cargos em comissão, de funções de confiança e de gratificações do Poder Executivo federal, reestrutura cargos efetivos, planos de cargos e carreiras, padroniza e unifica regras de incorporação de gratificações de desempenho, altera as regras do Sistema de Desenvolvimento na Carreira, transforma cargos efetivos vagos em outros cargos efetivos, em cargos em comissão e em funções de confiança, altera a regra de designação dos membros dos conselhos deliberativos e fiscais das entidades fechadas de previdência complementar e dá outras providências.
- Palavras-chave da Câmara: Criação, Carreira de Desenvolvimento Socioeconômico, Analista Técnico de Desenvolvimento Socioeconômico (ATDS), Carreira de Desenvolvimento das Políticas de Justiça e Defesa, Analista Técnico de Justiça e Defesa (ATJD), Carreira de Fiscalização da Comissão de Valores Mobiliários. _Alteração, Lei Federal, Carreira de Especialista do Banco Central do

### 2279186-104 — PL 458/2021 (2025-10-29)
- Resultado registrado: Mantido o texto. Sim: 293; Não: 143; Total: 436.
- Objeto da votação: Votação do DTQ 6: Destaque para Votação em Separado do artigo 37 do Substitutivo, apresentado ao PL 458/2021 (161, I).
- Ementa da proposição: Institui o Regime Especial de Atualização e Regularização Patrimonial (Rearp) para atualização, por pessoa física, do valor de bens móveis e imóveis adquiridos com recursos de origem lícita e localizados no território nacional, e regularização, por pessoa física ou jurídica, de bens ou direitos de origem lícita que não tenham sido declarados ou tenham sido declarados com omissão ou incorreção em relação a dados essenciais.
- Palavras-chave da Câmara: Criação, Regime Especial de Atualização Patrimonial (REAP), atualização, valor, bens móveis, bens imóveis, localização, território nacional, regularização, pessoa física, pessoa jurídica, bens, direitos, origem lícita, declaração, omissão, inexatidão, dados, pagamento, Imposto sobre a Renda e Proventos de Qualquer Natureza (IR), extinção, punibilid
- Textos em jogo: PRLE 1: Institui o Regime Especial de Atualização e Regularização Patrimonial (Rearp) para atualização, por pessoa física, do valor de bens móveis e imóveis adquiridos com recursos de origem lícita e localizados no território nacional, e regularização, por pessoa física ou jurídica, de bens ou direitos de o

## Onde escrever

Escreva o JSON completo, com as 7 votações acima, no arquivo `/home/claude/prumo/dados/revisao-2j/cego-1.json` usando a ferramenta Write. Depois responda em uma linha só: quantas votações ficaram com sinal_recuperavel false e quantas com recomendacao excluir. Nada além disso.
