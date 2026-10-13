-- ============================================================
-- Fix stock storage: replace inventory_stock materialized view
-- with a trigger-maintained table.
--
-- Materialized views cannot receive DELETE/INSERT from the stock
-- movement trigger, which caused:
-- "cannot change materialized view inventory_stock".
-- ============================================================

drop trigger if exists stock_movements_refresh_stock on public.stock_movements;
drop trigger if exists inventory_stock_ensure_row on public.inventory_items;

drop materialized view if exists public.inventory_stock;

create table if not exists public.inventory_stock (
  item_id uuid primary key references public.inventory_items(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete cascade,
  current_qty bigint not null default 0,
  last_movement_at timestamptz
);

create index if not exists inventory_stock_shop_idx
  on public.inventory_stock (shop_id);

alter table public.inventory_stock enable row level security;

grant select on table public.inventory_stock to authenticated;
grant all on table public.inventory_stock to service_role;

drop policy if exists "Users can read their shop's inventory stock"
  on public.inventory_stock;
create policy "Users can read their shop's inventory stock"
  on public.inventory_stock
  for select
  to authenticated
  using (
    shop_id = (
      select shop_id from public.profiles where id = auth.uid()
    )
  );

drop policy if exists "Service role full access"
  on public.inventory_stock;
create policy "Service role full access"
  on public.inventory_stock
  for all
  to service_role
  using (true)
  with check (true);

insert into public.inventory_stock (
  item_id,
  shop_id,
  current_qty,
  last_movement_at
)
select
  i.id,
  i.shop_id,
  coalesce(
    sum(
      case
        when m.type = 'IN' then m.qty
        when m.type = 'OUT' then -m.qty
        else m.qty
      end
    ),
    0
  ),
  max(m.created_at)
from public.inventory_items as i
left join public.stock_movements as m
  on m.item_id = i.id
group by i.id, i.shop_id
on conflict (item_id) do update set
  shop_id = excluded.shop_id,
  current_qty = excluded.current_qty,
  last_movement_at = excluded.last_movement_at;

create or replace function public.refresh_inventory_stock(p_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shop_id uuid;
  v_qty bigint;
  v_last timestamptz;
begin
  select shop_id into v_shop_id
  from public.inventory_items
  where id = p_item_id;

  if not found then
    delete from public.inventory_stock where item_id = p_item_id;
    return;
  end if;

  select
    coalesce(
      sum(
        case
          when type = 'IN' then qty
          when type = 'OUT' then -qty
          else qty
        end
      ),
      0
    ),
    max(created_at)
  into v_qty, v_last
  from public.stock_movements
  where item_id = p_item_id;

  insert into public.inventory_stock as stock (
    item_id,
    shop_id,
    current_qty,
    last_movement_at
  )
  values (p_item_id, v_shop_id, v_qty, v_last)
  on conflict (item_id) do update set
    shop_id = excluded.shop_id,
    current_qty = excluded.current_qty,
    last_movement_at = excluded.last_movement_at;
end;
$$;

grant execute on function public.refresh_inventory_stock(uuid) to authenticated;
grant execute on function public.refresh_inventory_stock(uuid) to service_role;

create or replace function public.trigger_refresh_inventory_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'DELETE' then
    perform public.refresh_inventory_stock(OLD.item_id);
    return OLD;
  end if;

  perform public.refresh_inventory_stock(NEW.item_id);

  if TG_OP = 'UPDATE' and NEW.item_id is distinct from OLD.item_id then
    perform public.refresh_inventory_stock(OLD.item_id);
  end if;

  return NEW;
end;
$$;

create trigger stock_movements_refresh_stock
after insert or update or delete on public.stock_movements
for each row execute function public.trigger_refresh_inventory_stock();

create or replace function public.ensure_inventory_stock_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.inventory_stock (item_id, shop_id, current_qty, last_movement_at)
  values (NEW.id, NEW.shop_id, 0, null)
  on conflict (item_id) do nothing;

  return NEW;
end;
$$;

create trigger inventory_stock_ensure_row
after insert on public.inventory_items
for each row execute function public.ensure_inventory_stock_row();
