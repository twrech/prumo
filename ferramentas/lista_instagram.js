// Gera a lista de perfis de Instagram ainda sem frase, para coleta manual.
// Ordem: partidos com menor cobertura primeiro; entre eles, os maiores; depois senado > federal > estadual.
import fs from 'node:fs';
const ler=(a)=>JSON.parse(fs.readFileSync(new URL('../dados/'+a,import.meta.url),'utf8'));
const c=ler('candidatos-sc.json').candidatos, r=ler('redes-sc.json').candidatos, f=ler('campanha-sc.json').frases;
const tot={},cob={};for(const x of c){tot[x.partido]=(tot[x.partido]||0)+1;if(f[x.id])cob[x.partido]=(cob[x.partido]||0)+1;}
const pct=p=>(cob[p]||0)/tot[p];
const ordCargo={'Senador':0,'Deputado Federal':1,'Deputado Estadual':2};
const l=c.filter(x=>!f[x.id]&&r[x.id]?.instagram.length).sort((a,b)=>pct(a.partido)-pct(b.partido)||tot[b.partido]-tot[a.partido]||a.partido.localeCompare(b.partido)||ordCargo[a.cargo]-ordCargo[b.cargo]||a.nome.localeCompare(b.nome));
const q=s=>'"'+String(s).replace(/"/g,'""')+'"';
let out='﻿ordem;id;partido;cobertura_do_partido;cargo;nome;numero;instagram;frase_copiada\n';
l.forEach((x,i)=>out+=[i+1,x.id,x.partido,Math.round(pct(x.partido)*100)+'%',x.cargo,x.nome,x.numero,'https://www.instagram.com/'+r[x.id].instagram[0]+'/',''].map(q).join(';')+'\n');
const destino=process.argv[2]||'coleta/instagram-para-copiar.csv';
fs.writeFileSync(destino,out);
console.log(l.length+' perfis → '+destino);
