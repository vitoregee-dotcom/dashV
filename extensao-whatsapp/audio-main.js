// 4.23 - A pedido do Vitor (print: "Não consegui carregar este áudio" — "ruim hein"): no WhatsApp Web de verdade o áudio toca num
// player que NÃO fica na página (new Audio()), então o whatsapp.js não achava o <audio>. Este arquivo roda no MUNDO DA PÁGINA
// (manifest "world": "MAIN") e avisa o whatsapp.js o endereço (blob:) de todo áudio que começa a tocar; e pausa quando pedido.
(function () {
  if (window.__pfwaAud) return; window.__pfwaAud = 1;
  var P = HTMLMediaElement.prototype, orig = P.play, ultimo = null;
  P.play = function () {
    try {
      if (this instanceof HTMLAudioElement || !(this instanceof HTMLVideoElement)) {
        ultimo = this; var s = this.currentSrc || this.src;
        if (s) document.dispatchEvent(new CustomEvent('pfwa-aud', { detail: String(s) }));
      }
    } catch (e) { }
    return orig.apply(this, arguments);
  };
  document.addEventListener('pfwa-aud-pausar', function () { try { if (ultimo) { ultimo.pause(); ultimo.currentTime = 0; } } catch (e) { } });
})();
