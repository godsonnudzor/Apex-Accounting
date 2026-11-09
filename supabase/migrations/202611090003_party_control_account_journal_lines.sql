create or replace function public.tag_party_control_journal_line()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_source varchar(30);
  v_customer_invoice_id bigint;
  v_supplier_bill_id bigint;
  v_party_id bigint;
  v_control_account text;
begin
  select entry.source, entry.customer_invoice_id, entry.supplier_bill_id
    into v_source, v_customer_invoice_id, v_supplier_bill_id
    from public.journal_entries as entry
   where entry.id = new.journal_entry_id;

  if v_customer_invoice_id is not null then
    select invoice.customer_id, account.code || ' - ' || account.name
      into v_party_id, v_control_account
      from public.customer_invoices as invoice
      join public.ledger_accounts as account
        on account.id = invoice.receivable_account_id
     where invoice.id = v_customer_invoice_id;
    if new.account = v_control_account then
      new.customer_id := coalesce(new.customer_id, v_party_id);
    end if;
    return new;
  end if;

  if v_supplier_bill_id is not null then
    select bill.supplier_id
      into v_party_id
      from public.supplier_bills as bill
     where bill.id = v_supplier_bill_id;
    select account.code || ' - ' || account.name
      into v_control_account
      from public.ledger_accounts as account
     where account.account_type = 'liability'
       and account.group_ledger = 'Account Payable'
       and account.is_active = true
     order by account.id
     limit 1;
    if new.account = v_control_account then
      new.supplier_id := coalesce(new.supplier_id, v_party_id);
    end if;
    return new;
  end if;

  if v_source = 'receipt' then
    select payment.customer_id
      into v_party_id
      from public.payment_records as payment
     where payment.journal_entry_id = new.journal_entry_id
       and payment.settlement_type = 'receipt';

    if v_party_id is not null and exists (
      select 1
        from public.payment_allocations as allocation
        join public.payment_records as payment
          on payment.id = allocation.payment_record_id
        join public.customer_invoices as invoice
          on invoice.id = allocation.customer_invoice_id
        join public.ledger_accounts as account
          on account.id = invoice.receivable_account_id
       where payment.journal_entry_id = new.journal_entry_id
         and payment.settlement_type = 'receipt'
         and account.code || ' - ' || account.name = new.account
    ) then
      new.customer_id := coalesce(new.customer_id, v_party_id);
    end if;
    return new;
  end if;

  if v_source = 'supplier_payment' then
    select payment.supplier_id
      into v_party_id
      from public.payment_records as payment
     where payment.journal_entry_id = new.journal_entry_id
       and payment.settlement_type = 'supplier_payment';
    select account.code || ' - ' || account.name
      into v_control_account
      from public.ledger_accounts as account
     where account.account_type = 'liability'
       and account.group_ledger = 'Account Payable'
       and account.is_active = true
     order by account.id
     limit 1;
    if v_party_id is not null and new.account = v_control_account then
      new.supplier_id := coalesce(new.supplier_id, v_party_id);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists journal_lines_tag_supplier_payable on public.journal_lines;
drop trigger if exists journal_lines_tag_party_control on public.journal_lines;

create trigger journal_lines_tag_party_control
before insert on public.journal_lines
for each row
execute function public.tag_party_control_journal_line();

update public.journal_lines as line
   set customer_id = invoice.customer_id
  from public.journal_entries as entry
  join public.customer_invoices as invoice
    on invoice.id = entry.customer_invoice_id
  join public.ledger_accounts as account
    on account.id = invoice.receivable_account_id
 where line.journal_entry_id = entry.id
   and line.account = account.code || ' - ' || account.name
   and line.customer_id is null;

update public.journal_lines as line
   set customer_id = payment.customer_id
  from public.payment_records as payment
  join public.payment_allocations as allocation
    on allocation.payment_record_id = payment.id
  join public.customer_invoices as invoice
    on invoice.id = allocation.customer_invoice_id
  join public.ledger_accounts as account
    on account.id = invoice.receivable_account_id
 where line.journal_entry_id = payment.journal_entry_id
   and payment.settlement_type = 'receipt'
   and line.account = account.code || ' - ' || account.name
   and line.customer_id is null;

update public.journal_lines as line
   set supplier_id = bill.supplier_id
  from public.journal_entries as entry
  join public.supplier_bills as bill
    on bill.id = entry.supplier_bill_id
  join public.ledger_accounts as payable
    on payable.account_type = 'liability'
   and payable.group_ledger = 'Account Payable'
   and payable.is_active = true
 where line.journal_entry_id = entry.id
   and line.account = payable.code || ' - ' || payable.name
   and line.supplier_id is null;

update public.journal_lines as line
   set supplier_id = payment.supplier_id
  from public.payment_records as payment
  join public.ledger_accounts as payable
    on payable.account_type = 'liability'
   and payable.group_ledger = 'Account Payable'
   and payable.is_active = true
 where line.journal_entry_id = payment.journal_entry_id
   and payment.settlement_type = 'supplier_payment'
   and line.account = payable.code || ' - ' || payable.name
   and line.supplier_id is null;

revoke all on function public.tag_party_control_journal_line()
  from public, anon, authenticated;
grant execute on function public.tag_party_control_journal_line()
  to service_role;
