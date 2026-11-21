# Prompts pro Gemini — um ícone pra CADA função do PartsFlow, com 4 modelos

São as 176 funções do "📚 O que o sistema faz" (a lista oficial do sistema). Cada folha tem **4 funções × 4 modelos**:
cada LINHA da grade é uma função e as 4 colunas são 4 jeitos diferentes de desenhar a mesma ideia. Você (ou quem você liberar)
escolhe o modelo preferido de cada função dentro do PF; os outros ficam guardados como opção.

São 44 folhas por estilo (704 ícones). Os ícones genéricos (salvar, buscar, peças, máquinas…) continuam no PROMPTS-GEMINI.md.

Como pedir: cole o PROMPT BASE do estilo + a FOLHA (as 4 linhas). Sempre na ordem — é ela que dá o nome de cada ícone.
Função nova no sistema = entra numa folha nova no fim (eu atualizo este arquivo).

---

## PROMPT BASE — MINIMALISTA (traço)

```
Create a single image: a 4x4 grid sheet of 16 UI icons, evenly spaced, each centered in its own square cell, same visual size.
Each ROW is ONE feature of an auto-parts business software (descriptions below are in Portuguese).
The 4 icons in the same row must be 4 DIFFERENT visual concepts / metaphors for that same feature (not the same drawing 4 times).
Style: minimalist outline icons in the style of Lucide / Feather icons.
- Pure black (#000000) strokes only, no fill, no color, no gradients, no shadows, no 3D.
- Consistent 2px stroke on a 24x24 grid, rounded caps and joins, simple geometric shapes, generous padding.
- Pure flat white background (#FFFFFF), no cell borders, no grid lines, no labels, no text, no numbers, no letters, no brand logos.
- All 16 icons must look like one consistent icon set (same stroke, same corner radius, same level of detail).
Rows, top to bottom:
```

## PROMPT BASE — INTUITIVA (3D)

```
Create a single image: a 4x4 grid sheet of 16 app icons, evenly spaced, each centered in its own square cell, same visual size.
Each ROW is ONE feature of an auto-parts business software (descriptions below are in Portuguese).
The 4 icons in the same row must be 4 DIFFERENT visual concepts / metaphors for that same feature (not the same object 4 times).
Style: modern, clean, professional 3D icons, similar to Microsoft Fluent 3D icons — soft matte "clay" material with a subtle gloss,
smooth rounded forms, soft studio lighting from the top left, gentle soft shadow under each object, slight 3/4 front view, same camera angle for all.
- Limited corporate palette: deep navy blue #1F4E79, orange accent #E67E22 (small accents only), white, light gray #D9DEE5, dark gray #3A4654.
- One simple object (or at most two) per icon, no clutter, no tiny details, readable at 32px.
- Solid flat magenta background (#FF00FF) filling the whole image, no cell borders, no grid lines, no labels, no text, no numbers, no letters, no brand logos.
- All 16 icons must look like one consistent icon set (same material, same lighting, same size, same angle).
Rows, top to bottom:
```

---

## FOLHAS

**Folha F01** — Vendas e cotação
```
Row 1 — "Faturar por Matriz SP ou Filial SC": Na cotação, escolhe se a nota sai pela Matriz SP ou pela Filial SC e já mostra o preço pela outra (pela SC o ICMS pra São Paulo é 12% em vez de 18%, então o preço…
Row 2 — "Cotação do JBoss": Sobe o print ou o PDF de uma cotação feita no JBoss e a IA transforma numa cotação do PF, com o mesmo preço, o cliente, o contato e o arquivo guardado.
Row 3 — "Pedido de compra do cliente": Na cotação, lê o pedido de compra que o cliente mandou (a ordem de compra dele) (print, PDF ou texto colado): código, quantidade e marca de cada peça, na ordem dele.…
Row 4 — "Regras só desta cotação": Regras que valem só numa cotação e você liga quando precisa: cotar só a(s) marca(s) X, não cotar a marca Y, só itens com saldo, sempre a mais barata e uma margem só…
```

**Folha F02** — Vendas e cotação
```
Row 1 — "Trazer outras marcas": Botão direito num item da cotação → as outras marcas do mesmo código que você tem entram logo embaixo dele (só as que ainda não estão na cotação, com saldo primeiro),…
Row 2 — "Trazer itens de outra cotação": Escolhe outra cotação (as do mesmo cliente primeiro), marca os itens e eles saem de lá e entram nesta.
Row 3 — "Regras em vigor na cotação": Mostra num lugar só tudo o que está valendo pro cliente da cotação: regras do Assistente de Vendas, margem usada, margem mínima da marca e desconto máximo, exceções…
Row 4 — "Pré-pedido": Documento de conferência só com os itens marcados pro pedido (PV), com o número da linha, a marca que o cliente pediu, condição de pagamento, entrega, transportadora…
```

**Folha F03** — Vendas e cotação
```
Row 1 — "Mensagens automáticas no WhatsApp": Na extensão do PF: saudação de espera quando você demora pra responder (com nome e bom dia/boa tarde, só na 1ª vez do dia se quiser, e a conversa fica como não lida…
Row 2 — "Salvar contato pelo WhatsApp": Botão ao lado do nome da conversa: salva o contato no PF e no WhatsApp (nome, empresa, código JBoss, cargo, CNPJ) e já classifica o cliente — tipo (revenda, consumo,…
Row 3 — "Sugestões pra oferecer no WhatsApp": No painel do PF dentro do WhatsApp: na aba Cliente, até 3 coisas que clientes parecidos compram e esse cliente não; na aba Cotação, as peças que costumam ir junto com…
Row 4 — "Prefixo da marca no código (CAR = Carraro)": Quando o cliente manda o código com as letras da marca grudadas na frente (CAR47700), o sistema entende que é o 47700 da Carraro.
```

**Folha F04** — Vendas e cotação
```
Row 1 — "Pedido do WhatsApp com marca e quantidade": Lê o pedido que o cliente mandou com a marca e a quantidade de cada peça ("03pcs spicer", "01pc spicer 01pc TX", "c/graxeira") e monta a cotação com as marcas que ele…
Row 2 — "Resposta rápida no balão do WhatsApp": Quando o cliente pergunta algo que você já tem como atalho de texto (endereço, PIX, horário, prazo…), aparece um ⚡ no balão da mensagem dele.
Row 3 — "Pedido pra enviar (WhatsApp)": Botão direito numa conversa do WhatsApp → "📦 Tem pedido pra enviar": vira lembrete nas Pendências (e no ☀️ Meu dia, se for cliente) e um 📦 ao lado do nome.
Row 4 — "Colega da empresa (WhatsApp)": No 👤 Salvar contato da extensão, "👔 Colega" marca a pessoa como daqui da empresa: não recebe mensagem automática nem entra nos avisos de cliente.
```

**Folha F05** — Vendas e cotação
```
Row 1 — "Preço do concorrente": Guarda quanto o concorrente cobrou numa peça: concorrente, marca, preço, data e qual cliente passou.
Row 2 — "Monta com no WhatsApp": Botão direito no código da conversa (ou na mensagem) → 🔗 Monta com: lista as peças que montam com ele, por tipo e com o código Spicer na frente, com o saldo de cada…
Row 3 — "Disparo pelo WhatsApp": Manda a mesma mensagem (com o nome de cada um) pra uma lista que o PF monta: o que chegou, quem compra uma marca, um grupo de clientes, os sumidos ou uma etiqueta do…
Row 4 — "Conhecer o cliente": Quando o cliente chama no WhatsApp, o PF mostra o que ainda falta saber dele (tipo, linhas, quem decide, frota do consumidor, se a revenda tem estoque ou só venda…
```

**Folha F06** — Vendas e cotação
```
Row 1 — "Classificar linha e tipo dos clientes": Tela que sugere a linha (Amarela, Agrícola, Rodoviário, Marítimo, Portuário, Energia) e o tipo (Revenda, Consumo, Serviço) de cada cliente que ainda não tem, com a…
Row 2 — "Meus pedidos": Quadro com os pedidos de venda em colunas: a emitir, emitido, separado, conferido, faturado e despachado — anda sozinho conforme a Logística marca.
Row 3 — "Quadro de vendas": Quadro com as cotações em colunas: novo contato, cotando, proposta enviada, negociando, fechou e perdeu — o PF monta sozinho.
Row 4 — "Ofertas e respostas do cliente": O PF guarda o que você ofereceu pra cada cliente e o que ele respondeu.
```

**Folha F07** — Vendas e cotação
```
Row 1 — "Ofertas e retorno dos clientes": Tudo o que foi oferecido e mandado pra cada cliente (peças, marcas, famílias, portfólio, catálogo, tabela) e o que ele respondeu, com um resumo de 1 linha feito pela IA.
Row 2 — "Relatório de cotações": Quantas cotações a equipe faz, em que hora e dia da semana mais aparecem, os meses e os dias do mês mais cheios, por vendedor (com % que virou pedido e tempo médio),…
Row 3 — "Resposta curta e Avise-me no WhatsApp": Na coluna de botões do PF dentro do WhatsApp: 🏷️ NEGATIVO / SEM CADASTRO / ZEROU sem digitar (com o código selecionado sai "5-515X - NEGATIVO") e 🔔 Avise-me dos…
Row 4 — "Máquina citada no WhatsApp → frota": Quando um cliente que não é revenda fala o modelo de uma máquina ou componente (CASE W20E, transmissão 28000…), o PF pergunta se põe na frota dele.
```

**Folha F08** — Vendas e cotação
```
Row 1 — "Portfólio na hora pelo WhatsApp": Escreveu "vou te mandar nosso portfólio" (ou catálogo, tabela)?
Row 2 — "Lembrete de mandar pro cliente": Quando você escreve "já te mando" / "te mando na quarta" ou o cliente pede "me manda a tabela", o PF cria sozinho um lembrete pra hoje (ou pro dia combinado) e ele…
Row 3 — "Status do WhatsApp": Monta a imagem do Status do WhatsApp e coloca no WhatsApp Web pra você.
Row 4 — "Informações da cotação (liga/desliga)": Etiquetas de informação nos itens da cotação — de que linha (fabricante) é o código que o cliente passou e o nosso código, foto, observação, kit, catálogo,…
```

**Folha F09** — Vendas e cotação
```
Row 1 — "Cards de Vendas": Tela com um card pra cada parte de Vendas (Cotações, Pedido de Venda, Painel de Clientes, Contas a Receber, Meu dia, Pesquisas, Portal e Assistente), cada um dizendo…
Row 2 — "Cotação": Tela onde se monta o orçamento do cliente: código, quantidade, preço, saldo e margem de cada item.
Row 3 — "Cotação em 2 linhas": Jeito de ver os itens em 2 linhas: em cima o principal, embaixo o código/marca do cliente, último preço e impostos.
Row 4 — "Último preço do cliente": Embaixo de cada item aparece o último preço que ESSE cliente pagou (ou só cotou) e quando.
```

**Folha F10** — Vendas e cotação
```
Row 1 — "Preço pela calculadora de margem": O preço de venda sai da mesma conta da calculadora de Margem (impostos, crédito de ICMS, UF do cliente, DIFAL).
Row 2 — "Desfazer / Refazer na cotação": Volta ou refaz a última mudança da cotação.
Row 3 — "PDF da cotação": Gera o PDF pro cliente com prazo de cada item (IMEDIATO, do fornecedor ou digitado), IPI, ST, total líquido, as observações da cotação e a informação do item…
Row 4 — "Avisos do cliente na cotação": Caixa com tudo que importa do cliente: anotações, regras do Assistente, título vencido, inativo, frota…
```

**Folha F11** — Vendas e cotação
```
Row 1 — "Assistente de Vendas (regras)": Regras que o sistema aplica sozinho na cotação: não cotar marca X, só com saldo, cotar o mais barato, margem por cliente…
Row 2 — "Ofereça também": Faixa na cotação que sugere o que mais oferecer (óleo pro eixo, químicos na reforma de motor…).
Row 3 — "Busca por série / modelo / máquina": Digita a máquina, o modelo ou a série e aparecem as peças separadas por componente (transmissão, eixos, filtros…).
Row 4 — "Peças iguais entre séries": Mostra quantas séries a busca achou e quanto % das peças são iguais entre elas.
```

**Folha F12** — Vendas e cotação
```
Row 1 — "RMAs do item": Clique direito no item da cotação mostra as devoluções daquela peça.
Row 2 — "Pedido de Venda": Pedidos gerados das cotações.
Row 3 — "Painel de Clientes": Números da carteira por trimestre, rankings (quem mais compra, mais cota, % que fecha), comparando com o trimestre anterior.
Row 4 — "Contas a Receber": Títulos dos clientes; o vencido aparece com 🔴 na cotação.
```

**Folha F13** — Vendas e cotação
```
Row 1 — "Meu dia": Lista do dia do vendedor: retornos combinados, cotações pra cobrar, clientes pra contatar (sumindo, crescendo, nota baixa).
Row 2 — "Chegou — oferecer pros clientes": Quando peças chegam, monta uma mensagem por cliente que pode querer (estava aguardando, cotou e não levou, já comprou).
Row 3 — "Pesquisas com clientes": Pesquisa por link (NPS, perfil, satisfação), resultados, sorteio e importação do Microsoft Forms.
Row 4 — "Portal do cliente": Página própria onde o cliente entra com usuário e senha, digita código e quantidade e vê o preço na hora.
```

**Folha F14** — Vendas e cotação
```
Row 1 — "Guia de Vendas": Explicação de cada parte de Vendas com imagem.
Row 2 — "Tempo das cotações": Mede sozinho quanto tempo cada cotação leva, por vendedor e por dia.
Row 3 — "Gestão": Tela do gestor com os números de todos os setores, separados também por GRUPO (⚙️ Eixos, Transmissões e Cardan · 🔧 Motores · 🧴 Filtros — pela família da peça, cada…
Row 4 — "Liberação de preço": Piso de preço por marca, limite de desconto e exceções na cotação.
```

**Folha F15** — Vendas e cotação
```
Row 1 — "Aviso de RMA na cotação": Na caixa de avisos da cotação aparece cada peça que o cliente já devolveu (RMA), com o número, a data e o motivo.
Row 2 — "Conversões do item": Alt+X (ou botão direito no item) mostra todos os outros números da mesma peça: conversões das fichas, Componentes Cardan e a lista de conversão da Carraro, com o…
Row 3 — "Corrigir código na cotação": Botão direito no item da cotação → ✏️ Corrigir código ou 🔍 Procurar parecidos.
Row 4 — "Vendas perdidas": Relatório do que foi cotado e não virou venda: quanto se perdeu, quanto foi por FALTA DE SALDO (e quais peças comprar primeiro), e quando o cliente cotou 2+ marcas e…
```

**Folha F16** — Vendas e cotação / Clientes e CRM
```
Row 1 — "Decidir pelo mapa na cotação": Janela na cotação com todos os itens do mapa de compras ligado a ela e os preços que cada fornecedor mandou (com o preço de venda já pela margem da cotação).
Row 2 — "Preços dos fornecedores": Na cotação, a coluna FORN.
Row 3 — "Crédito do cliente": Saldo de crédito de cada cliente (ex.: envio errado), que não vence, com extrato de quem lançou e usou.
Row 4 — "Ficha do cliente (CRM)": Tudo do cliente numa tela: números, contatos, linha do tempo (cotações, pedidos, ligações, mensagens), próxima ação.
```

**Folha F17** — Clientes e CRM
```
Row 1 — "Cadastro do cliente: comercial, fiscal, financeiro e entrega": Quatro abas no cadastro do cliente com os dados do ERP: limite de crédito e validade, comissão, recuperação judicial, contribuinte de ICMS, isenções (PIS, COFINS,…
Row 2 — "Frota do cliente na ficha": Na ficha do cliente (CRM): as máquinas da frota dele, o que ele já comprou com a gente pra cada máquina e as máquinas pra qual nunca comprou nada (com a lista de…
Row 3 — "O que o cliente não compra": Na ficha do cliente (CRM): as famílias, marcas e linhas que os clientes do mesmo tipo dele compram e ele não, com quanto um cliente parecido costuma comprar por ano;…
Row 4 — "Perfil do cliente": O sistema traça o perfil de compra de cada cliente (ritmo, valor, cotação × compra, famílias, linhas e marcas) e compara o período atual com o normal dele — escolha…
```

**Folha F18** — Clientes e CRM
```
Row 1 — "Órbita de clientes": Clientes como planetas: perto = compra recente, tamanho = valor, cor = linha do cliente.
Row 2 — "Resumo da carteira": Quantos clientes ativos, inativos, ainda cotando, dinheiro em risco, por vendedor — com PDF.
Row 3 — "Cliente inativo / novo": Na cotação aparece "⛔ inativo" (90+ dias sem comprar) ou "🆕 primeira compra" com o que falta pra vender.
Row 4 — "Link de cadastro pro cliente": Link que o cliente preenche sozinho com os dados e documentos que faltam.
```

**Folha F19** — Clientes e CRM / Compras e estoque
```
Row 1 — "Perfil da revenda / parceiro": Revenda concessionária ou independente, marcas que ela também vende (⚔️ concorrente) e margem própria.
Row 2 — "Frota do cliente": Lista das máquinas do cliente (cola print ou planilha) e contagem por tipo.
Row 3 — "Plaqueta pelo WhatsApp → Máquinas": Botão direito na foto de uma plaqueta no WhatsApp → o PF lê marca, modelo, série, ano e componentes; você confere e grava em 🚜 Máquinas, com a foto.
Row 4 — "Mapa pelo WhatsApp": Manda o pedido de cotação do mapa pros vendedores de cada fornecedor pelo WhatsApp, com uma tela pra conferir quem recebe e a mensagem de cada um, e acompanha o envio…
```

**Folha F20** — Compras e estoque
```
Row 1 — "Fornecedores por tipo de produto": No cadastro do fornecedor você marca com o que ele trabalha (Filtros, Rolamentos, Cardan, Vedação…).
Row 2 — "PartsFlow no WhatsApp (extensão)": Extensão do Chrome que liga o PF ao WhatsApp Web.
Row 3 — "Dashboard de estoque": Planilha de estoque com saldo, giro, solicitado e em trânsito.
Row 4 — "Mapa de Compras": Lista o que comprar, cota com fornecedores e gera a ordem de compra.
```

**Folha F21** — Compras e estoque
```
Row 1 — "Mapa da cotação pros compradores": Da cotação, os itens sem saldo (⚠️ Negativos→Mapa ou 📤 Mapa dos marcados) abrem um mapa de compras em rascunho: o vendedor confere os itens e os fornecedores de cada…
Row 2 — "Resposta do fornecedor no Mapa": Cola o que o fornecedor respondeu (texto, PDF ou print) e o PF lê e lança os preços e prazos no mapa.
Row 3 — "Solicitações de compra": Vendedor pede compra de uma peça pro setor de compras.
Row 4 — "Pedido de Compra": Rascunho item a item que puxa das Solicitações e do Mapa.
```

**Folha F22** — Compras e estoque
```
Row 1 — "Material de uso e consumo": Pedido de material que não é peça (limpeza, escritório, copa, ferramentas) feito por qualquer setor.
Row 2 — "Mesa do comprador": Tela única do comprador: o que tem pra comprar agora (solicitações, com as compras casadas primeiro), o que repor no estoque (com os mesmos relatórios do Dashboard:…
Row 3 — "Me Avise": Cliente quer a peça que está em falta: quando chegar, o sistema avisa.
Row 4 — "Chegou — Em Conferência": Cola o print da chegada e os vendedores são avisados na hora.
```

**Folha F23** — Compras e estoque / Área Técnica
```
Row 1 — "Ajuste de Saldo": Avisa em 1 clique quando o físico não bate com o sistema (tem QR pra imprimir).
Row 2 — "RMA — Devolução e garantia": Devolução de cliente ou fornecedor, com consulta, relatório (% devolvido do vendido) e garantia DANA por link.
Row 3 — "Garantia DANA": Link pro cliente preencher a garantia com fotos; o sistema gera o formulário oficial da Dana pronto.
Row 4 — "Alt+B busca máquina": Na busca do Alt+B, digitar o modelo de uma máquina (ex.: W20) em vez de um código mostra as máquinas que batem, com quantos componentes estão confirmados, e as séries…
```

**Folha F24** — Área Técnica
```
Row 1 — "Peça marcada no desenho do catálogo": Quando a peça está num catálogo de peças, o Alt+B, a ficha do produto e a busca Série/modelo da cotação mostram o desenho com ela marcada em laranja.
Row 2 — "Subir catálogo (lugar único)": Um botão só pra subir qualquer catálogo: PDF inteiro, print de um grupo, só a lista de peças, cardan (LNG/Spicer) ou só converter PDF em planilha.
Row 3 — "Lista de catálogos com busca e filtros": Todos os catálogos (e as séries que só têm a lista de peças) numa tela com busca por máquina, modelo, série ou código, filtros de marca, componente e máquina, e três…
Row 4 — "Observações do desenho do catálogo": O que vem escrito no desenho do catálogo (peças opcionais, números sem uso, "ver o desenho X", notas de montagem) aparece traduzido embaixo do desenho.
```

**Folha F25** — Área Técnica
```
Row 1 — "Catálogo ZF": O PDF do catálogo ZF (Catálogo ZF - Agrícola) é lido sozinho, sem IA: desenhos com os números clicáveis, peças de cada grupo, o código da montadora (ex.: John Deere)…
Row 2 — "Máquinas": Cada máquina com ficha técnica, componentes (transmissão, eixos, motor), peças de manutenção, peças de cardan e clientes que têm ela.
Row 3 — "Kits de máquina e componente": Kits de adaptação, reparo ou revisão ligados a uma máquina e/ou a um componente (série).
Row 4 — "Séries da máquina": Cada máquina pode ter várias séries; cada componente diz em quais séries vale (todas ou só algumas).
```

**Folha F26** — Área Técnica
```
Row 1 — "Copiar máquina pra outros modelos": Na página da máquina, cria o card de outros modelos (ex.: 416 → 416F2, 420, 420F2) já com a categoria, os fabricantes e os componentes (eixos, transmissão, motor).
Row 2 — "Peças por máquina": Filtros, material rodante, pinos e buchas de cada máquina, com saldo; cola print ou planilha pra preencher.
Row 3 — "Ficha técnica em inglês traduzida": Cola o texto do catálogo CAT em inglês e o sistema separa modelo, categoria, série e motor.
Row 4 — "Componentes Cardan": Cadastro de cruzetas, ponteiras, flanges, luvas… com medidas, fotos, desenho, equivalentes e aplicação.
```

**Folha F27** — Área Técnica
```
Row 1 — "Códigos parecidos": Quando o código não é achado (ou você desconfia), mostra os códigos que existem e são quase iguais: 1 caractere trocado, a mais ou a menos, dois invertidos, com/sem X…
Row 2 — "Busca geral do cardan": Busca por código (de qualquer marca), veículo ou "monta com", com tabela de medidas por tipo, foto e 📋 copiar código.
Row 3 — "Códigos Spicer": Decifra o código Spicer (série, tipo) e avisa quando o código é LNG e não Spicer.
Row 4 — "Atualização Spicer": Lê o folheto de novidades da Spicer e atualiza o cadastro.
```

**Folha F28** — Área Técnica
```
Row 1 — "Desenho técnico e 3D": Desenho da peça com medidas e, nas ponteiras, um 3D montado pelas medidas.
Row 2 — "Retentores": Consulta de retentores.
Row 3 — "Rolamentos — equivalência": Descobre medidas e equivalentes de rolamento pelo código.
Row 4 — "Aplicações — Modelos & Séries": Peças de cada série de transmissão, eixo e motor, com desenho do catálogo e "vai em" quais máquinas.
```

**Folha F29** — Área Técnica
```
Row 1 — "Peças mais intercambiáveis": Em quantos modelos cada peça vai (verde = serve em muitos).
Row 2 — "Alimentar aplicações pelo catálogo": Cola a tabela/print do catálogo (Perkins etc.) e grava as peças da série com tradução, medidas de bronzina e kits.
Row 3 — "Catálogos de peças (link sem código)": Catálogo em PDF consultável com código e saldo; manda link SEM código pro cliente escolher pelo desenho.
Row 4 — "Guia Perkins": Em qual grupo do catálogo eletrônico Perkins (SPI², em inglês) fica cada peça.
```

**Folha F30** — Área Técnica / Cadastros
```
Row 1 — "Lubrificantes": Digita o modelo e mostra o óleo de cada parte (motor, transmissão, eixos) + tabela Carraro em PDF pro cliente.
Row 2 — "Troca de motor — periféricos": Lista, pra cada motor e cada máquina, dos periféricos: o que o cliente reaproveita do motor antigo, o que precisa de adaptação e o que já vem no motor novo, com…
Row 3 — "Aplicação pelo print": Cola o print do catálogo da montadora (CAT SIS e outros), de um catálogo ou da plaqueta e a IA lê a máquina (marca, modelo, tipo, série, ano) e os componentes (motor,…
Row 4 — "Data Sheet do produto": A ficha técnica do fabricante (potência, medidas, peso, o que vem junto, garantia) e o PDF original, guardados no produto e no componente.
```

**Folha F31** — Cadastros
```
Row 1 — "Listas de conversão (Carraro OM)": Joga os números das montadoras (John Deere, Case, New Holland, Claas, McCormick, Valtra…) como CONVERSÃO nas fichas das peças Carraro, cada um com a linha da…
Row 2 — "Nomes padrão das peças": Cada peça tem um nome só no sistema, não importa o fabricante (ex.: O-RING, ANEL O e ANELLO OR viram ANEL ORING).
Row 3 — "Empresas e entidades": Clientes, fornecedores e transportadoras.
Row 4 — "Produtos": Fichas de produto (com IPI/ST, conversões, aplicações), importação de planilha e catálogos já lidos.
```

**Folha F32** — Cadastros / Ferramentas
```
Row 1 — "Catálogos já lidos": Catálogos prontos (Cummins motores, Meritor rolamentos) pra importar sem IA.
Row 2 — "Importar vendas do ERP": Sobe o relatório "Vendas por Vendedor" do ERP (PDF) e transforma cada linha num pedido de venda, casando o cliente pelo Código JBoss.
Row 3 — "Cálculo NF": Parte a NF e calcula especial.
Row 4 — "Margem": Calculadora de preço de venda com impostos.
```

**Folha F33** — Ferramentas
```
Row 1 — "Transferência": Pedido de transferência Encopel.
Row 2 — "Carta de Correção": Pede correção de NF por e-mail no formato certo.
Row 3 — "Solicitação de NF": Pede ao Fiscal NF de remessa no formulário deles, já preenchido.
Row 4 — "Condição de Pagamento": Solicita prazo pro cliente.
```

**Folha F34** — Ferramentas
```
Row 1 — "Cadastro / Reativação": Script pra cliente faturado a prazo.
Row 2 — "Leitor de Peças": Lê PDF, foto ou texto com lista de peças e vira planilha (formato JBoss).
Row 3 — "Catálogo PDF → Excel": Transforma catálogo de peças em PDF em lista pra importar, sem IA.
Row 4 — "Solicitação de Fotos": Pede foto de um item ao estoque, que sobe pelo celular; avisa quando chega.
```

**Folha F35** — Ferramentas
```
Row 1 — "Reconciliar Códigos": Cliente e fornecedor com o mesmo CNPJ e códigos diferentes.
Row 2 — "Card de Promoção": Monta imagem de promoção (fundo + itens + preço) em PNG.
Row 3 — "Atalhos de Texto": Textos prontos (endereço, documentos, frete…) pra copiar; alguns preenchem com a ficha do cliente.
Row 4 — "Respostas rápidas no WhatsApp": No WhatsApp Web (extensão do PF), o ⚡ ou digitar / na caixa de texto lista as respostas do cliente e os seus Atalhos de Texto, já com nome, empresa, cidade e cotação…
```

**Folha F36** — Ferramentas
```
Row 1 — "Cotação de frete": Formulário de cotação de frete com volume e peso.
Row 2 — "Histórico de Avisos": Avisos de oportunidade anteriores.
Row 3 — "Remover Fundo de Foto": Tira o fundo de qualquer foto.
Row 4 — "O que o sistema faz": Esta tela: todas as funcionalidades, o que é, pra que serve e onde fica.
```

**Folha F37** — Logística / Avisos
```
Row 1 — "Mapa de Transportadoras": Compara cotações de frete por rota.
Row 2 — "Logística": Transportadoras e fretes.
Row 3 — "Mapa Comercial": Clientes no mapa.
Row 4 — "História das marcas no banner": Na tela inicial, no meio das notícias, aparecem histórias reais das marcas do setor (Caterpillar, Komatsu, Dana/Spicer, Perkins…), com logo, linha do tempo, a marca…
```

**Folha F38** — Avisos
```
Row 1 — "Vídeos de fabricação": Na direita do banner da tela inicial, vídeos curtos (Shorts) de como são feitas as peças: rolamentos, cardans, retentores, engrenagens, motores e máquinas.
Row 2 — "Barra de notificações": Coluna de avisos à direita: solicitados, comprados, faturados, chegaram, catálogo, RMA, fotos, portal…
Row 3 — "Notícias do setor": Notícias da Revista M&T e das marcas na tela inicial.
Row 4 — "Timer, pendências e lembretes": Painel na tela inicial com cronômetro, pendências pessoais e lembretes que tocam.
```

**Folha F39** — Atalhos e sistema
```
Row 1 — "Mapa do sistema": Todas as funções do PartsFlow por área, com pra que serve, onde fica e "abrir ›" pra ir direto.
Row 2 — "Tour da tela": Botão ❓ Tour nas telas: destaca cada parte da tela, numera e explica uma por uma (setas ← → do teclado, Esc fecha).
Row 3 — "Chamados": Pedidos entre os setores da empresa: qualquer pessoa abre um chamado pra Vendas, Compras, Estoque, Logística, Fiscal, Financeiro (Cadastro de Clientes, Contas a Pagar…
Row 4 — "Treinamento": Telas de exemplo da cotação e da Mesa do comprador com todas as funções.
```

**Folha F40** — Atalhos e sistema
```
Row 1 — "Busca de funções": Busca qualquer tela ou ferramenta pelo nome, estilo Spotlight.
Row 2 — "Card do item (Alt+B)": Card de qualquer peça: saldo, preço, kit, aplicações, intercâmbio, óleo.
Row 3 — "Abas no topo": Cada ferramenta, card da Área Técnica e tela de Vendas, Compras, Cadastros e Logística abre numa aba no topo (não perde o que estava fazendo).
Row 4 — "Central de Atalhos": Configura teclas de atalho do seu trabalho.
```

**Folha F41** — Atalhos e sistema
```
Row 1 — "Atalhos na barra de baixo": Fixa qualquer card na barra de baixo (alfinete) e troca o ícone (botão direito).
Row 2 — "Modo monitor": Mostra o sistema como numa tela 1920×1080, encolhido.
Row 3 — "Janelas arrastáveis": Qualquer janela se move segurando a faixa de cima; Esc fecha.
Row 4 — "Trocar emoji com o botão direito": Quem é administrador clica com o botão direito em cima de qualquer emoji e troca por outro emoji ou por uma imagem.
```

**Folha F42** — Atalhos e sistema / Só do Vitor
```
Row 1 — "Tema, letra e cor dos ícones": Cores do sistema, tamanho da letra e cor dos ícones da barra.
Row 2 — "Cliques dos usuários": Linha do tempo de cada pessoa com cada botão, link ou aba clicado: hora, tela, janela aberta e o que foi clicado (na cotação, o número dela).
Row 3 — "Modificações dos usuários": Registro de quem mudou o quê: produtos, clientes, fornecedores, pedidos, preços e regras com o antes → depois de cada campo; cotações, aplicações, RMA e solicitações…
Row 4 — "Cargos e permissões": Cada cargo (Vendedor, Comprador, Estoque, Financeiro, Gerência…) tem as telas e ferramentas liberadas por padrão; o usuário recebe as do cargo e o que for diferente…
```

**Folha F43** — Só do Vitor
```
Row 1 — "Sessões dos usuários": Relatório de quem está online, quanto tempo cada um usa o sistema e em quais telas — com a ferramenta exata (ex.: Ferramentas › RMA, Área Técnica › Componentes…
Row 2 — "Dados e modo demonstração": Gera dados fictícios e liga o modo em que os outros só veem dados de exemplo; registra o que fizeram.
Row 3 — "Ocultar card / em construção": 👁 esconde um card dos outros; 🚧 marca como em construção.
Row 4 — "TVs do estoque": Demonstração das 2 TVs (fila de solicitações e pedidos).
```

**Folha F44** — Só do Vitor
```
Row 1 — "Uso de IA": Custo estimado das leituras com IA.
Row 2 — "Personalizar Cores": Editor completo do tema do sistema.
Row 3 — "Minhas Chaves": Tokens e chaves guardados criptografados.
Row 4 — "Liberar Espaço": Mostra o que ocupa o navegador e deixa limpar.
```

---

## Dicas
- Se numa linha os 4 modelos saírem parecidos demais, peça: "Row 2: make the 4 concepts really different from each other".
- Se o Gemini escrever texto dentro do ícone, peça de novo a folha com "absolutely no text".
- Mande as folhas como vierem (print ou arquivo): eu recorto, tiro o fundo e guardo cada ícone com o nome da função + modelo (a, b, c, d).
