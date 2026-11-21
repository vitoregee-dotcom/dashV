# 🪐 Órbita — cor por LINHA + botão do WhatsApp (A + B + C + D)

Pedido do Vitor (21/11/2026): "deixar na órbita as cores das linhas (amarelo = linha amarela, verde = agrícola…), igual no cadastro dos
clientes. E no botão de WhatsApp: quando eu apertar, mostrar quem está em contato no WhatsApp (aparece o logo ou não), mas quero poder ocultar."

**Simulador (ver antes):** `docs/referencias/orbita-linhas/simulador.html`
— online: https://vitoregee-dotcom.github.io/dashV/docs/referencias/orbita-linhas/simulador.html

## O que JÁ existe (v115.2818, não refazer)
- Cor do planeta = linha (grupo) do cliente: `pfGrupoInfo(x.grupo).cor`, padrão `window._pfOrbCorPor` = '' (grupo); "Cor: situação" é a opção.
  2D em `pfOrbDesenhar` (procurar `if(window._pfOrbCorPor!=='situacao'){var gi=pfGrupoInfo(x.grupo)`), 3D no loop de sprites (`pfOrb3DTexPlaneta(cor,…)`).
- `x.grupo` vem de `pfGrupoDe(c.cad)` = só `cad.grupo` (1 linha). Linhas em `PF_GRUPOS` {k,label,cor,txt,em}.
- `x.wa` (no `pfOrbDados`): conversou no WhatsApp nos últimos `PF_ORB_WA_DIAS`=30 e não é verde → logo `pfOrbWaImg()` (pack 384) no 2D e
  `pfOrb3DTexWa()` no 3D; chip "em contato" = filtro `'wa'` em `pfOrbPassa`.
- ✨ Enfeites (`pfOrbEnfeites`/`pfOrbEnfeitesSet`, localStorage `pf_orb_enfeites`) é o modelo de liga/desliga a seguir.

## O que fazer

### A — botão 💬 WhatsApp (mostrar/ocultar o logo)
- `pfOrbWaLogo()` / `pfOrbWaLogoSet(v)`: guarda POR USUÁRIO (sobrevive ao Sair) — acrescentar `wa` no `pfOrbPrefs_v1` {d3,estilo,ts}
  (`pfOrbPrefs`/`pfOrbPrefsSet`, já sincroniza por usuário). Padrão = ligado.
- Botão no cabeçalho da Órbita, ao lado dos contadores: pílula verde "💬" acesa quando ligado (cinza quando desligado), title
  "Mostrar/ocultar quem está em contato no WhatsApp". Clique → `pfOrbWaLogoSet(!atual)` → `pfOrbitaRender()`.
- No 2D (`if(ok&&x.wa){var wim=pfOrbWaImg()…`) e no 3D (`if(ok&&x.wa){var wt=pfOrb3DTexWa()…`): acrescentar `&&pfOrbWaLogo()`.
- O chip "em contato" (filtro) continua igual.

### B — legenda das linhas com quantidade (clicável)
- Faixa embaixo do quadro da Órbita (2D e 3D): uma pílula por linha do `PF_GRUPOS` na cor dela (texto `txt`) + "⚪ Sem linha N".
  Conta sobre a lista já filtrada pelos filtros de cima (vendedor/tipo/etc.); cliente com 2 linhas conta nas duas.
- Clique = filtro `window._pfOrbLinha` (k ou 'sem'); clique de novo tira. Os outros planetas ficam apagados (mesmo jeito do `pfOrbPassa`):
  em `pfOrbPassa` acrescentar `if(window._pfOrbLinha){…}` (sem = cliente sem nenhuma linha). Pílula acesa com contorno branco, as outras apagadas.
- `pfOrbFiltrosLimpar` também zera `_pfOrbLinha`. Entra na contagem de filtros ligados (`_fN`) e no "↺ Ver tudo".
- "⚪ Sem linha" é o atalho pra arrumar o cadastro: o balão do cliente (`pfOrbTipHtml`) ganha "🏷️ marcar linha ›" quando não tem → abre o cadastro
  do cliente (`pfCotAbrirCadastroCli` ou o caminho `cadGoTab('clientes')` + `cadEditCliente(i)`).

### C — cliente com mais de uma linha = planeta dividido
- No `pfOrbDados`: `x.grupos` = `cad.grupos` (array, v115.2653) filtrado pelas chaves que existem no `PF_GRUPOS`; vazio → `[cad.grupo]` se tiver.
  Mantém `x.grupo` = o 1º (o resto do sistema usa).
- 2D: em vez de um círculo de uma cor, fatias iguais (setores de arco a partir do topo) com a cor de cada linha; o brilho/gradiente branco por cima
  continua (ver `planeta()` no simulador). 1 linha = igual hoje.
- 3D: `pfOrb3DTexPlaneta(cor,…)` aceita array de cores (desenha as fatias no canvas da textura). Cache da textura pela chave das cores juntas.
- "Cor: situação" continua ignorando as linhas.

### D — linha sugerida (sem linha marcada)
- Só quando o cliente não tem linha: sugestão = `pfGrupoSugerido(cad)` (texto do cadastro); se vazio, pela compra dos últimos 12 meses:
  família das peças (`PF_NC_FAMILIAS`/`pfPerfilFamDe`) → linha (cardan/material rodante/esteira = amarela; filtros de trator/colheitadeira = agrícola;
  diferencial/caminhão = rodoviário…). Precisa de 60%+ do valor numa linha, senão fica sem.
- Planeta na cor sugerida com CONTORNO TRACEJADO branco; balão: "sugerido: Linha Amarela — confirme no cadastro". Na legenda: "(+N sugerido)".
- NÃO grava no cadastro sozinho.

## Depois de fazer
- Subir a versão (2 lugares), comentário `// v115.NNNN - A pedido do Vitor: …`, nota no CLAUDE.md (seção Órbita) e linha/atualização no `PF_FUNCOES`
  ('Órbita', v = nova versão).
- Testar 2D e 3D (3D aqui: three@0.128.0 do npm pelo `page.route` + Chromium `--use-angle=swiftshader --enable-unsafe-swiftshader`), com o
  modo demonstração e com cliente de 0, 1 e 2 linhas; conferir que o "Cor: situação" ainda funciona.
