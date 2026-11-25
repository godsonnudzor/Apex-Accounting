alter table public.cash_bank_accounts
  add column if not exists bank_branch varchar(150);

insert into public.ledger_groups (name, account_type)
values ('Current Assets', 'asset')
on conflict (name) do update
set account_type = 'asset';

update public.ledger_accounts as ledger
set account_type = 'asset',
    group_ledger = 'Current Assets'
from public.cash_bank_accounts as cash
where cash.ledger_account_id = ledger.id
  and (
    ledger.account_type <> 'asset'
    or ledger.group_ledger is distinct from 'Current Assets'
  );

create sequence if not exists public.cash_bank_ledger_code_seq;

create or replace function public.create_cash_bank_account(
  p_account_name text,
  p_account_number text,
  p_currency text,
  p_bank_name text,
  p_bank_branch text,
  p_account_type text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_name text := trim(coalesce(p_account_name, ''));
  v_account_number text := nullif(trim(coalesce(p_account_number, '')), '');
  v_currency text := upper(trim(coalesce(p_currency, '')));
  v_bank_name text := nullif(trim(coalesce(p_bank_name, '')), '');
  v_bank_branch text := nullif(trim(coalesce(p_bank_branch, '')), '');
  v_account_type text := lower(trim(coalesce(p_account_type, '')));
  v_ledger_account public.ledger_accounts%rowtype;
  v_cash_bank_account public.cash_bank_accounts%rowtype;
  v_code text;
begin
  if v_account_name = '' or length(v_account_name) > 150 then
    raise exception 'Enter an account name up to 150 characters'
      using errcode = '22023';
  end if;
  if v_currency !~ '^[A-Z]{3}$' then
    raise exception 'Enter a valid three-letter currency code'
      using errcode = '22023';
  end if;
  if v_account_type not in ('cash', 'bank') then
    raise exception 'Account type must be cash or bank'
      using errcode = '22023';
  end if;
  if v_account_number is not null and length(v_account_number) > 100 then
    raise exception 'Account number must be 100 characters or fewer'
      using errcode = '22023';
  end if;
  if v_account_type = 'bank'
    and (v_account_number is null or v_bank_name is null or v_bank_branch is null) then
    raise exception 'Bank accounts require an account number, bank name, and branch'
      using errcode = '22023';
  end if;
  if v_bank_name is not null and length(v_bank_name) > 150 then
    raise exception 'Bank name must be 150 characters or fewer'
      using errcode = '22023';
  end if;
  if v_bank_branch is not null and length(v_bank_branch) > 150 then
    raise exception 'Bank branch must be 150 characters or fewer'
      using errcode = '22023';
  end if;

  loop
    v_code := 'CB-' || lpad(nextval('public.cash_bank_ledger_code_seq')::text, 6, '0');
    begin
      insert into public.ledger_accounts (
        code,
        name,
        account_type,
        group_ledger
      ) values (
        v_code,
        v_account_name,
        'asset',
        'Current Assets'
      )
      returning * into v_ledger_account;
      exit;
    exception when unique_violation then
      if not exists (
        select 1 from public.ledger_accounts where code = v_code
      ) then
        raise;
      end if;
    end;
  end loop;

  insert into public.cash_bank_accounts (
    ledger_account_id,
    account_name,
    account_number,
    bank_name,
    bank_branch,
    account_type,
    currency
  ) values (
    v_ledger_account.id,
    v_account_name,
    v_account_number,
    v_bank_name,
    v_bank_branch,
    v_account_type,
    v_currency
  )
  returning * into v_cash_bank_account;

  return jsonb_build_object(
    'account', to_jsonb(v_ledger_account),
    'cashBankAccount', to_jsonb(v_cash_bank_account)
  );
end;
$$;

revoke all on function public.create_cash_bank_account(
  text, text, text, text, text, text
) from public, anon, authenticated;

grant execute on function public.create_cash_bank_account(
  text, text, text, text, text, text
) to service_role;
