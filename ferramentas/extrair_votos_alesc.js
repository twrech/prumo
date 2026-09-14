/**
 * Prumo — extrator das votações nominais da ALESC (etapa 3, deputado estadual).
 *
 * ESTE ARQUIVO NÃO RODA NO NODE. Ele roda no console do navegador, no e-Legis
 * da ALESC, pela mesma razão dos outros extratores.
 *
 * COMO USAR
 *   1. Abra https://portalelegis.alesc.sc.gov.br/sessoes-plenarias
 *   2. F12 → Console
 *   3. Cole este arquivo inteiro e dê Enter
 *   4. Rode:  await extrairVotosAlesc()
 *   5. Baixa `alesc-nominais.json`. Mova para `dados/alesc/` do projeto.
 *
 *   Demora: são 613 sessões a varrer e ~110 PDFs a ler. Conte uns 10 minutos.
 *
 * O ACHADO QUE TORNOU ISTO POSSÍVEL
 *   A ALESC **não publica votação nominal em dado estruturado**. O portal da
 *   transparência tem um link chamado "Planilha de votação", mas ele leva à
 *   lista de sessões, e a Ordem do Dia mostra só o resultado e a modalidade
 *   ("Aprovado · Votação simbólica"), nunca quem votou o quê.
 *
 *   O voto nome a nome existe, e está dentro do PDF da **ata** da sessão:
 *
 *       (Procede-se à votação nominal por processo eletrônico.)
 *       DEPUTADO ALEX BRASIL não
 *       DEPUTADA ANA CAMPAGNOLO não
 *       DEPUTADO ANTÍDIO LUNELLI            ← sem voto = ausente
 *       ...
 *       Está encerrada a votação. Votaram 24 srs. deputados.
 *       Temos 13 votos "sim", 11 votos "não" e nenhuma abstenção.
 *
 *   Por isso o caminho é: varrer a Ordem do Dia de todas as sessões (HTML,
 *   barato) para achar quais tiveram votação nominal, e só então baixar e ler
 *   os PDFs dessas — 110 em vez de 613.
 *
 * QUANTO EXISTE (levantamento de 14/09/2026, legislatura 2023-2027)
 *   613 sessões plenárias · 188 votações nominais em 109 atas ·
 *   60 deputados distintos (titulares e suplentes ao longo da legislatura).
 *   A esmagadora maioria é unânime ou quase: só **22** têm minoria de 20% ou
 *   mais. É esse punhado que discrimina, e é com ele que o catálogo se monta —
 *   mesmo funil da etapa 2, onde 887 votações federais viraram 23.
 *
 * A ARMADILHA DO SINAL, QUE AQUI É PIOR QUE NA CÂMARA
 *   A maior parte das votações nominais da ALESC é de **veto do governador**. E
 *   em veto o enunciado é invertido: a ata diz, com todas as letras, "os srs.
 *   deputados que votarem 'sim' MANTÊM o veto". Quem tratar "sim" como apoio ao
 *   projeto vetado inverte o vetor inteiro — que é exatamente o erro que a
 *   revisão adversarial encontrou em 9 dos 28 vetores da etapa 2.
 *
 *   Por isso cada votação sai daqui com o campo `ementa`, que guarda o trecho
 *   literal da ata imediatamente anterior à votação, com a frase que define o
 *   sentido do "sim". Sem ler essa frase, não se atribui vetor. Nenhum.
 *
 * O QUE ESTE ARQUIVO NÃO FAZ
 *   Não atribui vetor, não escolhe quais votações entram no catálogo e não
 *   calcula posição de ninguém. Ele só transforma PDF em dado conferível.
 */

const LIMITE_LOTE = 8;   // PDFs por lote, para não estourar memória do navegador
const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';

async function carregarPdfJs() {
  if (window.pdfjsLib) return;
  await new Promise((ok, err) => {
    const s = document.createElement('script');
    s.src = PDFJS; s.onload = ok; s.onerror = err; document.head.append(s);
  });
  pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS.replace('pdf.min.js', 'pdf.worker.min.js');
}

async function textoDoPdf(url) {
  const buf = await fetch(url).then((r) => r.arrayBuffer());
  const doc = await pdfjsLib.getDocument({ data: buf }).promise;
  let t = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const c = await doc.getPage(i).then((p) => p.getTextContent());
    for (const it of c.items) { t += it.str; if (it.hasEOL) t += '\n'; }
  }
  return t;
}

/** Identificadores de matéria que aparecem no texto da ata. */
const ID_MATERIA = /(Mensagem de Veto|Projeto de Lei Complementar|Projeto de Lei|Proposta de Emenda à Constituição|Projeto de Resolução|Projeto de Decreto Legislativo)\s*n?\.?\s*º?\s*([\d.\/]+)/gi;

/**
 * Extrai as votações nominais do texto de uma ata.
 *
 * O deputado que aparece na chamada sem voto ao lado está ausente, e ausência
 * NÃO é meio-termo: entra como 'ausente' e sai da conta, igual ao tratamento
 * que a etapa 2 dá a quem não votou.
 */
function votacoesDaAta(t) {
  const saida = [];
  const marca = /\(Procede-se à vota[çc][ãa]o nominal[^)]*\)/gi;
  let m;

  while ((m = marca.exec(t))) {
    const antes = t.slice(Math.max(0, m.index - 3000), m.index).replace(/\s+/g, ' ');
    const ids = [...antes.matchAll(ID_MATERIA)].map((x) => `${x[1]} ${x[2]}`);
    // A frase que define o sentido do "sim" fica logo antes da chamada.
    const ementa = (antes.match(/(?:Discuss[ãa]o e vota[çc][ãa]o[^]{0,600})$/) || [])[0] || antes.slice(-500);

    const depois = t.slice(m.index + m[0].length, m.index + m[0].length + 4000).replace(/\s+/g, ' ');
    const fim = depois.search(/Está encerrada a vota[çc][ãa]o/i);
    const corpo = fim >= 0 ? depois.slice(0, fim) : depois.slice(0, 2500);
    const placar = fim >= 0 ? depois.slice(fim, fim + 230) : '';

    const votos = {};
    // O `\s*` antes do `$` não é detalhe: sem ele, o ÚLTIMO deputado de cada
    // chamada não casa — o texto termina em "… VOLNEI WEBER sim " com um espaço
    // sobrando antes de "Está encerrada", e a alternativa `$` falha. Como a
    // chamada é alfabética, o efeito não é ruído aleatório: apaga sempre a mesma
    // pessoa. Na primeira extração, Volnei Weber apareceu em 47 das 188
    // votações, contra 188 de colegas da mesma legislatura.
    //
    // O erro só apareceu porque a ata declara o próprio placar ("Temos 13 votos
    // sim, 11 votos não") e foi possível conferir o que o parser contou contra
    // o que a Casa contou. Sem essa conferência, o Prumo teria publicado o
    // histórico de um deputado com três quartos dos votos faltando.
    const rv = /DEPUTAD[AO]\s+([A-ZÁÂÃÀÉÊÍÓÔÕÚÜÇ'’.\- ]{3,40}?)\s*(sim|n[ãa]o|absten[çc][ãa]o)?(?=\s*DEPUTAD|\s*$)/g;
    let v;
    while ((v = rv.exec(corpo))) {
      const nome = v[1].replace(/\s+/g, ' ').trim();
      if (nome.length < 3) continue;
      votos[nome] = v[2] ? v[2].normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() : 'ausente';
    }

    // Menos de 20 nomes quase sempre é falso positivo de parser, não sessão vazia.
    if (Object.keys(votos).length >= 20) {
      const s = Object.values(votos);
      saida.push({
        materia: ids.slice(-2).join(' | '),
        ementa: ementa.slice(-380),
        votos,
        placar: placar.replace(/\s+/g, ' '),
        // Guardado para a conferência: o que o parser contou, para comparar com
        // o que a ata declara. Divergência aqui é defeito de leitura, não de voto.
        contagem: { sim: s.filter((x) => x === 'sim').length, nao: s.filter((x) => x === 'nao').length },
      });
    }
  }
  return saida;
}

async function extrairVotosAlesc() {
  await carregarPdfJs();

  console.log('1/3 · listando sessões...');
  const ids = new Set();
  for (let p = 1; p <= 80; p++) {
    const h = await fetch(`/sessoes-plenarias?page=${p}`).then((r) => r.text());
    const antes = ids.size;
    for (const m of h.matchAll(/\/sessoes-plenarias\/([A-Za-z0-9]{4,8})\/ordem-do-dia/g)) ids.add(m[1]);
    if (ids.size === antes) break; // acabaram as páginas
  }
  const sessoes = [...ids];
  console.log(`  ${sessoes.length} sessões`);

  console.log('2/3 · procurando quais tiveram votação nominal...');
  const comNominal = [];
  for (let i = 0; i < sessoes.length; i += 40) {
    await Promise.all(sessoes.slice(i, i + 40).map(async (id) => {
      try {
        const h = await fetch(`/sessoes-plenarias/${id}/ordem-do-dia`).then((r) => r.text());
        if (/Vota[çc][ãa]o nominal/i.test(h)) {
          comNominal.push({ id, data: (h.match(/(\d{2}\/\d{2}\/\d{4})/) || [])[1] });
        }
      } catch { /* sessão sem ordem do dia */ }
    }));
    console.log(`  ${Math.min(i + 40, sessoes.length)}/${sessoes.length}`);
  }
  console.log(`  ${comNominal.length} sessões com votação nominal`);

  console.log('3/3 · lendo as atas em PDF...');
  const votacoes = [];
  const erros = [];
  let semAta = 0;
  for (let i = 0; i < comNominal.length; i += LIMITE_LOTE) {
    for (const s of comNominal.slice(i, i + LIMITE_LOTE)) {
      try {
        const h = await fetch(`/sessoes-plenarias/${s.id}/ata`).then((r) => r.text());
        const u = h.match(/\/sessoes-plenarias\/atas\/download\/([0-9a-f-]{36})/);
        if (!u) { semAta++; continue; }
        const t = await textoDoPdf(`/sessoes-plenarias/atas/download/${u[1]}`);
        for (const v of votacoesDaAta(t)) votacoes.push({ sessao: s.id, data: s.data, ...v });
      } catch (e) { erros.push(`${s.id}: ${e.message}`); }
    }
    console.log(`  ${Math.min(i + LIMITE_LOTE, comNominal.length)}/${comNominal.length} · ${votacoes.length} votações`);
  }

  const saida = {
    gerado_em: new Date().toISOString().slice(0, 10),
    fonte: 'ALESC e-Legis, atas em PDF das sessões plenárias',
    aviso: 'Em votação de veto, "sim" MANTÉM o veto. O campo ementa guarda a frase literal que define o sentido do sim. Sem ler essa frase, não atribua vetor.',
    sessoes_varridas: sessoes.length,
    sessoes_com_nominal: comNominal.length,
    sessoes_sem_ata: semAta,
    votacoes,
  };

  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(saida, null, 1)], { type: 'text/plain;charset=utf-8' }));
  a.download = 'alesc-nominais.json';
  document.body.append(a); a.click(); a.remove();

  console.log(`\nPronto. ${votacoes.length} votações nominais · ${erros.length} erros.`);
  console.log('Mova alesc-nominais.json para dados/alesc/ do projeto.');
  return saida;
}

if (typeof window !== 'undefined') window.extrairVotosAlesc = extrairVotosAlesc;
