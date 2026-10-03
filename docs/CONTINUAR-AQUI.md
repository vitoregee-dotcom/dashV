# PartsFlow — continuar daqui (atualizado em 03/10/2026, versão **v115.2179**)

> Documento pra retomar o trabalho em outra conta/sessão do Claude. Leia junto com o `CLAUDE.md` da raiz
> (ele tem o detalhe técnico de cada parte — nomes de funções, chaves, regras). Aqui fica o **resumo do
> estado atual, o que está pendente e como trabalhar**.

---

## 1. Como trabalhar (combinado com o Vitor)

- **Sempre responder em português.** Usuário: Vitor (dono do sistema).
- O app inteiro está em **`index.html`** (~70 mil linhas). Publicado na **Vercel a partir da `main`**
  (também em `vitoregee-dotcom.github.io/dashV`).
- Fluxo: trabalhar numa branch → abrir PR → **merge squash na `main` sem perguntar** (o Vitor autorizou).
- **Toda mudança sobe a versão** `v115.NNNN` — aparece em **2 lugares** no `index.html` (selo do login e do logo:
  procurar `>v115.2179<`). Sempre avisar: **"a versão mudou de X para Y"**. Próxima: **v115.2180**.
  ⚠️ Outra sessão pode publicar ao mesmo tempo (aconteceu: duas v115.2175) — antes de subir a versão, `git fetch origin main`
  e conferir o número que está na `main`.
- Comentário no código: `// v115.NNNN - A pedido do Vitor: ...` explicando o porquê.
- **Coisa nova** (tela/função nova): primeiro **sugerir opções com prévia** (imagem) e esperar o ok.
  **Correção de bug**: pode fazer e publicar direto.
- Quando ele pede "como ficaria?": mostrar captura/prévia antes de publicar.
- Ele prefere telas **limpas** ("não quero tão poluído"): o essencial visível, o resto no balão/filtro.
- **Botão de print/arquivo = sempre o padrão** (`pfBtnColarPrintHtml` escuro + `pfBtnCarregarArquivoHtml` vermelho, lado a lado, Ctrl+V junto).
- **Esc sempre volta** e toda tela/menu de cards tem **"← Voltar"** (`pfVoltarHomeBtnHtml`).
- Pra ver como fica no **monitor de 23" do trabalho** (1920×1080): botão 🖥️ na barra ou **Option+T** (abre o app num iframe 1920×1080).

## 2. Testar antes de publicar

**Sintaxe** (salvar como `syn.js` e rodar `node syn.js` na pasta do repo):

```js
const fs=require('fs');const h=fs.readFileSync('index.html','utf8');
const re=/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;let m,i=0,bad=0;
while((m=re.exec(h))){i++;try{new Function(m[1]);}catch(e){bad++;console.log('bloco',i,e.message);}}
console.log('blocos',i,'erros',bad);
```

**Navegador** (Playwright, Chromium em `/opt/pw-browsers`):
- Servir com `python3 -m http.server 8765` na pasta do repo.
- **Abortar requisições externas**: `page.route(/^https?:\/\/(?!localhost)/, r=>r.abort())`
  (senão trava nos CDNs bloqueados).
- `sbUser` é `let` global → atribuir direto: `sbUser={id:'e526fea4-d04f-4d2f-a700-145ac17b137c',email:'vitoregee@gmail.com'}`.
- A tela de login fica por cima: esconder os filhos do `body` e montar a tela testada num `div` fixo.
- Dados de teste prontos: `pfDemoGerar()` (precisa `window.confirm=()=>true; window.pfUsoIAEhDono=()=>true; window.pfSyncPush=()=>{}`).
- 3D (three.js): servir `three@0.128.0` do npm no lugar do cdnjs (`page.route(/three\.min\.js/, …)`) e lançar o Chromium com
  `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`.
- Não tenho acesso ao Supabase daqui (proxy bloqueia) — erro de Storage/banco só pela mensagem que aparece pro Vitor.

**Banco (Supabase)**: projeto `bqbdypizmeirezedvefo`. Tabela nova = **sempre RLS ligado + política**
(ver "Segurança do banco" no `CLAUDE.md`). Testar política com `set local role authenticated` +
`request.jwt.claims` dentro de `begin … rollback`.

---

## 3. O que foi feito nas últimas sessões (v115.2150 → v115.2179)

| Versão | O quê |
|---|---|
| 2150 | **IPI/ST na cotação 2 linhas** (vem do cadastro do produto, % sobre o preço; unit. final = preço + IPI + ST) |
| 2151 | RMA/Garantia Dana: cada foto com 📷 tirar foto + 📁 arquivo (aceita PDF); **NF anexada pela Triex no RMA** (colar print/arquivo), fotos ocupam o quadro todo no Excel |
| 2152 | **RMA: consulta** (busca cliente/código/vendedor, filtros), **📊 relatório** (% do vendido, Excel), vendedor no RMA, **botão direito na cotação → RMAs do item** |
| 2153 | Dados de demonstração: **150 clientes** fictícios (nomes sem repetir) e 600 pedidos (até 2000) |
| 2154–2157 | **Órbita sem amontoar**: quadro cresce com a quantidade, espalha na faixa, todos giram juntos, afasta os que encostam; 3D olha mais de cima |
| 2158 | Cotação 2 linhas: ajustar coluna troca espaço só entre as vizinhas |
| 2159 | Esc sai do Mapa Comercial |
| 2160 | **Guia Perkins foi pra Área Técnica** |
| 2161 | **📥 Alimentar aplicações pelo catálogo** (série + grupo; cola a tabela Perkins ou o print/PDF; guarda o desenho; peça sem ficha vira ficha nova com "⚠️ conferir" na cotação) |
| 2162 | **Aplicações — Modelos & Séries foi pra Área Técnica** |
| 2163 | Alimentar segue as **Substituições de Descrição** (e 💾 cria regra nova) |
| 2164 | Órbita: cliente **📈 crescendo agora** também é 🔵 potencial |
| 2165 | Órbita: **📊 Resumo da carteira** (faixa + painel, 🖨️ imprimir / 📄 PDF, nome do vendedor) |
| 2166 | Botões padrão de print no Alimentar e na NF do RMA; **BUG: Aplicações/Guia Perkins voltavam sozinhos pros cards** |
| 2167–2169 | **Esc volta sempre** (Área Técnica, Compras, Ferramentas, Cadastros, Logística) + **"← Voltar" nos menus de cards**; Esc apagava o botão do assistente de IA (corrigido) |
| 2170 | Alimentar: desenho que falha **não derruba a gravação** (renova login, tenta de novo, botão "🔄 Tentar subir o desenho"); NLA com código novo não é fora de linha |
| 2171–2172 | Aplicações: **série = 1 motor só** (junta card com/sem modelo; modelo vem preenchido no Alimentar); selo 🖼 de desenhos no card |
| 2173 | **Desenho sobe em PNG** (o bucket não aceita WEBP — era o erro "mime type image/webp is not supported"); **subir o desenho depois** no grupo já gravado ("🖼 Sem desenho" no Alimentar e "➕ Subir desenho" em Aplicações) |
| 2174 | **Ficha Técnica: não perde mais o preenchimento** (fechava ao soltar o clique no fundo) + **rascunho automático** ("♻️ Continuar preenchendo"); Salvar acima do dock; **ano/série na lista** |
| 2175 | (outra sessão) Órbita: **Inativos (+90)** com "↳ ainda cotando", "⚪ fora da órbita", lista de inativos, botão ❓ Explicar |
| 2176–2178 | **🖥️ Modo monitor do trabalho** (23", 1920×1080) — refeito com iframe; atalho **Option+T** (Alt+M já é o Mapa de Compras) |
| 2179 | Órbita: **cabeçalho enxuto** — filtros dentro de "🔍 Filtros", botões em ícone, resumo numa linha |

Prévias em `docs/referencias/` (orbita-resumo, orbita-cabecalho, aplicacao-catalogo, rma-consulta, tv-estoque, cotação 2 linhas…).

---

## 4. Pendências — esperando o Vitor

1. **Apresentação** (ensaio sáb 03/10 com o amigo/ex-chefe que usa o mesmo ERP JBoss; **apresentação real 08/10**):
   deck no artifact Slides `https://claude.ai/artifact/8sA4d8HKDgZtKGtb9j2k1n` (16 slides: visão "time 5× maior", demo,
   futuro CRM/WhatsApp/catálogo/marketplace, proposta piloto 30 dias → tempo dedicado/150 clientes → contrato da ferramenta).
   Faltam: **data/contato** no slide final, **números atuais**, custo mensal; e a decisão sobre o slide
   **"Como o pedido chega no JBoss"** + botão **"📤 Mandar pro JBoss"** no Pedido de Venda (o Leitor de Peças já exporta o
   formato "Importar XLS" do JBoss: `LP_JBOSS_COLS`). Perguntado 2× sem resposta.
   Demo das TVs do estoque pro iPad: `demo/estoque-tv.html`.
2. **Recuperar desenhos que falharam** (HP66975N e outros de 02–03/10): usar "➕ Subir desenho" no card da série em Aplicações.
3. **Conferir** com dados reais: Órbita (anéis, 🐜, 3D), modo monitor no Safari (só testado no Chromium), escala do Windows
   no trabalho (se não for 100%, a simulação fica um pouco menor que lá).
4. IPI/ST: tabela de 1 linha, resumo e PDF da cotação ainda **sem** imposto — ver se ele quer.
5. Editar uma aplicação no formulário do produto **perde a `qtd`** (bug antigo, oferecido pra corrigir).
6. RMA: **autorizações** ("depois a gente vê") e outros avisos de RMA na barra (`pfRmaEventoAdd`).

## 5. Ideias guardadas (não começar sem ele pedir) — detalhes no `CLAUDE.md`

- 📺 **TVs do estoque no sistema de verdade** (fila de solicitações + pedidos A separar → Faturado) — prévias aprovadas.
- 🧾 **Itens cotados sem cadastro** — registrar e avisar "cotado N vezes antes de ter cadastro".
- 🔄 **Substituto quando o item está zerado** — mostrar na linha da cotação o substituto com saldo.
- ⌨️ **Atalho de busca de PEDIDO do cliente** (sugestão Alt+P) — situação + previsão de entrega.
- 📲 **Avisos ao cliente pelo WhatsApp** (pedido emitido / faturado e disponível) — semiautomático × API.
- Integração com o **JBoss** (níveis: 1) botão no Pedido de Venda gera o XLS; 2) exportação diária do ERP de volta; 3) API).

## 6. Segurança — coisas que só o Vitor pode fazer (painel)

- Trocar a chave da Anthropic; desligar cadastro público (signup) e ligar proteção de senha vazada no Supabase.
- Rever o login externo (Encopel, role `ferr_margem`).
- Ainda a fazer no código (quando ele quiser): tirar `cached_credentials` (`btoa(senha)` no navegador) e levar a chave da IA
  pra Edge Function.

---

## 7. Pra começar na nova conta

1. Clonar `vitoregee-dotcom/dashV` e ler este arquivo + `CLAUDE.md`.
2. Criar a branch de trabalho, conferir a versão atual (`grep -o ">v115\.[0-9]*<" index.html | head -1`).
3. Perguntar ao Vitor por onde quer seguir — sugestão: **apresentação do dia 08/10** (pendência 1).
