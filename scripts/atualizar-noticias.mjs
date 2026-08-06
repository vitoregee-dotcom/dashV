// PartsFlow — Atualização automática de Notícias do Setor
// Roda a cada 3 dias via GitHub Actions (.github/workflows/atualizar-noticias.yml).
// Busca 1 notícia recente por categoria (usando a Anthropic API com web search),
// mescla com o que já está salvo no Supabase (chave pfNoticiasSetor, shared key
// lida por todos os usuários do app) e grava de volta.
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

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!ANTHROPIC_KEY || !SUPABASE_KEY) {
  console.error('Faltam as variáveis de ambiente ANTHROPIC_API_KEY e/ou SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const CATEGORIAS = [
  { grupo: 'maquinas', categoria: 'MÁQUINAS', label: 'lançamentos e novidades recentes de máquinas/equipamentos pesados (fabricantes como Volvo CE, Caterpillar, Liebherr, Komatsu, Case, John Deere, Hyundai, entre outros), para os setores de construção, mineração ou agricultura' },
  { grupo: 'mercado', categoria: 'MERCADO', label: 'mercado e setores off-highway no Brasil: vendas, tarifas, câmbio, estudos de mercado, expansão de empresas do setor de máquinas pesadas (construção, mineração, agricultura)' },
  { grupo: 'mercado', categoria: 'ROLAMENTOS', label: 'mercado e setor de rolamentos industriais no Brasil e no mundo: concorrência entre fabricantes (SKF, INA, Schaeffler, Timken, NTN, FAG, SNR, NSK, Koyo e outros), fusões/aquisições, novas tecnologias, tendências de aplicação para veículos pesados e off-highway' },
  { grupo: 'marcas', categoria: 'DANA', label: 'notícias recentes sobre a empresa Dana Incorporated (autopeças, transmissões, eixos)' },
  { grupo: 'marcas', categoria: 'CARRARO', label: 'notícias recentes sobre a empresa Carraro Group (transmissões, eixos para máquinas fora de estrada)' },
  { grupo: 'marcas', categoria: 'ALLISON', label: 'notícias recentes sobre a Allison Transmission (transmissões automáticas)' },
  { grupo: 'marcas', categoria: 'SPICER', label: 'notícias recentes sobre a marca Spicer, da Dana (componentes de transmissão, cardans, eixos)' },
  { grupo: 'marcas', categoria: 'PERKINS', label: 'notícias recentes sobre a Perkins Engines (motores diesel)' },
  { grupo: 'marcas', categoria: 'CUMMINS', label: 'notícias recentes sobre a Cummins Inc (motores)' },
  { grupo: 'marcas', categoria: 'FPT', label: 'notícias recentes sobre a FPT Industrial (motores)' },
  { grupo: 'marcas', categoria: 'SKF', label: 'notícias recentes sobre a empresa SKF (rolamentos, vedações, lubrificação)' },
  { grupo: 'marcas', categoria: 'INA', label: 'notícias recentes sobre a marca INA/Schaeffler (rolamentos)' },
  { grupo: 'marcas', categoria: 'TIMKEN', label: 'notícias recentes sobre a empresa The Timken Company (rolamentos, transmissão de potência)' },
  { grupo: 'marcas', categoria: 'NTN', label: 'notícias recentes sobre a empresa NTN Corporation (rolamentos)' },
  { grupo: 'marcas', categoria: 'FAG', label: 'notícias recentes sobre a marca FAG/Schaeffler (rolamentos)' },
  { grupo: 'marcas', categoria: 'SNR', label: 'notícias recentes sobre a marca SNR/NTN-SNR (rolamentos)' }
];

async function buscarNoticia(cat) {
  const prompt = `Busque UMA notícia relevante e recente (idealmente dos últimos 3 a 7 dias, no máximo dos últimos 30 dias) sobre: ${cat.label}.
Priorize fontes em português do Brasil quando possível (ex: Revista M&T, AgFeed, Investing.com Brasil), mas aceite fontes em inglês se forem mais relevantes ou recentes.
Responda SOMENTE com um JSON válido, sem nenhum texto antes ou depois, exatamente neste formato:
{"titulo":"...","fonte":"nome do site/veículo","data":"DD/MM/AAAA","link":"URL completa e real da notícia","imagem":"URL de uma imagem real da matéria (tipo og:image), ou null se não achar nenhuma imagem confiável"}
Se não encontrar nenhuma notícia relevante e recente sobre o assunto, responda exatamente: {"nada":true}`;

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
      tools: [{ type: 'web_search_20250305', name: 'web_search' }]
    })
  });

  if (!resp.ok) {
    console.error(`Erro na Anthropic API pra ${cat.grupo}/${cat.categoria}:`, resp.status, await resp.text());
    return null;
  }

  const data = await resp.json();
  const texto = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
  const match = texto.match(/\{[\s\S]*\}/);
  if (!match) {
    console.warn(`Sem JSON na resposta pra ${cat.grupo}/${cat.categoria}`);
    return null;
  }

  try {
    const obj = JSON.parse(match[0]);
    if (obj.nada || !obj.titulo || !obj.link) return null;
    const item = {
      titulo: obj.titulo,
      fonte: obj.fonte || '',
      data: obj.data || new Date().toLocaleDateString('pt-BR'),
      link: obj.link,
      categoria: cat.categoria,
      grupo: cat.grupo
    };
    if (obj.imagem) item.imagem = obj.imagem;
    return item;
  } catch (e) {
    console.warn(`JSON inválido pra ${cat.grupo}/${cat.categoria}:`, texto.slice(0, 200));
    return null;
  }
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
      try { lista = JSON.parse(raw); } catch (e) { lista = []; }
    }
  }
  if (!Array.isArray(lista)) lista = [];
  console.log(`Lista atual: ${lista.length} itens.`);

  const linksExistentes = new Set(lista.map(n => n.link));

  // 2. Buscar 1 notícia nova por categoria
  let adicionadas = 0;
  for (const cat of CATEGORIAS) {
    const item = await buscarNoticia(cat);
    if (!item) { console.log(`Nada de novo pra ${cat.grupo}/${cat.categoria}.`); continue; }
    if (linksExistentes.has(item.link)) { console.log(`Já existia: ${item.link}`); continue; }
    lista.unshift(item);
    linksExistentes.add(item.link);
    adicionadas++;
    console.log(`+ ${cat.grupo}/${cat.categoria}: ${item.titulo}`);
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

  // 4. Gravar de volta
  const body = JSON.stringify({
    user_id: MY_USER_ID,
    chave: CHAVE,
    dados: JSON.stringify(listaFinal),
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

  console.log(`✅ Gravado com sucesso. ${adicionadas} notícia(s) nova(s), ${listaFinal.length} itens no total.`);
}

main().catch(e => { console.error(e); process.exit(1); });
