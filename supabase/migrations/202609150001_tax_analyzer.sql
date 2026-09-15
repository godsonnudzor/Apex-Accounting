create extension if not exists "pgcrypto";

create table if not exists public.jurisdictions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text not null default 'US',
  tax_year integer not null,
  currency text not null default 'USD',
  created_at timestamptz not null default now(),
  unique (name, country, tax_year)
);

create table if not exists public.tax_brackets (
  id uuid primary key default gen_random_uuid(),
  jurisdiction_id uuid not null references public.jurisdictions(id) on delete cascade,
  filing_status text not null check (filing_status in ('single', 'married_joint', 'head_of_household')),
  min_income numeric(14, 2) not null check (min_income >= 0),
  max_income numeric(14, 2) check (max_income is null or max_income > min_income),
  rate numeric(5, 4) not null check (rate >= 0 and rate <= 1),
  created_at timestamptz not null default now()
);

create table if not exists public.user_saved_calculations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  jurisdiction_id uuid not null references public.jurisdictions(id) on delete restrict,
  filing_status text not null check (filing_status in ('single', 'married_joint', 'head_of_household')),
  gross_income numeric(14, 2) not null check (gross_income >= 0),
  total_tax numeric(14, 2) not null check (total_tax >= 0),
  effective_rate numeric(5, 4) not null check (effective_rate >= 0 and effective_rate <= 1),
  marginal_rate numeric(5, 4) not null check (marginal_rate >= 0 and marginal_rate <= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.jurisdictions enable row level security;
alter table public.tax_brackets enable row level security;
alter table public.user_saved_calculations enable row level security;

create policy "Anyone can read jurisdictions" on public.jurisdictions for select using (true);
create policy "Anyone can read tax brackets" on public.tax_brackets for select using (true);
create policy "Users read their saved calculations" on public.user_saved_calculations for select using (auth.uid() = user_id);
create policy "Users create their saved calculations" on public.user_saved_calculations for insert with check (auth.uid() = user_id);
create policy "Users update their saved calculations" on public.user_saved_calculations for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete their saved calculations" on public.user_saved_calculations for delete using (auth.uid() = user_id);

insert into public.jurisdictions (name, country, tax_year, currency)
values ('United States Federal', 'US', 2025, 'USD')
on conflict (name, country, tax_year) do nothing;

insert into public.tax_brackets (jurisdiction_id, filing_status, min_income, max_income, rate)
select j.id, seed.filing_status, seed.min_income, seed.max_income, seed.rate
from public.jurisdictions j
cross join (values
  ('single', 0::numeric, 11925::numeric, .10::numeric), ('single', 11925, 48475, .12), ('single', 48475, 103350, .22), ('single', 103350, 197300, .24), ('single', 197300, 250525, .32), ('single', 250525, 626350, .35), ('single', 626350, null, .37),
  ('married_joint', 0, 23850, .10), ('married_joint', 23850, 96950, .12), ('married_joint', 96950, 206700, .22), ('married_joint', 206700, 394600, .24), ('married_joint', 394600, 501050, .32), ('married_joint', 501050, 751600, .35), ('married_joint', 751600, null, .37)
) as seed(filing_status, min_income, max_income, rate)
where j.name = 'United States Federal' and j.tax_year = 2025
  and not exists (select 1 from public.tax_brackets existing where existing.jurisdiction_id = j.id);