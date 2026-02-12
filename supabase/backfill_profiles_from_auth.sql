-- Backfill de nome/telefone em profiles usando auth.users
-- Nao sobrescreve valores ja preenchidos.

insert into public.profiles (id, full_name, phone)
select
  au.id,
  nullif(
    coalesce(
      au.raw_user_meta_data->>'full_name',
      au.raw_user_meta_data->>'name',
      concat_ws(' ', au.raw_user_meta_data->>'first_name', au.raw_user_meta_data->>'last_name')
    ),
    ''
  ) as full_name,
  nullif(coalesce(au.raw_user_meta_data->>'phone', au.phone), '') as phone
from auth.users au
left join public.profiles p on p.id = au.id
where p.id is null
on conflict (id) do nothing;

update public.profiles p
set
  full_name = coalesce(
    p.full_name,
    nullif(
      coalesce(
        au.raw_user_meta_data->>'full_name',
        au.raw_user_meta_data->>'name',
        concat_ws(' ', au.raw_user_meta_data->>'first_name', au.raw_user_meta_data->>'last_name')
      ),
      ''
    )
  ),
  phone = coalesce(
    p.phone,
    nullif(coalesce(au.raw_user_meta_data->>'phone', au.phone), '')
  )
from auth.users au
where au.id = p.id
  and (
    p.full_name is null
    or btrim(p.full_name) = ''
    or p.phone is null
    or btrim(p.phone) = ''
  );

