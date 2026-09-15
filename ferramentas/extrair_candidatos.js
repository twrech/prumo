/**
 * Prumo — extrator de candidaturas do TSE (etapa 3).
 *
 * ESTE ARQUIVO NÃO RODA NO NODE. Ele roda no console do navegador, na página do
 * DivulgaCandContas, pela mesma razão de `extrair_votos.js`: a API do TSE não
 * responde a requisição de fora do domínio dela, e abrir o console é mais
 * honesto do que montar um proxy.
 *
 * COMO USAR
 *   1. Abra https://divulgacandcontas.tse.jus.br/divulga/
 *   2. F12 → Console
 *   3. Cole este arquivo inteiro e dê Enter
 *   4. Rode:  await extrairCandidatos('SC', ['DF', 'SEN', 'DE'])
 *   5. O navegador baixa `candidatos-sc-1.psv`. Mova para `dados/` do projeto.
 *   6. No projeto:  node ferramentas/montar_candidatos.js SC
 *
 * PARA OUTRO ESTADO
 *   await extrairCandidatos('RS')   — e o passo 6 com RS.
 *
 * O QUE ELE PEGA, E POR QUÊ
 *   Nome de urna, número, partido, coligação, ocupação declarada, situação do
 *   registro, patrimônio declarado, o site que a própria pessoa registrou e o
 *   histórico de candidaturas anteriores. Tudo é registro público e oficial.
 *
 *   Deliberadamente NÃO pega cor/raça, sexo e grau de instrução. São públicos,
 *   mas o Prumo não é um instrumento para escolher candidato por atributo
 *   pessoal, e exibi-los como critério de decisão é induzir exatamente isso.
 *
 * PECULIARIDADES DA API QUE CUSTARAM TEMPO
 *   · O id da eleição de 2026 é 20322002026. Os caminhos antigos
 *     (/rest/v1/eleicao/eleicoes-anteriores etc.) respondem 404; os que valem
 *     estão abaixo.
 *   · A listagem NÃO traz ocupação nem histórico: só o detalhe de cada
 *     candidato traz. Por isso é preciso um fetch por pessoa — 657 em SC, nos
 *     três cargos (231 federais, 13 ao Senado e 413 estaduais).
 *   · Deputado estadual é o cargo que mais importa aqui, e não por tamanho: os
 *     29 deputados medidos na ALESC concorrem quase todos à reeleição. Sem o
 *     cargo 7, a medição estadual inteira ficava sem onde aparecer.
 *   · `eleicoesAnteriores` inclui a candidatura de 2026 em si; é filtrada.
 *   · Cargos: 1 Presidente, 3 Governador, 5 Senador, 6 Deputado Federal,
 *     7 Deputado Estadual. Presidente usa a UE 'BR'.
 *
 * O CRUZAMENTO COM O VOTO NÃO É FEITO AQUI
 *   Casar estes candidatos com os deputados medidos é feito à mão, em
 *   `dados/candidaturas-<uf>.json`, porque há homônimos: em SC, "Cobalchini"
 *   casa com dois candidatos que são pessoas diferentes — um federal e um
 *   estadual. Cruzamento automático por nome erraria, e errar aqui é atribuir
 *   a uma pessoa o histórico de voto de outra.
 */

const ID_ELEICAO = '20322002026';
const CARGOS = { DF: 6, SEN: 5, DE: 7, GOV: 3, PRES: 1 };

async function apiTse(caminho) {
  const r = await fetch(`/divulga/rest/v1${caminho}`, { headers: { accept: 'application/json' } });
  if (!r.ok) throw new Error(`${r.status} em ${caminho}`);
  return r.json();
}

/** Executa em lotes para não abrir 244 conexões de uma vez. */
async function emLotes(itens, tamanho, fn) {
  const saida = [];
  for (let i = 0; i < itens.length; i += tamanho) {
    saida.push(...await Promise.all(itens.slice(i, i + tamanho).map(fn)));
    console.log(`  ${Math.min(i + tamanho, itens.length)}/${itens.length}`);
  }
  return saida;
}

const limpar = (s, n = 60) => String(s ?? '').replace(/[|;~\n\r]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);

/**
 * @param {string} uf        sigla do estado, ou 'BR' para presidente
 * @param {string[]} cargos  chaves de CARGOS; padrão: deputado federal e senador
 */
async function extrairCandidatos(uf = 'SC', cargos = ['DF', 'SEN']) {
  uf = uf.toUpperCase();
  const alvo = [];

  for (const c of cargos) {
    const cod = CARGOS[c];
    if (!cod) throw new Error(`cargo desconhecido: ${c}`);
    const ue = c === 'PRES' ? 'BR' : uf;
    const r = await apiTse(`/candidatura/listar/2026/${ue}/${ID_ELEICAO}/${cod}/candidatos`);
    const lista = r.candidatos || [];
    console.log(`${c}: ${lista.length} candidatos`);
    for (const x of lista) alvo.push({ marca: c, ue, id: x.id });
  }

  console.log(`\nbuscando o detalhe de ${alvo.length} candidatos...`);
  const fichas = await emLotes(alvo, 8, async ({ marca, ue, id }) => {
    try {
      const d = await apiTse(`/candidatura/buscar/2026/${ue}/${ID_ELEICAO}/candidato/${id}`);
      const anteriores = (d.eleicoesAnteriores || [])
        .filter((e) => String(e.nrAno) !== '2026')
        .sort((a, b) => Number(b.nrAno) - Number(a.nrAno))
        .slice(0, 4)
        .map((e) => [e.nrAno, limpar(e.cargo, 28), e.partido, limpar(e.situacaoTotalizacao, 22), limpar(e.local, 24)].join('~'))
        .join(';');

      const col = limpar(d.nomeColigacao, 40);
      return [
        id,
        marca,
        limpar(d.nomeUrna, 60),
        d.numero ?? '',
        d.partido?.sigla ?? '',
        limpar(d.ocupacao, 40),
        // 48, e não 28: "Indeferido em prazo recursal ou com recurso" tem 43
        // caracteres e era CORTADO em "Indeferido em prazo recursal", que é
        // outro estado. A rechecagem semanal acusava mudança onde não havia, e
        // pior, a ficha dizia à pessoa que ela estava indeferida sem recurso.
        d.descricaoSituacao === 'Deferido' ? '' : limpar(d.descricaoSituacao, 48),
        col === (d.partido?.sigla ?? '') ? '' : col,
        typeof d.totalDeBens === 'number' ? Math.round(d.totalDeBens) : '',
        limpar((d.sites || [])[0]?.url || '', 70),
        anteriores,
      ].join('|');
    } catch (e) {
      console.warn(`falhou ${id}: ${e.message}`);
      return null;
    }
  });

  const linhas = fichas.filter(Boolean);
  console.log(`\n${linhas.length} fichas extraídas (${fichas.length - linhas.length} falhas).`);

  // baixa em fatias, para nenhum arquivo ficar grande demais para editar à mão
  const POR_ARQUIVO = 100;
  for (let i = 0; i * POR_ARQUIVO < linhas.length; i++) {
    const fatia = linhas.slice(i * POR_ARQUIVO, (i + 1) * POR_ARQUIVO).join('\n');
    const blob = new Blob([`${fatia}\n`], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `candidatos-${uf.toLowerCase()}-${i + 1}.psv`;
    document.body.append(a);
    a.click();
    a.remove();
    await new Promise((r) => setTimeout(r, 400));
  }

  console.log(`\nPronto. Mova os .psv para dados/ e rode:\n  node ferramentas/montar_candidatos.js ${uf}`);
  return linhas.length;
}

// deixa disponível no console
if (typeof window !== 'undefined') window.extrairCandidatos = extrairCandidatos;
