create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),

  shop_id uuid not null references public.shops(id) on delete cascade,

  sku text not null,
  name text not null,
  category text not null check (category in ('RING','NECKLACE','BANGLE','CHAIN','COIN','OTHER')),
  metal_type text not null check (metal_type in ('GOLD','SILVER')),
  purity text not null,

  weight_g numeric(12,3) not null check (weight_g > 0),

  cost_rate numeric(14,2) not null check (cost_rate > 0),
  sale_rate numeric(14,2) not null check (sale_rate > 0),

  min_stock_qty integer not null default 0 check (min_stock_qty >= 0),

  location text,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint inventory_items_shop_sku_key unique (shop_id, sku)
);

-- Updated_at trigger function (idempotent)
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create index inventory_items_shop_category_idx on public.inventory_items (shop_id, category);
create index inventory_items_shop_metal_purity_idx on public.inventory_items (shop_id, metal_type, purity);
create index inventory_items_shop_active_idx on public.inventory_items (shop_id, is_active) where is_active = true;

alter table public.inventory_items enable row level security;

grant select, insert, update, delete on public.inventory_items to authenticated;
grant select, insert, update, delete on public.inventory_items to service_role;

create policy "Users can manage inventory in their shop"
on public.inventory_items
for all
to authenticated
using (
  shop_id = (
    select shop_id from public.profiles where id = auth.uid()
  )
)
with check (
  shop_id = (
    select shop_id from public.profiles where id = auth.uid()
  )
);

create policy "Service role full access"
on public.inventory_items
for all
to service_role
using (true)
with check (true);

create trigger inventory_items_updated_at
before update on public.inventory_items
for each row
execute function public.update_updated_at_column();

-- Stock Movements
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),

  shop_id uuid not null references public.shops(id) on delete cascade,
  item_id uuid not null references public.inventory_items(id) on delete cascade,

  type text not null check (type in ('IN','OUT','ADJ')),
  qty integer not null check (qty != 0),

  unit_weight_g numeric(12,3) not null check (unit_weight_g > 0),
  unit_cost_rate numeric(14,2) not null check (unit_cost_rate >= 0),

  ref_type text,
  ref_id uuid,
  notes text,

  created_by uuid not null references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index stock_movements_shop_item_idx on public.stock_movements (shop_id, item_id);
create index stock_movements_shop_created_idx on public.stock_movements (shop_id, created_at desc);
create index stock_movements_ref_idx on public.stock_movements (ref_type, ref_id);

alter table public.stock_movements enable row level security;

grant select, insert on public.stock_movements to authenticated;
grant select, insert, update, delete on public.stock_movements to service_role;

create policy "Users can view movements in their shop"
on public.stock_movements
for select
to authenticated
using (
  shop_id = (
    select shop_id from public.profiles where id = auth.uid()
  )
);

create policy "Users can insert movements in their shop"
on public.stock_movements
for insert
to authenticated
with check (
  shop_id = (
    select shop_id from public.profiles where id = auth.uid()
  )
);

create policy "Service role full access"
on public.stock_movements
for all
to service_role
using (true)
with check (true);

-- Link invoice items to inventory (optional)
alter table public.invoice_items
  add column if not exists inventory_item_id uuid references public.inventory_items(id) on delete set null;

create index if not exists invoice_items_inventory_idx on public.invoice_items (inventory_item_id);

-- Materialized view for fast stock reads
create materialized view if not exists public.inventory_stock as
select
  i.id as item_id,
  i.shop_id,
  coalesce(sum(case when m.type = 'IN' then m.qty else 0 end), 0) -
  coalesce(sum(case when m.type = 'OUT' then m.qty else 0 end), 0) +
  coalesce(sum(case when m.type = 'ADJ' then m.qty else 0 end), 0) as current_qty,
  max(m.created_at) as last_movement_at
from public.inventory_items i
left join public.stock_movements m on m.item_id = i.id
group by i.id, i.shop_id;

create unique index on public.inventory_stock (item_id);
create index inventory_stock_shop_idx on public.inventory_stock (shop_id);

-- Function to refresh a single item's stock (for real-time updates)
create or replace function public.refresh_inventory_stock(p_item_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  delete from public.inventory_stock where item_id = p_item_id;
  insert into public.inventory_stock (item_id, shop_id, current_qty, last_movement_at)
  select
    i.id,
    i.shop_id,
    coalesce(sum(case when m.type = 'IN' then m.qty else 0 end), 0) -
    coalesce(sum(case when m.type = 'OUT' then m.qty else 0 end), 0) +
    coalesce(sum(case when m.type = 'ADJ' then m.qty else 0 end), 0),
    max(m.created_at)
  from public.inventory_items i
  left join public.stock_movements m on m.item_id = i.id
  where i.id = p_item_id
  group by i.id, i.shop_id;
end;
$$;

grant execute on function public.refresh_inventory_stock(uuid) to authenticated;
grant execute on function public.refresh_inventory_stock(uuid) to service_role;

-- Trigger to auto-refresh stock on movement insert/update/delete
create or replace function public.trigger_refresh_inventory_stock()
returns trigger
language plpgsql
security definer
as $$
begin
  perform public.refresh_inventory_stock(NEW.item_id);
  return NEW;
end;
$$;

drop trigger if exists stock_movements_refresh_stock on public.stock_movements;
create trigger stock_movements_refresh_stock
after insert or update or delete on public.stock_movements
for each row execute function public.trigger_refresh_inventory_stock();