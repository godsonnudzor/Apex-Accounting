-- Run this once in the Supabase SQL Editor.
alter table public.users
  add column if not exists first_name varchar(100),
  add column if not exists last_name varchar(100),
  add column if not exists date_of_birth date,
  add column if not exists sex varchar(30),
  add column if not exists qualification varchar(200),
  add column if not exists department varchar(100),
  add column if not exists basic_pay numeric(14, 2) not null default 0 check (basic_pay >= 0),
  add column if not exists profile_image text;

create index if not exists users_role_idx on public.users (role);
create index if not exists users_email_idx on public.users (email);