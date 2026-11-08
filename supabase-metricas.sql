-- Migração para adicionar curtidas e visualizações por notícia a uma instalação existente.
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
