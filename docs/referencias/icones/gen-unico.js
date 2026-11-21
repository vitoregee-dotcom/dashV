// Monta os prompts ÚNICOS pro Gemini (um texto só por estilo, com todos os ícones) a partir do PROMPTS-GEMINI.md e da lista de funções.
const fs=require('fs'),D=__dirname;
const md=fs.readFileSync(D+'/PROMPTS-GEMINI.md','utf8');
const gen=[];md.split('\n').forEach(l=>{if(/^1\. /.test(l)){l.split(/\s(?=\d+\.\s)/).forEach(p=>gen.push(p.replace(/^\d+\.\s*/,'').trim()));}});
const F=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const curto=t=>{t=String(t||'').replace(/\s+/g,' ').trim();let m=t.match(/^.{20,120}?[.!?](\s|$)/);t=m?m[0].trim():t;return t.length>130?t.slice(0,127).replace(/\s\S*$/,'')+'…':t;};
const ord=[];F.A.forEach(a=>F.F.filter(f=>f.a===a[0]).forEach(f=>ord.push(f)));
const EST={
min:`STYLE (identical in every image): minimalist outline icons in the style of Lucide / Feather icons. Pure black (#000000) strokes only, no fill, no color, no gradients, no shadows, no 3D. Consistent 2px stroke on a 24x24 grid, rounded caps and joins, simple geometric shapes, generous padding. Pure flat white background (#FFFFFF).`,
d3:`STYLE (identical in every image): modern, clean, professional 3D icons similar to Microsoft Fluent 3D icons — soft matte "clay" material with a subtle gloss, smooth rounded forms, soft studio lighting from the top left, gentle soft shadow under each object, slight 3/4 front view, same camera angle for all. Limited corporate palette: deep navy blue #1F4E79, orange accent #E67E22 (small accents only), white, light gray #D9DEE5, dark gray #3A4654. One simple object per icon, readable at 32px. Solid flat magenta background (#FF00FF) filling the whole image.`};
const REG=`RULES for every image: icons evenly spaced in a grid, each centered in its own square cell, all the same visual size; no cell borders, no grid lines, no labels, no text, no numbers, no letters, no brand logos; every icon in every image must look like part of ONE consistent icon set. Keep the exact order given (left to right, top to bottom).
WORKFLOW: this is a large batch. Generate the images ONE AFTER ANOTHER, in order (Image 1, Image 2, …), as many as you can in this answer. When you stop, I will just type "continua" and you continue from the next image number with exactly the same style. Do not ask me anything, do not explain, just generate the images.`;
function geral(e){const C=36;let o=`I need a complete icon set of ${gen.length} icons for a professional auto-parts business web app, split into ${Math.ceil(gen.length/C)} images of 6x6 (36 icons each).\n${EST[e]}\n${REG}\n`;
 for(let i=0;i<gen.length;i+=C){o+=`\nImage ${i/C+1} (6x6 grid):\n`+gen.slice(i,i+C).map((g,j)=>`${i+j+1}. ${g}`).join('\n')+'\n';}return o;}
function func(e){const P=8;let o=`I need icons for ${ord.length} features of an auto-parts business software (descriptions in Portuguese), with 4 DIFFERENT design options for each feature: ${ord.length*4} icons, split into ${Math.ceil(ord.length/P)} images.
Each image is a grid of 4 columns x 8 rows: each ROW is ONE feature and its 4 icons are 4 DIFFERENT visual concepts / metaphors for that feature (not the same drawing 4 times).\n${EST[e]}\n${REG}\n`;
 for(let i=0;i<ord.length;i+=P){o+=`\nImage ${i/P+1} (4 columns x ${Math.min(P,ord.length-i)} rows):\n`+ord.slice(i,i+P).map((x,j)=>`Row ${j+1} — "${x.n}": ${curto(x.o)}`).join('\n')+'\n';}return o;}
const out=[['GERAL-MINIMALISTA',geral('min')],['GERAL-3D',geral('d3')],['FUNCOES-MINIMALISTA',func('min')],['FUNCOES-3D',func('d3')]];
out.forEach(([n,t])=>fs.writeFileSync(D+'/PROMPT-UNICO-'+n+'.txt',t));
console.log(gen.length,ord.length,out.map(x=>x[0]+':'+x[1].length).join(' '));
