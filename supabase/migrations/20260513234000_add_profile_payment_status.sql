alter table public.profiles
add column if not exists bolao_paid boolean not null default false;

create or replace function public.set_profile_payment_status(
  target_user_id uuid,
  next_paid boolean
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  ) then
    raise exception 'Only admins can update payment status';
  end if;

  update public.profiles
  set bolao_paid = next_paid
  where id = target_user_id;

  return found;
end;
$$;

revoke all on function public.set_profile_payment_status(uuid, boolean) from public;
grant execute on function public.set_profile_payment_status(uuid, boolean) to authenticated;
