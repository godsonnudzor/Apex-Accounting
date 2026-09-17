alter table public.employees
  add column if not exists department_id bigint references public.departments(id) on delete set null;

create index if not exists employees_department_id_idx
  on public.employees (department_id);

-- Backfill legacy text departments when names match exactly.
update public.employees employees
set department_id = departments.id
from public.departments departments
where employees.department_id is null
  and employees.department = departments.name;
