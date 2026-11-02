alter table public.employee_permissions
  add column if not exists group_accounts boolean not null default false;
