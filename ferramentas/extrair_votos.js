/**
 * Prumo — extração dos votos por partido (etapa 2).
 *
 * ESTE ARQUIVO NÃO RODA NO NODE. É o script que se cola no console do navegador,
 * com uma página do domínio dadosabertos.camara.leg.br aberta.
 *
 * Por quê: o ambiente de nuvem onde o resto do projeto é construído não alcança
 * dadosabertos.camara.leg.br — a política de egresso bloqueia o domínio. Rodando
 * de dentro de uma página da própria API, a requisição é de mesma origem, não há
 * CORS, e a agregação acontece no navegador: volta um JSON pequeno em vez de
 * meio milhão de registros de voto.
 *
 * COMO USAR
 *   1. Abra https://dadosabertos.camara.leg.br/api/v2/partidos?idLegislatura=57&itens=5
 *   2. Abra o console do navegador e cole este arquivo inteiro.
 *   3. Rode:  await extrairTodas(IDS_DO_CATALOGO)
 *      IDS_DO_CATALOGO é a lista de `id` de dados/votacoes.json.
 *   4. Rode:  copy(JSON.stringify(resultado))  e salve em dados/votos-partidos.json,
 *      dentro do envelope { versao, extraido_em, fonte, metodo, votacoes: … }.
 *
 * ARMADILHAS DA API, aprendidas na marra
 *   · /votacoes/{id}/votos NÃO aceita paginação: passar itens ou pagina dá 400.
 *     Ele devolve todos os votos de uma vez.
 *   · /votacoes aceita no máximo 3 meses entre dataInicio e dataFim, e itens=100.
 *   · /proposicoes/{id}/votacoes não aceita parâmetro nenhum.
 *   · As orientações vêm por bloco ("Bl PlFdrPtUniPp...", "Governo", "Oposição"),
 *     não por partido. Por isso a conta usa o voto nominal agregado, e não a
 *     orientação de liderança como previa a seção 3 da spec da etapa 2.
 */

const API = 'https://dadosabertos.camara.leg.br/api/v2';
const json = async (u) => (await fetch(u, { headers: { accept: 'application/json' } })).json();

/** Uma votação: votos nominais agregados por partido. */
async function extrair(id) {
  const [vr, dr] = await Promise.all([
    json(`${API}/votacoes/${id}/votos`),
    json(`${API}/votacoes/${id}`),
  ]);

  const bruto = {};
  const total = { sim: 0, nao: 0, abst: 0, obstr: 0, outro: 0 };

  for (const v of vr.dados || []) {
    const sigla = v.deputado_?.siglaPartido || '?';
    const t = (v.tipoVoto || '').toLowerCase();
    const k = t.startsWith('sim') ? 'sim'
      : (t.startsWith('não') || t.startsWith('nao')) ? 'nao'
        : t.startsWith('absten') ? 'abst'
          : t.startsWith('obstru') ? 'obstr' : 'outro';
    bruto[sigla] = bruto[sigla] || { sim: 0, nao: 0, abst: 0, obstr: 0, outro: 0 };
    bruto[sigla][k]++;
    total[k]++;
  }

  // Obstrução é voto organizado da bancada: conta junto com a direção
  // majoritária dela. Abstenção não conta para nenhum lado.
  const partidos = {};
  for (const [sigla, c] of Object.entries(bruto)) {
    let s = c.sim;
    let n = c.nao;
    if (c.obstr > 0) { if (s > n) s += c.obstr; else if (n > s) n += c.obstr; }
    if (s + n > 0) partidos[sigla] = { s, n };
  }

  return { id, data: dr.dados?.data, descricao: dr.dados?.descricao, total, partidos };
}

/** Todas as votações do catálogo. Guarda o progresso em `resultado`. */
window.resultado = window.resultado || {};
window.extrairTodas = async function extrairTodas(ids, limiteMs = 30000) {
  const t0 = Date.now();
  for (const id of ids) {
    if (window.resultado[id]) continue;
    if (Date.now() - t0 > limiteMs) break;      // o console tem tempo limite: rode de novo para continuar
    try {
      const r = await extrair(id);
      window.resultado[id] = { total: r.total, partidos: r.partidos };
    } catch (e) {
      window.resultado[id] = { erro: String(e) };
    }
  }
  const faltam = ids.filter((i) => !window.resultado[i]).length;
  return { prontos: Object.keys(window.resultado).length, faltam };
};
