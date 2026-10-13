-- ============================================================
-- Shop-scoped inventory creation with atomic opening stock
--
-- Creates the catalog row and, when an opening quantity is supplied,
-- records the initial IN movement in the same transaction. The shop is
-- always resolved from auth.uid(), so callers cannot cross shop bounds.
-- ============================================================

create or replace function public.create_inventory_item(
  p_sku text,
  p_name text,
  p_category text,
  p_metal_type text,
  p_purity text,
  p_weight_g numeric,
  p_cost_rate numeric,
  p_sale_rate numeric,
  p_min_stock_qty integer,
  p_location text,
  p_is_active boolean,
  p_opening_qty integer
)
returns public.inventory_items
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shop_id uuid;
  v_sale_rate numeric(14, 2);
  v_min_stock_qty integer;
  v_is_active boolean;
  v_opening_qty integer;
  v_item public.inventory_items%ROWTYPE;
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

  p_sku := nullif(btrim(p_sku), '');
  p_name := nullif(btrim(p_name), '');
  p_category := upper(btrim(p_category));
  p_metal_type := upper(btrim(p_metal_type));
  p_purity := upper(btrim(p_purity));
  p_location := nullif(btrim(p_location), '');

  if p_sku is null then
    raise exception 'SKU is required.';
  end if;

  if p_name is null then
    raise exception 'Name is required.';
  end if;

  if p_category not in ('RING', 'NECKLACE', 'BANGLE', 'CHAIN', 'COIN', 'OTHER') then
    raise exception 'Invalid category.';
  end if;

  if p_metal_type not in ('GOLD', 'SILVER') then
    raise exception 'Invalid metal type.';
  end if;

  if p_metal_type = 'GOLD'
    and p_purity not in ('24K', '23K', '22K', '20K', '18K', '16K', '14K', '10K') then
    raise exception 'Invalid gold purity.';
  end if;

  if p_metal_type = 'SILVER'
    and p_purity not in ('999', '995', '958', '925', '900', '800') then
    raise exception 'Invalid silver purity.';
  end if;

  if p_weight_g is null or p_weight_g <= 0 then
    raise exception 'Weight must be greater than zero.';
  end if;

  if p_cost_rate is null or p_cost_rate <= 0 then
    raise exception 'Cost rate must be greater than zero.';
  end if;

  if p_sale_rate is null or p_sale_rate = 0 then
    v_sale_rate := round(p_cost_rate * 1.10, 2);
  elsif p_sale_rate < p_cost_rate then
    raise exception 'Sale rate should be greater than or equal to cost rate.';
  else
    v_sale_rate := p_sale_rate;
  end if;

  v_min_stock_qty := coalesce(p_min_stock_qty, 0);
  if v_min_stock_qty < 0 then
    raise exception 'Minimum stock quantity cannot be negative.';
  end if;

  v_is_active := coalesce(p_is_active, true);
  v_opening_qty := coalesce(p_opening_qty, 0);

  if v_opening_qty < 0 then
    raise exception 'Opening quantity cannot be negative.';
  end if;

  insert into public.inventory_items (
    shop_id,
    sku,
    name,
    category,
    metal_type,
    purity,
    weight_g,
    cost_rate,
    sale_rate,
    min_stock_qty,
    location,
    is_active
  )
  values (
    v_shop_id,
    p_sku,
    p_name,
    p_category,
    p_metal_type,
    p_purity,
    p_weight_g,
    p_cost_rate,
    v_sale_rate,
    v_min_stock_qty,
    p_location,
    v_is_active
  )
  returning * into v_item;

  if v_opening_qty > 0 then
    insert into public.stock_movements (
      shop_id,
      item_id,
      type,
      qty,
      unit_weight_g,
      unit_cost_rate,
      ref_type,
      notes,
      created_by
    )
    values (
      v_shop_id,
      v_item.id,
      'IN',
      v_opening_qty,
      v_item.weight_g,
      v_item.cost_rate,
      'OPENING',
      'Opening stock',
      auth.uid()
    );
  end if;

  return v_item;
end;
$$;

grant execute on function public.create_inventory_item(
  text,
  text,
  text,
  text,
  text,
  numeric,
  numeric,
  numeric,
  integer,
  text,
  boolean,
  integer
) to authenticated;

grant execute on function public.create_inventory_item(
  text,
  text,
  text,
  text,
  text,
  numeric,
  numeric,
  numeric,
  integer,
  text,
  boolean,
  integer
) to service_role;
