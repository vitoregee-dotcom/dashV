# Catálogo PDF → Excel (sem IA, sem tokens)

Converte catálogo de peças em PDF numa planilha pronta pra importar em
**Cadastros → Aplicações → Importar Catálogo → Planilha Excel / CSV**.
Aprovado pelo Vitor no Perkins 404D-22 (GN65674N) em 23/09/2026.

## Como o Vitor manda o catálogo
1. github.com/vitoregee-dotcom/dashV → **Add file → Upload files** → arrasta o PDF → **Commit changes**.
2. Avisa o nome do arquivo no chat.

## Como converter
```bash
pip install pypdf openpyxl cffi
python3 scripts/catalogo-pdf/extrair.py ARQUIVO.pdf --marca PERKINS --saida pecas.xlsx
```
- Se aparecer **FALTA TRADUZIR**, acrescentar os termos em `traducoes.py`
  (padrão de autopeças, maiúsculas) e rodar de novo — o dicionário cresce a cada catálogo.
- Conferir por amostragem contra o PDF (linhas quebradas, "F" = faz parte de, espessuras).
- Mandar a planilha pro Vitor (arquivo anexo, não commitar no repo).
- Depois, perguntar se remove o PDF da raiz (o site publica a pasta).

## O que a planilha tem
- **Importar**: 1 linha por código — `codigo`, `descricao` (PT), `marca`, `grupo` (PT)
  + colunas de apoio (texto em inglês, qtd no motor, onde aparece, página).
- **Catalogo completo**: todas as linhas na ordem do PDF, pra conferência.

## Na hora de importar (instrução pro Vitor)
Preencher em cima: Equipamento (ex.: MOTOR), Marca, Modelo, Série; escolher a planilha.

## Outros formatos
O extrator é pro formato Perkins "Parts Book" (cabeçalho `Item PartNo. References Qty. Description Notes`).
Catálogo de outro fabricante: olhar o texto de algumas páginas (`pypdf`), adaptar `extrair()`
mantendo a mesma saída. PDF escaneado (sem texto) não funciona por regra — avisar o Vitor antes.
