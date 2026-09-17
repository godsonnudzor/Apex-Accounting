create table if not exists public.employee_permissions (
  user_id bigint primary key references public.users(id) on delete cascade,
  dashboard boolean not null default true,
  write_cheque boolean not null default false,
  bills boolean not null default false,
  employee_management boolean not null default false,
  tax_brackets boolean not null default false,
  tax_jurisdictions boolean not null default false,
  user_scenarios boolean not null default false,
  departments boolean not null default false,
  payroll boolean not null default true,
  salaries boolean not null default false,
  leave_management boolean not null default false,
  reports boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.employee_permissions
  add column if not exists employee_management boolean not null default false,
  add column if not exists tax_brackets boolean not null default false,
  add column if not exists tax_jurisdictions boolean not null default false,
  add column if not exists user_scenarios boolean not null default false,
  add column if not exists departments boolean not null default false,
  add column if not exists payroll boolean not null default true,
  add column if not exists salaries boolean not null default false,
  add column if not exists leave_management boolean not null default false,
  add column if not exists reports boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

insert into public.employee_permissions (user_id)
select id
from public.users
where lower(role::text) <> 'admin'
on conflict (user_id) do nothing;
