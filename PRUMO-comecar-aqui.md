# PRUMO — Começar aqui

Documento de retomada. Escrito em 09/09/2026, ao fim da sessão de planejamento e produção da etapa 1.
Leia este arquivo primeiro; ele diz onde o projeto está e qual é o próximo movimento.

---

## 1. Estado atual

**Etapa 1 (Prumo — perfil político): concluída no que depende de julgamento.**

| Arquivo | Versão | O que é |
|---|---|---|
| `PRUMO-spec-v1.md` | v1 (com registro de decisões atualizado) | Contrato do projeto: eixos, modelo de pontuação, esquema de dados, arquitetura, checklist de neutralidade |
| `perguntas.json` | **v1.2-verificado** | 113 perguntas com vetor multieixo, nível, tema, status quo e fonte primária |
| `eixos.json` | v1.0 | Nomes, polos e textos explicativos dos 5 eixos em linguagem simples |
| `arquetipos.json` | v1.0-provisorio | 10 arquétipos com coordenadas validadas por simulação |
| `PRUMO-etapa2-spec-v1.md` | v1 | Planejamento da etapa 2 (encarte das legendas) |

**O que já foi feito:** decisão dos 5 eixos; modelo de pontuação com PULAR ponderado; banco completo em 3 níveis; revisão adversarial de neutralidade dos 113 itens em 6 lotes; verificação factual do status quo de todos os itens em fontes primárias; simulação com respondentes sintéticos (todos os arquétipos alcançáveis entre 90% e 100%).

**O que falta na etapa 1:** só implementação. Nenhuma linha de código foi escrita ainda.

---

## 2. Instruções do projeto (colar no campo de instruções)

```
Projeto Prumo (Ajudando a Votar). Leia PRUMO-spec-v1.md antes de produzir qualquer
coisa; ela é o contrato do projeto e só muda por decisão explícita minha, registrada
na seção 12.

Regras invioláveis para perguntas e conteúdo:
- Linguagem de ensino fundamental, uma ideia por pergunta, formulação afirmativa.
- Nunca usar "continuar", "voltar a" ou "manter" no enunciado: perguntar a política
  em si, não sua manutenção. O status quo fica só no campo status_quo.
- Nunca citar nome de político vivo ou de partido dentro de uma pergunta.
- Todo item precisa de status_quo com fonte primária em fonte_status_quo.
- Antes de fechar qualquer lote, conferir a polaridade por eixo: a fração de peso em
  que SIM aponta para o polo + deve ficar entre 40% e 60%.

Formato e método:
- Entregar JSON no formato do banco, não prosa descritiva.
- Quando faltar um dado factual, buscar na fonte primária em vez de estimar; se não
  der para confirmar, marcar "verificar" e me avisar.
- Não inventar posições de partidos ou candidatos: só o que estiver em programa
  citado ou em votação nominal.
- Privacidade é inegociável: nada de armazenar respostas, analytics ou rastreamento.
```

---

## 3. Estrutura do repositório (`github.com/twrech/prumo`)

```
prumo/
├── PRUMO-spec-v1.md
├── PRUMO-etapa2-spec-v1.md
├── PRUMO-comecar-aqui.md
├── README.md                 # metodologia pública, "Como funciona"
├── dados/
│   ├── perguntas.json
│   ├── eixos.json
│   └── arquetipos.json
├── js/            (vazio por enquanto)
├── css/           (vazio por enquanto)
├── ferramentas/   (vazio por enquanto)
└── testes/        (vazio por enquanto)
```

O repositório é a **fonte da verdade**. Os arquivos na base de conhecimento do projeto
são cópias de conveniência: quando o banco mudar, atualize os dois.

---

## 4. Mensagens de abertura prontas

Escolha uma frente e cole a mensagem correspondente numa conversa nova dentro do projeto.

### Frente A — Implementar o motor (recomendada; Claude Code, Opus)
```
Leia PRUMO-spec-v1.md inteiro. Implemente o item 1d do roteiro:
- js/motor.js: pontuação pura, sem DOM, conforme seções 4.1 a 4.6.
- js/perfil.js: codificação e decodificação do código de perfil (seção 5.5).
- ferramentas/validar.js: valida schema (5.1), polaridade 40-60% por eixo,
  ausência de status_quo "verificar" e de "conferir" nas fontes, e a proibição
  de "continuar/voltar a/manter" nos enunciados.
- ferramentas/simular.js: respondentes sintéticos por arquétipo.
- testes/motor.test.js: tudo SIM, tudo NÃO, tudo PULAR e um respondente por arquétipo.
Rode o simulador e me mostre a taxa de acerto por arquétipo e quais eixos ficam
mal definidos.
```

### Frente B — Interface (depois do motor; Claude Code, Opus)
```
Com motor.js e perfil.js prontos, implemente os itens 1e e 1f: index.html, js/ui.js,
js/grafico.js (radar SVG sem dependência externa), css/prumo.css, js/pdf.js e
js/ia.js. Mobile-first, paleta neutra (grafite + cobre), sem localStorage, sem
analytics. Siga a seção 6 da spec para o fluxo de telas.
```

### Frente C — Começar a etapa 2 (Opus com busca)
```
Leia PRUMO-etapa2-spec-v1.md. Execute o item 2b: lista final dos partidos com
registro ativo no TSE e das federações vigentes hoje, com número, data de registro
e bancada atual na Câmara e no Senado. Entregue em JSON no formato da seção 5.1,
só com os campos que essa etapa cobre. Antes de começar, me responda as quatro
perguntas abertas da seção 10.
```

### Frente D — Rechecagem factual (Opus com busca, antes de publicar)
```
Recheque o status quo destes itens de perguntas.json contra fontes primárias e me
diga o que mudou: q020 (banheiro trans, ADPFs 1169-1173), q039 (STF Tema 1291),
q047 (Foz do Amazonas), q063 (Mercosul-UE), q100 (Lei 14.197/2021),
q106 (ADI 5527/ADPF 403), q110 (Lei 15.190/2025 e ADIs 7913/7916/7919).
```

---

## 5. Alocação de motor (resumo)

- **Julgamento e neutralidade** (vetores de perguntas e de votações, posicionamento de
  partidos, revisão adversarial) → Fable quando houver crédito; senão Opus com esforço alto.
- **Volume e coleta** (dossiês de partidos, catálogo de votações, rechecagem factual) → Opus com busca.
- **Código** (motor, validador, interface, PDF) → Claude Code com Opus.

---

## 6. Pendências e decisões em aberto

- Quatro perguntas em aberto na seção 10 da spec da etapa 2 (profundidade das fichas,
  votações pré-1991, apoio a governos como sinal, partidos nanicos sem histórico).
  Cada uma tem uma recomendação minha; basta confirmar ou corrigir.
- `arquetipos.json` é provisório: revalidar as coordenadas quando os partidos forem
  posicionados na etapa 2.
- Eixos `sob` (13% do peso) e `amb` (13%) são os mais magros do banco. Se a simulação
  com pessoas reais mostrar que ficam mal definidos, acrescentar itens neles.
- `pod` está em 60% de polaridade, no limite superior. O próximo item acrescentado
  nesse eixo deve ter SIM apontando para "liberdade".
