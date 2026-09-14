# Passo a passo — baixar os planos de governo

Guia para rodar `ferramentas/extrair_planos.js`. Leva de 3 a 8 minutos.
Você não precisa entender o código: só copiar, colar e esperar.

---

## Antes de começar

Use o **Chrome** (ou Edge — funciona igual). Deixe o computador ligado e não
feche a aba enquanto ele estiver trabalhando.

---

## Passo 1 — Copiar o texto do extrator

1. Abra o Explorador de Arquivos e vá até
   `C:\Users\twrec\Documents\prumo\ferramentas`
2. Clique com o **botão direito** em `extrair_planos.js`
3. Escolha **Abrir com → Bloco de notas**
4. Aperte `Ctrl + A` (seleciona tudo) e depois `Ctrl + C` (copia)
5. Pode fechar o Bloco de notas

> O texto está na área de transferência. Não copie mais nada até o Passo 3.

---

## Passo 2 — Abrir o console do TSE

1. No Chrome, abra: <https://divulgacandcontas.tse.jus.br/divulga/>
2. Espere a página carregar
3. Aperte `F12`

Abre um painel lateral com várias abas (Elements, Console, Sources...).
Clique na aba **Console**.

> Se `F12` não fizer nada, use `Ctrl + Shift + J`.

---

## Passo 3 — Colar e ligar o extrator

Clique dentro do console, no espaço em branco ao lado do sinal `>`.

**Atenção — a pegadinha do Chrome:** na primeira vez, ele bloqueia colagem no
console e mostra um aviso pedindo que você digite uma frase. Se isso acontecer:

1. Digite com o teclado: `allow pasting`
2. Aperte `Enter`
3. Agora cole normalmente

Cole com `Ctrl + V` e aperte `Enter`.

**O que você deve ver:** a palavra `undefined`, em cinza.
Isso é **normal e é sinal de sucesso** — quer dizer "carreguei, não tenho nada a
dizer". Texto **vermelho** é que seria problema.

---

## Passo 4 — Mandar rodar

Digite exatamente esta linha e aperte `Enter`:

```
await extrairPlanos('SC')
```

(Com as aspas simples. `SC` é o estado do governador.)

---

## Passo 5 — Liberar os downloads

Logo no começo, o Chrome mostra uma barrinha no alto perguntando algo como
**"Fazer download de vários arquivos neste site?"**.

Clique em **Permitir**.

> Se você clicar em "Bloquear" por engano, só vai baixar 1 arquivo em vez de 22.
> Nesse caso feche a aba e comece de novo do Passo 2.

---

## Passo 6 — Esperar

O console vai imprimindo uma linha por candidato, assim:

```
PRES (BR): 13 candidatos
  LULA (PT): 84p · 61240 chars
  FLAVIO BOLSONARO (PL): 76p · 88103 chars
  ...
GOV (SC): 8 candidatos
  GELSON MERÍSIO (PSB): 74p · 0 chars · IMAGEM
  JORGINHO MELLO (PL): 22p · 0 chars · IMAGEM
```

**`IMAGEM` não é erro.** Esses dois planos foram registrados como foto, sem
texto dentro. O arquivo é gravado assim mesmo, com um aviso no topo, para a
falta ficar registrada em vez de sumir.

No fim aparece:

```
21 candidatos · 19 planos legíveis · 2 sem texto aproveitável.
```

Pronto, acabou.

---

## Passo 7 — Mover os arquivos

Os arquivos caíram em `C:\Users\twrec\Downloads`. São 22:

- 21 arquivos que começam com `plano-`
- 1 arquivo `planos-sc.json`

1. Abra a pasta Downloads
2. Clique na barra de busca da pasta (canto superior direito) e digite `plano`
3. Aperte `Ctrl + A` para selecionar os que apareceram
4. Confira que são 22 e que não veio nada estranho junto
5. `Ctrl + X` (recortar)
6. Vá até `C:\Users\twrec\Documents\prumo\dados\planos`
7. `Ctrl + V` (colar)

---

## Se der errado

Copie a linha **vermelha** do console e me mande. Os tropeços mais comuns são
os três já avisados: `allow pasting`, o "Permitir" dos downloads, e fechar a aba
antes de terminar.
