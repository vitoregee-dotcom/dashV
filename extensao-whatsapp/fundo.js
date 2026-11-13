// PartsFlow no WhatsApp — fundo (service worker).
// Guarda qual aba é o PF e qual é o WhatsApp Web, leva as perguntas do painel pro PF
// e manda a fila de mensagens uma por uma (abre a conversa, o whatsapp.js aperta enviar e confirma).
'use strict';
var PF_URLS = ['https://vitoregee-dotcom.github.io/*', 'https://*.vercel.app/*', 'http://localhost/*', 'http://127.0.0.1/*'];
var PAUSA_MIN = 4000, PAUSA_MAX = 9000; // pausa entre uma mensagem e outra (parecer envio normal)

function guardar(o) { return chrome.storage.local.set(o); }
function ler(k) { return chrome.storage.local.get(k); }

async function tabExiste(id) { if (!id) return false; try { await chrome.tabs.get(id); return true; } catch (e) { return false; } }

// acha a aba do PartsFlow (a última que se apresentou, senão pergunta pra cada aba possível)
// 3.1 - BUG ("Abra o PartsFlow" com a aba do PF aberta): a aba guardada podia estar com a ponte MORTA (extensão atualizada/recarregada
// depois que o PF abriu → o ponte.js antigo não responde mais) e o fundo devolvia "semPF" sem procurar de novo. Agora: confere com ping;
// aba do PF que não responde ganha o ponte.js de novo (chrome.scripting) e, se nem assim, avisa "dê F5 na aba do PF" (erro 'pfF5').
async function pingPF(id) { try { var r = await chrome.tabs.sendMessage(id, { t: 'ping' }); return !!(r && r.pf); } catch (e) { return false; } }
async function reinjetar(id) { try { await chrome.scripting.executeScript({ target: { tabId: id, allFrames: true }, files: ['ponte.js'] }); await new Promise(function (ok) { setTimeout(ok, 400); }); return await pingPF(id); } catch (e) { return false; } }
var _pfTemAba = false;
async function acharPF() {
  _pfTemAba = false;
  var s = await ler(['pfTab']);
  if (await tabExiste(s.pfTab) && await pingPF(s.pfTab)) return s.pfTab;
  var tabs = [];
  try { tabs = await chrome.tabs.query({ url: PF_URLS }); } catch (e) { }
  for (var i = 0; i < tabs.length; i++) { if (await pingPF(tabs[i].id)) { await guardar({ pfTab: tabs[i].id }); return tabs[i].id; } }
  for (var j = 0; j < tabs.length; j++) {
    if (!/partsflow/i.test(tabs[j].title || '') && !/dashV/i.test(tabs[j].url || '')) continue;
    _pfTemAba = true;
    if (await reinjetar(tabs[j].id)) { await guardar({ pfTab: tabs[j].id }); return tabs[j].id; }
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
  // 2.6 - disparo em massa: L.pausa (segundos, vem do limite por hora). Espera longa vai por alarme (o fundo dorme depois de ~30 s).
  var ms = PAUSA_MIN + Math.random() * (PAUSA_MAX - PAUSA_MIN);
  if (L.pausa) ms = Math.max(ms, L.pausa * 1000 * (0.85 + Math.random() * 0.3));
  if (ms > 25000) chrome.alarms.create('pfProx', { when: Date.now() + ms }); else setTimeout(enviarItem, ms);
}

chrome.alarms.onAlarm.addListener(async function (a) {
  if (a.name === 'pfProx') { enviarItem(); return; }
  if (a.name !== 'pfVigia') return;
  var s = await ler(['atual']);
  if (s.atual) resultado({ id: s.atual.id, ok: false, erro: 'O WhatsApp demorou demais pra abrir a conversa' });
});

chrome.runtime.onMessage.addListener(function (m, sender, send) {
  // 3.2 - aviso de "conectado ao PF" no painel: o whatsapp.js pergunta de tempos em tempos
  if (m.t === 'pfStatus') { (async function () { var id = await acharPF(); send({ ok: !!id, temAba: _pfTemAba }); })(); return true; }
  if (m.t === 'souPF') { if (sender.tab) guardar({ pfTab: sender.tab.id }); send({ ok: 1 }); return; }
  if (m.t === 'lote') {
    (async function () {
      var s = await ler(['lote']);
      if (s.lote && !s.lote.fim && !s.lote.parado && Date.now() - (s.lote.criado || 0) < 30 * 60000) {
        // já tem uma fila andando: junta as mensagens novas no fim
        s.lote.itens = s.lote.itens.concat((m.itens || []).map(function (x) { return { tel: x.tel, texto: x.texto, ref: x.ref, nome: x.nome || '', lote: m.id }; }));
        await guardar({ lote: s.lote }); return;
      }
      var L = { id: m.id, titulo: m.titulo || '', pausa: +m.pausaSeg || 0, origem: sender.tab ? sender.tab.id : null, criado: Date.now(), itens: (m.itens || []).map(function (x) { return { tel: x.tel, texto: x.texto, ref: x.ref, nome: x.nome || '', lote: m.id }; }) };
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
  // 1.8 - Status do WhatsApp: guarda a imagem e leva pro WhatsApp Web (o whatsapp.js coloca no Status e para antes de publicar)
  if (m.t === 'status') {
    (async function () {
      await guardar({ statusPend: { img: m.img, legenda: m.legenda || '', nome: m.nome || 'status.jpg', ts: Date.now() } });
      var tabs = await chrome.tabs.query({ url: 'https://web.whatsapp.com/*' }), id;
      if (tabs.length) { id = tabs[0].id; try { var t = await chrome.tabs.update(id, { active: true }); await chrome.windows.update(t.windowId, { focused: true }); } catch (e) { } }
      else { var t2 = await chrome.tabs.create({ url: 'https://web.whatsapp.com/', active: true }); id = t2.id; }
    })();
    send({ ok: 1 }); return;
  }
  if (m.t === 'quem' || m.t === 'acao') {
    (async function () {
      var id = await acharPF();
      if (!id) { send({ erro: _pfTemAba ? 'pfF5' : 'semPF' }); return; }
      if (m.t === 'acao' && m.focar) { try { var t = await chrome.tabs.update(id, { active: true }); await chrome.windows.update(t.windowId, { focused: true }); } catch (e) { } }
      try { send(await chrome.tabs.sendMessage(id, m)); } catch (e) { await guardar({ pfTab: null }); send({ erro: 'pfF5' }); }
    })();
    return true;
  }
});

chrome.action.onClicked.addListener(async function () {
  var id = await acharWA();
  try { var t = await chrome.tabs.update(id, { active: true }); await chrome.windows.update(t.windowId, { focused: true }); } catch (e) { }
});

// 4.47 - A pedido do Vitor ("com a extensão é possível incluir função em qualquer lugar? botão direito também?" → "gostei de todas, pode colocar"):
// grupo "🧩 PartsFlow" no menu do botão direito do Chrome, só no WhatsApp Web. O whatsapp.js avisa onde foi o clique (mensagem, conversa da lista,
// texto selecionado, imagem) e aqui só aparecem as opções daquele lugar. O clique volta pro whatsapp.js, que faz a ação.
function cmCriar() {
  try {
    chrome.contextMenus.removeAll(function () {
      var D = ['https://web.whatsapp.com/*'];
      var mk = function (o) { o.documentUrlPatterns = D; try { chrome.contextMenus.create(o, function () { void chrome.runtime.lastError; }); } catch (e) { } };
      mk({ id: 'pf', title: '🧩 PartsFlow', contexts: ['selection', 'image', 'page', 'link'] });
      mk({ id: 'sel_ver', parentId: 'pf', title: '🔎 Ver no PF  (Alt+B)', contexts: ['selection'] });
      mk({ id: 'sel_cot', parentId: 'pf', title: '➕ Pôr na cotação de hoje', contexts: ['selection'] });
      mk({ id: 'sel_cotar', parentId: 'pf', title: '📄 Cotar só esse', contexts: ['selection'] });
      mk({ id: 'img_ia', parentId: 'pf', title: '🤖 Ler com IA e cotar', contexts: ['image'] });
      mk({ id: 'img_mapa', parentId: 'pf', title: '📥 Lançar no mapa (resposta do fornecedor)', contexts: ['image'] });
      mk({ id: 'msg_cotar', parentId: 'pf', title: '📄 Cotar esta mensagem', contexts: ['page', 'link'] });
      mk({ id: 'msg_lemb', parentId: 'pf', title: '⏰ Criar lembrete', contexts: ['page', 'link'] });
      mk({ id: 'msg_rr', parentId: 'pf', title: '💾 Salvar como resposta rápida', contexts: ['page', 'link'] });
      mk({ id: 'msg_nota', parentId: 'pf', title: '📝 Anotar na ficha do cliente', contexts: ['page', 'link'] });
      mk({ id: 'msg_mapa', parentId: 'pf', title: '📥 Lançar no mapa (resposta do fornecedor)', contexts: ['page', 'link'] });
      mk({ id: 'cv_ficha', parentId: 'pf', title: '🤝 Abrir ficha do cliente', contexts: ['page', 'link'] });
      mk({ id: 'cv_grupo', parentId: 'pf', title: '🏷️ Trocar grupo / tipo', contexts: ['page', 'link'] });
      mk({ id: 'cv_int', parentId: 'pf', title: '🎩 Grau de intimidade', contexts: ['page', 'link'] });
      mk({ id: 'cv_int_formal', parentId: 'cv_int', title: '🎩 Formal', contexts: ['page', 'link'] });
      mk({ id: 'cv_int_normal', parentId: 'cv_int', title: '🙂 Normal', contexts: ['page', 'link'] });
      mk({ id: 'cv_int_proximo', parentId: 'cv_int', title: '🤝 Próximo', contexts: ['page', 'link'] });
      mk({ id: 'cv_nunca', parentId: 'pf', title: '🔕 Mensagem automática pra esse: liga/desliga', contexts: ['page', 'link'] });
    });
  } catch (e) { }
}
chrome.runtime.onInstalled.addListener(cmCriar);
chrome.runtime.onStartup.addListener(cmCriar);
function cmVis(id, v) { try { chrome.contextMenus.update(id, { visible: !!v }, function () { void chrome.runtime.lastError; }); } catch (e) { } }
chrome.runtime.onMessage.addListener(function (m, sender, send) {
  if (!m || m.t !== 'cmCtx') return;
  var msgT = m.tipo === 'msg', conv = m.tipo === 'conv';
  cmVis('pf', m.sel || m.img || msgT || conv);
  ['msg_cotar', 'msg_lemb', 'msg_rr', 'msg_nota'].forEach(function (id) { cmVis(id, msgT); });
  cmVis('msg_mapa', msgT && m.forn);
  ['cv_ficha', 'cv_grupo', 'cv_int', 'cv_nunca'].forEach(function (id) { cmVis(id, conv); });
  send({ ok: 1 });
});
chrome.contextMenus.onClicked.addListener(function (info, tab) {
  if (!tab || !tab.id) return;
  try { chrome.tabs.sendMessage(tab.id, { t: 'cmClick', id: info.menuItemId, sel: info.selectionText || '', src: info.srcUrl || '' }, function () { void chrome.runtime.lastError; }); } catch (e) { }
});
