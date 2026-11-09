// PartsFlow no WhatsApp — ponte entre a aba do PartsFlow e a extensão.
// Roda dentro da página do PF: avisa o PF que a extensão existe, leva os pedidos de envio pro fundo.js
// e traz as perguntas do painel do WhatsApp ("quem é esse número?") pro PF responder.
(function () {
  'use strict';
  var V = chrome.runtime.getManifest().version;
  var pend = {};
  document.documentElement.setAttribute('data-pf-ext', V);

  window.addEventListener('message', function (e) {
    if (e.source !== window || !e.data || !e.data.pfExt) return;
    var d = e.data;
    try {
      if (d.pfExt === 'souPF') chrome.runtime.sendMessage({ t: 'souPF' });
      else if (d.pfExt === 'lote') chrome.runtime.sendMessage({ t: 'lote', id: d.id, itens: d.itens, titulo: d.titulo || '' });
      else if (d.pfExt === 'parar') chrome.runtime.sendMessage({ t: 'parar', id: d.id });
      else if (d.pfExt === 'status') chrome.runtime.sendMessage({ t: 'status', img: d.img, legenda: d.legenda || '', nome: d.nome || 'status.jpg' });
      else if (d.pfExt === 'res') { var cb = pend[d.rid]; if (cb) { delete pend[d.rid]; cb(d.r); } }
    } catch (err) { /* extensão recarregada: a página precisa de F5 */ }
  });

  chrome.runtime.onMessage.addListener(function (m, s, send) {
    if (m.t === 'ping') { send({ pf: document.documentElement.getAttribute('data-pf-app') === '1' }); return; }
    if (m.t === 'progresso') { window.postMessage({ pfExt: 'progresso', lote: m.lote }, '*'); return; }
    if (m.t === 'quem' || m.t === 'acao') {
      var rid = 'r' + Date.now() + Math.random().toString(36).slice(2, 7);
      pend[rid] = send;
      window.postMessage({ pfExt: 'req', rid: rid, m: m }, '*');
      setTimeout(function () { if (pend[rid]) { delete pend[rid]; send({ erro: 'semResposta' }); } }, 10000);
      return true;
    }
  });

  window.postMessage({ pfExt: 'ola', v: V }, '*');
})();
