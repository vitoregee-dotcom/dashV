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
    if (!r || r.erro || !Array.isArray(r.nomes)) { flash(b, r && r.erro === 'semPF' ? 'Abra o PF numa aba deste Chrome' : 'Atualize o PF (F5) — versão nova'); return; }
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
  chrome.storage.local.get(['ofIgn'], function (s) { ofIgn = s.ofIgn || {}; });
  var BOTOES = [['cot', '📄', 'Cotar no PF'], ['saldo', '📦', 'Saldo'], ['ficha', '🤝', 'Ficha'], ['lemb', '⏰', 'Lembrete'], ['prontas', '⚡', 'Prontas'], ['pdf', '📤', 'PDF']];
  function logoSvg(f, l) { return '<svg width="24" height="24" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="' + f + '"/><rect x="9" y="8" width="4" height="22" rx="1.5" fill="' + l + '"/><path d="M13,8 Q26,8 26,14 Q26,20 13,20" fill="none" stroke="' + l + '" stroke-width="4" stroke-linecap="round"/><line x1="19" y1="20" x2="29" y2="32" stroke="#E67E22" stroke-width="2.5" stroke-linecap="round"/><circle cx="30" cy="33" r="2" fill="#E67E22"/></svg>'; }

  function montar() {
    if (P) return;
    P = document.createElement('div'); P.id = 'pfwa';
    P.innerHTML = '<div class="pfwa-aba" title="PartsFlow">PF</div><div class="pfwa-caixa"><div class="pfwa-cab">' + logoSvg('#fff', '#0F1F35') +
      '<div class="pfwa-cabt"><b>PartsFlow</b><span class="pfwa-ver">' + (VER ? 'v' + VER : '') + '</span><small class="pfwa-cabsub"></small></div><i class="pfwa-sino" data-acao="sino" title="Avisar quando o cliente manda códigos de cotação">🔔</i><span class="pfwa-vis" title="Onde ficam os botões do PF: A = coluna ao lado das mensagens · D = barra embaixo"><i data-vis="A">A</i><i data-vis="D">D</i></span><span class="pfwa-x" title="Recolher">›</span></div>' +
      '<div class="pfwa-lote"></div><div class="pfwa-tabs"></div><div class="pfwa-corpo"></div>'+
      '<div class="pfwa-rod"><button data-acao="importar" title="Lê a lista de conversas do WhatsApp Web e traz pro PF">📥 Importar meus contatos</button><button data-acao="numeros" class="pfwa-num" title="Abre cada conversa dos contatos salvos sem número, lê o número e grava no PF (só lê, não manda nada). Clique de novo pra parar.">📞 Buscar números que faltam</button><span class="pfwa-rodst"></span></div></div>';
    document.body.appendChild(P);
    B = document.createElement('div'); B.id = 'pfwa-bots'; document.body.appendChild(B);
    AV = document.createElement('div'); AV.id = 'pfwa-aviso'; document.body.appendChild(AV);
    OF = document.createElement('div'); OF.id = 'pfwa-of'; document.body.appendChild(OF);
    JA = document.createElement('div'); JA.id = 'pfwa-ja'; document.body.appendChild(JA);
    ST = document.createElement('div'); ST.id = 'pfwa-st'; document.body.appendChild(ST);
    P.querySelector('.pfwa-aba').onclick = function () { aberto = !aberto; chrome.storage.local.set({ painelAberto: aberto }); pinta(); };
    P.querySelector('.pfwa-x').onclick = function () { aberto = false; chrome.storage.local.set({ painelAberto: false }); pinta(); };
    P.querySelectorAll('[data-vis]').forEach(function (el) { el.onclick = function () { visual = el.getAttribute('data-vis'); chrome.storage.local.set({ visual: visual }); pinta(); }; });
    [P, B, AV, OF, JA, ST].forEach(function (el) { el.addEventListener('click', clique); });
    chrome.storage.local.get(['painelAberto', 'visual', 'avisoLigado', 'botsMin'], function (s) { if (s.painelAberto === false) aberto = false; if (s.visual === 'D' || s.visual === 'A') visual = s.visual; if (s.avisoLigado === false) avisoLigado = false; if (s.botsMin) botsMin = true; pinta(); });
  }
  function abrirPainel() { if (!aberto) { aberto = true; chrome.storage.local.set({ painelAberto: true }); } }
  function irAba(a) { aba = a; abrirPainel(); pinta(); }
  async function clique(e) {
    var b = e.target.closest('[data-acao]'); if (!b) return;
    var ac = b.getAttribute('data-acao'), arg = b.getAttribute('data-arg') || '';
    if (ac === 'aba') { irAba(arg); return; }
    if (ac === 'sino') { avisoLigado = !avisoLigado; chrome.storage.local.set({ avisoLigado: avisoLigado }); pinta(); if (!avisoLigado && AV) AV.style.display = 'none'; else vigiar(); return; }
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
    msg({ t: 'acao', acao: ac, arg: arg, focar: true });
  }
  function flash(b, t) { var o = b.textContent; b.textContent = t; setTimeout(function () { b.textContent = o; }, 2200); }

  async function cotar() {
    if (cotando) return; cotando = true; cotErro = ''; cot = null; pintaCorpo();
    var r = await msg({ t: 'acao', acao: 'cotar', arg: { k: resp && resp.k, contato: resp && resp.contato, msgs: lerMensagens() } });
    cotando = false;
    if (!r || r.erro) { cotErro = r && r.erro === 'semPF' ? 'Abra o PartsFlow numa aba deste Chrome (já logado).' : 'O PF não respondeu. Dê F5 na aba do PartsFlow.'; }
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
    msg({ t: 'acao', acao: 'abrirCot', focar: true, arg: { k: resp && resp.k, pdf: !!pdf, itens: cot.itens.filter(function (o) { return o.achou; }).map(function (o) { return { cod: o.cod, qtd: o.qtd, marca: o.marca, desc: o.desc }; }) } });
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
  function htmlCot() {
    var r = resp, h = '';
    if (r && r.achou) h += cabCliente(r);
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
    c.innerHTML = v || (aba === 'cot' ? htmlCot() : aba === 'cli' ? htmlCli() : aba === 'hist' ? htmlHist() : htmlPecas());
    var ta = c.querySelector('.pfwa-resp'); if (ta) ta.oninput = function () { if (cot) cot.resposta = ta.value; };
    var si = c.querySelector('.pfwa-saldo-in'); if (si) si.onkeydown = function (e) { if (e.key === 'Enter') buscarSaldo(si.value); };
    if (foco) { var f = c.querySelector('.' + foco.split(' ')[0]); if (f) f.focus(); }
  }
  function pintaAviso(n) {
    if (!AV) return;
    if (!n || !avisoLigado || avisoFechado === ultimo || (aberto && aba === 'cot' && cot)) { AV.style.display = 'none'; return; }
    AV.style.display = 'flex';
    AV.innerHTML = '<span>📄</span><div><b>O PF achou um pedido de cotação</b> — ' + n + ' código' + (n > 1 ? 's' : '') + ' nas mensagens</div><button data-acao="b-cot">📄 Cotar no PF</button><span class="pfwa-avx" data-acao="fechaAviso" title="Fechar">✕</span>';
  }
  function posicionar() {
    var main = $('#main'); if (!B) return;
    if (!main || !contatoAt) { B.style.display = 'none'; if (AV) AV.style.display = 'none'; if (OF) OF.style.display = 'none'; if (JA) JA.style.display = 'none'; return; }
    var r = main.getBoundingClientRect(), foot = main.querySelector('footer'), fh = foot ? foot.getBoundingClientRect().height : 62, hd = main.querySelector('header'), hh = hd ? hd.getBoundingClientRect().height : 60;
    B.className = (visual === 'D' ? 'pfwa-barra' : 'pfwa-coluna') + (botsMin ? ' pfwa-min' : ''); B.style.display = 'flex';
    if (botsMin) { B.innerHTML = '<span data-acao="botsToggle" class="pri pfwa-botspf" title="Mostrar os bot\u00f5es do PF">PF</span>'; }
    else { var tog = '<span data-acao="botsToggle" class="pfwa-botsx" title="Esconder os bot\u00f5es do PF">' + (visual === 'D' ? '\u2039' : '\u2013') + '</span>'; B.innerHTML = tog + BOTOES.map(function (b, i) { return '<span data-acao="b-' + b[0] + '" class="' + (i === 0 ? 'pri' : '') + '" title="' + b[2] + '">' + b[1] + (visual === 'D' ? ' ' + b[2] : '') + '</span>'; }).join(''); }
    if (visual === 'D') { B.style.left = (r.left + r.width / 2) + 'px'; B.style.top = (r.bottom - fh - 58) + 'px'; }
    else { B.style.left = (r.left + 12) + 'px'; B.style.top = (r.top + hh + 70) + 'px'; }
    if (AV) { AV.style.left = (r.left + 70) + 'px'; AV.style.width = Math.max(260, r.width - 140) + 'px'; AV.style.top = (r.top + hh + 10) + 'px'; }
    if (OF) { OF.style.left = (r.left + 70) + 'px'; OF.style.width = Math.max(300, Math.min(560, r.width - 140)) + 'px'; OF.style.top = (r.top + hh + (AV && AV.style.display === 'flex' ? 64 : 10)) + 'px'; }
    if (JA) { JA.style.left = (r.left + 16) + 'px'; JA.style.width = Math.max(300, r.width - 32) + 'px'; JA.style.bottom = (window.innerHeight - r.bottom + fh + 8) + 'px'; }
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
    if (chave === ultimo) { pintaAviso(nCod); ofertasVigiar(); digitandoVigiar(); return; }
    ultimo = chave; cot = null; cotErro = ''; saldoR = null; ofPend = []; ofSig = ''; jaR = null; digAnt = ''; jaFechado = ''; pintaOferta(); pintaJa();
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

  processarEnvio();
  setInterval(function () { vigiar().catch(function (e) { console.warn('PF', e); }); }, 1500);
  window.addEventListener('resize', posicionar);
})();
