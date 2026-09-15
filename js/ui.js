/**
 * Prumo — fluxo de telas.
 *
 * Todo o estado vive nestas variáveis, em memória. Não há localStorage,
 * sessionStorage, cookie nem qualquer chamada de rede além de buscar os
 * próprios arquivos de dados. Fechou a aba, acabou.
 */

import {
  EIXOS, pontuar, gerarPerfil, faixaIntensidade, faixaConfianca, ordenarPerguntas,
} from './motor.js';
import { codificar } from './perfil.js';
import { radar } from './grafico.js';
import { gerarPdf } from './pdf.js';
import { explicar } from './ia.js';

const $ = (id) => document.getElementById(id);

const estado = {
  banco: null,
  eixos: null,
  arquetipos: null,
  ordem: [],
  respostas: {},   // id → 'sim' | 'nao' | 'pular'
  indice: 0,
  perfil: null,
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

  desenharSintese();
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

    cartao.append(cabeca, regua, polos, texto, confEl);
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
      perguntas: estado.ordem,
      respostas: estado.respostas,
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
  } catch (e) {
    $('resumo-banco').textContent = `Não foi possível carregar as perguntas: ${e.message}`;
  }
}());
