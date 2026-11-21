const {A,F}=JSON.parse(require('fs').readFileSync(process.argv[2],'utf8'));
const curto=t=>{t=String(t||'').replace(/\s+/g,' ').trim();let m=t.match(/^.{20,160}?[.!?](\s|$)/);t=m?m[0].trim():t;if(t.length>170)t=t.slice(0,167).replace(/\s\S*$/,'')+'…';return t;};
const ord=[];A.forEach(a=>F.filter(f=>f.a===a[0]).forEach(f=>ord.push(Object.assign({area:a[2]},f))));
let o=`# Prompts pro Gemini — um ícone pra CADA função do PartsFlow, com 4 modelos

São as ${ord.length} funções do "📚 O que o sistema faz" (a lista oficial do sistema). Cada folha tem **4 funções × 4 modelos**:
cada LINHA da grade é uma função e as 4 colunas são 4 jeitos diferentes de desenhar a mesma ideia. Você (ou quem você liberar)
escolhe o modelo preferido de cada função dentro do PF; os outros ficam guardados como opção.

São ${Math.ceil(ord.length/4)} folhas por estilo (${ord.length*4} ícones). Os ícones genéricos (salvar, buscar, peças, máquinas…) continuam no PROMPTS-GEMINI.md.

Como pedir: cole o PROMPT BASE do estilo + a FOLHA (as 4 linhas). Sempre na ordem — é ela que dá o nome de cada ícone.
Função nova no sistema = entra numa folha nova no fim (eu atualizo este arquivo).

---

## PROMPT BASE — MINIMALISTA (traço)

\`\`\`
Create a single image: a 4x4 grid sheet of 16 UI icons, evenly spaced, each centered in its own square cell, same visual size.
Each ROW is ONE feature of an auto-parts business software (descriptions below are in Portuguese).
The 4 icons in the same row must be 4 DIFFERENT visual concepts / metaphors for that same feature (not the same drawing 4 times).
Style: minimalist outline icons in the style of Lucide / Feather icons.
- Pure black (#000000) strokes only, no fill, no color, no gradients, no shadows, no 3D.
- Consistent 2px stroke on a 24x24 grid, rounded caps and joins, simple geometric shapes, generous padding.
- Pure flat white background (#FFFFFF), no cell borders, no grid lines, no labels, no text, no numbers, no letters, no brand logos.
- All 16 icons must look like one consistent icon set (same stroke, same corner radius, same level of detail).
Rows, top to bottom:
\`\`\`

## PROMPT BASE — INTUITIVA (3D)

\`\`\`
Create a single image: a 4x4 grid sheet of 16 app icons, evenly spaced, each centered in its own square cell, same visual size.
Each ROW is ONE feature of an auto-parts business software (descriptions below are in Portuguese).
The 4 icons in the same row must be 4 DIFFERENT visual concepts / metaphors for that same feature (not the same object 4 times).
Style: modern, clean, professional 3D icons, similar to Microsoft Fluent 3D icons — soft matte "clay" material with a subtle gloss,
smooth rounded forms, soft studio lighting from the top left, gentle soft shadow under each object, slight 3/4 front view, same camera angle for all.
- Limited corporate palette: deep navy blue #1F4E79, orange accent #E67E22 (small accents only), white, light gray #D9DEE5, dark gray #3A4654.
- One simple object (or at most two) per icon, no clutter, no tiny details, readable at 32px.
- Solid flat magenta background (#FF00FF) filling the whole image, no cell borders, no grid lines, no labels, no text, no numbers, no letters, no brand logos.
- All 16 icons must look like one consistent icon set (same material, same lighting, same size, same angle).
Rows, top to bottom:
\`\`\`

---

## FOLHAS
`;
let area='';
for(let p=0;p<ord.length;p+=4){
  const L=ord.slice(p,p+4), n=String(p/4+1).padStart(2,'0');
  const ar=[...new Set(L.map(x=>x.area))].join(' / ');
  o+=`\n**Folha F${n}** — ${ar}\n\`\`\`\n`;
  L.forEach((x,r)=>{o+=`Row ${r+1} — "${x.n}": ${curto(x.o)}\n`;});
  if(L.length<4) o+=`(Only ${L.length} rows: leave the remaining rows empty.)\n`;
  o+='```\n';
}
o+=`\n---\n\n## Dicas\n- Se numa linha os 4 modelos saírem parecidos demais, peça: "Row 2: make the 4 concepts really different from each other".\n- Se o Gemini escrever texto dentro do ícone, peça de novo a folha com "absolutely no text".\n- Mande as folhas como vierem (print ou arquivo): eu recorto, tiro o fundo e guardo cada ícone com o nome da função + modelo (a, b, c, d).\n`;
require('fs').writeFileSync('/home/user/dashV/docs/referencias/icones/PROMPTS-FUNCOES.md',o);
console.log(o.length, Math.ceil(ord.length/4));
