create table if not exists public.customer_vat (
  customer_id bigint primary key references public.customers(id) on delete cascade,
  vat_code varchar(100),
  vat_registration_number varchar(100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_vat_has_value check (
    nullif(trim(vat_code), '') is not null
    or nullif(trim(vat_registration_number), '') is not null
  )
);

insert into public.customer_vat (customer_id, vat_code, vat_registration_number)
select id, vat_code, vat_registration_number
from public.customers
where nullif(trim(vat_code), '') is not null
   or nullif(trim(vat_registration_number), '') is not null
on conflict (customer_id) do update
set vat_code = excluded.vat_code,
    vat_registration_number = excluded.vat_registration_number,
    updated_at = now();

create or replace function public.sync_customer_vat_details()
returns trigger
language plpgsql
as $$
begin
  if nullif(trim(new.vat_code), '') is null
     and nullif(trim(new.vat_registration_number), '') is null then
    delete from public.customer_vat
    where customer_id = new.id;
  else
    insert into public.customer_vat (customer_id, vat_code, vat_registration_number)
    values (new.id, nullif(trim(new.vat_code), ''), nullif(trim(new.vat_registration_number), ''))
    on conflict (customer_id) do update
    set vat_code = excluded.vat_code,
        vat_registration_number = excluded.vat_registration_number,
        updated_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists customers_sync_vat_details_insert on public.customers;
create trigger customers_sync_vat_details_insert
after insert on public.customers
for each row
execute function public.sync_customer_vat_details();

drop trigger if exists customers_sync_vat_details_update on public.customers;
create trigger customers_sync_vat_details_update
after update of vat_code, vat_registration_number on public.customers
for each row
when (
  old.vat_code is distinct from new.vat_code
  or old.vat_registration_number is distinct from new.vat_registration_number
)
execute function public.sync_customer_vat_details();
