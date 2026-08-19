create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),

  invoice_number text not null unique,

  customer_id uuid
    references public.customers(id)
    on delete set null,

  invoice_date date not null default current_date,

  subtotal numeric(14, 2) not null default 0,
  discount numeric(14, 2) not null default 0,
  gst numeric(14, 2) not null default 0,
  grand_total numeric(14, 2) not null default 0,

  status text not null default 'DRAFT',

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint invoices_status_check
    check (
      status in ('DRAFT', 'FINAL', 'CANCELLED')
    ),

  constraint invoices_amounts_check
    check (
      subtotal >= 0
      and discount >= 0
      and gst >= 0
      and grand_total >= 0
    )
);

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),

  invoice_id uuid not null
    references public.invoices(id)
    on delete cascade,

  item_name text not null,

  metal_type text not null,
  purity text not null,

  weight numeric(12, 3) not null,
  metal_rate numeric(14, 2) not null,
  metal_rate_unit text not null default '10g',

  metal_value numeric(14, 2) not null default 0,

  wastage_percent numeric(7, 3) not null default 0,
  wastage_weight numeric(12, 3) not null default 0,

  making_charge numeric(14, 2) not null default 0,

  item_discount numeric(14, 2) not null default 0,

  taxable_amount numeric(14, 2) not null default 0,

  created_at timestamptz not null default now(),

  constraint invoice_items_metal_type_check
    check (
      metal_type in ('GOLD', 'SILVER')
    ),

  constraint invoice_items_weight_check
    check (
      weight > 0
    ),

  constraint invoice_items_rate_check
    check (
      metal_rate > 0
    ),

  constraint invoice_items_rate_unit_check
    check (
      metal_rate_unit in ('10g', '1kg')
    ),

  constraint invoice_items_wastage_check
    check (
      wastage_percent >= 0
    ),

  constraint invoice_items_making_charge_check
    check (
      making_charge >= 0
    ),

  constraint invoice_items_discount_check
    check (
      item_discount >= 0
    )
);

create index if not exists invoices_customer_id_idx
  on public.invoices(customer_id);

create index if not exists invoices_invoice_date_idx
  on public.invoices(invoice_date);

create index if not exists invoice_items_invoice_id_idx
  on public.invoice_items(invoice_id);

alter table public.invoices enable row level security;

alter table public.invoice_items enable row level security;

grant select, insert, update
on public.invoices
to authenticated;

grant select, insert, update
on public.invoice_items
to authenticated;

create policy "Authenticated users can read invoices"
on public.invoices
for select
to authenticated
using (true);

create policy "Authenticated users can create invoices"
on public.invoices
for insert
to authenticated
with check (
  created_by = auth.uid()
);

create policy "Authenticated users can update invoices"
on public.invoices
for update
to authenticated
using (
  created_by = auth.uid()
)
with check (
  created_by = auth.uid()
);

create policy "Authenticated users can read invoice items"
on public.invoice_items
for select
to authenticated
using (true);

create policy "Authenticated users can create invoice items"
on public.invoice_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.invoices
    where invoices.id = invoice_items.invoice_id
      and invoices.created_by = auth.uid()
  )
);

create policy "Authenticated users can update invoice items"
on public.invoice_items
for update
to authenticated
using (
  exists (
    select 1
    from public.invoices
    where invoices.id = invoice_items.invoice_id
      and invoices.created_by = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.invoices
    where invoices.id = invoice_items.invoice_id
      and invoices.created_by = auth.uid()
  )
);