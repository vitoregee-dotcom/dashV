// PartsFlow no WhatsApp — ponte entre a aba do PartsFlow e a extensão.
// Roda dentro da página do PF: avisa o PF que a extensão existe, leva os pedidos de envio pro fundo.js
// e traz as perguntas do painel do WhatsApp ("quem é esse número?") pro PF responder.
(function () {
  'use strict';
  // 4.29 - não instala 2x na mesma aba (o fundo.js reinjeta quando o ping falha; com as 2 vivas cada pedido chegava em dobro no PF)
  if (window.__pfPonteOk) return; window.__pfPonteOk = true;
  var V = chrome.runtime.getManifest().version;
  var pend = {};
  document.documentElement.setAttribute('data-pf-ext', V);

  window.addEventListener('message', function (e) {
    if (e.source !== window || !e.data || !e.data.pfExt) return;
    var d = e.data;
    try {
      if (d.pfExt === 'souPF') chrome.runtime.sendMessage({ t: 'souPF' });
      else if (d.pfExt === 'lote') chrome.runtime.sendMessage({ t: 'lote', id: d.id, itens: d.itens, titulo: d.titulo || '', pausaSeg: d.pausaSeg || 0 });
      else if (d.pfExt === 'parar') chrome.runtime.sendMessage({ t: 'parar', id: d.id });
      else if (d.pfExt === 'status') chrome.runtime.sendMessage({ t: 'status', img: d.img, legenda: d.legenda || '', nome: d.nome || 'status.jpg' });
      else if (d.pfExt === 'res') { var cb = pend[d.rid]; if (cb) { delete pend[d.rid]; cb(d.r); } }
    } catch (err) { /* extensão recarregada: a página precisa de F5 */ }
  });

  // 4.52 - A pedido do Vitor ("pq está mandando eu instalar a extensão de novo?" — modo monitor 🖥️): no modo monitor o PF roda DENTRO de um quadro (iframe);
  // a ponte agora entra em todos os quadros (all_frames) e só o quadro que É o PF responde (a moldura de fora fica quieta).
  function souApp() { return document.documentElement.getAttribute('data-pf-app') === '1'; }
  chrome.runtime.onMessage.addListener(function (m, s, send) {
    if ((m.t === 'ping' || m.t === 'quem' || m.t === 'acao') && !souApp() && window.top !== window.self) return;
    if ((m.t === 'ping' || m.t === 'quem' || m.t === 'acao') && !souApp() && document.querySelector('#pfMonFrame')) return;
    if (m.t === 'ping') { send({ pf: document.documentElement.getAttribute('data-pf-app') === '1' }); return; }
    if (m.t === 'progresso') { window.postMessage({ pfExt: 'progresso', lote: m.lote }, '*'); return; }
    if (m.t === 'quem' || m.t === 'acao') {
      var rid = 'r' + Date.now() + Math.random().toString(36).slice(2, 7);
      pend[rid] = send;
      window.postMessage({ pfExt: 'req', rid: rid, m: m }, '*');
      var lim = (m.acao === 'resumir' || m.acao === 'cotarIA' || m.acao === 'cotarImg') ? 90000 : 10000; // 3.6 - a IA demora mais
      setTimeout(function () { if (pend[rid]) { delete pend[rid]; send({ erro: 'semResposta' }); } }, lim);
      return true;
    }
  });

  window.postMessage({ pfExt: 'ola', v: V }, '*');
})();
