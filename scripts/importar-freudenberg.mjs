// PartsFlow — Importação de catálogos de retentores pro Supabase.
// GENÉRICO: varre todo arquivo scripts/dados-*-retentores.json que existir
// no repositório e mescla cada um com o que já está salvo (chave
// retentores_v1). Não duplica (por codigo + marca) e não apaga nada de
// outra marca já cadastrada -- então é seguro rodar de novo mesmo com
// arquivos que já foram importados antes (viram um no-op, 0 adicionados).
//
// Pra importar um catálogo novo no futuro: só subir um arquivo
// scripts/dados-<algumacoisa>-retentores.json com o formato certo
// (array de {codigo, conversao, eixoD, alojD, altura, marca, tipo,
// material, linha, grupo}) e disparar esse mesmo workflow de novo --
// não precisa criar workflow nem editar este script.
//
// v115.1115 - A pedido do Vitor (economia sempre: reaproveitar workflow
// existente em vez de pedir pra colar um .yml novo): esse mesmo script
// agora TAMBÉM importa scripts/dados-timken-interchange.json (se existir)
// pra uma chave separada (timken_interchange_v1) -- guia de equivalência
// Timken (qualquer marca -> código Timken), 42.301 linhas filtradas só
// pras marcas relevantes pro negócio (peso off-highway/agrícola +
// rolamento), 322->22 abreviações de fabricante mantidas na legenda.
// Formato esperado: {legenda:{ABREV:"Nome"}, linhas:[[codigo,marca,timken],...]}.
// Dedup por (codigo+marca+timken) igual ao dos retentores.

import { readdirSync, readFileSync, existsSync } from 'fs';

const SUPABASE_URL = 'https://bqbdypizmeirezedvefo.supabase.co';
const MY_USER_ID = 'e526fea4-d04f-4d2f-a700-145ac17b137c';

const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_KEY) {
  console.error('Falta a variável de ambiente SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

async function supaGet(chave) {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/user_sync?user_id=eq.${MY_USER_ID}&chave=eq.${chave}&select=dados`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  );
  if (!r.ok) return null;
  const rows = await r.json();
  if (!rows.length) return null;
  const raw = typeof rows[0].dados === 'string' ? rows[0].dados : JSON.stringify(rows[0].dados);
  try { return JSON.parse(raw); } catch (e) { return null; }
}
async function supaPost(chave, dados) {
  const body = JSON.stringify({
    user_id: MY_USER_ID,
    chave,
    dados: JSON.stringify(dados),
    updated_at: new Date().toISOString()
  });
  const r = await fetch(`${SUPABASE_URL}/rest/v1/user_sync?on_conflict=user_id,chave`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates'
    },
    body
  });
  if (!r.ok) {
    console.error('Erro ao gravar no Supabase:', r.status, await r.text());
    process.exit(1);
  }
}

async function importarRetentores() {
  const CHAVE = 'retentores_v1';
  const arquivos = readdirSync('scripts').filter(f => /^dados-.*-retentores\.json$/.test(f));
  console.log(`[Retentores] Arquivos encontrados: ${arquivos.join(', ') || '(nenhum)'}`);

  let novos = [];
  for (const arq of arquivos) {
    const dados = JSON.parse(readFileSync(`scripts/${arq}`, 'utf-8'));
    console.log(`  ${arq}: ${dados.length} itens`);
    novos = novos.concat(dados);
  }
  if (!novos.length) { console.log('[Retentores] Nada pra importar.'); return; }

  let lista = await supaGet(CHAVE) || [];
  if (!Array.isArray(lista)) lista = [];
  console.log(`[Retentores] Já existentes: ${lista.length}`);

  const chaveExistente = new Set(lista.map(r => (r.codigo || '') + '|' + (r.marca || '')));
  let adicionados = 0;
  for (const item of novos) {
    const k = item.codigo + '|' + item.marca;
    if (chaveExistente.has(k)) continue;
    lista.push(item);
    chaveExistente.add(k);
    adicionados++;
  }
  console.log(`[Retentores] Adicionados: ${adicionados}`);
  if (adicionados === 0) return;
  await supaPost(CHAVE, lista);
  console.log(`✅ [Retentores] Total no banco agora: ${lista.length}.`);
}

async function importarTimkenInterchange() {
  const ARQ = 'scripts/dados-timken-interchange.json';
  const CHAVE = 'timken_interchange_v1';
  if (!existsSync(ARQ)) { console.log('[Timken Interchange] Arquivo não encontrado, pulando.'); return; }

  const novo = JSON.parse(readFileSync(ARQ, 'utf-8'));
  console.log(`[Timken Interchange] Linhas no arquivo: ${novo.linhas.length}, legenda: ${Object.keys(novo.legenda).length}`);

  let atual = await supaGet(CHAVE) || { legenda: {}, linhas: [] };
  if (!atual.linhas) atual = { legenda: {}, linhas: [] };

  const chaveExistente = new Set(atual.linhas.map(r => r[0] + '|' + r[1] + '|' + r[2]));
  let adicionados = 0;
  for (const linha of novo.linhas) {
    const k = linha[0] + '|' + linha[1] + '|' + linha[2];
    if (chaveExistente.has(k)) continue;
    atual.linhas.push(linha);
    chaveExistente.add(k);
    adicionados++;
  }
  Object.assign(atual.legenda, novo.legenda);
  console.log(`[Timken Interchange] Adicionados: ${adicionados}`);
  if (adicionados === 0 && Object.keys(novo.legenda).every(k => atual.legenda[k])) {
    console.log('[Timken Interchange] Nada novo.');
    return;
  }
  await supaPost(CHAVE, atual);
  console.log(`✅ [Timken Interchange] Total de linhas no banco agora: ${atual.linhas.length}.`);
}

async function main() {
  await importarRetentores();
  await importarTimkenInterchange();
}

main().catch(e => { console.error(e); process.exit(1); });
