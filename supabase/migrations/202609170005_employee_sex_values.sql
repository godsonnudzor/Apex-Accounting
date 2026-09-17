alter table public.employees
  drop constraint if exists employees_sex_check;

alter table public.employees
  add constraint employees_sex_check
  check (sex in ('female', 'male', 'other', 'prefer_not_to_say'));
