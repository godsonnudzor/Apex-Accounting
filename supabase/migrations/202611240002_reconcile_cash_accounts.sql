create or replace function public.complete_bank_reconciliation(
  p_cash_bank_account_id bigint,
  p_statement_start_date date,
  p_statement_end_date date,
  p_opening_balance numeric,
  p_statement_ending_balance numeric,
  p_cleared_journal_line_ids bigint[],
  p_created_by bigint
) returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_name text;
  v_reconciliation_id bigint;
  v_cleared_amount numeric(14, 2);
  v_difference numeric(14, 2);
  v_valid_count bigint;
begin
  if p_statement_start_date is null
    or p_statement_end_date is null
    or p_statement_start_date > p_statement_end_date
    or p_opening_balance is null
    or p_statement_ending_balance is null
    or p_cleared_journal_line_ids is null
  then
    raise exception 'Valid statement dates, balances, and cleared transactions are required'
      using errcode = '22023';
  end if;

  select ledger.code || ' - ' || ledger.name
  into v_account_name
  from public.cash_bank_accounts as cash
  join public.ledger_accounts as ledger on ledger.id = cash.ledger_account_id
  where cash.id = p_cash_bank_account_id
    and cash.account_type in ('cash', 'bank')
    and cash.is_active = true;

  if v_account_name is null then
    raise exception 'Active cash or bank account not found' using errcode = '22023';
  end if;

  if cardinality(p_cleared_journal_line_ids) <>
    (
      select count(distinct requested.line_id)
      from unnest(p_cleared_journal_line_ids) as requested(line_id)
    )
  then
    raise exception 'Duplicate cleared transaction IDs are not allowed'
      using errcode = '22023';
  end if;

  select count(*)
  into v_valid_count
  from unnest(p_cleared_journal_line_ids) as requested(line_id)
  join public.journal_lines as line on line.id = requested.line_id
  join public.journal_entries as entry on entry.id = line.journal_entry_id
  where line.account = v_account_name
    and entry.status = 'posted'
    and entry.entry_date between p_statement_start_date and p_statement_end_date;

  if v_valid_count <> cardinality(p_cleared_journal_line_ids) then
    raise exception 'A selected transaction is no longer available for this statement'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.bank_reconciliation_lines as reconciled
    where reconciled.journal_line_id = any(p_cleared_journal_line_ids)
  ) then
    raise exception 'A selected transaction has already been reconciled'
      using errcode = '23505';
  end if;

  select coalesce(sum(line.debit - line.credit), 0)
  into v_cleared_amount
  from public.journal_lines as line
  where line.id = any(p_cleared_journal_line_ids);

  v_difference := p_opening_balance + v_cleared_amount - p_statement_ending_balance;
  if v_difference <> 0 then
    raise exception 'The statement does not balance; difference is %', v_difference
      using errcode = '22023';
  end if;

  insert into public.bank_reconciliations (
    cash_bank_account_id,
    statement_start_date,
    statement_end_date,
    opening_balance,
    statement_ending_balance,
    cleared_amount,
    difference,
    created_by
  ) values (
    p_cash_bank_account_id,
    p_statement_start_date,
    p_statement_end_date,
    p_opening_balance,
    p_statement_ending_balance,
    v_cleared_amount,
    v_difference,
    p_created_by
  )
  returning id into v_reconciliation_id;

  insert into public.bank_reconciliation_lines (reconciliation_id, journal_line_id)
  select v_reconciliation_id, line_id
  from unnest(p_cleared_journal_line_ids) as requested(line_id);

  return v_reconciliation_id;
end;
$$;

revoke all on function public.complete_bank_reconciliation(
  bigint, date, date, numeric, numeric, bigint[], bigint
) from public, anon, authenticated;

grant execute on function public.complete_bank_reconciliation(
  bigint, date, date, numeric, numeric, bigint[], bigint
) to service_role;
