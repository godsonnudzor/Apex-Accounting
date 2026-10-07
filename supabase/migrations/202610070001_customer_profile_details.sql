alter table public.customers
  add column if not exists company_name varchar(200),
  add column if not exists salutation varchar(30),
  add column if not exists first_name varchar(100),
  add column if not exists middle_name varchar(100),
  add column if not exists last_name varchar(100),
  add column if not exists job_title varchar(150),
  add column if not exists main_phone varchar(50),
  add column if not exists work_phone varchar(50),
  add column if not exists mobile_phone varchar(50),
  add column if not exists fax varchar(50),
  add column if not exists main_email varchar(200),
  add column if not exists cc_email varchar(200),
  add column if not exists website varchar(250),
  add column if not exists other_email varchar(200),
  add column if not exists invoice_address text,
  add column if not exists shipping_address text,
  add column if not exists currency varchar(10) not null default 'GHS',
  add column if not exists account_number varchar(100),
  add column if not exists credit_limit numeric(14, 2),
  add column if not exists payment_terms varchar(50),
  add column if not exists price_level varchar(100),
  add column if not exists preferred_delivery_method varchar(100),
  add column if not exists preferred_payment_method varchar(100),
  add column if not exists vat_code varchar(100),
  add column if not exists vat_registration_number varchar(100),
  add column if not exists customer_type varchar(100),
  add column if not exists sales_rep varchar(200),
  add column if not exists custom_fields jsonb not null default '{}'::jsonb,
  add column if not exists job_description text,
  add column if not exists job_type varchar(100),
  add column if not exists job_status varchar(50) not null default 'None',
  add column if not exists job_start_date date,
  add column if not exists projected_end_date date,
  add column if not exists job_end_date date;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'customers_credit_limit_nonnegative'
      and conrelid = 'public.customers'::regclass
  ) then
    alter table public.customers
      add constraint customers_credit_limit_nonnegative
      check (credit_limit is null or credit_limit >= 0);
  end if;
end;
$$;

update public.customers
set company_name = coalesce(company_name, name),
    main_email = coalesce(main_email, email),
    main_phone = coalesce(main_phone, phone),
    invoice_address = coalesce(invoice_address, address)
where company_name is null
   or main_email is null
   or main_phone is null
   or invoice_address is null;
