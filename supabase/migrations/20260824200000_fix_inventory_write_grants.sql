-- ============================================================
-- FIX: Re-grant INSERT/UPDATE/DELETE on inventory_items for authenticated users
-- The security migration revoked all write grants, but inventory_items
-- has specific RLS policies that require these grants.
-- ============================================================

GRANT INSERT, UPDATE, DELETE ON public.inventory_items TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.stock_movements TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.invoice_items TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.shop_settings TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.daily_metal_rates TO authenticated;