-- Run this once in Supabase SQL Editor.
create table if not exists employee_permissions (
  user_id bigint primary key references users(id) on delete cascade,
  dashboard boolean not null default true,
  write_cheque boolean not null default false,
  bills boolean not null default false,
  departments boolean not null default false,
  payroll boolean not null default true,
  salaries boolean not null default false,
  reports boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table employee_permissions
  add column if not exists payroll boolean not null default true;
