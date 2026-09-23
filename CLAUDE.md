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
- Ferramentas: `pfFerrAplicarPadrao` deixa o cabeçalho escuro em qualquer ferramenta (layout "B");
  botão padrão 3D = classe `.pfBtn` (+ `pfBtnVermelho/Escuro/Verde/Azul/Claro`).
- Sync: `pfSyncPull` é incremental (marca d'água de `updated_at`); `cad_produtos_v1` tem merge próprio
  (`pfMergeProdutosArr`, colapsa por código+marca).
- Diagnóstico de lentidão real: tabela `user_sync`, chave `perf_diagnostico_v1` (Supabase).

## Catálogos de peças em PDF
Converter para Excel **sem IA**: ver `scripts/catalogo-pdf/LEIAME.md`.
