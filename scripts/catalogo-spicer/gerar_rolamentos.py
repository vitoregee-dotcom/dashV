# v115.2462 - Monta data/catalogos/spicer-rolamentos-2022.json (catálogo "Rolamentos Spicer" nov/2022)
# a partir das 3 tabelas que já estão no index.html desde a v115.1215–1217:
#   PF_ROL_DIM_SPICER (medidas), PF_SPICER_CRUZADA (referência cruzada), PF_SPICER_APLICACAO (veículo/eixo).
# Mesmo formato do meritor-rolamentos-2021.json (aplicações com veicDireto → 🚜 Máquinas, Rodoviário e Fora de estrada).
# Rodar: python3 -I scripts/catalogo-spicer/gerar_rolamentos.py  (na raiz do repositório)
import json, re, unicodedata, collections

src = open('index.html', encoding='utf-8').read().split('\n')
def tabela(nome):
    for l in src:
        if l.startswith('var ' + nome + '='):
            return json.loads(l[l.index('=') + 1:].rstrip().rstrip(';'))
    raise SystemExit('não achei ' + nome)
DIM, CRUZ, APL = tabela('PF_ROL_DIM_SPICER'), tabela('PF_SPICER_CRUZADA'), tabela('PF_SPICER_APLICACAO')

def N(s):
    s = unicodedata.normalize('NFD', str(s or '').upper())
    return ''.join(c for c in s if unicodedata.category(c) != 'Mn')

# ---------- marcas de veículo (o 1º que bate, mais longo primeiro) ----------
MARCAS = [('MERCEDES-BENZ', 'MERCEDES-BENZ'), ('MERCEDES BENZ', 'MERCEDES-BENZ'), ('MERCEDES', 'MERCEDES-BENZ'),
          ('CHREVROLET', 'GM'), ('CHEVROLET', 'GM'), ('GMC', 'GMC'), ('VOLKSWAGEN', 'VOLKSWAGEN'), ('AGRALE', 'AGRALE'),
          ('FORD', 'FORD'), ('IVECO', 'IVECO'), ('TOYOTA', 'TOYOTA'), ('MITSUBISHI', 'MITSUBISHI'), ('TROLLER', 'TROLLER'),
          ('SCANIA', 'SCANIA'), ('VOLVO', 'VOLVO'), ('DODGE', 'DODGE'), ('HYUNDAI', 'HYUNDAI'), ('FOTON', 'FOTON'),
          ('VOLARE', 'VOLARE'), ('JOHN DEERE', 'JOHN DEERE'), ('DAF', 'DAF')]
# texto que NÃO é veículo: corta dali até a próxima marca
CORTE = re.compile(r'(\s-\s|\bROLAMENTO\b|\bEIXO\b|\bCAMBIOS?\b|\(CHASSIS|\bDIFERENCIAL\b|\bDIF\.)')

UTIL = re.compile(r'^(S-?10|BLAZER|SILVERADO|[ACD]-?[12]0|F-?75|F-?100|F-?1000|F-?250|RANGER|T4|HILUX|BANDEIRANTES?|PAJERO|L200|DAKOTA|JEEP|RURAL|SPRINTER|DAILY.*|SCUDATO.*|[0-9]{2}\.[0-9]{2}|[0-9]{2}C[0-9]{2}|[0-9]{2}S[0-9]{2})$')
ONIBUS = re.compile(r'^(O ?3\d\d|OF ?\d+|LO ?\d+|B\d{3}[RF]?)$')

def tipo_rod(marca, modelo):
    m = modelo.replace(' ', '')
    if marca == 'VOLARE': return 'MICRO-ÔNIBUS'
    if marca == 'JOHN DEERE': return 'TRATOR'
    if ONIBUS.match(m): return 'ÔNIBUS'
    if marca == 'IVECO' and re.match(r'^(DAILY|SCUDATO)', m): return 'UTILITÁRIO'
    if marca in ('GM', 'FORD', 'TOYOTA', 'MITSUBISHI', 'TROLLER', 'DODGE', 'MERCEDES-BENZ') and UTIL.match(m) and not re.match(r'^\d', m): return 'UTILITÁRIO'
    if marca == 'VOLKSWAGEN' and re.match(r'^(GOL|PARATI|VOYAGE|SAVEIRO|FOX|GOLF|PASSAT|POLO|SANTANA)$', m): return 'AUTOMÓVEL'
    if marca == 'GM' and re.match(r'^(CORSA|CELTA|AGILE|PRISMA)$', m): return 'AUTOMÓVEL'
    if marca == 'FORD' and re.match(r'^(ESCORT|VERONA|VERSAILLES)$', m): return 'AUTOMÓVEL'
    return 'CAMINHÃO'

def modelo_limpo(marca, p):
    p = re.sub(r'\([^)]*\)', ' ', p)
    p = re.sub(r'\s+', ' ', p).strip(' .-')
    if not p or '...' in p or p in ('OUTROS', 'OUTRAS'): return None
    p = re.sub(r'^CONSTEL+AT+I?ON\b|^COSTELLATIOIN\b|^CONSTELATION\b|^CONSTELLATION\b', 'CONSTELLATION', p)
    if marca == 'VOLKSWAGEN':  # mesmo nome da tabela Meritor (VOLKSWAGEN 24-250): sem a família, só o número
        p = re.sub(r'^(CONSTELLATION|WORKER|DELIVERY)\s+(?=\d)', '', p)
    if marca == 'FORD':
        p = re.sub(r'^F(\d{4,5})$', r'F-\1', p)   # F12000 = F-12000
    if marca == 'IVECO' and re.match(r'^\d+V\d+$', p): p = 'VERTIS ' + p
    if marca == 'IVECO' and re.match(r'^(70C1\d)$', p): p = 'DAILY ' + p
    p = re.sub(r'^(TECTOR|MA|MT|TX)(?=\d)', r'\1 ', p)
    if not re.search(r'[A-Z0-9]', p): return None
    return p

CARREGA = ('MA', 'TX', 'CARGO', 'DAILY', 'VERTIS', 'TECTOR', 'STRALIS', 'EUROCARGO')  # "MA 7.5, 7.9" = MA 7.9 · "Cargo 712, 814" = CARGO 814

def veiculos_rod(txt):
    """[(marca, modelo, tipo, descrição do trecho)] — a descrição ("Rolamento Externo Roda Dianteira") diz o componente daquela marca."""
    s = N(txt)
    s = s.replace('SILVERADO A-10', 'SILVERADO; A-10').replace('KALMAR', '')
    pos = []
    i = 0
    while i < len(s):
        ach = None
        for k, v in MARCAS:
            if s.startswith(k, i) and (i == 0 or not s[i - 1].isalnum()) and (i + len(k) >= len(s) or not s[i + len(k)].isalnum()) \
               and not re.search(r'EIXOS?\s+$', s[:i]):  # "Eixo MERCEDES-BENZ HL 2/45" = eixo, não veículo
                ach = (k, v); break
        if ach:
            pos.append((i, ach)); i += len(ach[0])
        else:
            i += 1
    out, chaves = [], set()
    for j, (i0, (k, mk)) in enumerate(pos):
        fim = pos[j + 1][0] if j + 1 < len(pos) else len(s)
        trecho = s[i0 + len(k):fim]
        m = CORTE.search(trecho)
        desc = trecho[m.start():] if m else ''
        if m: trecho = trecho[:m.start()]
        trecho = trecho.strip(' -;,/(')
        fam = ''
        for p in re.split(r'[;,/]|\.\s', trecho):
            p = p.strip(' (')
            fm = re.match(r'^([A-Z]+)\s*(\d[\d.]*)', p)
            fmt = lambda n: ('.' in n, len(n.split('.')[0]))  # só carrega pro número do mesmo jeito (MA12.0 → 9.0 sim, 9200 não)
            nm = re.match(r'^(\d[\d.]*)', p)
            if nm and fam and fmt(nm.group(1)) == fam[1]: p = fam[0] + ' ' + p
            elif fm: fam = (fm.group(1), fmt(fm.group(2))) if fm.group(1) in CARREGA else ''
            else: fam = ''
            mod = modelo_limpo(mk, p)
            if mk == 'AGRALE' and mod == '1300': mod = '13000'  # erro de digitação do catálogo
            if mk == 'FORD' and mod and re.match(r'^\d{5}$', mod): mod = 'F-' + mod
            if not mod: continue
            ch = mk + '|' + re.sub(r'[^A-Z0-9]', '', mod)
            if ch in chaves: continue
            chaves.add(ch); out.append((mk, mod, tipo_rod(mk, mod), desc))
    return out

# ---------- linha amarela / agrícola: escrito à mão (são poucos textos, todos diferentes) ----------
PC = 'PÁ CARREGADEIRA'
FORA = {
    'CASE - Retro 580L (4X2); 197948A4': [('CASE', '580L', 'RETROESCAVADEIRA')],
    'CASE - W20; 176/414': [('CASE', 'W20', PC)],
    'CASE , NEW HOLLAND - 885/RG200': [('CASE', '885', 'MOTONIVELADORA'), ('NEW HOLLAND', 'RG200', 'MOTONIVELADORA')],
    'CASE , NEW HOLLAND - W20 , 621D , W130 , 12C': [('CASE', 'W20', PC), ('CASE', '621D', PC), ('NEW HOLLAND', 'W130', PC), ('NEW HOLLAND', '12C', PC)],
    'CASE , NEW HOLLAND, JD - W20 , 621D , W130 , 12C, 6205J': [('CASE', 'W20', PC), ('CASE', '621D', PC), ('NEW HOLLAND', 'W130', PC), ('NEW HOLLAND', '12C', PC), ('JOHN DEERE', '6205J', 'TRATOR')],
    'CASE, NEW HOLLAND, Outras - W20E/12C/Outras': [('CASE', 'W20E', PC), ('NEW HOLLAND', '12C', PC)],
    'CATERPILLAR D6C/D6D': [('CATERPILLAR', 'D6C', 'TRATOR DE ESTEIRA'), ('CATERPILLAR', 'D6D', 'TRATOR DE ESTEIRA')],
    'JOHN DEERE - 5055E / 5065E / 5075E / 5078E / 5085E / 5090E': [('JOHN DEERE', m, 'TRATOR') for m in ('5055E', '5065E', '5075E', '5078E', '5085E', '5090E')],
    'JOHN DEERE - 6145J': [('JOHN DEERE', '6145J', 'TRATOR')],
    'JOHN DEERE - 6165J': [('JOHN DEERE', '6165J', 'TRATOR')],
    'KALMAR/Outros - Staker de Porto': [('KALMAR', 'REACH STACKER', 'EMPILHADEIRA')],
    'MANITOWOC - CRANE RT770 E RT880': [('MANITOWOC', 'RT770', 'GUINDASTE'), ('MANITOWOC', 'RT880', 'GUINDASTE')],
    'MASSEY FERGUNSON/ VALTRA - (6711R / 6712R / 6713R) e (A114H / A124H / A134H)': [('MASSEY FERGUSON', m, 'TRATOR') for m in ('6711R', '6712R', '6713R')] + [('VALTRA', m, 'TRATOR') for m in ('A114H', 'A124H', 'A134H')],
    'MASSEY FERGUNSON FERGUNSON/ VALTRA - (6711R / 6712R / 6713R) e (A114H / A124H / A134H)': [('MASSEY FERGUSON', m, 'TRATOR') for m in ('6711R', '6712R', '6713R')] + [('VALTRA', m, 'TRATOR') for m in ('A114H', 'A124H', 'A134H')],
    'MICHIGAN - 55C/Outras': [('CLARK MICHIGAN', '55C', PC)],
    'MICHIGAN/CASE/NEW HOLLAND - W20/55C/Outras': [('CASE', 'W20', PC), ('CLARK MICHIGAN', '55C', PC)],
    'NEW HOLLAND - 12B': [('NEW HOLLAND', '12B', PC)],
}
GENERICO = re.compile(r'^(JOHN DEERE / NEW HOLLAND|MASSEY FERGUNSON FERGUNSON / |VALTRA / SCANIA|TEREX)')
TRANSM_FORA = re.compile(r'^(T\d{5}|TE|292512)$')

def veiculos(txt):
    base = txt.split(';')[0].strip()
    for k, v in FORA.items():
        if txt.strip() == k or base == k: return [x + ('',) for x in v], True
    if GENERICO.match(txt.strip()): return [], True
    return veiculos_rod(txt), False

def componente(d, txt, eixo, fora):
    T = N(d + ' ' + txt)
    e0 = [p for p in re.split(r'[/,\s]+', N(eixo)) if p]
    if re.search(r'CAMBIO|EIXO (PRIMARIO|SECUNDARIO|PRINCIPAL|PILOTO)|CONTRA-EIXO', T): return 'TRANSMISSÃO', 'CÂMBIO'
    if fora and e0 and all(TRANSM_FORA.match(p) for p in e0): return 'TRANSMISSÃO', 'TRANSMISSÃO'
    if fora and N(eixo) == '176/414': return 'EIXO DIANTEIRO', 'DIFERENCIAL'
    if fora and re.match(r'^(720/553|745/147|750/163|730/572|755/172)', N(eixo)): return 'EIXO DIANTEIRO', 'DIFERENCIAL'  # eixo dianteiro (tração) dos tratores
    if fora and N(eixo) in ('DIVERSOS', '-', ''): return 'DIVERSOS', ''
    dian, tras = re.search(r'RODA DIANTEIR|EIXO DIANTEIRO', T), re.search(r'RODA TRASEIR', T)
    if re.search(r'\bRODA\b', T):
        return ('EIXO' if dian and tras else 'EIXO DIANTEIRO' if dian else 'EIXO TRASEIRO' if tras else 'EIXO'), 'RODA'
    if dian: return 'EIXO DIANTEIRO', 'RODA'
    if re.search(r'DIFERENCIAL DIANTEIRO E TRASEIRO', T): return 'EIXO', 'DIFERENCIAL'
    if re.search(r'DIFERENCIAL|PINHAO|COROA|SATELITE|SEMIEIXO|REDUCAO', T): return ('EIXO' if fora else 'EIXO TRASEIRO'), 'DIFERENCIAL'
    return 'EIXO', ''

# v115.2471 - A pedido do Vitor ("aqueles códigos que estão como originais… identificar os padrões e mudar pro nome da linha"):
# o catálogo só diz "referência cruzada" — a linha sai do FORMATO do código (+ a marca da aplicação quando o formato é da CNH)
def linhaOriginal(ref, veic):
    r = re.sub(r'[\s.\-]', '', ref.upper()); V = N(veic)
    ln = idLinha(r)
    # v115.2472 - Vitor: os 1199… da Michigan "acho que são MICHIGAN" (não Volvo) e o 7019578 não é Caterpillar → sem linha até ele conferir na tabela dele
    if 'MICHIGAN' in V and ln in ('VOLVO', 'CATERPILLAR'): return ''
    return ln

# Vitor: "fora de estrada, continua seguindo o nosso padrão cadastrado" = a tabela LINHAS / idLinha do index.html (mesma ordem; GENÉRICO = sem linha)
def idLinha(r):
    T = [('JOHN DEERE', lambda r: re.match(r'^R\d{5,7}$', r) or re.match(r'^AT\d', r) or re.match(r'^RE\d', r) or re.match(r'^AL\d{5,6}$', r) or re.match(r'^JD\d{3,6}$', r)),
         ('CASE', lambda r: re.match(r'^\d{6,7}[CA]\d$', r) or re.match(r'^[A-Z]\d{4,7}$', r)),
         ('NEW HOLLAND', lambda r: re.match(r'^\d{8}$', r) and r[0] in '786'),
         ('CATERPILLAR', lambda r: re.match(r'^\d{7}$', r) or re.match(r'^[0-9][A-Z]\d{4}', r) or re.match(r'^[A-Z]\d[A-Z]\d{4}', r)),
         ('VOLVO', lambda r: re.match(r'^\d{8}$', r) and (r.startswith('11') or r.startswith('20'))),
         ('MASSEY', lambda r: re.match(r'^\d{6,7}[RM]\d$', r)),
         ('VALTRA', lambda r: re.match(r'^\d{8}$', r) and r[0] in '38'),
         ('SPICER', lambda r: re.match(r'^\d+-\d', r) or re.match(r'^[A-Z]\d*-\d', r) or re.match(r'^500\d{4}$', r)),
         ('DANA', lambda r: re.match(r'^2\d{5}$', r) or re.match(r'^420\d{4}$', r) or re.search(r'60K|76K|25K', r) or re.match(r'^\d{3}\.\d{2}\.', r) or r.startswith('001.') or r.startswith('112.')),
         ('CARRARO', lambda r: re.match(r'^[^2]\d{4,5}$', r)),
         ('AGRALE', lambda r: re.match(r'^\d{4}\.\d', r)),
         ('RANDON', lambda r: re.match(r'^\d{9}$', r) and r[:2] in ('21', '22')),
         ('ALLISON', lambda r: re.match(r'^\d{8}$', r) and r[:2] in ('23', '29')),
         ('JCB', lambda r: re.match(r'^\d{2}/\d{6}$', r)),
         ('FORD', lambda r: re.match(r'^[A-Z]{1,2}\d[A-Z]{1,2}\d[A-Z0-9]{3,5}[A-Z]{1,2}$', r)),
         ('HYUNDAI', lambda r: re.match(r'^\d{2}[A-Z0-9]{2}-\d{5}$', r) or r.startswith('ZTAM-'))]
    for l, t in T:
        if t(r): return l
    return ''

def conversoes(cod, ref, veic=''):
    out = []
    if not ref or N(ref) == N(cod): return out
    def add(r, d):
        r = r.strip()
        if r and N(r) != N(cod) and not any(N(o['ref']) == N(r) for o in out): out.append({'ref': r, 'desc': d, 'linha': ''})
    jogos = [j.strip() for j in ref.split('+')]
    for j in jogos:  # cone e capa separados primeiro (o 🚚 Rodoviário mostra as colunas CONE / CAPA)
        if '/' in j:
            cone, capa = j.split('/', 1)
            add(cone, 'cone (tabela Spicer)'); add(capa, 'capa (tabela Spicer)')
    for j in jogos:
        if '/' in j: add(j, 'rolamento equivalente — cone/capa (tabela Spicer)')  # NÃO usar "conjunto": a cotação trocaria a peça Spicer pelo cone+capa
        elif re.match(r'^(3\d{4}|30204)$', j): add(j, 'rolamento equivalente (tabela Spicer)')
        elif N(re.sub(r'\D', '', j)) == N(re.sub(r'\D', '', cod)): continue  # 005090803 = o próprio código Spicer sem os pontos
        else:
            ln = linhaOriginal(j, veic)
            add(j, 'código original ' + ln + ' (tabela Spicer)' if ln else 'referência original (tabela Spicer)')
            if ln: out[-1]['linha'] = ln
    return out

# texto do catálogo com o componente no MEIO (o recorte automático perderia os veículos depois da descrição)
TRECHOS = {
    '10322835': [('FORD F-250', 'EIXO TRASEIRO', 'RODA'), ('FORD F-350; F-4000', 'EIXO DIANTEIRO', 'RODA')],
    '10322833': [('FORD F-250', 'EIXO TRASEIRO', 'RODA'), ('FORD F-350; F-4000 MERCEDES-BENZ Sprinter CHEVROLET D-40; GMC 6-100; 6-150', 'EIXO DIANTEIRO', 'RODA')],
}

def num(v): return ('%.2f' % v).replace('.', ',')

itens, semVeic, todosVeic = [], [], collections.Counter()
for cod in list(APL) + [c for c in list(DIM) + list(CRUZ) if c not in APL]:
    if any(i['codigo'] == cod for i in itens): continue
    a = APL.get(cod, {})
    d, txt, eixo = a.get('desc', 'Rolamento'), a.get('aplicacao', ''), a.get('eixo', '')
    it = {'codigo': cod, 'marca': 'SPICER ROLAMENTOS', 'descricao': N(d).replace('CILIN.', 'CILINDRICO').replace('ROLAMENTOS', 'ROLAMENTOS'),
          'conversoes': conversoes(cod, CRUZ.get(cod, ''), txt), 'aplicacoes': []}
    obs = []
    if cod in DIM: x = DIM[cod]; obs.append('Medidas: furo %s × externo %s × altura %s mm' % (num(x['furo']), num(x['od']), num(x['altura'])))
    if eixo and eixo not in ('-', 'Diversos'): obs.append('Eixo/transmissão: ' + eixo)
    if txt: obs.append('Aplicação (catálogo): ' + txt)
    it['obs'] = ' · '.join(obs)
    if txt:
        vs, fora = veiculos(txt)
        if cod in TRECHOS:  # catálogo com 2 componentes no mesmo texto
            vs = []
            for t, eq, po in TRECHOS[cod]:
                vs += [(mk, mo, ti, '#' + eq + '|' + po) for mk, mo, ti, _ in veiculos_rod(t)]
        grupos = collections.OrderedDict()
        for mk, mo, ti, dsc in vs:
            if dsc.startswith('#'): eq, po = dsc[1:].split('|')
            else: eq, po = componente(d, dsc if re.search(r'RODA|CAMBIO|DIFERENC|PINHAO|COROA|SATELITE|EIXO', dsc) else txt, eixo, fora)
            grupos.setdefault((eq, po), []).append((mk, mo, ti))
        for (equip, pos), gv in grupos.items():
            if eixo and eixo not in ('-', 'Diversos') and not re.match(r'^(MERCEDES|DIVERSOS)', N(eixo)):
                pos = (pos + ' · ' if pos else '') + 'EIXO/TRANSM. ' + N(eixo).replace(' ', '')[:40]
            tipos = collections.Counter(t for _, _, t in gv)
            it['aplicacoes'].append({'equip': equip, 'marca': '', 'modelo': 'TABELA DE ROLAMENTOS SPICER', 'serie': '',
                'veiculo': ', '.join(mk + ' ' + mo for mk, mo, _ in gv), 'marcaVeiculo': '', 'posicao': pos,
                'tipoVeic': tipos.most_common(1)[0][0], 'tiposVeic': {mk + ' ' + mo: t for mk, mo, t in gv}, 'veicDireto': 1})
            for mk, mo, t in gv: todosVeic[(mk + ' ' + mo, t)] += 1
        if not vs: semVeic.append(cod)
    itens.append(it)

cat = {'id': 'spicer-rolamentos-2022', 'nome': 'Spicer — Rolamentos (catálogo nov/2022)', 'marca': 'SPICER ROLAMENTOS', 'rodoviario': True, 'itens': itens}
json.dump(cat, open('data/catalogos/spicer-rolamentos-2022.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print(len(itens), 'peças ·', sum(1 for i in itens if i['aplicacoes']), 'com veículo ·', len(todosVeic), 'veículos ·', sum(len(i['conversoes']) for i in itens), 'conversões')
print('sem veículo:', semVeic)
for (v, t), n in sorted(todosVeic.items()): print('  ', t.ljust(18), v)
