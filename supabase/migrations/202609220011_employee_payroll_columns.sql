-- Ensure existing employee tables contain every payroll profile field used by the API.
alter table public.employees
  add column if not exists tin_no varchar(100),
  add column if not exists ssni_no varchar(100),
  add column if not exists position varchar(150),
  add column if not exists allowance numeric(14, 2) not null default 0 check (allowance >= 0),
  add column if not exists bank_name varchar(150),
  add column if not exists account_name varchar(150);