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

## al186

Sessão de 02/05/2023. Resultado: 14 votos "sim", 14 votos "não".

Trecho literal da ata, terminando no instante anterior à votação:

> Discussão e votação da Mensagem de Veto n. 0054/2023, que dispõe sobre o veto total ao Projeto de Lei nº 039/2022, de autoria de [autor omitido], que "Altera a Lei nº 13.136, de 2004, que 'Dispõe sobre o Imposto sobre Transmissão Causa Mortis e doação de quaisquer Bens ou Direitos - ITCMD', com o fim de atualizar monetariamente as faixas de valor da base de cálculo do imposto e adota outras providências". Conta com parecer da comissão de Constituição e Justiça pela deliberação do veto em Plenário. Em discussão. Discutiram a presente matéria os srs. deputados: Matheus Cadorin, Mário Motta, Lunelli e Massocco. Em votação. Os srs. deputados que votarem “sim” mantêm o veto e os que votarem "não" derrubam-no.

---

## al180

Sessão de 13/06/2023. Resultado: 19 votos "sim", 9 votos "não".

Trecho literal da ata, terminando no instante anterior à votação:

> Discussão e votação da Mensagem de Veto n. 0093/2023, que dispõe sobre o veto total ao Projeto de Lei nº 095/2022, que "Obriga o Governo do Estado de Santa Catarina a divulgar a lista de todos os detentos beneficiados pelo indulto natalino e saída temporária especial como implemento de política pública de segurança e transparência à sociedade catarinense". Conta com parecer da comissão de Constituição e Justiça pela manutenção do veto em Plenário. Em discussão. Discutiram e encaminharam voto da presente matéria os srs. deputados: Jessé Lopes, Tiago Zilli e Massocco. Em votação. Os srs. deputados que votarem “sim” mantêm o veto e os que votarem "não" derrubam-no.

---

## al166

Sessão de 19/09/2023. Resultado: 20 votos "sim", 12 votos "não".

Trecho literal da ata, terminando no instante anterior à votação:

> Discussão e votação em turno único da Mensagem de Veto n. 0003/2023, que dispõe sobre o veto total ao Projeto de Lei nº 420/2019, que "Institui o Programa de Recuperação de Dependentes Químicos no Sistema Prisional do Estado de Santa Catarina". Conta com parecer da comissão de Constituição e Justiça pela rejeição do veto em Plenário. Em discussão. Discutiram e encaminharam a votação da presente matéria os srs. deputados: Massocco, Tiago Zilli, Doutor Vicente Caropreso, Sargento Lima, Maurício Eskudlark, Maurício Peixer e Fernando Krelling. Em votação. Os srs. deputados que votarem “sim” mantêm o veto e os que votarem "não" derrubam-no.

---

## al119

Sessão de 19/12/2023. Resultado: 26 votos "sim", 11 votos "não".

Trecho literal da ata, terminando no instante anterior à votação:

> Discussão e votação em primeiro turno do Projeto de Lei Complementar n. 0031/2023, de autoria do Governo do Estado, que institui a segregação de massa de segurados do Regime Próprio de Previdência Social do Estado de Santa Catarina (RPPS/SC), altera as Leis Complementares nº 412, de 2008, nº 661, de 2015, e nº 795, de 2022, e estabelece outras providências. Ao presente projeto foi apresentada emenda aditiva. Conta com parecer favorável das comissões de Constituição e Justiça; de Finanças e Tributação; e de Trabalho, Administração e Serviço Público. Em discussão. Discutiram a presente matéria a sra. Deputada Luciane Carminatti e o sr. Deputado Marquito. (Manifestação das galerias.)Neste momento, o sr. Presidente menciona que a matéria é polêmica, pede a compreensão de todos, e menciona que tem mais dois projetos tramitando na Casa e que serão amplamente debatidos no próximo ano. Continua em discussão. Discutiram a presente matéria os srs. Deputados: Neodi Saretta, Carlos Humberto, Massocco e Sargento Lima. Em votação. Os srs. deputados que votarem “sim” aprovam a matéria e o que votarem “não” rejeitam-na.
