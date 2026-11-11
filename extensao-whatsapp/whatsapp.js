// PartsFlow no WhatsApp — roda dentro do WhatsApp Web.
// 1) Envio da fila: quando o fundo.js abre uma conversa com a mensagem pronta, aperta "enviar" e confirma que saiu.
// 2) Painel do PF ao lado da conversa, com abas (Cotação / Cliente / Histórico / Peças).
// 3) Botões do PF na conversa: em coluna (visual A) ou numa barra embaixo (visual D) — cada um escolhe.
(function () {
  'use strict';
  // 4.9 - extensão atualizada com o WhatsApp aberto = "Extension context invalidated" a cada 1,5 s. Agora os timers param
  // quietos e aparece um aviso pequeno "dê F5 nesta aba" (o código velho não fala mais com a extensão nova).
  function vivo() { try { return !!(chrome && chrome.runtime && chrome.runtime.id); } catch (e) { return false; } }
  var _avisoF5 = false;
  function avisoF5() {
    if (_avisoF5) return; _avisoF5 = true;
    try {
      var d = document.createElement('div');
      d.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:2147483647;background:#E67E22;color:#fff;font:700 13px Inter,Segoe UI,sans-serif;padding:8px 14px;border-radius:10px;box-shadow:0 3px 10px rgba(0,0,0,.35);cursor:pointer';
      d.textContent = '🧩 A extensão do PartsFlow foi atualizada — clique aqui (ou F5) pra recarregar o WhatsApp';
      d.onclick = function () { location.reload(); };
      document.body.appendChild(d);
    } catch (e) { }
  }
  var setInterval = function (fn, ms) {
    var id = window.setInterval(function () { if (!vivo()) { window.clearInterval(id); avisoF5(); return; } fn(); }, ms);
    return id;
  };
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

  // ═══ 4.16 - 🎤 DESCREVER ÁUDIO ═══ pega o último áudio da conversa (blob do WhatsApp) e manda pro PF transcrever.
  function ultimoAudioEl() {
    var main = $('#main'); if (!main) return null;
    var as = main.querySelectorAll('audio'), i;
    for (i = as.length - 1; i >= 0; i--) { if (as[i].src && /^blob:/.test(as[i].src)) return as[i]; }
    return as.length ? as[as.length - 1] : null;
  }
  function blobUrlDataUrl(url) {
    return fetch(url).then(function (r) { return r.blob(); }).then(function (b) {
      return new Promise(function (ok, err) { var fr = new FileReader(); fr.onload = function () { ok({ dataUrl: fr.result, size: b.size }); }; fr.onerror = err; fr.readAsDataURL(b); });
    });
  }
  function audioBoxEl() {
    var b = document.getElementById('pfwa-audio');
    if (!b) {
      b = document.createElement('div'); b.id = 'pfwa-audio';
      b.style.cssText = 'position:fixed;right:18px;bottom:90px;z-index:2147483600;max-width:340px;background:#fff;border:1px solid #d7deea;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.22);font-size:13px;color:#1a2332;overflow:hidden';
      b.addEventListener('click', function (e) {
        var a = e.target.closest('[data-aud]'); if (!a) return; var k = a.getAttribute('data-aud');
        if (k === 'x') { b.remove(); return; }
        if (k === 'cfg') { msg({ t: 'acao', acao: 'sttConfig' }); return; }
        var t = b.querySelector('[data-aud-txt]'); if (!t) return;
        if (k === 'copy') { try { navigator.clipboard.writeText(t.textContent); a.textContent = '✓ copiado'; } catch (e) { } }
        else if (k === 'por') { escreverNaCaixa(t.textContent); }
      });
      document.body.appendChild(b);
    }
    return b;
  }
  function audioMsg(txt, config) {
    var b = audioBoxEl();
    b.innerHTML = '<div style="background:#1c2940;color:#fff;padding:8px 12px;font-weight:700;display:flex;justify-content:space-between;align-items:center">🎤 Áudio <span data-aud="x" style="cursor:pointer">✕</span></div>' +
      '<div style="padding:12px;line-height:1.5">' + esc(txt) + (config ? '<div style="margin-top:10px"><button data-aud="cfg" class="pfwa-verde" style="border:0;border-radius:7px;padding:6px 10px;cursor:pointer;color:#fff">⚙️ Configurar a chave</button></div>' : '') + '</div>';
  }
  function audioResultado(texto) {
    var b = audioBoxEl();
    b.innerHTML = '<div style="background:#1c2940;color:#fff;padding:8px 12px;font-weight:700;display:flex;justify-content:space-between;align-items:center">🎤 Descrição do áudio <span data-aud="x" style="cursor:pointer">✕</span></div>' +
      '<div style="padding:12px;line-height:1.5"><div data-aud-txt style="white-space:pre-wrap;max-height:240px;overflow:auto">' + esc(texto) + '</div>' +
      '<div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">' +
        '<button data-aud="por" class="pfwa-verde" style="border:0;border-radius:7px;padding:6px 10px;cursor:pointer;color:#fff">💬 Pôr na conversa</button>' +
        '<button data-aud="copy" style="border:1px solid #cfd8e3;background:#f4f7fb;border-radius:7px;padding:6px 10px;cursor:pointer">📋 Copiar</button>' +
      '</div></div>';
  }
  // 4.19 - A pedido do Vitor ("embaixo de cada áudio deve ter algo que eu acione para descrever aquele áudio" + "os botões de pôr na conversa,
  // deixa como opção… por regra desativado. quero só clicar para descrever e aparece a caixa da descrição"): cada áudio da conversa ganha
  // "📝 Descrever este áudio"; a descrição aparece embaixo dele. Botões (Pôr na conversa/Copiar/Cotar) só com a opção ligada em ⚙️.
  var AUD_SEL = '#main audio, #main [data-icon="audio-play"], #main [data-icon="audio-pause"], #main [data-icon*="ptt"], #main button[aria-label*="voz" i], #main button[aria-label*="voice" i], #main [aria-label*="mensagem de voz" i], #main [aria-label*="voice message" i]';
  function audBalao(x) {
    var row = x.closest('.message-in, .message-out') || x.closest('[data-id]'); if (!row) return null;
    var main = $('#main'), lim = (main ? main.getBoundingClientRect().width : 900) * 0.72, p = x, best = null;
    while (p && p !== row) { var w = p.getBoundingClientRect().width; if (w > 120 && w < lim) best = p; p = p.parentElement; }
    return best || row;
  }
  function audVigiar(forcar) {
    var liga = CFG.audio !== false && !!contatoAt;
    var vistos = [];
    if (liga) Array.prototype.forEach.call(document.querySelectorAll(AUD_SEL), function (x) {
      if (x.closest('.pfwa-audx')) return;
      var b = audBalao(x); if (!b || vistos.indexOf(b) >= 0) return; vistos.push(b);
    });
    Array.prototype.forEach.call(document.querySelectorAll('#main .pfwa-audx'), function (d) { if (vistos.indexOf(d.parentElement) < 0) d.remove(); });
    vistos.forEach(function (b) {
      var d = b.querySelector(':scope > .pfwa-audx');
      if (!d) { d = document.createElement('div'); d.className = 'pfwa-audx'; b.appendChild(d); d.addEventListener('click', audClique); }
      if (forcar || !d._st) audPinta(b, d);
    });
  }
  function audPinta(b, d) {
    var st = b._pfAud || { st: 'idle' }; d._st = st.st + '|' + (CFG.audioBotoes ? 1 : 0);
    if (st.st === 'idle') { d.innerHTML = '<span class="pfwa-audchip" data-aud2="ler">📝 Descrever este áudio</span>'; return; }
    if (st.st === 'lendo') { d.innerHTML = '<span class="pfwa-audchip lendo">⏳ Descrevendo…</span>'; return; }
    if (st.st === 'erro') { d.innerHTML = '<div class="pfwa-auddesc erro">' + esc(st.txt) + '<div class="pfwa-audbt">' + (st.cfg ? '<span data-aud2="cfg">⚙️ Configurar a chave</span>' : '') + '<span data-aud2="ler">↻ Tentar de novo</span></div></div>'; return; }
    d.innerHTML = '<div class="pfwa-auddesc"><span class="pfwa-audx-x" data-aud2="fechar" title="Esconder">✕</span><b>📝 Descrição:</b> ' + esc(st.txt) +
      (CFG.audioBotoes ? '<div class="pfwa-audbt"><span data-aud2="por">💬 Pôr na conversa</span><span data-aud2="copy">📋 Copiar</span><span data-aud2="cot">📄 Cotar no PF</span></div>' : '') + '</div>';
  }
  function audClique(e) {
    var el = e.target.closest('[data-aud2]'); if (!el) return; e.preventDefault(); e.stopPropagation();
    var d = e.currentTarget, b = d.parentElement, a = el.getAttribute('data-aud2'), st = b._pfAud || {};
    if (a === 'ler') { audDescrever(b, d); return; }
    if (a === 'cfg') { msg({ t: 'acao', acao: 'sttConfig', focar: true }); return; }
    if (a === 'fechar') { b._pfAud = { st: 'idle' }; audPinta(b, d); return; }
    if (a === 'por') { escreverNaCaixa(st.txt || ''); return; }
    if (a === 'copy') { try { navigator.clipboard.writeText(st.txt || ''); el.textContent = '✓ copiado'; } catch (er) { } return; }
    if (a === 'cot') { msg({ t: 'acao', acao: 'cotar', arg: { k: resp && resp.k, contato: resp && resp.contato, msgs: [{ t: st.txt || '', eu: false }] } }).then(function (r) { if (r && !r.erro) { cot = r; cotErro = ''; } irAba('cot'); }); return; }
  }
  function audToast(t) { var d = document.createElement('div'); d.textContent = t; d.style.cssText = 'position:fixed;left:50%;bottom:90px;transform:translateX(-50%);z-index:2147483600;background:#1c2940;color:#fff;font:600 13px Inter,Segoe UI,sans-serif;padding:9px 14px;border-radius:9px;box-shadow:0 6px 20px rgba(0,0,0,.3);max-width:80vw'; document.body.appendChild(d); setTimeout(function () { d.remove(); }, 2600); }
  function audEsperar(fn, ms) { return new Promise(function (ok) { var t0 = Date.now(); (function v() { var r = fn(); if (r || Date.now() - t0 > ms) ok(r || null); else setTimeout(v, 150); })(); }); }
  // 4.23 - o áudio do WhatsApp toca fora da página: o audio-main.js (mundo da página) avisa o endereço de cada áudio que toca
  var audUlt = null; document.addEventListener('pfwa-aud', function (e) { if (e && e.detail) audUlt = { src: String(e.detail), t: Date.now() }; });
  async function audDoBalao(b) {
    var blob = function () { var as = b.querySelectorAll('audio'); for (var i = 0; i < as.length; i++) if (as[i].src && /^blob:/.test(as[i].src)) return as[i]; return null; };
    var a = blob(); if (a) return a;
    // sem o áudio carregado: aperta o ▶ dele, pega o áudio que começou a tocar e pausa na hora
    var play = b.querySelector('button[aria-label*="eproduzir" i], button[aria-label*="play" i], [data-icon="audio-play"]');
    var bt = play ? (play.closest('button,[role="button"]') || play) : null; if (!bt) return null;
    var antes = Array.prototype.slice.call(document.querySelectorAll('audio')), t0 = Date.now();
    bt.click();
    a = await audEsperar(function () { if (audUlt && audUlt.t >= t0) return { src: audUlt.src, solto: 1 }; var x = blob(); if (x) return x; var all = document.querySelectorAll('audio'); for (var i = 0; i < all.length; i++) { var y = all[i]; if (y.src && /^blob:/.test(y.src) && (!y.paused || antes.indexOf(y) < 0)) return y; } return null; }, 8000);
    if (a && a.solto) { try { document.dispatchEvent(new CustomEvent('pfwa-aud-pausar')); } catch (e) { } }
    else if (a) { try { a.pause(); a.currentTime = 0; } catch (e) { } }
    return a;
  }
  async function audDescrever(b, d) {
    b._pfAud = { st: 'lendo' }; audPinta(b, d);
    var falha = function (t, cfg) { b._pfAud = { st: 'erro', txt: t, cfg: !!cfg }; if (d.isConnected) audPinta(b, d); };
    var el = await audDoBalao(b);
    if (!el) { falha('Não consegui carregar este áudio. Toque no ▶ dele uma vez e clique de novo.'); return; }
    var dd; try { dd = await blobUrlDataUrl(el.src); } catch (e) { falha('Não consegui pegar o áudio. Toque no ▶ e tente de novo.'); return; }
    var r = await msg({ t: 'acao', acao: 'transcreverAudio', arg: { dataUrl: dd.dataUrl } });
    if (!r) { falha('Abra o PartsFlow numa aba deste Chrome.'); return; }
    if (r.erro) { falha(r.msg || 'Não deu pra descrever o áudio.', r.erro === 'sem_chave'); return; }
    b._pfAud = { st: 'ok', txt: r.texto || '(não reconheci fala no áudio)' }; if (d.isConnected) audPinta(b, d);
  }
  setInterval(function () { try { audVigiar(); } catch (e) { } }, 1500);
  async function transcreverUltimoAudio() {
    audioMsg('🎤 Lendo o áudio…');
    var el = ultimoAudioEl();
    if ((!el || !el.src || !/^blob:/.test(el.src)) && audUlt && Date.now() - audUlt.t < 600000) el = { src: audUlt.src }; // 4.23 - o último que tocou
    if (!el || !el.src || !/^blob:/.test(el.src)) { audioMsg('Não achei áudio carregado nesta conversa. Toque no ▶ do áudio uma vez pra carregar e clique de novo.'); return; }
    var d;
    try { d = await blobUrlDataUrl(el.src); } catch (e) { audioMsg('Não consegui pegar o áudio (' + ((e && e.message) || '') + '). Toque no ▶ e tente de novo.'); return; }
    if (!d || !d.dataUrl) { audioMsg('Não consegui ler o áudio.'); return; }
    var r = await msg({ t: 'acao', acao: 'transcreverAudio', arg: { dataUrl: d.dataUrl } });
    if (!r) { audioMsg('Abra o PartsFlow numa aba deste Chrome.'); return; }
    if (r.erro) { audioMsg(r.msg || 'Não deu pra transcrever o áudio.', r.erro === 'sem_chave'); return; }
    audioResultado(r.texto || '(o serviço não reconheceu fala no áudio)');
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
  // 4.14 - A pedido do Vitor ("vi que puxou até de uns dias atrás… se o cliente for enviando mais, antes de eu cotar?"): o 📄 Cotar e a bolinha
  // leem só o PEDIDO ATUAL = tudo o que o cliente mandou depois da sua última mensagem (ele mandando mais, vai somando). A mensagem automática
  // (saudação/ausência) não conta como "sua". Se a última mensagem é sua, vale o último bloco do cliente antes dela. Pedido antigo = selo do balão.
  function msgsPedido() {
    var ms = lerMensagens(), nm = contatoAt && contatoAt.nome, autos = {};
    try { if (nm && autoUlt[nm]) autos[String(autoUlt[nm]).trim()] = 1; if (nm && autoPend[nm] && autoPend[nm].txt) autos[String(autoPend[nm].txt).trim()] = 1; } catch (e) { }
    var minha = function (m) { return m.eu && !autos[String(m.t || '').trim()]; };
    var i = ms.length - 1, out = [];
    while (i >= 0 && minha(ms[i])) i--;
    for (; i >= 0; i--) { if (minha(ms[i])) break; if (!ms[i].eu) out.unshift(ms[i]); }
    return out;
  }
  // 4.4 - A pedido do Vitor ("como esse cliente não tem cadastro, não deveria me perguntar pra cadastrar? pois tem o cnpj"): acha o CNPJ que o cliente mandou na conversa.
  function cnpjNaConversa() {
    var txt = lerMensagens().filter(function (m) { return !m.eu; }).map(function (m) { return m.t; }).join('\n');
    var m = txt.match(/(?:^|\D)(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})(?:\D|$)/g);
    if (!m) return '';
    var d = m[m.length - 1].replace(/\D/g, ''); d = d.slice(-14);
    return d.length === 14 ? d : '';
  }
  function fmtCnpj(d) { d = String(d || '').replace(/\D/g, ''); return d.length === 14 ? d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5') : d; }
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
  var BOTOES = [['cot', '📄', 'Cotar no PF'], ['saldo', '📦', 'Saldo'], ['ficha', '🤝', 'Ficha'], ['audio', '🎤', 'Descrever áudio'], ['lemb', '⏰', 'Lembrete'], ['prontas', '⚡', 'Prontas'], ['assist', '🤖', 'Assistente'], ['pdf', '📤', 'PDF']];
  function logoSvg(f, l) { return '<svg width="24" height="24" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="' + f + '"/><rect x="9" y="8" width="4" height="22" rx="1.5" fill="' + l + '"/><path d="M13,8 Q26,8 26,14 Q26,20 13,20" fill="none" stroke="' + l + '" stroke-width="4" stroke-linecap="round"/><line x1="19" y1="20" x2="29" y2="32" stroke="#E67E22" stroke-width="2.5" stroke-linecap="round"/><circle cx="30" cy="33" r="2" fill="#E67E22"/></svg>'; }

  // 2.4 - ❓ Ajuda "Como funciona" (pedido do Vitor: explicar cada função em linguagem simples pros outros usuários).
  // FUNÇÃO NOVA NA EXTENSÃO → acrescentar uma linha aqui.
  var ajuda = false;
  // 3.4 - ⚙️ Configurações (A pedido do Vitor: "coloca botão de eu ligar ou desligar essas configurações. igual no Watidy"):
  // cada função da extensão liga/desliga aqui; guardado por navegador (chrome.storage.local 'cfg'). Menu e aviso de cotação usam as chaves que já existiam.
  var config = false, CFG = { bots: true, etq: true, salvar: true, ofertas: true, ja: true, verif: true, audio: true, audioBotoes: false, sug: true, waEtqOff: true };
  var CFG_LISTA = [
    ['menu', '🧭', 'Menu do PF em volta do WhatsApp', 'Barra de grupos em cima (Linha Amarela, Linha Agrícola…) e a coluna de atalhos à esquerda.'],
    ['etq', '🏷️', 'Etiquetas nas conversas', 'Embaixo de cada nome da lista: cidade e grupo do cliente, fornecedor do PF, cotação aberta, mapa.'],
    ['bots', '📄', 'Botões do PF ao lado das mensagens', 'A coluna (A) ou barra (D) com Cotar, Saldo, Ficha, Lembrete, Prontas…'],
    ['aviso', '🔔', 'Aviso de pedido de cotação', 'A bolinha laranja com o número de códigos no botão 📄 quando o cliente manda códigos.'],
    ['selo', '📄', 'Selo no balão da mensagem', 'O selinho "📄 N" no canto da mensagem do cliente que tem códigos. Clique = ver os códigos e criar a cotação no PF.'],
    ['barra', '⚡', 'Respostas rápidas com "/"', 'Digitar / no começo da caixa de texto abre as respostas rápidas (o botão ⚡ continua funcionando).'],
    ['salvar', '👤', 'Botão Salvar contato', 'O botão verde ao lado do nome da conversa.'],
    ['ofertas', '💡', 'Guardar ofertas e respostas', 'Quando você oferece algo, o cartão pra salvar a oferta e a resposta do cliente no CRM.'],
    ['ja', '⚠️', '"Você já ofereceu" enquanto digita', 'Aviso em cima da caixa de texto quando você vai oferecer algo que já ofereceu.'],
    ['waEtqOff', '🏷️', 'Esconder etiquetas do WhatsApp', 'Nas conversas de clientes do PF, a etiqueta do WhatsApp dá lugar ao tipo do cliente (Revenda, Consumidor…). Desligado = as etiquetas do WhatsApp continuam aparecendo.'],
    ['sug', '💡', 'Sugestões pra oferecer', 'Na aba Cliente: o que clientes parecidos compram e ele não. Na aba Cotação: o que costuma ir junto com as peças pedidas.'],
    ['audio', '🎤', 'Descrever áudios', 'Embaixo de cada áudio aparece "📝 Descrever este áudio". Clique e a descrição (o que a pessoa falou) aparece ali mesmo. O 🎤 da coluna liga/desliga.'],
    ['audioBotoes', '💬', 'Botões na descrição do áudio', 'Mostra Pôr na conversa, Copiar e Cotar no PF embaixo da descrição. Vem desligado.'],
    ['verif', '📌', 'Anotar "vou verificar" sozinho', 'Quando você escreve "vou verificar / já te retorno", vira pendência e próxima ação no PF.']];
  function cfgOn(k) { return k === 'menu' ? menuLig : k === 'aviso' ? avisoLigado : CFG[k] !== false; }
  chrome.storage.local.get(['cfg'], function (s) { if (s.cfg) for (var k in s.cfg) CFG[k] = s.cfg[k]; });
  function htmlConfig() {
    var h = '<div class="pfwa-ajtop"><b>⚙️ Configurações</b><span class="pfwa-link" data-acao="config">✕ fechar</span></div>' +
      '<div class="pfwa-nada" style="margin:4px 0 8px">Ligue só o que você usa. Vale pra este navegador.</div>';
    CFG_LISTA.forEach(function (x) {
      var on = cfgOn(x[0]);
      h += '<div class="pfwa-cfgl" data-acao="cfgTog" data-arg="' + x[0] + '"><span class="pfwa-cfgi">' + x[1] + '</span><div><b>' + esc(x[2]) + '</b><br><small>' + esc(x[3]) + '</small></div>' +
        '<span class="pfwa-sw' + (on ? ' on' : '') + '"><i></i></span></div>';
    });
    h += '<div class="pfwa-cfgl" data-acao="autoAbrir"><span class="pfwa-cfgi">👋</span><div><b>Mensagens automáticas</b><br><small>' + (autoAusente() ? AUTO_MODOS[autoAusente()][0] + ' ' + AUTO_MODOS[autoAusente()][1] + ' · ' : '') + 'Saudação de espera ' + (AUTO.on ? 'ligada · ' + esc(AUTO.min) + ' min · ' + esc(AUTO.ini) + '–' + esc(AUTO.fim) : 'desligada') + ' — clique pra ajustar</small></div><span class="pfwa-link">ajustar ›</span></div>';
    return h;
  }
  function cfgTog(k) {
    if (k === 'menu') { menuLig = !menuLig; chrome.storage.local.set({ menuLig: menuLig }); pintarMenu(); }
    else if (k === 'aviso') { avisoLigado = !avisoLigado; chrome.storage.local.set({ avisoLigado: avisoLigado }); try { marcaCot(); } catch (e) { } }
    else { CFG[k] = !cfgOn(k); chrome.storage.local.set({ cfg: CFG }); }
    if (k === 'etq') try { badgesRender(); } catch (e) { }
    if (k === 'ofertas' && !CFG.ofertas) try { ofPend = []; pintaOferta(); } catch (e) { }
    if (k === 'ja' && !CFG.ja) try { jaR = null; pintaJa(); } catch (e) { }
    if (k === 'verif' && !CFG.verif) try { vfR = null; pintaVf(); } catch (e) { }
    if (k === 'audio' || k === 'audioBotoes') try { audVigiar(true); } catch (e) { }
    try { posicionar(); } catch (e) { }
    pinta();
  }
  var AJUDA = [
    ['Comece por aqui', [
      ['⚙️', 'Configurações', 'A engrenagem no cabeçalho do painel liga e desliga cada função da extensão (menu, etiquetas, botões, avisos, salvar contato, ofertas…).'],
      ['🧩', 'O que é', 'O PartsFlow (PF) aparece aqui do lado do WhatsApp e mostra quem é o contato, o que ele compra e o que está em aberto. Ele só LÊ e ESCREVE NA CAIXA — quem aperta Enter é sempre você.'],
      ['🔌', 'Precisa do PF aberto', 'Deixe uma aba do PartsFlow aberta (já logado) neste mesmo Chrome — pode ser em outra janela. Se aparecer "O PF não respondeu", dê F5 na aba do PartsFlow.'],
      ['🟢', 'Conectado ao PF', 'Do lado da versão, lá em cima: verde "● Conectado ao PF" = tudo certo · laranja "Dê F5 no PF" = a aba do PF está aberta mas parou de responder · vermelho "PF fechado" = abra o PartsFlow. Clique nele pra conferir na hora. A bolinha também aparece no "PF" da barra de cima.'],
      ['🔁', 'Atualizou a extensão?', 'Depois de instalar uma versão nova, recarregue a aba do WhatsApp e a do PF (F5).']]],
    ['Em cima e do lado esquerdo', [
      ['🔎', 'Barra de filtros', 'Clientes, Fornecedores, etiquetas do WhatsApp e cotação aberta. Clique pra deixar só essas conversas na lista; clique de novo pra ver tudo.'],
      ['🏷️', 'Etiquetas nas conversas', 'Embaixo de cada nome: se é cliente ou fornecedor do PF, cotação aberta, mapa esperando preço.'],
      ['⚙️', 'Menu do PF', 'A chave "Menu do PF" liga/desliga a barra. "azul / discreta" troca a cor.']]],
    ['Botões ao lado da conversa', [
      ['📄', 'Cotar no PF', 'Lê os códigos e quantidades que o cliente mandou depois da sua última mensagem (se ele mandar mais, vai somando; pedido antigo = clique no selo 📄 do balão), mostra saldo e preço (com a margem dele) e monta a resposta. "Pôr na conversa" escreve na caixa; você confere e manda.'],
      ['🏷️', 'Marca e quantidade do pedido', 'Quando o cliente escreve a marca ("5-275x 03pcs spicer c/graxeira", "01pc spicer 01pc TX"), cada marca vira um item com a quantidade dele. "c/graxeira" procura a cruzeta com graxeira (ex.: 5-275X → 5-275XS). Marca que não temos aparece em vermelho com as marcas que temos embaixo — clique numa pra trocar.'],
      ['🔄', 'Atualizar a cotação que já existe', 'Se você já cotou pra esse cliente nos últimos 3 dias, o "Criar cotação no PF" pergunta se atualiza aquela cotação: as quantidades viram as do pedido, os preços que você passou ficam e os itens pedidos já vêm marcados pro Pedido de Venda.'],
      ['📦', 'Saldo', 'Selecione um código na conversa e clique: mostra o saldo de cada marca.'],
      ['🤝', 'Ficha', 'Abre a ficha do cliente no PF (CRM).'],
      ['💡', 'Sugestões pra oferecer', 'Aba Cliente: até 3 coisas que clientes parecidos compram e ele não (🔎 peças, 💬 Oferecer escreve uma frase pronta na caixa, 🚫 = não tem demanda). Aba Cotação: o que costuma ir junto com as peças pedidas, com ➕ Pôr na cotação.'],
      ['🎤', 'Descrever áudios', 'Embaixo de cada áudio aparece "📝 Descrever este áudio": clique e o texto do que a pessoa falou aparece ali mesmo. O 🎤 da coluna liga/desliga. Botões Pôr na conversa/Copiar/Cotar: ligue em ⚙️. Precisa da chave do serviço de transcrição (configura no PF, uma vez só).'],
      ['⏰', 'Lembrete', 'Marca uma próxima ação (aparece no ☀️ Meu dia do PF).'],
      ['⚡', 'Respostas rápidas', 'Clique no ⚡ (ou digite / na caixa de texto, ex.: /banco): aparecem as respostas deste cliente e os seus Atalhos de Texto do PF, já com o nome dele, a empresa, a cidade… trocados. Escolha (↑ ↓ e Enter) e o texto vai pra caixa — você confere e manda.'],
      ['🔤', 'Variáveis', 'No atalho de texto do PF, escreva {saudacao}, {nome}, {empresa}, {cidade}, {cnpj}, {codigo}, {condicao}, {cotacao}, {vendedor}… e o PF troca pelos dados do cliente da conversa. "🔤 Variáveis" na lista mostra todas e o valor de cada uma.'],
      ['➕', 'Salvar como resposta', 'Escreveu uma mensagem boa? Na lista ⚡, "Salvar o que escrevi como resposta" guarda nos Atalhos de Texto do PF (o nome do cliente vira {nome}, pra servir pra todos).'],
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
      ['🔔', 'Pedido de cotação', 'Quando o cliente manda códigos, aparece uma bolinha laranja com o número de códigos no botão 📄 do PF (ao lado das mensagens). Clique nela pra cotar. Pra desligar ou ligar de novo: botão direito no 📄 (ou ⚙️ Configurações → Aviso de pedido de cotação).'],
      ['📄', 'Selo na mensagem', 'A mensagem do cliente que tem códigos ganha um selinho laranja "📄 3" no canto. Clique nele: aparecem os códigos com quantidade e saldo e o botão "Criar cotação no PF". Só cria se você clicar. Depois de criada, o selo fica verde ✓.'],
      ['💡', 'Ofertas', 'Quando você oferece algo e o cliente responde, o PF pergunta o que ele achou e guarda na ficha. Se for oferecer de novo, ele avisa "você já ofereceu".'],
      ['👋', 'Saudação de espera', 'Se o cliente fica X minutos sem resposta (você escolhe), a extensão manda UMA mensagem como se fosse você, de acordo com o que ele mandou ("já vou ver esses códigos", "vi a foto", "vou ouvir aqui"…). Só no horário escolhido, uma vez por conversa a cada N horas e com limite por hora. Vem desligada: ⚙️ → Mensagens automáticas. A conversa fica com a etiqueta "👋 … responda" até você responder.'],
      ['📱', 'Mudar pelo WhatsApp', 'Em ⚙️ → Mensagens automáticas ligue "Mudar pelo WhatsApp" e ponha o número do seu celular pessoal. Dele (ou da conversa com você mesmo) mande "pf reunião até 15h", "pf ausente 2h", "pf férias até 20/11 Carlos 11 98765-4321", "pf voltei", "pf saudação 5 min" ou "pf status". O computador com este WhatsApp aberto faz e responde ✅ quando você não estiver mexendo nele. "pf" de outro número é ignorado.'],
      ['🗓️', 'Meu status (reunião, ausente, férias)', 'Em ⚙️ → Mensagens automáticas escolha Em reunião / Ausente / Férias e até quando (nas férias, quem atende no seu lugar). Cada cliente que chamar recebe UMA mensagem avisando, a qualquer hora. No "até" volta sozinho pra Disponível. Enquanto estiver fora, aparece no cabeçalho do painel.'],
      ['📌', 'Vou verificar', 'Se você escrever "deixa eu ver / vou verificar / já te retorno", o PF cria uma pendência sozinho (com desfazer).'],
      ['📇', 'Código que não está no PF', 'Se o nome no WhatsApp tem um código entre parênteses que não existe no PF, aparece "Cadastrar no PF" já com o código.']]],
    ['Embaixo do painel', [
      ['📥', 'Importar meus contatos', 'Lê a lista de conversas e traz pro PF (você escolhe quem entra).'],
      ['📣', 'Disparo pelo PF', 'No PF, Vendas → 📣 Disparo pelo WhatsApp: escolhe a lista (o que chegou, uma marca, um grupo, os sumidos ou uma etiqueta), escreve a mensagem com {nome} e a extensão manda uma por uma, no ritmo que você escolher por hora. Quem já recebeu a mesma oferta fica de fora.'],
      ['👤', 'Salvar contato', 'Botão verde ao lado do nome da conversa: escreve o nome, a empresa (procura nos clientes do PF) e o código do JBoss — vira "Fulano - Empresa (código)". Salva no PF (o contato entra no cadastro do cliente, mesmo sem número) e já salva/renomeia o contato no WhatsApp com esse nome, com o "Sincronizar no telefone" ligado (vai pra agenda do celular também). Quer só no WhatsApp? “📱 Só no WhatsApp” renomeia/salva o contato lá (e no celular) sem gravar nada no PF. Tem também o GRUPO do cliente (Linha Amarela, Agrícola… — vai pro cadastro), o CARGO e o CNPJ (CNPJ que ainda não é cliente = entra no PF como pré-cadastro 🌱 com os dados da Receita); se a empresa ainda não está no PF, aparece “➕ Criar cliente no PF”, que já cria o cadastro com esse contato. E quando o contato não está no PF e o cliente mandou o CNPJ na conversa, a aba Cliente mostra “➕ Cadastrar no PF” já com esse CNPJ.'],
      ['↕️', 'Mudar o PF de altura', 'Segure e arraste a coluna de botões do PF (ou o "PF" minimizado) pra cima ou pra baixo. Fica guardado.'],
      ['🧠', 'Entender com IA', 'Na aba Cotação: quando o cliente pede pelo NOME da peça ("kit de vedação da 28000, transmissão e conversor"), a IA separa peça, quantidade e máquina e o PF procura nas Aplicações e no estoque. Confira antes de mandar.'],
      ['📝', 'Resumir a conversa', 'Na aba Cliente: a IA escreve o que o cliente pediu e a próxima ação. Você corrige e grava na ficha do CRM (e no ☀️ Meu dia).'],
      ['📥', 'Resposta do fornecedor', 'Na conversa de um fornecedor com mapa esperando preço: "Lançar a resposta dele no mapa" junta o que ele mandou (texto e fotos) e abre o mapa já lido. Confira e aperte Lançar.'],
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
      '<div class="pfwa-cabt"><b>PartsFlow</b><span class="pfwa-ver">' + (VER ? 'v' + VER : '') + '</span><span class="pfwa-con" data-acao="conexao" title="Ligação com o PartsFlow">…</span><small class="pfwa-cabsub"></small></div><i class="pfwa-ajd" data-acao="config" title="Configurações — ligar e desligar cada função">⚙️</i><i class="pfwa-ajd" data-acao="ajuda" title="Como funciona cada coisa">❓</i><span class="pfwa-vis" title="Onde ficam os botões do PF: A = coluna ao lado das mensagens · D = barra embaixo"><i data-vis="A">A</i><i data-vis="D">D</i></span><span class="pfwa-x" title="Recolher">›</span></div>' +
      '<div class="pfwa-lote"></div><div class="pfwa-tabs"></div><div class="pfwa-corpo"></div>'+
      '<div class="pfwa-rod"><button data-acao="importar" title="Lê a lista de conversas do WhatsApp Web e traz pro PF">📥 Importar meus contatos</button><button data-acao="numeros" class="pfwa-num" title="Abre cada conversa dos contatos salvos sem número, lê o número e grava no PF (só lê, não manda nada). Clique de novo pra parar.">📞 Buscar números que faltam</button><span class="pfwa-rodst"></span></div></div>';
    document.body.appendChild(P);
    B = document.createElement('div'); B.id = 'pfwa-bots'; document.body.appendChild(B); botsArrastoLigar();
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
  var botsDy = { A: 0, D: 0 }, botsArr = null, botsArrastou = 0;
  chrome.storage.local.get(['botsDy'], function (s) { if (s.botsDy && typeof s.botsDy === 'object') botsDy = { A: +s.botsDy.A || 0, D: +s.botsDy.D || 0 }; });
  function botsArrastoLigar() {
    if (!B || B._pfArr) return; B._pfArr = 1;
    B.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      botsArr = { y0: e.clientY, dy0: botsDy[visual] || 0, mov: false };
    });
    window.addEventListener('pointermove', function (e) {
      if (!botsArr) return; var d = e.clientY - botsArr.y0;
      if (!botsArr.mov && Math.abs(d) < 5) return;
      botsArr.mov = true; document.documentElement.classList.add('pfwa-arrastando');
      var tp = Math.max(B._pfMin, Math.min(B._pfMax, B._pfBase + botsArr.dy0 + d));
      botsDy[visual] = tp - B._pfBase; B.style.top = tp + 'px';
      e.preventDefault();
    });
    window.addEventListener('pointerup', function () {
      if (!botsArr) return; var mov = botsArr.mov; botsArr = null;
      document.documentElement.classList.remove('pfwa-arrastando');
      if (mov) { botsArrastou = Date.now(); chrome.storage.local.set({ botsDy: botsDy }); }
    });
    // arrastou = não é clique (não abre/fecha nem cota)
    B.addEventListener('click', function (e) { if (Date.now() - botsArrastou < 400) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);
  }
  async function clique(e) {
    var b = e.target.closest('[data-acao]'); if (!b) return;
    var ac = b.getAttribute('data-acao'), arg = b.getAttribute('data-arg') || '';
    if (ac === 'aba') { ajuda = false; config = false; irAba(arg); return; }
    if (ac === 'config') { config = !config; ajuda = false; abrirPainel(); pinta(); return; }
    if (ac === 'cfgTog') { cfgTog(arg); return; }
    if (ac === 'autoAbrir') { config = 'auto'; abrirPainel(); pinta(); return; } // 3.9 - 👋 saudação automática
    if (ac === 'autoVoltar') { config = true; pinta(); return; }
    if (ac === 'autoTog') { AUTO[arg] = !AUTO[arg]; autoGravar(); pinta(); return; }
    if (ac === 'autoModo') { autoModoSet(arg); config = 'auto'; abrirPainel(); pinta(); return; } // 4.0 - 🗓️ meu status
    if (ac === 'autoEstilo') { AUTO.estilo = arg; autoGravar(); pinta(); return; }
    if (ac === 'cmdAutorizar') { if (contatoAt && contatoAt.nome) { AUTO.cmdNomes = (AUTO.cmdNomes || []).concat([contatoAt.nome]); if (contatoAt.tel && (AUTO.cmdQuem || []).indexOf(contatoAt.tel) < 0) AUTO.cmdQuem = (AUTO.cmdQuem || []).concat([contatoAt.tel]); AUTO.cmdOn = true; autoGravar(); } pinta(); return; }
    if (ac === 'cmdTirar') { AUTO.cmdNomes = (AUTO.cmdNomes || []).filter(function (n) { return n !== arg; }); autoGravar(); pinta(); return; }
    if (ac === 'svAbrir') { if (svAberto) { svAberto = false; SV.style.display = 'none'; } else svAbrir(); return; } // 2.7
    if (ac === 'svCnpj') { svAbrir(arg); return; } // 4.4 - cadastrar já com o CNPJ da conversa
    if (ac === 'svFechar') { svAberto = false; SV.style.display = 'none'; return; }
    if (ac === 'svUsar') { svUsar(arg); return; }
    if (ac === 'svGrupo') { svGrupoSet(arg); return; } // 4.7
    if (ac === 'svTipo') { svTipoSet(arg); return; } // 4.24
    if (ac === 'svMarca') { svMarcaSet(arg); return; } // 4.26 - marca da concessionária
    if (ac === 'svMarcaNova') { svMarcaNova(); return; } // 4.26
    if (ac === 'svGrupoNovo') { svGrupoNovo(); return; } // 4.15
    if (ac === 'svSalvar') { svSalvar(b); return; }
    if (ac === 'svCriar') { svSalvar(b, true); return; }
    if (ac === 'svCadAbrir') { if (svK) msg({ t: 'acao', acao: 'irTela', arg: { tela: 'cadcliK', k: svK } }); return; }
    if (ac === 'svWa') { svWa(); return; }
    if (ac === 'conexao') { conPintar(''); conChecar(); return; }
    if (ac === 'ajuda') { ajuda = !ajuda; config = false; abrirPainel(); pinta(); return; }
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
    // 4.19 - A pedido do Vitor ("o botão de descrever o áudio deve servir só pra ligar ou desligar a opção"): 🎤 liga/desliga o "📝 Descrever" embaixo de cada áudio.
    if (ac === 'b-audio') { CFG.audio = CFG.audio === false; chrome.storage.local.set({ cfg: CFG }); try { audVigiar(true); posicionar(); } catch (e) { } audToast(CFG.audio ? '🎤 Descrever áudios LIGADO — clique em "📝 Descrever este áudio" embaixo de cada áudio' : '🎤 Descrever áudios desligado'); return; }
    if (ac === 'b-prontas') { if (rrAberto) rrFechar(); else rrAbrir('', false); return; } // 3.7 - ⚡ respostas rápidas
    if (ac === 'b-pdf' || ac === 'pdf') { if (!cot || !cot.itens.length) { irAba('cot'); await cotar(); } if (cot && cot.itens.length) abrirCot(true); return; }
    if (ac === 'abrirCot') { abrirCot(false); return; }
    if (ac === 'escrever' || ac === 'pronta') {
      var t = ac === 'escrever' ? (P.querySelector('.pfwa-resp') || {}).value : ((resp && resp.prontas && resp.prontas[+arg]) || {}).txt;
      if (!t) return; var ok = escreverNaCaixa(t);
      if (ac === 'escrever' && ok && resp && resp.k) msg({ t: 'acao', acao: 'registrar', arg: { k: resp.k, texto: 'Cotação pelo WhatsApp: ' + cot.itens.length + ' código(s), ' + reais(cot.total) } });
      flash(b, ok ? '✔ Está na caixa — confira e aperte Enter' : 'Abra a conversa primeiro'); return;
    }
    if (ac === 'sugOferecer' || ac === 'sugPecas' || ac === 'sugSemDem') {
      var sx = resp && resp.sug && resp.sug[+arg]; if (!sx) return;
      var sa = { k: resp.k, tp: sx.tp, key: sx.key };
      if (ac === 'sugPecas') { msg({ t: 'acao', acao: 'sugPecas', focar: true, arg: sa }); return; }
      if (ac === 'sugSemDem') { msg({ t: 'acao', acao: 'sugSemDem', arg: sa }); resp.sug.splice(+arg, 1); pintaCorpo(); return; }
      var nm = (resp.contato || '').split(' ')[0]; var fr = (nm ? sx.frase.replace(/^Aproveitando:/, 'Aproveitando, ' + nm + ':') : sx.frase);
      escreverNaCaixa(fr); sa.msg = fr; msg({ t: 'acao', acao: 'sugOfereci', arg: sa }); return;
    }
    if (ac === 'juntoAdd') {
      var jx = cot && cot.junto && cot.junto[+arg]; if (!jx) return;
      cot.itens.push({ cod: jx.cod, qtd: 1, achou: jx.achou, desc: jx.desc, marca: jx.marca, saldo: jx.saldo, preco: jx.preco });
      cot.junto.splice(+arg, 1); refazResposta(); pintaCorpo(); return;
    }
    if (ac === 'sugMarca') { sugMarcaUsar(arg); return; } // 4.28
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
    if (ac === 'cotarIA') { irAba('cot'); cotarIA(); return; }
    if (ac === 'resumir') { resumir(); return; }
    if (ac === 'resumoX') { resumoR = null; pintaCorpo(); return; }
    if (ac === 'resumoGravar') {
      var tx = (P.querySelector('.pfwa-res-t') || {}).value || '', dt = (P.querySelector('.pfwa-res-d') || {}).value || '', px = (P.querySelector('.pfwa-res-p') || {}).value || '';
      if (!tx.trim() || !resp || !resp.k) return;
      b.disabled = true; b.textContent = 'Gravando…';
      var g1 = await msg({ t: 'acao', acao: 'registrar', arg: { k: resp.k, texto: '📝 Resumo (IA): ' + tx.trim() } });
      if (px.trim() && dt) await msg({ t: 'acao', acao: 'lembrete', arg: { k: resp.k, data: dt, texto: px.trim() } });
      if (g1 && g1.ok) { resumoR = null; pintaCorpo(); } else { b.disabled = false; flash(b, 'Não deu — abra o PF'); }
      return;
    }
    if (ac === 'respForn') {
      var pr = String(arg || '').split('|'), col = respFornColher();
      if (!col.texto && !col.imgs.length) { flash(b, 'Não achei resposta dele nesta conversa'); return; }
      b.disabled = true; b.textContent = 'Lendo a conversa…';
      var ims = []; for (var ii = 0; ii < col.imgs.length; ii++) { var du = await urlParaDataUrl(col.imgs[ii]); if (du) ims.push(du); }
      await msg({ t: 'acao', acao: 'respForn', focar: true, arg: { mapa: pr[0], fid: pr[1], texto: col.texto, imgs: ims } });
      b.disabled = false; flash(b, '✔ Abri no PF — confira e lance');
      return;
    }
    msg({ t: 'acao', acao: ac, arg: arg, focar: true });
  }
  function flash(b, t) { var o = b.textContent; b.textContent = t; setTimeout(function () { b.textContent = o; }, 2200); }

  // 3.6 - 🤖 IA: resumo pra ficha, pedido solto e resposta do fornecedor → mapa
  var resumoR = null, resumindo = false;
  async function cotarIA() {
    if (cotando) return; cotando = true; cotErro = ''; cot = null; pintaCorpo();
    var r = await msg({ t: 'acao', acao: 'cotarIA', arg: { k: resp && resp.k, contato: resp && resp.contato, msgs: msgsPedido() } });
    cotando = false;
    if (!r || r.erro) cotErro = r && r.erro === 'ia' ? 'A IA não respondeu: ' + (r.msg || '') : r && r.erro === 'semResposta' ? 'A IA demorou demais. Tente de novo.' : 'O PF não respondeu. Dê F5 na aba do PartsFlow.';
    else cot = r;
    pintaCorpo();
  }
  async function resumir() {
    if (resumindo) return; resumindo = true; resumoR = null; pintaCorpo();
    var r = await msg({ t: 'acao', acao: 'resumir', arg: { k: resp && resp.k, contato: resp && resp.contato, msgs: lerMensagens() } });
    resumindo = false; resumoR = r && r.ok ? r : { erro: (r && (r.erro === 'semResposta' ? 'A IA demorou demais. Tente de novo.' : r.erro)) || 'O PF não respondeu.' };
    pintaCorpo();
  }
  function resumoHtml(r) {
    if (!r || !r.k) return '';
    if (resumindo) return '<div class="pfwa-bloco"><div class="pfwa-bt">📝 Resumo da conversa</div><div class="pfwa-nada">Lendo a conversa…</div></div>';
    if (!resumoR) return '<div class="pfwa-bloco"><button class="pfwa-btn pfwa-verde" data-acao="resumir">📝 Resumir a conversa com IA</button><div class="pfwa-nada" style="margin-top:4px">A IA lê esta conversa e escreve o que o cliente pediu e a próxima ação. Você confere e grava na ficha.</div></div>';
    if (resumoR.erro) return '<div class="pfwa-bloco"><div class="pfwa-bt">📝 Resumo da conversa</div><div class="pfwa-nada">Não deu: ' + esc(resumoR.erro) + '</div><button class="pfwa-btn" data-acao="resumir">Tentar de novo</button></div>';
    var d = new Date(Date.now() + (resumoR.dias || 1) * 86400000), iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    return '<div class="pfwa-bloco"><div class="pfwa-bt">📝 Resumo da conversa (confira antes de gravar)</div>' +
      '<textarea class="pfwa-res-t" style="min-height:76px">' + esc(resumoR.resumo || '') + '</textarea>' +
      '<div class="pfwa-bt" style="margin-top:6px">⏰ Próxima ação</div><div style="display:flex;gap:6px"><input type="date" class="pfwa-res-d" value="' + iso + '"><input class="pfwa-res-p" value="' + esc(resumoR.proxima || '') + '" placeholder="(sem próxima ação)"></div>' +
      '<div class="pfwa-bots" style="margin-top:6px"><button class="pfwa-verde" data-acao="resumoGravar">✔ Gravar na ficha</button><button data-acao="resumir">🔁 Refazer</button><button data-acao="resumoX">✕</button></div></div>';
  }
  function respFornColher() {
    var bolhas = Array.prototype.slice.call(document.querySelectorAll('#main .message-in, #main .message-out'));
    var ult = -1; bolhas.forEach(function (b, i) { if (b.classList.contains('message-out')) ult = i; });
    var deles = bolhas.slice(ult + 1).filter(function (b) { return b.classList.contains('message-in'); });
    if (!deles.length) deles = bolhas.filter(function (b) { return b.classList.contains('message-in'); }).slice(-8);
    var texto = deles.map(function (b) { var tx = b.querySelector('.selectable-text'); return ((tx ? tx.innerText : '') || '').trim(); }).filter(Boolean).join('\n');
    if (!texto && !bolhas.length) texto = lerMensagens().filter(function (m) { return !m.eu; }).slice(-8).map(function (m) { return m.t; }).join('\n');
    var imgs = []; deles.forEach(function (b) { b.querySelectorAll('img').forEach(function (im) { var s = im.getAttribute('src') || ''; if ((/^blob:/.test(s) || /^data:image/.test(s)) && (im.naturalWidth || im.width) >= 120 && imgs.length < 4) imgs.push(s); }); });
    return { texto: texto, imgs: imgs };
  }
  async function urlParaDataUrl(u) {
    if (/^data:/.test(u)) return u;
    try { var bl = await (await fetch(u)).blob(); return await new Promise(function (ok) { var fr = new FileReader(); fr.onload = function () { ok(fr.result); }; fr.onerror = function () { ok(null); }; fr.readAsDataURL(bl); }); } catch (e) { return null; }
  }
  async function cotar() {
    if (cotando) return; cotando = true; cotErro = ''; cot = null; pintaCorpo();
    var r = await msg({ t: 'acao', acao: 'cotar', arg: { k: resp && resp.k, contato: resp && resp.contato, msgs: msgsPedido() } });
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
      var q = Math.min(o.saldo, o.qtd), mk = o.marcaPed ? ' ' + o.marca + (o.marcaOk ? '' : ' (não temos ' + o.marcaPed + ')') : ''; tot += q * o.preco; return o.cod + mk + ' — ' + o.desc + ' — ' + q + ' un' + (q < o.qtd ? ' (tenho ' + o.saldo + ')' : '') + ' — ' + reais(o.preco) + ' un';
    });
    cot.total = Math.round(tot * 100) / 100;
    var p = cot.resposta.split('\nSegue:\n'); var ini = p.length > 1 ? p[0] : ('Olá' + (nome ? ' ' + nome : '') + '!');
    var fim = cot.resposta.split('\n\n').slice(-1)[0];
    cot.resposta = ini + '\nSegue:\n' + ls.join('\n') + (tot ? '\n\nTotal: ' + reais(tot) : '') + '\n\n' + fim;
  }
  function abrirCot(pdf) {
    if (!cot) return;
    msg({ t: 'acao', acao: 'abrirCot', focar: true, arg: { k: resp && resp.k, pdf: !!pdf, itens: cot.itens.filter(function (o) { return o.cod; }).map(function (o) { return { cod: o.cod, qtd: o.qtd, marca: o.marca, desc: o.desc, marcaPed: o.marcaPed, marcaOk: o.marcaOk, codCli: o.codCli }; }) } });
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
  // 4.28 - A pedido do Vitor ("o cliente já informou as marcas… caso algum item não tenha a marca, o sistema sugere uma embaixo" + "se ele pedir albarus e
  // não tiver, a gente oferece as marcas que tiver"): marca pedida em cada linha e, quando não temos, as marcas que temos pra escolher.
  function marcaPedHtml(o, i) {
    if (!o.marcaPed) return '';
    if (o.marcaOk) return '<div class="pfwa-mp ok">✔ pediu ' + esc(o.marcaPed) + (o.trocou ? ' · você escolheu ' + esc(o.marca) : '') + '</div>';
    var h = '<div class="pfwa-mp no">✖ pediu ' + esc(o.marcaPed) + ' — não temos' + (o.achou && o.marca ? ' · entrou ' + esc(o.marca) : '') + '</div>';
    var sg = (o.sug || []);
    if (sg.length) h += '<div class="pfwa-mps">↳ temos: ' + sg.map(function (x, j) { return '<span class="pfwa-mpc' + (x.saldo > 0 ? '' : ' z') + '" data-acao="sugMarca" data-arg="' + i + '|' + j + '" title="Usar ' + esc(x.marca) + ' ' + esc(x.cod) + '">' + esc(x.marca) + (x.cod && x.cod !== o.cod ? ' ' + esc(x.cod) : '') + ' · ' + (x.saldo > 0 ? x.saldo : 'sem saldo') + (x.preco > 0 ? ' · ' + reais(x.preco) : '') + '</span>'; }).join(' ') + '</div>';
    return h;
  }
  function sugMarcaUsar(arg) {
    if (!cot) return; var p = String(arg || '').split('|'), o = cot.itens[+p[0]], x = o && o.sug && o.sug[+p[1]]; if (!x) return;
    var antes = { marca: o.marca, cod: o.cod, saldo: o.saldo, preco: o.preco, desc: o.desc };
    o.marca = x.marca; o.cod = x.cod || o.cod; o.saldo = x.saldo; o.preco = x.preco; if (x.desc) o.desc = x.desc; o.achou = true; o.marcaOk = true; o.trocou = true;
    o.sug = o.sug.filter(function (y) { return y !== x; }); if (antes.marca) o.sug.unshift({ marca: antes.marca, cod: antes.cod, saldo: antes.saldo, preco: antes.preco, desc: antes.desc });
    refazResposta(); pintaCorpo();
  }
  function htmlCot() {
    var r = resp, h = '';
    if (r && r.achou) h += cabCliente(r) + avisosHtml(r, true);
    else if (r && !r.erro && !r.grupo) h += '<div class="pfwa-sub" style="margin-bottom:6px">⚠ Contato fora do cadastro — preço com a margem padrão (SP).</div>';
    if (cotando) return h + '<div class="pfwa-vazio">Lendo a conversa e buscando saldo e preço…</div>';
    if (cotErro) return h + '<div class="pfwa-vazio">' + esc(cotErro) + '</div>';
    if (!cot) return h + '<div class="pfwa-vazio">O PF lê os códigos e a quantidade que o cliente mandou nesta conversa, mostra saldo e preço e escreve a resposta.<br><br><button class="pfwa-btn pfwa-lar" data-acao="cotar">📄 Cotar no PF</button> <button class="pfwa-btn" data-acao="cotarIA" title="Pra quando o cliente pede pelo nome da peça">🧠 Entender com IA</button></div>';
    if (!cot.itens.length) return h + '<div class="pfwa-vazio">Não achei códigos nas últimas mensagens do cliente.<br><small>Se ele pediu pelo nome da peça ("kit de vedação da 28000"), use 🧠 Entender com IA.</small><br><br><button class="pfwa-btn pfwa-lar" data-acao="cotarIA">🧠 Entender com IA</button> <button class="pfwa-btn" data-acao="cotar">🔁 Ler de novo</button></div>';
    h += '<div class="pfwa-cotinfo">' + cot.itens.length + ' código' + (cot.itens.length > 1 ? 's' : '') + (cot.geral ? ' · ' + cot.geral + ' de cada' : '') + (cot.margem != null ? ' · margem ' + cot.margem + '% · ' + esc(cot.uf) : '') + ' <span data-acao="cotar" class="pfwa-link">🔁 ler de novo</span> <span data-acao="cotarIA" class="pfwa-link">🧠 entender com IA</span>' + (cot.ia ? ' <small>(lido pela IA — confira)</small>' : '') + '</div>';
    h += '<table class="pfwa-tab"><tr><th>Código</th><th>Qtd</th><th>Saldo</th><th>Unit.</th><th></th></tr>';
    cot.itens.forEach(function (o, i) {
      var sl = !o.achou ? '<span class="no">não achei</span>' : !(o.saldo > 0) ? '<span class="no">✖ 0</span>' : o.saldo < o.qtd ? '<span class="mid">◐ ' + o.saldo + '</span>' : '<span class="ok">✔ ' + o.saldo + '</span>';
      h += '<tr><td><b>' + esc(o.cod) + '</b>' + (o.desc ? '<br><small>' + esc(o.desc) + (o.marca ? ' · ' + esc(o.marca) : '') + '</small>' : '') + marcaPedHtml(o, i) + '</td><td>' + o.qtd + '</td><td>' + sl + '</td><td>' + (o.preco > 0 ? reais(o.preco) : '—') + '</td><td><span data-acao="tirar" data-arg="' + i + '" title="Tirar da cotação" class="pfwa-tirar">✕</span></td></tr>';
    });
    h += '</table><div class="pfwa-tot"><span>Total (com saldo)</span><span>' + reais(cot.total) + '</span></div>';
    if (CFG.sug !== false) h += juntoHtml(); // 4.20 - 💡 quem leva isso também leva
    h += '<div class="pfwa-bt" style="margin-top:10px">💬 Resposta (dá pra mexer antes)</div><textarea class="pfwa-resp">' + esc(cot.resposta) + '</textarea>';
    h += '<div class="pfwa-bots"><button data-acao="escrever" class="pfwa-verde">💬 Pôr na conversa</button><button data-acao="abrirCot">📄 Abrir a cotação no PF</button><button data-acao="pdf" class="pfwa-laranja">📤 PDF</button></div>';
    h += '<div class="pfwa-nada" style="margin-top:6px">"Pôr na conversa" escreve na caixa do WhatsApp — você confere e aperta Enter. O PDF abre a cotação no PF e baixa o arquivo pra anexar.</div>';
    return h;
  }
  // 4.20 - A pedido do Vitor ("aqui no whats também pode aparecer aquelas dicas… do perfil do cliente… coisas que outros clientes do mesmo perfil consomem e ele não" → C):
  // aba Cliente = 💡 Pra oferecer (vem do 🚫 Não compra da ficha); aba Cotação = 💡 o que costuma ir junto com as peças pedidas. Nada é mandado sozinho.
  function sugHtml(r) {
    var l = r.sug || []; if (!l.length) return '';
    var h = '<div class="pfwa-bloco pfwa-sug"><div class="pfwa-bt">💡 Pra oferecer · clientes parecidos compram, ele não</div>';
    l.forEach(function (x, i) {
      h += '<div class="pfwa-sugl"><div class="pfwa-sugt"><b>' + esc(x.titulo) + '</b><small>' + esc(x.d) + '</small></div><div class="pfwa-sugb">' +
        '<span data-acao="sugPecas" data-arg="' + i + '" title="Quais peças os parecidos levam (abre no PF)">🔎 peças</span>' +
        '<span data-acao="sugOferecer" data-arg="' + i + '" class="v" title="Escreve uma frase pronta na caixa — você edita e manda">💬 Oferecer</span>' +
        '<span data-acao="sugSemDem" data-arg="' + i + '" title="Ele disse que não tem demanda: sai da lista por 6 meses">🚫</span></div></div>';
    });
    return h + '<div class="pfwa-nada" style="margin-top:4px">💬 Oferecer escreve na caixa (você manda) e guarda em 💡 Já ofereci.</div></div>';
  }
  function juntoHtml() {
    var l = (cot && cot.junto) || []; if (!l.length) return '';
    var h = '<div class="pfwa-bloco pfwa-sug"><div class="pfwa-bt">💡 Quem leva essas peças costuma levar junto</div>';
    l.forEach(function (x, i) {
      var sl = !x.achou ? 'sem cadastro' : x.saldo > 0 ? 'saldo ' + x.saldo : 'sem saldo';
      h += '<div class="pfwa-sugl"><div class="pfwa-sugt"><b>' + esc(x.cod) + (x.desc ? ' · ' + esc(x.desc) : '') + '</b><small>' + esc(x.d) + ' · ' + sl + (x.preco > 0 ? ' · ' + reais(x.preco) : '') + '</small></div>' +
        '<div class="pfwa-sugb"><span data-acao="juntoAdd" data-arg="' + i + '" class="v">➕ Pôr na cotação</span></div></div>';
    });
    return h + '</div>';
  }
  function htmlCli() {
    var r = resp, h = cabCliente(r);
    if (!r || !r.achou) { // 4.4 - não está no PF: se o cliente mandou um CNPJ, oferece cadastrar já (pré-cadastro 🌱 com os dados da Receita)
      var cn = cnpjNaConversa();
      return '<div class="pfwa-vazio">Esse contato <b>não está no PF</b>.<br><small>Procurei pelo telefone' + (r && r.nome ? ' e pelo nome' : '') + ' nos clientes e fornecedores.</small>'
        + (cn ? '<div class="pfwa-codf" style="margin-top:12px;text-align:left">🌱 O cliente mandou o <b>CNPJ ' + esc(fmtCnpj(cn)) + '</b>. Dá pra já cadastrar no PF como pré-cadastro (com os dados da Receita).<button data-acao="svCnpj" data-arg="' + esc(cn) + '">➕ Cadastrar no PF</button></div>'
          : '<div class="pfwa-nada" style="margin-top:10px">Pra cadastrar, use o 👤 ao lado do nome da conversa — dá pra pôr o CNPJ e entra como pré-cadastro 🌱.</div>')
        + '</div>';
    }
    h += avisosHtml(r, false); // 2.3 - avisos do cliente (os mesmos da cotação)
    if (r.tipo === 'cliente' && CFG.sug !== false) h += sugHtml(r); // 4.20 - 💡 pra oferecer
    if (r.tipo === 'cliente') h += resumoHtml(r); // 3.6 - 📝 resumo com IA
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
    if (config === 'auto') { c.innerHTML = htmlAuto(); return; }
    if (config) { c.innerHTML = htmlConfig(); return; }
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
    // 4.3 - A pedido do Vitor ("com o botão direito eu desligo. mas como eu ligo de volta?"): o botão direito no 📄 liga e desliga (antes só desligava)
    el.oncontextmenu = function (ev) { ev.preventDefault(); ev.stopPropagation(); avisoLigado = !avisoLigado; chrome.storage.local.set({ avisoLigado: avisoLigado }); marcaCot(); pinta(); try { var tt = document.createElement('div'); tt.textContent = avisoLigado ? '🔔 Aviso de cotação ligado' : '🔕 Aviso de cotação desligado — botão direito liga de novo'; var rc = el.getBoundingClientRect(); tt.style.cssText = 'position:fixed;z-index:10001;left:' + (rc.right + 8) + 'px;top:' + rc.top + 'px;background:#1c2940;color:#fff;font:600 12px Inter,Segoe UI,sans-serif;padding:6px 10px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,.3)'; document.body.appendChild(tt); setTimeout(function () { tt.remove(); }, 2200); } catch (e) { } };
    if (!on) el.title = avisoLigado ? 'Cotar no PF' : 'Cotar no PF · aviso de cotação DESLIGADO — botão direito liga de novo';
  }
  function pintaAviso(n) {
    avisoN = n || 0; if (AV) AV.style.display = 'none'; marcaCot();
  }
  // 1.9 - BUG (Vitor: foto aberta em tela cheia ficava com o aviso e o botão "PF" por cima): se alguma coisa do WhatsApp cobre a conversa
  // (foto, vídeo, documento, janela), esconde os avisos e os botões da extensão até fechar.
  var MEUS = '#pfwa-sp,.pfwa-selo,#pfwa,#pfwa-bots,#pfwa-aviso,#pfwa-of,#pfwa-ja,#pfwa-st,#pfwa-vf,#pfwa-menu,#pfwa-rail,#pfwa-svb,#pfwa-sv';
  // 2.8 - BUG (Vitor: documento/PDF aberto no WhatsApp ainda ficava com o aviso e o "PF" por cima): o visualizador do WhatsApp nem sempre
  // aparece no elementsFromPoint (partes com pointer-events:none). Agora também conta janela aberta (dialog/aria-modal) e imagem/vídeo/canvas
  // GRANDE fora da conversa e da lista (foto, documento, vídeo em tela cheia).
  function telaPorCima() {
    var vw = window.innerWidth, vh = window.innerHeight;
    var dl = document.querySelectorAll('[role="dialog"],[aria-modal="true"],[data-animate-media-viewer],[data-testid*="media-viewer"],[data-testid*="document-viewer"]');
    for (var i = 0; i < dl.length; i++) { var d = dl[i]; if (d.closest(MEUS)) continue; var q = d.getBoundingClientRect(); if (q.width > Math.min(280, vw * 0.4) && q.height > vh * 0.4) return true; } // 4.11 - janela "Encaminhar mensagem" (~490 px) ficava com o PF por cima
    // 4.4 - BUG (Vitor: PDF/documento aberto no WhatsApp — "Exibido por Adobe Acrobat" — ficava com os ícones do PF por cima): o leitor de PDF
    // é um <embed>/<iframe>/<object>, não img/vídeo/canvas. Agora também conta esses, grandes e fora da conversa e da lista.
    var md = document.querySelectorAll('img,video,canvas,embed,iframe,object');
    for (var j = 0; j < md.length; j++) {
      var m = md[j]; if (m.closest(MEUS) || m.closest('#main') || m.closest('#pane-side')) continue;
      var w = m.getBoundingClientRect(); if (w.width > vw * 0.3 && w.height > vh * 0.4 && w.bottom > 0 && w.top < vh) { var st = getComputedStyle(m); if (st.visibility !== 'hidden' && st.opacity !== '0' && st.display !== 'none') return true; }
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
    if (!CFG.salvar || !c || c.grupo || !el || document.documentElement.classList.contains('pfwa-coberto')) { SVB.style.display = 'none'; if (SV) SV.style.display = 'none'; svAberto = false; return; }
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
  // 4.7 - A pedido do Vitor ("coloca pra eu escolher o grupo do cliente, já pra vir com o grupo pro cadastro, ex. linha amarela")
  var SV_GRUPOS = [['amarela', 'Linha Amarela', '#E6B800'], ['agricola', 'Linha Agrícola', '#27AE60'], ['energia', 'Energia', '#1a1a1a'], ['rodoviario', 'Rodoviário', '#C0392B'], ['maritimo', 'Marítimo', '#7B3FC4'], ['portuario', 'Portuário', '#2E86DE']];
  // 4.15 - A pedido do Vitor ("preciso poder selecionar mais de um grupo e até criar outro"): multi-seleção + criar grupo (guardado neste navegador).
  var SV_GRUPOS_EXTRA = [];
  try { chrome.storage.local.get(['svGruposExtra'], function (r) { if (r && Array.isArray(r.svGruposExtra)) SV_GRUPOS_EXTRA = r.svGruposExtra; }); } catch (e) { }
  var svGrupos = [];
  function svGruposTodos() { return SV_GRUPOS.concat(SV_GRUPOS_EXTRA); }
  function svGruposRowHtml() {
    return svGruposTodos().map(function (g) { return '<span class="sv-g' + (svGrupos.indexOf(g[0]) >= 0 ? ' on' : '') + '" data-acao="svGrupo" data-arg="' + g[0] + '" data-g="' + g[0] + '" style="--c:' + g[2] + '"><i></i>' + esc(g[1]) + '</span>'; }).join('') +
      '<span class="sv-g sv-gnovo" data-acao="svGrupoNovo" title="Criar um grupo novo">➕ grupo</span>';
  }
  function svGruposRender() { var r = SV && SV.querySelector('.sv-grp'); // 4.27 - BUG: '.sv-gr' pegava a linha do TIPO (desde a 4.24)
    if (r) r.innerHTML = svGruposRowHtml(); }
  // 4.24 - A pedido do Vitor: TIPO DO CLIENTE (revenda / consumidor / concessionária / serviço) também é salvo no cadastro do PF
  var SV_TIPOS = [['revenda', '🏪 Revenda'], ['consumo', '👤 Consumidor'], ['conc', '🏛 Concessionária'], ['servico', '🔧 Serviço / oficina']], svTipo = '';
  function svTipoRowHtml() { return SV_TIPOS.map(function (t) { return '<span class="sv-g' + (svTipo === t[0] ? ' on' : '') + '" data-acao="svTipo" data-arg="' + t[0] + '" style="--c:#1F4E79">' + esc(t[1]) + '</span>'; }).join(''); }
  // 4.26 - A pedido do Vitor ("se eu colocar concessionária, quero colocar a Marca. exemplo esse é Massey"): marca da concessionária (vai pro cad.concMarcas do PF). Pode mais de uma.
  var SV_MARCAS = ['Massey Ferguson', 'John Deere', 'Valtra', 'Case IH', 'New Holland', 'Case', 'Caterpillar', 'JCB', 'Komatsu', 'Hyundai', 'Volvo CE', 'XCMG', 'Agrale', 'Yanmar'], svConcMarcas = [];
  function svMarcaRowHtml() {
    var lista = SV_MARCAS.slice();
    svConcMarcas.forEach(function (m) { if (lista.indexOf(m) < 0) lista.push(m); }); // marca digitada à mão que não está na lista
    return lista.map(function (m) { return '<span class="sv-g' + (svConcMarcas.indexOf(m) >= 0 ? ' on' : '') + '" data-acao="svMarca" data-arg="' + esc(m) + '" style="--c:#1F4E79">' + esc(m) + '</span>'; }).join('') +
      '<span class="sv-g sv-gnovo" data-acao="svMarcaNova" title="Outra marca">➕ marca</span>';
  }
  function svMarcaRender() { var r = SV && SV.querySelector('.sv-marca'); if (r) r.innerHTML = svTipo === 'conc' ? ('<div class="sv-gl">MARCA DA CONCESSIONÁRIA <span style="font-weight:600;text-transform:none;color:#8a9ab0">(pode escolher mais de uma)</span></div><div class="sv-gr">' + svMarcaRowHtml() + '</div>') : ''; }
  function svMarcaSet(m) { var i = svConcMarcas.indexOf(m); if (i >= 0) svConcMarcas.splice(i, 1); else svConcMarcas.push(m); svMarcaRender(); }
  function svMarcaNova() { var nome = (prompt('Marca da concessionária:') || '').trim(); if (!nome) return; if (svConcMarcas.indexOf(nome) < 0) svConcMarcas.push(nome); svMarcaRender(); }
  function svTipoSet(t) { svTipo = svTipo === t ? '' : t; var r = SV && SV.querySelector('.sv-tp'); if (r) r.innerHTML = svTipoRowHtml(); svMarcaRender(); }
  function svGrupoSet(g) { var i = svGrupos.indexOf(g); if (i >= 0) svGrupos.splice(i, 1); else svGrupos.push(g); svGruposRender(); }
  function svGrupoNovo() {
    var nome = (prompt('Nome do grupo novo:') || '').trim(); if (!nome) return;
    if (svGruposTodos().some(function (g) { return g[1].toUpperCase() === nome.toUpperCase(); })) { var jg = svGruposTodos().find(function (g) { return g[1].toUpperCase() === nome.toUpperCase(); }); if (jg && svGrupos.indexOf(jg[0]) < 0) svGrupos.push(jg[0]); svGruposRender(); return; }
    var cores = ['#E67E22', '#16A085', '#8E44AD', '#2C3E50', '#D35400', '#2980B9', '#C0392B'];
    var id = 'g_' + Date.now().toString(36);
    SV_GRUPOS_EXTRA.push([id, nome, cores[SV_GRUPOS_EXTRA.length % cores.length]]);
    try { chrome.storage.local.set({ svGruposExtra: SV_GRUPOS_EXTRA }); } catch (e) { }
    svGrupos.push(id); svGruposRender();
  }
  function svMontar() {
    var n = (SV.querySelector('.sv-nome') || {}).value || '', e = (SV.querySelector('.sv-emp') || {}).value || '', c = (SV.querySelector('.sv-cod') || {}).value || '';
    return [n.trim(), e.trim() ? ' - ' + e.trim() : '', c.trim() ? ' (' + c.trim().replace(/\D/g, '') + ')' : ''].join('').trim();
  }
  function svPrev() { var p = SV && SV.querySelector('.sv-prev'); if (p) p.textContent = svMontar() || '—'; }
  function svAbrir(cnpjPre) { // 4.4 - cnpjPre = CNPJ pra já preencher (veio da conversa)
    var c = contatoAt; if (!c || c.grupo) return;
    svGrupos = []; // 4.15 - começa sem grupo marcado
    var r = resp && resp.achou && resp.tipo === 'cliente' ? resp : null;
    svTipo = (r && r.tipoCli) || ''; // 4.24 - já vem com o tipo do cadastro
    svConcMarcas = (r && r.concMarcas && r.concMarcas.length) ? r.concMarcas.slice() : []; // 4.26 - marcas da concessionária já cadastradas
    svK = r ? r.k : ''; svSug = [];
    if (r && r.grupos) r.grupos.forEach(function (g) { var id = svGrupoIdDoNome(g); if (id && svGrupos.indexOf(id) < 0) svGrupos.push(id); }); // 4.27 - grupos do cadastro já marcados
    var nome = svNomeBase(c.nome) || (r && r.contato) || '', emp = svEmpBase(c.nome) || (r ? r.titulo : ''), cod = svCodBase(c.nome) || (r && r.cod) || '';
    var semNum = /^[+\d\s()\-]{8,}$/.test(c.nome || '');
    SV.innerHTML = '<div class="sv-cab"><b>👤 Salvar contato</b><span class="sv-x" data-acao="svFechar" title="Fechar">✕</span></div>' +
      '<div class="sv-tel">📱 ' + esc(c.tel ? fmtTel(c.tel) : 'número não aparece na conversa') + '</div>' +
      '<label>NOME DA PESSOA<input class="sv-nome" value="' + esc(nome) + '" placeholder="Ex.: Tiago"></label>' +
      '<label>EMPRESA (cliente do PF)<input class="sv-emp" value="' + esc(emp) + '" placeholder="Digite pra procurar no PF" autocomplete="off"></label><div class="sv-sug"></div>' +
      '<label>CARGO<input class="sv-cargo" value="' + esc((r && r.cargo) || '') + '" placeholder="Ex.: Compras, Dono, Mecânico" list="pfwa-sv-cargos"></label>' +
      '<datalist id="pfwa-sv-cargos"><option>Compras<option>Comprador<option>Dono<option>Sócio<option>Gerente<option>Financeiro<option>Mecânico<option>Encarregado<option>Vendedor<option>Balconista</datalist>' +
      '<label>CÓDIGO NO JBOSS<input class="sv-cod" value="' + esc(cod) + '" placeholder="Ex.: 12662" inputmode="numeric"></label>' +
      '<div class="sv-gl">TIPO DO CLIENTE</div><div class="sv-gr sv-tp">' + svTipoRowHtml() + '</div>' + // 4.24
      '<div class="sv-marca"></div>' + // 4.26 - marca da concessionária (só quando o tipo é Concessionária)
      '<div class="sv-gl">GRUPO DO CLIENTE <span style="font-weight:600;text-transform:none;color:#8a9ab0">(pode escolher mais de um)</span></div><div class="sv-gr sv-grp">' + svGruposRowHtml() + '</div>' +
      '<label>CNPJ <span style="font-weight:600;text-transform:none">(cliente novo entra como pré-cadastro 🌱)</span><input class="sv-cnpj" value="' + esc(fmtCnpj(cnpjPre || '')) + '" placeholder="00.000.000/0000-00" inputmode="numeric"></label>' +
      '<div class="sv-pv">Vai ficar: <b class="sv-prev"></b></div>' +
      '<div class="sv-k">' + (svK && r && r.titulo ? '🔗 ligado a <b>' + esc(r.titulo) + '</b>' : '') + '</div>' +
      '<div class="sv-bts"><button class="sv-ok" data-acao="svSalvar">💾 Salvar no PF</button><button class="sv-wa" data-acao="svWa" title="Só renomeia/salva o contato no WhatsApp (e no celular) — nada vai pro PF">📱 Só no WhatsApp</button></div>' +
      '<div class="sv-st"></div>';
    SV.style.display = 'block'; svAberto = true; svPos(); svPrev(); svMarcaRender(); // 4.26 - mostra a marca se já vier Concessionária
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
  // 4.27 - A pedido do Vitor ("não puxou as etiquetas que já tinha de outro contato… o certo seria já vir preenchido"): ao ligar numa empresa do PF,
  // tipo, grupos e marcas da concessionária do cadastro já vêm marcados (soma com o que você já tinha marcado aqui).
  function svGrupoIdDoNome(g) { g = String(g || '').trim(); if (!g) return ''; var t = svGruposTodos(), f = t.find(function (x) { return x[0] === g || x[1].toUpperCase() === g.toUpperCase(); });
    if (f) return f[0]; var id = 'g_' + g.toLowerCase().replace(/[^a-z0-9]+/g, '_'); SV_GRUPOS_EXTRA.push([id, g, '#607080']); try { chrome.storage.local.set({ svGruposExtra: SV_GRUPOS_EXTRA }); } catch (e) { } return id; }
  function svAplicarCad(inf) { if (!inf) return;
    (inf.grupos || []).forEach(function (g) { var id = svGrupoIdDoNome(g); if (id && svGrupos.indexOf(id) < 0) svGrupos.push(id); });
    if (inf.tipoCli && !svTipo) svTipo = inf.tipoCli;
    (inf.concMarcas || []).forEach(function (m) { if (svConcMarcas.indexOf(m) < 0) svConcMarcas.push(m); });
    svGruposRender(); var r = SV && SV.querySelector('.sv-tp'); if (r) r.innerHTML = svTipoRowHtml(); try { svMarcaRender(); } catch (e) { } }
  function svUsar(i) {
    var s = svSug[+i]; if (!s) return; svK = s.k; svAplicarCad(s);
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
    var _gs = svGrupos.map(function (id) { var g = svGruposTodos().find(function (x) { return x[0] === id; }); return g && /^g_/.test(id) ? g[1] : id; }).filter(Boolean); // 4.15 - grupo base = chave; grupo criado = o nome
    var r = await msg({ t: 'acao', acao: 'salvarContato', arg: { tel: c.tel, nomeWa: c.nome, nome: nomeFull, pessoa: v('sv-nome'), cargo: v('sv-cargo'), k: svK, cod: v('sv-cod'), emp: v('sv-emp'), cnpj: cn, criar: !!criar, grupo: _gs[0] || '', grupos: _gs, tipoCli: svTipo, concMarcas: svTipo === 'conc' ? svConcMarcas : [] } }); // 4.26 - marca da concessionária
    b.disabled = false; b.textContent = txt;
    var st = SV.querySelector('.sv-st');
    if (r && r.ok) {
      if (r.k && r.cli) { svK = r.k; SV.querySelector('.sv-k').innerHTML = '🔗 ligado a <b>' + esc(r.cli) + '</b>'; }
      st.innerHTML = r.cli ? ('✔ Salvo · ' + (r.prospect ? '🌱 pré-cadastro <b>' + esc(r.cli) + '</b> criado no PF' + (r.base ? ' (dados da Receita)' : '') + ' com o contato' : r.cnpjJa ? 'esse CNPJ já era de <b>' + esc(r.cli) + '</b> — contato salvo lá' : r.novo ? 'cliente <b>' + esc(r.cli) + '</b> criado no PF com o contato' : 'contato' + (v('sv-cargo') ? ' (' + esc(v('sv-cargo')) + ')' : '') + ' no cadastro de <b>' + esc(r.cli) + '</b>') + '. <span class="sv-lk" data-acao="svCadAbrir">abrir o cadastro ›</span>')
        : v('sv-emp').trim() ? ('✔ Salvo no PF. <span style="color:#9A6B00">A empresa não está no PF.</span><br><button class="sv-ok sv-cria" data-acao="svCriar">➕ Criar cliente "' + esc(v('sv-emp').trim()) + '" no PF</button>')
        : '✔ Salvo no PF (sem empresa — escreva a empresa pra ligar a um cliente).';
      ultimo = '';
      // 4.7 - A pedido do Vitor ("quando eu salvar aqui, tem que salvar o contato no WhatsApp também, do jeito que coloquei no nome"): já abre o
      // salvar/editar contato do próprio WhatsApp com o nome montado e aperta Salvar.
      if (!criar) waSalvarNome(nomeFull, st);
    }
    else st.textContent = 'Não deu — abra o PartsFlow numa aba.';
  }
  // 4.7 - salva/renomeia o contato no próprio WhatsApp: "Adicionar aos contatos" (número não salvo) ou abre os dados do contato → Editar;
  // escreve o nome (Nome = tudo, Sobrenome vazio) e aperta Salvar. O WhatsApp Web muda de cara de vez em quando — sem achar, avisa e deixa o nome copiado.
  function waVisivel(x) { var r = x.getBoundingClientRect(); return r.width > 0 && r.height > 0; }
  function waFora(x) { return !x.closest('#pfwa,#pfwa-sv,#pfwa-menu,#pfwa-rail,#pfwa-bots,#main footer,#side,#pane-side'); }
  function waBotao(re, dentro) { return Array.prototype.find.call((dentro || document).querySelectorAll('button,[role="button"],[aria-label],[title]'), function (x) { var t = (x.getAttribute('aria-label') || '') + ' ' + (x.getAttribute('title') || '') + ' ' + (x.textContent || ''); return waFora(x) && waVisivel(x) && re.test(t.trim()); }); }
  // 4.16 - A pedido do Vitor (print "Dados do contato" do Fabio Wagner): no WhatsApp novo quem salva/renomeia é o botão "Adicionar" do
  // painel (bonequinho+) pra número NÃO salvo, e "Editar contato" pra salvo. O lápis que estava sendo pego era o das ANOTAÇÕES (errado) — tirado.
  function waEhNota(x) { // o lápis das "Adicione notas sobre seu cliente" (não é o do nome)
    try { var p = x; for (var i = 0; i < 4 && p; i++) { if (/nota|note/i.test(p.textContent || '')) return true; p = p.parentElement; } } catch (e) { } return false;
  }
  function waEditarBotao() {
    // 1) "Editar contato" (contato já salvo)
    var b = waBotao(/^\s*(editar( contato)?|edit( contact)?)\s*$/i) || waBotao(/editar contato|edit contact/i);
    if (b) return b;
    // 2) "Adicionar aos contatos" / "Adicionar" do painel (número não salvo) — NUNCA "Adicionar à lista"
    b = waBotao(/adicionar aos contatos?|add to contacts?|novo contato|new contact/i);
    if (b) return b;
    b = Array.prototype.find.call(document.querySelectorAll('button,[role="button"],[aria-label]'), function (x) {
      var t = ((x.getAttribute('aria-label') || '') + ' ' + (x.getAttribute('title') || '') + ' ' + (x.textContent || '')).trim();
      return waFora(x) && waVisivel(x) && !x.closest('#main') && /^\s*(adicionar|add)\s*$/i.test(t) && !/lista|list/i.test(t);
    });
    if (b) return b;
    // 3) o lápis "Editar contato" fica no CABEÇALHO do painel "Dados do contato" (o mais ALTO da tela); o das anotações fica lá embaixo (waEhNota).
    // 4.17 - print do GIL (contato salvo): pega o lápis/ícone de editar mais alto, nunca o das notas.
    var cands = [];
    Array.prototype.forEach.call(document.querySelectorAll('button,[role="button"],span[data-icon*="contact-add"],span[data-icon*="add-user"],span[data-icon*="person-add"],span[data-icon*="edit"],span[data-icon*="pencil"]'), function (x) {
      if (!waFora(x) || !waVisivel(x) || x.closest('#main') || waEhNota(x)) return;
      var inner = x.querySelector('[data-icon]');
      var ic = (x.getAttribute('data-icon') || (inner ? inner.getAttribute('data-icon') : '') || '');
      var lab = ((x.getAttribute('aria-label') || '') + ' ' + (x.getAttribute('title') || '')).toLowerCase();
      if (!(/pencil|edit|contact-add|add-user|person-add/.test(ic) || /editar|edit/.test(lab))) return;
      cands.push({ el: x.closest('button,[role="button"]') || x, top: x.getBoundingClientRect().top });
    });
    if (cands.length) { cands.sort(function (a, c) { return a.top - c.top; }); return cands[0].el; }
    return null;
  }
  // 4.13 - quando não acha, lista os botões que estão aparecendo fora da conversa (pro Vitor mandar print e a gente acertar)
  function waDiag() {
    try {
      var vis = [], vist = {};
      Array.prototype.forEach.call(document.querySelectorAll('button,[role="button"],span[data-icon]'), function (x) {
        if (!waFora(x) || !waVisivel(x) || x.closest('#main')) return;
        var t = (x.getAttribute('aria-label') || x.getAttribute('title') || (x.getAttribute('data-icon') ? 'ícone ' + x.getAttribute('data-icon') : '') || (x.textContent || '').trim()).slice(0, 30);
        if (t && !vist[t]) { vist[t] = 1; vis.push(t); }
      });
      return '<br><span style="font-size:11px;color:#667">Botões na tela: ' + esc(vis.slice(0, 25).join(' · ') || 'nenhum') + '</span>';
    } catch (e) { return ''; }
  }
  function waEsperar(fn, ms) { return new Promise(function (ok) { var t0 = Date.now(); (function v() { var r = fn(); if (r || Date.now() - t0 > ms) ok(r || null); else setTimeout(v, 150); })(); }); }
  function waEscrever(inp, txt) {
    inp.focus();
    if (inp.tagName === 'INPUT') { var set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(inp, txt); inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new Event('change', { bubbles: true })); }
    else { try { document.execCommand('selectAll', false, null); if (txt) document.execCommand('insertText', false, txt); else document.execCommand('delete', false, null); } catch (e) { } }
  }
  // acha a chave "Sincronizar contato no telefone" da janela de contato do WhatsApp e liga (se estiver desligada). 'ok' | 'nao'
  function waSincLigar() {
    try {
      var rotulo = Array.prototype.find.call(document.querySelectorAll('span,div,label'), function (x) {
        return waFora(x) && waVisivel(x) && !x.closest('#main') && x.children.length < 3 && /sincronizar (o )?contato|sync contact|sincronizar no (telefone|celular)/i.test(x.textContent || '');
      });
      if (!rotulo) return 'nao';
      var p = rotulo, ch = null;
      for (var i = 0; i < 6 && p && !ch; i++) { ch = p.querySelector('[role="switch"],[role="checkbox"],input[type="checkbox"],[aria-checked]'); p = p.parentElement; }
      if (!ch) return 'nao';
      var lig = ch.tagName === 'INPUT' ? ch.checked : String(ch.getAttribute('aria-checked')) === 'true';
      if (!lig) ch.click();
      return 'ok';
    } catch (e) { return 'nao'; }
  }
  // 4.18 - A pedido do Vitor (print do ⋮ da conversa: "ele ainda não salva aqui"): o "Adicionar aos contatos" do número NÃO salvo mora no
  // menu ⋮ (Mais opções) do cabeçalho da conversa. Abre o ⋮ e clica no item; sem o item (contato já salvo) fecha o menu e segue o caminho antigo.
  function waMenuItem(re) {
    var best = null, bw = 1e9;
    Array.prototype.forEach.call(document.querySelectorAll('li,[role="menuitem"],[role="button"],[role="option"],div[aria-label],span[dir]'), function (x) {
      if (!waVisivel(x) || x.closest('#pfwa,#pfwa-sv,#pfwa-menu,#pfwa-rail,#pfwa-bots,#pane-side')) return;
      var t = ((x.getAttribute('aria-label') || '') + ' ' + (x.textContent || '')).trim();
      if (!re.test(t) || t.length > 60) return;
      var w = x.getBoundingClientRect().width * x.getBoundingClientRect().height; if (w < bw) { bw = w; best = x; }
    });
    return best ? (best.closest('li,[role="menuitem"],[role="button"],[role="option"]') || best) : null;
  }
  function waClicar(x) { try { ['pointerdown', 'mousedown', 'pointerup', 'mouseup'].forEach(function (k) { x.dispatchEvent(new MouseEvent(k, { bubbles: true })); }); } catch (e) { } x.click(); }
  async function waPeloMenuMais() {
    var hd = $('#main header'); if (!hd) return null;
    var mais = Array.prototype.find.call(hd.querySelectorAll('button,[role="button"],span[data-icon]'), function (x) {
      var ic = x.getAttribute('data-icon') || ((x.querySelector('[data-icon]') || {}).getAttribute ? (x.querySelector('[data-icon]') ? x.querySelector('[data-icon]').getAttribute('data-icon') : '') : '');
      var lab = (x.getAttribute('aria-label') || '') + ' ' + (x.getAttribute('title') || '');
      return /mais op|more op|^\s*menu\s*$/i.test(lab) || /^menu$|more-refreshed|kebab|menu-refreshed/.test(ic || '');
    });
    if (!mais) return null;
    mais = mais.closest('button,[role="button"]') || mais;
    waClicar(mais);
    var it = await waEsperar(function () { return waMenuItem(/^\s*(adicionar aos contatos|add to contacts|editar contato|edit contact)\s*$/i); }, 1500);
    if (!it) { try { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true })); } catch (e) { } return null; }
    waClicar(it); return 'ok';
  }
  async function waSalvarNome(nomeFull, st) {
    var c = contatoAt; if (!c || !nomeFull) return;
    var dizer = function (h) { if (st) st.innerHTML += '<br>' + h; };
    try { navigator.clipboard.writeText(nomeFull); } catch (e) { }
    if (String(c.nome || '').trim() === nomeFull.trim()) { dizer('📱 No WhatsApp já está com esse nome.'); return; }
    var bt = waBotao(/adicionar aos contatos|add to contacts/i, $('#main'));
    var peloMenu = false;
    if (!bt) { if (await waPeloMenuMais()) peloMenu = true; }
    if (!bt && !peloMenu) {
      // 4.13 - A pedido do Vitor ("pq não salva no whats?"): abre os "Dados do contato" pelo botão do cabeçalho (não pelo span) e procura o
      // Editar também pelo ícone do lápis (no WhatsApp novo o botão não tem texto)
      bt = waEditarBotao();
      if (!bt) {
        var cab = $('#main header'); var alvo = null;
        if (cab) { var tt = cab.querySelector('span[title],span[dir="auto"]'); alvo = (tt && tt.closest('[role="button"],[tabindex]')) || cab.querySelector('[role="button"]') || tt || cab; }
        if (alvo) { try { alvo.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); alvo.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })); } catch (e) { } alvo.click(); }
        bt = await waEsperar(waEditarBotao, 4000);
      }
    }
    if (!bt && !peloMenu) { dizer('📱 Não achei o "Editar contato" do WhatsApp — o nome está copiado: abra os dados do contato → Editar e cole (Ctrl+V).' + waDiag()); return; }
    if (bt) bt.click();
    var inps = await waEsperar(function () { var l = Array.prototype.filter.call(document.querySelectorAll('input[type="text"],input:not([type]),div[contenteditable="true"]'), function (x) { return waFora(x) && waVisivel(x) && !x.closest('#main'); }); return l.length ? l : null; }, 2500);
    if (!inps) { dizer('📱 Abri o contato no WhatsApp, mas não achei o campo do nome — cole o nome (já copiado).'); return; }
    waEscrever(inps[0], nomeFull);
    if (inps[1] && inps[1].tagName === 'INPUT' && !/\d{4}/.test(inps[1].value || '')) waEscrever(inps[1], '');
    // 4.8 - A pedido do Vitor ("já deixa a extensão ligada para isso"): liga o "Sincronizar contato no telefone" → vai pra agenda do celular também
    var sinc = waSincLigar();
    var salvar = await waEsperar(function () { return waBotao(/^\s*(salvar|save)\s*$/i); }, 1500);
    if (salvar) { setTimeout(function () { salvar.click(); }, 300); dizer('📱 Salvo no WhatsApp como <b>' + esc(nomeFull) + '</b>' + (sinc === 'ok' ? ' e na agenda do celular' : sinc === 'nao' ? ' (não achei a opção "Sincronizar no telefone" — confira no celular)' : '') + '.'); }
    else dizer('📱 Escrevi o nome no contato do WhatsApp — confira e aperte Salvar.');
  }
  // 4.10 - A pedido do Vitor ("e se eu quiser salvar o contato só aqui no whats?"): "📱 Só no WhatsApp" = só o salvar/editar do WhatsApp (com o
  // Sincronizar no telefone), sem gravar nada no PF. A rotina antiga ficou em svWaAntigo.
  function svWa() {
    var nomeFull = svMontar(); var st = SV.querySelector('.sv-st');
    if (!nomeFull) { st.textContent = 'Escreva o nome.'; return; }
    st.innerHTML = '📱 Salvando só no WhatsApp…';
    waSalvarNome(nomeFull, st);
  }
  function svWaAntigo() {
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
    B.className = (visual === 'D' ? 'pfwa-barra' : 'pfwa-coluna') + (botsMin ? ' pfwa-min' : ''); B.style.display = CFG.bots ? 'flex' : 'none';
    if (botsMin) { B.innerHTML = '<span data-acao="botsToggle" class="pri pfwa-botspf" title="Mostrar os bot\u00f5es do PF">PF</span>'; }
    else { var tog = '<span data-acao="botsToggle" class="pfwa-botsx" title="Esconder os bot\u00f5es do PF">' + (visual === 'D' ? '\u2039' : '\u2013') + '</span>'; B.innerHTML = tog + BOTOES.map(function (b, i) { var off = b[0] === 'audio' && CFG.audio === false; var tt = b[0] === 'audio' ? ('Descrever áudios: ' + (off ? 'DESLIGADO — clique pra ligar' : 'ligado — clique pra desligar')) : b[2]; return '<span data-acao="b-' + b[0] + '" class="' + (i === 0 ? 'pri' : '') + (off ? ' pfwa-boff' : '') + '" title="' + tt + '">' + b[1] + (visual === 'D' ? ' ' + b[2] : '') + '</span>'; }).join(''); }
    marcaCot();
    // 3.5 - A pedido do Vitor ("esse PF aí, desbloqueia pra eu poder colocar ele pra cima ou pra baixo"): arrastar a coluna/barra (ou o PF minimizado)
    // muda a altura; guardada por navegador (chrome.storage.local botsDy) e presa dentro da conversa.
    var baseTop = visual === 'D' ? (r.bottom - fh - 58) : (r.top + hh + 70);
    var bh = B.getBoundingClientRect().height || 40, minT = r.top + hh + 6, maxT = r.bottom - fh - bh - 6;
    var tp = Math.max(minT, Math.min(maxT, baseTop + (botsDy[visual] || 0)));
    B.style.left = (visual === 'D' ? (r.left + r.width / 2) : (r.left + 12)) + 'px'; B.style.top = tp + 'px';
    B._pfBase = baseTop; B._pfMin = minT; B._pfMax = maxT;
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
    var nCod = c && !c.grupo ? pareceCotacao(msgsPedido()) : 0;
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
    if (!CFG.ofertas || !resp || resp.tipo !== 'cliente' || !resp.k || !contatoAt || contatoAt.grupo) { if (ofPend.length) { ofPend = []; pintaOferta(); } return; }
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
    if (!CFG.ja || t.length < 4 || !resp || resp.tipo !== 'cliente' || !resp.k) { jaR = null; pintaJa(); return; }
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
    if (!CFG.verif || !contatoAt || contatoAt.grupo) { if (vfR) { vfR = null; pintaVf(); } return; }
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
  function audGruposDe(s) { var g = Array.isArray(s.grupos) && s.grupos.length ? s.grupos : (s.grupo ? [s.grupo] : []); return g.filter(function (x, i) { return x && g.indexOf(x) === i; }); }
  function linhasLista() {
    var pane = $('#pane-side'); if (!pane) return [];
    var rows = pane.querySelectorAll('[role="listitem"]'); if (!rows.length) rows = pane.querySelectorAll('div[role="row"]');
    var out = [];
    rows.forEach(function (r) {
      var ne = r.querySelector('span[title]'); var nome = ne ? (ne.getAttribute('title') || '').trim() : ''; if (!nome) return;
      var tel = /^[+\d][\d\s()\-]{7,}$/.test(nome) ? nome.replace(/\D/g, '') : '';
      var etqs = []; r.querySelectorAll('[aria-label]').forEach(function (e) { var a = (e.getAttribute('aria-label') || '').trim(); var m = a.match(/^(?:Etiqueta|Label)[:\s]+(.+)$/i); if (m) { var t = m[1].trim(); if (t && etqs.indexOf(t) < 0) etqs.push(t); } });
      var unread = !!r.querySelector('[aria-label*="ão lida"],[aria-label*="ão lidas"],[aria-label*="nread"]');
      // 4.22 - hora da última mensagem (10:02 / Ontem / quinta / 05/11/2026) → o PF guarda o último contato do cliente
      var hora = ''; (r.innerText || '').split('\n').some(function (t) { t = t.trim(); if (/^(\d{1,2}:\d{2}|ontem|yesterday|domingo|segunda|ter[çc]a|quarta|quinta|sexta|s[áa]bado|sunday|monday|tuesday|wednesday|thursday|friday|saturday|\d{1,2}\/\d{1,2}\/\d{2,4})(\b|$)/i.test(t) && t.length <= 22) { hora = t; return true; } return false; });
      out.push({ el: r, nome: nome, tel: tel, etqs: etqs, unread: unread, hora: hora });
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
      msg({ t: 'acao', acao: 'situacoes', arg: { lista: ls.map(function (x) { return { nome: x.nome, tel: x.tel, hora: x.hora }; }) } }).then(function (r) { if (r && r.sit) sitCache = r.sit; pintarMenu(); });
    }, 500);
  }
  // 4.21 - A pedido do Vitor (prévia E1, docs/referencias/whatsapp-etiquetas-lista/previa5): cliente do PF = faixa da cor do grupo na esquerda,
  // "GRUPO · 📍 Cidade-UF" no fim da linha da mensagem (antes da bolinha de não lidas) e o tipo (Revenda/Consumidor/Serviço/Concessionária)
  // na linha da etiqueta do WhatsApp, que some (⚙️ "Esconder etiquetas do WhatsApp"). A linha da conversa tem altura fixa no WhatsApp:
  // sem etiqueta do WhatsApp, o tipo vai só no title da linha. O "📄 cot. N" saiu.
  function filhoQueTem(anc, el) { var x = el; while (x && x.parentElement !== anc) x = x.parentElement; return x; }
  function ancComum(a, b) { var x = a; while (x && !x.contains(b)) x = x.parentElement; return x; }
  function rowLimpar(r) {
    r.querySelectorAll('.pfwa-rowb,.pfwa-rowbar,.pfwa-rowln,.pfwa-rowtp,.pfwa-rowgp').forEach(function (e) { e.remove(); });
    r.querySelectorAll('[data-pfwa-esc]').forEach(function (e) { e.style.display = ''; e.removeAttribute('data-pfwa-esc'); });
  }
  function badgesRender() {
    var pane = $('#pane-side');
    if (!menuLig || !CFG.etq || !pane) { if (pane) pane.querySelectorAll('[role="listitem"],div[role="row"]').forEach(rowLimpar); return; }
    linhasLista().forEach(function (x) {
      var r = x.el, s = sitCache[x.nome] || {};
      var tit = r.querySelector('span[title]'); if (!tit) return;
      var sps = r.querySelectorAll('span[title]'), prev = null;
      for (var i = 0; i < sps.length; i++) if (sps[i] !== tit && !tit.contains(sps[i]) && !sps[i].closest('.pfwa-rowln,.pfwa-rowtp')) { prev = sps[i]; break; }
      var txt = '', txtFull = '', bar = '', tp = '', gh = '';
      if (s.tipo === 'cliente') {
        var gl = (s.gcs && s.gcs.length) ? s.gcs : (s.grupo ? [{ l: s.grupo, c: s.gCor, t: s.gTxt }] : []);
        var lugar = [s.cid, s.uf].filter(Boolean).join('-');
        gh = gl.map(function (g) { return '<b style="color:' + esc(g.t && g.t !== '#fff' && g.t !== '#FFFFFF' ? g.t : (g.c || '#1F4E79')) + '">' + esc(String(g.l).replace(/^linha\s+/i, 'L. ')) + '</b>'; }).join(' ');
        var cityHtml = lugar ? '📍 ' + esc(lugar) : '';
        // 4.25 / v115.2669 - A pedido do Vitor ("mude somente essa do grupo… linha amarela, agrícola"): o GRUPO desce pra linha 3 (não espreme a prévia da mensagem); a 📍 cidade continua na linha da mensagem.
        txt = cityHtml || '🤝 cliente do PF';
        txtFull = [gh, cityHtml].filter(Boolean).join(' <i>·</i> ') || '🤝 cliente do PF';
        if (gl.length) { var n = gl.length, st = gl.map(function (g, k) { return (g.c || '#1F4E79') + ' ' + (k * 100 / n) + '% ' + ((k + 1) * 100 / n) + '%'; }).join(','); bar = 'linear-gradient(to bottom,' + st + ')'; }
        tp = s.tpc || '';
      } else if (s.tipo === 'fornecedor') { txt = '🏭 fornecedor' + (s.mapa ? ' · mapa ' + esc(s.mapa) : ''); txtFull = txt; }
      var sig = txt + '|' + gh + '|' + bar + '|' + tp + '|' + (CFG.waEtqOff !== false ? 1 : 0) + '|' + (x.unread ? 1 : 0);
      if (r.getAttribute('data-pfwa-sig') === sig && (!txt || r.querySelector('.pfwa-rowln'))) return;
      rowLimpar(r); r.setAttribute('data-pfwa-sig', sig); r.removeAttribute('title');
      if (!txt) return;
      // faixa da cor
      if (bar) {
        if (getComputedStyle(r).position === 'static') r.style.position = 'relative';
        var fb = document.createElement('div'); fb.className = 'pfwa-rowbar'; fb.style.background = bar; r.appendChild(fb);
      }
      // linha 2: antes da bolinha de não lidas
      var ln = document.createElement('span'); ln.className = 'pfwa-rowln'; ln.innerHTML = txt;
      try { ln.style.setProperty('color', getComputedStyle(tit).color, 'important'); } catch (e) { } // 4.24 - mesma cor do nome (forte no tema claro e no escuro)
      var unr = r.querySelector('[aria-label*="ão lida"],[aria-label*="ão lidas"],[aria-label*="nread"]');
      if (prev) {
        var anc = ancComum(tit, prev), L2 = anc ? filhoQueTem(anc, prev) : null;
        if (L2 && unr && L2.contains(unr) && L2 !== unr) { var u = filhoQueTem(L2, unr); var uu = u; while (uu && uu.parentElement && uu.parentElement !== L2 && uu.parentElement.children.length === 1) uu = uu.parentElement; L2.insertBefore(ln, u); }
        else if (L2 && L2 !== prev) L2.appendChild(ln);
        else prev.parentNode.insertBefore(ln, prev.nextSibling);
      } else { var h = tit.parentElement; h.appendChild(ln); }
      // linha 3: tipo no lugar da etiqueta do WhatsApp
      // 4.24 - BUG (print do Tiago - Maximus: "ainda está aparecendo a etiqueta do whats"): no WhatsApp de verdade a etiqueta NÃO tem aria-label
      // "Etiqueta…". Agora a linha 3 = toda linha da conversa que vem DEPOIS da linha da mensagem (no mesmo bloco do nome).
      var L3s = [];
      if (prev) { var anc3 = ancComum(tit, prev), L2b = anc3 ? filhoQueTem(anc3, prev) : null, achouL2 = false;
        if (anc3 && L2b) Array.prototype.forEach.call(anc3.children, function (ch) { if (ch === L2b) { achouL2 = true; return; } if (achouL2 && !ch.classList.contains('pfwa-rowbar')) L3s.push(ch); }); }
      if (!L3s.length) { var etq = r.querySelector('[aria-label^="Etiqueta"],[aria-label^="Label"]'); if (etq) { var a3 = ancComum(tit, etq), L3x = a3 ? filhoQueTem(a3, etq) : null; if (L3x && !L3x.contains(tit) && !(prev && L3x.contains(prev))) L3s.push(L3x); } }
      if (s.tipo === 'cliente' && CFG.waEtqOff !== false && L3s.length) {
        var L3 = L3s[0];
        L3s.forEach(function (L) { Array.prototype.forEach.call(L.children, function (c) { c.setAttribute('data-pfwa-esc', '1'); c.style.display = 'none'; }); });
        if (gh) { var g3 = document.createElement('span'); g3.className = 'pfwa-rowgp'; g3.innerHTML = gh; L3.appendChild(g3); } // v115.2669 - grupo à esquerda da linha 3
        if (tp) { var t3 = document.createElement('span'); t3.className = 'pfwa-rowtp'; t3.textContent = tp; try { if (prev) t3.style.setProperty('color', getComputedStyle(prev).color, 'important'); } catch (e) { } L3.appendChild(t3); }
      } else {
        // v115.2669 - conversa sem uma 3ª linha: o grupo volta pra linha da mensagem (como antes), pra não sumir
        if (gh && ln && s.tipo === 'cliente') ln.innerHTML = txtFull;
        if (tp) r.setAttribute('title', tp);
      }
    });
  }
  function aplicarFiltro() {
    var rows = document.querySelectorAll('#pane-side [role="listitem"]');
    if (!menuLig || !(menuFiltro.indexOf('g:') === 0 || menuFiltro === 'semg')) { rows.forEach(function (r) { r.style.display = ''; }); return; }
    linhasLista().forEach(function (x) {
      var s = sitCache[x.nome] || {}, ok = false;
      if (menuFiltro.indexOf('g:') === 0) ok = s.tipo === 'cliente' && audGruposDe(s).indexOf(menuFiltro.slice(2)) >= 0;
      else if (menuFiltro === 'semg') ok = s.tipo === 'cliente' && !audGruposDe(s).length;
      else if (menuFiltro === 'cliente') ok = s.tipo === 'cliente';
      else if (menuFiltro === 'fornecedor') ok = s.tipo === 'fornecedor';
      else if (menuFiltro === 'cot') ok = !!s.cot;
      else if (menuFiltro === 'semresp') ok = true; // 4.12 - filtro saiu (quem tinha ele salvo vê tudo)
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
    // 4.19 - A pedido do Vitor ("ao invés desses filtros, vamos deixar os grupos. Linha amarela, etc"): a barra mostra os GRUPOS dos clientes
    // (do cadastro no PF) + "Sem grupo" (cliente sem grupo marcado). Clicar = só as conversas daquele grupo.
    var gN = {}, gCor = {}, nSemG = 0;
    linhasLista().forEach(function (x) { var s = sitCache[x.nome] || {}; if (s.tipo !== 'cliente') return; var gs = audGruposDe(s); if (!gs.length) { nSemG++; return; } gs.forEach(function (g) { gN[g] = (gN[g] || 0) + 1; if (s.gCor && g === s.grupo) gCor[g] = s.gCor; }); });
    var ordem = svGruposTodos().map(function (g) { return g[1]; }); svGruposTodos().forEach(function (g) { if (g[2] && !gCor[g[1]]) gCor[g[1]] = g[2]; });
    var gKeys = Object.keys(gN).sort(function (a, b) { var ia = ordem.indexOf(a), ib = ordem.indexOf(b); ia = ia < 0 ? 99 : ia; ib = ib < 0 ? 99 : ib; return ia - ib || gN[b] - gN[a]; });
    var pillG = function (k, txt, n, cor) { return '<span class="pfm-pill' + (menuFiltro === k ? ' on' : '') + '" data-acao="menuFiltro" data-arg="' + esc(k) + '">' + (cor ? '<i class="pfm-dot" style="background:' + esc(cor) + '"></i>' : '') + txt + ' <b>' + n + '</b></span>'; };
    var hG = '<span class="pfm-logo">PF</span>' + '<span class="pfm-pill' + (menuFiltro.indexOf('g:') !== 0 && menuFiltro !== 'semg' ? ' on' : '') + '" data-acao="menuFiltro" data-arg="">Tudo</span>';
    gKeys.forEach(function (g) { hG += pillG('g:' + g, esc(g), gN[g], gCor[g]); });
    if (nSemG) hG += pillG('semg', '❔ Sem grupo', nSemG, '');
    if (!gKeys.length && !nSemG) hG += '<span class="pfm-vazio">Nenhum cliente do PF nesta lista ainda</span>';
    var ls = linhasLista(), nC = 0, nF = 0, nCot = 0, nSem = 0, etqN = {};
    ls.forEach(function (x) { var s = sitCache[x.nome] || {}; if (s.tipo === 'cliente') nC++; else if (s.tipo === 'fornecedor') nF++; if (s.cot) nCot++; if (x.unread) nSem++; x.etqs.forEach(function (e) { etqN[e] = (etqN[e] || 0) + 1; }); });
    var etqTop = Object.keys(etqN).sort(function (a, b) { return etqN[b] - etqN[a]; }).slice(0, 5);
    var pill = function (k, txt, n) { return '<span class="pfm-pill' + (menuFiltro === k ? ' on' : '') + '" data-acao="menuFiltro" data-arg="' + esc(k) + '">' + txt + (n != null ? ' <b>' + n + '</b>' : '') + '</span>'; };
    var h = hG; // a barra antiga (Clientes/Fornecedores/etiquetas/Cotação aberta) saiu na 4.19
    h += '<span class="pfm-dir"><span class="pfm-cor"><i data-acao="menuCor" data-arg="azul" class="' + (menuCor !== 'discreta' ? 'on' : '') + '">azul</i><i data-acao="menuCor" data-arg="discreta" class="' + (menuCor === 'discreta' ? 'on' : '') + '">discreta</i></span><span class="pfm-tog" data-acao="menuTog" title="Desligar o Menu do PF">Menu do PF <span class="pfm-sw"></span></span></span>';
    MENU.innerHTML = h;
    var rail = [['vendas', '📄', 'Cotações'], ['kanban', '🗂️', 'Quadro de vendas'], ['mesa', '🛒', 'Mesa do comprador'], ['home', '🏠', 'Início do PF'], ['ext', '🧩', 'PartsFlow no WhatsApp']];
    RAIL.innerHTML = rail.map(function (r) { return '<span data-acao="irTela" data-arg="' + r[0] + '" title="' + r[2] + '">' + r[1] + '</span>'; }).join('');
    badgesRender(); aplicarFiltro();
  }

  // ═══ ⚡ RESPOSTAS RÁPIDAS (3.7) ═══
  // ⚡ (botão do PF) ou "/" no começo da caixa de texto abre a lista: as prontas deste cliente + os ATALHOS DE TEXTO do PF, com as
  // variáveis ({nome}, {empresa}, {cidade}…) já trocadas pelos dados do cliente da conversa. Escolher = o texto vai pra caixa; VOCÊ manda.
  var rrAuto = true, RR = null, rrAberto = false, rrSlash = false, rrDados = null, rrChave = '', rrTs = 0, rrSel = 0, rrQ = '', rrModo = '', rrLista = [];
  function rrEl() { if (!RR) { RR = document.createElement('div'); RR.id = 'pfwa-rr'; document.body.appendChild(RR); RR.addEventListener('click', rrClique); RR.addEventListener('input', rrInput); RR.addEventListener('keydown', rrTecla); } return RR; }
  function rrPos() {
    if (!RR || !rrAberto) return; var main = $('#main'); if (!main) { rrFechar(); return; }
    var r = main.getBoundingClientRect(), foot = main.querySelector('footer'), fh = foot ? foot.getBoundingClientRect().height : 62;
    RR.style.left = (r.left + 16) + 'px'; RR.style.width = Math.min(560, Math.max(320, r.width - 32)) + 'px';
    RR.style.bottom = (window.innerHeight - r.bottom + fh + 8) + 'px'; RR.style.maxHeight = Math.max(240, r.height - fh - 120) + 'px';
  }
  async function rrCarregar(forcar) {
    var ch = ultimo;
    if (!forcar && rrDados && rrChave === ch && Date.now() - rrTs < 20000) return;
    var r = await msg({ t: 'acao', acao: 'respostas', arg: { k: resp && resp.k, nome: contatoAt && contatoAt.nome, tel: contatoAt && contatoAt.tel, contato: resp && resp.contato } });
    if (ch !== ultimo) return;
    rrDados = r && r.ok ? r : { erro: (r && r.erro) || 'semPF' }; rrChave = ch; rrTs = Date.now();
  }
  async function rrAbrir(q, slash) {
    if (!contatoAt) return; rrEl(); rrAberto = true; rrSlash = !!slash; rrQ = q || ''; rrSel = 0; rrModo = ''; rrAuto = true;
    if (!rrDados || rrChave !== ultimo) { RR.style.display = 'flex'; RR.innerHTML = '<div class="rr-cab"><b>⚡ Respostas rápidas</b></div><div class="rr-nada">Carregando do PF…</div>'; rrPos(); }
    await rrCarregar(); if (!rrAberto) return; rrPinta();
    if (!rrSlash) { var i = RR.querySelector('.rr-q'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }
  }
  function rrFechar() { rrAberto = false; rrSlash = false; rrModo = ''; if (RR) RR.style.display = 'none'; }
  function rrNorm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function rrFiltrar() {
    var out = [], q = rrNorm(rrQ).trim().split(/\s+/).filter(Boolean);
    ((rrDados && rrDados.grupos) || []).forEach(function (g) {
      var it = (g.itens || []).filter(function (x) { var a = rrNorm(x.t + ' ' + x.txt); return q.every(function (w) { return a.indexOf(w) >= 0; }); });
      if (q.length) { var nt = function (x) { var a = rrNorm(x.t); return q.every(function (w) { return a.indexOf(w) >= 0; }) ? 0 : 1; }; it = it.map(function (x, i) { x._nt = nt(x); return [x._nt, i, x]; }).sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; }).map(function (y) { return y[2]; }); }
      out.push({ t: g.t, vazio: g.vazio, itens: it });
    });
    return out;
  }
  function rrPinta() {
    if (!RR || !rrAberto) return; RR.style.display = 'flex';
    var D = rrDados || {}, h = '<div class="rr-cab"><b>⚡ Respostas rápidas</b>' + (D.cli ? '<small>com os dados de ' + esc(D.cli) + '</small>' : '<small>sem cliente do PF nesta conversa</small>') +
      '<span class="rr-lk" data-rr="vars" title="Ver as variáveis e o valor delas nesta conversa">🔤 Variáveis</span><span class="rr-x" data-rr="fechar" title="Fechar (Esc)">✕</span></div>';
    if (D.erro) { RR.innerHTML = h + '<div class="rr-nada">' + (D.erro === 'pfF5' ? 'Dê F5 na aba do PartsFlow.' : 'Abra o PartsFlow numa aba deste Chrome.') + '</div>'; rrPos(); return; }
    if (rrModo === 'vars') {
      h += '<div class="rr-corpo"><div class="rr-nada" style="text-align:left">Escreva a variável no atalho de texto (no PF) e ela é trocada pelo dado do cliente na hora de usar. Clique numa pra pôr <b>o valor</b> na caixa.</div>' +
        (D.vars || []).map(function (v) { return '<div class="rr-var' + (v.v ? '' : ' rr-vazia') + '" data-rr="var" data-v="' + esc(v.v) + '"><code>{' + esc(v.k) + '}</code><span>' + esc(v.d) + '</span><b>' + (v.v ? esc(v.v) : '— sem dado') + '</b></div>'; }).join('') + '</div>' +
        '<div class="rr-rod"><span class="rr-lk" data-rr="voltar">‹ Voltar pras respostas</span></div>';
      RR.innerHTML = h; rrPos(); return;
    }
    if (rrModo === 'salvar') {
      var cx = caixaTexto(), tx = cx ? (cx.innerText || '').trim() : '';
      h += '<div class="rr-corpo"><div class="rr-sv"><label>Nome da resposta<input class="rr-svn" placeholder="ex.: Dados bancários, Prazo de entrega…"></label>' +
        '<div class="rr-svt">' + (tx ? esc(tx) : '<i>Escreva a mensagem na caixa do WhatsApp primeiro.</i>') + '</div>' +
        '<label class="rr-svc"><input type="checkbox" class="rr-svtr" checked> trocar o nome do cliente, da empresa e a saudação por {nome}, {empresa} e {saudacao} (serve pra todos)</label>' +
        '<div class="rr-svst"></div></div></div><div class="rr-rod"><span class="rr-lk" data-rr="voltar">‹ Voltar</span><button data-rr="svOk"' + (tx ? '' : ' disabled') + '>💾 Salvar no PF</button></div>';
      RR.innerHTML = h; rrPos(); var n = RR.querySelector('.rr-svn'); if (n) n.focus(); return;
    }
    if (!rrSlash) h += '<input class="rr-q" placeholder="Procurar resposta…" value="' + esc(rrQ) + '">';
    else h += '<div class="rr-dica">Procurando: <b>/' + esc(rrQ) + '</b> · ↑ ↓ escolhe · Enter põe na caixa · Esc fecha</div>';
    var G = rrFiltrar(); rrLista = [];
    if (rrAuto && rrQ) { var _f = []; G.forEach(function (g) { _f = _f.concat(g.itens); }); var _j = _f.findIndex(function (x) { return x._nt === 0; }); rrSel = _j > 0 ? _j : 0; }
    h += '<div class="rr-corpo">';
    G.forEach(function (g) {
      h += '<div class="rr-gt">' + esc(g.t) + '</div>';
      if (!g.itens.length) { h += '<div class="rr-nada">' + esc(rrQ ? 'Nada com esse nome.' : (g.vazio || 'nenhuma')) + '</div>'; return; }
      g.itens.forEach(function (x) {
        var i = rrLista.length; rrLista.push(x);
        h += '<div class="rr-it' + (i === rrSel ? ' on' : '') + (x.form ? ' rr-form' : '') + '" data-rr="usar" data-i="' + i + '"><b>' + esc(x.t) + '</b>' +
          (x.falta && x.falta.length ? '<span class="rr-falta" title="Esse cliente não tem esse dado no cadastro — sai em branco">⚠ sem ' + esc(x.falta.join(', ')) + '</span>' : '') +
          (x.form ? '<span class="rr-falta">📝 abre no PF</span>' : '') + '<small>' + esc(x.txt) + '</small></div>';
      });
    });
    h += '</div><div class="rr-rod"><span class="rr-lk" data-rr="salvar" title="Pega o que está escrito na caixa e guarda como atalho de texto do PF">➕ Salvar o que escrevi como resposta</span><span class="rr-lk" data-rr="pf" title="Ferramentas → Atalhos de Texto">✏️ Editar no PF</span></div>';
    RR.innerHTML = h; rrPos();
    var on = RR.querySelector('.rr-it.on'); if (on) on.scrollIntoView({ block: 'nearest' });
  }
  function rrPor(texto) {
    var cx = caixaTexto(); if (!cx) return false;
    if (rrSlash) { cx.focus(); try { document.execCommand('selectAll', false, null); } catch (e) { } }
    return escreverNaCaixa(texto);
  }
  async function rrUsar(i) {
    var x = rrLista[i]; if (!x) return;
    if (x.form) { msg({ t: 'acao', acao: 'rrForm', arg: x.id, focar: true }); rrFechar(); return; }
    var ok = rrPor(x.txt); rrFechar();
    if (ok) msg({ t: 'acao', acao: 'rrUsou', arg: x.id });
  }
  async function rrClique(e) {
    var el = e.target.closest('[data-rr]'); if (!el) return; var a = el.getAttribute('data-rr');
    e.preventDefault(); e.stopPropagation();
    if (a === 'fechar') { rrFechar(); return; }
    if (a === 'usar') { rrUsar(+el.getAttribute('data-i')); return; }
    if (a === 'vars') { rrModo = rrModo === 'vars' ? '' : 'vars'; rrPinta(); return; }
    if (a === 'voltar') { rrModo = ''; rrPinta(); return; }
    if (a === 'var') { var v = el.getAttribute('data-v'); if (v) { rrSlash = false; escreverNaCaixa(v); } return; }
    if (a === 'salvar') { rrSlash = false; rrModo = 'salvar'; rrPinta(); return; }
    if (a === 'pf') { msg({ t: 'acao', acao: 'irTela', arg: { tela: 'atalhos' }, focar: true }); rrFechar(); return; }
    if (a === 'svOk') {
      var n = (RR.querySelector('.rr-svn') || {}).value || '', st = RR.querySelector('.rr-svst'), cx = caixaTexto(), tx = cx ? (cx.innerText || '').trim() : '';
      if (!n.trim()) { st.textContent = 'Dê um nome pra resposta.'; RR.querySelector('.rr-svn').focus(); return; }
      if (!tx) { st.textContent = 'A caixa do WhatsApp está vazia.'; return; }
      el.disabled = true; st.textContent = 'Salvando…';
      var r = await msg({ t: 'acao', acao: 'rrSalvar', arg: { nome: n.trim(), texto: tx, trocar: !!(RR.querySelector('.rr-svtr') || {}).checked, k: resp && resp.k, contato: contatoAt && contatoAt.nome } });
      if (r && r.ok) { st.innerHTML = '✔ Salvo nos Atalhos de Texto do PF como <b>' + esc(n.trim()) + '</b>:<br><small>' + esc(r.texto || '') + '</small>'; rrDados = null; setTimeout(function () { if (rrModo === 'salvar') { rrModo = ''; rrCarregar(true).then(rrPinta); } }, 2200); }
      else { el.disabled = false; st.textContent = 'Não deu — abra o PartsFlow numa aba.'; }
    }
  }
  function rrInput(e) { if (e.target.classList.contains('rr-q')) { rrQ = e.target.value; rrSel = 0; rrAuto = true; var p = e.target.selectionStart; rrPinta(); var i = RR.querySelector('.rr-q'); if (i) { i.focus(); i.setSelectionRange(p, p); } } }
  function rrMover(d) { rrAuto = false; if (!rrLista.length) return; rrSel = (rrSel + d + rrLista.length) % rrLista.length; rrPinta(); if (!rrSlash) { var i = RR.querySelector('.rr-q'); if (i) i.focus(); } }
  function rrTecla(e) {
    if (!e.target.classList.contains('rr-q')) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); rrMover(1); } else if (e.key === 'ArrowUp') { e.preventDefault(); rrMover(-1); }
    else if (e.key === 'Enter') { e.preventDefault(); rrUsar(rrSel); } else if (e.key === 'Escape') { e.preventDefault(); rrFechar(); }
  }
  // "/" no começo da caixa do WhatsApp
  document.addEventListener('input', function (e) {
    if (CFG.barra === false || !e.target || !e.target.closest || !e.target.closest('#main footer')) return;
    var cx = caixaTexto(); if (!cx) return; var t = (cx.innerText || '').replace(/\n$/, '');
    var m = t.match(/^\/([^\n\/]{0,30})$/);
    if (m) { if (rrAberto && rrSlash) { rrQ = m[1]; rrSel = 0; rrAuto = true; rrPinta(); } else rrAbrir(m[1], true); }
    else if (rrAberto && rrSlash) rrFechar();
  }, true);
  document.addEventListener('keydown', function (e) {
    if (!rrAberto) return;
    if (e.key === 'Escape') { rrFechar(); e.preventDefault(); e.stopPropagation(); return; }
    if (!rrSlash || !e.target || !e.target.closest || !e.target.closest('#main footer')) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); rrMover(e.key === 'ArrowDown' ? 1 : -1); }
    else if (e.key === 'Enter' || e.key === 'Tab') { if (rrLista.length) { e.preventDefault(); e.stopPropagation(); rrUsar(rrSel); } }
  }, true);
  document.addEventListener('mousedown', function (e) { if (rrAberto && RR && !RR.contains(e.target) && !(e.target.closest && e.target.closest('#pfwa-bots,#main footer'))) rrFechar(); }, true);
  setInterval(function () { if (rrAberto) { if (!contatoAt || rrChave !== ultimo) { rrFechar(); rrDados = null; } else rrPos(); } }, 700);

  // ═══ 📄 SELO NO BALÃO (3.8) ═══
  // A pedido do Vitor (prévia docs/referencias/whatsapp-decisoes/: aviso "gosto de como está e da B" + cotação "prefiro eu decidir, mas mais discreto"):
  // a mensagem do cliente que tem códigos ganha um selinho laranja "📄 N" no canto do balão (a bolinha do botão 📄 continua). Clique = janelinha com os
  // códigos lidos (qtd e saldo) e "Criar cotação no PF" — nada é criado sem esse clique. Cotação criada = selo verde ✓ (lembrado nesta aba).
  var SP = null, spMsg = null, spR = null, spFeitos = {};
  try { spFeitos = JSON.parse(sessionStorage.getItem('pfwa_sp_feitos') || '{}') || {}; } catch (e) { spFeitos = {}; }
  function spHash(s) { s = String(s || ''); var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h.toString(36); }
  // 4.30 - A pedido do Vitor ("cadê as etiquetinhas laranja que lê os códigos?" — "81220600" sozinho numa mensagem, depois de "Ve se tem tambem"):
  // a regra pedia 2+ códigos ou 1 código + palavra de pedido (tem/preço/cota…) NA MESMA mensagem. Agora 1 código também vale quando a mensagem
  // é curta (só o código, ou código + nome da peça: "CAR47700 RETENTOR") ou quando a mensagem dele logo antes pede ("Ve se tem também").
  // NF da compra ("Nf131074", "nota 1234") não conta como código.
  function spContaCods(t, antesPede) {
    t = String(t || '');
    var n = 0; (t.match(COD_RE) || []).forEach(function (tk) { if (tk.replace(/\D/g, '').length >= 4 && !/^\d{1,2}[\/.:]\d{2}/.test(tk) && !/^n\.?f\.?[-\s]?\d/i.test(tk)) n++; });
    if (/\b(nf|nota|nfe|n\.f\.?)\s*[:nº°.-]*\s*\d/i.test(t) && n <= 1) n = 0;
    var pede = /\b(cot|or[cç]|pre[cç]o|valor|quanto|tem\b|disponi|saldo|manda|precis)/i.test(t);
    var curto = t.trim().split(/\s+/).filter(Boolean).length <= 4;
    return n >= 2 || (n >= 1 && (pede || curto || antesPede)) ? n : 0;
  }
  function selosVigiar() {
    var liga = CFG.selo !== false && avisoLigado && contatoAt && !contatoAt.grupo;
    var els = Array.prototype.slice.call(document.querySelectorAll('#main [data-pre-plain-text]')).slice(-40);
    var txt = function (el) { var tx = el.querySelector('.selectable-text'); return ((tx ? tx.innerText : el.innerText) || '').replace(/📄\s*\d+\+?|✓ cot\./g, '').trim(); };
    // 4.15 - A pedido do Vitor ("não to achando esse número que ele encontrou 13X32"): o selo lia o BLOCO inteiro de mensagens
    // do cliente e puxava código de outra mensagem. Agora lê SÓ a mensagem onde o selo está (o código tem que estar nela).
    var alvo = [];
    var antPede = false; // 4.30 - a mensagem do cliente logo antes pedia ("Ve se tem também")
    if (liga) els.forEach(function (el) { if (el.closest('.message-out')) { antPede = false; return; } var t = txt(el); var n = spContaCods(t, antPede); if (n) alvo.push({ el: el, t: t, n: n }); antPede = /\b(cot|or[cç]|pre[cç]o|valor|quanto|tem\b|disponi|saldo|manda|precis)/i.test(t) && !n; });
    els.forEach(function (el) { var s = el.querySelector(':scope > .pfwa-selo'); if (s && !Object.keys(alvo).some(function (k) { return alvo[k].el === el; })) s.remove(); });
    Object.keys(alvo).forEach(function (k) {
      var A = alvo[k], el = A.el, t = A.t, n = A.n;
      var s = el.querySelector(':scope > .pfwa-selo');
      var h = spHash(ultimo + '|' + t), feito = !!spFeitos[h];
      if (!s) { s = document.createElement('span'); s.className = 'pfwa-selo'; if (getComputedStyle(el).position === 'static') el.style.position = 'relative'; el.appendChild(s); }
      if (s._h === h && s._f === feito) return;
      s._h = h; s._f = feito; s._t = t; s._n = n;
      s.classList.toggle('ok', feito);
      s.textContent = feito ? '✓ cot.' : '📄 ' + (n > 9 ? '9+' : n);
      s.title = feito ? 'Você já criou a cotação deste pedido no PF — clique pra ver de novo' : 'O PF achou ' + n + ' código' + (n > 1 ? 's' : '') + ' neste pedido — clique pra ver e, se quiser, criar a cotação';
      s.onclick = function (ev) { ev.preventDefault(); ev.stopPropagation(); spAbrir(s); };
    });
    if (!liga && SP && SP.style.display !== 'none') spFechar();
  }
  function spEl() { if (!SP) { SP = document.createElement('div'); SP.id = 'pfwa-sp'; document.body.appendChild(SP); SP.addEventListener('click', spClique); } return SP; }
  function spFechar() { if (SP) SP.style.display = 'none'; spMsg = null; spR = null; }
  function spPos() {
    if (!SP || !spMsg || SP.style.display === 'none') return;
    if (!document.body.contains(spMsg)) { spFechar(); return; }
    var r = spMsg.getBoundingClientRect(), w = 300, h = SP.offsetHeight || 160;
    var bal = spMsg.parentElement ? spMsg.parentElement.getBoundingClientRect() : r; var left = Math.min(window.innerWidth - w - 10, Math.max(10, bal.left));
    var top = r.bottom + 6; if (top + h > window.innerHeight - 10) top = Math.max(10, r.top - h - 6);
    SP.style.left = left + 'px'; SP.style.top = top + 'px';
  }
  async function spAbrir(s) {
    spEl(); spMsg = s; spR = null;
    SP.style.display = 'block'; SP.innerHTML = '<div class="sp-cab"><b>📄 ' + s._n + ' código' + (s._n > 1 ? 's' : '') + ' neste pedido</b><span class="sp-x" data-sp="x" title="Fechar (Esc)">✕</span></div><div class="sp-nada">Lendo no PF…</div>';
    spPos();
    var r = await msg({ t: 'acao', acao: 'cotar', arg: { k: resp && resp.k, contato: resp && resp.contato, msgs: s._t.split('\n').map(function (x) { return { t: x, eu: false }; }) } });
    if (spMsg !== s) return;
    spR = r; spPinta();
  }
  function spPinta() {
    var s = spMsg, r = spR; if (!s || !SP) return;
    var h = '<div class="sp-cab"><b>📄 ' + s._n + ' código' + (s._n > 1 ? 's' : '') + ' neste pedido</b><span class="sp-x" data-sp="x" title="Fechar (Esc)">✕</span></div>';
    if (!r || r.erro) { SP.innerHTML = h + '<div class="sp-nada">' + (r && r.erro === 'pfF5' ? 'Dê F5 na aba do PartsFlow.' : 'Abra o PartsFlow numa aba deste Chrome.') + '</div>'; spPos(); return; }
    var its = (r.itens || []).filter(function (o) { return o.cod; });
    if (!its.length) { SP.innerHTML = h + '<div class="sp-nada">Não achei código de peça aqui.</div>'; spPos(); return; }
    h += '<div class="sp-l">' + its.map(function (o) {
      var cor = !o.achou ? '#b0bccb' : o.saldo > 0 ? '#2E7D32' : '#C0392B', st = !o.achou ? 'não localizei' : o.saldo > 0 ? 'saldo ' + o.saldo : 'sem saldo';
      var mk = o.marcaPed ? (o.marcaOk ? ' ' + o.marcaPed : ' <span style="color:#C0392B">sem ' + esc(o.marcaPed) + (o.marca ? ' → ' + esc(o.marca) : '') + '</span>') : (o.marca ? ' ' + o.marca : ''); // 4.28
      return '<div><i style="background:' + cor + '"></i><b>' + esc(o.cod) + '</b> × ' + (o.qtd || 1) + '<small>' + (o.marcaPed && !o.marcaOk ? mk : esc(mk)) + ' · ' + esc(st) + '</small></div>';
    }).join('') + '</div>';
    var feito = !!spFeitos[s._h];
    h += '<div class="sp-b"><button data-sp="criar">' + (feito ? '📄 Criar de novo no PF' : '📄 Criar cotação no PF') + '</button><span class="sp-lk" data-sp="painel">ver no painel ›</span></div>' +
      (feito ? '<div class="sp-ok">✓ Você já criou a cotação desta mensagem.</div>' : '');
    SP.innerHTML = h; spPos();
  }
  function spClique(e) {
    var el = e.target.closest('[data-sp]'); if (!el) return; var a = el.getAttribute('data-sp');
    e.preventDefault(); e.stopPropagation();
    if (a === 'x') { spFechar(); return; }
    if (a === 'painel') { if (spR && !spR.erro) { cot = spR; cotErro = ''; } spFechar(); irAba('cot'); return; }
    if (a === 'criar') {
      var s = spMsg, r = spR; if (!s || !r) return;
      msg({ t: 'acao', acao: 'abrirCot', focar: true, arg: { k: resp && resp.k, itens: (r.itens || []).filter(function (o) { return o.cod; }).map(function (o) { return { cod: o.cod, qtd: o.qtd, marca: o.marca, desc: o.desc, marcaPed: o.marcaPed, marcaOk: o.marcaOk, codCli: o.codCli }; }) } });
      spFeitos[s._h] = Date.now(); try { sessionStorage.setItem('pfwa_sp_feitos', JSON.stringify(spFeitos)); } catch (er) { }
      s._f = null; spFechar(); selosVigiar();
    }
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && SP && SP.style.display === 'block') { spFechar(); e.stopPropagation(); } }, true);
  document.addEventListener('mousedown', function (e) { if (SP && SP.style.display === 'block' && !SP.contains(e.target) && !(e.target.closest && e.target.closest('.pfwa-selo'))) spFechar(); }, true);
  document.addEventListener('scroll', function () { spPos(); }, true);
  setInterval(function () { try { selosVigiar(); } catch (e) { } }, 1500);

  // ═══ 👋 SAUDAÇÃO AUTOMÁTICA (3.9) + 🗓️ MEU STATUS (4.0) ═══
  // 3.9 - A pedido do Vitor ("se eu não responder em 3 min pode mandar alguma msg. mas quero configurável"): o cliente ficou X minutos sem resposta →
  // UMA mensagem de espera, só no horário escolhido, uma vez por conversa a cada N horas e com teto por hora. Liga em ⚙️ → 👋 Saudação automática.
  // 4.0 - A pedido do Vitor ("a msg quero mais humanizada, como se eu tivesse mandado" + "deixa uma de ausência também, pra quando eu tiver em reunião,
  // ou ausente, ou de férias"): o jeito ✨ Natural monta a frase pelo que o CLIENTE mandou (códigos → "já vou ver esses códigos", foto → "vi a foto",
  // áudio → "vou ouvir aqui", preço → "já te passo o valor"…), varia a saudação, às vezes sem nome, sem repetir a última, e espera alguns segundos
  // "digitando" antes de mandar. 🗓️ Meu status: Disponível / Em reunião / Ausente / Férias (até quando + quem atende) → manda a mensagem de ausência
  // UMA vez por conversa no período, a qualquer hora; quando o "até" passa, volta sozinho pra Disponível.
  var AUTO_PADRAO = {
    on: false, min: 3, ini: '08:00', fim: '18:00', dias: 'semana', quem: 'clientes', abrir: false, horas: 4, porHora: 15,
    estilo: 'natural',
    frases: ['{saudacao}, {nome}! Tô terminando um atendimento e já te respondo',
      '{saudacao}, {nome}! Recebi aqui, em instantes te retorno.',
      'Oi, {nome}! Já vi aqui, só um minutinho que já te respondo.'],
    modo: 'normal', ate: '', subst: '', substTel: '', ausMin: 1, ausTxt: { reuniao: '', ausente: '', ferias: '' }
  };
  var AUTO = JSON.parse(JSON.stringify(AUTO_PADRAO)), autoEnv = {}, autoHist = [], autoPend = {}, autoOcup = false, autoUltMexeu = Date.now(), autoUlt = {}, autoAusEnv = {};
  chrome.storage.local.get(['auto', 'autoEnv', 'autoHist', 'autoPend', 'autoUlt', 'autoAusEnv'], function (s) {
    if (s.auto) for (var k in s.auto) AUTO[k] = s.auto[k];
    if (!AUTO.ausTxt) AUTO.ausTxt = { reuniao: '', ausente: '', ferias: '' };
    autoEnv = s.autoEnv || {}; autoHist = s.autoHist || []; autoPend = s.autoPend || {}; autoUlt = s.autoUlt || {}; autoAusEnv = s.autoAusEnv || {};
  });
  ['mousemove', 'keydown', 'mousedown', 'wheel'].forEach(function (t) { document.addEventListener(t, function () { autoUltMexeu = Date.now(); }, true); });
  function autoGravar() { chrome.storage.local.set({ auto: AUTO, autoEnv: autoEnv, autoHist: autoHist.slice(-60), autoPend: autoPend, autoUlt: autoUlt, autoAusEnv: autoAusEnv }); }
  function autoHM(s) { var m = String(s || '').match(/(\d{1,2}):(\d{2})/); return m ? (+m[1]) * 60 + (+m[2]) : 0; }
  function autoNoHorario(d) {
    d = d || new Date(); var dw = d.getDay();
    if (AUTO.dias === 'semana' && (dw === 0 || dw === 6)) return false;
    if (AUTO.dias === 'sabado' && dw === 0) return false;
    var m = d.getHours() * 60 + d.getMinutes(), a = autoHM(AUTO.ini), b = autoHM(AUTO.fim);
    return a <= b ? (m >= a && m < b) : (m >= a || m < b);
  }
  // status de ausência valendo agora? (o "até" que passou volta pra Disponível)
  function autoAusente() {
    if (!AUTO.modo || AUTO.modo === 'normal') return '';
    if (AUTO.ate) { var t = new Date(AUTO.ate).getTime(); if (t && Date.now() > t) { AUTO.modo = 'normal'; AUTO.ate = ''; autoGravar(); try { pinta(); } catch (e) { } return ''; } }
    return AUTO.modo;
  }
  var AUTO_MODOS = { normal: ['🟢', 'Disponível'], reuniao: ['📅', 'Em reunião'], ausente: ['🚶', 'Ausente'], ferias: ['🏖️', 'Férias'] };
  function autoSorteia(l, evita) { var c = l.filter(function (x) { return x !== evita; }); if (!c.length) c = l; return c[Math.floor(Math.random() * c.length)]; }
  function autoSaudacao() { var h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; }
  function autoPrimeiroNome(n) {
    // só usa nome de PESSOA: o contato do cadastro (PF) ou o 1º pedaço de "Pessoa - Empresa"; nome de empresa sozinho = sem nome
    var b = '';
    if (resp && contatoAt && contatoAt.nome === n && resp.contato) b = resp.contato;
    else if (svPartes(n).length >= 2) b = svNomeBase(n);
    b = String(b || '').replace(/[^A-Za-zÀ-ÿ\s'-]/g, ' ').trim().split(/\s+/)[0] || '';
    if (b.length < 2) return ''; return b.charAt(0).toUpperCase() + b.slice(1).toLowerCase();
  }
  function autoCap(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
  // abertura "Bom dia, Carlos!" / "Opa, boa tarde" / "Oi Carlos" — varia, às vezes sem nome
  function autoAbertura(nm) {
    var s = autoSaudacao(), sl = s.toLowerCase(), comNome = nm && Math.random() < 0.7;
    var l = comNome ? [s + ', ' + nm + '!', s + ' ' + nm + '!', 'Opa, ' + sl + ' ' + nm + '!', 'Oi ' + nm + ', ' + sl + '!', 'Olá ' + nm + '!', s + ', ' + nm + ', tudo bem?']
      : [s + '!', 'Opa, ' + sl + '!', 'Oi, ' + sl + '!', s + ', tudo bem?', 'Olá!'];
    return autoSorteia(l);
  }
  function autoContexto(u) {
    var t = (u && u.bloco) || '', ncod = 0;
    (t.match(COD_RE) || []).forEach(function (tk) { if (tk.replace(/\D/g, '').length >= 4 && !/^\d{1,2}[\/.:]\d{2}/.test(tk)) ncod++; });
    if (u && u.audio) return ['vou ouvir aqui e já te respondo', 'já escuto seu áudio e te falo', 'só um minutinho que já ouço aqui'];
    if (u && u.foto) return ['vi a foto, vou verificar aqui e já te falo', 'recebi a foto, já vou ver aqui', 'deixa eu ver a foto direitinho e já te respondo'];
    if (ncod >= 2) return ['já vou ver esses códigos aqui', 'vou conferir esses itens no estoque e já te passo', 'já tô vendo esses códigos, um minutinho', 'vou levantar esses itens aqui e já te retorno'];
    if (ncod === 1) return ['já vou ver esse código aqui', 'vou conferir esse item e já te falo', 'deixa eu ver esse aqui no estoque'];
    if (/pre[cç]o|valor|quanto|or[cç]amento|cota/i.test(t)) return ['já te passo o valor', 'vou ver o preço aqui e te falo', 'já levanto o valor e te retorno'];
    if (/prazo|chega|entrega|previs|transport|nota|nf\b|boleto|pedido/i.test(t)) return ['vou verificar aqui e já te dou um retorno', 'deixa eu confirmar aqui e já te falo', 'já vejo isso pra você'];
    if (/\?/.test(t)) return ['já te respondo', 'deixa eu ver aqui e já te falo', 'vou verificar e já te retorno'];
    return ['tô finalizando um atendimento aqui e já falo com você', 'só um minutinho que já te respondo', 'já te respondo', 'tô terminando uma cotação aqui e já falo com você'];
  }
  function autoNatural(nome, u) {
    var nm = autoPrimeiroNome(nome), ab = autoAbertura(nm), ct = autoSorteia(autoContexto(u));
    var fim = autoSorteia(['', '', '', ' 👍', ' 🙏', '!']);
    return (ab + ' ' + autoCap(ct) + fim).replace(/!!$/, '!').replace(/\?\s+([a-zà-ú])/, function (m, c) { return '? ' + c.toUpperCase(); });
  }
  function autoDataBR(s) { var d = new Date(s); if (!s || isNaN(d)) return ''; return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2); }
  function autoHoraBR(s) { var d = new Date(s); if (!s || isNaN(d)) return ''; var h = d.getHours(), m = d.getMinutes(); return h + 'h' + (m ? ('0' + m).slice(-2) : ''); }
  function autoAusTexto(nome, modo) {
    var nm = autoPrimeiroNome(nome), ab = autoAbertura(nm), proprio = String((AUTO.ausTxt || {})[modo] || '').trim();
    var sub = String(AUTO.subst || '').trim(), tel = String(AUTO.substTel || '').trim(), quem = sub ? (sub + (tel ? ' no ' + tel : '')) : '';
    var hoje = AUTO.ate && new Date(AUTO.ate).toDateString() === new Date().toDateString();
    var volta = AUTO.ate ? (hoje ? 'lá pelas ' + autoHoraBR(AUTO.ate) : 'dia ' + autoDataBR(AUTO.ate)) : '';
    if (proprio) return proprio.replace(/\{saudacao\}/gi, autoSaudacao()).replace(/\{nome\}/gi, nm).replace(/\{volta\}/gi, volta).replace(/\{substituto\}/gi, quem).replace(/\s+([,.!?])/g, '$1').replace(/,\s*!/g, '!');
    var l;
    if (modo === 'reuniao') l = ['tô em reunião agora' + (volta ? ', saio ' + volta : '') + ' e já te respondo', 'tô numa reunião, assim que sair' + (volta ? ' (' + volta + ')' : '') + ' te respondo', 'tô em reunião, mas já vi sua mensagem. Assim que terminar falo com você'];
    else if (modo === 'ferias') l = ['tô de férias' + (AUTO.ate ? ' até ' + autoDataBR(AUTO.ate) : '') + (quem ? '. Pra cotação e pedido fala com o ' + quem + ', ele vai te atender' : ', assim que voltar te respondo'), 'tô de férias' + (AUTO.ate ? ', volto dia ' + autoDataBR(AUTO.ate) : '') + (quem ? '. Enquanto isso o ' + quem + ' te atende, pode chamar ele' : '. Assim que voltar falo com você')];
    else l = ['no momento tô fora' + (volta ? ', volto ' + volta : '') + ', mas assim que voltar te respondo', 'tô ausente agora' + (volta ? ' (volto ' + volta + ')' : '') + ', já já te respondo', 'saí rapidinho, assim que voltar falo com você'];
    return (ab + ' ' + autoCap(autoSorteia(l))).replace(/\s+([,.!?])/g, '$1');
  }
  function autoTextoMinhas(nome) {
    var fs = (AUTO.frases || []).map(function (f) { return String(f || '').trim(); }).filter(Boolean); if (!fs.length) fs = AUTO_PADRAO.frases;
    var f = fs[Math.floor(Math.random() * fs.length)], nm = autoPrimeiroNome(nome);
    return f.replace(/\{saudacao\}/gi, autoSaudacao()).replace(/\{nome\}/gi, nm || '\u0000').replace(/[ \t]*,?[ \t]*\u0000/g, '').replace(/ +([,.!?])/g, '$1').replace(/^[,\s]+/, '').trim();
  }
  function autoTexto(nome, u, modo) {
    var ult = autoUlt[nome] || '', t = '', i = 0;
    do { t = modo ? autoAusTexto(nome, modo) : (AUTO.estilo === 'minhas' ? autoTextoMinhas(nome) : autoNatural(nome, u)); i++; } while (t === ult && i < 6);
    return t;
  }
  // hora da mensagem pelo [14:30, 10/11/2026] do WhatsApp
  function msgQuando(el) {
    var a = el.getAttribute('data-pre-plain-text') || '', m = a.match(/\[(\d{1,2}):(\d{2})(?:\s*([AP]M))?(?:,\s*(\d{1,2})\/(\d{1,2})\/(\d{4}))?/i);
    if (!m) return 0; var h = +m[1]; if (m[3]) { if (/pm/i.test(m[3]) && h < 12) h += 12; if (/am/i.test(m[3]) && h === 12) h = 0; }
    var d = m[6] ? new Date(+m[6], +m[5] - 1, +m[4], h, +m[2]) : new Date(); if (!m[6]) d.setHours(h, +m[2], 0, 0);
    var t = d.getTime(); if (t > Date.now() + 60000) t -= 86400000; return t;
  }
  function horaFolha(el) {
    var hm = null; el.querySelectorAll('span,div').forEach(function (e) { if (hm == null && e.children.length === 0 && /^\d{1,2}:\d{2}$/.test((e.textContent || '').trim())) hm = (e.textContent || '').trim(); });
    if (!hm) return 0; var d = new Date(); d.setHours(+hm.split(':')[0], +hm.split(':')[1], 0, 0); var t = d.getTime(); if (t > Date.now() + 60000) t -= 86400000; return t;
  }
  // última mensagem da conversa (inclui foto/áudio sem texto) + o "bloco" que o cliente mandou desde a sua última
  function ultimaMsg() {
    var els = Array.prototype.slice.call(document.querySelectorAll('#main .message-in, #main .message-out')).filter(function (e) { return !e.parentElement.closest('.message-in, .message-out'); });
    if (!els.length) return null;
    var el = els[els.length - 1], eu = el.classList.contains('message-out');
    var pp = el.querySelector('[data-pre-plain-text]'), tx = el.querySelector('.selectable-text');
    var t = pp ? msgQuando(pp) : horaFolha(el);
    var bloco = [], foto = false, audio = false;
    for (var i = els.length - 1; i >= 0 && !els[i].classList.contains('message-out'); i--) {
      var e = els[i], s = e.querySelector('.selectable-text'); if (s) bloco.unshift((s.innerText || '').trim());
      if (!foto) e.querySelectorAll('img').forEach(function (im) { var src = im.getAttribute('src') || ''; if (/^(blob|data):/.test(src) && (im.naturalWidth || im.width || 0) >= 80) foto = true; });
      if (!audio && e.querySelector('audio,[data-icon^="audio"],[data-icon*="ptt"],[aria-label*="áudio"],[aria-label*="voice"]')) audio = true;
    }
    return { eu: eu, t: t, txt: ((tx ? tx.innerText : '') || '').trim(), bloco: bloco.join('\n'), foto: foto, audio: audio };
  }
  function autoChave(c) { return (c.tel || '') + '|' + c.nome; }
  function autoPodeConv(c, aus) {
    if (!c || c.grupo) return false;
    // 4.1 - A pedido do Vitor ("não responder a cada msg do cliente… o Watidy manda a msg de ausência um monte de vezes, isso é irritante"):
    // já mandou QUALQUER mensagem automática nessa conversa e você ainda não respondeu = não manda mais nada (nem ausência, nem saudação).
    if (autoPend[c.nome]) return false;
    if (cmdAutorizado(c.nome, c.tel)) return false; // 4.2 - seu celular pessoal / conversa com você mesmo nunca recebe mensagem automática
    var k = autoChave(c);
    if (aus) { var per = aus + '|' + (AUTO.ausDesde || ''); if (autoAusEnv[k] === per) return false; }
    else { var u = autoEnv[k]; if (u && Date.now() - u < (+AUTO.horas || 4) * 3600000) return false; }
    var h1 = Date.now() - 3600000; autoHist = autoHist.filter(function (t) { return t > h1; });
    return autoHist.length < (+AUTO.porHora || 15);
  }
  async function autoEhCliente(c) {
    if (AUTO.quem !== 'clientes') return true;
    if (resp && contatoAt && contatoAt.nome === c.nome && resp.tipo) return resp.tipo === 'cliente';
    var r = await msg({ t: 'acao', acao: 'situacoes', arg: { lista: [{ nome: c.nome, tel: c.tel || '' }] } });
    return !!(r && r.sit && r.sit[c.nome] && r.sit[c.nome].tipo === 'cliente');
  }
  function autoMarcarFeito(c, aus) { var k = autoChave(c); if (aus) autoAusEnv[k] = aus + '|' + (AUTO.ausDesde || ''); else autoEnv[k] = Date.now(); autoGravar(); }
  // manda na conversa ABERTA se a última mensagem é do cliente e está sem resposta há X min
  async function autoNaAberta() {
    var aus = autoAusente();
    var c = contatoAtual(); if (!autoPodeConv(c, aus)) return false;
    var u = ultimaMsg(); if (!u || u.eu || !u.t) return false;
    var espera = aus ? (+AUTO.ausMin || 1) : (+AUTO.min || 3);
    if (Date.now() - u.t < espera * 60000) return false;
    if (Date.now() - u.t > (aus ? 12 : 3) * 3600000) return false; // mensagem velha
    if (aus && AUTO.ausDesde && u.t < AUTO.ausDesde - 10 * 60000) return false; // chegou antes de você sair
    var cx = caixaTexto(); if (!cx || (cx.innerText || '').trim()) return false; // você está escrevendo
    if (!(await autoEhCliente(c))) { autoMarcarFeito(c, aus); return false; }
    var txt = autoTexto(c.nome, u, aus);
    await dormir(1500 + Math.random() * 2500); // "lendo"
    cx = caixaTexto(); if (!cx || (cx.innerText || '').trim() || (contatoAtual() || {}).nome !== c.nome) return false;
    if (!escreverNaCaixa(txt)) return false;
    var btn = await esperar(botaoEnviar, 3000); if (!btn) return false;
    await dormir(Math.min(6000, 900 + txt.length * 45 + Math.random() * 900)); // "digitando…"
    if ((contatoAtual() || {}).nome !== c.nome) return false;
    (botaoEnviar() || btn).click();
    var ok = await esperar(function () { var x = caixaTexto(); return x && !(x.innerText || '').trim() ? 1 : null; }, 8000);
    if (!ok) return false;
    autoMarcarFeito(c, aus); autoHist.push(Date.now()); autoUlt[c.nome] = txt; autoPend[c.nome] = { ts: Date.now(), txt: txt, aus: aus || '' };
    autoHist = autoHist.slice(-60); autoGravar();
    msg({ t: 'acao', acao: 'autoSaud', arg: { nome: c.nome, tel: c.tel || '', texto: txt, modo: aus || '' } });
    try { autoBadges(); } catch (e) { }
    return true;
  }
  // conversas da lista com mensagem não lida há X min
  function autoCandidatas(aus) {
    var out = [], espera = aus ? (+AUTO.ausMin || 1) : (+AUTO.min || 3);
    linhasLista().forEach(function (L) {
      if (!L.unread || autoPend[L.nome]) return;
      var t = horaFolha(L.el); if (!t) return;
      var idade = Date.now() - t; if (idade < espera * 60000 || idade > (aus ? 12 : 3) * 3600000) return;
      if (!autoPodeConv({ nome: L.nome, tel: L.tel }, aus)) return;
      out.push(L);
    });
    return out;
  }
  async function autoTick() {
    var aus = autoAusente();
    if (autoOcup) return;
    if (!aus && (!AUTO.on || !autoNoHorario())) return; // ausência vale a qualquer hora
    try { var sL = await chrome.storage.local.get(['lote']); if (sL.lote && !sL.lote.fim) return; } catch (e) { }
    autoOcup = true;
    try {
      if (contatoAt && await autoNaAberta()) return;
      if (!(AUTO.abrir || aus) || Date.now() - autoUltMexeu < 60000) return; // ausente: abre as outras conversas sozinho (você não está mexendo)
      var cand = autoCandidatas(aus); if (!cand.length) return;
      var antes = contatoAt ? contatoAt.nome : '';
      for (var i = 0; i < cand.length && i < 3; i++) {
        if (Date.now() - autoUltMexeu < 60000) break; // você voltou a mexer: para
        clicar(cand[i].el);
        var ab = await esperar(function () { var c = contatoAtual(); return c && c.nome === cand[i].nome ? c : null; }, 4000);
        if (!ab) continue;
        await dormir(800);
        var foi = await autoNaAberta();
        if (!foi) { var c0 = contatoAtual(); var u0 = ultimaMsg(); if (c0 && u0 && u0.eu) autoMarcarFeito(c0, aus); }
      }
      if (antes) { var vt = linhaDoNome(antes); if (vt) clicar(vt); }
    } finally { autoOcup = false; }
  }
  // você respondeu de verdade → sai do "👋 aguardando você"
  function autoPendVigiar() {
    var c = contatoAt; if (!c || !autoPend[c.nome]) return;
    var u = ultimaMsg(); if (u && u.eu && u.txt && u.txt !== autoPend[c.nome].txt) { delete autoPend[c.nome]; autoGravar(); }
  }
  function autoBadges() {
    var pane = $('#pane-side'); if (!pane) return;
    pane.querySelectorAll('.pfwa-autob').forEach(function (b) { var row = b.closest('[role="listitem"],[role="row"]'); var ne = row && row.querySelector('span[title]'); if (!ne || !autoPend[(ne.getAttribute('title') || '').trim()]) b.remove(); });
    Object.keys(autoPend).forEach(function (n) {
      var row = linhaDoNome(n); if (!row || row.querySelector('.pfwa-autob')) return;
      var ne = row.querySelector('span[title]'); if (!ne) return;
      var b = document.createElement('span'); b.className = 'pfwa-autob'; b.textContent = autoPend[n].aus ? AUTO_MODOS[autoPend[n].aus][0] + ' avisei que tô fora · responda' : '👋 saudação enviada · responda';
      b.title = 'A extensão mandou: "' + autoPend[n].txt + '" — some quando você responder';
      (ne.parentElement || row).appendChild(b);
    });
  }
  // pílula do status no cabeçalho do painel (clique = ajustar)
  function autoStatusPill() {
    var cab = P && P.querySelector('.pfwa-cabt'); if (!cab) return;
    var el = cab.querySelector('.pfwa-stpill'), aus = autoAusente();
    if (!aus) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('span'); el.className = 'pfwa-stpill'; el.setAttribute('data-acao', 'autoAbrir'); cab.insertBefore(el, cab.querySelector('.pfwa-cabsub')); }
    var tx = AUTO_MODOS[aus][0] + ' ' + AUTO_MODOS[aus][1] + (AUTO.ate ? ' até ' + (aus === 'ferias' ? autoDataBR(AUTO.ate) : autoHoraBR(AUTO.ate)) : '');
    if (el.textContent !== tx) { el.textContent = tx; el.title = 'Mensagem de ausência ligada — clique pra mudar ou voltar pra Disponível'; }
  }
  setInterval(function () { try { autoPendVigiar(); autoBadges(); autoStatusPill(); } catch (e) { } autoTick().catch(function (e) { console.warn('PF auto', e); }); }, 15000);
  setTimeout(function () { try { autoStatusPill(); } catch (e) { } }, 2500);

  function autoModoSet(m) {
    AUTO.modo = m; AUTO.ausDesde = m === 'normal' ? 0 : Date.now();
    if (m === 'normal') AUTO.ate = '';
    else if (!AUTO.ate || new Date(AUTO.ate).getTime() < Date.now()) {
      var d = new Date(); if (m === 'reuniao') d.setHours(d.getHours() + 1); else if (m === 'ausente') d.setHours(d.getHours() + 2); else { d.setDate(d.getDate() + 7); d.setHours(8, 0, 0, 0); }
      AUTO.ate = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2) + 'T' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
    }
    autoGravar(); try { autoStatusPill(); } catch (e) { }
  }
  function htmlAuto() {
    var A = AUTO, inp = 'class="au-in"', aus = autoAusente(), nomeEx = contatoAt ? contatoAt.nome : 'Carlos - Trackpeças';
    var ex = function (f) { var l = []; for (var i = 0; i < 3; i++) { var t = f(); if (l.indexOf(t) < 0) l.push(t); } return l.map(function (t) { return '<div class="au-exl">“' + esc(t) + '”</div>'; }).join(''); };
    var h = '<div class="pfwa-ajtop"><b>👋 Mensagens automáticas</b><span class="pfwa-link" data-acao="autoVoltar">‹ voltar</span></div>';
    h += htmlCmd(); // 4.2 - 📱 mudar pelo WhatsApp
    // 🗓️ Meu status
    h += '<div class="au-sec"><b>🗓️ Meu status agora</b><div class="au-modos">' + Object.keys(AUTO_MODOS).map(function (m) { return '<span data-acao="autoModo" data-arg="' + m + '" class="' + ((aus || 'normal') === m ? 'on' : '') + '">' + AUTO_MODOS[m][0] + ' ' + AUTO_MODOS[m][1] + '</span>'; }).join('') + '</div>';
    if (aus) {
      h += '<div class="au-g"><label>Até<input type="datetime-local" data-au="ate" value="' + esc(A.ate) + '" ' + inp + '></label>' +
        (aus === 'ferias' ? '<label>Quem atende<input type="text" data-au="subst" value="' + esc(A.subst) + '" placeholder="ex.: Carlos" ' + inp + '></label><label>Telefone dele<input type="text" data-au="substTel" value="' + esc(A.substTel) + '" placeholder="(11) 9…" ' + inp + '></label>' : '') +
        '<label>Responder depois de<input type="number" min="0" max="60" data-au="ausMin" value="' + esc(A.ausMin) + '" ' + inp + '> min</label></div>' +
        '<div class="au-fr"><small>Mensagem própria (deixe vazio pra o PF variar sozinho · use {saudacao} {nome} {volta}' + (aus === 'ferias' ? ' {substituto}' : '') + ')</small><textarea data-au="ausTxt.' + aus + '" rows="2">' + esc((A.ausTxt || {})[aus] || '') + '</textarea></div>' +
        '<div class="au-ex">Vai sair algo assim:' + ex(function () { return autoTexto(nomeEx, null, aus); }) + '</div>' +
        '<div class="au-st">Manda UMA vez só pra cada conversa enquanto você estiver ' + esc(AUTO_MODOS[aus][1].toLowerCase()) + ' — se o cliente continuar mandando mensagem, não repete. A qualquer hora, e abre as conversas que chegarem sozinho (se você não estiver mexendo no WhatsApp). No "até" volta sozinho pra 🟢 Disponível.</div>';
    }
    h += '</div>';
    // 👋 Saudação de espera
    h += '<div class="au-sec"><div class="pfwa-cfgl" data-acao="autoTog" data-arg="on"><span class="pfwa-cfgi">👋</span><div><b>Saudação de espera</b><br><small>Quando você está disponível mas o cliente fica X minutos sem resposta, manda uma mensagem como se fosse você.</small></div><span class="pfwa-sw' + (A.on ? ' on' : '') + '"><i></i></span></div>' +
      '<div class="au-g"><label>Sem resposta há<input type="number" min="1" max="120" data-au="min" value="' + esc(A.min) + '" ' + inp + '> min</label>' +
      '<label>Das<input type="time" data-au="ini" value="' + esc(A.ini) + '" ' + inp + '> às<input type="time" data-au="fim" value="' + esc(A.fim) + '" ' + inp + '></label>' +
      '<label>Dias<select data-au="dias" ' + inp + '><option value="semana"' + (A.dias === 'semana' ? ' selected' : '') + '>segunda a sexta</option><option value="sabado"' + (A.dias === 'sabado' ? ' selected' : '') + '>segunda a sábado</option><option value="todos"' + (A.dias === 'todos' ? ' selected' : '') + '>todos os dias</option></select></label>' +
      '<label>Pra quem<select data-au="quem" ' + inp + '><option value="clientes"' + (A.quem === 'clientes' ? ' selected' : '') + '>só clientes do PF</option><option value="todos"' + (A.quem === 'todos' ? ' selected' : '') + '>todos (menos grupos)</option></select></label>' +
      '<label>Não repetir na conversa por<input type="number" min="1" max="72" data-au="horas" value="' + esc(A.horas) + '" ' + inp + '> h</label>' +
      '<label>No máximo<input type="number" min="1" max="100" data-au="porHora" value="' + esc(A.porHora) + '" ' + inp + '> por hora</label></div>' +
      '<div class="au-modos au-est"><span data-acao="autoEstilo" data-arg="natural" class="' + (A.estilo !== 'minhas' ? 'on' : '') + '">✨ Natural (varia sozinho)</span><span data-acao="autoEstilo" data-arg="minhas" class="' + (A.estilo === 'minhas' ? 'on' : '') + '">✍️ Minhas frases</span></div>' +
      (A.estilo === 'minhas' ? '<div class="au-fr"><small>Uma por linha · a extensão sorteia · use {saudacao} e {nome}</small><textarea data-au="frases" rows="4">' + esc((A.frases || []).join('\n')) + '</textarea></div>'
        : '<div class="au-fr"><small>O PF lê o que o cliente mandou e responde de acordo: códigos → "já vou ver esses códigos", foto → "vi a foto", áudio → "vou ouvir aqui", preço → "já te passo o valor". Varia a saudação, às vezes sem nome, não repete a última, e espera uns segundos "digitando".</small></div>') +
      '<div class="au-ex">Vai sair algo assim:' + ex(function () { return autoTexto(nomeEx, { bloco: '5-280X\n2654407 2 de cada' }, ''); }) + '</div>' +
      '<div class="pfwa-cfgl" data-acao="autoTog" data-arg="abrir"><span class="pfwa-cfgi">📂</span><div><b>Também nas outras conversas</b><br><small>Se você ficar 1 min sem mexer no WhatsApp, a extensão abre a conversa que está esperando, manda e volta pra que você estava. Desligado = só na conversa aberta.</small></div><span class="pfwa-sw' + (A.abrir ? ' on' : '') + '"><i></i></span></div>' +
      '<div class="au-st">' + (A.on ? (autoNoHorario() ? '🟢 Ligada e dentro do horário.' : '🟡 Ligada, mas fora do horário agora.') : '⚪ Desligada.') + ' A conversa que recebeu a mensagem ganha a etiqueta "👋 … responda" até você responder.</div></div>';
    var envs = Object.keys(autoPend).map(function (n) { return { n: n, ts: autoPend[n].ts, txt: autoPend[n].txt }; }).sort(function (a, b) { return b.ts - a.ts; }).slice(0, 5);
    if (envs.length) h += '<div class="pfwa-bloco"><div class="pfwa-bt">Esperando você responder</div>' + envs.map(function (e) { return '<div class="pfwa-it"><b>' + esc(e.n) + '</b><br><small>' + esc(new Date(e.ts).toLocaleString('pt-BR').slice(0, 17)) + ' · "' + esc(e.txt) + '"</small></div>'; }).join('') + '</div>';
    return h;
  }
  function autoCampo(el) {
    var k = el.getAttribute('data-au'), v = el.value;
    if (k === 'cmdQuem') { AUTO.cmdQuem = v.split('\n').map(function (s) { return s.trim(); }).filter(Boolean); autoGravar(); return; }
    if (k === 'cmdEu') { AUTO.cmdEu = !!el.checked; autoGravar(); return; }
    if (k === 'frases') AUTO.frases = v.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
    else if (k.indexOf('ausTxt.') === 0) { AUTO.ausTxt = AUTO.ausTxt || {}; AUTO.ausTxt[k.slice(7)] = v.trim(); }
    else if (k === 'min' || k === 'horas' || k === 'porHora') AUTO[k] = Math.max(1, +v || AUTO_PADRAO[k]);
    else if (k === 'ausMin') AUTO[k] = Math.max(0, +v || 0);
    else AUTO[k] = v;
    autoGravar(); if (k === 'ate') try { autoStatusPill(); } catch (e) { }
  }
  document.addEventListener('change', function (e) { if (e.target && e.target.getAttribute && e.target.getAttribute('data-au')) autoCampo(e.target); }, true);

  // ═══ 📱 COMANDOS PELO WHATSAPP (4.2) ═══
  // A pedido do Vitor ("preciso poder ajustar essas coisas enviando um whatsapp" + "mandando msg de outro cel, exemplo do meu pessoal"):
  // mensagem que começa com "pf" vinda de um número AUTORIZADO (ou da conversa com você mesmo) muda o status / a saudação.
  // A extensão lê a última mensagem dessas conversas na lista (sem abrir), faz o que pediu e responde "✅ …" quando você não está mexendo no WhatsApp.
  // Mensagem "pf …" de qualquer outro número é ignorada. Os autorizados nunca recebem mensagem automática.
  var cmdFeitos = {}, cmdResp = [];
  chrome.storage.local.get(['cmdFeitos', 'cmdResp'], function (s) { cmdFeitos = s.cmdFeitos || {}; cmdResp = s.cmdResp || []; });
  function cmdGravar() { var ks = Object.keys(cmdFeitos); if (ks.length > 200) ks.sort(function (a, b) { return cmdFeitos[a] - cmdFeitos[b]; }).slice(0, ks.length - 200).forEach(function (k) { delete cmdFeitos[k]; }); chrome.storage.local.set({ cmdFeitos: cmdFeitos, cmdResp: cmdResp.slice(-20) }); }
  function cmdDig(s) { return String(s || '').replace(/\D/g, ''); }
  // 55 + DDD + (9) + 8 dígitos → DDD + 8 dígitos (o WhatsApp às vezes guarda sem o 9 da frente)
  function cmdNormTel(d) { d = cmdDig(d); if (d.length >= 12 && d.indexOf('55') === 0) d = d.slice(2); if (d.length === 11 && d.charAt(2) === '9') d = d.slice(0, 2) + d.slice(3); return d; }
  function cmdEhVoce(nome) { return /\((voc[eê]|you)\)\s*$/i.test(nome || '') || /^(voc[eê]|you)$/i.test(String(nome || '').trim()); }
  // a conversa é de um autorizado? (número com 8+ dígitos batendo o final, ou o nome exatamente como está salvo no WhatsApp)
  function cmdAutorizado(nome, tel) {
    if (!AUTO.cmdOn) return false;
    if (AUTO.cmdEu !== false && cmdEhVoce(nome)) return true;
    if ((AUTO.cmdNomes || []).indexOf(String(nome || '').trim()) >= 0) return true; // conversa autorizada pelo botão / nome aprendido do número
    var t = cmdDig(tel || (/^[+\d\s()\-]{8,}$/.test(nome || '') ? nome : ''));
    return (AUTO.cmdQuem || []).some(function (q) {
      q = String(q || '').trim(); if (!q) return false;
      var d = cmdDig(q);
      if (d.length >= 8) { var nt = cmdNormTel(t), nd = cmdNormTel(d); if (nt.length < 8 || nt.slice(-8) !== nd.slice(-8)) return false; return nt.length < 10 || nd.length < 10 || nt.slice(0, 2) === nd.slice(0, 2); }
      return String(nome || '').trim().toLowerCase() === q.toLowerCase();
    });
  }
  function cmdSemAcento(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function cmdIso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2) + 'T' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
  // "até 15h" / "15:30" / "1h" / "30 min" / "2 horas" / "até 20/11" / "dia 20"
  function cmdAte(t, ferias) {
    var m, d = new Date();
    if ((m = t.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/))) {
      var y = m[3] ? (+m[3] < 100 ? 2000 + (+m[3]) : +m[3]) : d.getFullYear(); var x = new Date(y, +m[2] - 1, +m[1], 8, 0, 0, 0); if (!m[3] && x.getTime() < Date.now() - 86400000) x.setFullYear(y + 1); return { ate: x, resto: t.replace(m[0], ' ') };
    }
    if ((m = t.match(/(?:ate\s+(?:o\s+)?)?dia\s+(\d{1,2})\b/))) { var x2 = new Date(d.getFullYear(), d.getMonth(), +m[1], 8, 0, 0, 0); if (x2.getTime() < Date.now()) x2.setMonth(x2.getMonth() + 1); return { ate: x2, resto: t.replace(m[0], ' ') }; }
    if ((m = t.match(/(\d+(?:[.,]\d+)?)\s*(h\b|hr|hora|horas|min\b|mins|minuto|minutos|d\b|dia|dias)/))) {
      var n = parseFloat(m[1].replace(',', '.')), u = m[2], x3 = new Date();
      if (/^d/.test(u)) { x3.setDate(x3.getDate() + Math.round(n)); x3.setHours(8, 0, 0, 0); } else x3 = new Date(Date.now() + n * (/^m/.test(u) ? 60000 : 3600000));
      if (!/ate/.test(t.slice(0, t.indexOf(m[0])).slice(-6)) || /min|hora|hr|dia/.test(u)) return { ate: x3, resto: t.replace(m[0], ' ') };
    }
    if ((m = t.match(/(\d{1,2})(?:[:h](\d{2}))?\s*h?\b/)) && /ate|as|às/.test(t)) {
      var x4 = new Date(); x4.setHours(+m[1], m[2] ? +m[2] : 0, 0, 0); if (x4.getTime() < Date.now()) x4.setDate(x4.getDate() + 1); return { ate: x4, resto: t.replace(m[0], ' ') };
    }
    return { ate: null, resto: t };
  }
  function cmdStatusTxt() {
    var aus = autoAusente(), m = AUTO_MODOS[aus || 'normal'];
    var s = m[0] + ' ' + m[1] + (aus && AUTO.ate ? ' até ' + (aus === 'ferias' ? autoDataBR(AUTO.ate) : autoDataBR(AUTO.ate) + ' ' + autoHoraBR(AUTO.ate)) : '');
    if (aus === 'ferias' && AUTO.subst) s += ' · atende: ' + AUTO.subst + (AUTO.substTel ? ' ' + AUTO.substTel : '');
    s += '\n👋 Saudação de espera: ' + (AUTO.on ? 'ligada, ' + AUTO.min + ' min, ' + AUTO.ini + '–' + AUTO.fim : 'desligada');
    return s;
  }
  var CMD_AJUDA = 'Comandos (comece com pf):\npf reunião até 15h · pf reunião 1h\npf ausente até 17h\npf férias até 20/11 Carlos 11 98765-4321\npf voltei\npf saudação liga · pf saudação desliga · pf saudação 5 min\npf status';
  function cmdExecutar(txt) {
    var t = cmdSemAcento(txt).replace(/^\s*pf[\s:,.-]+/, '').trim();
    if (!t || /^(ajuda|help|\?|comandos)/.test(t)) return CMD_AJUDA;
    if (/^status|^como (esta|ta)/.test(t)) return '📋 ' + cmdStatusTxt();
    if (/^(voltei|volta|disponivel|cheguei|online|normal)/.test(t)) { autoModoSet('normal'); return '✅ Voltei: 🟢 Disponível. A mensagem de ausência parou.'; }
    var modo = /^reuni/.test(t) ? 'reuniao' : /^(ausente|fora|saindo|sai)/.test(t) ? 'ausente' : /^ferias/.test(t) ? 'ferias' : '';
    if (modo) {
      var orig = String(txt || '').replace(/^\s*pf[\s:,.-]+/i, '');
      var a = cmdAte(t.replace(/^\S+\s*/, ''), modo === 'ferias');
      autoModoSet(modo);
      if (a.ate) AUTO.ate = cmdIso(a.ate);
      if (modo === 'ferias') {
        var tel = (orig.match(/\(?\d{2}\)?\s*9?\d{4}[-\s]?\d{4}/) || [''])[0];
        var nomeS = orig.replace(/^\S+\s*/, '').replace(/\d{1,2}\/\d{1,2}(\/\d{2,4})?/g, ' ').replace(tel, ' ').replace(/(^|\s)(at[eé]|dia|o|a|com|fala|falar|com|atende|quem|volto|no|na|ele|ela)(?=\s|$)/gi, ' ').replace(/(^|\s)(at[eé]|dia|o|a|com|fala|falar|atende|quem|volto|no|na|ele|ela)(?=\s|$)/gi, ' ').replace(/[^A-Za-zÀ-ÿ\s]/g, ' ').replace(/\s+/g, ' ').trim();
        if (nomeS) AUTO.subst = nomeS.split(' ').slice(0, 2).map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(); }).join(' ');
        if (tel) AUTO.substTel = tel.trim();
      }
      AUTO.ausDesde = Date.now(); autoGravar(); try { autoStatusPill(); } catch (e) { }
      return '✅ Ok: ' + cmdStatusTxt().split('\n')[0] + '\nCada cliente que chamar recebe UMA mensagem avisando. Pra voltar: pf voltei';
    }
    if (/^sauda/.test(t)) {
      var mm = t.match(/(\d+)\s*min/) || t.match(/\b(\d{1,3})\b/);
      if (/desl|off|para|nao/.test(t)) AUTO.on = false; else AUTO.on = true;
      if (mm && AUTO.on) AUTO.min = Math.max(1, +mm[1]);
      autoGravar();
      return '✅ Saudação de espera ' + (AUTO.on ? 'ligada: ' + AUTO.min + ' min sem resposta, ' + AUTO.ini + '–' + AUTO.fim : 'desligada') + '.';
    }
    return '🤔 Não entendi "' + String(txt || '').trim().slice(0, 60) + '".\n' + CMD_AJUDA;
  }
  // texto da última mensagem que aparece embaixo do nome na lista
  function cmdPreview(row, nome) {
    var ts = Array.prototype.map.call(row.querySelectorAll('span[title]'), function (e) { return (e.getAttribute('title') || '').trim(); }).filter(function (x) { return x && x !== nome; });
    var p = ts.length ? ts[ts.length - 1] : '';
    if (!p) { var ls = (row.innerText || '').split('\n').map(function (x) { return x.trim(); }).filter(Boolean); p = ls.find(function (x) { return /^((voc[eê]|you):\s*)?pf\b/i.test(x); }) || ''; }
    return p.replace(/^(voc[eê]|you):\s*/i, '').trim();
  }
  async function cmdTick() {
    if (!AUTO.cmdOn) return;
    // a lista só mostra o NOME salvo: quando a conversa do número autorizado está aberta, aprende o nome dela
    try { var ca = contatoAtual(); if (ca && !ca.grupo && ca.tel && ca.nome && (AUTO.cmdNomes || []).indexOf(ca.nome) < 0 && (AUTO.cmdQuem || []).some(function (q) { var d = cmdNormTel(q), t = cmdNormTel(ca.tel); return d.length >= 8 && t.slice(-8) === d.slice(-8); })) { AUTO.cmdNomes = (AUTO.cmdNomes || []).concat([ca.nome]); autoGravar(); } } catch (e) { }
    linhasLista().forEach(function (L) {
      if (!cmdAutorizado(L.nome, L.tel)) return;
      var p = cmdPreview(L.el, L.nome); if (!/^pf\b/i.test(p)) return;
      var hm = ''; L.el.querySelectorAll('span,div').forEach(function (e) { if (!hm && e.children.length === 0 && /^\d{1,2}:\d{2}$/.test((e.textContent || '').trim())) hm = (e.textContent || '').trim(); });
      var k = L.nome + '|' + p + '|' + hm; if (cmdFeitos[k]) return;
      // só vale comando novo (até 12 h): na 1ª vez que a extensão vê a conversa, o que já estava lá não é executado de novo
      var t = horaFolha(L.el); if (t && Date.now() - t > 12 * 3600000) { cmdFeitos[k] = Date.now(); cmdGravar(); return; }
      cmdFeitos[k] = Date.now();
      var r = cmdExecutar(p);
      cmdResp.push({ nome: L.nome, txt: r, ts: Date.now(), cmd: p });
      cmdGravar(); try { pinta(); } catch (e) { }
    });
    // responde quando você não está mexendo no WhatsApp (ou se a conversa já está aberta)
    var pend = cmdResp.filter(function (x) { return !x.ok; }); if (!pend.length || autoOcup) return;
    var x = pend[0], aberta = contatoAt && contatoAt.nome === x.nome;
    if (!aberta && Date.now() - autoUltMexeu < 30000) return;
    if (Date.now() - x.ts > 12 * 3600000) { x.ok = 1; cmdGravar(); return; }
    autoOcup = true;
    try {
      var antes = contatoAt ? contatoAt.nome : '';
      if (!aberta) { var row = linhaDoNome(x.nome); if (!row) return; clicar(row); if (!(await esperar(function () { var c = contatoAtual(); return c && c.nome === x.nome ? 1 : null; }, 4000))) return; await dormir(600); }
      var cx = caixaTexto(); if (!cx || (cx.innerText || '').trim()) return;
      if (!escreverNaCaixa(x.txt)) return;
      var btn = await esperar(botaoEnviar, 3000); if (!btn) return;
      await dormir(500); (botaoEnviar() || btn).click();
      if (await esperar(function () { var b = caixaTexto(); return b && !(b.innerText || '').trim() ? 1 : null; }, 8000)) { x.ok = 1; cmdGravar(); }
      if (!aberta && antes) { var vt = linhaDoNome(antes); if (vt) clicar(vt); }
    } finally { autoOcup = false; }
  }
  setInterval(function () { cmdTick().catch(function (e) { console.warn('PF cmd', e); }); }, 8000);
  function htmlCmd() {
    var A = AUTO, ult = cmdResp.slice(-3).reverse();
    return '<div class="au-sec"><div class="pfwa-cfgl" data-acao="autoTog" data-arg="cmdOn"><span class="pfwa-cfgi">📱</span><div><b>Mudar pelo WhatsApp</b><br><small>Do seu celular pessoal (ou na conversa com você mesmo), mande "pf reunião até 15h", "pf férias até 20/11 Carlos 11 98765-4321", "pf voltei", "pf status"… O computador com este WhatsApp aberto faz e responde ✅.</small></div><span class="pfwa-sw' + (A.cmdOn ? ' on' : '') + '"><i></i></span></div>' +
      ((contatoAt && !contatoAt.grupo && !cmdAutorizado(contatoAt.nome, contatoAt.tel)) ? '<div style="margin:6px 0 8px"><button class="au-bt" data-acao="cmdAutorizar">➕ Autorizar esta conversa (' + esc(contatoAt.nome) + ')</button> <small style="color:#607080">abra a conversa do seu celular pessoal e clique</small></div>' : '') +
      (A.cmdOn ? '<div class="au-fr"><small>Números (ou contato como está salvo neste WhatsApp) que podem mandar comando — um por linha. Mensagem "pf …" de outro número é ignorada.</small><textarea data-au="cmdQuem" rows="2" placeholder="(11) 98888-7777">' + esc((A.cmdQuem || []).join('\n')) + '</textarea>' +
        ((A.cmdNomes || []).length ? '<div class="au-ok">✅ Autorizadas: ' + (A.cmdNomes || []).map(function (n) { return esc(n) + ' <span class="pfwa-link" data-acao="cmdTirar" data-arg="' + esc(n) + '">✕</span>'; }).join(' · ') + '</div>' : '') +
        '<label class="au-ck"><input type="checkbox" data-au="cmdEu"' + (A.cmdEu !== false ? ' checked' : '') + '> também na conversa comigo mesmo (Você)</label></div>' +
        '<div class="au-st">' + esc(CMD_AJUDA).replace(/\n/g, '<br>') + '</div>' +
        (ult.length ? '<div class="pfwa-bloco"><div class="pfwa-bt">Últimos comandos</div>' + ult.map(function (u) { return '<div class="pfwa-it"><b>' + esc(u.cmd) + '</b> <small>' + esc(new Date(u.ts).toLocaleString('pt-BR').slice(0, 17)) + (u.ok ? ' · respondido' : ' · vai responder quando você parar de mexer') + '</small><br><small>' + esc(u.txt.split('\n')[0]) + '</small></div>'; }).join('') + '</div>' : '') : '') +
      '</div>';
  }
  processarEnvio();
  setInterval(function () { vigiar().catch(function (e) { console.warn('PF', e); }); try { carregarSituacoes(); badgesRender(); aplicarFiltro(); } catch (e) { } }, 1500);
  window.addEventListener('resize', posicionar);
})();
