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
import { decodificar } from '../../js/perfil.js';
import { radar } from '../../js/grafico.js';
import { alinhar, confiancaDoPartido, CONFIANCA_MINIMA } from '../../js/alinhamento.js';

const $ = (id) => document.getElementById(id);

const estado = {
  eixos: null,
  revelado: null,
  nomes: null,
  catalogo: null,
  votos: null,
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
}

function lerPerfilDaUrl() {
  const codigo = new URLSearchParams(location.search).get('p');
  if (!codigo) return null;
  try {
    return decodificar(codigo);
  } catch (e) {
    console.warn('código de perfil inválido:', e.message);
    return null;
  }
}

const nomeDoEixo = (k) => estado.eixos.find((e) => e.codigo === k)?.nome || k;
const nomeDoPartido = (s) => estado.nomes[s]?.nome || s;

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

function mostrar(tela) {
  for (const id of ['tela-galeria', 'tela-ficha']) $(id).classList.toggle('oculto', id !== tela);
  window.scrollTo({ top: 0 });
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

  const abrir = () => abrirFicha(sigla);
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
  $('botao-teste').textContent = 'Refazer o teste';

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

function abrirFicha(sigla) {
  const partido = estado.revelado.partidos[sigla];
  if (!partido) return;

  $('ficha-sigla').textContent = sigla;
  $('ficha-nome').textContent = nomeDoPartido(sigla);

  const conf = Math.round(confiancaDoPartido(partido));
  $('ficha-sintese').textContent =
    `A posição abaixo foi calculada a partir dos votos da bancada em `
    + `${partido.votacoes} das ${estado.catalogo.votacoes.length} votações do catálogo. `
    + `Não vem do programa do partido nem do que ele diz sobre si mesmo.`;
  $('ficha-base').textContent =
    `${partido.bancada} deputados na maior votação · confiança média da medida: ${conf}%`;

  // Radar: o partido, com o usuário sobreposto quando houver perfil.
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
  mostrar('tela-ficha');
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

/* ---------------------------------------------------------------- início */

(async function iniciar() {
  $('botao-voltar-galeria').addEventListener('click', () => { desenharGaleria(); mostrar('tela-galeria'); });
  $('botao-teste').addEventListener('click', () => { window.location.href = '../index.html'; });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (!$('tela-ficha').classList.contains('oculto')) $('botao-voltar-galeria').click();
  });

  try {
    await carregar();
    estado.perfil = lerPerfilDaUrl();
    if (estado.perfil) {
      estado.alinhamento = alinhar(estado.perfil, estado.revelado);
      desenharPerfil();
    }
    desenharGaleria();
  } catch (e) {
    $('intro-galeria').textContent = `Não foi possível carregar os dados: ${e.message}`;
  }
}());
