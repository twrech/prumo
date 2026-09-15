/**
 * Prumo — monta o arquivo que a interface lê para os candidatos ao Executivo.
 *
 *   node ferramentas/montar_executivo.js
 *
 * Junta `dados/planos/planos-revelado.json` (o que foi lido em cada plano) com
 * `dados/planos/planos-sc.json` (o registro no TSE) e escreve
 * `dados/executivo-sc.json`.
 *
 * POR QUE O EXECUTIVO NÃO ENTRA PELA ABA DO PARTIDO
 *   A etapa 3 dos deputados entra pela ficha do partido, porque é assim que o
 *   voto de lista funciona. Presidente e governador, não: vota-se no nome. E há
 *   uma razão prática que decide a questão — dos 15 partidos com candidato ao
 *   Executivo em 2026, **8 não têm ficha na etapa 2**, porque não têm bancada
 *   medida na Câmara: PRTB, MISSÃO, DEMOCRATA, DC, PCB, PSTU, UP e PCO.
 *   Pendurar o Executivo na aba do partido sumiria com oito candidaturas — entre
 *   elas todas as de esquerda fora do PT. O Executivo ganha seção própria.
 *
 * TRÊS ESTADOS, NÃO DOIS
 *   Um candidato pode estar em três situações diferentes, e a interface é
 *   obrigada a distingui-las porque elas dizem coisas opostas ao eleitor:
 *     · `plano`           — plano legível e lido contra o catálogo
 *     · `plano-ilegivel`  — registrou plano, mas o PDF é imagem: não há o que citar
 *     · `sem-plano`       — não consta plano registrado
 *   Misturar as três faria o silêncio parecer moderação e a ilegibilidade
 *   parecer omissão.
 *
 * O QUE ESTE ARQUIVO NÃO CARREGA
 *   Número de urna, patrimônio e ocupação. O Prumo compara política, e o número
 *   qualquer pessoa acha em dois cliques no site do TSE.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const EIXOS = ['eco', 'soc', 'pod', 'sob', 'amb'];
const CONFIANCA_MINIMA = 60; // mesma trava da etapa 2

const caminho = (n) => fileURLToPath(new URL(`../dados/${n}`, import.meta.url));

const revelado = JSON.parse(readFileSync(caminho('planos/planos-revelado.json'), 'utf8'));
const indice = JSON.parse(readFileSync(caminho('planos/planos-sc.json'), 'utf8')).planos;
const temas = JSON.parse(readFileSync(caminho('planos/temas-planos.json'), 'utf8')).temas;
const porTema = new Map(temas.map((t) => [t.id, t]));

const CARGO = { pres: 'Presidente da República', gov: 'Governador de Santa Catarina' };

const lidos = new Map(revelado.candidatos.map((c) => [c.id, c]));
const numeros = new Map(readFileSync(caminho('executivo-numeros.psv'), 'utf8')
  .trim().split('\n').filter(Boolean)
  .map((l) => { const [id, n] = l.split('|'); return [id, Number(n)]; }));
const ilegiveis = new Map((revelado.sem_camada_de_texto || []).map((c) => [c.id, c]));

const candidatos = indice.map((reg) => {
  const base = {
    id: reg.id,
    nome: reg.nome,
    partido: reg.partido,
    cargo: reg.cargo,
    cargo_nome: CARGO[reg.cargo] || reg.cargo,
    ue: reg.ue,
    paginas: reg.paginas ?? null,
    // O número da urna. Presidente e governador são cargos MAJORITÁRIOS: o
    // número do candidato é o número do partido, dois dígitos. Vem do registro
    // do TSE (listar/.../candidatos), não é deduzido daqui.
    numero: numeros.get(String(reg.id)) ?? null,
  };

  const lido = lidos.get(reg.id);
  if (lido) {
    const eixosComBase = EIXOS.filter((e) => lido.confianca[e] >= CONFIANCA_MINIMA);
    return {
      ...base,
      evidencia: 'plano',
      leitura: lido.leitura || null,
      posicao: lido.posicao,
      confianca: lido.confianca,
      confianca_media: lido.confianca_media,
      temas_respondidos: lido.temas_respondidos,
      temas_no_catalogo: lido.temas_no_catalogo,
      eixos_com_base: eixosComBase,
      // A conta de compatibilidade com o eleitor só é liberada pela mesma trava
      // da etapa 2. Em 2026 nenhum plano a alcança, e a interface tem de dizer
      // isso em vez de exibir um número que não se sustenta.
      permite_compatibilidade: lido.confianca_media >= CONFIANCA_MINIMA,
      passagens: lido.passagens.map((p) => ({
        ...p,
        eixos: EIXOS.filter((e) => (porTema.get(p.tema)?.vetor[e] || 0) !== 0),
      })),
    };
  }

  if (ilegiveis.has(reg.id)) {
    return { ...base, evidencia: 'plano-ilegivel' };
  }

  return { ...base, evidencia: 'sem-plano' };
});

const ordem = { pres: 0, gov: 1 };
candidatos.sort((a, b) => ordem[a.cargo] - ordem[b.cargo] || a.nome.localeCompare(b.nome, 'pt-BR'));

writeFileSync(caminho('executivo-sc.json'), `${JSON.stringify({
  versao: '1.0',
  gerado_em: new Date().toISOString().slice(0, 10),
  fonte: 'Plano de governo registrado no TSE, eleição 20322002026, lido contra o catálogo de temas-planos.json',
  o_que_isto_mede: 'o que a pessoa diz que fará — não o que ela fez',
  confianca_minima: CONFIANCA_MINIMA,
  regra: revelado.regra,
  catalogo: revelado.catalogo,
  candidatos,
}, null, 2)}\n`);

const c = (e) => candidatos.filter((x) => x.evidencia === e).length;
console.log(`executivo-sc.json · ${candidatos.length} candidatos`);
console.log(`  plano lido: ${c('plano')} · plano ilegível: ${c('plano-ilegivel')} · sem plano: ${c('sem-plano')}`);
console.log(`  com compatibilidade liberada: ${candidatos.filter((x) => x.permite_compatibilidade).length}`);
const comBase = candidatos.filter((x) => x.eixos_com_base?.length);
console.log(`  com ao menos um eixo acima de ${CONFIANCA_MINIMA}%: ${comBase.length}`);
for (const x of comBase) console.log(`    ${x.nome.padEnd(26)} ${x.eixos_com_base.join(', ')}`);
