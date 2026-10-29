# v115.2479 - A pedido do Vitor ("olha esse catálogo da Spicer… o que podemos usar pra agregar informações no PF" → "pode fazer"):
# lê o catálogo Spicer "Eixos diferenciais e componentes" (caminhões, 2016) direto do PDF (texto, sem IA) e monta
# data/catalogos/spicer-diferenciais-2016.json no formato dos 📚 Catálogos já lidos:
#  • aplicação por veículo × eixo × relação de redução → cada peça (coroa e pinhão, caixa, kits, semieixo, acoplamento) com o veículo (veicDireto, 🚚 Rodoviário)
#  • kits de reparo: o que vem dentro (componentes × qtd)
#  • acessórios por modelo de eixo (Dana 44, 60…)
#  • referência cruzada código da montadora → Spicer (vira conversão "código original <MONTADORA>")
# Uso: python3 scripts/catalogo-spicer/gerar_diferenciais.py <pdf>
import sys, re, json, collections
import pymupdf as fitz

PDF = sys.argv[1] if len(sys.argv) > 1 else 'data/catalogos/spicer-diferenciais-2016.pdf'
d = fitz.open(PDF)
MONT = ['Agrale', 'Chevrolet', 'Ford', 'Iveco', 'Mercedes-Benz', 'Mitsubishi', 'Nissan', 'Toyota', 'Volkswagen', 'Troller', 'Jeep', 'Volare', 'Kia', 'Hyundai', 'Effa', 'Ram', 'Dodge', 'Land Rover', 'International', 'Fiat', 'Peugeot', 'Renault', 'Citroën', 'JAC', 'Foton', 'Asia']
MONT_PF = {'Chevrolet': 'GM', 'Mercedes-Benz': 'MERCEDES-BENZ', 'Volkswagen': 'VOLKSWAGEN'}
COLS = ['veic', 'anos', 'motor', 'eixo', 'rel', 'CP', 'CDC', 'CDV', 'KCD', 'KC', 'KRC', 'KRP', 'SEC', 'SE', 'KSE', 'ACO']
HDR = [('Veículo', 0), ('Anos', 0), ('Motor', 0), ('Eixo', 0), ('Relação', 0), ('Coroa', 0), ('Caixa', 0), ('Caixa', 1), ('Reparo', 0), ('Calços,', 0), ('Rolamentos', 0), ('Rolamentos', 1), ('Semieixo', 0), ('Semieixo', 1), ('Reparo', 1), ('Acoplamento', 0)]
DESC = {'CP': 'COROA E PINHÃO', 'CDC': 'CAIXA DO DIFERENCIAL COMPLETA', 'CDV': 'CAIXA DO DIFERENCIAL VAZIA', 'KCD': 'KIT DE REPARO DA CAIXA DO DIFERENCIAL',
        'KC': 'KIT DE CALÇOS DO DIFERENCIAL', 'KRC': 'KIT DE ROLAMENTOS DA CAIXA DO DIFERENCIAL', 'KRP': 'KIT DE ROLAMENTOS DO PINHÃO', 'SEC': 'SEMIEIXO COMPLETO',
        'SE': 'SEMIEIXO', 'KSE': 'KIT DE REPARO DO SEMIEIXO', 'ACO': 'ACOPLAMENTO DO DIFERENCIAL'}
CODE_RE = re.compile(r'^[A-Z0-9][A-Z0-9.\-/]{2,}$')

def linhas(page):
    ws = page.get_text('words')
    ls = collections.OrderedDict()
    for w in sorted(ws, key=lambda w: (round(w[1]), w[0])):
        y = round((w[1] + w[3]) / 2)
        k = next((k for k in ls if abs(k - y) <= 2), y)
        ls.setdefault(k, []).append(w)
    return [(y, sorted(v, key=lambda w: w[0])) for y, v in sorted(ls.items())]

def cols_da_pagina(page):
    ws = page.get_text('words')
    xs = []
    for nome, idx in HDR:
        c = sorted([w for w in ws if w[4] == nome and w[1] < 110], key=lambda w: w[0])
        if len(c) <= idx: return None
        xs.append(c[idx][0] - 3)
    return xs

def coluna(x, xs):
    i = 0
    for j, c in enumerate(xs):
        if x >= c: i = j
    return COLS[i]

rows = []  # cada linha da tabela de aplicação
montAtual = ''
for pi in range(len(d)):
    pg = d[pi]
    xs = cols_da_pagina(pg)
    if not xs: continue
    cur = None
    for y, ws in linhas(pg):
        if y < 112 or y > 790: continue
        ws = [w for w in ws if w[4] != 'Continuação']
        if not ws: continue
        txt = ' '.join(w[4] for w in ws)
        if len(ws) <= 3 and ws[0][0] < xs[1] and txt.strip() in MONT:
            montAtual = txt.strip(); cur = None; continue
        cel = collections.defaultdict(list)
        for w in ws: cel[coluna(w[0], xs)].append(w[4])
        novo = bool(cel.get('rel')) or bool(cel.get('eixo')) and any(re.match(r'^\d', t) for t in cel.get('eixo', [])) is False and bool(cel.get('eixo'))
        if cel.get('rel') or (cel.get('eixo') and not cur) or (cel.get('veic') and not cur):
            cur = {'mont': montAtual, 'pag': pi + 1, 'cel': collections.defaultdict(list), 'y': y}
            rows.append(cur)
        elif cur is None:
            continue
        for k, v in cel.items(): cur['cel'][k].append(' '.join(v))

# nome de veículo partido em 2 linhas ("A-20 / C-20 /" + "D-20") → junta
for i, r in enumerate(rows):
    v = ' '.join(r['cel'].get('veic', [])).strip()
    if v.endswith('/') and i + 1 < len(rows) and rows[i + 1]['cel'].get('veic'):
        junto = v + ' ' + ' '.join(rows[i + 1]['cel']['veic'])
        r['cel']['veic'] = [junto]; rows[i + 1]['cel']['veic'] = [junto]
# herda veículo/anos/motor/eixo das linhas de cima (células mescladas)
ult = {}
for r in rows:
    c = r['cel']
    for k in ('veic', 'anos', 'motor', 'eixo'):
        if c.get(k): ult[k] = ' '.join(c[k]); 
        if k == 'veic' and c.get('veic'): ult.pop('anos', None) if not c.get('anos') else None
    r['veic'] = ult.get('veic', ''); r['anos'] = ult.get('anos', ''); r['motor'] = ult.get('motor', ''); r['eixo'] = ult.get('eixo', '')
    if c.get('veic'): ult['veicMont'] = r['mont']

def codigos(cel):
    out = []
    for s in cel:
        for m in re.finditer(r'([A-Z0-9][A-Z0-9.\-/]{2,})\s*(\[[^\]]+\])?(\s*\*)?', s):
            cod = m.group(1)
            if re.match(r'^\d+\.\d+:1$', cod) or cod in ('TD', 'FAD'): continue
            if not re.search(r'\d', cod): continue
            out.append((cod, (m.group(2) or '').strip('[]'), bool(m.group(3))))
    return out

def tipo_veic(mont, v):
    V = v.upper()
    if re.search(r'S10|S-10|BLAZER|HILUX|RANGER|F-?100\b|F-?1000|F-?250|F-?350|JEEP|T4\b|A-?10|A-?20|C-?10|C-?20|D-?10|D-?20|FRONTIER|L200|PAJERO|TROLLER|AMAROK|BANDEIRANTE|SPRINTER|DAILY|SILVERADO|VERANEIO|MARRUÁ|MARRUA|TR4|ACCELO 6', V): return 'UTILITÁRIO'
    if re.search(r'VOLARE|MICRO|SCUDATO|AGRALE MA ', V): return 'MICRO-ÔNIBUS'
    if re.search(r'\bO[- ]?\d{3}|\bOF\b|\bOH\b|ÔNIBUS|ONIBUS|\b17\.230 OD|\bOD\b', V): return 'ÔNIBUS'
    return 'CAMINHÃO'

itens = collections.OrderedDict()
def item(cod, col, extra=''):
    k = cod
    if k not in itens:
        itens[k] = {'codigo': cod, 'marca': 'SPICER', 'descricao': DESC[col] + extra, 'conversoes': [], 'aplicacoes': [], '_rel': set(), '_dentes': set(), '_eixos': set(), '_col': col, '_veic': collections.OrderedDict(), 'pagina': None}
    return itens[k]

for r in rows:
    c = r['cel']; mont = MONT_PF.get(r['mont'], r['mont'].upper())
    veic = re.sub(r'\s+', ' ', r['veic']).strip()
    if not veic: continue
    nomes = [mont + ' ' + x.strip() for x in veic.upper().split('/') if x.strip()]
    eixo = re.sub(r'\s+', ' ', r['eixo'])
    pos = 'EIXO DIANTEIRO' if re.search(r'•\s*D\b', eixo) else 'EIXO TRASEIRO'
    modeloEixo = re.sub(r'\s*•.*$', '', eixo).strip()
    tipoEixo = (re.search(r'•\s*(OT|TL|DL)\b', eixo) or [None, ''])[1]
    rel = ' '.join(c.get('rel', [])).strip()
    for col in COLS[5:]:
        for cod, nota, alt in codigos(c.get(col, [])):
            ex = ''
            if col == 'CP' and re.match(r'\d+x\d+', nota): ex = ' ' + nota.upper()
            it = item(cod, col)
            if it['pagina'] is None: it['pagina'] = r['pag']
            if col == 'CP' and re.match(r'\d+x\d+', nota): it['_dentes'].add(nota.upper())
            if col == 'ACO': it['descricao'] = 'TERMINAL DO DIFERENCIAL' if nota == 'TD' else 'FLANGE DE ACOPLAMENTO DO DIFERENCIAL' if nota == 'FAD' else it['descricao']
            if col in ('SEC', 'SE') and nota: it['_lado'] = nota.replace('⁄', '/')
            if rel and col in ('CP', 'CDC', 'CDV'): it['_rel'].add(rel)
            if modeloEixo: it['_eixos'].add(modeloEixo + (' ' + tipoEixo if tipoEixo else ''))
            onde = ('SEMIEIXO' if col in ('SEC', 'SE', 'KSE') else 'DIFERENCIAL') + (' · ' + modeloEixo if modeloEixo else '') + (' · ' + rel if rel and col in ('CP', 'CDC', 'CDV') else '')
            key = (pos, onde)
            g = it['_veic'].setdefault(key, collections.OrderedDict())
            for nomeV in nomes: g[nomeV] = {'tipo': tipo_veic(mont, nomeV), 'anos': r['anos'], 'motor': r['motor'], 'alt': alt}

# kits de reparo (o que vem dentro)
def kits():
    out = {}
    for pi in range(len(d)):
        t = d[pi].get_text()
        if 'Código Kit Spicer' not in t or 'Kits de reparos' not in t[:120]: continue
        ws = d[pi].get_text('words'); lin = linhas(d[pi])
        comp = {}
        hc = sorted([w for w in ws if w[4] == 'Componentes'], key=lambda w: w[1])
        hk = [w for w in ws if w[4] == 'Código' and hc and w[1] > hc[0][1] + 20]
        if not hc or not hk: continue
        cy, cx, ty = hc[0][1], hc[0][0], min(w[1] for w in hk)
        for y, l in lin:
            l = [w for w in l if w[1] > cy + 2 and w[0] >= cx - 40 and w[1] < ty - 4]
            if not l: continue
            s = ' '.join(w[4] for w in l)
            for m in re.finditer(r'(?:^|\s)(\d{1,2}) ([A-ZÀ-Ú][a-zà-ú][^0-9]+?)(?=\s\d{1,2} [A-ZÀ-Ú][a-zà-ú]|$)', s):
                comp.setdefault(int(m.group(1)), m.group(2).strip())
        # tabelas: código | componentes | qtd (3 grupos de colunas)
        hdr = hk
        xs = sorted(set(round(w[0]) for w in hdr))
        cols = []
        for i, x0 in enumerate(xs): cols.append((x0 - 2, xs[i + 1] - 2 if i + 1 < len(xs) else 9999))
        for x0, x1 in cols:
            atual = None
            for y, l in lin:
                cl = [w for w in l if x0 <= w[0] < x1]
                if not cl or y < ty + 8: continue
                cod = cl[0][4] if CODE_RE.match(cl[0][4]) and re.search(r'\d', cl[0][4]) and cl[0][0] < x0 + 30 else None
                resto = [w[4] for w in cl[1:]] if cod else [w[4] for w in cl]
                if cod: atual = cod; out.setdefault(cod, [])
                if not atual or not resto: continue
                qtd = resto[-1] if re.match(r'^\d+$', resto[-1]) else '1'
                nums = re.findall(r'\d+', ' '.join(resto[:-1]))
                for n in nums:
                    nome = comp.get(int(n), 'componente ' + n)
                    out[atual].append({'codigo': '', 'desc': nome.upper(), 'qtd': int(qtd)})
    return out
KITS = kits()

# acessórios por modelo de eixo
ACESS = []
for pi in range(len(d)):
    if 'Acessórios' not in d[pi].get_text()[:200]: continue
    lin = linhas(d[pi]); ws = d[pi].get_text('words')
    hx = sorted(set(round(w[0]) for w in ws if w[4] == 'Modelo'))
    for i, x0 in enumerate(hx):
        x1 = hx[i + 1] if i + 1 < len(hx) else 9999; modelo = ''
        for y, l in lin:
            cl = [w for w in l if x0 - 3 <= w[0] < x1 - 3]
            if not cl or y < 150: continue
            s = ' '.join(w[4] for w in cl)
            if s.startswith('Modelo do eixo'): continue
            m = re.match(r'^(Dana \S+)\s+(.*)$', s)
            if m: modelo = m.group(1); s = m.group(2)
            m = re.match(r'^(.*?)\s+([A-Z0-9][A-Z0-9.\-]{3,})$', s)
            if m and modelo: ACESS.append({'modelo': modelo.upper(), 'peca': m.group(1).upper(), 'codigo': m.group(2)})

# referência cruzada: montadora → código montadora → Spicer (tipo)
CRUZ = []
for pi in range(len(d)):
    t = d[pi].get_text()
    if 'Referência cruzada' not in t[:200] and 'CP – Coroa e pinhão' not in t[:300]: continue
    lin = linhas(d[pi]); ws = d[pi].get_text('words')
    ms = sorted(round(w[0]) - 21 for w in ws if w[4] == 'montadora' and w[1] < 170)
    grupos = [[x] for x in ms]
    for g in grupos:
        x0 = g[0] - 3; nx = [m for m in ms if m > g[0]]; x1 = (nx[0] - 3) if nx else 9999; mont = ''
        for y, l in lin:
            cl = [w for w in l if x0 <= w[0] < x1]
            if not cl or y < 95 or y > 780: continue
            s = ' '.join(w[4] for w in cl)
            if s.replace('Continuação', '').strip() in MONT: mont = s.replace('Continuação', '').strip(); continue
            m = re.match(r'^(\S+)\s+(\S+)\s+(CP|CDC|CDV|KCD|KC|KRC|KRP|SEC|SE|KSE|TD|FAD)$', s)
            if m and mont: CRUZ.append({'mont': MONT_PF.get(mont, mont.upper()), 'orig': m.group(1), 'spicer': m.group(2), 'tipo': m.group(3)})

TIPO_DESC = {'TD': 'TERMINAL DO DIFERENCIAL', 'FAD': 'FLANGE DE ACOPLAMENTO DO DIFERENCIAL'}
for x in CRUZ:
    it = itens.get(x['spicer'])
    if not it:
        col = x['tipo'] if x['tipo'] in DESC else 'ACO'
        it = item(x['spicer'], col)
        if x['tipo'] in TIPO_DESC: it['descricao'] = TIPO_DESC[x['tipo']]
    if not any(c['ref'] == x['orig'] for c in it['conversoes']):
        it['conversoes'].append({'ref': x['orig'], 'desc': 'código original ' + x['mont'] + ' (tabela Spicer)', 'linha': x['mont']})

for a in ACESS:
    it = itens.get(a['codigo'])
    if not it:
        itens[a['codigo']] = it = {'codigo': a['codigo'], 'marca': 'SPICER', 'descricao': a['peca'], 'conversoes': [], 'aplicacoes': [], '_rel': set(), '_dentes': set(), '_eixos': set(), '_col': 'AC', '_veic': collections.OrderedDict(), 'pagina': None}
    it['_eixos'].add(a['modelo'])
    it.setdefault('_acess', []).append(a['modelo'])

out = []
for cod, it in itens.items():
    obs = []
    if it['_dentes']: it['descricao'] += ' ' + '/'.join(sorted(it['_dentes']))
    if it.get('_lado'): obs.append('Lado: ' + it['_lado'].replace('D/E', 'direito e esquerdo'))
    if it['_rel']: obs.append('Relação de redução: ' + ', '.join(sorted(it['_rel'])))
    if it['_eixos']: obs.append('Eixo: ' + ', '.join(sorted(it['_eixos'])))
    if cod in KITS and KITS[cod]:
        it['ehKit'] = True; it['composicaoKit'] = KITS[cod]
        obs.append('Vem no kit: ' + ', '.join(c['desc'].lower() + ' ×' + str(c['qtd']) for c in KITS[cod]))
    aps = []
    # 1 aplicação por peça × eixo (a importação junta pela chave modelo+série+código+marca+eixo); a posição de cada veículo (eixo · relação) vai em posVeic
    porEq = collections.OrderedDict()
    for (pos, onde), vs in it['_veic'].items():
        a = porEq.setdefault(pos, {'vs': collections.OrderedDict(), 'pos': collections.OrderedDict()})
        for k, v in vs.items():
            a['vs'][k] = v
            a['pos'][k] = onde
    for pos, a in porEq.items():
        cnt = collections.Counter(a['pos'].values())
        aps.append({'equip': pos, 'marca': 'SPICER', 'modelo': 'TABELA DE DIFERENCIAIS SPICER', 'serie': '', 'veiculo': ', '.join(a['vs'].keys()), 'veicDireto': 1,
                    'posicao': cnt.most_common(1)[0][0], 'posVeic': dict(a['pos']),
                    'tipoVeic': collections.Counter(v['tipo'] for v in a['vs'].values()).most_common(1)[0][0], 'tiposVeic': {k: v['tipo'] for k, v in a['vs'].items()}})
    for m in it.get('_acess', []):
        aps.append({'equip': 'EIXO', 'marca': 'DANA', 'modelo': m, 'serie': '', 'veiculo': ''})
    o = {'codigo': cod, 'marca': 'SPICER', 'descricao': it['descricao'], 'conversoes': it['conversoes'], 'aplicacoes': aps, 'obs': ' · '.join(obs)}
    if it.get('ehKit'): o['ehKit'] = True; o['composicaoKit'] = it['composicaoKit']
    if it['pagina']: o['pagina'] = it['pagina']
    out.append(o)

res = {'id': 'spicer-diferenciais-2016', 'nome': 'Spicer — Eixos diferenciais e componentes (caminhões, 2016)', 'marca': 'SPICER', 'rodoviario': True,
       'pdf': 'data/catalogos/spicer-diferenciais-2016.pdf', 'pdfNome': 'spicer_diferenciais_caminhoes.pdf', 'itens': out}
json.dump(res, open('data/catalogos/spicer-diferenciais-2016.json', 'w'), ensure_ascii=False, indent=0)
print('linhas', len(rows), 'peças', len(out), 'kits', len(KITS), 'acessórios', len(ACESS), 'ref cruzada', len(CRUZ))
print('veículos', len({v for o in out for a in o['aplicacoes'] for v in (a['veiculo'].split(', ') if a['veiculo'] else [])}))
