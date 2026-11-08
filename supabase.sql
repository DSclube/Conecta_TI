-- Rode no SQL Editor do Supabase.
-- Se você já rodou a versão anterior, apague a tabela antes: drop table public.edicoes;

create table public.edicoes (
  id uuid primary key default gen_random_uuid(),
  numero int not null,
  ano int not null default 1,
  publicada_em date not null default current_date,
  -- { principal, secundarias[], eventos[], tecnologia[], datas[], extras[] }
  conteudo jsonb not null default '{}',
  curtidas int not null default 0,
  created_at timestamptz not null default now()
);
create index on public.edicoes (publicada_em desc);

create table if not exists public.admins (user_id uuid primary key references auth.users(id) on delete cascade);

create or replace function public.is_admin() returns boolean
language sql security definer set search_path = '' stable
as $$ select exists (select 1 from public.admins where user_id = (select auth.uid())) $$;

alter table public.edicoes enable row level security;
alter table public.admins enable row level security;

create policy "leitura publica" on public.edicoes for select using (true);
create policy "admin insere" on public.edicoes for insert to authenticated with check ((select public.is_admin()));
create policy "admin altera" on public.edicoes for update to authenticated using ((select public.is_admin()));
create policy "admin apaga" on public.edicoes for delete to authenticated using ((select public.is_admin()));

create or replace function public.curtir(p_id uuid) returns void
language sql security definer set search_path = ''
as $$ update public.edicoes set curtidas = curtidas + 1 where id = p_id $$;
create or replace function public.descurtir(p_id uuid) returns void
language sql security definer set search_path = ''
as $$ update public.edicoes set curtidas = greatest(curtidas - 1, 0) where id = p_id $$;
grant execute on function public.curtir(uuid), public.descurtir(uuid) to anon, authenticated;

-- Apaga edições com mais de 5 meses, todo dia às 03:00 UTC
create extension if not exists pg_cron;
select cron.schedule('apagar-edicoes-antigas', '0 3 * * *',
  $$ delete from public.edicoes where publicada_em < current_date - interval '5 months' $$);

-- Depois de criar o usuário em Authentication > Users:
-- insert into public.admins (user_id) values ('ID-DO-USUARIO');

-- Métricas por notícia: curtidas e visualizações compartilhadas entre usuários.
create table if not exists public.noticia_metricas (
  id text primary key,
  curtidas integer not null default 0 check (curtidas >= 0),
  visualizacoes integer not null default 0 check (visualizacoes >= 0)
);

alter table public.noticia_metricas enable row level security;
drop policy if exists "leitura publica de metricas" on public.noticia_metricas;
create policy "leitura publica de metricas" on public.noticia_metricas for select using (true);

create or replace function public.curtir_noticia(p_id text) returns void
language plpgsql security definer set search_path = ''
as $$ begin
  if length(p_id) > 300 then raise exception 'Identificador de notícia inválido'; end if;
  insert into public.noticia_metricas (id, curtidas) values (p_id, 1)
  on conflict (id) do update set curtidas = public.noticia_metricas.curtidas + 1;
end $$;

create or replace function public.descurtir_noticia(p_id text) returns void
language sql security definer set search_path = ''
as $$ update public.noticia_metricas set curtidas = greatest(curtidas - 1, 0) where id = p_id $$;

create or replace function public.visualizar_noticia(p_id text) returns void
language plpgsql security definer set search_path = ''
as $$ begin
  if length(p_id) > 300 then raise exception 'Identificador de notícia inválido'; end if;
  insert into public.noticia_metricas (id, visualizacoes) values (p_id, 1)
  on conflict (id) do update set visualizacoes = public.noticia_metricas.visualizacoes + 1;
end $$;

grant execute on function public.curtir_noticia(text), public.descurtir_noticia(text), public.visualizar_noticia(text) to anon, authenticated;
