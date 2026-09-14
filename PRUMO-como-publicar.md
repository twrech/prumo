# Como publicar o Prumo

Passo a passo do que **você** precisa fazer. Tudo o que dava para automatizar já
está feito; o que sobrou depende da sua conta do GitHub ou da sua decisão.

Tudo no PowerShell, dentro da pasta do projeto. Para entrar lá:

```powershell
cd $HOME\Documents\prumo
```

---

## O que já está pronto

Não precisa fazer nada disto — está conferido na sua pasta:

- Todos os arquivos da revisão do catálogo estão no lugar, inclusive a quarta
  trava de honestidade (`js\alinhamento.js`, `ferramentas\empate.js`).
- O `.gitignore` já existe e já ignora a pasta `Claude outputs`.
- O repositório já está ligado a **`https://github.com/twrech/prumo.git`**, no
  branch **`main`**. Não precisa criar repositório nem rodar `git remote add`.

Restam quatro passos.

---

## Passo 1 — conferir que tudo passa

Antes de publicar, rode as três verificações. Leva alguns segundos.

```powershell
node testes\motor.test.js
node ferramentas\validar.js
node ferramentas\validar-votacoes.js
```

**O que você deve ver:**

- `23 passaram, 0 falharam`
- `Banco aprovado.`
- `Catálogo aprovado.`

Se qualquer um falhar, **pare** e me mande a mensagem de erro. Não publique.

---

## Passo 2 — commitar

Primeiro veja o que vai entrar:

```powershell
git add -A
git status --short
```

Deve listar `README.md`, `.gitignore`, `PRUMO-como-publicar.md` e arquivos de
`dados\`, `ferramentas\`, `js\` e `etapa2\`.

**Não deve aparecer nada de dentro de `Claude outputs`.** Se aparecer, me avise
antes de continuar.

Estando certo:

```powershell
git commit -m "Etapa 2 revisada: catalogo de 23 votacoes e quatro travas de honestidade"
```

---

## Passo 3 — enviar (push)

```powershell
git push -u origin main
```

Na primeira vez o Windows deve abrir uma janela pedindo para entrar no GitHub.
Entre com a sua conta; ele guarda para as próximas.

**Se pedir usuário e senha no terminal:** senha do GitHub não funciona mais ali.
Você precisa de um token — <https://github.com/settings/tokens> → *Generate new
token (classic)* → marque o escopo **repo** → gere, copie, e cole no lugar da
senha.

**Se disser `rejected` ou `non-fast-forward`:** o repositório remoto tem algo que
o seu não tem. Resolva com:

```powershell
git pull --rebase origin main
git push -u origin main
```

---

## Passo 4 — ligar o GitHub Pages

1. Abra <https://github.com/twrech/prumo/settings/pages>.
2. Em **Source**, escolha **Deploy from a branch**.
3. Em **Branch**, escolha **main** e a pasta **`/ (root)`**.
4. **Save**.

Espere um ou dois minutos. A mesma página passa a mostrar o endereço:

```
https://twrech.github.io/prumo/
```

Se a opção de Pages não aparecer, o repositório está privado: **Settings →
General → Change repository visibility → Public**. Na conta grátis, Pages só
funciona em repositório público.

---

## Passo 5 — conferir no ar

Abra o endereço e faça o caminho completo:

1. A tela inicial abre e o botão de começar funciona.
2. Responda algumas perguntas e vá até o resultado.
3. O gráfico de cinco pontas aparece.
4. Clique em **"Ir para os partidos"**.
5. A lista carrega, com o aviso de empate no topo.
6. Abra um partido: a ficha mostra o gráfico, os cinco eixos e as 23 votações.

**Teste também no celular.** É onde a maioria das pessoas vai usar, e é a única
parte que não consegui verificar daqui.

Se alguma tela ficar em branco, aperte **F12** no computador, vá na aba
**Console** e me mande o que estiver em vermelho.

---

## Se der errado

| Sintoma | Provável causa | O que fazer |
|---|---|---|
| Página no ar mas sem estilo | caminho absoluto em algum lugar | me avise — testei os caminhos relativos sob `/prumo/`, mas no ar é a prova real |
| Lista de partidos vazia | os `.json` de `dados\` não subiram | `git status` para ver se ficaram de fora |
| 404 no endereço | Pages ainda publicando, ou pasta errada | espere 2 minutos; confira que a pasta escolhida foi `/ (root)` |
| `git push` pede senha toda vez | credencial não foi guardada | `git config --global credential.helper manager` |

---

## Depois de publicar

Três pendências pequenas. Nenhuma impede o uso.

1. **Números eleitorais dos partidos.** Estão como `null` em
   `dados\partidos-nomes.json`. São dado do TSE e devem vir da fonte, não de
   memória. Me peça quando quiser que eu busque.
2. **Licença de uso.** Está indefinida. Para uma ferramenta cívica, o usual é MIT
   para o código e CC BY para o conteúdo. É decisão sua.
3. **Tarefa semanal de rechecagem.** Roda segundas às 9h e confere sete itens do
   banco cujo status quo depende de jurisprudência pendente. É útil até a
   eleição; depois de outubro me peça para apagar.

---

## O que ficou registrado

Se alguém perguntar como a ferramenta foi feita, ou se você voltar a ela daqui a
dois anos:

- `README.md` — a metodologia inteira, incluindo o que deu errado e foi corrigido.
- `PRUMO-spec-v1.md`, seção 12 — cada decisão, com data e quem decidiu.
- `dados\votacoes.json`, campo `revisao_adversarial` — o que saiu do catálogo e por quê.
- `dados\revisao-2j\` — os prompts da revisão cega e as respostas dos revisores.
