# Varredura de 13/11/2026 (v115.2723) — erros e ideias

## 1. Erros achados e já corrigidos
| Onde | O que acontecia | Corrigido em |
|---|---|---|
| Aviso 🗂️ "Mapas e compras vindos das cotações" | A conferência de "aviso repetido" estava DENTRO de um comentário — o mesmo aviso podia entrar 2x | v115.2722 |
| Máquinas → Peças de manutenção | Linha engolida por comentário: aparecia o bloco "Outros (0)" vazio em toda máquina | v115.2723 |
| Mensagem automática (extensão) | Só mandava se você abrisse a conversa; conversando com outra pessoa ou em outra tela, nunca | v115.2721 / ext. 4.53 |
| Alt+B no WhatsApp | Aba do PF antiga respondia e aparecia "Não achei código" — agora avisa pra dar F5 | v115.2721 |

Como foi a busca: procurei em todo o index.html código que ficou "comido" por um comentário na mesma linha (o tipo de erro que não dá aviso nenhum), abri ~40 telas e janelas com os dados de demonstração (Vendas, Compras, Mesa, Gestão em todas as abas, Chamados, Quadro de vendas, Máquinas, Cardan, Catálogos, CRM, RMA, Treinamento, Mapa do sistema, painéis de aviso) e juntei os erros do console. Fora rede bloqueada aqui (Supabase/EmailJS), não apareceu erro nas telas.

## 2. Ainda em aberto (já conhecidos, ficaram pra depois)
- Seletores do WhatsApp real que só foram testados no simulador: Editar/Adicionar contato, etiqueta "Cliente PF", Marcar como não lida, Status, áudio. **Ideia 1 resolve isso.**
- Celular 390 px quebra a tela inicial e a cotação; colunas MARGEM/AÇÕES somem em telas de 1280 px.
- Modo escuro: 2 linhas da cotação e o Painel de Clientes.
- Corrida da sync (grava sem reler) — raro, mas pode desfazer uma edição feita ao mesmo tempo em 2 aparelhos.

## 3. Ideias (ordem = o que eu faria primeiro)
1. **🩺 Autodiagnóstico da extensão** — quando um botão do WhatsApp não é achado (salvar contato, etiqueta, não lida…), a extensão manda pro PF qual peça da tela faltou. Eu corrijo sem você precisar mandar print.
2. **📲 Avisar o cliente pelo WhatsApp: pedido emitido / faturado / pronto pra retirar** (pendência de 30/09). Agora que temos a extensão dá pra fazer com 1 clique (ou sozinho, com conferência).
3. **🔄 Substituto quando o item está zerado** (pendência de 30/09): na linha da cotação, "🔄 tem X com saldo — trocar", juntando substitutos, irmãos do Cardan, conversões e outras marcas.
4. **⏱ Tempo de resposta no WhatsApp** — cliente mandou pedido e ninguém respondeu em X min → aviso na barra; na Gestão, tempo médio de resposta por vendedor.
5. **📈 Relatório de quantidade de cotações** (horário, dia, mês, vendedor, tipo de cliente) — prévia pronta em `docs/referencias/relatorio-cotacoes/previa.png`, como aba nova da Gestão.
6. **⌨️ Alt+P — situação do pedido do cliente** (pendência de 30/09): número/cliente → solicitado, comprado, faturado, chegou e previsão.
7. **🧾 Itens cotados sem cadastro** (pendência): quando a peça for cadastrada, avisar "foi cotada N vezes por X clientes".
8. **💬 Cobrar cotação com 1 clique pelo WhatsApp** — no ☀️ Meu dia, "cobrar as 8 cotações acima de R$ 3 mil" vira um disparo com conferência (já temos o motor).
9. **📧 Leitor do e-mail de compras** — a "porta" da NF já existe (`pfNfReceber`); falta ligar a caixa de e-mail pra NF/XML entrar sozinha na ordem de compra.
10. Decisões que estão esperando você: **faturar pela filial SC** (estado/ICMS), **margem por produto/faixa de custo**, **portal com margem por peça**.
