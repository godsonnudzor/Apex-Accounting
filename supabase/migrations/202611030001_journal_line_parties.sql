alter table public.journal_lines
  add column if not exists supplier_id bigint references public.suppliers(id) on delete set null,
  add column if not exists customer_id bigint references public.customers(id) on delete set null,
  add column if not exists employee_id bigint references public.employees(id) on delete set null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'journal_lines_single_party_check'
      and conrelid = 'public.journal_lines'::regclass
  ) then
    alter table public.journal_lines
      add constraint journal_lines_single_party_check
      check (num_nonnulls(supplier_id, customer_id, employee_id) <= 1);
  end if;
end;
$$;

create index if not exists journal_lines_supplier_idx
  on public.journal_lines(supplier_id);

create index if not exists journal_lines_customer_idx
  on public.journal_lines(customer_id);

create index if not exists journal_lines_employee_idx
  on public.journal_lines(employee_id);
