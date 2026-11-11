create or replace function public.journal_entry_audit_snapshot(p_entry_id bigint)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'entry', to_jsonb(entry),
    'lines', coalesce((
      select jsonb_agg(to_jsonb(line) order by line.id)
        from public.journal_lines as line
       where line.journal_entry_id = entry.id
    ), '[]'::jsonb),
    'payments', coalesce((
      select jsonb_agg(to_jsonb(payment) order by payment.id)
        from public.payment_records as payment
       where payment.journal_entry_id = entry.id
    ), '[]'::jsonb),
    'allocations', coalesce((
      select jsonb_agg(
        to_jsonb(allocation)
        || jsonb_build_object(
          'invoice_number', invoice.invoice_number,
          'bill_reference', bill.reference
        )
        order by allocation.id
      )
        from public.payment_records as payment
        join public.payment_allocations as allocation
          on allocation.payment_record_id = payment.id
        left join public.customer_invoices as invoice
          on invoice.id = allocation.customer_invoice_id
        left join public.supplier_bills as bill
          on bill.id = allocation.supplier_bill_id
       where payment.journal_entry_id = entry.id
    ), '[]'::jsonb)
  )
    from public.journal_entries as entry
   where entry.id = p_entry_id;
$$;

create or replace function public.update_user_entered_journal_entry(
  p_entry_id bigint,
  p_payload jsonb,
  p_actor_id bigint,
  p_actor_name text,
  p_page text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_entry public.journal_entries%rowtype;
  v_payment public.payment_records%rowtype;
  v_previous jsonb;
  v_next jsonb;
  v_source text;
  v_entry_date date;
  v_reference text;
  v_description text;
  v_lines jsonb;
  v_payment_payload jsonb;
  v_allocations jsonb;
  v_debits numeric(14, 2);
  v_credits numeric(14, 2);
  v_total numeric(14, 2);
  v_cash_account text;
  v_cash_account_id bigint;
  v_party_id bigint;
  v_currency text;
  v_account record;
  v_invoice record;
  v_bill record;
  v_allocation record;
  v_credit_remaining numeric(14, 2);
  v_paid numeric(14, 2);
  v_available numeric(14, 2);
  v_credit_offset numeric(14, 2);
  v_seen integer;
  v_distinct integer;
  v_old_invoice_ids bigint[];
  v_new_invoice_ids bigint[];
begin
  select *
    into v_entry
    from public.journal_entries
   where id = p_entry_id
   for update;
  if not found then
    raise exception 'Journal entry not found';
  end if;
  if v_entry.status <> 'posted' then
    raise exception 'Only posted transactions can be edited';
  end if;

  v_source := v_entry.source;
  v_entry_date := nullif(p_payload->>'entryDate', '')::date;
  v_reference := nullif(trim(p_payload->>'reference'), '');
  v_description := nullif(trim(p_payload->>'description'), '');
  v_lines := p_payload->'lines';
  v_payment_payload := p_payload->'payment';
  v_allocations := p_payload->'allocations';
  if v_entry_date is null or v_description is null then
    raise exception 'Date and description are required';
  end if;

  select *
    into v_payment
    from public.payment_records
   where journal_entry_id = p_entry_id
   order by id
   limit 1
   for update;

  if v_source = 'manual' then
    if v_payment.id is not null then
      raise exception 'Manual journal entry unexpectedly has a payment record';
    end if;
  elsif v_source in ('cheque', 'cash', 'bank_transfer') then
    if v_payment.id is null or v_payment.settlement_type is not null then
      raise exception 'Direct payment record not found';
    end if;
  elsif v_source in ('receipt', 'supplier_payment') then
    if v_payment.id is null or v_payment.settlement_type <> v_source then
      raise exception 'Settlement payment record not found';
    end if;
  else
    raise exception 'This system-generated transaction cannot be edited';
  end if;

  v_previous := public.journal_entry_audit_snapshot(p_entry_id);

  if v_source in ('manual', 'cheque', 'cash', 'bank_transfer') then
    if v_lines is null or jsonb_typeof(v_lines) <> 'array'
       or jsonb_array_length(v_lines) < 2 then
      raise exception 'At least two journal lines are required';
    end if;

    select coalesce(sum((item->>'debit')::numeric), 0),
           coalesce(sum((item->>'credit')::numeric), 0)
      into v_debits, v_credits
      from jsonb_array_elements(v_lines) as item;
    if v_debits <= 0 or abs(v_debits - v_credits) > 0.005 then
      raise exception 'Journal debits and credits must balance';
    end if;
    if exists (
      select 1
        from jsonb_to_recordset(v_lines) as item(
          account text,
          debit numeric,
          credit numeric,
          memo text,
          supplier_id bigint,
          customer_id bigint,
          employee_id bigint
        )
       where nullif(trim(item.account), '') is null
          or item.debit < 0
          or item.credit < 0
          or (item.debit > 0 and item.credit > 0)
          or (item.debit = 0 and item.credit = 0)
          or num_nonnulls(item.supplier_id, item.customer_id, item.employee_id) > 1
    ) then
      raise exception 'One or more journal lines are invalid';
    end if;

    if v_source in ('cheque', 'cash', 'bank_transfer') then
      if jsonb_typeof(v_payment_payload) <> 'object'
         or trim(coalesce(v_payment_payload->>'payee', '')) = ''
         or coalesce(v_payment_payload->>'paymentType', '') not in ('cheque', 'cash', 'bank_transfer') then
        raise exception 'Payment method and payee are required';
      end if;
      if (v_payment_payload->>'paymentType') <> v_source then
        v_source := v_payment_payload->>'paymentType';
      end if;
      select cash.id, account.code || ' - ' || account.name as account_name
        into v_cash_account_id, v_cash_account
        from public.cash_bank_accounts as cash
        join public.ledger_accounts as account
          on account.id = cash.ledger_account_id
       where cash.id = v_payment.cash_bank_account_id
         and cash.is_active = true
         and account.is_active = true
         and account.account_type = 'asset';
      if not found or v_payment.cash_bank_account_id is null then
        raise exception 'The payment cash or bank account is no longer active';
      end if;
      if (
        select count(*)
          from jsonb_to_recordset(v_lines) as item(
            account text, debit numeric, credit numeric, memo text
          )
         where item.account = v_cash_account
           and item.debit = 0
           and item.credit > 0
      ) <> 1 or exists (
        select 1
          from jsonb_to_recordset(v_lines) as item(
            account text, debit numeric, credit numeric, memo text
          )
         where item.account = v_cash_account
           and item.debit <> 0
      ) then
        raise exception 'Payment must contain one credit line for its linked cash or bank account';
      end if;
      if exists (
        select 1
          from jsonb_to_recordset(v_lines) as item(
            account text, debit numeric, credit numeric, memo text
          )
         where item.account <> v_cash_account
           and (item.credit <> 0 or item.debit <= 0)
      ) then
        raise exception 'Direct payment lines must debit expense or ledger accounts';
      end if;
      if abs(v_debits - (
        select item.credit
          from jsonb_to_recordset(v_lines) as item(
            account text, debit numeric, credit numeric, memo text
          )
         where item.account = v_cash_account
           and item.debit = 0
      )) > 0.005 then
        raise exception 'Payment lines must equal the payment amount';
      end if;
    end if;

    update public.journal_entries
       set entry_date = v_entry_date,
           reference = v_reference,
           description = v_description,
           source = v_source
     where id = p_entry_id;

    delete from public.journal_lines where journal_entry_id = p_entry_id;
    insert into public.journal_lines (
      journal_entry_id, account, debit, credit, memo,
      supplier_id, customer_id, employee_id
    )
    select p_entry_id,
           item.account,
           item.debit,
           item.credit,
           nullif(trim(item.memo), ''),
           item.supplier_id,
           item.customer_id,
           item.employee_id
      from jsonb_to_recordset(v_lines) as item(
        account text,
        debit numeric,
        credit numeric,
        memo text,
        supplier_id bigint,
        customer_id bigint,
        employee_id bigint
      );

    if v_payment.id is not null then
      update public.payment_records
         set payment_type = v_source,
             payment_number = v_reference,
             payment_date = v_entry_date,
             payee = trim(v_payment_payload->>'payee'),
             amount = v_debits,
             memo = nullif(trim(v_payment_payload->>'memo'), '')
       where id = v_payment.id;
    end if;
  else
    if jsonb_typeof(v_allocations) <> 'array'
       or jsonb_array_length(v_allocations) < 1
       or jsonb_typeof(v_payment_payload) <> 'object'
       or coalesce(v_payment_payload->>'paymentType', '') not in ('cheque', 'cash', 'bank_transfer') then
      raise exception 'A valid payment and at least one linked allocation are required';
    end if;

    select count(*), count(distinct (item->>'documentId')::bigint)
      into v_seen, v_distinct
      from jsonb_array_elements(v_allocations) as item;
    if v_seen <> v_distinct then
      raise exception 'A document can only be allocated once';
    end if;
    if exists (
      select 1
        from jsonb_array_elements(v_allocations) as item
       where coalesce((item->>'documentId')::bigint, 0) <= 0
          or coalesce((item->>'amount')::numeric, 0) <= 0
          or round((item->>'amount')::numeric, 2) <> (item->>'amount')::numeric
    ) then
      raise exception 'Every allocation must have a document and a positive amount';
    end if;

    select coalesce(array_agg(allocation.customer_invoice_id), array[]::bigint[])
      into v_old_invoice_ids
      from public.payment_allocations as allocation
     where allocation.payment_record_id = v_payment.id
       and allocation.customer_invoice_id is not null;
    v_party_id := case
      when v_source = 'receipt' then v_payment.customer_id
      else v_payment.supplier_id
    end;
    v_currency := upper(v_payment.currency);
    select cash.id, account.code || ' - ' || account.name as account_name,
           upper(cash.currency) as currency
      into v_cash_account_id, v_cash_account, v_currency
      from public.cash_bank_accounts as cash
      join public.ledger_accounts as account
        on account.id = cash.ledger_account_id
     where cash.id = v_payment.cash_bank_account_id
       and cash.is_active = true
       and account.is_active = true
       and account.account_type = 'asset';
    if not found or v_party_id is null then
      raise exception 'The linked party or cash/bank account is no longer available';
    end if;
    if upper(v_payment.currency) <> v_currency then
      raise exception 'The payment and cash/bank account currencies must match';
    end if;

    if v_source = 'receipt' then
      v_total := 0;
      for v_allocation in
        select (item->>'documentId')::bigint as document_id,
               (item->>'amount')::numeric(14, 2) as amount
          from jsonb_array_elements(v_allocations) as item
      loop
        select *
          into v_invoice
          from public.customer_invoices
         where id = v_allocation.document_id
           and customer_id = v_party_id
           and status in ('open', 'paid')
         for update;
        if not found or upper(v_invoice.currency) <> v_currency then
          raise exception 'A linked invoice is unavailable or has a different currency';
        end if;
        select coalesce(sum(allocation.amount), 0)
          into v_paid
          from public.payment_allocations as allocation
          join public.payment_records as payment
            on payment.id = allocation.payment_record_id
         where allocation.customer_invoice_id = v_invoice.id
           and payment.settlement_type = 'receipt'
           and payment.id <> v_payment.id;
        v_available := round(v_invoice.total_amount - v_paid, 2);
        if v_allocation.amount > v_available then
          raise exception 'Receipt exceeds the remaining invoice balance';
        end if;
        v_total := v_total + v_allocation.amount;
      end loop;
      select array_agg((item->>'documentId')::bigint)
        into v_new_invoice_ids
        from jsonb_array_elements(v_allocations) as item;
    else
      select coalesce(sum(total_amount), 0)
        into v_credit_remaining
        from public.supplier_bills
       where supplier_id = v_party_id
         and upper(currency) = v_currency
         and document_type = 'credit';
      v_total := 0;
      for v_bill in
        select id, total_amount, currency, supplier_id, document_type
          from public.supplier_bills
         where supplier_id = v_party_id
           and upper(currency) = v_currency
           and document_type = 'bill'
         order by bill_date, id
         for update
      loop
        select coalesce(sum(allocation.amount), 0)
          into v_paid
          from public.payment_allocations as allocation
          join public.payment_records as payment
            on payment.id = allocation.payment_record_id
         where allocation.supplier_bill_id = v_bill.id
           and payment.settlement_type = 'supplier_payment'
           and payment.id <> v_payment.id;
        v_available := greatest(round(v_bill.total_amount - v_paid, 2), 0);
        v_credit_offset := least(v_available, v_credit_remaining);
        v_available := round(v_available - v_credit_offset, 2);
        v_credit_remaining := round(v_credit_remaining - v_credit_offset, 2);
        select (item->>'amount')::numeric(14, 2) as amount
          into v_allocation
          from jsonb_array_elements(v_allocations) as item
         where (item->>'documentId')::bigint = v_bill.id;
        if found then
          if v_allocation.amount <= 0 or v_allocation.amount > v_available then
            raise exception 'Payment exceeds the remaining bill balance after credits';
          end if;
          v_total := v_total + v_allocation.amount;
        end if;
      end loop;
      if (
        select count(*)
          from jsonb_array_elements(v_allocations) as item
          join public.supplier_bills as bill
            on bill.id = (item->>'documentId')::bigint
           and bill.supplier_id = v_party_id
           and bill.document_type = 'bill'
           and upper(bill.currency) = v_currency
      ) <> v_seen then
        raise exception 'A linked supplier bill is unavailable';
      end if;
    end if;
    if v_total <= 0 then
      raise exception 'Settlement amount must be greater than zero';
    end if;

    update public.journal_entries
       set entry_date = v_entry_date,
           reference = v_reference,
           description = v_description
     where id = p_entry_id;
    update public.payment_records
       set payment_type = v_payment_payload->>'paymentType',
           payment_number = v_reference,
           payment_date = v_entry_date,
           amount = v_total,
           memo = nullif(trim(v_payment_payload->>'memo'), '')
     where id = v_payment.id;
    delete from public.payment_allocations
     where payment_record_id = v_payment.id;
    if v_source = 'receipt' then
      insert into public.payment_allocations (
        payment_record_id, customer_invoice_id, amount
      )
      select v_payment.id,
             (item->>'documentId')::bigint,
             (item->>'amount')::numeric(14, 2)
        from jsonb_array_elements(v_allocations) as item;
    else
      insert into public.payment_allocations (
        payment_record_id, supplier_bill_id, amount
      )
      select v_payment.id,
             (item->>'documentId')::bigint,
             (item->>'amount')::numeric(14, 2)
        from jsonb_array_elements(v_allocations) as item;
    end if;

    delete from public.journal_lines where journal_entry_id = p_entry_id;
    if v_source = 'receipt' then
      insert into public.journal_lines (
        journal_entry_id, account, debit, credit, memo
      )
      values (
        p_entry_id,
        v_cash_account,
        v_total,
        0,
        coalesce(nullif(trim(v_payment_payload->>'memo'), ''), 'Customer receipt')
      );
      insert into public.journal_lines (
        journal_entry_id, account, debit, credit, memo
      )
      select p_entry_id,
             account.code || ' - ' || account.name,
             0,
             allocation.amount,
             'Receipt for invoice ' || invoice.invoice_number
        from public.payment_allocations as allocation
        join public.customer_invoices as invoice
          on invoice.id = allocation.customer_invoice_id
        join public.ledger_accounts as account
          on account.id = invoice.receivable_account_id
       where allocation.payment_record_id = v_payment.id;

      update public.customer_invoices as invoice
         set status = case
               when invoice.total_amount <= (
                 select coalesce(sum(allocation.amount), 0)
                   from public.payment_allocations as allocation
                   join public.payment_records as payment
                     on payment.id = allocation.payment_record_id
                  where allocation.customer_invoice_id = invoice.id
                    and payment.settlement_type = 'receipt'
               ) then 'paid'
               else 'open'
             end,
             updated_at = now()
       where invoice.id = any(coalesce(v_old_invoice_ids, array[]::bigint[]) || coalesce(v_new_invoice_ids, array[]::bigint[]))
         and invoice.status in ('open', 'paid');
    else
      select id, code, name
        into v_account
        from public.ledger_accounts
       where account_type = 'liability'
         and group_ledger = 'Account Payable'
         and is_active = true
       order by id
       limit 1;
      if not found then
        raise exception 'An active Accounts Payable ledger account is required';
      end if;
      insert into public.journal_lines (
        journal_entry_id, account, debit, credit, memo
      )
      values
        (
          p_entry_id,
          v_account.code || ' - ' || v_account.name,
          v_total,
          0,
          coalesce(nullif(trim(v_payment_payload->>'memo'), ''), 'Supplier bill payment')
        ),
        (
          p_entry_id,
          v_cash_account,
          0,
          v_total,
          coalesce(nullif(trim(v_payment_payload->>'memo'), ''), 'Supplier bill payment')
        );
    end if;
  end if;

  v_next := public.journal_entry_audit_snapshot(p_entry_id);
  insert into public.accounting_audit_trail (
    actor_user_id, actor_name, action, entry_id, page, previous_values, new_values
  )
  values (
    p_actor_id,
    coalesce(nullif(trim(p_actor_name), ''), 'Unknown user'),
    'updated',
    p_entry_id,
    coalesce(nullif(trim(p_page), ''), 'Ledger report'),
    v_previous,
    v_next
  );
end;
$$;

revoke all on function public.journal_entry_audit_snapshot(bigint)
  from public, anon, authenticated;
revoke all on function public.update_user_entered_journal_entry(bigint, jsonb, bigint, text, text)
  from public, anon, authenticated;
grant execute on function public.journal_entry_audit_snapshot(bigint)
  to service_role;
grant execute on function public.update_user_entered_journal_entry(bigint, jsonb, bigint, text, text)
  to service_role;
