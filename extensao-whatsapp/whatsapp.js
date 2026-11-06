// PartsFlow no WhatsApp — roda dentro do WhatsApp Web.
// 1) Envio da fila: quando o fundo.js abre uma conversa com a mensagem pronta, aperta "enviar" e confirma que saiu.
// 2) Painel do PF ao lado da conversa: pergunta pro PartsFlow quem é o contato e mostra a ficha.
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
    // a mensagem vem pela URL; se não veio, escreve
    var btn = await esperar(botaoEnviar, 3000);
    if (!btn) {
      var cx = caixaTexto(); if (!cx) return reporta(a, false, 'Não achei a caixa de mensagem');
      cx.focus(); document.execCommand('insertText', false, a.texto);
      btn = await esperar(botaoEnviar, 5000);
      if (!btn) return reporta(a, false, 'Não consegui escrever a mensagem');
    }
    await dormir(700 + Math.random() * 1100);
    btn = botaoEnviar() || btn; btn.click();
    var ok = await esperar(function () { var c = caixaTexto(); return c && !(c.innerText || '').trim() ? 1 : null; }, 12000);
    reporta(a, !!ok, ok ? '' : 'Não deu pra confirmar que saiu — confira a conversa');
  }
  function reporta(a, ok, erro, parar) { msg({ t: 'resultado', id: a.id, ok: ok, erro: erro || '', parar: !!parar }); }

  // ═══ 2) PAINEL DO PF ═══
  var P = null, ultimo = '', aberto = true, resp = null, statusLote = '';
  function montar() {
    if (P) return;
    P = document.createElement('div'); P.id = 'pfwa';
    P.innerHTML = '<div class="pfwa-aba" title="PartsFlow">PF</div><div class="pfwa-caixa"><div class="pfwa-cab"><b>PartsFlow</b><span class="pfwa-x" title="Recolher">›</span></div><div class="pfwa-lote"></div><div class="pfwa-corpo"></div></div>';
    document.body.appendChild(P);
    P.querySelector('.pfwa-aba').onclick = function () { aberto = !aberto; chrome.storage.local.set({ painelAberto: aberto }); pinta(); };
    P.querySelector('.pfwa-x').onclick = function () { aberto = false; chrome.storage.local.set({ painelAberto: false }); pinta(); };
    P.addEventListener('click', function (e) {
      var b = e.target.closest('[data-acao]'); if (!b) return;
      var ac = b.getAttribute('data-acao'), arg = b.getAttribute('data-arg') || '';
      if (ac === 'registrar') {
        var ta = P.querySelector('.pfwa-nota'); var t = ta ? ta.value.trim() : ''; if (!t) { if (ta) ta.focus(); return; }
        b.disabled = true; b.textContent = 'Gravando…';
        msg({ t: 'acao', acao: 'registrar', arg: { k: arg, texto: t } }).then(function (r) { b.disabled = false; b.textContent = r && r.ok ? '✔ Registrado na ficha' : 'Não deu — abra o PF'; if (r && r.ok && ta) ta.value = ''; });
        return;
      }
      if (ac === 'parar') { msg({ t: 'parar' }); return; }
      msg({ t: 'acao', acao: ac, arg: arg, focar: true });
    });
    chrome.storage.local.get(['painelAberto'], function (s) { if (s.painelAberto === false) aberto = false; pinta(); });
  }
  function pinta() {
    if (!P) return;
    P.classList.toggle('fechado', !aberto);
    document.documentElement.classList.toggle('pfwa-aberto', aberto);
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
  function cardHtml(r) {
    if (!r) return '<div class="pfwa-vazio">Procurando no PF…</div>';
    if (r.erro === 'semPF') return '<div class="pfwa-vazio">Abra o <b>PartsFlow</b> numa aba deste Chrome (já logado) pra ver quem é esse contato.</div>';
    if (r.erro === 'recarregar') return '<div class="pfwa-vazio">A extensão foi atualizada — aperte <b>F5</b> nesta aba.</div>';
    if (r.erro) return '<div class="pfwa-vazio">O PF não respondeu. Dê <b>F5</b> na aba do PartsFlow.</div>';
    if (r.grupo) return '<div class="pfwa-vazio">Conversa em grupo.</div>';
    if (!r.achou) return '<div class="pfwa-vazio">Esse contato <b>não está no PF</b>.<br><small>Procurei pelo telefone' + (r.nome ? ' e pelo nome' : '') + ' nos clientes e fornecedores.</small></div>';
    var h = '<div class="pfwa-tipo pfwa-' + esc(r.tipo) + '">' + (r.tipo === 'cliente' ? '🤝 Cliente' : '🏭 Fornecedor') + (r.pelo ? ' <small>· achado pelo ' + esc(r.pelo) + '</small>' : '') + '</div>';
    h += '<div class="pfwa-tit">' + esc(r.titulo) + '</div>';
    if (r.sub) h += '<div class="pfwa-sub">' + esc(r.sub) + '</div>';
    if (r.etqs && r.etqs.length) h += '<div class="pfwa-etqs">' + r.etqs.map(function (e) { return '<span style="background:' + esc(e.bg || '#eef2f7') + ';color:' + esc(e.cor || '#33404f') + '">' + esc(e.t) + '</span>'; }).join('') + '</div>';
    (r.linhas || []).forEach(function (l) { h += '<div class="pfwa-lin"><span>' + esc(l.ic) + '</span><div><b>' + esc(l.t) + '</b>' + (l.d ? '<br><small>' + esc(l.d) + '</small>' : '') + '</div></div>'; });
    (r.blocos || []).forEach(function (b) {
      h += '<div class="pfwa-bloco"><div class="pfwa-bt">' + esc(b.tit) + '</div>';
      if (!b.itens.length) h += '<div class="pfwa-nada">' + esc(b.vazio || 'nada') + '</div>';
      b.itens.forEach(function (x) { h += '<div class="pfwa-it' + (x.acao ? ' pfwa-cl' : '') + '"' + (x.acao ? ' data-acao="' + esc(x.acao) + '" data-arg="' + esc(x.arg) + '"' : '') + '><b>' + esc(x.t) + '</b>' + (x.d ? '<br><small>' + esc(x.d) + '</small>' : '') + '</div>'; });
      h += '</div>';
    });
    if (r.botoes && r.botoes.length) h += '<div class="pfwa-bots">' + r.botoes.map(function (b) { return '<button data-acao="' + esc(b.acao) + '" data-arg="' + esc(b.arg || '') + '">' + esc(b.rot) + '</button>'; }).join('') + '</div>';
    if (r.k) h += '<div class="pfwa-bloco"><div class="pfwa-bt">📝 Registrar na ficha do CRM</div><textarea class="pfwa-nota" placeholder="Ex.: pediu cotação do kit de vedação, retorno amanhã"></textarea><button class="pfwa-reg" data-acao="registrar" data-arg="' + esc(r.k) + '">Registrar</button></div>';
    return h;
  }
  function pintaCorpo() { if (!P) return; var c = P.querySelector('.pfwa-corpo'); if (c) c.innerHTML = cardHtml(resp); }
  async function vigiar() {
    montar();
    // fila de envio
    var s = await chrome.storage.local.get(['lote']); var L = s.lote, lt = '';
    if (L && !L.fim) { var n = L.itens.length, f = L.itens.filter(function (x) { return x.st === 'ok' || x.st === 'erro'; }).length; lt = '📤 Mandando ' + Math.min(f + 1, n) + ' de ' + n + (L.titulo ? ' · ' + L.titulo : '') + ' — não feche esta aba <button data-acao="parar">Parar</button>'; }
    if (lt !== statusLote) { statusLote = lt; var el = P.querySelector('.pfwa-lote'); el.innerHTML = lt; el.style.display = lt ? 'block' : 'none'; }
    // contato aberto
    var c = contatoAtual(); var chave = c ? (c.grupo ? 'g:' + c.nome : c.tel + '|' + c.nome) : '';
    if (chave === ultimo) return; ultimo = chave;
    if (!c) { resp = null; P.querySelector('.pfwa-corpo').innerHTML = '<div class="pfwa-vazio">Abra uma conversa pra ver o que o PF sabe desse contato.</div>'; return; }
    if (c.grupo) { resp = { grupo: 1 }; pintaCorpo(); return; }
    resp = null; pintaCorpo();
    var r = await msg({ t: 'quem', tel: c.tel, nome: c.nome });
    if (chave !== ultimo) return; resp = r || { erro: 'semPF' }; pintaCorpo();
  }

  processarEnvio();
  setInterval(function () { vigiar().catch(function () { }); }, 1500);
  // o PF mudou (ex.: registrou algo) → busca de novo
  chrome.storage.onChanged.addListener(function (ch) { if (ch.pfRefazer) ultimo = ''; });
})();
