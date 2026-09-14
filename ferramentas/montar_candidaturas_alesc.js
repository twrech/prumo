import { readFileSync, writeFileSync } from 'node:fs';

const BASE = '/home/claude/prumo/dados/';
const dep = JSON.parse(readFileSync(`${BASE}alesc/deputados-alesc.json`, 'utf8')).deputados;
const est = readFileSync(`${BASE}alesc/cand-estadual-sc.psv`, 'utf8').trim().split('\n')
  .map((l) => { const [id, nome, num, part, sit] = l.split('|'); return { id, nome, numero: num, partido: part, situacao: sit, cargo: 'Deputado Estadual' }; });
const fed = (JSON.parse(readFileSync(`${BASE}candidatos-sc.json`, 'utf8')).candidatos || [])
  .map((c) => ({ id: String(c.id), nome: c.nome, numero: c.numero, partido: c.partido, situacao: c.situacao_do_registro, cargo: c.cargo }));
const todos = [...est, ...fed];
const porId = new Map(todos.map((c) => [c.id, c]));

const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z ]/g, '').replace(/\s+/g, ' ').trim();
const porNome = new Map();
for (const c of todos) {
  const k = norm(c.nome);
  if (!porNome.has(k)) porNome.set(k, []);
  porNome.get(k).push(c);
}

// Decisões tomadas à mão, cada uma com o que a sustenta.
const A_MAO = {
  'DR. VICENTE CAROPRESO': { id: '240002543392', prova: 'TSE: nome completo VICENTE AUGUSTO CAROPRESO, eleito deputado estadual em 2014, 2018 e 2022 pelo PSDB; concorre em 2026 pelo UNIÃO com nome de urna DR. VICENTE' },
  'PADRE PEDRO BALDISSERA': { id: '240002540082', prova: 'TSE: nome completo PEDRO BALDISSERA, eleito deputado estadual em 2006, 2010, 2014, 2018 e 2022 pelo PT; nome de urna em 2026 é PADRE PEDRO' },
};

const NAO_CONCORRE = {
  'MAURÍCIO ESKUDLARK': 'Não consta candidatura em 2026 a estadual, federal ou Senado. Há "CHICA DO ESKUDLARK" (PL, estadual), que é outra pessoa — casar por sobrenome daria a ela o histórico de voto dele.',
  'VOLNEI WEBER': 'Não consta candidatura em 2026 em nenhum dos três cargos, nem sob outra grafia.',
  'JOSÉ MILTON SCHEFFER': 'Não consta. Há "SANDRA SCHEFFER" (UNIÃO, estadual), que é outra pessoa.',
  'DELEGADO EGIDIO': 'NÃO CONFIRMADO. O único nome plausível é EGIDIO BECKHAUSER (REPUBLICANOS, Deputado Federal), suplente de estadual em 2022 e vereador em Blumenau — compatível com um suplente que assumiu por pouco tempo, mas o TSE não traz nada que ligue os dois com certeza. Sem prova, não se atribui: o registro fica sem candidatura casada.',
};

const saida = [];
for (const d of dep) {
  if (!d.eixos_com_base.length) continue;

  if (A_MAO[d.nome]) {
    const c = porId.get(A_MAO[d.nome].id);
    saida.push({ deputado: d.nome, grafias: d.grafias, candidatura: c, como: 'conferido à mão', prova: A_MAO[d.nome].prova });
    continue;
  }
  if (NAO_CONCORRE[d.nome]) {
    saida.push({ deputado: d.nome, grafias: d.grafias, candidatura: null, como: 'sem candidatura casada', prova: NAO_CONCORRE[d.nome] });
    continue;
  }

  const achados = d.grafias.flatMap((g) => porNome.get(norm(g)) || []);
  const unicos = [...new Map(achados.map((c) => [c.id, c])).values()];
  if (unicos.length === 1) {
    saida.push({ deputado: d.nome, grafias: d.grafias, candidatura: unicos[0], como: 'nome de urna idêntico', prova: null });
  } else {
    saida.push({ deputado: d.nome, grafias: d.grafias, candidatura: null, como: unicos.length ? 'ambíguo' : 'não encontrado', prova: null });
  }
}

const comCand = saida.filter((x) => x.candidatura);
writeFileSync(`${BASE}alesc/candidaturas-alesc.json`, `${JSON.stringify({
  versao: '1.0',
  gerado_em: new Date().toISOString().slice(0, 10),
  o_que_e: 'Liga cada deputado estadual medido à candidatura dele em 2026, quando existe.',
  por_que_a_mao: 'Cruzamento automático por nome erra, e errar aqui é dar a uma pessoa o histórico de voto de outra. O caso que prova a regra está neste lote: "CHICA DO ESKUDLARK" concorre a deputada estadual pelo PL e NÃO é Maurício Eskudlark. Casar por sobrenome atribuiria a ela sete votações que não são dela.',
  regra: 'Só entra candidatura confirmada por nome de urna idêntico ou por prova documental no registro do TSE. Semelhança de nome não basta e não é usada.',
  total_medidos: saida.length,
  com_candidatura: comCand.length,
  sem_candidatura: saida.length - comCand.length,
  por_cargo: comCand.reduce((a, x) => { a[x.candidatura.cargo] = (a[x.candidatura.cargo] || 0) + 1; return a; }, {}),
  deputados: saida,
}, null, 2)}\n`);

console.log(`${saida.length} deputados medidos · ${comCand.length} com candidatura casada`);
for (const x of saida) {
  console.log(x.candidatura
    ? `  ${x.deputado.padEnd(26)} → ${x.candidatura.nome} (${x.candidatura.partido}, ${x.candidatura.cargo})`
    : `  ${x.deputado.padEnd(26)} → ${x.como}`);
}
