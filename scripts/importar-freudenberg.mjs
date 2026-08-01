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

import { readdirSync, readFileSync } from 'fs';

const SUPABASE_URL = 'https://bqbdypizmeirezedvefo.supabase.co';
const MY_USER_ID = 'e526fea4-d04f-4d2f-a700-145ac17b137c';
const CHAVE = 'retentores_v1';

const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_KEY) {
  console.error('Falta a variável de ambiente SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

async function main() {
  const arquivos = readdirSync('scripts').filter(f => /^dados-.*-retentores\.json$/.test(f));
  console.log(`Arquivos de dados encontrados: ${arquivos.join(', ') || '(nenhum)'}`);

  let novos = [];
  for (const arq of arquivos) {
    const dados = JSON.parse(readFileSync(`scripts/${arq}`, 'utf-8'));
    console.log(`  ${arq}: ${dados.length} itens`);
    novos = novos.concat(dados);
  }
  if (!novos.length) {
    console.log('Nenhum item pra importar.');
    return;
  }

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
  console.log(`Itens já existentes (todas as marcas): ${lista.length}`);

  const chaveExistente = new Set(lista.map(r => (r.codigo || '') + '|' + (r.marca || '')));
  let adicionados = 0;
  for (const item of novos) {
    const k = item.codigo + '|' + item.marca;
    if (chaveExistente.has(k)) continue;
    lista.push(item);
    chaveExistente.add(k);
    adicionados++;
  }
  console.log(`Adicionados de verdade (sem duplicar): ${adicionados}`);

  if (adicionados === 0) {
    console.log('Nada novo pra gravar.');
    return;
  }

  const body = JSON.stringify({
    user_id: MY_USER_ID,
    chave: CHAVE,
    dados: JSON.stringify(lista),
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

  console.log(`✅ Gravado com sucesso. Total de retentores no banco agora: ${lista.length}.`);
}

main().catch(e => { console.error(e); process.exit(1); });
