-- Java Tobacco admin portal. Use a dedicated Supabase project for javatobacco.com.
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;
revoke all on public.admin_users from anon, authenticated;
grant select on public.admin_users to authenticated;
drop policy if exists "admins can read own admin record" on public.admin_users;
create policy "admins can read own admin record"
on public.admin_users for select to authenticated using (auth.uid() = user_id);

-- Create an Auth user first in Supabase Authentication > Users.
-- Then run this separately with that user's actual UUID:
-- insert into public.admin_users (user_id) values ('PASTE_AUTH_USER_UUID_HERE');
