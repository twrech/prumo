/**
 * Prumo — geração do PDF no próprio navegador ("a colinha").
 *
 * jsPDF entra sob demanda por CDN: quem não clica no botão não baixa a
 * biblioteca. Nada é enviado para lugar nenhum — o PDF é montado na máquina
 * de quem responde.
 *
 * O PDF contém gráfico, posições, confianças, rótulo, síntese, código de
 * perfil e data. Nunca contém as respostas.
 */

import { EIXOS, faixaIntensidade, faixaConfianca } from './motor.js';
import { radar, svgParaPng } from './grafico.js';

const CDN = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';

let promessaJsPdf = null;

function carregarJsPdf() {
  if (window.jspdf?.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
  if (promessaJsPdf) return promessaJsPdf;

  promessaJsPdf = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = CDN;
    script.onload = () => (window.jspdf?.jsPDF
      ? resolve(window.jspdf.jsPDF)
      : reject(new Error('a biblioteca de PDF carregou incompleta')));
    script.onerror = () => reject(new Error('não foi possível baixar a biblioteca de PDF'));
    document.head.append(script);
  });
  return promessaJsPdf;
}

function faixaDoEixo(eixo, valor) {
  return eixo.faixas.find((f) => valor >= f.de && valor <= f.ate)
    || eixo.faixas[Math.floor(eixo.faixas.length / 2)];
}

function dataPorExtenso(iso) {
  const [ano, mes, dia] = iso.split('-');
  const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  return `${Number(dia)} de ${meses[Number(mes) - 1]} de ${ano}`;
}

export async function gerarPdf({ perfil, eixos, arquetipos, codigo, textoIa = '' }) {
  const jsPDF = await carregarJsPdf();

  const svg = radar(perfil.posicao, perfil.confianca, eixos, {
    cor: '#9c5a24', corTexto: '#55575c', corTextoForte: '#1b1c1e',
    corGrade: '#d9d5cf', corFundo: '#ffffff',
  });
  const png = await svgParaPng(svg, 2);

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const M = 18;                       // margem
  const L = 210 - M * 2;              // largura útil
  let y = M;

  const cobre = [156, 90, 36];
  const grafite = [27, 28, 30];
  const suave = [85, 87, 92];

  const principal = arquetipos.arquetipos.find((a) => a.id === perfil.rotulo);
  const segundo = arquetipos.arquetipos.find((a) => a.id === perfil.rotulo2);
  const faixa = faixaIntensidade(perfil.intensidade);

  // Cabeçalho
  doc.setFont('helvetica', 'bold').setFontSize(22).setTextColor(...grafite);
  doc.text('Prumo', M, y + 6);
  const larguraMarca = doc.getTextWidth('Prumo');
  doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...suave);
  doc.text('seu perfil político em cinco eixos', M + larguraMarca + 3, y + 6);
  doc.setDrawColor(...cobre).setLineWidth(0.6);
  doc.line(M, y + 10, 210 - M, y + 10);
  y += 20;

  // Rótulo
  doc.setFont('helvetica', 'bold').setFontSize(17).setTextColor(...cobre);
  const titulo = (faixa === 'equilibrado' || perfil.rotulo === 'centrista')
    ? (principal?.nome || perfil.rotulo)
    : `${faixa[0].toUpperCase()}${faixa.slice(1)} ${(principal?.nome || perfil.rotulo).toLowerCase()}`;
  doc.text(titulo, M, y);
  y += 7;

  doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...suave);
  const subtitulo = segundo && perfil.intensidade >= 15
    ? `Intensidade ${perfil.intensidade}% · com traços de ${segundo.nome.toLowerCase()}`
    : `Intensidade ${perfil.intensidade}%`;
  doc.text(subtitulo, M, y);
  y += 8;

  if (principal?.longa) {
    doc.setFontSize(10).setTextColor(...grafite);
    const linhas = doc.splitTextToSize(principal.longa, L);
    doc.text(linhas, M, y);
    y += linhas.length * 4.6 + 4;
  }

  // Gráfico
  const lado = 86;
  doc.addImage(png, 'PNG', (210 - lado) / 2, y, lado, lado, 'radar', 'MEDIUM');
  y += lado + 6;

  // Eixo por eixo: título à esquerda, explicação à direita.
  doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(...grafite);
  doc.text('Eixo por eixo', M, y);
  y += 6.5;

  const COL = 46;                     // onde começa a coluna de texto
  for (const k of EIXOS) {
    const eixo = eixos.find((e) => e.codigo === k);
    if (!eixo) continue;
    const valor = perfil.posicao[k];
    const polo = valor === 0 ? 'centro' : (valor < 0 ? eixo.polo_negativo : eixo.polo_positivo).nome;
    const linhas = doc.splitTextToSize(faixaDoEixo(eixo, valor).texto, L - COL);

    if (y + linhas.length * 4.2 > 272) { doc.addPage(); y = M; }

    doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(...grafite);
    doc.text(eixo.nome, M, y);
    doc.setFont('helvetica', 'bold').setFontSize(9.5).setTextColor(...cobre);
    doc.text(`${polo} ${Math.abs(valor)}%`, M, y + 4.6);
    doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...suave);
    doc.text(`certeza: ${faixaConfianca(perfil.confianca[k])}`, M, y + 8.8);

    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...grafite);
    doc.text(linhas, M + COL, y);

    doc.setDrawColor(228, 224, 218).setLineWidth(0.2);
    const altura = Math.max(11, linhas.length * 4.2);
    doc.line(M, y + altura - 1.5, 210 - M, y + altura - 1.5);
    y += altura + 3.5;
  }

  y += 2;

  // Texto da IA, se houver
  if (textoIa.trim()) {
    if (y > 230) { doc.addPage(); y = M; }
    doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(...grafite);
    doc.text('Leitura do seu resultado', M, y);
    y += 6;
    doc.setFont('helvetica', 'normal').setFontSize(9.5).setTextColor(...grafite);
    const linhas = doc.splitTextToSize(textoIa.trim(), L);
    for (const linha of linhas) {
      if (y > 275) { doc.addPage(); y = M; }
      doc.text(linha, M, y);
      y += 4.4;
    }
    y += 4;
  }

  // Rodapé
  if (y > 255) { doc.addPage(); y = M; }
  y = Math.max(y, 262);
  doc.setDrawColor(220, 216, 210).setLineWidth(0.2);
  doc.line(M, y, 210 - M, y);
  y += 5;

  doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...grafite);
  doc.text('Código do seu perfil:', M, y);
  doc.setFont('courier', 'bold').setFontSize(11).setTextColor(...cobre);
  doc.text(codigo, M + 33, y);
  y += 5;

  doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...suave);
  const nota = 'Este código guarda apenas as cinco posições acima, nunca as suas respostas: a partir dele ninguém consegue '
    + 'reconstruir o que você respondeu. Nenhuma resposta foi transmitida ou gravada em lugar algum. '
    + `Gerado em ${dataPorExtenso(perfil.data)} · github.com/twrech/prumo`;
  doc.text(doc.splitTextToSize(nota, L), M, y);

  doc.save(`prumo-${perfil.data}.pdf`);
}
