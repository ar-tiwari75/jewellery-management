-- ============================================================
-- SECURITY FIX: Revoke blanket grants, add proper RLS policies
-- ============================================================

-- 1. REVOKE dangerous blanket grants from migration 20260820001000
REVOKE ALL ON ALL TABLES IN SCHEMA PUBLIC FROM authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA PUBLIC FROM authenticated;
REVOKE ALL ON ALL ROUTINES IN SCHEMA PUBLIC FROM authenticated;

-- 2. Ensure service_role still has full access (already correct)
-- GRANT ALL ON ALL TABLES IN SCHEMA PUBLIC TO service_role;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA PUBLIC TO service_role;
-- GRANT ALL ON ALL ROUTINES IN SCHEMA PUBLIC TO service_role;

-- 3. Add RLS to daily_metal_rates table (was missing)
ALTER TABLE IF EXISTS public.daily_metal_rates ENABLE ROW LEVEL SECURITY;

-- Grant select to authenticated users (read-only metal rates)
GRANT SELECT ON TABLE public.daily_metal_rates TO authenticated;

-- Policy: Authenticated users can read metal rates
DROP POLICY IF EXISTS "Authenticated users can read daily metal rates" ON public.daily_metal_rates;
CREATE POLICY "Authenticated users can read daily metal rates"
ON public.daily_metal_rates
FOR SELECT
TO authenticated
USING (true);

-- Service role can write (edge function)
GRANT SELECT, INSERT, UPDATE ON TABLE public.daily_metal_rates TO service_role;
DROP POLICY IF EXISTS "Service role can manage daily metal rates" ON public.daily_metal_rates;
CREATE POLICY "Service role can manage daily metal rates"
ON public.daily_metal_rates
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 4. Ensure all existing tables have proper RLS (audit)
-- profiles - already has RLS from 20260808171011_create_profiles.sql
-- customers - already has RLS
-- invoices - already has RLS
-- invoice_items - already has RLS
-- inventory_items - already has RLS from 20260822200000
-- stock_movements - already has RLS
-- shop_settings - already has RLS
-- shops - already has RLS

-- 5. Verify no tables have blanket grants to authenticated
-- (RLS policies should control access per-shop)

-- 6. Add missing RLS to any tables that might lack it
-- (Defensive - will no-op if already enabled)

DO $$
DECLARE
    tbl record;
BEGIN
    FOR tbl IN
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename NOT IN (
            'spatial_ref_sys',  -- PostGIS
            'schema_migrations', -- Supabase internal
            'realtime_messages', -- Supabase internal
            'supabase_migrations' -- Supabase internal
        )
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl.tablename);
    END LOOP;
END $$;

-- 7. Ensure GRANT SELECT on all tables to authenticated (read access via RLS)
-- This is safe because RLS policies will filter by shop_id
DO $$
DECLARE
    tbl record;
BEGIN
    FOR tbl IN
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename NOT IN (
            'spatial_ref_sys', 'schema_migrations', 'realtime_messages', 'supabase_migrations'
        )
    LOOP
        EXECUTE format('GRANT SELECT ON TABLE public.%I TO authenticated', tbl.tablename);
    END LOOP;
END $$;

-- 8. Revoke any write grants to authenticated (should only have via RLS policies)
DO $$
DECLARE
    tbl record;
BEGIN
    FOR tbl IN
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename NOT IN (
            'spatial_ref_sys', 'schema_migrations', 'realtime_messages', 'supabase_migrations'
        )
    LOOP
        EXECUTE format('REVOKE INSERT, UPDATE, DELETE ON TABLE public.%I FROM authenticated', tbl.tablename);
    END LOOP;
END $$;

-- 9. Ensure service_role has full access
DO $$
DECLARE
    tbl record;
BEGIN
    FOR tbl IN
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename NOT IN (
            'spatial_ref_sys', 'schema_migrations', 'realtime_messages', 'supabase_migrations'
        )
    LOOP
        EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', tbl.tablename);
    END LOOP;
END $$;

-- 10. Grant execute on functions to service_role only (not authenticated)
-- Authenticated users call via RPC with SECURITY DEFINER functions
DO $$
DECLARE
    fn record;
BEGIN
    FOR fn IN
        SELECT routine_name FROM information_schema.routines
        WHERE routine_schema = 'public'
        AND routine_type = 'FUNCTION'
    LOOP
        EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I FROM authenticated', fn.routine_name);
        EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I TO service_role', fn.routine_name);
    END LOOP;
END $$;

-- 11. Grant execute on specific RPC functions to authenticated (they have internal auth checks)
-- These functions verify the caller's shop/role internally
GRANT EXECUTE ON FUNCTION public.create_shop_for_current_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_shop_user(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_shop_users TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_inventory_stock(uuid) TO authenticated;