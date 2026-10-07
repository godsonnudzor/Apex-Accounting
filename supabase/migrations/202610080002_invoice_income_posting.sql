alter table public.supplier_bill_lines
  alter column ledger_account_id drop not null;

alter table public.customer_invoice_lines
  add column if not exists income_account_id bigint
  references public.ledger_accounts(id) on delete restrict;

create index if not exists customer_invoice_lines_income_account_idx
  on public.customer_invoice_lines(income_account_id);

alter table public.journal_entries
  add column if not exists customer_invoice_id bigint
  references public.customer_invoices(id) on delete cascade;

create unique index if not exists journal_entries_customer_invoice_unique_idx
  on public.journal_entries(customer_invoice_id)
  where customer_invoice_id is not null;

alter table public.journal_entries
  drop constraint if exists journal_entries_source_check;

alter table public.journal_entries
  add constraint journal_entries_source_check
  check (source in ('manual', 'cheque', 'cash', 'bank_transfer', 'payroll', 'invoice'));
