# PartsFlow (dashV) — notas para o Claude

- **Idioma**: responder sempre em português. Usuário: Vitor (dono do sistema).
- **App**: tudo em `index.html` (arquivo único, ~70 mil linhas). Publicado na Vercel a partir da `main`.

## Fluxo de trabalho combinado
- Trabalhar na branch da sessão, abrir PR e **fazer o merge (squash) na `main` sem perguntar** — o Vitor autorizou.
- **Toda mudança sobe a versão** (`v115.NNNN`, aparece em 2 lugares no `index.html`: selo do login e do logo)
  e **sempre informar "a versão mudou de X para Y"**.
- Comentários no código seguem o padrão `// v115.NNNN - A pedido do Vitor: ...` explicando o porquê.
- Quando ele pedir "como ficaria?", mostrar captura/prévia antes de publicar.
- **Coisa nova** (funcionalidade/tela nova): primeiro SUGERIR opções (com prévia quando der) e ele decide; só publicar depois do ok.
  **Correção** de bug pode fazer e publicar direto.

## Testar antes de publicar
- Sintaxe: extrair os `<script>` inline e rodar `new Function(bloco)` em cada um.
- Navegador: Playwright (Chromium em /opt/pw-browsers) com `python3 -m http.server`;
  abortar requisições externas (`page.route(/^https?:\/\/(?!localhost)/, r=>r.abort())`),
  senão o carregamento trava nos CDNs bloqueados. `sbUser` é `let` global (atribuir direto, não via window).

## Peças do sistema mexidas recentemente (set/2026)
- Tema: `pfTemaCalcularVariaveis` — cores principais, "Painel escuro" (`--pf-painel-*`), Partes do sistema,
  Cores fixas (`--pf-fx-*`, com a cor original de fallback; e-mail/impressão/PDF ficam fora de propósito) e paletas.
- Tamanho da letra: `pfFonteAplicar(nivel)` (tema `fonteNivel`, 0–8, padrão 3) gera o `<style id="pfFonteEscala">`
  que sobe os `font-size` inline pequenos (9–14px) dentro de `#pfMain` e dos modais; níveis altos somam `zoom` nas views.
- Ferramentas: `pfFerrAplicarPadrao` deixa o cabeçalho escuro em qualquer ferramenta (layout "B");
  botão padrão 3D = classe `.pfBtn` (+ `pfBtnVermelho/Escuro/Verde/Azul/Claro`).
- Sync: `pfSyncPull` é incremental (marca d'água de `updated_at`); `cad_produtos_v1` tem merge próprio
  (`pfMergeProdutosArr`, colapsa por código+marca e **descarta item sem código** — em set/2026 um fantasma
  sem código dobrava a cada sync e chegou a 1,2 milhão; qualquer merge novo precisa colapsar TUDO, nada pode
  passar "direto" sem chave).
- Chaves do IndexedDB (`PF_IDB_KEYS`) não são comprimidas (a compressão LZString na thread principal travava 20s).
- Diagnóstico de lentidão real: tabela `user_sync`, chave `perf_diagnostico_v1` (Supabase).

## Cor dos ícones da barra (v115.2120)
- `pfIconeCor` {geral, por{atalhoId}} (compartilhada); Tema → 🎨 Cor dos ícones da barra e ⋮ → 🎨 Cor deste ícone.
  `pfIconesAplicarCor` recolore na exibição (MutationObserver em `#pfSidebar`) só ícone de bolinha azul-marinho
  (detectado pelos pixels, `pfIconeRecolorir`); os coloridos ficam. Ícones 297–327 foram refeitos sem sombra (v115.2119).

## Contas a Receber + Dados de demonstração (v115.2123)
- Vendas → aba 💰 Contas a Receber (`pvRenderReceber`), títulos em `pfContasReceber_v1` (compartilhado), etiqueta 🔴 vencido na cotação (`crResumoCliente`).
  Pedidos reais NÃO geram título sozinhos (financeiro real está no ERP).
- Ferramentas → 🎭 Dados de demonstração (`ferrDadosDemo`, só dono): grava clientes/pedidos/títulos com `demo:true` + `demoLote`;
  + cotações (num 900001+, não mexe na numeração real) e vendedores MINEIRO/Carlos Candis/Vitor (`PF_DEMO_VENDEDORES`) — v115.2124;
  apagar registra o lote em `pfDemoLotesApagados` (pvLoad/crLoad filtram — a sync só junta listas) e clientes em `cad_clientes_deletados`.

## Cliente inativo / novo → o que precisa pra vender (v115.2126)
- Cotação: 90+ dias sem comprar = "⛔ inativo" (`PF_INATIVO_DIAS`), sem histórico = "🆕 primeira compra"; clique → `pfInatAbrir(modo)`
  (reanalise / novo_prazo / novo_vista), lista montada do PRÓPRIO atalho de texto (`pfCadCampoDoRotulo` mapeia rótulo→campo do cadastro).
- Link por cliente: `formulario_links` ganhou cliente_ref/prefill/tipo/expira_em(15d)/aceita_arquivos; anon NÃO lê prefill (só via rpc `pf_form_prefill`);
  anexos no bucket PRIVADO `cadastro-clientes/<codigo>/...` (anon só insere com link válido). Resposta → `cad.respostaCadastro` + `cad.documentos`
  (`pfFormClienteChecarSubmissoes`), etiqueta "📥 resposta do cliente"; conferir/gravar `pfInatConferir`/`pfInatGravar`; abrir doc = URL assinada `pfCadDocAbrir`.

## Área Técnica (Componentes Cardan, `componentes_cardan_v1`)
- Famílias em `CC_FAMILIAS` (+ `CC_NOME_SINGULAR`); item = `{codigo, linha, descricao, veiculos[], montaCom[], conversoes[],
  equivalentesExtra[{marca,codigo,tipo}], especificacoes[{nome,valor}], fotos[], medidas por letra}`.
- "📋 Colar print de aplicação" (`ccColarPrintAplicacao`) junta aplicação/equivalentes/foto num item existente e nos relacionados;
  "➕ Cadastrar item" (`ccNovoItem`) cria item novo por print ou à mão. Aplicação exibida por `ccAplicacaoOrganizadaHtml`.
- **Spicer é a principal** (fabrica pras montadoras; REI/Sorocard/Stahl/LNG são paralelos): código, descrição e foto da Spicer
  mandam no card (`ccPrioSpicer`, `ccAplicarSpicerNoGrupo`); a descrição de outro catálogo vai pra `descricaoCatalogo`.
  Catálogo LNG 2015 (cardan) em `data/lng-cardan-2015.json` + família `acessorios`.
- Desenho técnico (v115.2112): `item.desenho` (webp/png com fundo transparente, ~15 KB) + `desenhoLogo`; colar em
  `ccColarDesenho` (limpeza `pfDesenhoLimparCanvas`: tira cinza claro GROSSO = marca d'água, mantém linha fina = cota; borracha),
  miniatura no card `ccDesenhoMiniHtml`, ampliar com zoom `ccDesenhoVer`, "🤖 Ler medidas com IA" opcional `ccDesenhoLerMedidasIA`
  (preenche os campos da família, que entram na busca por medidas). Irmãos (substitui/similar) compartilham via `pfDesenhoDe`.
- 3D montado pelas medidas (v115.2116, sem IA): `ccPeca3DMedidas`/`ccPeca3DAbrir` (three.js r128 via `pfMapaComercial3DGarantirLib`),
  por enquanto só `ponteiras` (E,C,F,B,A,D,numDentes; o que faltar vira proporção e avisa); cotas em canvas por cima, 📷 baixa PNG.
  **Só aparece no card com `item.modelo3d`** (v115.2118): o Vitor marca pelo "🧊 Montar 3D" no desenho ampliado (`ccPeca3DMarcar`); logo PF no canto.
- Cotação: busca Série/Modelo também acha componentes cardan pelo veículo (`vendasCcBuscarPorVeiculo`) + Monta com.

## Catálogos de peças em PDF
- **Guia Perkins** (v115.2114): `PF_GUIA_PERKINS` (grupo inglês x componentes, tabela MD Power pág. 68/69) + linhas extras
  `pfGuiaGruposExtra` (compartilhada); Ferramentas → 📖 Guia Perkins (`ferrGuiaPerkins`) e dica sozinha no campo de código da cotação (`vendasGuiaPerkinsDica`).
- **Catálogos já lidos** (sem IA): `data/catalogos/<id>.json` (+ o PDF) listados em `PF_CAT_PRONTOS`; Cadastros → Importar Produtos → "📚 Catálogos já lidos" abre a prévia normal (`pfCatProntoAbrir`) e cada peça leva todos os motores em `aplicacoesCatalogo` (qtd por motor). Cummins motores 2019 = 861 peças.
- No próprio sistema: Ferramentas → **📘 Catálogo PDF → Excel** (`ferrCatalogoPdf`, pdf.js no navegador,
  leitura por coluna, dicionário embutido + traduções salvas em `catpdf_traducoes_v1`).
- Fora do sistema (formato novo, ajustes): `scripts/catalogo-pdf/LEIAME.md` (Python). Ao adicionar termos ao
  `traducoes.py`, levar também pro dicionário `PF_CATPDF_DIC` do `index.html`.

## Perfil da revenda / parceiros (v115.2111)
- Cliente Revenda: `revPerfil` ('concessionaria'|'independente'), `concMarcas[]` (marca de máquina), `distribMarcas[]`
  (marcas da Triex que ele também distribui = **parceiro 🤝**, usado na 🚨 emergência da cotação), `margemPropria`, `estrategia`.
  Helpers `pfRevInfo`, `pfRevMargemDoCliente`, `pfRevFaixaCotacaoHtml`, bloco do cadastro `cadRevBlocoHtml`/`cadRevColetar`.
- Margem por perfil: `pfVendasMargemPerfis` (compartilhada; Assistente de Vendas → Geral). Ordem: regra do Assistente > margem própria > perfil > geral.
- Órbita: filtro `window._pfOrbRev` e marcação da concessionária escolhível (`pfOrbConcEstilo`: C anel / B selo / D sigla).

## Órbita 3D (v115.2127)
- Botão "🪐 3D"/"◐ 2D" no cabeçalho da Órbita (`pfOrb3DLigado`, localStorage `pfOrb3D`); mesmos dados/filtros da 2D (`pfOrbDados`).
  `pfOrb3DIniciar` → `pfOrb3DMontar` (three.js r128, sprites de planeta em canvas `pfOrb3DTexPlaneta`, anel `RingGeometry` sempre inclinado
  pra câmera), `pfOrb3DQuadro` (loop), `pfOrb3DEnquadrar` (distância que cabe no quadro), `pfOrb3DParar` (libera o WebGL — chamar antes de refazer).
- Estilos (`pfOrb3DEstilo`, localStorage `pfOrb3DEstilo`): A = planeta desenho + anel realista, B = tudo desenho, C = tudo realista.
  Anel dourado = top 10, azul = potencial, halo vermelho = comprava bem e parou; quem compra/cota pouco fica transparente (até 30%, `x.opac`); botão direito/segurar = menu ⭐ importante / 🌫️ pouco importante / automático (`pfOrbImportancia`, compartilhada). Concessionária no 3D = plaquinha azul-marinho "🏛 SIGLA" em cima do planeta (`pfOrb3DTexPlaca`, v115.2128), parceiro = plaquinha verde 🤝. Balão do cliente = `pfOrbTipHtml` (compartilhado com a 2D).

## Ideias guardadas pra testar depois (não implementadas)
- **Linha dupla do item da cotação** (referência do ERP: `docs/referencias/cotacao-linha-dupla-erp.png`): cada item ocupa 2 linhas,
  colunas empilhadas em cima/embaixo — Cód.Produto/Descrição · Conversão · Cód.Marca/Marca · Dt.Atualiz./Estoque · ST/Prazo ·
  IPI/Unitário · Prev.Cheg./Total · nItemPed/xPed · Marca Fantasia (+ R, Item, Qtde à esquerda). Fundo verde claro na linha,
  código em amarelo, Estoque e Total em lilás. O Vitor quer TESTAR se fica bom pra eles antes de adotar (fazer como opção/prévia).
- **📺 TVs do estoque — PENDÊNCIA** (prévias aprovadas em 30/set/2026, falta decidir e fazer): `docs/referencias/tv-estoque/`
  (`tv-solicitacoes.png`, `celular-estoque.png`, `tv-pedidos.png`). TV 1 = fila de solicitações ao estoque (📏 medida, 📷 foto,
  🔍 conferir saldo, 📦 amostra) com quem pediu, o quê, horário, tempo esperando (verde ≤15 min, amarelo ≤30, vermelho >30),
  "🔔 NOVA" + som/voz, "🙋 fulano pegou"; QR code → celular do estoque (Peguei / Feito com foto ou medida → cadastro + aviso
  ao vendedor). Base: tabela `fotos_solicitacoes` (+ campo tipo), medida em `medida_pecas_v1`; botão 📷/📏 na linha do item da cotação.
  TV 2 = pedidos em colunas A separar → Separando → Separado → Faturado (urgente em vermelho). Em aberto: andamento dos pedidos
  vem do ERP ou o estoque marca no celular? Som = bipe ou bipe + voz? URL própria em tela cheia (ex. `?tv=solicitacoes`).

- **🧾 Itens cotados SEM cadastro — PENDÊNCIA** (pedido do Vitor em 30/set/2026): na cotação, todo item — mesmo sem cadastro
  (código que não existe no estoque/cadastro) — precisa ficar registrado (código, marca/descrição digitada, cliente, vendedor,
  data, qtd). Quando esse item for cadastrado no futuro, o sistema avisa "este item foi cotado N vezes (por X clientes) antes de
  ter cadastro". Base provável: as cotações salvas (`partsflow_cotacoes_v1`) já guardam os itens — dá pra contar de lá; se não
  guardarem o item sem ficha, gravar num log próprio compartilhado (colapsar por código normalizado — ver regra do sync).
- **⌨️ Atalho de busca de PEDIDO do cliente — PENDÊNCIA** (pedido do Vitor em 30/set/2026): um atalho rápido igual ao Alt+B
  (`pfItemCardAtalho`/`pfItemCardBuscaAbrir`, busca de item) que busque pelo pedido do cliente (nº do pedido, nome do cliente,
  talvez nº da NF/OC do cliente) e mostre como está o pedido — situação (solicitado/comprado/faturado/chegou: logs
  `pfSolicitadosEventos`/`pfComprasEventos`/`pfFaturadosEventos`/`pfChegadasEventos`, pedidos de venda) e a PREVISÃO DE ENTREGA,
  pro vendedor responder o cliente na hora. Tecla ainda a definir (Alt+C já é usado; sugerir Alt+P).
- **📲 Avisos ao cliente pelo WhatsApp — PENDÊNCIA** (pedido do Vitor em 30/set/2026): sincronizar com o WhatsApp pra avisar o
  cliente (1) quando o PEDIDO FOI EMITIDO e (2) quando foi FATURADO e está DISPONÍVEL PRA RETIRADA. Hoje o sistema só abre
  link `wa.me` (a pessoa aperta enviar); não há API. Opções a propor: (a) semiautomático — botão/lembrete no pedido que abre o
  WhatsApp com a mensagem pronta (grátis, sem risco de bloqueio); (b) automático — WhatsApp Business Cloud API (Meta, oficial,
  modelos de mensagem aprovados, custo por conversa, precisa de número próprio e Edge Function no Supabase guardando o token)
  ou provedor tipo Z-API/Evolution (mais simples, não oficial, risco de banimento). Gatilhos: pedido de venda criado
  (`pfPedidoVendaEventos`) e faturado (`pfFaturadosEventos`); telefone/WhatsApp do cadastro do cliente; opt-in do cliente.
  Casa com a pendência do atalho de pedido (mesma "situação do pedido").

## Notícias do setor / banners de marca (v115.2133)
- Robô `noticias-scraper` (Edge Function, v5): lê a home da Revista M&T CARD POR CARD (bloco de um `DataNota` até o próximo);
  a v4 casava data/foto/título por ORDEM em listas separadas e, com 30 datas × 22 fotos, trocava foto/categoria/data das
  notícias. Foto só vale se o nome do arquivo bater com o slug do link (mesma trava no app, `pfNoticiasBuscarViaScraper`).
  Pra testar o robô daqui: `net.http_get` (pg_net) pelo SQL e ler `net._http_response` (o proxy bloqueia supabase.co/revistamt).
- Marcas (lateral do banner): `pfNoticiasLoad` NÃO apaga mais notícia de marca sem foto; `pfNoticiasBuscarMarcasComIA` não
  apaga as antigas quando volta vazio (nova substitui só a da mesma marca, até 7) e aceita notícia sem imagem; lateral completa
  com as marcas da semente se tiver < 2; card sem foto/foto bloqueada = degradê laranja com o NOME DA MARCA grande (foto por cima);
  "🔄 Atualizar agora" do dono busca marcas na hora.

## Garantia DANA pelo RMA (v115.2132)
- RMA de cliente → bloco "🛠️ Garantia DANA" (`pfGarBlocoHtml` dentro de `rmaVerDetalhe`). "🔗 Mandar link pro cliente"
  (`pfGarLinkAbrir`/`pfGarLinkEnviar`) grava `formulario_links` com tipo `garantia_dana`, `cliente_ref` = id do RMA, prefill
  {cliente, rma, peca, pecaDesc, nf, nfData} (NF = a da Triex pro cliente = "venda ao consumidor final" da Dana).
- Página pública: `pfFormClienteBootstrap` desvia pra `pfGarFormRender` quando o link é `garantia_dana`; campos em
  `PF_GAR_DANA_CAMPOS` (cada um com a célula do modelo), fotos em `PF_GAR_DANA_FOTOS` (marca/lote/NF/defeito obrigatórias),
  reduzidas pra ~1600 px JPEG e subidas em `cadastro-clientes/<codigo>/` (policy já existente), `arquivos[].slot`.
- Resposta: `pfFormClienteChecarSubmissoes` joga em `rma.garantia.resposta` + pendência "🛠️ Cliente respondeu a garantia".
  O Vitor confere/corrige no RMA (`pfGarCampo` → `rma.garantia.validado`) e "📄 Gerar formulário Dana" (`pfGarGerarExcel`)
  preenche o modelo oficial `data/modelos/garantia-dana.xlsx` com ExcelJS 4.4.0 (jsdelivr/cdnjs, `pfGarExcelJS`) — mantém
  logo/formatação — e encaixa as fotos nos quadros da aba FOTOS (`PF_GAR_DANA_BLOCOS`). Dados fixos da Triex em `PF_GAR_TRIEX`
  (CNPJ 00.609.213/0001-15, São Paulo/SP, (11) 2632-5622). Só Dana (cada fábrica tem formulário próprio).

## Ofertas complementares na cotação (v115.2130)
- Faixa "💡 Ofereça também" (`#vendasOfertaBox`, `pfOfertaRender`, chamada no render da cotação e no `vendasRefresh`).
  Regras compartilhadas `pfVendasOfertas` (`PF_OFERTAS_PADRAO`: eixo→óleo 85W140/80W90, motor de REFORMA→aditivo/silicone/
  trava-rosca/15W40, transmissão→óleo de transmissão, hidráulico→óleo hidráulico): termos na descrição (`relComeca`) + % mínimo
  dos itens + família opcional + `soReforma`. Reforma = pontos em `pfOfertaReforma` (kit do motor, qtd 3/4/6/8, cliente
  serviço/consumo) contra estoque (qtd ≥10, cliente revenda); precisa ≥2.
- "Oferecer" aceita código (sem espaço, com número → `vendasBuscarItem`) ou palavras da descrição (`pfOfertaBuscarProdutos`,
  filtro rápido `pfOfertaRegexSemAcento`, cache 2 min; normalizar as 228 mil linhas travava ~3 s). Item adicionado leva
  `it.oferta=<id da regra>` (estatística de 30 dias sai das cotações salvas); "dispensar" = `v.ofertasDispensadas`.
- Tela de regras `pfOfertasAbrir` (⋮ Mais ações e Assistente de Vendas → Geral); só admin/gestor altera (`pfVR2PodeGeral`).
  Os códigos reais dos químicos ainda não foram passados pelo Vitor — as regras padrão buscam por descrição.
- "❓ Como funciona" (v115.2131, `pfOfertasComoFuncionaHtml`) no topo da tela de regras + "?" na faixa da cotação (pra todos)
  abre direto nele. Se mudar a pontuação da reforma ou a busca, ATUALIZAR esse texto junto.
