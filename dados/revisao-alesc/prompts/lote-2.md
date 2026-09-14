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

## al90

Sessão de 16/04/2024. Resultado: 12 votos "sim", 10 votos "não".

Trecho literal da ata, terminando no instante anterior à votação:

> Discussão e votação da Mensagem de Veto n. 0180/2023, que dispõe sobre o veto total ao Projeto de Lei nº 212/2020, de autoria de [autor omitido], que "Proíbe a cobrança de débitos pendentes em nome de terceiros, nas unidades consumidoras, quando da troca de titularidade dos contratos de prestação de serviços de água e energia elétrica, no âmbito do Estado de Santa Catarina".Conta com parecer da comissão de Constituição e Justiça pela manutenção do veto. Em discussão. Discutiram a presente matéria os srs. Deputados: Carlos Humberto e Ivan Naatz. Em votação. Os srs. deputados que votarem “sim” mantêm o veto e os que votarem "não" derrubam-no.

---

## al71

Sessão de 13/11/2024. Resultado: 8 votos "sim", 13 votos "não".

Trecho literal da ata, terminando no instante anterior à votação:

> Discussão e votação em turno único do Projeto de Lei n. 0465/2024, de autoria de [autor omitido], que institui o Dia Estadual do Caçador e altera o Anexo Único da Lei nº 18.531, de 2022, que "Consolida as leis que instituem datas e eventos alusivos no âmbito do Estado de Santa Catarina e estabelece o Calendário Oficial do Estado", para neste incluir a referida data alusiva. Conta com parecer favorável das comissões de Constituição e Justiça; e de Esportes e Lazer. Em discussão. Discutiram e encaminharam voto da presente matéria os srs. Deputados: Marcius Machado, Ivan Naatz, Sargento Lima, Altair Silva, Marquito, Lucas Neves, Tiago Zilli, Lunelli e Fernando Krelling. Em votação. Os srs. deputados que votarem “sim” aprovam a matéria e os que votarem “não” rejeitam-na.

---

## al29

Sessão de 09/12/2025. Resultado: 25 votos "sim", 8 votos "não".

Trecho literal da ata, terminando no instante anterior à votação:

> Discussão e votação em primeiro turno do Projeto de Lei Complementar n. 0029/2025, de autoria de [autor omitido], que altera e acresce dispositivos à Lei Complementar nº 255, de 2004, que dispõe sobre o Quadro de Pessoal, Cargos, Funções e Vencimentos dos Servidores do Tribunal de Contas do Estado de Santa Catarina e estabelece outras providências. Conta com parecer favorável das Comissões. Em discussão. (Pausa) Em votação. Os srs. deputados que votarem “sim” aprovam a matéria e os que votarem “não” rejeitam-na.

---

## al23

Sessão de 10/02/2026. Resultado: 10 votos "sim", 17 votos "não".

Trecho literal da ata, terminando no instante anterior à votação:

> Discussão e votação em turno único da Mensagem de Veto n. 0921/2025, que dispõe sobre o veto total, ao Projeto de Lei nº 153/2023, de autoria de [autor omitido], que "Dispõe sobre a Política de Gestão dos Resíduos Sólidos Orgânicos, incentiva a compostagem no Estado de Santa Catarina e estabelece outras providências". Conta com parecer da Comissão de Constituição e Justiça pela manutenção parcial e rejeição parcial do veto em Plenário. Em discussão. Discutiram a presente matéria e encaminharam voto os srs. deputados: Marquito, Maurício Peixer e Mauro De Nadal. Em votação. Os srs. deputados que votarem “sim” mantêm o veto e os que votarem "não" derrubam-no.
