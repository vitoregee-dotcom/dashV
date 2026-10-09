-- ============================================================================================================
-- PartsFlow — 🌐 PORTAL DO CLIENTE (v115.2283)
-- Rodar UMA vez no Supabase: painel → SQL Editor → New query → colar este arquivo inteiro → Run.
-- Pode rodar de novo sem problema (tudo é "if not exists" / "create or replace").
--
-- Como funciona (decisões do Vitor de 09/10/2026):
--  • o vendedor cria usuário + senha do cliente (na ficha do CRM ou em Vendas → 🌐 Portal) — a senha vira hash (bcrypt) aqui;
--  • o cliente entra em /portal, digita código + quantidade e vê SÓ O PREÇO (nada de custo, saldo exato, fornecedor, outros clientes);
--  • o PartsFlow publica a lista de peças COM SALDO (código, marca, descrição, custo) + as conversões de código — o custo fica
--    trancado nestas tabelas (RLS sem política = ninguém lê pelo site); o preço é calculado AQUI no servidor:
--        preço = custo × a ÷ (b − margem)   (a e b = impostos do cliente, gravados no acesso pelo PartsFlow — mesma conta da
--                                             Calculadora de Margem / cotação; margem = da peça, senão a do cliente)
--  • sai sozinha até R$ X e até N itens; acima disso o preço fica ESCONDIDO e o vendedor confere e responde;
--  • tabelas novas: RLS ligado. Leitura interna só pra quem é da empresa (pf_eh_da_empresa()); o cliente só passa pelas funções.
-- ============================================================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------- tabelas ----------
create table if not exists public.portal_config (
  id int primary key default 1 check (id = 1),
  lim_valor numeric not null default 5000,
  lim_itens int not null default 10,
  validade_dias int not null default 3,
  lote_atual uuid,
  publicado_em timestamptz,
  publicado_por text,
  n_itens int default 0,
  publicando_desde timestamptz,
  atualizado_em timestamptz default now()
);
insert into public.portal_config (id) values (1) on conflict (id) do nothing;

create table if not exists public.portal_acessos (
  id uuid primary key default gen_random_uuid(),
  usuario text not null unique,
  senha_hash text not null,
  cliente_ref text,             -- chave do cliente no PartsFlow ('c:CODIGO' ou 'r:RAZÃO')
  cliente_codigo text,
  cliente_nome text,
  contato text,
  contato_tel text,
  vendedor text,
  vendedor_email text,
  uf text,
  condicao text,
  preco_a numeric not null default 0.7735,
  preco_b numeric not null default 0.7875,
  margem numeric not null default 0.21,
  bloqueado boolean not null default false,
  criado_em timestamptz not null default now(),
  criado_por text,
  senha_trocada_em timestamptz default now(),
  ultimo_acesso timestamptz,
  falhas int not null default 0,
  travado_ate timestamptz
);

create table if not exists public.portal_sessoes (
  token uuid primary key default gen_random_uuid(),
  acesso_id uuid not null references public.portal_acessos(id) on delete cascade,
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null default now() + interval '30 days'
);

create table if not exists public.portal_itens (
  lote uuid not null,
  codigo text not null,         -- normalizado (sem espaço/traço/ponto, maiúsculo)
  cod_exib text,
  marca text,
  descricao text,
  custo numeric not null,
  margem numeric,               -- margem da peça (null = usa a do cliente)
  primary key (lote, codigo)
);

create table if not exists public.portal_conversoes (
  lote uuid not null,
  ref text not null,            -- código de outra marca (normalizado)
  codigo text not null,         -- nosso código (normalizado)
  primary key (lote, ref)
);

create table if not exists public.portal_cotacoes (
  id uuid primary key default gen_random_uuid(),
  acesso_id uuid references public.portal_acessos(id) on delete set null,
  cliente_ref text,
  cliente_nome text,
  contato text,
  vendedor_email text,
  criado_em timestamptz not null default now(),
  itens jsonb not null default '[]'::jsonb,
  total numeric default 0,
  n_itens int default 0,
  n_sem_preco int default 0,
  situacao text not null default 'conferir',   -- 'auto' (saiu sozinha) | 'conferir'
  motivo text,
  obs text,
  validade_dias int,
  status text not null default 'nova',          -- 'nova' | 'aberta' (virou cotação no PartsFlow) | 'respondida'
  cotacao_num text,
  aberta_em timestamptz,
  aberta_por text
);
create index if not exists portal_cotacoes_criado_idx on public.portal_cotacoes (criado_em desc);
create index if not exists portal_cotacoes_acesso_idx on public.portal_cotacoes (acesso_id, criado_em desc);

-- ---------- segurança ----------
alter table public.portal_config     enable row level security;
alter table public.portal_acessos    enable row level security;
alter table public.portal_sessoes    enable row level security;
alter table public.portal_itens      enable row level security;
alter table public.portal_conversoes enable row level security;
alter table public.portal_cotacoes   enable row level security;

revoke all on public.portal_config, public.portal_acessos, public.portal_sessoes, public.portal_itens,
              public.portal_conversoes, public.portal_cotacoes from anon, authenticated;
grant select, update on public.portal_config   to authenticated;
-- a senha (hash) não sai nem pra quem é da empresa: só as outras colunas
grant select (id, usuario, cliente_ref, cliente_codigo, cliente_nome, contato, contato_tel, vendedor, vendedor_email, uf, condicao,
  preco_a, preco_b, margem, bloqueado, criado_em, criado_por, senha_trocada_em, ultimo_acesso, falhas, travado_ate)
  on public.portal_acessos to authenticated;
grant select, update on public.portal_cotacoes to authenticated;
-- portal_sessoes / portal_itens / portal_conversoes: sem política = trancadas (só as funções abaixo mexem)

drop policy if exists "empresa le config" on public.portal_config;
create policy "empresa le config" on public.portal_config for select to authenticated using (pf_eh_da_empresa());
drop policy if exists "empresa altera config" on public.portal_config;
create policy "empresa altera config" on public.portal_config for update to authenticated using (pf_eh_da_empresa()) with check (pf_eh_da_empresa());
drop policy if exists "empresa le acessos" on public.portal_acessos;
create policy "empresa le acessos" on public.portal_acessos for select to authenticated using (pf_eh_da_empresa());
drop policy if exists "empresa le cotacoes" on public.portal_cotacoes;
create policy "empresa le cotacoes" on public.portal_cotacoes for select to authenticated using (pf_eh_da_empresa());
drop policy if exists "empresa altera cotacoes" on public.portal_cotacoes;
create policy "empresa altera cotacoes" on public.portal_cotacoes for update to authenticated using (pf_eh_da_empresa()) with check (pf_eh_da_empresa());

-- ---------- funções internas ----------
create or replace function public.pf_portal_norm(t text) returns text
language sql immutable as $$ select upper(regexp_replace(coalesce(t,''), '[\s\-\.\/]', '', 'g')) $$;

-- sessão válida → acesso (null se não vale)
create or replace function public.pf_portal_sessao(p_token uuid) returns public.portal_acessos
language plpgsql security definer set search_path = public, extensions as $$
declare a public.portal_acessos;
begin
  select ac.* into a from public.portal_sessoes s join public.portal_acessos ac on ac.id = s.acesso_id
   where s.token = p_token and s.expira_em > now() and not ac.bloqueado;
  return a;
end $$;
revoke all on function public.pf_portal_sessao(uuid) from public, anon, authenticated;

-- preço de cada linha pra esse acesso (lista [{cod,qtd}]) + regra do limite
create or replace function public.pf_portal_calcular(a public.portal_acessos, p_itens jsonb) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  cfg public.portal_config; r jsonb; out jsonb := '[]'::jsonb; n text; it public.portal_itens; via boolean;
  q numeric; pr numeric; m numeric; total numeric := 0; n_lin int := 0; n_sem int := 0; acima boolean; motivo text := null;
begin
  select * into cfg from public.portal_config where id = 1;
  for r in select * from jsonb_array_elements(coalesce(p_itens, '[]'::jsonb)) limit 300 loop
    n := pf_portal_norm(r->>'cod'); if n = '' then continue; end if;
    q := greatest(1, coalesce(nullif(replace(regexp_replace(coalesce(r->>'qtd', '1'), '[^0-9,.]', '', 'g'), ',', '.'), '')::numeric, 1));
    n_lin := n_lin + 1; via := false; it := null;
    if cfg.lote_atual is not null then
      select * into it from public.portal_itens where lote = cfg.lote_atual and codigo = n;
      if it.codigo is null then
        select i.* into it from public.portal_conversoes c join public.portal_itens i on i.lote = c.lote and i.codigo = c.codigo
         where c.lote = cfg.lote_atual and c.ref = n limit 1;
        via := it.codigo is not null;
      end if;
      if it.codigo is null and n ~ '^0+[0-9]' then
        select * into it from public.portal_itens where lote = cfg.lote_atual and codigo = regexp_replace(n, '^0+', '');
      end if;
    end if;
    if it.codigo is null then
      n_sem := n_sem + 1;
      out := out || jsonb_build_array(jsonb_build_object('cod', r->>'cod', 'qtd', q, 'achou', false));
    else
      m := coalesce(it.margem, a.margem);
      if a.preco_b - m > 0.05 then pr := round(it.custo * a.preco_a / (a.preco_b - m), 2); else pr := round(it.custo * 1.5, 2); end if;
      total := total + pr * q;
      out := out || jsonb_build_array(jsonb_build_object('cod', r->>'cod', 'qtd', q, 'achou', true, 'via', via,
               'codigo', it.cod_exib, 'marca', it.marca, 'descricao', it.descricao, 'preco', pr));
    end if;
  end loop;
  acima := (total > cfg.lim_valor) or ((n_lin - n_sem) > cfg.lim_itens);
  if total > cfg.lim_valor then motivo := 'acima de R$ ' || replace(to_char(cfg.lim_valor, 'FM999,999,990'), ',', '.');
  elsif (n_lin - n_sem) > cfg.lim_itens then motivo := 'acima de ' || cfg.lim_itens || ' itens'; end if;
  if acima then  -- acima do limite: o preço fica escondido (o vendedor confere e responde)
    out := (select coalesce(jsonb_agg(e - 'preco'), '[]'::jsonb) from jsonb_array_elements(out) e);
  end if;
  return jsonb_build_object('itens', out, 'total', case when acima then null else round(total, 2) end, 'acima', acima, 'motivo', motivo,
    'n_itens', n_lin, 'n_sem_preco', n_sem, 'lim_valor', cfg.lim_valor, 'lim_itens', cfg.lim_itens, 'validade_dias', cfg.validade_dias,
    'atualizado', cfg.publicado_em, '_total_real', round(total, 2));
end $$;
revoke all on function public.pf_portal_calcular(public.portal_acessos, jsonb) from public, anon, authenticated;

-- ---------- funções do CLIENTE (anon) ----------
create or replace function public.pf_portal_login(p_usuario text, p_senha text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare a public.portal_acessos; cfg public.portal_config; tk uuid;
begin
  select * into a from public.portal_acessos where usuario = lower(trim(coalesce(p_usuario, '')));
  if a.id is null then perform pg_sleep(0.4); return jsonb_build_object('erro', 'login'); end if;
  if a.travado_ate is not null and a.travado_ate > now() then return jsonb_build_object('erro', 'travado'); end if;
  if a.senha_hash <> crypt(coalesce(p_senha, ''), a.senha_hash) then
    update public.portal_acessos set falhas = case when falhas + 1 >= 8 then 0 else falhas + 1 end,
      travado_ate = case when falhas + 1 >= 8 then now() + interval '15 minutes' else travado_ate end where id = a.id;
    perform pg_sleep(0.4);
    return jsonb_build_object('erro', 'login');
  end if;
  if a.bloqueado then return jsonb_build_object('erro', 'bloqueado'); end if;
  update public.portal_acessos set falhas = 0, travado_ate = null, ultimo_acesso = now() where id = a.id;
  delete from public.portal_sessoes where expira_em < now();
  insert into public.portal_sessoes (acesso_id) values (a.id) returning token into tk;
  select * into cfg from public.portal_config where id = 1;
  return jsonb_build_object('token', tk, 'cliente', a.cliente_nome, 'contato', a.contato, 'condicao', a.condicao,
    'lim_valor', cfg.lim_valor, 'lim_itens', cfg.lim_itens, 'validade_dias', cfg.validade_dias);
end $$;

create or replace function public.pf_portal_eu(p_token uuid) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare a public.portal_acessos; cfg public.portal_config;
begin
  a := pf_portal_sessao(p_token); if a.id is null then return jsonb_build_object('erro', 'sessao'); end if;
  update public.portal_acessos set ultimo_acesso = now() where id = a.id;
  select * into cfg from public.portal_config where id = 1;
  return jsonb_build_object('cliente', a.cliente_nome, 'contato', a.contato, 'condicao', a.condicao,
    'lim_valor', cfg.lim_valor, 'lim_itens', cfg.lim_itens, 'validade_dias', cfg.validade_dias);
end $$;

create or replace function public.pf_portal_cotar(p_token uuid, p_itens jsonb) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare a public.portal_acessos;
begin
  a := pf_portal_sessao(p_token); if a.id is null then return jsonb_build_object('erro', 'sessao'); end if;
  return pf_portal_calcular(a, p_itens) - '_total_real';
end $$;

create or replace function public.pf_portal_enviar(p_token uuid, p_itens jsonb, p_obs text default null) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare a public.portal_acessos; c jsonb; sit text; id uuid; recentes int;
begin
  a := pf_portal_sessao(p_token); if a.id is null then return jsonb_build_object('erro', 'sessao'); end if;
  select count(*) into recentes from public.portal_cotacoes where acesso_id = a.id and criado_em > now() - interval '1 hour';
  if recentes >= 30 then return jsonb_build_object('erro', 'muitas'); end if;
  c := pf_portal_calcular(a, p_itens);
  if coalesce((c->>'n_itens')::int, 0) = 0 then return jsonb_build_object('erro', 'vazia'); end if;
  sit := case when (c->>'acima')::boolean then 'conferir' else 'auto' end;
  insert into public.portal_cotacoes (acesso_id, cliente_ref, cliente_nome, contato, vendedor_email, itens, total, n_itens, n_sem_preco,
      situacao, motivo, obs, validade_dias)
    values (a.id, a.cliente_ref, a.cliente_nome, a.contato, a.vendedor_email, c->'itens', (c->>'_total_real')::numeric,
      (c->>'n_itens')::int, (c->>'n_sem_preco')::int, sit, c->>'motivo', left(coalesce(p_obs, ''), 1000), (c->>'validade_dias')::int)
    returning portal_cotacoes.id into id;
  return jsonb_build_object('id', id, 'situacao', sit, 'motivo', c->>'motivo', 'total', c->'total', 'itens', c->'itens');
end $$;

create or replace function public.pf_portal_minhas(p_token uuid) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare a public.portal_acessos;
begin
  a := pf_portal_sessao(p_token); if a.id is null then return jsonb_build_object('erro', 'sessao'); end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'criado_em', x.criado_em, 'n_itens', x.n_itens,
      'total', case when x.situacao = 'auto' then x.total else null end, 'situacao', x.situacao, 'status', x.status, 'motivo', x.motivo,
      'cotacao_num', x.cotacao_num, 'itens', x.itens) order by x.criado_em desc)
    from (select * from public.portal_cotacoes where acesso_id = a.id order by criado_em desc limit 30) x), '[]'::jsonb);
end $$;

create or replace function public.pf_portal_sair(p_token uuid) returns void
language sql security definer set search_path = public, extensions as $$ delete from public.portal_sessoes where token = p_token $$;

-- ---------- funções do PARTSFLOW (logado e da empresa) ----------
create or replace function public.pf_portal_acesso_salvar(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid; u text; s text;
begin
  if not pf_eh_da_empresa() then raise exception 'sem permissão'; end if;
  u := lower(trim(coalesce(p->>'usuario', ''))); s := coalesce(p->>'senha', '');
  if p ? 'id' and nullif(p->>'id', '') is not null then
    v_id := (p->>'id')::uuid;
    if u <> '' and exists (select 1 from public.portal_acessos where usuario = u and id <> v_id) then return jsonb_build_object('erro', 'usuario_existe'); end if;
    update public.portal_acessos set
      usuario       = case when u <> '' then u else usuario end,
      cliente_ref   = coalesce(p->>'cliente_ref', cliente_ref),
      cliente_codigo= coalesce(p->>'cliente_codigo', cliente_codigo),
      cliente_nome  = coalesce(p->>'cliente_nome', cliente_nome),
      contato       = coalesce(p->>'contato', contato),
      contato_tel   = coalesce(p->>'contato_tel', contato_tel),
      vendedor      = coalesce(p->>'vendedor', vendedor),
      vendedor_email= coalesce(p->>'vendedor_email', vendedor_email),
      uf            = coalesce(p->>'uf', uf),
      condicao      = coalesce(p->>'condicao', condicao),
      preco_a       = coalesce((p->>'preco_a')::numeric, preco_a),
      preco_b       = coalesce((p->>'preco_b')::numeric, preco_b),
      margem        = coalesce((p->>'margem')::numeric, margem),
      bloqueado     = coalesce((p->>'bloqueado')::boolean, bloqueado),
      senha_hash    = case when s <> '' then crypt(s, gen_salt('bf')) else senha_hash end,
      senha_trocada_em = case when s <> '' then now() else senha_trocada_em end,
      falhas = case when s <> '' then 0 else falhas end, travado_ate = case when s <> '' then null else travado_ate end
    where id = v_id;
    if s <> '' or coalesce((p->>'bloqueado')::boolean, false) then delete from public.portal_sessoes where acesso_id = v_id; end if;
  else
    if u = '' or length(s) < 6 then return jsonb_build_object('erro', 'dados'); end if;
    if exists (select 1 from public.portal_acessos where usuario = u) then return jsonb_build_object('erro', 'usuario_existe'); end if;
    insert into public.portal_acessos (usuario, senha_hash, cliente_ref, cliente_codigo, cliente_nome, contato, contato_tel, vendedor, vendedor_email,
        uf, condicao, preco_a, preco_b, margem, criado_por)
      values (u, crypt(s, gen_salt('bf')), p->>'cliente_ref', p->>'cliente_codigo', p->>'cliente_nome', p->>'contato', p->>'contato_tel',
        p->>'vendedor', p->>'vendedor_email', p->>'uf', p->>'condicao', coalesce((p->>'preco_a')::numeric, 0.7735),
        coalesce((p->>'preco_b')::numeric, 0.7875), coalesce((p->>'margem')::numeric, 0.21), p->>'criado_por')
      returning id into v_id;
  end if;
  return jsonb_build_object('id', v_id);
end $$;

create or replace function public.pf_portal_acesso_apagar(p_id uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not pf_eh_da_empresa() then raise exception 'sem permissão'; end if;
  delete from public.portal_acessos where id = p_id;
end $$;

-- publicar a lista de peças: inicio → itens/conversões em pedaços → fim (troca de lote de uma vez só)
create or replace function public.pf_portal_publicar_inicio(p_forcar boolean default false) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare cfg public.portal_config; l uuid := gen_random_uuid();
begin
  if not pf_eh_da_empresa() then raise exception 'sem permissão'; end if;
  select * into cfg from public.portal_config where id = 1 for update;
  if not p_forcar and cfg.publicando_desde is not null and cfg.publicando_desde > now() - interval '10 minutes' then
    return jsonb_build_object('ocupado', true);
  end if;
  update public.portal_config set publicando_desde = now() where id = 1;
  delete from public.portal_itens where lote is distinct from cfg.lote_atual;
  delete from public.portal_conversoes where lote is distinct from cfg.lote_atual;
  return jsonb_build_object('lote', l);
end $$;

create or replace function public.pf_portal_publicar_itens(p_lote uuid, p_itens jsonb) returns int
language plpgsql security definer set search_path = public, extensions as $$
declare n int;
begin
  if not pf_eh_da_empresa() then raise exception 'sem permissão'; end if;
  insert into public.portal_itens (lote, codigo, cod_exib, marca, descricao, custo, margem)
    select p_lote, pf_portal_norm(e->>0), e->>1, e->>2, e->>3, (e->>4)::numeric, nullif(e->>5, '')::numeric
      from jsonb_array_elements(p_itens) e
     where pf_portal_norm(e->>0) <> '' and (e->>4)::numeric > 0
  on conflict (lote, codigo) do update set custo = least(portal_itens.custo, excluded.custo);
  get diagnostics n = row_count; return n;
end $$;

create or replace function public.pf_portal_publicar_conv(p_lote uuid, p_conv jsonb) returns int
language plpgsql security definer set search_path = public, extensions as $$
declare n int;
begin
  if not pf_eh_da_empresa() then raise exception 'sem permissão'; end if;
  insert into public.portal_conversoes (lote, ref, codigo)
    select p_lote, pf_portal_norm(e->>0), pf_portal_norm(e->>1) from jsonb_array_elements(p_conv) e
     where pf_portal_norm(e->>0) <> '' and pf_portal_norm(e->>1) <> ''
  on conflict (lote, ref) do nothing;
  get diagnostics n = row_count; return n;
end $$;

create or replace function public.pf_portal_publicar_fim(p_lote uuid, p_por text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare n int;
begin
  if not pf_eh_da_empresa() then raise exception 'sem permissão'; end if;
  select count(*) into n from public.portal_itens where lote = p_lote;
  if n = 0 then raise exception 'lote vazio'; end if;
  update public.portal_config set lote_atual = p_lote, publicado_em = now(), publicado_por = p_por, n_itens = n,
    publicando_desde = null, atualizado_em = now() where id = 1;
  delete from public.portal_itens where lote <> p_lote;
  delete from public.portal_conversoes where lote <> p_lote;
  return jsonb_build_object('n', n);
end $$;

-- ---------- quem pode chamar o quê ----------
revoke all on function public.pf_portal_login(text, text), public.pf_portal_eu(uuid), public.pf_portal_cotar(uuid, jsonb),
  public.pf_portal_enviar(uuid, jsonb, text), public.pf_portal_minhas(uuid), public.pf_portal_sair(uuid),
  public.pf_portal_acesso_salvar(jsonb), public.pf_portal_acesso_apagar(uuid), public.pf_portal_publicar_inicio(boolean),
  public.pf_portal_publicar_itens(uuid, jsonb), public.pf_portal_publicar_conv(uuid, jsonb), public.pf_portal_publicar_fim(uuid, text)
  from public;
grant execute on function public.pf_portal_login(text, text), public.pf_portal_eu(uuid), public.pf_portal_cotar(uuid, jsonb),
  public.pf_portal_enviar(uuid, jsonb, text), public.pf_portal_minhas(uuid), public.pf_portal_sair(uuid) to anon, authenticated;
grant execute on function public.pf_portal_acesso_salvar(jsonb), public.pf_portal_acesso_apagar(uuid), public.pf_portal_publicar_inicio(boolean),
  public.pf_portal_publicar_itens(uuid, jsonb), public.pf_portal_publicar_conv(uuid, jsonb), public.pf_portal_publicar_fim(uuid, text)
  to authenticated;

notify pgrst, 'reload schema';
