# Continuar daqui — v115.2990 (aba 💬 WhatsApp na Gestão + 🧠 aprender com você)

Estado da `main`: **v115.2989 + extensão 9.3** (📒 CRM no WhatsApp, já publicado). Nada desta tarefa foi escrito ainda.
Prévia aprovada pelo Vitor ("Vamos na sua" = opção **A**): `docs/referencias/whatsapp-aprende/previa.png`.

## O que fazer (2 partes) → publicar como v115.2990 + extensão 9.4

### Parte A — Gestão: aba "⏱️ Atendimento" vira "💬 WhatsApp" (Atendimento + CRM juntos)
- `PF_GE_ABAS` (index.html ~52975): trocar `['atend','⏱️','Atendimento']` por `['atend','💬','WhatsApp']` (chave `atend` fica, o `pfGeAbrir('atend')` do Meu dia continua valendo).
- `pfGeAtHtml(d)` (~70812): acrescentar um bloco **📒 O que foi pro CRM** (função nova `pfGeCrmWaHtml(P,G)`):
  - depois da 2ª fileira de cards (Pessoas/Mensagens/Arquivos/Áudios) **e** também no `return` antecipado "Ainda sem atendimentos registrados" (o CRM pode ter dados mesmo sem atendimento).
  - Dados: `pfCrmLoad()` no período `P.ini..P.fim` (e filtro `G.atV` = porEmail). Entram: id começando com `crm_emit_`/`crm_wa_`/`crm_prom_`/`crm_v_`, tipo `oferta`/`ofret`, ou `origem` 'whats'. Tipo `feito` não entra. Ícone/nome pelo `pfCrmWaItem(e,feitos,nomes)` (já existe, ~bloco v115.2989 antes do `pfExtAcao`).
  - Cards: anotações, clientes, chips por tipo (📦 📌 📨 📎 💡 💬), **Promessas cumpridas** = eventos `crm_prom_*` do período: cumprida = tem `feito` com `ref` = id e texto começando com "✔" (o `pfExtPromessaCumprida` grava assim); `feito` com texto "desfeito" sai da conta; sem feito = aberta. Mostrar "X de Y".
  - Tabela por usuário (porEmail → `e.por`): Foi pro CRM · 📦 · 📌 · 📨 · Promessas cumpridas. Clique = filtra `window._pfGe.atV`.
  - Link "📒 ver cada anotação ›" abrindo uma lista (pode reaproveitar `pfCrmWaHoje({per,todos:true})`).
- Atualizar a linha do PF_FUNCOES "Tempo de atendimento" (ou "CRM no WhatsApp") e o texto do Meu dia "ver na Gestão ›" continua.

### Parte B — 🧠 O que aprendi com você (passo 1: SÓ registrar, nada automático)
Extensão (`extensao-whatsapp/whatsapp.js`):
- `msg()` (linha 44): quando `m.t==='acao'` e a ação é uma "ação de resposta" (`abrirCot`, `abrirCotMin`, `cotHoje`, `mapaCriar`, `pedidoEmitir`, `aviseMe`, `materialEnviado`, `rrUsou`, `respForn`, `lerCods`, `cadLink`, `credito`…), guardar `aprAcoes[ultimo].push({a:m.acao,ts:Date.now()})` (ultimo = conversa aberta).
- `aprVigiar()` chamado no tick junto do `verificarVigiar()` (linha ~2219): `lerMensagens()` (tem `t`, `eu`, `q`) + `lerMensagensDoc()` (arquivo). Achar o par: último BLOCO do cliente → SUA primeira mensagem logo depois. Assinatura `ultimo|hash(resposta)` em sessionStorage pra não mandar 2x. Só conversa de cliente do PF (`resp && resp.k`), não grupo.
- Manda acao **`aprender`** {k, nome, pedido (texto do bloco do cliente, ≤400), resposta (≤400), arq (nome do arquivo se a sua resposta foi arquivo), acoes (as de `aprAcoes[ultimo]` dos últimos 15 min)}.
- Linha na AJUDA + item no CFG_LISTA ("🧠 Aprender com você", padrão ligado). Link no rodapé do popover 📒 (`crmHojePinta`): "🧠 O que aprendi ›" (acao `aprAbrir`, focar).
- manifest 9.4, `PF_EXT_VER_NOVA='9.4'`, refazer o zip (pasta interna `partsflow-whatsapp/`), simulador com mock `aprender`.

PF (index.html, perto do bloco v115.2989 antes do `pfExtAcao`):
- Log só-acrescenta **`pfAprendeEventos`** (por id; entra nas 3 listas como os outros logs: lista de sync ~40888, `logKeys` ~41937). Evento {id, ts, k, cli, porEmail, por, int (tipo do pedido), fez (o que você fez), det (atalho/arquivo), pedido, resposta}.
- `PF_APR_TIPOS` = intenção do pedido por regex: 💰 preço/cotação · 📎 portfólio/tabela/catálogo · 📍 endereço/PIX/banco · 🚚 prazo/onde está o pedido · 📦 pode faturar/manda · 🔎 tem estoque/saldo · 📷 foto/medida · 🧾 nota/boleto · 🙋 outro.
- `pfAprFeito(a)`: ações primeiro (abrirCot→"criou cotação", mapaCriar→"mandou pro mapa", pedidoEmitir→"anotou pra emitir", aviseMe→"Avise-me", materialEnviado/arq→"mandou o arquivo X", rrUsou→"mandou o atalho X"); senão texto: igual/contido num Atalho de Texto (`pfRrLista`/atalhos, comparação só letras+números dos 40 primeiros) → "atalho X"; `R$` → "mandou preço"; NEGATIVO/SEM CADASTRO/ZEROU → "respondeu NEGATIVO"; senão "respondeu com texto".
- `pfExtAcao`: `aprender` → `pfAprGravar(arg)`; `aprAbrir` → `pfAprAbrir()`.
- Tela `pfAprAbrir` (janela padrão `pfNcJanela('pfAprJan',…)`): período 7/30/90, "só os meus / equipe" (gestor+), KPIs (pedidos lidos, tipos, % que você faz sempre igual), tabela **Quando o cliente pede… | Você costuma… (a ação mais comum) | Vezes | Sempre igual? (barra %)**, clique na linha = exemplos (pedido → resposta).
- Card em **Ferramentas → 🧠 O que a extensão aprendeu** (pôr o título no grupo 💬 WhatsApp do `PF_CARD_GRUPOS`), texto no `PF_AJUDA_TEXTOS`, linha no `PF_FUNCOES`.
- Passo 2 (sugestão "Faço igual?") e passo 3 (liberar sozinho) **NÃO** agora.

## Regras de sempre (CLAUDE.md)
Versão nos 2 lugares (`>v115.2989</div>` ×2 → 2990), comentário `// v115.2990 - A pedido do Vitor: …` (no MEIO de linha minificada usar `/* */`),
checagem de sintaxe (`new Function` em cada `<script>` + arquivos da extensão), testar (Playwright: PF com `page.route` abortando externo; extensão no `simulador.html`),
nota no CLAUDE.md, PR + merge squash, dizer "a versão mudou de v115.2989 para v115.2990" (+ extensão 9.3 → 9.4).
