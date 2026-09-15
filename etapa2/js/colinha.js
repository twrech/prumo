/**
 * Prumo — etapa 4: a colinha do dia da eleição.
 *
 * O QUE ELA É, E O QUE ELA NÃO É
 *
 * É papel de anotação. O eleitor escolhe; a colinha organiza na ordem em que a
 * urna pede o voto e imprime nome, partido e número. **Ela não sugere nada.**
 * Nenhum candidato entra aqui por afinidade calculada, por posição no ranking
 * ou por qualquer conta do Prumo — entra porque a pessoa clicou. A diferença
 * entre uma agenda e um conselheiro é toda a diferença que este projeto tem.
 *
 * PRIVACIDADE: A MESMA REGRA, SEM EXCEÇÃO
 *
 * As escolhas vivem nesta variável, em memória. Não há localStorage, nem
 * sessionStorage, nem cookie, nem rede. Fechou a aba, acabou — inclusive a
 * colinha. O arquivo só existe se a pessoa clicar para baixar, e vai para o
 * computador dela, para lugar nenhum além disso.
 *
 * A ORDEM DOS SEIS VOTOS
 *
 * A urna de 2026 pede seis votos, nesta ordem: deputado federal, deputado
 * estadual, senador (primeira vaga), senador (segunda vaga), governador e
 * presidente. São DUAS vagas de senador porque 2026 renova dois terços da Casa.
 * Fonte: TSE, "Eleições 2026: conheça a ordem de votação na urna eletrônica".
 *
 * VOTO DE LEGENDA: SÓ ONDE ELE EXISTE
 *
 * Quem não se decidiu por nenhum nome pode votar só no partido — mas isso vale
 * exclusivamente para os cargos PROPORCIONAIS, deputado federal e estadual. Em
 * cargo majoritário (senador, governador, presidente) não existe voto de
 * legenda: o voto é sempre em pessoa. Por isso a opção de legenda só aparece
 * nesses dois cargos, e a colinha diz o porquê em vez de simplesmente omitir.
 * Fonte: TSE, Temas Selecionados, "Voto nominal e de legenda" — o voto para
 * mandato de representação proporcional pode ser dado à legenda.
 */

const CDN_JSPDF = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';

/**
 * As seis vagas, na ordem da urna. `digitos` é o tamanho do número naquele
 * cargo, conferido contra o registro do TSE: federal 4, estadual 5, senador 3,
 * governador e presidente 2.
 */
const VAGAS = [
  { id: 'df', rotulo: 'Deputado Federal', cargo: 'Deputado Federal', digitos: 4, legenda: true },
  { id: 'de', rotulo: 'Deputado Estadual', cargo: 'Deputado Estadual', digitos: 5, legenda: true },
  { id: 'sen1', rotulo: 'Senador — 1ª vaga', cargo: 'Senador', digitos: 3, legenda: false },
  { id: 'sen2', rotulo: 'Senador — 2ª vaga', cargo: 'Senador', digitos: 3, legenda: false },
  { id: 'gov', rotulo: 'Governador', cargo: 'gov', digitos: 2, legenda: false },
  { id: 'pres', rotulo: 'Presidente', cargo: 'pres', digitos: 2, legenda: false },
];

const POR_ID = new Map(VAGAS.map((v) => [v.id, v]));

/** Estado — em memória, e só. */
const escolhas = new Map();   // id da vaga → { tipo, nome, partido, numero, idCandidato }
let numerosDePartido = {};    // sigla → número da legenda
let aoMudar = () => {};

export function configurar({ partidos, aoMudar: cb }) {
  numerosDePartido = partidos || {};
  if (cb) aoMudar = cb;
}

export const vagas = () => VAGAS;
export const quantas = () => escolhas.size;
export const total = () => VAGAS.length;

/** Em que vaga este candidato cabe. Senador cabe em duas. */
function vagasDoCargo(cargo) {
  return VAGAS.filter((v) => v.cargo === cargo);
}

export function vagaOcupadaPor(idCandidato) {
  for (const [vaga, e] of escolhas) if (e.idCandidato === String(idCandidato)) return vaga;
  return null;
}

/**
 * Põe um candidato na colinha. Devolve o que aconteceu, para a interface poder
 * dizer em palavras — nunca falha em silêncio.
 */
export function escolher(candidato, cargo) {
  const id = String(candidato.id);
  const jaEsta = vagaOcupadaPor(id);
  if (jaEsta) { escolhas.delete(jaEsta); aoMudar(); return { acao: 'removido', vaga: jaEsta }; }

  const possiveis = vagasDoCargo(cargo);
  if (!possiveis.length) return { acao: 'cargo-desconhecido' };

  // Senador tem duas vagas: usa a primeira livre; se as duas estiverem ocupadas,
  // não troca nada por conta própria — avisa e deixa a pessoa decidir.
  const livre = possiveis.find((v) => !escolhas.has(v.id));
  if (!livre) return { acao: 'sem-vaga', vagas: possiveis.map((v) => v.rotulo) };

  escolhas.set(livre.id, {
    tipo: 'candidato',
    idCandidato: id,
    nome: candidato.nome,
    partido: candidato.partido,
    numero: candidato.numero ?? null,
  });
  aoMudar();
  return { acao: 'posto', vaga: livre.id, rotulo: livre.rotulo };
}

/** Voto só na legenda. Só existe nos cargos proporcionais. */
export function escolherLegenda(sigla, idVaga) {
  const vaga = POR_ID.get(idVaga);
  if (!vaga || !vaga.legenda) return { acao: 'legenda-nao-existe' };

  const atual = escolhas.get(idVaga);
  if (atual?.tipo === 'legenda' && atual.partido === sigla) {
    escolhas.delete(idVaga); aoMudar(); return { acao: 'removido', vaga: idVaga };
  }

  const numero = numerosDePartido[sigla]?.numero ?? null;
  escolhas.set(idVaga, { tipo: 'legenda', idCandidato: null, nome: null, partido: sigla, numero });
  aoMudar();
  return { acao: 'posto', vaga: idVaga, rotulo: vaga.rotulo };
}

export function limparVaga(idVaga) { escolhas.delete(idVaga); aoMudar(); }
export function limparTudo() { escolhas.clear(); aoMudar(); }
export function ler(idVaga) { return escolhas.get(idVaga) || null; }

/** O conteúdo da colinha, na ordem da urna, com as vagas vazias incluídas. */
export function linhas() {
  return VAGAS.map((v) => ({ vaga: v, escolha: escolhas.get(v.id) || null }));
}

/**
 * O número, formatado como aparece na urna. Devolve null quando não se sabe —
 * nunca inventa dígito, e nunca completa com zero à esquerda: número de urna
 * não é campo numérico, é sequência de teclas.
 */
export function numeroFormatado(escolha) {
  if (!escolha || escolha.numero == null) return null;
  return String(escolha.numero);
}

/** Um número com o tamanho errado é erro visível, não erro silencioso. */
export function conferirNumero(vaga, escolha) {
  const n = numeroFormatado(escolha);
  if (n == null) return 'número não consta no registro';
  if (escolha.tipo === 'legenda') return n.length === 2 ? null : 'número de legenda deveria ter 2 dígitos';
  return n.length === vaga.digitos ? null : `deveria ter ${vaga.digitos} dígitos e tem ${n.length}`;
}

/* ------------------------------------------------------------------ o arquivo */

function carregarJsPdf() {
  if (window.jspdf?.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = CDN_JSPDF;
    s.onload = () => (window.jspdf?.jsPDF
      ? resolve(window.jspdf.jsPDF)
      : reject(new Error('a biblioteca de PDF carregou incompleta')));
    s.onerror = () => reject(new Error('não foi possível baixar a biblioteca de PDF'));
    document.head.append(s);
  });
}

/**
 * Monta o PDF da colinha. É um arquivo PRÓPRIO, separado do relatório do
 * perfil: são coisas diferentes, e quem leva a colinha para a seção não quer
 * levar junto as próprias posições políticas impressas.
 */
export async function baixarPdf() {
  const jsPDF = await carregarJsPdf();
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const M = 20;
  const cobre = [156, 90, 36];
  const grafite = [27, 28, 30];
  const suave = [85, 87, 92];
  let y = M;

  doc.setFont('helvetica', 'bold').setFontSize(20).setTextColor(...grafite);
  doc.text('Minha colinha', M, y + 6);
  doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...suave);
  doc.text('4 de outubro de 2026 · na ordem em que a urna pede', M, y + 12);
  doc.setDrawColor(...cobre).setLineWidth(0.6);
  doc.line(M, y + 16, 210 - M, y + 16);
  y += 26;

  let n = 0;
  for (const { vaga, escolha } of linhas()) {
    n += 1;
    const caixaAlt = 20;

    doc.setDrawColor(215, 211, 205).setLineWidth(0.3);
    doc.roundedRect(M, y - 5, 210 - M * 2, caixaAlt, 2, 2);

    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...suave);
    doc.text(`${n}. ${vaga.rotulo}`, M + 5, y + 1);

    if (!escolha) {
      doc.setFont('helvetica', 'italic').setFontSize(11).setTextColor(...suave);
      doc.text('— em branco —', M + 5, y + 9);
    } else if (escolha.tipo === 'legenda') {
      doc.setFont('helvetica', 'bold').setFontSize(13).setTextColor(...grafite);
      doc.text(`Legenda ${escolha.partido}`, M + 5, y + 9);
      doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...suave);
      doc.text('voto no partido, sem nome', M + 5, y + 14);
    } else {
      doc.setFont('helvetica', 'bold').setFontSize(13).setTextColor(...grafite);
      doc.text(String(escolha.nome).slice(0, 44), M + 5, y + 9);
      doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...suave);
      doc.text(escolha.partido || '', M + 5, y + 14);
    }

    const num = numeroFormatado(escolha);
    if (num) {
      doc.setFont('courier', 'bold').setFontSize(22).setTextColor(...cobre);
      doc.text(num, 210 - M - 5, y + 10, { align: 'right' });
    }

    y += caixaAlt + 4;
    if (y > 250 && n < VAGAS.length) { doc.addPage(); y = M; }
  }

  y += 4;
  doc.setFont('helvetica', 'normal').setFontSize(8.5).setTextColor(...suave);
  const rodape = doc.splitTextToSize(
    'Esta colinha foi preenchida por você, no seu navegador. O Prumo não escolheu nenhum destes '
    + 'nomes e não recomenda voto. Nada do que você respondeu ou escolheu foi guardado ou enviado '
    + 'para lugar nenhum. Confira os números na urna antes de confirmar: números mudam quando há '
    + 'renúncia, substituição ou indeferimento. Consulte o TSE no dia.',
    210 - M * 2,
  );
  doc.text(rodape, M, y);

  doc.save('minha-colinha-2026.pdf');
}
