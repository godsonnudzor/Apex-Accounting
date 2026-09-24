alter table public.employee_permissions
  add column if not exists invoice boolean not null default false;
