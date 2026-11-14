# Gera data/catalogos/carraro-conversao-om.json a partir dos PDFs "Conversão Carraro OM" (texto, sem IA).
# Uso: python3 gerar_conversao_om.py saida.json parte1.pdf [parte2.pdf ...]
# Cada linha do PDF = código Carraro | código da montadora (OEM) | montadora. Mesma peça pode ter várias montadoras.
# Montadora que só repete o próprio nº Carraro ("<206833>", O&K) não vira conversão, mas o código entra na lista "cods"
# (= o PF sabe que é número Carraro; a regra de formato do PF não reconhece Carraro começando com 2/3).
import re, sys, json, subprocess, collections

LINHA = {  # montadora do PDF -> linha do PF (nomes do LINHAS / MARCAS_PADRAO)
    'JOHN DEERE': 'JOHN DEERE', 'CASE': 'CASE', 'CNH': 'CASE', 'CLAAS - RENAULT': 'CLAAS', 'CLAAS': 'CLAAS',
    'MCCORMICK': 'McCORMICK', 'VALTRA + VALMET': 'VALTRA', 'VALTRA': 'VALTRA', 'KOMATSU': 'KOMATSU',
    'VOLVO': 'VOLVO', 'IVECO': 'IVECO', 'LIEBHERR': 'LIEBHERR', 'LANDINI': 'LANDINI', 'DEUTZ': 'DEUTZ',
    'ANTONIO CARRARO': 'ANTONIO CARRARO', 'O&K ANTRIEBSTECHNIK': 'O&K',
}

def linhas(pdf):
    t = subprocess.run(['pdftotext', '-layout', pdf, '-'], capture_output=True, text=True, check=True).stdout
    for l in t.splitlines():
        s = l.strip()
        if not s or s.startswith('Page') or 'above' in s or s.startswith('Carraro'):
            continue
        m = re.match(r'^(\S+)\s+(.+?)\s{2,}(.+)$', s)
        if m:
            yield m.groups()

def main():
    saida, pdfs = sys.argv[1], sys.argv[2:]
    itens = collections.OrderedDict(); cods = set(); n = 0; marcas = collections.Counter()
    for pdf in pdfs:
        for car, oem, mont in linhas(pdf):
            car = car.strip().upper(); cods.add(car); n += 1
            oem = oem.strip()
            if re.sub(r'\W', '', oem) == car:  # só repete o nº Carraro
                continue
            ln = LINHA.get(mont.strip().upper(), mont.strip().upper())
            # Vitor (14/11/2026): CASE/CNH com LETRA no código = CASE (1530498C1, 325142A1); só números = NEW HOLLAND (87429104)
            if ln == 'CASE' and not re.search(r'[A-Za-z]', oem):
                ln = 'NEW HOLLAND'
            # célula com 2+ números separados por espaço ("G61256 G79776") = cada um vira conversão; "2 915 201 01" (LuK) fica junto
            toks = oem.split()
            partes = toks if len(toks) > 1 and all(len(re.sub(r'\W', '', t)) >= 5 for t in toks) else [oem]
            lst = itens.setdefault(car, [])
            for o in partes:
                if [o, ln] not in lst:
                    lst.append([o, ln]); marcas[ln] += 1
    out = {'id': 'carraro-conversao-om', 'nome': 'Carraro — Conversão para números das montadoras (OM)',
           'fonte': [p.split('/')[-1] for p in pdfs], 'linhasPdf': n,
           'itens': itens, 'cods': sorted(cods)}
    json.dump(out, open(saida, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print('linhas', n, 'códigos Carraro', len(cods), 'com conversão', len(itens), 'conversões', sum(len(v) for v in itens.values()))
    print(marcas.most_common())

main()
