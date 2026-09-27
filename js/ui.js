/**
 * Prumo — fluxo de telas.
 *
 * Todo o estado vive nestas variáveis, em memória. Não há localStorage,
 * sessionStorage, cookie nem qualquer chamada de rede além de buscar os
 * próprios arquivos de dados. Fechou a aba, acabou.
 */

import {
  EIXOS, pontuar, gerarPerfil, perfilDoVetor, faixaIntensidade, faixaConfianca, ordenarPerguntas,
} from './motor.js';
import { codificar, recuperar } from './perfil.js';
import { radar } from './grafico.js';
import { gerarPdf } from './pdf.js';
import { explicar } from './ia.js';
import { balanca, decisaoDoRotulo } from './explicar.js';

const $ = (id) => document.getElementById(id);

const estado = {
  banco: null,
  eixos: null,
  arquetipos: null,
  ordem: [],
  respostas: {},   // id → 'sim' | 'nao' | 'pular'
  indice: 0,
  perfil: null,
  // true quando o resultado veio de um código colado: não há respostas nesta
  // aba, e tudo o que depende delas (a lista no relatório) fica de fora.
  recuperado: false,
};

/* ------------------------------------------------------------------ dados */

async function carregar() {
  const [banco, eixos, arquetipos] = await Promise.all(
    ['perguntas', 'eixos', 'arquetipos'].map((n) => fetch(`dados/${n}.json`).then((r) => {
      if (!r.ok) throw new Error(`Não foi possível carregar dados/${n}.json`);
      return r.json();
    }))
  );
  estado.banco = banco;
  estado.eixos = eixos.eixos;
  estado.arquetipos = arquetipos;
}

/* ------------------------------------------------------------------ telas */

function mostrar(tela) {
  for (const id of ['tela-abertura', 'tela-perguntas', 'tela-resultado']) {
    $(id).classList.toggle('oculto', id !== tela);
  }
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}

function comecar() {
  estado.ordem = ordenarPerguntas(estado.banco.perguntas);
  estado.respostas = {};
  estado.indice = 0;
  mostrar('tela-perguntas');
  desenharPergunta();
}

function desenharPergunta() {
  const q = estado.ordem[estado.indice];
  if (!q) return finalizar();

  $('enunciado').textContent = q.texto;
  const temContexto = Boolean(q.contexto && q.contexto.trim());
  $('contexto').textContent = q.contexto || '';
  $('contexto').classList.toggle('oculto', !temContexto);

  const total = estado.ordem.length;
  $('contador').textContent = `Pergunta ${estado.indice + 1} de ${total}`;
  $('progresso').style.width = `${(100 * estado.indice) / total}%`;

  $('botao-voltar').disabled = estado.indice === 0;
  // Ver o resultado antes do fim só faz sentido com alguma coisa respondida.
  $('botao-terminar').classList.toggle('oculto', estado.indice < 10);

  $('enunciado').focus?.();
}

function responder(valor) {
  const q = estado.ordem[estado.indice];
  if (!q) return;
  estado.respostas[q.id] = valor;
  estado.indice++;
  if (estado.indice >= estado.ordem.length) finalizar();
  else desenharPergunta();
}

function voltar() {
  if (estado.indice === 0) return;
  estado.indice--;
  delete estado.respostas[estado.ordem[estado.indice].id];
  desenharPergunta();
}

/* -------------------------------------------------------------- resultado */

function apresentadas() {
  return estado.ordem.filter((q) => estado.respostas[q.id]);
}

function finalizar() {
  const lista = apresentadas();
  estado.perfil = gerarPerfil(lista, estado.respostas, estado.arquetipos, estado.banco.config);
  estado.recuperado = false;
  mostrarResultado();
}

/**
 * Recuperador. O vetor vem do código; rótulo e intensidade são recalculados
 * com os arquétipos desta versão, como no fim do questionário.
 */
function abrirPorCodigo(texto) {
  const { perfil } = recuperar(texto);
  estado.ordem = [];
  estado.respostas = {};
  estado.perfil = perfilDoVetor(perfil, estado.arquetipos, estado.banco.config);
  estado.recuperado = true;
  mostrarResultado();
}

function enviarCodigo(ev) {
  ev.preventDefault();
  const erro = $('erro-codigo');
  erro.classList.add('oculto');
  if (!estado.arquetipos) {
    erro.textContent = 'Os dados ainda estão carregando. Tente de novo em alguns segundos.';
    erro.classList.remove('oculto');
    return;
  }
  try {
    abrirPorCodigo($('campo-codigo').value);
    $('campo-codigo').value = '';
  } catch (e) {
    erro.textContent = e.message;
    erro.classList.remove('oculto');
    $('campo-codigo').focus();
  }
}

async function copiarCodigo() {
  const codigo = $('codigo-perfil').textContent;
  const aviso = $('copiado');
  try {
    await navigator.clipboard.writeText(codigo);
    aviso.textContent = 'Copiado. Cole num lugar seu — uma nota, uma mensagem para você mesmo.';
  } catch {
    // Sem permissão de área de transferência (alguns navegadores em http, ou
    // bloqueio do usuário): seleciona o texto para a pessoa copiar na mão.
    const faixa = document.createRange();
    faixa.selectNodeContents($('codigo-perfil'));
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(faixa);
    aviso.textContent = 'Não deu para copiar sozinho: o código ficou selecionado, é só copiar.';
  }
}

function mostrarResultado() {
  $('copiado').textContent = '';
  // Os links da barra levam o código junto; é ele que carrega o perfil lá.
  const cod = encodeURIComponent(codificar(estado.perfil));
  for (const a of document.querySelectorAll('#tela-resultado .navegacao a[data-rota]')) {
    a.href = `etapa2/?p=${cod}#${a.dataset.rota}`;
  }
  $('aviso-recuperado').classList.toggle('oculto', !estado.recuperado);
  $('nota-relatorio').classList.toggle('oculto', estado.recuperado);

  desenharSintese();
  desenharPorqueRotulo();
  desenharGrafico();
  desenharCartoes();
  $('codigo-perfil').textContent = codificar(estado.perfil);

  // A explicação da IA é sempre de um resultado; nunca sobrevive a um refazer.
  $('ia-texto').textContent = '';
  $('ia-texto').classList.add('oculto');

  mostrar('tela-resultado');
}

function arquetipo(id) {
  return estado.arquetipos.arquetipos.find((a) => a.id === id) || null;
}

function desenharSintese() {
  const p = estado.perfil;
  const principal = arquetipo(p.rotulo);
  const segundo = arquetipo(p.rotulo2);
  const faixa = faixaIntensidade(p.intensidade);

  // "Levemente centrista" não quer dizer nada: centrista já é a ausência de
  // inclinação. O grau só qualifica os outros arquétipos.
  $('rotulo').textContent = (faixa === 'equilibrado' || p.rotulo === 'centrista')
    ? principal?.nome || p.rotulo
    : `${faixa[0].toUpperCase()}${faixa.slice(1)} ${(principal?.nome || p.rotulo).toLowerCase()}`;

  const pedacos = [];
  if (principal?.longa) pedacos.push(principal.longa);
  if (segundo && p.intensidade >= 15) pedacos.push(`Você também tem traços de ${segundo.nome.toLowerCase()}.`);
  $('sintese-texto').textContent = pedacos.join(' ');

  const definidos = EIXOS.filter((k) => p.confianca[k] > 70).length;
  const marcados = EIXOS
    .slice()
    .sort((a, b) => Math.abs(p.posicao[b]) - Math.abs(p.posicao[a]))
    .slice(0, 2)
    .map((k) => estado.eixos.find((e) => e.codigo === k)?.nome || k);

  $('sintese-confianca').textContent =
    `Intensidade ${p.intensidade}% — ${faixa}. Sua posição é bem definida em ${definidos} de 5 eixos ` +
    `e mais marcada em ${marcados.join(' e ')}.`;
}

/* ------------------------------------------ por que você ficou aqui */

const nomeEixo = (k) => estado.eixos.find((e) => e.codigo === k);

/** Parágrafo com trechos em negrito: partes pares são texto, ímpares negrito. */
function paragrafo(...partes) {
  const p = document.createElement('p');
  partes.forEach((t, i) => {
    if (i % 2) { const b = document.createElement('b'); b.textContent = t; p.append(b); }
    else p.append(t);
  });
  return p;
}

function desenharPorqueRotulo() {
  const alvo = $('porque-rotulo-texto');
  alvo.textContent = '';
  const d = decisaoDoRotulo(estado.perfil, estado.arquetipos, estado.banco.config);
  const nome1 = d.primeiro?.nome || estado.perfil.rotulo;
  const nome2 = d.segundo?.nome;

  if (d.centrista) {
    alvo.append(paragrafo(
      'Somando os cinco eixos, a sua posição ficou muito perto do meio: intensidade de ',
      `${estado.perfil.intensidade}%`,
      `, abaixo da linha de ${d.limiar}%. Nesse caso o Prumo não força um lado e chama o perfil de `,
      'Centrista', '.',
    ));
    if (nome2) {
      alvo.append(paragrafo(
        'Isso não quer dizer que você não tenha opinião — quer dizer que, eixo a eixo, as suas respostas '
        + 'se equilibraram. Se fosse para escolher um perfil com inclinação, o mais parecido seria ',
        nome2, '.',
      ));
    }
    return;
  }

  alvo.append(paragrafo(
    'O Prumo compara a sua posição com dez perfis típicos. O mais parecido com o seu é ',
    nome1, nome2 ? '; logo atrás vem ' : '.', nome2 || '', nome2 ? '.' : '',
  ));

  const decisivos = d.eixos.filter((e, i) => e.parcela > 0 && (i === 0 || e.parcela >= d.eixos[0].parcela / 2)).slice(0, 2);
  const frases = decisivos.map((e) => {
    const eixo = nomeEixo(e.eixo);
    const faixa = (v) => faixaDoEixo(eixo, v).rotulo;
    return [
      `Em ${eixo.nome}, você ficou em `, `“${faixa(e.pessoa)}”`,
      `. O perfil ${nome1.toLowerCase()} típico fica em “${faixa(e.primeiro)}”, e o ${nome2.toLowerCase()} em “${faixa(e.segundo)}”.`,
    ];
  });
  if (frases.length) {
    alvo.append(paragrafo(
      'O que separou os dois foi ',
      decisivos.map((e) => nomeEixo(e.eixo).nome).join(' e '),
      decisivos.length > 1 ? '. ' : '. ',
    ));
    for (const f of frases) alvo.append(paragrafo(...f));
  }
  const p = document.createElement('p');
  p.className = 'discreto';
  p.textContent = 'Os perfis típicos são pontos de referência, não caixas: ninguém cabe inteiro em um. '
    + 'O que vale é a sua posição em cada eixo, logo abaixo.';
  alvo.append(p);
}

function textoResposta(r) {
  return r === 'sim' ? 'você disse Sim' : 'você disse Não';
}

/** Bloco "O que pesou" de um eixo, montado a partir das respostas. */
function blocoBalanca(k, eixo, dados) {
  const det = document.createElement('details');
  det.className = 'balanca';
  const resumo = document.createElement('summary');
  resumo.textContent = 'O que pesou neste eixo';
  det.append(resumo);

  if (!dados) {
    const p = document.createElement('p');
    p.className = 'nenhuma';
    p.textContent = 'Este resultado foi aberto pelo código, que não guarda as respostas. '
      + 'O detalhe do que pesou só aparece logo depois de responder às perguntas.';
    det.append(p);
    return det;
  }

  const neg = dados.negativo.pontos;
  const pos = dados.positivo.pontos;
  const soma = neg + pos || 1;
  const barra = document.createElement('div');
  barra.className = 'pratos';
  barra.setAttribute('aria-hidden', 'true');
  const bn = document.createElement('i'); bn.className = 'lado-neg'; bn.style.width = `${(100 * neg) / soma}%`;
  const bp = document.createElement('i'); bp.className = 'lado-pos'; bp.style.width = `${(100 * pos) / soma}%`;
  // O lado que ganhou fica em cobre; o outro, neutro. Cor por lado político
  // seria tomar partido — cor pelo resultado não é.
  (pos >= neg ? bp : bn).classList.add('ganhou');
  barra.append(bn, bp);
  const leg = document.createElement('div');
  leg.className = 'pratos-legenda';
  const ln = document.createElement('span'); ln.textContent = `${eixo.polo_negativo.nome}: ${neg} pontos`;
  const lp = document.createElement('span'); lp.textContent = `${eixo.polo_positivo.nome}: ${pos} pontos`;
  leg.append(ln, lp);
  det.append(barra, leg);

  // O lado que ganhou vem primeiro: é o que explica onde a pessoa parou.
  const lados = pos >= neg ? ['positivo', 'negativo'] : ['negativo', 'positivo'];
  for (const lado of lados) {
    const prato = dados[lado];
    const polo = lado === 'positivo' ? eixo.polo_positivo.nome : eixo.polo_negativo.nome;
    const h = document.createElement('h4');
    h.textContent = prato.quantidade
      ? `Puxaram para ${polo} (${prato.quantidade} ${prato.quantidade === 1 ? 'resposta' : 'respostas'})`
      : `Nada puxou para ${polo}`;
    det.append(h);
    if (!prato.quantidade) continue;
    const ul = document.createElement('ul');
    for (const r of prato.respostas) {
      const li = document.createElement('li');
      li.append(`“${r.texto}” — `);
      const b = document.createElement('span'); b.className = 'resp'; b.textContent = textoResposta(r.resposta);
      li.append(b);
      ul.append(li);
    }
    det.append(ul);
    if (prato.quantidade > prato.respostas.length) {
      const mais = document.createElement('p');
      mais.className = 'nenhuma';
      mais.textContent = `…e mais ${prato.quantidade - prato.respostas.length}. Acima, as que mais pesaram.`;
      det.append(mais);
    }
  }

  if (dados.pulos.quantidade) {
    const p = document.createElement('p');
    p.className = 'nenhuma';
    p.style.marginTop = '.8rem';
    const n = dados.pulos.quantidade;
    const pts = dados.pulos.pontos;
    const para = pts > 0 ? eixo.polo_positivo.nome : eixo.polo_negativo.nome;
    p.textContent = `Você pulou ${n} ${n === 1 ? 'pergunta' : 'perguntas'} deste eixo. Pular conta um pouco a favor de como as coisas são hoje`
      + (pts ? `, e isso empurrou ${Math.abs(pts)} ${Math.abs(pts) === 1 ? 'ponto' : 'pontos'} para ${para}.` : ', e aqui os pulos se anularam.');
    det.append(p);
  }
  return det;
}

function coresDoTema() {
  const css = getComputedStyle(document.body);
  const ler = (nome, padrao) => (css.getPropertyValue(nome) || '').trim() || padrao;
  return {
    cor: ler('--cobre', '#9c5a24'),
    corTexto: ler('--texto-suave', '#55575c'),
    corTextoForte: ler('--texto', '#1b1c1e'),
    corGrade: ler('--borda', '#d9d5cf'),
    corFundo: ler('--superficie', '#ffffff'),
  };
}

function desenharGrafico() {
  $('grafico').innerHTML = radar(
    estado.perfil.posicao, estado.perfil.confianca, estado.eixos,
    { ...coresDoTema(), corFundo: 'transparent' }
  );
}

function faixaDoEixo(eixo, valor) {
  return eixo.faixas.find((f) => valor >= f.de && valor <= f.ate) || eixo.faixas[Math.floor(eixo.faixas.length / 2)];
}

function desenharCartoes() {
  const p = estado.perfil;
  const alvo = $('cartoes');
  alvo.textContent = '';
  const pesos = estado.recuperado
    ? null
    : balanca(apresentadas(), estado.respostas, estado.banco.config);

  for (const k of EIXOS) {
    const eixo = estado.eixos.find((e) => e.codigo === k);
    if (!eixo) continue;
    const valor = p.posicao[k];
    const conf = p.confianca[k];
    const faixa = faixaDoEixo(eixo, valor);
    const definida = conf >= 40;

    const cartao = document.createElement('article');
    cartao.className = 'cartao-eixo';

    const cabeca = document.createElement('header');
    const titulo = document.createElement('h3');
    titulo.textContent = eixo.nome;
    const valorEl = document.createElement('span');
    valorEl.className = 'valor';
    valorEl.textContent = faixa.rotulo;
    cabeca.append(titulo, valorEl);

    const regua = document.createElement('div');
    regua.className = 'regua';
    const marcador = document.createElement('span');
    marcador.className = definida ? 'marcador' : 'marcador incerto';
    marcador.style.left = `${(valor + 100) / 2}%`;
    regua.append(marcador);

    const polos = document.createElement('div');
    polos.className = 'polos';
    const esq = document.createElement('span');
    esq.textContent = eixo.polo_negativo.nome;
    const dir = document.createElement('span');
    dir.textContent = eixo.polo_positivo.nome;
    polos.append(esq, dir);

    const texto = document.createElement('p');
    texto.textContent = faixa.texto;

    const confEl = document.createElement('p');
    confEl.className = 'discreto confianca';
    confEl.textContent = `Posição ${faixaConfianca(conf)} (${conf}% das perguntas deste eixo você respondeu).`;

    cartao.append(cabeca, regua, polos, texto, confEl, blocoBalanca(k, eixo, pesos?.[k]));
    alvo.append(cartao);
  }
}

/* --------------------------------------------------------------- ações */

async function baixarPdf() {
  const botao = $('botao-pdf');
  const original = botao.textContent;
  botao.disabled = true;
  botao.textContent = 'Preparando…';
  try {
    await gerarPdf({
      perfil: estado.perfil,
      eixos: estado.eixos,
      arquetipos: estado.arquetipos,
      codigo: codificar(estado.perfil),
      textoIa: $('ia-texto').textContent || '',
      // O relatório passa a trazer as respostas, uma a uma. Elas continuam sem
      // sair daqui: o PDF é montado nesta aba e salvo no computador de quem
      // respondeu. O que muda é que a pessoa PODE guardar o que é dela.
      perguntas: estado.recuperado ? null : estado.ordem,
      respostas: estado.recuperado ? null : estado.respostas,
    });
  } catch (e) {
    alert(`Não deu para gerar o relatório: ${e.message}\n\nVocê pode usar a impressão do navegador (Ctrl+P) como alternativa.`);
  } finally {
    botao.disabled = false;
    botao.textContent = original;
  }
}

function irParaEtapa2() {
  window.location.href = `etapa2/?p=${encodeURIComponent(codificar(estado.perfil))}`;
}

function refazer() {
  estado.perfil = null;
  estado.recuperado = false;
  estado.respostas = {};
  $('ia-chave').value = '';
  $('ia-ligar').checked = false;
  $('ia-campos').classList.add('oculto');
  mostrar('tela-abertura');
}

async function gerarExplicacao() {
  const botao = $('ia-gerar');
  const saida = $('ia-texto');
  const chave = $('ia-chave').value.trim();

  if (!chave) { alert('Cole sua chave da API da Anthropic primeiro.'); return; }

  botao.disabled = true;
  botao.textContent = 'Escrevendo…';
  saida.classList.remove('oculto');
  saida.textContent = '';

  try {
    saida.textContent = await explicar(estado.perfil, estado.eixos, estado.arquetipos, chave);
  } catch (e) {
    saida.textContent = `Não deu certo: ${e.message}`;
  } finally {
    botao.disabled = false;
    botao.textContent = 'Gerar explicação';
  }
}

/* ------------------------------------------------------------- ligações */

function ligarEventos() {
  $('botao-comecar').addEventListener('click', comecar);
  $('botao-sim').addEventListener('click', () => responder('sim'));
  $('botao-nao').addEventListener('click', () => responder('nao'));
  $('botao-pular').addEventListener('click', () => responder('pular'));
  $('botao-voltar').addEventListener('click', voltar);
  $('botao-terminar').addEventListener('click', finalizar);
  $('botao-pdf').addEventListener('click', baixarPdf);
  $('botao-etapa2').addEventListener('click', irParaEtapa2);
  $('botao-refazer').addEventListener('click', refazer);
  $('form-recuperar').addEventListener('submit', enviarCodigo);
  $('botao-copiar').addEventListener('click', copiarCodigo);

  $('botao-como').addEventListener('click', () => $('dialogo-como').showModal());
  $('fechar-como').addEventListener('click', () => $('dialogo-como').close());

  $('ia-ligar').addEventListener('change', (ev) => {
    $('ia-campos').classList.toggle('oculto', !ev.target.checked);
  });
  $('ia-gerar').addEventListener('click', gerarExplicacao);

  // Atalhos de teclado na tela de perguntas: S, N, P e seta para voltar.
  document.addEventListener('keydown', (ev) => {
    if ($('tela-perguntas').classList.contains('oculto')) return;
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
    const tecla = ev.key.toLowerCase();
    if (tecla === 's') responder('sim');
    else if (tecla === 'n') responder('nao');
    else if (tecla === 'p') responder('pular');
    else if (ev.key === 'ArrowLeft') voltar();
    else return;
    ev.preventDefault();
  });

  // O tema pode mudar no meio da sessão; o gráfico acompanha.
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (estado.perfil) desenharGrafico();
  });
}

/* ---------------------------------------------------------------- início */

(async function iniciar() {
  ligarEventos();
  try {
    await carregar();
    const n = estado.banco.perguntas.filter((q) => q.ativa !== false).length;
    $('resumo-banco').textContent =
      `${n} perguntas, cerca de ${Math.round((n * 8) / 60)} minutos. Dá para parar no meio e ver o resultado do que já respondeu.`;
    $('botao-comecar').disabled = false;

    // Endereço com ?p=CODIGO abre direto no resultado. É o caminho de volta
    // das etapas seguintes ("meu resultado") e de quem guardou o link.
    const doEndereco = new URLSearchParams(location.search).get('p');
    if (doEndereco) {
      try {
        abrirPorCodigo(doEndereco);
      } catch (e) {
        $('recuperador').open = true;
        $('erro-codigo').textContent = `O código que veio no endereço não pôde ser lido. ${e.message}`;
        $('erro-codigo').classList.remove('oculto');
      }
    }
  } catch (e) {
    $('resumo-banco').textContent = `Não foi possível carregar as perguntas: ${e.message}`;
  }
}());
