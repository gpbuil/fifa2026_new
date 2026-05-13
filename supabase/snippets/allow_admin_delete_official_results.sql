-- Permite que administradores limpem os resultados oficiais via frontend.
-- Execute no SQL Editor do Supabase ou via `npx supabase db push` se mover para migrations.

grant delete on table public.official_results to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'official_results'
      and policyname = 'Admins can delete official results'
  ) then
    create policy "Admins can delete official results"
    on public.official_results
    for delete
    to authenticated
    using (
      exists (
        select 1
        from public.profiles
        where profiles.id = auth.uid()
          and profiles.role = 'admin'
      )
    );
  end if;
end $$;
