# PartsFlow — continuar daqui (atualizado em 02/10/2026, versão **v115.2151**)

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
  procurar `>v115.2151<`). Sempre avisar: **"a versão mudou de X para Y"**. Próxima: **v115.2152**.
- Comentário no código: `// v115.NNNN - A pedido do Vitor: ...` explicando o porquê.
- **Coisa nova** (tela/função nova): primeiro **sugerir opções com prévia** (imagem) e esperar o ok.
  **Correção de bug**: pode fazer e publicar direto.
- Quando ele pede "como ficaria?": mostrar captura/prévia antes de publicar.
- Ele prefere telas **limpas** ("não quero tão poluído"): o essencial visível, o resto no balão/filtro.

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
- O **3D (three.js) não carrega** nesse ambiente — 3D só dá pra conferir no navegador do Vitor.

**Banco (Supabase)**: projeto `bqbdypizmeirezedvefo`. Tabela nova = **sempre RLS ligado + política**
(ver "Segurança do banco" no `CLAUDE.md`). Testar política com `set local role authenticated` +
`request.jwt.claims` dentro de `begin … rollback`.

---

## 3. O que foi feito nesta sessão (v115.2139 → v115.2149)

| Versão | O quê |
|---|---|
| 2139 | **Códigos Spicer**: tela "📖 Códigos Spicer" (decifrador série-tipo-número, regras guardadas no PF, anotações); ponteira -53- = fixa / -40- = deslizante |
| 2140 | **Cotação em 2 linhas** (botão Tabela / 2 linhas / Compacta): código do cliente (laranja) × principal (azul), marca do cliente × interna, **último preço do cliente** (✔ vendido / só cotado; mouse mostra o outro), total |
| 2141 | Órbita: legenda "Como ler" fecha ao clicar fora |
| 2142 | Órbita: **⛶ Ampliar** (tela cheia), balão do cliente organizado (formato B), legenda em blocos |
| 2143 | Cadastro do cliente: **mandar/copiar só o que falta**; **WhatsApp na mesma aba** (ou app instalado) — todo envio usa `pfWhatsAbrir` |
| 2144 | Cotação 2 linhas: **ajustar largura das colunas**, 🎨 cor do último preço, listra por item |
| 2145 | Barra de notificações: aviso **🔄 RMA / Garantia** (cliente respondeu a garantia) |
| 2146 | **BUG garantia**: resposta do cliente não chegava no RMA (faltava política de leitura em `formulario_links` pro logado — corrigido no banco + código não marca "processado" sem achar o link/RMA) |
| 2147 | **Timer**: clicar no tempo e digitar (10, 1:30, 45s, 1h) — Enter já inicia |
| 2148 | Órbita: balão do cliente não fecha ao levar o mouse até ele; clique abre a ficha |
| 2149 | Órbita: **anéis por motivo** (🟡 valor alto · 🟢 frequência · 🟣 ticket médio · 🔵 potencial, anel de 2 cores), **❤️ dá preferência**, **💎 não negocia**, **🐜 formiguinha**, seletor **✨ Destacar**, **⚙️ do gestor**, tamanho do planeta mais marcado |

Prévias aprovadas/mostradas ficam em `docs/referencias/` (cotação 2 linhas, órbita, formiguinha, garantia Dana, ofertas, TV do estoque).

---

## 4. Pendências — esperando decisão do Vitor

1. **IPI / ST na cotação** — FEITO na v115.2150 (vem do cadastro do produto, % sobre o preço). Falta ver com o Vitor:
   se a tabela de 1 linha, o resumo e o PDF da cotação também devem mostrar com imposto; se ST vale pra todo cliente.
2. **Órbita v115.2149 — conferir com dados reais**: se a 🐜 formiguinha aparece (na demonstração ninguém bateu a regra),
   anéis de 2 cores no **3D**, e se o estilo "Conc.: anel" (anel azul-marinho da concessionária) não confunde com os anéis novos
   (sugestão: usar "sigla" ou "selo").
3. **Outros avisos de RMA** na barra (hoje só "cliente respondeu a garantia"): perguntar quais etapas ele quer (`pfRmaEventoAdd`).
4. **Garantia RMA-0002 (CARDANS NSA)**: a resposta foi reaberta no banco em 01/10 — confirmar que entrou no RMA depois do
   "🔄 Ver se respondeu".

## 5. Ideias guardadas (não começar sem ele pedir) — detalhes no `CLAUDE.md`

- 📺 **TVs do estoque** (fila de solicitações + pedidos A separar → Faturado) — prévias aprovadas, faltam decisões.
- 🧾 **Itens cotados sem cadastro** — registrar e avisar "cotado N vezes antes de ter cadastro".
- 🔄 **Substituto quando o item está zerado** — mostrar na linha da cotação o substituto com saldo.
- ⌨️ **Atalho de busca de PEDIDO do cliente** (sugestão Alt+P) — situação + previsão de entrega.
- 📲 **Avisos ao cliente pelo WhatsApp** (pedido emitido / faturado e disponível) — semiautomático × API.

## 6. Segurança — coisas que só o Vitor pode fazer (painel)

- Trocar a chave da Anthropic; desligar cadastro público (signup) e ligar proteção de senha vazada no Supabase.
- Rever o login externo (Encopel, role `ferr_margem`).
- Ainda a fazer no código (quando ele quiser): tirar `cached_credentials` (`btoa(senha)` no navegador) e levar a chave da IA
  pra Edge Function.

---

## 7. Pra começar na nova conta

1. Clonar `vitoregee-dotcom/dashV` e ler este arquivo + `CLAUDE.md`.
2. Criar a branch de trabalho, conferir a versão atual (`grep -o ">v115\.[0-9]*<" index.html | head -1`).
3. Perguntar ao Vitor por onde quer seguir — sugestão: **pendência 1 (IPI/ST)** ou **conferir a Órbita nova**.
