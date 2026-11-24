do $$
declare
  v_ledger_account_id bigint;
  v_existing_type varchar(20);
begin
  select id
  into v_ledger_account_id
  from public.ledger_accounts
  where code = '1002'
    and account_type = 'asset'
    and is_active = true;

  if v_ledger_account_id is null then
    raise exception 'Active asset ledger account 1002 is required for the bank account';
  end if;

  select account_type
  into v_existing_type
  from public.cash_bank_accounts
  where ledger_account_id = v_ledger_account_id;

  if v_existing_type = 'cash' then
    raise exception 'Ledger account 1002 is already linked to a cash account';
  end if;

  insert into public.cash_bank_accounts (
    ledger_account_id,
    account_name,
    bank_name,
    account_type,
    is_active
  ) values (
    v_ledger_account_id,
    'UBA1',
    'UBA',
    'bank',
    true
  )
  on conflict (ledger_account_id) do update
  set account_name = excluded.account_name,
      bank_name = excluded.bank_name,
      account_type = 'bank',
      is_active = true;
end;
$$;
