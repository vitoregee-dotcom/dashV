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
  // 4.53 - A pedido do Vitor ("só manda se eu abrir a conversa… quero que mande se eu estiver em outra tela"): com o WhatsApp em outra aba/tela o Chrome
  // segura os relógios da página (1 vez por minuto) e a extensão desistia de abrir a conversa. A espera agora é feita pelo fundo da extensão.
  function dormir(ms) { return new Promise(function (r) { if (document.hidden) { try { chrome.runtime.sendMessage({ t: 'dormir', ms: ms }, function () { void chrome.runtime.lastError; r(); }); return; } catch (e) { } } setTimeout(r, ms); }); }
  function esperar(fn, ms) {
    return new Promise(function (res) {
      var t0 = Date.now();
      (function loop() { var v = null; try { v = fn(); } catch (e) { } if (v) return res(v); if (Date.now() - t0 > ms) return res(null); dormir(400).then(loop); })();
    });
  }
  // 6.5 - "Não deu — abra o PF" sem dizer o porquê (Vitor no Edge, WhatsApp de um colega): naoDeu() conta o motivo de verdade da última resposta.
  var ultimaResp = null;
  function naoDeu() { var r = ultimaResp;
    if (!r) return 'O PF não respondeu — abra o PartsFlow numa aba DESTE navegador e faça o login';
    if (r.erro === 'semPF') return 'O PartsFlow não está aberto neste navegador — abra numa aba (e faça o login)';
    if (r.erro === 'pfF5') return 'Dê F5 na aba do PartsFlow e tente de novo';
    if (r.erro === 'recarregar') return 'A extensão foi atualizada — dê F5 nesta aba do WhatsApp';
    if (r.msg) return String(r.msg); if (r.erro) return 'O PF não conseguiu: ' + r.erro; return 'O PF não conseguiu fazer isso'; }
  // 9.4 - A pedido do Vitor (🧠 aprender com você): as ações que você faz na conversa ficam guardadas uns minutos pra ligar com a sua resposta
  var aprAcoes = {}, APR_ACOES = { abrirCot: 1, abrirCotMin: 1, cotHoje: 1, mapaCriar: 1, pedidoEmitir: 1, aviseMe: 1, materialEnviado: 1, rrUsou: 1, respForn: 1, lerCods: 1, cadLink: 1, credito: 1, precoConc: 1, montaCom: 1, jbAbrir: 1 };
  function aprGuardar(m) { try { if (m && m.t === 'acao' && APR_ACOES[m.acao] && typeof ultimo !== 'undefined' && ultimo) { var L = aprAcoes[ultimo] = aprAcoes[ultimo] || []; var a = m.arg || {}; L.push({ a: m.acao, ts: Date.now(), det: String(a.nome && m.acao === 'rrUsou' ? a.nome : (a.arq || a.arquivo || a.titulo || '')).slice(0, 80) }); if (L.length > 20) L.shift(); } } catch (e) { } }
  function msg(m) { aprGuardar(m); return new Promise(function (res) { try { chrome.runtime.sendMessage(m, function (r) { void chrome.runtime.lastError; ultimaResp = r || null; try { if (r && r.gruposPF && typeof svGruposPfSet === 'function') svGruposPfSet(r.gruposPF); } catch (e) { } res(r || null); }); } catch (e) { ultimaResp = { erro: 'recarregar' }; res(ultimaResp); } }); }
  function reais(v) { return 'R$ ' + (+v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  var VER = (function () { try { return chrome.runtime.getManifest().version; } catch (e) { return ''; } })();

  // ═══ 1) ENVIO ═══
  function caixaTexto() { return $('#main footer div[contenteditable="true"]'); }
  function botaoEnviar() {
    var s = $('#main footer button[aria-label="Enviar"]') || $('#main footer button[aria-label="Send"]') ||
      $('#main footer [data-icon="send"]') || $('#main footer [data-icon="wds-ic-send-filled"]');
    // 4.44 - BUG (Vitor: "veio para a caixa e não enviou"): o WhatsApp novo trocou o botão de enviar — procura também por aria-label/ícone que tenha "enviar/send"
    if (!s) s = $('#main footer [aria-label*="Enviar" i]:not([aria-label*="áudio" i]):not([aria-label*="voz" i])') || $('#main footer [aria-label*="Send" i]:not([aria-label*="voice" i])') || $('#main footer [data-icon*="send"]');
    if (!s) return null;
    return s.closest('button') || s.closest('[role="button"]') || s;
  }
  // 4.44 - aperta enviar; sem achar o botão, manda o Enter na caixa (o WhatsApp envia no Enter)
  function enviarAgora() {
    var b = botaoEnviar(); if (b) { b.click(); return true; }
    var cx = caixaTexto(); if (!cx) return false;
    cx.focus();
    ['keydown', 'keypress', 'keyup'].forEach(function (t) { cx.dispatchEvent(new KeyboardEvent(t, { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true })); });
    return true;
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
    // 6.3 - mensagem com [[SAUD:…]] (mapa pelo WhatsApp): a saudação só vai se você ainda não mandou nada hoje nessa conversa
    var mS = /^\[\[SAUD:([\s\S]*?)\]\]\n*/.exec(a.texto || '');
    if (mS) { await esperar(function () { return msgLinhas().length ? 1 : null; }, 4000); var _fh = false; try { _autoCtx = null; _fh = autoFaleiHoje(); } catch (e) { } a.texto = (_fh ? '' : mS[1] + '\n\n') + a.texto.slice(mS[0].length); }
    var btn = mS ? null : await esperar(botaoEnviar, 3000);
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
  // 4.44 - BUG (Vitor: "veio para a caixa isso… a msg está errada" — o texto entrava 2x): o WhatsApp novo trata o "colar" DEPOIS (assíncrono), a extensão
  // achava que não tinha entrado e escrevia de novo com o insertText. Agora: insertText primeiro (entra na hora); só se não entrou, cola — e nunca os dois.
  function escreverNaCaixa(txt) {
    var cx = caixaTexto(); if (!cx) return false;
    cx.focus();
    var antes = cx.innerText || '';
    // 9.6 - BUG (Vitor: "fui por aqui. foi todo errado para o cliente" — Dados Bancários saiu numa linha só): o insertText do WhatsApp novo JOGA FORA as quebras de linha.
    // Texto com várias linhas vai COLADO (o WhatsApp mantém as linhas ao colar); se não entrar, escreve linha por linha com Shift+Enter entre elas.
    if (/\n/.test(String(txt || ''))) {
      try { var dtm = new DataTransfer(); dtm.setData('text/plain', txt); cx.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dtm, bubbles: true, cancelable: true })); } catch (e) { }
      var alvoM = String(txt).split('\n').filter(function (l) { return l.trim(); })[0] || '';
      alvoM = alvoM.replace(/\s+/g, ' ').trim().slice(0, 30);
      setTimeout(function () {
        var c2 = caixaTexto(); if (!c2) return;
        if (alvoM && (c2.innerText || '').replace(/\s+/g, ' ').indexOf(alvoM) >= 0) return;
        c2.focus();
        String(txt).split('\n').forEach(function (l, i) {
          if (i) { ['keydown', 'keypress', 'keyup'].forEach(function (t) { c2.dispatchEvent(new KeyboardEvent(t, { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, shiftKey: true, bubbles: true, cancelable: true })); });
            try { document.execCommand('insertLineBreak'); } catch (e) { } }
          if (l) try { document.execCommand('insertText', false, l); } catch (e) { }
        });
      }, 450);
      return true;
    }
    try { document.execCommand('insertText', false, txt); } catch (e) { }
    if ((cx.innerText || '') !== antes) return true;
    // 4.45 - BUG (Vitor: "Bom dia, Fabio! Ja te chamoBom dia, Fabio! Ja te chamo"): no WhatsApp de hoje o insertText também entra só um instante DEPOIS — a 4.44 achava
    // que não tinha entrado e colava de novo na hora. Agora espera e só cola se a caixa continuar sem o texto.
    var alvo = String(txt || '').replace(/\s+/g, ' ').trim().slice(0, 40);
    setTimeout(function () {
      var c2 = caixaTexto(); if (!c2) return;
      var agora = (c2.innerText || '').replace(/\s+/g, ' ');
      if (alvo && agora.indexOf(alvo) >= 0) return;
      if ((c2.innerText || '') !== antes) return;
      c2.focus();
      try { var dt = new DataTransfer(); dt.setData('text/plain', txt); c2.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); } catch (e) { }
    }, 400);
    return true; // entra um instante depois — quem precisa conferir espera o texto/botão de enviar
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
    var row = x.closest('.message-in, .message-out') || x.closest('[data-id]') || x.closest('[role="row"]'); if (!row) return null;
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
    try { if (r.texto) audPedido(b, r.texto); } catch (e) { } // 4.87
  }
  // 4.87 - A pedido do Vitor ("isso foi uma confirmação de pedido. na descrição do áudio"): o que o áudio diz passa pelas mesmas regras do 📦 Pedido a emitir
  async function audPedido(b, txt) {
    if (!contatoAt || contatoAt.grupo) return; var cfg = await peConfig(); if (!cfg || !cfg.ligado) return;
    var eu = false; try { eu = minhaEl(b); } catch (e) { }
    var n = peNorm(txt), ok = eu ? (cfg.deMim && ((peReMim && peReMim.test(n)) || pePromessa(n))) : (cfg.doCliente && ((peReCli && peReCli.test(n)) || peCaraDePedido(txt) || peConfirmaFalado(txt)));
    if (!ok) return; var ch = ultimo, gat = '🎤 ' + txt;
    var rr = await msg({ t: 'acao', acao: 'pedidoEmitir', arg: { k: resp && resp.k, nome: contatoAt.nome, texto: gat, msgs: lerMensagens(), origem: eu ? 'mim' : 'cliente' } });
    if (ch !== ultimo || !rr || !rr.ok || rr.jaTinha) return; rr._txt = gat; peR = rr; pintaPe();
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
      out.push({ t: t.trim(), eu: minhaEl(el), q: msgQuando(el) }); // 4.43 · 8.7 - q = quando (pra não pegar mensagem de outro dia)
    });
    if (!out.length) { // jeito antigo / reserva
      document.querySelectorAll('#main .message-in, #main .message-out').forEach(function (el) { var tx = el.querySelector('.selectable-text'); out.push({ t: ((tx ? tx.innerText : '') || '').trim(), eu: el.classList.contains('message-out') }); });
    }
    return out.filter(function (m) { return m.t; }).slice(-40);
  }
  // 4.77 - A pedido do Vitor ("ofertas e materiais… ter um resumo do feedback do cliente"): mensagens NA ORDEM com o ARQUIVO mandado (portfólio,
  // catálogo, tabela…) — o lerMensagens só vê texto. Usado pelas ofertas (o PF guarda o material enviado) e pelo lembrete que fecha sozinho.
  var DOC_RE = /([^\n]+?\.(?:pdf|docx?|xlsx?|pptx?|csv))\b/i;
  function lerMensagensDoc() {
    var out = [];
    try { msgLinhas().forEach(function (b) {
      var tx = b.querySelectorAll('.selectable-text'), t = Array.prototype.map.call(tx, function (z) { return z.innerText || ''; }).join('\n').trim();
      var m = String(b.innerText || '').match(DOC_RE), doc = m ? m[1].trim() : '';
      if (doc && t && t.indexOf(doc) >= 0) doc = ''; // o nome está dentro do texto digitado = não é arquivo
      if (t || doc) out.push({ t: t, doc: doc, eu: minhaEl(b) });
    }); } catch (e) { }
    if (!out.length) return lerMensagens();
    return out.slice(-40);
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
  // 4.73 - A pedido do Vitor ("N7134" sozinho na mensagem e o PF nem marcou — "preciso que leia a mesma regra do Leitor de Peças"): mensagem que é SÓ
  // código (1 a 3 palavras, todas com cara de código: letra+números ou 5+ dígitos) conta como pedido mesmo com 1 código só. A conversão (N7134 = N007134) é do PF.
  // 4.81 - A pedido do Vitor ("pq só achou um" — PL-249=50pcs / PL-241=50pcs / JF-0026=15pcs): código com letras + traço + 3 números (PL-249) também conta.
  // 8.4 - A pedido do Vitor ("Luva 41007 / Ponteira 4 53 61" — pq não reconheceu os itens pra cotar?): código Spicer com espaços (4 53 61 = 4-53-61)
  // conta como código, e o nome da peça (luva, ponteira, cruzeta…) junto do código já é pedido.
  function juntaCod(t) { return String(t || '').replace(/(^|\s)(2|3|4|6|6\.5|8|90|140|170|250)\s+(\d{1,2})\s+(\d{1,5}[A-Za-z]{0,3})(?=$|[\s,;.])/g, '$1$2-$3-$4').replace(/(^|\s)(\d)\s+(\d{2,5}[Xx][A-Za-z]{0,2})(?=$|[\s,;.])/g, '$1$2-$3'); }
  var PECA_RE = /\b(luvas?|ponteiras?|pontuvas?|cruzetas?|garfos?|flanges?|terminal|terminais|mancais?|mancal|coifas?|retentor(es)?|rolamentos?|filtros?|juntas?|an[ée]is|anel|bronzinas?|kit|jogo|eixos?|engrenagens?|pinh[ãa]o|coroa|semi.?eixo|bomba|bico|turbina)\b/i;
  function ehCodTk(tk) { tk = String(tk || ''); if (/^\d{1,2}[\/.:]\d{2}/.test(tk)) return false; var d = tk.replace(/\D/g, '').length; return d >= 4 || /^[A-Za-z]{1,4}[-.]?\d{3}[A-Za-z0-9]*$/.test(tk); }
  function soCodigo(t) {
    var w = String(t || '').trim().split(/[\s,;]+/).filter(Boolean); if (!w.length || w.length > 3) return false;
    return w.every(function (x) { x = x.replace(/[.:!?]+$/, ''); var d = x.replace(/\D/g, ''); return d.length >= 3 && x.length <= 20 && (/[A-Za-z]/.test(x) ? /\d/.test(x) : d.length >= 5) && !/^\d{1,2}[\/.:]\d{2}/.test(x); });
  }
  function pareceCotacao(ms) {
    var cli = ms.filter(function (m) { return !m.eu; }).slice(-15).map(function (m) { return { eu: m.eu, t: juntaCod(m.t) }; }), n = 0, pede = false;
    cli.forEach(function (m) { if (PECA_RE.test(m.t)) pede = true; if (soCodigo(m.t)) { pede = true; n += Math.max(1, (m.t.match(COD_RE) || []).length); return; } (m.t.match(COD_RE) || []).forEach(function (tk) { if (ehCodTk(tk)) n++; }); if (/\b(cot|or[cç]|pre[cç]o|valor|quanto|tem\b|disponi|saldo|envi[ae]|mand[ae]|separ[ae]|fatur[ae]|despach[ae]|reserv[ae]|pedido|quero|preciso|levo)/i.test(m.t)) pede = true; });
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
  // 4.57 - A pedido do Vitor ("vamos no 2. mas ai ele vai fz somente nos q não estão em lista?"): põe na lista "Cliente PF" só as conversas de cliente do PF
  // (ou contato com grupo) que NÃO têm a linha da lista do WhatsApp; pula as não lidas (abrir tira o "não lida"). Rola a lista toda; clique de novo = para.
  // 4.58 - A pedido do Vitor ("no Watidy ele fazia em segundo plano… vamos fazer"): MOTOR por dentro do WhatsApp (motor.js + WA-JS, mundo da página).
  // motor(op,arg) → resposta; motorOk = o motor está pronto. Sem motor, tudo volta pro jeito antigo (clicando na tela).
  var motorSeq = 0, motorPend = {}, motorOk = false, motorVer = '';
  window.addEventListener('message', function (e) { var d = e.data; if (e.source !== window || !d || d.__pfMotor !== 'res') return; var p = motorPend[d.id]; if (p) { delete motorPend[d.id]; p(d.r); } });
  function motor(op, arg, ms) { return new Promise(function (res) { var id = ++motorSeq; motorPend[id] = res; window.postMessage({ __pfMotor: 'req', id: id, op: op, arg: arg || {} }, '*'); setTimeout(function () { if (motorPend[id]) { delete motorPend[id]; res({ erro: 'tempo' }); } }, ms || 15000); }); }
  async function motorChecar() { var r = await motor('ping', {}, 2500); motorOk = !!(r && r.pronto); motorVer = (r && r.ver) || ''; return motorOk; }
  setTimeout(motorChecar, 4000); setInterval(function () { if (vivo()) motorChecar(); }, 30000);
  function motorSeloHtml() { return motorOk ? '<div class="pfwa-motor on">⚙️ Motor ligado — faz sem abrir as conversas</div>' : '<div class="pfwa-motor">⚙️ Motor desligado — fazendo pelo jeito antigo (abrindo as conversas)</div>'; }
  // 4.59 - A pedido do Vitor ("some o resumo do trabalho. e nem dava pra ver direito. estava aparecendo cortado"): o andamento/resumo
  // de Importar / Pôr na lista / Buscar números ficava no rodapé do painel (cortado embaixo e apagado quando a tela era redesenhada).
  // Agora mora numa caixa só (TAREFA_EL) que fica logo embaixo dos botões em ⚙️ → 📇 Contatos, sobrevive aos redesenhos e o resumo final fica.
  var TAREFA_EL = null;
  function tarefaEl() { if (!TAREFA_EL) { TAREFA_EL = document.createElement('div'); TAREFA_EL.className = 'pfwa-tarefa'; } tarefaPor(); setTimeout(function () { try { TAREFA_EL.scrollIntoView({ block: 'nearest' }); } catch (e) { } }, 300); return TAREFA_EL; }
  function tarefaPor() {
    if (!TAREFA_EL || !P) return;
    var lugar = P.querySelector('.pfwa-tarefa-lugar') || P.querySelector('.pfwa-rodst');
    if (lugar && TAREFA_EL.parentNode !== lugar) lugar.appendChild(TAREFA_EL);
  }
  // 4.58 - A pedido do Vitor ("não dá nem pra ver como está o processo… mostrar o percentual, a quantidade que falta"): barra de andamento padrão
  function progSet(st, tit, feito, total, extra) {
    if (!st) return;
    var temT = total > 0, p = temT ? Math.min(100, Math.round(feito * 100 / total)) : 0;
    st.innerHTML = '<div class="pfwa-prog"><div class="pfwa-progt"><b>' + tit + '</b>' + (temT ? '<span>' + p + '%</span>' : '') + '</div>' +
      '<div class="pfwa-progb' + (temT ? '' : ' ind') + '"><i style="width:' + (temT ? p : 35) + '%"></i></div>' +
      '<div class="pfwa-progs">' + (temT ? feito + ' de ' + total + ' · faltam ' + Math.max(0, total - feito) : 'preparando…') + (extra ? ' · ' + extra : '') + '</div></div>';
  }
  function progPct(st, tit, pct, extra) {
    if (!st) return; pct = Math.max(0, Math.min(100, Math.round(pct)));
    st.innerHTML = '<div class="pfwa-prog"><div class="pfwa-progt"><b>' + tit + '</b><span>' + pct + '%</span></div><div class="pfwa-progb"><i style="width:' + pct + '%"></i></div>' +
      '<div class="pfwa-progs">' + (extra || '') + '</div></div>';
  }
  async function listaMassaMotor(b, st) {
    progSet(st, '🏷️ Lendo as conversas…', 0, 0);
    var r = await motor('chatsTodos', {}, 60000); if (!r || r.erro || !Array.isArray(r.l)) return false;
    var semLista = r.l.filter(function (c) { return !c.listas && c.nome; }), alvo = [];
    for (var i = 0; i < semLista.length && !lmParar; i += 150) {
      progSet(st, '🏷️ Conferindo quem é cliente do PF', i, semLista.length, alvo.length + ' clientes sem lista');
      var sl = semLista.slice(i, i + 150), s = await msg({ t: 'acao', acao: 'situacoes', arg: { lista: sl.map(function (c) { return { nome: c.nome, tel: '' }; }) } });
      sl.forEach(function (c) { var x = s && s.sit && s.sit[c.nome]; if (x && (x.tipo === 'cliente' || x.tipo === 'contato')) alvo.push(c); });
    }
    if (lmParar) { st.textContent = '⏸ Parado'; return true; }
    if (!alvo.length) { st.textContent = '✔ Nenhum cliente sem lista — todos já estão em alguma'; return true; }
    var lb = await motor('labelGarantir', { nome: WA_ETQ }, 20000);
    if (!lb || lb.erro) { st.textContent = '⚠ Não consegui achar/criar a lista "' + WA_ETQ + '" (' + ((lb && lb.erro) || 'sem resposta') + '). Crie ela no WhatsApp ("Adicionar à lista" › Nova lista) e tente de novo.'; return true; }
    var n = 0, err = 0;
    for (var j = 0; j < alvo.length && !lmParar; j += 10) {
      var lote = alvo.slice(j, j + 10), a = await motor('labelAdd', { ids: lote.map(function (c) { return c.id; }), labelId: lb.id }, 30000);
      if (a && a.ok) n += lote.length; else err += lote.length;
      progSet(st, '🏷️ Pondo na lista "' + WA_ETQ + '"', Math.min(j + 10, alvo.length), alvo.length, n + ' postas' + (err ? ' · ' + err + ' com erro' : ''));
      await dormir(300);
    }
    sitSig = ''; try { carregarSituacoes(); } catch (e) { }
    st.textContent = (lmParar ? '⏸ Parado · ' : '✔ Pronto · ') + n + ' conversa(s) postas na lista "' + WA_ETQ + '"' + (err ? ' · ' + err + ' com erro' : '') + ' (sem abrir nenhuma conversa)';
    return true;
  }
  async function numerosMotor(b, st) {
    progSet(st, '📞 Lendo os contatos do celular…', 0, 0);
    var rc = await motor('contatos', {}, 180000); if (!rc || rc.erro || !Array.isArray(rc.l)) return false;
    var com = rc.l.filter(function (c) { return c.tel; }), gravou = 0, noPf = 0;
    for (var i = 0; i < com.length && !numParar; i += 200) {
      var g = await msg({ t: 'acao', acao: 'contatosTelLote', arg: { lista: com.slice(i, i + 200).map(function (c) { return { nome: c.nome, tel: c.tel }; }) } });
      if (g && g.erro) { st.textContent = g.erro === 'semPF' ? 'Abra o PF numa aba deste Chrome' : 'Dê F5 na aba do PartsFlow (versão nova)'; return true; }
      gravou += (g && g.gravou) || 0; noPf += (g && g.semCad) || 0;
      progSet(st, '📞 Passando os números pro PF', Math.min(i + 200, com.length), com.length, gravou + ' gravados');
    }
    st.textContent = (numParar ? '⏸ Parado · ' : '✔ Pronto · ') + gravou + ' número(s) gravados no PF · ' + com.length + ' contatos do celular com número' + (rc.l.length - com.length ? ' · ' + (rc.l.length - com.length) + ' sem número' : '');
    return true;
  }
  var lmRodando = false, lmParar = false;
  function temLinhaLista(r) {
    if (r.querySelector('.pfwa-row3u')) return true;
    var tit = r.querySelector('span[title]'); if (!tit) return false;
    var sps = r.querySelectorAll('span[title]'), prev = null;
    for (var i = 0; i < sps.length; i++) if (sps[i] !== tit && !tit.contains(sps[i]) && !sps[i].closest('.pfwa-rowln,.pfwa-rowtp')) { prev = sps[i]; break; }
    if (!prev) return false;
    var col = ancComum(tit, prev), lm = col ? filhoQueTem(col, prev) : null; if (!col || !lm) return false;
    var dep = false, tem = false;
    Array.prototype.forEach.call(col.children, function (ch) { if (ch === lm) { dep = true; return; } if (dep && !ch.classList.contains('pfwa-rowbar') && (ch.textContent || '').trim()) tem = true; });
    return tem;
  }
  async function listaMassa(b) {
    var st = tarefaEl();
    if (lmRodando) { lmParar = true; b.textContent = 'Parando…'; return; }
    var pane = $('#pane-side'); if (!pane) { flash(b, 'Abra a lista de conversas'); return; }
    lmRodando = true; lmParar = false; b.textContent = '⏸ Parar';
    if (motorOk || await motorChecar()) { var okM = false; try { okM = await listaMassaMotor(b, st); } catch (e) { } if (okM) { lmRodando = false; b.textContent = '🏷️ Pôr os clientes na lista Cliente PF'; return; } } // 4.58 - sem abrir as conversas
    var antes = contatoAt ? contatoAt.nome : '', feitos = {}, n = 0, pul = 0, erro = 0;
    pane.scrollTop = 0; await dormir(1500);
    for (var volta = 0; volta < 400 && !lmParar; volta++) {
      var x = linhasLista().find(function (y) { if (feitos[y.nome]) return false; var s = sitCache[y.nome]; if (!s || (s.tipo !== 'cliente' && s.tipo !== 'contato')) return false; if (y.unread || temLinhaLista(y.el)) { feitos[y.nome] = 1; pul++; return false; } return true; });
      if (!x) {
        var t0 = pane.scrollTop; pane.scrollTop = t0 + Math.max(200, pane.clientHeight * 0.8); await dormir(1600);
        if (Math.abs(pane.scrollTop - t0) < 5) break; continue;
      }
      feitos[x.nome] = 1;
      progPct(st, '🏷️ Pondo na lista "' + WA_ETQ + '"', pane.scrollTop * 100 / Math.max(1, pane.scrollHeight - pane.clientHeight), n + ' postas' + (erro ? ' · ' + erro + ' não deu' : '') + ' · agora: ' + esc(x.nome) + ' · % = quanto da lista já foi olhado'); // 4.58
      clicar(x.el);
      var ab = await esperar(function () { var c = contatoAtual(); return c && c.nome === x.nome ? c : null; }, 5000);
      if (!ab) { erro++; continue; }
      await dormir(700);
      var ok = null; try { ok = await waListaPeloCabecalho(function () { }); } catch (e) { ok = false; }
      if (ok === null) { if (st) st.textContent = '⚠ Não achei o botão "Adicionar à lista" no topo da conversa — esse WhatsApp é Business?'; break; }
      if (ok) n++; else erro++;
      await dormir(700 + Math.random() * 800);
    }
    if (antes) { var vt = linhaDoNome(antes); if (vt) clicar(vt); }
    lmRodando = false; b.textContent = '🏷️ Pôr os clientes na lista Cliente PF'; sitSig = ''; try { carregarSituacoes(); } catch (e) { }
    if (st && !/⚠ Não achei/.test(st.textContent)) st.textContent = (lmParar ? '⏸ Parado · ' : '✔ Pronto · ') + n + ' conversa(s) postas na lista' + (erro ? ' · ' + erro + ' não deu' : '') + ' · as não lidas e as que já estavam em lista ficaram de fora';
  }
  async function buscarNumeros(b) {
    var st = tarefaEl();
    if (numRodando) { numParar = true; b.textContent = 'Parando…'; return; }
    if (motorOk || await motorChecar()) { numRodando = true; numParar = false; b.textContent = '⏸ Parar'; var okN = false; try { okN = await numerosMotor(b, st); } catch (e) { } numRodando = false; b.textContent = '📞 Buscar números que faltam'; if (okN) return; } // 4.58 - lê todos de uma vez, sem abrir conversa
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
      progSet(st, '📞 Buscando números', n0 + i, nomes.length, achou + ' achados · agora: ' + esc(nome)); // 4.58
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
  var P = null, B = null, AV = null, ultimo = '', aberto = false, visual = 'A', aba = 'cot', resp = null, cot = null, cotErro = '', cotando = false, saldoR = null, statusLote = '', contatoAt = null, avisoFechado = '', avisoLigado = true, botsMin = false; // 4.32 - A pedido do Vitor: o painel vem OCULTO por padrão (clica no "PF" da borda pra abrir)
  // 1.8 - 💡 ofertas e respostas + ⚠ já ofereci + 📢 status
  var QK = null, ASK = null, askL = [], askSig = { fr: '', mat: '' }, askNao = {}, qkSelAntes = '', OF = null, JA = null, ST = null, ofPend = [], ofSig = '', ofSel = {}, ofIgn = {}, digAnt = '', jaR = null, jaFechado = '';
  // 2.0 - Menu do PF em volta do WhatsApp (barra de cima + coluna de ícones + etiquetas por conversa)
  var MENU = null, RAIL = null, menuLig = true, menuCor = 'discreta', menuFiltro = '', sitCache = {}, sitSig = '', sitTimer = null; // 4.32 - A pedido do Vitor: o Menu do PF vem no modo DISCRETO por padrão
  // 2.2 - 📌 "vou verificar depois" → pendência automática (com desfazer)
  var VF = null, vfR = null, vfSig = '';
  // 4.62 - 📦 Pedido a emitir (lembrete automático): config (palavras + liga-desliga) vem do PF (card "Ajustes da extensão do WhatsApp").
  var PE = null, peR = null, peSig = '', peCfg = null, peCfgTs = 0, peReMim = null, peReCli = null;
  var VERIF_RE = /\bvou (anotar|verificar|conferir|checar|ver\b|dar uma (olhada|conferida)|confirmar|olhar|pesquisar|te retornar|te dar)|deixa eu (ver|verificar|conferir|checar|dar uma olhada|olhar)|preciso (verificar|conferir|ver no|checar)|j[aá] (te )?(retorno|verifico|confiro)|vou (te )?(retornar|dar) (o|um|a)/i;
  chrome.storage.local.get(['ofIgn'], function (s) { ofIgn = s.ofIgn || {}; });
  var BOTOES = [['cot', '📄', 'Cotar no PF'], ['curta', '🏷️', 'Resposta curta'], ['avise', '🔔', 'Avise-me'], ['saldo', '📦', 'Saldo'], ['ficha', '🤝', 'Ficha'], ['audio', '🎤', 'Descrever áudio'], ['lemb', '⏰', 'Lembrete'], ['prontas', '⚡', 'Prontas'], ['assist', '🤖', 'Assistente'], ['pdf', '📤', 'PDF']];
  // 4.96 - A pedido do Vitor ("vamos melhorar esse estilo de ícone?" → "os 3 ficam legal" + "quando eu mudar o ícone lá, muda aqui também?"):
  // os botões da coluna ganharam 3 jeitos de ícone (⚙️ Configurações → 🎨 Ícones dos botões, por navegador, padrão = azuis do PF):
  // 'traco' = traço fino estilo WhatsApp, 'azul' = ícones redondos azul-marinho do PF, 'cor' = ícones coloridos do PF (+ 'emoji' = o antigo).
  // Trocar o ícone de um botão = botão direito nele (ou ⚙️) → abre o seletor de ícones do PF; a escolha fica no pfIconOverrides ('wa_<botão>'),
  // vale pra todo mundo e chega aqui como imagem (acao extIcones).
  var ICO_EST = 'azul', ICO_TROCA = {};
  var ICO_SVG = { cot: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>', curta: '<path d="M3 12V4h8l9 9-8 8z"/><circle cx="7.5" cy="8" r="1.3"/>', avise: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>', saldo: '<path d="M3 7l9-4 9 4-9 4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/>', ficha: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>', audio: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>', lemb: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M5 3 2 6M19 3l3 3"/>', prontas: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>', assist: '<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 4v4M9 13h.01M15 13h.01M9 17h6"/>', pdf: '<path d="M12 15V3M7 8l5-5 5 5"/><path d="M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/>' };
  var ICO_ESTILOS = [['azul', 'Azuis do PF'], ['traco', 'Traço (WhatsApp)'], ['cor', 'Coloridos do PF'], ['emoji', 'Emoji (antigo)']];
  try { chrome.storage.local.get(['icoEst', 'icoTroca'], function (x) { if (x && x.icoEst) ICO_EST = x.icoEst; if (x && x.icoTroca) ICO_TROCA = x.icoTroca; try { posicionar(); } catch (e) { } }); } catch (e) { }
  // 7.1 - A pedido do Vitor ("vamos deixar os mesmos ícones do PF, qnd colocar alguma função aqui na extensão"): o menu do botão direito
  // também usa os ícones do PF (o do card quando o PF tem — Leitor de Peças, Me Avise, Componentes Cardan… — senão o do banco do PF no estilo escolhido).
  var ICO_PNG = ['cot', 'curta', 'avise', 'saldo', 'ficha', 'audio', 'lemb', 'prontas', 'assist', 'pdf', 'mc', 'pc', 'leitor', 'nota', 'mat', 'mapa', 'plaq', 'min', 'pend', 'ped', 'ok', 'nunca', 'pf'];
  function icoHtml(k, emo, est) { est = est || ICO_EST; if (est === 'emoji' || (!ICO_SVG[k] && ICO_PNG.indexOf(k) < 0 && !ICO_TROCA[k])) return emo;
    if (est === 'traco' && !ICO_SVG[k]) est = 'azul';
    if (est === 'traco') return '<svg class="pfwa-ico" viewBox="0 0 24 24">' + ICO_SVG[k] + '</svg>';
    var src = ICO_TROCA[k] || chrome.runtime.getURL('icones/' + est + '-' + k + '.png'); return '<img class="pfwa-icoimg" src="' + src + '" alt="">'; }
  async function icoPuxar() { try { var r = await msg({ t: 'acao', acao: 'extIcones' }); if (r && r.por && typeof r.por === 'object') { var j = JSON.stringify(r.por); if (j !== JSON.stringify(ICO_TROCA)) { ICO_TROCA = r.por; chrome.storage.local.set({ icoTroca: ICO_TROCA }); try { posicionar(); } catch (e) { } if (config) pinta(); } } } catch (e) { } }
  function icoEstSet(v) { ICO_EST = v; chrome.storage.local.set({ icoEst: v }); try { posicionar(); } catch (e) { } pinta(); }
  function icoTrocar(k) { msg({ t: 'acao', acao: 'iconeEscolher', arg: { k: k }, focar: true }); }
  setTimeout(icoPuxar, 5000); setInterval(function () { if (vivo()) icoPuxar(); }, 120000); window.addEventListener('focus', function () { if (vivo()) setTimeout(icoPuxar, 800); });
  function logoSvg(f, l, px) { px = px || 24; return '<svg width="' + px + '" height="' + px + '" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="' + f + '"/><rect x="9" y="8" width="4" height="22" rx="1.5" fill="' + l + '"/><path d="M13,8 Q26,8 26,14 Q26,20 13,20" fill="none" stroke="' + l + '" stroke-width="4" stroke-linecap="round"/><line x1="19" y1="20" x2="29" y2="32" stroke="#E67E22" stroke-width="2.5" stroke-linecap="round"/><circle cx="30" cy="33" r="2" fill="#E67E22"/></svg>'; }

  // 2.4 - ❓ Ajuda "Como funciona" (pedido do Vitor: explicar cada função em linguagem simples pros outros usuários).
  // FUNÇÃO NOVA NA EXTENSÃO → acrescentar uma linha aqui.
  var ajuda = false;
  // 3.4 - ⚙️ Configurações (A pedido do Vitor: "coloca botão de eu ligar ou desligar essas configurações. igual no Watidy"):
  // cada função da extensão liga/desliga aqui; guardado por navegador (chrome.storage.local 'cfg'). Menu e aviso de cotação usam as chaves que já existiam.
  var config = false, CFG = { frota: true, mat: true, bots: true, etq: true, salvar: true, ofertas: true, ja: true, verif: true, audio: true, audioBotoes: false, sug: true, waEtqOff: true, rrselo: true, mp: true, apr: true };
  var CFG_LISTA = [
    ['cc', '🧭', 'Conhecer o cliente', 'Selo 🧭 ao lado do nome com o que ainda falta saber do cliente (tipo, linhas, frota, estoque…) e uma dica quando a conversa acalma. 1 clique grava no cadastro.'],
    ['mp', '📦', 'Meus pedidos na coluna da esquerda', 'Um anel por pedido em andamento: enche conforme anda (emitido → despachado), vermelho = precisa de você. Mouse em cima mostra o pedido.'],
    ['menu', '🧭', 'Menu do PF em volta do WhatsApp', 'Barra de grupos em cima (Linha Amarela, Linha Agrícola…) e a coluna de atalhos à esquerda.'],
    ['etq', '🏷️', 'Etiquetas nas conversas', 'Embaixo de cada nome da lista: cidade e grupo do cliente, fornecedor do PF, cotação aberta, mapa.'],
    ['bots', '📄', 'Botões do PF ao lado das mensagens', 'A coluna (A) ou barra (D) com Cotar, Saldo, Ficha, Lembrete, Prontas…'],
    ['aviso', '🔔', 'Aviso de pedido de cotação', 'A bolinha laranja com o número de códigos no botão 📄 quando o cliente manda códigos.'],
    ['selo', '📄', 'Selo no balão da mensagem', 'O selinho "📄 N" no canto da mensagem do cliente que tem códigos. Clique = ver os códigos e criar a cotação no PF.'],
    ['rrselo', '⚡', 'Resposta rápida no balão', 'Quando o cliente pergunta algo que você tem como resposta rápida (endereço, PIX, horário…), aparece o ⚡ no balão. Clique = ver a resposta e enviar.'],
    ['rfselo', '📥', 'Resposta do fornecedor no balão', 'Quando o fornecedor responde um mapa, aparece "📥 lançar no mapa" no balão dele e o PF avisa na barra de notificações. Clique = o PF lê o preço e o prazo e mostra pra você conferir.'],
    ['barra', '⚡', 'Respostas rápidas com "/"', 'Digitar / no começo da caixa de texto abre as respostas rápidas (o botão ⚡ continua funcionando).'],
    ['salvar', '👤', 'Botão Salvar contato', 'O botão verde ao lado do nome da conversa.'],
    ['ofertas', '💡', 'Guardar ofertas e respostas', 'Quando você oferece algo, o cartão pra salvar a oferta e a resposta do cliente no CRM.'],
    ['ja', '⚠️', '"Você já ofereceu" enquanto digita', 'Aviso em cima da caixa de texto quando você vai oferecer algo que já ofereceu.'],
    ['sug', '💡', 'Sugestões pra oferecer', 'Na aba Cliente: o que clientes parecidos compram e ele não. Na aba Cotação: o que costuma ir junto com as peças pedidas.'],
    ['audio', '🎤', 'Descrever áudios', 'Embaixo de cada áudio aparece "📝 Descrever este áudio". Clique e a descrição (o que a pessoa falou) aparece ali mesmo. O 🎤 da coluna liga/desliga.'],
    ['audioBotoes', '💬', 'Botões na descrição do áudio', 'Mostra Pôr na conversa, Copiar e Cotar no PF embaixo da descrição. Vem desligado.'],
    ['frota', '🚜', 'Máquina citada → frota do cliente', 'Quando o cliente (que não é revenda) fala o modelo de uma máquina ou componente, o PF pergunta se põe na frota dele.'],
    ['mat', '📎', 'Mandar o portfólio na hora', 'Quando você escreve que vai mandar o portfólio/catálogo/tabela, o PF acha o arquivo nos Atalhos de Texto e pergunta se manda agora.'],
    ['apr', '🧠', 'Aprender com você', 'A extensão registra o que você faz quando o cliente pede algo (preço, portfólio, endereço, prazo…) pra mostrar no PF o seu jeito de responder. Só registra — não responde sozinha.'],
    ['verif', '📌', 'Anotar "vou verificar" sozinho', 'Quando você escreve "vou verificar / já te retorno", vira pendência e próxima ação no PF. A sua próxima resposta pro cliente fecha a pendência e vai pra ficha como conclusão.']];
  function cfgOn(k) { return k === 'menu' ? menuLig : k === 'aviso' ? avisoLigado : CFG[k] !== false; }
  chrome.storage.local.get(['cfg'], function (s) { if (s.cfg) for (var k in s.cfg) CFG[k] = s.cfg[k]; CFG.waEtqOff = true; }); // 4.42 - A pedido do Vitor ("quero sempre a etiqueta do whats escondida")
  function htmlConfig() {
    var h = '<div class="pfwa-ajtop"><b>⚙️ Configurações</b><span class="pfwa-link" data-acao="config">✕ fechar</span></div>' +
      '<button class="pfwa-btn" data-acao="cfgTela" style="width:100%;margin:2px 0 8px;background:#1F4E79;color:#fff">🗂️ Abrir as configurações numa aba própria (tela cheia)</button>' + // 6.4
      '<div class="pfwa-nada" style="margin:4px 0 8px">Ligue só o que você usa. Vale pra este navegador.</div>';
    CFG_LISTA.forEach(function (x) {
      var on = cfgOn(x[0]);
      h += '<div class="pfwa-cfgl" data-acao="cfgTog" data-arg="' + x[0] + '"><span class="pfwa-cfgi">' + x[1] + '</span><div><b>' + esc(x[2]) + '</b><br><small>' + esc(x[3]) + '</small></div>' +
        '<span class="pfwa-sw' + (on ? ' on' : '') + '"><i></i></span></div>';
    });
    h += '<div class="pfwa-cfgl" data-acao="autoAbrir"><span class="pfwa-cfgi">👋</span><div><b>Mensagens automáticas</b><br><small>' + (autoAusente() ? autoInfo(autoAusente()).join(' ') + ' · ' : '') + 'Saudação de espera ' + (AUTO.on ? 'ligada · ' + esc(AUTO.min) + ' min · ' + esc(AUTO.ini) + '–' + esc(AUTO.fim) : 'desligada') + ' — clique pra ajustar</small></div><span class="pfwa-link">ajustar ›</span></div>';
    h += '<div class="pfwa-bt" style="margin-top:12px">🎨 Ícones dos botões</div><div class="pfwa-icoest">' + ICO_ESTILOS.map(function (e) { return '<span data-acao="icoEst" data-arg="' + e[0] + '" class="' + (ICO_EST === e[0] ? 'on' : '') + '">' + e[1] + '</span>'; }).join('') + '</div>' +
      '<div class="pfwa-nada" style="margin:4px 0 6px">Clique num botão pra trocar o ícone dele (abre o seletor do PF — vale pra todo mundo). Também dá com o botão direito no botão da coluna.</div><div class="pfwa-icolista">' +
      BOTOES.map(function (b) { return '<span data-acao="icoTrocar" data-arg="' + b[0] + '" title="Trocar o ícone de ' + esc(b[2]) + '">' + icoHtml(b[0], b[1], ICO_EST === 'emoji' ? 'azul' : ICO_EST) + '<small>' + esc(b[2]) + '</small></span>'; }).join('') + '</div>'; // 4.96
    h += '<div class="pfwa-cfgl" data-acao="extCfgAbrir"><span class="pfwa-cfgi">📒</span><div><b>O que vai pro CRM</b><br><small>O que a extensão anota sozinha na ficha (pedido a emitir, vou verificar, promessas, ofertas), as frases que contam e as que não contam. Fica no PF — vale pra equipe.</small></div><span class="pfwa-link">ajustar no PF ›</span></div>' +
      '<div class="pfwa-cfgl" data-acao="crmHoje"><span class="pfwa-cfgi">📊</span><div><b>Ver o que foi pro CRM</b><br><small>Hoje, 7 dias, 30 dias ou tudo — com a conta por tipo e por cliente.</small></div><span class="pfwa-link">abrir ›</span></div>'; // 9.3
    // 4.37 - A pedido do Vitor ("não precisa mais desses botões né?"): saíram do rodapé, ficam aqui pra usar quando precisar
    h += '<div class="pfwa-bt" style="margin-top:12px">📇 Contatos</div>' + motorSeloHtml() +
      '<div class="pfwa-cfgbtns"><button data-acao="importar" class="pfwa-cfgb verde" title="Lê a lista de conversas do WhatsApp Web e traz pro PF">📥 Importar meus contatos</button>' +
      '<button data-acao="listaMassa" class="pfwa-cfgb" title="Abre cada conversa de cliente do PF que ainda NÃO está em nenhuma lista do WhatsApp (pula as não lidas) e põe na lista Cliente PF — assim aparece a 3ª linha com grupo e tipo. Clique de novo pra parar.">' + (lmRodando ? '⏸ Parar' : '🏷️ Pôr os clientes na lista Cliente PF') + '</button>' +
      '<button data-acao="numeros" class="pfwa-cfgb pfwa-num" title="Abre cada conversa dos contatos salvos sem número, lê o número e grava no PF (só lê, não manda nada). Clique de novo pra parar.">' + (numRodando ? '⏸ Parar' : '📞 Buscar números que faltam') + '</button>' +
      '<button data-acao="crmVarrer" class="pfwa-cfgb" title="Lê o histórico das conversas (pelo motor) e põe na ficha dos clientes, com a data certa, o que não tinha entrado. Pode rodar de novo depois de mudar as frases — não duplica.">' + (crmVarRodando ? '⏸ Parar' : '🔄 Varrer as conversas antigas pro CRM') + '</button></div><div class="pfwa-tarefa-lugar"></div>'; // 4.59 - andamento/resumo aqui
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
    ['Novo (9.4)', [
      ['🧠', 'O que aprendi com você', 'A extensão olha o que o cliente pediu e o que você fez logo depois (criou cotação, mandou o portfólio, mandou o PIX, respondeu NEGATIVO…). No PF, em Ferramentas → 🧠 O que a extensão aprendeu, aparece a tabela "quando o cliente pede… você costuma…". Por enquanto só registra — não faz nada sozinha. Desliga em ⚙️.']]],
    ['Comece por aqui', [
      ['⚙️', 'Configurações', 'A engrenagem no cabeçalho do painel liga e desliga cada função da extensão (menu, etiquetas, botões, avisos, salvar contato, ofertas…).'],
      ['🧩', 'O que é', 'O PartsFlow (PF) aparece aqui do lado do WhatsApp e mostra quem é o contato, o que ele compra e o que está em aberto. Ele só LÊ e ESCREVE NA CAIXA — quem aperta Enter é sempre você.'],
      ['🤖', 'Assistente (9.2)', 'Num WhatsApp só do assistente: ⚙️ → 🤖 Assistente → ligue e ponha o seu número. Você encaminha o pedido do cliente e escreve "cota pro Maximus"; ele monta a cotação no PF e te manda o resumo e o PDF. "saldo 5-515X", "pdf da 131" e "ajuda" também.'],
      ['🔌', 'Precisa do PF aberto', 'Deixe uma aba do PartsFlow aberta (já logado) neste mesmo Chrome — pode ser em outra janela. Se aparecer "O PF não respondeu", dê F5 na aba do PartsFlow.'],
      ['🟢', 'Conectado ao PF', 'Do lado da versão, lá em cima: verde "● Conectado ao PF" = tudo certo · laranja "Dê F5 no PF" = a aba do PF está aberta mas parou de responder · vermelho "PF fechado" = abra o PartsFlow. Clique nele pra conferir na hora. A bolinha também aparece no "PF" da barra de cima.'],
      ['🔁', 'Atualizou a extensão?', 'Depois de instalar uma versão nova, recarregue a aba do WhatsApp e a do PF (F5).']]],
    ['Novos (8.3)', [
      ['📣', 'Disparos em massa', 'Nas ⚙️ Configurações (aba própria) → Disparos em massa: vê os disparos agendados, liga/desliga, manda agora e acompanha o que está mandando. Monta e agenda no PF (📣 Disparo → 🗓 Agendar), com filtro por linha, tipo, estado e cidade.'],
      ['📢', 'Status automático', 'Nas ⚙️ Configurações → Status automático: posta sozinho o que chegou no estoque todo dia no horário, e os status programados. Escolha "Preparar e eu publico" (você aperta enviar) ou "Publicar sozinho".']]],
    ['Novos (4.78)', [
      ['🏷️', 'Resposta curta', 'Botão 🏷️ da coluna: NEGATIVO, SEM CADASTRO, ZEROU (dá pra trocar em ✏️). Selecione o código na mensagem antes e sai "5-515X - NEGATIVO". Pelo botão direito numa mensagem com códigos aparece um por código.'],
      ['🔔', 'Avise-me', 'Botão 🔔 da coluna (ou botão direito na mensagem): os códigos selecionados — ou os que o cliente mandou — vão pro Avise-me do PF com o nome desse cliente.'],
      ['🚜', 'Frota', 'Cliente que não é revenda citou o modelo de uma máquina ou componente (CASE W20E, transmissão 28000…)? Aparece "pôr na frota?" — um clique e está no cadastro dele.'],
      ['📎', 'Portfólio na hora', 'Escreveu "vou te mandar nosso portfólio"? O PF acha o arquivo nos Atalhos de Texto (tipo arquivo) e pergunta se manda agora. Cadastre lá o portfólio, catálogo e tabela.']]],
    ['Botão direito e Alt+B', [
      ['🖱️', 'Botão direito', 'Clique com o botão direito no WhatsApp → 🧩 PartsFlow. Em código selecionado: Ver no PF, Pôr na cotação de hoje, Cotar só esse. Numa mensagem: Cotar, Lembrete, Salvar como resposta rápida, Anotar na ficha (e Lançar no mapa, se for fornecedor). Numa foto: Ler com IA e cotar. Numa conversa da lista: Abrir ficha, Trocar grupo/tipo, Grau de intimidade, liga/desliga a mensagem automática.'],
      ['💲', 'Preço do concorrente', 'Cliente falou "tenho por 2.200 na Odapel"? Botão direito na mensagem → 💲 Preço do concorrente: o PF abre já com o concorrente, o preço, o cliente e as peças da última cotação dele — você confere e grava. Se ele mandou a cotação do concorrente (foto ou PDF), botão direito nela → 💲 Cotação do concorrente: a IA lê as peças e os preços. Depois aparece na cotação (⚔️ com a margem que sobraria se cobrir) e no Alt+B.'],
      ['🔗', 'Monta com', 'Selecione o código (ou clique com o botão direito na mensagem) → PartsFlow → 🔗 Monta com: aparecem as peças que montam com ele, por tipo e com o código Spicer na frente. Marque as que quer, escolha a marca e a quantidade e mande pra cotação de hoje, pra conversa (você confere e envia) ou copie. Também no botão "🔗 Marcar peças do Monta com" do Alt+B.'],
      ['🔎', 'Alt+B', 'Selecione o código na mensagem (pode ser a frase inteira — o PF puxa só os códigos) e aperte Alt+B: aparece o cartão com descrição, marcas, saldo, preço desse cliente, 🔗 Monta com e o botão do catálogo dos Componentes Cardan. Sem nada selecionado, abre uma caixinha pra digitar o código.'],
      ['📦', 'Anotei pra emitir / verificar', 'Quando o cliente pede ("pode faturar") ou você promete ("mando hoje", "vou verificar"), o PF anota sozinho um lembrete. Aparece um seloinho 📦/📌 na mensagem e um número ao lado do nome da conversa; clique pra ver ou desfazer. O lembrete vai pras Pendências e pro ☀️ Meu dia.'],
      ['➕', 'Pôr na cotação de hoje', 'Entra na cotação desse cliente que está aberta no PF ou que foi aberta HOJE; se não tiver, cria uma nova.'],
      ['🎩', 'Grau de intimidade', 'Formal, Normal ou Próximo — muda o tom das mensagens automáticas pra essa pessoa (marque no 👤 Salvar contato ou no botão direito na conversa).'],
      ['🪞', 'Seu jeito com cada cliente', 'A extensão lê as SUAS mensagens e aprende como você abre ("Fala", "Opa", "Bom dia"), como fecha ("tmj", "abraço", 👍), o apelido que você usa e o tom. A mensagem automática sai igual — só usa o que você já usou com ele. O apelido você confirma no 👤 Salvar contato (campo "Como você chama ele"). Desliga em Mensagens automáticas → 🪞 Imitar o meu jeito.']]],
    ['Em cima e do lado esquerdo', [
      ['🔎', 'Barra de filtros', 'Clientes, Fornecedores, etiquetas do WhatsApp e cotação aberta. Clique pra deixar só essas conversas na lista; clique de novo pra ver tudo.'],
      ['🏷️', 'Etiquetas nas conversas', 'Embaixo de cada nome: se é cliente ou fornecedor do PF, cotação aberta, mapa esperando preço.'],
      ['⚙️', 'Menu do PF', 'A chave "Menu do PF" liga/desliga a barra. "azul / discreta" troca a cor.']]],
    ['Conhecer o cliente', [
      ['🔗', 'Link de cadastro', 'Na aba Cliente: escolha Novo à vista, Novo a prazo ou Reanálise e o PF gera o link (vale 15 dias) com o que já temos preenchido. 💬 Pôr na conversa escreve a mensagem — você confere e envia. A resposta chega sozinha no cadastro do cliente.'],
    ['🧭', 'O que falta saber', 'Ao lado do nome aparece 🧭 N = quantas coisas importantes ainda não sabemos desse cliente (tipo, linhas, quem decide, frota do consumidor, se a revenda tem estoque ou só venda casada, se tem oficina…). Clique: uma pergunta por vez — 1 clique na resposta grava no cadastro do PF. A resposta tracejada é a sugestão do PF.'],
      ['💡', 'Bom momento pra perguntar', 'Quando a conversa acalma (2 min sem mensagem), o selo pisca e aparece uma dica em cima da caixa de digitar — só você vê. 1 vez por cliente por dia. 💬 Perguntar escreve a pergunta na caixa (você manda).'],
      ['⚙️', 'Perguntas do gestor', 'O gestor cria perguntas próprias (ex.: "consome tal produto?") em 🧩 Ajustes da extensão no PF — aparecem aqui junto.']]],
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
      ['💡', 'Ofertas', 'Quando você oferece algo e o cliente responde, a IA lê a resposta, classifica (quer, vai pensar, caro, compra de outro…), resume em 1 linha e guarda na ficha sozinha (sem a chave da IA, aparece o cartão pra você marcar). Se for oferecer de novo, ele avisa "você já ofereceu".'],
      ['👋', 'Saudação de espera', 'Se o cliente fica X minutos sem resposta (você escolhe), a extensão manda UMA mensagem como se fosse você, de acordo com o que ele mandou ("já vou ver esses códigos", "vi a foto", "vou ouvir aqui"…). Só no horário escolhido, uma vez por conversa a cada N horas e com limite por hora. Vem desligada: ⚙️ → Mensagens automáticas. A conversa fica com a etiqueta "👋 … responda" até você responder.'],
      ['📱', 'Mudar pelo WhatsApp', 'Em ⚙️ → Mensagens automáticas ligue "Mudar pelo WhatsApp" e ponha o número do seu celular pessoal. Dele (ou da conversa com você mesmo) mande "pf reunião até 15h", "pf ausente 2h", "pf férias até 20/11 Carlos 11 98765-4321", "pf voltei", "pf saudação 5 min" ou "pf status". O computador com este WhatsApp aberto faz e responde ✅ quando você não estiver mexendo nele. "pf" de outro número é ignorado.'],
      ['🗓️', 'Meu status (reunião, ausente, férias)', 'Em ⚙️ → Mensagens automáticas escolha Em reunião / Ausente / Férias e até quando (nas férias, quem atende no seu lugar). Cada cliente que chamar recebe UMA mensagem avisando, a qualquer hora. No "até" volta sozinho pra Disponível. Enquanto estiver fora, aparece no cabeçalho do painel.'],
      ['📨', 'Prometeu mandar', 'Escreveu "já te mando / te envio a tabela / te mando na quarta" ou o cliente pediu "me manda a tabela/foto": o PF anota um lembrete (hoje até 17h ou no dia combinado) e FECHA SOZINHO quando você manda o arquivo, a cotação ou o link na conversa. Passou da hora = aviso 📨 no PF.'],
      ['📄', 'Material enviado', 'Mandou portfólio, catálogo, tabela ou folheto (arquivo)? O PF guarda que mandou e, quando o cliente responde, a IA resume o retorno e guarda na ficha. Relatório em Vendas → 💡 Ofertas e retorno.'],
      ['📌', 'Vou verificar', 'Se você escrever "deixa eu ver / vou verificar / já te retorno", o PF cria uma pendência sozinho (com desfazer).'],
      ['📇', 'Código que não está no PF', 'Se o nome no WhatsApp tem um código entre parênteses que não existe no PF, aparece "Cadastrar no PF" já com o código.']]],
    ['Embaixo do painel', [
      ['📥', 'Importar meus contatos', 'Lê a lista de conversas e traz pro PF (você escolhe quem entra).'],
      ['📣', 'Disparo pelo PF', 'No PF, Vendas → 📣 Disparo pelo WhatsApp: escolhe a lista (o que chegou, uma marca, um grupo, os sumidos ou uma etiqueta), escreve a mensagem com {nome} e a extensão manda uma por uma, no ritmo que você escolher por hora. Quem já recebeu a mesma oferta fica de fora.'],
      ['👔', 'Colega da empresa', 'No 👤 Salvar contato, escolha “👔 Colega” pra quem é daqui da empresa: fica guardado no PF, o botão fica roxo, aparece “👔 colega” na lista e ele nunca recebe mensagem automática nem entra nos avisos de cliente.'],
      ['⏳', 'Tenho pendência com esse contato', 'Botão direito na conversa (na lista da esquerda) → “⏳ Tenho pendência com esse contato”: escreve o que ficou pendente (opcional), vai pras Pendências (e pro ☀️ Meu dia, se for cliente) e põe um ⏳ ao lado do nome — mesmo que a conversa fique como lida. Na barra de cima aparece “⏳ pendência N” pra filtrar. Resolveu: botão direito → “✔ Resolvi a pendência”.'],
      ['🗂️', 'Mandar pro mapa', 'Pedido do cliente com peça sem saldo ou sem cadastro: no selo 📄 do balão ou na aba Cotação aparece “🗂️ Mandar pro mapa”. Confere as peças e os fornecedores (vêm marcados os que trabalham com o tipo/marca), vê a mensagem de cada um e: 💬 Criar e mandar (cria o mapa no PF, avisa os compradores e manda pros vendedores dos fornecedores), 📋 Criar e copiar, ou Só criar o mapa. Se você já falou com o fornecedor hoje, a mensagem vai sem o “Bom dia”. A resposta dele vira o selo 📥 lançar no mapa.'],
      ['📦', 'Tem pedido pra enviar', 'Botão direito na conversa (na lista da esquerda) → “📦 Tem pedido pra enviar”: cria o lembrete nas Pendências (e no ☀️ Meu dia, se for cliente) e põe um 📦 ao lado do nome. Quando mandar, botão direito → “✔ Pedido enviado” tira a marca.'],
      ['🏷️', 'Plaqueta pra Máquinas', 'Botão direito na FOTO de uma plaqueta → “🏷️ Mandar a plaqueta pra Máquinas”: o PF lê marca, modelo, série, ano e componentes, você confere e grava — a máquina é criada ou completada em 🚜 Máquinas, com a foto da plaqueta.'],
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
      '<div class="pfwa-rod pfwa-rod-vazio"><span class="pfwa-rodst"></span></div></div>';
    document.body.appendChild(P);
    B = document.createElement('div'); B.id = 'pfwa-bots'; document.body.appendChild(B); botsArrastoLigar(); B.addEventListener('contextmenu', function (ev) { var sp = ev.target.closest && ev.target.closest('[data-acao^="b-"]'); if (!sp) return; var k = sp.getAttribute('data-acao').slice(2); if (k === 'cot') return; ev.preventDefault(); ev.stopPropagation(); icoTrocar(k); }); // 4.96 - botão direito = trocar o ícone no PF
    AV = document.createElement('div'); AV.id = 'pfwa-aviso'; document.body.appendChild(AV);
    OF = document.createElement('div'); OF.id = 'pfwa-of'; document.body.appendChild(OF);
    QK = document.createElement('div'); QK.id = 'pfwa-qk'; document.body.appendChild(QK); // 4.78
    ASK = document.createElement('div'); ASK.id = 'pfwa-ask'; document.body.appendChild(ASK);
    B.addEventListener('mousedown', function () { qkSelAntes = String(window.getSelection() || '').trim(); }, true);
    JA = document.createElement('div'); JA.id = 'pfwa-ja'; document.body.appendChild(JA);
    ST = document.createElement('div'); ST.id = 'pfwa-st'; document.body.appendChild(ST);
    MENU = document.createElement('div'); MENU.id = 'pfwa-menu'; document.body.appendChild(MENU);
    RAIL = document.createElement('div'); RAIL.id = 'pfwa-rail'; document.body.appendChild(RAIL);
    VF = document.createElement('div'); VF.id = 'pfwa-vf'; document.body.appendChild(VF);
    PE = document.createElement('div'); PE.id = 'pfwa-pe'; document.body.appendChild(PE); // 4.62
    SVB = document.createElement('div'); SVB.id = 'pfwa-svb'; SVB.setAttribute('data-acao', 'svAbrir'); SVB.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"><circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-6 7-6s7 2 7 6"/><path d="M19 8v6M16 11h6"/></svg>'; document.body.appendChild(SVB);
    SV = document.createElement('div'); SV.id = 'pfwa-sv'; document.body.appendChild(SV);
    P.querySelector('.pfwa-aba').onclick = function () { aberto = !aberto; chrome.storage.local.set({ painelAberto: aberto }); pinta(); };
    P.querySelector('.pfwa-x').onclick = function () { aberto = false; chrome.storage.local.set({ painelAberto: false }); pinta(); };
    P.querySelectorAll('[data-vis]').forEach(function (el) { el.onclick = function () { visual = el.getAttribute('data-vis'); chrome.storage.local.set({ visual: visual }); pinta(); }; });
    [P, B, AV, OF, JA, ST, MENU, RAIL, VF, PE, SVB, SV, QK, ASK].forEach(function (el) { el.addEventListener('click', clique); });
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
    if (ac === 'mpConv' || ac === 'mpVer' || ac === 'mpEmitido' || ac === 'mpCobrar' || ac === 'mpAvisar' || ac === 'mpTirar') { mpAcao(ac, arg); return; } // 4.95
    if (ac === 'mpLimpar') { mpLimparPop(b); return; } if (ac === 'mpLimparA' || ac === 'mpLimparT') { mpLimpar(ac === 'mpLimparT' ? 'todos' : 'antigos'); return; } // 5.0
    if (ac === 'aba') { ajuda = false; config = false; irAba(arg); return; }
    if (ac === 'config') { config = !config; ajuda = false; abrirPainel(); pinta(); return; }
    if (ac === 'cfgTog') { cfgTog(arg); return; }
    if (ac === 'cfgTela') { try { chrome.runtime.sendMessage({ t: 'abrirConfig', sec: arg || '' }); } catch (e) { } return; } // 6.4
    if (ac === 'autoAbrir') { config = 'auto'; abrirPainel(); pinta(); return; } // 3.9 - 👋 saudação automática
    if (ac === 'autoVoltar') { config = true; pinta(); return; }
    if (ac === 'autoTogJeito') { AUTO.jeito = AUTO.jeito === false; autoGravar(); pinta(); return; } // 5.4
    if (ac === 'svApel') { var _ai = SV && SV.querySelector('.sv-apel'); if (_ai) _ai.value = arg; var _as = SV && SV.querySelector('.sv-apsug'); if (_as) _as.remove(); return; } // 5.4
    if (ac === 'assTog') { ASS.on = !ASS.on; assCfgGravar(); if (ASS.on) motorChecar(); pinta(); return; } // 9.2
    if (ac === 'autoTog') { AUTO[arg] = (arg === 'saud1a' || arg === 'trava30') ? AUTO[arg] === false : !AUTO[arg]; autoGravar(); pinta(); return; }
    if (ac === 'autoAvTog') { var _av = (AUTO.avisos || [])[+arg]; if (_av) { _av.on = !_av.on; autoGravar(); pinta(); try { autoStatusPill(); } catch (e) { } } return; } // 4.47
    if (ac === 'autoAvDel') { var _ad = (AUTO.avisos || [])[+arg]; if (_ad && confirm('Apagar o aviso "' + _ad.nome + '"?')) { AUTO.avisos.splice(+arg, 1); autoGravar(); pinta(); } return; }
    if (ac === 'autoAvNovo') { AUTO.avisos = AUTO.avisos || []; AUTO.avisos.push({ id: 'a' + Date.now().toString(36), ic: '⏰', nome: 'Novo aviso', on: false, dias: 'semana', ini: '12:00', fim: '13:00', txt: '' }); autoGravar(); pinta(); return; }
    if (ac === 'svInt') { svIntim = arg; var _ir = SV && SV.querySelector('.sv-int'); if (_ir) _ir.innerHTML = svIntRowHtml(); var _is = SV && SV.querySelector('.sv-intsug'); if (_is) _is.remove(); return; } // 4.47
    if (ac === 'autoModo') { autoModoSet(arg); config = 'auto'; abrirPainel(); pinta(); return; } // 4.0 - 🗓️ meu status
    if (ac === 'autoEstilo') { AUTO.estilo = arg; autoGravar(); pinta(); return; }
    if (ac === 'autoQuando') { AUTO.quando = arg; autoGravar(); pinta(); return; } // 4.27 - quando mandar a saudação de espera
    if (ac === 'autoTestar') { autoTestar(); return; } // 4.37 - 🧪 testar na conversa aberta
    if (ac === 'cmdAutorizar') { if (contatoAt && contatoAt.nome) { AUTO.cmdNomes = (AUTO.cmdNomes || []).concat([contatoAt.nome]); if (contatoAt.tel && (AUTO.cmdQuem || []).indexOf(contatoAt.tel) < 0) AUTO.cmdQuem = (AUTO.cmdQuem || []).concat([contatoAt.tel]); AUTO.cmdOn = true; autoGravar(); } pinta(); return; }
    if (ac === 'cmdTirar') { AUTO.cmdNomes = (AUTO.cmdNomes || []).filter(function (n) { return n !== arg; }); autoGravar(); pinta(); return; }
    if (ac === 'svAbrir') { if (svAberto) { svAberto = false; SV.style.display = 'none'; } else svAbrir(); return; } // 2.7
    if (ac === 'conhLink') { conhLinkPor(); return; } // 10.4
    if (ac === 'ccResponder') { var bl = P && P.querySelector('.pfwa-ccbl'); if (bl) ccAbrir(bl); return; } // 4.97
    if (ac === 'svCnpj') { svAbrir(arg); return; } // 4.4 - cadastrar já com o CNPJ da conversa
    if (ac === 'svFechar') { svAberto = false; SV.style.display = 'none'; return; }
    if (ac === 'svUsar') { svUsar(arg); return; }
    if (ac === 'svGrupo') { svGrupoSet(arg); return; } // 4.7
    if (ac === 'svTipo') { svTipoSet(arg); return; } // 4.24
    if (ac === 'svGueri') { svGueri = !svGueri; var _gr = SV && SV.querySelector('.sv-gueri [data-acao="svGueri"]'); if (_gr) _gr.classList.toggle('on', svGueri); return; } // 4.37 - selo Gueri
    if (ac === 'svFatSp') { svFatSp = !svFatSp; var _fs = SV && SV.querySelector('.sv-gueri [data-acao="svFatSp"]'); if (_fs) _fs.classList.toggle('on', svFatSp); return; } // 4.39 - selo Faturar por SP
    if (ac === 'svMarca') { svMarcaSet(arg); return; } // 4.26 - marca da concessionária
    if (ac === 'svMarcaNova') { svMarcaNova(); return; } // 4.26
    if (ac === 'svGrupoNovo') { svGrupoNovo(); return; } // 4.15
    if (ac === 'svSalvar') { svSalvar(b); return; }
    if (ac === 'svCriar') { svSalvar(b, true); return; }
    if (ac === 'svCadAbrir') { if (svK) msg({ t: 'acao', acao: 'irTela', arg: { tela: 'cadcliK', k: svK } }); return; }
    if (ac === 'svModo') { svModoSet(arg); return; } // 4.60 - 🤝 Cliente | 🏭 Fornecedor
    if (ac === 'svFTipo') { var _ti = svFornTipos.indexOf(arg); if (_ti >= 0) svFornTipos.splice(_ti, 1); else svFornTipos.push(arg); svFornChipsRender(); return; } // 4.60
    if (ac === 'svFLinha') { var _li = svFornLinhas.indexOf(arg); if (_li >= 0) svFornLinhas.splice(_li, 1); else svFornLinhas.push(arg); svFornChipsRender(); return; } // 4.60
    if (ac === 'svFLinhaNova') { var _ln = (prompt('Linha / marca:') || '').trim().toUpperCase(); if (_ln) { if (SV_FORN_LINHAS.indexOf(_ln) < 0) SV_FORN_LINHAS.push(_ln); if (svFornLinhas.indexOf(_ln) < 0) svFornLinhas.push(_ln); svFornChipsRender(); } return; } // 4.60
    if (ac === 'svFTipoNova') { var _tn = (prompt('Tipo de produto (que não está na lista):') || '').trim().toUpperCase(); if (_tn) { if (SV_FORN_TIPOS.indexOf(_tn) < 0) SV_FORN_TIPOS.push(_tn); if (svFornTipos.indexOf(_tn) < 0) svFornTipos.push(_tn); svFornChipsRender(); } return; } // 4.61 - incluir produto fora da lista
    if (ac === 'svUsarForn') { svUsarForn(arg); return; } // 4.60
    if (ac === 'svFornAbrir') { if (svFornId) msg({ t: 'acao', acao: 'irTela', arg: { tela: 'cadforn', cod: svFornId } }); return; } // 4.60
    if (ac === 'svWa') { svWa(); return; }
    if (ac === 'conexao') { conPintar(''); conChecar(); return; }
    if (ac === 'ajuda') { ajuda = !ajuda; config = false; abrirPainel(); pinta(); return; }
    if (ac === 'sino') { avisoLigado = !avisoLigado; chrome.storage.local.set({ avisoLigado: avisoLigado }); pinta(); marcaCot(); if (!avisoLigado && AV) AV.style.display = 'none'; else vigiar(); return; }
    if (ac === 'botsToggle') { botsMin = !botsMin; chrome.storage.local.set({ botsMin: botsMin }); posicionar(); return; }
    if (ac === 'numeros') { buscarNumeros(b); return; }
    if (ac === 'listaMassa') { listaMassa(b); return; } // 4.57
    if (ac === 'crmHoje') { crmHojeAbrir(); return; } // 9.3 - 📒 relatório do CRM
    if (ac === 'crmDesf') { crmDesf(b, arg); return; }
    if (ac === 'crmVarrer') { crmVarrer(b); return; }
    if (ac === 'autoGrpModo') { AUTO.grpModo = arg; autoGravar(); pinta(); return; } // 4.57 - grupos que recebem automática
    if (ac === 'autoGrp') { var gl = AUTO.grpSel || (AUTO.grpSel = []), gi = gl.indexOf(arg); if (gi >= 0) gl.splice(gi, 1); else gl.push(arg); autoGravar(); pinta(); return; }
    if (ac === 'importar') {
      var st = tarefaEl(), o0 = b.textContent;
      b.disabled = true; b.textContent = 'Lendo a lista…';
      var res = await lerListaConversas(function (n) { var pn = $('#pane-side'); progPct(st, '📥 Lendo a lista de conversas', pn ? pn.scrollTop * 100 / Math.max(1, pn.scrollHeight - pn.clientHeight) : 0, n + ' contatos lidos'); }); // 4.58
      b.disabled = false; b.textContent = o0;
      if (!res || res.erro) { if (st) st.textContent = ''; flash(b, (res && res.erro) || 'Não consegui ler'); return; }
      if (motorOk || await motorChecar()) { try { progSet(st, '📞 Juntando os números dos contatos…', 0, 0); var rcI = await motor('contatos', {}, 120000), mapI = {}; (rcI && rcI.l || []).forEach(function (c) { if (c.tel) mapI[c.nome] = c.tel; }); res.lista.forEach(function (x) { if (!x.tel && mapI[x.nome]) x.tel = mapI[x.nome]; }); } catch (e) { } } // 4.58
      if (st) st.textContent = res.lista.length + ' contatos — abrindo o PF…';
      var r = await msg({ t: 'acao', acao: 'importarContatos', focar: true, arg: { lista: res.lista } });
      if (st) st.textContent = (r && r.ok) ? '✔ Confira a lista no PF' : 'Abra uma aba do PF primeiro';
      return;
    }
    if (ac === 'b-curta') { qkAbrir(qkSelAntes ? [qkSelAntes] : null); return; } // 4.78
    if (ac === 'b-avise') { aviseMe(qkSelAntes || msgsPedido().filter(function (m) { return !m.eu; }).map(function (m) { return m.t; }).join('\n')); return; }
    if (ac === 'qk') { qkUsar(b.getAttribute('data-c') || '', arg); return; }
    if (ac === 'qkEdit') { var nv = prompt('Respostas curtas (separe por vírgula):', qkPal.join(', ')); if (nv != null) { var l2 = nv.split(/[,;\n]+/).map(function (x) { return x.trim().toUpperCase(); }).filter(Boolean); if (l2.length) { qkPal = l2; chrome.storage.local.set({ qkPal: qkPal }); } qkPinta(); } return; }
    if (ac === 'qkX') { QK.style.display = 'none'; return; }
    if (ac === 'ask') { askAcao(+arg, b.getAttribute('data-o') || ''); return; }
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
    if (ac === 'abrirCotMin') { abrirCot(false, true); return; }
    if (ac === 'mapaAbrir') { mqAbrir(cot); return; } // 6.3 // 4.89 - criar minimizada pelo painel
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
    if (ac === 'parec') { parecUsar(arg); return; } // 4.48
    if (ac === 'tirar') { if (cot) { cot.itens.splice(+arg, 1); refazResposta(); pintaCorpo(); } return; }
    if (ac === 'saldoBusca') { var i2 = P.querySelector('.pfwa-saldo-in'); buscarSaldo(i2 ? i2.value : ''); return; }
    if (ac === 'fechaAviso') { avisoFechado = ultimo; pintaAviso(0); return; }
    if (ac === 'registrar') {
      var ta = P.querySelector('.pfwa-nota'); var tx = ta ? ta.value.trim() : ''; if (!tx) { if (ta) ta.focus(); return; }
      b.disabled = true; b.textContent = 'Gravando…';
      var r = await msg({ t: 'acao', acao: 'registrar', arg: { k: arg, texto: tx } }); b.disabled = false; b.textContent = r && r.ok ? '✔ Registrado na ficha' : naoDeu(); if (r && r.ok && ta) ta.value = ''; return;
    }
    if (ac === 'lembrete') {
      var d = (P.querySelector('.pfwa-lemb-d') || {}).value, tt = ((P.querySelector('.pfwa-lemb-t') || {}).value || '').trim();
      if (!d) { var di = P.querySelector('.pfwa-lemb-d'); if (di) di.focus(); return; }
      var r2 = await msg({ t: 'acao', acao: 'lembrete', arg: { k: arg, data: d, texto: tt } }); flash(b, r2 && r2.ok ? '✔ Marcado — aparece no Meu dia' : naoDeu()); return;
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
      else { b.disabled = false; flash(b, naoDeu()); }
      return;
    }
    if (ac === 'jaX') { jaFechado = digAnt; JA.style.display = 'none'; return; }
    if (ac === 'stX') { ST.style.display = 'none'; return; }
    if (ac === 'vfDesfazer') { if (vfR) msg({ t: 'acao', acao: 'verificarDesfazer', arg: vfR.id }); vfR = null; pintaVf(); return; }
    if (ac === 'vfX') { vfR = null; pintaVf(); return; }
    if (ac === 'peDesfazer') { if (peR) msg({ t: 'acao', acao: 'pedidoEmitirDesfazer', arg: peR.id }); peR = null; pintaPe(); return; } // 4.62
    if (ac === 'peX') { peR = null; pintaPe(); return; }
    if (ac === 'icoEst') { icoEstSet(arg); return; } // 4.96
    if (ac === 'icoTrocar') { icoTrocar(arg); return; } // 4.96
    if (ac === 'extCfgAbrir') { msg({ t: 'acao', acao: 'extCfgAbrir' }); return; } // 4.62 - abre o card de ajustes no PF
    if (ac === 'cotarIA') { irAba('cot'); cotarIA(); return; }
    if (ac === 'lerDocCli') { var _dc = docCliAchar(); if (!_dc) return; cmAlvo = { b: _dc.b }; cmExec(_dc.tipo === 'pdf' ? 'doc_ia' : 'img_ia', '', _dc.tipo === 'pdf' ? (_dc.nome || '') : _dc.src); return; } // 4.76
    if (ac === 'clGerar') { clGerar(arg); return; } // 7.3
    if (ac === 'clPor') { if (clR && clR.msg) escreverNaCaixa(clR.msg); return; }
    if (ac === 'clCopiar') { if (clR && clR.msg) { try { navigator.clipboard.writeText(clR.msg); b.textContent = '✓ copiado'; } catch (e) { } } return; }
    if (ac === 'clX') { clR = null; pintaCorpo(); return; }
    if (ac === 'resumir') { resumir(); return; }
    if (ac === 'resumoX') { resumoR = null; pintaCorpo(); return; }
    if (ac === 'resumoGravar') {
      var tx = (P.querySelector('.pfwa-res-t') || {}).value || '', dt = (P.querySelector('.pfwa-res-d') || {}).value || '', px = (P.querySelector('.pfwa-res-p') || {}).value || '';
      if (!tx.trim() || !resp || !resp.k) return;
      b.disabled = true; b.textContent = 'Gravando…';
      var g1 = await msg({ t: 'acao', acao: 'registrar', arg: { k: resp.k, texto: '📝 Resumo (IA): ' + tx.trim() } });
      if (px.trim() && dt) await msg({ t: 'acao', acao: 'lembrete', arg: { k: resp.k, data: dt, texto: px.trim() } });
      if (g1 && g1.ok) { resumoR = null; pintaCorpo(); } else { b.disabled = false; flash(b, naoDeu()); }
      return;
    }
    if (ac === 'respForn') { await respFornIr(arg, b); return; }
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
  // 7.3 - 🔗 Link de cadastro pro cliente preencher (o mesmo da janela 🆕/⛔ da cotação): à vista / a prazo / reanálise.
  var clR = null, clIndo = false, clConv = '';
  async function clGerar(modo) {
    if (clIndo) return; clIndo = true; clR = null; clConv = ultimo; pintaCorpo();
    var r = await msg({ t: 'acao', acao: 'cadLink', arg: { k: resp && resp.k, modo: modo, pessoa: (typeof pessoaComprador === 'function' && pessoaComprador()) || '' } });
    clIndo = false; clR = r && r.ok ? r : { erro: (r && r.erro) || 'O PF não respondeu.' }; pintaCorpo();
  }
  function clHtml(r) {
    if (!r || !r.k) return '';
    if (clR && clConv !== ultimo) clR = null;
    var h = '<div class="pfwa-bloco"><div class="pfwa-bt">🔗 Link de cadastro pro cliente preencher</div>';
    if (clIndo) return h + '<div class="pfwa-nada">Gerando o link…</div></div>';
    if (clR && clR.erro) h += '<div class="pfwa-nada" style="color:#C00000">' + esc(clR.erro) + '</div>';
    if (clR && clR.msg) return h + '<div class="pfwa-nada" style="white-space:pre-wrap;margin-bottom:6px">' + esc(clR.msg) + '</div><div class="pfwa-bots"><button class="pfwa-verde" data-acao="clPor">💬 Pôr na conversa</button><button data-acao="clCopiar">📋 Copiar</button><button data-acao="clX">✕</button></div></div>';
    return h + '<div class="pfwa-bots"><button data-acao="clGerar" data-arg="novo_vista">💵 Novo à vista</button><button data-acao="clGerar" data-arg="novo_prazo">📅 Novo a prazo</button><button data-acao="clGerar" data-arg="reanalise">⛔ Reanálise</button></div>'
      + '<div class="pfwa-nada" style="margin-top:4px">O cliente abre no celular, confere o que já temos, completa e anexa os documentos. Chega sozinho no PF.</div></div>';
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
  async function respFornIr(arg, b) {
    var pr = String(arg || '').split('|'), col = respFornColher();
    if (!col.texto && !col.imgs.length) { flash(b, 'Não achei resposta dele nesta conversa'); return; }
    if (b.tagName === 'BUTTON') b.disabled = true; b.textContent = 'Lendo a conversa…';
    var ims = []; for (var ii = 0; ii < col.imgs.length; ii++) { var du = await urlParaDataUrl(col.imgs[ii]); if (du) ims.push(du); }
    await msg({ t: 'acao', acao: 'respForn', focar: true, arg: { mapa: pr[0], fid: pr[1], texto: col.texto, imgs: ims } });
    if (b.tagName === 'BUTTON') b.disabled = false; flash(b, '✔ Abri no PF — confira e lance');
  }
  // 4.54 - A pedido do Vitor ("e quando ele responder, pra subir a cotação pro mapa precisa ser manual?"): fornecedor com mapa esperando respondeu =
  // selo "📥 lançar no mapa" no balão dele (clique = o PF lê e mostra pra conferir) + aviso na barra do PF (abrindo a conversa ou vendo pela lista).
  var rfAvisados = {};
  function rfAvisar(mapa, fid, nome, chave) { if (!mapa || rfAvisados[chave]) return; rfAvisados[chave] = 1; msg({ t: 'acao', acao: 'fornRespondeu', arg: { mapa: mapa, fid: fid, nome: nome } }); }
  function rfVigiar() {
    var bt = ((resp && resp.botoes) || []).find(function (x) { return x && x.acao === 'respForn'; });
    var liga = CFG.rfselo !== false && contatoAt && !contatoAt.grupo && resp && resp.tipo === 'fornecedor' && bt;
    var el = null; if (liga) { var u = ultimaMsg(); if (u && !u.eu) el = rrUltimoIn(); }
    document.querySelectorAll('#main .pfwa-rfselo').forEach(function (s) { if (!el || s.parentElement !== el) s.remove(); });
    if (el) {
      var num = (String(bt.rot || '').match(/mapa\s+(\S+)/i) || [])[1] || '';
      var s = el.querySelector(':scope > .pfwa-rfselo');
      if (!s) { s = document.createElement('span'); s.className = 'pfwa-rfselo'; if (getComputedStyle(el).position === 'static') el.style.position = 'relative'; el.appendChild(s);
        ['pointerdown', 'mousedown', 'mouseup', 'pointerup', 'mouseover', 'mouseenter'].forEach(function (tp) { s.addEventListener(tp, function (ev) { ev.stopPropagation(); }, false); }); }
      if (!s._ocup) s.textContent = '📥 lançar no mapa ' + num;
      s.title = 'O fornecedor respondeu — clique: o PF lê a resposta (texto e fotos) e mostra o preço e o prazo de cada item pra você conferir antes de lançar no mapa';
      var sp = el.querySelector(':scope > .pfwa-selo'); s.style.left = sp ? ('calc(100% + ' + (10 + sp.offsetWidth) + 'px)') : '';
      s.onclick = function (ev) { ev.preventDefault(); ev.stopPropagation(); s._ocup = 1; respFornIr(bt.arg, s).then(function () { setTimeout(function () { s._ocup = 0; }, 2400); }); };
      var pr = String(bt.arg).split('|'); rfAvisar(pr[0], pr[1], contatoAt.nome, contatoAt.nome + '|' + rrTxt(el).slice(0, 60));
    }
    // pela lista: conversa de fornecedor com mapa esperando e mensagem não lida = ele respondeu
    if (CFG.rfselo !== false) linhasLista().forEach(function (x) { var st = sitCache[x.nome]; if (st && st.tipo === 'fornecedor' && st.mapaId && x.unread) rfAvisar(st.mapaId, st.fid || '', x.nome, x.nome + '|' + x.hora); });
  }
  setInterval(function () { try { rfVigiar(); } catch (e) { } }, 2500);
  function respFornColher() {
    var bolhas = msgLinhas(); // 4.43
    var ult = -1; bolhas.forEach(function (b, i) { if (minhaEl(b)) ult = i; });
    var deles = bolhas.slice(ult + 1).filter(function (b) { return !minhaEl(b); });
    if (!deles.length) deles = bolhas.filter(function (b) { return !minhaEl(b); }).slice(-8);
    var texto = deles.map(function (b) { var tx = b.querySelector('.selectable-text'); return ((tx ? tx.innerText : '') || '').trim(); }).filter(Boolean).join('\n');
    if (!texto && !bolhas.length) texto = lerMensagens().filter(function (m) { return !m.eu; }).slice(-8).map(function (m) { return m.t; }).join('\n');
    var imgs = []; deles.forEach(function (b) { b.querySelectorAll('img').forEach(function (im) { var s = im.getAttribute('src') || ''; if ((/^blob:/.test(s) || /^data:image/.test(s)) && (im.naturalWidth || im.width) >= 120 && imgs.length < 4) imgs.push(s); }); });
    return { texto: texto, imgs: imgs };
  }
  // 7.7 - A pedido do Vitor ("clickei com o direito para ler no pf e não leu"): o WhatsApp põe por baixo da foto uma MINIATURA borrada
  // (data:image pequena) e a extensão pegava ela — a IA não conseguia ler a cotação. Agora pega a MAIOR imagem da mensagem e, com o motor ligado,
  // baixa a foto ORIGINAL pelo id da mensagem.
  function fotoMelhor(b) {
    var melhor = '', area = 0, blob = false;
    try { var ims = b ? b.querySelectorAll('img') : []; for (var k = 0; k < ims.length; k++) { var s = ims[k].getAttribute('src') || ''; if (!/^blob:|^data:image/.test(s)) continue;
      var lw = ims[k].naturalWidth || ims[k].width || 0, lh = ims[k].naturalHeight || ims[k].height || 0; if (lw < 120) continue;
      var eb = /^blob:/.test(s), a = lw * (lh || lw); if ((eb && !blob) || ((eb === blob) && a > area)) { melhor = s; area = a; blob = eb; } } } catch (e) { }
    return melhor;
  }
  function msgIdDe(b) { try { var el = b && (b.closest('[data-id]') || b.querySelector('[data-id]')); var id = el ? el.getAttribute('data-id') || '' : ''; return /^(true|false)_.+@.+_[A-Za-z0-9]+$/.test(id) ? id : ''; } catch (e) { return ''; } }
  // 8.2 - A pedido do Vitor (foto do caderno no Leitor saiu toda inventada): sem o motor a extensão pegava a MINIATURA da conversa. Agora, com a foto
  // pequena (< 1000 px), abre o visualizador do próprio WhatsApp (clica na foto), pega a imagem GRANDE de lá e fecha (Esc). Vale pra tudo que lê foto.
  function imgLado(du) { return new Promise(function (ok) { var im = new Image(); im.onload = function () { ok(Math.max(im.naturalWidth, im.naturalHeight)); }; im.onerror = function () { ok(0); }; im.src = du; }); }
  function fotoDoVisualizador(minLado) {
    var melhor = null, area = 0;
    document.querySelectorAll('img').forEach(function (im) { var s = im.getAttribute('src') || ''; if (!/^blob:/.test(s)) return; if (im.closest('#main [role="row"],#pane-side,#pfwa,[id^="pfwa-"]')) return;
      var w = im.naturalWidth || 0, h = im.naturalHeight || 0; if (Math.max(w, h) < (minLado || 0)) return; if (w * h > area) { area = w * h; melhor = im; } });
    return melhor;
  }
  async function fotoGrandeVisualizador(b, ladoAtual) {
    try {
      var aberto = fotoDoVisualizador(ladoAtual + 1); if (aberto) return await urlParaDataUrl(aberto.src);
      var mi = null; if (b) { var ims = b.querySelectorAll('img'), ar = 0; for (var k = 0; k < ims.length; k++) { var w = ims[k].width * ims[k].height; if (w > ar) { ar = w; mi = ims[k]; } } }
      if (!mi) return null;
      clicarEl(mi); ['pointerdown', 'pointerup'].forEach(function (t) { try { mi.dispatchEvent(new PointerEvent(t, { bubbles: true })); } catch (e) { } }); try { mi.click(); } catch (e) { }
      var g = await esperar(function () { var x = fotoDoVisualizador(ladoAtual + 1); return x && x.complete && x.naturalWidth ? x : null; }, 6000);
      var du = g ? await urlParaDataUrl(g.src) : null;
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
      return du;
    } catch (e) { return null; }
  }
  async function fotoDados(b, src) {
    var id = msgIdDe(b);
    if (id) { try { if (!motorOk) await motorChecar(); if (motorOk) { var md = await motor('midia', { id: id }, 60000); if (md && md.data && /^data:image/.test(md.data)) return md.data; } } catch (e) { } }
    if (!b) { var vz = fotoDoVisualizador(600); if (vz) return await urlParaDataUrl(vz.src); }
    if (!src) src = fotoMelhor(b);
    var du = src ? await urlParaDataUrl(src) : null;
    var lado = du ? await imgLado(du) : 0;
    if (lado < 1000) { var gr = await fotoGrandeVisualizador(b, lado); if (gr) { var l2 = await imgLado(gr); if (l2 > lado) return gr; } }
    return du;
  }
  async function urlParaDataUrl(u) {
    if (/^data:/.test(u)) return u;
    try { var bl = await (await fetch(u)).blob(); return await new Promise(function (ok) { var fr = new FileReader(); fr.onload = function () { ok(fr.result); }; fr.onerror = function () { ok(null); }; fr.readAsDataURL(bl); }); } catch (e) { return null; }
  }
  async function cotar() {
    if (cotando) return; cotando = true; cotErro = ''; cot = null; pintaCorpo();
    cotArgs = { k: resp && resp.k, contato: resp && resp.contato, msgs: msgsPedido() };
    var r = await msg({ t: 'acao', acao: 'cotar', arg: cotArgs });
    cotando = false;
    if (!r || r.erro) { cotErro = r && r.erro === 'semPF' ? 'Abra o PartsFlow numa aba deste Chrome (já logado).' : r && r.erro === 'pfF5' ? 'Dê F5 na aba do PartsFlow (a extensão foi atualizada depois que ele abriu).' : 'O PF não respondeu. Dê F5 na aba do PartsFlow.'; }
    else cot = r;
    pintaCorpo();
  }
  function refazResposta() {
    if (!cot) return; var nome = (resp && resp.contato || '').split(' ')[0], tot = 0;
    var ls = cot.itens.map(function (o) {
      if (!o.achou) return o.cod + ' — não localizei' + (o.perg ? ', não seria o ' + o.perg + '?' : ', pode confirmar o código?');
      if (!(o.saldo > 0)) return o.cod + ' — ' + o.desc + ' — vou verificar o prazo';
      var q = Math.min(o.saldo, o.qtd), mk = o.marcaPed ? ' ' + o.marca + (o.marcaOk ? '' : ' (não temos ' + o.marcaPed + ')') : ''; tot += q * o.preco; return o.cod + mk + ' — ' + o.desc + ' — ' + q + ' un' + (q < o.qtd ? ' (tenho ' + o.saldo + ')' : '') + ' — ' + reais(o.preco) + ' un';
    });
    cot.total = Math.round(tot * 100) / 100;
    var p = cot.resposta.split('\nSegue:\n'); var ini = p.length > 1 ? p[0] : ('Olá' + (nome ? ' ' + nome : '') + '!');
    var fim = cot.resposta.split('\n\n').slice(-1)[0];
    cot.resposta = ini + '\nSegue:\n' + ls.join('\n') + (tot ? '\n\nTotal: ' + reais(tot) : '') + '\n\n' + fim;
  }
  // 4.89 - A pedido do Vitor ("o código estava errado. Selecionei, mas abriu a cotação com a errada"): o "🔍 seria:" escolhido vai pro PF no lugar do código
  // que o cliente digitou (o dele fica como código do cliente).
  // 8.0 - A pedido do Vitor ("e se colocar algo para marcar, para cotar todas as fichas que tiver?"): caixinha "Cotar todas as marcas" — a cotação no PF
  // já vem com TODAS as fichas (marcas) de cada código pedido, uma linha por marca. Fica guardada neste navegador.
  // 8.8 - A pedido do Vitor ("por via de regra já tem que cotar todas"): vem MARCADA; desmarcar fica guardado neste navegador.
  var TODAS = true; try { chrome.storage.local.get('todasFichas', function (o) { TODAS = !(o && o.todasFichas === false); }); } catch (e) { }
  // 8.5 - A pedido do Vitor ("o cliente pediu para cotar somente de determinada marca… configurado somente nessa cotação" — "Só fleet"): o PF acha
  // "só/somente/apenas MARCA" nas mensagens do cliente; aqui vem a linha marcada "Cliente pediu só X". Marcada = cota só essa marca e a regra entra no
  // ⚙️ Regras desta cotação no PF (não mexe no Assistente nem no cadastro). Desmarcar = refaz sem a marca.
  var cotArgs = null, spArgs = null;
  function soMarcaHtml(r, ctx) {
    var det = (r && r.soMarcaDet) || [];
    // 8.8 - A pedido do Vitor ("não vai ter campo para eu falar para cotar só alguma?"): sem o cliente ter falado, link "🏷️ Só uma marca…" → campo pra digitar a marca.
    if (!det.length) return '<div class="pfwa-somask" style="flex:0 0 100%;width:100%;box-sizing:border-box;margin:4px 0 2px;font-size:12px"><a href="#" data-pfsomabrir="' + ctx + '" style="color:#1F4E79;font-weight:700;text-decoration:none">🏷️ Cotar só uma marca…</a>' +
      '<span data-pfsomcx="' + ctx + '" style="display:none"> <input data-pfsomtx="' + ctx + '" placeholder="ex.: Spicer, Fleet" style="width:130px;padding:3px 6px;border:1px solid #c9d3df;border-radius:6px;font-size:12px"> <button data-pfsomok="' + ctx + '" style="padding:3px 9px;border-radius:6px;border:0;background:#1F4E79;color:#fff;font-weight:700;font-size:12px;cursor:pointer">OK</button></span></div>';
    var on = !!(r.soMarca && r.soMarca.length);
    return '<label class="pfwa-todas pfwa-som" title="O cliente pediu só essa marca. Marcado: cota só ela e a regra fica só nesta cotação no PF (não vai pro Assistente nem pro cadastro)"><input type="checkbox" data-pfsom="' + ctx + '"' + (on ? ' checked' : '') + '> 🏷️ Cliente pediu <b>só ' + esc(det.join(' / ')) + '</b> — cotar só essa marca</label>';
  }
  document.addEventListener('change', async function (e) {
    var t = e.target; if (!t || !t.hasAttribute || !t.hasAttribute('data-pfsom')) return;
    var ctx = t.getAttribute('data-pfsom'), on = !!t.checked;
    if (ctx === 'cot' && cotArgs && cot) {
      var a = Object.assign({}, cotArgs, { soMarca: on ? (cot.soMarcaDet || []) : '', soMarcaDet: cot.soMarcaDet || [] });
      cotando = true; pintaCorpo(); var r = await msg({ t: 'acao', acao: 'cotar', arg: a }); cotando = false; if (r && !r.erro) cot = r; pintaCorpo();
    } else if (ctx === 'sp' && spArgs && spR) {
      var a2 = Object.assign({}, spArgs, { soMarca: on ? (spR.soMarcaDet || []) : '', soMarcaDet: spR.soMarcaDet || [] });
      var s0 = spMsg, r2 = await msg({ t: 'acao', acao: 'cotar', arg: a2 }); if (spMsg !== s0) return; if (r2 && !r2.erro) spR = r2; spPinta();
    }
  }, true);
  async function soMarcaDigitada(ctx, txt) {
    txt = String(txt || '').trim(); if (!txt) return;
    if (ctx === 'cot' && cotArgs && cot) { var a = Object.assign({}, cotArgs, { soMarcaTxt: txt }); cotando = true; pintaCorpo(); var r = await msg({ t: 'acao', acao: 'cotar', arg: a }); cotando = false; if (r && !r.erro) cot = r; pintaCorpo(); }
    else if (ctx === 'sp' && spArgs && spR) { var a2 = Object.assign({}, spArgs, { soMarcaTxt: txt }), s0 = spMsg, r2 = await msg({ t: 'acao', acao: 'cotar', arg: a2 }); if (spMsg !== s0) return; if (r2 && !r2.erro) spR = r2; spPinta(); }
  }
  document.addEventListener('click', function (e) {
    var t = e.target; if (!t || !t.closest) return;
    var ab = t.closest('[data-pfsomabrir]'); if (ab) { e.preventDefault(); e.stopPropagation(); var c = ab.getAttribute('data-pfsomabrir'), cx = ab.parentNode.querySelector('[data-pfsomcx="' + c + '"]'); if (cx) { cx.style.display = 'inline'; ab.style.display = 'none'; var i = cx.querySelector('input'); if (i) i.focus(); } return; }
    var ok = t.closest('[data-pfsomok]'); if (ok) { e.preventDefault(); e.stopPropagation(); var c2 = ok.getAttribute('data-pfsomok'), inp = ok.parentNode.querySelector('input'); soMarcaDigitada(c2, inp && inp.value); }
  }, true);
  document.addEventListener('keydown', function (e) { var t = e.target; if (e.key === 'Enter' && t && t.hasAttribute && t.hasAttribute('data-pfsomtx')) { e.preventDefault(); e.stopPropagation(); soMarcaDigitada(t.getAttribute('data-pfsomtx'), t.value); } }, true);
  function todasHtml() { return '<label class="pfwa-todas" title="A cotação no PF já vem com todas as marcas que tiver de cada código (uma linha por marca)"><input type="checkbox" data-pftodas' + (TODAS ? ' checked' : '') + '> Cotar <b>todas as marcas</b> de cada código</label>'; }
  document.addEventListener('change', function (e) { var t = e.target; if (t && t.hasAttribute && t.hasAttribute('data-pftodas')) { TODAS = !!t.checked; try { chrome.storage.local.set({ todasFichas: TODAS }); } catch (er) { } document.querySelectorAll('input[data-pftodas]').forEach(function (x) { x.checked = TODAS; }); } }, true);
  function itensPF(lista) {
    return (lista || []).filter(function (o) { return o.cod; }).map(function (o) {
      var x = o.perg ? (o.parecidos || []).filter(function (y) { return y.cod === o.perg; })[0] : null;
      if (x) return { cod: x.cod, qtd: o.qtd, marca: x.marca || '', desc: '', marcaPed: o.marcaPed, marcaOk: false, codCli: o.codCli || o.cod };
      return { cod: o.cod, qtd: o.qtd, marca: o.marca, desc: o.desc, marcaPed: o.marcaPed, marcaOk: o.marcaOk, codCli: o.codCli };
    });
  }
  function abrirCot(pdf, min) {
    if (!cot) return;
    msg({ t: 'acao', acao: 'abrirCot', focar: !min, arg: { minimizar: !!min, k: resp && resp.k, pessoa: pessoaComprador(), pdf: !!pdf, todas: TODAS, soMarca: cot.soMarca || [], itens: itensPF(cot.itens) } });
    if (min) cmToast('✔ Cotação criada no PF (minimizada)');
  }
  async function buscarSaldo(cod) { cod = String(cod || '').trim(); if (!cod) return; saldoR = { cod: cod, carregando: 1 }; pintaCorpo(); var r = await msg({ t: 'acao', acao: 'saldo', arg: cod }); saldoR = r && !r.erro ? r : { cod: cod, erro: 1 }; pintaCorpo(); }

  function pinta() {
    if (!P) return;
    // 4.34 - A pedido do Vitor ("selecionei 'todos' mas não tá exibindo"): o tick (vigiar) re-renderiza o painel e, se você está mexendo num campo da
    // config (um <select> aberto, digitando), fecha o dropdown e perde a escolha. Enquanto um campo da config estiver em foco, não re-renderiza.
    try { var ae = document.activeElement; if (config && ae && ae.getAttribute && ae.getAttribute('data-au')) return; } catch (e) { }
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
    if (r.tipo === 'colega') return '<div class="pfwa-vazio">👔 <b>' + esc(r.titulo || '') + '</b> é colega da empresa (' + esc(r.emp || 'Triex') + (r.cargo ? ' · ' + esc(r.cargo) : '') + ').<br>Não recebe mensagem automática e não entra nos avisos de cliente.<br><small>Pra mudar: clique no 👤 ao lado do nome.</small></div>'; // 4.91
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
  // 4.48 - 🔍 código quase igual: o cliente pode ter digitado errado (3-3-5571X → 3-3-6571X). Clicar = a resposta pergunta "não seria o X?"
  function parecHtml(o, i) {
    if (o.achou || !(o.parecidos || []).length) return '';
    return '<div class="pfwa-mps">🔍 seria: ' + o.parecidos.map(function (x, j) { return '<span class="pfwa-mpc' + (x.saldo > 0 ? '' : ' z') + (o.perg === x.cod ? ' on' : '') + '" data-acao="parec" data-arg="' + i + '|' + j + '" title="' + esc(x.como) + (x.marca ? ' · ' + esc(x.marca) : '') + (x.saldo > 0 ? ' · saldo ' + x.saldo : ' · sem saldo') + ' — clique pra escolher: a resposta pergunta "não seria o X?" e a cotação no PF já entra com ele">' + (o.perg === x.cod ? '✔ ' : '') + esc(x.cod) + '</span>'; }).join(' ') + (o.perg ? '<div style="font-size:11px;color:#1F7A3A;margin-top:3px">✔ na cotação vai o ' + esc(o.perg) + ' (o ' + esc(o.cod) + ' fica como código do cliente)</div>' : '') + '</div>';
  }
  function parecUsar(arg) { if (!cot) return; var p = String(arg || '').split('|'), o = cot.itens[+p[0]], x = o && o.parecidos && o.parecidos[+p[1]]; if (!x) return; o.perg = o.perg === x.cod ? '' : x.cod; refazResposta(); pintaCorpo(); }
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
    // 4.88 - A pedido do Vitor ("cliente me mandou um pedido [PDF]. o PF já deveria fazer algo?"): o botão de ler o PDF/foto já aparece, sem precisar clicar em Cotar antes
    if (!cot) { var _d0 = docCliAchar(); if (_d0) { var _ehPed = _d0.tipo === 'pdf' && PE_DOC_PED_RE.test(_d0.nome || ''); h += '<div class="pfwa-vazio" style="padding-bottom:4px"><b>📎 O cliente mandou ' + (_d0.tipo === 'pdf' ? (_ehPed ? 'um PEDIDO em PDF' : 'um PDF') + ' <i>' + esc(_d0.nome || '') + '</i>' : 'uma foto') + '</b><br><button class="pfwa-btn pfwa-lar" data-acao="lerDocCli" style="margin-top:8px">🤖 Ler ' + (_d0.tipo === 'pdf' ? (_ehPed ? 'o pedido' : 'o PDF') : 'a foto') + ' com IA e montar a cotação</button></div>'; } }
    if (!cot) return h + '<div class="pfwa-vazio">O PF lê os códigos e a quantidade que o cliente mandou nesta conversa, mostra saldo e preço e escreve a resposta.<br><br><button class="pfwa-btn pfwa-lar" data-acao="cotar">📄 Cotar no PF</button> <button class="pfwa-btn" data-acao="cotarIA" title="Pra quando o cliente pede pelo nome da peça">🧠 Entender com IA</button></div>';
    if (!cot.itens.length) { var _da = docCliAchar(); if (_da) h += '<div class="pfwa-vazio" style="padding-bottom:4px"><b>O cliente mandou ' + (_da.tipo === 'pdf' ? 'o PDF <i>' + esc(_da.nome || '') + '</i>' : 'uma foto') + '</b> — os códigos devem estar nele.<br><button class="pfwa-btn pfwa-lar" data-acao="lerDocCli" style="margin-top:8px">🤖 Ler ' + (_da.tipo === 'pdf' ? 'o PDF' : 'a foto') + ' com IA e cotar</button></div>'; }
    if (!cot.itens.length) return h + '<div class="pfwa-vazio">Não achei códigos nas últimas mensagens do cliente.<br><small>Se ele pediu pelo nome da peça ("kit de vedação da 28000"), use 🧠 Entender com IA.</small><br><br><button class="pfwa-btn pfwa-lar" data-acao="cotarIA">🧠 Entender com IA</button> <button class="pfwa-btn" data-acao="cotar">🔁 Ler de novo</button></div>';
    h += '<div class="pfwa-cotinfo">' + cot.itens.length + ' código' + (cot.itens.length > 1 ? 's' : '') + (cot.geral ? ' · ' + cot.geral + ' de cada' : '') + (cot.margem != null ? ' · margem ' + cot.margem + '% · ' + esc(cot.uf) : '') + ' <span data-acao="cotar" class="pfwa-link">🔁 ler de novo</span> <span data-acao="cotarIA" class="pfwa-link">🧠 entender com IA</span>' + (cot.ia ? ' <small>(lido pela IA — confira)</small>' : '') + '</div>';
    h += '<table class="pfwa-tab"><tr><th>Código</th><th>Qtd</th><th>Saldo</th><th>Unit.</th><th></th></tr>';
    cot.itens.forEach(function (o, i) {
      var sl = !o.achou ? '<span class="no">não achei</span>' : !(o.saldo > 0) ? '<span class="no">✖ 0</span>' : o.saldo < o.qtd ? '<span class="mid">◐ ' + o.saldo + '</span>' : '<span class="ok">✔ ' + o.saldo + '</span>';
      h += '<tr><td><b>' + esc(o.cod) + '</b>' + (o.desc ? '<br><small>' + esc(o.desc) + (o.marca ? ' · ' + esc(o.marca) : '') + '</small>' : '') + marcaPedHtml(o, i) + parecHtml(o, i) + '</td><td>' + o.qtd + '</td><td>' + sl + '</td><td>' + (o.preco > 0 ? reais(o.preco) : '—') + '</td><td><span data-acao="tirar" data-arg="' + i + '" title="Tirar da cotação" class="pfwa-tirar">✕</span></td></tr>';
    });
    h += '</table><div class="pfwa-tot"><span>Total (com saldo)</span><span>' + reais(cot.total) + '</span></div>';
    if (CFG.sug !== false) h += juntoHtml(); // 4.20 - 💡 quem leva isso também leva
    h += '<div class="pfwa-bt" style="margin-top:10px">💬 Resposta (dá pra mexer antes)</div><textarea class="pfwa-resp">' + esc(cot.resposta) + '</textarea>';
    h += soMarcaHtml(cot, 'cot') + todasHtml();
    h += '<div class="pfwa-bots"><button data-acao="escrever" class="pfwa-verde">💬 Pôr na conversa</button><button data-acao="abrirCot">📄 Abrir a cotação no PF</button><button data-acao="abrirCotMin" title="Cria a cotação no PF e deixa ela minimizada lá (não troca de tela)">⬇ Criar minimizada</button><button data-acao="pdf" class="pfwa-laranja">📤 PDF</button></div>';
    if (mqSemSaldo(cot.itens).length) h += '<div class="pfwa-bots"><button data-acao="mapaAbrir" class="pfwa-laranja" title="Cria o mapa de compras no PF e manda pros fornecedores (6.3)">🗂️ Mandar pro mapa (' + mqSemSaldo(cot.itens).length + ' sem saldo)</button></div>';
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
    if (r.tipo === 'cliente') h += crmFichaHtml(r); // 9.3 - 📒 Foi pra ficha
    if (r.tipo === 'cliente' && CFG.cc !== false) h += ccBlocoHtml(); // 4.97 - 🧭 conhecer o cliente
    if (r.tipo === 'cliente' && CFG.sug !== false) h += sugHtml(r); // 4.20 - 💡 pra oferecer
    if (r.tipo === 'cliente') h += clHtml(r); // 7.3 - 🔗 link de cadastro
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
    var sub = P.querySelector('.pfwa-cabsub'); if (sub) sub.textContent = resp && resp.achou ? (resp.tipo === 'cliente' ? 'Cliente' : resp.tipo === 'colega' ? 'Colega da empresa' : 'Fornecedor') + (resp.pelo ? ' (pelo ' + resp.pelo + ')' : '') : '';
    var v = vazioHtml(); var foco = document.activeElement && P.contains(document.activeElement) ? document.activeElement.className : '';
    // 2.1 - código do WhatsApp (entre parênteses) que não existe no PF: avisa pra cadastrar com o mesmo código
    var banner = (resp && resp.codFalta) ? '<div class="pfwa-codf">📇 Código <b>' + esc(resp.codFalta) + '</b> (do WhatsApp) não está no PF. Cadastre o cliente com esse mesmo código.<button data-acao="cadcli" data-arg="' + esc(resp.codFalta) + '">➕ Cadastrar no PF</button></div>' : '';
    if (ajuda) { c.innerHTML = htmlAjuda(); return; }
    if (config === 'auto') { c.innerHTML = htmlAuto(); return; }
    if (config) { c.innerHTML = htmlConfig(); tarefaPor(); return; } // 4.59
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
  var MEUS = '#pfwa-ccb,#pfwa-ccn,#pfwa-ccp,#pfwa-sp,.pfwa-selo,.pfwa-rfselo,#pfwa-rr2,.pfwa-rrselo,#pfwa,#pfwa-bots,#pfwa-aviso,#pfwa-of,#pfwa-ja,#pfwa-st,#pfwa-vf,#pfwa-pe,.pfwa-anselo,#pfwa-ancnt,#pfwa-anpop,#pfwa-menu,#pfwa-rail,#pfwa-svb,#pfwa-sv';
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
      var m = md[j]; if (m.closest(MEUS) || m.closest('#pane-side')) continue;
      // 8.9 - BUG (Vitor: foto aberta e os botões do PF por cima): o visualizador novo do WhatsApp abre a foto DENTRO do #main — vale foto grande que não está num balão de mensagem
      if (m.closest('#main')) { if (m.closest('[data-pre-plain-text],[data-id],[role="row"],.message-in,.message-out,footer,header')) continue; var w0 = m.getBoundingClientRect(); if (!(w0.width > vw * 0.35 && w0.height > vh * 0.5)) continue; }
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
  // 5.1 - BUG (print do Vitor: "vamos evitar esses bugs" — o 👤+ e o 🧭 8 em cima da lista "LINHA AMARELA ▾" do cabeçalho da conversa e o chip
  // "Menu do PF" em cima do título "WhatsApp"): antes cada selo ia SEMPRE logo depois do nome. Agora procura um lugar LIVRE (sem botão, texto,
  // ícone ou foto do WhatsApp embaixo e sem outro selo do PF), andando pra direita; sem lugar na linha do nome, vai logo abaixo do cabeçalho.
  // Selo novo posicionado por cima do WhatsApp → usar pfwaLugar.
  var PFWA_SELOS_CAB = ['#pfwa-svb', '#pfwa-ancnt', '#pfwa-ccb'];
  function pfwaOcupado(x, y, ignora) {
    if (x < 0 || y < 0 || x > window.innerWidth - 1 || y > window.innerHeight - 1) return true;
    var L = document.elementsFromPoint(x, y);
    for (var i = 0; i < L.length; i++) {
      var e = L[i]; if (e.closest && e.closest(MEUS + ',.pfm-offchip')) continue;
      if (e === document.documentElement || e === document.body) return false;
      var it = e.closest && e.closest('button,[role="button"],[role="combobox"],[role="listbox"],[aria-haspopup],a,input,textarea,[contenteditable="true"],img,svg,canvas,video');
      if (it && !(ignora && it.contains(ignora))) return true;
      for (var n = e.firstChild; n; n = n.nextSibling) if (n.nodeType === 3 && n.textContent.trim()) return true;
      return false;
    }
    return false;
  }
  // 5.3 - BUG (print do Aloisio: 👤+ e 🧭 6 em cima da lista "CARDAN ▾"): a pílula da lista tem fundo/borda mas o texto fica num span de dentro —
  // o ponto testado caía no fundo dela e contava como livre. Agora tudo que está DENTRO do cabeçalho e é visível (texto, ícone, botão, fundo, borda)
  // vira obstáculo pelo retângulo inteiro (menos os blocos que contêm o nome, que são largos).
  var _pfwaObs = null, _pfwaObsT = 0;
  function pfwaObstaculos() {
    if (_pfwaObs && Date.now() - _pfwaObsT < 400) return _pfwaObs;
    var R = [], hd = document.querySelector('#main header'), nome = nomeEl();
    if (hd) {
      var L = hd.querySelectorAll('*');
      for (var i = 0; i < L.length; i++) {
        var e = L[i];
        if (nome && e.contains(nome) && e !== nome) continue;
        if (e.closest(MEUS + ',.pfm-offchip')) continue;
        var r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
        if (pfwaNoContato(e, r)) continue; // 5.7
        var obs = /^(IMG|SVG|CANVAS|VIDEO|BUTTON|INPUT|TEXTAREA)$/i.test(e.tagName) || /^(button|combobox|listbox)$/.test(e.getAttribute('role') || '') || e.hasAttribute('aria-haspopup');
        if (!obs) for (var n = e.firstChild; n; n = n.nextSibling) if (n.nodeType === 3 && n.textContent.trim()) { obs = true; break; }
        if (!obs) { var cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.opacity === '0') continue;
          var bg = cs.backgroundColor; obs = (bg && bg !== 'transparent' && !/rgba\([^)]*,\s*0\)$/.test(bg)) || parseFloat(cs.borderTopWidth) > 0 || parseFloat(cs.borderLeftWidth) > 0 || cs.backgroundImage !== 'none'; }
        if (obs) R.push(r);
      }
    }
    _pfwaObs = R; _pfwaObsT = Date.now(); return R;
  }
  // 5.7 - A pedido do Vitor (print do Juninho - Adipel: 👤+ e 🧭 8 caíram embaixo do cabeçalho, em cima das mensagens, com o cabeçalho VAZIO depois do nome —
  // "acho que 1 mesmo", ao lado do nome): a área clicável do contato (o botão em volta do nome) é larga e tem pedaços sem nada (fundo, linha do status
  // vazia) que contavam como obstáculo. Dentro desse botão só conta o que aparece: foto/ícone e texto curto (até 260 px).
  function pfwaNoContato(e, r) {
    var nome = nomeEl(), info = nome && nome.closest('[role="button"]'); if (!info || e === info || !info.contains(e)) return false;
    if (/^(IMG|SVG|CANVAS|VIDEO)$/i.test(e.tagName)) return false;
    var txt = false; for (var n = e.firstChild; n; n = n.nextSibling) if (n.nodeType === 3 && n.textContent.trim()) { txt = true; break; }
    return !(txt && r.width <= 260);
  }
  // 5.7 - "só tem que tomar cuidado pra não bugar quando puxar a barra lateral do PF": o limite da direita é o fim do cabeçalho OU a borda do painel do PF aberto
  function pfwaDireita(hr) {
    var d = hr.right, pn = document.getElementById('pfwa');
    if (pn && pn.offsetWidth) { var pr = pn.getBoundingClientRect(); if (pr.width > 40 && pr.left < d && pr.right > hr.left && pr.top < hr.bottom && pr.bottom > hr.top) d = Math.min(d, pr.left); }
    return d;
  }
  function pfwaCaixaLivre(x, y, w, h, ignora, outros) {
    for (var j = 0; j < outros.length; j++) { var o = outros[j]; if (x < o.right + 4 && x + w > o.left - 4 && y < o.bottom && y + h > o.top) return false; }
    var ob = pfwaObstaculos(); for (var q = 0; q < ob.length; q++) { var b = ob[q]; if (x < b.right + 4 && x + w > b.left - 4 && y < b.bottom + 2 && y + h > b.top - 2) return false; }
    var cy = y + h / 2, pts = [[x - 3, cy], [x + w / 2, cy], [x + w + 3, cy], [x + 2, y + 3], [x + w - 2, y + h - 3], [x + w / 2, y + 3], [x + w / 2, y + h - 3]];
    for (var k = 0; k < pts.length; k++) if (pfwaOcupado(pts[k][0], pts[k][1], ignora)) return false;
    return true;
  }
  // el = o selo; cola no nome da conversa (r = retângulo do nome). Devolve {x,y} ou null.
  function pfwaLugar(el, r, w, h) {
    var hd = document.querySelector('#main header'); if (!hd) return null;
    var hr = hd.getBoundingClientRect(), nome = nomeEl(), info = nome && nome.closest('[role="button"]');
    var outros = []; PFWA_SELOS_CAB.forEach(function (s) { var o = document.querySelector(s); if (o && o !== el && o.style.display !== 'none' && o.offsetWidth) outros.push(o.getBoundingClientRect()); });
    var y = Math.round(r.top + r.height / 2 - h / 2), x;
    for (x = Math.round(r.right + 8); x + w <= hr.right - 4; x += 6) if (pfwaCaixaLivre(x, y, w, h, info, outros)) return { x: x, y: y };
    var y2 = Math.round(hr.bottom + 6); // sem lugar na linha: logo abaixo do cabeçalho, em cima das mensagens
    for (x = Math.round(r.left); x + w <= hr.right - 4; x += 6) if (pfwaCaixaLivre(x, y2, w, h, null, outros)) return { x: x, y: y2 };
    return { x: Math.round(r.left), y: y2 };
  }
  // 5.5 - A pedido do Vitor (print do MacBook: 👤+ 📦4 📨1 🧭7 em cima da lista "Oficina / Serviço ▾" — "não está cabendo… está ficando estranho"):
  // os 3 selos agora andam JUNTOS (um bloco só, na ordem 👤+ · 📦📨📌 · 🧭), menores, e o bloco inteiro procura o lugar livre. A lista do
  // cabeçalho do WhatsApp nem sempre fica dentro do #main header — a linha do nome também é varrida ponto a ponto (pfwaObsLinha).
  // Sem lugar na linha (tela pequena) o bloco vai logo abaixo do cabeçalho, em cima das mensagens.
  function pfwaObsLinha(y, x0, x1) {
    var R = [], vistos = new Set(), nome = nomeEl();
    for (var x = x0; x <= x1; x += 12) { // 7.5 - era a cada 5 px (até 200 consultas por vez): a extensão travava o WhatsApp
      var L = document.elementsFromPoint(x, y);
      for (var i = 0; i < L.length; i++) {
        var e = L[i]; if (e === document.body || e === document.documentElement) break;
        if (vistos.has(e)) continue; vistos.add(e);
        if (e.closest && e.closest(MEUS + ',.pfm-offchip')) continue;
        if (nome && e.contains(nome)) continue;
        var r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2 || r.width > 520 || r.height > 90) continue;
        if (pfwaNoContato(e, r)) continue; // 5.7
        var cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.opacity === '0') continue;
        var obs = /^(IMG|SVG|CANVAS|VIDEO|BUTTON|INPUT|SELECT)$/i.test(e.tagName) || /^(button|combobox|listbox)$/.test(e.getAttribute('role') || '') || e.hasAttribute('aria-haspopup');
        if (!obs) for (var n = e.firstChild; n; n = n.nextSibling) if (n.nodeType === 3 && n.textContent.trim()) { obs = true; break; }
        if (!obs) { var bg = cs.backgroundColor; obs = (bg && bg !== 'transparent' && !/rgba\([^)]*,\s*0\)$/.test(bg)) || parseFloat(cs.borderTopWidth) > 0 || parseFloat(cs.borderLeftWidth) > 0 || cs.backgroundImage !== 'none'; }
        if (obs) R.push(r);
      }
    }
    return R;
  }
  function pfwaCabLayout() {
    var els = [SVB, ANCNT, CCB].filter(function (e) { return e && e.style.display !== 'none'; });
    if (!els.length) return; var nome = nomeEl(); if (!nome) return;
    var r = nome.getBoundingClientRect(); if (!r.width) return;
    var hd = document.querySelector('#main header'); if (!hd) return; var hr = hd.getBoundingClientRect();
    var gap = 4, H = 26, W = 0; els.forEach(function (e, i) { W += (e.offsetWidth || 26) + (i ? gap : 0); });
    var y = Math.round(r.top + r.height / 2 - H / 2), info = nome.closest('[role="button"]');
    var DIR = pfwaDireita(hr); // 5.7
    // 7.5 - A pedido do Vitor ("tô achando que a extensão está fazendo o sistema travar" — Chrome "Não está respondendo" em 2 navegadores): esta conta rodava
    // várias vezes por segundo (cada selo chamava) e gastava ~40% do processador. Agora, com a mesma conversa/tamanho/selos, só recoloca no lugar guardado
    // e refaz a conta no máximo a cada 15 s (ou quando o cabeçalho muda de tamanho).
    var sig = ultimo + '|' + W + '|' + DIR + '|' + y + '|' + Math.round(r.right) + '|' + Math.round(hr.width);
    if (_pfwaCabPos && _pfwaCabPos.sig === sig && Date.now() - (_pfwaCabPos.t || 0) < 15000) {
      var cx0 = _pfwaCabPos.x; els.forEach(function (e) { e.style.left = cx0 + 'px'; e.style.top = (_pfwaCabPos.y + Math.round((H - (e.offsetHeight || H)) / 2)) + 'px'; cx0 += (e.offsetWidth || 26) + gap; });
      return;
    }
    var obs = pfwaObsLinha(y + H / 2, Math.round(r.right + 4), Math.round(DIR - 2));
    var livre = function (x, yy) {
      for (var q = 0; q < obs.length; q++) { var b = obs[q]; if (x < b.right + 6 && x + W > b.left - 6 && yy < b.bottom && yy + H > b.top) return false; }
      return pfwaCaixaLivre(x, yy, W, H, info, []);
    };
    var x, px = null, py = y;
    if (_pfwaCabPos && _pfwaCabPos.k === ultimo && _pfwaCabPos.W === W && _pfwaCabPos.D === DIR && _pfwaCabPos.y === y && livre(_pfwaCabPos.x, _pfwaCabPos.y)) { px = _pfwaCabPos.x; py = _pfwaCabPos.y; }
    if (px === null) for (x = Math.round(r.right + 8); x + W <= DIR - 4; x += 6) if (livre(x, y)) { px = x; break; }
    if (px === null) { // 5.7 - tela apertada: espremido logo depois do nome (só sem obstáculo do WhatsApp), senão embaixo do cabeçalho, à direita
      var x0 = Math.round(r.right + 6);
      if (x0 + W <= DIR - 2 && !obs.some(function (b) { return x0 < b.right + 2 && x0 + W > b.left - 2 && y < b.bottom && y + H > b.top; })) px = x0;
      else { py = Math.round(hr.bottom + 8); px = Math.round(DIR - W - 16); }
    }
    _pfwaCabPos = { k: ultimo, W: W, D: DIR, x: px, y: py, sig: sig, t: Date.now() };
    var cx = px; els.forEach(function (e) { e.style.left = cx + 'px'; e.style.top = (py + Math.round((H - (e.offsetHeight || H)) / 2)) + 'px'; cx += (e.offsetWidth || 26) + gap; });
  }
  var _pfwaCabPos = null;
  (function () { // 5.7 - recalcula na hora quando o cabeçalho muda de tamanho (abrir/fechar o painel do PF, redimensionar a janela)
    var obsR = null, hdV = null, t = null;
    function agenda() { clearTimeout(t); t = setTimeout(function () { try { _pfwaObs = null; _pfwaCabPos = null; pfwaCabLayout(); } catch (e) { } }, 120); }
    window.addEventListener('resize', agenda);
    setInterval(function () { try { var hd = document.querySelector('#main header'), pn = document.getElementById('pfwa'); if (!window.ResizeObserver) return;
      if (hd !== hdV) { if (obsR) obsR.disconnect(); obsR = new ResizeObserver(agenda); if (hd) obsR.observe(hd); if (pn) obsR.observe(pn); hdV = hd; } } catch (e) { } }, 1500);
  })();
  function pfwaPorNoLugar(el, r, w, h) { var p = pfwaLugar(el, r, w, h); if (!p) return false; el.style.left = p.x + 'px'; el.style.top = p.y + 'px'; return true; }
  function svPos() {
    if (!SVB) return; var c = contatoAt, el = nomeEl();
    if (!CFG.salvar || !c || c.grupo || !el || document.documentElement.classList.contains('pfwa-coberto')) { SVB.style.display = 'none'; if (SV) SV.style.display = 'none'; svAberto = false; return; }
    var r = el.getBoundingClientRect(); if (!r.width) { SVB.style.display = 'none'; return; }
    SVB.style.display = 'flex'; pfwaCabLayout();
    SVB.title = (resp && resp.achou && resp.tipo === 'cliente') ? 'Salvar / acertar este contato (' + (resp.titulo || '') + ')' : 'Salvar este contato no PF';
    SVB.classList.toggle('ok', !!(resp && resp.achou && resp.tipo !== 'colega')); SVB.classList.toggle('col', !!(resp && resp.tipo === 'colega')); // 4.91 - colega = roxo
    if (resp && resp.tipo === 'colega') SVB.title = '👔 Colega da empresa — clique pra mudar';
    if (SV && svAberto) { var tp = Math.round(r.bottom + 14); SV.style.left = Math.max(8, Math.min(window.innerWidth - 360, r.left)) + 'px'; SV.style.top = tp + 'px'; SV.style.maxHeight = Math.max(200, window.innerHeight - tp - 12) + 'px'; }
  }
  // 2.9 - "P - Adailton - Cardan Brasil (1427) Cardan": a pessoa é o 1º pedaço com 3+ letras e a empresa é o ÚLTIMO pedaço (antes ia "Adailton - Cardan Brasil Cardan")
  function svPartes(n) { return String(n || '').replace(/\s*\(\s*\d+\s*\)\s*/g, ' ').trim().split(/\s+[-–—]\s+/).map(function (s) { return s.trim(); }).filter(Boolean); }
  function svNomeBase(n) { n = String(n || '').trim(); if (/^[+\d\s()\-]{8,}$/.test(n)) return ''; var p = svPartes(n); if (p.length > 2) { var q = p.slice(0, -1).filter(function (s) { return s.replace(/[^A-Za-zÀ-ú]/g, '').length >= 3; }); if (q.length) return q[0]; } return p[0] || ''; }
  // 4.52 - A pedido do Vitor ("quando eu fizer uma cotação pelo whats, quero que puxe o nome do comprador e coloque na cotação"): só quando o nome da
  // conversa tem pessoa + empresa ("Tiago - Maximus Cardans (12662)"); nome sozinho não vira comprador.
  function pessoaComprador() { var n = (contatoAt && contatoAt.nome) || ''; return svPartes(n).length >= 2 ? svNomeBase(n) : ''; }
  function svEmpBase(n) { var p = svPartes(n); return p.length > 1 ? p[p.length - 1] : ''; }
  function svCodBase(n) { var m = String(n || '').match(/\(\s*(\d{2,8})\s*\)/); return m ? m[1] : ''; }
  // 4.7 - A pedido do Vitor ("coloca pra eu escolher o grupo do cliente, já pra vir com o grupo pro cadastro, ex. linha amarela")
  var SV_GRUPOS = [['amarela', 'Linha Amarela', '#E6B800'], ['agricola', 'Linha Agrícola', '#27AE60'], ['energia', 'Energia', '#1a1a1a'], ['rodoviario', 'Rodoviário', '#C0392B'], ['maritimo', 'Marítimo', '#7B3FC4'], ['portuario', 'Portuário', '#2E86DE'], ['retifica', 'Retífica', '#E67E22']];
  // 4.15 - A pedido do Vitor ("preciso poder selecionar mais de um grupo e até criar outro"): multi-seleção + criar grupo (guardado neste navegador).
  var SV_GRUPOS_EXTRA = [];
  try { chrome.storage.local.get(['svGruposExtra'], function (r) { if (r && Array.isArray(r.svGruposExtra)) SV_GRUPOS_EXTRA = r.svGruposExtra; }); } catch (e) { }
  var svGrupos = [];
  // 4.99 - A pedido do Vitor: grupos criados no PF (cadastro de clientes → "+ Outro grupo") aparecem aqui; o ➕ grupo daqui grava no PF (vale pra todos).
  var SV_GRUPOS_PF = [];
  function svGruposPfSet(l) { if (Array.isArray(l)) SV_GRUPOS_PF = l.filter(function (g) { return g && g[0]; }); }
  function svGruposTodos() { var vis = {}, out = []; SV_GRUPOS.concat(SV_GRUPOS_PF).concat(SV_GRUPOS_EXTRA).forEach(function (g) { var n = String(g[1] || '').toUpperCase(); if (vis[g[0]] || vis['n:' + n]) return; vis[g[0]] = 1; vis['n:' + n] = 1; out.push(g); }); return out; }
  setTimeout(async function () { try { var r = await msg({ t: 'acao', acao: 'gruposPF' }); if (r && r.lista) svGruposPfSet(r.lista); } catch (e) { } }, 4000);
  function svGruposRowHtml() {
    return svGruposTodos().map(function (g) { return '<span class="sv-g' + (svGrupos.indexOf(g[0]) >= 0 ? ' on' : '') + '" data-acao="svGrupo" data-arg="' + g[0] + '" data-g="' + g[0] + '" style="--c:' + g[2] + '"><i></i>' + esc(g[1]) + '</span>'; }).join('') +
      '<span class="sv-g sv-gnovo" data-acao="svGrupoNovo" title="Criar um grupo novo">➕ grupo</span>';
  }
  function svGruposRender() { var r = SV && SV.querySelector('.sv-grp'); // 4.27 - BUG: '.sv-gr' pegava a linha do TIPO (desde a 4.24)
    if (r) r.innerHTML = svGruposRowHtml(); }
  // 4.24 - A pedido do Vitor: TIPO DO CLIENTE (revenda / consumidor / concessionária / serviço) também é salvo no cadastro do PF
  // 4.47 - grau de intimidade com a pessoa → tom das mensagens automáticas
  var SV_INT = [['formal', '🎩 Formal'], ['normal', '🙂 Normal'], ['proximo', '🤝 Próximo']], svIntim = '';
  function svIntRowHtml() { return SV_INT.map(function (t) { return '<span class="sv-g' + (svIntim === t[0] ? ' on' : '') + '" data-acao="svInt" data-arg="' + t[0] + '" style="--c:#7B4FA0">' + esc(t[1]) + '</span>'; }).join(''); }
  function svIntSug() {
    var eu = []; try { eu = lerMensagens().filter(function (m) { return m.eu; }).map(function (m) { return m.t; }); } catch (e) { }
    var t = eu.join(' \n ').toLowerCase(), pr = t.match(/\b(mano|irm[aã]o|parceir\w*|meu amigo|fala|tmj|blz|beleza|valeu|kkk+|top)\b/g), fo = t.match(/\b(sr\.?|sra\.?|senhor|senhora|prezad\w*|cordialmente|atenciosamente)\b/g);
    var u = function (l) { var v = {}; return (l || []).filter(function (x) { if (v[x]) return false; v[x] = 1; return true; }).slice(0, 3).map(function (x) { return '"' + x + '"'; }).join(', '); };
    if (fo && fo.length >= (pr ? pr.length : 0)) return { n: 'formal', p: u(fo) };
    if (pr && pr.length >= 2) return { n: 'proximo', p: u(pr) };
    return null;
  }
  function svIntSugHtml() { if (svIntim) return ''; var g = svIntSug(); if (!g) return ''; var l = SV_INT.find(function (x) { return x[0] === g.n; });
    return '<div class="sv-intsug">💡 Sugestão: <b>' + esc(l[1]) + '</b> — vocês usam ' + esc(g.p) + ' <span class="sv-lk" data-acao="svInt" data-arg="' + g.n + '">usar</span></div>'; }
  var SV_TIPOS = [['revenda', '🏪 Revenda'], ['consumo', '👤 Consumidor'], ['conc', '🏛 Concessionária'], ['servico', '🔧 Serviço / oficina'], ['rental', '🔑 Rental']], svTipo = '', svGueri = false, svFatSp = false;
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
  // 4.55 - BUG (Vitor: "desmarquei, salvei, mas ainda continua aqui"): desmarcar TODOS os grupos mandava lista vazia e o PF ignorava. Agora avisa que você mexeu.
  var svGrpMexeu = false;
  function svGrupoSet(g) { svGrpMexeu = true; var i = svGrupos.indexOf(g); if (i >= 0) svGrupos.splice(i, 1); else svGrupos.push(g); svGruposRender(); }
  function svGrupoNovo() {
    var nome = (prompt('Nome do grupo novo:') || '').trim(); if (!nome) return;
    if (svGruposTodos().some(function (g) { return g[1].toUpperCase() === nome.toUpperCase(); })) { var jg = svGruposTodos().find(function (g) { return g[1].toUpperCase() === nome.toUpperCase(); }); if (jg && svGrupos.indexOf(jg[0]) < 0) svGrupos.push(jg[0]); svGruposRender(); return; }
    var cores = ['#E67E22', '#16A085', '#8E44AD', '#2C3E50', '#D35400', '#2980B9', '#C0392B'];
    msg({ t: 'acao', acao: 'grupoNovo', arg: { nome: nome } }).then(function (r) { if (r && r.k) { SV_GRUPOS_PF.push([r.k, r.label, r.cor]); if (svGrupos.indexOf(r.k) < 0) svGrupos.push(r.k); svGruposRender(); } else { svGrupoNovoLocal(nome, cores); } });
  }
  function svGrupoNovoLocal(nome, cores) {
    var id = 'g_' + Date.now().toString(36);
    SV_GRUPOS_EXTRA.push([id, nome, cores[SV_GRUPOS_EXTRA.length % cores.length]]);
    try { chrome.storage.local.set({ svGruposExtra: SV_GRUPOS_EXTRA }); } catch (e) { }
    svGrupos.push(id); svGruposRender();
  }
  // 4.60 - A pedido do Vitor ("esse cliente é um fornecedor, como cadastro nos fornecedores? pro pessoal de compras… testes integrado com compras"):
  // seletor 🤝 Cliente | 🏭 Fornecedor. Como fornecedor, grava no cad_fornecedores_v1 (razão + telefone + contato + 🏭 Trabalha com + linhas + CNPJ + Código JBoss).
  // Vendas cadastra cliente (padrão); compras cadastra fornecedor.
  var svModo = 'cliente', svFornId = '', svFornTipos = [], svFornLinhas = [], svSugF = [];
  var SV_FORN_TIPOS = ['FILTROS', 'ÓLEOS E LUBRIFICANTES', 'CARDAN', 'ROLAMENTOS', 'VEDAÇÃO', 'MOTOR — INTERNOS', 'INJEÇÃO E COMBUSTÍVEL', 'ARREFECIMENTO', 'CORREIAS E TENSORES', 'TURBO', 'EMBREAGEM E FREIO', 'ENGRENAGENS E EIXOS', 'HIDRÁULICO', 'ELÉTRICA', 'FIXAÇÃO', 'BUCHAS E PINOS', 'MATERIAL RODANTE', 'FERRAMENTAS DE CORTE'];
  var SV_FORN_LINHAS = ['NEW HOLLAND', 'VOLVO', 'CASE', 'CARRARO', 'CATERPILLAR', 'MASSEY', 'RANDON', 'VALTRA', 'AGRALE', 'JOHN DEERE', 'ALLISON', 'ATLAS COPCO', 'JCB', 'DANA/SPICER', 'TIMKEN', 'SKF', 'PARKER', 'BOSCH', 'ZF', 'OUTRAS'];
  function svFornChipsHtml() {
    return '<div class="sv-gl">🏭 TRABALHA COM <span style="font-weight:600;text-transform:none;color:#8a9ab0">(tipo de peça — o Mapa de Compras já sugere ele)</span></div>' +
      '<div class="sv-gr sv-ftipo">' + SV_FORN_TIPOS.map(function (t) { return '<span class="sv-g' + (svFornTipos.indexOf(t) >= 0 ? ' on' : '') + '" data-acao="svFTipo" data-arg="' + esc(t) + '" style="--c:#B45309">' + esc(t) + '</span>'; }).join('') +
      '<span class="sv-g sv-gnovo" data-acao="svFTipoNova" title="Outro tipo de produto que não está na lista">➕ produto</span></div>' + // 4.61
      '<div class="sv-gl">🏷️ LINHAS / MARCAS <span style="font-weight:600;text-transform:none;color:#8a9ab0">(pode escolher mais de uma)</span></div>' +
      '<div class="sv-gr sv-flinha">' + SV_FORN_LINHAS.map(function (l) { return '<span class="sv-g' + (svFornLinhas.indexOf(l) >= 0 ? ' on' : '') + '" data-acao="svFLinha" data-arg="' + esc(l) + '" style="--c:#1F4E79">' + esc(l) + '</span>'; }).join('') +
      '<span class="sv-g sv-gnovo" data-acao="svFLinhaNova" title="Outra linha/marca">➕ linha</span></div>';
  }
  function svFornChipsRender() { var r = SV && SV.querySelector('.sv-fchips'); if (r) r.innerHTML = svFornChipsHtml(); }
  // 5.2 - A pedido do Vitor ("meus colegas precisam ter outros cargos"): ao clicar no CARGO já preenchido, a lista mostra TODAS as opções
  // (o Chrome só mostrava as que batem com o texto — com "Vendedor" escrito aparecia só Vendedor); sair sem escolher volta o que estava.
  document.addEventListener('focusin', function (e) { var t = e.target; if (!t || !t.classList || !t.classList.contains('sv-cargo') || !t.value) return; t.dataset.old = t.value; t.placeholder = t.value; t.value = ''; }, true);
  document.addEventListener('focusout', function (e) { var t = e.target; if (!t || !t.classList || !t.classList.contains('sv-cargo')) return; if (!t.value.trim() && t.dataset.old) t.value = t.dataset.old; delete t.dataset.old; try { svPrev(); } catch (x) { } }, true);
  // 5.2 - A pedido do Vitor ("ou opção pra eu ir inserindo"): cargo digitado que não está na lista entra nela ao salvar o colega (guardado neste navegador).
  var SV_CARGOS_COL = ['Vendedor', 'Vendedor externo', 'Vendas interno', 'Compras', 'Comprador', 'Estoque', 'Expedição', 'Recebimento', 'Logística', 'Motorista', 'Faturamento', 'Fiscal', 'Financeiro', 'Contas a Pagar', 'Contas a Receber', 'Cadastro', 'Gerência', 'Gerente de vendas', 'Diretoria', 'RH', 'T.I.', 'Marketing', 'Recepção', 'Facilities / Manutenção', 'Jurídico', 'Área técnica'];
  var svCargosExtra = []; try { chrome.storage.local.get(['svCargosExtra'], function (x) { svCargosExtra = (x && x.svCargosExtra) || []; }); } catch (e) { }
  function svCargosCol() { return SV_CARGOS_COL.concat(svCargosExtra); }
  function svCargoGuardar(c) { c = String(c || '').trim(); if (!c) return; var n = c.toLowerCase(); if (svCargosCol().some(function (x) { return x.toLowerCase() === n; })) return; svCargosExtra.push(c); try { chrome.storage.local.set({ svCargosExtra: svCargosExtra }); } catch (e) { } }
  function svModoSet(m) {
    svModo = m; if (!SV) return;
    SV.classList.toggle('sv-isforn', m === 'forn'); SV.classList.toggle('sv-iscli', m === 'cliente'); SV.classList.toggle('sv-iscol', m === 'colega'); // 4.91 - 👔 colega
    var tr = SV.querySelector('.sv-modo'); if (tr) tr.innerHTML = svModoRowHtml();
    var lb = SV.querySelector('.sv-emplab'); if (lb) lb.textContent = m === 'forn' ? 'FORNECEDOR' : m === 'colega' ? 'EMPRESA (a nossa)' : 'EMPRESA (cliente do PF)';
    var em = SV.querySelector('.sv-emp'); if (em) { em.placeholder = m === 'forn' ? 'Razão social do fornecedor' : m === 'colega' ? 'Triex' : 'Digite pra procurar no PF'; if (m === 'colega') em.value = (resp && resp.tipo === 'colega' && resp.emp) || 'Triex'; }
    var cg0 = SV.querySelector('.sv-cargo'); if (cg0) cg0.placeholder = m === 'colega' ? 'Escolha da lista ou digite um cargo novo' : 'Ex.: Compras, Dono, Mecânico';
    svPrev();
    var cg = SV.querySelector('.sv-cargo'); if (cg && m === 'forn' && !cg.value.trim()) cg.value = 'Vendedor';
    if (cg) { cg.setAttribute('list', m === 'colega' ? 'pfwa-sv-cargos-col' : 'pfwa-sv-cargos'); if (m === 'colega' && cg.value === 'Vendedor' && !(resp && resp.tipo === 'colega')) cg.value = ''; } // 5.2 - 👔 colega = cargos da empresa
    var fc = SV.querySelector('.sv-fchips'); if (fc) fc.innerHTML = m === 'forn' ? svFornChipsHtml() : '';
    var k = SV.querySelector('.sv-k'); if (k) k.innerHTML = '';
    svK = ''; svFornId = ''; var sg = SV.querySelector('.sv-sug'); if (sg) sg.innerHTML = '';
  }
  function svModoRowHtml() {
    return ['cliente', 'forn', 'colega'].map(function (m) {
      return '<span class="sv-modobt' + (svModo === m ? ' on' : '') + '" data-acao="svModo" data-arg="' + m + '"' + (m === 'colega' ? ' title="Pessoa daqui da empresa — não recebe mensagem automática e não entra nos avisos de cliente"' : '') + '>' + (m === 'cliente' ? '🤝 Cliente' : m === 'forn' ? '🏭 Fornecedor' : '👔 Colega') + '</span>';
    }).join('');
  }
  function svUsarForn(i) {
    var s = svSugF[+i]; if (!s) return; svFornId = s.id;
    var e = SV.querySelector('.sv-emp'); if (e) e.value = s.razao || s.curto || '';
    var c = SV.querySelector('.sv-cod'); if (c && !c.value && s.codigo) c.value = String(s.codigo).replace(/^0+/, '');
    SV.querySelector('.sv-sug').innerHTML = ''; SV.querySelector('.sv-k').innerHTML = '🔗 fornecedor <b>' + esc(s.razao) + '</b>'; svPrev();
  }
  function svMontar() {
    var n = (SV.querySelector('.sv-nome') || {}).value || '', e = (SV.querySelector('.sv-emp') || {}).value || '', c = svModo === 'colega' ? '' : ((SV.querySelector('.sv-cod') || {}).value || '');
    n = n.replace(/\s*[-–—]\s*$/, ''); // 4.91 - "Carlos Candis -" (traço sobrando) virava "Carlos Candis - - TRIEX"

    return [n.trim(), e.trim() ? ' - ' + e.trim() : '', c.trim() ? ' (' + c.trim().replace(/\D/g, '') + ')' : ''].join('').trim();
  }
  function svPrev() { var p = SV && SV.querySelector('.sv-prev'); if (p) p.textContent = svMontar() || '—'; }
  function svAbrir(cnpjPre) { // 4.4 - cnpjPre = CNPJ pra já preencher (veio da conversa)
    var c = contatoAt; if (!c || c.grupo) return;
    svGrupos = []; svGrpMexeu = false; // 4.15 - começa sem grupo marcado
    svFornId = ''; svFornTipos = []; svFornLinhas = []; svSugF = []; // 4.60
    svModo = (resp && resp.tipo === 'fornecedor') ? 'forn' : (resp && resp.tipo === 'colega') ? 'colega' : 'cliente'; // 4.60 · 4.91 colega - vendas cadastra cliente (padrão); se a conversa já é fornecedor, começa em fornecedor
    var r = resp && resp.achou && resp.tipo === 'cliente' ? resp : null;
    svTipo = (r && r.tipoCli) || ''; // 4.24 - já vem com o tipo do cadastro
    svGueri = !!(r && r.gueri); // 4.37 / v115.2695 - selo Gueri (NF baixa) já vem marcado se o cadastro tiver
    svFatSp = !!(r && r.fatSp); // 4.39 / v115.2697 - selo Faturar por SP
    svConcMarcas = (r && r.concMarcas && r.concMarcas.length) ? r.concMarcas.slice() : []; // 4.26 - marcas da concessionária já cadastradas
    svK = r ? r.k : ''; svSug = []; svIntim = (resp && resp.intim) || ''; // 4.47
    var _rg = (r && r.grupos) || (resp && !resp.achou && resp.grupos) || null; /* 4.57 - contato com grupo (ex.: Triex) */ if (_rg) _rg.forEach(function (g) { var id = svGrupoIdDoNome(g); if (id && svGrupos.indexOf(id) < 0) svGrupos.push(id); }); // 4.27 - grupos do cadastro já marcados
    var nome = svNomeBase(c.nome) || (r && r.contato) || '', emp = svEmpBase(c.nome) || (r ? r.titulo : ''), cod = svCodBase(c.nome) || (r && r.cod) || '';
    var semNum = /^[+\d\s()\-]{8,}$/.test(c.nome || '');
    SV.className = svModo === 'forn' ? 'sv-isforn' : svModo === 'colega' ? 'sv-iscol' : 'sv-iscli'; // 4.60 · 4.91
    if (svModo === 'colega') { emp = (resp && resp.emp) || 'Triex'; }
    SV.innerHTML = '<div class="sv-cab"><b>👤 Salvar contato</b><span class="sv-x" data-acao="svFechar" title="Fechar">✕</span></div>' +
      '<div class="sv-tel">📱 ' + esc(c.tel ? fmtTel(c.tel) : 'número não aparece na conversa') + '</div>' +
      '<div class="sv-modo">' + svModoRowHtml() + '</div>' + // 4.60 - 🤝 Cliente | 🏭 Fornecedor
      '<label>NOME DA PESSOA<input class="sv-nome" value="' + esc(nome) + '" placeholder="Ex.: Tiago"></label>' +
      '<label><span class="sv-emplab">' + (svModo === 'forn' ? 'FORNECEDOR' : 'EMPRESA (cliente do PF)') + '</span><input class="sv-emp" value="' + esc(emp) + '" placeholder="' + (svModo === 'forn' ? 'Razão social do fornecedor' : 'Digite pra procurar no PF') + '" autocomplete="off"></label><div class="sv-sug"></div>' +
      '<label>CARGO<input class="sv-cargo" value="' + esc((r && r.cargo) || (resp && resp.tipo === 'colega' && resp.cargo) || (svModo === 'forn' ? 'Vendedor' : '')) + '" placeholder="Ex.: Compras, Dono, Mecânico" list="' + (svModo === 'colega' ? 'pfwa-sv-cargos-col' : 'pfwa-sv-cargos') + '"></label>' +
      '<datalist id="pfwa-sv-cargos"><option>Compras<option>Comprador<option>Dono<option>Sócio<option>Gerente<option>Financeiro<option>Mecânico<option>Encarregado<option>Vendedor<option>Balconista</datalist>' +
      '<datalist id="pfwa-sv-cargos-col">' + svCargosCol().map(function (x) { return '<option>' + esc(x); }).join('') + '</datalist>' +
      '<label class="sv-so-nc">CÓDIGO NO JBOSS<input class="sv-cod" value="' + esc(cod) + '" placeholder="Ex.: 12662" inputmode="numeric"></label>' +
      // ── fornecedor: 🏭 Trabalha com + linhas ──
      '<div class="sv-fchips sv-so-forn">' + (svModo === 'forn' ? svFornChipsHtml() : '') + '</div>' +
      // ── cliente: tipo, intimidade, marca, grupo, gueri/fat.sp ──
      '<div class="sv-so-cli">' +
      '<div class="sv-gl">TIPO DO CLIENTE</div><div class="sv-gr sv-tp">' + svTipoRowHtml() + '</div>' + // 4.24
      (function () { var jj = c ? autoJeitoDe(c.nome) : null, ap = (jj && jj.apelido) || '', sug = jeitoApSug(jj, c ? c.nome : ''); // 5.4 - 🪞
        return '<label>COMO VOCÊ CHAMA ELE <span style="font-weight:600;text-transform:none;color:#8a9ab0">(apelido nas mensagens automáticas — vazio = 1º nome)</span><input class="sv-apel" value="' + esc(ap) + '" placeholder="Ex.: Lói, meu velho, chefe"></label>' +
          (sug ? '<div class="sv-intsug sv-apsug">💡 Você costuma chamar ele de <b>' + esc(sug) + '</b> <span class="sv-lk" data-acao="svApel" data-arg="' + esc(sug) + '">usar</span></div>' : '') + jeitoResumoHtml(jj); })() +
      '<div class="sv-gl">INTIMIDADE COM ESSA PESSOA <span style="font-weight:600;text-transform:none;color:#8a9ab0">(tom das mensagens automáticas)</span></div><div class="sv-gr sv-int">' + svIntRowHtml() + '</div>' + svIntSugHtml() + // 4.47
      '<div class="sv-marca"></div>' + // 4.26 - marca da concessionária (só quando o tipo é Concessionária)
      '<div class="sv-gl">GRUPO DO CLIENTE <span style="font-weight:600;text-transform:none;color:#8a9ab0">(pode escolher mais de um)</span></div><div class="sv-gr sv-grp">' + svGruposRowHtml() + '</div>' +
      '<div class="sv-gr sv-gueri"><span class="sv-g' + (svGueri ? ' on' : '') + '" data-acao="svGueri" style="--c:#c0392b">💳 Gueri (compra com NF baixa)</span>' + // 4.37 / v115.2695
      '<span class="sv-g' + (svFatSp ? ' on' : '') + '" data-acao="svFatSp" style="--c:#1F4E79">🧾 Faturar por SP</span></div>' + // 4.39 / v115.2697
      '</div>' +
      '<label class="sv-so-nc">CNPJ <span class="sv-so-cli" style="font-weight:600;text-transform:none">(cliente novo entra como pré-cadastro 🌱)</span><input class="sv-cnpj" value="' + esc(fmtCnpj(cnpjPre || '')) + '" placeholder="00.000.000/0000-00" inputmode="numeric"></label>' +
      '<div class="sv-pv">Vai ficar: <b class="sv-prev"></b></div>' +
      '<div class="sv-k">' + (svK && r && r.titulo ? '🔗 ligado a <b>' + esc(r.titulo) + '</b>' : '') + '</div>' +
      '<div class="sv-bts"><button class="sv-ok" data-acao="svSalvar">💾 Salvar no PF</button><button class="sv-wa" data-acao="svWa" title="Só renomeia/salva o contato no WhatsApp (e no celular) — nada vai pro PF">📱 Só no WhatsApp</button></div>' +
      '<div class="sv-st"></div>';
    SV.style.display = 'block'; svAberto = true; svPos(); svPrev(); svMarcaRender(); // 4.26 - mostra a marca se já vier Concessionária
    ['sv-nome', 'sv-emp', 'sv-cod'].forEach(function (k) { var i = SV.querySelector('.' + k); if (i) i.oninput = function () { svPrev(); if (k === 'sv-emp' || (k === 'sv-cod' && !svK)) { if (k === 'sv-emp') { svK = ''; svFornId = ''; SV.querySelector('.sv-k').innerHTML = ''; } clearTimeout(svT); svT = setTimeout(function () { svBuscar(i.value); }, 250); } }; });
    var cnI = SV.querySelector('.sv-cnpj'); if (cnI) cnI.oninput = function () { var d = cnI.value.replace(/\D/g, '').slice(0, 14); cnI.value = d.length === 14 ? d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5') : d; };
    var f = SV.querySelector(nome ? '.sv-emp' : '.sv-nome'); if (f) f.focus();
  }
  async function svBuscar(q) {
    var box = SV.querySelector('.sv-sug'); if (!box) return;
    if (String(q || '').trim().length < 3 && !/^\d{2,}$/.test(String(q || '').trim())) { box.innerHTML = ''; return; }
    if (svModo === 'forn') { // 4.60 - procura fornecedor existente (evita duplicar)
      var rf = await msg({ t: 'acao', acao: 'fornSugerir', arg: { q: q } });
      svSugF = (rf && rf.l) || [];
      box.innerHTML = svSugF.map(function (s, i) { return '<div class="sv-it" data-acao="svUsarForn" data-arg="' + i + '"><b>🏭 ' + esc(s.razao) + '</b><small>' + esc([s.codigo ? 'cód. ' + s.codigo : '', s.cidade].filter(Boolean).join(' · ')) + '</small></div>'; }).join('');
      return;
    }
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
    if (inf.gueri) { svGueri = true; var _gr = SV && SV.querySelector('.sv-gueri [data-acao="svGueri"]'); if (_gr) _gr.classList.add('on'); } // 4.37 - Gueri do cadastro já marcado
    if (inf.fatSp) { svFatSp = true; var _fs = SV && SV.querySelector('.sv-gueri [data-acao="svFatSp"]'); if (_fs) _fs.classList.add('on'); } // 4.39 - Fat. SP do cadastro
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
    if (svModo === 'forn') return svSalvarForn(b, c, nomeFull, v); // 4.60
    if (svModo === 'colega') return svSalvarColega(b, c, nomeFull, v); // 4.91
    if (criar && !v('sv-emp').trim()) { flash(b, 'Escreva a empresa'); return; }
    var txt = b.textContent; b.disabled = true; b.textContent = 'Salvando…';
    var cn = v('sv-cnpj').replace(/\D/g, ''); if (cn && cn.length !== 14 && cn.length !== 11) { flash(b, 'CNPJ incompleto'); b.disabled = false; b.textContent = txt; return; }
    if (cn) b.textContent = 'Buscando o CNPJ…';
    var _gs = svGrupos.map(function (id) { var g = svGruposTodos().find(function (x) { return x[0] === id; }); return g && /^g_/.test(id) ? g[1] : id; }).filter(Boolean); // 4.15 - grupo base = chave; grupo criado = o nome
    var r = await msg({ t: 'acao', acao: 'salvarContato', arg: { tel: c.tel, nomeWa: c.nome, nome: nomeFull, pessoa: v('sv-nome'), cargo: v('sv-cargo'), k: svK, cod: v('sv-cod'), emp: v('sv-emp'), cnpj: cn, criar: !!criar, grupo: _gs[0] || '', grupos: _gs, gruposMexeu: svGrpMexeu, tipoCli: svTipo, concMarcas: svTipo === 'conc' ? svConcMarcas : [], gueri: svGueri, fatSp: svFatSp, intim: svIntim, apelido: (SV.querySelector('.sv-apel') ? v('sv-apel').trim() : undefined) } }); // 4.26 - marca da concessionária · 4.37 Gueri · 4.39 Fat. SP
    b.disabled = false; b.textContent = txt;
    var st = SV.querySelector('.sv-st');
    if (r && r.ok) {
      if (svIntim) { if (resp) resp.intim = svIntim; if (sitCache && sitCache[c.nome]) sitCache[c.nome].intim = svIntim; } // 4.47
      try { var _ap = SV.querySelector('.sv-apel'); if (_ap) { var _av = _ap.value.trim(); if (resp && contatoAt && contatoAt.nome === c.nome) { resp.jeito = resp.jeito || {}; resp.jeito.apelido = _av; } JEITO_LOC[c.nome] = JEITO_LOC[c.nome] || {}; JEITO_LOC[c.nome].apelido = _av; if (sitCache && sitCache[c.nome]) { sitCache[c.nome].jeito = sitCache[c.nome].jeito || {}; sitCache[c.nome].jeito.apelido = _av; } } } catch (e) { } // 5.4
      if (r.k && r.cli) { svK = r.k; SV.querySelector('.sv-k').innerHTML = '🔗 ligado a <b>' + esc(r.cli) + '</b>'; }
      st.innerHTML = r.cli ? ('✔ Salvo · ' + (r.prospect ? '🌱 pré-cadastro <b>' + esc(r.cli) + '</b> criado no PF' + (r.base ? ' (dados da Receita)' : '') + ' com o contato' : r.cnpjJa ? 'esse CNPJ já era de <b>' + esc(r.cli) + '</b> — contato salvo lá' : r.novo ? 'cliente <b>' + esc(r.cli) + '</b> criado no PF com o contato' : 'contato' + (v('sv-cargo') ? ' (' + esc(v('sv-cargo')) + ')' : '') + ' no cadastro de <b>' + esc(r.cli) + '</b>') + '. <span class="sv-lk" data-acao="svCadAbrir">abrir o cadastro ›</span>')
        : v('sv-emp').trim() ? ('✔ Salvo no PF. <span style="color:#9A6B00">A empresa não está no PF.</span><br><button class="sv-ok sv-cria" data-acao="svCriar">➕ Criar cliente "' + esc(v('sv-emp').trim()) + '" no PF</button>')
        : '✔ Salvo no PF (sem empresa — escreva a empresa pra ligar a um cliente).';
      ultimo = '';
      // v115.2697 - BUG (Vitor: "tô mudando o grupo e colocando revenda mas não tá gravando"): a lista só re-perguntava as situações quando a lista
      // de NOMES mudava — como o nome é o mesmo, o grupo/tipo novo não aparecia. Agora força re-perguntar ao PF depois de salvar.
      sitSig = ''; try { carregarSituacoes(); } catch (e) { }
      // 4.7 - A pedido do Vitor ("quando eu salvar aqui, tem que salvar o contato no WhatsApp também, do jeito que coloquei no nome"): já abre o
      // salvar/editar contato do próprio WhatsApp com o nome montado e aperta Salvar.
      if (!criar) Promise.resolve(waSalvarNome(nomeFull, st)).then(function () { return dormir(900); }).then(function () { if (r.k) return waEtiquetar([nomeFull, c.nome], st); }).catch(function () { });
    }
    else st.textContent = 'Não deu — abra o PartsFlow numa aba.';
  }
  // 4.91 - A pedido do Vitor ("onde coloco se o contato for aqui da empresa?" → "quero o colega da empresa"): 👔 colega = não é cliente nem
  // fornecedor; fica guardado no PF, não recebe mensagem automática e não entra nos avisos/ofertas/pedido a emitir.
  async function svSalvarColega(b, c, nomeFull, v) {
    var txt = b.textContent; b.disabled = true; b.textContent = 'Salvando…';
    var r = await msg({ t: 'acao', acao: 'salvarColega', arg: { tel: c.tel, nomeWa: c.nome, nome: nomeFull, pessoa: v('sv-nome'), cargo: v('sv-cargo'), emp: v('sv-emp') } });
    if (r && r.ok) svCargoGuardar(v('sv-cargo'));
    b.disabled = false; b.textContent = txt;
    var st = SV.querySelector('.sv-st');
    if (r && r.ok) {
      st.innerHTML = '✔ Salvo como 👔 colega da empresa (' + esc(r.emp || 'Triex') + '). Ele não recebe mensagem automática.';
      if (resp) { resp.tipo = 'colega'; resp.achou = true; } sitCache[c.nome] = { tipo: 'colega', cargo: v('sv-cargo'), emp: r.emp };
      ultimo = ''; sitSig = ''; try { carregarSituacoes(); } catch (e) { }
      Promise.resolve(waSalvarNome(nomeFull, st)).catch(function () { });
    } else st.textContent = 'Não deu — abra o PartsFlow numa aba.';
  }
  // 4.60 - grava como FORNECEDOR (cad_fornecedores_v1): razão + telefone + contato (cargo) + 🏭 Trabalha com + linhas + CNPJ + Código JBoss.
  async function svSalvarForn(b, c, nomeFull, v) {
    var razao = v('sv-emp').trim(); if (!razao) { flash(b, 'Escreva o fornecedor'); return; }
    var cn = v('sv-cnpj').replace(/\D/g, ''); if (cn && cn.length !== 14 && cn.length !== 11) { flash(b, 'CNPJ incompleto'); return; }
    var txt = b.textContent; b.disabled = true; b.textContent = 'Salvando…';
    var r = await msg({ t: 'acao', acao: 'salvarFornecedor', arg: { tel: c.tel, nomeWa: c.nome, nome: nomeFull, pessoa: v('sv-nome'), razao: razao, cargo: v('sv-cargo'), cod: v('sv-cod'), cnpj: cn, fornId: svFornId, tipos: svFornTipos.slice(), linhas: svFornLinhas.slice() } });
    b.disabled = false; b.textContent = txt;
    var st = SV.querySelector('.sv-st');
    if (r && r.ok) {
      svFornId = r.id || svFornId;
      st.innerHTML = '✔ ' + (r.novo ? 'Fornecedor <b>' + esc(r.forn) + '</b> criado no PF' + (r.codigo ? ' (cód. ' + esc(r.codigo) + ')' : '') : 'Contato salvo no fornecedor <b>' + esc(r.forn) + '</b>') + '. <span class="sv-lk" data-acao="svFornAbrir">abrir o cadastro ›</span>';
      ultimo = ''; sitSig = ''; try { carregarSituacoes(); } catch (e) { }
      Promise.resolve(waSalvarNome(nomeFull, st)).catch(function () { });
    } else st.textContent = (r && r.msg) ? r.msg : 'Não deu — abra o PartsFlow numa aba.';
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
  function waSincLigar(pan) {
    try {
      var RE = /sincronizar (o )?contato|sync contact|sincronizar no (telefone|celular)/i;
      var rotulo = null; Array.prototype.forEach.call((pan || document).querySelectorAll('span,div,label'), function (x) {
        if (waFora(x) && waVisivel(x) && !x.closest('#main') && RE.test(x.textContent || '') && !Array.prototype.some.call(x.children, function (c) { return RE.test(c.textContent || ''); })) rotulo = rotulo || x; // 4.57 - o mais de dentro (só o texto)
      });
      if (!rotulo) return 'nao';
      var p = rotulo, ch = null;
      for (var i = 0; i < 6 && p && !ch; i++) { ch = p.querySelector('[role="switch"],[role="checkbox"],input[type="checkbox"],[aria-checked]'); p = p.parentElement; }
      // 4.57 - chave sem atributo (só desenho): acha o "botãozinho" à direita do texto, na mesma altura, e liga se estiver cinza
      if (!ch) { var rr = rotulo.getBoundingClientRect(), q = rotulo; for (var j = 0; j < 5 && q; j++, q = q.parentElement) {
        var cand = Array.prototype.filter.call(q.querySelectorAll('div,span,button,label'), function (x) { var b = x.getBoundingClientRect(); return b.left > rr.right - 5 && b.width >= 26 && b.width <= 70 && b.height >= 12 && b.height <= 40 && b.top < rr.bottom + 20 && b.bottom > rr.top - 20; });
        if (cand.length) { var t = cand[0], bg = getComputedStyle(t).backgroundColor || '', m = bg.match(/\d+/g) || [], cinza = m.length >= 3 && Math.abs(m[0] - m[1]) < 25 && Math.abs(m[1] - m[2]) < 25;
          if (cinza) clicarEl(t); return 'ok'; } } return 'nao'; }
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
  // 4.42 - A pedido do Vitor (prévia: grupo embaixo da mensagem, cidade à direita, tipo embaixo — "tente"): o WhatsApp só dá a 3ª linha pra conversa COM
  // etiqueta dele. Ao salvar um cliente pelo 👤, a extensão põe a etiqueta (padrão "Cliente PF", criada uma vez no WhatsApp Business) na conversa; a etiqueta
  // fica escondida e a 3ª linha mostra grupo + tipo. Sem achar o menu/etiqueta, só avisa (nada quebra).
  var WA_ETQ = 'Cliente PF'; chrome.storage.local.get(['waEtqNome'], function (x) { if (x && x.waEtqNome) WA_ETQ = x.waEtqNome; });
  function waN(t) { return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim(); }
  // 4.56 - A pedido do Vitor (print: "agora na vdd é listas né?"): o WhatsApp Business trocou "Etiquetas" por LISTAS — botão "Adicionar à lista" no
  // cabeçalho da conversa abre as listas com caixinha. Tenta esse caminho primeiro; sem a lista "Cliente PF", cria pelo "Nova lista". Depois o jeito antigo.
  function waVisEl(el) { if (!el || !el.getClientRects().length) return false; var r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; }
  function waForaNosso(el) { return !el.closest('#pfwa,#pfwa-sv,#pfwa-menu,#pfwa-rail,#pfwa-bots,#pane-side,#msgs'); }
  function waTxtExato(alvo) {
    var achou = null, area = 1e9;
    document.querySelectorAll('span,div,label,li').forEach(function (el) {
      if (!waVisEl(el) || !waForaNosso(el)) return;
      if (waN(el.textContent) !== alvo) return;
      var r = el.getBoundingClientRect(), a = r.width * r.height; if (a < area) { area = a; achou = el; }
    });
    return achou;
  }
  function waCaixaDe(el) {
    var p = el;
    for (var i = 0; i < 5 && p; i++, p = p.parentElement) {
      var cb = p.querySelector('input[type="checkbox"],[role="checkbox"],[aria-checked]');
      if (cb) return { cb: cb, lin: p };
    }
    return { cb: null, lin: el.closest('[role="button"],li,label') || el };
  }
  function waMarcado(cb) { return !!cb && (cb.checked === true || cb.getAttribute('aria-checked') === 'true'); }
  function waBotaoTexto(re) {
    var b = null;
    document.querySelectorAll('button,[role="button"]').forEach(function (x) { if (b || !waVisEl(x) || !waForaNosso(x)) return; var t = waN((x.textContent || '') + ' ' + (x.getAttribute('aria-label') || '')); if (re.test(t)) b = x; });
    return b;
  }
  function waEsc() { try { document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true })); } catch (e) { } }
  async function waListaPeloCabecalho(aviso) {
    var hd = $('#main header'); if (!hd) return null;
    var bt = Array.prototype.find.call(hd.querySelectorAll('button,[role="button"]'), function (x) { return /adicionar a lista|add to list|listas?$/.test(waN((x.textContent || '') + ' ' + (x.getAttribute('aria-label') || '') + ' ' + (x.getAttribute('title') || ''))); });
    if (!bt) return null;
    var alvo = waN(WA_ETQ);
    clicarEl(bt);
    var nova = await esperar(function () { return waTxtExato(alvo) || waTxtExato('nova lista') || waTxtExato('new list'); }, 2500);
    if (!nova) { waEsc(); return null; }
    var lin = waTxtExato(alvo);
    if (!lin) {
      // cria a lista "Cliente PF" uma vez
      clicarEl(waTxtExato('nova lista') || waTxtExato('new list'));
      var inp = await esperar(function () { var i = null; document.querySelectorAll('[role="dialog"] input[type="text"],[role="dialog"] input:not([type]),[role="dialog"] [contenteditable="true"],[data-animate-modal-body] input,[data-animate-modal-body] [contenteditable="true"]').forEach(function (x) { if (!i && waVisEl(x) && waForaNosso(x)) i = x; }); return i; }, 2500);
      if (!inp) { waEsc(); aviso('🏷️ Não consegui criar a lista <b>' + esc(WA_ETQ) + '</b>. Crie uma vez no "Adicionar à lista" › Nova lista, com esse nome.'); return false; }
      inp.focus();
      if (inp.isContentEditable) document.execCommand('insertText', false, WA_ETQ);
      else { var set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(inp, WA_ETQ); inp.dispatchEvent(new Event('input', { bubbles: true })); }
      await dormir(300);
      var ok = waBotaoTexto(/^(criar( lista)?|salvar|concluir|ok|confirmar|create( list)?|save|done)$/) || (function () { var b = null; document.querySelectorAll('span[data-icon*="checkmark"]').forEach(function (x) { if (!b && waVisEl(x)) b = x; }); return b; })();
      if (ok) clicarEl(ok); else inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
      await dormir(900);
      lin = waTxtExato(alvo);
      if (!lin) { // a janela fechou depois de criar: abre de novo
        var bt2 = Array.prototype.find.call(($('#main header') || document).querySelectorAll('button,[role="button"]'), function (x) { return /adicionar a lista|add to list/.test(waN((x.textContent || '') + ' ' + (x.getAttribute('aria-label') || ''))); });
        if (bt2) { clicarEl(bt2); lin = await esperar(function () { return waTxtExato(alvo); }, 2500); }
      }
      if (!lin) { waEsc(); aviso('🏷️ Criei a lista? Não achei <b>' + esc(WA_ETQ) + '</b> depois — confira no "Adicionar à lista".'); return false; }
    }
    var c = waCaixaDe(lin);
    if (!waMarcado(c.cb)) clicarEl(c.cb || c.lin);
    await dormir(350);
    var salvar = waBotaoTexto(/^(salvar|save|concluir|done|ok|confirmar)$/);
    if (salvar) clicarEl(salvar); else waEsc();
    aviso('🏷️ Conversa posta na lista <b>' + esc(WA_ETQ) + '</b> (fica escondida — abre a 3ª linha com grupo e tipo).');
    return true;
  }
  async function waEtiquetar(nomes, st) {
    var aviso = function (h) { try { if (st) st.innerHTML += '<br>' + h; } catch (e) { } };
    try {
      var lr = await waListaPeloCabecalho(aviso);
      if (lr !== null) return lr;
    } catch (e) { }
    return waEtiquetarAntigo(nomes, st);
  }
  async function waEtiquetarAntigo(nomes, st) {
    var aviso = function (h) { try { if (st) st.innerHTML += '<br>' + h; } catch (e) { } };
    try {
      var row = null; (nomes || []).some(function (n) { row = n ? linhaDoNome(n) : null; return !!row; });
      if (!row) { aviso('🏷️ Não achei a conversa na lista pra pôr a etiqueta.'); return false; }
      if (row.querySelector('[aria-label^="Etiqueta"],[aria-label^="Label"]') && waN(row.textContent).indexOf(waN(WA_ETQ)) >= 0) return true;
      row.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); await dormir(300);
      var bt = row.querySelector('[aria-label*="enu"],[aria-label*="Mais"],span[data-icon="down"],span[data-icon*="chevron"],span[data-icon*="down"]');
      if (bt) clicarEl(bt); else row.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, view: window }));
      var item = await esperar(function () { return autoMenuItem(['etiquetar conversa', 'etiquetar', 'label chat', 'adicionar etiqueta', 'etiquetas']); }, 2500);
      if (!item) { document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); aviso('🏷️ Não achei "Etiquetar conversa" no menu — a etiqueta só existe no WhatsApp Business.'); return false; }
      clicarEl(item);
      var alvo = waN(WA_ETQ);
      var lin = await esperar(function () {
        var achou = null;
        document.querySelectorAll('[role="dialog"] [role="button"],[role="dialog"] li,[role="dialog"] label,[role="dialog"] [role="checkbox"],[data-animate-modal-body] div').forEach(function (el) {
          if (achou || !el.offsetParent) return; var t = waN(el.textContent); if (t && t.length <= 40 && (t === alvo || t.indexOf(alvo) >= 0)) achou = el;
        });
        return achou;
      }, 2500);
      if (!lin) { document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); aviso('🏷️ Crie uma vez no WhatsApp a etiqueta <b>' + esc(WA_ETQ) + '</b> (Configurações › Ferramentas comerciais › Etiquetas) — depois ela entra sozinha.'); return false; }
      var cb = lin.querySelector('input[type="checkbox"],[role="checkbox"],[aria-checked]') || lin.closest('[role="checkbox"],[aria-checked]');
      var marcado = cb && (cb.checked || cb.getAttribute('aria-checked') === 'true');
      if (!marcado) clicarEl(cb || lin);
      await dormir(250);
      var salvar = null;
      document.querySelectorAll('[role="dialog"] button,[role="dialog"] [role="button"],[data-animate-modal-body] button').forEach(function (b) { if (salvar || !b.offsetParent) return; var t = waN(b.textContent || b.getAttribute('aria-label')); if (/^(salvar|save|ok|concluir|confirmar)$/.test(t) || b.querySelector('span[data-icon*="checkmark"]')) salvar = b; });
      if (salvar) clicarEl(salvar); else document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      aviso('🏷️ Etiqueta <b>' + esc(WA_ETQ) + '</b> posta (fica escondida — abre a 3ª linha com grupo e tipo).');
      return true;
    } catch (e) { aviso('🏷️ Não deu pra pôr a etiqueta: ' + esc(String(e && e.message || e))); return false; }
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
    // 4.57 - BUG (print do Vitor: "salvar só no whats ainda não está salvando" — janela "Novo contato" ficou com Nome "Thiago -" / Sobrenome "Silva" do
    // próprio WhatsApp, Sincronizar desligado e sem salvar): espera a JANELA do contato (título Novo/Editar contato), escreve no campo Nome DELA e confere,
    // limpa o Sobrenome, liga o Sincronizar e aperta o botão redondo ✓ (sem texto).
    var pan = await waEsperar(waPainelContato, 4000);
    var inps = pan ? waCamposDe(pan) : null;
    if (!inps || !inps.nome) { dizer('📱 Abri o contato no WhatsApp, mas não achei o campo do nome — cole o nome (já copiado).' + waDiag()); return; }
    await dormir(400);
    // 8.6 - A pedido do Vitor (print do "Novo contato": Nome "Douglas (9109)" + Sobrenome "Melo" = código no meio; "costumo deixar Vitor Lima - Triex (1226)"):
    // o sobrenome que o WhatsApp já pôs entra logo depois do nome da pessoa e o campo é dividido assim: Nome = 1ª palavra, Sobrenome = o resto
    // (com " - Empresa (código)") → o código fica sempre no FIM, mesmo se o WhatsApp juntar Nome + Sobrenome.
    var sobAnt = inps.sobre ? waValorDe(inps.sobre).trim() : '';
    if (sobAnt && !/\d/.test(sobAnt)) {
      var mP = nomeFull.match(/^(.*?)(\s+[-–—]\s+.*|\s*\(\s*\d+\s*\)\s*)?$/), pes = (mP && mP[1] || nomeFull).trim(), resto = (mP && mP[2]) || '';
      var nn = function (s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase(); };
      if (pes && nn(pes).indexOf(nn(sobAnt)) < 0) nomeFull = (pes + ' ' + sobAnt + resto).replace(/\s+/g, ' ').trim();
    }
    try { navigator.clipboard.writeText(nomeFull); } catch (e) { }
    var nP = nomeFull, sP = '';
    if (inps.sobre) { var iSp = nomeFull.indexOf(' '); if (iSp > 0 && !/^\(/.test(nomeFull.slice(iSp + 1).trim())) { nP = nomeFull.slice(0, iSp); sP = nomeFull.slice(iSp + 1).trim(); } }
    var okN = await waEscreverConf(inps.nome, nP);
    if (inps.sobre) { var okS = await waEscreverConf(inps.sobre, sP); if (!okS && sP) { await waEscreverConf(inps.sobre, ''); okN = await waEscreverConf(inps.nome, nomeFull); } }
    if (!okN) { dizer('📱 Não consegui escrever o nome no campo do WhatsApp — o nome está copiado: clique no Nome, apague e cole (Ctrl+V), depois ✓.'); return; }
    // 4.8 - A pedido do Vitor ("já deixa a extensão ligada para isso"): liga o "Sincronizar contato no telefone" → vai pra agenda do celular também
    var sinc = waSincLigar(pan);
    await dormir(400);
    var salvar = waSalvarBotao(pan);
    if (salvar) { await dormir(300); clicarEl(salvar); dizer('📱 Salvo no WhatsApp como <b>' + esc(nomeFull) + '</b>' + (sinc === 'ok' ? ' e na agenda do celular' : sinc === 'nao' ? ' (não achei a opção "Sincronizar com celular" — confira no celular)' : '') + '.'); }
    else dizer('📱 Escrevi o nome no contato do WhatsApp — confira e aperte o ✓.' + waDiag());
  }
  function waPainelContato() {
    var tit = null;
    document.querySelectorAll('h1,h2,header,div[title],span,div').forEach(function (x) { if (tit || !waVisivel(x) || x.closest('#main,#pfwa,#pfwa-sv,#side,#pane-side')) return; if (x.children.length > 2) return; if (/^\s*(novo contato|editar contato|new contact|edit contact|adicionar contato)\s*$/i.test(x.textContent || '')) tit = x; });
    if (!tit) return null;
    var p = tit; for (var i = 0; i < 10 && p; i++, p = p.parentElement) { if (p.querySelectorAll('input,[contenteditable="true"]').length >= 2) return p; }
    return null;
  }
  function waCamposDe(pan) {
    var l = Array.prototype.filter.call(pan.querySelectorAll('input:not([type="checkbox"]):not([type="hidden"]),[contenteditable="true"]'), function (x) { return waVisivel(x) && x.type !== 'tel' && !/\d{4}/.test(x.value || ''); });
    var rot = function (x) { var p = x, t = ''; for (var i = 0; i < 4 && p && !t; i++, p = p.parentElement) { var lb = (p.getAttribute && (p.getAttribute('aria-label') || '')) + ' ' + (x.getAttribute('aria-label') || '') + ' ' + (x.getAttribute('placeholder') || ''); if (/\S/.test(lb)) t = lb; if (!t && p.previousElementSibling) t = p.previousElementSibling.textContent || ''; } return t + ' ' + (p ? (p.textContent || '').slice(0, 40) : ''); };
    var nome = null, sobre = null;
    l.forEach(function (x) { var r = rot(x); if (!sobre && /sobrenome|last name|surname/i.test(r)) sobre = x; else if (!nome && /\bnome\b|first name|\bname\b/i.test(r) && !/usu[aá]rio|user/i.test(r)) nome = x; });
    if (!nome) nome = l[0] || null; if (!sobre && l[1] && l[1] !== nome && !/usu[aá]rio|user/i.test(rot(l[1]))) sobre = l[1];
    return { nome: nome, sobre: sobre };
  }
  function waValorDe(x) { return x.tagName === 'INPUT' ? (x.value || '') : (x.textContent || ''); }
  async function waEscreverConf(inp, txt) {
    waEscrever(inp, txt); await dormir(250); if (waValorDe(inp).trim() === txt.trim()) return true;
    // 2ª tentativa: seleciona tudo e cola (o WhatsApp novo aceita colar)
    try { inp.focus(); if (inp.select) inp.select(); else document.execCommand('selectAll', false, null);
      if (!txt) { document.execCommand('delete', false, null); } else { var dt = new DataTransfer(); dt.setData('text/plain', txt); inp.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); } } catch (e) { }
    await dormir(250); if (waValorDe(inp).trim() === txt.trim()) return true;
    try { inp.focus(); if (inp.select) inp.select(); else document.execCommand('selectAll', false, null); document.execCommand(txt ? 'insertText' : 'delete', false, txt || null); } catch (e) { }
    await dormir(250); return waValorDe(inp).trim() === txt.trim();
  }
  function waSalvarBotao(pan) {
    var achou = null;
    (pan || document).querySelectorAll('button,[role="button"],span[data-icon],div[aria-label]').forEach(function (x) {
      if (achou || !waVisivel(x) || x.closest('#main,#pfwa,#pfwa-sv')) return;
      var lb = ((x.getAttribute('aria-label') || '') + ' ' + (x.getAttribute('title') || '') + ' ' + (x.textContent || '')).trim(), ic = x.getAttribute('data-icon') || ((x.querySelector && x.querySelector('[data-icon]')) ? x.querySelector('[data-icon]').getAttribute('data-icon') : '');
      if (/^(salvar|save|concluir|done|confirmar)$/i.test(lb) || /checkmark|check-light|done/i.test(ic || '')) achou = x.closest('button,[role="button"]') || x;
    });
    return achou;
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
    if (!main || !contatoAt) { B.style.display = 'none'; if (AV) AV.style.display = 'none'; if (OF) OF.style.display = 'none'; if (JA) JA.style.display = 'none'; if (VF) VF.style.display = 'none'; if (PE) PE.style.display = 'none'; return; }
    var r = main.getBoundingClientRect(), foot = main.querySelector('footer'), fh = foot ? foot.getBoundingClientRect().height : 62, hd = main.querySelector('header'), hh = hd ? hd.getBoundingClientRect().height : 60;
    B.className = (visual === 'D' ? 'pfwa-barra' : 'pfwa-coluna') + (botsMin ? ' pfwa-min' : ''); B.style.display = CFG.bots ? 'flex' : 'none';
    if (botsMin) { B.innerHTML = '<span data-acao="botsToggle" class="pri pfwa-botspf" title="Mostrar os bot\u00f5es do PF">' + logoSvg('#fff', '#0F1F35', 30) + '</span>'; }
    else { var tog = '<span data-acao="botsToggle" class="pfwa-botsx" title="Esconder os bot\u00f5es do PF">' + (visual === 'D' ? '\u2039' : '\u25B4') + '</span>'; B.innerHTML = tog + BOTOES.map(function (b, i) { var off = b[0] === 'audio' && CFG.audio === false; var tt = b[0] === 'audio' ? ('Descrever áudios: ' + (off ? 'DESLIGADO — clique pra ligar' : 'ligado — clique pra desligar')) : b[2]; return '<span data-acao="b-' + b[0] + '" class="' + (i === 0 ? 'pri' : '') + (off ? ' pfwa-boff' : '') + '" title="' + tt + (b[0] === 'cot' ? '' : ' · botão direito: trocar o ícone') + '">' + (visual === 'D' ? b[1] + ' ' + b[2] : icoHtml(b[0], b[1])) + '</span>'; }).join(''); }
    marcaCot();
    // 3.5 - A pedido do Vitor ("esse PF aí, desbloqueia pra eu poder colocar ele pra cima ou pra baixo"): arrastar a coluna/barra (ou o PF minimizado)
    // muda a altura; guardada por navegador (chrome.storage.local botsDy) e presa dentro da conversa.
    var baseTop = visual === 'D' ? (r.bottom - fh - 58) : (r.top + hh + 70);
    var bh = B.getBoundingClientRect().height || 40, minT = r.top + hh + 6, maxT = r.bottom - fh - bh - 6;
    var tp = Math.max(minT, Math.min(maxT, baseTop + (botsDy[visual] || 0)));
    B.style.left = (visual === 'D' ? (r.left + r.width / 2) : (r.left + 12)) + 'px'; B.style.top = tp + 'px';
    B._pfBase = baseTop; B._pfMin = minT; B._pfMax = maxT;
    if (AV) { AV.style.left = (r.left + 70) + 'px'; AV.style.width = Math.max(260, r.width - 140) + 'px'; AV.style.top = (r.top + hh + 10) + 'px'; }
    if (QK && QK.style.display === 'block') { var bb = B.getBoundingClientRect(); QK.style.left = (visual === 'D' ? Math.max(r.left + 10, bb.left) : bb.right + 8) + 'px'; QK.style.top = (visual === 'D' ? Math.max(r.top + hh + 6, bb.top - QK.offsetHeight - 8) : Math.max(r.top + hh + 6, Math.min(bb.top, r.bottom - fh - QK.offsetHeight - 8))) + 'px'; }
    if (ASK && ASK.style.display === 'block') { ASK.style.left = (r.left + 70) + 'px'; ASK.style.width = Math.max(300, Math.min(520, r.width - 140)) + 'px'; ASK.style.bottom = (window.innerHeight - r.bottom + fh + 10) + 'px'; }
    if (OF) { OF.style.left = (r.left + 70) + 'px'; OF.style.width = Math.max(300, Math.min(560, r.width - 140)) + 'px'; OF.style.top = (r.top + hh + (AV && AV.style.display === 'flex' ? 64 : 10)) + 'px'; }
    if (JA) { JA.style.left = (r.left + 16) + 'px'; JA.style.width = Math.max(300, r.width - 32) + 'px'; JA.style.bottom = (window.innerHeight - r.bottom + fh + 8) + 'px'; }
    if (VF && VF.style.display === 'flex') { VF.style.left = (r.left + 16) + 'px'; VF.style.width = Math.max(300, r.width - 32) + 'px'; VF.style.bottom = (window.innerHeight - r.bottom + fh + 8 + (JA && JA.style.display === 'flex' ? 70 : 0)) + 'px'; }
    if (PE && PE.style.display === 'flex') { PE.style.left = (r.left + 16) + 'px'; PE.style.width = Math.max(300, r.width - 32) + 'px'; PE.style.bottom = (window.innerHeight - r.bottom + fh + 8 + (JA && JA.style.display === 'flex' ? 70 : 0) + (VF && VF.style.display === 'flex' ? 70 : 0)) + 'px'; } // 4.62 - empilha acima do VF
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
    // 4.71 - A pedido do Vitor ("pq não aparece dados do cliente aqui?" — painel "Abra o PartsFlow" com o selo ● Conectado): o painel perguntava "quem é" ao PF
    // UMA vez só, ao abrir a conversa; se o PF ainda estava carregando (modo monitor recarrega por dentro), a resposta vinha vazia e ficava presa no erro.
    // Agora, com erro na tela, pergunta de novo a cada 5 s até o PF responder.
    if (chave === ultimo && resp && resp.erro && resp.erro !== 'recarregar' && Date.now() - (window._pfwaQuemTent || 0) > 5000) { window._pfwaQuemTent = Date.now(); ultimo = ''; }
    if (chave === ultimo) { pintaAviso(nCod); ofertasVigiar(); digitandoVigiar(); verificarVigiar(); pedidoVigiar(); cumpridoVigiar(); jeitoVigiar(); frotaVigiar(); materialVigiar(); aprVigiar(); return; }
    ultimo = chave; cot = null; cotErro = ''; saldoR = null; ofPend = []; ofSig = ''; jaR = null; digAnt = ''; jaFechado = ''; vfR = null; vfSig = ''; peR = null; peSig = ''; askL = []; askSig = { fr: '', mat: '' }; if (QK) QK.style.display = 'none'; askPinta(); pintaOferta(); pintaJa(); pintaVf(); pintaPe();
    if (!c) { resp = null; pinta(); pintaAviso(0); return; }
    if (c.grupo) { resp = { grupo: 1 }; pinta(); return; }
    resp = null; pinta();
    var r = await msg({ t: 'quem', tel: c.tel, nome: c.nome });
    if (chave !== ultimo) return; resp = r || { erro: 'semResposta' }; // 4.71 - resposta vazia não é "PF fechado" (o selo diz se está conectado)
    if (aba === 'cli' && resp.tipo !== 'cliente' && resp.tipo !== 'fornecedor') aba = 'cot';
    pinta(); pintaAviso(nCod); ofertasVigiar();
  }

  // ═══ 4.78 - A pedido do Vitor ("quero uns botões aqui: NEGATIVO, SEM CADASTRO, ZEROU… botão de avise-me… cliente consumidor passar o modelo
  // de uma máquina ou componente, já perguntar se quero pôr na frota… falar que vou mandar o portfólio, já perguntar se pode mandar… agilidade") ═══
  // 🏷️ RESPOSTA CURTA: o botão da coluna abre as palavras; com código selecionado (ou pelo botão direito numa mensagem com códigos) sai "COD - PALAVRA"
  var qkPal = ['NEGATIVO', 'SEM CADASTRO', 'ZEROU'], qkCods = null;
  chrome.storage.local.get(['qkPal'], function (s) { if (Array.isArray(s.qkPal) && s.qkPal.length) qkPal = s.qkPal; });
  function qkAbrir(cods) { if (!QK) return; qkCods = cods && cods.length ? cods.map(function (c) { return String(c || '').trim().split(/\s+/)[0].slice(0, 30); }).filter(Boolean) : null; qkPinta(); }
  function qkPinta() {
    if (!QK) return;
    var chips = function (c) { return qkPal.map(function (w) { return '<span data-acao="qk" data-c="' + esc(c) + '" data-arg="' + esc(w) + '" class="pfwa-qkc">' + esc(w) + '</span>'; }).join(''); };
    QK.innerHTML = '<div class="pfwa-qkt"><b>🏷️ Resposta curta</b><span data-acao="qkEdit" class="pfwa-qke" title="Trocar as palavras">✏️</span><span data-acao="qkX" class="pfwa-qke" title="Fechar (Esc)">✕</span></div>' +
      (qkCods ? qkCods.map(function (c) { return '<div class="pfwa-qkl"><b>' + esc(c) + '</b>' + chips(c) + '</div>'; }).join('') : '<div class="pfwa-qkl">' + chips('') + '</div><div class="pfwa-qkd">Dica: selecione o código na mensagem antes de clicar e sai "5-515X - NEGATIVO".</div>');
    QK.style.display = 'block'; posicionar();
  }
  function qkUsar(cod, w) {
    var cx = caixaTexto(); if (!cx) { audToast('Abra uma conversa'); return; }
    var tem = (cx.innerText || '').trim().length > 0, linha = (cod ? cod + ' - ' : '') + w;
    try { cx.focus(); var rg = document.createRange(); rg.selectNodeContents(cx); rg.collapse(false); var sl = window.getSelection(); sl.removeAllRanges(); sl.addRange(rg); } catch (e) { }
    escreverNaCaixa((tem ? (cod ? '\n' : ' ') : '') + linha);
    if (qkCods) { qkCods = qkCods.filter(function (c) { return c !== cod; }); if (!qkCods.length) QK.style.display = 'none'; else qkPinta(); }
    else QK.style.display = 'none';
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && QK && QK.style.display === 'block') { QK.style.display = 'none'; e.stopPropagation(); } }, true);
  document.addEventListener('mousedown', function (e) { if (QK && QK.style.display === 'block' && !e.target.closest('#pfwa-qk, #pfwa-bots, .pfwa-wm')) QK.style.display = 'none'; }, true);
  // 🔔 AVISE-ME: códigos do texto (seleção, mensagem ou o que o cliente mandou) → Avise-me do PF com o cliente da conversa
  async function aviseMe(texto) {
    texto = String(texto || '').trim(); if (!texto) { audToast('Selecione o código (ou clique com o botão direito na mensagem)'); return; }
    var r = await msg({ t: 'acao', acao: 'aviseMe', arg: { texto: texto, k: resp && resp.k, contato: (contatoAt && contatoAt.nome) || '', tel: (contatoAt && contatoAt.tel) || '' } });
    if (!r || r.erro) { audToast('O PF não respondeu — dê F5 na aba do PartsFlow'); return; }
    if (!r.ok) { audToast(r.msg || 'Não achei código'); return; }
    var nov = (r.itens || []).filter(function (x) { return !x.ja; }), ja = (r.itens || []).filter(function (x) { return x.ja; });
    audToast((nov.length ? '🔔 Avise-me: ' + nov.map(function (x) { return x.cod + (x.marca ? ' ' + x.marca : ''); }).join(', ') + (r.cliente ? ' — ' + r.cliente : '') : '') + (ja.length ? (nov.length ? ' · ' : '🔔 ') + ja.map(function (x) { return x.cod; }).join(', ') + ' já estava' : ''));
  }
  // 🚜 FROTA e 📎 PORTFÓLIO: cartão de pergunta em cima da caixa de texto (fila; um por vez)
  function askPinta() {
    if (!ASK) return; var q = askL[0];
    if (!q || !contatoAt) { ASK.style.display = 'none'; return; }
    var mais = askL.length > 1 ? ' <small>(+' + (askL.length - 1) + ')</small>' : '';
    if (q.tipo === 'frota') ASK.innerHTML = '<div class="pfwa-askt">🚜 ' + (q.comp ? 'Componente' : 'Máquina') + ' citada: <b>' + esc([q.marca, q.modelo].filter(Boolean).join(' ')) + '</b>' + (q.equip ? ' <small>(' + esc(String(q.equip).toLowerCase()) + ')</small>' : '') + mais + '</div>' +
      '<div class="pfwa-asks">Pôr na frota de ' + esc(q.cliente || 'esse cliente') + '?</div>' +
      '<div class="pfwa-askb"><button data-acao="ask" data-arg="0" data-o="sim" class="ok">✔ Pôr na frota</button><button data-acao="ask" data-arg="0" data-o="nao">Não é dele</button><button data-acao="ask" data-arg="0" data-o="x">Agora não</button></div>';
    else if (q.tipo === 'mat') ASK.innerHTML = '<div class="pfwa-askt">📎 Você falou em mandar ' + esc(q.palavra || 'o material') + mais + '</div>' +
      (q.ja ? '<div class="pfwa-asks" style="background:#FFF4E5;border-radius:6px;padding:4px 7px;color:#7a4a10;font-weight:700">⚠ Você já mandou ' + esc(q.ja.nome || q.palavra) + ' pra ele em ' + esc(q.ja.data) + ' (' + esc(q.ja.quando) + ')' + (q.ja.n > 1 ? ' · ' + q.ja.n + ' vezes' : '') + '</div>' : '') + // 4.93
      (q.mats.length ? '<div class="pfwa-asks">Mando agora?</div><div class="pfwa-askb">' + q.mats.map(function (m, i) { return '<button data-acao="ask" data-arg="0" data-o="m' + i + '" class="ok">📎 Mandar ' + esc(m.nome) + '</button>'; }).join('') + '<button data-acao="ask" data-arg="0" data-o="x">Agora não</button></div>'
        : '<div class="pfwa-asks">Não achei esse arquivo no PF. Cadastre em <b>Atalhos de Texto</b> (tipo arquivo, ex.: "Portfólio") e da próxima vez ele vai sozinho.</div><div class="pfwa-askb"><button data-acao="ask" data-arg="0" data-o="atalhos" class="ok">Abrir Atalhos de Texto</button><button data-acao="ask" data-arg="0" data-o="x">Fechar</button></div>');
    ASK.style.display = 'block'; posicionar();
  }
  async function askAcao(i, o) {
    var q = askL[i]; if (!q) return; askL.splice(i, 1);
    if (q.tipo === 'frota') {
      if (o === 'sim') { var r = await msg({ t: 'acao', acao: 'frotaPor', arg: { k: q.k, marca: q.marca, modelo: q.modelo, equip: q.equip } }); audToast(r && r.ok ? (r.ja ? 'Já estava na frota' : '🚜 ' + q.modelo + ' foi pra frota do cliente' + (r.tipo ? ' (' + r.tipo + ')' : '')) : ((r && r.msg) || naoDeu())); }
      else if (o === 'nao') msg({ t: 'acao', acao: 'frotaNao', arg: { k: q.k, chave: q.chave } });
      askNao['fr|' + q.k + '|' + q.chave] = 1;
    }
    if (q.tipo === 'mat') {
      if (o === 'atalhos') msg({ t: 'acao', acao: 'atalhosAbrir', focar: true, arg: {} });
      else if (/^m\d$/.test(o)) materialMandar(q.mats[+o.slice(1)]);
    }
    askPinta();
  }
  async function frotaVigiar() {
    if (!CFG.frota || !resp || resp.tipo !== 'cliente' || !resp.k || !contatoAt || contatoAt.grupo) return;
    var ms = lerMensagens().filter(function (m) { return !m.eu; }).slice(-8); if (!ms.length) return;
    var sig = ultimo + '|' + ms.length + '|' + (ms[ms.length - 1].t || '').slice(-60); if (sig === askSig.fr) return; askSig.fr = sig;
    var ch = ultimo, r = await msg({ t: 'acao', acao: 'frotaDetectar', arg: { k: resp.k, msgs: ms } });
    if (ch !== ultimo || !r || !Array.isArray(r.l)) return;
    r.l.forEach(function (x) { if (askNao['fr|' + resp.k + '|' + x.chave] || askL.some(function (q) { return q.tipo === 'frota' && q.chave === x.chave; })) return;
      askL.push({ tipo: 'frota', k: resp.k, chave: x.chave, marca: x.marca, modelo: x.modelo, equip: x.equip, comp: x.comp, cliente: r.cliente }); });
    askPinta();
  }
  var MAT_RE = /(portf?i?olio|portifolio|catalogo|tabela|folheto|apresentacao|institucional|lancamento)/;
  async function materialVigiar() {
    if (!CFG.mat || !contatoAt || contatoAt.grupo) return;
    var ms = lerMensagensDoc(); if (!ms.length) return; var last = ms[ms.length - 1], t = peNorm(last.t || '');
    if (last.doc || !MAT_RE.test(t)) return;
    var meu = last.eu && /(mand|envi|pass|encaminh|segue|sigo)/.test(t), pediu = !last.eu && PROM_CLI_RE.test(t);
    if (!meu && !pediu) return;
    var sig = ultimo + '|' + ms.length + '|' + t.slice(0, 80); if (sig === askSig.mat || askNao['mat|' + sig]) return; askSig.mat = sig; askNao['mat|' + sig] = 1;
    var ch = ultimo, r = await msg({ t: 'acao', acao: 'materialDe', arg: { texto: last.t, k: resp && resp.k } });
    if (ch !== ultimo || !r || !r.ok) return;
    if (!r.mats.length && !meu) return; // o cliente pediu e não tem arquivo cadastrado: o 📨 lembrete já cuida
    askL.push({ tipo: 'mat', mats: r.mats || [], palavra: r.palavra || 'o material', ja: r.ja || null, k: resp && resp.k }); askPinta();
  }
  async function materialMandar(m) {
    if (!m) return; audToast('📎 Pegando ' + m.nome + ' no PF…');
    var r = await msg({ t: 'acao', acao: 'materialArq', arg: { id: m.id } });
    if (!r || !r.ok || !r.data) { audToast((r && r.msg) || 'O PF não respondeu — dê F5 na aba do PartsFlow'); return; }
    var kM = resp && resp.k;
    if (motorOk || await motorChecar()) {
      var e = await motor('enviarArq', { data: r.data, nome: r.nome, mime: r.mime }, 120000);
      if (e && e.ok) { audToast('✔ ' + r.nome + ' enviado'); if (kM) msg({ t: 'acao', acao: 'materialEnviado', arg: { id: m.id, k: kM, nome: r.nome } }); return; }
    }
    // sem o motor: cola o arquivo na conversa — o WhatsApp abre a prévia e você aperta enviar
    try {
      var mm = String(r.data).match(/^data:([^;]+);base64,(.*)$/), bin = atob(mm[2]), u8 = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      var f = new File([u8], r.nome, { type: mm[1] }), dt = new DataTransfer(); dt.items.add(f);
      var cx = caixaTexto(); if (!cx) throw new Error('sem caixa'); cx.focus();
      cx.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
      audToast('📎 ' + r.nome + ' na conversa — confira e aperte enviar'); if (kM) msg({ t: 'acao', acao: 'materialEnviado', arg: { id: m.id, k: kM, nome: r.nome } });
    } catch (x) { audToast('Não consegui pôr o arquivo na conversa (' + (x.message || x) + ')'); }
  }
  // ═══ 💡 OFERTAS (1.8) ═══
  // Você ofereceu algo (peça, família, marca) e o cliente respondeu → cartão pra salvar a resposta na ficha (1 clique).
  var RESP = [['quer', '👍', 'Quer'], ['pensa', '🤔', 'Vai pensar'], ['agoranao', '👎', 'Agora não'], ['caro', '💲', 'Achou caro'], ['naousa', '🚫', 'Não usa'], ['outro', '🏷️', 'Compra de outro']];
  async function ofertasVigiar() {
    if (!CFG.ofertas || !resp || resp.tipo !== 'cliente' || !resp.k || !contatoAt || contatoAt.grupo) { if (ofPend.length) { ofPend = []; pintaOferta(); } return; }
    var ms = lerMensagensDoc(); var sig = ultimo + '|' + ms.length + '|' + (ms.length ? (ms[ms.length - 1].t || '').slice(-60) + (ms[ms.length - 1].doc || '') : ''); // 4.77 - com arquivo
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
  // 9.4 - 🧠 Aprender com você (passo 1: SÓ registrar): último bloco do cliente → a SUA 1ª resposta logo depois → manda pro PF (acao aprender)
  function aprHash(t) { var h = 0; t = String(t || ''); for (var i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0; return h.toString(36); }
  var aprFeitos = {}; try { aprFeitos = JSON.parse(sessionStorage.getItem('pfwa_apr') || '{}') || {}; } catch (e) { aprFeitos = {}; }
  async function aprVigiar() {
    try {
      if (CFG.apr === false || !contatoAt || contatoAt.grupo || !resp || !resp.k) return;
      var ms = lerMensagensDoc(); if (!ms || ms.length < 2) return;
      // acha a última resposta SUA que veio logo depois de um bloco do cliente
      var j = -1; for (var i = ms.length - 1; i > 0; i--) { if (ms[i].eu && !ms[i - 1].eu) { j = i; break; } }
      if (j < 0) return;
      var r = ms[j], blo = []; for (var k = j - 1; k >= 0 && !ms[k].eu; k--) blo.unshift(ms[k]);
      var ped = blo.map(function (m) { return m.t || (m.doc ? '📎 ' + m.doc : ''); }).filter(Boolean).join('\n').slice(0, 400);
      var res = String(r.t || '').slice(0, 400), arq = r.doc || '';
      if (!ped || (!res && !arq)) return;
      var sig = ultimo + '|' + aprHash(ped + '|' + res + '|' + arq);
      if (aprFeitos[sig]) return; aprFeitos[sig] = Date.now();
      try { var ks = Object.keys(aprFeitos); if (ks.length > 300) ks.sort(function (a, b) { return aprFeitos[a] - aprFeitos[b]; }).slice(0, 100).forEach(function (x) { delete aprFeitos[x]; }); sessionStorage.setItem('pfwa_apr', JSON.stringify(aprFeitos)); } catch (e) { }
      var ag = Date.now(), ac = (aprAcoes[ultimo] || []).filter(function (x) { return ag - x.ts < 15 * 60000; });
      aprAcoes[ultimo] = [];
      msg({ t: 'acao', acao: 'aprender', arg: { k: resp.k, nome: contatoAt.nome, pedido: ped, resposta: res, arq: arq, acoes: ac } });
    } catch (e) { }
  }
  // 9.5 - A pedido do Vitor ("isso veio pro CRM… mas a conclusão do assunto? minha resposta não vai?" → opção A): depois de um "vou verificar" seu,
  // a 1ª mensagem SUA que vem depois (com conteúdo, não automática) vira a conclusão do 📌 — o PF fecha a pendência e grava a resposta na ficha.
  var VF_CURTA_RE = /^(ok|okay|blz|beleza|certo|sim|n[aã]o|valeu|vlw|obrigad[oa]|obg|tmj|bom dia|boa tarde|boa noite|opa|ol[aá]|oi|👍|🙏)[\s!.,]*$/i;
  function vfEhVerif(t) { try { return VERIF_RE.test(t) || !!(vfReX && vfReX.test(peNorm(t))); } catch (e) { return VERIF_RE.test(t); } }
  var vfRespFeitos = {}; try { vfRespFeitos = JSON.parse(sessionStorage.getItem('pfwa_vfresp') || '{}') || {}; } catch (e) { vfRespFeitos = {}; }
  function vfRespVigiar(ms) {
    try {
      var iv = -1; for (var i = ms.length - 1; i >= 0; i--) { if (ms[i].eu && vfEhVerif(ms[i].t)) { iv = i; break; } }
      if (iv < 0) return;
      var nm = contatoAt && contatoAt.nome, auto = String((nm && autoUlt[nm]) || '').trim(), r = null;
      for (var j = iv + 1; j < ms.length; j++) { var m = ms[j], t = String(m.t || '').trim();
        if (!m.eu || !t || vfEhVerif(t) || (auto && t === auto) || t.length < 6 || VF_CURTA_RE.test(t)) continue; r = m; break; }
      if (!r) return;
      var sig = ultimo + '|' + aprHash(ms[iv].t + '|' + r.t);
      if (vfRespFeitos[sig]) return; vfRespFeitos[sig] = Date.now();
      try { sessionStorage.setItem('pfwa_vfresp', JSON.stringify(vfRespFeitos)); } catch (e) { }
      msg({ t: 'acao', acao: 'verificarResp', arg: { k: resp && resp.k, nome: nm, pergunta: String(ms[iv].t).slice(0, 300), texto: String(r.t).slice(0, 400), q: r.q || 0 } });
    } catch (e) { }
  }
  async function verificarVigiar() {
    if (!CFG.verif || !contatoAt || contatoAt.grupo) { if (vfR) { vfR = null; pintaVf(); } return; }
    var ms = lerMensagens(); if (!ms.length) return;
    vfRespVigiar(ms);
    var last = ms[ms.length - 1];
    if (!last.eu) return;
    await peConfig(); if (!crmLig('verif')) return; var _nv = peNorm(last.t);
    if (!(VERIF_RE.test(last.t) || (vfReX && vfReX.test(_nv))) || (vfReNao && vfReNao.test(_nv))) return;
    var sig = ultimo + '|' + ms.length + '|' + last.t.slice(0, 80);
    if (sig === vfSig) return; vfSig = sig;
    var ch = ultimo;
    var r = await msg({ t: 'acao', acao: 'verificar', arg: { k: resp && resp.k, nome: contatoAt.nome, texto: last.t, msgs: ms } });
    if (ch !== ultimo || !r || !r.ok) return;
    if (r.jaTinha) { vfR = null; pintaVf(); return; }
    r._txt = last.t; vfR = r; pintaVf();
  }
  function pintaVf() {
    if (!VF) return;
    VF.style.display = 'none'; // 4.72 - faixa saiu: vira selo na mensagem + contador (B+D)
    if (!vfR || !contatoAt) return;
    anAdd('vf', vfR, vfR._txt || ''); return;
    VF.style.display = 'flex';
    VF.innerHTML = '<span class="pfwa-vf-i">📌</span><div><b>Anotei pra você verificar</b><br><small>' + esc(vfR.resumo || '') + ' — vai pras Pendências, ☀️ Meu dia e ficha</small></div><button data-acao="vfDesfazer" data-arg="' + esc(vfR.id) + '">desfazer</button><span data-acao="vfX" class="pfwa-avx" title="Fechar">✕</span>';
    posicionar();
  }
  // ═══ 📦 PEDIDO A EMITIR (4.62) ═══
  // Config (palavras + liga/desliga + de quem) vem do PF (acao extCfg). Quando o cliente pede ("manda pra mim") ou você promete
  // ("mando hoje"), o PF cria um lembrete pra hoje. Cartão verde "📦 Anotei pra emitir — desfazer" + contador na barra de cima.
  // 4.76 - A pedido do Vitor ("como faço para isso entrar no meu dia? combinei de mandar na quarta feira" — "te mando na quarta feira então"):
  // promessa de mandar com dia marcado (hoje/amanhã/dia da semana/dia N) também vira lembrete, além das palavras da lista.
  var PE_PROMESSA_RE = /(^|[^a-z])(te\s+|lhe\s+|vou\s+)?(mando|envio|emito|despacho|faturo|separo|entrego|mandar|enviar|despachar)\b[^.?!\n]{0,30}?\b(hoje|amanha|segunda|terca|quarta|quinta|sexta|sabado|dia\s+\d{1,2})\b/;
  // 4.94 - A pedido do Vitor ("E segunda faturo e te mando" não foi pro Meu dia): o dia pode vir ANTES do verbo
  var PE_PROMESSA2_RE = /(^|[^a-z])(hoje|amanha|segunda|terca|quarta|quinta|sexta|sabado|dia\s+\d{1,2})(\s+(cedo|de\s+manha|a\s+tarde|feira))?\b[^.?!\n]{0,20}?\b(eu\s+)?(te\s+|lhe\s+|ja\s+)?(mando|envio|emito|despacho|faturo|separo|entrego|tiro)\b/;
  function pePromessa(n) { return PE_PROMESSA_RE.test(n) || PE_PROMESSA2_RE.test(n); }
  var PE_MAT_RE = /\b(tabela|catalogos?|portfolio|portifolio|fotos?|videos?|link|folheto|material|desenho|medidas?|ficha|lista|orcamento|cotacao|precos?|arquivo|pdf|data ?sheet)\b/; // 10.0
  var PE_EMIT_RE = /pedid|\bnota\b|\bnf\b|fatur|emit|danfe|\bpv\b/; // 4.77 - fala de pedido/nota = 📦 emitir
  var PROM_MIM_RE = /(^|[^a-z])(ja\s+te\s+(mando|envio|passo)|te\s+(mando|envio|passo|encaminho)|vou\s+te\s+(mandar|enviar|passar|encaminhar)|vou\s+(mandar|enviar|passar|encaminhar)|ja\s+(mando|envio|encaminho)|(mando|envio)\s+(ja|agora|daqui|em\s+seguida|logo)|daqui\s+a\s+pouco\s+(te\s+)?(mando|envio)|assim\s+que\s+(eu\s+)?(tiver|chegar|conseguir)[^.?!]{0,30}(mando|envio|passo))\b/;
  var PROM_CLI_RE = /\b(me\s+)?(manda|mande|mandar|envia|envie|enviar|passa|passe|passar|encaminha)\s+(pra\s+mim\s+|pra\s+gente\s+)?(o|a|os|as|um|uma|seu|sua)?\s*(tabela|catalogo|catalogos|portfolio|portifolio|foto|fotos|orcamento|cotacao|preco|precos|lista|ficha|desenho|medida|medidas|video|link|folheto|material)\b/;
  function peNorm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\bhj\b/g, 'hoje').replace(/\b(amnh|amanh)\b/g, 'amanha').replace(/\bvc\b/g, 'voce'); } // 10.0 - "despachar hj" = "despachar hoje"
  function peMontaRe(arr) {
    if (!arr || !arr.length) return null;
    var ps = arr.map(function (w) { return peNorm(w).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'); }).filter(Boolean);
    if (!ps.length) return null; try { return new RegExp('(^|[^a-z0-9])(' + ps.join('|') + ')([^a-z0-9]|$)', 'i'); } catch (e) { return null; }
  }
  var crmCfg = null, peReNao = null, vfReX = null, vfReNao = null, prReNao = null;
  function crmLig(sec, campo) { var s = crmCfg && crmCfg[sec]; if (!s) return true; return s[campo || 'ligado'] !== false; }
  async function peConfig() {
    if (peCfg && Date.now() - peCfgTs < 60000) return peCfg;
    try { var r = await msg({ t: 'acao', acao: 'extCfg' }); if (r && r.pedido) { peCfg = r.pedido; peReMim = peMontaRe(peCfg.palavrasMim); peReCli = peMontaRe(peCfg.palavrasCliente); peCfgTs = Date.now();
      // 9.3 - 📒 O que vai pro CRM (config do gestor no PF): frases que NÃO contam, frases a mais do Vou verificar, liga/desliga de cada tipo
      var M = r.crm || {}; crmCfg = M; peReNao = peMontaRe(M.pedidoNao); vfReX = peMontaRe(M.verif && M.verif.palavras); vfReNao = peMontaRe(M.verif && M.verif.nao); prReNao = peMontaRe(M.prom && M.prom.nao); } } catch (e) { }
    return peCfg;
  }
  // 4.69 - A pedido do Vitor ("tem cliente que costuma fazer o pedido do mesmo jeito… dá pra entender como pedido?"): "favor confirmar o pedido abaixo /
  // 03 PC 53-484 PONTEIRA 173,28 / TOTAL 519,84" — palavra PEDIDO (aceita "pedidp") + linha com código + valor, ou TOTAL com valor = pedido do cliente.
  // 4.87 - A pedido do Vitor (áudio "deixa esse pedido lá no balcão… vou retirar": "isso foi uma confirmação de pedido"): jeito falado de confirmar.
  function peConfirmaFalado(t) {
    var n = peNorm(t);
    if (/\bvou (retirar|buscar|pegar)\b|\b(pode|podem) (separar|fechar|faturar|tirar|emitir|mandar|despachar)\b|\bconfirm(o|ado|ada|ando|ar)\b/.test(n) && /\b(pedido|pecas?|material|nota|itens|cotacao|orcamento|isso|tudo)\b/.test(n)) return true;
    return /\bpedido\b/.test(n) && /\b(deix\w*|separ\w*|retir\w*|busc\w*|fech\w*|fatur\w*|tir\w*|emit\w*|despach\w*)\b/.test(n);
  }
  // 4.88 - nome de arquivo que é pedido do cliente (Pedido_014224triex.pdf, OC 123, ordem de compra)
  var PE_DOC_PED_RE = /pedid|ordem.?de.?compra|\boc[\s_-]*\d|\bpc[\s_-]*\d/i;
  function peDocPedidoCli() { // PDF de pedido do cliente que chegou DEPOIS da sua última mensagem
    try { var els = msgLinhas(); for (var i = els.length - 1; i >= 0 && i >= els.length - 12; i--) { var b = els[i]; if (minhaEl(b)) return null;
      var m = String(b.innerText || '').match(/([^\n]+?\.pdf)\b/i); if (m && PE_DOC_PED_RE.test(m[1])) return m[1].trim(); } } catch (e) { } return null;
  }
  // 5.8 - A pedido do Vitor ("não se ligou que era um pedido né?" — "Me envia 03 luvas 03-312 da TX amanhã por favor"): pedido direto, sem a palavra PEDIDO:
  // verbo de mandar/separar/faturar + quantidade + código. Pergunta de preço/estoque ("tem?", "quanto", "valor", "cota") não conta (é cotação).
  function pePedidoDireto(t) {
    var n = peNorm(t);
    if (/\?|\bquanto\b|\bvalor\b|\bpreco\b|\bcot[ae]\w*|\borcamento\b|\btem (ai|disponivel|estoque)\b|\btem\b.*\?/.test(n)) return false;
    if (!/\b(me )?(envi\w*|mand\w*|separ\w*|fatur\w*|despach\w*|emit\w*|reserv\w*|segur\w*|quero|vou querer|vou levar|levo|pode (enviar|mandar|separar|faturar))\b/.test(n)) return false;
    var temQtd = /\b\d{1,3}\s*(x|un|und|unid\w*|pc|pcs|pcs?|pecas?|jg|jogos?|kits?|cx|caixas?)?\s+[a-z]{3,}/.test(n) || /\b\d{1,3}\s*(un|und|pc|pcs|pecas?|x)\b/.test(n);
    var temCod = /\b[a-z]{0,4}\d+[a-z]*[-./]\d+\w*|\b[a-z]{0,3}\d{4,}\w*|\b[a-z]{1,4}-\d{3,}\w*/.test(n);
    return temQtd && temCod;
  }
  function peEhPedidoOrc(t) { var n = peNorm(t); return /\borcamento\b|\bcot(a|ar|acao|e)\b|\bpreco\b|\bvalor\b|\bquanto\b|\?/.test(n) && !pePedidoDireto(t) && !peConfirmaFalado(t); }
  function peCaraDePedido(t) {
    if (pePedidoDireto(t)) return true;
    var n = peNorm(t); if (!/\bped[i1]d[oop]?s?\b|\bpedid\w?\b/.test(n)) return false;
    var temCod = /\b[a-z]{0,4}\d[\w]*[-./]\w+|\b\d{5,}\b/.test(n), temValor = /\d+,\d{2}\b/.test(n), temTotal = /\btotal\b[^\n]*\d+,\d{2}/.test(n);
    return (temCod && temValor) || temTotal;
  }
  async function pedidoVigiar() {
    if (!contatoAt || contatoAt.grupo) { if (peR) { peR = null; pintaPe(); } return; }
    var cfg = await peConfig(); if (!cfg) return;
    var promOn = crmLig('prom'); if (!cfg.ligado && !promOn) { if (peR) { peR = null; pintaPe(); } return; }
    var _naoPe = function (t) { return !!(peReNao && peReNao.test(peNorm(t))); };
    var ms = lerMensagens(); if (!ms.length) return;
    var last = ms[ms.length - 1], origem = '', gat = '';
    // 4.79 - A pedido do Vitor ("não tinha que ir pro meu dia?" — cliente "Despachar hoje ok", você "Claro. mando sim", depois "Ótimo dia" + 🙏): olhava só a
    // ÚLTIMA mensagem sua e as 4 últimas da conversa. Agora: as suas 4 últimas do fim da conversa e as 4 últimas do cliente nas 12 últimas mensagens.
    if (cfg.ligado && cfg.deMim) { var nm = 0; for (var a = ms.length - 1; a >= 0 && a >= ms.length - 12 && nm < 4; a--) { if (!ms[a].eu) { if (nm) break; continue; } nm++; var ta = peNorm(ms[a].t); if (((peReMim && peReMim.test(ta)) || pePromessa(ta)) && !_naoPe(ms[a].t)) { origem = 'mim'; gat = ms[a].t; break; } } }
    // 8.7 - BUG (Vitor: "pq entendeu como pedido?" — "pode me passar um orçamento de 17 peças…" virou 📦 emitir): o gatilho era uma mensagem ANTIGA dela ("pode fechar
    // o pedido", de outro dia). Agora só valem mensagens do cliente de HOJE e a procura para quando acha um pedido de orçamento/preço mais novo (o assunto mudou).
    var hoje0 = new Date(); hoje0.setHours(0, 0, 0, 0);
    if (!origem && cfg.ligado && cfg.doCliente) { var nc = 0; for (var i = ms.length - 1; i >= 0 && i >= ms.length - 12 && nc < 4; i--) { if (ms[i].eu) continue; if (ms[i].q && ms[i].q < hoje0.getTime()) break; nc++; if (peEhPedidoOrc(ms[i].t)) break; if (((peReCli && peReCli.test(peNorm(ms[i].t))) || peCaraDePedido(ms[i].t) || peConfirmaFalado(ms[i].t)) && !_naoPe(ms[i].t)) { origem = 'cliente'; gat = ms[i].t; break; } } }
    if (!origem && cfg.ligado && cfg.doCliente) { var _pd = peDocPedidoCli(); if (_pd) { origem = 'cliente'; gat = '📎 ' + _pd; } } // 4.88 - PDF de pedido = pedido a emitir
    // 4.77 - A pedido do Vitor ("algo mais automático"): promessa de MANDAR algo ("já te mando", "te envio a tabela", "te mando na quarta") ou o cliente
    // pedindo material ("me manda a tabela/foto/catálogo") vira 📨 lembrete de mandar (fecha sozinho quando você manda o arquivo/cotação/link). Só o que fala
    // de pedido/nota/faturar continua sendo 📦 emitir.
    var pr = '', prT = '';
    var _prNao = function (t) { return !!(prReNao && prReNao.test(peNorm(t))); };
    // 10.0 - BUG (Vitor: "aqui entendeu como pedido? não apareceu pra eu emitir" — cliente "Pode ser a paralela", você "blz. mando hoje pra voce"): "mando hoje" é palavra de
    // PEDIDO e virava 📨 mandar pro cliente. Agora só é 📨 quando fala de MATERIAL (tabela, foto, catálogo, link…) ou é promessa sem palavra de pedido; o resto = 📦 emitir.
    var _nl = peNorm(last.t), _mat = PE_MAT_RE.test(_nl);
    if (promOn && last.eu && crmLig('prom', 'deMim') && !PE_EMIT_RE.test(_nl) && ((PROM_MIM_RE.test(_nl) && (origem !== 'mim' || _mat)) || (origem === 'mim' && _mat)) && !_prNao(last.t)) { pr = 'mim'; prT = last.t; }
    else if (promOn && !last.eu && crmLig('prom', 'doCliente')) { for (var j = ms.length - 1; j >= 0 && j >= ms.length - 4; j--) { if (!ms[j].eu && PROM_CLI_RE.test(peNorm(ms[j].t)) && !_prNao(ms[j].t)) { pr = 'cliente'; prT = ms[j].t; break; } } }
    if (pr) {
      var sg = ultimo + '|' + ms.length + '|pr|' + prT.slice(0, 60); if (sg === peSig) return; peSig = sg; var chp = ultimo;
      var rp = await msg({ t: 'acao', acao: 'promessa', arg: { k: resp && resp.k, nome: contatoAt.nome, texto: prT, origem: pr } });
      if (chp !== ultimo || !rp || !rp.ok || rp.jaTinha) return;
      anAdd('pr', rp, prT); return;
    }
    if (!origem) return;
    var sig = ultimo + '|' + ms.length + '|' + origem + '|' + gat.slice(0, 60);
    if (sig === peSig) return; peSig = sig;
    var ch = ultimo;
    var r = await msg({ t: 'acao', acao: 'pedidoEmitir', arg: { k: resp && resp.k, nome: contatoAt.nome, texto: gat, msgs: ms, origem: origem } });
    if (ch !== ultimo || !r || !r.ok || r.jaTinha) return;
    r._txt = gat; peR = r; pintaPe();
  }
  function pintaPe() {
    if (!PE) return;
    PE.style.display = 'none'; // 4.72 - faixa saiu: vira selo na mensagem + contador (B+D)
    if (!peR || !contatoAt) return;
    anAdd('pe', peR, peR._txt || ''); return;
    PE.style.display = 'flex';
    PE.innerHTML = '<span class="pfwa-vf-i">📦</span><div><b>Anotei pra você emitir</b><br><small>' + esc(peR.resumo || 'o pedido') + (peR.quando ? ' — pra ' + esc(peR.quando) : (peR.amanha ? ' — pra amanhã' : '')) + ' — vai pras Pendências e ☀️ Meu dia</small></div><button data-acao="peDesfazer" data-arg="' + esc(peR.id) + '">desfazer</button><span data-acao="peX" class="pfwa-avx" title="Fechar">✕</span>';
    posicionar();
  }

  // ═══ 4.72 - A pedido do Vitor ("algo mais discreto para esses avisos" → prévia previa2.png → "b e d") ═══
  // Os avisos 📦 "anotei pra emitir" e 📌 "anotei pra verificar" não são mais a faixa larga em cima da caixa:
  // B = selo pequeno grudado na mensagem que virou lembrete (clique = detalhe + desfazer);
  // D = contador 📦 N / 📌 N no cabeçalho da conversa, logo depois do nome (clique = lista da conversa com desfazer).
  var AN = {}, ANPOP = null, ANCNT = null, anPopDe = null;
  try { AN = JSON.parse(sessionStorage.getItem('pfwa_an') || '{}') || {}; } catch (e) { AN = {}; }
  function anGrava() { try { sessionStorage.setItem('pfwa_an', JSON.stringify(AN)); } catch (e) { } }
  function anNorm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
  function anAdd(tipo, r, texto) {
    if (!r || !r.id || !ultimo) return;
    var L = AN[ultimo] = AN[ultimo] || [];
    if (L.some(function (x) { return x.id === r.id; })) return;
    L.push({ tipo: tipo, id: r.id, snip: anNorm(texto).slice(0, 60), resumo: r.resumo || '', quando: r.quando || (r.amanha ? 'amanhã' : ''), t: Date.now() });
    anGrava(); anVigiar();
  }
  function anTirar(id, desfazer) {
    var L = AN[ultimo] || [], x = L.find(function (o) { return o.id === id; }); if (!x) return;
    if (desfazer) msg({ t: 'acao', acao: x.tipo === 'pe' ? 'pedidoEmitirDesfazer' : x.tipo === 'pr' ? 'promessaDesfazer' : 'verificarDesfazer', arg: id });
    AN[ultimo] = L.filter(function (o) { return o.id !== id; }); if (!AN[ultimo].length) delete AN[ultimo];
    anGrava(); anPopFechar(); anVigiar();
  }
  function anRotulo(x) { return x.tipo === 'pe' ? '📦 Anotei pra você emitir' : x.tipo === 'pr' ? '📨 Anotei pra você mandar pro cliente' : '📌 Anotei pra você verificar'; }
  function anItemHtml(x) {
    return '<div class="pfwa-an-it"><b>' + anRotulo(x) + '</b><small>' + esc(x.resumo || (x.tipo === 'pe' ? 'o pedido' : '')) + (x.quando ? ' — pra ' + esc(x.quando) : '') +
      (x.tipo === 'pr' ? ' · fecha sozinho quando você mandar o arquivo, a cotação ou o link' : ' · está nas Pendências e no ☀️ Meu dia') + '</small><div class="pfwa-an-bt"><a data-anacao="desf" data-anid="' + esc(x.id) + '">desfazer</a><a data-anacao="ok" data-anid="' + esc(x.id) + '" class="pfwa-an-ok">ok, entendi</a></div></div>';
  }
  function anPopFechar() { if (ANPOP) ANPOP.style.display = 'none'; anPopDe = null; }
  function anPopAbrir(itens, ancora) {
    if (!ANPOP) {
      ANPOP = document.createElement('div'); ANPOP.id = 'pfwa-anpop'; document.body.appendChild(ANPOP);
      ANPOP.addEventListener('click', function (ev) { var a = ev.target.closest('[data-anacao]'); if (!a) return; ev.preventDefault(); ev.stopPropagation(); anTirar(a.getAttribute('data-anid'), a.getAttribute('data-anacao') === 'desf'); });
      document.addEventListener('mousedown', function (ev) { if (ANPOP && ANPOP.style.display !== 'none' && !ANPOP.contains(ev.target) && !(ev.target.closest && ev.target.closest('.pfwa-anselo,#pfwa-ancnt'))) anPopFechar(); }, true);
    }
    if (anPopDe === ancora && ANPOP.style.display !== 'none') { anPopFechar(); return; }
    anPopDe = ancora;
    ANPOP.innerHTML = itens.map(anItemHtml).join('');
    ANPOP.style.display = 'block';
    var r = ancora.getBoundingClientRect(), w = 260, h = ANPOP.offsetHeight;
    var left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left)), top = r.bottom + 6;
    if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 6);
    ANPOP.style.left = left + 'px'; ANPOP.style.top = top + 'px';
  }
  function anVigiar() {
    var L = (contatoAt && !contatoAt.grupo && AN[ultimo]) || [];
    // B · selo na mensagem
    var els = Array.prototype.slice.call(document.querySelectorAll('#main [data-pre-plain-text]')).slice(-60).filter(function (el) { return !(el.parentElement && el.parentElement.closest('[data-pre-plain-text]')); });
    var porEl = new Map();
    L.forEach(function (x) {
      if (!x.snip) return;
      for (var i = els.length - 1; i >= 0; i--) {
        var tx = els[i].querySelectorAll('.selectable-text'), t = Array.prototype.map.call(tx, function (z) { return z.innerText || ''; }).join(' ');
        if (anNorm(t).indexOf(x.snip) >= 0) { var a = porEl.get(els[i]) || []; a.push(x); porEl.set(els[i], a); return; }
      }
    });
    els.forEach(function (el) { var s = el.querySelector(':scope > .pfwa-anselo'); if (s && !porEl.has(el)) s.remove(); });
    porEl.forEach(function (itens, el) {
      var s = el.querySelector(':scope > .pfwa-anselo');
      if (!s) { s = document.createElement('span'); s.className = 'pfwa-anselo'; if (getComputedStyle(el).position === 'static') el.style.position = 'relative'; el.appendChild(s);
        ['pointerdown', 'mousedown', 'mouseover'].forEach(function (e) { s.addEventListener(e, function (ev) { ev.stopPropagation(); }); }); }
      var temPe = itens.some(function (x) { return x.tipo === 'pe'; }), temVf = itens.some(function (x) { return x.tipo === 'vf'; }), temPr = itens.some(function (x) { return x.tipo === 'pr'; });
      var txt = [temPe ? '📦 emitir' : '', temPr ? '📨 mandar' : '', temVf ? '📌 verificar' : ''].filter(Boolean).join(' · ');
      if (s.textContent !== txt) s.textContent = txt;
      s.classList.toggle('vf', !temPe);
      s.title = itens.map(anRotulo).join(' · ') + ' — clique pra ver ou desfazer';
      s.onclick = function (ev) { ev.preventDefault(); ev.stopPropagation(); anPopAbrir(itens, s); };
      // fica na mesma linha dos outros selos (📄 / ⚡ / 📥), logo depois deles
      var off = 6; Array.prototype.forEach.call(el.querySelectorAll(':scope > .pfwa-selo, :scope > .pfwa-rrselo, :scope > .pfwa-rfselo'), function (o) { if (o.offsetWidth) off += o.offsetWidth + 5; });
      var lf = 'calc(100% + ' + off + 'px)'; if (s.style.left !== lf) s.style.left = lf;
    });
    // D · contador no cabeçalho
    if (!ANCNT) { ANCNT = document.createElement('div'); ANCNT.id = 'pfwa-ancnt'; document.body.appendChild(ANCNT);
      ANCNT.addEventListener('click', function (ev) { var L2 = AN[ultimo] || []; if (!L2.length) return; ev.preventDefault(); ev.stopPropagation(); anPopAbrir(L2, ANCNT); }); }
    var nPe = L.filter(function (x) { return x.tipo === 'pe'; }).length, nPr = L.filter(function (x) { return x.tipo === 'pr'; }).length, nVf = L.length - nPe - nPr, el = nomeEl();
    if (!L.length || !el || document.documentElement.classList.contains('pfwa-coberto')) { ANCNT.style.display = 'none'; return; }
    var r = el.getBoundingClientRect(); if (!r.width) { ANCNT.style.display = 'none'; return; }
    var h = (nPe ? '<span class="pfwa-anc pe">📦<i>' + nPe + '</i></span>' : '') + (nPr ? '<span class="pfwa-anc pe">📨<i>' + nPr + '</i></span>' : '') + (nVf ? '<span class="pfwa-anc vf">📌<i>' + nVf + '</i></span>' : '');
    if (ANCNT.innerHTML !== h) ANCNT.innerHTML = h;
    ANCNT.title = 'Anotado nesta conversa: ' + [nPe ? nPe + ' a emitir' : '', nPr ? nPr + ' pra mandar' : '', nVf ? nVf + ' a verificar' : ''].filter(Boolean).join(' · ') + ' — clique pra ver';
    ANCNT.style.display = 'flex';
    pfwaCabLayout();
  }
  setInterval(function () { try { anVigiar(); } catch (e) { } }, 1200);
  // ═══ 4.97 - A pedido do Vitor: 🧭 CONHECER O CLIENTE (prévias docs/referencias/conhecer-cliente/: "gostei da A e da C, mas gostei da parte de selecionar da B")
  // A = selo 🧭 N ao lado do nome (pisca quando a conversa acalma) · C = dica amarela em cima da caixa de digitar, só você vê · clique = UMA pergunta por vez
  // (chips com a resposta sugerida, 💬 Perguntar escreve na caixa, pular, depois, não mostrar mais). As perguntas e o que falta vêm do PF (acao conhecer).
  var CC = null, ccKey = '', ccTs = 0, CCB = null, CCN = null, CCP = null, ccI = 0, ccMulti = [], ccFechado = {};
  function ccDiaHoje() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function ccLembrouHoje(k) { try { var o = JSON.parse(localStorage.getItem('pfwa_cc_dia') || '{}'); return o[k] === ccDiaHoje(); } catch (e) { return false; } }
  function ccMarcaHoje(k) { try { var o = JSON.parse(localStorage.getItem('pfwa_cc_dia') || '{}'); o[k] = ccDiaHoje(); localStorage.setItem('pfwa_cc_dia', JSON.stringify(o)); } catch (e) { } }
  async function ccCarregar(forca) {
    if (CFG.cc === false || !resp || resp.tipo !== 'cliente' || !resp.k) { CC = null; return; }
    if (!forca && ccKey === ultimo && Date.now() - ccTs < 60000) return;
    ccKey = ultimo; ccTs = Date.now();
    var r = await msg({ t: 'acao', acao: 'conhecer', arg: { k: resp.k, nome: contatoAt && contatoAt.nome, msgs: lerMensagens().slice(-12) } });
    if (ccKey !== ultimo) return; CC = (r && r.lista) ? r : null; if (ccI >= ((CC && CC.lista.length) || 0)) ccI = 0;
    if (aba === 'cli') pintaCorpo(); ccVigiar();
  }
  function ccCalma() {
    var els = document.querySelectorAll('#main [data-pre-plain-text]'); if (!els.length) return false;
    var temEle = false, temMinha = false; for (var i = els.length - 1; i >= Math.max(0, els.length - 15); i--) { if (minhaEl(els[i])) temMinha = true; else temEle = true; }
    if (!temEle || !temMinha) return false;
    // 5.9 - A pedido do Vitor (print: cliente mandou "eii / bom dia / tudo bem?" e apareceu "Bom momento pra perguntar" — "não me parece um bom momento"):
    // só é bom momento quando a conversa ACALMOU depois de vocês se falarem — a última mensagem é sua (e não é uma pergunta esperando resposta) ou o cliente
    // só fechou o assunto (blz, valeu, obrigado, ok, 👍…). Cliente cumprimentando, perguntando ou pedindo = ele está esperando você, não é hora.
    var ult = els[els.length - 1], tu = String(ult.innerText || '').replace(/\n?\d{1,2}:\d{2}\s*$/, '').trim();
    if (minhaEl(ult)) { if (/\?\s*$/.test(tu)) return false; }
    else if (!/^(blz|beleza|valeu|vlw|obrigad[oa]|obg|brigad[oa]|ok|okay|certo|combinado|fechado|show|top|perfeito|tmj|tranquilo|sim|isso|👍|🙏|🤝|👌)[\s!.,👍🙏🤝👌]*$/i.test(tu)) return false;
    var t = msgQuando(ult) || horaFolha(ult); if (!t) return false;
    var dt = Date.now() - t; return dt >= 120000 && dt < 3 * 3600000;
  }
  function ccAtivo() { return CC && CC.lista && CC.lista.length && !CC.off && contatoAt && !contatoAt.grupo && resp && resp.k === CC.k && !document.documentElement.classList.contains('pfwa-coberto'); }
  function ccVigiar() {
    if (!CCB) {
      CCB = document.createElement('div'); CCB.id = 'pfwa-ccb'; document.body.appendChild(CCB);
      CCB.addEventListener('click', function (ev) { ev.preventDefault(); ev.stopPropagation(); ccAbrir(CCB); });
      CCN = document.createElement('div'); CCN.id = 'pfwa-ccn'; document.body.appendChild(CCN);
      CCN.addEventListener('click', function (ev) { var a = ev.target.closest('[data-cc]'); if (!a) return; ev.preventDefault(); ev.stopPropagation(); var w = a.getAttribute('data-cc');
        if (w === 'ver') ccAbrir(CCN); else if (w === 'depois') { ccFechado[ultimo] = 1; CCN.style.display = 'none'; } });
    }
    var el = nomeEl(), ok = ccAtivo() && el;
    if (!ok) { CCB.style.display = 'none'; CCN.style.display = 'none'; if (CCP && !ccAtivo()) CCP.style.display = 'none'; return; }
    var r = el.getBoundingClientRect(); if (!r.width) { CCB.style.display = 'none'; CCN.style.display = 'none'; return; }
    var n = CC.lista.length, h = '🧭<i>' + n + '</i>';
    if (CCB.innerHTML !== h) CCB.innerHTML = h;
    CCB.title = 'Conhecer o cliente: falta saber ' + n + ' coisa(s) — ' + CC.lista.slice(0, 3).map(function (q) { return q.t; }).join(' · ') + ' (clique pra responder)';
    CCB.style.display = 'flex'; pfwaCabLayout();
    // calma: pisca + dica (1x por cliente por dia)
    var calma = ccCalma(), k = CC.k;
    if (calma && !CC.adiado && !ccFechado[ultimo] && (!ccLembrouHoje(k) || CCN.getAttribute('data-k') === k)) {
      if (!ccLembrouHoje(k)) { ccMarcaHoje(k); CCB.classList.remove('pisca'); void CCB.offsetWidth; CCB.classList.add('pisca'); }
      var q = CC.lista[0], foot = document.querySelector('#main footer'), fr = foot && foot.getBoundingClientRect(), mr = document.querySelector('#main') && document.querySelector('#main').getBoundingClientRect();
      if (fr && mr && (!CCP || CCP.style.display === 'none')) {
        var hh = '💡 Bom momento pra perguntar: <b>' + esc(q.t.replace(/\?$/, '')) + '?</b> <a data-cc="ver">ver</a> · <a data-cc="depois" class="d">depois</a>';
        if (CCN.innerHTML !== hh) CCN.innerHTML = hh;
        CCN.setAttribute('data-k', k); CCN.style.display = 'block';
        /* 10.5 - A pedido do Vitor ("esse aviso. melhor colocar lá em cima"): a dica fica logo embaixo do cabeçalho, presa no selo 🧭 (não em cima da caixa de digitar) */
        var hd = document.querySelector('#main header'), hr = hd && hd.getBoundingClientRect(), br = CCB.getBoundingClientRect(), w0 = CCN.offsetWidth;
        var lf = br.width ? br.left + br.width / 2 - w0 / 2 : mr.left + mr.width / 2 - w0 / 2; lf = Math.max(mr.left + 8, Math.min(lf, mr.right - w0 - 8));
        CCN.style.left = Math.round(lf) + 'px'; CCN.style.top = Math.round(Math.max(hr ? hr.bottom : mr.top, br.width ? br.bottom : 0) + 6) + 'px';
      } else if (CCP && CCP.style.display !== 'none') CCN.style.display = 'none';
    } else CCN.style.display = 'none';
  }
  function ccFechar() { if (CCP) CCP.style.display = 'none'; }
  function ccAbrir(ancora) {
    if (!CCP) {
      CCP = document.createElement('div'); CCP.id = 'pfwa-ccp'; document.body.appendChild(CCP);
      CCP.addEventListener('click', ccClique);
      CCP.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' && ev.target.matches('input')) { ev.preventDefault(); ccResp(ev.target.value); } ev.stopPropagation(); }, true);
      document.addEventListener('mousedown', function (ev) { if (CCP && CCP.style.display !== 'none' && !CCP.contains(ev.target) && !(ev.target.closest && ev.target.closest('#pfwa-ccb,#pfwa-ccn,#pfwa .pfwa-ccbl'))) ccFechar(); }, true);
    }
    if (!CC || !CC.lista.length) return;
    if (CCP.style.display !== 'none' && CCP._de === ancora) { ccFechar(); return; }
    CCP._de = ancora; ccMulti = []; ccPinta();
    CCP.style.display = 'block'; CCN.style.display = 'none';
    var r = ancora.getBoundingClientRect(), w = CCP.offsetWidth, h = CCP.offsetHeight;
    var left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left - 20)), top = r.bottom + 8;
    if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 8);
    CCP.style.left = left + 'px'; CCP.style.top = top + 'px';
  }
  function ccPinta() {
    var L = CC.lista, q = L[ccI] || L[0]; if (!q) { ccFechar(); return; }
    var h = '<div class="pfwa-cch"><b>🧭 Falta saber deste cliente</b><span>' + (ccI + 1) + ' de ' + L.length + ' · ' + (CC.pct || 0) + '% preenchido</span></div>';
    h += '<div class="pfwa-ccq">' + esc(q.ic) + ' ' + esc(q.t) + (q.gestor ? ' <small>(do gestor)</small>' : '') + '</div>';
    if (q.porque) h += '<div class="pfwa-ccw">sugestão porque: ' + esc(q.porque) + '</div>';
    var ops = q.op.slice().sort(function (a, b) { return (q.sug.indexOf(b[0]) >= 0) - (q.sug.indexOf(a[0]) >= 0); });
    h += '<div class="pfwa-ccops">' + ops.map(function (o) { var sg = q.sug.indexOf(o[0]) >= 0, on = ccMulti.indexOf(o[0]) >= 0;
      return '<span class="pfwa-ccch' + (sg ? ' s' : '') + (on ? ' on' : '') + '" data-ccv="' + esc(o[0]) + '">' + esc(o[1]) + (sg && !/citou/.test(o[1]) ? ' · sugestão' : '') + '</span>'; }).join('') + '</div>';
    if (q.texto || q.frota) h += '<input class="pfwa-ccin" placeholder="' + (q.frota ? 'marca e modelo, ex.: CASE W20E — Enter grava' : 'escreva e aperte Enter') + '">';
    if (q.multi) h += '<button class="pfwa-btn pfwa-verde" data-ccacao="gravarMulti" style="margin-top:6px">✔ Gravar ' + (ccMulti.length ? '(' + ccMulti.length + ')' : '') + '</button>';
    h += '<div class="pfwa-ccbt">' + (q.pg ? '<span data-ccacao="perguntar" class="g">💬 Perguntar</span>' : '') + (L.length > 1 ? '<span data-ccacao="pular">pular ›</span>' : '') +
      '<span data-ccacao="link" class="g">📨 mandar o link pra ele responder</span><span data-ccacao="depois" class="d">depois</span><span data-ccacao="off" class="d">não mostrar mais pra ele</span></div>';
    CCP.innerHTML = h;
  }
  async function ccResp(v) {
    var q = CC.lista[ccI]; if (!q || v == null || v === '' || (Array.isArray(v) && !v.length)) return;
    var r = await msg({ t: 'acao', acao: 'conhecerResp', arg: { k: CC.k, id: q.id, v: v } });
    if (r && r.ok === false) { audToast(r.msg || 'Não deu pra gravar'); return; }
    audToast('✔ Gravado no cadastro: ' + q.t.replace(/\?$/, ''));
    CC.lista.splice(ccI, 1); CC.pct = Math.min(100, (CC.pct || 0) + Math.round(100 / Math.max(1, CC.tot || 10))); ccMulti = [];
    if (ccI >= CC.lista.length) ccI = 0;
    if (!CC.lista.length) { ccFechar(); } else ccPinta();
    ccVigiar(); if (aba === 'cli') pintaCorpo(); setTimeout(function () { ccCarregar(true); }, 1500);
  }
  function ccClique(ev) {
    ev.stopPropagation(); var q = CC && CC.lista[ccI]; if (!q) return;
    var c = ev.target.closest('[data-ccv]'); if (c) { var v = c.getAttribute('data-ccv');
      if (q.multi) { var i = ccMulti.indexOf(v); if (i >= 0) ccMulti.splice(i, 1); else ccMulti.push(v); ccPinta(); } else ccResp(v); return; }
    var a = ev.target.closest('[data-ccacao]'); if (!a) return; var w = a.getAttribute('data-ccacao');
    if (w === 'gravarMulti') ccResp(ccMulti.slice());
    else if (w === 'perguntar') { escreverNaCaixa(q.pg); ccFechar(); }
    else if (w === 'link') { ccFechar(); conhLinkPor(); } // 10.4
    else if (w === 'pular') { ccI = (ccI + 1) % CC.lista.length; ccMulti = []; ccPinta(); }
    else if (w === 'depois') { msg({ t: 'acao', acao: 'conhecerAdiar', arg: { k: CC.k } }); CC.adiado = true; ccFechado[ultimo] = 1; ccFechar(); ccVigiar(); }
    else if (w === 'off') { msg({ t: 'acao', acao: 'conhecerOff', arg: { k: CC.k } }); CC.off = true; ccFechar(); ccVigiar(); }
  }
  // 10.4 - A pedido do Vitor ("link de conhecer cliente mesmo. deixa mais fácil"): 1 clique = gera o link "Conhecer você melhor" e já põe a mensagem na caixa (você só aperta enviar)
  var conhIndo = false;
  async function conhLinkPor() {
    if (conhIndo) return; if (!resp || !resp.k) { cmToast('Esse contato ainda não é cliente do PF — salve pelo 👤 primeiro'); return; }
    conhIndo = true; cmToast('📨 Gerando o link…'); var ch = ultimo;
    var r = await msg({ t: 'acao', acao: 'cadLink', arg: { k: resp.k, modo: 'conhecer', pessoa: (typeof pessoaComprador === 'function' && pessoaComprador()) || '' } });
    conhIndo = false;
    if (!r || !r.ok || !r.msg) { cmToast((r && r.erro) || naoDeu()); return; }
    if (ch !== ultimo) { try { navigator.clipboard.writeText(r.msg); } catch (e) { } cmToast('📋 Você trocou de conversa — a mensagem com o link foi copiada'); return; }
    escreverNaCaixa(r.msg); cmToast('✔ Link na caixa — confira e aperte enviar');
  }
  function ccBlocoHtml() {
    if (!CC || !CC.lista || !resp || resp.k !== CC.k) return '';
    if (!CC.lista.length) return '<div class="pfwa-bloco pfwa-ccbl"><div class="pfwa-bt">🧭 Conhecer o cliente · ' + (CC.pct || 100) + '%</div><div class="pfwa-nada">✔ Já sabemos o que importa dele.</div></div>';
    return '<div class="pfwa-bloco pfwa-ccbl"><div class="pfwa-bt">🧭 Conhecer o cliente · ' + (CC.pct || 0) + '% preenchido' + (CC.off ? ' · lembrete desligado' : '') + '</div>' +
      '<div class="pfwa-ccbar"><b style="width:' + (CC.pct || 0) + '%"></b></div>' +
      '<div class="pfwa-nada" style="margin:4px 0">Falta: ' + CC.lista.slice(0, 4).map(function (q) { return esc(q.t.replace(/\?$/, '')); }).join(' · ') + (CC.lista.length > 4 ? ' · +' + (CC.lista.length - 4) : '') + '</div>' +
      '<div class="pfwa-bots"><button class="pfwa-verde" data-acao="conhLink">📨 Mandar o link pra ele responder</button><button data-acao="ccResponder">Eu respondo ›</button></div>' +
      '<div class="pfwa-nada" style="margin-top:4px">O link vai pra caixa da conversa já com a mensagem — é só apertar enviar. Ele responde no celular (menos de 1 minuto) e cai sozinho no cadastro.</div></div>';
  }
  setInterval(function () { try { if (!vivo()) return; ccCarregar(); ccVigiar(); } catch (e) { } }, 2000);

  // 4.77 - 📨 FECHA SOZINHO: VOCÊ mandou um arquivo, uma cotação (2+ R$) ou um link nessa conversa → o PF fecha os lembretes "mandar pro cliente"
  // abertos dela (e o 📦 emitir, se o arquivo é pedido/nota).
  var cumpSig = '';
  async function cumpridoVigiar() {
    if (!contatoAt || contatoAt.grupo) return;
    var ms = lerMensagensDoc(); if (!ms.length) return; var last = ms[ms.length - 1];
    if (!last.eu) return;
    var t = last.t || '', ehEnvio = !!last.doc || (t.match(/R\$/g) || []).length >= 2 || /https?:\/\/\S+/i.test(t);
    if (!ehEnvio) return;
    var sig = ultimo + '|' + ms.length + '|' + (last.doc || '') + '|' + t.slice(0, 60); if (sig === cumpSig) return; cumpSig = sig;
    var r = await msg({ t: 'acao', acao: 'promessaCumprida', arg: { k: resp && resp.k, nome: contatoAt.nome, doc: last.doc || '', texto: t.slice(0, 300) } });
    if (!r || !r.fechou || !r.fechou.length) return;
    var L = AN[ultimo] || []; AN[ultimo] = L.filter(function (x) { return r.fechou.indexOf(x.id) < 0; }); if (!AN[ultimo].length) delete AN[ultimo]; anGrava(); anVigiar();
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
    if (S.auto) { // 8.3 - ⏰ Status automático com "publicar sozinho"
      await dormir(1500);
      var env = await esperar(function () { var l = document.querySelectorAll('[data-icon="send"],[data-icon="wds-ic-send-filled"],[aria-label="Enviar"],[aria-label="Send"]'); for (var i = 0; i < l.length; i++) { var e = l[i]; if (e.closest('#main footer') || e.closest('#pfwa')) continue; if (e.offsetParent || e.getClientRects().length) return e; } return null; }, 8000);
      if (!env) { stMostra('<b>📢 Status pronto</b>, mas não achei o botão de enviar — aperte o <b>✈ enviar</b> do WhatsApp pra publicar.', 'erro'); msg({ t: 'acao', acao: 'stAutoRes', arg: { ok: false, erro: 'não achei o enviar' } }); return; }
      clicarEl(env); await dormir(2500);
      stMostra('<b>📢 Status publicado sozinho</b> (⏰ Status automático).', 'ok'); msg({ t: 'acao', acao: 'stAutoRes', arg: { ok: true } });
      setTimeout(function () { if (ST && ST.className === 'ok') ST.style.display = 'none'; }, 10000); return;
    }
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
      // 4.75 - última mensagem foi SUA (✓/✓✓ na prévia) → o PF separa "o cliente chamou" de "você mandou"
      var minha = !!r.querySelector('[data-icon*="check"],[data-icon="msg-time"]');
      out.push({ el: r, nome: nome, tel: tel, etqs: etqs, unread: unread, hora: hora, minha: minha });
    });
    return out;
  }
  // 4.62 - conta os grupos na lista INTEIRA de conversas (motor), sem rolar nem abrir nada
  var grpTot = null, grpTotRodando = false, grpLista = null; // 4.69 - grpLista = todas as conversas [{id,nome,unread,s}]
  async function grpContarTudo() {
    if (grpTotRodando || !menuLig || !motorOk) return; grpTotRodando = true;
    try {
      var r = await motor('chatsTodos', {}, 60000); if (!r || r.erro || !Array.isArray(r.l)) return;
      var n = {}, semg = 0, l = r.l.filter(function (c) { return c.nome; }), gl = [];
      for (var i = 0; i < l.length; i += 150) {
        var sl = l.slice(i, i + 150), sx = await msg({ t: 'acao', acao: 'situacoes', arg: { lista: sl.map(function (c) { return { nome: c.nome, tel: c.tel || '' }; }) } });
        if (!sx || !sx.sit) return;
        sl.forEach(function (c) { var x = sx.sit[c.nome]; if (x) gl.push({ id: c.id, nome: c.nome, unread: c.unread || 0, s: x }); if (!x || (x.tipo !== 'cliente' && x.tipo !== 'contato')) return; var gs = audGruposDe(x); if (!gs.length) { if (x.tipo === 'cliente') semg++; return; } gs.forEach(function (g) { n[g] = (n[g] || 0) + 1; }); });
      }
      grpTot = { n: n, semg: semg, ts: Date.now() }; grpLista = gl; pintarMenu();
    } catch (e) { } finally { grpTotRodando = false; }
  }
  setTimeout(function () { if (vivo()) grpContarTudo(); }, 9000); setInterval(function () { if (vivo()) grpContarTudo(); }, 300000);
  // ═══ 6.9 - ⏱️ TEMPO DE ATENDIMENTO ═══ (A pedido do Vitor: "registro de tempo em que o cliente é atendido no whats"): a cada 5 min, pelo motor (sem abrir nada),
  // lê as conversas com mensagem nova e, em cada uma, acha os ATENDIMENTOS: o cliente chama (depois de uma mensagem sua, ou depois de 3 h de silêncio) →
  // hora da SUA 1ª resposta (mensagem automática da extensão não conta) → fim = sua última mensagem antes de 3 h de silêncio. Vai pro PF (acao atendGravar),
  // que guarda por atendimento (pfWhatsAtend_v1) e mostra na Gestão (⏱️ Atendimento) e no ☀️ Meu dia. Precisa do ⚙️ motor ligado.
  var ATD_PAUSA = 3 * 3600000, atdRodando = false;
  function atdAutoTxts() { var o = {}; try { Object.keys(autoUlt || {}).forEach(function (k) { if (autoUlt[k]) o[String(autoUlt[k]).trim()] = 1; }); Object.keys(autoPend || {}).forEach(function (k) { var p = autoPend[k]; if (p && p.txt) o[String(p.txt).trim()] = 1; }); } catch (e) { } return o; }
  // conversa = sessões separadas por 3 h de silêncio. Em cada sessão: ini (1ª mensagem), quem começou, 1ª resposta sua, fim (última mensagem),
  // e as ESPERAS = cada vez que o cliente mandou e você respondeu (segundos); `aberta` = o cliente mandou e ainda não teve resposta.
  function atdCalcular(ms, autos) {
    ms = (ms || []).filter(function (m) { return m && m.t; }).sort(function (a, b) { return a.t - b.t; });
    var out = [], cur = null, ultT = 0, espIni = 0, soFecho = true, FECHO = /^\s*(ok|okay|blz|beleza|valeu|vlw|obrigad[oa]|obg|brigad[oa]|show|top|tmj|perfeito|certo|combinado|fechado|tá bom|ta bom|👍|🙏|🤝|👏|😉|😊)[\s!.,👍🙏🤝]*$/i;
    ms.forEach(function (m) {
      if (m.eu && autos[String(m.txt || '').trim()]) return; // mensagem automática não conta
      if (!cur || m.t - ultT > ATD_PAUSA) { if (cur) { cur.aberta = espIni && !soFecho ? espIni : 0; out.push(cur); } cur = { ini: m.t, cli: m.eu ? 0 : 1, resp: 0, fim: m.t, esp: [], nCli: 0, nEu: 0, arqEu: 0, arqCli: 0, audEu: 0, audCli: 0 }; espIni = 0; }
      var tp = String(m.tipo || ''); if (/^(image|document|video)$/.test(tp)) { if (m.eu) cur.arqEu++; else cur.arqCli++; } else if (/^(ptt|audio)$/.test(tp)) { if (m.eu) cur.audEu++; else cur.audCli++; } // 9.0 - arquivos e áudios de cada atendimento
      if (!m.eu) { cur.nCli++; if (!espIni) { espIni = m.t; soFecho = true; } if (!FECHO.test(String(m.txt || ''))) soFecho = false; }
      else { cur.nEu++; if (espIni) { if (!cur.resp) cur.resp = m.t; cur.esp.push([espIni, Math.round((m.t - espIni) / 1000)]); espIni = 0; } }
      cur.fim = m.t; ultT = m.t;
    });
    if (cur) { cur.aberta = espIni && !soFecho ? espIni : 0; out.push(cur); }
    out.forEach(function (x) { x.esp = x.esp.slice(0, 40); });
    return out;
  }
  async function atdTick() {
    if (atdRodando || !motorOk) return; atdRodando = true;
    try {
      var st = await new Promise(function (ok) { chrome.storage.local.get(['atdUlt'], function (x) { ok(x || {}); }); });
      var desde = st.atdUlt || (Date.now() - 2 * 86400000), agora = Date.now();
      var r = await motor('recentes', { desde: desde - 60000 }, 60000); if (!r || r.erro || !Array.isArray(r.l)) return;
      var autos = atdAutoTxts(), lote = [];
      for (var i = 0; i < Math.min(r.l.length, 60); i++) {
        var c = r.l[i]; if (!c.nome) continue;
        var mr = await motor('msgs', { id: c.id, n: 80 }, 20000); if (!mr || mr.erro || !Array.isArray(mr.l)) continue;
        var at = atdCalcular(mr.l, autos).filter(function (a) { return a.ini >= agora - 7 * 86400000; });
        if (at.length) lote.push({ nome: c.nome, tel: c.tel || '', at: at });
      }
      if (lote.length) { var g = await msg({ t: 'acao', acao: 'atendGravar', arg: { lote: lote } }); if (!g || g.ok === false) return; }
      chrome.storage.local.set({ atdUlt: agora });
    } catch (e) { } finally { atdRodando = false; }
  }
  setTimeout(function () { if (vivo()) atdTick(); }, 25000); setInterval(function () { if (vivo()) atdTick(); }, 300000);
  function carregarSituacoes() {
    if (!menuLig) return;
    clearTimeout(sitTimer);
    sitTimer = setTimeout(function () {
      var ls = linhasLista(); var sig = ls.map(function (x) { return x.nome; }).join('|');
      if (sig === sitSig && Object.keys(sitCache).length) { pintarMenu(); return; }
      sitSig = sig;
      msg({ t: 'acao', acao: 'situacoes', arg: { lista: ls.map(function (x) { return { nome: x.nome, tel: x.tel, hora: x.hora, minha: x.minha ? 1 : 0 }; }) } }).then(function (r) { if (r && r.sit) sitCache = r.sit; pintarMenu(); });
    }, 500);
  }
  // 4.21 - A pedido do Vitor (prévia E1, docs/referencias/whatsapp-etiquetas-lista/previa5): cliente do PF = faixa da cor do grupo na esquerda,
  // "GRUPO · 📍 Cidade-UF" no fim da linha da mensagem (antes da bolinha de não lidas) e o tipo (Revenda/Consumidor/Serviço/Concessionária)
  // na linha da etiqueta do WhatsApp, que some (⚙️ "Esconder etiquetas do WhatsApp"). A linha da conversa tem altura fixa no WhatsApp:
  // sem etiqueta do WhatsApp, o tipo vai só no title da linha. O "📄 cot. N" saiu.
  function filhoQueTem(anc, el) { var x = el; while (x && x.parentElement !== anc) x = x.parentElement; return x; }
  function ancComum(a, b) { var x = a; while (x && !x.contains(b)) x = x.parentElement; return x; }
  function rowLimpar(r) {
    r.querySelectorAll('.pfwa-rowb,.pfwa-rowbar,.pfwa-rowln,.pfwa-rowtp,.pfwa-rowgp,.pfwa-rowown,.pfwa-gueri,.pfwa-fatsp,.pfwa-row3,.pfwa-emch,.pfwa-pdch').forEach(function (e) { e.remove(); });
    r.querySelectorAll('.pfwa-row3u').forEach(function (e) { e.classList.remove('pfwa-row3u'); }); // v115.2697 - a linha da etiqueta nativa volta ao normal
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
      if (s.tipo === 'cliente' || s.tipo === 'contato') { // 4.57 - contato (não é cliente) com grupo, ex.: Triex
        var gl = (s.gcs && s.gcs.length) ? s.gcs : (s.grupo ? [{ l: s.grupo, c: s.gCor, t: s.gTxt }] : []);
        var lugar = [s.cid, s.uf].filter(Boolean).join('-');
        // 4.37 / v115.2695 - A pedido do Vitor ("sobre etiqueta do grupo vamos deixar a D"): opção D minimalista = pontinho da cor + nome em cinza
        gh = gl.map(function (g) { return '<span class="pfwa-gdot" style="background:' + esc(g.c || '#1F4E79') + '"></span><span class="pfwa-gnm">' + esc(String(g.l).replace(/^linha\s+/i, 'L. ')) + '</span>'; }).join('<span class="pfwa-gsep">·</span>');
        var cityHtml = lugar ? '📍 ' + esc(lugar) : '';
        // 4.25 / v115.2669 - A pedido do Vitor ("mude somente essa do grupo… linha amarela, agrícola"): o GRUPO desce pra linha 3 (não espreme a prévia da mensagem); a 📍 cidade continua na linha da mensagem.
        txt = cityHtml || (s.tipo === 'contato' ? gh : '🤝 cliente do PF');
        txtFull = [gh, cityHtml].filter(Boolean).join(' <i>·</i> ') || '🤝 cliente do PF';
        if (gl.length) { var n = gl.length, st = gl.map(function (g, k) { return (g.c || '#1F4E79') + ' ' + (k * 100 / n) + '% ' + ((k + 1) * 100 / n) + '%'; }).join(','); bar = 'linear-gradient(to bottom,' + st + ')'; }
        tp = s.tpc || '';
      } else if (s.tipo === 'fornecedor') { txt = '🏭 fornecedor' + (s.mapa ? ' · mapa ' + esc(s.mapa) : ''); txtFull = txt; }
      else if (s.tipo === 'colega') { txt = '👔 colega' + (s.cargo ? ' · ' + esc(s.cargo) : ''); txtFull = txt; } // 4.91
      var sig = txt + '|' + gh + '|' + bar + '|' + tp + '|' + (s.gueri ? 'G' : '') + (s.fatSp ? 'F' : '') + (s.emitir ? 'E' : '') + (s.pend ? 'P' : '') + '|' + (CFG.waEtqOff !== false ? 1 : 0) + '|' + (x.unread ? 1 : 0);
      if (r.getAttribute('data-pfwa-sig') === sig && (!txt || r.querySelector('.pfwa-rowln'))) return;
      rowLimpar(r); r.setAttribute('data-pfwa-sig', sig); r.removeAttribute('title');
      // 4.49 - A pedido do Vitor ("está com as etiquetas do whats" — cliente SEM grupo/tipo e conversas fora do PF ainda mostravam a etiqueta "CARDAN"):
      // a linha da etiqueta nativa (a que vem DEPOIS da linha da mensagem) fica escondida em TODA conversa, não só na de cliente com grupo.
      if (CFG.waEtqOff !== false) { try {
        var anc0 = prev || r.querySelector('[aria-label*="ão lida"],[aria-label*="nread"]'), col0 = anc0 ? ancComum(tit, anc0) : null, lm0 = (col0 && anc0) ? filhoQueTem(col0, anc0) : null;
        if (col0 && lm0) { var dep0 = false; Array.prototype.forEach.call(col0.children, function (ch) { if (ch === lm0) { dep0 = true; return; } if (dep0 && !ch.classList.contains('pfwa-rowbar') && !ch.classList.contains('pfwa-row3')) Array.prototype.forEach.call(ch.children, function (c) { if (String(c.className || '').indexOf('pfwa-') === 0) return; c.setAttribute('data-pfwa-esc', '1'); c.style.display = 'none'; }); }); }
      } catch (e) { } }
      // 4.91 - A pedido do Vitor ("marcar que tem um pedido pro cliente pra ser enviado, pra eu não esquecer"): 📦 ao lado do nome enquanto tiver pedido pra mandar
      if (s.emitir && tit.parentNode) { var ez = document.createElement('span'); ez.className = 'pfwa-emch'; ez.textContent = '📦'; ez.title = 'Tem pedido pra enviar — botão direito na conversa → ✔ Pedido enviado'; tit.parentNode.insertBefore(ez, tit.nextSibling); }
      if (s.pend && tit.parentNode) { var pz = document.createElement('span'); pz.className = 'pfwa-pdch'; pz.textContent = '⏳'; pz.title = 'Pendência com esse contato' + (typeof s.pend === 'string' ? ': ' + s.pend : '') + ' — botão direito na conversa → ✔ Resolvi'; tit.parentNode.insertBefore(pz, tit.nextSibling); } // 6.2
      if (!txt) return;
      // 4.37 / v115.2695 - A pedido do Vitor ("selo pra marcar cliente q compra com nf baixa… deixa a escrita Gueri"): chip "Gueri" ao lado do nome
      if (s.tipo === 'cliente' && s.gueri && tit.parentNode) { var gz = document.createElement('span'); gz.className = 'pfwa-gueri'; gz.textContent = 'Gueri'; gz.title = 'Compra com NF baixa'; tit.parentNode.insertBefore(gz, tit.nextSibling); }
      // 4.39 / v115.2697 - A pedido do Vitor ("coloca um selo de Faturar por SP pra eu colocar no cliente"): chip "Fat. SP" ao lado do nome
      if (s.tipo === 'cliente' && s.fatSp && tit.parentNode) { var fz = document.createElement('span'); fz.className = 'pfwa-fatsp'; fz.textContent = 'Fat. SP'; fz.title = 'Faturar por SP (matriz)'; var apos = tit.parentNode.querySelector('.pfwa-gueri') || tit; tit.parentNode.insertBefore(fz, apos.nextSibling); }
      // 4.37 - esconde a etiqueta NATIVA do WhatsApp de forma independente da estrutura: chip com cor de fundo inline, depois do nome, curto (a linha 3 abaixo é a via principal; isto é a rede de segurança)
      if (s.tipo === 'cliente' && CFG.waEtqOff !== false) { try {
        r.querySelectorAll('span,div').forEach(function (el) {
          if (el.getAttribute('data-pfwa-esc') || (el.className && String(el.className).indexOf('pfwa-') === 0)) return;
          if (el.closest('.pfwa-rowln,.pfwa-rowtp,.pfwa-rowgp,.pfwa-rowbar,.pfwa-gueri')) return;
          if (el === tit || el.contains(tit)) return;
          if (!(tit.compareDocumentPosition(el) & 4)) return; // só DEPOIS do nome (avatar/time ficam de fora)
          var bg = (el.style && (el.style.backgroundColor || el.style.background)) || '';
          if (!bg || /transparent|none|gradient/i.test(bg)) return;
          if (el.querySelector && el.querySelector('img')) return;
          var al = (el.getAttribute && el.getAttribute('aria-label')) || ''; if (/ã?o lid|nread/i.test(al)) return; // não é a bolinha de não-lidas
          var t = (el.textContent || '').trim(); if (!t || t.length > 32) return;
          try { var rc = el.getBoundingClientRect(); if (rc.height > 26 || rc.width > 190) return; } catch (e) { }
          el.setAttribute('data-pfwa-esc', '1'); el.style.display = 'none';
        });
      } catch (e) { } }
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
        else if (prev.parentNode) prev.parentNode.insertBefore(ln, prev.nextSibling); // 6.2 - linha que o WhatsApp acabou de trocar
      } else { var h = tit.parentElement; h.appendChild(ln); }
      // linha 3: grupo + tipo numa linha PRÓPRIA embaixo da mensagem — igual à conversa que já tem etiqueta do WhatsApp (a Geisa do print do Vitor).
      // v115.2697 - A pedido do Vitor (print real: "único q tá certo é o da Geisa; Alisson o grupo tá no lugar errado"): TODO cliente ganha a 3ª linha
      // DENTRO DA COLUNA DE CONTEÚDO (onde ficam o nome e a mensagem), então a conversa cresce pra 3 linhas como a Geisa, sem jogar o grupo na linha
      // da mensagem. Quando a conversa já tem a etiqueta nativa do WhatsApp, reaproveita aquela linha (e esconde o conteúdo nativo).
      if ((s.tipo === 'cliente' || s.tipo === 'contato') && (gh || tp) && CFG.waEtqOff !== false) {
        var anchor = prev || unr, col = anchor ? ancComum(tit, anchor) : (tit.parentElement && tit.parentElement.parentElement);
        var lineMsg = (col && anchor) ? filhoQueTem(col, anchor) : null, L3 = null;
        if (col && lineMsg) { var depois = false; Array.prototype.forEach.call(col.children, function (ch) { if (ch === lineMsg) { depois = true; return; } if (depois && !L3 && !ch.classList.contains('pfwa-rowbar') && !ch.classList.contains('pfwa-row3')) L3 = ch; }); }
        var alvo = null;
        if (L3) { Array.prototype.forEach.call(L3.children, function (c) { c.setAttribute('data-pfwa-esc', '1'); c.style.display = 'none'; }); alvo = L3; L3.classList.add('pfwa-row3u'); }
        // v115.2699 - A pedido do Vitor (print do WhatsApp real: "nomes montoados"): a 3ª linha CRIADA (.pfwa-row3) transbordava em cima da conversa de baixo —
        // a linha da lista do WhatsApp tem ALTURA FIXA (mesma lição da v115.2682). Sem a linha da etiqueta nativa NÃO cria linha: o grupo vai curto na linha
        // da mensagem (no lugar da cidade) e cidade + tipo ficam no title.
        // 4.50 / v115.2713 - A pedido do Vitor (print do Juninho - Adipel: "ainda não está salvando" — marcou Revenda e só aparecia o grupo): sem a 3ª linha o
        // TIPO ia só no title (invisível). Agora vai junto do grupo na linha da mensagem, curto ("● L. Amarela · 🏪 Revenda").
        else if (!gh && tp && ln && !L3) { ln.innerHTML = (txt && txt.indexOf('📍') === 0 ? txt + '<span class="pfwa-gsep">·</span>' : '') + '<span class="pfwa-gnm">' + esc(tp) + '</span>'; }
        // 4.51 / v115.2716 - A pedido do Vitor ("não mostra endereço"): sem 3ª linha, a cidade estava indo só pro title (invisível). Agora vai junto na
        // linha da mensagem, antes do grupo ("📍 Dourados-MS · ● L. Amarela · 🏪 Revenda"); o .pfwa-rowln corta com reticências (não aumenta a altura).
        else if (gh && ln) { ln.innerHTML = (cityHtml ? cityHtml + '<span class="pfwa-gsep">·</span>' : '') + gh + (tp ? '<span class="pfwa-gsep">·</span><span class="pfwa-gnm">' + esc(tp) + '</span>' : ''); r.removeAttribute('title'); }
        if (alvo) {
          if (gh) { var g3 = document.createElement('span'); g3.className = 'pfwa-rowgp'; g3.innerHTML = gh; alvo.appendChild(g3); }
          if (tp) { var t3 = document.createElement('span'); t3.className = 'pfwa-rowtp'; t3.textContent = tp; try { if (prev) t3.style.setProperty('color', getComputedStyle(prev).color, 'important'); } catch (e) { } alvo.appendChild(t3); }
          r.setAttribute('title', [s.cid ? '📍 ' + [s.cid, s.uf].filter(Boolean).join('-') : '', tp].filter(Boolean).join(' · '));
        } else { if (gh && ln) ln.innerHTML = (cityHtml ? cityHtml + '<span class="pfwa-gsep">·</span>' : '') + gh + (tp ? '<span class="pfwa-gsep">·</span><span class="pfwa-gnm">' + esc(tp) + '</span>' : ''); } // 4.51 - cidade junto · sem coluna (caso raro) → cai pra linha da mensagem
      }
    });
  }
  // 4.69 - A pedido do Vitor ("qnd eu mexo ali nos grupos tá ficando bugado"): a lista do WhatsApp é "virtual" (só desenha ~20 conversas,
  // cada uma presa numa posição) — esconder linhas deixava buracos e a lista vazia. Agora o filtro NÃO mexe na lista do WhatsApp: abre uma
  // lista NOSSA por cima dela (#pfwa-fl) com as conversas do grupo (todas, com o motor; sem ele, as que estão carregadas). Clique = abre a conversa.
  function filtroBate(s, x) {
    s = s || {};
    if (menuFiltro.indexOf('g:') === 0) return (s.tipo === 'cliente' || s.tipo === 'contato') && audGruposDe(s).indexOf(menuFiltro.slice(2)) >= 0;
    if (menuFiltro === 'semg') return s.tipo === 'cliente' && !audGruposDe(s).length;
    if (menuFiltro === 'emitir') return !!s.emitir;
    if (menuFiltro === 'pend') return !!s.pend; // 6.2
    return true;
  }
  var FL = null, flSig = '';
  function aplicarFiltro() {
    document.querySelectorAll('#pane-side [role="listitem"]').forEach(function (r) { if (r.style.display === 'none') r.style.display = ''; });
    var ativo = menuLig && (menuFiltro.indexOf('g:') === 0 || menuFiltro === 'semg' || menuFiltro === 'emitir' || menuFiltro === 'pend');
    var pane = $('#pane-side');
    if (!ativo || !pane || document.documentElement.classList.contains('pfwa-coberto')) { if (FL) FL.style.display = 'none'; flSig = ''; return; }
    if (!FL) { FL = document.createElement('div'); FL.id = 'pfwa-fl'; document.body.appendChild(FL);
      FL.addEventListener('click', function (e) { var it = e.target.closest('[data-flnome]'); if (it) { flAbrir(it.getAttribute('data-flnome'), it.getAttribute('data-flid')); return; } if (e.target.closest('[data-flsair]')) { menuFiltro = ''; chrome.storage.local.set({ menuFiltro: '' }); pintarMenu(); } }); }
    var rc = pane.getBoundingClientRect();
    // 4.70 - BUG (Vitor: 'esse filtro não tá funcionando'): z-index 40 ficava por baixo da lista do WhatsApp real; agora na camada do menu do PF
    FL.style.cssText = 'display:block;position:fixed;left:' + rc.left + 'px;top:' + rc.top + 'px;width:' + rc.width + 'px;height:' + rc.height + 'px;z-index:9990';
    var vistos = {}, L = [];
    linhasLista().forEach(function (x) { var s = sitCache[x.nome]; vistos[x.nome] = 1; if (filtroBate(s, x)) L.push({ nome: x.nome, s: s || {}, hora: x.hora || '', unread: x.unread ? 1 : 0 }); });
    (grpLista || []).forEach(function (c) { if (vistos[c.nome]) return; vistos[c.nome] = 1; if (filtroBate(c.s)) L.push({ nome: c.nome, id: c.id, s: c.s, hora: '', unread: c.unread || 0 }); });
    var titulo = menuFiltro === 'semg' ? 'Sem grupo' : menuFiltro === 'emitir' ? '📦 A emitir' : menuFiltro === 'pend' ? '⏳ Com pendência' : menuFiltro.slice(2);
    var sig = titulo + '|' + L.map(function (x) { return x.nome + (x.unread ? '*' : '') + x.hora; }).join('|') + '|' + tituloConversa();
    if (sig === flSig) return; flSig = sig;
    var atual = tituloConversa();
    var h = '<div class="pfwa-flcab"><b>' + esc(titulo) + '</b> <span>' + L.length + ' conversa(s)' + (grpLista ? '' : ' carregada(s) — ligue o motor pra ver todas') + '</span><span class="pfwa-flx" data-flsair="1" title="Mostrar todas as conversas">✕ ver todas</span></div>';
    if (!L.length) h += '<div class="pfwa-flvz">Nenhuma conversa desse grupo' + (grpLista ? '' : ' na parte da lista que o WhatsApp carregou') + '.</div>';
    L.forEach(function (x) { var s = x.s || {}, loc = [s.cid, s.uf].filter(Boolean).join('-'), gs = audGruposDe(s);
      h += '<div class="pfwa-flit' + (x.nome === atual ? ' on' : '') + '" data-flnome="' + esc(x.nome) + '" data-flid="' + esc(x.id || '') + '">' +
        '<div class="pfwa-flav">' + esc((x.nome || '?').trim().charAt(0).toUpperCase()) + '</div><div class="pfwa-flmid"><div class="pfwa-flnm">' + esc(x.nome) + '</div>' +
        '<div class="pfwa-flsub">' + (loc ? '📍 ' + esc(loc) : '') + (gs.length ? (loc ? ' · ' : '') + esc(gs.join(', ')) : '') + (s.tpc ? ' · ' + esc(s.tpc) : '') + '</div></div>' +
        '<div class="pfwa-flr">' + (x.hora ? '<small>' + esc(x.hora) + '</small>' : '') + (x.unread ? '<i>' + (x.unread > 1 ? x.unread : '') + '</i>' : '') + '</div></div>'; });
    FL.innerHTML = h;
  }
  async function flAbrir(nome, id) {
    if (id && motorOk) { try { var r = await motor('abrir', { id: id }, 8000); if (r && r.ok) { flSig = ''; return; } } catch (e) { } }
    var lin = linhaDoNome(nome); if (lin) { clicar(lin); flSig = ''; return; }
    var cx = caixaBusca(); if (!cx) return;
    escreverBusca(cx, nome);
    var l2 = await esperar(function () { return linhaDoNome(nome); }, 5000);
    if (l2) clicar(l2);
    await dormir(400); escreverBusca(cx, ''); flSig = '';
  }
  // ═══ 📦 MEUS PEDIDOS NA COLUNA (4.95) ═══ A pedido do Vitor ("um formato tipo o B, só que redondo… na coluna do lado esquerdo… q qnd passar o
  // mouse em cima amplia… a etapa redonda em cima do ícone"): anel por pedido (pedido pelo PF a cada 60 s, acao meusPedidos). Anel enche pela etapa,
  // vermelho piscando = precisa de você; mouse = cartão (#pfwa-mppop) com a barra das etapas e os botões; clique = abre a conversa do cliente.
  var MP = [], MPPOP = null, mpTmr = 0;
  // 10.1 - A pedido do Vitor ("coloca uma opção pra eu tirar se quiser… tenho ctza que seguiu"): ✕ Tirar daqui no cartão do anel = some só da coluna (neste navegador, 30 dias);
  // o pedido continua no PF. + a coluna mostra TODOS os anéis (antes parava em 14) e rola com a barrinha.
  var MP_OCULTOS = {};
  try { chrome.storage.local.get(['mpOcultos'], function (r) { MP_OCULTOS = (r && r.mpOcultos) || {}; var lim = Date.now() - 30 * 864e5; Object.keys(MP_OCULTOS).forEach(function (k) { if (MP_OCULTOS[k] < lim) delete MP_OCULTOS[k]; }); try { mpPintar(); } catch (e) { } }); } catch (e) { }
  function mpVisiveis() { return MP.filter(function (x) { return !MP_OCULTOS[x.id]; }); }
  async function mpCarregar() { if (CFG.mp === false) { MP = []; mpPintar(); return; } try { var r = await msg({ t: 'acao', acao: 'meusPedidos', arg: {} }); if (r && r.lista) { MP = r.lista; mpPintar(); } if (r && r.mesa && r.mesa.ic) { MESA = r.mesa; mesaPintar(); } } catch (e) { } }
  setTimeout(mpCarregar, 6000); setInterval(function () { if (vivo()) mpCarregar(); }, 60000);
  function mpEsc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]; }); }
  var MESA = null; // 7.2 - {t, ic, nome} da mesa de quem está logado no PF
  function mesaPintar() { try { var d = RAIL && RAIL.querySelector('.pfwa-raildia'); if (d && MESA) { d.textContent = MESA.ic; d.title = MESA.ic + ' ' + MESA.nome + ' — abre o PF já nessa tela'; } } catch (e) { } }
  function mpPintar() { mesaPintar();
    var MP = mpVisiveis();
    try { var rp = RAIL && RAIL.querySelector('.pfwa-railped'); if (rp) { var nP = MP.filter(function (x) { return x.tipo !== 'emit'; }).length, nA = MP.filter(function (x) { return x.al; }).length, bn = rp.querySelector('.pfwa-railn');
      if (bn) { bn.textContent = nP ? String(nP) : ''; bn.style.display = nP ? '' : 'none'; }
      rp.title = '📦 Meus pedidos' + (nP ? ' — ' + nP + ' em aberto' + (nA ? ' · ' + nA + ' atrasado' + (nA > 1 ? 's' : '') : '') : '') + '\nClique: vai pra aba do PF já em Meus pedidos'; } } catch (e) { }
    var wr = RAIL && RAIL.querySelector('.pfwa-mpw'); if (!wr) return;
    if (CFG.mp === false || !MP.length) { wr.innerHTML = ''; return; }
    wr.innerHTML = '<div class="pfwa-mpsep" title="Meus pedidos"></div>' + MP.slice(0, 80).map(function (x) {
      return '<div class="pfwa-mpr' + (x.tipo === 'emit' ? ' pfwa-mpem' : '') + (x.al ? ' pfwa-mpal' : '') + '" data-acao="mpConv" data-arg="' + mpEsc(x.id) + '" data-mp="' + mpEsc(x.id) + '" style="--p:' + (x.p || 0) + ';--c:' + x.cor + '"><i>' + x.ic + '</i><em>' + mpEsc(x.sel || '') + '</em></div>';
    }).join('') + (MP.length > 80 ? '<div class="pfwa-mpmais" data-acao="irTela" data-arg="meuspv" title="Ver todos no PF">+' + (MP.length - 80) + '</div>' : '') +
      (MP.some(function (x) { return x.tipo === 'emit'; }) ? '<div class="pfwa-mpmais pfwa-mplimpa" data-acao="mpLimpar" title="Limpar lembretes de emitir">🧹</div>' : '');
  }
  // 5.0 - 🧹 limpar os lembretes "emitir o pedido" (os pedidos são emitidos no JBoss)
  async function mpLimparPop(el) {
    var c = await msg({ t: 'acao', acao: 'mpLimpar', arg: { modo: 'contar' } }); if (!c || !c.todos) { audToast('Nada pra limpar'); mpCarregar(); return; }
    if (!MPPOP) { MPPOP = document.createElement('div'); MPPOP.id = 'pfwa-mppop'; document.body.appendChild(MPPOP); MPPOP.addEventListener('click', clique); MPPOP.addEventListener('mouseleave', function () { mpPopFechar(300); }); MPPOP.addEventListener('mouseenter', function () { clearTimeout(mpTmr); }); }
    clearTimeout(mpTmr);
    MPPOP.innerHTML = '<div class="t">🧹 Limpar lembretes de emitir</div><div class="s">Os pedidos são emitidos no JBoss — limpe o que já foi feito. Pedido que aparece no PF (ou importado do JBoss) fecha o lembrete sozinho.</div>' +
      '<div class="bt">' + (c.antigos ? '<b data-acao="mpLimparA" class="g">Os de outros dias (' + c.antigos + ')</b>' : '') + '<b data-acao="mpLimparT">Todos (' + c.todos + ')</b></div>';
    var r = (el || RAIL).getBoundingClientRect(); MPPOP.style.display = 'block';
    MPPOP.style.left = (r.right + 10) + 'px'; MPPOP.style.top = Math.max(8, Math.min(window.innerHeight - MPPOP.offsetHeight - 8, r.top - 10)) + 'px';
  }
  async function mpLimpar(modo) { mpPopFechar(0); var r = await msg({ t: 'acao', acao: 'mpLimpar', arg: { modo: modo } }); audToast('🧹 ' + ((r && r.n) || 0) + ' lembrete(s) limpo(s)'); mpCarregar(); }
  function mpPop(x, el) {
    if (!MPPOP) { MPPOP = document.createElement('div'); MPPOP.id = 'pfwa-mppop'; document.body.appendChild(MPPOP); MPPOP.addEventListener('click', clique); MPPOP.addEventListener('mouseleave', function () { mpPopFechar(300); }); MPPOP.addEventListener('mouseenter', function () { clearTimeout(mpTmr); }); }
    clearTimeout(mpTmr);
    var et = ['emitido', 'separado', 'conferido', 'faturado', 'despach.'], ix = x.ix;
    var bar = et.map(function (e, i) { var k = i < ix ? 'ok' : i === ix ? (x.al ? 'lt' : 'at') : ''; return '<span class="' + k + '"></span>'; }).join('');
    var bt = function (a, t, g) { return '<b data-acao="' + a + '" data-arg="' + mpEsc(x.id) + '" class="' + (g ? 'g' : '') + '">' + t + '</b>'; };
    MPPOP.innerHTML = '<div class="t">' + (x.num ? mpEsc(x.num) + ' · ' : '') + mpEsc(x.nome) + '</div><div class="s">' + mpEsc(x.det || '') + '</div>' +
      (x.tipo !== 'emit' ? '<div class="bar">' + bar + '</div><div class="lb">' + et.map(function (e) { return '<i>' + e + '</i>'; }).join('') + '</div>' : '') +
      (x.aviso ? '<div class="av">⚠ ' + mpEsc(x.aviso) + '</div>' : '') +
      '<div class="bt">' + (x.col === 'faturado' && !x.avisado ? bt('mpAvisar', '💬 Avisar o cliente', 1) : bt('mpConv', '💬 Abrir conversa')) + bt('mpVer', '📄 Ver no PF') + (x.col === 'conferido' ? bt('mpCobrar', '📋 Cobrar faturamento') : '') + (x.tipo === 'emit' ? bt('mpEmitido', '✔ Já emiti') : x.tipo === 'av' ? bt('mpEmitido', '⏩ Avançar') : '') /* 10.8 */ + bt('mpTirar', '✕ Tirar daqui') + '</div>';
    var r = el.getBoundingClientRect(); MPPOP.style.display = 'block';
    MPPOP.style.left = (r.right + 10) + 'px'; MPPOP.style.top = Math.max(8, Math.min(window.innerHeight - MPPOP.offsetHeight - 8, r.top - 10)) + 'px';
  }
  function mpPopFechar(ms) { clearTimeout(mpTmr); mpTmr = setTimeout(function () { if (MPPOP) MPPOP.style.display = 'none'; }, ms || 0); }
  // 7.2 - A pedido do Vitor ("esse card dá pra abrir se o mouse ficar uns 2 segundos em cima"): o cartão do anel só abre com o mouse PARADO 2 s em cima
  // (MP_HOVER_MS); passar o mouse de passagem não abre. Com um cartão já aberto, ir pra outro anel troca na hora.
  var MP_HOVER_MS = 1000, mpHovTmr = null, mpHovEl = null;
  // 7.6 - A pedido do Vitor ("não tá abrindo o cardizinho qnd fico com o mouse parado em cima"): a coluna é redesenhada sozinha e o anel que estava
  // embaixo do mouse virava OUTRO elemento — o cartão abria preso ao velho (fora da tela) ou o tempo recomeçava. Agora vale o id do pedido e,
  // na hora de abrir, pega o anel que está na tela agora (e confere que o mouse continua em cima dele).
  var mpMouse = { x: -1, y: -1 };
  document.addEventListener('mousemove', function (e) { mpMouse.x = e.clientX; mpMouse.y = e.clientY; }, true);
  document.addEventListener('mouseover', function (e) { var el = e.target && e.target.closest && e.target.closest('.pfwa-mpr'); if (!el) return; var id = el.getAttribute('data-mp'); if (id === mpHovEl) return; mpHovEl = id; clearTimeout(mpHovTmr);
    var abre = function () { if (mpHovEl !== id) return; var x = MP.find(function (y) { return y.id === id; }); if (!x) return;
      var vivo = null; try { var em = document.elementFromPoint(mpMouse.x, mpMouse.y); vivo = em && em.closest && em.closest('.pfwa-mpr'); } catch (er) { }
      if (!vivo || vivo.getAttribute('data-mp') !== id) { var lista = document.querySelectorAll('.pfwa-mpr'); for (var i = 0; i < lista.length; i++) if (lista[i].getAttribute('data-mp') === id) { vivo = lista[i]; break; } }
      if (vivo && vivo.isConnected) mpPop(x, vivo); };
    if (MPPOP && MPPOP.style.display === 'block') { clearTimeout(mpTmr); abre(); } else mpHovTmr = setTimeout(abre, MP_HOVER_MS); }, true);
  document.addEventListener('mouseout', function (e) { var el = e.target && e.target.closest && e.target.closest('.pfwa-mpr'); if (!el || !el.isConnected) return; var rt = e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('.pfwa-mpr'); if (!(rt && rt.getAttribute('data-mp') === el.getAttribute('data-mp'))) { clearTimeout(mpHovTmr); mpHovEl = null; }
    if (el && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('#pfwa-mppop,.pfwa-mpr'))) mpPopFechar(350); }, true);
  async function mpAbrirConversa(x) { if (!x) return false; var nm = x.wa || ''; if (nm) { await flAbrir(nm, x.waId || ''); return true; } if (x.nome) { await flAbrir(x.nome, ''); return true; } return false; }
  async function mpAcao(ac, id) {
    var x = MP.find(function (y) { return y.id === id; }); if (!x) return; mpPopFechar(0);
    if (ac === 'mpConv') { await mpAbrirConversa(x); return; }
    if (ac === 'mpTirar') { MP_OCULTOS[id] = Date.now(); try { chrome.storage.local.set({ mpOcultos: MP_OCULTOS }); } catch (e) { } mpPintar(); msg({ t: 'acao', acao: 'mpTirar', arg: { id: id } }); /* 11.0: grava no PF também */ audToast('✕ Tirei da coluna — o pedido continua no PF'); return; }
    if (ac === 'mpVer') { msg({ t: 'acao', acao: 'mpVer', arg: { id: id }, focar: true }); return; }
    if (ac === 'mpEmitido') { await msg({ t: 'acao', acao: 'mpEmitido', arg: { id: id } }); mpCarregar(); return; }
    if (ac === 'mpCobrar') { var r = await msg({ t: 'acao', acao: 'mpTexto', arg: { id: id, tipo: 'cobrar' } }); if (r && r.txt) { try { await navigator.clipboard.writeText(r.txt); } catch (e) { } audToast('📋 Texto copiado — cole pro faturamento'); } return; }
    if (ac === 'mpAvisar') { var r2 = await msg({ t: 'acao', acao: 'mpTexto', arg: { id: id, tipo: 'avisar' } }); if (!r2 || !r2.txt) return; await mpAbrirConversa(x); await dormir(900); escreverNaCaixa(r2.txt); audToast('💬 Mensagem na caixa — confira e envie'); mpCarregar(); return; }
  }
  // 5.1 - o chip do Menu desligado ficava em cima do título "WhatsApp": procura um canto livre na faixa de cima da lista (senão, embaixo dela)
  function pfwaChipOffPos() {
    if (!MENU || menuLig) return; var w = MENU.offsetWidth || 64, h = MENU.offsetHeight || 26, sd = document.querySelector('#side') || document.querySelector('#pane-side');
    var sr = sd ? sd.getBoundingClientRect() : { left: 8, right: 360, top: 0, bottom: window.innerHeight };
    var cands = [], x; for (x = Math.round(sr.right - w - 8); x >= sr.left + 4; x -= 6) cands.push([x, 6]);
    for (x = Math.round(sr.left + 8); x + w <= sr.right - 4; x += 6) cands.push([x, Math.round(window.innerHeight - h - 8)]);
    for (var i = 0; i < cands.length; i++) if (pfwaCaixaLivre(cands[i][0], cands[i][1], w, h, null, [])) { MENU.style.left = cands[i][0] + 'px'; MENU.style.top = cands[i][1] + 'px'; return; }
    MENU.style.left = '8px'; MENU.style.top = Math.round(window.innerHeight - h - 8) + 'px';
  }
  setInterval(function () { try { pfwaChipOffPos(); } catch (e) { } }, 3000);
  function pintarMenu() {
    if (!MENU) return;
    var root = document.documentElement;
    root.classList.toggle('pfwa-menu', menuLig);
    root.classList.toggle('pfwa-menudisc', menuCor === 'discreta');
    if (!menuLig) {
      MENU.className = 'pfm-off'; MENU.style.right = 'auto'; MENU.style.display = 'flex';
      var offH = '<span class="pfm-offchip" data-acao="menuTog" title="Ligar o Menu do PF">🧩 PF ▸</span>'; if (MENU.innerHTML !== offH) MENU.innerHTML = offH;
      pfwaChipOffPos(); RAIL.style.display = 'none'; badgesRender(); aplicarFiltro(); return;
    }
    MENU.className = (menuCor === 'discreta' ? 'pfwa-disc' : ''); MENU.style.display = 'flex'; MENU.style.left = ''; MENU.style.top = '';
    MENU.style.right = root.classList.contains('pfwa-aberto') ? '380px' : '0';
    RAIL.style.display = 'flex';
    // 4.19 - A pedido do Vitor ("ao invés desses filtros, vamos deixar os grupos. Linha amarela, etc"): a barra mostra os GRUPOS dos clientes
    // (do cadastro no PF) + "Sem grupo" (cliente sem grupo marcado). Clicar = só as conversas daquele grupo.
    var gN = {}, gCor = {}, nSemG = 0;
    linhasLista().forEach(function (x) { var s = sitCache[x.nome] || {}; if (s.tipo !== 'cliente' && s.tipo !== 'contato') return; var gs = audGruposDe(s); if (!gs.length) { nSemG++; return; } gs.forEach(function (g) { gN[g] = (gN[g] || 0) + 1; if (s.gCor && g === s.grupo) gCor[g] = s.gCor; }); });
    var ordem = svGruposTodos().map(function (g) { return g[1]; }); svGruposTodos().forEach(function (g) { if (g[2] && !gCor[g[1]]) gCor[g[1]] = g[2]; });
    // 4.62 - A pedido do Vitor ("aqui só mostra os que têm msg sem ler?… é que não tá aparecendo agrícola"): a barra contava só as conversas que o
    // WhatsApp tinha desenhado na tela (~20). Agora TODOS os grupos aparecem sempre (zerado = apagado) e, com o motor ligado, o número é da lista
    // INTEIRA de conversas (grpTot, refeito a cada 5 min por grpContarTudo); sem o motor continua sendo o que está carregado na tela.
    var gTot = grpTot && grpTot.n ? grpTot : null;
    if (gTot) { gN = {}; Object.keys(gTot.n).forEach(function (g) { gN[g] = gTot.n[g]; }); nSemG = gTot.semg || 0; }
    ordem.forEach(function (g) { if (gN[g] == null) gN[g] = 0; });
    var gKeys = Object.keys(gN).sort(function (a, b) { var ia = ordem.indexOf(a), ib = ordem.indexOf(b); ia = ia < 0 ? 99 : ia; ib = ib < 0 ? 99 : ib; return ia - ib || gN[b] - gN[a]; });
    var gTit = gTot ? 'em todas as suas conversas' : 'nas conversas carregadas na tela agora (ligue o motor pra contar todas)';
    var pillG = function (k, txt, n, cor) { return '<span class="pfm-pill' + (menuFiltro === k ? ' on' : '') + '" data-acao="menuFiltro" data-arg="' + esc(k) + '" title="' + n + ' ' + gTit + '"' + (n ? '' : ' style="opacity:.45"') + '>' + (cor ? '<i class="pfm-dot" style="background:' + esc(cor) + '"></i>' : '') + txt + ' <b>' + n + '</b></span>'; };
    var hG = '<span class="pfm-logo">PF</span>' + '<span class="pfm-pill' + (menuFiltro.indexOf('g:') !== 0 && menuFiltro !== 'semg' ? ' on' : '') + '" data-acao="menuFiltro" data-arg="">Tudo</span>';
    gKeys.forEach(function (g) { hG += pillG('g:' + g, esc(g), gN[g], gCor[g]); });
    if (nSemG) hG += pillG('semg', '❔ Sem grupo', nSemG, '');
    var nEmit = 0; linhasLista().forEach(function (x) { var s = sitCache[x.nome] || {}; if (s.emitir) nEmit++; }); // 4.67 - 📦 a emitir
    if (nEmit) hG += '<span class="pfm-pill pfm-emit' + (menuFiltro === 'emitir' ? ' on' : '') + '" data-acao="menuFiltro" data-arg="emitir" title="Pedidos que você precisa emitir/mandar">📦 a emitir <b>' + nEmit + '</b></span>';
    var nPend = 0; linhasLista().forEach(function (x) { var s = sitCache[x.nome] || {}; if (s.pend) nPend++; }); // 6.2 - ⏳ com pendência
    if (nPend) hG += '<span class="pfm-pill pfm-emit' + (menuFiltro === 'pend' ? ' on' : '') + '" data-acao="menuFiltro" data-arg="pend" title="Conversas que você marcou com pendência">⏳ pendência <b>' + nPend + '</b></span>';
    if (!gKeys.length && !nSemG && !nEmit && !nPend) hG += '<span class="pfm-vazio">Nenhum cliente do PF nesta lista ainda</span>';
    if (gTot) hG += '<span class="pfm-vazio" title="Contado em todas as conversas pelo motor">· todas as conversas</span>';
    var ls = linhasLista(), nC = 0, nF = 0, nCot = 0, nSem = 0, etqN = {};
    ls.forEach(function (x) { var s = sitCache[x.nome] || {}; if (s.tipo === 'cliente') nC++; else if (s.tipo === 'fornecedor') nF++; if (s.cot) nCot++; if (x.unread) nSem++; x.etqs.forEach(function (e) { etqN[e] = (etqN[e] || 0) + 1; }); });
    var etqTop = Object.keys(etqN).sort(function (a, b) { return etqN[b] - etqN[a]; }).slice(0, 5);
    var pill = function (k, txt, n) { return '<span class="pfm-pill' + (menuFiltro === k ? ' on' : '') + '" data-acao="menuFiltro" data-arg="' + esc(k) + '">' + txt + (n != null ? ' <b>' + n + '</b>' : '') + '</span>'; };
    var h = hG; // a barra antiga (Clientes/Fornecedores/etiquetas/Cotação aberta) saiu na 4.19
    h += '<span class="pfm-dir"><span class="pfm-cor"><i data-acao="menuCor" data-arg="azul" class="' + (menuCor !== 'discreta' ? 'on' : '') + '">azul</i><i data-acao="menuCor" data-arg="discreta" class="' + (menuCor === 'discreta' ? 'on' : '') + '">discreta</i></span><span class="pfm-tog" data-acao="menuTog" title="Desligar o Menu do PF">Menu do PF <span class="pfm-sw"></span></span></span>';
    MENU.innerHTML = h;
    var rail = [['vendas', '📄', 'Cotações'], ['kanban', '🗂️', 'Quadro de vendas'], ['mesa', '🛒', 'Mesa do comprador'], ['home', '🏠', 'Início do PF'], ['ext', '🧩', 'PartsFlow no WhatsApp']];
    // 6.4 - A pedido do Vitor ("algum lugar que leve direto pra tela de meus pedidos" → opção A): botão 📦 laranja em 1º, com o nº de pedidos em aberto
    RAIL.innerHTML = '<span class="pfwa-railped" data-acao="irTela" data-arg="meuspv" title="📦 Meus pedidos — abre o PF já nessa tela">📦<b class="pfwa-railn"></b></span>' +
      // 7.2 - A pedido do Vitor ("faz um para o meu dia também" + "no caso do comprador ou outro usuário, ir para a mesa dele"): botão amarelo logo embaixo do 📦 →
      // abre a MESA de quem está logado no PF (vendedor ☀️ Meu dia, comprador 🛒 Mesa do comprador, outros 📥 Minha mesa). Ícone/nome vêm do PF no meusPedidos (r.mesa).
      '<span class="pfwa-raildia" data-acao="irTela" data-arg="minhamesa" title="☀️ Meu dia — abre o PF já nessa tela">☀️</span>' +
      '<span class="pfwa-railcrm" data-acao="crmHoje" title="📒 O que foi pro CRM — hoje, 7 dias, 30 dias (relatório pra mostrar pra equipe)">📒</span>' + // 9.3
      rail.map(function (r) { return '<span data-acao="irTela" data-arg="' + r[0] + '" title="' + r[2] + '">' + r[1] + '</span>'; }).join('') +
      // 9.1 - A pedido do Vitor ("vamos colocar um atalho melhor. aqui está muito escondido"): ⚙️ fixo na coluna abre as Configurações da extensão em aba própria
      '<span class="pfwa-railcfg" data-acao="cfgTela" title="⚙️ Configurações da extensão — abre numa aba própria">⚙️</span>' +
      '<div class="pfwa-mpw"></div>';
    mpPintar();
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
  // 6.0 - A pedido do Vitor ("Me envia 03 luvas 03-312 da TX amanhã" — 1 código + pedido direto e não aparecia o selo pra atualizar a cotação): envia/manda/separa/fatura/pedido/quero também contam.
  function spContaCods(t) {
    t = juntaCod(t);
    var n = 0, vis = {}; (String(t || '').match(COD_RE) || []).forEach(function (tk) { var u = tk.toUpperCase(); if (ehCodTk(tk) && !vis[u]) { vis[u] = 1; n++; } }); // 6.3 - o mesmo código 2x conta 1
    var pede = /\b(cot|or[cç]|pre[cç]o|valor|quanto|tem\b|disponi|saldo|envi[ae]|mand[ae]|separ[ae]|fatur[ae]|despach[ae]|reserv[ae]|pedido|quero|preciso|levo)/i.test(t) || PECA_RE.test(t) || soCodigo(t);
    if (soCodigo(t) && !n) n = 1;
    return n >= 2 || (n >= 1 && pede) ? n : 0;
  }
  function selosVigiar() {
    var liga = CFG.selo !== false && avisoLigado && contatoAt && !contatoAt.grupo;
    var els = Array.prototype.slice.call(document.querySelectorAll('#main [data-pre-plain-text]')).slice(-40);
    // 4.64 - A pedido do Vitor ("tá certo 2 tarjas laranjas?" — mensagem com lista "• 4212047 ou 1624393"): o WhatsApp põe um [data-pre-plain-text] dentro
    // do outro em mensagem com lista/formatação; o selo saía em cada um. Fica só o de fora (e some o selo que já estava no de dentro).
    els.forEach(function (el) { if (el.parentElement && el.parentElement.closest('[data-pre-plain-text]')) { var s0 = el.querySelector(':scope > .pfwa-selo'); if (s0) s0.remove(); } });
    els = els.filter(function (el) { return !(el.parentElement && el.parentElement.closest('[data-pre-plain-text]')); });
    var txt = function (el) { var txs = Array.prototype.filter.call(el.querySelectorAll('.selectable-text'), function (x) { return !(x.parentElement && x.parentElement.closest('.selectable-text')); }), tx = txs[0]; /* 6.3 - "2959140 - 01 PÇ" contava 2: o número pintado de telefone vinha 2x */ if (txs.length > 1) return Array.prototype.map.call(txs, function (x) { return x.innerText || ''; }).join('\n').replace(/📄\s*\d+\+?|✓ cot\./g, '').trim(); return ((tx ? tx.innerText : el.innerText) || '').replace(/📄\s*\d+\+?|✓ cot\./g, '').trim(); };
    // 4.15 - A pedido do Vitor ("não to achando esse número que ele encontrou 13X32"): o selo lia o BLOCO inteiro de mensagens
    // do cliente e puxava código de outra mensagem. Agora lê SÓ a mensagem onde o selo está (o código tem que estar nela).
    var alvo = [];
    // 4.80 - A pedido do Vitor ("se tem 2 separados, qual a melhor maneira de mandar já os 2 pra cotação de uma vez?" — cliente mandou "2244536 - 01" e
    // "1946725 - 01" em mensagens separadas): mensagens SEGUIDAS do cliente (sem mensagem sua no meio) com código viram UM selo só, no último balão com código,
    // lendo todas elas (+ as dele que vêm logo depois, ex.: "Original Caterpillar"). Mensagem sua no meio separa os pedidos.
    var cruN = function (t) { var n = 0; (juntaCod(t).match(COD_RE) || []).forEach(function (tk) { if (ehCodTk(tk)) n++; }); return n; };
    if (liga) {
      var runs = [], cur = [];
      // 4.84 - A pedido do Vitor ("Mas agora puxa até o que eu ja tinha cotado né?"): mensagem SUA sem texto (foto/PDF da cotação do JBoss) não tem
      // [data-pre-plain-text] e não separava os pedidos. Agora a sequência vem das LINHAS da conversa (msgLinhas): qualquer linha sua corta, e 1 h+
      // entre duas mensagens do cliente também corta.
      var seq = [], vistos = [];
      try { msgLinhas().slice(-80).forEach(function (row) {
        if (minhaEl(row)) { seq.push(null); return; }
        var pps = row.matches && row.matches('[data-pre-plain-text]') ? [row] : Array.prototype.slice.call(row.querySelectorAll('[data-pre-plain-text]'));
        pps.forEach(function (pp) { if (els.indexOf(pp) >= 0 && vistos.indexOf(pp) < 0) { vistos.push(pp); seq.push(pp); } });
      }); } catch (e) { seq = []; }
      els.forEach(function (el) { if (vistos.indexOf(el) < 0) seq.push(minhaEl(el) ? null : el); });
      var tAnt = 0;
      seq.forEach(function (el) { if (!el) { if (cur.length) runs.push(cur); cur = []; tAnt = 0; return; }
        var tq = 0; try { tq = msgQuando(el) || 0; } catch (e) { }
        if (tq && tAnt && tq - tAnt > 3600000 && cur.length) { runs.push(cur); cur = []; }
        if (tq) tAnt = tq; cur.push({ el: el, t: txt(el) }); });
      if (cur.length) runs.push(cur);
      runs.forEach(function (R) {
        var com = R.filter(function (x) { return spContaCods(x.t) || cruN(x.t); });
        var comCod = R.filter(function (x) { return spContaCods(x.t); });
        if (com.length < 2) { comCod.forEach(function (x) { alvo.push({ el: x.el, t: x.t, n: spContaCods(x.t) }); }); return; }
        var i0 = R.indexOf(com[0]), ult = com[com.length - 1];
        var t = R.slice(i0).map(function (x) { return x.t; }).join('\n');
        var n = spContaCods(t); if (!n) return;
        alvo.push({ el: ult.el, t: t, n: com.length > n ? com.length : n, junto: com.length });
      });
    }
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
      s.title = feito ? 'Você já criou a cotação deste pedido no PF — clique pra ver de novo' : 'O PF achou ' + n + ' código' + (n > 1 ? 's' : '') + (A.junto ? ' nas ' + A.junto + ' mensagens seguidas do cliente' : ' neste pedido') + ' — clique pra ver e, se quiser, criar a cotação';
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
  var spQuer = '';
  async function spAbrir(s) {
    spEl(); spMsg = s; spR = null;
    SP.style.display = 'block'; SP.innerHTML = '<div class="sp-cab"><b>📄 ' + s._n + ' código' + (s._n > 1 ? 's' : '') + ' neste pedido</b><span class="sp-x" data-sp="x" title="Fechar (Esc)">✕</span></div><div class="sp-b"><button data-sp="jboss" class="sp-jb" title="Lê pelas regras do Leitor de Peças e copia no modelo do JBoss — é só colar no JBoss">📋 Copiar pro JBoss</button></div><div class="sp-b"><button data-sp="criar">📄 Criar cotação no PF</button><button data-sp="min" class="sp-min" title="Cria a cotação no PF e deixa ela minimizada lá (não troca de tela)">⬇ Criar minimizada</button></div><div class="sp-nada">Lendo ' + s._n + ' código' + (s._n > 1 ? 's' : '') + ' no PF… (pedido grande pode levar uns segundos)</div>';
    spPos(); spQuer = ''; // 9.9 - A pedido do Vitor ("cadê as outras opções?"): os botões aparecem já enquanto lê; clicou antes de terminar = faz quando terminar
    spArgs = { k: resp && resp.k, contato: resp && resp.contato, msgs: s._t.split('\n').map(function (x) { return { t: x, eu: false }; }) };
    var r = await msg({ t: 'acao', acao: 'cotar', arg: spArgs });
    if (spMsg !== s) return;
    spR = r; spPinta();
    if (spQuer && r && !r.erro) { var q = spQuer; spQuer = ''; spClique({ target: { closest: function () { return { getAttribute: function () { return q; } }; } }, preventDefault: function () { }, stopPropagation: function () { } }); }
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
    h += '<div class="sp-b"><button data-sp="jboss" class="sp-jb" title="Lê pelas regras do Leitor de Peças e copia no modelo do JBoss — é só colar no JBoss">📋 Copiar pro JBoss</button></div>'; // 9.7
    h += '<div class="sp-b" style="flex-direction:column;align-items:flex-start;gap:4px">' + soMarcaHtml(r, 'sp') + todasHtml() + '</div>';
    h += '<div class="sp-b"><button data-sp="criar">' + (feito ? '📄 Criar de novo no PF' : '📄 Criar cotação no PF') + '</button><button data-sp="min" class="sp-min" title="Cria a cotação no PF e deixa ela minimizada lá (não troca de tela)">⬇ Criar minimizada</button><span class="sp-lk" data-sp="painel">ver no painel ›</span></div>' +
      (feito ? '<div class="sp-ok">✓ Você já criou a cotação desta mensagem.</div>' : '') + (mqSemSaldo(its).length ? '<div class="sp-b"><button data-sp="mapa" class="sp-mapa">🗂️ Mandar pro mapa (' + mqSemSaldo(its).length + ' sem saldo)</button></div>' : '');
    SP.innerHTML = h; spPos();
  }
  function spClique(e) {
    var el = e.target.closest('[data-sp]'); if (!el) return; var a = el.getAttribute('data-sp');
    e.preventDefault(); e.stopPropagation();
    if (a === 'x') { spFechar(); return; }
    if (a === 'painel') { if (spR && !spR.erro) { cot = spR; cotErro = ''; } spFechar(); irAba('cot'); return; }
    if (a === 'mapa') { var rm = spR; spFechar(); mqAbrir(rm); return; } // 6.3
    if (a === 'jboss') { var sj = spMsg; spFechar(); if (sj) jbLer({ texto: sj._t }); return; } // 9.7
    if (a === 'criar' || a === 'min') {
      var s = spMsg, r = spR; if (s && !r) { spQuer = a; var nd = SP.querySelector('.sp-nada'); if (nd) nd.textContent = '⏳ Ainda lendo… a cotação ' + (a === 'min' ? '(minimizada) ' : '') + 'é criada assim que terminar.'; return; }
      if (!s || !r) return; var _min = a === 'min'; // 4.83 - criar minimizada (não traz o PF pra frente)
      msg({ t: 'acao', acao: 'abrirCot', focar: !_min, arg: { minimizar: _min, k: resp && resp.k, pessoa: pessoaComprador(), todas: TODAS, soMarca: r.soMarca || [], itens: itensPF(r.itens) } });
      spFeitos[s._h] = Date.now(); try { sessionStorage.setItem('pfwa_sp_feitos', JSON.stringify(spFeitos)); } catch (er) { }
      s._f = null; spFechar(); selosVigiar(); if (_min) cmToast('✔ Cotação criada no PF (minimizada)');
    }
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && SP && SP.style.display === 'block') { spFechar(); e.stopPropagation(); } }, true);
  document.addEventListener('mousedown', function (e) { if (SP && SP.style.display === 'block' && !SP.contains(e.target) && !(e.target.closest && e.target.closest('.pfwa-selo'))) spFechar(); }, true);
  document.addEventListener('scroll', function () { spPos(); }, true);
  setInterval(function () { try { selosVigiar(); } catch (e) { } }, 1500);


  // ═══ 📋 COPIAR PRO JBOSS (9.7) ═══ A pedido do Vitor ("qnd for texto assim, vamos colocar a opção de já sair igual sai no esquema do leitor… pra eu já mandar
  // pro JBoss" + "PDF tbm. imagem tbm" + "seguindo as regras de lá"): o PF lê pelo Leitor de Peças (as mesmas regras, correções guardadas e a IA dele, sem abrir a
  // tela) e devolve no modelo do JBoss (o mesmo do Copiar do Leitor). Texto = do selo 📄 ou do botão direito; foto/PDF = botão direito na mensagem.
  var JB = null, jbTxt = '';
  function jbEl() { if (!JB) { JB = document.createElement('div'); JB.id = 'pfwa-jb'; JB.style.cssText = 'position:fixed;right:24px;top:90px;z-index:10050;width:340px;max-height:70vh;display:none;flex-direction:column;background:#fff;color:#1a2332;border-radius:12px;box-shadow:0 10px 34px rgba(0,0,0,.3);font:13px Segoe UI,Arial,sans-serif;overflow:hidden';
      document.body.appendChild(JB); JB.addEventListener('click', function (e) { var b = e.target.closest('[data-jb]'); if (!b) return; e.preventDefault(); e.stopPropagation(); var a = b.getAttribute('data-jb'); if (a === 'x') { JB.style.display = 'none'; return; } if (a === 'cp') jbCopiar(true); }); }
    return JB; }
  function jbPinta(corpo, rodape) { jbEl(); JB.style.display = 'flex';
    JB.innerHTML = '<div style="background:#1c2940;color:#fff;padding:10px 12px;display:flex;align-items:center;gap:8px"><b style="flex:1">📋 Copiar pro JBoss</b><span data-jb="x" style="cursor:pointer;background:#C0392B;color:#fff;border-radius:5px;padding:0 7px;font-weight:800" title="Fechar (Esc)">✕</span></div>' +
      '<div style="overflow:auto;padding:10px 12px;flex:1">' + corpo + '</div>' + (rodape ? '<div style="padding:10px 12px;border-top:1px solid #e3e9f0">' + rodape + '</div>' : ''); }
  function jbCopiarTexto(t) { return new Promise(function (ok) {
    try { navigator.clipboard.writeText(t).then(function () { ok(true); }, function () { ok(jbCopiarVelho(t)); }); } catch (e) { ok(jbCopiarVelho(t)); } }); }
  function jbCopiarVelho(t) { try { var ta = document.createElement('textarea'); ta.value = t; ta.style.cssText = 'position:fixed;left:-9999px;top:0'; document.body.appendChild(ta); ta.focus(); ta.select(); var r = document.execCommand('copy'); ta.remove(); return !!r; } catch (e) { return false; } }
  async function jbCopiar(clique) { if (!jbTxt) return; var ok = await jbCopiarTexto(jbTxt); var b = JB && JB.querySelector('[data-jb="cp"]');
    if (b) { b.textContent = ok ? '✔ Copiado — cole no JBoss' : 'Não deu pra copiar — clique de novo'; b.style.background = ok ? '#1a7a1a' : '#C0392B'; }
    if (ok && !clique) cmToast('📋 Copiado no modelo do JBoss — é só colar'); return ok; }
  async function jbLer(a) {
    // 10.2 - A pedido do Vitor ("bom colocar um aviso que está lendo" — colou antes de terminar e foi o print que estava copiado): aviso grande com
    // rodinha, segundos contando e "ainda NÃO cole"; no fim, faixa verde "copiado — pode colar".
    jbTxt = ''; var jbT0 = Date.now();
    jbPinta('<style>@keyframes pfwaJbGira{to{transform:rotate(360deg)}}</style><div style="text-align:center;padding:12px 0">' +
      '<div style="width:34px;height:34px;margin:0 auto 10px;border:4px solid #dfe6ee;border-top-color:#E67E22;border-radius:50%;animation:pfwaJbGira .8s linear infinite"></div>' +
      '<div style="font-weight:800;font-size:15px;color:#1a2332">⏳ Lendo ' + (a.pdf ? 'o PDF' : a.img ? 'a foto' : 'a lista') + '… <span data-jbseg>0 s</span></div>' +
      '<div style="margin-top:8px;background:#FFF3E0;color:#B35C00;border-radius:8px;padding:8px;font-weight:700">Ainda NÃO cole no JBoss — aviso aqui quando copiar</div>' +
      '<div style="font-size:11.5px;color:#778;margin-top:6px">' + (a.img || a.pdf ? 'com IA, pode levar uns segundos' : 'lista grande pode levar uns segundos') + '</div></div>', '');
    var jbTick = setInterval(function () { var s = JB && JB.querySelector('[data-jbseg]'); if (!s) { clearInterval(jbTick); return; } s.textContent = Math.round((Date.now() - jbT0) / 1000) + ' s'; }, 1000);
    var r = await msg({ t: 'acao', acao: 'jbossLer', arg: a }); clearInterval(jbTick);
    if (!r || r.erro || !r.ok) { jbPinta('<div style="color:#C0392B;padding:10px 0">' + esc(r && r.msg ? r.msg : naoDeu()) + '</div>', ''); return; }
    jbTxt = r.txt || '';
    var its = r.itens || [];
    jbPinta('<div style="background:#E8F5E9;color:#1a7a1a;border-radius:8px;padding:8px;font-weight:800;margin-bottom:8px;text-align:center">✔ Pronto — copiado, pode colar no JBoss</div><div style="font-size:12px;color:#667;margin-bottom:6px">' + its.length + ' ite' + (its.length === 1 ? 'm' : 'ns') + ' · lido pelas regras do Leitor de Peças</div>' +
      its.map(function (o) { return '<div style="display:flex;gap:8px;padding:4px 0;border-top:1px solid #eef1f5"><b style="flex:1;font-family:monospace">' + esc(o.codigo) + '</b><span>× ' + esc(String(o.qtd)) + '</span>' + (o.duvida ? '<span title="' + esc(o.duvida) + '" style="color:#C0392B">⚠</span>' : '') + '</div>'; }).join(''),
      '<button data-jb="cp" style="width:100%;border:0;border-radius:8px;padding:10px;background:#27AE60;color:#fff;font-weight:800;cursor:pointer">📋 Copiar</button>' + (its.some(function (o) { return o.duvida; }) ? '<div style="font-size:11.5px;color:#C0392B;margin-top:6px">⚠ tem item com dúvida — confira antes de colar</div>' : ''));
    jbCopiar(false);
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && JB && JB.style.display === 'flex') { JB.style.display = 'none'; e.stopPropagation(); } }, true);

  // ═══ 🗂️ MANDAR PRO MAPA (6.3) ═══
  // A pedido do Vitor (prévia docs/referencias/whatsapp-mapa-criar/ → opção A "tudo pelo WhatsApp" + "quero opção de copiar a msg tbm, além de já enviar direto"
  // + "a questão da saudação, fica estranho se eu já tiver falado com a pessoa no dia"): peças do pedido sem saldo / sem cadastro → janela 🗂️ Novo mapa com as
  // peças e os fornecedores (o PF já marca os que trabalham com o tipo/marca). "💬 Criar e mandar" cria o mapa no PF (aviso pros compradores) e manda pros
  // vendedores dos fornecedores; "📋" copia a mensagem de um; "Só criar o mapa" não manda nada. Saudação: antes de mandar, o motor olha a conversa com aquele
  // número — se você já mandou mensagem hoje, vai sem "Bom dia, Fulano!". Sem o motor, a mensagem vai pelo jeito antigo e a saudação é decidida lá na conversa.
  var MQ = null, mqS = null;
  function mqEl() { if (!MQ) { MQ = document.createElement('div'); MQ.id = 'pfwa-mp'; document.body.appendChild(MQ); MQ.addEventListener('click', mqClique); MQ.addEventListener('input', mqInput); MQ.addEventListener('change', mqInput); } return MQ; }
  function mqFechar() { if (MQ) MQ.style.display = 'none'; mqS = null; }
  function mqSemSaldo(itens) { return (itens || []).filter(function (o) { return o && o.cod && !(o.achou && +o.saldo > 0); }); }
  async function mqAbrir(r) {
    if (!r || r.erro) return;
    var sem = mqSemSaldo(r.itens); if (!sem.length) { cmToast('Todas as peças têm saldo — nada pra mandar pro mapa'); return; }
    mqEl(); MQ.style.display = 'flex'; MQ.innerHTML = '<div class="mp-jan"><div class="mp-cab"><b>🗂️ Novo mapa</b><span class="mp-x" data-mp="x">✕</span></div><div class="mp-corpo"><div class="mp-nada">Montando no PF…</div></div></div>';
    var p = await msg({ t: 'acao', acao: 'mapaPrep', arg: { k: resp && resp.k, contato: resp && resp.contato, itens: sem } });
    if (!p || p.erro || !p.ok) { MQ.querySelector('.mp-corpo').innerHTML = '<div class="mp-nada">' + (p && p.erro === 'pfF5' ? 'Dê F5 na aba do PartsFlow.' : 'Abra o PartsFlow numa aba deste Chrome (ou atualize ele).') + '</div>'; return; }
    mqS = { fase: 'conf', p: p, pedido: itensPF(r.itens), its: p.itens.map(function (i) { return Object.assign({ on: true }, i); }), F: p.forns.map(function (f) { return Object.assign({ on: !!f.sel, ver: false, saud: 'auto' }, f); }), mais: false, busca: '', res: null };
    mqPinta();
  }
  function mqTexto(f, comSaud) {
    var S = mqS, its = S.its.filter(function (i) { return i.on; });
    var d = (f.dest && f.dest[0]) || null, s = comSaud && d ? d.saud + '\n\n' : '';
    return s + S.p.cab + '\n\n' + its.map(function (i) { return String(i.qtd || 1).padStart(2, '0') + ' - ' + i.ref + (i.desc ? ' - ' + i.desc : '') + (i.marca ? ' - ' + i.marca : ''); }).join('\n') + '\n\n' + S.p.fecho;
  }
  function mqPinta() {
    var S = mqS; if (!S || !MQ) return; var p = S.p;
    var on = S.F.filter(function (f) { return f.on; }), comW = on.filter(function (f) { return f.dest.length; });
    var h = '<div class="mp-jan"><div class="mp-cab"><b>🗂️ Novo mapa' + (p.cliente ? ' · ' + esc(p.cliente) : '') + '</b><span class="mp-x" data-mp="x" title="Fechar (Esc)">✕</span></div><div class="mp-corpo">';
    if (S.fase === 'conf') {
      h += '<div class="mp-lab">PEÇAS SEM SALDO</div><table class="mp-t"><tr><th></th><th>CÓDIGO</th><th>QTD</th><th>MARCA</th><th>TIPO</th></tr>' + S.its.map(function (i, k) {
        return '<tr class="' + (i.on ? '' : 'off') + '"><td><input type="checkbox" data-mpi="' + k + '"' + (i.on ? ' checked' : '') + '></td><td><b>' + esc(i.ref) + '</b><br><small>' + esc(i.desc || i.st) + '</small></td>' +
          '<td><input class="mp-q" data-mpq="' + k + '" value="' + (i.qtd || 1) + '"></td><td>' + esc(i.marca || '—') + '</td><td>' + (i.tipo ? '<span class="mp-chip">' + esc(i.tipo.charAt(0) + i.tipo.slice(1).toLowerCase()) + '</span>' : '<small>—</small>') + '</td></tr>';
      }).join('') + '</table>';
      h += '<div class="mp-lab">FORNECEDORES <small>(vêm marcados os que trabalham com o tipo ou a marca · manda pro vendedor do cadastro)</small></div>';
      var lista = S.F.filter(function (f) { return f.on || f.sel; });
      if (S.mais) { var q = S.busca.toUpperCase(); lista = S.F.filter(function (f) { return f.on || f.sel || !q || String(f.nome).toUpperCase().indexOf(q) >= 0; }).slice(0, 60); }
      if (!lista.length && !S.mais) h += '<div class="mp-nada">Nenhum fornecedor marcado pra esse tipo de peça — clique em ＋ outro fornecedor.</div>';
      h += '<div class="mp-fl">' + lista.map(function (f) {
        var k = S.F.indexOf(f), d = f.dest[0];
        var canal = d ? '💬 ' + esc(d.nome || 'WhatsApp') + (f.dest.length > 1 ? ' +' + (f.dest.length - 1) : '') : (f.email ? '✉️ só e-mail' : '<span style="color:#B3231C">sem contato</span>');
        var linha = '<div class="mp-f' + (f.on ? ' on' : '') + '"><label><input type="checkbox" data-mpf="' + k + '"' + (f.on ? ' checked' : '') + '><b>' + esc(f.nome) + '</b></label><span class="mp-c">' + canal + (f.por ? '<br><small>' + esc(f.por) + '</small>' : '') + '</span>' +
          (f.on && d ? '<span class="mp-lk" data-mp="ver" data-k="' + k + '">' + (f.ver ? '▾' : '▸') + ' mensagem</span>' : '') + '</div>';
        if (f.on && d && f.ver) linha += '<div class="mp-msg"><pre>' + esc(mqTexto(f, f.saud !== 'nao')) + '</pre><div class="mp-mb"><label><input type="checkbox" data-mps="' + k + '"' + (f.saud !== 'nao' ? ' checked' : '') + '> com saudação <small>(ao mandar, sai sozinha se você já falou com ele hoje)</small></label><button data-mp="cop" data-k="' + k + '">📋 Copiar</button></div></div>';
        return linha;
      }).join('') + '</div>';
      h += S.mais ? '<input class="mp-busca" placeholder="Procurar fornecedor…" value="' + esc(S.busca) + '">' : '<span class="mp-lk" data-mp="mais">＋ outro fornecedor</span>';
      h += '<div class="mp-lab">LIGADO A</div><div class="mp-l">' + (p.cot ? '📄 cotação nº ' + esc(p.cot.num) + ' de hoje do cliente' : '📄 cotação nova do cliente (criada junto, minimizada no PF)') + '</div>';
      h += '</div><div class="mp-pe"><button data-mp="so">Só criar o mapa</button><button data-mp="copTodos" title="Cria o mapa e copia as mensagens de todos (uma embaixo da outra)">📋 Criar e copiar</button><button class="mp-verde" data-mp="mandar"' + (comW.length ? '' : ' disabled') + '>💬 Criar e mandar pra ' + comW.length + '</button></div></div>';
    } else {
      var R = S.res || {};
      h += '<div class="mp-ok">✅ Mapa <b>' + esc(R.num || '') + '</b> criado' + (R.cotNum ? ' · cotação ' + esc(R.cotNum) : '') + ' — os compradores já foram avisados.</div>';
      var envs = S.env || [], n = envs.filter(function (e) { return e.st === 'ok'; }).length;
      if (envs.length) h += '<div class="mp-lab">MANDANDO ' + n + ' DE ' + envs.length + '</div><div class="pfwa-prog"><i style="width:' + Math.round(100 * envs.filter(function (e) { return e.st === 'ok' || e.st === 'erro' || e.st === 'copiado'; }).length / envs.length) + '%"></i></div>' + envs.map(function (e, k) {
        var st = e.st === 'ok' ? '✔ enviado' + (e.semSaud ? ' (sem saudação, já tinham se falado hoje)' : '') : e.st === 'erro' ? '✖ ' + esc(e.erro || 'não foi') : e.st === 'indo' ? '📤 mandando…' : e.st === 'antigo' ? '📤 abrindo a conversa (jeito antigo)' : e.st === 'copiado' ? '📋 copiado' : '⏳ na fila';
        return '<div class="mp-f"><b>' + esc(e.forn) + '</b><span class="mp-c">' + esc(e.nome || '') + ' · ' + st + '</span><button data-mp="copE" data-k="' + k + '">📋</button></div>';
      }).join('');
      h += '<div class="mp-nada">A resposta dos fornecedores: na conversa deles aparece o selo "📥 lançar no mapa".</div></div><div class="mp-pe"><button class="mp-verde" data-mp="x">Fechar</button></div></div>';
    }
    MQ.innerHTML = h;
    var b = MQ.querySelector('.mp-busca'); if (b && S.focoBusca) { b.focus(); b.setSelectionRange(b.value.length, b.value.length); }
  }
  function mqInput(e) {
    var t = e.target, S = mqS; if (!S) return;
    if (t.matches('[data-mpi]')) { S.its[+t.getAttribute('data-mpi')].on = t.checked; mqPinta(); return; }
    if (t.matches('[data-mpq]')) { S.its[+t.getAttribute('data-mpq')].qtd = Math.max(1, parseInt(t.value, 10) || 1); return; }
    if (t.matches('[data-mpf]')) { S.F[+t.getAttribute('data-mpf')].on = t.checked; mqPinta(); return; }
    if (t.matches('[data-mps]')) { S.F[+t.getAttribute('data-mps')].saud = t.checked ? 'auto' : 'nao'; mqPinta(); return; }
    if (t.matches('.mp-busca') && e.type === 'input') { S.busca = t.value; S.focoBusca = true; mqPinta(); }
  }
  async function mqCopiar(txt, el) { try { await navigator.clipboard.writeText(txt); if (el) { el.textContent = '✓ copiado'; } } catch (e) { } }
  function mqTelId(tel) { return String(tel || '').replace(/\D/g, '') + '@c.us'; }
  // 6.3 - já falou com esse número hoje? (motor: olha as últimas mensagens da conversa sem abrir)
  async function mqFaleiHoje(tel) {
    if (!motorOk) return null;
    var m = await motor('msgs', { id: mqTelId(tel), n: 30 }, 12000); if (!m || !Array.isArray(m.l)) return null;
    var d0 = new Date(); d0.setHours(0, 0, 0, 0); return m.l.some(function (x) { return x.eu && x.t >= d0.getTime(); });
  }
  async function mqCriar(modo) {
    var S = mqS; if (!S || S.criando) return;
    var its = S.its.filter(function (i) { return i.on; }); if (!its.length) { cmToast('Marque ao menos uma peça'); return; }
    var on = S.F.filter(function (f) { return f.on; });
    S.criando = 1; MQ.querySelector('.mp-pe').innerHTML = '<span class="mp-nada">Criando o mapa no PF…</span>';
    var r = await msg({ t: 'acao', acao: 'mapaCriar', arg: { k: resp && resp.k, contato: resp && resp.contato, pessoa: pessoaComprador(), itens: its.map(function (i) { return { ref: i.ref, refCliente: i.refCliente, desc: i.desc, marca: i.marca, qtd: i.qtd }; }), fids: on.map(function (f) { return f.fid; }), pedido: S.pedido } });
    S.criando = 0;
    if (!r || !r.ok) { cmToast('✖ Não consegui criar o mapa' + (r && r.erro && r.erro.length > 3 ? ': ' + r.erro : ' — confira se o PF está aberto')); mqPinta(); return; }
    S.res = r; S.fase = 'fim';
    S.env = []; on.forEach(function (f) { f.dest.forEach(function (d) { S.env.push({ fid: f.fid, forn: f.nome, nome: d.nome, tel: d.tel, saud: d.saud, f: f, st: modo === 'mandar' ? 'fila' : '' }); }); });
    if (modo === 'copiar') {
      var tudo = on.map(function (f) { return '— ' + f.nome + ' —\n' + mqTexto(f, f.saud !== 'nao'); }).join('\n\n');
      await mqCopiar(tudo); S.env.forEach(function (e) { e.st = 'copiado'; msg({ t: 'acao', acao: 'mapaEnviado', arg: { num: r.num, fid: e.fid, como: 'copiar' } }); });
      cmToast('📋 Mensagens copiadas (' + on.length + ' fornecedor' + (on.length > 1 ? 'es' : '') + ')');
    }
    mqPinta();
    if (modo === 'mandar') mqMandar();
  }
  async function mqMandar() {
    var S = mqS; if (!S) return; var r = S.res, antigo = [];
    if (!motorOk) await motorChecar();
    for (var i = 0; i < S.env.length; i++) {
      var e = S.env[i]; if (e.st !== 'fila') continue;
      var querSaud = e.f.saud !== 'nao';
      if (!motorOk) { antigo.push(e); continue; }
      e.st = 'indo'; mqPinta();
      var falei = querSaud ? await mqFaleiHoje(e.tel) : true;
      var txt = mqTexto(e.f, querSaud && !falei).replace(e.f.dest[0] && e.f.dest[0].saud || '\u0000', e.saud);
      var x = await motor('enviar', { id: mqTelId(e.tel), texto: txt }, 30000);
      if (x && x.ok) { e.st = 'ok'; e.semSaud = querSaud && !!falei; } else { e.st = 'erro'; e.erro = (x && x.erro) || 'não foi (número fora do WhatsApp?)'; }
      msg({ t: 'acao', acao: 'mapaEnviado', arg: { num: r.num, fid: e.fid, ok: e.st === 'ok', erro: e.erro || '' } });
      if (mqS === S) mqPinta();
      await dormir(1200 + Math.random() * 1500);
    }
    if (antigo.length) {
      // sem motor: vai pela fila antiga (abre cada conversa). A saudação vai marcada e o whatsapp.js decide na conversa (sai se você já falou hoje).
      antigo.forEach(function (e) { e.st = 'antigo'; });
      if (mqS === S) mqPinta();
      chrome.runtime.sendMessage({ t: 'lote', id: 'M' + Date.now().toString(36), titulo: 'Mapa ' + (r.num || ''), itens: antigo.map(function (e) {
        var corpo = mqTexto(e.f, false); return { tel: e.tel, ref: e.fid, nome: e.nome, texto: e.f.saud !== 'nao' ? '[[SAUD:' + e.saud + ']]\n\n' + corpo : corpo };
      }) }, function () { void chrome.runtime.lastError; });
    }
  }
  function mqClique(e) {
    var el = e.target.closest('[data-mp]'); if (!el) { if (e.target === MQ) mqFechar(); return; }
    var a = el.getAttribute('data-mp'), S = mqS; e.preventDefault(); e.stopPropagation();
    if (a === 'x') { mqFechar(); return; }
    if (!S) return;
    if (a === 'ver') { var f = S.F[+el.getAttribute('data-k')]; f.ver = !f.ver; mqPinta(); return; }
    if (a === 'mais') { S.mais = true; S.focoBusca = true; mqPinta(); return; }
    if (a === 'cop') { var f2 = S.F[+el.getAttribute('data-k')]; mqCopiar(mqTexto(f2, f2.saud !== 'nao'), el); return; }
    if (a === 'copE') { var e2 = S.env[+el.getAttribute('data-k')]; mqCopiar(mqTexto(e2.f, e2.f.saud !== 'nao').replace(e2.f.dest[0] && e2.f.dest[0].saud || '\u0000', e2.saud), el); return; }
    if (a === 'so') { mqCriar('so'); return; }
    if (a === 'copTodos') { mqCriar('copiar'); return; }
    if (a === 'mandar') { mqCriar('mandar'); return; }
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && MQ && MQ.style.display === 'flex') { mqFechar(); e.stopPropagation(); } }, true);

  // ═══ ⚡ RESPOSTA RÁPIDA NO BALÃO (4.38) ═══
  // 4.38 / v115.2696 - A pedido do Vitor ("quando o cliente pedir algo q tiver na msg rapida, a extensão identifique, apareça aquela etiqueta parecida
  // com a q identifica código, pra eu clicar e já enviar"): a extensão manda a ÚLTIMA mensagem do cliente pro PF (respRapidaAchar), que acha os Atalhos
  // de Texto que combinam (pelos gatilhos/nome). Casou = selo ⚡ no balão; clicar abre a resposta pronta pra Enviar agora ou pôr na caixa.
  var RR2 = null, rr2Msg = null, rr2L = null, rrCache = {}, rrUlt = '';
  function rrUltimoIn() { var els = document.querySelectorAll('#main [data-pre-plain-text]'); for (var i = els.length - 1; i >= 0; i--) { if (!minhaEl(els[i])) return els[i]; } return null; }
  function rrTxt(el) { var tx = el.querySelector('.selectable-text'); return ((tx ? tx.innerText : el.innerText) || '').replace(/📄\s*\d+\+?|✓ cot\.|⚡/g, '').trim(); }
  async function rrVigiar() {
    var liga = CFG.rrselo !== false && contatoAt && !contatoAt.grupo && (!resp || resp.tipo !== 'fornecedor');
    document.querySelectorAll('#main .pfwa-rrselo').forEach(function (s) { if (!liga || !s.closest('[data-pre-plain-text]') || rrUltimoIn() !== s.closest('[data-pre-plain-text]')) s.remove(); });
    if (!liga) { if (RR2 && RR2.style.display === 'block') rr2Fechar(); return; }
    var el = rrUltimoIn(); if (!el) return;
    var t = rrTxt(el); if (t.length < 3) return;
    var h = ultimo + '|' + t;
    if (h !== rrUlt) {
      rrUlt = h;
      if (!(h in rrCache)) { try { var r = await msg({ t: 'acao', acao: 'respRapidaAchar', arg: { k: resp && resp.k, contato: resp && resp.contato, texto: t } }); rrCache[h] = (r && r.l) || []; } catch (e) { rrCache[h] = []; } }
    }
    var L = rrCache[h] || [];
    if (!L.length) { var sx = el.querySelector(':scope > .pfwa-rrselo'); if (sx) sx.remove(); return; }
    var s = el.querySelector(':scope > .pfwa-rrselo');
    if (!s) { s = document.createElement('span'); s.className = 'pfwa-rrselo'; if (getComputedStyle(el).position === 'static') el.style.position = 'relative'; el.appendChild(s); }
    s.textContent = '⚡'; s.title = L.length === 1 ? ('Resposta rápida: ' + L[0].nome + ' — clique pra enviar') : (L.length + ' respostas rápidas combinam — clique');
    s._L = L; s._t = t;
    s.onclick = function (ev) { ev.preventDefault(); ev.stopPropagation(); rr2Abrir(s); };
    // 4.49 - A pedido do Vitor ("quando vou clicar, abre os emojis"): o ⚡ ficava em cima do balão, no lugar onde o WhatsApp mostra o botão de reagir.
    // Agora fica do lado de FORA, embaixo, logo depois do selo 📄 (quando tem), e o clique não chega no WhatsApp.
    var sp = el.querySelector(':scope > .pfwa-selo');
    s.style.left = sp ? ('calc(100% + ' + (10 + sp.offsetWidth) + 'px)') : '';
    if (!s._pfIso) { s._pfIso = 1; ['pointerdown', 'mousedown', 'mouseup', 'pointerup', 'mouseover', 'mouseenter'].forEach(function (tp) { s.addEventListener(tp, function (ev) { ev.stopPropagation(); }, false); }); }
  }
  function rr2El() { if (!RR2) { RR2 = document.createElement('div'); RR2.id = 'pfwa-rr2'; document.body.appendChild(RR2); RR2.addEventListener('click', rr2Clique); } return RR2; }
  function rr2Fechar() { if (RR2) RR2.style.display = 'none'; rr2Msg = null; rr2L = null; }
  function rr2Pos() {
    if (!RR2 || !rr2Msg || RR2.style.display === 'none') return;
    if (!document.body.contains(rr2Msg)) { rr2Fechar(); return; }
    var r = rr2Msg.getBoundingClientRect(), w = 320, hh = RR2.offsetHeight || 170;
    var bal = rr2Msg.parentElement ? rr2Msg.parentElement.getBoundingClientRect() : r, left = Math.min(window.innerWidth - w - 10, Math.max(10, bal.left));
    var top = r.bottom + 6; if (top + hh > window.innerHeight - 10) top = Math.max(10, r.top - hh - 6);
    RR2.style.left = left + 'px'; RR2.style.top = top + 'px';
  }
  function rr2Abrir(s) {
    rr2El(); rr2Msg = s; rr2L = s._L || []; RR2.style.display = 'block';
    var h = '<div class="rr2-cab"><b>⚡ Resposta rápida</b><span class="rr2-x" data-rr="x" title="Fechar (Esc)">✕</span></div>';
    h += rr2L.map(function (o, i) {
      return '<div class="rr2-it"><div class="rr2-nm">' + esc(o.nome) + (o.falta && o.falta.length ? ' <span class="rr2-fl">⚠ falta ' + esc(o.falta.join(', ')) + '</span>' : '') + '</div>' +
        '<div class="rr2-tx">' + esc(o.txt) + '</div>' +
        '<div class="rr2-b"><button class="rr2-cx" data-rr="cx" data-i="' + i + '">✍️ Pôr na caixa (conferir)</button><button class="rr2-env" data-rr="env" data-i="' + i + '" title="Escreve e já envia">📤 Enviar</button></div></div>';
    }).join('');
    RR2.innerHTML = h; rr2Pos();
  }
  function rr2Clique(e) {
    var el = e.target.closest('[data-rr]'); if (!el) return; var a = el.getAttribute('data-rr');
    e.preventDefault(); e.stopPropagation();
    if (a === 'x') { rr2Fechar(); return; }
    var o = rr2L[+el.getAttribute('data-i')]; if (!o) return;
    if (a === 'cx') { escreverNaCaixa(o.txt); rr2Fechar(); return; }
    if (a === 'env') { rr2Enviar(o); }
  }
  async function rr2Enviar(o) {
    if (!escreverNaCaixa(o.txt)) { flash2('Não consegui escrever na caixa'); return; }
    if (!(await esperar(function () { var b = caixaTexto(); return b && (b.innerText || '').trim() ? 1 : null; }, 3000))) { flash2('Não consegui escrever na caixa'); return; }
    await dormir(250); enviarAgora();
    try { msg({ t: 'acao', acao: 'rrUsou', arg: { id: o.id } }); } catch (e) { }
    rr2Fechar();
  }
  function flash2(t) { try { if (RR2) { var d = document.createElement('div'); d.className = 'rr2-flash'; d.textContent = t; RR2.appendChild(d); setTimeout(function () { d.remove(); }, 2500); } } catch (e) { } }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && RR2 && RR2.style.display === 'block') { rr2Fechar(); e.stopPropagation(); } }, true);
  document.addEventListener('mousedown', function (e) { if (RR2 && RR2.style.display === 'block' && !RR2.contains(e.target) && !(e.target.closest && e.target.closest('.pfwa-rrselo'))) rr2Fechar(); }, true);
  document.addEventListener('scroll', function () { rr2Pos(); }, true);
  setInterval(function () { rrVigiar().catch(function (e) { }); }, 1800);

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
    modo: 'normal', ate: '', subst: '', substTel: '', ausMin: 1, ausTxt: { reuniao: '', ausente: '', ferias: '' },
    // 4.27 - A pedido do Vitor: quando mandar a saudação de espera, chamar pelo nome / começar com saudação, e deixar a conversa não lida depois
    quando: 'sempre', chamarNome: true, comSaud: true, naoLida: true,
    // 4.47 - A pedido do Vitor (prévia docs/referencias/whatsapp-automaticas/): "bom dia" só na 1ª conversa do dia, não mandar se eu escrevi há < 30 min,
    // frases por tom (intimidade), conversas que nunca recebem automática e AVISOS PROGRAMADOS (almoço, fora do expediente…), vários ao mesmo tempo.
    saud1a: true, trava30: true, frasesTom: { formal: [], proximo: [] }, nunca: [],
    avisos: [
      { id: 'almoco', ic: '🍽️', nome: 'Almoço', on: false, dias: 'semana', ini: '12:00', fim: '13:00', txt: '' },
      { id: 'fora', ic: '🌙', nome: 'Fora do expediente', on: false, dias: 'semana', ini: '18:00', fim: '08:00', txt: '' },
      { id: 'fds', ic: '🏝️', nome: 'Fim de semana', on: false, dias: 'fds', ini: '00:00', fim: '23:59', txt: '' }]
  };
  var AUTO = JSON.parse(JSON.stringify(AUTO_PADRAO)), autoEnv = {}, autoHist = [], autoPend = {}, autoOcup = false, autoUltMexeu = Date.now(), autoUlt = {}, autoAusEnv = {};
  var autoCarregado = false, autoGravarDepois = false, autoUltJ = '';
  chrome.storage.local.get(['auto', 'autoEnv', 'autoHist', 'autoPend', 'autoUlt', 'autoAusEnv'], function (s) {
    if (s.auto) for (var k in s.auto) AUTO[k] = s.auto[k];
    if (!AUTO.ausTxt) AUTO.ausTxt = { reuniao: '', ausente: '', ferias: '' };
    autoEnv = s.autoEnv || {}; autoHist = s.autoHist || []; autoPend = s.autoPend || {}; autoUlt = s.autoUlt || {}; autoAusEnv = s.autoAusEnv || {};
    autoCarregado = true; autoUltJ = autoJ(); if (autoGravarDepois) { autoGravarDepois = false; autoGravar(); }
  });
  ['mousemove', 'keydown', 'mousedown', 'wheel'].forEach(function (t) { document.addEventListener(t, function () { autoUltMexeu = Date.now(); }, true); });
  // 4.46 - BUG (Vitor: "só mandou pra esse contato quando eu abri a msg… mandou pq eu tava com a janela aberta"): as outras conversas só recebiam se você ficasse
  // 1 min SEM MEXER o mouse no WhatsApp — trabalhando nele, nunca acontecia. Agora conta só digitar/clicar (mexer o mouse/rolar não conta): 20 s sem digitar
  // nem clicar e a caixa vazia (ou o WhatsApp em outra aba) = abre a conversa que está esperando, manda e volta.
  var autoUltAcao = 0;
  ['keydown', 'mousedown', 'paste'].forEach(function (t) { document.addEventListener(t, function (e) { if (e && e.isTrusted === false) return; autoUltAcao = Date.now(); }, true); });
  // 4.53 - A pedido do Vitor ("quero que mande se eu estiver falando com outra pessoa, ou se estiver em outra tela"): antes esperava 20 s sem você digitar/clicar.
  // Agora: WhatsApp em outra aba/janela/programa = na hora; você conversando com outra pessoa = no 1º respiro (3 s sem tecla/clique; 8 s se tem texto na caixa —
  // o WhatsApp guarda o rascunho e a extensão volta pra sua conversa). Se você clicar/digitar no meio, ela para e volta.
  function autoLivre() {
    if (document.hidden) return true;
    try { if (!document.hasFocus()) return true; } catch (e) { }
    var cx = caixaTexto(), temTxt = !!(cx && (cx.innerText || '').trim());
    return Date.now() - autoUltAcao >= (temTxt ? 8000 : 3000);
  }
  // 4.53 - registro do que a extensão fez nas outras conversas (aparece na tela da saudação)
  var autoLogL = [], autoLogUlt = '';
  function autoLog(t, rep) { if (!rep && t === autoLogUlt) return; autoLogUlt = t; autoLogL.push({ h: Date.now(), t: t }); if (autoLogL.length > 12) autoLogL.shift(); }
  // 4.41 - BUG (Vitor: "de novo não fica gravado as msg q coloco"): 1) o autoGravar podia rodar ANTES de a config guardada carregar e gravava o PADRÃO
  // por cima (no navegador e no PF); 2) qualquer gravação interna (conversa enviada, etiqueta) marcava a config como "mais nova" e subia pro PF. Agora só
  // grava depois de carregar, a data da config só muda quando a CONFIG muda, e só sobe pro PF depois de ler a do PF (a mais nova vence).
  function autoJ() { try { var c = JSON.parse(JSON.stringify(AUTO)); delete c.ts; return JSON.stringify(c); } catch (e) { return ''; } }
  function autoGravar() {
    if (!autoCarregado) { autoGravarDepois = true; return; }
    var j = autoJ(), mudou = j !== autoUltJ; if (mudou) { AUTO.ts = Date.now(); autoUltJ = j; }
    chrome.storage.local.set({ auto: AUTO, autoEnv: autoEnv, autoHist: autoHist.slice(-60), autoPend: autoPend, autoUlt: autoUlt, autoAusEnv: autoAusEnv });
    if (mudou) autoCfgPush();
  }
  // 4.35 - A pedido do Vitor ("coloquei minhas frases ontem e hoje sumiu"): a config fica só no navegador e some ao atualizar a extensão. Agora
  // também é guardada no PF (sincronizada, por usuário): a extensão salva lá e recarrega de lá, então sobrevive a reinstalar/atualizar a extensão.
  var autoCfgT = null, autoCfgLido = false;
  var autoCfgPend = false;
  function autoCfgPush() { if (!autoCfgLido) { autoCfgPend = true; return; } clearTimeout(autoCfgT); autoCfgT = setTimeout(function () { try { msg({ t: 'acao', acao: 'autoCfgSalvar', arg: AUTO }); } catch (e) { } }, 1500); }
  async function autoCfgCarregar() {
    if (autoCfgLido) return;
    if (!autoCarregado) return; // 4.41 - espera a config guardada no navegador
    try {
      var r = await msg({ t: 'acao', acao: 'autoCfgLer' });
      var tP = r && r.cfg ? (r.cfg.ts || r.ts || 0) : 0; // 4.41 - compara a data da CONFIG (não a hora em que o PF gravou)
      if (r && r.ok && r.cfg && tP > (AUTO.ts || 0)) { for (var k in r.cfg) AUTO[k] = r.cfg[k]; if (!AUTO.ausTxt) AUTO.ausTxt = { reuniao: '', ausente: '', ferias: '' }; AUTO.ts = tP; autoUltJ = autoJ(); chrome.storage.local.set({ auto: AUTO }); autoCfgLido = true; autoCfgPend = false; try { pinta(); autoStatusPill(); } catch (e) { } }
      else if (r && r.ok) { autoCfgLido = true; if ((AUTO.ts || 0) > tP && (autoCfgPend || r.cfg || AUTO.ts)) { autoCfgPend = false; autoCfgPush(); } }
    } catch (e) { }
  }
  setTimeout(autoCfgCarregar, 3500); setTimeout(autoCfgCarregar, 9000); setTimeout(autoCfgCarregar, 20000); setTimeout(autoCfgCarregar, 45000);
  function autoHM(s) { var m = String(s || '').match(/(\d{1,2}):(\d{2})/); return m ? (+m[1]) * 60 + (+m[2]) : 0; }
  function autoNoHorario(d) {
    d = d || new Date(); var dw = d.getDay();
    if (AUTO.dias === 'semana' && (dw === 0 || dw === 6)) return false;
    if (AUTO.dias === 'sabado' && dw === 0) return false;
    var m = d.getHours() * 60 + d.getMinutes(), a = autoHM(AUTO.ini), b = autoHM(AUTO.fim);
    return a <= b ? (m >= a && m < b) : (m >= a || m < b);
  }
  function autoDiaOk(dias, d) { var dw = d.getDay(); if (dias === 'semana') return dw >= 1 && dw <= 5; if (dias === 'sabado') return dw >= 1 && dw <= 6; if (dias === 'fds') return dw === 0 || dw === 6; return true; }
  // 4.47 - aviso programado valendo agora; com 2 valendo juntos, ganha o de horário MAIS CURTO (o almoço passa na frente do expediente)
  function autoAvisoAtual(d) {
    d = d || new Date(); var m = d.getHours() * 60 + d.getMinutes(), best = null, bd = 1e9;
    (AUTO.avisos || []).forEach(function (a) {
      if (!a || !a.on) return; var ia = autoHM(a.ini), fa = autoHM(a.fim); if (ia === fa) return;
      var den = ia < fa ? (m >= ia && m < fa) : (m >= ia || m < fa); if (!den || !autoDiaOk(a.dias, d)) return;
      var du = (fa - ia + 1440) % 1440; if (du < bd) { bd = du; best = a; }
    });
    return best;
  }
  function autoAvisoIni(a, d) { d = d || new Date(); var m = d.getHours() * 60 + d.getMinutes(), ia = autoHM(a.ini), fa = autoHM(a.fim), x = new Date(d); x.setHours(Math.floor(ia / 60), ia % 60, 0, 0); if (ia > fa && m < fa) x.setDate(x.getDate() - 1); return x.getTime(); }
  function autoAvisoFim(a, d) { return autoAvisoIni(a, d) + ((autoHM(a.fim) - autoHM(a.ini) + 1440) % 1440) * 60000; }
  function autoAvisoDe(aus) { if (!aus || String(aus).indexOf('av:') !== 0) return null; var id = String(aus).slice(3); return (AUTO.avisos || []).find(function (a) { return a && a.id === id; }) || null; }
  // status de ausência valendo agora? Status que você liga na hora (o "até" que passou volta pra Disponível) > aviso programado ('av:<id>')
  function autoAusente() {
    if (AUTO.modo && AUTO.modo !== 'normal') {
      if (AUTO.ate) { var t = new Date(AUTO.ate).getTime(); if (t && Date.now() > t) { AUTO.modo = 'normal'; AUTO.ate = ''; autoGravar(); try { pinta(); } catch (e) { } } }
      if (AUTO.modo && AUTO.modo !== 'normal') return AUTO.modo;
    }
    var a = autoAvisoAtual(); return a ? 'av:' + a.id : '';
  }
  var AUTO_MODOS = { normal: ['🟢', 'Disponível'], reuniao: ['📅', 'Em reunião'], ausente: ['🚶', 'Ausente'], ferias: ['🏖️', 'Férias'] };
  function autoInfo(aus) { var a = autoAvisoDe(aus); if (a) return [a.ic || '⏰', a.nome || 'Aviso']; return AUTO_MODOS[aus || 'normal'] || AUTO_MODOS.normal; }
  function autoDesde(aus) { var a = autoAvisoDe(aus); return a ? autoAvisoIni(a) : (AUTO.ausDesde || 0); }
  function autoPer(aus) { return aus + '|' + (autoDesde(aus) || ''); }
  // 5.4 - A pedido do Vitor ("as respostas automáticas são criadas de acordo com como eu trato o cliente? tipo apelidos, termos usados?" → "quero"):
  // 🪞 SEU JEITO com cada contato. Lendo as SUAS mensagens da conversa aberta, a extensão aprende como você abre ("Opa", "Fala", "Bom dia"…), como
  // fecha ("tmj", "abraço", 👍…), o apelido que você usa (sugestão — confirma no 👤 Salvar contato) e o tom (próximo/formal) quando você não marcou.
  // Guardado no PF por contato (pfContatosWhats_v1 .jeito/.apelido, acao jeitoSet). A automática só usa expressão que VOCÊ já usou com ele (2+ vezes).
  var JEITO_AB = [['saud', /^(bom dia|boa tarde|boa noite)\b/], ['opa', /^opa+\b/], ['fala', /^fala+\b/], ['eai', /^(e a[ií]|ea[eií])\b/], ['oi', /^oi+\b/], ['ola', /^ol[áa]\b/], ['salve', /^salve\b/], ['prezado', /^prezad[oa]s?\b/]];
  var JEITO_AB_TXT = { opa: 'Opa', fala: 'Fala', eai: 'E aí', oi: 'Oi', ola: 'Olá', salve: 'Salve' };
  var JEITO_FE = [['tmj', /\b(tmj|tamo junto|tamos juntos)[\s!.]*$/], ['abraco', /\b(abra[çc]os?|abs|forte abra[çc]o)[\s!.]*$/], ['valeu', /\b(valeu|vlw)[\s!.]*$/], ['att', /\b(att|atenciosamente)[\s!.]*$/], ['joia', /👍\s*$/], ['maos', /🙏\s*$/], ['aperto', /🤝\s*$/]];
  var JEITO_VOC = /^(meu (?:amigo|velho|querido|caro|irm[aã]o|parceiro)|chefe|chefia|patr[aã]o|querid[oa]|parceir[oa]|irm[aã]o|mano|grande|campe[aã]o|amig[aã]o|amigo|doutor|dr\.?|guerreiro|man)$/i;
  var JEITO_NAO = /^(tudo|td|bem|beleza|blz|boa|bom|dia|tarde|noite|segue|vou|j[aá]|pessoal|galera|como|vai|vamos|aqui|ok|obrigad[oa]|sim|n[aã]o|ent[aã]o|olha|veja|t[oô]|estou|tenho|temos|tem|consegui|preciso|sobre|esse|essa|isso|o|a|os|as|e|de|do|da|pra|para|que|qual|quando|me|te|voc[eê]|vc|sr|sra)$/i;
  var JEITO_LOC = {}, jeitoSig = {};
  function jeitoNorm(t) { return String(t || '').trim().toLowerCase().replace(/^[*_~\s]+/, ''); }
  function jeitoAnalisar(nome) {
    var ms = []; try { ms = lerMensagens(); } catch (e) { }
    var auto = {}; try { if (autoUlt[nome]) auto[String(autoUlt[nome]).trim()] = 1; if (autoPend[nome] && autoPend[nome].txt) auto[String(autoPend[nome].txt).trim()] = 1; } catch (e) { }
    var eu = ms.filter(function (m) { return m.eu && m.t && !auto[m.t.trim()] && m.t.length < 400; }).map(function (m) { return m.t; });
    var R = { ab: {}, fe: {}, ap: {}, n: eu.length };
    eu.forEach(function (t) {
      var n = jeitoNorm(t);
      for (var i = 0; i < JEITO_AB.length; i++) { var m = n.match(JEITO_AB[i][1]); if (!m) continue; R.ab[JEITO_AB[i][0]] = (R.ab[JEITO_AB[i][0]] || 0) + 1;
        var orig = t.trim().replace(/^[*_~\s]+/, '').slice(m[0].length).replace(/^[\s,!.]+/, ''), cand = (orig.match(/^([^\s,!.?\n]+(?:\s+[^\s,!.?\n]+)?)/) || [])[1] || '';
        var w = cand.split(/\s+/), ap = '';
        if (w.length > 1 && JEITO_VOC.test(cand)) ap = cand; else if (w[0] && JEITO_VOC.test(w[0])) ap = w[0]; else if (w[0] && /^[A-ZÀ-Ý][a-zà-ÿ'-]{1,14}$/.test(w[0]) && !JEITO_NAO.test(w[0])) ap = w[0];
        if (ap) { ap = ap.charAt(0).toUpperCase() + ap.slice(1).toLowerCase(); R.ap[ap] = (R.ap[ap] || 0) + 1; }
        break; }
      for (var j = 0; j < JEITO_FE.length; j++) if (JEITO_FE[j][1].test(n)) { R.fe[JEITO_FE[j][0]] = (R.fe[JEITO_FE[j][0]] || 0) + 1; break; }
    });
    var tt = eu.join(' \n ').toLowerCase(), pr = (tt.match(/\b(mano|irm[aã]o|parceir\w*|meu amigo|meu velho|fala|tmj|blz|beleza|valeu|vlw|kkk+|top|opa)\b/g) || []).length, fo = (tt.match(/\b(sr\.?|sra\.?|senhor|senhora|prezad\w*|cordialmente|atenciosamente)\b/g) || []).length;
    R.intimAuto = eu.length >= 5 ? (fo >= 2 && fo >= pr ? 'formal' : pr >= 3 ? 'proximo' : '') : '';
    return R;
  }
  function jeitoJunta(a, b) { var o = {}; [a || {}, b || {}].forEach(function (x) { for (var k in x) o[k] = Math.max(o[k] || 0, x[k]); }); return o; }
  function autoJeitoDe(nome) {
    var j = null; try { if (resp && contatoAt && contatoAt.nome === nome && resp.jeito) j = resp.jeito; else if (sitCache && sitCache[nome] && sitCache[nome].jeito) j = sitCache[nome].jeito; } catch (e) { }
    var l = JEITO_LOC[nome]; if (!l) return j || null; j = j || {};
    return { ab: jeitoJunta(j.ab, l.ab), fe: jeitoJunta(j.fe, l.fe), ap: jeitoJunta(j.ap, l.ap), n: Math.max(j.n || 0, l.n || 0), intimAuto: l.intimAuto || j.intimAuto || '', apelido: (l.apelido !== undefined ? l.apelido : j.apelido) || '' };
  }
  function jeitoTop(o, min) { var ks = []; for (var k in (o || {})) if (o[k] >= (min || 2)) ks.push(k); return ks.sort(function (a, b) { return o[b] - o[a]; }); }
  function jeitoApSug(j, nome) { if (!j || j.apelido) return ''; var pn = autoPrimeiroNome(nome).toLowerCase(), ks = jeitoTop(j.ap, 2).filter(function (k) { return k.toLowerCase() !== pn; }); return ks[0] || ''; }
  // aprende na conversa aberta (só quando as suas mensagens mudaram) e guarda no PF
  async function jeitoVigiar() {
    try {
      var c = contatoAt; if (!c || c.grupo || !c.nome) return;
      var R = jeitoAnalisar(c.nome); if (!R.n) return;
      var old = JEITO_LOC[c.nome] || {}, M = { ab: jeitoJunta(old.ab, R.ab), fe: jeitoJunta(old.fe, R.fe), ap: jeitoJunta(old.ap, R.ap), n: Math.max(old.n || 0, R.n), intimAuto: R.intimAuto || old.intimAuto || '' };
      JEITO_LOC[c.nome] = M;
      var sig = JSON.stringify([M.ab, M.fe, M.ap, M.intimAuto]); if (jeitoSig[c.nome] === sig) return; jeitoSig[c.nome] = sig;
      var srv = (resp && contatoAt === c && resp.jeito) || {}, J = { ab: jeitoJunta(srv.ab, M.ab), fe: jeitoJunta(srv.fe, M.fe), ap: jeitoJunta(srv.ap, M.ap), n: Math.max(srv.n || 0, M.n), intimAuto: M.intimAuto || srv.intimAuto || '' };
      if (!jeitoTop(J.ab).length && !jeitoTop(J.fe).length && !jeitoTop(J.ap).length && !J.intimAuto) return;
      await msg({ t: 'acao', acao: 'jeitoSet', arg: { nome: c.nome, tel: c.tel || '', jeito: J } });
    } catch (e) { }
  }
  function jeitoResumoHtml(j) {
    if (!j) return ''; var ab = jeitoTop(j.ab).map(function (k) { return k === 'saud' ? 'Bom dia/tarde' : k === 'prezado' ? 'Prezado' : JEITO_AB_TXT[k]; }), fe = jeitoTop(j.fe).map(function (k) { return { tmj: 'tmj', abraco: 'abraço', valeu: 'valeu', att: 'Att.', joia: '👍', maos: '🙏', aperto: '🤝' }[k]; });
    var p = []; if (ab.length) p.push('abre com <b>' + esc(ab.join(', ')) + '</b>'); if (fe.length) p.push('fecha com <b>' + esc(fe.join(', ')) + '</b>'); if (j.intimAuto) p.push('tom <b>' + (j.intimAuto === 'formal' ? 'Formal' : 'Próximo') + '</b>');
    return p.length ? '<div class="sv-intsug" style="background:#f3eefa;border-color:#d9c8ee">🪞 Seu jeito com ele: ' + p.join(' · ') + ' <span style="color:#8a9ab0">(aprendido das suas mensagens — a automática usa igual)</span></div>' : '';
  }
  // nome usado na mensagem: apelido confirmado > 1º nome
  function autoChamar(nome) { var j = AUTO.jeito !== false ? autoJeitoDe(nome) : null; if (j && j.apelido) return j.apelido; return autoPrimeiroNome(nome); }
  // 4.47 - grau de intimidade do contato (marcado no 👤 Salvar contato ou no botão direito) → tom da mensagem
  // 5.4 - sem marcar à mão = o tom aprendido das suas mensagens (🪞)
  function autoTomDe(nome) {
    try { if (resp && contatoAt && contatoAt.nome === nome && resp.intim) return resp.intim; var x = sitCache && sitCache[nome]; if (x && x.intim) return x.intim;
      if (AUTO.jeito !== false) { var j = autoJeitoDe(nome); if (j && j.intimAuto) return j.intimAuto; } return 'normal'; } catch (e) { return 'normal'; }
  }
  function autoTom(t, tom) {
    t = String(t || '');
    if (tom !== 'formal') return t;
    t = t.replace(/\bt[ôo]\b/g, 'estou').replace(/\bT[ôo]\b/g, 'Estou').replace(/\bpra\b/g, 'para').replace(/\bPra\b/g, 'Para').replace(/\bjá já\b/gi, 'em breve').replace(/\brapidinho\b/gi, 'um momento')
      .replace(/^(Opa|Oi),?\s*/i, '').replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]\uFE0F?/gu, '').replace(/\s{2,}/g, ' ').trim();
    if (/[A-Za-zÀ-ÿ0-9]$/.test(t)) t += '.';
    return autoCap(t);
  }
  // troca {saudacao} {nome} {volta} {substituto}; sem saudação (já falaram hoje) a saudação some sem deixar vírgula sobrando
  function autoVars(t, nm, volta, quem, sOk) {
    t = String(t || '').replace(/\{saudacao\}/gi, sOk === false ? '\u0001' : autoSaudacao()).replace(/\{nome\}/gi, nm || '\u0002').replace(/\{volta\}/gi, volta || '').replace(/\{substituto\}/gi, quem || '');
    t = t.replace(/\u0001[ \t]*,?[ \t]*/g, '').replace(/[ \t]*,?[ \t]*\u0002/g, '').replace(/\s+([,.!?])/g, '$1').replace(/,\s*!/g, '!').replace(/^[,!\s]+/, '').trim();
    return autoCap(t);
  }
  // você escreveu nesta conversa nos últimos X minutos? (aí a saudação de espera fica quieta)
  var _autoCtx = null; // 4.58 - conversa lida pelo motor (sem abrir): já falei hoje / escrevi há pouco
  function autoEscreviRecente(min) {
    if (_autoCtx) return !!_autoCtx.escrevi;
    var lim = Date.now() - min * 60000, outs = msgLinhas().filter(function (b) { return minhaEl(b); });
    for (var i = outs.length - 1; i >= 0 && i >= outs.length - 3; i--) { var pp = outs[i].querySelector('[data-pre-plain-text]'), t = pp ? msgQuando(pp) : horaFolha(outs[i]); if (t && t >= lim) return true; }
    return false;
  }
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
  // 4.47 - sOk=false = já falaram hoje (sem "bom dia"); tom = formal / normal / proximo
  function autoAbertura(nm, sOk, tom, jj) {
    var s = autoSaudacao(), sl = s.toLowerCase(), semS = sOk === false, comNome = nm && AUTO.chamarNome !== false && (tom === 'formal' || Math.random() < 0.7), l;
    if (jj && AUTO.jeito !== false && tom !== 'formal') { // 5.4 - 🪞 abre do jeito que VOCÊ abre com ele
      var ks = jeitoTop(jj.ab).filter(function (k) { return k === 'saud' ? !semS : !!JEITO_AB_TXT[k]; });
      if (ks.length && Math.random() < 0.85) { var k = Math.random() < 0.7 ? ks[0] : autoSorteia(ks), cn = nm && AUTO.chamarNome !== false && Math.random() < 0.8;
        if (k === 'saud') return s + (cn ? ', ' + nm : '') + '!';
        return JEITO_AB_TXT[k] + (cn ? ' ' + nm : '') + (semS ? '!' : ', ' + sl + '!'); }
    }
    if (tom === 'formal') l = semS ? (comNome ? [nm + ',', 'Olá, ' + nm + '.'] : ['Olá.']) : (comNome ? [s + ', ' + nm + '.', s + ', ' + nm + ', tudo bem?', 'Olá, ' + nm + ', ' + sl + '.'] : [s + '.', 'Olá, ' + sl + '.']);
    else if (tom === 'proximo') l = semS ? (comNome ? ['Fala ' + nm + '!', 'Opa ' + nm + '!', 'E aí ' + nm + '!', nm + ','] : ['Opa!', 'Fala!', 'E aí!']) : (comNome ? ['Opa ' + nm + ', ' + sl + '!', 'Fala ' + nm + ', ' + sl + '!', 'E aí ' + nm + ', ' + sl + '!', s + ' ' + nm + '!'] : ['Opa, ' + sl + '!', 'Fala, ' + sl + '!', s + '!']);
    else l = semS ? (comNome ? [nm + ',', 'Oi ' + nm + '!', 'Opa ' + nm + '!'] : ['Oi!', 'Opa!'])
      : (comNome ? [s + ', ' + nm + '!', s + ' ' + nm + '!', 'Opa, ' + sl + ' ' + nm + '!', 'Oi ' + nm + ', ' + sl + '!', 'Olá ' + nm + '!', s + ', ' + nm + ', tudo bem?']
        : [s + '!', 'Opa, ' + sl + '!', 'Oi, ' + sl + '!', s + ', tudo bem?', 'Olá!']);
    return autoSorteia(l);
  }
  function autoJunta(ab, ct) { return ab ? ab + ' ' + (/,$/.test(ab) ? ct : autoCap(ct)) : autoCap(ct); }
  function autoContexto(u, tom) {
    var t = (u && u.bloco) || '', ncod = 0;
    (t.match(COD_RE) || []).forEach(function (tk) { if (tk.replace(/\D/g, '').length >= 4 && !/^\d{1,2}[\/.:]\d{2}/.test(tk)) ncod++; });
    if (tom === 'formal') { // 4.47 - tom formal: sem gíria
      if (u && u.audio) return ['vou ouvir seu áudio e retorno em instantes'];
      if (u && u.foto) return ['recebi a imagem, vou verificar e retorno em seguida'];
      if (ncod >= 2) return ['vou verificar esses códigos e retorno em instantes', 'estou levantando esses itens e retorno em seguida'];
      if (ncod === 1) return ['vou verificar esse código e retorno em instantes'];
      if (/pre[cç]o|valor|quanto|or[cç]amento|cota/i.test(t)) return ['vou verificar o valor e retorno em seguida'];
      return ['estou finalizando um atendimento e retorno em instantes', 'recebi sua mensagem e retorno em seguida', 'já verifico para você e retorno em instantes'];
    }
    if (u && u.audio) return ['vou ouvir aqui e já te respondo', 'já escuto seu áudio e te falo', 'só um minutinho que já ouço aqui'];
    if (u && u.foto) return ['vi a foto, vou verificar aqui e já te falo', 'recebi a foto, já vou ver aqui', 'deixa eu ver a foto direitinho e já te respondo'];
    if (ncod >= 2) return ['já vou ver esses códigos aqui', 'vou conferir esses itens no estoque e já te passo', 'já tô vendo esses códigos, um minutinho', 'vou levantar esses itens aqui e já te retorno'];
    if (ncod === 1) return ['já vou ver esse código aqui', 'vou conferir esse item e já te falo', 'deixa eu ver esse aqui no estoque'];
    if (/pre[cç]o|valor|quanto|or[cç]amento|cota/i.test(t)) return ['já te passo o valor', 'vou ver o preço aqui e te falo', 'já levanto o valor e te retorno'];
    if (/prazo|chega|entrega|previs|transport|nota|nf\b|boleto|pedido/i.test(t)) return ['vou verificar aqui e já te dou um retorno', 'deixa eu confirmar aqui e já te falo', 'já vejo isso pra você'];
    if (/\?/.test(t)) return ['já te respondo', 'deixa eu ver aqui e já te falo', 'vou verificar e já te retorno'];
    return ['tô finalizando um atendimento aqui e já falo com você', 'só um minutinho que já te respondo', 'já te respondo', 'tô terminando uma cotação aqui e já falo com você'];
  }
  function autoNatural(nome, u, sOk, tom) {
    var jj = AUTO.jeito !== false ? autoJeitoDe(nome) : null, nm = autoChamar(nome), ab = autoAbertura(nm, sOk, tom, jj), ct = autoSorteia(autoContexto(u, tom));
    var fim = tom === 'formal' ? '.' : tom === 'proximo' ? autoSorteia(['', ' 👍', ' 🙏', '!', ' 😉']) : autoSorteia(['', '', '', ' 👍', ' 🙏', '!']);
    if (jj) { // 5.4 - 🪞 fecha do jeito que VOCÊ fecha com ele (só o que você já usou)
      var fk = jeitoTop(jj.fe).filter(function (k) { return tom === 'formal' ? (k === 'att' || k === 'abraco') : k !== 'att'; });
      if (fk.length && Math.random() < 0.65) { var f = fk[0]; fim = { tmj: ', tmj', valeu: ', valeu', abraco: '. Abraço', att: '. Att.', joia: ' 👍', maos: ' 🙏', aperto: ' 🤝' }[f] || fim; }
      else if (fk.length || jeitoTop(jj.ab).length) fim = tom === 'formal' ? '.' : '!'; // não inventa emoji que você não usa com ele
    }
    return (autoJunta(ab, ct) + fim).replace(/!!$/, '!').replace(/\?\s+([a-zà-ú])/, function (m, c) { return '? ' + c.toUpperCase(); });
  }
  function autoDataBR(s) { var d = new Date(s); if (!s || isNaN(d)) return ''; return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2); }
  function autoHoraBR(s) { var d = new Date(s); if (!s || isNaN(d)) return ''; var h = d.getHours(), m = d.getMinutes(); return h + 'h' + (m ? ('0' + m).slice(-2) : ''); }
  function autoAusTexto(nome, modo, sOk, tom) {
    var av = autoAvisoDe(modo), nm = autoChamar(nome), ab = autoAbertura(nm, sOk, tom, AUTO.jeito !== false ? autoJeitoDe(nome) : null), proprio = String(av ? (av.txt || '') : ((AUTO.ausTxt || {})[modo] || '')).trim();
    var sub = String(AUTO.subst || '').trim(), tel = String(AUTO.substTel || '').trim(), quem = sub ? (sub + (tel ? ' no ' + tel : '')) : '';
    var volta = '';
    if (av) { var fT = autoAvisoFim(av), d0 = new Date(); d0.setHours(0, 0, 0, 0); var d1 = new Date(fT); d1.setHours(0, 0, 0, 0); var dd = Math.round((d1 - d0) / 86400000);
      volta = (dd <= 0 ? 'às ' : dd === 1 ? 'amanhã às ' : 'dia ' + autoDataBR(fT) + ' às ') + autoHoraBR(fT); }
    else { var hoje = AUTO.ate && new Date(AUTO.ate).toDateString() === new Date().toDateString(); volta = AUTO.ate ? (hoje ? 'lá pelas ' + autoHoraBR(AUTO.ate) : 'dia ' + autoDataBR(AUTO.ate)) : ''; }
    if (proprio) return autoTom(autoVars(proprio, nm, volta, quem, sOk), tom);
    var l;
    if (av) { // 4.47 - avisos programados
      if (av.id === 'almoco' || /almo/i.test(av.nome)) l = ['tô no almoço agora, volto ' + volta + ' e já te respondo', 'saí pro almoço, ' + volta + ' tô de volta e te respondo', 'tô no horário de almoço, ' + volta + ' já te respondo'];
      else if (av.dias === 'fds' || /fim de semana/i.test(av.nome)) l = ['hoje não estamos atendendo, ' + volta + ' te respondo', 'no fim de semana a gente não atende, mas ' + volta + ' já te respondo'];
      else if (/expediente|fora|noite/i.test(av.nome + ' ' + av.id)) l = ['nosso atendimento já encerrou por hoje, ' + volta + ' te respondo', 'já estamos fora do horário, ' + volta + ' te retorno', 'o expediente já acabou, ' + volta + ' já te respondo'];
      else l = ['no momento tô fora, volto ' + volta + ' e já te respondo'];
      return autoTom(autoJunta(ab, autoSorteia(l)).replace(/\s+([,.!?])/g, '$1'), tom);
    }
    if (modo === 'reuniao') l = ['tô em reunião agora' + (volta ? ', saio ' + volta : '') + ' e já te respondo', 'tô numa reunião, assim que sair' + (volta ? ' (' + volta + ')' : '') + ' te respondo', 'tô em reunião, mas já vi sua mensagem. Assim que terminar falo com você'];
    else if (modo === 'ferias') l = ['tô de férias' + (AUTO.ate ? ' até ' + autoDataBR(AUTO.ate) : '') + (quem ? '. Pra cotação e pedido fala com o ' + quem + ', ele vai te atender' : ', assim que voltar te respondo'), 'tô de férias' + (AUTO.ate ? ', volto dia ' + autoDataBR(AUTO.ate) : '') + (quem ? '. Enquanto isso o ' + quem + ' te atende, pode chamar ele' : '. Assim que voltar falo com você')];
    else l = ['no momento tô fora' + (volta ? ', volto ' + volta : '') + ', mas assim que voltar te respondo', 'tô ausente agora' + (volta ? ' (volto ' + volta + ')' : '') + ', já já te respondo', 'saí rapidinho, assim que voltar falo com você'];
    return autoTom(autoJunta(ab, autoSorteia(l)).replace(/\s+([,.!?])/g, '$1'), tom);
  }
  function autoTextoMinhas(nome, sOk, tom) {
    var fs = (AUTO.frases || []).map(function (f) { return String(f || '').trim(); }).filter(Boolean); if (!fs.length) fs = AUTO_PADRAO.frases;
    var ft = ((AUTO.frasesTom || {})[tom] || []).map(function (f) { return String(f || '').trim(); }).filter(Boolean); if (ft.length) fs = ft; // 4.47 - frases do tom
    var f = fs[Math.floor(Math.random() * fs.length)], nm = autoChamar(nome); // 5.4 - apelido
    // 4.27 - sem precisar digitar {nome}/{saudacao}: liga/desliga põe o nome e/ou a saudação na frente da frase
    var temS = /\{saudacao\}/i.test(f), temN = /\{nome\}/i.test(f);
    var saud = (AUTO.comSaud !== false && !temS && sOk !== false) ? autoSaudacao() : ''; // 4.47 - já falaram hoje = sem saudação
    var chama = (AUTO.chamarNome !== false && !temN && nm) ? nm : '';
    if (saud && chama) f = saud + ', ' + chama + '! ' + f;
    else if (saud) f = saud + '! ' + f;
    else if (chama) f = chama + ', ' + f.charAt(0).toLowerCase() + f.slice(1);
    return autoTom(autoVars(f, nm, '', '', sOk), tom);
  }
  function autoTexto(nome, u, modo, tomForca) {
    var ult = autoUlt[nome] || '', t = '', i = 0;
    var sOk = !(AUTO.saud1a !== false && autoFaleiHoje()), tom = tomForca || autoTomDe(nome); // 4.47
    do { t = modo ? autoAusTexto(nome, modo, sOk, tom) : (AUTO.estilo === 'minhas' ? autoTextoMinhas(nome, sOk, tom) : autoNatural(nome, u, sOk, tom)); i++; } while (t === ult && i < 6);
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
    var hm = null; el.querySelectorAll('span,div').forEach(function (e) { if (hm != null || e.children.length) return; var x = (e.textContent || '').replace(/[^\d:]/g, ''); if (/^\d{1,2}:\d{2}$/.test(x) && (e.textContent || '').trim().length <= 12) hm = x; }); // 4.42 - aceita caracteres invisíveis em volta da hora
    if (!hm) return 0; var d = new Date(); d.setHours(+hm.split(':')[0], +hm.split(':')[1], 0, 0); var t = d.getTime(); if (t > Date.now() + 60000) t -= 86400000; return t;
  }
  // última mensagem da conversa (inclui foto/áudio sem texto) + o "bloco" que o cliente mandou desde a sua última
  // 4.42 - BUG (Vitor: "veja pq não foi a msg" — 🧪 Testar dizia "não achei a última mensagem na tela" com o "Bom dia 10:28" aparecendo): as mensagens
  // eram procuradas só pela classe .message-in/.message-out. Agora também pela linha [data-id] do WhatsApp (true_… = sua, false_… = do cliente) e a hora
  // aceita o texto da hora com caracteres invisíveis; o 🧪 diz o que achou.
  // 4.43 - BUG (Vitor, print do 🧪 Testar: "nenhuma mensagem achada na conversa"): o WhatsApp de hoje não tem mais .message-in/.message-out nem
  // data-id "true_/false_" — e a extensão achava que TODA mensagem era do cliente (o selo 📄 aparecia até nas suas). Agora a mensagem é a linha da
  // conversa ([role="row"]) com hora, e "é minha" = tem o ✓/✓✓ de enviada ou o balão está do lado DIREITO da conversa.
  function bolhaDe(el) { return (el && (el.closest('.message-in, .message-out') || el.closest('[role="row"]') || el.closest('[data-id]'))) || el; }
  var MSG_TICK = '[data-icon^="msg-dblcheck"],[data-icon^="msg-check"],[data-icon="msg-time"],[data-icon*="dblcheck"],[data-icon*="tick"],[aria-label*=" Lida" i],[aria-label*="Entregue" i],[aria-label*="Enviada" i],[aria-label*="Pendente" i],[aria-label*=" Read" i],[aria-label*="Delivered" i],[aria-label*=" Sent" i]';
  function minhaEl(el) {
    if (!el) return false;
    if (el.closest('.message-out')) return true; if (el.closest('.message-in')) return false;
    var b = bolhaDe(el);
    if (b.querySelector('.message-out') || b.classList.contains('message-out')) return true; if (b.querySelector('.message-in') || b.classList.contains('message-in')) return false;
    var dd = b.getAttribute('data-id') || ((b.closest('[data-id]:not(header [data-id])') || b.querySelector('[data-id]') || { getAttribute: function () { return ''; } }).getAttribute('data-id')) || ''; if (!/^(true|false)_[^_]*@[^_]*_./.test(dd)) dd = '';
    if (/^true_/.test(dd)) return true; if (/^false_/.test(dd)) return false;
    if (b.querySelector(MSG_TICK)) return true;
    var main = $('#main'), alvo = b.querySelector('[data-pre-plain-text]') || b.querySelector('.selectable-text') || b.querySelector('img,audio,[data-icon*="ptt"]');
    if (main && alvo) { var m = main.getBoundingClientRect(), r = alvo.getBoundingClientRect(); if (r.width) return (r.left - m.left) > (m.right - r.right) + 20; }
    return false;
  }
  function msgLinhas() {
    var els = Array.prototype.slice.call(document.querySelectorAll('#main .message-in, #main .message-out')).filter(function (e) { return !e.parentElement.closest('.message-in, .message-out'); });
    if (els.length) return els;
    els = Array.prototype.slice.call(document.querySelectorAll('#main [data-id]')).filter(function (e) { return /^(true|false)_[^_]*@[^_]*_./.test(e.getAttribute('data-id') || '') && !e.closest('header') && !(e.parentElement && e.parentElement.closest('[data-id]')); }); // id da MENSAGEM (o da conversa no cabeçalho não tem o _final)
    if (els.length) return els;
    els = Array.prototype.slice.call(document.querySelectorAll('#main [role="row"]')).filter(function (e) { return !(e.parentElement && e.parentElement.closest('[role="row"]')) && !e.closest(MEUS) && (e.querySelector('[data-pre-plain-text]') || horaFolha(e)); });
    if (els.length) return els;
    var vis = []; document.querySelectorAll('#main [data-pre-plain-text]').forEach(function (x) { var b = bolhaDe(x); if (vis.indexOf(b) < 0) vis.push(b); });
    return vis;
  }
  function msgEhMinha(el) { return minhaEl(el); }
  // 4.76 - A pedido do Vitor ("como não achou?" — o cliente mandou os códigos num PDF "Peças para cotação" e o painel só lia o texto):
  // acha o último PDF ou foto que o cliente mandou, pro painel oferecer "🤖 Ler o PDF com IA e cotar" sem precisar do botão direito.
  function docCliAchar() {
    try { var els = msgLinhas(); for (var i = els.length - 1; i >= 0 && i >= els.length - 12; i--) { var b = els[i]; if (minhaEl(b)) continue;
      var tb = String(b.innerText || ''), m = tb.match(/([^\n]+?\.pdf)\b/i); if (m) return { tipo: 'pdf', nome: m[1].trim(), b: b }; if (/\bPDF\b\s*[•·]/.test(tb)) return { tipo: 'pdf', nome: '', b: b };
      var s = fotoMelhor(b); if (s) return { tipo: 'img', src: s, b: b }; } } catch (e) { }
    return null;
  }
  var _ultDiag = '';
  function ultimaMsg() {
    var els = msgLinhas();
    if (!els.length) { _ultDiag = 'nenhuma mensagem achada na conversa'; return null; }
    var el = els[els.length - 1], eu = msgEhMinha(el);
    var pp = el.querySelector('[data-pre-plain-text]') || (el.getAttribute('data-pre-plain-text') ? el : null), tx = el.querySelector('.selectable-text');
    var t = pp ? msgQuando(pp) : 0; if (!t) t = horaFolha(el);
    _ultDiag = els.length + ' mensagens · última ' + (eu ? 'SUA' : 'do cliente') + ' · hora ' + (t ? new Date(t).toTimeString().slice(0, 5) : 'NÃO ACHADA');
    var bloco = [], foto = false, audio = false;
    for (var i = els.length - 1; i >= 0 && !msgEhMinha(els[i]); i--) {
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
    if ((AUTO.nunca || []).indexOf(c.nome) >= 0) return false; // 4.47 - marcado no botão direito: nunca mandar automática pra essa conversa
    if (cmdAutorizado(c.nome, c.tel)) return false; // 4.2 - seu celular pessoal / conversa com você mesmo nunca recebe mensagem automática
    var k = autoChave(c);
    if (aus) { var per = autoPer(aus); if (autoAusEnv[k] === per) return false; }
    else { var u = autoEnv[k]; if (u && Date.now() - u < (+AUTO.horas || 4) * 3600000) return false; }
    var h1 = Date.now() - 3600000; autoHist = autoHist.filter(function (t) { return t > h1; });
    return autoHist.length < (+AUTO.porHora || 15);
  }
  // 4.57 - A pedido do Vitor ("selecionar grupo para responder automático, ou para não responder… até mesmo pra eu testar antes de ativar"):
  // AUTO.grpModo 'todos' | 'so' (só os grupos marcados — mesmo quem não é cliente, ex.: Triex) | 'menos' (nunca pros grupos marcados)
  async function autoSitDe(c) {
    var s = sitCache[c.nome]; if (s && s.tipo) return s;
    var r = await msg({ t: 'acao', acao: 'situacoes', arg: { lista: [{ nome: c.nome, tel: c.tel || '' }] } });
    return (r && r.sit && r.sit[c.nome]) || {};
  }
  function autoGrpBate(s) { var sel = AUTO.grpSel || []; return audGruposDe(s || {}).some(function (g) { return sel.indexOf(g) >= 0; }); }
  async function autoEhCliente(c) {
    try { var s0 = await autoSitDe(c); if (s0 && s0.tipo === 'colega') return false; } catch (e) { } // 4.91 - 👔 colega nunca recebe automática
    var gm = AUTO.grpModo || 'todos';
    if (gm !== 'todos' && (AUTO.grpSel || []).length) {
      var sg = await autoSitDe(c), bate = autoGrpBate(sg);
      if (gm === 'menos' && bate) return false;
      if (gm === 'so') return bate;
    }
    if (AUTO.quem !== 'clientes') return true;
    if (resp && contatoAt && contatoAt.nome === c.nome && resp.tipo) return resp.tipo === 'cliente';
    var r = await msg({ t: 'acao', acao: 'situacoes', arg: { lista: [{ nome: c.nome, tel: c.tel || '' }] } });
    return !!(r && r.sit && r.sit[c.nome] && r.sit[c.nome].tipo === 'cliente');
  }
  function autoMarcarFeito(c, aus) { var k = autoChave(c); if (aus) autoAusEnv[k] = autoPer(aus); else autoEnv[k] = Date.now(); autoGravar(); }
  // 4.27 - "📩 só na 1ª vez do dia": você já mandou alguma mensagem pra esse cliente hoje?
  function autoFaleiHoje() {
    if (_autoCtx) return !!_autoCtx.falei;
    var d0 = new Date(); d0.setHours(0, 0, 0, 0); var ini = d0.getTime();
    var outs = msgLinhas().filter(function (b) { return minhaEl(b); }); // 4.43
    for (var i = outs.length - 1; i >= 0; i--) {
      var pp = outs[i].querySelector('[data-pre-plain-text]');
      var t = pp ? msgQuando(pp) : horaFolha(outs[i]);
      if (t && t >= ini) return true;
    }
    return false;
  }
  // 4.27 - item de menu do WhatsApp pelo texto (ex.: "Marcar como não lida")
  function autoMenuItem(txts) {
    var achou = null;
    document.querySelectorAll('[role="menuitem"],[role="button"],li,div[role="row"]').forEach(function (el) {
      if (achou || !el.offsetParent) return;
      if (el.querySelector && el.querySelector('[role="menuitem"]')) return; // pega o mais interno
      var t = cmdSemAcento((el.textContent || '').trim());
      if (!t || t.length > 40) return;
      if (txts.some(function (x) { return t === x || t.indexOf(x) >= 0; })) achou = el;
    });
    return achou;
  }
  // 4.27 - A pedido do Vitor: depois de responder automático, deixa a conversa NÃO LIDA (bolinha verde) pra ele lembrar de dar o retorno de verdade
  async function autoMarcarNaoLida(nome) {
    try {
      var row = linhaDoNome(nome); if (!row) return;
      row.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      await dormir(300);
      var bt = row.querySelector('[aria-label*="enu"],[aria-label*="Mais"],span[data-icon="down"],span[data-icon*="chevron"],span[data-icon*="down"]');
      if (!bt) bt = row.querySelector('button,[role="button"]');
      if (!bt) return;
      clicarEl(bt);
      var item = await esperar(function () { return autoMenuItem(['marcar como nao lida', 'marcar como nao lidas', 'mark as unread']); }, 2500);
      if (item) clicarEl(item);
      else document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    } catch (e) { }
  }
  // manda na conversa ABERTA se a última mensagem é do cliente e está sem resposta há X min
  async function autoNaAberta(force) {
    var aus = autoAusente();
    var c = contatoAtual(); if (!c || c.grupo) return false;
    if (!force && !autoPodeConv(c, aus)) return false; // 4.37 - force (🧪 Testar) pula os travamentos de tempo/limite/horário
    var u = ultimaMsg(); if (!u || u.eu || !u.t) return false;
    if (!force) {
      if (!aus && AUTO.quando === 'primeira' && autoFaleiHoje()) return false; // 4.27 - só na 1ª vez que ele falar no dia
      var espera = aus ? (+AUTO.ausMin || 1) : (+AUTO.min || 3);
      if (Date.now() - u.t < espera * 60000) return false;
      if (Date.now() - u.t > (aus ? 12 : 3) * 3600000) return false; // mensagem velha
      if (aus && autoDesde(aus) && u.t < autoDesde(aus) - 10 * 60000) return false; // chegou antes de você sair (ou antes do aviso começar)
      if (!aus && AUTO.trava30 !== false && autoEscreviRecente(30)) return false; // 4.47 - você estava conversando com ele há pouco
    }
    var cx = caixaTexto(); if (!cx || (cx.innerText || '').trim()) return false; // você está escrevendo
    if (!force && !(await autoEhCliente(c))) { autoMarcarFeito(c, aus); return false; }
    var txt = autoTexto(c.nome, u, aus);
    await dormir(1500 + Math.random() * 2500); // "lendo"
    cx = caixaTexto(); if (!cx || (cx.innerText || '').trim() || (contatoAtual() || {}).nome !== c.nome) return false;
    if (!escreverNaCaixa(txt)) return false;
    var temTxt = await esperar(function () { var x = caixaTexto(); return x && (x.innerText || '').trim() ? 1 : null; }, 3000); if (!temTxt) return false;
    await esperar(botaoEnviar, 2000);
    await dormir(Math.min(6000, 900 + txt.length * 45 + Math.random() * 900)); // "digitando…"
    if ((contatoAtual() || {}).nome !== c.nome) return false;
    enviarAgora(); // 4.44 - botão ou Enter
    var ok = await esperar(function () { var x = caixaTexto(); return x && !(x.innerText || '').trim() ? 1 : null; }, 8000);
    if (!ok) return false;
    autoMarcarFeito(c, aus); autoHist.push(Date.now()); autoUlt[c.nome] = txt; autoPend[c.nome] = { ts: Date.now(), txt: txt, aus: aus || '' };
    autoHist = autoHist.slice(-60); autoGravar();
    msg({ t: 'acao', acao: 'autoSaud', arg: { nome: c.nome, tel: c.tel || '', texto: txt, modo: aus || '' } });
    try { autoBadges(); } catch (e) { }
    if (AUTO.naoLida !== false) { await dormir(600); await autoMarcarNaoLida(c.nome); } // 4.27 - deixa como não lida pra você lembrar de responder
    return true;
  }
  // 4.37 - A pedido do Vitor ("pq não funciona? não ta mandando a msg automatica"): diz exatamente qual regra barra o envio na conversa ABERTA
  function autoDiag() {
    var L = [], aus = autoAusente(), c = contatoAtual();
    function add(ok, t, d) { L.push({ ok: ok, t: t, d: d || '' }); }
    if (!c) { add(false, 'Abra uma conversa', 'Abra a conversa de um cliente pra eu testar.'); return L; }
    add(!c.grupo, 'Conversa aberta: ' + c.nome, c.grupo ? 'É um grupo — grupos não recebem.' : '');
    if (!aus) {
      add(!!AUTO.on, 'Saudação de espera LIGADA', AUTO.on ? '' : 'Ligue o 👋 "Saudação de espera" lá em cima.');
      add(autoNoHorario(), 'Dentro do horário e do dia', autoNoHorario() ? ('agora: ' + AUTO.ini + '–' + AUTO.fim) : ('agora está FORA do horário (' + AUTO.ini + '–' + AUTO.fim + ') ou do dia escolhido'));
    } else add(true, 'Status: ' + autoInfo(aus)[1], 'manda a qualquer hora');
    var u = ultimaMsg();
    add(!!(u && !u.eu && u.t), 'A última mensagem é do CLIENTE', (u && u.eu) ? 'a última foi SUA — ele precisa ter mandado a última' : ((!u || !u.t) ? 'não achei a última mensagem na tela (' + _ultDiag + ')' : ''));
    if (u && u.t) {
      var espera = aus ? (+AUTO.ausMin || 1) : (+AUTO.min || 3), falta = espera * 60000 - (Date.now() - u.t);
      add(falta <= 0, 'Já passou os ' + espera + ' min de espera', falta > 0 ? ('ele mandou agora há pouco — falta ' + Math.ceil(falta / 60000) + ' min') : '');
    }
    if (!aus && AUTO.quando === 'primeira') add(!autoFaleiHoje(), 'Só na 1ª vez do dia', autoFaleiHoje() ? 'você JÁ falou com esse cliente hoje → não manda de novo. Pra testar, troque pra "🔁 Sempre que eu não responder".' : '');
    if (!aus && AUTO.trava30 !== false) add(!autoEscreviRecente(30), 'Você não escreveu nos últimos 30 min', autoEscreviRecente(30) ? 'você estava conversando com ele há pouco → a extensão fica quieta (dá pra desligar essa trava)' : '');
    if ((AUTO.nunca || []).indexOf(c.nome) >= 0) add(false, 'Conversa liberada pra automática', 'você marcou "🔕 Não mandar automática pra esse" (botão direito na conversa)');
    add(!autoPend[c.nome], 'Ainda não mandei automática aqui', autoPend[c.nome] ? 'já mandei uma e você ainda não respondeu (só volta quando você responder)' : '');
    add(!cmdAutorizado(c.nome, c.tel), 'Não é sua conversa pessoal/autorizada', cmdAutorizado(c.nome, c.tel) ? 'essa conversa é a sua/autorizada a dar comando → nunca recebe automática' : '');
    var cx = caixaTexto(); add(!(cx && (cx.innerText || '').trim()), 'Caixa de texto vazia', (cx && (cx.innerText || '').trim()) ? 'tem texto digitado na caixa' : '');
    if ((AUTO.grpModo || 'todos') !== 'todos' && (AUTO.grpSel || []).length) { var sg0 = sitCache[c.nome] || {}, gs0 = audGruposDe(sg0), bt0 = autoGrpBate(sg0);
      add(AUTO.grpModo === 'so' ? bt0 : !bt0, AUTO.grpModo === 'so' ? 'Está num dos grupos escolhidos' : 'Não está nos grupos bloqueados', 'grupos desta conversa: ' + (gs0.length ? gs0.join(', ') : 'nenhum') + ' · ' + (AUTO.grpModo === 'so' ? 'só manda pra: ' : 'não manda pra: ') + AUTO.grpSel.join(', ')); }
    if (!aus && AUTO.quem === 'clientes' && (AUTO.grpModo || 'todos') !== 'so') add(null, 'É cliente do PF', 'só manda pra cliente cadastrado no PF (confere na hora). Pra testar com qualquer um, mude "Pra quem" → "todos".');
    return L;
  }
  var autoTestR = null, autoTestando = false;
  async function autoTestar() {
    if (autoTestando || autoOcup) return; autoTestando = true; autoOcup = true; // 4.45 - não roda junto com a automática (texto em dobro)
    autoTestR = { carregando: true }; try { pinta(); } catch (e) { }
    try {
      var ok = await autoNaAberta(true); // 🧪 força: pula tempo/1ª vez/horário/limite, mas respeita "é cliente do PF" só quando quem=clientes? (força pula)
      var c = contatoAtual();
      autoTestR = { ok: ok, nome: c ? c.nome : '', diag: autoDiag() };
    } catch (e) { autoTestR = { erro: String(e && e.message || e), diag: autoDiag() }; }
    autoTestando = false; autoOcup = false; try { pinta(); } catch (e) { }
  }
  // conversas da lista com mensagem não lida há X min
  function autoCandidatas(aus, rej) {
    var out = [], espera = aus ? (+AUTO.ausMin || 1) : (+AUTO.min || 3);
    linhasLista().forEach(function (L) {
      if (!L.unread || autoPend[L.nome]) return;
      var t = horaFolha(L.el); if (!t) { if (rej) rej.push(L.nome + ' (não achei a hora)'); return; }
      var idade = Date.now() - t; if (idade < espera * 60000) { if (rej) rej.push(L.nome + ' (chegou agora, espera ' + espera + ' min)'); return; }
      if (idade > (aus ? 12 : 3) * 3600000) return;
      if (!autoPodeConv({ nome: L.nome, tel: L.tel }, aus)) { if (rej) rej.push(L.nome + ' (já mandei / limite)'); return; }
      out.push(L);
    });
    return out;
  }
  // 4.58 - A pedido do Vitor ("pq a msg automática não é feita assim hoje?"): com o motor ligado, lê as conversas não lidas, decide pelas mesmas regras e
  // manda SEM abrir a conversa (nem atrapalha o que você está digitando); depois marca como não lida. Sem motor = o jeito antigo (abre, manda, volta).
  async function autoMotorRodada(aus) {
    var r = await motor('chats', {}, 20000); if (!r || r.erro || !Array.isArray(r.l)) { autoLog('⚠️ Motor sem resposta (' + ((r && r.erro) || '?') + ') — usando o jeito antigo'); return false; }
    var espera = aus ? (+AUTO.ausMin || 1) : (+AUTO.min || 3), agora = Date.now(), atual = contatoAt ? contatoAt.nome : '', rej = [], cand = [];
    r.l.forEach(function (c) {
      if (!c.nome || c.nome === atual || autoPend[c.nome] || !c.t) return;
      var idade = agora - c.t; if (idade < espera * 60000) { rej.push(c.nome + ' (chegou agora, espera ' + espera + ' min)'); return; }
      if (idade > (aus ? 12 : 3) * 3600000) return;
      if (!autoPodeConv({ nome: c.nome, tel: c.tel }, aus)) { rej.push(c.nome + ' (já mandei / limite)'); return; }
      cand.push(c);
    });
    if (!cand.length) { autoLog(rej.length ? 'Nenhuma pra mandar agora: ' + rej.slice(0, 4).join(', ') : 'Nenhuma conversa não lida esperando'); return true; }
    for (var i = 0; i < cand.length && i < 5; i++) {
      var c = cand[i], cc = { nome: c.nome, tel: c.tel };
      var m = await motor('msgs', { id: c.id, n: 25 }, 15000); if (!m || !Array.isArray(m.l) || !m.l.length) continue;
      var L = m.l.slice().sort(function (a, b) { return a.t - b.t; }), last = L[L.length - 1];
      if (last.eu) { autoMarcarFeito(cc, aus); continue; }
      var bloco = [], foto = false, audio = false;
      for (var j = L.length - 1; j >= 0 && !L[j].eu; j--) { if (L[j].txt) bloco.unshift(L[j].txt); if (/image|sticker|video/.test(L[j].tipo)) foto = true; if (/ptt|audio/.test(L[j].tipo)) audio = true; }
      var u = { eu: false, t: last.t, txt: last.txt || '', bloco: bloco.join('\n'), foto: foto, audio: audio };
      if (Date.now() - u.t < espera * 60000) continue;
      if (aus && autoDesde(aus) && u.t < autoDesde(aus) - 600000) continue;
      var d0 = new Date(); d0.setHours(0, 0, 0, 0);
      var falei = L.some(function (x) { return x.eu && x.t >= d0.getTime(); }), escrevi = L.some(function (x) { return x.eu && x.t >= Date.now() - 1800000; });
      if (!aus && AUTO.quando === 'primeira' && falei) { autoLog('➖ ' + c.nome + ': você já falou com ele hoje', 1); continue; }
      if (!aus && AUTO.trava30 !== false && escrevi) continue;
      if (!(await autoEhCliente(cc))) { autoMarcarFeito(cc, aus); continue; }
      var txt; _autoCtx = { falei: falei, escrevi: escrevi }; try { txt = autoTexto(c.nome, u, aus); } finally { _autoCtx = null; }
      await dormir(1500 + Math.random() * 2500); // "lendo"
      var sr = await motor('enviar', { id: c.id, texto: txt }, 25000);
      if (!sr || sr.erro) { autoLog('⚠️ Não mandei pra ' + c.nome + ': ' + ((sr && sr.erro) || 'sem resposta'), 1); continue; }
      autoMarcarFeito(cc, aus); autoHist.push(Date.now()); autoUlt[c.nome] = txt; autoPend[c.nome] = { ts: Date.now(), txt: txt, aus: aus || '' };
      autoHist = autoHist.slice(-60); autoGravar();
      msg({ t: 'acao', acao: 'autoSaud', arg: { nome: c.nome, tel: c.tel || '', texto: txt, modo: aus || '' } });
      if (AUTO.naoLida !== false) { await dormir(700); await motor('naoLida', { id: c.id }, 10000); }
      autoLog('✅ Mandei pra ' + c.nome + ' (sem abrir a conversa)', 1);
    }
    try { autoBadges(); } catch (e) { }
    return true;
  }
  async function autoTick() {
    var aus = autoAusente();
    if (autoOcup) return;
    if (!aus && (!AUTO.on || !autoNoHorario())) return; // ausência vale a qualquer hora
    try { var sL = await chrome.storage.local.get(['lote']); if (sL.lote && !sL.lote.fim) return; } catch (e) { }
    autoOcup = true;
    try {
      if (contatoAt && await autoNaAberta()) return;
      if (!(AUTO.abrir || aus)) return;
      if (motorOk) { var okA = false; try { okA = await autoMotorRodada(aus); } catch (e) { autoLog('⚠️ Motor: ' + (e && e.message || e)); } if (okA) return; } // 4.58 - sem abrir as conversas
      var rej = [], cand = autoCandidatas(aus, rej);
      if (!cand.length) { autoLog(rej.length ? 'Nenhuma pra mandar agora: ' + rej.slice(0, 4).join(', ') : 'Nenhuma conversa não lida esperando'); return; }
      if (!autoLivre()) { autoLog('⏳ ' + cand.length + ' esperando — mando no 1º respiro (você está digitando/clicando)'); return; } // 4.53
      var antes = contatoAt ? contatoAt.nome : '', t0 = autoUltAcao, oculto = document.hidden;
      for (var i = 0; i < cand.length && i < 3; i++) {
        if (autoUltAcao !== t0 && !document.hidden) { autoLog('✋ Parei: você voltou a mexer no WhatsApp', 1); break; } // 4.53 - você clicou/digitou no meio: para e volta
        clicar(cand[i].el);
        var ab = await esperar(function () { var c = contatoAtual(); return c && c.nome === cand[i].nome ? c : null; }, oculto ? 15000 : 4000);
        if (!ab) { autoLog('⚠️ Não consegui abrir a conversa de ' + cand[i].nome, 1); continue; }
        await dormir(800);
        var foi = await autoNaAberta();
        if (!foi) { var c0 = contatoAtual(); var u0 = ultimaMsg(); if (c0 && u0 && u0.eu) autoMarcarFeito(c0, aus); }
        autoLog((foi ? '✅ Mandei pra ' : '➖ Não mandei pra ') + cand[i].nome + (oculto ? ' (WhatsApp em outra tela)' : ''), 1);
      }
      if (antes) { var vt = linhaDoNome(antes); if (vt) { clicar(vt); if (autoUltAcao === t0) await dormir(500); var cxv = caixaTexto(); if (cxv && !document.hidden) try { cxv.focus(); } catch (e) { } } }
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
      var b = document.createElement('span'); b.className = 'pfwa-autob'; b.textContent = autoPend[n].aus ? autoInfo(autoPend[n].aus)[0] + ' avisei que tô fora · responda' : '👋 saudação enviada · responda';
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
    var _av = autoAvisoDe(aus), tx = autoInfo(aus).join(' ') + (_av ? ' até ' + autoHoraBR(autoAvisoFim(_av)) : AUTO.ate ? ' até ' + (aus === 'ferias' ? autoDataBR(AUTO.ate) : autoHoraBR(AUTO.ate)) : '');
    if (el.textContent !== tx) { el.textContent = tx; el.title = 'Mensagem de ausência ligada — clique pra mudar ou voltar pra Disponível'; }
  }
  setInterval(function () { try { autoPendVigiar(); autoBadges(); autoStatusPill(); } catch (e) { } autoTick().catch(function (e) { console.warn('PF auto', e); }); }, 15000);

  // ═══ 4.47 🖱️ BOTÃO DIREITO + 🔎 Alt+B (A pedido do Vitor: "gostei de todas as dicas, pode colocar" + "o alt+b coloca no botão direito também"
  // + "isso vai ser bom pra entrar no catálogo dos componentes, que já vejo os monta com" + "pôr na cotação = a já aberta no dia de hoje") ═══
  var cmAlvo = {};
  function cmQual(t) {
    var r = { tipo: 'outro', forn: false, nome: '' }; if (!t || !t.closest) return r;
    var row = t.closest('#pane-side [role="listitem"], #pane-side div[role="row"]');
    if (row) { var ne = row.querySelector('span[title]'); r.tipo = 'conv'; r.nome = ne ? (ne.getAttribute('title') || '').trim() : ''; r.row = row; return r; }
    if (t.closest('#main') && !t.closest('footer') && !t.closest('header') && !t.closest(MEUS)) {
      var b = bolhaDe(t), main = t.closest('#main');
      if (b && b !== main && b.querySelector && (b.querySelector('[data-pre-plain-text], .selectable-text, img') || b.getAttribute('data-pre-plain-text'))) { r.tipo = 'msg'; r.b = b; r.forn = !!(resp && resp.tipo === 'fornecedor'); }
    }
    return r;
  }
  function cmAvisar(e) {
    try { var q = cmQual(e.target); cmAlvo = q; var sel = String(window.getSelection() || '').trim();
      chrome.runtime.sendMessage({ t: 'cmCtx', tipo: q.tipo, forn: q.forn, sel: !!sel, img: !!(e.target && e.target.tagName === 'IMG') }, function () { void chrome.runtime.lastError; }); } catch (x) { }
  }
  document.addEventListener('mousedown', function (e) { if (e.button === 2) cmAvisar(e); }, true);
  document.addEventListener('contextmenu', cmAvisar, true);
  // 10.3 - 📦 É pedido: marca à mão a mensagem como pedido a emitir (vai pro 📦 Meus pedidos › A emitir, anel tracejado na coluna, Pendências e ☀️ Meu dia)
  async function pedMarcarMsg(b, extra) {
    if (!contatoAt || contatoAt.grupo) { cmToast('Abra a conversa do cliente'); return; }
    var tx = cmTxt(b).replace(/\s*\d{1,2}:\d{2}\s*$/, '').trim(), eu = false; try { eu = minhaEl(b); } catch (e) { }
    var gat = (extra ? extra + (tx ? ' — ' : '') : '') + tx || '📦 marcado à mão';
    var ch = ultimo, rr = await msg({ t: 'acao', acao: 'pedidoEmitir', arg: { k: resp && resp.k, nome: contatoAt.nome, texto: gat, msgs: [{ t: tx || gat, eu: eu }], origem: eu ? 'mim' : 'cliente', manual: true } });
    if (!rr || !rr.ok) { cmToast(rr && rr.naoEra ? 'Você tinha marcado que isso não era pedido' : naoDeu()); return; }
    cmToast(rr.jaTinha ? '📦 Já estava anotado pra emitir — juntei nesse lembrete' : '📦 Anotado pra emitir — está no 📦 Meus pedidos › A emitir');
    if (ch === ultimo) { rr._txt = tx || gat; peR = rr; pintaPe(); }
    try { mpCarregar(); } catch (e) { }
  }
  function cmTxt(b) { if (!b) return ''; var tx = b.querySelector('.selectable-text'); return String((tx ? tx.innerText : b.innerText) || '').trim(); }
  function cmToast(t) { try { audToast(t); } catch (e) { } }
  async function cotarTxt(t) {
    t = String(t || '').trim(); if (!t) return; irAba('cot'); if (cotando) return;
    cotando = true; cotErro = ''; cot = null; pintaCorpo();
    var r = await msg({ t: 'acao', acao: 'cotar', arg: { k: resp && resp.k, contato: resp && resp.contato, msgs: [{ t: t, eu: false }] } });
    cotando = false; if (!r || r.erro) cotErro = 'O PF não respondeu. Dê F5 na aba do PartsFlow.'; else cot = r; pintaCorpo();
  }
  async function cotHoje(t, itens) {
    var r = await msg({ t: 'acao', acao: 'cotHoje', focar: true, arg: { k: resp && resp.k, contato: resp && resp.contato, pessoa: pessoaComprador(), texto: String(t || ''), itens: itens || null } });
    if (!r || r.erro) cmToast('O PF não respondeu — dê F5 na aba do PartsFlow');
    else if (r.ok === false) cmToast(r.msg || 'Não achei código no que você selecionou');
  }
  // 6.4 - ⚙️ CONFIGURAÇÕES EM ABA PRÓPRIA (A pedido do Vitor: "não seria melhor abrir em uma nova aba? como uma tela mais intuitiva, mais organizada";
  // prévia docs/referencias/whatsapp-pedidos-config/previa-config.png). A página config.html só MOSTRA: pede aqui o HTML de cada seção e manda os
  // cliques/campos pra cá — as regras, os textos e o gravar continuam todos aqui (nada duplicado). Seção nova → caso no cfgSecHtml + item no config.js.
  var CFG_SEC_BARRA = ['menu', 'etq', 'bots', 'mp', 'selo', 'rrselo', 'rfselo', 'barra', 'salvar'], CFG_SEC_AUDIO = ['audio', 'audioBotoes'];
  function cfgLinhasHtml(ks) {
    return CFG_LISTA.filter(function (x) { return ks.indexOf(x[0]) >= 0; }).map(function (x) {
      return '<div class="pfwa-cfgl" data-acao="cfgTog" data-arg="' + x[0] + '"><span class="pfwa-cfgi">' + x[1] + '</span><div><b>' + esc(x[2]) + '</b><br><small>' + esc(x[3]) + '</small></div><span class="pfwa-sw' + (cfgOn(x[0]) ? ' on' : '') + '"><i></i></span></div>';
    }).join('');
  }
  // 8.3 - 🗓 Disparos agendados e ⏰ Status automático (A pedido do Vitor: "aqui não configura status automático" + "os disparos em massa também,
  // por classificação" + "vamos deixar aqui e lá também"). As regras e os dados ficam no PF (pfDispAgendas_v1 / pfStatusAuto_v1); aqui só mostra e liga/desliga.
  var DSP = null, DSP_LOTE = null;
  async function dspCarregar() {
    try { DSP = await msg({ t: 'acao', acao: 'dispInfo', arg: {} }); } catch (e) { DSP = null; }
    try { var s = await chrome.storage.local.get(['lote']); DSP_LOTE = s.lote || null; } catch (e) { DSP_LOTE = null; }
  }
  function dspData(t) { if (!t) return '—'; var d = new Date(t); return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }) + ' ' + d.toTimeString().slice(0, 5); }
  function dspSemPF() { return '<div class="pfwa-nada">O PF não respondeu. Abra o PartsFlow numa aba deste navegador (e faça o login) — os agendamentos ficam guardados lá.</div>'; }
  function dspLoteHtml() {
    var L = DSP_LOTE; if (!L || !L.itens || !L.itens.length) return '<div class="pfwa-nada">Nenhum disparo mandando agora.</div>';
    var ok = L.itens.filter(function (x) { return x.st === 'ok'; }).length, er = L.itens.filter(function (x) { return x.st === 'erro'; }).length, tot = L.itens.length, ativo = !L.fim && !L.parado;
    var pct = Math.round((ok + er) / tot * 100);
    return '<div style="font-size:13px;margin-bottom:6px"><b>' + esc(L.titulo || 'Disparo') + '</b> · ' + (ativo ? 'mandando…' : (L.parado ? 'parado' : 'terminou ' + dspData(L.fim))) + '</div>' +
      '<div class="pfwa-progb"><i style="width:' + pct + '%"></i></div><div style="font-size:12px;color:#607080;margin:4px 0">' + ok + ' enviadas · ' + er + ' não foram · ' + (tot - ok - er) + ' na fila (de ' + tot + ')</div>' +
      (ativo ? '<div class="pfwa-cfgbtns"><button data-acao="dspParar" class="pfwa-cfgb" style="background:#B3231C">⏹ Parar</button></div>' : '');
  }
  function dspDisparoHtml(C) {
    if (!DSP || !DSP.ok) return C('🗓 Disparos agendados', dspSemPF()) + C('📣 Mandando agora', dspLoteHtml());
    var L = DSP.agendas || [];
    var lista = L.length ? L.map(function (a) {
      return '<div class="pfwa-cfgl" style="align-items:flex-start;' + (a.on ? '' : 'opacity:.6') + '"><span class="pfwa-cfgi">🗓</span><div style="flex:1;min-width:0"><b>' + esc(a.nome || '') + '</b><br><small>🕘 ' + esc(a.quando) + ' · ' + esc(a.filtro) + '</small><br><small>' +
        (a.on && a.prox ? 'Próxima: <b>' + dspData(a.prox) + '</b>' : '') + (a.ult ? ' · Última: ' + dspData(a.ult.em) + ' — ' + esc(a.ult.obs || (a.ult.n + ' na lista' + (a.ult.ok != null ? ', ' + a.ult.ok + ' enviadas' : ''))) : '') + (a.meu ? '' : ' · roda no PF de ' + esc(a.por)) + '</small>' +
        '<div class="pfwa-cfgbtns" style="margin:6px 0 0">' + (a.meu ? '<button data-acao="dspRodar" data-arg="' + a.id + '" class="pfwa-cfgb">▶ Mandar agora</button>' : '') + '<button data-acao="dspDel" data-arg="' + a.id + '" class="pfwa-cfgb" style="background:#7a8699">🗑 Apagar</button></div></div>' +
        '<span class="pfwa-sw' + (a.on ? ' on' : '') + '" data-acao="dspTog" data-arg="' + a.id + '" title="Liga/desliga"><i></i></span></div>';
    }).join('') : '<div class="pfwa-nada">Nenhum disparo agendado ainda.</div>';
    return C('📣 Disparo em massa', '<div class="pfwa-nada" style="margin-bottom:8px">A lista é montada pelo PF: o que chegou, quem compra uma marca, clientes sumidos, todos — com filtro por <b>linha</b>, <b>tipo</b> (revenda, concessionária, cliente final, serviço, rental), <b>estado</b> e <b>cidade</b>. Quem já recebeu o mesmo assunto fica de fora.</div>' +
        '<div class="pfwa-cfgbtns"><button data-acao="dspIr" data-arg="disparo" class="pfwa-cfgb verde">📣 Novo disparo / agendar (abre no PF)</button><button data-acao="dspIr" data-arg="dispAg" class="pfwa-cfgb">🗓 Ver no PF</button></div>') +
      C('🗓 Disparos agendados', lista + '<div class="pfwa-nada" style="margin-top:6px">Pra agendar: monte o disparo no PF e clique em <b>🗓 Agendar</b> (uma vez ou toda semana). Na hora, o PF de quem agendou precisa estar aberto com o WhatsApp Web.</div>') +
      C('📣 Mandando agora', dspLoteHtml());
  }
  function dspStatusHtml(C) {
    if (!DSP || !DSP.ok || !DSP.st) return C('⏰ Status automático', dspSemPF());
    var S = DSP.st, Ch = S.chegou || {}, DN = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
    var dias = [1, 2, 3, 4, 5, 6, 0].map(function (d) { var on = (Ch.dias || []).indexOf(d) >= 0; return '<span data-acao="stDia" data-arg="' + d + '" class="' + (on ? 'on' : '') + '">' + DN[d] + '</span>'; }).join('');
    return (S.meu ? '' : C('👤 Quem posta', '<div class="pfwa-nada">Hoje quem posta é o PF de <b>' + esc(S.dono) + '</b>.</div><div class="pfwa-cfgbtns"><button data-acao="stSet" data-arg="dono|1" class="pfwa-cfgb">Passar pra mim</button></div>')) +
      C('📣 Chegou no estoque — todo dia no horário',
        '<div class="pfwa-cfgl" data-acao="stSet" data-arg="chegou.on|' + (Ch.on ? '' : '1') + '"><span class="pfwa-cfgi">📣</span><div><b>Postar o que chegou</b><br><small>Imagem com as peças que chegaram desde o último status. Nada chegou = não posta.</small></div><span class="pfwa-sw' + (Ch.on ? ' on' : '') + '"><i></i></span></div>' +
        '<div class="au-modos au-est" style="margin:6px 0">' + dias + '</div>' +
        '<div style="display:flex;gap:8px;align-items:center;font-size:13px;margin:6px 0">Às <input type="time" data-au="st_hora" value="' + esc(Ch.hora || '10:00') + '" style="padding:5px;border:1px solid #cfd8e3;border-radius:7px"> · até <select data-au="st_max" style="padding:5px;border:1px solid #cfd8e3;border-radius:7px">' + [4, 6, 8].map(function (n) { return '<option' + (+Ch.max === n ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select> peças</div>' +
        (Ch.on && S.prox ? '<div class="pfwa-nada">Próximo: <b>' + dspData(S.prox) + '</b></div>' : '') +
        '<div class="pfwa-cfgbtns"><button data-acao="stAgora" class="pfwa-cfgb">▶ Postar o que chegou agora</button></div>') +
      C('✋ Publicar sozinho ou pedir ok', '<div class="au-modos au-est"><span data-acao="stSet" data-arg="publicar|" class="' + (!S.publicar ? 'on' : '') + '">Preparar e eu publico</span><span data-acao="stSet" data-arg="publicar|1" class="' + (S.publicar ? 'on' : '') + '">Publicar sozinho</span></div>' +
        '<div class="pfwa-nada" style="margin-top:6px">' + (S.publicar ? 'Posta sem perguntar.' : 'A extensão abre o Status com a imagem e a legenda — você confere e aperta enviar.') + '</div>') +
      C('📅 Status programados', ((S.agenda || []).length ? S.agenda.map(function (a) { return '<div class="pfwa-cfgl"><span class="pfwa-cfgi">' + (a.tipo === 'texto' ? '✍' : '⭐') + '</span><div><b>' + esc(a.txt) + '</b><br><small>' + esc(a.quando) + (a.feito ? ' · ' + esc(a.obs || '✔ feito') : '') + '</small></div><span class="pfwa-link" data-acao="stAgDel" data-arg="' + a.id + '">🗑</span></div>'; }).join('') : '<div class="pfwa-nada">Nenhum.</div>') +
        '<div class="pfwa-cfgbtns"><button data-acao="dspIr" data-arg="stAuto" class="pfwa-cfgb verde">➕ Programar um status (abre no PF)</button><button data-acao="dspIr" data-arg="status" class="pfwa-cfgb">📢 Montar um status agora</button></div>') +
      ((S.log || []).length ? C('🧾 O que aconteceu', S.log.map(function (l) { return '<div style="font-size:12px;color:#334155">' + dspData(l.em) + ' — ' + esc(l.t) + '</div>'; }).join('')) : '') +
      '<div class="pfwa-nada" style="margin-top:4px">Na hora marcada o PF precisa estar aberto (no computador de quem ligou) com a extensão e o WhatsApp Web. Fechados = espera até 12 h, depois pula e anota.</div>';
  }
  async function dspAcao(ac, arg) {
    if (ac === 'dspIr') { msg({ t: 'acao', acao: 'irTela', arg: { tela: arg }, focar: true }); return; }
    if (ac === 'dspParar') { try { var s = await chrome.storage.local.get(['lote']); if (s.lote) chrome.runtime.sendMessage({ t: 'parar', id: s.lote.id }); } catch (e) { } await dormir(400); return; }
    if (ac === 'dspTog') return msg({ t: 'acao', acao: 'dispAgTog', arg: { id: arg } });
    if (ac === 'dspDel') return msg({ t: 'acao', acao: 'dispAgDel', arg: { id: arg } });
    if (ac === 'dspRodar') return msg({ t: 'acao', acao: 'dispAgRodar', arg: { id: arg } });
    if (ac === 'stAgora') return msg({ t: 'acao', acao: 'stAutoAgora', arg: {} });
    if (ac === 'stAgDel') return msg({ t: 'acao', acao: 'stAutoAgDel', arg: { id: arg } });
    if (ac === 'stDia') return msg({ t: 'acao', acao: 'stAutoSet', arg: { campo: 'chegou.dia', v: +arg } });
    if (ac === 'stSet') { var p = String(arg).split('|'); return msg({ t: 'acao', acao: 'stAutoSet', arg: { campo: p[0], v: !!p[1] } }); }
  }
  function cfgSecHtml(sec) {
    var C = function (t, h) { return '<div class="au-sec cfg-card"><b class="cfg-ct">' + t + '</b>' + h + '</div>'; };
    if (sec === 'aparencia') {
      return C('🖼️ Jeito dos botões ao lado das mensagens', '<div class="au-modos au-est"><span data-acao="cfgVis" data-arg="A" class="' + (visual !== 'D' ? 'on' : '') + '">A · coluna ao lado</span><span data-acao="cfgVis" data-arg="D" class="' + (visual === 'D' ? 'on' : '') + '">D · barra flutuante embaixo</span></div>') +
        C('🎨 Cor do Menu do PF', '<div class="au-modos au-est"><span data-acao="menuCor" data-arg="azul" class="' + (menuCor !== 'discreta' ? 'on' : '') + '">Azul</span><span data-acao="menuCor" data-arg="discreta" class="' + (menuCor === 'discreta' ? 'on' : '') + '">Discreta</span></div>') +
        C('🔣 Ícones dos botões', '<div class="pfwa-icoest">' + ICO_ESTILOS.map(function (e) { return '<span data-acao="icoEst" data-arg="' + e[0] + '" class="' + (ICO_EST === e[0] ? 'on' : '') + '">' + e[1] + '</span>'; }).join('') + '</div>' +
          '<div class="pfwa-nada" style="margin:8px 0">Clique num botão pra trocar o ícone dele (abre o seletor do PF — vale pra todo mundo).</div><div class="pfwa-icolista">' +
          BOTOES.map(function (b) { return '<span data-acao="icoTrocar" data-arg="' + b[0] + '" title="Trocar o ícone de ' + esc(b[2]) + '">' + icoHtml(b[0], b[1], ICO_EST === 'emoji' ? 'azul' : ICO_EST) + '<small>' + esc(b[2]) + '</small></span>'; }).join('') + '</div>');
    }
    if (sec === 'barra') return C('🧰 O que aparece no WhatsApp', cfgLinhasHtml(CFG_SEC_BARRA));
    if (sec === 'auto') return htmlAuto();
    if (sec === 'assist') return C('🤖 Assistente', htmlAss()); // 9.2
    if (sec === 'avisos') {
      var ks = CFG_LISTA.map(function (x) { return x[0]; }).filter(function (k) { return CFG_SEC_BARRA.indexOf(k) < 0 && CFG_SEC_AUDIO.indexOf(k) < 0; });
      return C('🔔 Avisos e lembretes automáticos', cfgLinhasHtml(ks)) +
        C('📒 O que vai pro CRM', '<div class="pfwa-cfgl" data-acao="extCfgAbrir"><span class="pfwa-cfgi">📒</span><div><b>O que vai pro CRM</b><br><small>Liga/desliga cada tipo (pedido a emitir, vou verificar, promessas, ofertas), frases que contam e que NÃO contam, caixa de teste. Fica no PF — vale pra equipe toda.</small></div><span class="pfwa-link">ajustar no PF ›</span></div>' +
          '<div class="pfwa-cfgl" data-acao="crmHoje"><span class="pfwa-cfgi">📊</span><div><b>Ver o que foi pro CRM</b><br><small>Relatório hoje / 7 / 30 dias / tudo.</small></div><span class="pfwa-link">abrir ›</span></div>' +
          '<div class="pfwa-cfgl" data-acao="crmVarrer"><span class="pfwa-cfgi">🔄</span><div><b>Varrer as conversas antigas</b><br><small>Põe na ficha, com a data certa, o que não tinha entrado. Rode de novo depois de mudar as frases — não duplica.</small></div><span class="pfwa-link">' + (crmVarRodando ? 'parar' : 'começar ›') + '</span></div>' + (TAREFA_EL && TAREFA_EL.innerHTML ? '<div class="pfwa-tarefa">' + TAREFA_EL.innerHTML + '</div>' : ''));
    }
    if (sec === 'audio') return C('🎤 Áudios', cfgLinhasHtml(CFG_SEC_AUDIO) + '<div class="pfwa-cfgl" data-acao="cfgStt"><span class="pfwa-cfgi">🔑</span><div><b>Chave do serviço de transcrição</b><br><small>Fica em 🔑 Minhas Chaves no PF.</small></div><span class="pfwa-link">abrir no PF ›</span></div>');
    if (sec === 'contatos') return C('📇 Contatos', motorSeloHtml() +
      '<div class="pfwa-cfgbtns"><button data-acao="importar" class="pfwa-cfgb verde">📥 Importar meus contatos</button>' +
      '<button data-acao="listaMassa" class="pfwa-cfgb">' + (lmRodando ? '⏸ Parar' : '🏷️ Pôr os clientes na lista Cliente PF') + '</button>' +
      '<button data-acao="numeros" class="pfwa-cfgb pfwa-num">' + (numRodando ? '⏸ Parar' : '📞 Buscar números que faltam') + '</button></div>' +
      (TAREFA_EL && TAREFA_EL.innerHTML ? '<div class="pfwa-tarefa">' + TAREFA_EL.innerHTML + '</div>' : '') +
      '<div class="pfwa-nada" style="margin-top:8px">Esses trabalhos rodam na aba do WhatsApp — pode deixar esta página aberta pra acompanhar.</div>');
    if (sec === 'motor') return C('⚙️ Motor', motorSeloHtml() + '<div class="pfwa-nada" style="margin-top:8px">Com o motor ligado, a extensão faz as coisas por dentro do WhatsApp (mensagens automáticas, listas, números) sem abrir as conversas na sua frente. Desligado, ela faz do jeito antigo, abrindo as conversas. Ele liga sozinho quando o WhatsApp permite.</div>');
    if (sec === 'ajuda') return htmlAjuda();
    if (sec === 'disparo') return dspDisparoHtml(C); // 8.3
    if (sec === 'stauto') return dspStatusHtml(C);
    return '';
  }
  async function cfgRemoto(m) {
    var oc = window.confirm, op = window.prompt;
    try {
      if (m.op === 'acao') {
        if (/^(dsp|st)[A-Z]/.test(m.ac)) { await dspAcao(m.ac, m.arg || ''); } // 8.3
        else if (m.ac === 'cfgVis') { visual = m.arg === 'D' ? 'D' : 'A'; chrome.storage.local.set({ visual: visual }); pinta(); posicionar(); }
        else if (m.ac === 'cfgStt') { msg({ t: 'acao', acao: 'sttConfig', focar: true }); }
        else {
          if (m.ok) window.confirm = function () { return true; }; // a página já perguntou
          var el = document.createElement('span'); el.setAttribute('data-acao', m.ac); el.setAttribute('data-arg', m.arg || '');
          await clique({ target: el, preventDefault: function () { }, stopPropagation: function () { } });
        }
      } else if (m.op === 'campo' && (m.k === 'st_hora' || m.k === 'st_max')) { await msg({ t: 'acao', acao: 'stAutoSet', arg: { campo: m.k === 'st_hora' ? 'chegou.hora' : 'chegou.max', v: m.v } }); // 8.3
      } else if (m.op === 'campo') {
        var f = document.createElement(m.tag === 'TEXTAREA' ? 'textarea' : 'input'); if (m.tipo) f.type = m.tipo;
        f.setAttribute('data-au', m.k); f.value = m.v == null ? '' : m.v; if (m.tipo === 'checkbox') f.checked = !!m.checked;
        autoCampo(f);
      }
    } catch (e) { console.warn('PF config', e); } finally { window.confirm = oc; window.prompt = op; }
    if (m.sec === 'disparo' || m.sec === 'stauto') await dspCarregar(); // 8.3
    return { ok: 1, html: cfgSecHtml(m.sec), auto: !!AUTO.on, status: (function () { try { var a = autoAusente(); return a ? autoInfo(a).join(' ') : ''; } catch (e) { return ''; } })() };
  }
  chrome.runtime.onMessage.addListener(function (m, s, send) {
    if (!m || m.t !== 'cfgRemoto') return;
    cfgRemoto(m).then(send, function () { send({ ok: 0 }); });
    return true;
  });
  chrome.runtime.onMessage.addListener(function (m, s, send) {
    if (!m || m.t !== 'cmClick') return;
    cmExec(m.id, m.sel || '', m.src || '').catch(function (e) { console.warn('PF botão direito', e); });
    send({ ok: 1 });
  });
  // 4.93 - 💲 preço do concorrente: o PF abre a janela já preenchida (concorrente, preço, peças da última cotação do cliente) — você confere e grava
  async function pcMandar(a) {
    a = a || {}; a.k = resp && resp.k; a.contato = (resp && resp.contato) || (typeof nomeConversa === 'function' ? nomeConversa() : '');
    var r = await msg({ t: 'acao', acao: 'precoConc', focar: true, arg: a });
    cmToast(r && r.ok ? '💲 Abri no PF — confira e grave' : 'Não deu — ' + ((r && r.msg) || 'abra o PF (F5)'));
  }
  async function cmExec(id, sel, src) {
    var A = cmAlvo || {};
    if (id === 'sel_ver') { abAbrir(sel); return; }
    if (id === 'sel_mc') { mcAbrir(sel); return; } // 4.92
    if (id === 'sel_pc') { pcMandar({ texto: sel }); return; } // 4.93 - 💲 preço do concorrente
    if (id === 'sel_cot') { cotHoje(sel); return; }
    if (id === 'sel_cotar') { cotarTxt(sel); return; }
    if (id === 'sel_avise') { aviseMe(sel); return; } // 4.78
    if (id === 'sel_curta') { qkAbrir([sel]); return; }
    if (id === 'sel_jb') { jbLer({ texto: sel }); return; } // 9.7 - 📋 Copiar pro JBoss
    if (id === 'msg_jb') {
      var _jImg = ''; try { _jImg = fotoMelhor(A.b) || (!A.b && fotoDoVisualizador(600) ? 'viz' : ''); } catch (e) { }
      var _jDoc = ''; try { var _tb = String((A.b && A.b.innerText) || ''), _md = _tb.match(/([^\n]+?\.pdf)\b/i); if (_md) _jDoc = _md[1].trim(); else if (/\bPDF\b\s*[•·]/.test(_tb)) _jDoc = '?'; } catch (e) { }
      if (_jImg) { var _jDu = await fotoDados(A.b, _jImg === 'viz' ? '' : _jImg); if (!_jDu) { cmToast('Não consegui pegar a foto — abra a foto e tente de novo'); return; } jbLer({ img: _jDu }); return; }
      if (_jDoc) { if (!motorOk) await motorChecar(); if (!motorOk) { cmToast('Pra ler o PDF daqui o ⚙️ motor precisa estar ligado (F5 no WhatsApp).'); return; }
        jbPinta('<div style="color:#556;padding:14px 0;text-align:center">Baixando o PDF…</div>', ''); var _mj = await motor('midia', { nome: _jDoc === '?' ? '' : _jDoc }, 60000);
        if (!_mj || _mj.erro || !_mj.data) { jbPinta('<div style="color:#C0392B">Não consegui baixar o PDF' + (_mj && _mj.erro ? ' (' + esc(_mj.erro) + ')' : '') + '</div>', ''); return; }
        jbLer({ pdf: _mj.data, nome: _mj.nome || 'pedido.pdf' }); return; }
      if (!A.b) { cmToast('Clique com o botão direito em cima da mensagem'); return; }
      jbLer({ texto: cmTxt(A.b) }); return; }
    if (id === 'sel_leitor' || id === 'msg_leitor') { // 7.4 - A pedido do Vitor ("mandei para o leitor. mas não foi" — foto do caderno): mensagem com FOTO manda a foto (o Leitor lê com IA)
      var _lImg = '';
      if (id === 'msg_leitor') { _lImg = fotoMelhor(A.b) || (!A.b && fotoDoVisualizador(600) ? 'viz' : ''); }
      if (_lImg) cmToast('📝 Mandando a foto pro Leitor de Peças…');
      var _lDu = _lImg ? await fotoDados(A.b, _lImg === 'viz' ? '' : _lImg) : '';
      // 8.1 - A pedido do Vitor (lista do caderno lida toda errada): sem o motor a extensão só pega a MINIATURA da conversa (borrada) e a IA inventa os códigos — avisa.
      if (_lDu) { try { var _tm = await new Promise(function (ok) { var im = new Image(); im.onload = function () { ok(Math.max(im.naturalWidth, im.naturalHeight)); }; im.onerror = function () { ok(0); }; im.src = _lDu; });
        if (_tm && _tm < 800) { cmToast('⚠ Só consegui a MINIATURA da foto (' + _tm + ' px) — a leitura pode sair errada. Ligue o ⚙️ motor (Configurações → Contatos) ou abra a foto e mande o print pelo 📋 Colar print do Leitor.'); await dormir(2500); } } catch (e) { } }
      var rl = await msg({ t: 'acao', acao: 'leitor', focar: true, arg: { texto: id === 'sel_leitor' ? sel : cmTxt(A.b), img: _lDu || '' } }); cmToast(rl && rl.ok ? '📝 Mandei pro Leitor de Peças do PF' : naoDeu()); return; } // 4.85
    if (/^msg_/.test(id) && !A.b) { cmToast('Clique com o botão direito em cima da mensagem'); return; }
    if (id === 'msg_cotar') { cotarTxt(cmTxt(A.b)); return; }
    if (id === 'msg_pc') { pcMandar({ texto: cmTxt(A.b) }); return; } // 4.93
    if (id === 'msg_mc') { mcAbrir(cmTxt(A.b).replace(/\s*\d{1,2}:\d{2}\s*$/, '')); return; } // 4.92
    if (id === 'msg_avise') { aviseMe(cmTxt(A.b)); return; } // 4.78
    if (id === 'msg_pedm') { pedMarcarMsg(A.b, src); return; } // 10.3
    if (id === 'msg_qk') { var w0 = String(src || '').trim(); if (!w0) return; var rq = await msg({ t: 'acao', acao: 'lerCods', arg: { texto: cmTxt(A.b) } }); var cq = (rq && rq.cods && rq.cods.length) ? rq.cods.map(function (c) { return String(c || '').trim().split(/\s+/)[0].slice(0, 30); }).filter(Boolean) : [];
      if (!cq.length) { qkCods = null; qkUsar('', w0); return; } qkCods = null; cq.forEach(function (c, i) { setTimeout(function () { qkUsar(c, w0); }, i * 500); }); return; } // 4.86
    if (id === 'msg_curta') { var rc = await msg({ t: 'acao', acao: 'lerCods', arg: { texto: cmTxt(A.b) } }); qkAbrir(rc && rc.cods && rc.cods.length ? rc.cods : null); return; }
    if (id === 'msg_lemb') {
      if (!resp || !resp.k) { cmToast('Lembrete na ficha: essa conversa precisa ser de um cliente do PF'); return; }
      irAba('cli'); var tx0 = cmTxt(A.b).replace(/\s*\d{1,2}:\d{2}\s*$/, '').slice(0, 140);
      setTimeout(function () { var t = P && P.querySelector('.pfwa-lemb-t'); if (t) t.value = tx0; var d = P && P.querySelector('.pfwa-lemb-d'); if (d) { d.focus(); try { d.showPicker(); } catch (e) { } } }, 300); return;
    }
    if (id === 'msg_rr') {
      var tx = cmTxt(A.b).replace(/\s*\d{1,2}:\d{2}\s*$/, ''); var nome = prompt('Nome da resposta rápida (ex.: Endereço, PIX):', ''); if (!nome) return;
      var r1 = await msg({ t: 'acao', acao: 'rrSalvar', arg: { nome: nome, texto: tx, trocar: true, k: resp && resp.k, contato: resp && resp.contato } });
      cmToast(r1 && r1.ok ? '💾 Resposta rápida "' + nome + '" salva nos Atalhos de Texto do PF' : naoDeu()); return;
    }
    if (id === 'msg_nota') {
      if (!resp || !resp.k) { cmToast('Essa conversa não é de um cliente do PF'); return; }
      var r2 = await msg({ t: 'acao', acao: 'registrar', arg: { k: resp.k, texto: '📝 ' + cmTxt(A.b).replace(/\s*\d{1,2}:\d{2}\s*$/, '') } });
      cmToast(r2 && r2.ok ? '📝 Anotado na ficha do cliente' : naoDeu()); return;
    }
    if (id === 'msg_mapa' || id === 'img_mapa') {
      var bt = ((resp && resp.botoes) || []).find(function (x) { return x && x.acao === 'respForn'; });
      if (!bt) { cmToast(resp && resp.tipo === 'fornecedor' ? 'Esse fornecedor não tem mapa esperando resposta (o mapa precisa ter ele e estar criado — etapa 2 em diante)' : 'O PF não reconhece esta conversa como fornecedor — clique no 👤 ao lado do nome e salve como 🏭 Fornecedor'); return; }
      var pr = String(bt.arg || '').split('|'), ims = [], texto = A.b ? cmTxt(A.b) : '';
      if (src) { var du = await urlParaDataUrl(src); if (du) ims.push(du); }
      else if (A.b) { var imgs = A.b.querySelectorAll('img'); for (var i = 0; i < imgs.length && ims.length < 4; i++) { var sr = imgs[i].getAttribute('src') || ''; if ((/^blob:|^data:image/.test(sr)) && (imgs[i].naturalWidth || imgs[i].width) >= 120) { var d2 = await urlParaDataUrl(sr); if (d2) ims.push(d2); } } }
      await msg({ t: 'acao', acao: 'respForn', focar: true, arg: { mapa: pr[0], fid: pr[1], texto: texto, imgs: ims } });
      cmToast('✔ Abri no PF — confira e lance'); return;
    }
    // 8.0 - A pedido do Vitor ("opção de ler como pedido de compra… puxa os itens numa cotação nova ou pra atualizar outra, campo do nº do pedido de compra,
    // e se tiver cotação em aberto, avisar os itens com preço diferente"): manda a foto/PDF pro PF, que lê e abre a conferência do pedido.
    if (id === 'img_ped' || id === 'doc_ped') {
      var dP = null;
      if (id === 'doc_ped') { if (!motorOk) await motorChecar(); if (!motorOk) { cmToast('Pra ler o PDF daqui o ⚙️ motor precisa estar ligado (recarregue o WhatsApp, F5).'); return; }
        cmToast('🧾 Pegando o PDF…'); var mdP = await motor('midia', { nome: src || '' }, 60000); if (!mdP || mdP.erro || !mdP.data) { cmToast('Não consegui baixar o PDF' + (mdP && mdP.erro ? ' (' + mdP.erro + ')' : '')); return; } dP = { img: mdP.data, nome: mdP.nome, mime: mdP.mime }; }
      else { if (!src) { var imQ = A.b && A.b.querySelector('img'); src = imQ ? imQ.getAttribute('src') : ''; } if (!src) { cmToast('Clique com o botão direito em cima da foto'); return; }
        var duQ = await fotoDados(A.b, src); if (!duQ) { cmToast('Não consegui pegar a foto — abra a foto no WhatsApp e tente de novo'); return; } dP = { img: duQ }; }
      dP.k = resp && resp.k; dP.contato = resp && resp.contato; dP.pessoa = pessoaComprador();
      var rP = await msg({ t: 'acao', acao: 'pedLer', focar: true, arg: dP });
      cmToast(rP && rP.ok ? '🧾 Abri no PF — lendo o pedido de compra' : naoDeu()); return;
    }
    var _iaMin = false; if (id === 'doc_iamin' || id === 'img_iamin') { _iaMin = true; id = id.replace('min', ''); } // 5.6 - A pedido do Vitor ("opção de criar minimizado tbm. às vezes atrapalha já abrir direto na tela")
    if (id === 'doc_ia') {
      if (!motorOk) await motorChecar();
      if (!motorOk) { cmToast('Pra ler o PDF daqui o ⚙️ motor precisa estar ligado (recarregue o WhatsApp, F5). Ou baixe o PDF e use 📥 Subir lista na cotação do PF.'); return; }
      irAba('cot'); if (cotando) return; cotando = true; cot = null; cotErro = ''; pintaCorpo();
      var md = await motor('midia', { nome: src || '' }, 60000);
      if (!md || md.erro || !md.data) { cotando = false; cotErro = 'Não consegui baixar o PDF' + (md && md.erro ? ' (' + md.erro + ')' : '') + ' — baixe e use 📥 Subir lista na cotação do PF'; pintaCorpo(); return; }
      var r6 = await msg({ t: 'acao', acao: 'cotarImg', arg: { img: md.data, nome: md.nome, mime: md.mime, k: resp && resp.k, contato: resp && resp.contato } });
      cotando = false; if (r6 && r6.jboss) { cotErro = ''; pintaCorpo(); await msg({ t: 'acao', acao: 'jbAbrir', focar: !_iaMin, arg: {} }); cmToast('✔ É a cotação ' + (r6.num || '') + ' da Triex — abri no PF pra criar com o preço da Triex'); return; } if (!r6 || r6.erro) cotErro = 'Não consegui ler o PDF' + (r6 && r6.msg ? ': ' + r6.msg : ''); else { cot = r6; if (_iaMin) { if (cot.itens && cot.itens.length) abrirCot(false, true); else cmToast('A IA não achou peças no PDF'); } } pintaCorpo(); return;
    }
    if (id === 'img_ia') {
      if (!src) return; irAba('cot'); if (cotando) return; cotando = true; cot = null; cotErro = ''; pintaCorpo();
      var du2 = await fotoDados(A.b, src); if (!du2) { cotando = false; cotErro = 'Não consegui pegar a foto — abra a foto no WhatsApp e tente de novo'; pintaCorpo(); return; }
      var r3 = await msg({ t: 'acao', acao: 'cotarImg', arg: { img: du2, k: resp && resp.k, contato: resp && resp.contato } });
      cotando = false; if (r3 && r3.jboss) { cotErro = ''; pintaCorpo(); await msg({ t: 'acao', acao: 'jbAbrir', focar: !_iaMin, arg: {} }); cmToast('✔ É a cotação ' + (r3.num || '') + ' da Triex — abri no PF pra criar com o preço da Triex'); return; } if (!r3 || r3.erro) cotErro = 'Não consegui ler a imagem' + (r3 && r3.msg ? ': ' + r3.msg : ''); else { cot = r3; if (_iaMin) { if (cot.itens && cot.itens.length) abrirCot(false, true); else cmToast('A IA não achou peças na foto'); } } pintaCorpo(); return;
    }
    if (id === 'img_pc') { // 4.93 - foto da cotação do concorrente que o cliente mandou
      if (!src) { var imP = A.b && A.b.querySelector('img'); src = imP ? imP.getAttribute('src') : ''; } if (!src) { cmToast('Clique com o botão direito em cima da foto'); return; }
      cmToast('💲 Lendo a cotação do concorrente no PF…'); var duP = await fotoDados(A.b, src); pcMandar({ img: duP }); return;
    }
    if (id === 'doc_pc') { // 4.93 - PDF da cotação do concorrente
      if (!motorOk) await motorChecar();
      if (!motorOk) { cmToast('Pra ler o PDF daqui o ⚙️ motor precisa estar ligado (F5 no WhatsApp). Ou baixe o PDF e use ⬆ Carregar arquivo no 💲 Preço do concorrente do PF.'); return; }
      cmToast('💲 Baixando o PDF…'); var mdP = await motor('midia', { nome: src || '' }, 60000);
      if (!mdP || mdP.erro || !mdP.data) { cmToast('Não consegui baixar o PDF — baixe e use ⬆ Carregar arquivo no PF'); return; }
      pcMandar({ img: mdP.data, nome: mdP.nome, mime: mdP.mime }); return;
    }
    if (id === 'img_plaq') { // 4.91 - A pedido do Vitor ("botão direito na imagem… enviar a plaqueta para o PF, para Máquinas")
      if (!src) { var im = A.b && A.b.querySelector('img'); src = im ? im.getAttribute('src') : ''; } if (!src) { cmToast('Clique com o botão direito em cima da foto'); return; }
      cmToast('🏷️ Lendo a plaqueta no PF…'); var du3 = await fotoDados(A.b, src);
      var rp = await msg({ t: 'acao', acao: 'plaqueta', focar: true, arg: { img: du3 } });
      cmToast(rp && rp.ok ? '✔ Abri no PF — confira a máquina e clique em Gravar' : 'Não deu — ' + ((rp && rp.msg) || 'abra o PF')); return;
    }
    if (id === 'cv_mat') { matMandadosAbrir(A.nome || ultimo); return; } // 6.8
    if (id === 'msg_conh') { conhLinkPor(); return; } // 10.4
    if (/^cv_/.test(id) && !A.nome) { cmToast('Clique com o botão direito em cima da conversa na lista'); return; }
    if (id === 'cv_pend' || id === 'cv_pendok') { // 6.2 - ⏳ pendência com o contato (marcada à mão)
      var stp = sitCache[A.nome] || {}; var tirap = id === 'cv_pendok' || (id === 'cv_pend' && stp.pend);
      if (tirap) { var rq = await msg({ t: 'acao', acao: 'pendTirar', arg: { nome: A.nome } }); stp.pend = ''; cmToast(rq && rq.ok ? '✔ ' + A.nome + ' — pendência resolvida, tirei o ⏳' : naoDeu()); }
      else { var ob = prompt('⏳ Pendência com ' + A.nome + '\nO que ficou pendente? (opcional — ex.: mandar preço da cruzeta, ver prazo)', ''); if (ob === null) return;
        var rp2 = await msg({ t: 'acao', acao: 'pendMarcar', arg: { nome: A.nome, obs: ob } }); stp.pend = ob || 1;
        cmToast(rp2 && rp2.ok ? (rp2.ja ? '⏳ Já estava marcado' : '⏳ Marcado: pendência com ' + (rp2.titulo || A.nome) + (rp2.cliente ? ' (Pendências e ☀️ Meu dia)' : ' (Pendências)')) : naoDeu()); }
      sitCache[A.nome] = stp; sitSig = ''; try { badgesRender(); carregarSituacoes(); } catch (e) { } return;
    }
    if (id === 'cv_ped' || id === 'cv_pedok') { // 4.91 - 📦 pedido pra enviar marcado à mão
      var stc = sitCache[A.nome] || {}; var tira = id === 'cv_pedok' || (id === 'cv_ped' && stc.emitir && !A.forcaMarcar);
      if (tira) { var ro = await msg({ t: 'acao', acao: 'pedidoEnviado', arg: { nome: A.nome } }); stc.emitir = false; cmToast(ro && ro.ok ? '✔ ' + A.nome + ' — pedido enviado, tirei o 📦' : naoDeu()); }
      else { var obs = prompt('📦 Pedido pra enviar — ' + A.nome + '\nObservação (opcional, ex.: nº do pedido, o que falta):', ''); if (obs === null) return;
        var rm = await msg({ t: 'acao', acao: 'pedidoMarcar', arg: { nome: A.nome, obs: obs } }); stc.emitir = true;
        cmToast(rm && rm.ok ? (rm.ja ? '📦 Já estava marcado' : '📦 Marcado: mandar o pedido de ' + (rm.titulo || A.nome) + (rm.cliente ? ' (Pendências e ☀️ Meu dia)' : ' (Pendências)')) : naoDeu()); }
      sitCache[A.nome] = stc; sitSig = ''; try { badgesRender(); carregarSituacoes(); } catch (e) { } return;
    }
    if (id === 'cv_ficha') { var r5 = await msg({ t: 'acao', acao: 'fichaNome', focar: true, arg: { nome: A.nome } }); if (r5 && r5.ok === false) cmToast('Não achei esse cliente no PF'); return; }
    if (id === 'cv_grupo') {
      if (A.row) clicar(A.row);
      var ab = await esperar(function () { var c = contatoAtual(); return c && c.nome === A.nome ? c : null; }, 4000); if (!ab) return;
      await dormir(1500); svAbrir(); return;
    }
    if (/^cv_int_/.test(id)) {
      var niv = id.slice(7), r4 = await msg({ t: 'acao', acao: 'intimSet', arg: { nome: A.nome, nivel: niv } });
      if (sitCache[A.nome]) sitCache[A.nome].intim = niv; else sitCache[A.nome] = { tipo: '', intim: niv };
      if (resp && contatoAt && contatoAt.nome === A.nome) resp.intim = niv;
      cmToast(r4 && r4.ok ? A.nome + ' → ' + ({ formal: '🎩 Formal', normal: '🙂 Normal', proximo: '🤝 Próximo' })[niv] : naoDeu()); return;
    }
    if (id === 'cv_nunca') {
      AUTO.nunca = AUTO.nunca || []; var ix = AUTO.nunca.indexOf(A.nome);
      if (ix >= 0) { AUTO.nunca.splice(ix, 1); cmToast('🔔 ' + A.nome + ' volta a receber mensagem automática'); }
      else { AUTO.nunca.push(A.nome); cmToast('🔕 ' + A.nome + ' não recebe mais mensagem automática'); }
      autoGravar(); return;
    }
  }
  // 4.65 - A pedido do Vitor ("botão direito aqui não abre nada, só quando seleciona"): sem seleção o WhatsApp abre o MENU DELE
  // (Responder, Copiar…) e o do Chrome não aparece — então as opções do PF entram dentro do menu do WhatsApp.
  var wmT = 0;
  document.addEventListener('contextmenu', function (e) {
    try { if (String(window.getSelection() || '').trim()) return; var q = cmQual(e.target); if (q.tipo !== 'msg') return; wmT = Date.now(); wmProcurar(0); } catch (x) { }
  }, true);
  // 4.91 - A pedido do Vitor (print do menu "Arquivar conversa / Silenciar / Fixar…"): botão direito na CONVERSA da lista abre o menu do WhatsApp —
  // as opções do PF entram nele: 📦 Tem pedido pra enviar / ✔ Pedido enviado, 🤝 Abrir ficha, 🔕 mensagem automática.
  var cvT = 0;
  document.addEventListener('contextmenu', function (e) {
    try { var q = cmQual(e.target); if (q.tipo !== 'conv') return; cvT = Date.now(); cvProcurar(0); } catch (x) { }
  }, true);
  function cvMenu() {
    var lbs = ['Arquivar conversa', 'Archive chat', 'Silenciar notificações', 'Mute notifications', 'Fixar conversa', 'Pin chat', 'Desafixar conversa', 'Unpin chat', 'Marcar como não lida', 'Mark as unread', 'Marcar como lida', 'Mark as read', 'Apagar conversa', 'Delete chat', 'Limpar conversa', 'Clear chat', 'Bloquear', 'Block'];
    var els = document.querySelectorAll('li, [role="menuitem"], [role="button"], div[tabindex]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i]; if (el.closest('#pfwa-painel, #pfwa-menu, #pfwa-rail, #pfwa-bots, #pane-side [role="listitem"]')) continue;
      var t = String(el.innerText || '').trim(); if (lbs.indexOf(t) < 0) continue;
      var r = el.getBoundingClientRect(); if (!r.width || !r.height) continue; return el;
    }
    return null;
  }
  function cvProcurar(n) {
    setTimeout(function () {
      if (Date.now() - cvT > 2500) return; var it = cvMenu(); if (!it) { if (n < 15) cvProcurar(n + 1); return; }
      var lista = it.parentElement; if (!lista || lista.querySelector('.pfwa-wm')) return;
      var A = cmAlvo || {}, st = sitCache[A.nome] || {}, its = [];
      its.push(st.pend ? ['cv_pendok', '✔ Resolvi a pendência (tirar o ⏳)'] : ['cv_pend', '⏳ Tenho pendência com esse contato (PF)']); // 6.2
      its.push(st.emitir ? ['cv_pedok', '✔ Pedido enviado (tirar o 📦)'] : ['cv_ped', '📦 Tem pedido pra enviar (PF)']);
      if (st.tipo === 'cliente') its.push(['cv_ficha', '🤝 Abrir ficha do cliente (PF)']);
      if (st.tipo === 'cliente') its.push(['cv_mat', '📎 O que já mandei pra ele (PF)']); // 6.8
      its.push(['cv_nunca', ((AUTO.nunca || []).indexOf(A.nome) >= 0 ? '🔔 Voltar a mandar mensagem automática' : '🔕 Não mandar mensagem automática')]);
      wmPor(lista, it, its);
    }, n ? 60 : 30);
  }
  function wmMenu() {
    var lbs = ['Responder', 'Reply', 'Copiar', 'Copy', 'Encaminhar', 'Forward', 'Dados da mensagem', 'Message info', 'Reagir', 'React', 'Fixar', 'Pin', 'Favoritar', 'Star', 'Apagar', 'Delete', 'Editar', 'Edit']; // 4.78 - menu das SUAS mensagens também
    var els = document.querySelectorAll('li, [role="menuitem"], [role="button"], div[tabindex]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i]; if (el.closest('#pfwa-painel, #pfwa-menu, #pfwa-rail, #pfwa-bots') || el.closest('#pane-side, [data-pre-plain-text], .message-in, .message-out, footer')) continue; // 4.66 - o menu pode estar dentro do #main; só fica fora o que é mensagem/lista
      var t = String(el.innerText || '').trim(); if (lbs.indexOf(t) < 0) continue;
      var r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
      return el;
    }
    return null;
  }
  function wmProcurar(n) {
    setTimeout(function () {
      if (Date.now() - wmT > 2500) return; var it = wmMenu(); if (!it) { if (n < 15) wmProcurar(n + 1); return; }
      var lista = it.parentElement; if (!lista || lista.querySelector('.pfwa-wm')) return; wmPor(lista, it);
    }, n ? 60 : 30);
  }
  var WM_ICO = { msg_conh: 'nota', msg_cotar: 'cot', msg_pedm: 'ped', img_ia: 'cot', doc_ia: 'cot', img_iamin: 'min', doc_iamin: 'min', img_ped: 'ped', doc_ped: 'ped', img_plaq: 'plaq', msg_mc: 'mc', msg_pc: 'pc', img_pc: 'pc', doc_pc: 'pc',
    msg_leitor: 'leitor', msg_jb: 'leitor', msg_qk: 'curta', msg_avise: 'avise', msg_nota: 'nota', msg_lemb: 'lemb', cv_mat: 'mat', msg_rr: 'prontas', msg_mapa: 'mapa',
    __sub: 'pf', cv_pend: 'pend', cv_pendok: 'ok', cv_ped: 'ped', cv_pedok: 'ok', cv_ficha: 'ficha', cv_nunca: 'nunca' }; // 7.1
  function wmItemHtml(x) { var k = WM_ICO[x[0]], t = esc(String(x[1]).replace(/ \(PF\)$/, ''));
    if (!k || ICO_EST === 'emoji') return t;
    t = t.replace(/^[^A-Za-z0-9À-ÿ"“]+\s*/, '');
    return '<span style="display:inline-flex;align-items:center;gap:10px"><span class="pfwa-wmico">' + icoHtml(k, '', ICO_EST) + '</span>' + t + '</span>'; }
  function wmPor(lista, modelo, fixos) {
    var itens = [];
    if (fixos) itens = fixos; else { // 4.91 - menu da conversa (lista) manda os itens prontos
    var forn = resp && resp.tipo === 'fornecedor', bt = ((resp && resp.botoes) || []).some(function (x) { return x && x.acao === 'respForn'; });
    if (forn || bt) itens.push(['msg_mapa', '📥 Lançar no mapa (PF)']);
    // 4.66 - A pedido do Vitor ("imagem, eu consigo tbm já mandar para a cotação?"): foto = ler com IA e cotar
    var imgSrc = '';
    try { imgSrc = fotoMelhor((cmAlvo || {}).b); } catch (e) { }
    if (imgSrc) itens.push(['img_iamin', '⬇ Ler a foto e criar a cotação minimizada (PF)', imgSrc]); // 5.6
    if (imgSrc) itens.push(['img_ped', '🧾 Ler como pedido de compra (PF)', imgSrc]); // 8.0
    if (imgSrc) itens.push(['img_plaq', '🏷️ Mandar a plaqueta pra Máquinas (PF)', imgSrc]); // 4.91
    // 4.74 - A pedido do Vitor ("não consegui mandar o PDF pra já ler e fazer a cotação no PF"): mensagem com PDF = ler o PDF com IA e cotar
    var docNome = '';
    try { var tb = String((cmAlvo && cmAlvo.b && cmAlvo.b.innerText) || ''), md = tb.match(/([^\n]+?\.pdf)\b/i); if (md) docNome = md[1].trim(); else if (/\bPDF\b\s*[•·]/.test(tb)) docNome = '?'; } catch (e) { }
    if (docNome) itens.push(['doc_ped', '🧾 Ler como pedido de compra (PF)', docNome === '?' ? '' : docNome]); // 8.0
    if (docNome) itens.push(['doc_iamin', '⬇ Ler o PDF e criar a cotação minimizada (PF)', docNome === '?' ? '' : docNome]); // 5.6
    // 7.9 - A pedido do Vitor ("esse cotar no pf faz exatamente o que?" → "pode ser"): mensagem com foto/PDF = o próprio 📄 Cotar no PF lê o arquivo com IA
    // (o item separado "Ler a foto/PDF com IA e cotar" saiu); só texto = lê os códigos sem IA, como antes.
    if (imgSrc) itens.push(['img_ia', '📄 Cotar no PF (lê a foto com IA)', imgSrc]); else if (docNome) itens.push(['doc_ia', '📄 Cotar no PF (lê o PDF com IA)', docNome === '?' ? '' : docNome]); else itens.push(['msg_cotar', '📄 Cotar no PF']);
    // 10.3 - A pedido do Vitor (print do "manda pra mim por favor" + foto da cotação: "algo para eu marcar que é pedido, caso o PF não leia, e eu esquecer de emitir… pra ir lá na coluna")
    itens.push(['msg_pedm', '📦 É pedido — anotar pra emitir (PF)', imgSrc ? '📷 foto' : (docNome ? '📎 ' + (docNome === '?' ? 'PDF' : docNome) : '')]);
    itens.push(['msg_mc', '🔗 Monta com (PF)']); // 4.92
    itens.push(['msg_pc', '💲 Preço do concorrente (PF)']); // 4.93
    if (imgSrc) itens.push(['img_pc', '💲 Cotação do concorrente (ler a foto) (PF)', imgSrc]);
    if (docNome) itens.push(['doc_pc', '💲 Cotação do concorrente (ler o PDF) (PF)', docNome === '?' ? '' : docNome]);
    itens.push(['msg_jb', '📋 Copiar pro JBoss (regras do Leitor)']); // 9.7
    itens.push(['msg_leitor', '📝 Mandar pro Leitor de Peças (PF)']); // 4.85
    // 4.86 - A pedido do Vitor ("cadê o sem cadastro"): cada resposta curta direto no menu (NEGATIVO / SEM CADASTRO / ZEROU…), sem abrir a janelinha
    qkPal.forEach(function (w) { itens.push(['msg_qk', '🏷️ ' + w, w]); });
    itens.push(['msg_avise', '🔔 Avise-me (PF)']);
    if (resp && resp.k) { itens.push(['msg_nota', '📝 Anotar na ficha (PF)']); itens.push(['msg_lemb', '⏰ Lembrete (PF)']); itens.push(['cv_mat', '📎 O que já mandei pra ele (PF)']); itens.push(['msg_conh', '📨 Mandar o link "Conhecer você" (PF)']); }
    itens.push(['msg_rr', '⚡ Salvar como resposta rápida (PF)']);
    }
    var sep = document.createElement('div'); sep.className = 'pfwa-wm'; sep.style.cssText = 'height:1px;background:rgba(127,127,127,.25);margin:4px 10px';
    lista.appendChild(sep);
    // 6.7 - A pedido do Vitor ("to procurando a função de responder a msg, mas está ficando escondido lá em cima"): no menu da MENSAGEM só ficam
    // "📄 Cotar no PF" e "🧩 PartsFlow ›" — o resto abre ao lado (submenu), o menu do WhatsApp não cresce e o Responder fica à vista.
    var sub = null;
    if (!fixos && itens.length > 2) { var _pri = function (x) { return x[0] === 'msg_cotar' || x[0] === 'img_ia' || x[0] === 'doc_ia' || x[0] === 'msg_pedm'; }; sub = itens.filter(function (x) { return !_pri(x); }); itens = itens.filter(_pri); itens.push(['__sub', '🧩 PartsFlow ›']); }
    itens.forEach(function (x) {
      var li = modelo.cloneNode(true); li.classList.add('pfwa-wm'); li.removeAttribute('aria-label'); li.removeAttribute('data-testid');
      li.innerHTML = ''; li.style.cssText = (li.style.cssText || '') + ';display:flex;align-items:center;cursor:pointer';
      var sp = document.createElement('span'); if (WM_ICO[x[0]] && ICO_EST !== 'emoji') sp.innerHTML = wmItemHtml(x); else sp.textContent = x[1]; sp.style.cssText = 'padding:9px 16px;font-size:14.5px;white-space:nowrap;display:block;width:100%';
      li.appendChild(sp);
      li.addEventListener('mouseenter', function () { li.style.background = 'rgba(127,127,127,.12)'; });
      li.addEventListener('mouseleave', function () { li.style.background = ''; });
      if (x[0] === '__sub') {
        var abreSub = function (ev) { if (ev) { ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); } wmSubAbrir(li, lista, sub); };
        li.addEventListener('mouseenter', function () { wmSubAbrir(li, lista, sub); });
        li.addEventListener('mousedown', function (ev) { ev.stopPropagation(); }, true);
        li.addEventListener('click', abreSub, true); lista.appendChild(li); return;
      }
      var vai = function (ev) { ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
        try { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true })); } catch (e) { }
        try { var ap = lista.closest('[role="application"]') || lista; if (document.body.contains(ap)) ap.style.display = 'none'; } catch (e) { }
        cmExec(x[0], '', x[2] || '').catch(function (e) { console.warn('PF menu', e); }); };
      li.addEventListener('mousedown', function (ev) { ev.stopPropagation(); }, true);
      li.addEventListener('click', vai, true);
      lista.appendChild(li);
    });
  }
  // 6.7 - submenu "🧩 PartsFlow ›" do menu da mensagem (abre ao lado do menu do WhatsApp; fecha no Esc, clicando fora ou quando o menu some)
  var WS = null, wsLista = null;
  function wmSubFechar() { if (WS) WS.style.display = 'none'; wsLista = null; }
  function wmSubAbrir(li, lista, its) {
    if (!WS) { WS = document.createElement('div'); WS.id = 'pfwa-wmsub'; document.body.appendChild(WS);
      WS.style.cssText = 'position:fixed;z-index:100000;display:none;min-width:240px;max-height:80vh;overflow:auto;padding:6px 0;border-radius:10px;box-shadow:0 6px 24px rgba(0,0,0,.28);font-family:inherit';
      WS.addEventListener('mousedown', function (ev) { ev.stopPropagation(); }, true);
      document.addEventListener('mousedown', function (ev) { if (WS.style.display === 'block' && !WS.contains(ev.target)) wmSubFechar(); }, true);
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && WS.style.display === 'block') wmSubFechar(); }, true);
      setInterval(function () { if (WS.style.display === 'block' && wsLista && !document.body.contains(wsLista) && !WS.matches(':hover')) wmSubFechar(); }, 300);
    }
    if (wsLista === lista && WS.style.display === 'block') return; wsLista = lista;
    var cs = getComputedStyle(lista.closest('[role="application"]') || lista), bg = cs.backgroundColor, cor = getComputedStyle(li).color;
    // 7.7 - A pedido do Vitor ("normal não dar para ler?"): no tema escuro o fundo saía branco com a letra clara. Fundo pela cor da letra do menu.
    var _rgb = (cor.match(/\d+(\.\d+)?/g) || [0, 0, 0]).map(Number), _clara = (_rgb[0] * 299 + _rgb[1] * 587 + _rgb[2] * 114) / 1000 > 140;
    bg = _clara ? '#233138' : '#ffffff'; cor = _clara ? '#e9edef' : '#111b21';
    WS.style.background = bg; WS.style.color = cor; WS.innerHTML = '';
    its.forEach(function (x) {
      var d = document.createElement('div'); d.innerHTML = wmItemHtml(x); d.style.cssText = 'padding:9px 16px;font-size:14.5px;white-space:nowrap;cursor:pointer';
      d.addEventListener('mouseenter', function () { d.style.background = 'rgba(127,127,127,.14)'; });
      d.addEventListener('mouseleave', function () { d.style.background = ''; });
      d.addEventListener('click', function (ev) { ev.preventDefault(); ev.stopPropagation(); wmSubFechar();
        try { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true })); } catch (e) { }
        try { var ap = lista.closest('[role="application"]') || lista; if (document.body.contains(ap)) ap.style.display = 'none'; } catch (e) { }
        cmExec(x[0], '', x[2] || '').catch(function (e) { console.warn('PF menu', e); }); });
      WS.appendChild(d);
    });
    WS.style.display = 'block'; WS.style.visibility = 'hidden';
    var r = li.getBoundingClientRect(), m = (lista.closest('[role="application"]') || lista).getBoundingClientRect(), w = WS.offsetWidth, h = WS.offsetHeight;
    var x = m.right + 4; if (x + w > innerWidth - 8) x = Math.max(8, m.left - w - 4);
    var y = Math.min(r.top - 6, innerHeight - h - 8); if (y < 8) y = 8;
    WS.style.left = x + 'px'; WS.style.top = y + 'px'; WS.style.visibility = '';
  }
  // 6.8 - A pedido do Vitor ("qual melhor maneira de eu consultar se já mandei o portfólio para esse cliente e quando?"): botão direito na conversa
  // (ou na mensagem) → 📎 O que já mandei pra ele = lista dos materiais (portfólio, catálogo, tabela…) mandados, com a data — os mesmos do 💡 Já ofereci.
  var MM = null;
  async function matMandadosAbrir(nome) {
    nome = String(nome || '').replace(/^[^|]*\|/, '');
    if (!MM) { MM = document.createElement('div'); MM.id = 'pfwa-mm'; document.body.appendChild(MM);
      MM.style.cssText = 'position:fixed;right:24px;top:90px;z-index:2147483500;width:380px;max-height:70vh;overflow:auto;background:#fff;color:#1a2332;border-radius:12px;box-shadow:0 10px 34px rgba(0,0,0,.3);font:13px Inter,Segoe UI,sans-serif';
      MM.addEventListener('click', function (e) { if (e.target.closest('[data-mm="x"]')) MM.style.display = 'none'; });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && MM.style.display === 'block') { e.stopPropagation(); MM.style.display = 'none'; } }, true); }
    var cab = '<div style="display:flex;align-items:center;gap:8px;padding:11px 14px;background:#1c2940;color:#fff;border-radius:12px 12px 0 0;position:sticky;top:0"><div style="flex:1"><b>📎 O que já mandei pra ele</b><div style="font-size:11.5px;opacity:.8">' + esc(nome || '') + '</div></div><span data-mm="x" title="Fechar (Esc)" style="cursor:pointer;font-size:18px;line-height:1">✕</span></div>';
    MM.style.display = 'block'; MM.innerHTML = cab + '<div style="padding:14px;color:#667">Procurando no PF…</div>';
    var r = await msg({ t: 'acao', acao: 'matMandados', arg: { nome: nome || '', k: (resp && resp.k) || '' } });
    if (!r || r.ok === false) { MM.innerHTML = cab + '<div style="padding:14px;color:#667">' + esc((r && r.msg) || naoDeu()) + '</div>'; return; }
    var L = r.itens || [];
    var corpo = L.length ? L.map(function (x) {
      return '<div style="padding:9px 14px;border-top:1px solid #eef1f5"><div style="font-weight:700">' + esc(x.nome) + '</div><div style="font-size:12px;color:#556;margin-top:2px">' + esc(x.data) + ' · ' + esc(x.quando) + (x.por ? ' · ' + esc(x.por) : '') + '</div>' + (x.resp ? '<div style="font-size:12px;color:' + (x.cor || '#556') + ';margin-top:2px">' + esc(x.resp) + (x.resumo ? ' — ' + esc(x.resumo) : '') + '</div>' : '') + '</div>';
    }).join('') : '<div style="padding:14px;color:#667">Nenhum material registrado pra ' + esc(r.cliente || 'esse cliente') + '.<div style="font-size:12px;margin-top:6px">Só conta o que foi mandado depois da extensão 4.77 (portfólio, catálogo, tabela…). Antes disso, procure na lupa da conversa por "portf".</div></div>';
    MM.innerHTML = cab + (r.cliente ? '<div style="padding:8px 14px;font-size:12px;color:#556;background:#f6f8fb">🤝 ' + esc(r.cliente) + '</div>' : '') + corpo;
  }
  // ═══ 9.3 - 📒 CRM NO WHATSAPP (A pedido do Vitor: "não colocou o que foi pro CRM… as coisas relevantes que foram pro CRM dos clientes" → prévia
  // docs/referencias/crm-whatsapp/ → "vamos na sua sugestão" + "pra eu mostrar pro pessoal" + "faz uma varredura… desde o início" + "e se eu mudar uma frase, sobe também?") ═══
  // 1A 📒 Foi pra ficha (aba Cliente) · 1B botão 📒 na coluna = relatório Hoje/7/30/Tudo · 🔄 Varrer as conversas antigas (motor) — pode rodar de novo, não duplica.
  function crmFichaHtml(r) {
    var c = r && r.crm; if (!c) return '';
    var L = c.l || [];
    var h = '<div class="pfwa-bloco pfwa-crmf"><div class="pfwa-bt">📒 Foi pra ficha <small style="font-weight:600;color:#8a9ab0">· últimos 30 dias' + (c.n30 ? ' · ' + c.n30 : '') + '</small></div>';
    if (!L.length) h += '<div class="pfwa-nada">Nada anotado na ficha nos últimos 30 dias.</div>';
    h += L.slice(0, 8).map(crmLinhaHtml).join('');
    h += '<div class="pfwa-bots" style="margin-top:6px"><button data-acao="b-ficha">Abrir a ficha completa no PF ›</button><button data-acao="crmHoje">📒 Relatório</button></div></div>';
    return h;
  }
  function crmQuando(ts) { var d = new Date(ts), h0 = new Date(); h0.setHours(0, 0, 0, 0); var hm = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    if (ts >= h0.getTime()) return 'hoje ' + hm; if (ts >= h0.getTime() - 864e5) return 'ontem ' + hm; return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + ' ' + hm; }
  function crmLinhaHtml(x, cli) {
    return '<div class="pfwa-crml' + (x.ok ? ' ok' : '') + '"><span class="pfwa-crmi">' + esc(x.ic) + '</span><div style="flex:1;min-width:0"><b>' + esc(x.t) + '</b>' + (x.ok ? ' <small class="pfwa-crmok">✔ feito</small>' : '') +
      '<small class="pfwa-crmq">' + esc(crmQuando(x.ts)) + (cli && x.cli ? ' · ' + (x.k ? '<span class="pfwa-crmcli" data-crm="ficha" data-v="' + esc(x.k) + '" title="Abrir a ficha deste cliente no CRM do PF">' + esc(x.cli) + ' ›</span>' : esc(x.cli)) : '') + (x.por ? ' · ' + esc(x.por) : '') + '</small>' + (x.d ? '<div class="pfwa-crmd">' + esc(x.d) + '</div>' : '') + '</div>' +
      (x.desf ? '<button class="pfwa-crmx" data-acao="crmDesf" data-arg="' + esc(x.desf) + '" title="Não era isso — tira da ficha e dos lembretes">desfazer</button>' : '') + '</div>';
  }
  async function crmDesf(b, ch) {
    b.disabled = true; b.textContent = '…';
    var r = await msg({ t: 'acao', acao: 'crmDesfazer', arg: { ch: ch } });
    if (!r || !r.ok) { b.disabled = false; b.textContent = 'desfazer'; flash(b, naoDeu()); return; }
    var lin = b.closest('.pfwa-crml'); if (lin) lin.remove();
    try { if (resp && resp.crm && resp.crm.l) resp.crm.l = resp.crm.l.filter(function (x) { return x.desf !== ch; }); } catch (e) { }
    try { Object.keys(AN).forEach(function (k) { AN[k] = (AN[k] || []).filter(function (a) { return !a.r || ch.indexOf(a.r.id) < 0; }); }); anGrava(); } catch (e) { }
  }
  // 1B 📒 relatório (botão da coluna)
  var CRMP = null, crmPer = 'hoje', crmTodos = false, crmFil = '';
  function crmEl() {
    if (!CRMP) { CRMP = document.createElement('div'); CRMP.id = 'pfwa-crmp'; document.body.appendChild(CRMP);
      CRMP.addEventListener('click', function (e) { var b = e.target.closest('[data-crm]'); if (b) { var a = b.getAttribute('data-crm'), v = b.getAttribute('data-v') || '';
          if (a === 'x') { CRMP.style.display = 'none'; return; } if (a === 'per') { crmPer = v; crmFil = ''; crmHojeAbrir(); return; } if (a === 'todos') { crmTodos = !crmTodos; crmHojeAbrir(); return; }
          if (a === 'fil') { crmFil = crmFil === v ? '' : v; crmHojePinta(); return; } if (a === 'cfg') { msg({ t: 'acao', acao: 'extCfgAbrir', focar: true }); return; } if (a === 'ficha') { msg({ t: 'acao', acao: 'ficha', arg: v, focar: true }); return; } if (a === 'fichaAtual') { if (resp && resp.k) msg({ t: 'acao', acao: 'ficha', arg: resp.k, focar: true }); return; } /* 10.6 - atalho pra ficha no CRM do PF */ if (a === 'varrer') { CRMP.style.display = 'none'; crmVarrerAbrir(); return; } if (a === 'apr') { msg({ t: 'acao', acao: 'aprAbrir', focar: true }); return; } }
        clique(e); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && CRMP && CRMP.style.display === 'block') { e.stopPropagation(); CRMP.style.display = 'none'; } }, true); }
    return CRMP;
  }
  var crmR = null;
  async function crmHojeAbrir() {
    var el = crmEl(); el.style.display = 'block';
    el.innerHTML = crmCab() + '<div class="pfwa-crmv">Procurando no PF…</div>';
    var r = await msg({ t: 'acao', acao: 'crmHoje', arg: { per: crmPer, todos: crmTodos } });
    if (!r || r.erro || !r.l) { el.innerHTML = crmCab() + '<div class="pfwa-crmv">' + esc(naoDeu()) + '</div>'; return; }
    crmR = r; crmHojePinta();
  }
  function crmCab() {
    var per = [['hoje', 'Hoje'], ['7', '7 dias'], ['30', '30 dias'], ['tudo', 'Tudo']];
    return '<div class="pfwa-crmc"><div style="flex:1"><b>📒 O que foi pro CRM</b><small>anotado sozinho pelas conversas do WhatsApp</small></div><span data-crm="x" class="pfwa-crmxx" title="Fechar (Esc)">✕</span></div>' +
      '<div class="pfwa-crmper">' + per.map(function (p) { return '<span data-crm="per" data-v="' + p[0] + '" class="' + (crmPer === p[0] ? 'on' : '') + '">' + p[1] + '</span>'; }).join('') +
      '<label data-crm="todos" style="margin-left:auto"><input type="checkbox" ' + (crmTodos ? 'checked' : '') + ' style="pointer-events:none"> da equipe toda</label></div>';
  }
  function crmHojePinta() {
    var el = crmEl(), r = crmR; if (!r) return;
    var cont = r.cont || {}, ics = Object.keys(cont).sort(function (a, b) { return cont[b] - cont[a]; });
    var nomes = { '📦': 'pedidos a emitir', '📌': 'vou verificar', '📨': 'promessas de mandar', '💡': 'ofertas', '📎': 'materiais', '💬': 'conversas/respostas', '⏰': 'próximas ações', '📝': 'notas', '📞': 'contatos', '✉️': 'e-mails' };
    var h = crmCab() + '<div class="pfwa-crmres"><div class="pfwa-crmbig"><b>' + r.n + '</b> anotações · <b>' + r.nCli + '</b> clientes</div><div class="pfwa-crmchips">' +
      ics.map(function (ic) { return '<span data-crm="fil" data-v="' + esc(ic) + '" class="' + (crmFil === ic ? 'on' : '') + '" title="' + esc(nomes[ic] || '') + '">' + esc(ic) + ' ' + cont[ic] + ' <small>' + esc(nomes[ic] || '') + '</small></span>'; }).join('') + '</div></div>';
    var L = (r.l || []).filter(function (x) { return !crmFil || x.ic === crmFil; });
    h += L.length ? '<div class="pfwa-crmlst">' + L.map(function (x) { return crmLinhaHtml(x, true); }).join('') + (r.n > (r.l || []).length ? '<div class="pfwa-crmv">mostrando as ' + r.l.length + ' mais novas</div>' : '') + '</div>'
      : '<div class="pfwa-crmv">Nada nesse período' + (crmTodos ? '' : ' (só as suas — marque "da equipe toda")') + '.</div>';
    if (resp && resp.k && resp.tipo === 'cliente') h += '<div class="pfwa-crmft" style="border-top:0;padding-bottom:0"><span data-crm="fichaAtual">🤝 Abrir a ficha ' + (resp.titulo ? 'de ' + esc(resp.titulo) : 'deste cliente') + ' no CRM do PF ›</span></div>'; // 10.6
    h += '<div class="pfwa-crmft"><span data-crm="cfg">⚙️ O que vai pro CRM ›</span><span data-crm="varrer">🔄 Varrer as conversas antigas ›</span><span data-crm="apr">🧠 O que aprendi ›</span></div>';
    el.innerHTML = h;
  }
  // 🔄 Varredura das conversas antigas (pelo motor; grava como histórico, com a data da mensagem — pode rodar de novo, não duplica)
  var crmVarRodando = false, crmVarParar = false;
  function crmVarrerAbrir() { config = true; try { abrirPainel(); pinta(); } catch (e) { } setTimeout(function () { var b = P && P.querySelector('[data-acao="crmVarrer"]'); if (b) crmVarrer(b); }, 300); }
  async function crmVarrer(b) {
    var st = tarefaEl();
    if (crmVarRodando) { crmVarParar = true; b.textContent = 'Parando…'; return; }
    if (!(motorOk || await motorChecar())) { st.textContent = '⚠ A varredura precisa do ⚙️ motor ligado (ele lê o histórico sem abrir as conversas).'; return; }
    if (!confirm('🔄 Varrer as conversas antigas\n\nA extensão lê as últimas mensagens de cada conversa e põe na ficha dos clientes, com a data certa, o que não tinha entrado (pedido a emitir, vou verificar, promessa de mandar, materiais mandados).\n\nVai como HISTÓRICO: não cria lembrete nem pendência. Pode rodar de novo depois de mudar as frases — o que já entrou não duplica.\n\nComeçar?')) return;
    crmVarRodando = true; crmVarParar = false; b.textContent = '⏸ Parar';
    var tot = { n: 0, cli: {}, tipos: {}, conv: 0, ign: 0, err: 0 };
    try {
      progSet(st, '🔄 Lendo as conversas…', 0, 0);
      var r = await motor('recentes', { desde: Date.now() - 400 * 864e5 }, 180000);
      var lista = (r && Array.isArray(r.l)) ? r.l : [];
      if (!lista.length) { st.textContent = '⚠ Não achei conversas pelo motor (' + ((r && r.erro) || 'vazio') + ').'; crmVarRodando = false; b.textContent = '🔄 Varrer as conversas antigas'; return; }
      for (var i = 0; i < lista.length && !crmVarParar; i++) {
        var c = lista[i];
        progSet(st, '🔄 Varrendo as conversas', i, lista.length, tot.n + ' anotações em ' + Object.keys(tot.cli).length + ' clientes');
        var m = await motor('msgs', { id: c.id, n: 150 }, 30000);
        if (!m || m.erro || !Array.isArray(m.l)) { tot.err++; continue; }
        var ms = m.l.filter(function (x) { return x && (x.txt || x.arq); }).map(function (x) { return { eu: !!x.eu, t: x.t, txt: String(x.txt || '').slice(0, 600), arq: x.eu && /document/.test(x.tipo || '') ? (x.arq || '') : '' }; });
        if (!ms.length) continue;
        var g = await msg({ t: 'acao', acao: 'crmVarrer', arg: { nome: c.nome || '', tel: c.tel || '', msgs: ms } });
        if (g && g.erro) { st.textContent = g.erro === 'semPF' ? '⚠ Abra o PF numa aba deste Chrome e rode de novo' : '⚠ Dê F5 na aba do PartsFlow (versão nova) e rode de novo'; crmVarRodando = false; b.textContent = '🔄 Varrer as conversas antigas'; return; }
        if (!g || g.pulou) { tot.ign++; continue; }
        tot.conv++; if (g.n) { tot.n += g.n; tot.cli[g.k] = g.cli || g.k; Object.keys(g.tipos || {}).forEach(function (t) { tot.tipos[t] = (tot.tipos[t] || 0) + g.tipos[t]; }); }
        await dormir(120);
      }
    } catch (e) { tot.err++; }
    crmVarRodando = false; b.textContent = '🔄 Varrer as conversas antigas';
    var nm = { emit: '📦 pedidos a emitir', wa: '📌 vou verificar', prom: '📨 promessas/pedidos de material', mat: '📎 materiais mandados' };
    st.innerHTML = '<div class="pfwa-prog"><div class="pfwa-progt"><b>' + (crmVarParar ? '⏸ Parado' : '✔ Varredura pronta') + '</b></div>' +
      '<div class="pfwa-progs" style="line-height:1.5"><b>' + tot.n + '</b> anotações novas em <b>' + Object.keys(tot.cli).length + '</b> clientes · ' + tot.conv + ' conversas de cliente lidas' + (tot.ign ? ' · ' + tot.ign + ' não são clientes do PF' : '') + (tot.err ? ' · ' + tot.err + ' com erro' : '') +
      (Object.keys(tot.tipos).length ? '<br>' + Object.keys(tot.tipos).map(function (t) { return (nm[t] || t) + ': ' + tot.tipos[t]; }).join(' · ') : '') +
      '<br><small>Foi como histórico, com a data da mensagem. Mudou as frases no ⚙️ O que vai pro CRM? É só rodar de novo.</small></div></div>' +
      '<div class="pfwa-cfgbtns" style="margin-top:6px"><button class="pfwa-cfgb" data-acao="crmHoje">📒 Ver o relatório</button></div>';
  }
  // ═══ 4.92 - 🔗 MONTA COM ═══ (A pedido do Vitor: "dá pra bolar um monta c/ aqui… que vou selecionando"; prévia docs/referencias/whatsapp-montacom/previa.png):
  // botão direito no código (ou na mensagem) → janelinha com as peças que montam com ele, por tipo, Spicer na frente; vai marcando (marca e qtd) e manda
  // pra cotação de hoje, pra caixa da conversa (você confere e envia) ou copia.
  var MC = null, mcR = null, mcSel = {};
  function mcEl() { if (!MC) { MC = document.createElement('div'); MC.id = 'pfwa-mc'; document.body.appendChild(MC); MC.addEventListener('click', mcClique); MC.addEventListener('change', mcMuda); MC.addEventListener('input', mcMuda);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && MC && MC.style.display === 'block') { e.stopPropagation(); e.preventDefault(); MC.style.display = 'none'; } }, true); } return MC; }
  var MC_CAB = '<div class="mc-cab"><div>🔗 Monta com<small>peças que montam com o código selecionado</small></div><span class="mc-x" data-mc="x" title="Fechar (Esc)">✕</span></div>';
  async function mcAbrir(t) {
    t = String(t || '').trim(); var el = mcEl(); el.style.display = 'block';
    if (!t) { el.innerHTML = MC_CAB + '<div class="mc-dica">Selecione o código na mensagem e clique com o botão direito → 🔗 Monta com.</div>'; return; }
    el.innerHTML = MC_CAB + '<div class="mc-dica">Procurando no PF…</div>'; mcSel = {}; mcR = null;
    var r = await msg({ t: 'acao', acao: 'montaCom', arg: { texto: t, k: resp && resp.k } });
    if (!r || r.erro) { el.innerHTML = MC_CAB + '<div class="mc-dica">O PF não respondeu — dê F5 na aba do PartsFlow.</div>'; return; }
    if (r.ok === false) { el.innerHTML = MC_CAB + '<div class="mc-dica">' + esc(r.msg || 'Não achei código') + '</div>'; return; }
    mcR = r; mcPinta();
  }
  function mcLinhas() { var L = []; ((mcR && mcR.grupos) || []).forEach(function (g, gi) { g.itens.forEach(function (x, ii) { L.push({ k: gi + ':' + ii, x: x, g: g }); }); }); return L; }
  function mcPinta() {
    var el = mcEl(), r = mcR; if (!r) return;
    var h = MC_CAB + '<div class="mc-pc">' + r.base.map(function (b, i) {
      var sd = b.saldo == null ? '<i class="z">não está no estoque</i>' : b.saldo > 0 ? '<i class="s">saldo ' + esc(b.saldo) + '</i>' : '<i class="z">sem saldo</i>';
      return '<div><b>' + esc(b.cod) + '</b>' + (b.desc ? ' · ' + esc(b.desc) : '') + (b.marca ? ' ' + esc(b.marca) : '') + ' ' + sd +
        (b.saldo != null ? ' <label class="mc-inc"><input type="checkbox" data-mcb="' + i + '"' + (mcSel['b' + i] ? ' checked' : '') + '> incluir também</label>' : '') + '</div>'; }).join('') + '</div>';
    if (!r.n) h += '<div class="mc-dica">Nenhuma peça cadastrada monta com ' + esc(r.base.map(function (b) { return b.cod; }).join(', ')) + ' nos Componentes Cardan.</div>';
    (r.grupos || []).forEach(function (g, gi) {
      h += '<div class="mc-fam">' + esc(String(g.fam).toUpperCase()) + ' (' + g.itens.length + ')</div>';
      g.itens.forEach(function (x, ii) {
        var k = gi + ':' + ii, s = mcSel[k], mi = s ? s.m : x.esc;
        var sel = x.marcas.length ? '<select data-mcm="' + k + '">' + x.marcas.map(function (m, j) { return '<option value="' + j + '"' + (j === mi ? ' selected' : '') + '>' + esc((m.marca || '—') + ' · ' + m.saldo + (m.cod !== x.cod ? ' (' + m.cod + ')' : '')) + '</option>'; }).join('') + '</select>' : '<i class="z">sem cadastro</i>';
        var m0 = x.marcas[mi], sdz = m0 && m0.saldo <= 0;
        h += '<label class="mc-it' + (s ? ' sel' : '') + '"><input type="checkbox" data-mck="' + k + '"' + (s ? ' checked' : '') + '><b>' + esc(x.cod) + '</b><span class="d">' + esc(x.desc + (x.outros && x.outros.length ? ' · também ' + x.outros.join(', ') : '')) + '</span>' + sel +
          (sdz ? '<i class="z">sem saldo</i>' : '') + '<input class="mc-q" type="number" min="1" data-mcq="' + k + '" value="' + esc(s ? s.q : 1) + '"></label>';
      });
    });
    var nSel = Object.keys(mcSel).length, nPc = 0; Object.keys(mcSel).forEach(function (k) { nPc += +mcSel[k].q || 1; });
    h += '<div class="mc-ft"><span>' + (nSel ? nSel + ' marcada' + (nSel > 1 ? 's' : '') + ' · ' + nPc + ' peça' + (nPc > 1 ? 's' : '') : 'Marque as peças que quer') + ' · marca = a que tem saldo (Spicer primeiro), dá pra trocar</span>' +
      '<button class="v" data-mc="cot"' + (nSel ? '' : ' disabled') + '>➕ Pôr na cotação de hoje</button><button data-mc="conv"' + (nSel ? '' : ' disabled') + '>💬 Pôr na conversa</button><button data-mc="cop"' + (nSel ? '' : ' disabled') + '>📋 Copiar</button></div>';
    var sc = el.querySelector('.mc-corpo'), top = sc ? sc.scrollTop : 0;
    el.innerHTML = h.replace(MC_CAB, MC_CAB + '<div class="mc-corpo">').replace('<div class="mc-ft">', '</div><div class="mc-ft">');
    var sc2 = el.querySelector('.mc-corpo'); if (sc2) sc2.scrollTop = top;
  }
  function mcMuda(e) {
    var t = e.target, k;
    if ((k = t.getAttribute('data-mck')) != null) { if (t.checked) { var x = mcLinhas().find(function (l) { return l.k === k; }); mcSel[k] = { m: x ? x.x.esc : 0, q: 1 }; } else delete mcSel[k]; mcPinta(); return; }
    if ((k = t.getAttribute('data-mcb')) != null) { if (t.checked) mcSel['b' + k] = { q: 1, base: 1 }; else delete mcSel['b' + k]; mcPinta(); return; }
    if ((k = t.getAttribute('data-mcm')) != null) { mcSel[k] = mcSel[k] || { q: 1 }; mcSel[k].m = +t.value; mcPinta(); return; }
    if ((k = t.getAttribute('data-mcq')) != null && e.type === 'change') { var q = Math.max(1, parseInt(t.value) || 1); if (!mcSel[k]) { var x2 = mcLinhas().find(function (l) { return l.k === k; }); mcSel[k] = { m: x2 ? x2.x.esc : 0 }; } mcSel[k].q = q; mcPinta(); }
  }
  function mcEscolhidos() {
    var out = [];
    Object.keys(mcSel).forEach(function (k) { var s = mcSel[k];
      if (s.base) { var b = mcR.base[+k.slice(1)]; if (b) out.push({ cod: b.cod, qtd: s.q || 1, marca: b.marca || '', desc: b.desc || '' }); return; }
      var l = mcLinhas().find(function (z) { return z.k === k; }); if (!l) return; var m = l.x.marcas[s.m] || null;
      out.push({ cod: m ? m.cod : l.x.cod, qtd: s.q || 1, marca: m ? m.marca : '', desc: l.x.desc || '' }); });
    return out;
  }
  function mcClique(e) {
    var el = e.target.closest('[data-mc]'); if (!el || el.disabled) return; e.preventDefault(); e.stopPropagation();
    var a = el.getAttribute('data-mc');
    if (a === 'x') { MC.style.display = 'none'; return; }
    var L = mcEscolhidos(); if (!L.length) return;
    var txt = L.map(function (x) { return (x.qtd > 1 ? x.qtd + ' - ' : '') + x.cod + (x.desc ? ' - ' + x.desc : '') + (x.marca ? ' - ' + x.marca : ''); }).join('\n');
    if (a === 'cot') { cotHoje('', L.map(function (x) { return { cod: x.cod, qtd: x.qtd, marca: x.marca }; })); el.textContent = '✔ Mandei pro PF'; return; }
    if (a === 'conv') { if (escreverNaCaixa(txt)) { MC.style.display = 'none'; cmToast('💬 Escrevi na caixa — confira e envie'); } else cmToast('Abra uma conversa primeiro'); return; }
    if (a === 'cop') { try { navigator.clipboard.writeText(txt); el.textContent = '✓ Copiado'; setTimeout(function () { el.textContent = '📋 Copiar'; }, 1500); } catch (er) { } return; }
  }
  // 🔎 Alt+B: cartão da peça dentro do WhatsApp
  var AB = null, abR = null;
  function abEl() { if (!AB) { AB = document.createElement('div'); AB.id = 'pfwa-ab'; document.body.appendChild(AB); AB.addEventListener('click', abClique); } return AB; }
  document.addEventListener('keydown', function (e) {
    if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyB') { e.preventDefault(); e.stopPropagation(); abAbrir(String(window.getSelection() || '').trim()); return; }
    if (e.key === 'Escape' && AB && AB.style.display === 'block') { AB.style.display = 'none'; e.stopPropagation(); }
  }, true);
  var AB_CAB = '<div class="ab-cab"><b>🔎 PartsFlow</b><span class="ab-x" data-ab="x" title="Fechar (Esc)">✕</span></div>';
  async function abAbrir(texto) {
    var el = abEl(); el.style.display = 'block';
    if (!texto) {
      el.innerHTML = AB_CAB + '<div class="ab-q"><input class="ab-in" placeholder="Código da peça (ex.: 5-515X)"><button data-ab="buscar">🔎</button></div><div class="ab-dica">Dica: selecione o código na mensagem e aperte <b>Alt+B</b> (ou botão direito → 🧩 PartsFlow → Ver no PF).</div>';
      var i = el.querySelector('.ab-in'); i.focus(); i.onkeydown = function (ev) { if (ev.key === 'Enter') abAbrir(i.value.trim()); ev.stopPropagation(); }; return;
    }
    el.innerHTML = AB_CAB + '<div class="ab-car">Procurando no PF…</div>';
    var r = await msg({ t: 'acao', acao: 'altb', arg: { texto: texto, k: resp && resp.k } });
    abR = r; abPinta(texto);
  }
  function abPinta(texto) {
    var el = abEl(), r = abR;
    if (!r || r.erro) { el.innerHTML = AB_CAB + '<div class="ab-car">' + (r && r.erro === 'semPF' ? 'Abra o PartsFlow numa aba deste Chrome.' : 'O PF não respondeu. Dê F5 na aba do PartsFlow.') + '</div>'; return; }
    if (!Array.isArray(r.itens)) { el.innerHTML = AB_CAB + '<div class="ab-car">' + esc(r.msg || 'O PF respondeu, mas não entendeu o pedido — a aba do PartsFlow está numa versão antiga.') + ' Dê F5 na aba do PartsFlow e tente de novo.</div>'; return; } // 4.53
    // 4.68 - A pedido do Vitor ("tudo que tiver no Alt+B do PF quero que tenha na extensão"): máquinas, componentes e códigos parecidos também
    var ex = r.extras || {}, nEx = (ex.maqs || []).length + (ex.comps || []).length;
    var itens = r.itens.filter(function (x) { return nEx === 0 || (x.marcas && x.marcas.length) || x.cc || (x.mc && x.mc.length) || (x.parec && x.parec.length); });
    if (!itens.length && !nEx) { el.innerHTML = AB_CAB + '<div class="ab-car">Não achei código em "' + esc(String(texto || '').slice(0, 60)) + '".</div>'; return; }
    var exH = '';
    if ((ex.maqs || []).length) exH += '<div class="ab-mct">🚜 Máquinas (' + ex.maqs.length + ')</div>' + ex.maqs.map(function (m) { return '<div class="ab-mc" data-ab="maq" data-c="' + esc(m.chave) + '" title="Abrir a máquina no PF"><b>' + (m.rod ? '🚚 ' : '🚜 ') + esc(m.nome) + '</b><span>' + esc(m.sub || '') + '</span><i class="s">abrir ›</i></div>'; }).join('');
    if ((ex.comps || []).length) exH += '<div class="ab-mct">⚙️ Componentes (' + ex.comps.length + ')</div>' + ex.comps.map(function (c) { return '<div class="ab-mc" data-ab="' + (c.gk ? 'serie' : 'maq') + '" data-c="' + esc(c.gk || c.maq) + '" title="' + (c.gk ? 'Ver as peças dessa série no PF' : 'Abrir a máquina no PF') + '"><b>' + esc(c.tit) + '</b><span>' + esc(c.sub || '') + '</span><i class="s">' + (c.gk ? 'ver peças ›' : 'abrir ›') + '</i></div>'; }).join('');
    el.innerHTML = AB_CAB + '<div class="ab-corpo">' + (exH ? '<div class="ab-it">' + exH + '</div>' : '') + itens.map(function (x, i) {
      i = r.itens.indexOf(x);
      var tem = x.marcas && x.marcas.length;
      var h = '<div class="ab-it"><div class="ab-cod"><b>' + esc(x.cod) + '</b>' + (x.qtd > 1 ? ' <span class="ab-q2">× ' + esc(x.qtd) + '</span>' : '') + '<span class="ab-cp" data-ab="copiar" data-c="' + esc(x.cod) + '" title="Copiar o código">📋</span>' +
        (x.codCli ? ' <small>(achado por ' + esc(x.codCli) + ')</small>' : '') + '</div>' +
        (x.desc ? '<div class="ab-desc">' + esc(x.desc) + '</div>' : '') +
        (tem ? x.marcas.map(function (m) { return '<div class="ab-mar ' + (m.saldo > 0 ? 'ok' : 'zero') + '"><span>' + esc(m.marca || '—') + '</span><span>' + (m.saldo > 0 ? 'saldo ' + esc(m.saldo) : 'sem saldo') + '</span><b>' + (m.preco ? reais(m.preco) : '') + '</b></div>'; }).join('')
          : '<div class="ab-nada">' + (x.cc ? 'Não está no estoque — está no catálogo dos Componentes Cardan.' : (x.parec && x.parec.length ? 'Nenhum código igual — achei estes parecidos:' : 'Não achei no PF.')) + '</div>');
      if (!tem && x.parec && x.parec.length) h += x.parec.map(function (p) { return '<div class="ab-mc" data-ab="par" data-c="' + esc(p.cod) + '" title="Ver esse código"><b>' + esc(p.cod) + '</b><span>' + esc([p.marca, p.desc, p.de].filter(Boolean).join(' · ')) + '</span><i class="s">ver ›</i></div>'; }).join('');
      if (x.cc) h += '<div class="ab-cc">🔩 Componentes Cardan · ' + esc(x.cc.fam) + (x.cc.cod && x.cc.cod !== x.cod ? ' · ' + esc(x.cc.cod) : '') + '</div>';
      if (x.mc && x.mc.length) h += '<div class="ab-mct">🔗 Monta com (' + esc(x.nMc) + ')</div>' + x.mc.map(function (m) {
        return '<div class="ab-mc" data-ab="mc" data-f="' + esc(m.famK) + '" data-c="' + esc(m.cod) + '" title="Abrir no catálogo"><b>' + esc(m.cod) + '</b><span>' + esc(m.fam) + (m.outros && m.outros.length ? ' · também ' + esc(m.outros.join(', ')) : '') + '</span>' +
          (m.saldo == null ? '<i class="z">sem cadastro</i>' : m.saldo > 0 ? '<i class="s">saldo ' + esc(m.saldo) + '</i>' : '<i class="z">sem saldo</i>') + '</div>'; }).join('');
      if (x.mc && x.mc.length) h += '<div class="ab-bts"><button data-ab="mcsel" data-c="' + esc(x.cod) + '">🔗 Marcar peças do Monta com ›</button></div>'; // 4.92
      h += '<div class="ab-bts"><button class="v" data-ab="cot" data-i="' + i + '">➕ Pôr na cotação</button><button data-ab="pf" data-c="' + esc(x.cod) + '">Abrir no PF ›</button>' +
        (x.cc || (x.mc && x.mc.length) ? '<button data-ab="cat" data-c="' + esc(x.cod) + '">🔩 Catálogo</button>' : '') + '</div></div>';
      return h;
    }).join('') + '</div>';
  }
  function abClique(e) {
    var el = e.target.closest('[data-ab]'); if (!el) return; e.preventDefault(); e.stopPropagation();
    var a = el.getAttribute('data-ab'), c = el.getAttribute('data-c') || '';
    if (a === 'x') { AB.style.display = 'none'; return; }
    if (a === 'buscar') { var i = AB.querySelector('.ab-in'); abAbrir(i ? i.value.trim() : ''); return; }
    if (a === 'copiar') { try { navigator.clipboard.writeText(c.replace(/\s+/g, '')); el.textContent = '✓'; setTimeout(function () { el.textContent = '📋'; }, 1500); } catch (er) { } return; }
    if (a === 'cot') { var x = abR && abR.itens && abR.itens[+el.getAttribute('data-i')]; if (!x) return; var m0 = (x.marcas || []).find(function (m) { return m.saldo > 0; }) || (x.marcas || [])[0];
      cotHoje('', [{ cod: x.cod, qtd: x.qtd || 1, marca: m0 ? m0.marca : '', marcaPed: x.marcaPed || '', codCli: x.codCli || '' }]); el.textContent = '✔ Mandei pro PF'; return; }
    if (a === 'pf') { msg({ t: 'acao', acao: 'altbPF', focar: true, arg: { cod: c } }); return; }
    if (a === 'cat') { msg({ t: 'acao', acao: 'ccAbrir', focar: true, arg: { cod: c } }); return; }
    if (a === 'mc') { msg({ t: 'acao', acao: 'ccAbrirFam', focar: true, arg: { fam: el.getAttribute('data-f'), cod: c } }); return; }
    if (a === 'maq') { msg({ t: 'acao', acao: 'altbMaq', focar: true, arg: { chave: c } }); return; }
    if (a === 'serie') { msg({ t: 'acao', acao: 'altbSerie', focar: true, arg: { gk: c } }); return; }
    if (a === 'par') { abAbrir(c); return; }
    if (a === 'mcsel') { AB.style.display = 'none'; mcAbrir(c); return; } // 4.92
  }
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
  function autoTestHtml() {
    var R = autoTestR; if (!R) return '';
    if (R.carregando) return '<div class="au-testr">⏳ testando…</div>';
    var h = '<div class="au-testr">';
    if (R.erro) h += '<div class="au-tx bad">⚠️ erro: ' + esc(R.erro) + '</div>';
    else if (R.ok) h += '<div class="au-tx ok"><b>✅ Mandou a mensagem de teste pra ' + esc(R.nome) + '!</b> Se não apareceu na conversa, me avise.</div>';
    else h += '<div class="au-tx bad"><b>❌ Não mandou.</b> Olha o que está barrando:</div>';
    (R.diag || []).forEach(function (d) {
      var ic = d.ok === null ? '➖' : (d.ok ? '✅' : '⛔');
      h += '<div class="au-tl ' + (d.ok === false ? 'bad' : '') + '">' + ic + ' <b>' + esc(d.t) + '</b>' + (d.d ? ' <span>— ' + esc(d.d) + '</span>' : '') + '</div>';
    });
    return h + '</div>';
  }
  function autoGrpHtml() {
    var gm = AUTO.grpModo || 'todos', sel = AUTO.grpSel || [], nomes = svGruposTodos().map(function (g) { return g[1]; });
    Object.keys(sitCache).forEach(function (k) { audGruposDe(sitCache[k]).forEach(function (g) { if (nomes.indexOf(g) < 0) nomes.push(g); }); });
    sel.forEach(function (g) { if (nomes.indexOf(g) < 0) nomes.push(g); });
    var cor = {}; svGruposTodos().forEach(function (g) { cor[g[1]] = g[2]; });
    return '<div class="au-fr"><small><b>👥 GRUPOS</b> — escolha pra quais grupos vai a mensagem automática (vale pra saudação, status e avisos). Bom pra testar: crie o grupo "Triex", marque o pessoal da Triex no 👤 Salvar contato e deixe "Só estes grupos".</small>' +
      '<div class="au-modos au-est"><span data-acao="autoGrpModo" data-arg="todos" class="' + (gm === 'todos' ? 'on' : '') + '">Todos</span><span data-acao="autoGrpModo" data-arg="so" class="' + (gm === 'so' ? 'on' : '') + '">✅ Só estes grupos</span><span data-acao="autoGrpModo" data-arg="menos" class="' + (gm === 'menos' ? 'on' : '') + '">🚫 Menos estes grupos</span></div>' +
      (gm !== 'todos' ? '<div class="au-modos">' + nomes.map(function (g) { return '<span data-acao="autoGrp" data-arg="' + esc(g) + '" class="' + (sel.indexOf(g) >= 0 ? 'on' : '') + '"><i style="display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:4px;background:' + esc(cor[g] || '#7A869A') + '"></i>' + esc(g) + '</span>'; }).join('') + '</div>' +
        (!sel.length ? '<small style="color:#b26a00">Marque pelo menos um grupo (sem nenhum marcado vale "Todos").</small>' : (gm === 'so' ? '<small>"Só estes grupos" manda mesmo pra quem não é cliente do PF (ex.: o pessoal da Triex).</small>' : '')) : '') + '</div>';
  }
  function htmlAuto() {
    var A = AUTO, inp = 'class="au-in"', aus = (autoAusente(), (AUTO.modo && AUTO.modo !== 'normal') ? AUTO.modo : ''), nomeEx = contatoAt ? contatoAt.nome : 'Carlos - Trackpeças';
    var ex = function (f) { var l = []; for (var i = 0; i < 3; i++) { var t = f(); if (l.indexOf(t) < 0) l.push(t); } return l.map(function (t) { return '<div class="au-exl">“' + esc(t) + '”</div>'; }).join(''); };
    var h = '<div class="pfwa-ajtop"><b>👋 Mensagens automáticas</b><span class="pfwa-link" data-acao="autoVoltar">‹ voltar</span></div>';
    h += motorSeloHtml(); // 4.58
    h += htmlAss(); // 9.2 - 🤖 assistente
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
    h += autoAvisosHtml(nomeEx, ex); // 4.47 - ⏰ avisos programados
    // 👋 Saudação de espera
    h += '<div class="au-sec"><div class="pfwa-cfgl" data-acao="autoTog" data-arg="on"><span class="pfwa-cfgi">👋</span><div><b>Saudação de espera</b><br><small>Quando você está disponível mas o cliente fica X minutos sem resposta, manda uma mensagem como se fosse você.</small></div><span class="pfwa-sw' + (A.on ? ' on' : '') + '"><i></i></span></div>' +
      '<div class="au-g"><label>Sem resposta há<input type="number" min="1" max="120" data-au="min" value="' + esc(A.min) + '" ' + inp + '> min</label>' +
      '<label>Das<input type="time" data-au="ini" value="' + esc(A.ini) + '" ' + inp + '> às<input type="time" data-au="fim" value="' + esc(A.fim) + '" ' + inp + '></label>' +
      '<label>Dias<select data-au="dias" ' + inp + '><option value="semana"' + (A.dias === 'semana' ? ' selected' : '') + '>segunda a sexta</option><option value="sabado"' + (A.dias === 'sabado' ? ' selected' : '') + '>segunda a sábado</option><option value="todos"' + (A.dias === 'todos' ? ' selected' : '') + '>todos os dias</option></select></label>' +
      '<label>Pra quem<select data-au="quem" ' + inp + '><option value="clientes"' + (A.quem === 'clientes' ? ' selected' : '') + '>só clientes do PF</option><option value="todos"' + (A.quem === 'todos' ? ' selected' : '') + '>todos (menos grupos)</option></select></label>' +
      '</div>' + autoGrpHtml() + '<div class="au-g">' +
      '<label>Não repetir na conversa por<input type="number" min="1" max="72" data-au="horas" value="' + esc(A.horas) + '" ' + inp + '> h</label>' +
      '<label>No máximo<input type="number" min="1" max="100" data-au="porHora" value="' + esc(A.porHora) + '" ' + inp + '> por hora</label></div>' +
      '<div class="au-modos au-est"><span data-acao="autoEstilo" data-arg="natural" class="' + (A.estilo !== 'minhas' ? 'on' : '') + '">✨ Natural (varia sozinho)</span><span data-acao="autoEstilo" data-arg="minhas" class="' + (A.estilo === 'minhas' ? 'on' : '') + '">✍️ Minhas frases</span></div>' +
      (A.estilo === 'minhas' ? '<div class="au-fr"><small>Uma por linha · a extensão sorteia · use {saudacao} e {nome}</small><textarea data-au="frases" rows="4">' + esc((A.frases || []).join('\n')) + '</textarea></div>'
        : '<div class="au-fr"><small>O PF lê o que o cliente mandou e responde de acordo: códigos → "já vou ver esses códigos", foto → "vi a foto", áudio → "vou ouvir aqui", preço → "já te passo o valor". Varia a saudação, às vezes sem nome, não repete a última, e espera uns segundos "digitando".</small></div>') +
      // 4.27 - chamar pelo nome / começar com saudação (vale pra "Minhas frases" sem precisar digitar {nome}/{saudacao})
      '<div class="pfwa-cfgl" data-acao="autoTogJeito"><span class="pfwa-cfgi">🪞</span><div><b>Imitar o meu jeito com cada cliente</b><br><small>Usa o apelido, o jeito de abrir e de fechar e o tom que VOCÊ usa com aquela pessoa (aprendido das suas mensagens).</small></div><span class="pfwa-sw' + (A.jeito !== false ? ' on' : '') + '"><i></i></span></div>' +
      '<div class="pfwa-cfgl" data-acao="autoTog" data-arg="chamarNome"><span class="pfwa-cfgi">👤</span><div><b>Chamar o cliente pelo nome</b><br><small>Põe o nome na frente quando dá pra saber. Você não precisa digitar {nome} nas frases.</small></div><span class="pfwa-sw' + (A.chamarNome !== false ? ' on' : '') + '"><i></i></span></div>' +
      '<div class="pfwa-cfgl" data-acao="autoTog" data-arg="saud1a"><span class="pfwa-cfgi">☀️</span><div><b>"Bom dia/Boa tarde" só na 1ª conversa do dia</b><br><small>Já falou com esse cliente hoje? A frase vai sem o "bom dia" ("João, só finalizando um processo aqui e já te chamo").</small></div><span class="pfwa-sw' + (A.saud1a !== false ? ' on' : '') + '"><i></i></span></div>' +
      '<div class="pfwa-cfgl" data-acao="autoTog" data-arg="comSaud"><span class="pfwa-cfgi">🕐</span><div><b>Começar com "Bom dia/Boa tarde"</b><br><small>Puxa a saudação da hora pra frente da sua frase.</small></div><span class="pfwa-sw' + (A.comSaud !== false ? ' on' : '') + '"><i></i></span></div>' +
      '<div class="au-ex">Vai sair algo assim:' + ex(function () { return autoTexto(nomeEx, { bloco: '5-280X\n2654407 2 de cada' }, ''); }) + '</div>' +
      autoTomHtml(nomeEx) + // 4.47 - 🎩 tom por intimidade
      // 4.27 - QUANDO MANDAR: sempre × só na 1ª vez do dia
      '<div class="au-modos au-est"><span data-acao="autoQuando" data-arg="sempre" class="' + (A.quando !== 'primeira' ? 'on' : '') + '">🔁 Sempre que eu não responder</span><span data-acao="autoQuando" data-arg="primeira" class="' + (A.quando === 'primeira' ? 'on' : '') + '">📩 Só na 1ª vez do dia</span></div>' +
      '<div class="au-st" style="margin-top:4px">📩 = se você já falou com esse cliente hoje, a saudação não é mandada de novo.</div>' +
      // 4.27 - deixar a conversa como não lida depois do automático
      '<div class="pfwa-cfgl" data-acao="autoTog" data-arg="naoLida"><span class="pfwa-cfgi">🔵</span><div><b>Deixar a conversa como NÃO LIDA depois</b><br><small>Depois de responder sozinho, marca a conversa como não lida — ela sobe na lista com a bolinha verde pra você lembrar de dar o retorno de verdade.</small></div><span class="pfwa-sw' + (A.naoLida !== false ? ' on' : '') + '"><i></i></span></div>' +
      '<div class="pfwa-cfgl" data-acao="autoTog" data-arg="trava30"><span class="pfwa-cfgi">✋</span><div><b>Não mandar se eu escrevi nos últimos 30 min</b><br><small>Você estava conversando com ele há pouco = a extensão fica quieta.</small></div><span class="pfwa-sw' + (A.trava30 !== false ? ' on' : '') + '"><i></i></span></div>' +
      '<div class="pfwa-cfgl" data-acao="autoTog" data-arg="abrir"><span class="pfwa-cfgi">📂</span><div><b>Também nas outras conversas</b><br><small>Com o WhatsApp em outra tela/aba manda sozinho (pode levar até 1 min). Se você estiver conversando com outra pessoa, ela aproveita o 1º respiro (3 s sem digitar/clicar), abre a conversa que está esperando, manda e volta pra sua — o que você estava escrevendo fica guardado. Desligado = só na conversa aberta.</small></div><span class="pfwa-sw' + (A.abrir ? ' on' : '') + '"><i></i></span></div>' +
      // 4.34 - A pedido do Vitor: aviso claro quando está desligado (a saudação só vai pra conversa aberta)
      (!A.abrir ? '<div class="au-st" style="background:#FFF4E5;border:1px solid #F3C98B;color:#7a4a10">⚠️ Está <b>desligado</b>: a saudação só vai pra conversa que estiver <b>ABERTA</b>. Ligue acima pra mandar também pras outras conversas da lista (deixe o WhatsApp ~1 min parado).</div>' : '') +
      '<div class="au-st">' + (A.on ? (autoNoHorario() ? '🟢 Ligada e dentro do horário.' : '🟡 Ligada, mas fora do horário agora.') : '⚪ Desligada.') + ' A conversa que recebeu a mensagem ganha a etiqueta "👋 … responda" até você responder.</div>' +
      // 4.37 - 🧪 Testar na conversa aberta: diz por que não mandou e deixa forçar o envio pra ver funcionando
      '<div class="au-test"><button data-acao="autoTestar" class="au-testb">🧪 Testar na conversa aberta</button>' +
      '<small>Abra a conversa de um cliente e clique — eu digo exatamente o que está barrando e mando a mensagem de teste.</small>' + autoTestHtml() + '</div>' +
      (autoLogL.length ? '<div class="au-test"><b style="font-size:12px">📂 Outras conversas — o que aconteceu</b>' + autoLogL.slice().reverse().map(function (x) { return '<div class="au-tl"><span>' + new Date(x.h).toTimeString().slice(0, 5) + '</span> ' + esc(x.t) + '</div>'; }).join('') + '</div>' : '') + '</div>';
    var envs = Object.keys(autoPend).map(function (n) { return { n: n, ts: autoPend[n].ts, txt: autoPend[n].txt }; }).sort(function (a, b) { return b.ts - a.ts; }).slice(0, 5);
    if (envs.length) h += '<div class="pfwa-bloco"><div class="pfwa-bt">Esperando você responder</div>' + envs.map(function (e) { return '<div class="pfwa-it"><b>' + esc(e.n) + '</b><br><small>' + esc(new Date(e.ts).toLocaleString('pt-BR').slice(0, 17)) + ' · "' + esc(e.txt) + '"</small></div>'; }).join('') + '</div>';
    return h;
  }
  // 4.47 - ⏰ avisos programados (vários ao mesmo tempo)
  var AUTO_DIAS = [['semana', 'segunda a sexta'], ['sabado', 'segunda a sábado'], ['fds', 'sábado e domingo'], ['todos', 'todos os dias']];
  function autoAvisosHtml(nomeEx, ex) {
    var ag = autoAvisoAtual(), manual = AUTO.modo && AUTO.modo !== 'normal';
    var h = '<div class="au-sec"><b>⏰ Avisos programados</b><div class="au-st" style="margin:3px 0 6px">Ligam e desligam sozinhos no horário. Com dois valendo juntos, vale o de horário <b>mais curto</b> (o 🍽️ almoço passa na frente do 🌙 expediente). O status de cima (reunião, férias) passa na frente de todos. Cada conversa recebe UMA mensagem por período, até você responder.</div>';
    (AUTO.avisos || []).forEach(function (a, i) {
      var vale = ag && ag.id === a.id && !manual;
      h += '<div class="au-av' + (vale ? ' vale' : '') + (a.on ? '' : ' off') + '"><div class="au-avt"><input data-au="av.' + i + '.ic" value="' + esc(a.ic || '') + '" class="au-in au-avic"><input data-au="av.' + i + '.nome" value="' + esc(a.nome || '') + '" class="au-in au-avn">' +
        (vale ? '<span class="au-vale">valendo agora</span>' : '') + '<span class="pfwa-sw' + (a.on ? ' on' : '') + '" data-acao="autoAvTog" data-arg="' + i + '"><i></i></span></div>' +
        '<div class="au-g"><label>Dias<select data-au="av.' + i + '.dias" class="au-in">' + AUTO_DIAS.map(function (d) { return '<option value="' + d[0] + '"' + (a.dias === d[0] ? ' selected' : '') + '>' + d[1] + '</option>'; }).join('') + '</select></label>' +
        '<label>Das<input type="time" data-au="av.' + i + '.ini" value="' + esc(a.ini || '') + '" class="au-in"> às<input type="time" data-au="av.' + i + '.fim" value="' + esc(a.fim || '') + '" class="au-in"></label></div>' +
        '<div class="au-fr"><small>Mensagem (vazio = o PF varia sozinho · use {saudacao} {nome} {volta})</small><textarea data-au="av.' + i + '.txt" rows="2">' + esc(a.txt || '') + '</textarea></div>' +
        (a.on ? '<div class="au-ex">Vai sair algo assim:' + ex(function () { return autoTexto(nomeEx, null, 'av:' + a.id); }) + '</div>' : '') +
        '<span class="pfwa-link au-avdel" data-acao="autoAvDel" data-arg="' + i + '">🗑 apagar este aviso</span></div>';
    });
    return h + '<button class="pfwa-btn" data-acao="autoAvNovo">➕ Novo aviso</button></div>';
  }
  // 4.47 - 🎩 tom por intimidade
  function autoTomHtml(nomeEx) {
    var mi = AUTO.estilo === 'minhas', ft = AUTO.frasesTom || {};
    var exT = function (tom) { return '“' + esc(autoTexto(nomeEx, { bloco: 'oi, tem o 5-280X?' }, '', tom)) + '”'; };
    return '<div class="au-fr"><small><b>🎩 Tom por intimidade</b> — cada contato tem um grau (marque no 👤 Salvar contato ou com o botão direito na conversa). Sem marcar = Normal.</small>' +
      '<div class="au-tom"><b>🎩 Formal</b> ' + exT('formal') + '</div><div class="au-tom"><b>🙂 Normal</b> ' + exT('normal') + '</div><div class="au-tom"><b>🤝 Próximo</b> ' + exT('proximo') + '</div>' +
      (mi ? '<small>Suas frases pros contatos 🎩 formais (uma por linha · vazio = usa as de cima com o tom formal)</small><textarea data-au="frasesTom.formal" rows="2">' + esc((ft.formal || []).join('\n')) + '</textarea>' +
        '<small>Suas frases pros contatos 🤝 próximos</small><textarea data-au="frasesTom.proximo" rows="2">' + esc((ft.proximo || []).join('\n')) + '</textarea>' : '') + '</div>';
  }
  function autoCampo(el) {
    var k = el.getAttribute('data-au'), v = el.value;
    if (k === 'assQuem') { ASS.quem = v.split('\n').map(function (s) { return s.trim(); }).filter(Boolean); assCfgGravar(); return; }
    if (k === 'cmdQuem') { AUTO.cmdQuem = v.split('\n').map(function (s) { return s.trim(); }).filter(Boolean); autoGravar(); return; }
    if (k === 'cmdEu') { AUTO.cmdEu = !!el.checked; autoGravar(); return; }
    if (k.indexOf('av.') === 0) { var pp = k.split('.'), av = (AUTO.avisos || [])[+pp[1]]; if (av) av[pp[2]] = v; autoGravar(); try { autoStatusPill(); } catch (e) { } return; } // 4.47
    if (k.indexOf('frasesTom.') === 0) { AUTO.frasesTom = AUTO.frasesTom || {}; AUTO.frasesTom[k.slice(10)] = v.split('\n').map(function (s) { return s.trim(); }).filter(Boolean); autoGravar(); return; }
    if (k === 'frases') AUTO.frases = v.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
    else if (k.indexOf('ausTxt.') === 0) { AUTO.ausTxt = AUTO.ausTxt || {}; AUTO.ausTxt[k.slice(7)] = v.trim(); }
    else if (k === 'min' || k === 'horas' || k === 'porHora') AUTO[k] = Math.max(1, +v || AUTO_PADRAO[k]);
    else if (k === 'ausMin') AUTO[k] = Math.max(0, +v || 0);
    else AUTO[k] = v;
    autoGravar(); if (k === 'ate') try { autoStatusPill(); } catch (e) { }
  }
  document.addEventListener('change', function (e) { if (e.target && e.target.getAttribute && e.target.getAttribute('data-au')) autoCampo(e.target); }, true);
  // 4.41 - textos (frases, mensagens de ausência) gravam enquanto você digita — antes só ao sair do campo; atualizar a página no meio perdia
  var autoDigT = null;
  document.addEventListener('input', function (e) { var el = e.target; if (!el || el.tagName !== 'TEXTAREA' || !el.getAttribute || !el.getAttribute('data-au')) return; clearTimeout(autoDigT); autoDigT = setTimeout(function () { try { autoCampo(el); } catch (x) { } }, 700); }, true);

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
    var aus = autoAusente(), m = autoInfo(aus);
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
      if (!(await esperar(function () { var b = caixaTexto(); return b && (b.innerText || '').trim() ? 1 : null; }, 3000))) return;
      await dormir(500); enviarAgora();
      if (await esperar(function () { var b = caixaTexto(); return b && !(b.innerText || '').trim() ? 1 : null; }, 8000)) { x.ok = 1; cmdGravar(); }
      if (!aberta && antes) { var vt = linhaDoNome(antes); if (vt) clicar(vt); }
    } finally { autoOcup = false; }
  }
  setInterval(function () { cmdTick().catch(function (e) { console.warn('PF cmd', e); }); }, 8000);
  // 9.2 - 🤖 ASSISTENTE (pedido do Vitor, 27/11/2026: "um WhatsApp como se fosse meu assistente… a demanda chega pra mim, eu encaminho pra esse WhatsApp e
  // peço pra ele fazer, de repente uma cotação pro cliente tal… no futuro o cliente fala direto com ele"). Liga no WhatsApp DO ASSISTENTE (chip próprio, outro perfil
  // do Chrome com o PF aberto e logado). Mensagem de número AUTORIZADO → junta o que chegou em sequência (encaminhadas + sua instrução; espera ASS_QUIETO sem
  // mensagem nova), baixa fotos/PDFs, manda pro PF (acao "assistente": IA entende, acha o cliente, monta a cotação) e responde na MESMA conversa com o resumo + o PDF.
  // Tudo pelo ⚙️ motor (não abre conversa). Mensagem "pf …" continua sendo comando de status (📱 Mudar pelo WhatsApp).
  // a config fica SÓ neste navegador (não vai pro PF): o PF do assistente pode estar logado com o mesmo usuário do seu WhatsApp de sempre
  var ASS_QUIETO = 12000, assVisto = {}, assOcup = false, assLog = [], ASS = { on: false, quem: [] };
  chrome.storage.local.get(['assVisto', 'assLog', 'assCfg'], function (s) { assVisto = s.assVisto || {}; assLog = s.assLog || []; if (s.assCfg) ASS = s.assCfg; });
  function assCfgGravar() { chrome.storage.local.set({ assCfg: ASS }); }
  function assGravar() { chrome.storage.local.set({ assVisto: assVisto, assLog: assLog.slice(-30) }); }
  function assAutorizado(nome, tel) {
    var t = cmdNormTel(tel || '');
    return (ASS.quem || []).some(function (q) {
      q = String(q || '').trim(); if (!q) return false; var d = cmdNormTel(q);
      if (d.length >= 8) return t.length >= 8 && t.slice(-8) === d.slice(-8);
      return String(nome || '').trim().toLowerCase() === q.toLowerCase();
    });
  }
  async function assFazer(c, l) {
    var textos = [], midias = [];
    l.forEach(function (x) { if (x.txt) textos.push({ t: x.txt, fw: !!x.fw }); });
    var md = l.filter(function (x) { return /image|document/.test(x.tipo || ''); }).slice(0, 4);
    await motor('enviar', { id: c.id, texto: '⏳ Recebi! Já estou fazendo…' }, 20000);
    for (var j = 0; j < md.length; j++) { var b = await motor('midia', { id: md[j].id }, 40000); if (b && b.data) midias.push({ data: b.data, mime: b.mime || md[j].mime || '', nome: md[j].arq || b.nome || '', fw: !!md[j].fw }); }
    var R = await msg({ t: 'acao', acao: 'assistente', arg: { tel: c.tel, nome: c.nome, textos: textos, midias: midias } });
    var txt = R && R.texto ? R.texto : (R && R.msg ? '⚠️ ' + R.msg : (R && (R.erro === 'semPF' || R.erro === 'pfF5') ? '⚠️ O PartsFlow não está aberto (ou precisa de F5) no computador do assistente.' : '⚠️ Não consegui falar com o PF agora. Tenta de novo daqui a pouco.'));
    await motor('enviar', { id: c.id, texto: txt }, 30000);
    if (R && R.pdf && R.pdf.data) {
      var e2 = await motor('enviarArqPara', { id: c.id, data: R.pdf.data, mime: 'application/pdf', nome: R.pdf.nome || 'cotacao.pdf', legenda: R.pdf.legenda || '' }, 90000);
      if (e2 && e2.erro) await motor('enviar', { id: c.id, texto: '⚠️ Não consegui mandar o PDF (' + e2.erro + '). A cotação está no PF.' }, 20000);
    }
    assLog.push({ ts: Date.now(), de: c.nome, pedido: textos.map(function (t) { return t.t; }).join(' ').slice(0, 140) + (midias.length ? ' [' + midias.length + ' arquivo(s)]' : ''), resp: String(txt).split('\n')[0].slice(0, 160) }); assGravar();
    try { pinta(); } catch (e) { }
  }
  async function assTick() {
    if (!ASS.on || assOcup) return;
    if (!motorOk) { try { await motorChecar(); } catch (e) { } if (!motorOk) return; }
    assOcup = true;
    try {
      var r = await motor('recentes', { desde: Date.now() - 6 * 3600000 }, 20000); if (!r || !r.l) return;
      for (var i = 0; i < r.l.length; i++) {
        var c = r.l[i]; if (!assAutorizado(c.nome, c.tel)) continue;
        var vis = assVisto[c.id]; if (!vis) { vis = assVisto[c.id] = Date.now() - 300000; assGravar(); } // 1ª vez: só o que chegou nos últimos 5 min
        if ((c.t || 0) <= vis) continue;
        var m = await motor('msgs', { id: c.id, n: 40 }, 20000); if (!m || !m.l) continue;
        var novas = m.l.filter(function (x) { return !x.eu && x.t > vis; }); if (!novas.length) continue;
        var ult = Math.max.apply(null, novas.map(function (x) { return x.t; }));
        if (Date.now() - ult < ASS_QUIETO) continue; // ainda chegando (encaminhou várias de uma vez)
        assVisto[c.id] = ult; assGravar();
        var ped = novas.filter(function (x) { return !/^\s*pf\b/i.test(x.txt || ''); });
        if (ped.length) await assFazer(c, ped);
      }
    } finally { assOcup = false; }
  }
  setInterval(function () { assTick().catch(function (e) { console.warn('PF assistente', e); assOcup = false; }); }, 5000);
  function htmlAss() {
    var A = ASS, ult = assLog.slice(-4).reverse();
    return '<div class="au-sec"><div class="pfwa-cfgl" data-acao="assTog"><span class="pfwa-cfgi">🤖</span><div><b>Este WhatsApp é o ASSISTENTE</b><br><small>Ligue só no WhatsApp do assistente (chip próprio). Você encaminha a mensagem do cliente pra ele e escreve "cota pro Maximus" — ele monta a cotação no PF e te responde com o resumo e o PDF. Precisa do ⚙️ motor e do PF aberto e logado neste Chrome.</small></div><span class="pfwa-sw' + (A.on ? ' on' : '') + '"><i></i></span></div>' +
      (A.on ? '<div class="au-fr"><small>Quem pode pedir (número com DDD, um por linha). Mensagem de outro número é ignorada.</small><textarea data-au="assQuem" rows="2" placeholder="(11) 98888-7777">' + esc((A.quem || []).join('\n')) + '</textarea></div>' +
        (motorOk ? '' : '<div class="au-st" style="color:#b42318">⚠️ Motor desligado — o assistente não funciona sem ele.</div>') +
        '<div class="au-st">Exemplos: <b>cota pro Maximus</b> (encaminhando a lista/foto/PDF) · <b>cota pro 000183: 5-515X 2, 3-28-97 TX 1</b> · <b>saldo 5-515X</b> · <b>pdf da 131</b> · <b>ajuda</b></div>' +
        (ult.length ? '<div class="pfwa-bloco"><div class="pfwa-bt">Últimos pedidos</div>' + ult.map(function (u) { return '<div class="pfwa-it"><b>' + esc(u.pedido || '') + '</b> <small>' + esc(new Date(u.ts).toLocaleString('pt-BR').slice(0, 17)) + '</small><br><small>' + esc(u.resp || '') + '</small></div>'; }).join('') + '</div>' : '') : '') +
      '</div>';
  }
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
