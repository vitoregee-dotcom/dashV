# PartsFlow — continuar daqui (atualizado em 08/10/2026, versão **v115.2266**)

> Documento pra retomar o trabalho em **outra conta/sessão do Claude**. Leia junto com o `CLAUDE.md` da raiz do repo
> (lá está o detalhe técnico de cada parte: nomes de funções, chaves, regras). Aqui fica **quem é o Vitor, como trabalhar,
> como publicar, o que foi feito por último e o que está pendente**.

---

## 0. Contexto em 30 segundos

- **Vitor** — dono e único desenvolvedor do **PartsFlow** (repo `vitoregee-dotcom/dashV`), sistema interno da **Triex**
  (distribuidora de peças off-highway em São Paulo, 30+ anos; autorizada DANA, CARRARO, ALLISON, SPICER, PERKINS, CUMMINS, FPT;
  Lucro Presumido/SP). Empresa irmã: **Encopel Rolamentos** (fiscal/faturamento ficam lá).
- **Site no ar:** https://vitoregee-dotcom.github.io/dashV/ (GitHub Pages, publica sozinho a cada merge na `main`;
  também tem Vercel a partir da `main`).
- **App inteiro em um arquivo:** `index.html` (~85 mil linhas, vanilla JS). Backend **Supabase** (projeto `bqbdypizmeirezedvefo`).
- Contas do Vitor: **vitoregee@gmail.com** (admin/dono — vê tudo, 👁/🚧 nos cards, liga o modo demonstração) e
  **vitor.lima@triexpecas.com.br** (conta da Triex que ele usa pra apresentar; Modo Apresentação 🎓 começa ligado nela).
- Outros usuários reais: Carlos Candis (gestor), Adenicio "Mineiro" (vendedor), Bruno (Encopel, só Margem), Carlos Henrique (gestor/estoque).
- Ele trabalha muito pelo **iPad** e pelo PC do trabalho (sem app desktop do Claude lá — só web).

## 1. Como falar com ele

- **Sempre em português**, direto e curto. Ele escreve rápido, com erro de digitação — entender a intenção.
- Prefere que você **faça e publique** e depois explique em poucas linhas (sem ficar perguntando o óbvio).
- Quando ele diz que é bug, **é bug** — vá atrás da causa.
- **Mudança visual / tela nova:** mandar **prévia (print)** no chat ANTES de publicar e esperar o "ok"/"pode subir".
  **Correção de bug:** pode publicar direto.
- Sempre dizer no fim: **"a versão mudou de X para Y"**.
- Ele gosta de telas **limpas**; usa ícones do **pack dele** (`icons/pack/pf-icon-NNN.png`, 001–384) — nunca inventar emoji novo
  onde ele já tem ícone (ex.: 384 = WhatsApp, 095 = câmera, 036 = em construção).

## 2. Como publicar (passo a passo que funciona)

1. **Acesso ao repo com push:** na sessão nova, adicionar o repo `vitoregee-dotcom/dashV` com permissão de **push**
   (no Claude Code web: selecionar o repo ao abrir a sessão / ferramenta `add_repo` com access "push").
   Clonar: `git clone --depth 1 https://github.com/vitoregee-dotcom/dashv /home/claude/dashv` (timeout longo, ~10 min).
2. `git fetch --depth=3 origin main && git reset --hard origin/main` (outra sessão pode ter publicado — **conferir a versão na main**:
   `grep -o ">v115\.[0-9]*<" index.html | head -2`).
3. Criar branch (`git checkout -b fix/xxx`), editar, **subir a versão** nos 2 lugares (`>v115.NNNN<` no selo do login e no logo),
   comentário `// v115.NNNN - A pedido do Vitor: ...` explicando o porquê.
4. Testar (seção 3).
5. Commit + `git push -u origin HEAD` (o `-u` evita o aviso de "branch sem remoto").
6. PR e merge pela **API REST** (o GraphQL do `gh pr create` é bloqueado):
   ```bash
   n=$(gh api repos/vitoregee-dotcom/dashV/pulls -f title="v115.NNNN: ..." -f head=fix/xxx -f base=main -f body="..." --jq .number)
   gh api -X PUT repos/vitoregee-dotcom/dashV/pulls/$n/merge -f merge_method=squash --jq .merged
   ```
   O Vitor autorizou **merge squash na main sem perguntar**. O Pages publica sozinho em 1–2 min.
7. ⚠️ Cuidado com `cd ... && ...` encadeado: se um passo falha, os comandos seguintes rodam na pasta errada
   (já aconteceu: o merge subiu sem o último commit). Conferir `git show origin/main:index.html | grep ...` depois.

## 3. Testar antes de publicar

- **Sintaxe:** extrair cada `<script>` inline e rodar `node --check` (ou `new Function(bloco)`) em cada um — 0 erros.
- **Navegador (Playwright):** o Chromium instalado é `/opt/pw-browsers/chromium-1194` → usar **`npm i playwright@1.56.1`**
  (versão que casa com ele; a 1.47 tenta outro Chromium e falha). Servir o repo com `python3 -m http.server 8765`
  **no mesmo comando** que roda o teste (o servidor morre entre um comando e outro).
- Bloquear tudo que é externo e simular o Supabase:
  `page.route(/^https?:\/\/(?!localhost)/, r => /supabase\.co/.test(r.request().url()) ? r.fulfill({status:200,contentType:'application/json',body:'[]'}) : r.abort())`.
  ExcelJS: servir `node_modules/exceljs/dist/exceljs.min.js` (exceljs@4.4.0) no lugar do CDN.
- Login: esconder `#authOverlay` e `sbUser={id:'e526fea4-d04f-4d2f-a700-145ac17b137c',email:'vitoregee@gmail.com'}`
  (`sbUser` é `let` global — atribuir direto, não `window.sbUser`).
- Clicar em card de Ferramentas: `page.locator('.ferrCardTitle',{hasText:'Nome'}).click()`.
- **Banco:** nesta conta o Claude tinha o conector **Supabase** (`execute_sql`) — dá pra ler `user_sync` direto.
  JSON é double-encoded: `(dados#>>'{}')::jsonb`. Dados da empresa ficam em `user_id = 'e526fea4-...'` (MY_USER_ID).

## 4. Regras do sistema que NÃO podem ser esquecidas

(Lista completa no `CLAUDE.md` e na memória do projeto. As que mais quebram:)

- **Tudo sincroniza** entre aparelhos/contas: `localStorage.setItem` sempre com `pfSyncPush([chave])`; chave nova entra em
  `PF_SYNC_KEYS`; se for dado da empresa, também em `sharedKeys` (dentro do `pfSyncPull`) e `PF_CATALOGO_UNICO_KEYS`.
  Preferência por usuário com "mais novo vence" = objeto com `ts` (modelo: `pfOrbPrefs_v1`, `pfModoApresPrefs_v1`).
- **"Item apagado que volta sozinho":** a sync junta listas por `id` (união) — apagar só no navegador não basta;
  filtrar na LEITURA ou usar tombstone no pull E no push.
- **Sair (logout) faz `localStorage.clear()`** — preferência que precisa sobreviver tem que estar no `user_sync`.
- Código que roda cedo **nunca** encosta em `sbUser` antes de `window._pfSbUserPronto` (zona morta do `let` — v115.2256).
- `data-pf-atalho-id` é usado pelo sistema de alfinete (opacity .35 = "não fixado"). Elemento que usa esse atributo só pro
  ícone precisa estar na exceção (`pfAtalhoIdSemAlfinete`: `vendas_ia*`, `<button>`, `.pfBtn`).
- **Padrão de tela:** ✕ = `pfXGlossyHtml`, Esc fecha/volta, fundo só fecha se o clique começou nele, cabeçalho escuro,
  botões `.pfBtn` (+ `pfBtnVerde/Claro/Azul/Vermelho/Escuro`), print/arquivo = `pfBtnColarPrintHtml` + `pfBtnCarregarArquivoHtml`.
- **Tudo que avisa vai pra barra de notificações** (`#pfAvisosRail`): log compartilhado `pfXxxEventos` + `PF_AVISOS_LOG_KEYS`,
  `PF_AVISOS_CONFIG_DEFAULT`, `PF_AVISOS_CONFIG_LABELS`, `iconePorEtapa`, `pfIconeComBadge` e painel no `pfAvisosAbrirPainel`
  (modelos: `rma`, `catalogo`, `foto`). Nada de popup novo.
- **Ferramenta nova em Ferramentas:** `_canSee('ferr_xxx')` no `mkCard` **E** o toggle `data-mod="ferr_xxx"` no painel de permissões.
- Toda tela/HTML/PDF: `pfDocHeaderHtml`. WhatsApp: sempre `pfWhatsAbrir(tel,texto)`.
- **Modo demonstração:** chave nova com dado real/sensível entra em `PF_MODO_DEMO_SO` ou `PF_MODO_DEMO_NADA`.

## 5. O que foi feito em 08/10/2026 (v115.2257 → v115.2266)

| Versão | O quê |
|---|---|
| 2257 | **Modo Apresentação 🎓 fica salvo** mesmo depois de sair — `pfModoApresPrefs_v1` {on,ts} por usuário no `user_sync` |
| 2258 | 👁/🚧 (ocultar / em construção, só vitoregee) nas **abas** (Vendas etc.) não cobrem mais o nome: sobem pra borda e só aparecem no hover (`.pfOlhoCompacto`, cards < 56 px) |
| 2259 | **Cotações de demonstração apagadas não voltam mais** — filtro na leitura (`pfDemoCotSemApagados` dentro do `pfRawGetItem`) |
| 2260 | **Notícias atuais logo após o login** — `pfNoticiasPuxarRapido()` no começo do `pfSyncPull` (antes aparecia a semente de julho por minutos) |
| 2261 | Card **📺 TVs do estoque** em Ferramentas (só dono) → `demo/estoque-tv.html` |
| 2262 | **🧾 Solicitação de NF ao Fiscal** (Ferramentas, `ferrSolicNF`) — ver seção 6 |
| 2263 | Solicitação de Fotos: ícones do pack (**384 WhatsApp**, **095 câmera**) no lugar de 📱/📷 |
| 2264 | **Foto recebida** deixou de ser popup → aviso na **barra de notificações** com a câmera (log `pfFotosEventos`; cada um vê as fotos que pediu, admin vê todas) |
| 2265 | **Assistente de Vendas:** busca de cliente sem acento ("maquinas" acha "MÁQUINAS"); botão não fica mais transparente; chip **"🤖 Regras do cliente"** na cotação abre direto no cliente dela |
| 2266 | **Carta de Correção** vai também pra **faturamento@encopelrolamentos.com.br** (no "Para") |

Também nesta sessão (sem versão):
- **Modo demonstração ligado** (vitoregee, Ferramentas → 🎭 Dados de demonstração): outros usuários veem só dados fictícios
  (150 clientes, 600 pedidos, ~1.070 cotações, ~1.170 títulos). A v115.2254 tinha apagado os lotes antigos e travado antes de gerar;
  foi religado depois da correção. **Lembrar de desligar** quando acabar a fase de apresentação.
- **Ficha cadastral fictícia** pra demonstração: `FICHA_CADASTRAL_TRANSPORTADORA_SUL.pdf` (mesmo layout da ficha real da
  VR Demolidora, dados inventados) — cliente demo **TRANSPORTADORA SUL** (Sinop/MT, vendedor vitor.lima, inativo desde 03/11/2025)
  pra mostrar ⛔ inativo → reanálise a prazo → anexar a ficha. Se "Refazer os dados fictícios", o cliente pode mudar.

## 6. 🧾 Solicitação de NF ao Fiscal (v115.2262) — resumo

- Caso de origem: vendeu um **kit** na NF de venda, faltou uma **junta**, o fornecedor mandou a junta com **NF de simples remessa**
  → a Triex pede ao Fiscal uma **NF de SIMPLES REMESSA** (Triex → cliente, **sem retorno**). Não é ligado a RMA.
- Tela: tipo (📦 Peça faltante de kit / 🛠️ Garantia / 🔧 Conserto / ✏️ Outra) → puxar de um **Pedido de Venda** (marca só o que
  faltou) → origem Triex/Encopel + filial → destinatário/transportadora/frete/volume/peso → natureza + retorno → observações
  (no faltante monta sozinho com NF de venda, kit, fornecedor, NF do fornecedor) → itens (código, marca das fichas do estoque,
  **valor = custo**) → solicitante/gestor/e-mail do Fiscal → **⬇ Baixar planilha preenchida** / **✉ Baixar e mandar pro Fiscal**.
- Gera o Excel no **modelo do Fiscal**: `data/modelos/solicitacao-nf.xlsx` (aba "H. MATIAS", exemplo apagado; a linha 46 vinha
  **escondida** no modelo original — destravada). Células: Encopel B6..B15 / Triex I6..I7, B19/C19, B23/D23, B25|B26, C28, C29,
  B33, B35|B36, A40..A42 (obs), itens A/F/H/K linhas 46–56 (11 itens), A58/A59.
- Histórico compartilhado `pfSolicNF_v1` (lista por id; registro `__cfg` guarda o e-mail). E-mail padrão do Fiscal por enquanto:
  **vitor.lima@triexpecas.com.br** (`PF_SNF_PARA_PADRAO`).
- **Pendente:** o Vitor vai mandar a **lista de códigos das marcas** (no modelo a marca é número: 6, 459, 32…) → converter nome→código na planilha.

## 7. Pendências — esperando o Vitor

1. **Códigos das marcas** pra Solicitação de NF (item 6) e o **e-mail real do Fiscal**.
2. Solicitação de Fotos: trocar também o 🔗 / 🗑 / 📷 do título pelos ícones do pack? (ofereci, sem resposta).
3. Card 📺 TVs do estoque: hoje só o dono vê — liberar pros outros? (ofereci).
4. **Desligar o modo demonstração** depois das apresentações.
5. Da lista antiga (ver também `CLAUDE.md` → "Ideias guardadas"): apresentação/deck (artifact Slides
   `https://claude.ai/artifact/8sA4d8HKDgZtKGtb9j2k1n`), botão "📤 Mandar pro JBoss" no Pedido de Venda, recuperar desenhos que
   falharam (Aplicações → "➕ Subir desenho"), IPI/ST no PDF/1 linha da cotação, `qtd` que some ao editar aplicação no produto,
   autorizações de RMA, margem por produto/faixa de custo (esperando a lista de faixas).
6. Ideias guardadas (não começar sem ele pedir): TVs do estoque de verdade, itens cotados sem cadastro, substituto quando zerado,
   atalho de busca de pedido (Alt+P), avisos ao cliente pelo WhatsApp, integração JBoss, portal do cliente.

## 8. Segurança — só o Vitor pode fazer (painel)

- Trocar a chave da Anthropic; desligar signup público e ligar proteção de senha vazada no Supabase; rever o login externo
  (Encopel, role `ferr_margem`). No código (quando ele quiser): tirar `cached_credentials` (`btoa(senha)`) e levar a chave da IA
  pra Edge Function. **Tabela nova no Supabase = sempre RLS ligado + política.**
- **Nunca** colar token/chave em arquivo do repo nem na memória.

## 9. Pra começar na nova conta

1. Adicionar o repo `vitoregee-dotcom/dashV` com push e clonar (seção 2).
2. Ler **este arquivo** + `CLAUDE.md` (o `CLAUDE.md` é longo — buscar a parte da tela que for mexer).
3. Conferir a versão na `main` e seguir o fluxo da seção 2.
4. Perguntar ao Vitor por onde quer seguir — sugestão: códigos das marcas (Solicitação de NF) ou desligar a demonstração.
