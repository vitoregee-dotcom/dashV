// 10.7 - A pedido do Vitor ("site da CNH… pegar as fotos dos itens q tem lá… para irmos jogando no PF e ir alimentando"):
// na página da peça do mycnhstore.com (…/<loja>/cn/<nome>/p/<código>) aparece o botão "📷 Mandar pro PF". Um clique: pega o código (endereço),
// a descrição (título) e a foto GRANDE — que só aparece quando abre o ampliar, então a extensão clica no ampliar sozinha se precisar —
// e manda pro PF (acao fotoSite), que põe a foto na ficha do produto com esse código.
(function () {
  'use strict';
  if (window.__pfCnhOk) return; window.__pfCnhOk = 1;
  function msg(m) { return new Promise(function (res) { try { chrome.runtime.sendMessage(m, function (r) { void chrome.runtime.lastError; res(r || null); }); } catch (e) { res({ erro: 'recarregar' }); } }); }
  function esp(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function infoUrl() {
    var m = location.pathname.match(/\/([a-z]{2})\/([a-z]{2})\/([a-z0-9]+)\/[^/]+\/[^/]+\/p\/([^/?#]+)/i) || location.pathname.match(/\/p\/([^/?#]+)/i);
    if (!m) return null;
    return m.length > 2 ? { cod: decodeURIComponent(m[4]), loja: m[3] } : { cod: decodeURIComponent(m[1]), loja: '' };
  }
  function titulo() { var h = document.querySelector('h1'); return h ? h.textContent.replace(/\s+/g, ' ').trim() : ''; }
  function srcGrande(im) {
    var best = im.currentSrc || im.src, bw = 0;
    (im.srcset || '').split(',').forEach(function (p) { var q = p.trim().split(/\s+/); var w = parseInt(q[1]) || 0; if (q[0] && w > bw) { bw = w; best = q[0]; } });
    try { return new URL(best, location.href).href; } catch (e) { return best; }
  }
  function fotoNaTela() {
    var bom = null, ba = 0;
    Array.prototype.forEach.call(document.images, function (im) {
      if (!im.complete || im.closest('header') || im.closest('#pfcnh')) return;
      var r = im.getBoundingClientRect(), nw = im.naturalWidth || 0;
      if (nw < 300 || r.width < 120 || r.height < 120) return;
      if (/logo|icon|sprite|banner|placeholder|loading/i.test((im.src || '') + ' ' + (im.className || '') + ' ' + (im.alt || ''))) return;
      var a = nw * (im.naturalHeight || 0); if (a > ba) { ba = a; bom = im; }
    });
    return bom;
  }
  function botaoAmpliar() {
    var sels = ['[class*="expand" i]', '[class*="zoom" i]', '[class*="fullscreen" i]', '[class*="enlarge" i]', '[aria-label*="ampl" i]', '[aria-label*="expand" i]', '[aria-label*="zoom" i]', '[title*="ampl" i]'];
    for (var i = 0; i < sels.length; i++) {
      var l = document.querySelectorAll(sels[i]);
      for (var j = 0; j < l.length; j++) { var e = l[j], r = e.getBoundingClientRect(); if (r.width > 8 && r.width < 120 && r.top < innerHeight && r.bottom > 0 && !e.closest('#pfcnh')) return e.closest('button,a,[role="button"]') || e; }
    }
    // reserva: o ícone de setas no canto de cima-direita da área da foto (o 1º svg/ícone à direita do coração, na metade esquerda da tela)
    var cands = Array.prototype.filter.call(document.querySelectorAll('svg, i, img, span'), function (e) {
      var r = e.getBoundingClientRect(); return r.width >= 16 && r.width <= 60 && r.height <= 60 && r.top > 300 && r.top < 700 && r.left > innerWidth * 0.25 && r.left < innerWidth * 0.5 && !e.closest('#pfcnh');
    });
    cands.sort(function (a, b) { return b.getBoundingClientRect().left - a.getBoundingClientRect().left; });
    return cands[0] ? (cands[0].closest('button,a,[role="button"]') || cands[0]) : null;
  }
  async function pegarFoto() {
    var im = fotoNaTela(), abriu = false;
    if (!im) {
      var b = botaoAmpliar(); if (b) { abriu = true; b.click(); }
      for (var t = 0; t < 30 && !im; t++) { await esp(250); im = fotoNaTela(); }
    }
    if (!im) return null;
    var src = srcGrande(im), dados = '';
    try { var bl = await (await fetch(src, { credentials: 'include' })).blob(); if (/^image\//.test(bl.type)) dados = await new Promise(function (ok) { var r = new FileReader(); r.onload = function () { ok(r.result); }; r.onerror = function () { ok(''); }; r.readAsDataURL(bl); }); } catch (e) { }
    if (!dados) { try { var c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext('2d').drawImage(im, 0, 0); dados = c.toDataURL('image/jpeg', 0.9); } catch (e) { } }
    if (abriu) { try { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); var x = Array.prototype.find.call(document.querySelectorAll('button,[role="button"],span'), function (e) { return /^[×✕x]$/i.test((e.textContent || '').trim()) && e.getBoundingClientRect().width > 0; }); if (x) x.click(); } catch (e) { } }
    return { img: dados, url: dados ? '' : src };
  }
  var BOX = null;
  function caixa() {
    if (BOX && document.body.contains(BOX)) return BOX;
    BOX = document.createElement('div'); BOX.id = 'pfcnh';
    BOX.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:2147483600;background:#0F1F35;color:#fff;border-radius:12px;box-shadow:0 8px 28px rgba(0,0,0,.35);font:600 14px/1.35 Arial,sans-serif;padding:10px 12px;max-width:320px';
    document.body.appendChild(BOX); return BOX;
  }
  function bt(t, cor, fn) { var b = document.createElement('button'); b.textContent = t; b.style.cssText = 'margin:6px 6px 0 0;border:0;border-radius:8px;padding:8px 12px;font:700 13px Arial;cursor:pointer;background:' + (cor || '#E87722') + ';color:' + (cor === '#fff' ? '#1F4E79' : '#fff'); b.onclick = fn; return b; }
  function pinta(txt, botoes) { var B = caixa(); B.innerHTML = ''; var d = document.createElement('div'); d.innerHTML = txt; B.appendChild(d); (botoes || []).forEach(function (b) { B.appendChild(b); }); }
  function inicio() { var i = infoUrl(); if (!i) { if (BOX) BOX.remove(); BOX = null; return; } pinta('<span style="opacity:.8;font-size:12px">PartsFlow · ' + i.cod + '</span>', [bt('📷 Mandar pro PF', null, mandar)]); }
  var indo = false;
  async function mandar(modo) {
    if (indo) return; var i = infoUrl(); if (!i) return; indo = true;
    try {
      var base = { cod: i.cod, loja: i.loja, desc: titulo(), pagina: location.href };
      if (typeof modo !== 'string') {
        pinta('⏳ Conferindo a ficha ' + i.cod + ' no PF…');
        var r = await msg({ t: 'acao', acao: 'fotoSite', arg: base });
        if (!r || r.erro) { erro(r); return; }
        if (!r.n) { indo = false; pinta('O código <b>' + i.cod + '</b> ainda não tem ficha no PF.', [bt('➕ Criar a ficha com a foto', null, function () { mandar('criar'); }), bt('Cancelar', '#fff', inicio)]); return; }
        if (r.comFoto) { indo = false; pinta('A ficha <b>' + i.cod + '</b> já tem foto.', [bt('➕ Acrescentar esta', null, function () { mandar('add'); }), bt('🔄 Trocar a 1ª', '#1F4E79', function () { mandar('trocar'); }), bt('Cancelar', '#fff', inicio)]); return; }
        modo = 'add';
      }
      pinta('⏳ Pegando a foto…');
      var f = await pegarFoto();
      if (!f || (!f.img && !f.url)) { pinta('⚠ Não achei a foto nesta página. Abra o ampliar da foto e clique de novo.', [bt('📷 Tentar de novo', null, mandar)]); return; }
      pinta('⏳ Mandando pro PF…');
      var r2 = await msg({ t: 'acao', acao: 'fotoSite', arg: Object.assign(base, f, { modo: modo }) });
      if (!r2 || r2.erro || !r2.ok) { erro(r2); return; }
      pinta('✔ ' + (r2.criou ? 'Ficha ' + i.cod + ' criada com a foto' : 'Foto na ficha ' + i.cod + (r2.n > 1 ? ' (' + r2.n + ' fichas)' : '')), [bt('📷 Mandar de novo', '#fff', mandar)]);
    } finally { indo = false; }
  }
  function erro(r) {
    var e = r && r.erro, t = e === 'semPF' ? 'O PartsFlow não está aberto neste navegador — abra numa aba (e faça o login)' : e === 'pfF5' ? 'Dê F5 na aba do PartsFlow' : e === 'recarregar' ? 'A extensão foi atualizada — dê F5 nesta página' : ((r && r.msg) || 'Não deu — confira se o PartsFlow está aberto');
    pinta('⚠ ' + t, [bt('Tentar de novo', null, mandar)]);
  }
  var ultUrl = '';
  setInterval(function () { if (location.href !== ultUrl) { ultUrl = location.href; if (!indo) inicio(); } }, 800);
})();
