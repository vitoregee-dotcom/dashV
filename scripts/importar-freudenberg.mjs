// PartsFlow — Importação única dos retentores FREUDENBERG (catálogo em PDF
// processado pelo Claude) pra dentro do Supabase, chave retentores_v1.
// Rodar só uma vez, via workflow_dispatch manual (não tem cron).
//
// Mescla com o que já está salvo (não apaga nada da Sabó nem de qualquer
// outra marca já cadastrada) -- evita duplicar por (codigo + marca).

import { readFileSync } from 'fs';

const SUPABASE_URL = 'https://bqbdypizmeirezedvefo.supabase.co';
const MY_USER_ID = 'e526fea4-d04f-4d2f-a700-145ac17b137c';
const CHAVE = 'retentores_v1';

const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_KEY) {
  console.error('Falta a variável de ambiente SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

async function main() {
  const novos = JSON.parse(readFileSync('scripts/dados-freudenberg-retentores.json', 'utf-8'));
  console.log(`Itens no arquivo de importação: ${novos.length}`);

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
