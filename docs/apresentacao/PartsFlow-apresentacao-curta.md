# PartsFlow — apresentação curta (10 slides)

Arquivo: `PartsFlow-apresentacao-curta.pptx` (com anotações de fala em cada slide). Imagem da tela explicada: `tela-cotacao-explicada.png`.

**Ideia central:** cotação de peça de motor de **mais de 1 hora pra menos de 10 minutos**, com o catálogo dentro do sistema. O PartsFlow trabalha **ao lado do JBoss**; nada muda no ERP.

## Os slides
1. **Capa** — "Cotação de peça de motor: de +1 hora pra menos de 10 min". Trabalha ao lado do JBoss.
2. **Hoje × com o PartsFlow** (tabela): cotação de motor; o que o cliente mais compra; último preço e margem; lista do cliente; regras de cada cliente; oferecer o complementar; cliente que parou de comprar.
3. **A tela de cotação explicada** (números 1–9): colar print/carregar arquivo · o que o cliente mais compra (traz com 1 clique) · saldo, status, preço com IPI/ST e margem na linha · último preço vendido/só cotado · código do cliente (conversão) · catálogo e kit · Ofereça também · trocar cliente sem redigitar · ações do item (solicitar compra, avise-me, RMAs, substitutos).
4. **Lista pelo print + Assistente de Vendas** com as regras do cliente (não cotar marca, só se faltar, preferir, mais barata, margem, regra livre).
5. **Órbita da carteira** — quem parou, quanto está em risco, quem cresce.
6. **O cliente pede pelo link, sem saber o código** — pronto hoje (catálogo com desenho no celular → vira cotação).
7. **Próximo passo (PRÉVIA): o cliente cota sozinho, só com código e quantidade** — portal com login; código de qualquer marca; preço da tabela dele; o que não sai sozinho vai pro vendedor (`docs/referencias/portal-cliente/previa-codigo.png`).
8. **Hoje ao lado do JBoss, amanhã integrado** — JBoss/ERP, site de vendas, Vendas On e marketplaces, WhatsApp oficial; portal do cliente como próximo passo.
9. **Vendas online** — um cadastro só (descrição, fotos, aplicação, conversões, saldo e preço) → integrador (hub de marketplace ou API direta) → nosso site, Mercado Livre, Shopee e outros; pedidos e perguntas voltam pro PartsFlow e seguem pro ERP.
10. **Proposta** — piloto de 30 dias, [2] vendedores, sem mexer no ERP; medir tempo de cotação de motor, cotações por dia e quantas viram pedido.

## Roteiro ao vivo (slide 3)
1. Colar o print da lista de um cliente.
2. Escolher o cliente → mostrar os 15 mais comprados ("no JBoss é puxar relatório").
3. Saldo, margem e preço final na linha; passar o mouse no último preço.
4. Clicar na etiqueta do catálogo: desenho e kit.
5. Mostrar a faixa "Ofereça também".
6. Trocar o cliente sem perder os itens.
7. **Cronometrar** a cotação de motor inteira.

## Preencher antes
- Slide 1: nome e data. Slide 10: quantos vendedores e quais.
- Slide 5: falar o número REAL de clientes parados e R$/ano em risco (Órbita → 📊 Resumo).

## O que já está pronto × o que é futuro
- Pronto: tudo dos slides 2 a 6 (o 7 é PRÉVIA) (inclusive o link do catálogo pro cliente).
- Futuro (sem data): integração com JBoss/ERP, site, Vendas On/marketplaces, WhatsApp oficial e o portal do cliente com login (cotar digitando código e quantidade).
