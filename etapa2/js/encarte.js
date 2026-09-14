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
import { alinhar, confiancaDoPartido, compatibilidade, CONFIANCA_MINIMA } from '../../js/alinhamento.js';

const $ = (id) => document.getElementById(id);

const estado = {
  eixos: null,
  revelado: null,
  nomes: null,
  catalogo: null,
  votos: null,
  candidatos: null, // etapa 3: candidatos da UF, com escada de evidência
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
  for (const id of ['tela-galeria', 'tela-ficha', 'tela-candidato']) $(id).classList.toggle('oculto', id !== tela);
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
  desenharCandidatosDoPartido(sigla);
  estado.partidoAberto = sigla;
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
  $('botao-voltar-partido').addEventListener('click', () => { if (estado.partidoAberto) abrirFicha(estado.partidoAberto); });
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

/* ------------------------------------------------- etapa 3: candidatos */

const ROTULO_EVIDENCIA = {
  medido: 'com voto medido',
  'medido-fraco': 'esteve na Câmara, faltou demais',
  'com-mandato': 'já exerceu mandato',
  tentou: 'já concorreu, nunca eleito',
  estreante: 'primeira candidatura',
};

/** Ordem da escada: quem tem mais evidência aparece primeiro. */
const ORDEM_EVIDENCIA = ['medido', 'medido-fraco', 'com-mandato', 'tentou', 'estreante'];

const dinheiro = (n) => (typeof n === 'number'
  ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
  : null);

function candidatosDoPartido(sigla) {
  if (!estado.candidatos) return [];
  // O partido do candidato em 2026 é o que vale para a urna. Quem votou por
  // outra legenda aparece na aba do partido ATUAL, com o aviso na ficha.
  return estado.candidatos.candidatos.filter((c) => c.partido === sigla);
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

  // Só quem tem voto medido recebe número. Ninguém mais.
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
  linha.textContent = `${c.numero} · ${c.cargo}${c.ocupacao ? ` · ${c.ocupacao.toLowerCase()}` : ''}`;
  cartao.append(linha);

  const selo = document.createElement('p');
  selo.className = 'discreto confianca';
  selo.textContent = ROTULO_EVIDENCIA[c.evidencia] || c.evidencia;
  cartao.append(selo);

  if (c.situacao_do_registro !== 'Deferido') {
    const aviso = document.createElement('p');
    aviso.className = 'discreto confianca';
    aviso.style.color = 'var(--cobre)';
    aviso.textContent = `registro: ${c.situacao_do_registro.toLowerCase()}`;
    cartao.append(aviso);
  }

  const abrir = () => abrirCandidato(c.id);
  cartao.addEventListener('click', abrir);
  cartao.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); abrir(); } });
  return cartao;
}

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
  $('intro-candidatos').textContent =
    `${cands.length} ${cands.length === 1 ? 'candidato' : 'candidatos'}. `
    + (medidos
      ? `${medidos} ${medidos === 1 ? 'tem' : 'têm'} voto nominal na Câmara e por isso ${medidos === 1 ? 'recebe' : 'recebem'} posição própria — `
      : 'Nenhum tem voto nominal na Câmara para medir — ')
    + 'os demais aparecem com o que existe sobre eles, sem posição inventada. '
    + 'A posição do partido nunca é atribuída à pessoa.';

  cands.sort((a, b) => ORDEM_EVIDENCIA.indexOf(a.evidencia) - ORDEM_EVIDENCIA.indexOf(b.evidencia)
    || a.nome.localeCompare(b.nome));
  for (const c of cands) lista.append(cartaoCandidato(c));
}

function abrirCandidato(id) {
  const c = estado.candidatos?.candidatos.find((x) => x.id === id);
  if (!c) return;

  $('cand-nome').textContent = c.nome;
  $('cand-linha').textContent = `${c.cargo} · ${c.partido} · número ${c.numero}`
    + (c.coligacao ? ` · ${c.coligacao}` : '');
  $('cand-evidencia').textContent = c.evidencia_texto;

  const avisoReg = $('cand-aviso-registro');
  avisoReg.textContent = c.situacao_do_registro !== 'Deferido'
    ? `Atenção: o registro desta candidatura está como "${c.situacao_do_registro}" no TSE. Pode não ir à urna.`
    : '';

  // ---------------------------------------------------------- medição
  const alvoMed = $('cand-medicao');
  alvoMed.textContent = '';
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

  mostrar('tela-candidato');
}
