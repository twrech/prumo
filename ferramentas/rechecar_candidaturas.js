/**
 * Prumo — rechecagem das candidaturas publicadas (etapa 3).
 *
 * ESTE ARQUIVO NÃO RODA NO NODE. Roda no console do navegador, na página do
 * DivulgaCandContas, pela mesma razão de `extrair_candidatos.js`: a API do TSE
 * não responde a requisição de fora do domínio dela.
 *
 * COMO USAR
 *   1. Abra https://divulgacandcontas.tse.jus.br/divulga/
 *   2. F12 → Console
 *   3. Cole este arquivo inteiro e dê Enter
 *   4. Rode:  await rechecarCandidaturas('SC')
 *
 * PARA QUE SERVE
 *   O TSE atualiza o registro de candidatura DE HORA EM HORA. Entre o dia em que
 *   o catálogo foi montado e o dia em que alguém abre o site, uma candidatura
 *   pode ter sido indeferida, renunciada ou substituída — e a ficha continuaria
 *   dizendo que a pessoa concorre.
 *
 *   Isto não conserta nada sozinho. Ele COMPARA o que está publicado em
 *   `twrech.github.io/prumo` com o que o TSE diz agora, e responde uma pergunta
 *   só: mudou alguma coisa? Se mudou, é hora de rodar `extrair_candidatos.js` e
 *   `montar_candidatos.js` de novo. Se não mudou, não se mexe em nada.
 *
 * POR QUE SÓ A LISTAGEM, E NÃO O DETALHE
 *   A listagem de cada cargo já traz `descricaoSituacao`, que é tudo que a
 *   rechecagem precisa — três requisições em vez de 657. O detalhe pessoa a
 *   pessoa só é necessário quando se vai remontar o catálogo.
 *
 * O CAMPO QUE PARECE RESOLVER E NÃO RESOLVE
 *   `descricaoTotalizacao` parece dizer se o voto na pessoa conta, e a tentação
 *   é usá-lo para escrever "ainda concorrendo" na ficha. Não use. Conferido no
 *   TSE em 14/09/2026: os 39 registros não deferidos de SC estavam TODOS como
 *   "Concorrendo" — inclusive as nove renúncias. Antes do fim do prazo de
 *   registro esse campo não distingue nada, e escrever "ainda concorrendo" a
 *   partir dele seria dizer ao eleitor que alguém que desistiu segue na disputa.
 *
 *   Por isso a ficha exibe apenas o que o TSE diz do registro, com a palavra do
 *   TSE, e não conclui nada por cima.
 *
 * POR QUE A SITUAÇÃO NÃO PODE SER CORTADA
 *   "Indeferido em prazo recursal ou com recurso" tem 43 caracteres. O extrator
 *   cortava em 28 e gravava "Indeferido em prazo recursal", que é outro estado —
 *   sem o recurso. Esta rechecagem acusava mudança onde não havia, e a ficha
 *   dizia à pessoa que ela estava indeferida sem recurso. O corte hoje é 48.
 *
 * O QUE ELE DELIBERADAMENTE NÃO LÊ
 *   A listagem devolve CPF, título de eleitor, data de nascimento, cor/raça,
 *   sexo e grau de instrução. Nada disso é lido, guardado ou exibido aqui, pela
 *   mesma razão do extrator: o Prumo não é instrumento para escolher candidato
 *   por atributo pessoal.
 */

const ID_ELEICAO = '20322002026';
const CARGOS = { 5: 'Senador', 6: 'Deputado Federal', 7: 'Deputado Estadual' };
const PUBLICADO = 'https://twrech.github.io/prumo/dados/candidatos-';

async function rechecarCandidaturas(uf = 'SC', ondeEstaPublicado = PUBLICADO) {
  uf = uf.toUpperCase();

  // --------------------------------------------------- o que está no ar hoje
  const r = await fetch(`${ondeEstaPublicado}${uf.toLowerCase()}.json`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`não consegui ler o catálogo publicado (${r.status})`);
  const publicado = await r.json();
  const noAr = new Map(publicado.candidatos.map((c) => [String(c.id), c]));
  console.log(`publicado: ${publicado.total} candidatos, montado em ${publicado.montado_em}`);

  // ------------------------------------------------------ o que o TSE diz agora
  const agora = new Map();
  for (const cod of Object.keys(CARGOS)) {
    const resp = await fetch(
      `/divulga/rest/v1/candidatura/listar/2026/${uf}/${ID_ELEICAO}/${cod}/candidatos`,
      { headers: { accept: 'application/json' } },
    );
    if (!resp.ok) throw new Error(`${resp.status} no cargo ${cod}`);
    const lista = (await resp.json()).candidatos || [];
    for (const x of lista) {
      agora.set(String(x.id), {
        nome: x.nomeUrna,
        partido: x.partido?.sigla || '',
        cargo: CARGOS[cod],
        situacao: x.descricaoSituacao || 'Deferido',
      });
    }
    console.log(`TSE agora, ${CARGOS[cod]}: ${lista.length}`);
  }

  // ------------------------------------------------------------- a comparação
  const novos = [];
  const sumiram = [];
  const mudaram = [];

  for (const [id, x] of agora) {
    const antes = noAr.get(id);
    if (!antes) { novos.push(x); continue; }
    const situacaoAntes = antes.situacao_do_registro || 'Deferido';
    if (situacaoAntes !== x.situacao) {
      mudaram.push({ ...x, de: situacaoAntes, para: x.situacao });
    }
  }
  for (const [id, c] of noAr) if (!agora.has(id)) sumiram.push(c);

  // ------------------------------------------------------------- o relatório
  const linha = (x) => `  ${String(x.nome).padEnd(32)} ${String(x.partido).padEnd(14)} ${x.cargo}`;

  if (!novos.length && !sumiram.length && !mudaram.length) {
    console.log(`\nNenhuma mudança. O catálogo publicado continua igual ao TSE de agora.`);
    return { mudou: false, novos: 0, sumiram: 0, mudaram: 0 };
  }

  console.log(`\nMUDOU. O catálogo publicado está desatualizado.\n`);
  if (mudaram.length) {
    console.log(`situação do registro mudou (${mudaram.length}):`);
    for (const x of mudaram) {
      console.log(`${linha(x)}\n      ${x.de} → ${x.para}`);
    }
  }
  if (novos.length) {
    console.log(`\ncandidaturas novas, que não estão no site (${novos.length}):`);
    for (const x of novos) console.log(linha(x));
  }
  if (sumiram.length) {
    console.log(`\nestão no site e sumiram do TSE (${sumiram.length}):`);
    for (const c of sumiram) console.log(linha({ nome: c.nome, partido: c.partido, cargo: c.cargo }));
  }

  console.log(`\nPara consertar, no computador com a pasta do projeto:`
    + `\n  1. await extrairCandidatos('${uf}', ['DF', 'SEN', 'DE'])   (aqui no console)`
    + `\n  2. mova os .psv para dados/`
    + `\n  3. node ferramentas/montar_candidatos.js ${uf}`
    + `\n  4. git add -A && git commit && git push`);

  return { mudou: true, novos: novos.length, sumiram: sumiram.length, mudaram: mudaram.length };
}

if (typeof window !== 'undefined') window.rechecarCandidaturas = rechecarCandidaturas;
