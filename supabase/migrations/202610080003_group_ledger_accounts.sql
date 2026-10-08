alter table public.ledger_accounts
  add column if not exists group_ledger varchar(100);
