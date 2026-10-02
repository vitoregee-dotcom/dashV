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
  v115.2153: "Clientes fictícios" (padrão 150, `pfDemoClientesLista(n)`: os 30 fixos + ramo×nome×cidade de `PF_DEMO_RAMOS`/
  `PF_DEMO_NOMES`/`PF_DEMO_CIDADES`, permutação sem repetir) e pedidos padrão 600 (até 2000); atalho "📺 Abrir as TVs do estoque" (demo/estoque-tv.html);
  apagar registra o lote em `pfDemoLotesApagados` (pvLoad/crLoad filtram — a sync só junta listas) e clientes em `cad_clientes_deletados`.

## Cliente inativo / novo → o que precisa pra vender (v115.2126)
- Cotação: 90+ dias sem comprar = "⛔ inativo" (`PF_INATIVO_DIAS`), sem histórico = "🆕 primeira compra"; clique → `pfInatAbrir(modo)`
  (reanalise / novo_prazo / novo_vista), lista montada do PRÓPRIO atalho de texto (`pfCadCampoDoRotulo` mapeia rótulo→campo do cadastro).
- Link por cliente: `formulario_links` ganhou cliente_ref/prefill/tipo/expira_em(15d)/aceita_arquivos; anon NÃO lê prefill (só via rpc `pf_form_prefill`);
  anexos no bucket PRIVADO `cadastro-clientes/<codigo>/...` (anon só insere com link válido). Resposta → `cad.respostaCadastro` + `cad.documentos`
  (`pfFormClienteChecarSubmissoes`), etiqueta "📥 resposta do cliente"; conferir/gravar `pfInatConferir`/`pfInatGravar`; abrir doc = URL assinada `pfCadDocAbrir`.
- v115.2143: "💬 Mandar o que falta" / "📋 Copiar o que falta" (`pfInatTexto` monta SÓ os campos vazios + perguntas de opção +
  arquivos que faltam; `pfInatCopiarFalta`). **Todo envio por WhatsApp passa por `pfWhatsAbrir(tel,texto)`**: computador =
  WhatsApp Web numa aba nomeada `pfWhatsWeb` (reaproveitada, não abre guia nova) ou `whatsapp://` (app instalado), escolha
  `pf_whats_modo` (`pfWhatsModoSelectHtml`); celular/iPad = wa.me. Envio novo pelo WhatsApp: usar esse helper.

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
- **Ponteira fixa × deslizante** (v115.2138): fixa = tem ROSCA (medida G) e é presa por porca; deslizante = corre dentro
  da luva, sem rosca (pescoço conta como deslizante). Em 01/10/2026 só 53 de 256 diziam o tipo na descrição. Tipo por GRUPO
  (`ccPontChave` = substitui||similar||codigo, igual ao agrupamento dos cards): marcado à mão `it.tipoPonteira` > descrição >
  G preenchida (fixa) > dedução Stahl com medidas e sem G (deslizante). Filtro "Tipo" na busca (`ccPontFiltroHtml`,
  `_ccFiltro.tipoPont` fixa/deslizante/sem) e etiqueta no card (`ccPontBadgeHtml`); admin clica e marca (`ccPontDefinir`
  grava em todo o grupo). Desde v115.2139 o código Spicer do grupo também decide (entre a G e a dedução Stahl):
  "-53-" = fixa, "-40-" = deslizante (etiqueta "pelo código Spicer -53-").
- **Códigos Spicer** (v115.2139, pedido do Vitor "deixe guardado no PF essas regras"): `pfSpicerDecifrar(cod)` —
  formato 1 SÉRIE-TIPO-NÚMERO (`PF_SPICER_SERIES` 2/3/4/6/6.5/8/90/140/170/250; tipo do meio `PF_SPICER_TIPO_MEIO`:
  1 flange companheiro, 2 flange de orelha, 3 luva, 4 terminal, 26/28 garfo, 40 ponteira deslizante, 53 ponteira fixa,
  55 luva pesada, 70/74/86 acessório); formato 2 TIPO-NÚMERO (`PF_SPICER_TIPO_FRENTE` 01 flange, 02 garfo, 03 luva,
  04 terminal, 53/54 ponteira, 55/82 pontuva); cruzeta 5-153X / SPL-250-1X; mancal 47-9xx-X / 210xxx-1X. Sufixo
  (X/KX/XS/C) NÃO decifrado. Tela "📖 Códigos Spicer" (`pfSpicerAbrir`, botão na busca geral dos Componentes Cardan +
  faixa "📖 Lendo o código" `pfSpicerDicaHtml` nos resultados): decifrador, regras, conferência ao vivo com o cadastro
  (`pfSpicerConferir`), outras peças da mesma série e anotações compartilhadas (`pfSpicerCodNotas`, só admin edita).
  Regra nova descoberta → acrescentar nas tabelas E no texto da tela.
- Cotação: busca Série/Modelo também acha componentes cardan pelo veículo (`vendasCcBuscarPorVeiculo`) + Monta com.

## Catálogos de peças em PDF
- **Guia Perkins** (v115.2114): `PF_GUIA_PERKINS` (grupo inglês x componentes, tabela MD Power pág. 68/69) + linhas extras
  `pfGuiaGruposExtra` (compartilhada); Área Técnica → 📖 Guia Perkins (`ferrGuiaPerkins`, saiu de Ferramentas na v115.2160) e dica sozinha no campo de código da cotação (`vendasGuiaPerkinsDica`).
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
- v115.2141/2142: legenda "Como ler a órbita" = `pfOrbLegendaHtml()` (blocos posição/anéis/movimento + "Usar", ✕; clique fora fecha);
  balão do cliente `pfOrbTipHtml` no formato "B" (rótulo × valor, etiqueta da situação, bloco Tendência, alerta em caixa);
  ⛶ Ampliar (`pfOrbAmpliar`, `_pfOrbAmpliada`): o `#pfOrbitaWrap` vai pro `<body>` em tela cheia (volta pro lugar ao fechar;
  Esc/fundo/✕ Fechar) e `pfOrbAjustarAltura` usa a altura toda (sem o teto de 380px). Vale pra 2D e 3D.
- v115.2149 **anéis por motivo** (`pfOrbMotivos`, chamada no `pfOrbDados`): 🟡 valor alto (top R$ 12m) · 🟢 frequência (top nº pedidos)
  · 🟣 ticket médio (top R$/pedido, mín. pedidos) · 🔵 potencial — `x.motivos` (ordenados pela posição relativa) e `x.aneis` (os 2
  mais fortes; anel de 2 cores = metade de cada; no 3D `pfOrb3DMatAnel` usa uv.y = ângulo). Comportamento SEM marca no planeta:
  ❤️ `x.pref` (fecha ≥70% das cotações 12m, mín. 5, ou marcado), 💎 `x.naoNeg` (só marcado), 🐜 `x.form` formiguinha (≥8 cotações
  em 90 dias + até R$ 10 mil no trimestre ou ticket nos 25% menores, sem motivo; contorno fino cinza). Selo ❤️/💎/🐜 só aparece
  no ✨ Destacar (`_pfOrbDest`, `pfOrbPassa`, `pfOrbDestSelectHtml`). Gestor: ⚙️ `pfOrbCfgAbrir` (compartilhada `pfOrbCfg`,
  padrão `PF_ORB_CFG_PADRAO`, inclui quais anéis aparecem). Marcas à mão no botão direito (2D e 3D, `pfOrbMenuAbrir`,
  compartilhada `pfOrbMarcas` {por:{k:{pref,naoNeg,form}}}). Tamanho do planeta = `pfOrbTamValor` (12 meses, diferença mais forte).
- v115.2154: com muitos clientes na mesma faixa, eles se dividem em "pistas" de raio (`pfOrbPistas`/`pfOrbPistaDesl`, a de 30
  dias empurrada pra fora) e no 3D a órbita fica mais grossa (y3); o quadro cresce com a quantidade (`window._pfOrbN`, até +220 px).
  v115.2155: com 12+ na faixa, espalha pela largura toda da faixa em ordem embaralhada fixa (`pfOrbRaioGrupo`, `PF_ORB_FAIXAS`).
  v115.2157: todos giram JUNTOS (`PF_ORB_VEL`, antes Kepler: os de dentro alcançavam e encostavam) e `pfOrbAfastar` separa
  os que se encostam antes de começar (tamanho do planeta + anel, cada um preso na faixa `pfOrbFaixaLim`), 2D e 3D.
  v115.2156 (3D): enquanto ninguém gira, a câmera olha mais de cima quanto mais alto o quadro (`pfOrb3DPhAuto`, `cam.mexeu`;
  ↺ volta pro automático) — na tela ampliada o disco usa a altura. Dá pra testar o 3D aqui: servir `three@0.128.0` do npm no
  lugar do cdnjs e lançar o Chromium com `--use-angle=swiftshader --enable-unsafe-swiftshader`.
- v115.2148: balão do cliente dá pra alcançar com o mouse (`pfOrbTipEsconder` some só ~0,35 s depois; `pfOrbTipDentro` segura;
  clique = ficha `pfOrbTipClique`; `pfOrbTipPosicionar` mantém dentro do quadro). No 3D, mouse no balão = ele para de seguir o planeta.

## Cotação em 2 linhas (v115.2140)
- Botão "▦ Tabela | ▤ 2 linhas | ☰ Compacta" (`vendasViewModo()`/`vendasViewModoSet`, localStorage `pf_vendas_view_modo`);
  a tabela de 1 linha NÃO mudou. `vendasItens2LinhasHtml(v)` (tabela `#vendasItensTable2`, sem arrastar/redimensionar coluna):
  linha de cima = a de hoje sem CUSTO (linha `tr[data-vidx]`, tem os inputs venda/pct → `vendasAtualizarLinha` funciona);
  linha de baixo `tr[data-vidx2]`. CÓDIGO: laranja = o que o cliente passou (`codigoOriginal`), azul embaixo = principal
  (só se diferente); MARCA: em cima a do cliente (`marca`), azul embaixo a interna (`marcaInterna`). Descrição editável.
- Último preço do cliente (`pfHistCliDados`, cache `_pfHistCliCache`, vem de `item_historico_precos` via
  `pfBuscarHistoricoPreco`; PV- = vendido, V- = só cotado; ignora a cotação aberta; mesma marca, senão outra avisando):
  etiqueta + preço + data, apagado; mouse/toque → `vendasHistPop` mostra o OUTRO (vendido ↔ só cotado).
- Total do item embaixo (`vendasAtualizarTotalLinha`). Ações = `vendasItemAcoesHtml` (compartilhado com a tabela).
- v115.2144: largura das colunas ajustável (alça na borda do cabeçalho, `vendas2ColRes`; 2 cliques/"↺ larguras" volta,
  `vendas2ColPadrao`; localStorage `vendas_item2_cols`, padrão `VENDAS_C2_PADRAO`); v115.2158: a divisória troca espaço SÓ entre as duas vizinhas
  (antes saía da DESCRIÇÃO, a elástica); 🎨 no cabeçalho DESCRIÇÃO = cor do último
  preço (`vendasHistCor`, localStorage `pf_hist_cor`, com cor = sem transparência); listra do tema por ITEM (`vendas2Fundo`).
- v115.2150 IPI/ST (jeito "Y"): vêm do CADASTRO DO PRODUTO — campos `ipi`/`st` em % (form do produto `prodIpi`/`prodSt`,
  importação de planilha mapeia colunas ipi/st; `pfImpostoPct` lê "3,25"/"3.25%"). Ficha = código + marca interna/cliente,
  senão a 1ª do código com imposto (`vendasProdImpIdx`, cache 60 s, zerado no `cadSave` de produtos). Modo 2 linhas: em cima
  UNIT. FINAL (`data-final`) = preço + IPI + ST (ambos % sobre o preço, `vendasItemValores`); embaixo a caixa do preço sem
  imposto (`data-field=venda` na `tr[data-vidx2]`) + "+ IPI x + ST y" (`data-imp`) + total com impostos. Tabela de 1 linha,
  resumo e PDF da cotação NÃO mudaram (ainda sem imposto).
  Prévias em `docs/referencias/previa-cotacao-2-linhas*.png`.

## Ideias guardadas pra testar depois (não implementadas)
- **📺 TVs do estoque — PENDÊNCIA** (prévias aprovadas em 30/set/2026, falta decidir e fazer): `docs/referencias/tv-estoque/`
  (`tv-solicitacoes.png`, `celular-estoque.png`, `tv-pedidos.png`). TV 1 = fila de solicitações ao estoque (📏 medida, 📷 foto,
  🔍 conferir saldo, 📦 amostra) com quem pediu, o quê, horário, tempo esperando (verde ≤15 min, amarelo ≤30, vermelho >30),
  "🔔 NOVA" + som/voz, "🙋 fulano pegou"; QR code → celular do estoque (Peguei / Feito com foto ou medida → cadastro + aviso
  ao vendedor). Base: tabela `fotos_solicitacoes` (+ campo tipo), medida em `medida_pecas_v1`; botão 📷/📏 na linha do item da cotação.
  TV 2 = pedidos em colunas A separar → Separando → Separado → Faturado (urgente em vermelho). Em aberto: andamento dos pedidos
  vem do ERP ou o estoque marca no celular? Som = bipe ou bipe + voz? URL própria em tela cheia (ex. `?tv=solicitacoes`).

  **Demonstração pra apresentação** (02/10/2026): `demo/estoque-tv.html` — página SEPARADA do sistema (dados fictícios,
  não lê/grava nada) com as 2 TVs vivas pro iPad: solicitações (tempo ao vivo, 🔔 NOVA + bipe + voz pt-BR, tocar = pegou/feito)
  e pedidos em colunas que andam sozinhos. Botões no topo (trocar tela, ⏸ automático, 🔊, ↺); teclado 1/2, espaço, N, P.

- **🧾 Itens cotados SEM cadastro — PENDÊNCIA** (pedido do Vitor em 30/set/2026): na cotação, todo item — mesmo sem cadastro
  (código que não existe no estoque/cadastro) — precisa ficar registrado (código, marca/descrição digitada, cliente, vendedor,
  data, qtd). Quando esse item for cadastrado no futuro, o sistema avisa "este item foi cotado N vezes (por X clientes) antes de
  ter cadastro". Base provável: as cotações salvas (`partsflow_cotacoes_v1`) já guardam os itens — dá pra contar de lá; se não
  guardarem o item sem ficha, gravar num log próprio compartilhado (colapsar por código normalizado — ver regra do sync).
- **🔄 Substituto quando o item está ZERADO — PENDÊNCIA** (pedido do Vitor em 30/set/2026): na TELA DA COTAÇÃO, item sem saldo
  (ou sem cadastro) precisa mostrar na própria linha se tem outro que dá pra usar no lugar e que TEM saldo (ex.: "🔄 212345 tem
  saldo 8 — trocar"), com botão pra trocar/adicionar. Já existe: pares "substituto" em `rel_decisoes_v1` (`relSubstitutosDe`,
  resposta "🔄 Um substitui o outro") — mas só aparecem dentro do modal 🔗 (`relSubstitutosHtml`), e a etiqueta conta `_nSubst`
  sem dizer se tem saldo. Juntar outras fontes: irmãos substitui/similar dos Componentes Cardan (`pfDesenhoDe`/equivalentes),
  conversões/equivalentes do cadastro de produto, e as outras fichas do mesmo código (a "cotação enxuta" já troca por marca com
  saldo). Mostrar só quem tem saldo > 0 primeiro.
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

## Segurança do banco (revisão de 30/09/2026) — LER antes de criar tabela/política
- O app COMPARTILHA linhas entre usuários (dados da empresa gravados em `user_id = MY_USER_ID`, logs de todos): a regra
  é "da empresa", não "só o dono". Função `pf_eh_da_empresa()` (logado + tem linha em `profiles`) e `pf_eh_admin()`
  (security definer, só `authenticated` executa). `user_sync`, `user_cadastros`, `transit_notas_processadas`, `cot_*` =
  RLS ligado + política "empresa acessa (logado com perfil)". Antes estavam com RLS DESLIGADO = abertas pra quem tivesse
  a chave pública do site (inclusive sem login) — incluindo a `anthropic_key` que vai no sync.
- **Tabela nova: SEMPRE `enable row level security` + política** (nunca deixar RLS off). Backups/temporárias: RLS ligado
  sem política (trancadas). Testar com `set local role anon` / `authenticated` + `request.jwt.claims` num `begin…rollback`.
- `profiles`: só admin cria/remove (`pf_eh_admin`); leitura só logado; `handle_new_user` (sem gatilho) grava sempre role
  'user'. Edge Functions temporárias `claude-tmp-*` e `debug-scrape` DESATIVADAS (410 + JWT) — não criar função aberta
  com service role; `resposta-fornecedor` usa segredo no header.
- Pendências (doc "PartsFlow — Segurança e manutenção"): trocar a chave da Anthropic; desligar signup público e ligar
  proteção de senha vazada no painel; rever login externo (Encopel, role `ferr_margem`); `cached_credentials` guarda
  `btoa(senha)` no navegador (login offline) — trocar; levar a chave da IA pra Edge Function.

## Notícias do setor / banners de marca (v115.2133)
- Robô `noticias-scraper` (Edge Function, v5): lê a home da Revista M&T CARD POR CARD (bloco de um `DataNota` até o próximo);
  a v4 casava data/foto/título por ORDEM em listas separadas e, com 30 datas × 22 fotos, trocava foto/categoria/data das
  notícias. Foto só vale se o nome do arquivo bater com o slug do link (mesma trava no app, `pfNoticiasBuscarViaScraper`).
  Pra testar o robô daqui: `net.http_get` (pg_net) pelo SQL e ler `net._http_response` (o proxy bloqueia supabase.co/revistamt).
- Marcas (lateral do banner): `pfNoticiasLoad` NÃO apaga mais notícia de marca sem foto; `pfNoticiasBuscarMarcasComIA` não
  apaga as antigas quando volta vazio (nova substitui só a da mesma marca, até 7) e aceita notícia sem imagem; lateral completa
  com as marcas da semente se tiver < 2; card sem foto/foto bloqueada = degradê AZUL (v115.2137, era laranja) com o NOME DA MARCA grande (foto por cima); banners trocam a cada 10 s, marcas a cada 25 s;
  "🔄 Atualizar agora" do dono busca marcas na hora.

## Campos de número / link do cliente (v115.2136)
- Clicar num campo de NÚMERO seleciona o valor inteiro (é só digitar): listener global `focusin`+1º `mouseup` (perto de
  `pfItemCardGarantirCss`); vale pra type=number, inputmode numeric/decimal e texto que só tem número/preço/% —
  código com letra (212279-1XSC), data e telefone ficam normais; `data-pf-no-sel` desliga.
- Link de cliente (`?f=`): CSS no `<head>` (`#pfLinkPublicoCss`) esconde tudo do body menos `#pfFormClienteOverlay` e mostra
  "Carregando formulário…" — o sistema por trás nunca aparece (nem logado). Todo formulário público usa esse id.
- Garantia: o PartsFlow NÃO tem nº de NF (é do ERP); a janela do link lista os pedidos de venda da peça pro cliente
  (`pfGarVendasRender`, via `pvLoad`) e "usar esta data" preenche a data.

## Garantia DANA pelo RMA (v115.2132)
- RMA de cliente → bloco "🛠️ Garantia DANA" (`pfGarBlocoHtml` dentro de `rmaVerDetalhe`); desde v115.2135 também dá pra marcar
  "🛠️ É garantia DANA" na Nova RMA (`rmaGarDanaIn` → `r.garantiaDana`, abre `pfGarLinkAbrir` ao salvar) e o card da lista mostra a etapa. "🔗 Mandar link pro cliente"
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
- v115.2151: no link, cada foto tem "📷 Tirar foto" (capture) e "📁 Escolher arquivo" (galeria/arquivos, aceita PDF). A foto da
  NF SAIU do link (`PF_GAR_DANA_FOTOS` nf com `triex:true`): a Triex anexa a nota no RMA — `pfGarNfBoxHtml` (janela do link
  e bloco do RMA) com "📋 Colar print" (`pfGarNfColar`, clipboard; Ctrl+V com a caixa na tela também cola) e "📎 Enviar
  arquivo" → `pfGarNfSalvar` sobe em `cadastro-clientes/interno/rma-<id>/` e grava `r.garantiaNf`; o Excel usa ela no quadro
  da NF. PDF não entra como imagem na planilha (avisa). Fotos ocupam o quadro todo do modelo (~545x410 px, centralizadas).
- v115.2146: `formulario_links` ganhou política SELECT pra `authenticated` (`pf_eh_da_empresa()`) — antes o logado não lia o
  link e a resposta de garantia virava "📋 Novo cadastro recebido" e era marcada processada sem ir pro RMA. Agora sem achar o
  link/RMA a submissão NÃO é marcada (tenta de novo); pendência com mesmo id não duplica.
- v115.2145: aviso 🔄 **RMA / Garantia** na barra de notificações (`rma` em PF_AVISOS_CONFIG_DEFAULT/LABELS/LOG_KEYS e
  iconePorEtapa): log compartilhado `pfRmaEventos` (`pfRmaEventoAdd`, entra no merge de logs do sync), hoje gerado quando o
  cliente responde a garantia pelo link; painel lista e abre `rmaVerDetalhe`. Outros eventos de RMA: usar `pfRmaEventoAdd`.

## RMA — consulta, relatório e RMAs do item (v115.2152)
- `ferrRMA` = busca (cliente/código/descrição/nº) + filtros vendedor/período/status/tipo/motivo em `window._rmaF`
  (`rmaFiltradas`, resultado em `#rmaRes` via `rmaRenderRes`, sem perder o foco da busca) + números (`rmaKpisHtml`).
  Aba 📊 Relatório (`rmaRelatorioDados`/`rmaRelatorioHtml`): agrupa por peça/cliente/vendedor/motivo; "% do vendido" =
  peças devolvidas ÷ peças dos pedidos de venda do período (`rmaVendidoPorCodigo`); ⬇️ Excel (`rmaRelatorioExcel`, SheetJS).
- RMA ganhou `vendedor` (Nova RMA com sugestão `rmaSugerirVendedor`: PV do cliente com a peça > PV do cliente > vendedor do
  cadastro; editável no detalhe, `rmaVendedorSalvar`). Motivo vazio = "garantia DANA"/"(sem motivo)" (`rmaMotivo`).
- Cotação: botão direito → "🔄 RMAs deste item (N)" → `vendasRmasItem(i)` (números 12m, aviso se o cliente da cotação já
  devolveu, lista clicável). `rmaDoCodigo(cod)` compara código normalizado. Prévias em `docs/referencias/rma-consulta/`.

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
