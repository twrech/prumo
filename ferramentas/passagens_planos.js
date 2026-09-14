/**
 * Prumo — localizador de passagens nos planos de governo (etapa 3, executivo).
 *
 *   node ferramentas/passagens_planos.js
 *
 * Lê os `.txt` de `dados/planos/` e escreve, para cada plano, um arquivo
 * `passagens/<plano>.json` com os trechos em que aquele plano toca em cada um
 * dos cinco eixos.
 *
 * O QUE ESTA FERRAMENTA NÃO FAZ
 *   Ela NÃO atribui posição, NÃO pontua e NÃO decide nada. Casar palavra não é
 *   ler: "reduzir a carga tributária" e "quem defende reduzir a carga tributária
 *   ignora que..." casam com o mesmo termo e dizem o oposto. A ferramenta só
 *   diminui 2,2 MB de texto para algumas dezenas de trechos por plano; quem lê
 *   o trecho e decide se ele sustenta uma posição é uma pessoa, com a passagem
 *   literal à vista.
 *
 *   Por isso a saída guarda a frase inteira e o número da página: sem passagem
 *   citada, sem posição — e a passagem tem de poder ser conferida no PDF
 *   original.
 *
 * POR QUE O RECALL IMPORTA MAIS QUE A PRECISÃO AQUI
 *   Um termo de sobra custa uma frase lida à toa. Um termo de menos custa um
 *   compromisso que o candidato assumiu e o Prumo não viu — e o eleitor lê o
 *   silêncio como se fosse ausência de posição. Na dúvida, o termo entra.
 *
 * PLANO SEM TEXTO
 *   Os planos que vieram como imagem (marcados `SEM CAMADA DE TEXTO` no topo)
 *   saem com `legivel: false` e nenhuma passagem. Não é o mesmo que um plano
 *   lido em que nada foi achado, e os dois casos não podem se confundir na
 *   ficha do candidato.
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';

export { juntarHifens };

const PASTA = fileURLToPath(new URL('../dados/planos/', import.meta.url));
const SAIDA = join(PASTA, 'passagens');

/**
 * Termos por eixo. Não carregam polaridade de propósito: o mesmo termo aparece
 * nos dois lados da discussão, e decidir o lado é trabalho de leitura.
 */
const TERMOS = {
  eco: [
    'privatiz', 'desestatiz', 'estatiz', 'estatal', 'empresa pública', 'concessão', 'concessões',
    'parceria público-privada', 'ppp', 'imposto', 'tributár', 'carga tributária', 'isenção',
    'reforma tributária', 'reforma administrativa', 'teto de gastos', 'arcabouço fiscal',
    'ajuste fiscal', 'gasto público', 'salário mínimo', 'sindicat', 'clt', 'trabalhista',
    'terceiriz', 'banco público', 'crédito subsidiado', 'subsídio', 'livre iniciativa',
    'livre mercado', 'controle de preços', 'reforma agrária', 'estado mínimo', 'servidor público',
    'renda básica', 'transferência de renda', 'bolsa família', 'desburocratiz', 'regulação',
  ],
  soc: [
    'aborto', 'interrupção da gravidez', 'família tradicional', 'valores cristãos', 'cristã',
    'ideologia de gênero', 'gênero', 'lgbt', 'homossex', 'transex', 'casamento',
    'droga', 'descriminaliz', 'legalização', 'maconha', 'escola sem partido',
    'educação domiciliar', 'homeschooling', 'cota', 'racial', 'racismo', 'religiã', 'religios',
    'liberdade religiosa', 'desde a concepção', 'natalidade', 'costumes', 'moral',
  ],
  pod: [
    'segurança pública', 'presídio', 'penitenciár', 'encarcer', 'maioridade penal',
    'porte de arma', 'posse de arma', 'armament', 'desarmament', 'pena', 'polícia', 'policial',
    'militar', 'forças armadas', 'garantia da lei e da ordem', 'tolerância zero', 'facção',
    'crime organizado', 'direitos humanos', 'tortura', 'censura', 'liberdade de expressão',
    'vigilância', 'câmeras', 'reconhecimento facial', 'monitorament', 'judiciário',
    'supremo tribunal', 'anistia', 'impunidade', 'intervenção federal',
  ],
  sob: [
    'soberania', 'importação', 'importad', 'exportação', 'tarifa', 'comércio exterior',
    'acordo comercial', 'mercosul', 'omc', 'brics', 'protecion', 'abertura comercial',
    'capital estrangeiro', 'investimento estrangeiro', 'estrangeir', 'multinacional',
    'organismos internacionais', 'onu', 'oms', 'fmi', 'banco mundial', 'tratado',
    'dívida externa', 'dólar', 'política externa', 'imigra', 'fronteira',
  ],
  amb: [
    'ambiental', 'meio ambiente', 'licenciamento', 'desmatament', 'amazônia', 'mineraç',
    'minério', 'petróleo', 'pré-sal', 'agronegócio', 'agropecuár', 'energia renovável',
    'eólica', 'solar', 'hidrelétrica', 'clima', 'climát', 'carbono', 'emissões',
    'unidade de conservação', 'área protegida', 'indígena', 'quilombola', 'agrotóxico',
    'saneamento', 'sustentab', 'reciclagem', 'mata atlântica', 'bioma',
  ],
};

/** Verbo de compromisso: distingue "vamos criar" de "o país criou em 1988". */
const COMPROMISSO = /\b(vamos|iremos|ser[áã]o?|garantir|garantiremos|implantar|implementar|criar|criaremos|ampliar|ampliaremos|reduzir|reduziremos|aumentar|extinguir|revogar|privatizar|estatizar|proibir|permitir|assegurar|promover|fortalecer|combater|priorizar|defender|apoiar|investir|construir|modernizar|reformar|propomos|defendemos|nos comprometemos|compromisso)\b/i;

const semAcento = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Junta a palavra que o PDF partiu com hífen no fim da linha.
 *
 * Sem isto, a citação sai "efici- ência" e "pesso- as" — e citação com palavra
 * partida não sustenta posição nenhuma. São 703 casos nos 21 planos, quase todos
 * nos dois documentos de coluna justificada (Zema, 401; Renan Santos, 259).
 *
 * A dificuldade é que existem os dois casos, e o texto não distingue: "efici-"
 * quer o hífen apagado, "público-" não, porque "público-privadas" é uma palavra
 * só com hífen legítimo. Colar tudo produziria "públicoprivadas"; preservar tudo
 * mantém "efici- ência".
 *
 * A decisão é tomada perguntando ao próprio documento, que é a única autoridade
 * disponível: se a forma COM hífen aparece em outro lugar do plano, o hífen é da
 * palavra e fica; senão, é da quebra de linha e some. Na dúvida — nenhuma das
 * duas formas aparece em outro lugar — some, porque hifenização de fim de linha
 * é muito mais comum que composto raro.
 */
const PRIMEIRO_ELEMENTO = new Set([
  'publico', 'privado', 'socio', 'economico', 'politico', 'juridico', 'tecnico',
  'administrativo', 'ex', 'vice', 'pre', 'pos', 'auto', 'anti', 'sub', 'super',
  'semi', 'micro', 'macro', 'infra', 'inter', 'intra', 'multi', 'mini', 'neo',
  'recem', 'bem', 'mal', 'alem', 'meio', 'primeiro', 'segundo', 'norte', 'sul',
  'leste', 'oeste', 'centro', 'guarda', 'porta', 'afro', 'euro', 'luso', 'agro',
  'bio', 'eco', 'tele', 'hidro', 'termo', 'foto', 'video', 'civico', 'militar',
]);

function juntarHifens(texto) {
  // A busca é feita sem caixa. Custou um erro descobrir por quê: em um dos
  // planos o composto só aparece como "Parcerias Público-Privadas", em título,
  // e a quebra acontece na forma minúscula do corpo do texto. Busca sensível a
  // caixa não achava o título e colava "públicoprivadas".
  const baixo = texto.toLowerCase();
  const alvo = /([A-Za-zÀ-ÿ]{2,})-\n([a-zà-ÿ]+)/g;
  return texto.replace(alvo, (inteiro, esquerda, direita) => {
    const comHifen = `${esquerda}-${direita}`;
    // Segunda salvaguarda: um documento pode conter o composto UMA única vez, e
    // justamente partido. Foi o caso de "público-privadas" no plano da SAMARA.
    // Nesses primeiros elementos o hífen é da palavra, sempre.
    if (PRIMEIRO_ELEMENTO.has(semAcento(esquerda))) return comHifen;
    return baixo.includes(comHifen.toLowerCase()) ? comHifen : esquerda + direita;
  });
}

/** Início de tópico: bullet, travessão ou numeração ("3.1", "c)"). */
const ABRE_TOPICO = /^\s*(?:[•·▪◦*–—-]|\(?[a-z]\)|\d+(?:\.\d+)*[.)]?)\s+/i;

/**
 * Corta o texto em frases, guardando a página de cada uma.
 *
 * O PDF quebra a linha onde a margem acaba, não onde a frase acaba. Cortar por
 * `\n` produzia citação pela metade — "parcerias com a iniciativa privada, por
 * meio de PPPs ou" — e citação pela metade não sustenta posição nenhuma. Então
 * as linhas são emendadas até a pontuação final ou até começar um novo tópico.
 */
function frases(textoBruto) {
  const texto = juntarHifens(textoBruto);
  const saida = [];
  let pagina = 0;
  let buffer = '';

  const fechar = () => {
    const bloco = buffer.trim().replace(/\s+/g, ' ').replace(/\s+([,.;:!?])/g, '$1');
    buffer = '';
    if (!bloco) return;
    for (const f of bloco.split(/(?<=[.;:!?])\s+(?=[A-ZÁÂÃÀÉÊÍÓÔÕÚÇ•\d])/)) {
      const t = f.trim();
      // O piso é baixo de propósito. Vários planos são escritos em tópicos, e um
      // piso de 60 caracteres apagava plano inteiro: "• Imposto único" tem 15 e
      // é uma posição. O custo de um piso baixo é ruído; o de um piso alto é um
      // candidato que parece não ter dito nada.
      if (t.length >= 30 && t.length <= 500) saida.push({ pagina, texto: t });
    }
  };

  for (const linha of texto.split(/\n/)) {
    const marca = linha.match(/^--- página (\d+) ---$/);
    if (marca) { fechar(); pagina = Number(marca[1]); continue; }
    if (linha.startsWith('#')) continue;
    if (!linha.trim()) { fechar(); continue; }

    // Tópico novo fecha o anterior; senão a linha é continuação da frase.
    if (ABRE_TOPICO.test(linha) && buffer) fechar();
    buffer += (buffer ? ' ' : '') + linha.trim();
    if (/[.;:!?]\s*$/.test(linha)) fechar();
  }
  fechar();

  return saida;
}

const MAX_POR_EIXO = 8;

function passagensDoPlano(texto) {
  const lista = frases(texto);
  const porEixo = {};

  for (const [eixo, termos] of Object.entries(TERMOS)) {
    const achados = [];
    for (const f of lista) {
      const plano = semAcento(f.texto);
      const casados = termos.filter((t) => plano.includes(semAcento(t)));
      if (!casados.length) continue;
      achados.push({
        pagina: f.pagina,
        termos: casados,
        compromisso: COMPROMISSO.test(f.texto),
        texto: f.texto,
      });
    }

    // Ordenar só por quantidade de termos premiava a frase longa e vaga que
    // tangencia cinco assuntos, e rebaixava o compromisso curto e claro. O verbo
    // de compromisso vale 1,5 termo: "vamos privatizar" passa na frente de uma
    // frase que menciona privatização e tributação de passagem.
    const nota = (x) => x.termos.length + (x.compromisso ? 1.5 : 0);
    achados.sort((a, b) => nota(b) - nota(a) || a.pagina - b.pagina);

    const vistos = new Set();
    porEixo[eixo] = achados.filter((a) => {
      const chave = semAcento(a.texto).slice(0, 70);
      if (vistos.has(chave)) return false;
      vistos.add(chave);
      return true;
    }).slice(0, MAX_POR_EIXO);
  }

  return { total_frases: lista.length, por_eixo: porEixo };
}

function main() {
  mkdirSync(SAIDA, { recursive: true });
  const arquivos = readdirSync(PASTA).filter((f) => f.startsWith('plano-') && f.endsWith('.txt')).sort();
  const resumo = [];

  for (const arquivo of arquivos) {
    const texto = readFileSync(join(PASTA, arquivo), 'utf8');
    const cabecalho = texto.split('\n').filter((l) => l.startsWith('#'));
    const legivel = !texto.includes('SEM CAMADA DE TEXTO');
    const identidade = (cabecalho[0] || '').replace(/^#\s*/, '');

    if (!legivel) {
      writeFileSync(join(SAIDA, arquivo.replace('.txt', '.json')),
        `${JSON.stringify({ arquivo, identidade, legivel: false, motivo: 'PDF sem camada de texto; não há o que citar', por_eixo: null }, null, 2)}\n`);
      resumo.push({ arquivo, identidade, legivel: false, achados: 0 });
      continue;
    }

    const r = passagensDoPlano(texto);
    const achados = Object.values(r.por_eixo).reduce((s, v) => s + v.length, 0);
    writeFileSync(join(SAIDA, arquivo.replace('.txt', '.json')), `${JSON.stringify({
      arquivo, identidade, legivel: true,
      regra: 'Toda posição tirada daqui carrega a passagem literal. Sem passagem citada, sem posição.',
      aviso: 'Trecho localizado por termo NÃO é posição: o mesmo termo aparece nos dois lados da discussão. Ler antes de decidir.',
      total_frases: r.total_frases,
      por_eixo: r.por_eixo,
    }, null, 2)}\n`);
    resumo.push({
      arquivo, identidade, legivel: true, frases: r.total_frases, achados,
      por_eixo: Object.fromEntries(Object.entries(r.por_eixo).map(([k, v]) => [k, v.length])),
    });
  }

  writeFileSync(join(SAIDA, '_resumo.json'), `${JSON.stringify({
    gerado_em: new Date().toISOString().slice(0, 10),
    max_por_eixo: MAX_POR_EIXO,
    planos: resumo,
  }, null, 2)}\n`);

  const semTexto = resumo.filter((r) => !r.legivel);
  console.log(`${resumo.length} planos · ${resumo.length - semTexto.length} com passagens · ${semTexto.length} sem camada de texto`);
  for (const r of resumo) {
    console.log(r.legivel
      ? `  ${r.identidade.padEnd(52)} ${String(r.frases).padStart(5)} frases · ${r.achados} passagens`
      : `  ${r.identidade.padEnd(52)} SEM TEXTO`);
  }
  console.log(`\nSaída em dados/planos/passagens/`);
}

// Só roda quando é chamado direto. Importado — a conferência das citações usa
// `juntarHifens` para ler o texto do mesmo jeito — não deve regerar nada.
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();
