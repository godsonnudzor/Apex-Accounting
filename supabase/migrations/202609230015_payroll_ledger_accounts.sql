insert into public.ledger_accounts (code, name, account_type)
values
  ('5600', 'Wages expense', 'expense'),
  ('5610', 'Employer SSNIT expense', 'expense'),
  ('5620', 'Employer Tier 2 expense', 'expense')
on conflict (code) do nothing;
