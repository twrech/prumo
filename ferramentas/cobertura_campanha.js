/**
 * Confere dados/campanha-sc.json contra dados/candidatos-sc.json e mede a
 * cobertura (meta: 50% dos candidatos com ao menos uma frase).
 *
 *   node ferramentas/cobertura_campanha.js
 *
 * Falha (código 1) se alguma entrada estiver fora da regra: candidato que não
 * existe na base, texto vazio, tipo ou meio desconhecido, fonte ausente, ou
 * reportagem sem o nome do veículo.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ler = (n) => JSON.parse(readFileSync(fileURLToPath(new URL(`../dados/${n}`, import.meta.url)), 'utf8'));
const camp = ler('campanha-sc.json');
const base = ler('candidatos-sc.json').candidatos;
const porId = new Map(base.map((c) => [c.id, c]));

const erros = [];
for (const [id, lista] of Object.entries(camp.frases)) {
  if (!porId.has(id)) erros.push(`${id}: candidato não está em candidatos-sc.json`);
  if (!Array.isArray(lista) || !lista.length) erros.push(`${id}: lista vazia`);
  for (const [i, f] of (lista || []).entries()) {
    const onde = `${id}[${i}]`;
    if (!f.texto || !f.texto.trim()) erros.push(`${onde}: texto vazio`);
    if (!camp.tipos[f.tipo]) erros.push(`${onde}: tipo "${f.tipo}" desconhecido`);
    if (!camp.meios.includes(f.meio)) erros.push(`${onde}: meio "${f.meio}" desconhecido`);
    if (!f.fonte) erros.push(`${onde}: sem fonte`);
    if (f.tipo === 'imprensa' && !f.veiculo) erros.push(`${onde}: reportagem sem veículo`);
    if (f.descricao && f.descricao.length > 160) erros.push(`${onde}: descrição passa de uma linha`);
  }
}

const com = new Set(Object.keys(camp.frases).filter((id) => porId.has(id)));
const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);
const grupo = (chave) => {
  const m = new Map();
  for (const c of base) {
    const k = c[chave];
    const g = m.get(k) || { total: 0, com: 0 };
    g.total += 1; if (com.has(c.id)) g.com += 1;
    m.set(k, g);
  }
  return [...m.entries()].sort((a, b) => b[1].total - a[1].total);
};

console.log(`\nCobertura: ${com.size} de ${base.length} candidatos (${pct(com.size, base.length)}%) · meta 50%`);
const tipos = {};
for (const l of Object.values(camp.frases)) for (const f of l) tipos[f.tipo] = (tipos[f.tipo] || 0) + 1;
console.log(`Frases por tipo: ${JSON.stringify(tipos)}`);
console.log('\nPor cargo:');
for (const [k, g] of grupo('cargo')) console.log(`  ${k.padEnd(20)} ${String(g.com).padStart(4)} / ${String(g.total).padStart(4)}  ${pct(g.com, g.total)}%`);
console.log('\nPor partido:');
for (const [k, g] of grupo('partido')) console.log(`  ${k.padEnd(14)} ${String(g.com).padStart(4)} / ${String(g.total).padStart(4)}  ${pct(g.com, g.total)}%`);

if (erros.length) {
  console.log(`\n${erros.length} problema(s):`);
  for (const e of erros) console.log(`  ${e}`);
  process.exit(1);
}
console.log('\nSem problemas de formato.');
