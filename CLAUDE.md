# PartsFlow (dashV) — notas para o Claude

- **Idioma**: responder sempre em português. Usuário: Vitor (dono do sistema).
- **App**: tudo em `index.html` (arquivo único, ~70 mil linhas). Publicado na Vercel a partir da `main`.

## Fluxo de trabalho combinado
- Trabalhar na branch da sessão, abrir PR e **fazer o merge (squash) na `main` sem perguntar** — o Vitor autorizou.
- **Toda mudança sobe a versão** (`v115.NNNN`, aparece em 2 lugares no `index.html`: selo do login e do logo)
  e **sempre informar "a versão mudou de X para Y"**.
- Comentários no código seguem o padrão `// v115.NNNN - A pedido do Vitor: ...` explicando o porquê.
- Quando ele pedir "como ficaria?", mostrar captura/prévia antes de publicar.

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

## Área Técnica (Componentes Cardan, `componentes_cardan_v1`)
- Famílias em `CC_FAMILIAS` (+ `CC_NOME_SINGULAR`); item = `{codigo, linha, descricao, veiculos[], montaCom[], conversoes[],
  equivalentesExtra[{marca,codigo,tipo}], especificacoes[{nome,valor}], fotos[], medidas por letra}`.
- "📋 Colar print de aplicação" (`ccColarPrintAplicacao`) junta aplicação/equivalentes/foto num item existente e nos relacionados;
  "➕ Cadastrar item" (`ccNovoItem`) cria item novo por print ou à mão. Aplicação exibida por `ccAplicacaoOrganizadaHtml`.
- Cotação: busca Série/Modelo também acha componentes cardan pelo veículo (`vendasCcBuscarPorVeiculo`) + Monta com.

## Catálogos de peças em PDF
- No próprio sistema: Ferramentas → **📘 Catálogo PDF → Excel** (`ferrCatalogoPdf`, pdf.js no navegador,
  leitura por coluna, dicionário embutido + traduções salvas em `catpdf_traducoes_v1`).
- Fora do sistema (formato novo, ajustes): `scripts/catalogo-pdf/LEIAME.md` (Python). Ao adicionar termos ao
  `traducoes.py`, levar também pro dicionário `PF_CATPDF_DIC` do `index.html`.
