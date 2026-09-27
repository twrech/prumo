/**
 * Prumo — etapa 2: encarte das legendas e ranking de alinhamento.
 *
 * Duas telas: a galeria de partidos e a ficha de um partido. Quando a URL traz
 * `?p=CODIGO`, o código de perfil da etapa 1 é lido e a galeria vira ranking.
 *
 * Mesmas regras de privacidade da etapa 1: nada persiste. O código de perfil
 * vive só na URL e na memória desta aba; não há localStorage, cookie nem envio.
 *
 * Três obrigações de honestidade que a interface É OBRIGADA a cumprir, e o
 * motivo de cada uma está nos dados que ela carrega:
 *
 *   1. Os eixos fracos vêm com selo de confiança baixa — a legislatura quase
 *      não votou costumes nominalmente (votacoes.json, calibracao).
 *   2. Partido sem votações suficientes não entra na comparação e aparece numa
 *      lista à parte (partidos-revelado.json, confianca_minima_para_ranking).
 *   3. A galeria diz que os cinco eixos andam quase juntos nos partidos — senão
 *      o radar promete cinco informações independentes que não existem
 *      (partidos-revelado.json, estrutura_do_espaco).
 */

import { EIXOS, faixaConfianca } from '../../js/motor.js';
import { decodificar, recuperar } from '../../js/perfil.js';
import { radar } from '../../js/grafico.js';
import {
  alinhar, confiancaDoPartido, compatibilidade, selecionarPartidos, CONFIANCA_MINIMA, FAIXA_DE_EMPATE,
} from '../../js/alinhamento.js';
import * as colinha from './colinha.js';

const $ = (id) => document.getElementById(id);

const estado = {
  eixos: null,
  revelado: null,
  nomes: null,
  catalogo: null,
  votos: null,
  candidatos: null, // etapa 3: candidatos da UF, com escada de evidência
  executivo: null,  // etapa 3: presidente e governador, lidos pelo plano de governo
  numerosPartido: null, // etapa 4: o número da legenda, para quem vota só no partido
  partidoAberto: null,
  perfil: null,     // { posicao, confianca } vindo do código na URL
  alinhamento: null,
};

/* ------------------------------------------------------------------ dados */

async function carregar() {
  const arquivos = ['eixos', 'partidos-revelado', 'partidos-nomes', 'votacoes', 'votos-partidos'];
  const [eixos, revelado, nomes, catalogo, votos] = await Promise.all(
    arquivos.map((n) => fetch(`../dados/${n}.json`).then((r) => {
      if (!r.ok) throw new Error(`não foi possível carregar ${n}.json`);
      return r.json();
    }))
  );
  estado.eixos = eixos.eixos;
  estado.revelado = revelado;
  estado.nomes = nomes.partidos;
  estado.catalogo = catalogo;
  estado.votos = votos;

  // Etapa 3 é opcional: um estado sem arquivo de candidatos continua tendo as
  // etapas 1 e 2 inteiras. Nunca derruba a página por falta dele.
  try {
    const r = await fetch('../dados/candidatos-sc.json');
    if (r.ok) estado.candidatos = await r.json();
  } catch { /* segue sem a etapa 3 */ }

  // O Executivo também é opcional, e pela mesma razão: um estado sem leitura de
  // planos continua tendo as etapas 1 e 2 inteiras.
  try {
    const r = await fetch('../dados/executivo-sc.json');
    if (r.ok) estado.executivo = await r.json();
  } catch { /* segue sem os candidatos ao Executivo */ }

  // Ficha institucional: o que o partido diz de si, história, representação.
  try {
    const r = await fetch('../dados/partidos-perfil.json');
    if (r.ok) estado.perfil_partidos = await r.json();
  } catch { /* segue sem as fichas institucionais */ }

  // Frases de campanha: o que cada candidato DIZ. Sem o arquivo, os cartões
  // só perdem a frase; nada mais depende dele.
  try {
    const r = await fetch('../dados/campanha-sc.json');
    if (r.ok) estado.campanha = await r.json();
  } catch { /* segue sem frases */ }

  // Sinais de força eleitoral (dinheiro de campanha, votos na última eleição,
  // seguidores). Ficam atrás de uma tarja: só aparecem se o eleitor pedir.
  try {
    const r = await fetch('../dados/forca-sc.json');
    if (r.ok) estado.forca = await r.json();
  } catch { /* segue sem os sinais de força */ }

  // Os números de legenda. Sem eles a colinha ainda funciona para candidato,
  // só não oferece voto de legenda — que é melhor do que oferecer sem o número.
  try {
    const r = await fetch('../dados/partidos-numeros.json');
    if (r.ok) estado.numerosPartido = (await r.json()).partidos;
  } catch { /* segue sem voto de legenda */ }
}

function lerPerfilDaUrl() {
  const codigo = new URLSearchParams(location.search).get('p');
  if (!codigo) return null;
  try {
    return decodificar(codigo);
  } catch (e) {
    // Código no endereço que não se lê: antes sumia em silêncio e a pessoa
    // via a galeria sem ranking sem saber por quê. Agora o recuperador abre
    // com a explicação.
    let motivo = e.message;
    try { recuperar(codigo); } catch (e2) { motivo = e2.message; }
    $('recuperador').open = true;
    $('erro-codigo').textContent = `O código que veio no endereço não pôde ser lido. ${motivo}`;
    $('erro-codigo').classList.remove('oculto');
    return null;
  }
}

/** O código em uso, já validado — para os links de volta ao resultado. */
const codigoAtual = () => new URLSearchParams(location.search).get('p');

const nomeDoEixo = (k) => estado.eixos.find((e) => e.codigo === k)?.nome || k;
const numeroDoPartido = (s) => {
  const ns = estado.numerosPartido || {};
  const k = Object.keys(ns).find((x) => mesmaSigla(x, s));
  return (k && ns[k].numero) ?? perfilDoPartido(s)?.numero ?? null;
};
const mesmaSigla = (a, b) => String(a).toUpperCase() === String(b).toUpperCase();
const perfilDoPartido = (s) => {
  const ps = estado.perfil_partidos?.partidos || {};
  const k = Object.keys(ps).find((x) => mesmaSigla(x, s));
  return k ? ps[k] : null;
};
const nomeDoPartido = (s) => estado.nomes[s]?.nome || perfilDoPartido(s)?.nome || s;

function coresDoTema() {
  const css = getComputedStyle(document.body);
  const ler = (n, p) => (css.getPropertyValue(n) || '').trim() || p;
  return {
    cor: ler('--cobre', '#9c5a24'),
    corTexto: ler('--texto-suave', '#55575c'),
    corTextoForte: ler('--texto', '#1b1c1e'),
    corGrade: ler('--borda', '#d9d5cf'),
    corFundo: 'transparent',
  };
}

/* ---------------------------------------------------------------- galeria */

const TELAS = ['tela-meus', 'tela-galeria', 'tela-ficha', 'tela-candidato', 'tela-executivo', 'tela-colinha'];

/** Qual item da barra de navegação acende para cada tela. */
const ABA_DA_TELA = {
  'tela-meus': 'nav-meus',
  'tela-galeria': 'nav-todos',
  'tela-ficha': 'nav-todos',
  'tela-candidato': 'nav-todos',
  'tela-executivo': 'nav-todos',
  'tela-colinha': 'nav-colinha',
};

function mostrar(tela) {
  for (const id of TELAS) $(id).classList.toggle('oculto', id !== tela);
  for (const a of $('navegacao').querySelectorAll('a')) a.removeAttribute('aria-current');
  $(ABA_DA_TELA[tela])?.setAttribute('aria-current', 'page');
  window.scrollTo({ top: 0 });
}

/* ------------------------------------------------------------- rotas
 *
 * Cada tela tem um endereço depois do # (#meus, #todos, #partido/PT,
 * #candidato/ID, #executivo/ID, #colinha). Assim o botão "voltar" do
 * navegador e do celular funciona como a pessoa espera, e ir e voltar entre
 * as telas não recarrega a página — a colinha, que vive só na memória desta
 * aba, sobrevive à navegação.
 */

function ir(rota) {
  if (location.hash === `#${rota}`) rotear();
  else location.hash = rota;
}

function rotear() {
  const [nome, ...resto] = decodeURIComponent(location.hash.slice(1)).split('/');
  const arg = resto.join('/');
  if (nome === 'partido' && resto[0]) return abrirFicha(resto[0], resto[1] || null);
  if (nome === 'candidato' && arg) return abrirCandidato(arg);
  if (nome === 'executivo' && arg) return abrirExecutivo(arg);
  if (nome === 'colinha') { desenharColinha(); return mostrar('tela-colinha'); }
  if ((nome === 'meus' || nome === '') && estado.perfil) { desenharMeus(); return mostrar('tela-meus'); }
  desenharGaleria();
  mostrar('tela-galeria');
}

/* ------------------------------------------------------- meus partidos */

const faixaDoEixo = (k, valor) => {
  const eixo = estado.eixos.find((e) => e.codigo === k);
  return eixo?.faixas.find((f) => valor >= f.de && valor <= f.ate) || null;
};

/** "Pelo que votou": os eixos em que a bancada tem posição marcada. */
function resumoDoVoto(partido) {
  const marcados = EIXOS
    .filter((k) => Math.abs(partido.posicao[k] || 0) >= 20)
    .sort((a, b) => Math.abs(partido.posicao[b]) - Math.abs(partido.posicao[a]))
    .map((k) => `${faixaDoEixo(k, partido.posicao[k])?.rotulo} em ${nomeDoEixo(k)}`);
  return marcados.length
    ? `${marcados.join('; ')}.`
    : 'Sem posição marcada em nenhum eixo: a bancada votou dividida ou no meio.';
}

function frasesDeAcordo(item) {
  const mesmo = item.mesmoLado.map(nomeDoEixo);
  const opostos = item.ladosOpostos.map(nomeDoEixo);
  const meio = item.porEixo.filter((e) => e.acordo !== 'mesmo lado' && e.acordo !== 'lados opostos').map((e) => nomeDoEixo(e.eixo));
  const f = [];
  if (mesmo.length) f.push(`Vocês estão do mesmo lado em ${lista(mesmo)}.`);
  if (opostos.length) f.push(`Ficam em lados opostos em ${lista(opostos)}.`);
  if (meio.length) f.push(`Em ${lista(meio)}, um dos dois está no meio.`);
  return f.join(' ');
}

function lista(itens) {
  return itens.length < 2 ? itens.join('') : `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`;
}

function cartaoMeu(item) {
  const partido = estado.revelado.partidos[item.sigla];
  const perfilTexto = perfilDoPartido(item.sigla);
  const num = numeroDoPartido(item.sigla);

  const c = document.createElement('article');
  c.className = 'cartao-meu';

  const cab = document.createElement('header');
  const h = document.createElement('h2'); h.textContent = item.sigla;
  const v = document.createElement('span'); v.className = 'valor'; v.textContent = `${item.alinhamento}%`;
  v.title = 'alinhamento com você';
  cab.append(h, v);
  const nome = document.createElement('p');
  nome.className = 'nome-partido';
  nome.textContent = num ? `${nomeDoPartido(item.sigla)} · número ${num}` : nomeDoPartido(item.sigla);
  c.append(cab, nome);

  // O que o partido diz defender: vem do texto do próprio partido, com fonte.
  // Enquanto o dossiê não existir, a seção simplesmente não aparece.
  if (perfilTexto?.autodefinicao) {
    const t = document.createElement('h3'); t.textContent = 'O que o partido diz de si';
    const q = document.createElement('blockquote'); q.className = 'citacao'; q.textContent = perfilTexto.autodefinicao.texto;
    const f = document.createElement('p'); f.className = 'discreto confianca';
    f.textContent = `Palavras do próprio partido — ${perfilTexto.autodefinicao.documento}.`;
    c.append(t, q, f);
  }

  const t2 = document.createElement('h3'); t2.textContent = 'Como a bancada votou na Câmara';
  const p2 = document.createElement('p'); p2.textContent = resumoDoVoto(partido);
  const t3 = document.createElement('h3'); t3.textContent = 'Você e o partido';
  const p3 = document.createElement('p'); p3.textContent = frasesDeAcordo(item);
  c.append(t2, p2, t3, p3);

  const acoes = document.createElement('div');
  acoes.className = 'acoes';
  const a1 = document.createElement('a'); a1.className = 'botao'; a1.href = `#partido/${encodeURIComponent(item.sigla)}`; a1.textContent = 'Conhecer o partido';
  const a2 = document.createElement('a'); a2.className = 'botao principal'; a2.href = `#partido/${encodeURIComponent(item.sigla)}/candidatos`; a2.textContent = 'Ver os candidatos';
  acoes.append(a1, a2);
  c.append(acoes);
  return c;
}

function desenharMeus() {
  const al = estado.alinhamento;
  const sel = selecionarPartidos(al);

  $('meus-titulo').textContent = sel.abaixoDoCorte
    ? 'Os partidos menos distantes de você'
    : sel.mostrados.length === 1 ? 'O partido mais próximo de você' : 'Os partidos mais próximos de você';

  $('meus-intro').textContent = sel.abaixoDoCorte
    ? 'Nenhum partido chegou a 80% de alinhamento com as suas respostas. Estes são os três que ficaram menos longe — '
      + 'repare, em cada um, em que eixos vocês discordam.'
    : `${sel.mostrados.length === 1 ? 'Só um partido passou' : `Estes ${sel.mostrados.length} partidos passaram`} de 80% de `
      + 'alinhamento com as suas respostas, comparando o que você respondeu com o que cada bancada votou na Câmara.';

  // Quando ninguém passa do corte, a introdução já diz o que o aviso de
  // "nenhum partido próximo" diria; repetir seria ruído. O aviso de centro
  // é outro assunto e continua.
  const avisos = [al.motivo === 'nenhum-partido-proximo' && sel.abaixoDoCorte ? null : al.aviso].filter(Boolean);
  $('meus-aviso').classList.toggle('oculto', !avisos.length);
  $('meus-aviso').textContent = avisos.join(' ');

  const alvo = $('meus-lista');
  alvo.textContent = '';
  for (const item of sel.mostrados) alvo.append(cartaoMeu(item));

  $('meus-empatados').classList.toggle('oculto', !sel.empatados.length);
  if (sel.empatados.length) {
    $('meus-empatados-intro').textContent =
      `Estes ficaram a menos de ${FAIXA_DE_EMPATE} pontos do último da lista acima. Essa diferença é menor que a margem `
      + 'de erro do método — tirar uma única votação do catálogo já troca a ordem —, então valem tanto quanto os de cima.';
    const l = $('meus-empatados-lista');
    l.textContent = '';
    for (const r of sel.empatados) {
      const a = document.createElement('a');
      a.href = `#partido/${encodeURIComponent(r.sigla)}`;
      a.append(r.sigla);
      const sp = document.createElement('span'); sp.textContent = `${r.alinhamento}%`;
      a.append(sp);
      l.append(a);
    }
  }

  $('meus-regra').textContent =
    'Como esta lista é montada: entram os partidos com 80% ou mais de alinhamento, até três. Se nenhum chega a 80%, '
    + 'entram os três mais próximos, com aviso. O alinhamento compara a direção das suas posições com a das votações de '
    + 'cada bancada; não vem do que o partido diz sobre si. A lista completa, com todos os partidos, está em "Todos os partidos".';
}

function cartaoPartido(sigla, partido, item) {
  const cartao = document.createElement('article');
  cartao.className = 'cartao-eixo';
  cartao.style.cursor = 'pointer';
  cartao.tabIndex = 0;
  cartao.setAttribute('role', 'button');

  const cabeca = document.createElement('header');
  const titulo = document.createElement('h3');
  titulo.textContent = sigla;
  cabeca.append(titulo);

  if (item) {
    const valor = document.createElement('span');
    valor.className = 'valor';
    valor.textContent = `${item.alinhamento}%`;
    cabeca.append(valor);
  }
  cartao.append(cabeca);

  // Marca visível de empate no topo, para que o cartão não sugira uma posição
  // na fila que a margem de erro do método não sustenta.
  if (item?.empatadoNoTopo && estado.alinhamento?.empatadosNoTopo?.length > 1) {
    const marca = document.createElement('p');
    marca.className = 'discreto confianca';
    marca.style.margin = '.35rem 0 0';
    marca.textContent = `empatado no topo com outros ${estado.alinhamento.empatadosNoTopo.length - 1}`;
    cartao.append(marca);
  }

  const nome = document.createElement('p');
  nome.className = 'discreto';
  nome.style.margin = '0';
  nome.textContent = nomeDoPartido(sigla);
  cartao.append(nome);

  if (item) {
    const detalhe = document.createElement('p');
    const mesmo = item.mesmoLado.map(nomeDoEixo);
    const opostos = item.ladosOpostos.map(nomeDoEixo);
    const partes = [];
    if (mesmo.length) partes.push(`mesmo lado em ${mesmo.join(', ')}`);
    if (opostos.length) partes.push(`lados opostos em ${opostos.join(', ')}`);
    detalhe.textContent = partes.length ? partes.join('; ') : 'sem posição clara em comum';
    cartao.append(detalhe);
  }

  const rodape = document.createElement('p');
  rodape.className = 'discreto confianca';
  rodape.textContent = `${partido.bancada} deputados · votou em ${partido.votacoes} de ${estado.catalogo.votacoes.length} votações`;
  cartao.append(rodape);

  const abrir = () => ir(`partido/${sigla}`);
  cartao.addEventListener('click', abrir);
  cartao.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); abrir(); } });
  return cartao;
}

function desenharGaleria() {
  const alvo = $('lista-partidos');
  alvo.textContent = '';

  const entradas = Object.entries(estado.revelado.partidos);
  let ordenadas;

  if (estado.alinhamento) {
    const porSigla = new Map(estado.alinhamento.ranking.map((r) => [r.sigla, r]));
    ordenadas = estado.alinhamento.ranking.map((r) => [r.sigla, estado.revelado.partidos[r.sigla], r]);
    const empate = estado.alinhamento.empatadosNoTopo?.length > 1;
    $('titulo-galeria').textContent = !estado.alinhamento.confiavel
      ? 'Os partidos menos distantes de você'
      : empate
        ? 'Os partidos mais parecidos com você, em ordem de empate'
        : 'Os partidos mais parecidos com você';
    $('intro-galeria').textContent =
      'A ordem vem da comparação entre as suas posições e o que cada bancada votou. '
      + 'Você pode abrir qualquer partido, inclusive os do fim da lista.';
    void porSigla;
  } else {
    // Mesmo sem perfil, quem não tem votação suficiente fica fora da lista
    // principal: aparece só na seção à parte, para não ser lido como medido.
    const piso = estado.revelado.confianca_minima_para_ranking ?? CONFIANCA_MINIMA;
    ordenadas = entradas
      .filter(([, p]) => confiancaDoPartido(p) >= piso)
      .sort((a, b) => b[1].bancada - a[1].bancada)
      .map(([s, p]) => [s, p, null]);
  }

  for (const [sigla, partido, item] of ordenadas) alvo.append(cartaoPartido(sigla, partido, item));

  // Lista à parte: quem não tem votação suficiente para ser posicionado.
  const semPosicao = estado.alinhamento
    ? estado.alinhamento.naoPosicionados
    : entradas
      .filter(([, p]) => confiancaDoPartido(p) < (estado.revelado.confianca_minima_para_ranking ?? CONFIANCA_MINIMA))
      .map(([s, p]) => ({ sigla: s, confianca: Math.round(confiancaDoPartido(p)), bancada: p.bancada, votacoes: p.votacoes }));

  desenharExecutivo();

  // Partidos registrados no TSE sem bancada medida: ficha sem "Como vota".
  const outros = Object.keys(estado.perfil_partidos?.partidos || {})
    .filter((s) => !Object.keys(estado.revelado.partidos).some((r) => mesmaSigla(r, s)))
    .sort();
  $('secao-outros').classList.toggle('oculto', !outros.length);
  const lo = $('lista-outros');
  lo.textContent = '';
  for (const s of outros) {
    const pf = perfilDoPartido(s);
    const c = document.createElement('article');
    c.className = 'cartao-eixo'; c.style.cursor = 'pointer'; c.tabIndex = 0; c.setAttribute('role', 'button');
    const h = document.createElement('h3'); h.textContent = s; h.style.margin = '0 0 .4rem';
    const n = document.createElement('p'); n.className = 'discreto'; n.style.margin = '0';
    n.textContent = `${pf.nome}${pf.numero ? ` · ${pf.numero}` : ''}`;
    const d = document.createElement('p'); d.className = 'discreto confianca';
    const nc = candidatosDoPartido(s).length;
    d.textContent = nc ? `${nc} ${nc === 1 ? 'candidato' : 'candidatos'} em ${estado.candidatos?.uf || 'SC'}` : 'sem candidatos em SC nesta etapa';
    c.append(h, n, d);
    const abrir = () => ir(`partido/${s}`);
    c.addEventListener('click', abrir);
    c.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); abrir(); } });
    lo.append(c);
  }

  if (semPosicao.length) {
    $('secao-sem-posicao').classList.remove('oculto');
    const lista = $('lista-sem-posicao');
    lista.textContent = '';
    for (const p of semPosicao) {
      const c = document.createElement('article');
      c.className = 'cartao-eixo';
      const h = document.createElement('h3');
      h.textContent = p.sigla;
      h.style.margin = '0 0 .4rem';
      const n = document.createElement('p');
      n.className = 'discreto';
      n.style.margin = '0';
      n.textContent = nomeDoPartido(p.sigla);
      const d = document.createElement('p');
      d.className = 'discreto confianca';
      d.textContent = `Votou em apenas ${p.votacoes} de ${estado.catalogo.votacoes.length} votações — pouco para dizer onde está.`;
      c.append(h, n, d);
      const ext = estado.perfil_partidos?.extintos?.[p.sigla];
      if (ext) {
        const e = document.createElement('p'); e.className = 'discreto confianca'; e.textContent = ext.texto; c.append(e);
      } else {
        c.style.cursor = 'pointer'; c.tabIndex = 0; c.setAttribute('role', 'button');
        const abrir = () => ir(`partido/${p.sigla}`);
        c.addEventListener('click', abrir);
        c.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); abrir(); } });
      }
      lista.append(c);
    }
  }

  // Obrigação 3: dizer que os eixos andam juntos.
  const est = estado.revelado.estrutura_do_espaco;
  if (est) {
    $('nota-dimensao').textContent =
      `Uma ressalva sobre o gráfico de cinco pontas: nos partidos brasileiros três desses eixos andam quase juntos — `
      + `quem é a favor de mais Estado na economia costuma ser também mais progressista nos costumes e mais preservacionista, `
      + `e o contrário também. No total, ${Math.round(est.fracao_no_primeiro_componente * 100)}% da diferença entre os partidos `
      + `cabe numa única linha, da esquerda à direita. O eixo Poder é a exceção: nestas votações ele não acompanha os outros, `
      + `e não dá para supor que um lado seja mais punitivista que o outro. O radar mostra cinco medidas, mas elas não são `
      + `cinco escolhas independentes.`;
  }
}

function desenharPerfil() {
  if (!estado.perfil) return;
  $('caixa-perfil').classList.remove('oculto');
  $('botao-teste').textContent = 'Voltar ao meu resultado';
  $('recuperador').classList.add('oculto');

  const definidos = EIXOS.filter((k) => (estado.perfil.confianca[k] || 0) > 70).length;
  $('perfil-rotulo').textContent = 'Seu perfil foi carregado';
  $('perfil-detalhe').textContent =
    `As posições vieram do código no endereço desta página, não de nada guardado aqui. `
    + `Bem definidas em ${definidos} de 5 eixos.`;

  const a = estado.alinhamento;
  // Obrigação 4: o topo costuma ser empate. Os dois avisos podem aparecer
  // juntos — um fala da relação entre você e os partidos, o outro da relação
  // dos partidos do topo entre si.
  const avisos = [a?.aviso, a?.avisoEmpate].filter(Boolean);
  if (avisos.length) {
    const caixa = $('aviso-alinhamento');
    caixa.classList.remove('oculto');
    caixa.textContent = '';
    for (const texto of avisos) {
      const p = document.createElement('span');
      p.style.display = 'block';
      if (caixa.childElementCount) p.style.marginTop = '.7rem';
      p.textContent = texto;
      caixa.append(p);
    }
  }
}

/* ------------------------------------------------------------------ ficha */

const ABAS = ['quem', 'hoje', 'votos', 'candidatos'];

function mostrarAba(aba) {
  for (const a of ABAS) $(`aba-${a}`).classList.toggle('oculto', a !== aba);
  for (const b of $('ficha-abas').querySelectorAll('button')) {
    b.setAttribute('aria-selected', b.dataset.aba === aba ? 'true' : 'false');
  }
  estado.abaAberta = aba;
}

function abrirFicha(sigla, aba = null) {
  const partido = estado.revelado.partidos[sigla] || null;
  const perfil = perfilDoPartido(sigla);
  if (!partido && !perfil) return;

  $('ficha-sigla').textContent = sigla;
  const num = numeroDoPartido(sigla);
  const fed = perfil?.federacao ? estado.perfil_partidos.federacoes[perfil.federacao] : null;
  $('ficha-nome').textContent = [nomeDoPartido(sigla), num ? `número ${num}` : null, fed ? fed.nome : null]
    .filter(Boolean).join(' · ');

  desenharAbaQuem(sigla, perfil);
  desenharAbaHoje(sigla, perfil, partido);

  // "Como vota" só existe para quem tem bancada medida na Câmara.
  const botaoVotos = $('ficha-abas').querySelector('[data-aba="votos"]');
  botaoVotos.disabled = !partido;
  botaoVotos.title = partido ? '' : 'Sem bancada na Câmara nesta legislatura: não há votos para medir';
  if (partido) desenharAbaVotos(sigla, partido);

  desenharCandidatosDoPartido(sigla);
  const secaoCand = $('secao-candidatos');
  secaoCand.querySelector('.bloco-legenda')?.remove();
  const bl = blocoLegenda(sigla);
  if (bl && !secaoCand.classList.contains('oculto')) { bl.classList.add('bloco-legenda'); secaoCand.append(bl); }
  $('sem-candidatos').classList.toggle('oculto', !secaoCand.classList.contains('oculto'));
  $('sem-candidatos').textContent = `Nenhum candidato registrado por ${sigla} em ${estado.candidatos?.uf || 'SC'} para os cargos desta etapa.`;

  estado.partidoAberto = sigla;
  const abaFinal = ABAS.includes(aba) && !(aba === 'votos' && !partido) ? aba : 'quem';
  mostrarAba(abaFinal);
  mostrar('tela-ficha');
}

function desenharAbaQuem(sigla, perfil) {
  const cit = $('quem-citacao');
  const fonte = $('quem-fonte');
  if (perfil?.autodefinicao) {
    cit.textContent = perfil.autodefinicao.texto;
    fonte.textContent = '';
    fonte.append('Palavras do próprio partido, sem edição do Prumo — ');
    const a = document.createElement('a'); a.href = perfil.autodefinicao.fonte; a.target = '_blank'; a.rel = 'noopener';
    a.textContent = perfil.autodefinicao.documento; fonte.append(a, '.');
  } else {
    cit.textContent = 'Sem autodefinição citada.';
    fonte.textContent = perfil?.sem_autodefinicao
      || 'O Prumo não encontrou texto do próprio partido que pudesse citar, e não descreve partido com palavras suas.';
  }

  const lin = $('quem-linhagem');
  lin.textContent = perfil?.linhagem?.length ? `Nomes anteriores e partidos incorporados: ${perfil.linhagem.join('; ')}.` : '';

  const ol = $('quem-marcos');
  ol.textContent = '';
  for (const m of (perfil?.historia || [])) {
    const li = document.createElement('li');
    const b = document.createElement('b'); b.textContent = m.ano;
    const p = document.createElement('p'); p.textContent = m.texto;
    li.append(b, p); ol.append(li);
  }

  const reg = $('quem-registro');
  reg.textContent = '';
  if (perfil) {
    reg.append(`Registro no TSE em ${dataCurta(perfil.registro_tse)} · presidente nacional: ${perfil.presidente_nacional}`);
    if (perfil.site) { reg.append(' · '); const a = document.createElement('a'); a.href = perfil.site; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'site do partido'; reg.append(a); }
    reg.append('.');
  }
  $('quem-nota').textContent = 'Esta aba traz o que o partido DIZ. O que ele FEZ — como a bancada votou — está em "Como vota", e as duas coisas não se misturam.';
}

function dataCurta(iso) {
  if (!iso) return '';
  const [a, m, d] = iso.split('-');
  return `${Number(d)}/${m}/${a}`;
}

function cartaoNumero(titulo, numero, texto) {
  const c = document.createElement('article');
  c.className = 'cartao-eixo';
  const h = document.createElement('h3'); h.textContent = titulo; h.style.margin = '0';
  const n = document.createElement('p'); n.className = 'numero-grande'; n.textContent = String(numero);
  const p = document.createElement('p'); p.className = 'discreto'; p.style.margin = '0'; p.textContent = texto;
  c.append(h, n, p);
  return c;
}

function desenharAbaHoje(sigla, perfil, partido) {
  const alvo = $('hoje-cartoes');
  alvo.textContent = '';
  const rep = perfil?.representacao;
  const cam = rep?.camara;
  alvo.append(cartaoNumero('Câmara dos Deputados', cam?.deputados ?? partido?.bancada ?? 0,
    cam?.deputados ? `deputados em exercício${cam.lider ? ` · líder: ${cam.lider}` : ''}` : 'sem deputados nesta legislatura'));
  alvo.append(cartaoNumero('Senado', rep?.senado?.senadores ?? 0,
    rep?.senado?.senadores ? 'senadores em exercício' : 'sem senadores'));
  const govs = rep?.governadores || [];
  alvo.append(cartaoNumero('Governos estaduais', govs.length, govs.length ? 'governadores em exercício' : 'nenhum governador'));
  alvo.append(cartaoNumero('Presidência da República', rep?.presidencia ? 'sim' : 'não',
    rep?.presidencia ? 'o presidente em exercício é do partido' : 'o presidente em exercício não é do partido'));

  $('hoje-governadores').classList.toggle('oculto', !govs.length);
  const ul = $('hoje-gov-lista'); ul.textContent = '';
  for (const g of govs) {
    const li = document.createElement('li');
    li.textContent = `${g.uf} — ${g.nome}${g.obs ? ` (${g.obs}, desde ${dataCurta(g.desde)})` : ''}`;
    ul.append(li);
  }
  $('hoje-gov-intro').textContent = 'Quem governa o estado hoje, pelo partido em que está filiado agora — não pelo partido pelo qual foi eleito.';

  const fg = estado.perfil_partidos?.fontes_gerais || {};
  $('hoje-nota').textContent =
    `Números lidos em ${dataCurta(estado.perfil_partidos?.gerado_em)} nos dados abertos da Câmara e do Senado. `
    + 'Onze governadores renunciaram em março e abril de 2026 para concorrer; nesses estados governa o vice ou um interino. '
    + 'Deputados e senadores mudam de partido, então estes números envelhecem.';
}

function desenharAbaVotos(sigla, partido) {
  const conf = Math.round(confiancaDoPartido(partido));
  $('ficha-sintese').textContent =
    `A posição abaixo foi calculada a partir dos votos da bancada em `
    + `${partido.votacoes} das ${estado.catalogo.votacoes.length} votações do catálogo. `
    + `Não vem do programa do partido nem do que ele diz sobre si mesmo.`;
  $('ficha-base').textContent =
    `${partido.bancada} deputados na maior votação · confiança média da medida: ${conf}%`;

  const cores = coresDoTema();
  const opcoes = { ...cores };
  if (estado.perfil) {
    opcoes.comparacao = { posicao: estado.perfil.posicao, cor: cores.corTextoForte };
  }
  $('ficha-grafico').innerHTML = radar(partido.posicao, partido.confianca, estado.eixos, opcoes);

  $('ficha-legenda').textContent = '';
  const legenda = (texto, tracejado) => {
    const s = document.createElement('span');
    const i = document.createElement('i');
    if (tracejado) { i.style.borderTopStyle = 'dashed'; i.style.borderTopColor = 'currentColor'; }
    s.append(i, document.createTextNode(texto));
    return s;
  };
  $('ficha-legenda').append(legenda(` ${sigla}`, false));
  if (estado.perfil) $('ficha-legenda').append(legenda(' você', true));

  desenharEixosDaFicha(partido);
  desenharVotacoesDaFicha(sigla);
}

function desenharEixosDaFicha(partido) {
  const alvo = $('ficha-eixos');
  alvo.textContent = '';
  const reduzidos = estado.revelado.eixos_com_confianca_reduzida || {};
  const separamPouco = estado.revelado.eixos_que_separam_pouco || {};

  for (const k of EIXOS) {
    const eixo = estado.eixos.find((e) => e.codigo === k);
    if (!eixo) continue;
    const valor = partido.posicao[k];
    const polo = valor === 0 ? null : (valor < 0 ? eixo.polo_negativo : eixo.polo_positivo);

    const cartao = document.createElement('article');
    cartao.className = 'cartao-eixo';

    const cabeca = document.createElement('header');
    const h = document.createElement('h3');
    h.textContent = eixo.nome;
    const v = document.createElement('span');
    v.className = 'valor';
    v.textContent = polo ? `${polo.nome} ${Math.abs(valor)}%` : 'no meio';
    cabeca.append(h, v);

    const regua = document.createElement('div');
    regua.className = 'regua';
    const marcador = document.createElement('span');
    marcador.className = 'marcador';
    marcador.style.left = `${(valor + 100) / 2}%`;
    regua.append(marcador);
    if (estado.perfil) {
      const meu = document.createElement('span');
      meu.className = 'marcador incerto';
      meu.style.left = `${((estado.perfil.posicao[k] || 0) + 100) / 2}%`;
      meu.title = 'você';
      regua.append(meu);
    }

    const polos = document.createElement('div');
    polos.className = 'polos';
    const e1 = document.createElement('span');
    e1.textContent = eixo.polo_negativo.nome;
    const e2 = document.createElement('span');
    e2.textContent = eixo.polo_positivo.nome;
    polos.append(e1, e2);

    cartao.append(cabeca, regua, polos);

    // Obrigação 1: selo no eixo fraco, com a razão certa. São dois defeitos
    // diferentes e não se confundem: POUCA VOTAÇÃO no catálogo (confiança
    // reduzida) e POUCA DIVERGÊNCIA entre os partidos (separa pouco). Um eixo
    // pode ter peso de sobra e ainda assim não distinguir ninguém.
    for (const fonte of [reduzidos, separamPouco]) {
      if (!fonte[k]) continue;
      const selo = document.createElement('p');
      selo.className = 'discreto confianca';
      selo.textContent = fonte[k].texto_do_selo
        || 'A posição dos partidos neste eixo é menos firme que nos outros.';
      cartao.append(selo);
    }
    alvo.append(cartao);
  }
}

function desenharVotacoesDaFicha(sigla) {
  const alvo = $('ficha-votacoes');
  alvo.textContent = '';

  const ordenadas = [...estado.catalogo.votacoes].sort((a, b) => (a.data < b.data ? 1 : -1));
  for (const v of ordenadas) {
    const dados = estado.votos.votacoes[v.id]?.partidos?.[sigla];

    const bloco = document.createElement('article');
    bloco.className = 'cartao-eixo';
    bloco.style.marginBottom = '1rem';

    const cabeca = document.createElement('header');
    const h = document.createElement('h3');
    h.textContent = v.titulo;
    const como = document.createElement('span');
    como.className = 'valor';
    if (!dados) {
      como.textContent = 'não votou';
      como.style.color = 'var(--texto-suave)';
    } else {
      const total = dados.s + dados.n;
      const prop = Math.round((100 * Math.max(dados.s, dados.n)) / total);
      const lado = dados.s > dados.n ? 'a favor' : dados.n > dados.s ? 'contra' : 'dividida';
      como.textContent = lado === 'dividida' ? 'bancada dividida' : `${lado} (${prop}%)`;
    }
    cabeca.append(h, como);

    const resumo = document.createElement('p');
    resumo.textContent = v.resumo;

    const ficha = document.createElement('p');
    ficha.className = 'discreto confianca';
    const data = v.data.split('-').reverse().join('/');
    ficha.textContent = dados
      ? `${v.materia} · ${data} · ${dados.s} sim, ${dados.n} não na bancada`
      : `${v.materia} · ${data}`;

    bloco.append(cabeca, resumo, ficha);
    alvo.append(bloco);
  }
}


/* ------------------------------------------------- etapa 4: a colinha */

/**
 * O botão que põe alguém na colinha. Ele NUNCA diz "recomendado" nem sugere:
 * diz "pôr na colinha" e, quando já está lá, "tirar". O verbo é do eleitor.
 */
function botaoColinha(candidato, cargo) {
  // Quem saiu da urna (renúncia, indeferimento definitivo) não pode ir para a
  // colinha: digitar o número dá voto nulo. O botão fica, desligado, para a
  // pessoa entender por que não consegue.
  if (candidato.na_urna === false) {
    const b = document.createElement('button');
    b.className = 'discreta';
    b.style.marginTop = '1rem';
    b.disabled = true;
    b.textContent = 'Não está na urna — não dá para pôr na colinha';
    return b;
  }
  const b = document.createElement('button');
  b.className = 'discreta';
  b.style.marginTop = '1rem';

  const pintar = () => {
    const vaga = colinha.vagaOcupadaPor(candidato.id);
    b.textContent = vaga ? '✓ na sua colinha — clique para tirar' : 'Pôr na minha colinha';
    b.classList.toggle('principal', !vaga);
    b.classList.toggle('discreta', !!vaga);
  };

  b.addEventListener('click', () => {
    const r = colinha.escolher(candidato, cargo);
    if (r.acao === 'sem-vaga') {
      avisar(b, `As duas vagas de ${r.vagas[0].split(' —')[0].toLowerCase()} já estão ocupadas. `
        + 'Tire uma na tela da colinha antes de pôr outra — não troco por você.');
      return;
    }
    if (r.acao === 'cargo-desconhecido') { avisar(b, 'Este cargo não entra na colinha.'); return; }
    pintar();
    avisar(b, r.acao === 'removido' ? 'Tirado da colinha.' : `Posto em ${r.rotulo}.`);
  });

  pintar();
  return b;
}

/**
 * O que dizer sobre o registro, na palavra do TSE e sem concluir por cima dela.
 * Indeferido com recurso continua na urna (o voto vai para a conta e vale ou não
 * conforme o recurso); renúncia e indeferimento definitivo saem da urna.
 */
function textoDoRegistro(c) {
  if (!c.situacao_do_registro || c.situacao_do_registro === 'Deferido') return '';
  if (c.na_urna === false) {
    return `Atenção: esta candidatura não está na urna. Situação no TSE: "${c.situacao_do_registro}". `
      + 'Digitar este número dá voto nulo.';
  }
  if (/^Indeferido/.test(c.situacao_do_registro)) {
    return `Atenção: o TSE indeferiu este registro, e ainda cabe recurso ("${c.situacao_do_registro}"). `
      + 'O nome continua na urna, mas se o indeferimento for mantido, os votos não valem.';
  }
  return `Atenção: o registro desta candidatura está como "${c.situacao_do_registro}" no TSE. O nome está na urna enquanto isso.`;
}

/** Recado curto logo abaixo do botão, para a ação nunca ser silenciosa. */
function avisar(botao, texto) {
  let p = botao.nextElementSibling;
  if (!p || !p.classList.contains('recado-colinha')) {
    p = document.createElement('p');
    p.className = 'discreto confianca recado-colinha';
    botao.after(p);
  }
  p.textContent = texto;
}

/**
 * Voto de legenda, oferecido na ficha do partido. Só aparece nos dois cargos
 * proporcionais, porque é só neles que ele existe.
 */
function blocoLegenda(sigla) {
  if (!estado.numerosPartido?.[sigla]) return null;
  const numero = estado.numerosPartido[sigla].numero;

  const caixa = document.createElement('section');
  caixa.className = 'sintese';

  const t = document.createElement('p');
  t.innerHTML = `<b>Não se decidiu por nenhum nome?</b> Você pode votar só no partido. `
    + `O número da legenda ${sigla} é <b>${numero}</b>.`;
  caixa.append(t);

  const nota = document.createElement('p');
  nota.className = 'discreto';
  nota.textContent = 'O voto de legenda conta para a bancada do partido, e só existe para deputado '
    + 'federal e deputado estadual. Senador, governador e presidente são cargos majoritários: '
    + 'ali o voto é sempre em uma pessoa, e digitar o número do partido não é voto de legenda.';
  caixa.append(nota);

  const acoes = document.createElement('div');
  acoes.className = 'acoes';
  for (const vaga of colinha.vagas().filter((v) => v.legenda)) {
    const b = document.createElement('button');
    b.className = 'discreta';
    const pintar = () => {
      const e = colinha.ler(vaga.id);
      const posto = e?.tipo === 'legenda' && e.partido === sigla;
      b.textContent = posto ? `✓ legenda ${sigla} em ${vaga.rotulo} — clique para tirar`
        : `Votar na legenda para ${vaga.rotulo}`;
    };
    b.addEventListener('click', () => { colinha.escolherLegenda(sigla, vaga.id); pintar(); });
    pintar();
    acoes.append(b);
  }
  caixa.append(acoes);
  return caixa;
}

function desenharColinha() {
  const alvo = $('lista-colinha');
  alvo.textContent = '';

  for (const { vaga, escolha } of colinha.linhas()) {
    const bloco = document.createElement('article');
    bloco.className = 'cartao-eixo';

    const cabeca = document.createElement('header');
    const h = document.createElement('h3');
    h.textContent = vaga.rotulo;
    cabeca.append(h);

    const num = colinha.numeroFormatado(escolha);
    if (num) {
      const v = document.createElement('span');
      v.className = 'valor';
      v.style.fontFamily = 'ui-monospace, Menlo, Consolas, monospace';
      v.style.fontSize = '1.4rem';
      v.textContent = num;
      cabeca.append(v);
    }
    bloco.append(cabeca);

    const linha = document.createElement('p');
    linha.style.margin = '0';
    if (!escolha) {
      linha.className = 'discreto';
      linha.textContent = 'em branco — você não escolheu ninguém para esta vaga';
    } else if (escolha.tipo === 'legenda') {
      linha.textContent = `Legenda ${escolha.partido} — voto no partido, sem nome`;
    } else {
      linha.textContent = `${escolha.nome} · ${escolha.partido}`;
    }
    bloco.append(linha);

    // Número com tamanho errado é erro visível. Melhor a colinha reclamar aqui
    // do que a pessoa descobrir na urna.
    const problema = escolha ? colinha.conferirNumero(vaga, escolha) : null;
    if (problema) {
      const alerta = document.createElement('p');
      alerta.className = 'discreto confianca';
      alerta.style.color = 'var(--cobre)';
      alerta.textContent = `confira este número: ${problema}`;
      bloco.append(alerta);
    }

    if (escolha) {
      const tirar = document.createElement('button');
      tirar.className = 'discreta';
      tirar.style.marginTop = '.6rem';
      tirar.textContent = 'Tirar';
      tirar.addEventListener('click', () => { colinha.limparVaga(vaga.id); desenharColinha(); });
      bloco.append(tirar);
    }

    alvo.append(bloco);
  }

  const vazias = colinha.total() - colinha.quantas();
  $('aviso-colinha').textContent = vazias
    ? `${vazias} ${vazias === 1 ? 'vaga está vazia' : 'vagas estão vazias'}. Você pode baixar assim mesmo — `
      + 'em branco é uma decisão, e a colinha não vai preencher nada por você.'
    : 'As seis vagas estão preenchidas.';
}

/* ---------------------------------------------------------------- início */

(async function iniciar() {
  $('botao-voltar-partido').addEventListener('click', () => { if (estado.partidoAberto) ir(`partido/${estado.partidoAberto}`); });
  window.addEventListener('hashchange', rotear);
  $('ficha-abas').addEventListener('click', (ev) => {
    const b = ev.target.closest('button[data-aba]');
    if (!b || b.disabled || !estado.partidoAberto) return;
    ir(`partido/${estado.partidoAberto}/${b.dataset.aba}`);
  });

  // "Meu resultado" sai desta página: a colinha, que vive só na memória da
  // aba, se perderia. Avisar antes é o mínimo.
  $('nav-resultado').addEventListener('click', (ev) => {
    const n = colinha.quantas();
    if (n && !window.confirm(`Sua colinha tem ${n} ${n === 1 ? 'nome' : 'nomes'} e será apagada ao voltar para o resultado, `
      + 'porque o Prumo não guarda nada. Baixe a colinha antes, se quiser. Voltar assim mesmo?')) ev.preventDefault();
  });
  $('botao-teste').addEventListener('click', () => {
    window.location.href = estado.perfil
      ? `../?p=${encodeURIComponent(codigoAtual())}`
      : '../index.html';
  });
  $('form-recuperar').addEventListener('submit', (ev) => {
    ev.preventDefault();
    try {
      const { codigo } = recuperar($('campo-codigo').value);
      // Recarrega com o código no endereço: o mesmo caminho de quem vem da
      // etapa 1, sem um segundo jeito de montar o ranking.
      window.location.search = `?p=${encodeURIComponent(codigo)}`;
    } catch (e) {
      $('erro-codigo').textContent = e.message;
      $('erro-codigo').classList.remove('oculto');
    }
  });
  $('botao-abrir-colinha').addEventListener('click', () => ir('colinha'));
  $('botao-limpar-colinha').addEventListener('click', () => { colinha.limparTudo(); desenharColinha(); });
  $('botao-baixar-colinha').addEventListener('click', async () => {
    const b = $('botao-baixar-colinha');
    const antes = b.textContent;
    b.disabled = true; b.textContent = 'montando…';
    try { await colinha.baixarPdf(); b.textContent = antes; }
    catch (e) { b.textContent = antes; $('aviso-colinha').textContent = `Não deu para montar o arquivo: ${e.message}`; }
    finally { b.disabled = false; }
  });

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (!$('tela-ficha').classList.contains('oculto')) $('botao-voltar-galeria').click();
  });

  try {
    await carregar();
    colinha.configurar({
      partidos: estado.numerosPartido || {},
      aoMudar: () => {
        const n = colinha.quantas();
        $('botao-abrir-colinha').textContent = n ? `Minha colinha (${n})` : 'Minha colinha';
        $('nav-colinha').textContent = n ? `Colinha (${n})` : 'Colinha';
      },
    });
    estado.perfil = lerPerfilDaUrl();
    if (estado.perfil) {
      estado.alinhamento = alinhar(estado.perfil, estado.revelado);
      desenharPerfil();
      const cod = encodeURIComponent(codigoAtual());
      $('nav-resultado').href = `../?p=${cod}`;
      $('nav-meus').classList.remove('oculto');
    } else {
      $('nav-resultado').textContent = 'Fazer o teste';
    }
    rotear();
  } catch (e) {
    $('intro-galeria').textContent = `Não foi possível carregar os dados: ${e.message}`;
  }
}());

/* ------------------------------------------------- etapa 3: candidatos */

const ROTULO_EVIDENCIA = {
  medido: 'com voto medido',
  'medido-fraco': 'esteve na Câmara, faltou demais',
  'medido-alesc': 'voto medido na Assembleia de SC',
  'com-mandato': 'já exerceu mandato',
  tentou: 'já concorreu, nunca eleito',
  estreante: 'primeira candidatura',
};

/** Ordem da escada: quem tem mais evidência aparece primeiro. */
const ORDEM_EVIDENCIA = ['medido', 'medido-alesc', 'medido-fraco', 'com-mandato', 'tentou', 'estreante'];

const dinheiro = (n) => (typeof n === 'number'
  ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
  : null);

function candidatosDoPartido(sigla) {
  if (!estado.candidatos) return [];
  // O partido do candidato em 2026 é o que vale para a urna. Quem votou por
  // outra legenda aparece na aba do partido ATUAL, com o aviso na ficha.
  return estado.candidatos.candidatos.filter((c) => mesmaSigla(c.partido, sigla));
}

const frasesDe = (id) => estado.campanha?.frases?.[id] || [];

/** Rótulo curto da origem: "no santinho", "segundo NSC Total". */
function origemDaFrase(f) {
  if (f.tipo === 'imprensa') return `segundo ${f.veiculo}`;
  const meio = { 'horario-eleitoral': 'horário eleitoral', santinho: 'santinho' }[f.meio] || f.meio;
  return `material do candidato · ${meio}`;
}

function cartaoCandidato(c) {
  const cartao = document.createElement('article');
  cartao.className = 'cartao-eixo';
  cartao.style.cursor = 'pointer';
  cartao.tabIndex = 0;
  cartao.setAttribute('role', 'button');

  const cabeca = document.createElement('header');
  const titulo = document.createElement('h3');
  titulo.textContent = c.nome;
  cabeca.append(titulo);

  // Só quem tem voto medido NA CÂMARA recebe número. Quem foi medido na
  // Assembleia tem posição em dois eixos, sobre outro tipo de competência — dar
  // a ele um índice com a mesma aparência seria dizer que as duas medidas são
  // comparáveis, e não são.
  if (c.evidencia === 'medido' && estado.perfil) {
    const valor = document.createElement('span');
    valor.className = 'valor';
    valor.textContent = `${compatibilidade(estado.perfil.posicao, estado.perfil.confianca, c.medicao.posicao)}%`;
    cabeca.append(valor);
  }
  cartao.append(cabeca);

  const linha = document.createElement('p');
  linha.className = 'discreto';
  linha.style.margin = '0';
  linha.append(Object.assign(document.createElement('b'), { className: 'numero-urna', textContent: c.numero }));
  linha.append(` · ${c.cargo}${c.ocupacao ? ` · ${c.ocupacao.toLowerCase()}` : ''}`);
  cartao.append(linha);

  // A frase de campanha vem antes de tudo o mais: é o que a pessoa DIZ, e é o
  // que o eleitor reconhece da rua. Só a primeira; as outras, na ficha.
  const frase = frasesDe(c.id)[0];
  if (frase) {
    const q = document.createElement('blockquote');
    q.className = 'frase-cartao';
    q.textContent = `“${frase.texto}”`;
    const o = document.createElement('p');
    o.className = 'discreto confianca';
    o.style.marginTop = '.2rem';
    o.textContent = origemDaFrase(frase);
    cartao.append(q, o);
  }

  const selo = document.createElement('p');
  selo.className = 'discreto confianca';
  selo.textContent = ROTULO_EVIDENCIA[c.evidencia] || c.evidencia;
  cartao.append(selo);

  if (c.situacao_do_registro !== 'Deferido') {
    const aviso = document.createElement('p');
    aviso.className = 'discreto confianca';
    aviso.style.color = 'var(--cobre)';
    aviso.textContent = c.na_urna === false
      ? `não está na urna · ${c.situacao_do_registro.toLowerCase()}`
      : `registro: ${c.situacao_do_registro.toLowerCase()} · continua na urna`;
    cartao.append(aviso);
  }

  const abrir = () => ir(`candidato/${c.id}`);
  cartao.addEventListener('click', abrir);
  cartao.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); abrir(); } });
  return cartao;
}

/**
 * Ordem dos cargos na lista do partido. Não é alfabética nem por tamanho: é a
 * ordem em que a urna pede o voto, de cima para baixo.
 *
 * A urna de 2026 pede SEIS votos, nesta ordem: deputado federal, deputado
 * estadual, senador (primeira vaga), senador (segunda vaga), governador e
 * presidente. Fonte: TSE, "Eleições 2026: conheça a ordem de votação na urna
 * eletrônica".
 *
 * Esta lista já esteve errada, começando por Senador — foi escrita de memória,
 * com a justificativa de que seguia a urna, que era exatamente o que ela não
 * fazia. Quem confere a colinha contra a tela da urna repara na hora.
 */
const ORDEM_CARGO = ['Deputado Federal', 'Deputado Estadual', 'Senador'];

function desenharCandidatosDoPartido(sigla) {
  const secao = $('secao-candidatos');
  const lista = $('lista-candidatos');
  lista.textContent = '';

  const cands = candidatosDoPartido(sigla);
  if (!cands.length) { secao.classList.add('oculto'); return; }
  secao.classList.remove('oculto');

  const uf = estado.candidatos.uf;
  $('titulo-candidatos') .textContent = `Quem concorre por este partido em ${uf}`;

  const medidos = cands.filter((c) => c.evidencia === 'medido').length;
  const alesc = cands.filter((c) => c.evidencia === 'medido-alesc').length;
  const nCargos = new Set(cands.map((c) => c.cargo)).size;
  const emCargos = ['', '', 'em dois cargos', 'em três cargos'][nCargos] || '';
  $('intro-candidatos').textContent =
    `${cands.length} ${cands.length === 1 ? 'candidato' : 'candidatos'}${emCargos ? ` ${emCargos}` : ''}. `
    + (medidos
      ? `${medidos} ${medidos === 1 ? 'tem' : 'têm'} voto nominal na Câmara. `
      : 'Nenhum tem voto nominal na Câmara. ')
    + (alesc
      ? `${alesc} ${alesc === 1 ? 'tem' : 'têm'} voto nominal na Assembleia de Santa Catarina, que mede dois eixos e não os cinco. `
      : '')
    + (medidos + alesc
      ? 'Os demais aparecem com o que existe sobre eles, sem posição inventada. '
      : 'Todos aparecem com o que existe sobre eles, sem posição inventada. ')
    + 'A posição do partido nunca é atribuída à pessoa.'
    + (() => {
      const n = cands.filter((c) => frasesDe(c.id).length).length;
      return n ? ` ${n} de ${cands.length} têm frase de campanha coletada; a quantidade varia de partido para partido, conforme o material com fonte que cada candidatura publica.` : '';
    })();

  // Uma lista corrida de 57 nomes em três cargos diferentes não é uma lista, é
  // um monte. Separar por cargo é o mínimo para o eleitor achar o voto que ele
  // está decidindo agora.
  const cargos = [...new Set(cands.map((c) => c.cargo))]
    .sort((a, b) => ORDEM_CARGO.indexOf(a) - ORDEM_CARGO.indexOf(b));

  for (const cargo of cargos) {
    const doCargo = cands.filter((c) => c.cargo === cargo)
      .sort((a, b) => ORDEM_EVIDENCIA.indexOf(a.evidencia) - ORDEM_EVIDENCIA.indexOf(b.evidencia)
        || a.nome.localeCompare(b.nome));

    const titulo = document.createElement('h4');
    titulo.className = 'titulo-cargo';
    titulo.textContent = `${cargo} · ${doCargo.length}`;
    lista.append(titulo);

    const grade = document.createElement('div');
    grade.className = 'cartoes';
    for (const c of doCargo) grade.append(cartaoCandidato(c));
    lista.append(grade);
  }
}

function desenharCampanha(c) {
  const alvo = $('cand-campanha');
  alvo.textContent = '';
  const h = document.createElement('h2');
  h.textContent = 'O que o candidato diz na campanha';
  alvo.append(h);

  const lista = frasesDe(c.id);
  if (!lista.length) {
    const p = document.createElement('p');
    p.className = 'discreto';
    p.textContent = 'Ainda não há frase de campanha coletada para esta candidatura. Isso não diz nada sobre ela: '
      + 'só que o Prumo não encontrou material com fonte que qualquer pessoa possa conferir.';
    alvo.append(p);
    return;
  }
  for (const f of lista) {
    const bloco = document.createElement('figure');
    bloco.className = 'frase-ficha';
    const q = document.createElement('blockquote');
    q.className = 'citacao';
    q.textContent = f.texto;
    bloco.append(q);
    if (f.descricao) {
      const d = document.createElement('p');
      d.className = 'discreto';
      d.style.margin = '.4rem 0 0';
      d.textContent = f.descricao;
      bloco.append(d);
    }
    const cap = document.createElement('figcaption');
    cap.className = 'discreto confianca';
    cap.append(`${origemDaFrase(f)}${f.data ? ` · ${f.data.split('-').reverse().join('/')}` : ''} · `);
    const a = document.createElement('a');
    a.href = f.fonte; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'ver a fonte';
    cap.append(a);
    bloco.append(cap);
    alvo.append(bloco);
  }
  const nota = document.createElement('p');
  nota.className = 'discreto';
  nota.textContent = 'Frases transcritas literalmente. São o que a pessoa diz, não o que fez — e não entram em nenhuma conta de alinhamento.';
  alvo.append(nota);
}

// ------------------------------------------------------------- força eleitoral
// Decisão de Talyz (27/09/2026, spec seção 12): mostrar dinheiro de campanha,
// votos na última eleição e seguidores, para o eleitor não gastar o voto em
// candidatura sem chance nenhuma. Três travas: os números ficam atrás de uma
// tarja que só o eleitor retira; nenhum rótulo de "chance" é calculado; a ordem
// das listas não muda. A tarja vale para a sessão inteira depois de retirada, e
// some junto com a aba, como todo o resto.
const reais = (v) => `R$ ${Math.round(v).toLocaleString('pt-BR')}`;
const milhar = (v) => Number(v).toLocaleString('pt-BR');

function desenharForca(c) {
  const alvo = $('cand-forca');
  if (!alvo) return;
  alvo.textContent = '';
  const f = estado.forca?.candidatos?.[c.id];
  if (!f) return;

  const h = document.createElement('h2');
  h.textContent = 'Sinais de força eleitoral';
  alvo.append(h);

  if (!estado.forcaRevelada) {
    const tarja = document.createElement('div');
    tarja.className = 'tarja';
    const p = document.createElement('p');
    p.textContent = 'Aqui estão quanto dinheiro esta candidatura recebeu e quantos votos a pessoa teve na última eleição que disputou'
      + (f.seguidores ? ', além do número de seguidores' : '') + '. '
      + 'Esses números podem influenciar a sua escolha, e por isso ficam escondidos até você pedir. '
      + 'Nenhum deles diz se a pessoa vai se eleger.';
    const b = document.createElement('button');
    b.textContent = 'Mostrar os números';
    b.addEventListener('click', () => { estado.forcaRevelada = true; desenharForca(c); });
    tarja.append(p, b);
    alvo.append(tarja);
    return;
  }

  const lista = document.createElement('ul');
  lista.className = 'forca';

  // Dinheiro
  const liD = document.createElement('li');
  const quando = f.contas_atualizadas_em ? ` até ${f.contas_atualizadas_em}` : '';
  if (!f.contas_atualizadas_em) {
    liD.textContent = 'Dinheiro de campanha: nenhuma prestação de contas publicada pelo TSE até agora.';
  } else if (!f.recebido) {
    liD.textContent = `Dinheiro de campanha: nada declarado${quando}.`;
  } else {
    liD.textContent = `Dinheiro de campanha: recebeu ${reais(f.recebido)}${quando}`
      + (f.fundo_eleitoral ? `, dos quais ${reais(f.fundo_eleitoral)} do fundo eleitoral, que é público e distribuído pelo partido.` : '.');
  }
  lista.append(liD);

  // Votos
  const liV = document.createElement('li');
  const u = f.ultima_eleicao;
  if (!u) {
    liV.textContent = 'Última eleição: segundo o TSE, nunca disputou um cargo com voto próprio.';
  } else {
    const onde = u.local ? ` (${u.local})` : '';
    liV.textContent = `Última eleição: em ${u.ano}, para ${u.cargo.toLowerCase()}${onde}, `
      + (u.votos != null ? `${milhar(u.votos)} ${Number(u.votos) === 1 ? 'voto' : 'votos'}. Resultado: ${u.resultado}.`
        : `resultado: ${u.resultado}. O TSE não publica o número de votos dessa eleição no formato que o Prumo lê.`);
  }
  lista.append(liV);

  // Seguidores, só quando houver coleta
  if (f.seguidores) {
    const liS = document.createElement('li');
    const sg = f.seguidores;
    const qtd = sg.aproximado
      ? (sg.n >= 1000000 ? `cerca de ${milhar(Math.round(sg.n / 100000) / 10)} milhões` : `cerca de ${milhar(Math.round(sg.n / 1000))} mil`)
      : milhar(sg.n);
    liS.textContent = `Seguidores no Instagram: ${qtd} no perfil @${sg.perfil}, que a pessoa declarou ao TSE, em ${sg.data}. `
      + 'Contagem feita pelo Prumo, não é dado oficial.'
      + (sg.talvez_nao_principal
        ? ' Atenção: a pessoa teve muitos votos na última eleição e este perfil tem poucos seguidores; talvez não seja o perfil principal dela.'
        : '');
    lista.append(liS);
  }
  alvo.append(lista);

  const aviso = document.createElement('p');
  aviso.className = 'aviso-destaque';
  aviso.textContent = 'Seguidor não é voto: muita gente segue sem votar, e muita gente vota sem seguir. '
    + 'Dinheiro de campanha também não garante eleição. Estes números servem para ter uma ideia de quem tem estrutura '
    + 'de campanha e de quem quase não tem. Eles podem pesar na sua escolha, e cabe a você decidir se devem pesar.';
  alvo.append(aviso);

  const fonte = document.createElement('p');
  fonte.className = 'discreto';
  fonte.append('Fontes: prestação de contas e registro no TSE (');
  const a = document.createElement('a');
  a.href = `https://divulgacandcontas.tse.jus.br/divulga/#/candidato/2026/20322002026/SC/${c.id}`;
  a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'ver a ficha no TSE';
  fonte.append(a, ') e resultados oficiais do TSE. Valores arredondados.');
  alvo.append(fonte);

  const esconder = document.createElement('button');
  esconder.className = 'discreta';
  esconder.textContent = 'Esconder estes números de novo';
  esconder.addEventListener('click', () => { estado.forcaRevelada = false; desenharForca(c); });
  alvo.append(esconder);
}

function abrirCandidato(id) {
  const c = estado.candidatos?.candidatos.find((x) => String(x.id) === String(id));
  if (!c) return;

  $('cand-nome').textContent = c.nome;
  $('cand-linha').textContent = `${c.cargo} · ${c.partido} · número ${c.numero}`
    + (c.coligacao ? ` · ${c.coligacao}` : '');
  $('cand-evidencia').textContent = c.evidencia_texto;
  desenharCampanha(c);
  desenharForca(c);

  const avisoReg = $('cand-aviso-registro');
  avisoReg.textContent = textoDoRegistro(c);

  // ---------------------------------------------------------- medição
  const alvoMed = $('cand-medicao');
  alvoMed.textContent = '';

  // Medição na Assembleia: dois eixos, catálogo de oito votações, competência
  // estadual. Aparece como régua por eixo, nunca como radar — radar dos cinco
  // eixos com três vazios sugeriria que os três foram medidos e deram zero.
  if (c.evidencia === 'medido-alesc') {
    const m = c.medicao_alesc;
    const h = document.createElement('h2');
    h.textContent = 'O que os votos na Assembleia revelam';
    const nota = document.createElement('p');
    nota.className = 'discreto';
    nota.textContent = `Esta pessoa não tem voto na Câmara, mas tem na Assembleia Legislativa de Santa Catarina: `
      + `votou em ${m.votou} das 8 votações do catálogo estadual. `
      + 'Isso mede política estadual, que não tem privatização, reforma tributária ampla nem legislação trabalhista — '
      + 'as votações perguntam, no fundo, se o Estado deve criar programa, obrigar e regular. '
      + 'Não é a mesma pergunta da etapa 1, e por isso não vira índice de compatibilidade.';
    alvoMed.append(h, nota);

    const tabA = document.createElement('div');
    tabA.className = 'cartoes';
    for (const k of EIXOS) {
      const eixo = estado.eixos.find((e) => e.codigo === k);
      if (!eixo) continue;
      const temBase = m.eixos_com_base.includes(k);
      const cart = document.createElement('article');
      cart.className = 'cartao-eixo';
      const hh = document.createElement('header');
      const t3 = document.createElement('h3');
      t3.textContent = eixo.nome;
      const val = document.createElement('span');
      val.className = 'valor';
      if (temBase) {
        const v = m.posicao[k];
        const polo = v === 0 ? null : (v < 0 ? eixo.polo_negativo : eixo.polo_positivo);
        val.textContent = polo ? `${polo.nome} ${Math.abs(v)}%` : 'no meio';
      } else {
        val.textContent = 'não medido';
        val.style.opacity = '0.6';
      }
      hh.append(t3, val);
      cart.append(hh);

      const selo = document.createElement('p');
      selo.className = 'discreto confianca';
      selo.textContent = temBase
        ? `${m.confianca[k]}% do catálogo estadual neste eixo`
        : 'as votações da Assembleia não medem este eixo';
      cart.append(selo);
      tabA.append(cart);
    }
    alvoMed.append(tabA);
  }

  if (c.evidencia === 'medido') {
    const h = document.createElement('h2');
    h.textContent = 'A posição que os votos revelam';
    alvoMed.append(h);

    if (c.medicao.mudou_de_partido) {
      const p = document.createElement('p');
      p.className = 'discreto confianca';
      p.textContent = `Este histórico foi feito pelo ${c.medicao.partido_na_epoca}. A pessoa concorre em 2026 pelo ${c.partido}.`;
      alvoMed.append(p);
    }

    const g = document.createElement('div');
    g.className = 'grafico';
    g.innerHTML = radar(
      c.medicao.posicao,
      c.medicao.confianca,
      estado.eixos,
      { ...coresDoTema(), ...(estado.perfil ? { comparacao: { posicao: estado.perfil.posicao } } : {}) }
    );
    alvoMed.append(g);

    if (estado.perfil) {
      const leg = document.createElement('p');
      leg.className = 'discreto';
      const pct = compatibilidade(estado.perfil.posicao, estado.perfil.confianca, c.medicao.posicao);
      leg.textContent = `Linha cheia: ${c.nome}. Linha tracejada: você. Compatibilidade de ${pct}%, `
        + 'calculada do mesmo jeito que a dos partidos — e sujeita à mesma margem de erro.';
      alvoMed.append(leg);
    }

    const tab = document.createElement('div');
    tab.className = 'cartoes';
    for (const k of EIXOS) {
      const eixo = estado.eixos.find((e) => e.codigo === k);
      const v = c.medicao.posicao[k];
      const cart = document.createElement('article');
      cart.className = 'cartao-eixo';
      const hh = document.createElement('header');
      const t3 = document.createElement('h3');
      t3.textContent = eixo?.nome || k;
      const val = document.createElement('span');
      val.className = 'valor';
      val.textContent = `${Math.abs(v)}%`;
      hh.append(t3, val);
      const pol = document.createElement('p');
      pol.className = 'discreto';
      pol.style.margin = '0';
      pol.textContent = v === 0 ? 'no meio' : (v < 0 ? eixo?.polo_negativo?.nome : eixo?.polo_positivo?.nome) || '';
      cart.append(hh, pol);
      tab.append(cart);
    }
    alvoMed.append(tab);

    const rod = document.createElement('p');
    rod.className = 'discreto confianca';
    rod.textContent = `Baseado em ${c.medicao.votacoes_com_posicao} das ${c.medicao.votacoes_do_catalogo} votações do catálogo · confiança média ${c.medicao.confianca_media}%.`;
    alvoMed.append(rod);
  }

  // -------------------------------------------------------- histórico
  const alvoHist = $('cand-historico');
  alvoHist.textContent = '';
  if (c.candidaturas_anteriores?.length) {
    const h = document.createElement('h2');
    h.textContent = 'Candidaturas anteriores';
    const p = document.createElement('p');
    p.className = 'discreto';
    p.textContent = 'Do registro do TSE. Não diz como a pessoa votou nem o que fez no mandato — '
      + 'diz onde ela esteve, e onde você pode procurar o resto.';
    alvoHist.append(h, p);

    const ul = document.createElement('div');
    for (const e of c.candidaturas_anteriores) {
      const linha = document.createElement('p');
      linha.style.margin = '.35rem 0';
      const eleito = /^Eleito/i.test(e.resultado || '');
      linha.innerHTML = `<b>${e.ano}</b> · ${e.cargo} por ${e.partido} em ${e.local.toLowerCase()} — `;
      const res = document.createElement('span');
      res.textContent = e.resultado;
      if (eleito) { res.style.color = 'var(--cobre)'; res.style.fontWeight = '600'; }
      linha.append(res);
      ul.append(linha);
    }
    alvoHist.append(ul);
  }

  // ------------------------------------------------ o que o TSE registra
  const alvoReg = $('cand-registro');
  alvoReg.textContent = '';
  const h2 = document.createElement('h2');
  h2.textContent = 'O que consta no registro';
  alvoReg.append(h2);

  const itens = [
    ['Ocupação declarada', c.ocupacao],
    ['Patrimônio declarado', dinheiro(c.patrimonio_declarado)],
    ['Situação do registro', c.situacao_do_registro],
    ['Coligação ou federação', c.coligacao],
  ].filter(([, v]) => v);

  for (const [rot, val] of itens) {
    const p = document.createElement('p');
    p.style.margin = '.3rem 0';
    p.innerHTML = `<span class="discreto">${rot}:</span> `;
    p.append(document.createTextNode(String(val)));
    alvoReg.append(p);
  }

  if (c.site_declarado && /^https?:\/\/\S+\.\S+/i.test(c.site_declarado)) {
    const p = document.createElement('p');
    p.style.margin = '.6rem 0 0';
    const a = document.createElement('a');
    a.href = c.site_declarado;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = 'Link que a própria pessoa registrou no TSE';
    p.append(a);
    alvoReg.append(p);
  }

  const fonte = document.createElement('p');
  fonte.className = 'discreto confianca';
  fonte.style.marginTop = '1rem';
  fonte.textContent = `Fonte: ${estado.candidatos.fonte}.`;
  alvoReg.append(fonte);

  alvoReg.append(botaoColinha(c, c.cargo));

  mostrar('tela-candidato');
}

/* ------------------------------------------------ etapa 3: o Executivo */

/**
 * Presidente e governador entram por seção própria, não pela aba do partido.
 *
 * Não é preferência de layout. Dos 15 partidos com candidato ao Executivo em
 * 2026, oito não têm ficha na etapa 2 porque não têm bancada medida na Câmara —
 * PRTB, MISSÃO, DEMOCRATA, DC, PCB, PSTU, UP e PCO. Pendurar o Executivo na aba
 * do partido sumiria com oito candidaturas, entre elas todas as de esquerda fora
 * do PT. Quem não tem bancada continua tendo candidato, e o eleitor vota no nome.
 */

const ROTULO_EXECUTIVO = {
  plano: 'plano de governo lido',
  'plano-ilegivel': 'plano registrado, mas ilegível',
  'sem-plano': 'não registrou plano',
  'plano-pendente': 'plano ainda não lido pelo Prumo',
};

function cartaoExecutivo(c) {
  const cartao = document.createElement('article');
  cartao.className = 'cartao-eixo';
  cartao.style.cursor = 'pointer';
  cartao.tabIndex = 0;
  cartao.setAttribute('role', 'button');

  const cabeca = document.createElement('header');
  const titulo = document.createElement('h3');
  titulo.textContent = c.nome;
  cabeca.append(titulo);

  // Número só apareceria se a confiança do plano passasse a mesma trava da
  // etapa 2. Em 2026 nenhum plano passa, e é isso que o cartão diz.
  if (c.permite_compatibilidade && estado.perfil) {
    const valor = document.createElement('span');
    valor.className = 'valor';
    valor.textContent = `${compatibilidade(estado.perfil.posicao, estado.perfil.confianca, c.posicao)}%`;
    cabeca.append(valor);
  }
  cartao.append(cabeca);

  const linha = document.createElement('p');
  linha.className = 'discreto';
  linha.style.margin = '0';
  linha.textContent = `${c.partido} · ${c.cargo_nome}`;
  cartao.append(linha);

  const selo = document.createElement('p');
  selo.className = 'discreto confianca';
  if (c.evidencia === 'plano') {
    const n = c.eixos_com_base.length;
    selo.textContent = n
      ? `plano lido · ${c.temas_respondidos} de ${c.temas_no_catalogo} temas · posição firme em ${n === 1 ? '1 eixo' : `${n} eixos`}`
      : `plano lido · ${c.temas_respondidos} de ${c.temas_no_catalogo} temas · sem base firme em nenhum eixo`;
  } else {
    selo.textContent = ROTULO_EXECUTIVO[c.evidencia] || c.evidencia;
  }
  cartao.append(selo);

  if (c.situacao_do_registro && c.situacao_do_registro !== 'Deferido') {
    const aviso = document.createElement('p');
    aviso.className = 'discreto confianca';
    aviso.style.color = 'var(--cobre)';
    aviso.textContent = c.na_urna === false
      ? `não está na urna · ${c.situacao_do_registro.toLowerCase()}`
      : `registro: ${c.situacao_do_registro.toLowerCase()} · está na urna`;
    cartao.append(aviso);
  }

  const abrir = () => ir(`executivo/${c.id}`);
  cartao.addEventListener('click', abrir);
  cartao.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); abrir(); } });
  return cartao;
}

function desenharExecutivo() {
  const secao = $('secao-executivo');
  if (!estado.executivo) { secao.classList.add('oculto'); return; }
  secao.classList.remove('oculto');

  const cands = estado.executivo.candidatos;
  const lidos = cands.filter((c) => c.evidencia === 'plano');
  const comBase = lidos.filter((c) => c.eixos_com_base.length).length;

  $('intro-executivo').textContent =
    `Presidente e governador são os únicos cargos que registram plano de governo no TSE. `
    + `${cands.filter((c) => c.evidencia !== 'plano-pendente').length} planos de 2026 foram lidos contra um catálogo fixo de `
    + `${estado.executivo.catalogo.temas} temas. Isto mede o que a pessoa diz que vai fazer — `
    + `nunca o que ela fez. De ${lidos.length} planos legíveis, ${comBase} chegam a ter posição firme `
    + `em pelo menos um eixo, e nenhum diz o bastante para virar um índice de compatibilidade.`;

  const lista = $('lista-executivo');
  lista.textContent = '';
  // Quem não está na urna vai para o fim: continua visível, com o aviso, mas
  // não fica entre as opções de voto.
  const ordenados = [...cands].sort((a, b) => (a.na_urna === false) - (b.na_urna === false));
  for (const c of ordenados) lista.append(cartaoExecutivo(c));
}

/** Régua de um eixo, marcando se aquele eixo tem base ou não. */
function reguaDoEixo(c, k) {
  const eixo = estado.eixos.find((e) => e.codigo === k);
  if (!eixo) return null;
  const valor = c.posicao[k];
  const conf = c.confianca[k];
  const temBase = c.eixos_com_base.includes(k);

  const cartao = document.createElement('article');
  cartao.className = 'cartao-eixo';

  const cabeca = document.createElement('header');
  const h = document.createElement('h3');
  h.textContent = eixo.nome;
  const v = document.createElement('span');
  v.className = 'valor';
  if (temBase) {
    const polo = valor === 0 ? null : (valor < 0 ? eixo.polo_negativo : eixo.polo_positivo);
    v.textContent = polo ? `${polo.nome} ${Math.abs(valor)}%` : 'no meio';
  } else {
    v.textContent = 'não dá para dizer';
    v.style.opacity = '0.6';
  }
  cabeca.append(h, v);
  cartao.append(cabeca);

  if (temBase) {
    const regua = document.createElement('div');
    regua.className = 'regua';
    const marcador = document.createElement('span');
    marcador.className = 'marcador';
    marcador.style.left = `${(valor + 100) / 2}%`;
    regua.append(marcador);
    if (estado.perfil) {
      const meu = document.createElement('span');
      meu.className = 'marcador incerto';
      meu.style.left = `${((estado.perfil.posicao[k] || 0) + 100) / 2}%`;
      meu.title = 'você';
      regua.append(meu);
    }
    const polos = document.createElement('div');
    polos.className = 'polos';
    const e1 = document.createElement('span');
    e1.textContent = eixo.polo_negativo.nome;
    const e2 = document.createElement('span');
    e2.textContent = eixo.polo_positivo.nome;
    polos.append(e1, e2);
    cartao.append(regua, polos);
  }

  const selo = document.createElement('p');
  selo.className = 'discreto confianca';
  // Três recados diferentes, porque 0%, 19% e 53% não querem dizer a mesma coisa.
  // Chamar 53% de "pouca coisa" seria tão enganoso quanto exibir a posição: o
  // plano falou bastante do eixo e ainda assim não o bastante para a trava.
  const minimo = estado.executivo.confianca_minima;
  selo.textContent = temBase
    ? `o plano toma lado em ${conf}% dos temas deste eixo — o bastante para afirmar a posição`
    : (conf === 0
      ? 'o plano não toca em nenhum tema deste eixo'
      : conf < 30
        ? `o plano mal toca neste eixo (${conf}%) — longe do necessário para afirmar uma posição`
        : `o plano toca em ${conf}% dos temas deste eixo, abaixo dos ${minimo}% que o Prumo exige para afirmar uma posição`);
  cartao.append(selo);

  return cartao;
}

function abrirExecutivo(id) {
  if (!estado.executivo) return;
  const c = estado.executivo.candidatos.find((x) => String(x.id) === String(id));
  if (!c) return;

  $('exec-nome').textContent = c.nome;
  $('exec-linha').textContent = `${c.partido} · ${c.cargo_nome}`;

  const alvoEixos = $('exec-eixos');
  const alvoPass = $('exec-passagens');
  alvoEixos.textContent = '';
  alvoPass.textContent = '';

  const registro = textoDoRegistro(c);

  if (c.evidencia === 'plano-pendente') {
    $('exec-sintese').textContent = (registro ? `${registro} ` : '')
      + (c.observacao_registro || 'O plano de governo desta candidatura ainda não foi lido pelo Prumo.');
    $('exec-base').textContent = 'Sem leitura do plano, o Prumo não atribui posição nenhuma.';
    mostrar('tela-executivo');
    return;
  }

  if (c.evidencia !== 'plano') {
    $('exec-sintese').textContent = c.evidencia === 'plano-ilegivel'
      ? 'Esta pessoa registrou plano de governo no TSE, mas o arquivo é uma imagem: não tem texto dentro. '
        + 'Não há uma linha que possa ser citada, e sem citação o Prumo não atribui posição nenhuma.'
      : 'Não consta plano de governo registrado para esta candidatura.';
    $('exec-base').textContent = c.evidencia === 'plano-ilegivel'
      ? `${c.paginas} páginas registradas, todas como imagem · isto é diferente de não ter registrado, e diferente de ter registrado e não dizer nada`
      : '';
    mostrar('tela-executivo');
    return;
  }

  $('exec-sintese').textContent = (registro ? `${registro} ` : '')
    + 'O que está abaixo é o que esta pessoa escreveu no plano de governo entregue ao TSE. '
    + 'É o que ela diz que vai fazer — não é o que ela fez. '
    + 'Toda posição vem acompanhada da passagem que a originou e da página, para você conferir no documento original.'
    // O plano lido por OCR não é igual aos outros, e quem vai conferir precisa
    // saber disso ANTES de comparar a passagem com o PDF: o texto aqui foi lido
    // por máquina a partir de uma imagem, e máquina troca letra e some com
    // palavra. Cada passagem foi conferida contra a imagem da página, mas o
    // leitor tem direito de saber que existiu esse passo a mais.
    + (c.leitura
      ? ' Atenção: este plano foi registrado como imagem, sem texto dentro. '
        + 'O texto foi obtido por leitura automática (OCR) das páginas, e cada passagem citada '
        + 'foi conferida contra a imagem da página original antes de virar posição.'
      : '');
  $('exec-base').textContent =
    `${c.temas_respondidos} dos ${c.temas_no_catalogo} temas do catálogo · `
    + `confiança média ${c.confianca_media}% · `
    + (c.permite_compatibilidade
      ? 'base suficiente para comparar com o seu perfil'
      : `abaixo dos ${estado.executivo.confianca_minima}% que o Prumo exige para calcular compatibilidade`);

  for (const k of EIXOS) {
    const cartao = reguaDoEixo(c, k);
    if (cartao) alvoEixos.append(cartao);
  }

  // As passagens. São o coração da etapa: sem elas, nada do que está acima
  // poderia ser afirmado, e o eleitor não teria como conferir.
  const titulo = document.createElement('h2');
  titulo.textContent = 'O que o plano diz, com todas as letras';
  const nota = document.createElement('p');
  nota.className = 'discreto';
  nota.textContent = `${c.passagens.length} trechos. Cada um é a frase do próprio documento, com a página.`;
  alvoPass.append(titulo, nota);

  for (const p of c.passagens) {
    const bloco = document.createElement('article');
    bloco.className = 'cartao-eixo';

    const cabeca = document.createElement('header');
    const h = document.createElement('h3');
    h.textContent = p.titulo;
    const v = document.createElement('span');
    v.className = 'valor';
    v.textContent = p.valor === 'favor' ? 'a favor' : 'contra';
    cabeca.append(h, v);

    const cita = document.createElement('blockquote');
    cita.style.margin = '0.6rem 0 0';
    cita.style.paddingLeft = '0.9rem';
    cita.style.borderLeft = '3px solid var(--cobre)';
    cita.textContent = `“${p.passagem}”`;

    const rodape = document.createElement('p');
    rodape.className = 'discreto confianca';
    rodape.textContent = `página ${p.pagina} do plano · pesa em ${p.eixos.map(nomeDoEixo).join(', ')}`;

    bloco.append(cabeca, cita, rodape);
    alvoPass.append(bloco);
  }

  alvoPass.append(botaoColinha(c, c.cargo));

  mostrar('tela-executivo');
}
