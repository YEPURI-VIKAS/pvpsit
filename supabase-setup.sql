-- ============================================================
-- PVPSIT College Facility Management — Supabase Setup Script
-- Run this in your Supabase SQL Editor (supabase.com → SQL Editor)
-- ============================================================

-- 1. PROFILES TABLE (stores role + full_name for each user)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  full_name text,
  role text default 'Student',
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Public profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can insert their own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- 2. FACILITIES TABLE
create table if not exists public.facilities (
  id text primary key,
  name text not null,
  type text,
  capacity integer default 0,
  status text default 'Available',
  image text default '',
  equipment text[] default '{}',
  created_at timestamptz default now()
);
alter table public.facilities enable row level security;
create policy "Facilities viewable by all authenticated users" on public.facilities for select using (auth.role() = 'authenticated');
create policy "Admins can insert facilities" on public.facilities for insert with check (true);
create policy "Admins can update facilities" on public.facilities for update using (true);
create policy "Admins can delete facilities" on public.facilities for delete using (true);

-- 3. BOOKINGS TABLE
create table if not exists public.bookings (
  id text primary key,
  title text not null,
  time text,
  location text,
  organizer text,
  organizer_email text,
  status text default 'Pending',
  created_at timestamptz default now()
);
alter table public.bookings enable row level security;
create policy "Bookings viewable by all authenticated users" on public.bookings for select using (auth.role() = 'authenticated');
create policy "Authenticated users can insert bookings" on public.bookings for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can update bookings" on public.bookings for update using (auth.role() = 'authenticated');
create policy "Authenticated users can delete bookings" on public.bookings for delete using (auth.role() = 'authenticated');

-- 4. ASSETS TABLE
create table if not exists public.assets (
  id text primary key,
  name text not null,
  category text,
  location text,
  status text default 'Active',
  purchase_date text,
  created_at timestamptz default now()
);
alter table public.assets enable row level security;
create policy "Assets viewable by all authenticated users" on public.assets for select using (auth.role() = 'authenticated');
create policy "Authenticated users can insert assets" on public.assets for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can update assets" on public.assets for update using (auth.role() = 'authenticated');
create policy "Authenticated users can delete assets" on public.assets for delete using (auth.role() = 'authenticated');

-- 5. MAINTENANCE TICKETS TABLE
create table if not exists public.maintenance_tickets (
  id text primary key,
  title text not null,
  location text,
  priority text default 'Medium',
  status text default 'Open',
  date text,
  assigned_to text default 'Unassigned',
  created_at timestamptz default now()
);
alter table public.maintenance_tickets enable row level security;
create policy "Tickets viewable by all authenticated users" on public.maintenance_tickets for select using (auth.role() = 'authenticated');
create policy "Authenticated users can insert tickets" on public.maintenance_tickets for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can update tickets" on public.maintenance_tickets for update using (auth.role() = 'authenticated');
create policy "Authenticated users can delete tickets" on public.maintenance_tickets for delete using (auth.role() = 'authenticated');

-- ============================================================
-- 6. ENABLE REALTIME on all tables (for live notifications)
-- ============================================================
alter publication supabase_realtime add table public.bookings;
alter publication supabase_realtime add table public.maintenance_tickets;
alter publication supabase_realtime add table public.assets;
alter publication supabase_realtime add table public.facilities;

-- ============================================================
-- 7. SEED DATA (optional — sample facilities)
-- ============================================================
insert into public.facilities (id, name, type, capacity, status, equipment) values
  ('FAC-001', 'Main Auditorium', 'Auditorium', 500, 'Available', ARRAY['Projector', 'Microphone', 'AC', 'Stage Lighting']),
  ('FAC-002', 'CSE Lab 1', 'Computer Lab', 60, 'Available', ARRAY['30 Computers', 'Projector', 'AC', 'High-Speed Internet']),
  ('FAC-003', 'Seminar Hall A', 'Seminar Hall', 120, 'Available', ARRAY['Projector', 'Whiteboard', 'AC', 'Microphone']),
  ('FAC-004', 'Classroom 101', 'Classroom', 60, 'Available', ARRAY['Whiteboard', 'Projector', 'Ceiling Fan']),
  ('FAC-005', 'Sports Hall', 'Sports', 200, 'Maintenance', ARRAY['Basketball Court', 'Changing Rooms', 'Scoreboard'])
on conflict (id) do nothing;
