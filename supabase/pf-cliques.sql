-- v115.2429 - Cliques dos usuários (Sessões → 🖱 Cliques). Rodar 1x no SQL Editor do Supabase.
create table if not exists public.pf_cliques(
  id bigserial primary key,
  criado_em timestamptz not null default now(),
  em timestamptz,
  user_id uuid not null default auth.uid(),
  email text,
  sessao uuid,
  tela text,
  janela text,
  acao text,
  extra text
);
create index if not exists pf_cliques_em_idx on public.pf_cliques(criado_em desc);
alter table public.pf_cliques enable row level security;
drop policy if exists "empresa grava o proprio clique" on public.pf_cliques;
create policy "empresa grava o proprio clique" on public.pf_cliques for insert to authenticated with check (user_id = auth.uid() and pf_eh_da_empresa());
drop policy if exists "so admin le cliques" on public.pf_cliques;
create policy "so admin le cliques" on public.pf_cliques for select to authenticated using (pf_eh_admin());
select cron.schedule('pf_cliques_limpar','23 4 * * *',$$delete from public.pf_cliques where criado_em < now() - interval '90 days'$$);
