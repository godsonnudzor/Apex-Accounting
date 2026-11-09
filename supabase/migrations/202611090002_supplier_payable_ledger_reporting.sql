create or replace function public.tag_supplier_payable_journal_line()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_source varchar(30);
  v_supplier_bill_id bigint;
  v_supplier_id bigint;
  v_payable_account text;
begin
  select entry.source, entry.supplier_bill_id
    into v_source, v_supplier_bill_id
    from public.journal_entries as entry
   where entry.id = new.journal_entry_id;

  if v_supplier_bill_id is null and v_source <> 'supplier_payment' then
    return new;
  end if;

  select account.code || ' - ' || account.name
    into v_payable_account
    from public.ledger_accounts as account
   where account.account_type = 'liability'
     and account.group_ledger = 'Account Payable'
     and account.is_active = true
   order by account.id
   limit 1;

  if v_payable_account is null or new.account <> v_payable_account then
    return new;
  end if;

  if v_supplier_bill_id is not null then
    select bill.supplier_id
      into v_supplier_id
      from public.supplier_bills as bill
     where bill.id = v_supplier_bill_id;
  else
    select payment.supplier_id
      into v_supplier_id
      from public.payment_records as payment
     where payment.journal_entry_id = new.journal_entry_id
       and payment.settlement_type = 'supplier_payment';
  end if;

  if v_supplier_id is not null then
    new.supplier_id := coalesce(new.supplier_id, v_supplier_id);
  end if;
  return new;
end;
$$;

drop trigger if exists journal_lines_tag_supplier_payable on public.journal_lines;

create trigger journal_lines_tag_supplier_payable
before insert on public.journal_lines
for each row
execute function public.tag_supplier_payable_journal_line();

update public.journal_lines as line
   set supplier_id = bill.supplier_id
  from public.journal_entries as entry
  join public.supplier_bills as bill
    on bill.id = entry.supplier_bill_id
  join public.ledger_accounts as payable
    on payable.account_type = 'liability'
   and payable.group_ledger = 'Account Payable'
 where line.journal_entry_id = entry.id
   and line.account = payable.code || ' - ' || payable.name
   and line.supplier_id is null;

update public.journal_lines as line
   set supplier_id = payment.supplier_id
  from public.payment_records as payment
  join public.journal_entries as entry
    on entry.id = payment.journal_entry_id
  join public.ledger_accounts as payable
    on payable.account_type = 'liability'
   and payable.group_ledger = 'Account Payable'
 where line.journal_entry_id = entry.id
   and payment.settlement_type = 'supplier_payment'
   and line.account = payable.code || ' - ' || payable.name
   and line.supplier_id is null;

revoke all on function public.tag_supplier_payable_journal_line()
  from public, anon, authenticated;
grant execute on function public.tag_supplier_payable_journal_line()
  to service_role;
