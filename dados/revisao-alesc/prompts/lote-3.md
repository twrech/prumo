# Revisão adversarial cega — votações nominais da ALESC

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
| `eco` | Estado | Mercado |
| `soc` | Progressista | Conservador |
| `pod` | Liberdade | Ordem |
| `sob` | Abertura | Soberania |
| `amb` | Preservação | Desenvolvimento |

Peso inteiro de −3 a +3 por eixo, zero onde não houver conteúdo. **A convenção é
que o vetor aponta na direção do SIM**: se votar SIM significa mais mercado, `eco`
é positivo.

Regras que valem:

- O vetor é do que foi **efetivamente votado**, não do assunto geral da lei. Se o
  que foi a voto é um dispositivo específico, é o dispositivo que conta.
- Zero em todos os eixos é uma resposta legítima e significa "não mede nada".
- Não invente conteúdo que não está no trecho. Se o trecho não permite decidir,
  diga que não permite.

## Formato da resposta

Para cada item, exatamente assim:

```
### <id>
sentido_do_sim: <uma frase>
entra_no_catalogo: sim | nao
motivo: <uma frase>
vetor: { "eco": 0, "soc": 0, "pod": 0, "sob": 0, "amb": 0 }
confianca: alta | media | baixa
observacao: <só se houver algo que o trecho não resolve>
```

---

## al87

Sessão de 25/02/2026. Resultado: 12 votos "sim", 11 votos "não".

Trecho literal da ata, terminando no instante anterior à votação:

> Discussão e votação em turno único do Projeto de Lei n. 0011/2023, de autoria de [autor omitido], que proíbe a venda, a queima e a soltura de fogos de artificio com estampidos, assim como de quaisquer artefatos pirotécnicosfestivos de efeito sonoro ruidoso no Estado de Santa Catarina e dá outras providências. Ao presente projeto foi apresentada emenda substitutiva global. Conta com parecer favorável das Comissões. Em discussão. Discutiram e encaminharam voto da presente matéria os srs. deputados: Marcius Machado, Jessé Lopes, Mauro De Nadal, Sargento Lima, Alex Brasil, Ana Campagnolo, Marquito, Dr. Vicente Caropreso, Tiago Zilli, Pepê Collaço, Volnei Weber e Julio Garcia. Em votação. Os srs. deputados que votarem “sim” aprovam a matéria e os que votarem “não” rejeitam-na.

---

## al67

Sessão de 03/06/2025. Resultado: 8 votos "sim", 18 votos "não".

Trecho literal da ata, terminando no instante anterior à votação:

> Discussão e votação em turno único do parecer contrário da Comissão de Constituição e Justiça aoProjeto de Lei n. 0112/2025, de autoria de [autor omitido], que veda a conduta do nudismo a céu aberto, inclusive em praias marítimas e fluviais, no âmbito do Estado de Santa Catarina, e estabelece outras providências. O sr. Presidente comunica que: “A matéria recebeu parecer contrário na Comissão de Constituição e Justiça. E o deputado autor da matéria recorreu da deliberação da CCJ”. Em discussão. Discutiram a presente matéria os srs. deputados: Jessé Lopes, Alex Brasil, Ana Campagnola, Mauro De Nadal, Sargento Lima e Jair Miotto. Em votação. Os srs. deputados que votarem “sim” aprovam a matéria e os que votarem “não” rejeitam-na.

---

## al172

Sessão de 29/08/2023. Resultado: 19 votos "sim", 8 votos "não".

Trecho literal da ata, terminando no instante anterior à votação:

> Discussão e votação da Mensagem de Veto n. 1414/2022, que dispõe sobre o veto parcial ao Projeto de Lei nº 116/21, que "Institui a Política de Combate ao Abigeato e aos Crimes em Áreas Rurais". Conta com parecer da comissão de Constituição e Justiça pela deliberação do veto em Plenário. Em discussão. Discutiram e encaminharam votação da presente matéria os srs. Deputados: Massocco, Altair Silva e Maurício Eskudlark.Em votação. Os srs. deputados que votarem “sim” mantêm o veto e os que votarem "não" derrubam-no.
