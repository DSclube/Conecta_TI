-- Setup inicial do Connecta TI (banco, acesso administrativo e métricas).
-- 1. No Supabase Auth, crie a conta administradora e desative novos cadastros públicos.
-- 2. Execute este arquivo no SQL Editor para criar tabelas, RLS e vincular o administrador.
-- A senha é gerenciada e armazenada com hash pelo Supabase Auth; nunca a inclua neste SQL.

create extension if not exists pgcrypto;

create table if not exists public.edicoes (
  id uuid primary key default gen_random_uuid(),
  numero integer not null check (numero > 0),
  ano integer not null default 1 check (ano > 0),
  publicada_em date not null default current_date,
  -- Estrutura JSON: principal, secundarias[], eventos[], tecnologia[], datas[], extras[]
  conteudo jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (ano, numero)
);
create index if not exists edicoes_publicada_em_idx on public.edicoes (publicada_em desc);

-- slot=true como chave primária permite no máximo um administrador.
create table if not exists public.admins (
  slot boolean primary key default true check (slot),
  user_id uuid not null unique references auth.users(id) on delete cascade
);

create or replace function public.is_admin() returns boolean
language sql security definer stable set search_path = ''
as $$ select exists (
  select 1 from public.admins where slot = true and user_id = (select auth.uid())
) $$;

alter table public.edicoes enable row level security;
alter table public.admins enable row level security;

drop policy if exists "leitura publica" on public.edicoes;
create policy "leitura publica" on public.edicoes for select using (true);
drop policy if exists "admin insere" on public.edicoes;
create policy "admin insere" on public.edicoes for insert to authenticated with check ((select public.is_admin()));
drop policy if exists "admin altera" on public.edicoes;
create policy "admin altera" on public.edicoes for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "admin apaga" on public.edicoes;
create policy "admin apaga" on public.edicoes for delete to authenticated using ((select public.is_admin()));

grant select on public.edicoes to anon, authenticated;
grant insert, update, delete on public.edicoes to authenticated;
revoke all on public.admins from anon, authenticated;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Métricas agregadas por edição e notícia.
create table if not exists public.noticia_metricas (
  id text primary key,
  curtidas integer not null default 0 check (curtidas >= 0),
  visualizacoes integer not null default 0 check (visualizacoes >= 0)
);
alter table public.noticia_metricas enable row level security;
drop policy if exists "leitura publica de metricas" on public.noticia_metricas;
create policy "leitura publica de metricas" on public.noticia_metricas for select using (true);
grant select on public.noticia_metricas to anon, authenticated;

create or replace function public.curtir_noticia(p_id text) returns void
language plpgsql security definer set search_path = ''
as $$ begin
  if p_id is null or length(p_id) > 300 then raise exception 'Identificador de notícia inválido'; end if;
  insert into public.noticia_metricas (id, curtidas) values (p_id, 1)
  on conflict (id) do update set curtidas = public.noticia_metricas.curtidas + 1;
end $$;

create or replace function public.descurtir_noticia(p_id text) returns void
language plpgsql security definer set search_path = ''
as $$ begin
  if p_id is null or length(p_id) > 300 then raise exception 'Identificador de notícia inválido'; end if;
  update public.noticia_metricas set curtidas = greatest(curtidas - 1, 0) where id = p_id;
end $$;

create or replace function public.visualizar_noticia(p_id text) returns void
language plpgsql security definer set search_path = ''
as $$ begin
  if p_id is null or length(p_id) > 300 then raise exception 'Identificador de notícia inválido'; end if;
  insert into public.noticia_metricas (id, visualizacoes) values (p_id, 1)
  on conflict (id) do update set visualizacoes = public.noticia_metricas.visualizacoes + 1;
end $$;

revoke all on function public.curtir_noticia(text) from public;
revoke all on function public.descurtir_noticia(text) from public;
revoke all on function public.visualizar_noticia(text) from public;
grant execute on function public.curtir_noticia(text), public.descurtir_noticia(text), public.visualizar_noticia(text) to anon, authenticated;

-- Vincula o único usuário criado em Supabase Auth ao perfil administrador.
-- Se executar o arquivo antes de criar o usuário, execute este comando depois:
insert into public.admins (user_id)
select id from auth.users where lower(email) = lower('ds.clube00@gmail.com')
on conflict do nothing;
