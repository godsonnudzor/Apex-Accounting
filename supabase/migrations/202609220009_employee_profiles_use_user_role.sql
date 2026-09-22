-- Employee is a payroll profile in public.employees, not a public.users role.
update public.users
set role = 'user'
where role = 'employee';