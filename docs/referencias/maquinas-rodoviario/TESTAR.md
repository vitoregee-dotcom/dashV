# Meritor — códigos pra testar (guardado em 28/10/2026, v115.2446)

**Antes:** Cadastros → Importar Produtos → 📚 Catálogos já lidos → Meritor → Importar Selecionados.
Depois o selo do catálogo tem que ficar ✅ Importado.

## Na cotação (campo Código)
| Digitar | O que tem que acontecer |
|---|---|
| 098537 | Entram juntos o cone JHM720249 e a capa JHM720210 (mesma qtd), etiqueta 🔗 conjunto MERITOR 098537. Se tiver no estoque o conjunto "JHM720249/JHM720210" ou "JHM720249/10", entra só 1 linha |
| JHM720249/10 | Mesmo resultado do 098537 |
| LM501349/10 | Conjunto do 802767 (cone LM501349 + capa LM501310) |
| 098536 | Conjunto 9278/20 se existir no estoque; senão cone 9278 + capa 9220 |
| 802702 | Pergunta qual o cliente pediu: MERITOR (rolamento 2872/2820) × DANA (kit de vedação) |
| 802760 | Pergunta: MERITOR (rolamento 32308, Scania) × DANA (kit de engrenagens) |
| 098175 | Rolamento cilíndrico T-182 — peça única, sem cone/capa |
| JHM720249 (sozinho) | Fluxo normal: entra só o cone (o cliente pediu só ele) |
| Apagar a linha da capa de um conjunto | Etiqueta vermelha "⚠ falta a capa do conjunto" no cone |
| Mudar a qtd só do cone | Etiqueta âmbar (qtds diferentes) |

## Série / modelo da cotação
- `cargo 1317` → traz os rolamentos Meritor do Ford Cargo 1317.
- `mercedes 16` → 802752 (eixo dianteiro, "16/17/18/19/22/23/24 TON").

## Máquinas
- Chip 🚚 Rodoviário → VW 17-220: bloco "⚙️ Peças por componente" com cone/capa/conjunto e saldo.
- Buscar `LM501349` → acha os veículos do 802767.
- MERCEDES-BENZ 13/14/16/17/18/19/22/23/24 TON → 802753 (eixo dianteiro) e 802754 (eixo traseiro).
  A tabela da Meritor só diz a tonelagem nesses 4 (802724, 802752, 802753, 802754), sem modelo.

## Prévia do Importar
- 802702 e 802760: aviso laranja "⚠ mesmo nº em DANA … — outra peça".
