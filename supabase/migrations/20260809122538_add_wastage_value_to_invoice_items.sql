alter table public.invoice_items
add column if not exists wastage_value numeric(14, 2)
not null default 0;