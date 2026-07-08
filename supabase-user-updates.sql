-- 1. ADD ADMIN POLICIES TO PROFILES
create policy "Admins can update all profiles" on public.profiles 
  for update using ( 
    (select role from public.profiles where id = auth.uid()) = 'Admin' 
  );

create policy "Admins can delete profiles" on public.profiles 
  for delete using ( 
    (select role from public.profiles where id = auth.uid()) = 'Admin' 
  );

-- 2. CREATE LOGIN_HISTORY TABLE
create table if not exists public.login_history (
  id serial primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  email text,
  action text default 'Logged in',
  ip_address text,
  timestamp timestamptz default now()
);

alter table public.login_history enable row level security;
create policy "Users can view their own login history" on public.login_history for select using (auth.uid() = user_id);
create policy "Admins can view all login history" on public.login_history for select using ( (select role from public.profiles where id = auth.uid()) = 'Admin' );
create policy "Authenticated users can insert login history" on public.login_history for insert with check (auth.uid() = user_id);
