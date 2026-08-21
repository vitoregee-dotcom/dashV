// PartsFlow — Atualização automática de Notícias do Setor
// Roda a cada 3 dias via GitHub Actions (.github/workflows/atualizar-noticias.yml).
// Busca 1 notícia recente por categoria direto no Google News (feed RSS
// público e gratuito, v115.1459) -- sem nenhuma chamada de IA pra achar a
// notícia, custo zero nessa etapa. Extrai a imagem oficial (og:image) da
// página real da matéria. Mescla com o que já está salvo no Supabase
// (chave pfNoticiasSetor, shared key lida por todos os usuários do app) e
// grava de volta.
//
// Não apaga nada que o Vitor tenha adicionado manualmente pelo botão "+" no
// app -- só adiciona o que for novo (por link) e aplica um teto de 5 itens
// por categoria dentro de cada grupo (não por grupo inteiro), pra nunca
// derrubar uma marca inteira da lista mesmo que outra categoria receba mais
// notícia nova que ela.

const SUPABASE_URL = 'https://bqbdypizmeirezedvefo.supabase.co';
const MY_USER_ID = 'e526fea4-d04f-4d2f-a700-145ac17b137c';
const CHAVE = 'pfNoticiasSetor';
const MAX_POR_CATEGORIA = 5;

const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_KEY) {
  console.error('Falta a variável de ambiente SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

// v115.1459 - "query" é o termo de busca mandado pro Google News (curto e
// direto funciona melhor que frase longa); "categoria"/"grupo" continuam
// os mesmos usados pelo app pra agrupar/exibir.
const CATEGORIAS = [
  { grupo: 'maquinas', categoria: 'MÁQUINAS', query: 'lançamento máquinas pesadas construção mineração agricultura' },
  { grupo: 'mercado', categoria: 'MERCADO', query: 'mercado máquinas pesadas Brasil vendas' },
  { grupo: 'mercado', categoria: 'ROLAMENTOS', query: 'mercado rolamentos industriais' },
  { grupo: 'marcas', categoria: 'DANA', query: 'Dana Incorporated autopeças' },
  { grupo: 'marcas', categoria: 'CARRARO', query: 'Carraro Group transmissões' },
  { grupo: 'marcas', categoria: 'ALLISON', query: 'Allison Transmission' },
  { grupo: 'marcas', categoria: 'SPICER', query: 'Spicer Dana cardans eixos' },
  { grupo: 'marcas', categoria: 'PERKINS', query: 'Perkins Engines motores diesel' },
  { grupo: 'marcas', categoria: 'CUMMINS', query: 'Cummins motores' },
  { grupo: 'marcas', categoria: 'FPT', query: 'FPT Industrial motores' },
  { grupo: 'marcas', categoria: 'SKF', query: 'SKF rolamentos' },
  { grupo: 'marcas', categoria: 'INA', query: 'INA Schaeffler rolamentos' },
  { grupo: 'marcas', categoria: 'TIMKEN', query: 'Timken Company rolamentos' },
  { grupo: 'marcas', categoria: 'NTN', query: 'NTN Corporation rolamentos' },
  { grupo: 'marcas', categoria: 'FAG', query: 'FAG Schaeffler rolamentos' },
  { grupo: 'marcas', categoria: 'SNR', query: 'SNR NTN-SNR rolamentos' }
];

// Extrai a imagem oficial (og:image / twitter:image) e a URL final (depois
// de seguir redirecionamento) direto da página real da notícia -- mesmo
// padrão que WhatsApp/Twitter usam pra gerar preview de link. Timeout
// curto (8s) e falha em silêncio (volta null), pra nunca travar a rodada
// inteira por causa de UM site lento/bloqueando.
async function buscarPaginaReal(url) {
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 8000);
    const resp = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PartsFlowBot/1.0)' }
    });
    clearTimeout(timeout);
    if (!resp.ok) return null;
    const html = await resp.text();
    const trecho = html.slice(0, 60000); // meta tags sempre ficam no <head>, não precisa ler a página toda
    const padroes = [
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i
    ];
    let imagem = null;
    for (const re of padroes) {
      const m = trecho.match(re);
      if (m && m[1] && m[1].startsWith('http')) { imagem = m[1]; break; }
    }
    return { linkFinal: resp.url || url, imagem };
  } catch (e) {
    return null;
  }
}

function limparTexto(t) {
  return (t || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .trim();
}

function formatarData(pubDateStr) {
  try {
    const d = new Date(pubDateStr);
    if (isNaN(d.getTime())) return new Date().toLocaleDateString('pt-BR');
    return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  } catch (e) {
    return new Date().toLocaleDateString('pt-BR');
  }
}

// Busca as notícias recentes do Google News RSS pra essa categoria e
// tenta, entre as primeiras 6 opções, achar uma que: (1) ainda não está
// na lista (por link) e (2) tem foto de verdade -- só aceita sem foto se
// nenhuma das 6 primeiras tiver.
async function buscarNoticia(cat, linksExistentes) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(cat.query)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
  let xml;
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 10000);
    const resp = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PartsFlowBot/1.0)' } });
    clearTimeout(timeout);
    if (!resp.ok) { console.warn(`Google News RSS falhou pra ${cat.categoria}: HTTP ${resp.status}`); return null; }
    xml = await resp.text();
  } catch (e) {
    console.warn(`Google News RSS erro pra ${cat.categoria}:`, e.message);
    return null;
  }

  const blocos = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => m[1]).slice(0, 6);
  if (!blocos.length) { console.log(`Sem resultados no Google News pra ${cat.categoria}.`); return null; }

  let candidatoSemFoto = null;
  for (const bloco of blocos) {
    const tituloM = bloco.match(/<title>([\s\S]*?)<\/title>/);
    const linkM = bloco.match(/<link>([\s\S]*?)<\/link>/);
    const pubDateM = bloco.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
    const sourceM = bloco.match(/<source[^>]*>([\s\S]*?)<\/source>/);
    if (!tituloM || !linkM) continue;
    let titulo = limparTexto(tituloM[1]);
    const linkGoogle = limparTexto(linkM[1]);
    const fonte = sourceM ? limparTexto(sourceM[1]) : '';
    // Título do Google News costuma vir "Manchete - Nome da Fonte"
    if (fonte && titulo.endsWith(' - ' + fonte)) titulo = titulo.slice(0, -(fonte.length + 3));

    const pagina = await buscarPaginaReal(linkGoogle);
    const linkFinal = pagina ? pagina.linkFinal : linkGoogle;
    if (linksExistentes.has(linkFinal) || linksExistentes.has(linkGoogle)) continue;

    const item = {
      titulo,
      fonte,
      data: pubDateM ? formatarData(pubDateM[1]) : new Date().toLocaleDateString('pt-BR'),
      link: linkFinal,
      categoria: cat.categoria,
      grupo: cat.grupo
    };
    if (pagina && pagina.imagem) {
      item.imagem = pagina.imagem;
      return item; // achou com foto -- já era, não precisa olhar as outras
    }
    if (!candidatoSemFoto) candidatoSemFoto = item; // guarda o primeiro válido, caso nenhuma das 6 tenha foto
  }
  return candidatoSemFoto;
}

async function main() {
  // 1. Ler o que já está salvo
  const rGet = await fetch(
    `${SUPABASE_URL}/rest/v1/user_sync?user_id=eq.${MY_USER_ID}&chave=eq.${CHAVE}&select=dados`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  );
  let lista = [];
  if (rGet.ok) {
    const rows = await rGet.json();
    if (rows.length) {
      const raw = typeof rows[0].dados === 'string' ? rows[0].dados : JSON.stringify(rows[0].dados);
      try {
        const parsed = JSON.parse(raw);
        // v115.1457 - BUG corrigido (achado a partir do "então não tem
        // notícia?" do Vitor): o app (v115.1449) passou a gravar
        // pfNoticiasSetor como {itens,ts} em vez de array puro, pra o sync
        // conseguir escolher a versão mais nova sem unir pra sempre -- mas
        // esse script (roda separado, via GitHub Actions) nunca foi
        // atualizado pra esse formato novo. Resultado: ele não conseguia
        // LER a lista existente (Array.isArray dava falso pro objeto novo,
        // então sempre "resetava" pra lista vazia) nem GRAVAR nesse
        // formato (gravava array puro de novo, que o app então ignorava
        // por não ter timestamp mais novo que o local). Agora lê os dois
        // formatos (array puro OU {itens,ts}) e grava sempre como
        // {itens,ts}.
        if (Array.isArray(parsed)) lista = parsed;
        else if (parsed && Array.isArray(parsed.itens)) lista = parsed.itens;
      } catch (e) { lista = []; }
    }
  }
  if (!Array.isArray(lista)) lista = [];
  console.log(`Lista atual: ${lista.length} itens.`);

  const linksExistentes = new Set(lista.map(n => n.link));

  // 2. Buscar 1 notícia nova por categoria (Google News, sem IA)
  let adicionadas = 0;
  for (const cat of CATEGORIAS) {
    const item = await buscarNoticia(cat, linksExistentes);
    if (!item) { console.log(`Nada de novo pra ${cat.grupo}/${cat.categoria}.`); continue; }
    lista.unshift(item);
    linksExistentes.add(item.link);
    adicionadas++;
    console.log(`+ ${cat.grupo}/${cat.categoria}: ${item.titulo}${item.imagem ? ' (com foto)' : ' (sem foto)'}`);
  }

  if (adicionadas === 0) {
    console.log('Nenhuma notícia nova encontrada nessa rodada. Nada a gravar.');
    return;
  }

  // 3. Teto de MAX_POR_CATEGORIA por (grupo + categoria) -- nunca por grupo
  // inteiro, pra não derrubar uma marca inteira da lista.
  const contagem = {};
  const listaFinal = [];
  for (const item of lista) {
    const k = (item.grupo || '') + '|' + (item.categoria || '');
    contagem[k] = (contagem[k] || 0) + 1;
    if (contagem[k] <= MAX_POR_CATEGORIA) listaFinal.push(item);
  }

  // 4. Gravar de volta -- {itens,ts}, igual o app grava (v115.1449), pra
  // o merge no cliente saber escolher a versão mais nova em vez de tratar
  // isso como "sem timestamp, ignorar" (ver nota na leitura acima).
  const body = JSON.stringify({
    user_id: MY_USER_ID,
    chave: CHAVE,
    dados: JSON.stringify({ itens: listaFinal, ts: Date.now() }),
    updated_at: new Date().toISOString()
  });
  const rPost = await fetch(`${SUPABASE_URL}/rest/v1/user_sync?on_conflict=user_id,chave`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates'
    },
    body
  });

  if (!rPost.ok) {
    console.error('Erro ao gravar no Supabase:', rPost.status, await rPost.text());
    process.exit(1);
  }

  // 5. Gravar também, numa chave separada, a data/hora dessa atualização
  // automática -- como OBJETO com "ts" (não string simples), porque a
  // lógica de merge do app (pfMergeSyncValue) só compara e atualiza de
  // verdade quando os dois lados são objeto; uma string simples cairia no
  // fallback "nunca perde o que já tem local" e nunca atualizaria.
  const agora = new Date();
  const bodyData = JSON.stringify({
    user_id: MY_USER_ID,
    chave: 'pfNoticiasSetorAtualizadoEm',
    dados: JSON.stringify({ valor: agora.toISOString(), ts: agora.getTime() }),
    updated_at: agora.toISOString()
  });
  const rPostData = await fetch(`${SUPABASE_URL}/rest/v1/user_sync?on_conflict=user_id,chave`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates'
    },
    body: bodyData
  });
  if (!rPostData.ok) {
    console.error('Erro ao gravar data de atualização:', rPostData.status, await rPostData.text());
  }

  console.log(`✅ Gravado com sucesso. ${adicionadas} notícia(s) nova(s), ${listaFinal.length} itens no total.`);
}

main().catch(e => { console.error(e); process.exit(1); });
