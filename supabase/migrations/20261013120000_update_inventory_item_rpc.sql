-- ============================================================
-- Shop-scoped inventory update RPC
--
-- Uses POST /rpc instead of a direct table PATCH, while enforcing
-- the caller's shop on the server. SECURITY DEFINER is required
-- because the function bypasses RLS after checking auth.uid().
-- ============================================================

create or replace function public.update_inventory_item(
  p_item_id uuid,
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
  p_is_active boolean
)
returns public.inventory_items
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shop_id uuid;
  v_sale_rate numeric(14, 2);
  v_row public.inventory_items%ROWTYPE;
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

  if p_min_stock_qty is null then
    p_min_stock_qty := 0;
  end if;

  if p_min_stock_qty < 0 then
    raise exception 'Minimum stock quantity cannot be negative.';
  end if;

  if p_is_active is null then
    p_is_active := true;
  end if;

  update public.inventory_items
  set
    sku = p_sku,
    name = p_name,
    category = p_category,
    metal_type = p_metal_type,
    purity = p_purity,
    weight_g = p_weight_g,
    cost_rate = p_cost_rate,
    sale_rate = v_sale_rate,
    min_stock_qty = p_min_stock_qty,
    location = p_location,
    is_active = p_is_active,
    updated_at = now()
  where id = p_item_id
    and shop_id = v_shop_id
  returning * into v_row;

  if not found then
    raise exception 'Item not found in your shop.';
  end if;

  return v_row;
end;
$$;

grant execute on function public.update_inventory_item(
  uuid,
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
  boolean
) to authenticated;

grant execute on function public.update_inventory_item(
  uuid,
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
  boolean
) to service_role;
