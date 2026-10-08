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

- **Botão de print/arquivo = SEMPRE o padrão** (pedido do Vitor, 02/10/2026): `pfBtnColarPrintHtml(h,onclick)` (📋 Colar print,
  `.pfBtn pfBtnEscuro`) + `pfBtnCarregarArquivoHtml(h,inputId,accept,onchange)` (⬆ Carregar arquivo, `pfBtnVermelho`), lado a lado,
  com o Ctrl+V continuando a funcionar. Nada de "clique aqui e cole" em texto/link.

- **✅ PADRÃO DO SISTEMA — conferir ANTES de criar qualquer tela/janela/botão** (pedido do Vitor, 07/10/2026: "tudo que for
  criado ser padrão com o sistema"). Copiar de uma janela que já existe (ex.: `ccNovoItem`, `pfFreteModalRender`) e conferir:
  - **Fechar**: ✕ = `pfXGlossyHtml(22..24)` (quadrado vermelho) num `<button>` sem fundo — nunca "✕"/"×" em texto.
  - **Esc fecha** a janela (só a de cima; se tiver outra embaixo, ela fica) — listener `keydown` em captura com
    `stopImmediatePropagation`, removido ao fechar. Formulário com coisa digitada: confirmar antes de perder.
  - **Fundo** fecha só se o clique COMEÇOU no fundo (`onmousedown` guarda, `onclick` confere) — arrastar seleção não fecha.
  - **Cabeçalho escuro** (`pfCorpHead`/`pfCorpTitulo`/`pfCorpSub` ou `var(--pf-painel-bg,#1c2940)` + texto branco), rodapé com os
    botões preso embaixo e só o meio rolando; altura máxima termina ACIMA do dock (`pfAiDockClearance`).
  - **Botões** = `.pfBtn` + `pfBtnVerde` (confirmar/gravar), `pfBtnClaro` (cancelar/fechar), `pfBtnAzul`, `pfBtnVermelho`, `pfBtnEscuro`.
  - **Print/arquivo** = `pfBtnColarPrintHtml` + `pfBtnCarregarArquivoHtml` lado a lado + Ctrl+V (ver abaixo).
  - **WhatsApp** = `pfWhatsAbrir`. **Cor fixa** em texto dentro de cartão de fundo fixo (o painel escuro herda branco).
  - **z-index**: janela aberta por cima de outra precisa ser MAIOR que a de baixo (card do Alt+B = 99999).
  - Telas com menu de cards: "← Voltar" (`pfVoltarHomeBtnHtml`) e Esc voltando. Janelas já ficam arrastáveis sozinhas (v115.2221).
  - Etiqueta/dado novo de uma peça: mostrar também no card do Alt+B (`pfItemCardAbrir`) quando fizer sentido.
  - **Tudo que avisa/notifica vai pra BARRA DE NOTIFICAÇÕES** (pedido do Vitor, 07/10/2026: "é pra isso que ela serve"): log
    compartilhado só-acrescenta (`pfXxxEventos` com id/data, entra no sync e nos logKeys) + chave em `PF_AVISOS_LOG_KEYS`,
    `PF_AVISOS_CONFIG_DEFAULT`, labels, `iconePorEtapa`, `pfIconeComBadge` no rail e painel em `pfAvisosAbrirPainel` (modelo: `rma`, `catalogo`).
- **🖥️ Modo monitor do trabalho** (v115.2177, refeito): botão 🖥️ na barra (`pfBtnMonitor`) / **Option+T (Alt+T)** (v115.2178; Alt+M = Mapa de Compras) → `pfMonitorToggle` vai pra
  `?pfmonitor=1`; um `<script>` no COMEÇO do `<head>` troca a página por uma moldura com o app num `<iframe>` 1920×1080 de verdade
  (`?pfmonframe=1`, `window._pfEmMonitor`) encolhido com `transform: scale` (media queries e vw/vh certos — o zoom no `<html>` da
  v115.2176 deixava o layout de "tela pequena" no Mac). O app só roda dentro do iframe; "✕ Sair" no topo / Option+T voltam pra URL normal.

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
  v115.2238: além de longtask/gap, grava `quadro_lento` (API long-animation-frame, quadros ≥120 ms, máx 1/2 s): `scripts[]` com
  fn (função), inv (quem chamou: clique/timer/observer), pos (posição no index.html daquela versão) e layout (ms de layout forçado).

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
- v115.2230 BUG "🧾 Preencher atalho com ficha do cliente" (`ferrAtalhosTextoAbrirPreencher`): Ctrl+V de IMAGEM na janela sempre lia
  como FICHA NOVA e apagava o preenchimento. Agora, com resultado na tela, imagem colada = resposta do cliente
  (`ferrAtalhosTextoPreencherRespostaArquivo`: IA completa só o que falta; botões padrão Colar print/Carregar arquivo na caixa
  de resposta); ficha nova por cima pede confirmação; `ferrPreencherMostrarResultado` mantém os dados do pedido de crédito.

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
  v115.2229 BUG: o logo PartsFlow clarinho atrás do desenho (`PF_DES_LOGO_BG`) cortava o "w" → viewBox 350 + `textLength` fixo.
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
  v115.2202: etiqueta pequena 🔩 Fixa / ↔️ Deslizante / ❔ também nas linhas da BUSCA GERAL (código, veículo, monta com) — `ccPontMiniHtml(fam,rec)`.
  v115.2203 ("pode colocar na descrição mesmo"): `ccPontDescAplicar` (1x por sessão no `ccRender` e ao marcar à mão) ESCREVE o tipo na
  descrição — "PONTEIRA FIXA …"/"PONTEIRA DESLIZANTE …" (`ccPontDescCom`; sem "ponteira" = prefixo "PONTEIRA FIXA - "); só tipo certo
  (manual/descrição/G/código Spicer — a dedução Stahl p=0 NÃO); marcado à mão troca a palavra oposta; original em `descSemTipo`.
  v115.2204 (Vitor: "só assim"): a descrição vira EXATAMENTE "PONTEIRA FIXA" ou "PONTEIRA DESLIZANTE" (nada mais; antiga em `descSemTipo`).
- **Códigos Spicer** (v115.2139, pedido do Vitor "deixe guardado no PF essas regras"): `pfSpicerDecifrar(cod)` —
  formato 1 SÉRIE-TIPO-NÚMERO (`PF_SPICER_SERIES` 2/3/4/6/6.5/8/90/140/170/250; tipo do meio `PF_SPICER_TIPO_MEIO`:
  1 flange companheiro, 2 flange de orelha, 3 luva, 4 terminal, 26/28 garfo, 40 ponteira deslizante, 53 ponteira fixa,
  55 luva pesada, 70/74/86 acessório); formato 2 TIPO-NÚMERO (`PF_SPICER_TIPO_FRENTE` 01 flange, 02 garfo, 03 luva,
  04 terminal, 53/54 ponteira, 55/82 pontuva); cruzeta 5-153X / SPL-250-1X; mancal 47-9xx-X / 210xxx-1X. Sufixo
  (X/KX/XS/C) NÃO decifrado. Tela "📖 Códigos Spicer" (`pfSpicerAbrir`, botão na busca geral dos Componentes Cardan +
  faixa "📖 Lendo o código" `pfSpicerDicaHtml` nos resultados): decifrador, regras, conferência ao vivo com o cadastro
  (`pfSpicerConferir`), outras peças da mesma série e anotações compartilhadas (`pfSpicerCodNotas`, só admin edita).
  Regra nova descoberta → acrescentar nas tabelas E no texto da tela.
- **Nomes das medidas por fabricante** (v115.2184, `CC_MED_SIN`): a mesma peça vem com nome de medida diferente em cada
  catálogo — a tabela diz qual campo é qual (Flange de acoplamento: A = Ø retentor [Sorocard "Ø Retentor" / REI "Ø A"],
  B = comprimento [REI "C (mm)"], D = furos "4 x 15,5" [REI "Qtd. Furos" + "Ø Furo"], E = furação [Sorocard "Ø Entre Furo"],
  F = Ø disco [Sorocard "Ø Disco" / REI "Ø B"], NOVOS G = Ø estria e H = nº de dentes ["22-E" = 22 + piloto ESTRIADA]).
  Vai no pedido à IA do "➕ Cadastrar item" (`ccMedSinTexto`) e, depois da IA, `ccMedidasDasEspecs(fam, especificacoes)` coloca
  cada valor no campo pelo NOME da especificação (manda sobre a IA). Família nova / fabricante novo → acrescentar em `CC_MED_SIN`.
  v115.2185: selo no card de cada família (`ccMedSinSeloHtml`): ✅ fabricantes mapeados (`CC_MED_SIN_FABS`, ao mapear
  família/fabricante novo ATUALIZAR essa lista também) ou ⚪ "falta mapear" — o Vitor usa pra saber o que mandar.
  v115.2186: no ➕ Cadastrar item o nome de cada medida fica EM CIMA do campo (`ccNovoMedidasHtml`); flange: "4 furos (M14)" escrito
  na observação/aplicação vira D = "4 x M14".
- **LNG × SPICER — NÃO CONFUNDIR** (v115.2189; a regra da v115.2186/2187 "SIMILAR NN-NNN da Sorocard = Spicer" estava ERRADA —
  41-594 e 35-406 são LNG, estão em `data/lng-cardan-2015.json`). Padrão tirado das 1.211 peças LNG + códigos Dana citados nelas:
  LNG = 2 partes com prefixo 41/35/28/46/90 (41-594) — LNG NUNCA tem 3 partes; 6 dígitos 1/2/3/5/8xxxxx costuma ser LNG.
  SPICER/DANA = 3+ partes (6.5-40-191, 2-70-59, 90-70-394), 0[1-4]-xxx, 5-153X, 40-/53-/54-/82-/48-/95-.
  AMBÍGUOS (nos dois): 26-, 55-, 94-, 98- e 6 dígitos → só o cadastro decide. O "SIMILAR" da Sorocard e o "Substitui nº 41594"
  da REI costumam ser LNG. `ccMarcaPeloCodigo(cod)` (cadastro primeiro — `ccCodIdxMarcas`, sem traço: 41594 = 41-594 —, depois
  o formato) → `ccEqMarcaPeloCodigo(lista)` na prévia/gravação do Cadastrar item e no Colar print de aplicação; peça com
  equivalente LNG que já tem cadastro entra no card da LNG (`rec.similar`); `ccCorrigirMarcaLng` (1x por sessão) desfaz o
  "SPICER" errado das peças gravadas. Tela 📖 Códigos Spicer: código LNG = aviso vermelho "NÃO é Spicer" + quadro "Não
  confundir com LNG". Pedido à IA também explica a diferença.
- v115.2189 BUG: o filtro DENTRO da família (texto) agora também procura nos equivalentes/conversões e sem traço (S622 = S-622),
  igual à busca geral — antes clicar num resultado da busca geral achado por equivalente abria a família "sem nenhum item".
- **🔗 É a mesma peça** (v115.2188, link no rodapé do card, `ccMesmaPecaAbrir`): o Vitor acha 2 cadastros que são a mesma peça
  (ex.: Sorocard SA-27 = LNG 35-406) e junta: `ccMesmaPecaPlano` escolhe a chave final (a do grupo que TEM Spicer = cadastro
  Spicer ou peça que cita a chave como SPICER; `ccPareceSpicerCod` é solto demais, não usar) e passa o `similar`/`substitui` de
  todo o outro grupo pra ela; 2 Spicer diferentes = não junta. Antes fica em `o.juntado` → "↩ Separar" (`ccMesmaPecaSeparar`).
- Cotação: busca Série/Modelo também acha componentes cardan pelo veículo (`vendasCcBuscarPorVeiculo`) + Monta com.
- v115.2205 BUG busca geral: buscando um CÓDIGO (1 palavra com número e traço/ponto/letra+número, ex.: 5-263X), aplicação que só CITA o
  código ("AGRALE APLIC. CRUZETA 5-263X/…" — LNG) saía em "🚚 Veículo"; agora vai pro "🔗 Monta com" (`apl2mc` no `ccBuscaGeralExecutar`).

- v115.2228 **detalhes na busca geral** (Vitor: "opção de exibir detalhes, ex. número de estrias/dentes"; escolheu B + C da prévia
  `docs/referencias/busca-detalhes/`, "mostrando monta com" e "eu escolher o que quero ver"): selo amarelo "⚙ N dentes" sempre nas linhas
  (`ccBgSeloDentesHtml`) + botão "📐 Detalhes" (`ccBgDetAlternar`, localStorage `pf_cc_bg_det`) que vira TABELA (`ccBgDetTabela`) com
  caixinhas "MOSTRAR" (`ccBgDetCaixasHtml`, `pf_cc_bg_cols`; padrão foto, descrição, monta com, dentes): Foto/Descrição/Monta com/
  Aplicação (`CC_BG_EXTRAS`) + medidas das famílias que apareceram (`ccBgColsDisp`, coluna = NOME da medida sem a letra; "Dentes /
  estrias" junta via `ccCampoEstrias`). Valor = 1º preenchido do grupo, Spicer primeiro (`ccBgValor`; "·" = a família não tem a medida).
- v115.2210 BUG "➕ Cadastrar item"/"📋 Colar print de aplicação": o pedido à IA não tinha "monta_com" (ela punha "MONTA COM
  2045005 / C020 / 52MM" DENTRO da aplicação) e as estrias ficavam só nas especificações. Agora: `monta_com` no JSON das duas
  leituras + `ccMontaComDaIA(j)` (junta e TIRA de dentro das aplicações; `ccMontaComDoTexto` separa por "/" e larga medida
  solta "52mm"), campo "Monta com" no Cadastrar item (→ `rec.montaCom`) e bloco 🔗 Monta com na prévia do Colar print;
  `ccEstriasDaIA(fam,j)`/`ccCampoEstrias(fam)` ("Estrias: 26-E", "26 estrias", "Nº de dentes" → numDentes; flanges = H).
  Conjuntos Montados ganhou o campo `numDentes`. `ccCorrigirMontaComEstrias` (1x por sessão no ccRender) arruma os já gravados.
- v115.2222 BUG: o catálogo LNG 2015 pôs a página "DIVERSAS" (pág. 33) inteira em Acessórios, inclusive 39 TERMINAIS ("TERMINAL BOMBA"
  501036–501040/41-636 e "TERMINAL JUNTA BASCULANTE" 28-0xx). `ccCorrigirTerminaisAcessorios` (1x por sessão no ccRender) passa item de
  Acessórios com descrição "TERMINAL…" pra Terminais; `data/lng-cardan-2015.json` corrigido. Ainda em Acessórios e talvez não sejam:
  7 "FLANGE (CONICA) JUNTA UNIVERSAL" 28-095…28-181 (perguntar ao Vitor).
- v115.2225 **📥 Atualização Spicer** (Vitor: "é uma atualização que a Spicer manda no catálogo dela às vezes. deixe algo pra
  atualizar o PF também... criar outros grupos. Mancais e coifas"): família nova **`coifas`** (Coifas, extraFiltro série cardan).
  Faixa vermelha no menu dos Componentes Cardan (só admin, `ccSpicerAtuBotaoHtml`) → `ccSpicerAtuAbrir`: folhetos JÁ LIDOS em
  `PF_CC_SPICER_ATU` (`data/spicer-atualizacoes/<id>.json` + PDF; gravado = `importacoes['spicer_'+id]`) ou folheto novo por
  📋 Colar print / ⬆ Carregar arquivo (PDF → pdf.js 1568 px por página) → IA `ccSpicerAtuIA` (tabela COD. SPICER | DESCRIÇÃO |
  APLICAÇÕES | SÉRIE CARDAN | MEDIDA INTERNA ROLAM. | COD. OEM | COD. REI). `ccSpicerAtuNorm` → família `ccSpicerAtuFamilia`
  (MANCAL/COIFA/CRUZETA pela descrição > `pfSpicerDecifrar` > IA; trocável na prévia). Prévia `ccSpicerAtuRender` (🆕 novo /
  ♻️ atualiza: o que entra, `ccSpicerAtuDiff` / ✔ já igual). Gravar `ccSpicerAtuGravar`: existente (`ccSpicerAtuAchar`, Spicer
  primeiro) ganha só o que falta (aplicações, OEM = ORIGINAL, REI = EQUIVALENTE, modelos de cardan → Monta com, "Série cardan",
  "Medida interna do rolamento", D/serie vazios); novo = linha SPICER, D = medida (mancais), serie; REI citada com card próprio
  → a Spicer vira a principal (`ccRechavearGrupoSpicer`), mas se o card da REI já tem Spicer (R-1090 = 10001864 e 10004428) a nova
  fica ao lado. Folheto de out/2026: 10 mancais + 2 coifas (`2026-10-mancais-coifas`). Folheto novo lido pela IA dá pra virar
  arquivo pronto (json no mesmo formato + linha no `PF_CC_SPICER_ATU`).
- v115.2225 **kit no Alt+B** (Vitor: "onde vejo o que tem dentro de um kit... fora da cotação? com Alt+B?"): `pfItemCardKitHtml`
  põe no card do Alt+B as mesmas etiquetas da cotação (📦 kit com N peças / 🧰 vem no JG …) → `pfAlimKitVer` (agora z 100005,
  por cima do card).
  v115.2226: a lista do kit fecha no Esc (só ela; o card do Alt+B fica) e tem o ✕ padrão (`pfXGlossyHtml`).
  v115.2227: a caixinha de busca do Alt+B (`pfItemCardBuscaAbrir`) ficou maior (400 px) com letra maior (campo 17 px, ajuda 13,5 px).
- **Aplicações — Modelos & Séries** (v115.2162) saiu de Cadastros (aba escondida) e abre pela Área Técnica (`atAplicAbrir`,
  desenha em `#atAplicBody`, flag `window._aplicNaAT`). Funções da tela pegam o container por `cadAplicEl()` e
  `cadGoTab('aplicacoes')` redesenha lá; `atAplicAjustar` faz Importar Catálogo/prévia irem pra Cadastros (assistente mora lá).
  Esc: a busca por "← Voltar" ignora espaços e inclui `areaTecnicaBody`.
  v115.2166: a sync só redesenha os cards da Área Técnica se o menu (`#areaTecnicaGrid`) estiver na tela — antes
  Aplicações/Guia Perkins (abrem no `areaTecnicaBody` sem trocar o currentView) voltavam sozinhos pros cards.
  v115.2167: **Esc volta SEMPRE** (pedido do Vitor): menu da Área Técnica ganhou "← Voltar" (tela inicial); no handler global
  do Esc, o passo 1 (fechar janela fixa z≥9990) ignora `#pfAiBotaoWrap` (botão do assistente de IA — o Esc APAGAVA ele e não
  voltava, ex.: Rolamentos) e `data-pf-esc-ignora`; fallback: `area_tecnica*` → `ftVoltarCards`, menu → `pfIrParaHome`.
  v115.2168: Esc nos menus de cards — Dashboard/Mapa/Solicitações/Pedido de Compra → cards de Compras; Compras/Ferramentas/
  Cadastros/Logística → tela inicial (`pfIrParaHome`); campo com texto em foco: o 1º Esc só tira o foco.
  v115.2169: "← Voltar" (`pfVoltarHomeBtnHtml`) nos menus de Compras/Ferramentas/Cadastros/Logística/Área Técnica; Esc passo 2
  só clica em Voltar VISÍVEL; Cadastros com grupo aberto → `cadVoltarGrupos`.
- **Ficha Técnica de Equipamentos** (v115.2174): formulário (`ftRenderForm`) só fecha pelo fundo se o clique COMEÇOU no fundo
  (arrastar seleção e soltar fora fechava e perdia tudo); **rascunho** `pfFtRascunho_v1` (`ftRascunhoSalvar/Ler/Ligar/Apagar`, por id ou
  'novo', inclui fotos de plaqueta se couber) volta sozinho ao reabrir + faixa "♻️ Continuar preenchendo" na lista; Cancelar com
  alteração pede confirmação (`ftCancelarForm`); Esc com o formulário aberto fecha SÓ o formulário. Janela termina acima do dock
  (padding = `pfAiDockClearance`) com Cancelar/Salvar presos no rodapé. Lista mostra Ano/Série embaixo do modelo (busca acha).

## 🛢️ Lubrificantes (v115.2234; tabela Carraro traduzida em `data/lubrificantes-carraro.json` + `docs/referencias/lubrificantes-carraro/`)
- Área Técnica → card 🛢️ Lubrificantes (`ferrLubrificantes(aba)`): **🔎 Qual óleo usar** (Vitor: "coloque o modelo e o sistema diga qual óleo")
  + **📋 Tabela Carraro** (`pfLubTabelaHtml`). Óleos em `PF_LUB_CARRARO` (ids u80w/80w90/85w140/c220s/c220m/10w40/15w40t/15w40, cods 5/20/200 L).
- Busca (`pfLubLista`): Ficha Técnica (modelo/linha/transmissão/eixos/motor) + Catálogos de peças (`pfLubCatAchar`: título/marca/modelo/ref.).
  `pfLubSugerir(ficha)` por compartimento (motor/trans/eixoD/eixoT/final): regra pela categoria (❔ provável) — retro: dianteiro 80W-90,
  traseiro Universal 80W; carregadeira: eixos Universal; trator: cárter comum UTTO; hidrostática = ⚠️ fora da tabela; Caterpillar = aviso TO-4;
  escavadeira = comando final 80W-90 — < catálogo da peça (`pfLubCatAnalisar`: disco de freio/embreagem/conversor = banho de óleo →
  Universal 80W, 🔎 pelo catálogo) < marcado à mão pelo gestor (`pfLubDefinir`, compartilhada `pfLubModelos_v1` {por:{fichaId:{k:{oleo}}}}, ✅).
  Regra de ouro: freio/embreagem em banho de óleo → Universal 80W; sem → 80W-90; motor → 15W-40 TurboLub. Desenho das embalagens: o Vitor NÃO quis.
- "💡 Ofereça também": `pfLubOfertaProds(regra, cotação)` põe o óleo Carraro na frente (eixo com freio/fricção na cotação → Universal, senão
  80W-90/85W-140; transmissão → Universal; reforma de motor → 15W-40 TurboLub; só se o código estiver no cadastro). Alt+B: `pfLubCardHtml`.
- v115.2235 ("salva aquele PDF... mandar direto pro cliente, direto do PF"): `data/lubrificantes-carraro.pdf` (gerado do `tabela.html`, sem nada
  interno, com a regra prática) + botões 📄 PDF da tabela / 📋 Copiar link / 💬 Mandar pro cliente (`pfLubMandar(fichaId?)` → `pfWhatsAbrir` com os
  óleos da máquina por parte + link do PDF). Mudou a tabela → regerar o PDF (Playwright `page.pdf` do tabela.html).
- v115.2236 BUG ("TLB1 4WD" não achava nada — não está na Ficha Técnica nem tinha catálogo carregado): `PF_LUB_CONHECIDOS` = componentes pelo
  NOME (Carraro TLB/refs 426045 e 371186, ZF WG/Ergopower, Dana/Clark HR/TE/R32000, power shuttle/powershift/conversor → Universal 80W;
  hidrostática → fora; eixo Carraro NN.NN / ZF MT-L / Dana 16D/19D/21D → Universal com freio, 80W-90 sem) — `pfLubConhecido`, entra quando
  nenhum catálogo bate. Obs.: `pfLubN` troca pontuação por espaço (20.22 = "20 22") — regex precisa aceitar espaço.

## Catálogos de peças em PDF
- **Guia Perkins** (v115.2114): `PF_GUIA_PERKINS` (grupo inglês x componentes, tabela MD Power pág. 68/69) + linhas extras
  `pfGuiaGruposExtra` (compartilhada); Área Técnica → 📖 Guia Perkins (`ferrGuiaPerkins`, saiu de Ferramentas na v115.2160) e dica sozinha no campo de código da cotação (`vendasGuiaPerkinsDica`).
- v115.2195 **Guia Perkins + catálogo 404D-22** ("incrementar o guia, com tradução e o grupo onde encontro a peça"; sem tela nova):
  `GN65674N_404D_22.pdf` (raiz do site) → `data/catalogos/perkins-404d-22.json` (85 seções/706 peças: [item, Part No., ref, qtd, inglês,
  português]; extraído com pymupdf pelas colunas x; traduções do `pfCatEnvTraduz` + correções à mão). `pfPk404Carregar` (fetch 1x),
  `PF_GUIA_404D_LIGA` (grupo do guia → seções), `pfPk404DoGrupo` (linha "📘 404D-22: … 📄 pág." em cada grupo), `pfPk404Buscar`
  (palavras em pt/en/seção ou código com 4+ dígitos) → tabela "Peças no catálogo 404D-22" no `ferrGuiaPerkinsLista`; ref "F X" = só no
  kit X, "E" = tem alternativa; 📄 `pfPk404Abrir(p)` abre o PDF `#page=` (desenho = pág. da lista − 1). Catálogo de outro motor Perkins:
  extrair igual e generalizar (hoje é 1 motor só).
  v115.2196 (Vitor: "o guia NÃO é de um motor — é pra saber em que GRUPO acho a peça no catálogo ELETRÔNICO da Perkins, que é em
  inglês"): tela sem página/código/PDF. O json do 404D-22 só serve de fonte "peça → grupo": `pfPk404DoGrupo` = nomes dos grupos do
  catálogo eletrônico (inglês + pt, 📋 copiar) em cada linha do guia; `pfPk404Buscar` junta por nome em inglês → tabela Peça (pt) |
  Em inglês 📋 | Grupo onde fica 📋. Busca só pt/en (sem código).
  v115.2197: o Vitor usa o catálogo ELETRÔNICO **SPI²** (spi2-new.perkins.com) — grupos de cima: Block, Exchange Long Engine, Long
  Engine, Engine Kits, Cylinder Head, Engine Control, Fuel Injection Equipment, Cold Start, Fan, Cooling, Lubrication, Low Pressure Fuel,
  Back End Group, Starter motor, Exhaust Manifold, Alternator, Engine Lifting, Auxiliary Drive, Instrumentation (pack A6AH, B6AH…).
  `PF_PK_SPI2` = seção do livro → grupo SPI² ([grupo, certo]; false = dedução → "❔ provável"), `PF_PK_SPI2_PT` tradução,
  `pfPkSpi2Html` mostra o grupo SPI² em destaque (📋) + "dentro: <seções do livro>". Print novo do SPI² → corrigir `PF_PK_SPI2`.
  v115.2198 (prints do Block e Fan): Block = Connecting Rods / Crankshaft & Bearings / Cylinder Block / Pistons & Rings; Fan = só Fan
  Drive. `PF_PK_SPI2` virou [grupo, plate, certo] (grupo null = "ainda não confirmado", hoje: Timing Case, Camshaft & Gears, Rear End Oil
  Seal, Front End Drive Input, Miscellaneous, Air Filter, Feed Pipes — NÃO são Block); `pfPkSpi2Sub(seção, inglês)` escolhe a plate do
  Block pela peça; mostra "Block › Pistons & Rings".
  v115.2199: Lubrication = Oil Filter / Oil Leak-Off Pipes / Rotor / Sump (bomba de óleo → Rotor provável; bocal e radiador de óleo fora).
  v115.2200: Cylinder Head = Cylinder Head Assembly / Rocker Shaft Assembly (tampa de válvulas e bocal fora → não confirmados); Low Pressure Fuel tem Lift Pump. Back End Group confere (carcaça, backplate, volante).
  v115.2201: Engine Control = Camshaft & Gears / Stop Solenoid Control / Timing Case (distribuição e comando confirmados aqui). Obs.: os prints do SPI² são do HP66975N, o PDF é do GN65674N (404D-22) — nomes das plates batem com as seções do livro, mas a pasta de cima só o SPI² mostra.
- **📥 Alimentar aplicações pelo catálogo** (v115.2161, `pfAlimAbrir`; Área Técnica + botão no Guia Perkins): marca/série
  (modelo opcional) guardadas em `pfAlimAplicCtx` enquanto navega; cola a TABELA (texto, formato Perkins Symbol|Item|Parts No.|
  Qty.|Latest Part No.|Description — `pfAlimLerTexto`, sem IA, tradução por `PF_CATPDF_DIC`/traduções salvas; NLA desmarcado;
  Latest ≠ Parts No. = vale o novo) e/ou o PRINT/PDF (`pfAlimImagem`/`pfAlimPdf`; recorte do desenho arrastando; sem texto, a IA
  lê a tabela `pfAlimIA`). Grava aplicação {marca, serie, modelo, equip = grupo, qtd} na ficha e na lista `APLIC_KEY` (dedupe
  série+marca+código+equip); desenho sobe em `ferramentas-arquivos/catalogo-desenhos/<marca>/<serie>/` e fica em
  `pfAplicDesenhos_v1` (compartilhada, chave marca|série|grupo; 🖼 na linha de aplicação da ficha, `pfAplicDesenhoVer`).
  Peça sem ficha = ficha nova com `doCatalogo` → etiqueta "⚠️ conferir" na cotação enquanto não tiver NCM.
  v115.2163: descrição passa pelas "Substituições de Descrição" (`substAplicar`, as mesmas da importação) e o 💾 da linha
  cria regra nova (`pfAlimSalvarRegra`, reaplica nas linhas não editadas). A série cai na tela Aplicações (1 card por série;
  título mostra até 4 grupos + "+N grupo(s)").
  v115.2170: upload do desenho por `pfStorageSubir` (Storage dá 400 com login expirado/regra: renova o login, tenta de novo e
  cai pra `pendencias/…`); se falhar, as aplicações JÁ ficam gravadas, a tabela limpa e aparece "🔄 Tentar subir o desenho de
  novo" (mantém o print). NLA com Latest ≠ Parts No. NÃO é fora de linha (o NLA é do código antigo).
  v115.2171: `pfAplicJuntarSemModelo` (ao abrir Aplicações e ao gravar): aplicação SEM modelo de série que tem 1 só modelo
  (mesma marca) ganha esse modelo → 1 card por série; selo "🖼 N desenho(s)" no card (`pfAplicDesenhosDaSerie`).
  v115.2172 **série = 1 motor só** (Vitor): `pfAplicJuntarSemModelo(fixo)` passa TODA a série pro modelo mais usado (ou pro
  `fixo` = modelo digitado agora no Alimentar); `pfAplicModeloDaSerie` preenche o modelo no Alimentar ao digitar/abrir a série.
  v115.2173: desenho sobe em **PNG** (o bucket NÃO aceita WEBP; >1,2 MB vai JPEG). Desenho depois: o campo Grupo do Alimentar
  sugere os grupos da série (datalist) e lista os "🖼 Sem desenho" clicáveis; no card de Aplicações o selo vira "🖼 x/y desenho(s)"
  → `pfAplicDesenhosDaSerie` mostra os grupos sem desenho com "➕ Subir desenho" (`pfAlimAbrirCom(marca,serie,grupo,modelo)`).
- v115.2213 **bronzina sobremedida no Alimentar** (print SPI² "CRANKSHAFT KIT"): item entre parênteses "(3)" = alternativa do item 3;
  na bronzina muda a MEDIDA — item sem parênteses = STD, os "(N) … - U/S" em ordem = 0,25MM / 0,50MM / 0,75MM (/1,00MM;
  `PF_ALIM_US_ORDEM`, `pfAlimMedidaUS`; medida escrita na descrição manda) → fim da descrição ("JOGO DE BRONZINA DE MANCAL 0,25MM").
  `pfAlimTraduz` tira o " - U/S" quando não acha a frase inteira. Pedido à IA do print manda copiar o item COM os parênteses.
  v115.2214: a medida fica FORA da regra de descrição — `pfAlimDescCom(L)` = `substAplicar(descBase)` (sem medida) + `L.medida`;
  o 💾 grava só o nome ("JOGO DE BRONZINA DE MANCAL" → "JG DE BRONZINA DE MANCAL", vale pra STD/0,25/0,50/0,75 e biela igual);
  `pfAlimRegrasMedidaLimpar` (1x) tira a medida que regra de BRONZINA antiga tinha no "para".
  v115.2215: o 💾 abre janela própria (`pfAlimSalvarRegra` → `pfAlimRegraGravar`) no lugar do confirm OK/Cancelar: campos
  Trocar/Por já com SÓ as palavras que mudaram (`pfAlimRegraDiff`: "JOGO" → "JG") e escolha "em qualquer descrição" × "só exata".
  v115.2216: a alternativa (N) com a MESMA descrição também é medida quando a peça é bronzina ou JUNTA DO CABEÇOTE
  (`PF_ALIM_MED_PECAS`; print "Cylinder Head Assembly": 22 3681E051 = STD, (22) T409652 = 0,25MM). Arruela de encosto (5)/(6)
  ainda NÃO (esperando o Vitor confirmar).
- v115.2217 **lista de KIT no Alimentar** (pedido do Vitor: jogo de juntas superior/inferior; prévia em `docs/referencias/kit-juntas/`):
  faixa "📦 Esta lista é um KIT" (`pfAlimKitFaixaHtml`, estado `window._pfAlim.kit`, `pfAlimKitSync`/`pfAlimKitCampo`) com código e
  descrição do kit — vêm do Grupo "KIT DE JUNTAS - SUPERIOR (T403222)" (`pfAlimKitDoGrupo`: código entre parênteses; JUNTA/GASKET +
  SUPERIOR/TOP ou INFERIOR/BOTTOM → "JOGO DE JUNTAS SUPERIOR/INFERIOR" passado pelo `substAplicar`); a lista do catálogo NÃO tem o
  código do kit → o Vitor digita quando o grupo não tiver. Gravar (`pfAlimKitGravar`): ficha do kit `ehKit` + `composicaoKit`
  (mesmos campos do cadastro de produto; descrição da peça = a da ficha) + aplicação da série; cada peça ganha `kitsQueContem`
  [{codigo,desc,qtd}]. Cotação (`vendasEtiquetasHtml` → `pfAlimKitEtqHtml`): "🧰 vem no JG … · saldo" (laranja forte = sem avulso e
  kit com saldo) e "📦 kit com N peças" → `pfAlimKitVer(cod)` (lista com qtd no kit e saldo avulso).
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
- v115.2233 **preço da cotação = conta da Calculadora de Margem** (Vitor: "a margem tem que ser de acordo com o custo do item... o
  cálculo do card de margem... manda bala"): `vendasCalcVenda` chama `calcMargemLiq` (crédito ICMS da compra pelo fornecedor
  `PF_VENDAS_FORN_UF`='SP' 18%, PIS/COFINS sobre o valor cheio, ICMS de venda pela UF do cliente, DIFAL se o cadastro é consumo);
  margem padrão 21% (30% gravado vira 21% 1x, flag `pfMargemPadrao21`). Conta antiga em `vendasCalcVendaAntiga` (sem uso).
  Custo 100, SP, 21% = R$ 140,58 (igual ao card). PENDENTE: o Vitor quer margem POR PRODUTO / faixa de custo + margem fixa só em
  alguns clientes — esperando ele mandar a lista de faixas.
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
- v115.2164: 🔵 potencial também = "📈 crescendo agora" (`x.cresce`: últimos 90 dias ≥ 1,5× a média trimestral dos 9 meses
  anteriores e ≥ R$ 2 mil; não vale pra cliente novo); entra numa lista própria de até `topPot`, texto do motivo mostra R$ e ×.
- v115.2165 **📊 Resumo da carteira** (`pfOrbResumoCalc(lista)`, respeita os filtros de cima): faixa de 1 linha embaixo do
  cabeçalho (`pfOrbResumoFaixaHtml`; clique filtra via `pfOrbResumoClique` → `_pfOrbTipo`/`_pfOrbRev`/`_pfOrbDest`) + botão
  "📊 Resumo" (`window._pfOrbResumo`) abre `pfOrbResumoPainelHtml` (Carteira/Perfis/Dinheiro/Comportamento + Por vendedor).
  Vendedor (`pfOrbResumoVendNome`: filtro de vendedor, ou o próprio quando não é gestor). 🖨️ `pfOrbResumoImprimir` / 📄
  `pfOrbResumoPdf` (html2pdf) usam `pfOrbResumoDocHtml` (quadros + por vendedor + maiores, pararam, potencial).
- v115.2175 Resumo: "Parados" virou **Inativos (+90 dias)** + "↳ ainda cotando" (`x.cotando` = sit 'r' e cotação nos últimos 90 dias;
  filtro `_pfOrbFiltro='cotando'`; na órbita = pontinho âmbar discreto no canto do planeta, 2D e 3D `pfOrb3DTexCotando` — o Vitor
  pediu pra NÃO usar 🔥, guardar o ícone pra outra coisa). "⚪ Fora da órbita" = já compraram, +1 ano sem comprar e sem cotar há 6
  meses (`window._pfOrbFora`, montado no `pfOrbDados`). "📋 Ver inativos e perfis" (`pfOrbInatAbrir`/`pfOrbInatRender`, perfil por
  `pfOrbPerfilK`) e tabela no relatório. "❓ Explicar" (`window._pfOrbExplicar`, desligado por padrão) mostra "pra que serve" e uma
  frase por número. 💎 Não negocia = parceiro/cliente que NÃO faz negócio com a gente (não é "não pechincha").
- v115.2179 **cabeçalho enxuto** (prévia A, `docs/referencias/orbita-cabecalho/`): título "🪐 Órbita" + contadores só com ícone
  (🔴 inativos, ↳ cotando) + botões ícone 🔍 📊 ⛶ 3D ?. Os seletores (rastro, grupo, tipo, revenda, conc., cor, vendedor, estilo 3D,
  destacar, ⚙️) moram no popover "🔍 Filtros" (`window._pfOrbFiltrosAberto`, `pfOrbFiltrosAlternar`/`pfOrbFiltrosLimpar`, `_fHtml`
  montado no `pfOrbitaRender`; número = filtros ligados `_fN`; clique fora fecha). Faixa do resumo curta (sem perfis → 📊 Resumo),
  com "⚠️ R$/ano em risco" (saiu do cabeçalho).
- v115.2219 **🏷️ placa da marca em cima do planeta** (Vitor: "coloque esses vai. e o tamanho, de acordo com a proporção que o planeta
  tiver"; antes, v115.2218, eram satélites girando — ele achou feio): imagens dele em `icons/orbita-marcas/placa-<id>.png` (caseih, cat,
  mf, valtra, case, perkins; `PF_ORB_SAT` {nome, asp}); largura = diâmetro do planeta (3D sprite no lugar da plaquinha 🏛, `selC`; 2D
  drawImage acima). Automático pela concessionária (`pfOrbSatAuto`: CASE→case, CASE IH, CAT, MF, VAL, PERKINS) ou à mão no botão direito
  (`pfOrbSatMenuHtml`, `pfOrbMarcas.por[k].sat` = id | 'nenhum'). `PF_ORB_SAT_LIGADO` desliga tudo. Marca nova = imagem + linha no PF_ORB_SAT.
  Prévias em `docs/referencias/orbita-satelites/`.
- v115.2237 ("tá lento no MacBook"): os loops da órbita (2D `pfOrbDesenhar` e 3D `pfOrb3DQuadro`) desenhavam em todo quadro (120/s em tela
  ProMotion, Retina) — agora no máximo ~30/s (`st.ultDes`) e param quando a órbita sai da tela rolando (`st.foraTela`, conferido a cada 0,5 s).
  Obs.: no modo monitor 🖥️ (iframe 1920×1080 com `transform: scale`) o Mac pesa mais — tudo é redesenhado encolhido.
- v115.2148: balão do cliente dá pra alcançar com o mouse (`pfOrbTipEsconder` some só ~0,35 s depois; `pfOrbTipDentro` segura;
  clique = ficha `pfOrbTipClique`; `pfOrbTipPosicionar` mantém dentro do quadro). No 3D, mouse no balão = ele para de seguir o planeta.

## 🚚 Cotação de frete (atalho de texto com formulário)
- `pfFreteModalAbrir`/`pfFreteModalRender` — v115.2206 ("ta zuada essa janela"): janela de 760px com cabeçalho (✕) e rodapé
  presos e só o meio rolando (`#pfFreteModalCorpo`, guarda a rolagem ao re-renderizar), campos em grade de 6 colunas (2 no
  celular, `_estr` < 600px), volume numa linha só (Compr × Larg × Alt + Peso), botões padrão 📋 Colar print / ⬆ Carregar arquivo,
  fundo só fecha se o clique começou nele, termina acima do dock (`pfAiDockClearance`).

## Mapa de Compras — fornecedores do item
- v115.2207 BUG: nos cartões de fornecedor de cada item (`.mFornCard`, passo 1 do mapa) o nome não tinha cor e herdava o
  BRANCO do painel escuro (cartão é branco fixo) → nome com `color:#1A2B3C` fixo. Texto novo dentro de cartão de fundo fixo:
  sempre dar cor fixa também.

## 🤝 CRM (v115.2209 — Fase 1; prévia aprovada em `docs/referencias/crm/`)
- **Ficha do cliente** `pfCrmAbrir(k)` (tela cheia `#pfCrmFicha`, Esc fecha; k = chave do Painel de Clientes `pcMontarDados`:
  'c:CODIGO' ou 'r:RAZÃO'; `pfCrmChaveDe(razao,obj)`/`pfCrmAbrirPorRazao`). Abre pelo clique na Órbita (`pcAbrirFichaPorChave`),
  pelo Painel de Clientes (`pcAbrirFicha` desvia; a análise antiga fica no "📊 Análise completa" → `pfCrmAnalise`, flag
  `_pcFichaAntiga`), pela etiqueta "🤝 Ficha" no cliente da cotação e pela busca do "Meu dia".
  Esquerda: números 12m (`pfCrmNumeros`), ⏰ próxima ação, contatos do cadastro (`pfCrmContatos`), o que mais compra.
  Meio: linha do tempo `pfCrmTimeline` = eventos do CRM + `cad.anotacoes` (as da cotação) + cotações (clique abre, `pfCrmAbrirCot`)
  + pedidos (`pfCrmAbrirPed`) + títulos do Contas a Receber + RMAs + resposta do link de cadastro; filtros `_pfCrmFiltro`.
  Direita: mandar mensagem (WhatsApp via `pfWhatsAbrir` / e-mail via mailto, com ⚡ respostas prontas `pfCrmProntas`) — fica
  REGISTRADA; funil de cotações 90 dias.
- Dados: log compartilhado **`pfCrmEventos`** (logKeys + lista de sync) — SÓ ACRESCENTA (`pfCrmAdd`): tipos nota/ligacao/whats/
  email/prox{data}/feito{ref}. Próxima ação aberta = "prox" mais novo sem "feito" (`pfCrmProxAtual`). Nunca editar evento.
- **☀️ Meu dia** = aba em Vendas (`pfCrmMeuDiaRender`): retornos combinados (atrasados/hoje/7 dias), cotações pra cobrar
  (2–30 dias sem virar pedido, maiores primeiro, 💬 Cobrar `pfCrmCobrar`), clientes pra ligar (sumindo = dias > 1,5× o
  intervalo e ≥30; inativo que ainda cota; crescendo ≥ +50%; título vencido). Vendedor vê a carteira dele; gestor escolhe.
- Próximas fases (decidir com o Vitor): WhatsApp API oficial (Meta) com conversa dentro da ficha; caixa de e-mail ligada
  (Microsoft 365 ou Google); IA resumindo a conversa; pesquisas com o cliente (ver pedido de 06/10).

## 📣 Chegou — oferecer pros clientes (v115.2223; opção B da prévia `docs/referencias/chegou-oferecer/`)
- `pfChegouAbrir(dias,fv)` / `pfChegouRender`: janela (z 99990) com UMA mensagem por cliente com tudo o que chegou da linha dele.
  `pfChegouCalc(dias,fv)` cruza `pfChegadasEventos` (3/7/15 dias, sem repetir código+marca) com `pcMontarDados`: prioridade 1 ⏳
  aguardando (`meAvise_lista` com `nome_cliente` → `pfCrmChaveDe`), 2 📄 cotou e não levou (90 dias, `_pcFech` falso), 3 🔁 já comprou o
  código (pedidos 12 meses), 4 🏷️ compra a marca (2+ itens da marca em 12 meses; vem DESMARCADO). Contato `pfChegouContato` (wa do
  Avise-me > contatos do cadastro); texto `pfChegouMsg` (editável; dá pra tirar peça da mensagem, `pfChegouItem`).
- Envio `pfChegouEnviar(k, whats|email|copiar)` → `pfWhatsAbrir`/mailto + `pfCrmAdd({origem:'chegou', refs})` (mostra "✔ enviado");
  rodapé "💬 Próximo: cliente (n de N)" manda um por um. Filtro Minha carteira / Todos (gestor). Entradas: botão no painel do sino
  "Chegaram recentemente" e faixa verde no ☀️ Meu dia (`pfChegouFaixaHtml(fv)`, últimos 3 dias).
- v115.2224 **conversão por cliente** ("cada cliente eu preciso enviar com o código da linha que ele trabalha"): `pfChegouConvIdx` lê as
  `conversoes` {ref,linha} das fichas das peças que chegaram (cache 60 s) → `c.opts` (nosso + conversões; conversão também casa histórico).
  `pfChegouCodPara(r,x)`: escolhido à mão (`st.conv[k|i]`, select na linha da peça, `pfChegouConvSet`) > o código que ESSE cliente usou
  nessa peça (`codigoOriginal` da cotação/pedido ou a conversão que casou — "o que ele usa") > a linha que ele mais usa
  (`pfChegouLinhasCli`: `idLinha` dos códigos dele em 12 meses, sem GENÉRICO — "linha dele") > o nosso. A mensagem e o CRM usam o escolhido.

## 📋 Pesquisas com clientes (v115.2211; prévias em `docs/referencias/pesquisas/`)
- Vendas → aba **📋 Pesquisas** (`pfPesqRender`): 📊 Resultados (NPS da pergunta `nps`, média/distribuição de notas e estrelas,
  barras das escolhas, comentários, ⚠️ insatisfeitos ≤6, 🍀 sorteio `pfPesqSortear` gravado em `pfPesquisas_v1.sorteios`),
  💬 Enviar (clientes do cadastro filtrados; cada envio = `formulario_links` tipo `pesquisa`, 30 dias, prefill = modelo +
  cliente + tipo — `pfPesqCriarLink`; WhatsApp `pfWhatsAbrir` com `m.msg` {nome}/{link}/{incentivo}; "👁 Testar como cliente"
  `pfPesqTestar` sem gravar), 📋 Respostas (+ **importar Excel do Microsoft Forms** `pfPesqImportarForms`: casa colunas pelo
  `alias`/texto da pergunta — cabeçalho idêntico > começo > trecho —, texto livre de marcas/estado vira opção pelos apelidos
  `PF_PESQ_APELIDOS`/`PF_PESQ_UF`; cliente por e-mail/telefone/nome `pfPesqAcharCliente`; sem cliente → "ligar ao cadastro",
  guardado em `pfPesquisas_v1.ligacoes`), ✏️ Modelos e perguntas (editor `pfPesqModelosHtml`, só gestor/admin; prévia ao vivo
  por tipo de cliente; 📚 listas prontas `PF_PESQ_LISTAS`).
- Modelos (`pfPesquisas_v1.modelos`, compartilhada): `forms_perfil` = a "Pesquisa de Perfil Comercial" do Forms do Vitor (24
  perguntas, com `alias` = cabeçalho do Excel) e `apres_conhecer` = "Conhecer você melhor (modelo da apresentação)" montado
  pelo sistema (blocos por tipo + NPS + estrelas + brinde/sorteio). Pergunta `{id,txt,tipo(uma|varias|lista|nota10|estrelas|
  curto|texto|numero),opcoes,outra,obrig,tipos[revenda|consumo|servico] (vazio=todos),nps,alias}`; o formulário pergunta "Sua
  empresa é:" (já marcado pelo `pfTipoCli` do cadastro) e mostra só o bloco daquele tipo.
- Página pública: `pfFormClienteBootstrap` → `pfPesqFormRender` (mesmo HTML da prévia, `pfPesqFormHtml`); envio grava
  `formulario_submissoes` dados {tipo:'pesquisa',modeloId,tipoCli,respostas,codigo do brinde}; chegada
  `pfPesqReceber` (em `pfFormClienteChecarSubmissoes`) → log **`pfPesqRespostas`** (e envios em **`pfPesqEnvios`**), os dois
  só-acrescenta nos logKeys.
- CRM: bloco 📋 Pesquisa na ficha (última resposta, nota, escolhas, "Ver todas", "📋 Mandar pesquisa" `pfPesqEnviarDaFicha`),
  eventos na linha do tempo, e nota ≤6 nos últimos 60 dias entra em "📞 Clientes pra ligar" do Meu dia.
- v115.2211 Ficha Técnica: a busca procura também em TODOS os campos (motor, transmissão, eixos…), palavra por palavra.

## 🗂️ Abas no topo (v115.2212 — etapa 1; prévia em `docs/referencias/area-tecnica-abas/`)
- Barra `#pfAbasBar` dentro do `#pfTopBar` (`pfAbasBarRender`, chamada também depois de todo `pfNavigate`): cada card da
  **Área Técnica** e das **Ferramentas** abre numa aba e a tela fica VIVA (o elemento de verdade vai pro `#pfAbasPool` /
  `#ferrTabsPool`) — trocar de aba não perde busca, item aberto, rolagem nem formulário. ✕ fecha; ＋ (`pfAbasMenu`) lista os
  cards das duas áreas (`window._pfAbasCat` {at,ferr}, preenchido pelos `mkCard`; `pfAbasCatColher` desenha o menu escondido
  se ainda não foi aberto). Abas não sobrevivem ao F5.
- **Alt+Q / Option+Q** = próxima aba (segurando o Alt aparece o seletor; Shift+Q volta; soltar o Alt abre; Esc cancela).
- Área Técnica: `window._atTabs`/`_atAtivo`, `pfAtAbrir(atalhoId,titulo,icone,fn)` (o card e o atalho 📌 do dock passam por
  ela; `PF_AT_SEM_ABA` = cards que só abrem janela), `pfAtIr`, `pfAtFechar`; `areaTecnicaRender` começa com `pfAtGuardarAtual()`
  (o "← Voltar" guarda a aba). Saiu do `PF_SNAPSHOT_VIEWS`; sair da AT e voltar pelo dock reabre a última aba (`_atUltima`).
- Ferramentas: o `_ferrTabs` de sempre; abrir a mesma ferramenta = volta pra aba dela; `ferrRender` (← Voltar) não desenha
  mais o menu DENTRO da aba.
- v115.2218 BUG: a aba, o menu ＋ e o seletor Alt+Q mostravam o ícone ORIGINAL do card; agora `pfAbasIcone(título, original)` usa o
  escolhido pelo Vitor (`pfIconOverrides`, chave `pfAtalhoSlug(título)`), igual ao card/dock; título interno da Ficha Técnica também.
- v115.2241: o fechar de cada aba é o ✕ padrão (`pfXGlossyHtml(16)` no `.pfAbaX`).
- **Etapa 2 (a fazer)**: Vendas, Compras, Cadastros, Logística.

## Dock — botão "⋯" (v115.2220)
- Os botões do canto direito do dock (🎓 apresentação, 🖥️ monitor, tema, 📌 auto-ocultar, usuários, pendências, avatar, sair) ficam
  dentro do `#pfDockMaisPop` (coluna que abre PRA CIMA) e aparecem só ao clicar no `#pfDockMaisBtn` (`pfDockMais(ev, abrir)`; fecha ao
  clicar fora, num botão dela ou Esc; com ela aberta o auto-ocultar não esconde a barra — `window._pfDockMaisAberto`). Botão novo
  desse canto: colocar DENTRO do `#pfDockMaisPop`. Capturas em `docs/referencias/dock-mais/`.

## Janelas arrastáveis (v115.2221)
- Pedido do Vitor: "mover e arrastar todas as janelas". Jeito GERAL (IIFE antes do `pfDockMais`): segurar a faixa de cima (44 px) e
  arrastar. Janela = o ancestral mais de fora que é fixed (sem cobrir a tela), absolute com sombra (menus/popovers) ou o cartão dentro
  de um fundo fixo de tela cheia (modais). Move com CSS `translate` (não mexe no `transform`); só arrasta depois de 5 px e engole o
  clique final; não deixa a faixa sumir da tela. Fora: dock, barra de cima, botão da IA, campos/botões/links/canvas e `[data-pf-no-drag]`
  (usar esse atributo se alguma janela nova não puder ser arrastada).

## ⏱️ Tempo das cotações (v115.2180)
- Medição automática (`pfCotTempoTick`, a cada 10 s): conta só se a cotação aberta tem item, a tela da cotação está à vista
  (`#vendasCodInput` visível), a aba está ativa e houve clique/tecla nos últimos 90 s (`_pfCotUltAcao`). Acumula em
  `window._venda._tempoNovoSeg`; o `vendasSalvarCotacaoReal` (inclusive autosave) SOMA no `cot.tempoAtivoSeg` e zera; `cot.inicioEm`.
- Relatório: Ferramentas → ⏱️ Tempo das cotações (`ferrCotTempo`, períodos 1/7/30/90 dias, por vendedor; quem não é gestor vê
  só as suas): cotações, por dia, tempo médio/mediana, tempo em cotação/dia (% de 8 h). Base pro argumento da apresentação
  ("mais da metade do dia não é cotação").

## 📖 Catálogo sem código / link pro cliente (v115.2181)
- Área Técnica → 📖 Catálogos de peças (`pfCatEnvAbrir`; abas 📚 Catálogos / 📥 Recebidos). Carrega o PDF (pdf.js, SEM IA) e
  `pfCatEnvLerPagina` lê cada página no formato Carraro (desenho em cima, tabela "Pos. Ref. Q.ty Descrizione Description Kit
  Note", rodapé "TAB."): coluna pelo CENTRO do texto (títulos centralizados), qtd grudada no italiano separada, números do
  desenho com posição (fração cx/cy — clicáveis sem marcar à mão), aviso se tiver número com cara de código no desenho.
  Cabeçalho "20.22 ref 139721" vem em pedaços fora de ordem (junta pela posição). Tradução `pfCatEnvTraduz`
  (`PF_CATENV_DIC` eixo/transmissão + francês, depois `PF_CATPDF_DIC`, termo + resto "BOLT M12X45"→"PARAFUSO M12X45";
  ✏️ salva em `catpdf_traducoes_v1`). Kits (`pfCatEnvKits`): coluna Kit = código do kit → `kitPai`/`kitInclui`
  (aceita o erro 667693 = 66769); `pfCatEnvKitSelo` lista o que vem dentro; clicar no kit acende as peças dele.
- Guardado em `pfCatEnv_v1` {por:{id:{titulo,marca,modelo,ref,grupos[{id,nome,img,ar,nums,itens}],links,pdfPath}},base}
  (compartilhada); desenho PNG público em `ferramentas-arquivos/c/<id>/<g>.png` (caminho neutro), PDF original privado em
  `cadastro-clientes/interno/catalogos/<id>.pdf` (📄 PDF original = URL assinada). Tela interna: código, kit, saldo
  (`pfCatEnvSaldo`, tenta sem zero à esquerda), ➕ Cotação com as marcadas.
- Cotação: etiqueta 📖 grupo nº (`pfCatEnvEtqHtml` em `vendasEtiquetasHtml`, índice `pfCatEnvIdx`) abre o desenho POR CIMA
  (`pfCatEnvPopup`, "➕ Adicionar na cotação" entra na cotação aberta); peça de kit = "🧰 kit X · saldo" (laranja forte =
  sem saldo avulso e o kit tem); item que É kit = "🧰 kit com N peças" (lista no title).
- **Link SEM NOME** (o cliente pode repassar pro cliente dele): página separada `c.html?k=` (título "Catálogo de peças",
  nada de Triex/PartsFlow, leve). `formulario_links` tipo `catalogo`, cliente_ref = id do catálogo, prefill SÓ com desenho,
  nº, descrição, qtd e nº do kit (NUNCA código). Antes de ver: marca/modelo/ano da máquina + FOTO (sobe em
  `cadastro-clientes/<link>/`) → submissão `dados.tipo='acesso'`; pedido → `dados.tipo='pedido'`, itens {g,i,q}. No celular
  abre ampliado (números muito juntos no diferencial). Peça de kit → escolhe "só a peça" ou "o kit completo".
- v115.2232 BUG "➜ Abrir como cotação" (`pfCatEnvPedidoCotacao`): o cliente do link entrava só com o nome (UF vazia → seletor mostrava SP
  mas o cálculo usava ICMS 12%; margem geral). Agora passa por `vendasSelecionarCliente` (UF + margem do cliente); link sem cliente
  abre em SP e pede pra escolher o cliente. `vendasAbrirModal` sem uf = UF do cliente ou 'SP'.
- v115.2231: o que chega pelo link também vai pra **barra de notificações** (📖 Pedido pelo catálogo; log `pfCatPedEventos`,
  `pfCatPedEventoAdd`; painel abre a aba 📥 Recebidos) e o `c.html` NÃO pede mais nome/telefone (o link é repassado pro cliente do
  cliente — o Vitor não pode "atravessar"); só observação.
- Chegada: `pfFormClienteChecarSubmissoes` → `pfCatEnvReceber` → `pfCatPedidos_v1` + pendência; 📥 Recebidos mostra foto,
  máquina, itens com código/saldo, "➜ Abrir como cotação" (`pfCatEnvPedidoCotacao`) e "✅ Conferi — gravar como aplicação"
  (`pfCatEnvGravarAplic`: máquina = veiculo/marcaVeiculo, eixo = marca/modelo/série, grupo = equip, em todas as peças).
- v115.2182 **catálogo vale pro sistema todo** (Vitor escolheu a opção A): ao salvar, `pfCatEnvMandarAplic(cat)` faz o mesmo que o
  📥 Alimentar pra todos os grupos — aplicação {marca, modelo, série = ref., equip = grupo, qtd} em `APLIC_KEY` + fichas (card da
  série em Aplicações — Modelos & Séries), desenho de cada grupo em `pfAplicDesenhos_v1` (marca|série|grupo, `catEnv`) e peça sem
  ficha = ficha nova com `doCatalogo` (⚠️ conferir). Não duplica (roda de novo = só atualiza qtd). Botão "🔁 Mandar pras
  Aplicações"/"✅ Em Aplicações" na tela do catálogo (`pfCatEnvMandarAplicBtn`, `cat.aplicEm`).
- v115.2183 **eixo dianteiro/traseiro automático** (`pfCatEnvDetectarPosicao`): só pra catálogo de EIXO (`pfCatEnvEhEixo`); texto
  front/anteriore/rear/posteriore manda; senão PEÇAS de direção (steering/king pin/swivel/tie rod/double joint) = dianteiro, sem
  = traseiro. Campo POSIÇÃO no import (troca o título "Eixo dianteiro 20.22"), `cat.posicao`; descrição das fichas criadas pelo
  catálogo, aplicações e itens da cotação = `pfCatEnvDescCompleta` ("RETENTOR - EIXO DIANTEIRO"; fichas da empresa NÃO são
  mexidas). **Reparo do cilindro** (`pfCatEnvMarcarReparo`): kit de vedação cujo kitPai é cilindro → "KIT REPARO DO CILINDRO
  DE DIREÇÃO" + `x.reparo` → atalho 🔧 no topo do catálogo (`pfCatEnvReparosHtml`) e etiqueta "🔧 reparo do cilindro" na
  cotação. Catálogo antigo é atualizado ao abrir (`pfCatEnvAtualizarCat`, `v2183`); "🔁 Mandar pras Aplicações" atualiza as
  descrições das fichas que ele criou.
- v115.2190 **transmissão Carraro** (TLB1 UP 2WD, ref 371186 — mesmo layout desenho em cima/tabela "Pos Ref Qty Description Kit Note"
  embaixo, só inglês): cabeçalho "TRANSMISSION … REF: 371186" (`mRef2` → modelo/ref, título "Transmissão …", sem campo posição);
  **números do desenho são IMAGEM** (o desenho é foto, sem texto) → 0 números clicáveis, aviso no import e o cliente escolhe
  pela LISTA (c.html "Veja o nº no desenho e escolha na lista"); linha sem nº que repete código com nº sai; títulos repetidos
  (4.1/4.2) ganham "(tab)"; dicionário de câmbio/conversor em `PF_CATENV_DIC` + `pfCatEnvPalavras` (OLIO→ÓLEO,
  "2^ V."→"2ª MARCHA", AXE A→EIXO A…); siglas TDP/PTO no título; no LINK a descrição perde números de 5+ dígitos
  (`pfCatEnvDescPublica` — a Carraro põe código dentro da descrição: "KIT EIXO 147454 + RIVETT").
- v115.2191 **marcar os números do desenho** (pedido do Vitor: "melhor ter as 2 opções"; desenho com nº em IMAGEM): embaixo do
  desenho (tela interna, só quem `pfCatEnvPode`) "📍 Marcar números" (`pfCatEnvMarcaLigar`, `window._pfCatEnvMarca` {id,gid,n}):
  escolhe o nº (já vem o próximo sem marca, `pfCatEnvMarcaProx`), clica no desenho (`pfCatEnvMarcaClique`) — mesmo nº pode ser
  marcado 2x; clicar num círculo apaga (`pfCatEnvMarcaApagar`), ↶ Desfazer, 🗑 Limpar, ✓ Pronto. "🤖 Marcar com IA"
  (`pfCatEnvMarcarIA(id,gids)`, também "Todos os desenhos sem número"): manda o PNG + a lista de nº que faltam, IA devolve pixel
  do centro de cada nº → `nums` com `ia:1` (tracejado no modo marcar) e já abre o modo marcar pro Vitor conferir. Grava em
  `g.nums` igual aos lidos do texto; link JÁ mandado não muda (prefill fixo) → mandar de novo. Qualidade: o desenho da
  transmissão é imagem de 760 px dentro do PDF — o PNG salvo fica igual ao PDF (não tem mais resolução pra tirar).
- v115.2192 **catálogo ESCANEADO** (opção A do Vitor; ex.: Dana/Clark 13.5HR28410-4 de 1977, 28 páginas = fotos, sem texto):
  `pfCatEnvImportar` sem tabela e quase sem texto → `pfCatEnvEscaneado` (precisa da chave da Anthropic): `pfCatEnvEscLerPag` renderiza
  cada página (lado maior 1568 px, JPEG) e a IA (`pfCatEnvEscPedido`, 3 em paralelo, 2 tentativas) devolve tipo desenho/lista/misto/
  outro, marca/modelo/ref, título (+Pt), retângulo do desenho, posição dos nº e itens {n,qtd,codigo,impresso,manuscrito,desc,descPt,
  inclui,sub,subPt,obs}. **Código riscado + escrito à mão = vale o manuscrito** e fica "⚠️ conferir" (tabela na prévia: corrigir/✓ ok;
  salvo como `conferir`/`codImpresso`/`obs` → ⚠️ ao lado do código na tela interna). "Inc. items 45 and 46" = kit (`kitInclui`/`kitPai`).
  `pfCatEnvEscAgrupar`: lista entra no desenho ANTERIOR (ou o escolhido em "Páginas", `N.dono`; tipo trocável `N.tipoMao`); lista com
  sub-tabelas que repetem nº (embreagens LOW/REVERSE/FORWARD) = 1 grupo por sub com o mesmo desenho (sobe 1x, `jaSubiu`). Marca
  CLARK/DANA/SPICER → "DANA". Salvar = `pfCatEnvSalvarNovo` (escala 3, recorte `g.rec` com folga 1%, nº da IA com `ia:1` → conferir no 📍).
- v115.2193 **leitura escaneada não se perde** ("se eu não terminar, se der erro"): rascunho no IndexedDB DESTE computador
  (`PF_CATESC_RASC` = `pfCatEnvRascunho_v1`: PDF + `pags` lidas + nomes/dono/tipoMao/códigos corrigidos), salvo a cada página lida e a
  cada mudança na conferência (`pfCatEnvEscRascSalvar`, 300 ms). Faixa "♻️ … não terminado — ▶ Continuar / 🗑 Descartar" na lista
  (`pfCatEnvEscRascFaixa`); `pfCatEnvEscRetomar` manda pra IA só as páginas que FALTAM ou deram erro; carregar o mesmo PDF (nome+tamanho)
  também continua. "⏸ Parar e continuar depois" (`pfCatEnvEscPausar`; página que já estava na IA é guardada pela fila `_pfCatEscFila`),
  "⏸ Terminar depois" na prévia. Some ao salvar o catálogo ou no Descartar (`pfCatEnvEscDescartar`).
- v115.2194 **eixo DANA (Spicer Off-Highway Itália, 212/765)**: lista "DISTINTA PEZZI DI RICAMBIO … LIST OF SPARE PARTS" é TEXTO →
  `pfCatEnvLerPaginaDana` (sem IA; Pos | Part number | Q.ty | 4 linhas IT/FR/EN/DE; pdf.js junta ou separa "11   002.06.3163" → quebra por
  espaço duplo; vários códigos na mesma posição = "(OPÇÃO 1/4)", ex.: calços; posição sem código sai); cabeçalho "Drawing 212-01-0002",
  "Descr." = grupo, "Mod. 212/765"; página 2 dá "N° disegno" (= ref.) e "Macchina:". Desenho = página SEM texto (imagem).
  **A lista pode vir antes OU depois do desenho** (Vitor) → `pfCatEnvDanaMontar` liga por: 1) nº do desenho lido pela IA no carimbo
  (`pfCatEnvDanaDesIA`, também área do desenho, posição dos nº e legendas "Position KIT = 9+10+11" → kitInclui/kitPai), 2) título,
  3) página vizinha (sem chave da IA). Prévia `pfCatEnvDanaPrevia` com miniatura + select do desenho por grupo (`pfCatEnvDanaLigar`);
  `pfCatEnvDanaSalvar` → `pfCatEnvSalvarNovo` (escala 2, `N.dana`). Termos Dana novos no `PF_CATENV_DIC`.
- Endereço do link: `pfCatEnvBaseUrl` (padrão = o do sistema; "Endereço do link" no modal grava `base` — pra domínio neutro
  na Vercel). Prévias em `docs/referencias/catalogo-sem-codigo/`.
- **Portal do cliente — IDEIA (não feita)**: cliente com login cota sozinho DIGITANDO SÓ CÓDIGO E QUANTIDADE (decisão do Vitor
  05/10/2026); vendedor vira gestor de carteira; fila de oportunidades por nota. Prévia `docs/referencias/portal-cliente-previa.png`.
  Prévia nova (07/10, pra apresentação): `docs/referencias/portal-cliente/previa-codigo.html/.png` — cotação rápida código + qtd (ou colar lista),
  código de qualquer marca convertido ("CZ-180 = SPICER 5-280X"), disponibilidade + preço da tabela do cliente, código não achado → vendedor;
  lado do vendedor: "Cotações do portal" com nota + regras do gestor (sai sozinho até R$ X com saldo). Precisa decidir: login, preço visível, limite, segurança.

## 📊 Painel de Clientes (Vendas → aba Painel de Clientes, `pvRenderKpis`)
- v115.2242 (Vitor: "trabalhamos com fechamentos trimestrais, bom pra comparativo"; "% de cotações que os clientes fecham"; "rankings
  maiores"): período **Trimestre** (`window._pcPeriodo='tri'`, `_pcTri` = 0 atual / 1 anterior…, `pcTriInicio`/`pcTriNome`/`pcSetTri`;
  `pcCalc(c,ini,fim)`) com select dos últimos 8 trimestres; os 5 números do topo mostram ▲/▼ contra o trimestre anterior
  (`pcResumoJanela`, `pcDeltaHtml`; o trimestre ATUAL compara com os mesmos N dias do anterior) + linha "📅 … comparado com …".
  "Clientes que mais cotam" mostra "N% fecha" (verde ≥50, âmbar ≥30, vermelho). "Ranking: Top 10/20/50/Todos" (`pcTopN`,
  localStorage `pf_pc_topn`) vale pra todos os rankings; acima de 10 a lista rola dentro do card (máx 560 px).

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

## Liberar Espaço (Ferramentas, só dono)
- v115.2233: "Selecionar todos" (`ferrLiberarMarcarTodos`) + soma do marcado (`ferrLiberarSoma`); a chave do LOGIN (`sb-…-auth-token`,
  selo 🔒 LOGIN) fica fora do "todos" e o confirmar avisa se ela estiver marcada.

## Notícias do setor / banners de marca (v115.2133)
- Robô `noticias-scraper` (Edge Function, v5): lê a home da Revista M&T CARD POR CARD (bloco de um `DataNota` até o próximo);
  a v4 casava data/foto/título por ORDEM em listas separadas e, com 30 datas × 22 fotos, trocava foto/categoria/data das
  notícias. Foto só vale se o nome do arquivo bater com o slug do link (mesma trava no app, `pfNoticiasBuscarViaScraper`).
  Pra testar o robô daqui: `net.http_get` (pg_net) pelo SQL e ler `net._http_response` (o proxy bloqueia supabase.co/revistamt).
- Marcas (lateral do banner): `pfNoticiasLoad` NÃO apaga mais notícia de marca sem foto; `pfNoticiasBuscarMarcasComIA` não
  apaga as antigas quando volta vazio (nova substitui só a da mesma marca, até 7) e aceita notícia sem imagem; lateral completa
  com as marcas da semente se tiver < 2; card sem foto/foto bloqueada = degradê AZUL (v115.2137, era laranja) com o NOME DA MARCA grande (foto por cima); banners trocam a cada 10 s, marcas a cada 25 s;
  "🔄 Atualizar agora" do dono busca marcas na hora.
- v115.2240 (Vitor vai apresentar: "arruma as notícias sem foto"): na lista de notícias da home (`pfCategoriasRender`) notícia sem foto
  (as de MARCA nunca têm) = quadrinho com o nome da marca na cor dela (`pfNoticiaMarcaTile`, cores em `PF_NOT_MARCA_COR`); o `pfNoticiasLoad`
  tira notícia de marca que só tem o NOME igual (prefeito/candidato/eleição/futebol… — "Jackson Carraro pré-candidato").

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

- v115.2208 BUGs do RMA: (1) "🔗 Mandar link" de novo APAGAVA `garantia.resposta`/`validado` → agora mantém; e
  `pfGarRecuperarResposta(r)` (no `rmaVerDetalhe` e ao abrir o `ferrRMA`, 1x por RMA/sessão) busca a última submissão de
  QUALQUER link de garantia do RMA (`formulario_links.cliente_ref` = id) e põe de volta (`recuperada:true`) — a conferência
  (`validado`) não fica no banco. (2) Dashboard aparecia embaixo do RMA (redesenho sem pfNavigate, body com pf-view-dash) →
  `pfGarantirTelaFerramentas()` no começo do `ferrRMA` (navega pras Ferramentas sem pular pro menu, esconde #dash).
  (3) E-mail automático "RMA Concluída - Ajuste de Estoque" pro Henrique DESLIGADO (`PF_RMA_AVISO_AJUSTE_LIGADO=false`,
  pedido do Vitor "não enviar nada pro Henrique por enquanto"); o Ajuste de Saldo manual (`ajEnviarAjuste`) continua.

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
