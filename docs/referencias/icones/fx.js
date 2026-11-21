const s=require('fs').readFileSync('/home/user/dashV/index.html','utf8');
let i=s.indexOf('var PF_FUNCOES=['), j=i+'var PF_FUNCOES='.length, d=0, k=j, q=null;
for(;k<s.length;k++){const c=s[k];if(q){if(c==='\\'){k++;continue}if(c===q)q=null;continue}if(c==="'"||c==='"'||c==='`'){q=c;continue}if(c==='[')d++;else if(c===']'){d--;if(!d)break}}
const F=eval(s.slice(j,k+1));
const A=eval(s.slice(s.indexOf('[',s.indexOf('var PF_FUNC_AREAS')), s.indexOf(';',s.indexOf('var PF_FUNC_AREAS'))));
console.log(F.length);const by={};F.forEach(f=>(by[f.a]=by[f.a]||[]).push(f));A.forEach(a=>console.log(a[0],(by[a[0]]||[]).length));
require('fs').writeFileSync(process.argv[2],JSON.stringify({A,F:F.map(f=>({a:f.a,n:f.n,o:f.o,d:f.d}))}));
