# PartsFlow — o tempo de volta pra gente vender

Apresentação em `PartsFlow-apresentacao.pptx` (14 slides, com as anotações de fala em cada um). Estrutura: **o nosso dia → o que trava no JBoss → como o PartsFlow resolve cada ponto → o que ganhamos**.

---

## A mensagem

Nosso trabalho não é só fazer cotação: precisamos **gerir a carteira e prospectar oportunidades**, então todo tempo é precioso. Fazemos muitas cotações, atendemos revenda e consumidor, e eles precisam de resposta rápida. Se ficamos muito tempo numa cotação, acumula atividade, gera estresse e aumenta a chance de sair coisa errada, porque fazemos tudo correndo. Ainda temos os problemas do dia a dia e procurar código em catálogo.

### O que trava no JBoss
- Tela de vendas vazia: tudo o que precisamos está atrás de muitos cliques.
- Margem e último preço vendido ou cotado longe da tela.
- Cotou pra um CNPJ e precisa cotar pra outro: digitar tudo de novo e depois limpar a cotação.
- Conversões sem linha cadastrada.
- Sem espaço pra imagens explicativas ou fotos com detalhes dos produtos.
- Solicitar peça pra compra = preencher um monte de campos.
- Nada avisa quando chega um produto que estamos esperando.
- Quando a peça chega, é difícil mandar oferta pra cada cliente de acordo com a linha que ele trabalha.
- Mudar o JBoss pra ficar como o PartsFlow é praticamente impossível. Por isso o PartsFlow trabalha **ao lado** dele.

---

## Antes de apresentar (preencher)

| Onde | O que trocar |
|---|---|
| Slide 1 | `[Nome de quem apresenta] · [data]` |
| Slide 13 | `[2]` vendedores no piloto |
| Slide 14 | `[nome] e [nome]` dos vendedores do piloto |

As capturas são telas do sistema com dados de exemplo (clientes inventados). A do slide 7 ("Chegou — oferecer pros clientes") é a **prévia de uma função nova**, ainda não publicada.

---

## Slide a slide

### Parte 1 — Nosso dia
1. **Capa** — "O tempo de volta pra gente vender". O que trava o nosso dia no JBoss, e como o PartsFlow resolve.
2. **Nosso trabalho não é só fazer cotação** — Responder rápido · Gerir a carteira · Prospectar. Quando a cotação demora: acumula atividade → gera estresse → faz tudo correndo → sai coisa errada.
3. **O JBoss é engessado: tudo atrás de muitos cliques** — os 8 problemas da lista acima + "e ainda: procurar código em catálogo, um por um".

### Parte 2 — Como o PartsFlow resolve (cada slide: ❌ No JBoss | ✅ No PartsFlow, com a tela)
4. **Tela de vendas: tudo o que a gente precisa, na frente** *(captura da cotação em 2 linhas)*
   - Saldo, status, margem e preço final com IPI/ST na própria linha.
   - Último preço do cliente: o que vendeu e o que só cotou.
   - Código e marca do cliente embaixo do nosso (a conversão aparece).
   - Troca o cliente na mesma cotação, sem redigitar os itens.
5. **A lista do cliente vira cotação, e as regras seguem sozinhas**
   - Lista por imagem: cola o print ou foto e os itens entram.
   - Regras por cliente no assistente: cotar só determinada peça, marca B só se não tiver a A, sempre a mais em conta, preferir/bloquear marca, margem própria. A cotação enxuta sobe só a ficha com saldo.
6. **Área Técnica: menos tempo procurando peça em catálogo** *(captura de um kit com as 13 peças)*
   - Peças que trabalham juntas (monta com); busca por medida e por modelo ou série da máquina.
   - Catálogos ligados à cotação (grupo e nº do desenho); kits ("vem no jogo de juntas" e o saldo do kit).
   - Fotos, desenho técnico com medidas e conversões.
7. **Avise-me · novidade: a peça chegou, o sistema avisa e já oferece** *(prévia da janela "Chegou")*
   - Botão direito no item → "🔔 Enviar para o Avise-me"; quando chega: "231247 chegou, cliente X estava aguardando".
   - **Novo:** mostra pra quem oferecer o que chegou (quem aguardava, quem cotou e não levou, quem já comprou, quem compra a marca) e monta uma mensagem por cliente pro WhatsApp ou e-mail.
8. **Solicitações: pedir pra compras e pros outros setores sem formulário** *(captura da consulta de RMA)*
   - Solicitar compra direto da cotação; atalhos prontos (carta de correção, transferência, ajuste de saldo, frete).
   - RMA com busca e relatório; garantia Dana com link pro cliente mandar as fotos.
   - Acompanha: solicitado → comprado → faturado → chegou.
9. **Compras: o que comprar, quando comprar e por quanto vender** — Dashboard → Mapa de compras → Preço calculado pela margem do cliente. Sem planilha paralela.
10. **Gestão da carteira: o tempo que sobra vai pra carteira e prospecção** *(capturas do Meu dia e da Órbita)* — Meu dia (quem responder, que cotação cobrar, pra quem ligar), Órbita (quem parou, quem cresce, quanto está em risco), ficha do cliente com tudo.
11. **Vender mais: venda a mais, sem esforço** *(capturas do "Ofereça também" e do catálogo no celular)*.

### Parte 3 — O resultado
12. **Antes e depois**

| Situação | JBoss | PartsFlow |
|---|---|---|
| Informação do cliente e da peça | Atrás de muitos cliques | Na linha da cotação |
| Cotar pra outro CNPJ | Digitar tudo de novo | Troca o cliente e pronto |
| Lista do cliente | Item por item | Cola o print |
| Regras de cada cliente | De cabeça | O assistente aplica |
| Achar a peça | Catálogo, um por um | Área Técnica na cotação |
| Solicitar compra | Monte de campos | Direto da cotação |
| Peça que chegou | Ninguém avisa | Avisa e mostra pra quem oferecer |

13. **O que ganhamos: tempo de volta pra vender** — Tempo (pra carteira e prospecção) · Menos erro · Menos estresse · Mais venda. Proposta: piloto de 30 dias com [2] vendedores, medindo tempo por cotação, cotações por dia e quantas viram pedido.
14. **Fechamento** — "Menos tempo procurando. Mais tempo vendendo." Pergunta fechada: "Posso começar o piloto com [nome] e [nome] na segunda?"

---

## Dicas pra apresentar
- **Mostre ao vivo** cada slide de solução (as anotações dizem o que clicar). Use os dados de demonstração (Ferramentas → 🎭 Dados de demonstração).
- O slide 4 (tela de vendas) é o mais importante: é a tela que usamos o dia inteiro.
- Peça pouco: um piloto de 30 dias, decidido pelos números (⏱️ Tempo das cotações e o funil de cotações).
- "Por que não arrumar o JBoss?": é caro, demorado e depende do fornecedor; o PartsFlow já funciona e evolui no nosso ritmo. O fiscal e o financeiro continuam no ERP.
