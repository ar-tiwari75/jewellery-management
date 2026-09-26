-- ============================================================
-- SAFETY NET: Auto-update inventory sale_rate from invoice items
-- Default sale_rate = cost_rate * 1.1 (10% markup) via trigger
-- ============================================================

-- 1. Trigger function: set default sale_rate = cost_rate * 1.10 on insert
create or replace function public.set_default_inventory_sale_rate()
returns trigger
language plpgsql
security definer
as $$
begin
  if TG_OP = 'INSERT' and NEW.sale_rate is null then
    NEW.sale_rate := NEW.cost_rate * 1.10;
  end if;
  return NEW;
end;
$$;

-- 2. Attach trigger to inventory_items
drop trigger if exists inventory_items_set_default_sale_rate on public.inventory_items;
create trigger inventory_items_set_default_sale_rate
before insert on public.inventory_items
for each row execute function public.set_default_inventory_sale_rate();

-- 3. Trigger function: update inventory sale_rate when invoice item is inserted/updated
create or replace function public.update_inventory_sale_rate_from_invoice()
returns trigger
language plpgsql
security definer
as $$
begin
  if TG_OP = 'INSERT' or TG_OP = 'UPDATE' then
    if NEW.inventory_item_id is not null and NEW.metal_rate is not null and NEW.metal_rate > 0 then
      update public.inventory_items
      set sale_rate = NEW.metal_rate,
          updated_at = now()
      where id = NEW.inventory_item_id
      and (sale_rate is null or sale_rate != NEW.metal_rate);
    end if;
  end if;
  return NEW;
end;
$$;

-- 4. Attach trigger to invoice_items
drop trigger if exists invoice_items_update_inventory_sale_rate on public.invoice_items;
create trigger invoice_items_update_inventory_sale_rate
after insert or update on public.invoice_items
for each row execute function public.update_inventory_sale_rate_from_invoice();

-- 5. Ensure existing inventory items with NULL sale_rate get default
update public.inventory_items
set sale_rate = cost_rate * 1.10,
    updated_at = now()
where sale_rate is null;