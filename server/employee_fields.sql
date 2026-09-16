-- Run this once in the Supabase SQL Editor.
-- Employee accounts stay in users; employee profile data lives in employees.
create table if not exists public.employees (
  user_id bigint primary key references public.users(id) on delete cascade,
  first_name varchar(100) not null,
  last_name varchar(100) not null,
  date_of_birth date not null,
  sex varchar(30) not null check (sex in ('female', 'male', 'other', 'prefer_not_to_say')),
  qualification varchar(200),
  department varchar(100),
  basic_pay numeric(14, 2) not null default 0 check (basic_pay >= 0),
  profile_image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists employees_department_idx on public.employees (department);

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