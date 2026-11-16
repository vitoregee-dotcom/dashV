# Continuar daqui (16/11/2026, depois da v115.2763 / extensão 4.76)

## O que entrou na v115.2763 (publicado)
- **📥 Cotação do JBoss**: botões no ☀️ Meu dia, na ficha do CRM, no menu de Vendas e na barra das cotações (📥 JBOSS).
  - Funções: `pfJbAbrir` / `pfJbArquivo` / `pfJbRender` / `pfJbCriar` / `pfJbMarcar` / `pfJbSeloHtml`, prompt em `PF_JB_PROMPT`.
  - Fluxo: a IA lê o print/PDF/planilha → janela de conferência → vira cotação do PF.
  - A cotação nova guarda o preço do JBoss em `vendaOverride` e ganha `jboss` {num,data,obs,arq,difal,frete,total,st} e `cobrarEm`.
  - Item sem código entra com `semCodigo`.
  - No Meu dia aparece a partir do "cobrar em", sem o mínimo de R$ 3 mil, com ✔ Fechou / ✖ Perdeu.
  - Selo "📎 JBoss" na lista de cotações.
  - Testado com a IA simulada: capturas em `docs/referencias/cotacao-jboss/feito-*.png`.
- **Extensão 4.76** (zip refeito, `PF_EXT_VER_NOVA`='4.76'):
  1. Quando o cliente mandou PDF ou foto e o painel não acha código no texto, aparece "🤖 Ler o PDF/foto com IA e cotar" (`docCliAchar` → `cmExec('doc_ia'/'img_ia')`). Caso real: RS Tork, "Peças para cotocao atualizada.pdf".
  2. Promessa com dia marcado ("te mando na quarta feira") vira 📦 lembrete (`PE_PROMESSA_RE` no `pedidoVigiar`; o PF já põe a data pelo `pfPeData`).
  - **NÃO TESTADO.** Antes de confirmar pro Vitor:
    - testar a regex `PE_PROMESSA_RE` com: "te mando na quarta feira então", "ja te mando", "vou mandar amanhã", "envio dia 20";
    - testar o botão do PDF no 🧪 simulador.
  - O "doc_ia" precisa do ⚙️ motor ligado.

## Pendente / pedidos do Vitor ainda não feitos
1. **Portfólio enviado → registrar no CRM** (print do Rafael Faro - Hipercon, "portifolio completo Vitor 05-2026.pdf" + "lembra de mim qnd precisar de Filtros").
   - É coisa nova: sugerir opções com prévia antes de fazer.
   - Ideia: quando EU mando um PDF ou documento, a extensão registra o envio como evento `pfCrmAdd` (whats, `doc`:nome) e pode virar oferta (`pfOfSalvar`, alvo família "Filtros" tirada da frase). Na ficha aparece "📄 Portfólio enviado em …".
   - Opção extra: lista de "materiais" conhecidos (portfólio, catálogo, tabela) pra contar quantos clientes já receberam.
2. **"Te mando na quarta"**: além do automático da 4.76, explicar ao Vitor o jeito manual (botão direito na mensagem → ⏰ Lembrete).
3. **Lembrete de rotina:** CLAUDE.md já tem a nota da 2763. Se mexer na extensão de novo, subir a versão do manifest, o `PF_EXT_VER_NOVA` e refazer o zip.
