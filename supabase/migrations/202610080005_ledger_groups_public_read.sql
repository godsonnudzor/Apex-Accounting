alter table public.ledger_groups enable row level security;

grant select on public.ledger_groups to anon, authenticated;

drop policy if exists "Allow reading ledger groups" on public.ledger_groups;
create policy "Allow reading ledger groups"
  on public.ledger_groups
  for select
  to anon, authenticated
  using (true);
