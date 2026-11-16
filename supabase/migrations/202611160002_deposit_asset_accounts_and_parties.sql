alter table public.deposit_records
  alter column cash_bank_account_id drop not null,
  add column if not exists deposit_ledger_account_id bigint
    references public.ledger_accounts(id) on delete restrict;

alter table public.deposit_lines
  add column if not exists supplier_id bigint
    references public.suppliers(id) on delete restrict,
  add column if not exists customer_id bigint
    references public.customers(id) on delete restrict,
  add column if not exists employee_id bigint
    references public.employees(id) on delete restrict;

alter table public.deposit_lines
  drop constraint if exists deposit_lines_single_party_check;

alter table public.deposit_lines
  add constraint deposit_lines_single_party_check
  check (num_nonnulls(supplier_id, customer_id, employee_id) <= 1);

create index if not exists deposit_records_ledger_account_idx
  on public.deposit_records(deposit_ledger_account_id);

drop function if exists public.create_accounting_deposit(
  date,
  character varying,
  text,
  bigint,
  text,
  text,
  numeric,
  jsonb,
  bigint
);

create function public.create_accounting_deposit(
  p_deposit_date date,
  p_reference varchar,
  p_memo text,
  p_deposit_ledger_account_id bigint,
  p_cash_back_account text,
  p_cash_back_memo text,
  p_cash_back_amount numeric,
  p_lines jsonb,
  p_created_by bigint
)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_destination record;
  v_cash_back_account text;
  v_cash_back_amount numeric := round(coalesce(p_cash_back_amount, 0), 2);
  v_total numeric(14, 2) := 0;
  v_entry_id bigint;
  v_deposit_id bigint;
  v_line jsonb;
  v_payment record;
  v_payment_id bigint;
  v_line_amount numeric;
  v_received_from text;
  v_from_account text;
  v_line_memo text;
  v_payment_method text;
  v_cheque_number text;
  v_party_type text;
  v_party_id bigint;
  v_party_name text;
  v_supplier_id bigint;
  v_customer_id bigint;
  v_employee_id bigint;
  v_normalized_lines jsonb := '[]'::jsonb;
  v_seen_payment_ids bigint[] := array[]::bigint[];
begin
  if p_deposit_ledger_account_id is null or p_deposit_ledger_account_id <= 0 then
    raise exception 'Select an active asset account to deposit into';
  end if;
  if p_deposit_date is null then
    raise exception 'Enter a valid deposit date';
  end if;
  if jsonb_typeof(p_lines) is distinct from 'array' then
    raise exception 'A deposit must have between 1 and 100 payment lines';
  end if;
  if jsonb_array_length(p_lines) < 1
     or jsonb_array_length(p_lines) > 100 then
    raise exception 'A deposit must have between 1 and 100 payment lines';
  end if;

  select ledger.id, ledger.code, ledger.name
    into v_destination
    from public.ledger_accounts as ledger
   where ledger.id = p_deposit_ledger_account_id
     and ledger.is_active = true
     and ledger.account_type = 'asset';
  if not found then
    raise exception 'Select an active asset account to deposit into';
  end if;

  if v_cash_back_amount < 0
     or v_cash_back_amount > 999999999999.99
     or coalesce(p_cash_back_amount, 0) <> v_cash_back_amount then
    raise exception 'Cash back must be a non-negative amount with up to two decimals';
  end if;
  if v_cash_back_amount > 0 then
    select ledger.code || ' - ' || ledger.name
      into v_cash_back_account
      from public.ledger_accounts as ledger
     where ledger.code || ' - ' || ledger.name = trim(p_cash_back_account)
       and ledger.is_active = true
       and ledger.account_type = 'asset';
    if not found then
      raise exception 'Select an active asset account for the cash back';
    end if;
    if v_cash_back_account = v_destination.code || ' - ' || v_destination.name then
      raise exception 'Cash back must go to a different account than the deposit';
    end if;
  elsif nullif(trim(coalesce(p_cash_back_account, '')), '') is not null then
    raise exception 'Cash back account requires a positive cash back amount';
  end if;

  for v_line in
    select value
      from jsonb_array_elements(p_lines) as item(value)
  loop
    if v_line ->> 'amount' is null then
      raise exception 'Every deposit line needs a valid amount';
    end if;
    v_line_amount := round((v_line ->> 'amount')::numeric, 2);
    if v_line_amount <= 0
       or v_line_amount > 999999999999.99
       or (v_line ->> 'amount')::numeric <> v_line_amount then
      raise exception 'Every deposit line needs a positive amount with up to two decimals';
    end if;

    v_payment_id := nullif(v_line ->> 'paymentRecordId', '')::bigint;
    v_party_type := lower(trim(coalesce(v_line ->> 'partyType', '')));
    v_party_id := nullif(v_line ->> 'partyId', '')::bigint;
    v_received_from := trim(coalesce(v_line ->> 'receivedFrom', ''));
    v_from_account := trim(coalesce(v_line ->> 'fromAccount', ''));
    v_line_memo := nullif(trim(coalesce(v_line ->> 'memo', '')), '');
    v_payment_method := lower(trim(coalesce(v_line ->> 'paymentMethod', '')));
    v_cheque_number := nullif(trim(coalesce(v_line ->> 'chequeNumber', '')), '');
    v_supplier_id := null;
    v_customer_id := null;
    v_employee_id := null;

    if v_party_id is null or v_party_id <= 0 then
      raise exception 'Select an employee, supplier, or customer for every deposit line';
    end if;
    if v_party_type not in ('supplier', 'customer', 'employee') then
      raise exception 'Select an employee, supplier, or customer for every deposit line';
    end if;

    if v_payment_id is not null then
      if v_payment_id = any(v_seen_payment_ids) then
        raise exception 'A customer payment can only be selected once';
      end if;
      v_seen_payment_ids := array_append(v_seen_payment_ids, v_payment_id);

      select
        payment.id,
        payment.payment_type,
        payment.payment_number,
        payment.payee,
        payment.amount,
        payment.memo,
        payment.currency,
        payment.customer_id,
        source_cash.currency as source_currency,
        source_ledger.code as source_code,
        source_ledger.name as source_name,
        customer.name as customer_name
      into v_payment
      from public.payment_records as payment
      join public.cash_bank_accounts as source_cash
        on source_cash.id = payment.cash_bank_account_id
      join public.ledger_accounts as source_ledger
        on source_ledger.id = source_cash.ledger_account_id
      left join public.customers as customer
        on customer.id = payment.customer_id
      where payment.id = v_payment_id
        and payment.settlement_type = 'receipt'
        and payment.customer_id is not null
        and not exists (
          select 1
            from public.deposit_lines as deposited
           where deposited.payment_record_id = payment.id
        )
      for update of payment;
      if not found then
        raise exception 'A selected customer payment is no longer available to deposit';
      end if;
      if v_payment.currency <> 'GHS' or v_payment.source_currency <> 'GHS' then
        raise exception 'Only GHS customer receipts can be added to this deposit';
      end if;
      if v_party_type <> 'customer' or v_party_id <> v_payment.customer_id then
        raise exception 'The selected customer must match the received payment';
      end if;
      if v_line_amount <> round(v_payment.amount, 2) then
        raise exception 'Selected customer payments must be deposited for their full received amount';
      end if;
      v_party_name := v_payment.customer_name;
      if v_from_account <> v_payment.source_code || ' - ' || v_payment.source_name then
        raise exception 'The source account must match the selected customer payment';
      end if;
      v_from_account := v_payment.source_code || ' - ' || v_payment.source_name;
      v_line_memo := coalesce(v_line_memo, nullif(trim(v_payment.memo), ''));
      v_payment_method := v_payment.payment_type;
      v_cheque_number := v_payment.payment_number;
      v_customer_id := v_payment.customer_id;
    else
      if v_party_type = 'supplier' then
        select supplier.name into v_party_name
          from public.suppliers as supplier
         where supplier.id = v_party_id;
        v_supplier_id := v_party_id;
      elsif v_party_type = 'customer' then
        select customer.name into v_party_name
          from public.customers as customer
         where customer.id = v_party_id;
        v_customer_id := v_party_id;
      else
        select coalesce(
          nullif(trim(users.name), ''),
          trim(concat_ws(' ', employee.first_name, employee.last_name))
        )
        into v_party_name
          from public.employees as employee
          left join public.users as users on users.id = employee.user_id
         where employee.id = v_party_id;
        v_employee_id := v_party_id;
      end if;
      if not found or nullif(trim(coalesce(v_party_name, '')), '') is null then
        raise exception 'The selected employee, supplier, or customer was not found';
      end if;
      if v_received_from <> v_party_name then
        raise exception 'The received-from name does not match the selected party';
      end if;
      if v_payment_method not in ('cash', 'cheque', 'bank_transfer') then
        raise exception 'Select cash, cheque, or bank transfer for each line';
      end if;
    end if;

    if v_received_from <> v_party_name then
      raise exception 'The received-from name does not match the selected party';
    end if;
    if v_received_from = '' or length(v_received_from) > 200 then
      raise exception 'Every deposit line needs a valid received-from party';
    end if;
    if length(v_from_account) > 150
       or v_from_account = v_destination.code || ' - ' || v_destination.name then
      raise exception 'A deposit line must come from an account other than the deposit account';
    end if;
    if not exists (
      select 1
        from public.ledger_accounts as ledger
       where ledger.code || ' - ' || ledger.name = v_from_account
         and ledger.is_active = true
    ) then
      raise exception 'Every deposit line must use an active ledger account';
    end if;
    if v_total + v_line_amount > 999999999999.99 then
      raise exception 'Deposit total exceeds the supported amount';
    end if;
    v_total := v_total + v_line_amount;
    v_normalized_lines := v_normalized_lines || jsonb_build_array(
      jsonb_build_object(
        'paymentRecordId', v_payment_id,
        'receivedFrom', v_received_from,
        'fromAccount', v_from_account,
        'memo', v_line_memo,
        'paymentMethod', v_payment_method,
        'chequeNumber', v_cheque_number,
        'supplierId', v_supplier_id,
        'customerId', v_customer_id,
        'employeeId', v_employee_id,
        'amount', v_line_amount
      )
    );
  end loop;

  if v_cash_back_amount >= v_total then
    raise exception 'Cash back must be less than the deposit subtotal';
  end if;

  insert into public.journal_entries (
    entry_date,
    reference,
    description,
    source,
    status,
    created_by
  )
  values (
    p_deposit_date,
    nullif(trim(coalesce(p_reference, '')), ''),
    coalesce(nullif(trim(coalesce(p_memo, '')), ''), 'Bank deposit'),
    'deposit',
    'posted',
    p_created_by
  )
  returning id into v_entry_id;

  insert into public.deposit_records (
    journal_entry_id,
    deposit_date,
    reference,
    deposit_ledger_account_id,
    currency,
    subtotal,
    cash_back_amount,
    cash_back_account,
    cash_back_memo,
    memo,
    created_by
  )
  values (
    v_entry_id,
    p_deposit_date,
    nullif(trim(coalesce(p_reference, '')), ''),
    p_deposit_ledger_account_id,
    'GHS',
    v_total,
    v_cash_back_amount,
    v_cash_back_account,
    nullif(trim(coalesce(p_cash_back_memo, '')), ''),
    nullif(trim(coalesce(p_memo, '')), ''),
    p_created_by
  )
  returning id into v_deposit_id;

  insert into public.journal_lines (
    journal_entry_id,
    account,
    debit,
    credit,
    memo
  )
  values (
    v_entry_id,
    v_destination.code || ' - ' || v_destination.name,
    v_total - v_cash_back_amount,
    0,
    nullif(trim(coalesce(p_memo, '')), '')
  );

  if v_cash_back_amount > 0 then
    insert into public.journal_lines (
      journal_entry_id,
      account,
      debit,
      credit,
      memo
    )
    values (
      v_entry_id,
      v_cash_back_account,
      v_cash_back_amount,
      0,
      nullif(trim(coalesce(p_cash_back_memo, '')), '')
    );
  end if;

  for v_line in
    select value
      from jsonb_array_elements(v_normalized_lines) as item(value)
  loop
    insert into public.deposit_lines (
      deposit_id,
      payment_record_id,
      received_from,
      from_account,
      memo,
      payment_method,
      cheque_number,
      supplier_id,
      customer_id,
      employee_id,
      amount
    )
    values (
      v_deposit_id,
      nullif(v_line ->> 'paymentRecordId', '')::bigint,
      v_line ->> 'receivedFrom',
      v_line ->> 'fromAccount',
      nullif(v_line ->> 'memo', ''),
      v_line ->> 'paymentMethod',
      nullif(v_line ->> 'chequeNumber', ''),
      nullif(v_line ->> 'supplierId', '')::bigint,
      nullif(v_line ->> 'customerId', '')::bigint,
      nullif(v_line ->> 'employeeId', '')::bigint,
      (v_line ->> 'amount')::numeric
    );

    insert into public.journal_lines (
      journal_entry_id,
      account,
      debit,
      credit,
      memo,
      supplier_id,
      customer_id,
      employee_id
    )
    values (
      v_entry_id,
      v_line ->> 'fromAccount',
      0,
      (v_line ->> 'amount')::numeric,
      nullif(v_line ->> 'memo', ''),
      nullif(v_line ->> 'supplierId', '')::bigint,
      nullif(v_line ->> 'customerId', '')::bigint,
      nullif(v_line ->> 'employeeId', '')::bigint
    );
  end loop;

  return v_entry_id;
end;
$$;

revoke all on function public.create_accounting_deposit(
  date,
  character varying,
  text,
  bigint,
  text,
  text,
  numeric,
  jsonb,
  bigint
) from public, anon, authenticated;

grant execute on function public.create_accounting_deposit(
  date,
  character varying,
  text,
  bigint,
  text,
  text,
  numeric,
  jsonb,
  bigint
) to service_role;
