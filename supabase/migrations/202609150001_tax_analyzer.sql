create extension if not exists "pgcrypto";

create table if not exists public.jurisdictions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text not null default 'GH',
  tax_year integer not null,
  currency text not null default 'GHS',
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
values ('Ghana', 'GH', 2025, 'GHS')
on conflict (name, country, tax_year) do nothing;

insert into public.tax_brackets (jurisdiction_id, filing_status, min_income, max_income, rate)
select j.id, seed.filing_status, seed.min_income, seed.max_income, seed.rate
from public.jurisdictions j
cross join (values
  ('single', 0::numeric, 490::numeric, 0.00::numeric), ('single', 490, 600, 0.05), ('single', 600, 730, 0.10), ('single', 730, 3896.67, 0.175), ('single', 3896.67, 19896.67, 0.25), ('single', 19896.67, 50416.67, 0.30), ('single', 50416.67, null, 0.35),
  ) as seed(filing_status, min_income, max_income, rate)
where j.name = 'Ghana' and j.tax_year = 2026
  and not exists (select 1 from public.tax_brackets existing where existing.jurisdiction_id = j.id);