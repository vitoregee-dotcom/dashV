# PartsFlow no WhatsApp (extensão do Chrome)

Etapa 1 (v115.2573): painel do PF + envio do mapa pra vários fornecedores. Etapa 2 (v115.2574, versão 1.1): abas, Cotar no PF e visual A | D.

- `manifest.json` — Manifest V3. Roda em web.whatsapp.com (`whatsapp.js`/`whatsapp.css`) e nas páginas do PF (`ponte.js`: *.vercel.app, localhost).
- `ponte.js` — conversa com o index.html por `window.postMessage` (`pfExt`: ola/souPF, lote, progresso, req/res).
- `fundo.js` — guarda a aba do PF e a do WhatsApp; fila de envio em `chrome.storage.local` (`lote`, `atual`), abre cada conversa por
  `web.whatsapp.com/send?phone=&text=`, pausa de 4–9 s, alarme `pfVigia` (1,5 min) se a conversa não abrir.
- `whatsapp.js` — aperta enviar e confirma (caixa de texto ficou vazia); número inválido / sem QR = erro. Painel `#pfwa` pergunta pro PF
  "quem é" (telefone pelo `data-id` …@c.us da conversa, senão pelo nome) e mostra o cartão que o PF devolve (`pfExtQuem` no index.html).
- Mudou algum arquivo → subir a `version` do manifest e refazer `partsflow-whatsapp.zip` (pasta `partsflow-whatsapp/` dentro do zip).
- Endereço do PF: https://vitoregee-dotcom.github.io/dashV/ (GitHub Pages) — liberado na 1.2. Outro domínio → acrescentar o domínio no `host_permissions` e no `matches` do ponte.js.
- Seletores do WhatsApp Web mudam de vez em quando: botão enviar = `button[aria-label="Enviar"]` / `[data-icon="send"]`, caixa = `#main footer div[contenteditable]`.
