// PartsFlow no WhatsApp — fundo (service worker).
// Guarda qual aba é o PF e qual é o WhatsApp Web, leva as perguntas do painel pro PF
// e manda a fila de mensagens uma por uma (abre a conversa, o whatsapp.js aperta enviar e confirma).
'use strict';
var PF_URLS = ['https://*.vercel.app/*', 'http://localhost/*', 'http://127.0.0.1/*'];
var PAUSA_MIN = 4000, PAUSA_MAX = 9000; // pausa entre uma mensagem e outra (parecer envio normal)

function guardar(o) { return chrome.storage.local.set(o); }
function ler(k) { return chrome.storage.local.get(k); }

async function tabExiste(id) { if (!id) return false; try { await chrome.tabs.get(id); return true; } catch (e) { return false; } }

// acha a aba do PartsFlow (a última que se apresentou, senão pergunta pra cada aba possível)
async function acharPF() {
  var s = await ler(['pfTab']);
  if (await tabExiste(s.pfTab)) return s.pfTab;
  var tabs = [];
  try { tabs = await chrome.tabs.query({ url: PF_URLS }); } catch (e) { }
  for (var i = 0; i < tabs.length; i++) {
    try { var r = await chrome.tabs.sendMessage(tabs[i].id, { t: 'ping' }); if (r && r.pf) { await guardar({ pfTab: tabs[i].id }); return tabs[i].id; } } catch (e) { }
  }
  return null;
}

async function acharWA() {
  var tabs = await chrome.tabs.query({ url: 'https://web.whatsapp.com/*' });
  if (tabs.length) return tabs[0].id;
  var t = await chrome.tabs.create({ url: 'https://web.whatsapp.com/', active: true });
  return t.id;
}

function urlConversa(tel, texto) {
  return 'https://web.whatsapp.com/send?phone=' + encodeURIComponent(tel) + '&text=' + encodeURIComponent(texto || '');
}

async function avisarPF(lote) {
  if (!lote || !lote.origem) return;
  try { await chrome.tabs.sendMessage(lote.origem, { t: 'progresso', lote: lote }); } catch (e) { }
}

async function enviarItem() {
  var s = await ler(['lote']); var L = s.lote;
  if (!L || L.fim || L.parado) return;
  var i = L.itens.findIndex(function (x) { return !x.st; });
  if (i < 0) { L.fim = Date.now(); await guardar({ lote: L, atual: null }); await avisarPF(L); return; }
  var it = L.itens[i];
  it.st = 'enviando'; L.i = i;
  var wa = await acharWA(); L.waTab = wa;
  await guardar({ lote: L, atual: { id: L.id + '|' + i, lote: L.id, i: i, tel: it.tel, texto: it.texto, inicio: Date.now() } });
  await avisarPF(L);
  chrome.alarms.create('pfVigia', { delayInMinutes: 1.5 });
  await chrome.tabs.update(wa, { url: urlConversa(it.tel, it.texto), active: true });
}

async function resultado(m) {
  var s = await ler(['lote', 'atual']); var L = s.lote, A = s.atual;
  if (!L || !A || A.id !== m.id) return;
  chrome.alarms.clear('pfVigia');
  var it = L.itens[A.i]; if (!it) return;
  it.st = m.ok ? 'ok' : 'erro'; it.erro = m.erro || ''; it.em = Date.now();
  if (m.parar) { L.parado = 'WhatsApp Web não está conectado'; L.itens.forEach(function (x) { if (!x.st) { x.st = 'erro'; x.erro = L.parado; } }); }
  await guardar({ lote: L, atual: null });
  await avisarPF(L);
  if (L.parado) { L.fim = Date.now(); await guardar({ lote: L }); await avisarPF(L); return; }
  setTimeout(enviarItem, PAUSA_MIN + Math.random() * (PAUSA_MAX - PAUSA_MIN));
}

chrome.alarms.onAlarm.addListener(async function (a) {
  if (a.name !== 'pfVigia') return;
  var s = await ler(['atual']);
  if (s.atual) resultado({ id: s.atual.id, ok: false, erro: 'O WhatsApp demorou demais pra abrir a conversa' });
});

chrome.runtime.onMessage.addListener(function (m, sender, send) {
  if (m.t === 'souPF') { if (sender.tab) guardar({ pfTab: sender.tab.id }); send({ ok: 1 }); return; }
  if (m.t === 'lote') {
    (async function () {
      var s = await ler(['lote']);
      if (s.lote && !s.lote.fim && !s.lote.parado && Date.now() - (s.lote.criado || 0) < 30 * 60000) {
        // já tem uma fila andando: junta as mensagens novas no fim
        s.lote.itens = s.lote.itens.concat((m.itens || []).map(function (x) { return { tel: x.tel, texto: x.texto, ref: x.ref, nome: x.nome || '', lote: m.id }; }));
        await guardar({ lote: s.lote }); return;
      }
      var L = { id: m.id, titulo: m.titulo || '', origem: sender.tab ? sender.tab.id : null, criado: Date.now(), itens: (m.itens || []).map(function (x) { return { tel: x.tel, texto: x.texto, ref: x.ref, nome: x.nome || '', lote: m.id }; }) };
      await guardar({ lote: L, atual: null });
      enviarItem();
    })();
    send({ ok: 1 }); return;
  }
  if (m.t === 'parar') {
    (async function () { var s = await ler(['lote']); if (s.lote) { s.lote.parado = 'Parado por você'; s.lote.itens.forEach(function (x) { if (!x.st || x.st === 'enviando') { x.st = 'erro'; x.erro = 'não mandado (parou)'; } }); s.lote.fim = Date.now(); await guardar({ lote: s.lote, atual: null }); avisarPF(s.lote); } })();
    send({ ok: 1 }); return;
  }
  if (m.t === 'resultado') { resultado(m); send({ ok: 1 }); return; }
  if (m.t === 'quem' || m.t === 'acao') {
    (async function () {
      var id = await acharPF();
      if (!id) { send({ erro: 'semPF' }); return; }
      if (m.t === 'acao' && m.focar) { try { var t = await chrome.tabs.update(id, { active: true }); await chrome.windows.update(t.windowId, { focused: true }); } catch (e) { } }
      try { send(await chrome.tabs.sendMessage(id, m)); } catch (e) { send({ erro: 'semPF' }); }
    })();
    return true;
  }
});

chrome.action.onClicked.addListener(async function () {
  var id = await acharWA();
  try { var t = await chrome.tabs.update(id, { active: true }); await chrome.windows.update(t.windowId, { focused: true }); } catch (e) { }
});
