// PartsFlow no WhatsApp — roda dentro do WhatsApp Web.
// 1) Envio da fila: quando o fundo.js abre uma conversa com a mensagem pronta, aperta "enviar" e confirma que saiu.
// 2) Painel do PF ao lado da conversa, com abas (Cotação / Cliente / Histórico / Peças).
// 3) Botões do PF na conversa: em coluna (visual A) ou numa barra embaixo (visual D) — cada um escolhe.
(function () {
  'use strict';
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function dormir(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function esperar(fn, ms) {
    return new Promise(function (res) {
      var t0 = Date.now();
      (function loop() { var v = null; try { v = fn(); } catch (e) { } if (v) return res(v); if (Date.now() - t0 > ms) return res(null); setTimeout(loop, 400); })();
    });
  }
  function msg(m) { return new Promise(function (res) { try { chrome.runtime.sendMessage(m, function (r) { void chrome.runtime.lastError; res(r || null); }); } catch (e) { res({ erro: 'recarregar' }); } }); }
  function reais(v) { return 'R$ ' + (+v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  var VER = (function () { try { return chrome.runtime.getManifest().version; } catch (e) { return ''; } })();

  // ═══ 1) ENVIO ═══
  function caixaTexto() { return $('#main footer div[contenteditable="true"]'); }
  function botaoEnviar() {
    var s = $('#main footer button[aria-label="Enviar"]') || $('#main footer button[aria-label="Send"]') ||
      $('#main footer [data-icon="send"]') || $('#main footer [data-icon="wds-ic-send-filled"]');
    if (!s) return null;
    return s.closest('button') || s.closest('[role="button"]') || s;
  }
  function dialogoInvalido() {
    var ds = document.querySelectorAll('[data-animate-modal-popup="true"],div[role="dialog"]');
    for (var i = 0; i < ds.length; i++) { var t = ds[i].innerText || ''; if (/inv[aá]lid|invalid|não está no whatsapp|isn.t on whatsapp/i.test(t)) return ds[i]; }
    return null;
  }
  function desconectado() { return !!($('canvas[aria-label*="QR"]') || $('[data-ref] canvas') || /Use o WhatsApp no seu computador|Use WhatsApp on your computer|Escaneie o QR|Scan the QR/i.test((document.body && document.body.innerText || '').slice(0, 3000)) && !$('#side')); }

  async function processarEnvio() {
    var s = await chrome.storage.local.get(['atual']); var a = s.atual;
    if (!a || a.feito || Date.now() - a.inicio > 120000) return;
    a.feito = 1; await chrome.storage.local.set({ atual: a });
    var achou = await esperar(function () { if (desconectado()) return 'qr'; return dialogoInvalido() ? 'inv' : (botaoEnviar() ? 'btn' : (caixaTexto() ? 'cx' : null)); }, 45000);
    if (achou === 'qr') { await esperar(function () { return $('#side'); }, 20000); if (!$('#side')) return reporta(a, false, 'WhatsApp Web não está conectado (leia o QR code)', true); achou = null; }
    if (!achou) achou = await esperar(function () { return dialogoInvalido() ? 'inv' : (botaoEnviar() ? 'btn' : (caixaTexto() ? 'cx' : null)); }, 30000);
    if (!achou) return reporta(a, false, 'O WhatsApp não abriu a conversa');
    if (achou === 'inv' || dialogoInvalido()) { var d = dialogoInvalido(), b = d && d.querySelector('button'); if (b) b.click(); return reporta(a, false, 'Esse número não está no WhatsApp'); }
    var btn = await esperar(botaoEnviar, 3000);
    if (!btn) {
      if (!escreverNaCaixa(a.texto)) return reporta(a, false, 'Não achei a caixa de mensagem');
      btn = await esperar(botaoEnviar, 5000);
      if (!btn) return reporta(a, false, 'Não consegui escrever a mensagem');
    }
    await dormir(700 + Math.random() * 1100);
    btn = botaoEnviar() || btn; btn.click();
    var ok = await esperar(function () { var c = caixaTexto(); return c && !(c.innerText || '').trim() ? 1 : null; }, 12000);
    reporta(a, !!ok, ok ? '' : 'Não deu pra confirmar que saiu — confira a conversa');
  }
  function reporta(a, ok, erro, parar) { msg({ t: 'resultado', id: a.id, ok: ok, erro: erro || '', parar: !!parar }); }

  // escreve na caixa de mensagem SEM mandar (a pessoa confere e aperta Enter)
  function escreverNaCaixa(txt) {
    var cx = caixaTexto(); if (!cx) return false;
    cx.focus();
    var antes = cx.innerText || '';
    try { var dt = new DataTransfer(); dt.setData('text/plain', txt); cx.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); } catch (e) { }
    if ((cx.innerText || '') === antes) { try { document.execCommand('insertText', false, txt); } catch (e) { } }
    return (cx.innerText || '') !== antes;
  }

  // ═══ 2) MENSAGENS DA CONVERSA ═══
  function lerMensagens() {
    var out = [], els = document.querySelectorAll('#main [data-pre-plain-text]');
    els.forEach(function (el) {
      var tx = el.querySelector('.selectable-text'); var t = (tx ? tx.innerText : el.innerText) || '';
      out.push({ t: t.trim(), eu: !!el.closest('.message-out') });
    });
    if (!out.length) { // jeito antigo / reserva
      document.querySelectorAll('#main .message-in, #main .message-out').forEach(function (el) { var tx = el.querySelector('.selectable-text'); out.push({ t: ((tx ? tx.innerText : '') || '').trim(), eu: el.classList.contains('message-out') }); });
    }
    return out.filter(function (m) { return m.t; }).slice(-40);
  }
  var COD_RE = /[A-Za-z0-9][A-Za-z0-9.\-\/]{2,}[A-Za-z0-9]/g;
  function pareceCotacao(ms) {
    var cli = ms.filter(function (m) { return !m.eu; }).slice(-15), n = 0, pede = false;
    cli.forEach(function (m) { (m.t.match(COD_RE) || []).forEach(function (tk) { if (tk.replace(/\D/g, '').length >= 4 && !/^\d{1,2}[\/.:]\d{2}/.test(tk)) n++; }); if (/\b(cot|or[cç]|pre[cç]o|valor|quanto|tem\b|disponi|saldo)/i.test(m.t)) pede = true; });
    return n >= 2 || (n >= 1 && pede) ? n : 0;
  }

  // ═══ ler a lista de conversas (nome, número quando aparece, etiqueta) ═══
  async function lerListaConversas(onprog) {
    var pane = document.querySelector('#pane-side');
    if (!pane) return { erro: 'Abra o WhatsApp Web (a lista de conversas não apareceu).' };
    var mapa = {};
    function coleta() {
      var rows = pane.querySelectorAll('[role="listitem"]');
      if (!rows.length) rows = pane.querySelectorAll('div[role="row"]');
      rows.forEach(function (r) {
        var nomeEl = r.querySelector('span[title]');
        var nome = nomeEl ? (nomeEl.getAttribute('title') || '').trim() : '';
        if (!nome) return;
        var grupo = !!r.querySelector('[data-icon="default-group"], [data-icon*="group"]');
        var etqs = [];
        r.querySelectorAll('[aria-label]').forEach(function (e) { var a = (e.getAttribute('aria-label') || '').trim(); var m = a.match(/^(?:Etiqueta|Label)[:\s]+(.+)$/i); if (m) { var t = m[1].trim(); if (t && etqs.indexOf(t) < 0) etqs.push(t); } });
        var tel = /^[+\d][\d\s()\-]{7,}$/.test(nome) ? nome.replace(/\D/g, '') : '';
        if (!mapa[nome]) mapa[nome] = { nome: nome, grupo: grupo, etqs: etqs, tel: tel };
        else if (etqs.length && !mapa[nome].etqs.length) mapa[nome].etqs = etqs;
      });
    }
    pane.scrollTop = 0; await dormir(250);
    var ult = -1, iguais = 0;
    for (var i = 0; i < 800; i++) {
      coleta();
      if (onprog) onprog(Object.keys(mapa).length);
      pane.scrollTop = pane.scrollTop + Math.max(300, pane.clientHeight - 80);
      await dormir(200);
      if (pane.scrollTop <= ult + 2) { iguais++; if (iguais >= 4) break; } else iguais = 0;
      ult = pane.scrollTop;
    }
    coleta(); pane.scrollTop = 0;
    var lista = Object.keys(mapa).map(function (k) { return mapa[k]; });
    return { lista: lista };
  }


  // ═══ buscar os números que faltam (1.6) ═══
  // Pra cada contato salvo no PF sem número: procura a conversa pelo nome, abre, lê o número (da própria conversa ou
  // dos dados do contato) e manda pro PF. Só LÊ — não manda mensagem. Dá pra parar e continuar depois (numEstado).
  var numRodando = false, numParar = false;
  function caixaBusca() {
    return $('#side div[contenteditable="true"][role="textbox"]') || $('#side div[contenteditable="true"]') ||
      $('#side input[type="text"]') || $('[aria-label="Pesquisar ou começar uma nova conversa"]') || $('[aria-label="Search or start new chat"]');
  }
  function escreverBusca(cx, txt) {
    cx.focus();
    if (cx.tagName === 'INPUT') {
      var set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(cx, txt);
      cx.dispatchEvent(new Event('input', { bubbles: true })); return;
    }
    try { document.execCommand('selectAll', false, null); document.execCommand('delete', false, null); } catch (e) { }
    if (txt) { try { document.execCommand('insertText', false, txt); } catch (e) { } }
    if ((cx.innerText || '').trim() !== txt) { cx.textContent = txt; cx.dispatchEvent(new InputEvent('input', { bubbles: true, data: txt })); }
  }
  function linhaDoNome(nome) {
    var pane = $('#pane-side'); if (!pane) return null;
    var sp = pane.querySelectorAll('span[title]');
    for (var i = 0; i < sp.length; i++) if ((sp[i].getAttribute('title') || '').trim() === nome) return sp[i].closest('[role="listitem"],[role="row"]') || sp[i];
    return null;
  }
  function clicar(el) {
    var alvo = el.querySelector('[role="gridcell"]') || el.firstElementChild || el;
    ['mousedown', 'mouseup', 'click'].forEach(function (t) { alvo.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window })); });
  }
  function tituloConversa() { var c = contatoAtual(); return c ? c.nome : ''; }
  var TEL_RE = /^\+?\d[\d\s().\-]{8,}\d$/;
  function telNaTela() {
    // número que aparece nos dados do contato (painel da direita), fora da lista, da conversa e do painel do PF
    var els = document.querySelectorAll('span, div');
    for (var i = 0; i < els.length; i++) {
      var e = els[i]; if (e.children.length) continue;
      var t = (e.textContent || '').trim(); if (!TEL_RE.test(t)) continue;
      if (e.closest('#pane-side') || e.closest('#main') || e.closest('#pfwa') || e.closest('#pfwa-bots') || e.closest('#pfwa-aviso')) continue;
      var d = t.replace(/\D/g, ''); if (d.length >= 10 && d.length <= 15) return d;
    }
    return '';
  }
  function fecharDados() {
    var b = $('[aria-label="Fechar"]') || $('[aria-label="Close"]') || $('[data-icon="x"]') || $('[data-icon="close"]');
    if (b) { (b.closest('button') || b.closest('[role="button"]') || b).click(); return; }
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
  }
  async function numeroDe(nome) {
    var cx = caixaBusca(); if (!cx) return { erro: 'Não achei a caixa de pesquisa do WhatsApp' };
    escreverBusca(cx, nome);
    var lin = await esperar(function () { return linhaDoNome(nome); }, 5000);
    if (!lin) return { nao: 'não achei a conversa' };
    clicar(lin);
    var ok = await esperar(function () { return tituloConversa() === nome ? 1 : null; }, 6000);
    if (!ok) return { nao: 'a conversa não abriu' };
    await dormir(700);
    var c = contatoAtual(); if (c && c.tel) return { tel: c.tel, de: 'conversa' };
    var cab = $('#main header'); if (!cab) return { nao: 'sem cabeçalho' };
    var alvo = cab.querySelector('[role="button"]') || cab.querySelector('span[title]') || cab;
    clicar(alvo);
    var tel = await esperar(telNaTela, 4500);
    fecharDados(); await dormir(300);
    return tel ? { tel: tel, de: 'dados' } : { nao: 'sem número nos dados' };
  }
  async function buscarNumeros(b) {
    var st = P.querySelector('.pfwa-rodst');
    if (numRodando) { numParar = true; b.textContent = 'Parando…'; return; }
    var est = (await chrome.storage.local.get(['numEstado'])).numEstado;
    var r = await msg({ t: 'acao', acao: 'contatosSemTel' });
    if (!r || r.erro || !Array.isArray(r.nomes)) { flash(b, r && r.erro === 'semPF' ? 'Abra o PF numa aba deste Chrome' : r && r.erro === 'pfF5' ? 'Dê F5 na aba do PartsFlow' : 'Atualize o PF (F5) — versão nova'); return; }
    var nomes = r.nomes;
    if (!nomes.length) { if (st) st.textContent = '✔ Todos os contatos já têm número'; chrome.storage.local.remove('numEstado'); return; }
    // continua de onde parou: tira os que já foram tentados nesta rodada
    var feitos = (est && est.feitos) || {};
    var falta = nomes.filter(function (n) { return !feitos[n]; });
    if (!falta.length) { feitos = {}; falta = nomes; }
    numRodando = true; numParar = false; b.textContent = '⏸ Parar';
    var achou = (est && est.achou) || 0, n0 = nomes.length - falta.length;
    for (var i = 0; i < falta.length && !numParar; i++) {
      var nome = falta[i];
      if (st) st.textContent = '📞 ' + (n0 + i + 1) + ' de ' + nomes.length + ' · ' + achou + ' número(s) achados';
      var res = null; try { res = await numeroDe(nome); } catch (e) { res = { nao: 'erro' }; }
      if (res && res.erro) { if (st) st.textContent = res.erro; break; }
      if (res && res.tel) { var g = await msg({ t: 'acao', acao: 'contatoTel', arg: { nome: nome, tel: res.tel } }); if (g && g.gravou) achou++; }
      feitos[nome] = res && res.tel ? 'ok' : (res && res.nao) || 'nao';
      await chrome.storage.local.set({ numEstado: { feitos: feitos, achou: achou, em: Date.now() } });
      await dormir(900 + Math.random() * 1300);
    }
    var cx = caixaBusca(); if (cx) escreverBusca(cx, '');
    numRodando = false; b.textContent = '📞 Buscar números que faltam';
    var semN = Object.keys(feitos).filter(function (k) { return feitos[k] !== 'ok'; }).length;
    if (st) st.textContent = (numParar ? '⏸ Parado — clique de novo pra continuar · ' : '✔ Pronto · ') + achou + ' número(s) gravados no PF' + (semN ? ' · ' + semN + ' sem número' : '');
    if (!numParar) chrome.storage.local.remove('numEstado');
  }

  // ═══ 3) PAINEL + BOTÕES ═══
  var P = null, B = null, AV = null, ultimo = '', aberto = true, visual = 'A', aba = 'cot', resp = null, cot = null, cotErro = '', cotando = false, saldoR = null, statusLote = '', contatoAt = null, avisoFechado = '', avisoLigado = true, botsMin = false;
  // 1.8 - 💡 ofertas e respostas + ⚠ já ofereci + 📢 status
  var OF = null, JA = null, ST = null, ofPend = [], ofSig = '', ofSel = {}, ofIgn = {}, digAnt = '', jaR = null, jaFechado = '';
  // 2.0 - Menu do PF em volta do WhatsApp (barra de cima + coluna de ícones + etiquetas por conversa)
  var MENU = null, RAIL = null, menuLig = true, menuCor = 'azul', menuFiltro = '', sitCache = {}, sitSig = '', sitTimer = null;
  // 2.2 - 📌 "vou verificar depois" → pendência automática (com desfazer)
  var VF = null, vfR = null, vfSig = '';
  var VERIF_RE = /\bvou (anotar|verificar|conferir|checar|ver\b|dar uma (olhada|conferida)|confirmar|olhar|pesquisar|te retornar|te dar)|deixa eu (ver|verificar|conferir|checar|dar uma olhada|olhar)|preciso (verificar|conferir|ver no|checar)|j[aá] (te )?(retorno|verifico|confiro)|vou (te )?(retornar|dar) (o|um|a)/i;
  chrome.storage.local.get(['ofIgn'], function (s) { ofIgn = s.ofIgn || {}; });
  var BOTOES = [['cot', '📄', 'Cotar no PF'], ['saldo', '📦', 'Saldo'], ['ficha', '🤝', 'Ficha'], ['lemb', '⏰', 'Lembrete'], ['prontas', '⚡', 'Prontas'], ['assist', '🤖', 'Assistente'], ['pdf', '📤', 'PDF']];
  function logoSvg(f, l) { return '<svg width="24" height="24" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="' + f + '"/><rect x="9" y="8" width="4" height="22" rx="1.5" fill="' + l + '"/><path d="M13,8 Q26,8 26,14 Q26,20 13,20" fill="none" stroke="' + l + '" stroke-width="4" stroke-linecap="round"/><line x1="19" y1="20" x2="29" y2="32" stroke="#E67E22" stroke-width="2.5" stroke-linecap="round"/><circle cx="30" cy="33" r="2" fill="#E67E22"/></svg>'; }

  // 2.4 - ❓ Ajuda "Como funciona" (pedido do Vitor: explicar cada função em linguagem simples pros outros usuários).
  // FUNÇÃO NOVA NA EXTENSÃO → acrescentar uma linha aqui.
  var ajuda = false;
  var AJUDA = [
    ['Comece por aqui', [
      ['🧩', 'O que é', 'O PartsFlow (PF) aparece aqui do lado do WhatsApp e mostra quem é o contato, o que ele compra e o que está em aberto. Ele só LÊ e ESCREVE NA CAIXA — quem aperta Enter é sempre você.'],
      ['🔌', 'Precisa do PF aberto', 'Deixe uma aba do PartsFlow aberta (já logado) neste mesmo Chrome — pode ser em outra janela. Se aparecer "O PF não respondeu", dê F5 na aba do PartsFlow.'],
      ['🟢', 'Conectado ao PF', 'Do lado da versão, lá em cima: verde "● Conectado ao PF" = tudo certo · laranja "Dê F5 no PF" = a aba do PF está aberta mas parou de responder · vermelho "PF fechado" = abra o PartsFlow. Clique nele pra conferir na hora. A bolinha também aparece no "PF" da barra de cima.'],
      ['🔁', 'Atualizou a extensão?', 'Depois de instalar uma versão nova, recarregue a aba do WhatsApp e a do PF (F5).']]],
    ['Em cima e do lado esquerdo', [
      ['🔎', 'Barra de filtros', 'Clientes, Fornecedores, etiquetas do WhatsApp, cotação aberta e sem resposta. Clique pra deixar só essas conversas na lista; clique de novo pra ver tudo.'],
      ['🏷️', 'Etiquetas nas conversas', 'Embaixo de cada nome: se é cliente ou fornecedor do PF, cotação aberta, mapa esperando preço.'],
      ['⚙️', 'Menu do PF', 'A chave "Menu do PF" liga/desliga a barra. "azul / discreta" troca a cor.']]],
    ['Botões ao lado da conversa', [
      ['📄', 'Cotar no PF', 'Lê os códigos e quantidades que o cliente mandou, mostra saldo e preço (com a margem dele) e monta a resposta. "Pôr na conversa" escreve na caixa; você confere e manda.'],
      ['📦', 'Saldo', 'Selecione um código na conversa e clique: mostra o saldo de cada marca.'],
      ['🤝', 'Ficha', 'Abre a ficha do cliente no PF (CRM).'],
      ['⏰', 'Lembrete', 'Marca uma próxima ação (aparece no ☀️ Meu dia do PF).'],
      ['⚡', 'Prontas', 'Respostas prontas pra mandar com um clique.'],
      ['🤖', 'Assistente', 'Abre as regras do Assistente de Vendas desse cliente (margem, marca que não cota, avisos).'],
      ['📤', 'PDF', 'Abre a cotação no PF e baixa o PDF pra você anexar.'],
      ['🗂️', 'Quadro de vendas', 'Na coluna da esquerda: abre no PF o quadro com as cotações em colunas (cotando, proposta enviada, negociando, fechou). O cartão abre a conversa.'],
      ['–', 'Esconder', 'O "–" (ou "‹") recolhe os botões num só "PF".'],
      ['A D', 'Visual', 'No cabeçalho: A = coluna ao lado das mensagens · D = barra embaixo.']]],
    ['Abas do painel', [
      ['📄', 'Cotação', 'A cotação lida da conversa, com saldo, preço e a resposta pronta.'],
      ['🤝', 'Cliente', 'Avisos do cliente (vencido, anotações, regras do Assistente, inativo…), números de 12 meses, próxima ação, respostas prontas e registrar na ficha.'],
      ['🕘', 'Histórico', 'Cotações abertas, últimos pedidos e o que você já ofereceu.'],
      ['📦', 'Peças', 'Saldo de um código e o que o cliente mais compra.']]],
    ['O PF avisa sozinho', [
      ['🔔', 'Pedido de cotação', 'Quando o cliente manda códigos, aparece uma bolinha laranja com o número de códigos no botão 📄 do PF (ao lado das mensagens). Clique nela pra cotar. Pra desligar: o sino 🔔 no cabeçalho do painel (vira 🔕) ou o botão direito na bolinha.'],
      ['💡', 'Ofertas', 'Quando você oferece algo e o cliente responde, o PF pergunta o que ele achou e guarda na ficha. Se for oferecer de novo, ele avisa "você já ofereceu".'],
      ['📌', 'Vou verificar', 'Se você escrever "deixa eu ver / vou verificar / já te retorno", o PF cria uma pendência sozinho (com desfazer).'],
      ['📇', 'Código que não está no PF', 'Se o nome no WhatsApp tem um código entre parênteses que não existe no PF, aparece "Cadastrar no PF" já com o código.']]],
    ['Embaixo do painel', [
      ['📥', 'Importar meus contatos', 'Lê a lista de conversas e traz pro PF (você escolhe quem entra).'],
      ['📣', 'Disparo pelo PF', 'No PF, Vendas → 📣 Disparo pelo WhatsApp: escolhe a lista (o que chegou, uma marca, um grupo, os sumidos ou uma etiqueta), escreve a mensagem com {nome} e a extensão manda uma por uma, no ritmo que você escolher por hora. Quem já recebeu a mesma oferta fica de fora.'],
      ['👤', 'Salvar contato', 'Botão verde ao lado do nome da conversa: escreve o nome, a empresa (procura nos clientes do PF) e o código do JBoss — vira "Fulano - Empresa (código)". Salva no PF e, se o número não está salvo, abre o "Adicionar aos contatos" do WhatsApp com o nome. Tem também o CARGO e o CNPJ (CNPJ que ainda não é cliente = entra no PF como pré-cadastro 🌱 com os dados da Receita); se a empresa ainda não está no PF, aparece “➕ Criar cliente no PF”, que já cria o cadastro com esse contato.'],
      ['📞', 'Buscar números que faltam', 'Abre cada conversa dos contatos salvos sem número e pega o telefone. Clique de novo pra parar.']]]
  ];
  function htmlAjuda() {
    var h = '<div class="pfwa-ajtop"><b>❓ Como funciona</b><span class="pfwa-link" data-acao="ajuda">✕ fechar</span></div>';
    AJUDA.forEach(function (g) {
      h += '<div class="pfwa-bt" style="margin-top:10px">' + esc(g[0]) + '</div>';
      g[1].forEach(function (x) { h += '<div class="pfwa-ajl"><span>' + esc(x[0]) + '</span><div><b>' + esc(x[1]) + '</b><br><small>' + esc(x[2]) + '</small></div></div>'; });
    });
    return h;
  }
  function montar() {
    if (P) return;
    P = document.createElement('div'); P.id = 'pfwa';
    P.innerHTML = '<div class="pfwa-aba" title="PartsFlow">PF</div><div class="pfwa-caixa"><div class="pfwa-cab">' + logoSvg('#fff', '#0F1F35') +
      '<div class="pfwa-cabt"><b>PartsFlow</b><span class="pfwa-ver">' + (VER ? 'v' + VER : '') + '</span><span class="pfwa-con" data-acao="conexao" title="Ligação com o PartsFlow">…</span><small class="pfwa-cabsub"></small></div><i class="pfwa-ajd" data-acao="ajuda" title="Como funciona cada coisa">❓</i><i class="pfwa-sino" data-acao="sino" title="Avisar quando o cliente manda códigos de cotação">🔔</i><span class="pfwa-vis" title="Onde ficam os botões do PF: A = coluna ao lado das mensagens · D = barra embaixo"><i data-vis="A">A</i><i data-vis="D">D</i></span><span class="pfwa-x" title="Recolher">›</span></div>' +
      '<div class="pfwa-lote"></div><div class="pfwa-tabs"></div><div class="pfwa-corpo"></div>'+
      '<div class="pfwa-rod"><button data-acao="importar" title="Lê a lista de conversas do WhatsApp Web e traz pro PF">📥 Importar meus contatos</button><button data-acao="numeros" class="pfwa-num" title="Abre cada conversa dos contatos salvos sem número, lê o número e grava no PF (só lê, não manda nada). Clique de novo pra parar.">📞 Buscar números que faltam</button><span class="pfwa-rodst"></span></div></div>';
    document.body.appendChild(P);
    B = document.createElement('div'); B.id = 'pfwa-bots'; document.body.appendChild(B);
    AV = document.createElement('div'); AV.id = 'pfwa-aviso'; document.body.appendChild(AV);
    OF = document.createElement('div'); OF.id = 'pfwa-of'; document.body.appendChild(OF);
    JA = document.createElement('div'); JA.id = 'pfwa-ja'; document.body.appendChild(JA);
    ST = document.createElement('div'); ST.id = 'pfwa-st'; document.body.appendChild(ST);
    MENU = document.createElement('div'); MENU.id = 'pfwa-menu'; document.body.appendChild(MENU);
    RAIL = document.createElement('div'); RAIL.id = 'pfwa-rail'; document.body.appendChild(RAIL);
    VF = document.createElement('div'); VF.id = 'pfwa-vf'; document.body.appendChild(VF);
    SVB = document.createElement('div'); SVB.id = 'pfwa-svb'; SVB.setAttribute('data-acao', 'svAbrir'); SVB.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"><circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-6 7-6s7 2 7 6"/><path d="M19 8v6M16 11h6"/></svg>'; document.body.appendChild(SVB);
    SV = document.createElement('div'); SV.id = 'pfwa-sv'; document.body.appendChild(SV);
    P.querySelector('.pfwa-aba').onclick = function () { aberto = !aberto; chrome.storage.local.set({ painelAberto: aberto }); pinta(); };
    P.querySelector('.pfwa-x').onclick = function () { aberto = false; chrome.storage.local.set({ painelAberto: false }); pinta(); };
    P.querySelectorAll('[data-vis]').forEach(function (el) { el.onclick = function () { visual = el.getAttribute('data-vis'); chrome.storage.local.set({ visual: visual }); pinta(); }; });
    [P, B, AV, OF, JA, ST, MENU, RAIL, VF, SVB, SV].forEach(function (el) { el.addEventListener('click', clique); });
    chrome.storage.local.get(['painelAberto', 'visual', 'avisoLigado', 'botsMin', 'menuLig', 'menuCor', 'menuFiltro'], function (s) { if (s.painelAberto === false) aberto = false; if (s.visual === 'D' || s.visual === 'A') visual = s.visual; if (s.avisoLigado === false) avisoLigado = false; if (s.botsMin) botsMin = true; if (s.menuLig === false) menuLig = false; if (s.menuCor === 'discreta' || s.menuCor === 'azul') menuCor = s.menuCor; if (s.menuFiltro) menuFiltro = s.menuFiltro; pinta(); pintarMenu(); });
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && svAberto && SV) { svAberto = false; SV.style.display = 'none'; e.stopPropagation(); } }, true);
  function abrirPainel() { if (!aberto) { aberto = true; chrome.storage.local.set({ painelAberto: true }); } }
  function irAba(a) { aba = a; abrirPainel(); pinta(); }
  async function clique(e) {
    var b = e.target.closest('[data-acao]'); if (!b) return;
    var ac = b.getAttribute('data-acao'), arg = b.getAttribute('data-arg') || '';
    if (ac === 'aba') { ajuda = false; irAba(arg); return; }
    if (ac === 'svAbrir') { if (svAberto) { svAberto = false; SV.style.display = 'none'; } else svAbrir(); return; } // 2.7
    if (ac === 'svFechar') { svAberto = false; SV.style.display = 'none'; return; }
    if (ac === 'svUsar') { svUsar(arg); return; }
    if (ac === 'svSalvar') { svSalvar(b); return; }
    if (ac === 'svCriar') { svSalvar(b, true); return; }
    if (ac === 'svCadAbrir') { if (svK) msg({ t: 'acao', acao: 'irTela', arg: { tela: 'cadcliK', k: svK } }); return; }
    if (ac === 'svWa') { svWa(); return; }
    if (ac === 'conexao') { conPintar(''); conChecar(); return; }
    if (ac === 'ajuda') { ajuda = !ajuda; abrirPainel(); pinta(); return; }
    if (ac === 'sino') { avisoLigado = !avisoLigado; chrome.storage.local.set({ avisoLigado: avisoLigado }); pinta(); marcaCot(); if (!avisoLigado && AV) AV.style.display = 'none'; else vigiar(); return; }
    if (ac === 'botsToggle') { botsMin = !botsMin; chrome.storage.local.set({ botsMin: botsMin }); posicionar(); return; }
    if (ac === 'numeros') { buscarNumeros(b); return; }
    if (ac === 'importar') {
      var st = P.querySelector('.pfwa-rodst'), o0 = b.textContent;
      b.disabled = true; b.textContent = 'Lendo a lista…';
      var res = await lerListaConversas(function (n) { if (st) st.textContent = n + ' lidos…'; });
      b.disabled = false; b.textContent = o0;
      if (!res || res.erro) { if (st) st.textContent = ''; flash(b, (res && res.erro) || 'Não consegui ler'); return; }
      if (st) st.textContent = res.lista.length + ' contatos — abrindo o PF…';
      var r = await msg({ t: 'acao', acao: 'importarContatos', focar: true, arg: { lista: res.lista } });
      if (st) st.textContent = (r && r.ok) ? '✔ Confira a lista no PF' : 'Abra uma aba do PF primeiro';
      return;
    }
    if (ac === 'b-cot' || ac === 'cotar') { irAba('cot'); cotar(); return; }
    if (ac === 'b-saldo') { var sel = String(window.getSelection() || '').trim(); irAba('pecas'); if (sel && sel.length < 30) { var i = P.querySelector('.pfwa-saldo-in'); if (i) i.value = sel; buscarSaldo(sel); } else setTimeout(function () { var i = P.querySelector('.pfwa-saldo-in'); if (i) i.focus(); }, 50); return; }
    if (ac === 'b-ficha') { if (resp && resp.k) msg({ t: 'acao', acao: 'ficha', arg: resp.k, focar: true }); else irAba('cli'); return; }
    if (ac === 'b-assist') { if (resp && resp.k) msg({ t: 'acao', acao: 'assistente', arg: resp.k, focar: true }); else irAba('cli'); return; } // 2.3
    if (ac === 'b-lemb') { irAba('cli'); setTimeout(function () { var i = P.querySelector('.pfwa-lemb-d'); if (i) i.focus(); }, 50); return; }
    if (ac === 'b-prontas') { irAba('cli'); setTimeout(function () { var el = P.querySelector('.pfwa-prontas'); if (el) el.scrollIntoView({ block: 'center' }); }, 50); return; }
    if (ac === 'b-pdf' || ac === 'pdf') { if (!cot || !cot.itens.length) { irAba('cot'); await cotar(); } if (cot && cot.itens.length) abrirCot(true); return; }
    if (ac === 'abrirCot') { abrirCot(false); return; }
    if (ac === 'escrever' || ac === 'pronta') {
      var t = ac === 'escrever' ? (P.querySelector('.pfwa-resp') || {}).value : ((resp && resp.prontas && resp.prontas[+arg]) || {}).txt;
      if (!t) return; var ok = escreverNaCaixa(t);
      if (ac === 'escrever' && ok && resp && resp.k) msg({ t: 'acao', acao: 'registrar', arg: { k: resp.k, texto: 'Cotação pelo WhatsApp: ' + cot.itens.length + ' código(s), ' + reais(cot.total) } });
      flash(b, ok ? '✔ Está na caixa — confira e aperte Enter' : 'Abra a conversa primeiro'); return;
    }
    if (ac === 'tirar') { if (cot) { cot.itens.splice(+arg, 1); refazResposta(); pintaCorpo(); } return; }
    if (ac === 'saldoBusca') { var i2 = P.querySelector('.pfwa-saldo-in'); buscarSaldo(i2 ? i2.value : ''); return; }
    if (ac === 'fechaAviso') { avisoFechado = ultimo; pintaAviso(0); return; }
    if (ac === 'registrar') {
      var ta = P.querySelector('.pfwa-nota'); var tx = ta ? ta.value.trim() : ''; if (!tx) { if (ta) ta.focus(); return; }
      b.disabled = true; b.textContent = 'Gravando…';
      var r = await msg({ t: 'acao', acao: 'registrar', arg: { k: arg, texto: tx } }); b.disabled = false; b.textContent = r && r.ok ? '✔ Registrado na ficha' : 'Não deu — abra o PF'; if (r && r.ok && ta) ta.value = ''; return;
    }
    if (ac === 'lembrete') {
      var d = (P.querySelector('.pfwa-lemb-d') || {}).value, tt = ((P.querySelector('.pfwa-lemb-t') || {}).value || '').trim();
      if (!d) { var di = P.querySelector('.pfwa-lemb-d'); if (di) di.focus(); return; }
      var r2 = await msg({ t: 'acao', acao: 'lembrete', arg: { k: arg, data: d, texto: tt } }); flash(b, r2 && r2.ok ? '✔ Marcado — aparece no Meu dia' : 'Não deu — abra o PF'); return;
    }
    if (ac === 'parar') { msg({ t: 'parar' }); return; }
    if (ac === 'menuTog') { menuLig = !menuLig; chrome.storage.local.set({ menuLig: menuLig }); pintarMenu(); return; }
    if (ac === 'menuCor') { menuCor = arg; chrome.storage.local.set({ menuCor: menuCor }); pintarMenu(); return; }
    if (ac === 'menuFiltro') { menuFiltro = (menuFiltro === arg ? '' : arg); chrome.storage.local.set({ menuFiltro: menuFiltro }); pintarMenu(); return; }
    if (ac === 'ofResp') { var o0 = ofPend[0]; if (o0) { ofSel[o0.h] = arg; pintaOferta(); } return; }
    if (ac === 'ofSalvar' || ac === 'ofIgnorar') {
      var o = ofPend[0]; if (!o) return;
      if (ac === 'ofIgnorar') { ofIgn[o.h] = Date.now(); chrome.storage.local.set({ ofIgn: ofIgn }); ofPend.shift(); pintaOferta(); return; }
      var mo = (OF.querySelector('.pfwa-of-mot') || {}).value || '', le = (OF.querySelector('.pfwa-of-lemb') || {}).value || '';
      b.disabled = true; b.textContent = 'Salvando…';
      var rr = await msg({ t: 'acao', acao: 'ofertaSalvar', arg: { k: resp && resp.k, h: o.h, alvos: o.alvos, resp: ofSel[o.h] || o.sug || 'sem', motivo: mo, msg: o.msg, lembrar: +le || 0, canal: 'whats' } });
      if (rr && rr.ok) { ofPend.shift(); pintaOferta(); var rf = await msg({ t: 'quem', tel: contatoAt && contatoAt.tel, nome: contatoAt && contatoAt.nome }); if (rf && rf.achou) { resp = rf; pintaCorpo(); } }
      else { b.disabled = false; flash(b, 'Não deu — abra o PF'); }
      return;
    }
    if (ac === 'jaX') { jaFechado = digAnt; JA.style.display = 'none'; return; }
    if (ac === 'stX') { ST.style.display = 'none'; return; }
    if (ac === 'vfDesfazer') { if (vfR) msg({ t: 'acao', acao: 'verificarDesfazer', arg: vfR.id }); vfR = null; pintaVf(); return; }
    if (ac === 'vfX') { vfR = null; pintaVf(); return; }
    msg({ t: 'acao', acao: ac, arg: arg, focar: true });
  }
  function flash(b, t) { var o = b.textContent; b.textContent = t; setTimeout(function () { b.textContent = o; }, 2200); }

  async function cotar() {
    if (cotando) return; cotando = true; cotErro = ''; cot = null; pintaCorpo();
    var r = await msg({ t: 'acao', acao: 'cotar', arg: { k: resp && resp.k, contato: resp && resp.contato, msgs: lerMensagens() } });
    cotando = false;
    if (!r || r.erro) { cotErro = r && r.erro === 'semPF' ? 'Abra o PartsFlow numa aba deste Chrome (já logado).' : r && r.erro === 'pfF5' ? 'Dê F5 na aba do PartsFlow (a extensão foi atualizada depois que ele abriu).' : 'O PF não respondeu. Dê F5 na aba do PartsFlow.'; }
    else cot = r;
    pintaCorpo();
  }
  function refazResposta() {
    if (!cot) return; var nome = (resp && resp.contato || '').split(' ')[0], tot = 0;
    var ls = cot.itens.map(function (o) {
      if (!o.achou) return o.cod + ' — não localizei, pode confirmar o código?';
      if (!(o.saldo > 0)) return o.cod + ' — ' + o.desc + ' — vou verificar o prazo';
      var q = Math.min(o.saldo, o.qtd); tot += q * o.preco; return o.cod + ' — ' + o.desc + ' — ' + q + ' un' + (q < o.qtd ? ' (tenho ' + o.saldo + ')' : '') + ' — ' + reais(o.preco) + ' un';
    });
    cot.total = Math.round(tot * 100) / 100;
    var p = cot.resposta.split('\nSegue:\n'); var ini = p.length > 1 ? p[0] : ('Olá' + (nome ? ' ' + nome : '') + '!');
    var fim = cot.resposta.split('\n\n').slice(-1)[0];
    cot.resposta = ini + '\nSegue:\n' + ls.join('\n') + (tot ? '\n\nTotal: ' + reais(tot) : '') + '\n\n' + fim;
  }
  function abrirCot(pdf) {
    if (!cot) return;
    msg({ t: 'acao', acao: 'abrirCot', focar: true, arg: { k: resp && resp.k, pdf: !!pdf, itens: cot.itens.filter(function (o) { return o.cod; }).map(function (o) { return { cod: o.cod, qtd: o.qtd, marca: o.marca, desc: o.desc }; }) } });
  }
  async function buscarSaldo(cod) { cod = String(cod || '').trim(); if (!cod) return; saldoR = { cod: cod, carregando: 1 }; pintaCorpo(); var r = await msg({ t: 'acao', acao: 'saldo', arg: cod }); saldoR = r && !r.erro ? r : { cod: cod, erro: 1 }; pintaCorpo(); }

  function pinta() {
    if (!P) return;
    P.classList.toggle('fechado', !aberto); P.classList.toggle('pfwa-vD', visual === 'D');
    document.documentElement.classList.toggle('pfwa-aberto', aberto);
    P.querySelectorAll('[data-vis]').forEach(function (el) { el.classList.toggle('on', el.getAttribute('data-vis') === visual); });
    var sino = P.querySelector('.pfwa-sino'); if (sino) { sino.textContent = avisoLigado ? '🔔' : '🔕'; sino.classList.toggle('off', !avisoLigado); sino.title = avisoLigado ? 'Avisos de cotação: ligados (clique pra desligar)' : 'Avisos de cotação: desligados (clique pra ligar)'; }
    var abas = [['cot', '📄 Cotação'], ['cli', resp && resp.tipo === 'fornecedor' ? '🏭 Fornecedor' : '🤝 Cliente'], ['hist', '🕘 Histórico'], ['pecas', '📦 Peças']];
    P.querySelector('.pfwa-tabs').innerHTML = abas.map(function (a) { return '<span data-acao="aba" data-arg="' + a[0] + '" class="' + (aba === a[0] ? 'on' : '') + '">' + a[1] + '</span>'; }).join('');
    pintaCorpo(); posicionar();
  }
  function bloco(b) {
    var h = '<div class="pfwa-bloco"><div class="pfwa-bt">' + esc(b.tit) + '</div>';
    if (!b.itens.length) h += '<div class="pfwa-nada">' + esc(b.vazio || 'nada') + '</div>';
    b.itens.forEach(function (x) { h += '<div class="pfwa-it' + (x.acao ? ' pfwa-cl' : '') + '"' + (x.acao ? ' data-acao="' + esc(x.acao) + '" data-arg="' + esc(x.arg) + '"' : '') + '><b>' + esc(x.t) + '</b>' + (x.d ? '<br><small>' + esc(x.d) + '</small>' : '') + '</div>'; });
    return h + '</div>';
  }
  function vazioHtml() {
    var r = resp;
    if (!contatoAt) return '<div class="pfwa-vazio">Abra uma conversa pra ver o que o PF sabe desse contato.</div>';
    if (!r) return '<div class="pfwa-vazio">Procurando no PF…</div>';
    if (r.erro === 'semPF') return '<div class="pfwa-vazio">Abra o <b>PartsFlow</b> numa aba deste Chrome (já logado) pra ver quem é esse contato.</div>';
    if (r.erro === 'pfF5') return '<div class="pfwa-vazio">A aba do <b>PartsFlow</b> está aberta, mas não respondeu.<br><b>Dê F5 nela</b> (a extensão foi atualizada depois que ela abriu) e volte aqui.</div>';
    if (r.erro === 'recarregar') return '<div class="pfwa-vazio">A extensão foi atualizada — aperte <b>F5</b> nesta aba.</div>';
    if (r.erro) return '<div class="pfwa-vazio">O PF não respondeu. Dê <b>F5</b> na aba do PartsFlow.</div>';
    if (r.grupo) return '<div class="pfwa-vazio">Conversa em grupo.</div>';
    return '';
  }
  function cabCliente(r) {
    if (!r || !r.achou) return '';
    var h = '<div class="pfwa-tit">' + esc(r.titulo) + '</div>' + (r.sub ? '<div class="pfwa-sub">' + esc(r.sub) + '</div>' : '');
    if (r.etqs && r.etqs.length) h += '<div class="pfwa-etqs">' + r.etqs.map(function (e) { return '<span style="background:' + esc(e.bg || '#eef2f7') + ';color:' + esc(e.cor || '#33404f') + '">' + esc(e.t) + '</span>'; }).join('') + '</div>';
    return h;
  }
  // 2.3 - 🤖 avisos do cliente (anotações, regras do Assistente, inativo, vencido…) — iguais à caixa de avisos da cotação no PF
  function avisosHtml(r, curto) {
    if (!r || !r.achou || r.tipo !== 'cliente') return '';
    var av = r.avisos || [], COR = { v: '#B3231C', a: '#9A6B00', z: '#1F4E79' };
    var temV = av.some(function (a) { return a.cor === 'v'; });
    if (curto) { if (!av.length) return ''; return '<div class="pfwa-avc' + (temV ? ' v' : '') + '" data-acao="aba" data-arg="cli">⚠ ' + av.length + ' aviso' + (av.length > 1 ? 's' : '') + ' deste cliente' + (r.nRegras ? ' · 🤖 ' + r.nRegras + ' regra' + (r.nRegras > 1 ? 's' : '') : '') + ' — ver</div>'; }
    var h = '<div class="pfwa-bloco pfwa-av' + (temV ? ' v' : '') + '"><div class="pfwa-bt">' + (av.length ? '⚠ ' + av.length + ' aviso' + (av.length > 1 ? 's' : '') + ' deste cliente' : '✔ Nenhum aviso deste cliente') + '</div>';
    av.forEach(function (a) { h += '<div class="pfwa-avl"><span style="color:' + (COR[a.cor] || COR.z) + '">' + esc(a.ic) + '</span><div>' + esc(a.t) + '</div></div>'; });
    h += '<button class="pfwa-btn" data-acao="assistente" data-arg="' + esc(r.k || '') + '">🤖 ' + (r.nRegras ? 'Ver as regras do Assistente' : 'Criar regra no Assistente') + '</button></div>';
    return h;
  }
  function htmlCot() {
    var r = resp, h = '';
    if (r && r.achou) h += cabCliente(r) + avisosHtml(r, true);
    else if (r && !r.erro && !r.grupo) h += '<div class="pfwa-sub" style="margin-bottom:6px">⚠ Contato fora do cadastro — preço com a margem padrão (SP).</div>';
    if (cotando) return h + '<div class="pfwa-vazio">Lendo a conversa e buscando saldo e preço…</div>';
    if (cotErro) return h + '<div class="pfwa-vazio">' + esc(cotErro) + '</div>';
    if (!cot) return h + '<div class="pfwa-vazio">O PF lê os códigos e a quantidade que o cliente mandou nesta conversa, mostra saldo e preço e escreve a resposta.<br><br><button class="pfwa-btn pfwa-lar" data-acao="cotar">📄 Cotar no PF</button></div>';
    if (!cot.itens.length) return h + '<div class="pfwa-vazio">Não achei códigos nas últimas mensagens do cliente.<br><small>Selecione um código e use 📦 Saldo, ou mande pelo PF.</small><br><br><button class="pfwa-btn" data-acao="cotar">🔁 Ler de novo</button></div>';
    h += '<div class="pfwa-cotinfo">' + cot.itens.length + ' código' + (cot.itens.length > 1 ? 's' : '') + (cot.geral ? ' · ' + cot.geral + ' de cada' : '') + (cot.margem != null ? ' · margem ' + cot.margem + '% · ' + esc(cot.uf) : '') + ' <span data-acao="cotar" class="pfwa-link">🔁 ler de novo</span></div>';
    h += '<table class="pfwa-tab"><tr><th>Código</th><th>Qtd</th><th>Saldo</th><th>Unit.</th><th></th></tr>';
    cot.itens.forEach(function (o, i) {
      var sl = !o.achou ? '<span class="no">não achei</span>' : !(o.saldo > 0) ? '<span class="no">✖ 0</span>' : o.saldo < o.qtd ? '<span class="mid">◐ ' + o.saldo + '</span>' : '<span class="ok">✔ ' + o.saldo + '</span>';
      h += '<tr><td><b>' + esc(o.cod) + '</b>' + (o.desc ? '<br><small>' + esc(o.desc) + (o.marca ? ' · ' + esc(o.marca) : '') + '</small>' : '') + '</td><td>' + o.qtd + '</td><td>' + sl + '</td><td>' + (o.preco > 0 ? reais(o.preco) : '—') + '</td><td><span data-acao="tirar" data-arg="' + i + '" title="Tirar da cotação" class="pfwa-tirar">✕</span></td></tr>';
    });
    h += '</table><div class="pfwa-tot"><span>Total (com saldo)</span><span>' + reais(cot.total) + '</span></div>';
    h += '<div class="pfwa-bt" style="margin-top:10px">💬 Resposta (dá pra mexer antes)</div><textarea class="pfwa-resp">' + esc(cot.resposta) + '</textarea>';
    h += '<div class="pfwa-bots"><button data-acao="escrever" class="pfwa-verde">💬 Pôr na conversa</button><button data-acao="abrirCot">📄 Abrir a cotação no PF</button><button data-acao="pdf" class="pfwa-laranja">📤 PDF</button></div>';
    h += '<div class="pfwa-nada" style="margin-top:6px">"Pôr na conversa" escreve na caixa do WhatsApp — você confere e aperta Enter. O PDF abre a cotação no PF e baixa o arquivo pra anexar.</div>';
    return h;
  }
  function htmlCli() {
    var r = resp, h = cabCliente(r);
    if (!r || !r.achou) return '<div class="pfwa-vazio">Esse contato <b>não está no PF</b>.<br><small>Procurei pelo telefone' + (r && r.nome ? ' e pelo nome' : '') + ' nos clientes e fornecedores.</small></div>';
    h += avisosHtml(r, false); // 2.3 - avisos do cliente (os mesmos da cotação)
    (r.linhas || []).forEach(function (l) { h += '<div class="pfwa-lin"><span>' + esc(l.ic) + '</span><div><b>' + esc(l.t) + '</b>' + (l.d ? '<br><small>' + esc(l.d) + '</small>' : '') + '</div></div>'; });
    if (r.ofertas) h += bloco(r.ofertas);
    if (r.botoes && r.botoes.length) h += '<div class="pfwa-bots">' + r.botoes.map(function (b) { return '<button data-acao="' + esc(b.acao) + '" data-arg="' + esc(b.arg || '') + '">' + esc(b.rot) + '</button>'; }).join('') + '</div>';
    if (r.k) {
      var am = new Date(Date.now() + 86400000), iso = am.getFullYear() + '-' + String(am.getMonth() + 1).padStart(2, '0') + '-' + String(am.getDate()).padStart(2, '0');
      h += '<div class="pfwa-bloco"><div class="pfwa-bt">⏰ Próxima ação (aparece no Meu dia)</div><div style="display:flex;gap:6px"><input type="date" class="pfwa-lemb-d" value="' + iso + '"><input class="pfwa-lemb-t" placeholder="Ex.: cobrar a cotação"></div><button class="pfwa-btn" style="margin-top:6px" data-acao="lembrete" data-arg="' + esc(r.k) + '">Marcar</button></div>';
      if (r.prontas && r.prontas.length) h += '<div class="pfwa-bloco pfwa-prontas"><div class="pfwa-bt">⚡ Respostas prontas</div>' + r.prontas.map(function (p, i) { return '<div class="pfwa-it pfwa-cl" data-acao="pronta" data-arg="' + i + '"><b>' + esc(p.t) + '</b><br><small>' + esc(p.txt) + '</small></div>'; }).join('') + '</div>';
      h += '<div class="pfwa-bloco"><div class="pfwa-bt">📝 Registrar na ficha do CRM</div><textarea class="pfwa-nota" placeholder="Ex.: pediu cotação do kit de vedação, retorno amanhã"></textarea><button class="pfwa-btn pfwa-verde" data-acao="registrar" data-arg="' + esc(r.k) + '">Registrar</button></div>';
    }
    return h;
  }
  function htmlHist() { var r = resp; if (!r || !r.achou) return htmlCli(); return cabCliente(r) + (r.hist || []).map(bloco).join(''); }
  function htmlPecas() {
    var r = resp, h = '<div class="pfwa-bt">📦 Saldo de um código</div><div style="display:flex;gap:6px"><input class="pfwa-saldo-in" placeholder="Código (ou selecione na conversa)" value="' + esc(saldoR ? saldoR.cod : '') + '"><button class="pfwa-btn" data-acao="saldoBusca">Ver</button></div>';
    if (saldoR) {
      if (saldoR.carregando) h += '<div class="pfwa-nada">Buscando…</div>';
      else if (saldoR.erro) h += '<div class="pfwa-nada">O PF não respondeu.</div>';
      else if (!saldoR.itens.length) h += '<div class="pfwa-nada">Não achei ' + esc(saldoR.cod) + ' no estoque.</div>';
      else h += saldoR.itens.map(function (f) { return '<div class="pfwa-it"><b>' + esc(f.cod) + ' · ' + esc(f.marca) + '</b> — <span class="' + (f.saldo > 0 ? 'ok' : 'no') + '">' + (f.saldo > 0 ? '✔ ' + f.saldo : '✖ 0') + '</span><br><small>' + esc(f.desc) + '</small></div>'; }).join('');
    }
    if (r && r.achou) h += (r.pecas || []).map(bloco).join('');
    return h;
  }
  function pintaCorpo() {
    if (!P) return; var c = P.querySelector('.pfwa-corpo'); if (!c) return;
    var sub = P.querySelector('.pfwa-cabsub'); if (sub) sub.textContent = resp && resp.achou ? (resp.tipo === 'cliente' ? 'Cliente' : 'Fornecedor') + (resp.pelo ? ' (pelo ' + resp.pelo + ')' : '') : '';
    var v = vazioHtml(); var foco = document.activeElement && P.contains(document.activeElement) ? document.activeElement.className : '';
    // 2.1 - código do WhatsApp (entre parênteses) que não existe no PF: avisa pra cadastrar com o mesmo código
    var banner = (resp && resp.codFalta) ? '<div class="pfwa-codf">📇 Código <b>' + esc(resp.codFalta) + '</b> (do WhatsApp) não está no PF. Cadastre o cliente com esse mesmo código.<button data-acao="cadcli" data-arg="' + esc(resp.codFalta) + '">➕ Cadastrar no PF</button></div>' : '';
    if (ajuda) { c.innerHTML = htmlAjuda(); return; }
    c.innerHTML = banner + (v || (aba === 'cot' ? htmlCot() : aba === 'cli' ? htmlCli() : aba === 'hist' ? htmlHist() : htmlPecas()));
    var ta = c.querySelector('.pfwa-resp'); if (ta) ta.oninput = function () { if (cot) cot.resposta = ta.value; };
    var si = c.querySelector('.pfwa-saldo-in'); if (si) si.onkeydown = function (e) { if (e.key === 'Enter') buscarSaldo(si.value); };
    if (foco) { var f = c.querySelector('.' + foco.split(' ')[0]); if (f) f.focus(); }
  }
  // 3.3 - A pedido do Vitor ("vamos arrumar um outro lugar… assim no meio da tela não está legal… hoje uso o JBoss… e coloca um jeito de desligar"):
  // o aviso amarelo largo em cima da conversa SAIU. Agora é só uma bolinha laranja com o nº de códigos no botão 📄 da coluna/barra do PF
  // (ou no "PF" minimizado). Desligar = 🔔 no cabeçalho do painel (vira 🔕) — e o clique direito na bolinha também desliga.
  var avisoN = 0;
  function marcaCot() {
    if (!B) return; var el = B.querySelector('.pri'); if (!el) return;
    var on = avisoN > 0 && avisoLigado && avisoFechado !== ultimo && !(aberto && aba === 'cot' && cot);
    el.classList.toggle('pfwa-temcot', on);
    if (on) { el.setAttribute('data-n', avisoN > 9 ? '9+' : String(avisoN)); el.title = 'O PF achou ' + avisoN + ' código' + (avisoN > 1 ? 's' : '') + ' nas mensagens — clique pra cotar · botão direito: desligar este aviso'; }
    else el.removeAttribute('data-n');
    el.oncontextmenu = on ? function (ev) { ev.preventDefault(); ev.stopPropagation(); avisoLigado = false; chrome.storage.local.set({ avisoLigado: false }); marcaCot(); pinta(); } : null;
  }
  function pintaAviso(n) {
    avisoN = n || 0; if (AV) AV.style.display = 'none'; marcaCot();
  }
  // 1.9 - BUG (Vitor: foto aberta em tela cheia ficava com o aviso e o botão "PF" por cima): se alguma coisa do WhatsApp cobre a conversa
  // (foto, vídeo, documento, janela), esconde os avisos e os botões da extensão até fechar.
  var MEUS = '#pfwa,#pfwa-bots,#pfwa-aviso,#pfwa-of,#pfwa-ja,#pfwa-st,#pfwa-vf,#pfwa-menu,#pfwa-rail,#pfwa-svb,#pfwa-sv';
  // 2.8 - BUG (Vitor: documento/PDF aberto no WhatsApp ainda ficava com o aviso e o "PF" por cima): o visualizador do WhatsApp nem sempre
  // aparece no elementsFromPoint (partes com pointer-events:none). Agora também conta janela aberta (dialog/aria-modal) e imagem/vídeo/canvas
  // GRANDE fora da conversa e da lista (foto, documento, vídeo em tela cheia).
  function telaPorCima() {
    var vw = window.innerWidth, vh = window.innerHeight;
    var dl = document.querySelectorAll('[role="dialog"],[aria-modal="true"],[data-animate-media-viewer],[data-testid*="media-viewer"],[data-testid*="document-viewer"]');
    for (var i = 0; i < dl.length; i++) { var d = dl[i]; if (d.closest(MEUS)) continue; var q = d.getBoundingClientRect(); if (q.width > vw * 0.4 && q.height > vh * 0.4) return true; }
    var md = document.querySelectorAll('img,video,canvas');
    for (var j = 0; j < md.length; j++) {
      var m = md[j]; if (m.closest(MEUS) || m.closest('#main') || m.closest('#pane-side')) continue;
      var w = m.getBoundingClientRect(); if (w.width > vw * 0.3 && w.height > vh * 0.4 && w.bottom > 0 && w.top < vh) { var st = getComputedStyle(m); if (st.visibility !== 'hidden' && st.opacity !== '0') return true; }
    }
    return false;
  }
  function conversaCoberta() {
    var main = $('#main'); if (!main) return false;
    if (telaPorCima()) return true;
    var r = main.getBoundingClientRect(); if (r.width < 50 || r.height < 50) return false;
    var pts = [[r.left + r.width / 2, r.top + r.height / 2], [r.left + 40, r.top + r.height * 0.35], [r.right - 40, r.top + r.height * 0.65]];
    for (var i = 0; i < pts.length; i++) {
      var els = document.elementsFromPoint(pts[i][0], pts[i][1]) || [];
      var el = els.find(function (e) { return !e.closest(MEUS); });
      if (el && !main.contains(el)) return true;
    }
    return false;
  }
  function marcarCoberta() { var cob = conversaCoberta(); document.documentElement.classList.toggle('pfwa-coberto', cob); return cob; }
  setInterval(marcarCoberta, 400);
  // 3.2 - aviso de conectado ("vamos colocar algum aviso de conectado"): pergunta ao fundo se a aba do PF responde (a cada 10 s e ao voltar pra aba)
  var conEst = '';
  function conPintar(st) {
    conEst = st; document.documentElement.setAttribute('data-pfwa-con', st);
    var txt = st === 'ok' ? '● Conectado' : st === 'f5' ? '● Dê F5 no PF' : st === 'f5w' ? '● Dê F5 nesta aba' : st === 'off' ? '● PF fechado' : '…';
    var tit = st === 'ok' ? 'Tudo certo: o PartsFlow está respondendo.' : st === 'f5' ? 'A aba do PartsFlow está aberta mas não responde — dê F5 nela.' : st === 'f5w' ? 'A extensão foi atualizada — dê F5 nesta aba do WhatsApp.' : 'Abra o PartsFlow (logado) numa aba deste Chrome.';
    document.querySelectorAll('.pfwa-con').forEach(function (e) { e.textContent = txt; e.title = tit; e.setAttribute('data-st', st); });
  }
  async function conChecar() { var r = await msg({ t: 'pfStatus' }); conPintar(r && r.erro === 'recarregar' ? 'f5w' : r && r.ok ? 'ok' : r && r.temAba ? 'f5' : 'off'); }
  conChecar(); setInterval(conChecar, 10000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) conChecar(); });
  setInterval(function () { var e = document.querySelector('.pfwa-con'); if (e && e.getAttribute('data-st') !== conEst && conEst) conPintar(conEst); }, 1500);
  // 2.7 - 👤+ Salvar contato rápido (pedido do Vitor: "do lado do contato… um botão de salvar o contato do cliente mais rápido, igual tem no Watidy").
  // Botão verde logo depois do nome da conversa → quadrinho Nome / Empresa (sugere clientes do PF) / Código do JBoss → nome no padrão
  // "Fulano - Empresa (código)" → grava no PF (contatos do WhatsApp + contato no cadastro do cliente) e, se o número ainda não está salvo,
  // oferece o "Adicionar aos contatos" do próprio WhatsApp (salva no celular) já com o nome.
  var SV = null, SVB = null, svAberto = false, svSug = [], svK = '', svT = null;
  function nomeEl() { var h = $('#main header'); return h ? (h.querySelector('span[dir="auto"][title]') || h.querySelector('span[dir="auto"]')) : null; }
  function svPos() {
    if (!SVB) return; var c = contatoAt, el = nomeEl();
    if (!c || c.grupo || !el || document.documentElement.classList.contains('pfwa-coberto')) { SVB.style.display = 'none'; if (SV) SV.style.display = 'none'; svAberto = false; return; }
    var r = el.getBoundingClientRect(); if (!r.width) { SVB.style.display = 'none'; return; }
    SVB.style.display = 'flex'; SVB.style.left = Math.round(r.right + 8) + 'px'; SVB.style.top = Math.round(r.top + r.height / 2 - 13) + 'px';
    SVB.title = (resp && resp.achou && resp.tipo === 'cliente') ? 'Salvar / acertar este contato (' + (resp.titulo || '') + ')' : 'Salvar este contato no PF';
    SVB.classList.toggle('ok', !!(resp && resp.achou));
    if (SV && svAberto) { var tp = Math.round(r.bottom + 14); SV.style.left = Math.max(8, Math.min(window.innerWidth - 360, r.left)) + 'px'; SV.style.top = tp + 'px'; SV.style.maxHeight = Math.max(200, window.innerHeight - tp - 12) + 'px'; }
  }
  // 2.9 - "P - Adailton - Cardan Brasil (1427) Cardan": a pessoa é o 1º pedaço com 3+ letras e a empresa é o ÚLTIMO pedaço (antes ia "Adailton - Cardan Brasil Cardan")
  function svPartes(n) { return String(n || '').replace(/\s*\(\s*\d+\s*\)\s*/g, ' ').trim().split(/\s+[-–—]\s+/).map(function (s) { return s.trim(); }).filter(Boolean); }
  function svNomeBase(n) { n = String(n || '').trim(); if (/^[+\d\s()\-]{8,}$/.test(n)) return ''; var p = svPartes(n); if (p.length > 2) { var q = p.slice(0, -1).filter(function (s) { return s.replace(/[^A-Za-zÀ-ú]/g, '').length >= 3; }); if (q.length) return q[0]; } return p[0] || ''; }
  function svEmpBase(n) { var p = svPartes(n); return p.length > 1 ? p[p.length - 1] : ''; }
  function svCodBase(n) { var m = String(n || '').match(/\(\s*(\d{2,8})\s*\)/); return m ? m[1] : ''; }
  function svMontar() {
    var n = (SV.querySelector('.sv-nome') || {}).value || '', e = (SV.querySelector('.sv-emp') || {}).value || '', c = (SV.querySelector('.sv-cod') || {}).value || '';
    return [n.trim(), e.trim() ? ' - ' + e.trim() : '', c.trim() ? ' (' + c.trim().replace(/\D/g, '') + ')' : ''].join('').trim();
  }
  function svPrev() { var p = SV && SV.querySelector('.sv-prev'); if (p) p.textContent = svMontar() || '—'; }
  function svAbrir() {
    var c = contatoAt; if (!c || c.grupo) return;
    var r = resp && resp.achou && resp.tipo === 'cliente' ? resp : null;
    svK = r ? r.k : ''; svSug = [];
    var nome = svNomeBase(c.nome) || (r && r.contato) || '', emp = svEmpBase(c.nome) || (r ? r.titulo : ''), cod = svCodBase(c.nome) || (r && r.cod) || '';
    var semNum = /^[+\d\s()\-]{8,}$/.test(c.nome || '');
    SV.innerHTML = '<div class="sv-cab"><b>👤 Salvar contato</b><span class="sv-x" data-acao="svFechar" title="Fechar">✕</span></div>' +
      '<div class="sv-tel">📱 ' + esc(c.tel ? fmtTel(c.tel) : 'número não aparece na conversa') + '</div>' +
      '<label>NOME DA PESSOA<input class="sv-nome" value="' + esc(nome) + '" placeholder="Ex.: Tiago"></label>' +
      '<label>EMPRESA (cliente do PF)<input class="sv-emp" value="' + esc(emp) + '" placeholder="Digite pra procurar no PF" autocomplete="off"></label><div class="sv-sug"></div>' +
      '<label>CARGO<input class="sv-cargo" value="' + esc((r && r.cargo) || '') + '" placeholder="Ex.: Compras, Dono, Mecânico" list="pfwa-sv-cargos"></label>' +
      '<datalist id="pfwa-sv-cargos"><option>Compras<option>Comprador<option>Dono<option>Sócio<option>Gerente<option>Financeiro<option>Mecânico<option>Encarregado<option>Vendedor<option>Balconista</datalist>' +
      '<label>CÓDIGO NO JBOSS<input class="sv-cod" value="' + esc(cod) + '" placeholder="Ex.: 12662" inputmode="numeric"></label>' +
      '<label>CNPJ <span style="font-weight:600;text-transform:none">(cliente novo entra como pré-cadastro 🌱)</span><input class="sv-cnpj" value="" placeholder="00.000.000/0000-00" inputmode="numeric"></label>' +
      '<div class="sv-pv">Vai ficar: <b class="sv-prev"></b></div>' +
      '<div class="sv-k">' + (svK && r && r.titulo ? '🔗 ligado a <b>' + esc(r.titulo) + '</b>' : '') + '</div>' +
      '<div class="sv-bts"><button class="sv-ok" data-acao="svSalvar">💾 Salvar no PF</button>' + (semNum ? '<button class="sv-wa" data-acao="svWa">📱 + salvar no celular</button>' : '') + '</div>' +
      '<div class="sv-st"></div>';
    SV.style.display = 'block'; svAberto = true; svPos(); svPrev();
    ['sv-nome', 'sv-emp', 'sv-cod'].forEach(function (k) { var i = SV.querySelector('.' + k); if (i) i.oninput = function () { svPrev(); if (k === 'sv-emp' || (k === 'sv-cod' && !svK)) { if (k === 'sv-emp') { svK = ''; SV.querySelector('.sv-k').innerHTML = ''; } clearTimeout(svT); svT = setTimeout(function () { svBuscar(i.value); }, 250); } }; });
    var cnI = SV.querySelector('.sv-cnpj'); if (cnI) cnI.oninput = function () { var d = cnI.value.replace(/\D/g, '').slice(0, 14); cnI.value = d.length === 14 ? d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5') : d; };
    var f = SV.querySelector(nome ? '.sv-emp' : '.sv-nome'); if (f) f.focus();
  }
  async function svBuscar(q) {
    var box = SV.querySelector('.sv-sug'); if (!box) return;
    if (String(q || '').trim().length < 3 && !/^\d{2,}$/.test(String(q || '').trim())) { box.innerHTML = ''; return; }
    var r = await msg({ t: 'acao', acao: 'clientesSugerir', arg: { q: q } });
    svSug = (r && r.l) || [];
    box.innerHTML = svSug.map(function (s, i) { return '<div class="sv-it" data-acao="svUsar" data-arg="' + i + '"><b>' + esc(s.razao) + '</b><small>' + esc([s.codigo ? 'cód. ' + s.codigo : '', s.cidade].filter(Boolean).join(' · ')) + '</small></div>'; }).join('');
  }
  function svUsar(i) {
    var s = svSug[+i]; if (!s) return; svK = s.k;
    var e = SV.querySelector('.sv-emp'); if (e) e.value = s.curto || s.razao;
    var c = SV.querySelector('.sv-cod'); if (c && !c.value && s.codigo) c.value = String(s.codigo).replace(/^0+/, '');
    SV.querySelector('.sv-sug').innerHTML = ''; SV.querySelector('.sv-k').innerHTML = '🔗 ligado a <b>' + esc(s.razao) + '</b>'; svPrev();
  }
  // 2.8 - A pedido do Vitor ("quando eu cadastrar um contato que no PartsFlow não tem cadastrado, quero poder já salvar contato e cargo, pra já
  // ficar no cadastro do cliente"): campo CARGO e, se a empresa não está no PF, "➕ Criar cliente no PF" (cadastro mínimo com o contato + cargo).
  async function svSalvar(b, criar) {
    var c = contatoAt; if (!c) return; var nomeFull = svMontar(); if (!nomeFull) { flash(b, 'Escreva o nome'); return; }
    var v = function (k) { return (SV.querySelector('.' + k) || {}).value || ''; };
    if (criar && !v('sv-emp').trim()) { flash(b, 'Escreva a empresa'); return; }
    var txt = b.textContent; b.disabled = true; b.textContent = 'Salvando…';
    var cn = v('sv-cnpj').replace(/\D/g, ''); if (cn && cn.length !== 14 && cn.length !== 11) { flash(b, 'CNPJ incompleto'); b.disabled = false; b.textContent = txt; return; }
    if (cn) b.textContent = 'Buscando o CNPJ…';
    var r = await msg({ t: 'acao', acao: 'salvarContato', arg: { tel: c.tel, nomeWa: c.nome, nome: nomeFull, pessoa: v('sv-nome'), cargo: v('sv-cargo'), k: svK, cod: v('sv-cod'), emp: v('sv-emp'), cnpj: cn, criar: !!criar } });
    b.disabled = false; b.textContent = txt;
    var st = SV.querySelector('.sv-st');
    if (r && r.ok) {
      if (r.k && r.cli) { svK = r.k; SV.querySelector('.sv-k').innerHTML = '🔗 ligado a <b>' + esc(r.cli) + '</b>'; }
      st.innerHTML = r.cli ? ('✔ Salvo · ' + (r.prospect ? '🌱 pré-cadastro <b>' + esc(r.cli) + '</b> criado no PF' + (r.base ? ' (dados da Receita)' : '') + ' com o contato' : r.cnpjJa ? 'esse CNPJ já era de <b>' + esc(r.cli) + '</b> — contato salvo lá' : r.novo ? 'cliente <b>' + esc(r.cli) + '</b> criado no PF com o contato' : 'contato' + (v('sv-cargo') ? ' (' + esc(v('sv-cargo')) + ')' : '') + ' no cadastro de <b>' + esc(r.cli) + '</b>') + '. <span class="sv-lk" data-acao="svCadAbrir">abrir o cadastro ›</span>')
        : ('✔ Salvo no PF. <span style="color:#9A6B00">A empresa não está no PF.</span><br><button class="sv-ok sv-cria" data-acao="svCriar">➕ Criar cliente "' + esc(v('sv-emp') || '?') + '" no PF</button>');
      ultimo = '';
    }
    else st.textContent = 'Não deu — abra o PartsFlow numa aba.';
  }
  // abre o "Adicionar aos contatos" do WhatsApp e escreve o nome (o WhatsApp salva no celular)
  function svWa() {
    var nomeFull = svMontar();
    var bt = Array.prototype.find.call(document.querySelectorAll('#main button, #main [role="button"]'), function (x) { return /adicionar aos contatos|add to contacts/i.test(x.textContent || ''); });
    var st = SV.querySelector('.sv-st');
    if (!bt) { st.innerHTML = 'Não achei o "Adicionar aos contatos" do WhatsApp nesta conversa (só aparece pra número não salvo).'; return; }
    try { navigator.clipboard.writeText(nomeFull); } catch (e) { }
    bt.click();
    var n = 0, tm = setInterval(function () {
      n++; var inp = Array.prototype.find.call(document.querySelectorAll('input[type="text"], div[contenteditable="true"]'), function (x) { return !x.closest('#pfwa,#pfwa-sv,#main footer') && x.getBoundingClientRect().width > 0; });
      if (inp || n > 20) {
        clearInterval(tm);
        if (inp) {
          inp.focus();
          if (inp.tagName === 'INPUT') { var set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(inp, nomeFull); inp.dispatchEvent(new Event('input', { bubbles: true })); }
          else { try { document.execCommand('insertText', false, nomeFull); } catch (e) { } }
          st.innerHTML = '📱 Abri o "Adicionar aos contatos" com o nome — confira e salve.';
        } else st.innerHTML = '📱 Abri o "Adicionar aos contatos". O nome está copiado: cole (Ctrl+V) no campo do nome.';
      }
    }, 150);
  }
  function fmtTel(t) { t = String(t || '').replace(/\D/g, ''); if (t.length >= 12 && t.indexOf('55') === 0) t = t.slice(2); if (t.length === 11) return '(' + t.slice(0, 2) + ') ' + t.slice(2, 7) + '-' + t.slice(7); if (t.length === 10) return '(' + t.slice(0, 2) + ') ' + t.slice(2, 6) + '-' + t.slice(6); return t; }
  function posicionar() {
    svPos();
    marcarCoberta();
    var main = $('#main'); if (!B) return;
    if (!main || !contatoAt) { B.style.display = 'none'; if (AV) AV.style.display = 'none'; if (OF) OF.style.display = 'none'; if (JA) JA.style.display = 'none'; if (VF) VF.style.display = 'none'; return; }
    var r = main.getBoundingClientRect(), foot = main.querySelector('footer'), fh = foot ? foot.getBoundingClientRect().height : 62, hd = main.querySelector('header'), hh = hd ? hd.getBoundingClientRect().height : 60;
    B.className = (visual === 'D' ? 'pfwa-barra' : 'pfwa-coluna') + (botsMin ? ' pfwa-min' : ''); B.style.display = 'flex';
    if (botsMin) { B.innerHTML = '<span data-acao="botsToggle" class="pri pfwa-botspf" title="Mostrar os bot\u00f5es do PF">PF</span>'; }
    else { var tog = '<span data-acao="botsToggle" class="pfwa-botsx" title="Esconder os bot\u00f5es do PF">' + (visual === 'D' ? '\u2039' : '\u2013') + '</span>'; B.innerHTML = tog + BOTOES.map(function (b, i) { return '<span data-acao="b-' + b[0] + '" class="' + (i === 0 ? 'pri' : '') + '" title="' + b[2] + '">' + b[1] + (visual === 'D' ? ' ' + b[2] : '') + '</span>'; }).join(''); }
    marcaCot();
    if (visual === 'D') { B.style.left = (r.left + r.width / 2) + 'px'; B.style.top = (r.bottom - fh - 58) + 'px'; }
    else { B.style.left = (r.left + 12) + 'px'; B.style.top = (r.top + hh + 70) + 'px'; }
    if (AV) { AV.style.left = (r.left + 70) + 'px'; AV.style.width = Math.max(260, r.width - 140) + 'px'; AV.style.top = (r.top + hh + 10) + 'px'; }
    if (OF) { OF.style.left = (r.left + 70) + 'px'; OF.style.width = Math.max(300, Math.min(560, r.width - 140)) + 'px'; OF.style.top = (r.top + hh + (AV && AV.style.display === 'flex' ? 64 : 10)) + 'px'; }
    if (JA) { JA.style.left = (r.left + 16) + 'px'; JA.style.width = Math.max(300, r.width - 32) + 'px'; JA.style.bottom = (window.innerHeight - r.bottom + fh + 8) + 'px'; }
    if (VF && VF.style.display === 'flex') { VF.style.left = (r.left + 16) + 'px'; VF.style.width = Math.max(300, r.width - 32) + 'px'; VF.style.bottom = (window.innerHeight - r.bottom + fh + 8 + (JA && JA.style.display === 'flex' ? 70 : 0)) + 'px'; }
  }
  function contatoAtual() {
    var main = $('#main'); if (!main) return null;
    var h = main.querySelector('header'); if (!h) return null;
    var nomeEl = h.querySelector('span[dir="auto"][title]') || h.querySelector('span[dir="auto"]');
    var nome = nomeEl ? (nomeEl.getAttribute('title') || nomeEl.textContent || '').trim() : '';
    var tel = '';
    var ids = main.querySelectorAll('[data-id]');
    for (var i = 0; i < ids.length && !tel; i++) { var m = (ids[i].getAttribute('data-id') || '').match(/(\d{8,15})@c\.us/); if (m) tel = m[1]; }
    if (!tel && /^[+\d\s()-]{8,}$/.test(nome)) tel = nome.replace(/\D/g, '');
    var grupo = !!main.querySelector('[data-id*="@g.us"]');
    return { nome: nome, tel: tel, grupo: grupo };
  }
  async function vigiar() {
    montar();
    var s = await chrome.storage.local.get(['lote']); var L = s.lote, lt = '';
    if (L && !L.fim) { var n = L.itens.length, f = L.itens.filter(function (x) { return x.st === 'ok' || x.st === 'erro'; }).length; lt = '📤 Mandando ' + Math.min(f + 1, n) + ' de ' + n + (L.titulo ? ' · ' + esc(L.titulo) : '') + ' — não feche esta aba <button data-acao="parar">Parar</button>'; }
    if (lt !== statusLote) { statusLote = lt; var el = P.querySelector('.pfwa-lote'); el.innerHTML = lt; el.style.display = lt ? 'block' : 'none'; }
    var c = contatoAtual(); contatoAt = c;
    var chave = c ? (c.grupo ? 'g:' + c.nome : c.tel + '|' + c.nome) : '';
    posicionar();
    var nCod = c && !c.grupo ? pareceCotacao(lerMensagens()) : 0;
    statusVigiar();
    if (chave === ultimo) { pintaAviso(nCod); ofertasVigiar(); digitandoVigiar(); verificarVigiar(); return; }
    ultimo = chave; cot = null; cotErro = ''; saldoR = null; ofPend = []; ofSig = ''; jaR = null; digAnt = ''; jaFechado = ''; vfR = null; vfSig = ''; pintaOferta(); pintaJa(); pintaVf();
    if (!c) { resp = null; pinta(); pintaAviso(0); return; }
    if (c.grupo) { resp = { grupo: 1 }; pinta(); return; }
    resp = null; pinta();
    var r = await msg({ t: 'quem', tel: c.tel, nome: c.nome });
    if (chave !== ultimo) return; resp = r || { erro: 'semPF' };
    if (aba === 'cli' && resp.tipo !== 'cliente' && resp.tipo !== 'fornecedor') aba = 'cot';
    pinta(); pintaAviso(nCod); ofertasVigiar();
  }

  // ═══ 💡 OFERTAS (1.8) ═══
  // Você ofereceu algo (peça, família, marca) e o cliente respondeu → cartão pra salvar a resposta na ficha (1 clique).
  var RESP = [['quer', '👍', 'Quer'], ['pensa', '🤔', 'Vai pensar'], ['agoranao', '👎', 'Agora não'], ['caro', '💲', 'Achou caro'], ['naousa', '🚫', 'Não usa'], ['outro', '🏷️', 'Compra de outro']];
  async function ofertasVigiar() {
    if (!resp || resp.tipo !== 'cliente' || !resp.k || !contatoAt || contatoAt.grupo) { if (ofPend.length) { ofPend = []; pintaOferta(); } return; }
    var ms = lerMensagens(); var sig = ultimo + '|' + ms.length + '|' + (ms.length ? ms[ms.length - 1].t.slice(-60) : '');
    if (sig === ofSig) return; ofSig = sig;
    var ch = ultimo;
    var r = await msg({ t: 'acao', acao: 'ofertasConversa', arg: { k: resp.k, msgs: ms } });
    if (ch !== ultimo || !r || !Array.isArray(r.pend)) return;
    ofPend = r.pend.filter(function (o) { return !ofIgn[o.h]; });
    pintaOferta();
  }
  function pintaOferta() {
    if (!OF) return; var o = ofPend[0];
    if (!o || !contatoAt) { OF.style.display = 'none'; return; }
    var sel = ofSel[o.h] || o.sug || '';
    var nomes = o.alvos.map(function (a) { return a.nome; }).join(' · ');
    OF.style.display = 'block';
    OF.innerHTML = '<div class="pfwa-of-t">💡 <b>Você ofereceu:</b> ' + esc(nomes) + (ofPend.length > 1 ? ' <small>(+' + (ofPend.length - 1) + ')</small>' : '') + '</div>' +
      '<div class="pfwa-of-r">Ele: <i>"' + esc(o.resposta.slice(0, 140)) + '"</i></div>' +
      (o.ja && o.ja.length ? '<div class="pfwa-of-ja">↺ já tinha oferecido em ' + esc(o.ja[0].quando) + ' — ' + esc(o.ja[0].resp) + (o.ja[0].motivo ? ': ' + esc(o.ja[0].motivo) : '') + '</div>' : '') +
      '<div class="pfwa-of-chips">' + RESP.map(function (x) { return '<span data-acao="ofResp" data-arg="' + x[0] + '" class="' + (sel === x[0] ? 'on' : '') + '">' + x[1] + ' ' + x[2] + '</span>'; }).join('') + '</div>' +
      '<div class="pfwa-of-l"><input class="pfwa-of-mot" placeholder="O que ele disse (opcional)" value="' + esc(o.resposta.slice(0, 120)) + '">' +
      '<select class="pfwa-of-lemb" title="Lembrar de oferecer de novo (vira próxima ação no Meu dia)"><option value="">não lembrar</option><option value="3"' + (sel === 'pensa' ? ' selected' : '') + '>lembrar em 3 dias</option><option value="15">em 15 dias</option><option value="30">em 30 dias</option><option value="60">em 60 dias</option><option value="90">em 90 dias</option></select></div>' +
      '<div class="pfwa-of-b"><button data-acao="ofSalvar" class="pfwa-of-ok">Salvar na ficha</button><button data-acao="ofIgnorar" class="pfwa-of-no">Não é oferta</button></div>';
    posicionar();
  }
  // ⚠ enquanto digita: já ofereceu isso pra ele?
  async function digitandoVigiar() {
    var cx = caixaTexto(); var t = cx ? (cx.innerText || '').trim() : '';
    if (t === digAnt) return; digAnt = t;
    if (t.length < 4 || !resp || resp.tipo !== 'cliente' || !resp.k) { jaR = null; pintaJa(); return; }
    var r = await msg({ t: 'acao', acao: 'ofertaChecar', arg: { k: resp.k, texto: t } });
    if (t !== digAnt) return; jaR = r && r.ja && r.ja.length ? r : null; pintaJa();
  }
  function pintaJa() {
    if (!JA) return;
    if (!jaR || !digAnt || jaFechado === digAnt) { JA.style.display = 'none'; return; }
    JA.style.display = 'flex';
    JA.innerHTML = '<span class="pfwa-ja-i">⚠</span><div><b>Você já ofereceu isso pra ele</b>' + jaR.ja.map(function (j) { return '<div>• ' + esc(j.nomes) + ' — <b>' + esc(j.quando) + '</b> (' + esc(j.dias === 0 ? 'hoje' : 'há ' + j.dias + ' dias') + ') · ' + esc(j.resp) + (j.motivo ? ': "' + esc(j.motivo.slice(0, 90)) + '"' : '') + (j.canal && j.canal !== 'whats' ? ' · ' + esc(j.canal) : '') + '</div>'; }).join('') + '</div><span data-acao="jaX" class="pfwa-avx" title="Fechar">✕</span>';
    posicionar();
  }

  // ═══ 📌 "VOU VERIFICAR DEPOIS" → pendência automática (2.2) ═══
  // Quando a ÚLTIMA mensagem que VOCÊ mandou é uma frase de "vou verificar / deixa eu ver no catálogo / vou checar com o fornecedor",
  // o PF cria sozinho uma pendência (cliente + o que ele pediu + códigos) e aparece um cartão "📌 Anotei — desfazer".
  async function verificarVigiar() {
    if (!contatoAt || contatoAt.grupo) { if (vfR) { vfR = null; pintaVf(); } return; }
    var ms = lerMensagens(); if (!ms.length) return;
    var last = ms[ms.length - 1];
    if (!last.eu || !VERIF_RE.test(last.t)) return;
    var sig = ultimo + '|' + ms.length + '|' + last.t.slice(0, 80);
    if (sig === vfSig) return; vfSig = sig;
    var ch = ultimo;
    var r = await msg({ t: 'acao', acao: 'verificar', arg: { k: resp && resp.k, nome: contatoAt.nome, texto: last.t, msgs: ms } });
    if (ch !== ultimo || !r || !r.ok) return;
    if (r.jaTinha) { vfR = null; pintaVf(); return; }
    vfR = r; pintaVf();
  }
  function pintaVf() {
    if (!VF) return;
    if (!vfR || !contatoAt) { VF.style.display = 'none'; return; }
    VF.style.display = 'flex';
    VF.innerHTML = '<span class="pfwa-vf-i">📌</span><div><b>Anotei pra você verificar</b><br><small>' + esc(vfR.resumo || '') + ' — vai pras Pendências, ☀️ Meu dia e ficha</small></div><button data-acao="vfDesfazer" data-arg="' + esc(vfR.id) + '">desfazer</button><span data-acao="vfX" class="pfwa-avx" title="Fechar">✕</span>';
    posicionar();
  }

  // ═══ 📢 STATUS (1.8) ═══
  // O PF manda a imagem; aqui abre Status → ＋ → coloca a imagem e a legenda e PARA (você confere e aperta enviar).
  var stRodando = false;
  function stMostra(html, tipo) { if (!ST) return; ST.className = tipo || ''; ST.style.display = 'block'; ST.innerHTML = '<span data-acao="stX" class="pfwa-avx" style="float:right">✕</span>' + html; }
  function clicarEl(el) { if (!el) return false; var b = el.closest('button,[role="button"],a') || el; ['mousedown', 'mouseup', 'click'].forEach(function (t) { b.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window })); }); return true; }
  function primeiro(sels, raiz) { for (var i = 0; i < sels.length; i++) { var e = (raiz || document).querySelector(sels[i]); if (e) return e; } return null; }
  function porTexto(re, raiz) { var els = (raiz || document).querySelectorAll('[role="button"],button,li,[role="menuitem"],[role="listitem"] span,div[aria-label],span[title]'); for (var i = 0; i < els.length; i++) { var t = (els[i].getAttribute('aria-label') || els[i].getAttribute('title') || els[i].textContent || '').trim(); if (t.length < 60 && re.test(t)) return els[i]; } return null; }
  function botaoStatus() { return primeiro(['[aria-label="Status"]', '[title="Status"]', '[data-icon="status-refreshed"]', '[data-icon="status-outline"]', '[data-icon="status"]', '[data-icon="wds-ic-status"]', '[data-navbar-item-index="1"]']); }
  function botaoAddStatus() { return primeiro(['[aria-label="Adicionar status"]', '[aria-label="Add status"]', '[aria-label="Add Status"]', '[title="Adicionar status"]', '[data-icon="status-add"]', '[data-icon="plus-rounded"]', '[data-icon="plus"]', '[data-icon="wds-ic-add"]']) || porTexto(/^(adicionar|novo) status|^add status|^meu status$|^my status$/i); }
  function inputImagem() { var l = document.querySelectorAll('input[type="file"]'); for (var i = 0; i < l.length; i++) { var a = l[i].getAttribute('accept') || ''; if (!a || /image/.test(a)) return l[i]; } return null; }
  function caixaLegenda() { var l = document.querySelectorAll('div[contenteditable="true"]'); for (var i = 0; i < l.length; i++) { var e = l[i]; if (e.closest('#side') || e.closest('#main footer') || e.closest('#pfwa')) continue; if (e.offsetParent) return e; } return null; }
  function dataUrlArquivo(u, nome) { var p = u.split(','), mime = (p[0].match(/:(.*?);/) || [])[1] || 'image/jpeg', bin = atob(p[1]), arr = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i); return new File([arr], nome, { type: mime }); }
  function baixarImagem(u, nome) { var a = document.createElement('a'); a.href = u; a.download = nome; document.body.appendChild(a); a.click(); setTimeout(function () { a.remove(); }, 300); }
  async function statusVigiar() {
    if (stRodando) return; var s = await chrome.storage.local.get(['statusPend']); var S = s.statusPend;
    if (!S || Date.now() - S.ts > 5 * 60000) return;
    stRodando = true; await chrome.storage.local.remove('statusPend');
    try { await postarStatus(S); } catch (e) { console.warn('PF status', e); falhaStatus(S, 'erro inesperado'); }
    stRodando = false;
  }
  function falhaStatus(S, onde) {
    baixarImagem(S.img, S.nome);
    stMostra('<b>📢 Não consegui abrir o Status sozinho</b> (' + esc(onde) + ').<br>A imagem foi <b>baixada</b> (pasta Downloads). Faça à mão: <b>Status → ＋ → Fotos e vídeos</b> e escolha <b>' + esc(S.nome) + '</b>.' + (S.legenda ? '<br>Legenda (já copiada): <i>' + esc(S.legenda) + '</i>' : ''), 'erro');
    if (S.legenda) try { navigator.clipboard.writeText(S.legenda); } catch (e) { }
  }
  async function postarStatus(S) {
    stMostra('📢 Abrindo o Status…');
    var ok = await esperar(function () { return $('#side') || botaoStatus(); }, 20000); if (!ok) return falhaStatus(S, 'WhatsApp Web não carregou');
    var bs = botaoStatus(); if (!bs) return falhaStatus(S, 'não achei o botão Status');
    clicarEl(bs); await dormir(1200);
    var inp = inputImagem();
    if (!inp) { var ad = await esperar(botaoAddStatus, 6000); if (!ad) return falhaStatus(S, 'não achei o ＋ do Status'); clicarEl(ad); await dormir(800);
      inp = await esperar(inputImagem, 3000);
      if (!inp) { var mf = porTexto(/fotos? e v[ií]deos?|photos? (&|and) videos?/i); if (mf) { /* não clica: abriria a janela de arquivos do computador */ } inp = await esperar(inputImagem, 2000); } }
    if (!inp) return falhaStatus(S, 'não achei onde colocar a foto');
    var f = dataUrlArquivo(S.img, S.nome), dt = new DataTransfer(); dt.items.add(f);
    inp.files = dt.files; inp.dispatchEvent(new Event('change', { bubbles: true }));
    var leg = await esperar(caixaLegenda, 8000);
    if (!leg) return falhaStatus(S, 'a tela de prévia do Status não abriu');
    if (S.legenda) { leg.focus(); try { document.execCommand('insertText', false, S.legenda); } catch (e) { } }
    stMostra('<b>📢 Status pronto!</b> Confira a imagem e a legenda e aperte o <b>✈ enviar</b> do WhatsApp pra publicar.', 'ok');
    setTimeout(function () { if (ST && ST.className === 'ok') ST.style.display = 'none'; }, 15000);
  }

  // ═══ 🧩 MENU DO PF em volta do WhatsApp (2.0) ═══
  // Barra de cima (filtros Clientes/Fornecedores, etiquetas do WhatsApp, Cotação aberta / Sem resposta + liga-desliga + cor),
  // coluna de ícones à esquerda (atalhos do PF) e etiquetas embaixo de cada conversa. Tudo some com o "Menu do PF" desligado.
  var PFM_CORES = ['#FDE68A', '#BFDBFE', '#BBF7D0', '#FBCFE8', '#DDD6FE', '#FED7AA', '#C7D2FE', '#A7F3D0'];
  function etqCor(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return PFM_CORES[h % PFM_CORES.length]; }
  function linhasLista() {
    var pane = $('#pane-side'); if (!pane) return [];
    var rows = pane.querySelectorAll('[role="listitem"]'); if (!rows.length) rows = pane.querySelectorAll('div[role="row"]');
    var out = [];
    rows.forEach(function (r) {
      var ne = r.querySelector('span[title]'); var nome = ne ? (ne.getAttribute('title') || '').trim() : ''; if (!nome) return;
      var tel = /^[+\d][\d\s()\-]{7,}$/.test(nome) ? nome.replace(/\D/g, '') : '';
      var etqs = []; r.querySelectorAll('[aria-label]').forEach(function (e) { var a = (e.getAttribute('aria-label') || '').trim(); var m = a.match(/^(?:Etiqueta|Label)[:\s]+(.+)$/i); if (m) { var t = m[1].trim(); if (t && etqs.indexOf(t) < 0) etqs.push(t); } });
      var unread = !!r.querySelector('[aria-label*="ão lida"],[aria-label*="ão lidas"],[aria-label*="nread"]');
      out.push({ el: r, nome: nome, tel: tel, etqs: etqs, unread: unread });
    });
    return out;
  }
  function carregarSituacoes() {
    if (!menuLig) return;
    clearTimeout(sitTimer);
    sitTimer = setTimeout(function () {
      var ls = linhasLista(); var sig = ls.map(function (x) { return x.nome; }).join('|');
      if (sig === sitSig && Object.keys(sitCache).length) { pintarMenu(); return; }
      sitSig = sig;
      msg({ t: 'acao', acao: 'situacoes', arg: { lista: ls.map(function (x) { return { nome: x.nome, tel: x.tel }; }) } }).then(function (r) { if (r && r.sit) sitCache = r.sit; pintarMenu(); });
    }, 500);
  }
  function badgesRender() {
    var pane = $('#pane-side');
    if (!menuLig || !pane) { document.querySelectorAll('.pfwa-rowb').forEach(function (e) { e.remove(); }); return; }
    linhasLista().forEach(function (x) {
      var host = x.el.querySelector('span[title]'); if (!host) return; host = host.parentElement; if (!host) return;
      // só a situação do PF — a etiqueta do WhatsApp o próprio WhatsApp já mostra na linha (não duplicar)
      var s = sitCache[x.nome] || {}, chips = [];
      if (s.tipo === 'cliente') chips.push('<span class="cli">🤝 cliente' + (s.cot ? ' · 📄 cot. ' + esc(s.cot) : '') + '</span>');
      else if (s.tipo === 'fornecedor') chips.push('<span class="forn">🏭 fornecedor' + (s.mapa ? ' · mapa ' + esc(s.mapa) : '') + '</span>');
      if (x.unread) chips.push('<span class="sem">⏳ sem resposta</span>');
      var b = host.querySelector(':scope > .pfwa-rowb');
      if (!chips.length) { if (b) b.remove(); return; }
      var html = chips.join('');
      if (!b) { b = document.createElement('div'); b.className = 'pfwa-rowb'; host.appendChild(b); }
      if (b.getAttribute('data-h') !== html) { b.innerHTML = html; b.setAttribute('data-h', html); }
    });
  }
  function aplicarFiltro() {
    var rows = document.querySelectorAll('#pane-side [role="listitem"]');
    if (!menuLig || !menuFiltro) { rows.forEach(function (r) { r.style.display = ''; }); return; }
    linhasLista().forEach(function (x) {
      var s = sitCache[x.nome] || {}, ok = false;
      if (menuFiltro === 'cliente') ok = s.tipo === 'cliente';
      else if (menuFiltro === 'fornecedor') ok = s.tipo === 'fornecedor';
      else if (menuFiltro === 'cot') ok = !!s.cot;
      else if (menuFiltro === 'semresp') ok = x.unread;
      else if (menuFiltro.indexOf('etq:') === 0) ok = x.etqs.indexOf(menuFiltro.slice(4)) >= 0;
      x.el.style.display = ok ? '' : 'none';
    });
  }
  function pintarMenu() {
    if (!MENU) return;
    var root = document.documentElement;
    root.classList.toggle('pfwa-menu', menuLig);
    root.classList.toggle('pfwa-menudisc', menuCor === 'discreta');
    if (!menuLig) {
      MENU.className = 'pfm-off'; MENU.style.right = 'auto'; MENU.style.display = 'flex';
      MENU.innerHTML = '<span class="pfm-offchip" data-acao="menuTog" title="Ligar o Menu do PF">🧩 Menu do PF ▸</span>';
      RAIL.style.display = 'none'; badgesRender(); aplicarFiltro(); return;
    }
    MENU.className = (menuCor === 'discreta' ? 'pfwa-disc' : ''); MENU.style.display = 'flex';
    MENU.style.right = root.classList.contains('pfwa-aberto') ? '380px' : '0';
    RAIL.style.display = 'flex';
    var ls = linhasLista(), nC = 0, nF = 0, nCot = 0, nSem = 0, etqN = {};
    ls.forEach(function (x) { var s = sitCache[x.nome] || {}; if (s.tipo === 'cliente') nC++; else if (s.tipo === 'fornecedor') nF++; if (s.cot) nCot++; if (x.unread) nSem++; x.etqs.forEach(function (e) { etqN[e] = (etqN[e] || 0) + 1; }); });
    var etqTop = Object.keys(etqN).sort(function (a, b) { return etqN[b] - etqN[a]; }).slice(0, 5);
    var pill = function (k, txt, n) { return '<span class="pfm-pill' + (menuFiltro === k ? ' on' : '') + '" data-acao="menuFiltro" data-arg="' + esc(k) + '">' + txt + (n != null ? ' <b>' + n + '</b>' : '') + '</span>'; };
    var h = '<span class="pfm-logo">PF</span>' + pill('', 'Tudo') + pill('cliente', '🤝 Clientes', nC) + pill('fornecedor', '🏭 Fornecedores', nF);
    etqTop.forEach(function (e) { h += pill('etq:' + e, esc(e), etqN[e]); });
    h += pill('cot', '📄 Cotação aberta', nCot) + pill('semresp', '⏳ Sem resposta', nSem);
    h += '<span class="pfm-dir"><span class="pfm-cor"><i data-acao="menuCor" data-arg="azul" class="' + (menuCor !== 'discreta' ? 'on' : '') + '">azul</i><i data-acao="menuCor" data-arg="discreta" class="' + (menuCor === 'discreta' ? 'on' : '') + '">discreta</i></span><span class="pfm-tog" data-acao="menuTog" title="Desligar o Menu do PF">Menu do PF <span class="pfm-sw"></span></span></span>';
    MENU.innerHTML = h;
    var rail = [['vendas', '📄', 'Cotações'], ['kanban', '🗂️', 'Quadro de vendas'], ['mesa', '🛒', 'Mesa do comprador'], ['home', '🏠', 'Início do PF'], ['ext', '🧩', 'PartsFlow no WhatsApp']];
    RAIL.innerHTML = rail.map(function (r) { return '<span data-acao="irTela" data-arg="' + r[0] + '" title="' + r[2] + '">' + r[1] + '</span>'; }).join('');
    badgesRender(); aplicarFiltro();
  }

  processarEnvio();
  setInterval(function () { vigiar().catch(function (e) { console.warn('PF', e); }); try { carregarSituacoes(); badgesRender(); aplicarFiltro(); } catch (e) { } }, 1500);
  window.addEventListener('resize', posicionar);
})();
