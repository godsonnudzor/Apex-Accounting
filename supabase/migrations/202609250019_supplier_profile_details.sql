alter table public.suppliers
  add column if not exists company_name varchar(200),
  add column if not exists first_name varchar(100),
  add column if not exists middle_name varchar(100),
  add column if not exists last_name varchar(100),
  add column if not exists salutation varchar(30),
  add column if not exists job_title varchar(150),
  add column if not exists main_phone varchar(50),
  add column if not exists work_phone varchar(50),
  add column if not exists mobile_phone varchar(50),
  add column if not exists fax varchar(50),
  add column if not exists main_email varchar(200),
  add column if not exists cc_email varchar(200),
  add column if not exists website varchar(250),
  add column if not exists other_email varchar(200),
  add column if not exists billed_from text,
  add column if not exists shipped_from text,
  add column if not exists currency varchar(10) not null default 'GHS',
  add column if not exists account_number varchar(100),
  add column if not exists credit_limit numeric(14, 2),
  add column if not exists payment_terms varchar(50),
  add column if not exists print_name_on_cheque varchar(200),
  add column if not exists billing_rate_level varchar(100),
  add column if not exists bank_account_name varchar(200),
  add column if not exists bank_sort_code varchar(50),
  add column if not exists bank_account_number varchar(100),
  add column if not exists vat_registration_number varchar(100),
  add column if not exists expense_account_1_id bigint references public.ledger_accounts(id) on delete set null,
  add column if not exists expense_account_2_id bigint references public.ledger_accounts(id) on delete set null,
  add column if not exists expense_account_3_id bigint references public.ledger_accounts(id) on delete set null,
  add column if not exists supplier_type varchar(100),
  add column if not exists custom_fields jsonb not null default '{}'::jsonb;

update public.suppliers
set company_name = coalesce(company_name, name),
    main_email = coalesce(main_email, email),
    main_phone = coalesce(main_phone, phone),
    billed_from = coalesce(billed_from, address)
where company_name is null
   or main_email is null
   or main_phone is null
   or billed_from is null;
