create or replace function public.get_ranking_rows()
returns table (
  user_id uuid,
  full_name text,
  match_id text,
  score_a int,
  score_b int
)
language sql
security definer
set search_path = public
as $$
  select
    p.user_id,
    coalesce(pr.full_name, 'Sem nome') as full_name,
    p.match_id,
    p.score_a,
    p.score_b
  from public.predictions p
  left join public.profiles pr on pr.id = p.user_id
  order by p.user_id, p.match_id;
$$;

revoke all on function public.get_ranking_rows() from public;
grant execute on function public.get_ranking_rows() to authenticated;
