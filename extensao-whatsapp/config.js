// 6.4 - Configurações da extensão em aba própria (pedido do Vitor; prévia docs/referencias/whatsapp-pedidos-config/previa-config.png).
// Esta página só MOSTRA: o HTML de cada seção vem do whatsapp.js (aba do WhatsApp Web) e os cliques/campos voltam pra lá — as regras ficam num lugar só.
// Seção nova → item no SECS aqui + caso no cfgSecHtml do whatsapp.js.
'use strict';
var SECS = [
  ['aparencia', '🎨', 'Aparência', 'Jeito dos botões, cor do menu e ícones.', 'cor visual icone ícone botão tema azul discreta'],
  ['barra', '🧰', 'Barra e botões', 'O que aparece em volta das conversas do WhatsApp.', 'menu etiqueta selo coluna pedidos barra salvar contato resposta rápida'],
  ['auto', '👋', 'Mensagens automáticas', 'O que o PF responde sozinho quando você não consegue responder. Tudo grava na hora.', 'saudação status reunião férias ausente almoço expediente frase automática comando'],
  ['assist', '🤖', 'Assistente', 'Este WhatsApp é o seu assistente: você encaminha o pedido do cliente e ele monta a cotação no PF e te manda o PDF.', 'assistente agente robô encaminhar cotação automático'],
  ['disparo', '📣', 'Disparos em massa', 'Mandar uma mensagem pra muitos clientes, filtrando por linha, tipo, estado e cidade — na hora ou agendado.', 'disparo massa agendar agenda campanha linha tipo estado cidade rodoviário oficina cliente final'],
  ['stauto', '📢', 'Status automático', 'Postar sozinho no Status do WhatsApp: o que chegou no estoque e status programados.', 'status automático chegou estoque programado story'],
  ['avisos', '🔔', 'Avisos e lembretes', 'Avisos que aparecem enquanto você conversa.', 'cotação oferta frota portfólio verificar conhecer pedido emitir sugestão'],
  ['contatos', '📇', 'Contatos', 'Trazer os contatos do WhatsApp pro PF.', 'importar números lista cliente pf'],
  ['audio', '🎤', 'Áudio', 'Descrever os áudios que os clientes mandam.', 'áudio transcrição chave'],
  ['motor', '⚙️', 'Motor', 'Como a extensão trabalha por dentro do WhatsApp.', 'motor'],
  ['ajuda', 'ℹ️', 'Sobre e ajuda', 'Pra que serve cada função da extensão.', 'ajuda como funciona']
];
var sec = (location.hash || '').slice(1) || 'auto', waTab = null, campoT = null;
if (!SECS.some(function (s) { return s[0] === sec; })) sec = 'auto';
var $ = function (id) { return document.getElementById(id); };
$('ver').textContent = 'extensão v' + chrome.runtime.getManifest().version;

function menu() {
  var q = ($('busca').value || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  $('secs').innerHTML = SECS.filter(function (s) { if (!q) return true; var t = (s[2] + ' ' + s[3] + ' ' + s[4]).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); return q.split(/\s+/).every(function (w) { return t.indexOf(w) >= 0; }); })
    .map(function (s) { return '<div class="cfg-it' + (s[0] === sec ? ' on' : '') + '" data-sec="' + s[0] + '">' + s[1] + ' ' + s[2] + (s[0] === 'auto' && window._autoOn != null ? '<small>' + (window._autoOn ? 'ligada' : 'desligada') + '</small>' : '') + '</div>'; }).join('') || '<div class="cfg-desc" style="padding:8px">Nada com esse nome.</div>';
}
$('busca').addEventListener('input', menu);
$('secs').addEventListener('click', function (e) { var it = e.target.closest('[data-sec]'); if (!it) return; ir(it.getAttribute('data-sec')); });

function ir(s) { sec = s; try { history.replaceState(null, '', '#' + s); } catch (e) { } menu(); carregar(); window.scrollTo(0, 0); }

async function acharWA() {
  try { var t = await chrome.tabs.query({ url: 'https://web.whatsapp.com/*' }); waTab = t.length ? t[0].id : null; } catch (e) { waTab = null; }
  return waTab;
}
async function falar(m) {
  if (!waTab) await acharWA();
  if (!waTab) return null;
  m.t = 'cfgRemoto'; m.sec = sec;
  try { return await chrome.tabs.sendMessage(waTab, m); } catch (e) { waTab = null; return null; }
}
function pintarCon(el, ok, txt) { el.className = 'cfg-con ' + (ok ? 'ok' : 'no'); el.textContent = txt; }
async function conexoes() {
  await acharWA();
  pintarCon($('conWa'), !!waTab, waTab ? '● WhatsApp aberto' : '● WhatsApp fechado');
  try { var r = await chrome.runtime.sendMessage({ t: 'pfStatus' }); pintarCon($('conPf'), r && r.ok, r && r.ok ? '● Conectado ao PF' : (r && r.temAba ? '● Dê F5 no PF' : '● PF fechado')); } catch (e) { pintarCon($('conPf'), false, '● PF fechado'); }
}

function mostrar(r) {
  var S = SECS.filter(function (s) { return s[0] === sec; })[0];
  $('tit').textContent = S[1] + ' ' + S[2]; $('desc').textContent = S[3];
  if (!r) {
    $('corpo').innerHTML = '<div class="cfg-vazio"><b>Abra o WhatsApp Web neste Chrome.</b><br>As configurações moram na aba do WhatsApp (é lá que a extensão trabalha). Com ela aberta, esta página mostra e grava tudo.' +
      '<br><button id="abreWa">Abrir o WhatsApp Web</button> <button id="tentar" style="background:#fff;color:#1F4E79;border:1px solid #1F4E79">↻ Tentar de novo</button><br><small style="color:#7a8a99">Já está aberto? Dê F5 na aba do WhatsApp (a extensão pode ter sido atualizada).</small></div>';
    $('abreWa').onclick = function () { chrome.tabs.create({ url: 'https://web.whatsapp.com/' }); };
    $('tentar').onclick = function () { waTab = null; carregar(); };
    return;
  }
  var y = window.scrollY;
  $('corpo').innerHTML = r.html || '';
  window.scrollTo(0, y);
  if (r.auto != null && window._autoOn !== r.auto) { window._autoOn = r.auto; menu(); }
}
async function carregar() { mostrar(await falar({ op: 'html' })); conexoes(); }
function avisoSalvo() { var d = document.querySelector('.cfg-salvo'); if (!d) { d = document.createElement('div'); d.className = 'cfg-salvo'; d.textContent = '✔ salvo'; document.body.appendChild(d); } d.classList.add('vis'); clearTimeout(d._t); d._t = setTimeout(function () { d.classList.remove('vis'); }, 1500); }

var PERGUNTA = { autoAvDel: 'Apagar este aviso?', dspDel: 'Apagar este disparo agendado?', dspRodar: 'Mandar este disparo agora?', stAgDel: 'Tirar este status programado?', dspParar: 'Parar o disparo que está mandando?' };
$('corpo').addEventListener('click', async function (e) {
  var b = e.target.closest('[data-acao]'); if (!b) return;
  e.preventDefault();
  var ac = b.getAttribute('data-acao'), arg = b.getAttribute('data-arg') || '', ok = false;
  if (PERGUNTA[ac]) { if (!confirm(PERGUNTA[ac])) return; ok = true; }
  b.style.opacity = '.55';
  var r = await falar({ op: 'acao', ac: ac, arg: arg, ok: ok });
  mostrar(r); if (r) avisoSalvo();
});
function campo(el, redesenhar) {
  falar({ op: 'campo', k: el.getAttribute('data-au'), v: el.value, tag: el.tagName, tipo: el.type, checked: el.checked }).then(function (r) {
    if (!r) return; avisoSalvo();
    if (redesenhar && !(document.activeElement && document.activeElement.tagName === 'TEXTAREA')) mostrar(r);
  });
}
$('corpo').addEventListener('change', function (e) { var el = e.target; if (!el.getAttribute || !el.getAttribute('data-au')) return; campo(el, el.tagName !== 'TEXTAREA'); });
$('corpo').addEventListener('input', function (e) { var el = e.target; if (!el.getAttribute || !el.getAttribute('data-au') || el.tagName !== 'TEXTAREA') return; clearTimeout(campoT); campoT = setTimeout(function () { campo(el, false); }, 700); });

// o fundo pede pra ir numa seção (botão do painel com a página já aberta)
chrome.runtime.onMessage.addListener(function (m) { if (m && m.t === 'cfgSec' && m.sec) ir(m.sec); });
window.addEventListener('hashchange', function () { var s = location.hash.slice(1); if (s && s !== sec && SECS.some(function (x) { return x[0] === s; })) ir(s); });
// tarefas longas (importar, buscar números) e o status mudam sozinhos: atualiza de tempos em tempos, sem atrapalhar quem está digitando
setInterval(function () {
  if (document.hidden) return; var a = document.activeElement;
  if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a !== $('busca')) return;
  if (sec === 'contatos' || sec === 'auto' || sec === 'motor') carregar(); else conexoes();
}, 4000);
menu(); carregar();
