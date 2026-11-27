// 4.58 - A pedido do Vitor ("no Watidy ele fazia algumas coisas em segundo plano… vamos fazer: mensagem automática e puxar os números pro PF"):
// MOTOR "por dentro" do WhatsApp Web. Roda no mundo da página (MAIN) junto com a biblioteca pública WA-JS (wppconnect-wa.js, Apache-2.0),
// que expõe as funções internas do WhatsApp em window.WPP. Assim dá pra ler contatos/conversas/mensagens e mandar mensagem SEM abrir a
// conversa na tela. O whatsapp.js (extensão) conversa com este arquivo por window.postMessage {__pfMotor:'req'|'res'}.
// Se o WhatsApp mudar por dentro e a biblioteca quebrar, o motor responde "naoPronto" e a extensão volta pro jeito antigo (clicando na tela).
(function () {
  if (window.__pfMotorOk) return; window.__pfMotorOk = true;
  function W() { return window.WPP; }
  function pronto() { try { return !!(W() && (W().isFullReady || W().isReady)); } catch (e) { return false; } }
  function ser(w) { if (!w) return ''; if (typeof w === 'string') return w; return w._serialized || (w.toString ? String(w.toString()) : ''); }
  function soNum(s) { return String(s || '').split('@')[0].replace(/\D/g, ''); }
  async function telDe(id) {
    var s = ser(id);
    if (/@c\.us$/.test(s)) return soNum(s);
    if (/@lid$/.test(s)) { try { var e = await W().contact.getPnLidEntry(s); if (e && e.phoneNumber) return soNum(e.phoneNumber.id || ser(e.phoneNumber)); } catch (x) { } }
    return '';
  }
  function txtDe(m) { var t = m.type || ''; if (t === 'chat') return m.body || ''; return m.caption || ''; }
  var A = {
    ping: async function () { return { pronto: pronto(), ver: (W() && W().version) || '' }; },
    // contatos salvos no celular, com o número (inclusive os novos "@lid", que o WhatsApp Web não mostra na tela)
    contatos: async function () {
      var l = await W().contact.list({ onlyMyContacts: true }), out = [];
      for (var i = 0; i < l.length; i++) {
        var c = l[i], id = ser(c.id); if (!id || /@g\.us|@broadcast|@newsletter/.test(id)) continue;
        var nome = c.name || c.formattedName || ''; if (!nome) continue;
        out.push({ nome: nome, tel: await telDe(c.id), id: id });
      }
      return { l: out };
    },
    // conversas de pessoa (sem grupo) com não lidas, hora da última mensagem e nome como aparece na lista
    chats: async function () {
      var l = await W().chat.list({ onlyUsers: true, onlyWithUnreadMessage: true }), out = [];
      for (var i = 0; i < l.length; i++) {
        var c = l[i], id = ser(c.id); if (!id || /@g\.us|@broadcast|@newsletter/.test(id)) continue;
        var nome = c.formattedTitle || c.name || (c.contact && (c.contact.name || c.contact.pushname)) || '';
        out.push({ id: id, nome: nome, unread: c.unreadCount || 0, t: (c.t || 0) * 1000, tel: await telDe(c.id) });
      }
      return { l: out };
    },
    msgs: async function (a) {
      var l = await W().chat.getMessages(a.id, { count: a.n || 20 });
      return { l: (l || []).map(function (m) { return { eu: !!(m.id && m.id.fromMe), t: (m.t || 0) * 1000, txt: txtDe(m), tipo: m.type || '', id: ser(m.id), fw: !!(m.isForwarded || m.forwardingScore), arq: m.filename || '', mime: m.mimetype || '' }; }) }; // 9.2 - id/encaminhada/arquivo pro 🤖 assistente
    },
    enviar: async function (a) {
      try { await W().chat.markIsComposing(a.id, Math.min(6000, 900 + String(a.texto || '').length * 45)); } catch (x) { } // "digitando…" como gente
      await new Promise(function (r) { setTimeout(r, Math.min(6000, 900 + String(a.texto || '').length * 45)); });
      var r = await W().chat.sendTextMessage(a.id, a.texto, { createChat: false });
      return { ok: true, id: r && ser(r.id) };
    },
    // 4.74 - A pedido do Vitor ("não consegui mandar o PDF pra já ler e fazer a cotação no PF"): baixa o arquivo (PDF/foto) de uma
    // mensagem da conversa aberta, sem abrir nada na tela. Acha pelo nome do arquivo; sem nome, o último documento.
    midia: async function (a) {
      if (a.id) { try { var bi = await W().chat.downloadMedia(a.id); if (bi) { var di = await new Promise(function (ok) { var fr = new FileReader(); fr.onload = function () { ok(fr.result); }; fr.onerror = function () { ok(null); }; fr.readAsDataURL(bi); }); if (di) return { data: di, mime: bi.type || '', nome: '' }; } } catch (x) { } return { erro: 'naoBaixou' }; } // 7.7 - foto original pelo id da mensagem
      var ch = W().chat.getActiveChat(); if (!ch) return { erro: 'semConversa' };
      var l = await W().chat.getMessages(ser(ch.id), { count: 80 }), nm = String(a.nome || '').toLowerCase().trim();
      var docs = (l || []).filter(function (m) { return /document|image/.test(m.type || ''); }), m = null;
      if (nm) m = docs.slice().reverse().find(function (x) { var f = String(x.filename || x.caption || '').toLowerCase().trim(); return f && (f.indexOf(nm) >= 0 || nm.indexOf(f) >= 0); });
      if (!m) m = docs.filter(function (x) { return x.type === 'document'; }).pop();
      if (!m) return { erro: 'naoAchou' };
      var bl = await W().chat.downloadMedia(ser(m.id)); if (!bl) return { erro: 'naoBaixou' };
      var data = await new Promise(function (ok) { var fr = new FileReader(); fr.onload = function () { ok(fr.result); }; fr.onerror = function () { ok(null); }; fr.readAsDataURL(bl); });
      return data ? { data: data, mime: m.mimetype || bl.type || '', nome: m.filename || '' } : { erro: 'naoBaixou' };
    },
    // 4.78 - 📎 mandar um arquivo (portfólio, catálogo…) na conversa aberta, direto
    enviarArq: async function (a) {
      var ch = W().chat.getActiveChat(); if (!ch) return { erro: 'semConversa' };
      var tp = /^image\//.test(a.mime || '') ? 'image' : 'document';
      await W().chat.sendFileMessage(ser(ch.id), a.data, { type: tp, filename: a.nome || 'arquivo', caption: a.legenda || '', createChat: false });
      return { ok: true };
    },
    // 9.2 - 🤖 assistente: manda um arquivo (PDF da cotação) numa conversa pelo id, sem abrir
    enviarArqPara: async function (a) {
      var tp = /^image\//.test(a.mime || '') ? 'image' : 'document';
      await W().chat.sendFileMessage(a.id, a.data, { type: tp, filename: a.nome || 'arquivo.pdf', caption: a.legenda || '', createChat: true });
      return { ok: true };
    },
    // 6.9 - ⏱️ tempo de atendimento: conversas de pessoa com mensagem nova desde `desde` (ms)
    recentes: async function (a) {
      var l = await W().chat.list({ onlyUsers: true }), out = [], d = (a.desde || 0) / 1000;
      for (var i = 0; i < l.length; i++) { var c = l[i], id = ser(c.id); if (!id || /@g\.us|@broadcast|@newsletter/.test(id)) continue; if ((c.t || 0) < d) continue;
        out.push({ id: id, nome: c.formattedTitle || c.name || (c.contact && (c.contact.name || c.contact.pushname)) || '', t: (c.t || 0) * 1000, tel: await telDe(c.id) }); }
      return { l: out };
    },
    abrir: async function (a) { await W().chat.openChatBottom(a.id); return { ok: true }; }, // 4.69 - abrir conversa pela lista do filtro
    naoLida: async function (a) { await W().chat.markIsUnread(a.id); return { ok: true }; },
    // todas as conversas de pessoa, com quantas listas/etiquetas cada uma tem (pra pôr na lista "Cliente PF" só quem não tem nenhuma)
    chatsTodos: async function () {
      var l = await W().chat.list({ onlyUsers: true }), out = [];
      for (var i = 0; i < l.length; i++) { var c = l[i], id = ser(c.id); if (!id || /@g\.us|@broadcast|@newsletter/.test(id)) continue;
        out.push({ id: id, nome: c.formattedTitle || c.name || (c.contact && (c.contact.name || c.contact.pushname)) || '', listas: (c.labels || []).length, unread: c.unreadCount || 0 }); }
      return { l: out };
    },
    // lista (etiqueta do WhatsApp Business) pelo nome; cria se não existir
    labelGarantir: async function (a) {
      var nm = String(a.nome || '').trim().toLowerCase();
      var acha = async function () { var all = await W().labels.getAllLabels(); return (all || []).find(function (x) { return String(x.name || '').trim().toLowerCase() === nm; }); };
      var x = await acha(); if (!x) { await W().labels.addNewLabel(a.nome); x = await acha(); }
      return x ? { id: String(x.id) } : { erro: 'naoCriou' };
    },
    labelAdd: async function (a) { await W().labels.addOrRemoveLabels(a.ids, [{ labelId: a.labelId, type: 'add' }]); return { ok: true }; }
  };
  window.addEventListener('message', async function (e) {
    var d = e.data; if (e.source !== window || !d || d.__pfMotor !== 'req') return;
    var r;
    try { if (d.op !== 'ping' && !pronto()) r = { erro: 'naoPronto' }; else if (!A[d.op]) r = { erro: 'semOp' }; else r = await A[d.op](d.arg || {}); }
    catch (x) { r = { erro: String((x && x.message) || x) }; }
    window.postMessage({ __pfMotor: 'res', id: d.id, r: r }, '*');
  });
})();
