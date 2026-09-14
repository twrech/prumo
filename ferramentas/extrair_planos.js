/**
 * Prumo — extrator dos planos de governo registrados no TSE (etapa 3, executivo).
 *
 * ESTE ARQUIVO NÃO RODA NO NODE. Ele roda no console do navegador, na página do
 * DivulgaCandContas, pela mesma razão de `extrair_votos.js` e
 * `extrair_candidatos.js`: a API do TSE não responde a requisição de fora do
 * domínio dela.
 *
 * COMO USAR
 *   1. Abra https://divulgacandcontas.tse.jus.br/divulga/
 *   2. F12 → Console
 *   3. Cole este arquivo inteiro e dê Enter
 *   4. Rode:  await extrairPlanos('SC')
 *   5. O navegador baixa um .txt por candidato e um `planos-sc.json` de índice.
 *      Mova tudo para `dados/planos/` do projeto.
 *
 * A URL QUE CUSTOU CARO
 *   O arquivo registrado NÃO sai por nenhum caminho de `/divulga/rest/v1/...`,
 *   e o caminho físico que a própria API devolve no campo `url`
 *   (`candidaturas/oficial/2026/BR/SC/6259/candidatos/9689/`) responde 403.
 *   O download real é:
 *
 *       /divulga/rest/arquivo/doc/{idArquivo}
 *
 *   — `rest/arquivo`, sem o `v1`. Está escrito só dentro de um chunk lazy do
 *   Angular (`829.*.js`), nunca numa documentação. Fica registrado aqui para
 *   ninguém precisar caçar de novo.
 *
 *   Os tipos de arquivo aparecem em `arquivos[].codTipo`. O plano de governo é
 *   o codTipo '5'; 11 a 14 são certidões criminais.
 *
 * QUEM TEM PLANO
 *   Só presidente e governador registram plano de governo. Deputado federal,
 *   estadual e senador não registram nenhum — é por isso que a comparação
 *   "o que diz × o que fez" não existe no Prumo: quem tem plano não tem voto
 *   nominal nosso, e quem tem voto nominal não tem plano.
 *
 * O QUE O PDF ENTREGA, E O QUE NÃO ENTREGA
 *   Levantamento de 14/09/2026, os 21 planos de presidente e de governador de
 *   SC: 21 registraram, 19 têm camada de texto, 2 são imagem pura — o plano de
 *   GELSON MERÍSIO (PSB) e o de JORGINHO MELLO (PL). Os dois são candidatos ao
 *   governo de SC, e um extrator que simplesmente pulasse arquivo ilegível
 *   deixaria justamente esses dois de fora sem dizer nada. Por isso o script
 *   grava o .txt mesmo assim, com o aviso SEM CAMADA DE TEXTO no topo: a
 *   ausência fica no disco, não no esquecimento.
 *
 * A REGRA QUE VALE PARA O QUE SAIR DAQUI
 *   Toda posição tirada de um plano carrega a passagem literal que a originou.
 *   Sem passagem citada, sem posição. Plano de governo mede o que a pessoa
 *   DIZ que vai fazer — nunca o que ela fez — e a ficha do candidato tem de
 *   dizer isso na cara do eleitor.
 */

const ID_ELEICAO = '20322002026';
const CARGOS = { PRES: { cod: 1, ue: 'BR', marca: 'pres' }, GOV: { cod: 3, marca: 'gov' } };
const COD_PLANO = '5';
const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';

const api = (caminho) =>
  fetch(`/divulga/rest/v1${caminho}`, { headers: { accept: 'application/json' } })
    .then((r) => { if (!r.ok) throw new Error(`${r.status} em ${caminho}`); return r.json(); });

async function carregarPdfJs() {
  if (window.pdfjsLib) return;
  await new Promise((ok, err) => {
    const s = document.createElement('script');
    s.src = PDFJS; s.onload = ok; s.onerror = err; document.head.append(s);
  });
  pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS.replace('pdf.min.js', 'pdf.worker.min.js');
}

/**
 * Junta os fragmentos de texto de uma página.
 *
 * NÃO acrescentar espaço entre os fragmentos. O pdf.js já devolve cada espaço
 * do documento como um item próprio (`str === ' '`), e quebra a palavra no meio
 * onde o PDF muda o espaçamento entre letras. Somar um espaço a cada fragmento
 * produzia "va lorização", "medi ante", "s erviços" — e citação com palavra
 * partida não sustenta posição nenhuma, que é a regra central desta etapa.
 *
 * A quebra de linha vem de `hasEOL`, não da coordenada vertical.
 */
function textoDaPagina(conteudo) {
  let saida = '';
  for (const item of conteudo.items) {
    saida += item.str;
    if (item.hasEOL) saida += '\n';
  }
  return saida;
}

/**
 * Colapsa a linha que é exatamente ela mesma repetida duas vezes.
 *
 * Alguns PDFs desenham o texto duas vezes — preenchimento e contorno — e o
 * pdf.js devolve os dois, produzindo "legalizaçãoDescriminalização e legalização
 * do abortodo aborto". No levantamento de 2026 isso atingiu só um plano, o da
 * SAMARA (UP), mas atingiu o documento inteiro: 3.145 linhas.
 *
 * A regra é deliberadamente estreita — a linha tem de ser a repetição EXATA da
 * própria metade, e a metade tem de conter letra. Sem a exigência de letra, ela
 * também mutilaria as linhas pontilhadas de sumário, que são repetição de ponto.
 * Regra frouxa aqui apagaria texto real de candidato, que é o oposto do que esta
 * etapa existe para fazer.
 */
function colapsarLinhaDuplicada(linha) {
  const m = linha.match(/^(.*[A-Za-zÀ-ÿ].*)\1$/);
  return m ? m[1] : linha;
}

async function extrairTexto(idArquivo) {
  const buf = await fetch(`/divulga/rest/arquivo/doc/${idArquivo}`).then((r) => {
    if (!r.ok) throw new Error(`${r.status} no arquivo ${idArquivo}`);
    return r.arrayBuffer();
  });
  const doc = await pdfjsLib.getDocument({ data: buf }).promise;
  const paginas = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const conteudo = await doc.getPage(i).then((p) => p.getTextContent());
    const limpo = textoDaPagina(conteudo).split('\n').map(colapsarLinhaDuplicada).join('\n');
    paginas.push(`\n\n--- página ${i} ---\n${limpo}`);
  }
  return { paginas: doc.numPages, texto: paginas.join('').replace(/[ \t]+/g, ' ').trim() };
}

const slug = (s) =>
  String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

function baixar(nome, conteudo) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([conteudo], { type: 'text/plain;charset=utf-8' }));
  a.download = nome;
  document.body.append(a); a.click(); a.remove();
  return new Promise((r) => setTimeout(r, 500));
}

/**
 * @param {string} uf     estado do governador; 'BR' pega só presidente
 * @param {string[]} quais  ['PRES','GOV'] por padrão
 */
async function extrairPlanos(uf = 'SC', quais = ['PRES', 'GOV']) {
  uf = uf.toUpperCase();
  await carregarPdfJs();
  const indice = [];

  for (const chave of quais) {
    const { cod, marca } = CARGOS[chave];
    const ue = CARGOS[chave].ue || uf;
    if (chave === 'GOV' && uf === 'BR') continue;

    const lista = (await api(`/candidatura/listar/2026/${ue}/${ID_ELEICAO}/${cod}/candidatos`)).candidatos || [];
    console.log(`\n${chave} (${ue}): ${lista.length} candidatos`);

    for (const c of lista) {
      const d = await api(`/candidatura/buscar/2026/${ue}/${ID_ELEICAO}/candidato/${c.id}`);
      const nome = d.nomeUrna;
      const sigla = d.partido?.sigla ?? '';
      const plano = (d.arquivos || []).find((a) => a.codTipo === COD_PLANO);
      const arquivo = `plano-${marca}${chave === 'GOV' ? `-${uf.toLowerCase()}` : ''}-${slug(nome)}.txt`;

      if (!plano) {
        console.warn(`  ${nome} (${sigla}): NÃO REGISTROU PLANO`);
        indice.push({ cargo: marca, ue, id: d.id, nome, partido: sigla, arquivo: null, situacao: 'sem plano registrado' });
        continue;
      }

      let r;
      try {
        r = await extrairTexto(plano.idArquivo);
      } catch (e) {
        console.warn(`  ${nome} (${sigla}): falhou — ${e.message}`);
        indice.push({ cargo: marca, ue, id: d.id, nome, partido: sigla, arquivo: null, idArquivo: plano.idArquivo, situacao: `erro: ${e.message}` });
        continue;
      }

      const legivel = r.texto.replace(/--- página \d+ ---/g, '').trim().length >= 400;
      const cabecalho = [
        `# ${nome} — ${sigla} — ${chave === 'PRES' ? 'Presidente' : `Governador ${uf}`}`,
        `# plano registrado no TSE · idArquivo ${plano.idArquivo} · ${r.paginas} páginas`,
        `# arquivo original: ${plano.nome}`,
        `# baixado de /divulga/rest/arquivo/doc/${plano.idArquivo}`,
        legivel ? '' : '#\n# SEM CAMADA DE TEXTO — o PDF é imagem. Nada abaixo pode ser citado.\n# Para tirar posição deste plano é preciso lê-lo à mão ou passar por OCR.',
        '',
      ].filter(Boolean).join('\n');

      await baixar(arquivo, `${cabecalho}\n${r.texto}\n`);
      console.log(`  ${nome} (${sigla}): ${r.paginas}p · ${r.texto.length} chars${legivel ? '' : ' · IMAGEM'}`);
      indice.push({
        cargo: marca, ue, id: d.id, nome, partido: sigla, arquivo,
        idArquivo: plano.idArquivo, paginas: r.paginas, caracteres: r.texto.length,
        legivel, situacao: legivel ? 'ok' : 'sem camada de texto',
      });
    }
  }

  await baixar(`planos-${uf.toLowerCase()}.json`, `${JSON.stringify({
    gerado_em: new Date().toISOString().slice(0, 10),
    fonte: 'DivulgaCandContas/TSE, eleição 20322002026, arquivo codTipo 5',
    download: '/divulga/rest/arquivo/doc/{idArquivo}',
    regra: 'Toda posição tirada de um plano carrega a passagem literal que a originou. Sem passagem citada, sem posição.',
    planos: indice,
  }, null, 2)}\n`);

  const ok = indice.filter((x) => x.legivel).length;
  console.log(`\n${indice.length} candidatos · ${ok} planos legíveis · ${indice.length - ok} sem texto aproveitável.`);
  console.log(`Mova os .txt e o planos-${uf.toLowerCase()}.json para dados/planos/ do projeto.`);
  return indice;
}

if (typeof window !== 'undefined') window.extrairPlanos = extrairPlanos;
