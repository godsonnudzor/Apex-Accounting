create table if not exists public.supplier_vat (
  supplier_id bigint primary key references public.suppliers(id) on delete cascade,
  vat_registration_number varchar(100) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.supplier_vat (supplier_id, vat_registration_number)
select id, vat_registration_number
from public.suppliers
where nullif(trim(vat_registration_number), '') is not null
on conflict (supplier_id) do update
set vat_registration_number = excluded.vat_registration_number,
    updated_at = now();

create or replace function public.sync_supplier_vat_registration()
returns trigger
language plpgsql
as $$
begin
  if nullif(trim(new.vat_registration_number), '') is null then
    delete from public.supplier_vat
    where supplier_id = new.id;
  else
    insert into public.supplier_vat (supplier_id, vat_registration_number)
    values (new.id, trim(new.vat_registration_number))
    on conflict (supplier_id) do update
    set vat_registration_number = excluded.vat_registration_number,
        updated_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists suppliers_sync_vat_registration_insert on public.suppliers;
create trigger suppliers_sync_vat_registration_insert
after insert on public.suppliers
for each row
execute function public.sync_supplier_vat_registration();

drop trigger if exists suppliers_sync_vat_registration_update on public.suppliers;
create trigger suppliers_sync_vat_registration_update
after update of vat_registration_number on public.suppliers
for each row
when (old.vat_registration_number is distinct from new.vat_registration_number)
execute function public.sync_supplier_vat_registration();
