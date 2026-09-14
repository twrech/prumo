/**
 * Conserta a portabilidade dos caminhos nas ferramentas.
 *
 *   node ferramentas/corrigir-caminhos.mjs
 *
 * PROBLEMA: o campo `.pathname` de uma URL de arquivo devolve `/C:/Users/...`
 * no Windows, e o Node transforma isso em `C:\C:\Users\...` — caminho inválido,
 * com a letra do disco duplicada. No Linux funciona por acidente, porque lá o
 * pathname já é um caminho de sistema de arquivos válido. Resultado: todas as
 * ferramentas rodavam no contêiner e quebravam na máquina do usuário, e o
 * defeito só apareceu quando alguém rodou fora do Linux.
 *
 * SOLUÇÃO: `fileURLToPath()`, do módulo `node:url`, que é a função feita para
 * isso e acerta nos dois sistemas.
 *
 * Uso pontual; depois de rodar uma vez, o repositório está consertado. Ficou
 * guardado porque o erro é fácil de reintroduzir sem perceber — basta escrever
 * a ferramenta seguinte copiando de uma antiga.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const raiz = fileURLToPath(new URL('../', import.meta.url));

function arquivos(dir, achados = []) {
  for (const nome of readdirSync(dir)) {
    if (nome === 'node_modules' || nome === '.git') continue;
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) arquivos(caminho, achados);
    else if (/\.(js|mjs)$/.test(nome)) achados.push(caminho);
  }
  return achados;
}

const IMPORT = "import { fileURLToPath } from 'node:url';";
let mexidos = 0;

for (const caminho of arquivos(raiz)) {
  let t = readFileSync(caminho, 'utf8');
  if (!t.includes('.pathname')) continue;

  const antes = t;

  // new URL(<qualquer coisa>, import.meta.url).pathname  →  fileURLToPath(new URL(...))
  t = t.replace(
    /new URL\((`[^`]*`|'[^']*'|"[^"]*"),\s*import\.meta\.url\)\.pathname/g,
    'fileURLToPath(new URL($1, import.meta.url))'
  );

  if (t === antes) continue;

  if (!t.includes(IMPORT)) {
    // entra logo depois do último import existente
    const linhas = t.split('\n');
    let ultimo = -1;
    for (let i = 0; i < linhas.length; i++) if (/^import .*from '.*';$/.test(linhas[i])) ultimo = i;
    if (ultimo >= 0) linhas.splice(ultimo + 1, 0, IMPORT);
    else linhas.unshift(IMPORT);
    t = linhas.join('\n');
  }

  writeFileSync(caminho, t);
  mexidos++;
  console.log(`corrigido: ${caminho.slice(raiz.length)}`);
}

console.log(`\n${mexidos} arquivo(s) corrigido(s).`);
