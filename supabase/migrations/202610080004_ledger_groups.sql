create table if not exists public.ledger_groups (
  name varchar(100) primary key,
  account_type varchar(30) not null check (account_type in ('asset', 'liability', 'equity', 'income', 'expense')),
  created_at timestamptz not null default now()
);

insert into public.ledger_groups (name, account_type)
values
  ('Account Payable', 'liability'),
  ('Account Receivable', 'asset')
on conflict (name) do nothing;

grant select on public.ledger_groups to anon, authenticated, service_role;
