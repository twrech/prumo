# Planos de governo

Aqui ficam os planos de governo registrados no TSE, já em texto.

Só presidente e governador registram plano. Deputado federal, estadual e senador
não registram nenhum — é por isso que o Prumo não compara "o que diz × o que fez":
quem tem plano não tem voto nominal nosso, e quem tem voto nominal não tem plano.

## Como encher esta pasta

1. Abra <https://divulgacandcontas.tse.jus.br/divulga/>
2. F12 → Console
3. Cole `ferramentas/extrair_planos.js` inteiro e dê Enter
4. Rode `await extrairPlanos('SC')`
5. Mova para cá os `.txt` baixados e o `planos-sc.json`

O download vem de `/divulga/rest/arquivo/doc/{idArquivo}`. Esse caminho não está
em documentação nenhuma; está escrito só dentro de um pacote de JavaScript do
próprio site do TSE, e o caminho físico que a API devolve responde 403.

## A regra que vale para tudo que sair daqui

> **Toda posição tirada de um plano carrega a passagem literal que a originou.
> Sem passagem citada, sem posição.**

É a mesma trava que a revisão adversarial impôs à etapa 2, aplicada a texto em
vez de voto. E plano de governo mede o que a pessoa **diz** que vai fazer, nunca
o que ela fez: a ficha do candidato é obrigada a dizer isso ao eleitor.

## Arquivo sem texto não é arquivo ausente

Dos 21 planos de 2026 (13 de presidente, 8 de governador de SC), 19 têm camada
de texto e 2 são imagem pura: os de **Gelson Merísio** (PSB) e **Jorginho Mello**
(PL) — justamente os dois nomes mais visíveis da disputa estadual.

O extrator grava o `.txt` desses dois assim mesmo, com `SEM CAMADA DE TEXTO` no
topo. Um extrator que pulasse em silêncio o arquivo ilegível produziria uma lista
em que a ausência se lê como neutralidade, e o eleitor não tem como saber a
diferença entre "não disse" e "não deu para ler".
