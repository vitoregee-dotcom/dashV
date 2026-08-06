// Analisa (SEM GRAVAR NADA) o cruzamento entre a tabela "Aplicação por
// montadora e veículo" do catálogo Spicer e o cadastro atual de
// Componentes Cardan no Supabase. Gera um relatório de qualidade
// (scripts/relatorio-spicer-aplicacao.json) pra revisão antes de qualquer
// gravação de verdade.
import { readFileSync, writeFileSync } from 'fs';

const SB_URL = 'https://bqbdypizmeirezedvefo.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MY_USER_ID = 'e526fea4-d04f-4d2f-a700-145ac17b137c';

if (!SERVICE_KEY) {
  console.error('Faltou SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

async function sbFetch(path) {
  const r = await fetch(SB_URL + path, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: 'Bearer ' + SERVICE_KEY,
    },
  });
  if (!r.ok) throw new Error('Supabase fetch failed: ' + r.status + ' ' + (await r.text()));
  return r.json();
}

const CC_NOME_SINGULAR = {
  luvas: 'Luva',
  garfos: 'Garfo',
  ponteiras: 'Ponteira',
  terminais: 'Terminal',
  flangesOrelha: 'Flange de Orelha',
  pontuvas: 'Pontuva',
  cruzetas: 'Cruzeta',
  flangesAcoplamento: 'Flange de Acoplamento',
  conjuntos: 'Conjunto',
};

// Colunas do catálogo Spicer que entram no cruzamento (mancal_central fica
// de fora por enquanto -- não existe família correspondente no cadastro).
const COLUNAS_PARA_CRUZAR = [
  'terminal_cambio', 'flange_orelhas', 'luva_cambio', 'cruzeta', 'garfo',
  'ponteira_fixa', 'acopl_cardan', 'luva_cardan_pontuva',
  'ponteira_desliz_luveira', 'acopl_diferencial',
];

function limparCodigo(v) {
  if (!v) return '';
  // remove sufixo tipo " [TCd]", " [LCd]" etc
  return v.replace(/\s*\[[^\]]+\]\s*$/, '').trim();
}

function acharItem(dados, cod) {
  cod = String(cod || '').trim();
  if (!cod) return null;
  for (const chave in CC_NOME_SINGULAR) {
    const lista = dados[chave];
    if (!lista) continue;
    for (const it of lista) {
      if (!it) continue;
      if (it.codigo === cod || it.similar === cod || it.substitui === cod) {
        return { familia: CC_NOME_SINGULAR[chave], chave, item: it };
      }
    }
  }
  return null;
}

async function main() {
  console.log('Buscando cadastro atual de Componentes Cardan...');
  const rows = await sbFetch(
    `/rest/v1/user_cadastros?user_id=eq.${MY_USER_ID}&tipo=eq.componentes_cardan_v1&select=dados`
  );
  if (!rows.length) throw new Error('componentes_cardan_v1 não encontrado no Supabase');
  const dados = JSON.parse(rows[0].dados);
  console.log('Famílias carregadas:', Object.keys(dados).map(k => `${k}:${(dados[k]||[]).length}`).join(', '));

  const registros = JSON.parse(readFileSync('scripts/dados-spicer-aplicacao.json', 'utf8'));
  console.log('Linhas Spicer a cruzar:', registros.length);

  const statsColuna = {};
  for (const c of COLUNAS_PARA_CRUZAR) statsColuna[c] = { total: 0, achados: 0, naoAchados: new Set() };

  const gruposMatch = []; // amostra de grupos com >=2 itens já cadastrados
  let totalGruposComMatch = 0;

  for (const row of registros) {
    const achadosNoGrupo = [];
    for (const c of COLUNAS_PARA_CRUZAR) {
      const raw = row[c];
      if (!raw) continue;
      const cod = limparCodigo(raw);
      if (!cod) continue;
      statsColuna[c].total++;
      const info = acharItem(dados, cod);
      if (info) {
        statsColuna[c].achados++;
        achadosNoGrupo.push({ coluna: c, codigoSpicer: cod, familia: info.familia, codigoItem: info.item.codigo });
      } else {
        statsColuna[c].naoAchados.add(cod);
      }
    }
    if (achadosNoGrupo.length >= 2) {
      totalGruposComMatch++;
      if (gruposMatch.length < 25) {
        gruposMatch.push({
          veiculo: row.veiculo, anos: row.anos, posicao_tipo: row.posicao_tipo,
          itensEncontrados: achadosNoGrupo,
        });
      }
    }
  }

  const relatorio = {
    geradoEm: new Date().toISOString(),
    totalLinhasSpicer: registros.length,
    familiasNoCadastro: Object.fromEntries(Object.keys(dados).map(k => [k, (dados[k]||[]).length])),
    porColuna: Object.fromEntries(Object.entries(statsColuna).map(([c, s]) => [
      c, {
        totalCodigos: s.total,
        achadosNoCadastro: s.achados,
        naoAchados: s.naoAchados.size,
        amostraNaoAchados: Array.from(s.naoAchados).slice(0, 15),
      },
    ])),
    totalGruposComPeloMenos2ItensJaCadastrados: totalGruposComMatch,
    amostraGruposComMatch: gruposMatch,
  };

  writeFileSync('scripts/relatorio-spicer-aplicacao.json', JSON.stringify(relatorio, null, 2));
  console.log('Relatório gravado em scripts/relatorio-spicer-aplicacao.json');
  console.log('Grupos com >=2 itens já cadastrados:', totalGruposComMatch);
}

main().catch(e => { console.error(e); process.exit(1); });
