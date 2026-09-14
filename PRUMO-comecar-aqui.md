# PRUMO — Começar aqui

Documento de retomada. Escrito em 09/09/2026, atualizado em 13/09/2026 ao fim da implementação das Frentes A e B.
Leia este arquivo primeiro; ele diz onde o projeto está e qual é o próximo movimento.

---

## 1. Estado atual

**Etapa 1 (Prumo — perfil político): implementada e testada. Falta publicar.**

| Arquivo | Versão | O que é |
|---|---|---|
| `PRUMO-spec-v1.md` | v1 (decisões de 13/09 registradas) | Contrato do projeto |
| `dados/perguntas.json` | **v1.3** | 114 perguntas; `config.ganho_rotulo = 1.5` |
| `dados/eixos.json` | v1.0 | Textos dos 5 eixos e das faixas |
| `dados/arquetipos.json` | v1.0-provisorio | 10 arquétipos |
| `js/motor.js` | — | Pontuação pura, rótulo, ordem de apresentação |
| `js/perfil.js` | — | Código de perfil de 16 caracteres |
| `js/grafico.js` | — | Radar de 5 eixos em SVG, sem dependência |
| `js/ui.js` | — | Fluxo das três telas |
| `js/pdf.js` | — | A colinha, montada no navegador com jsPDF |
| `js/ia.js` | — | Camada opcional de IA, desligada por padrão |
| `index.html`, `css/prumo.css` | — | Interface |
| `ferramentas/validar.js` | — | Reprova o banco fora das regras |
| `ferramentas/simular.js` | — | Respondentes sintéticos por arquétipo |
| `testes/motor.test.js` | — | 23 testes |
| `PRUMO-etapa2-spec-v1.md` | v1 | Planejamento da etapa 2 |

Comandos: `npm test`, `npm run validar`, `npm run simular`.

**Medições em 13/09/2026** (500 respondentes por arquétipo, 8% de ruído, ganho 1,5):
acerto do rótulo em 1º lugar 86,3%, em 1º ou 2º 97,6%. Polaridade dentro da faixa
nos cinco eixos. Erro médio por eixo entre 0,155 e 0,211; inclinação entre 0,64 e 0,69.

**Verificado no navegador**: fluxo completo das 114 perguntas, voltar, sair no meio,
resultado, PDF de uma página com 99 KB, tema claro e escuro, largura de 390px e de
1100px. `localStorage`, `sessionStorage` e cookies ficam vazios do começo ao fim.

**O que falta na etapa 1:**

1. Publicar no GitHub Pages (nada foi commitado ainda; o repositório local está com tudo).
2. `README.md` com a metodologia pública.
3. Testar com pessoas reais (item 1h) e ajustar o que não fizer sentido.
4. Decidir os oito avisos de redação do validador: cinco enunciados com "não"
   (q050, q068, q086, q095, q105) e três com vários "e" (q039, q086, q103).

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

### Frentes A e B — concluídas em 13/09/2026
Motor, perfil, validador, simulador, testes, interface, radar, PDF e camada de IA
estão escritos e testados. Ver a seção 1 e o relatório `PRUMO-etapa1-motor-relatorio.md`.

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

- **Publicar.** É o próximo movimento. Commitar, ligar o GitHub Pages, conferir que
  os caminhos relativos funcionam sob `/prumo/`.
- Quatro perguntas em aberto na seção 10 da spec da etapa 2 (profundidade das fichas,
  votações pré-1991, apoio a governos como sinal, partidos nanicos sem histórico).
- `arquetipos.json` é provisório: revalidar as coordenadas quando os partidos forem
  posicionados na etapa 2 — e, junto com elas, reavaliar se o `ganho_rotulo` de 1,5
  ainda é necessário.
- Eixos `sob` (12,9% do peso) e `amb` (13,1%) continuam os mais magros do banco.
  `amb` é o de maior erro médio na simulação (0,211). Se o teste com pessoas reais
  mostrar que ficam mal definidos, acrescentar itens neles.
- `pod` está em 58,7% de polaridade, com 30,6% do peso do banco. Qualquer item novo
  nesse eixo com SIM apontando para "ordem" volta a estourar o teto de 60%.
- Os oito avisos de redação do validador seguem sem decisão.
