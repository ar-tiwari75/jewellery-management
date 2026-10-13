-- ============================================================
-- Dashboard Inventory Watch
--
-- Returns active items needing attention first: out-of-stock items,
-- then low-stock items. Shop isolation is enforced inside this
-- SECURITY DEFINER function.
-- ============================================================

create or replace function public.get_inventory_watch_items(p_limit integer default 5)
returns table (
  item_id uuid,
  sku text,
  name text,
  category text,
  metal_type text,
  purity text,
  weight_g numeric,
  cost_rate numeric,
  sale_rate numeric,
  min_stock_qty integer,
  location text,
  current_qty bigint,
  stock_value numeric,
  last_movement_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shop_id uuid;
  v_limit integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated.';
  end if;

  select shop_id into v_shop_id
  from public.profiles
  where id = auth.uid();

  if not found or v_shop_id is null then
    raise exception 'Unable to determine your shop.';
  end if;

  v_limit := greatest(1, least(coalesce(p_limit, 5), 25));

  return query
  select
    i.id,
    i.sku,
    i.name,
    i.category,
    i.metal_type,
    i.purity,
    i.weight_g,
    i.cost_rate,
    i.sale_rate,
    i.min_stock_qty,
    i.location,
    coalesce(s.current_qty, 0),
    coalesce(s.current_qty, 0) * i.cost_rate,
    s.last_movement_at
  from public.inventory_items as i
  left join public.inventory_stock as s
    on s.item_id = i.id
  where i.shop_id = v_shop_id
    and i.is_active is true
    and (
      coalesce(s.current_qty, 0) = 0
      or (
        i.min_stock_qty > 0
        and coalesce(s.current_qty, 0) <= i.min_stock_qty
      )
    )
  order by
    (coalesce(s.current_qty, 0) = 0) desc,
    coalesce(s.current_qty, 0) asc,
    i.updated_at desc
  limit v_limit;
end;
$$;

grant execute on function public.get_inventory_watch_items(integer) to authenticated;
grant execute on function public.get_inventory_watch_items(integer) to service_role;
