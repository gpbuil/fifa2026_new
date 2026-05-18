create table if not exists public.team_discipline (
  team_id text primary key,
  conduct_score integer,
  draw_order integer,
  updated_at timestamp with time zone default now(),
  updated_by uuid references auth.users(id)
);

grant all on table public.team_discipline to anon;
grant all on table public.team_discipline to authenticated;
grant all on table public.team_discipline to service_role;

alter table public.team_discipline enable row level security;

drop policy if exists team_discipline_read on public.team_discipline;
create policy team_discipline_read
  on public.team_discipline
  for select
  using (true);

drop policy if exists team_discipline_admin_insert on public.team_discipline;
create policy team_discipline_admin_insert
  on public.team_discipline
  for insert
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

drop policy if exists team_discipline_admin_update on public.team_discipline;
create policy team_discipline_admin_update
  on public.team_discipline
  for update
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

drop policy if exists team_discipline_admin_delete on public.team_discipline;
create policy team_discipline_admin_delete
  on public.team_discipline
  for delete
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );
