# Gera data/pf-numeros.json (relatório 📈 O tamanho do PF). Rodar da raiz: git fetch --unshallow (se raso) && git fetch origin main && python3 scripts/pf-numeros.py
import subprocess, json, re, datetime, os
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))  # raiz do repositório
def sh(c): return subprocess.run(c, shell=True, capture_output=True, text=True).stdout
log = sh("git log origin/main --reverse --format='%H|%ad|%s' --date=short").strip().split('\n')
rows = [l.split('|', 2) for l in log]
VER = re.compile(r'^v1[0-9]{2}\.[0-9]+')
EXTRA = ['c.html', 'ajuste.html', 'foto.html']
PASTAS = ['extensao-whatsapp', 'portal', 'scripts', 'supabase', 'demo']
def linhas_codigo(rev):
    tot = 0
    out = sh(f"git ls-tree -r --name-only {rev}")
    for f in out.split('\n'):
        if not re.search(r'\.(html|js|py|sql|ts)$', f): continue
        if f == 'index.html' or f in EXTRA or any(f.startswith(p + '/') for p in PASTAS):
            if 'wppconnect' in f: continue  # biblioteca de terceiros
            tot += sh(f"git show {rev}:'{f}' | wc -l").strip() and int(sh(f"git show {rev}:'{f}' | wc -l").strip())
    return tot
semanas = []
d = datetime.date(2026, 6, 1)
hoje = datetime.date.today()
fim = hoje
while d <= hoje:
    lim = d.isoformat()
    upto = [r for r in rows if r[1] < lim]
    if upto:
        rev = upto[-1][0]
        vers = len({VER.match(r[2]).group(0) for r in upto if VER.match(r[2])})
        idx = int(sh(f"git show {rev}:index.html | wc -l").strip() or 0)
        semanas.append({'d': lim, 'commits': len(upto), 'versoes': vers, 'dias': len({r[1] for r in upto}), 'linhas': idx, 'codigo': linhas_codigo(rev)})
    d += datetime.timedelta(days=7)
# ponto de hoje (ate o ultimo commit)
rev = rows[-1][0]
vers = len({VER.match(r[2]).group(0) for r in rows if VER.match(r[2])})
atual = {'d': hoje.isoformat(), 'commits': len(rows), 'versoes': vers, 'dias': len({r[1] for r in rows}),
         'linhas': int(sh("git show origin/main:index.html | wc -l").strip()), 'codigo': linhas_codigo(rev)}
idx = sh("git show origin/main:index.html")
atual['pedidos'] = idx.count('A pedido do Vitor')
m = idx[idx.find('var PF_FUNCOES=['):]
m = m[:m.find('\n];')]
atual['funcoes'] = len(re.findall(r"^\s*\{a:'", m, re.M))
atual['arquivos'] = len(sh("git ls-tree -r --name-only origin/main").strip().split('\n'))
atual['prs'] = len(set(re.findall(r'\(#(\d+)\)', '\n'.join(r[2] for r in rows))))
porMes = {}
for r in rows: porMes[r[1][:7]] = porMes.get(r[1][:7], 0) + 1
vmes = {}
seen = set()
for r in rows:
    mm = VER.match(r[2])
    if mm and mm.group(0) not in seen:
        seen.add(mm.group(0)); vmes[r[1][:7]] = vmes.get(r[1][:7], 0) + 1
out = {'inicio': rows[0][1], 'atualizado': hoje.isoformat(), 'atual': atual, 'semanas': semanas,
       'porMes': [{'m': k, 'commits': porMes[k], 'versoes': vmes.get(k, 0)} for k in sorted(porMes)]}
json.dump(out, open('data/pf-numeros.json', 'w'), ensure_ascii=False, indent=1)
print(json.dumps(atual, ensure_ascii=False)); print(len(semanas), 'semanas')
