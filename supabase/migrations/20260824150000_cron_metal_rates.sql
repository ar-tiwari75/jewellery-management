-- ============================================================
-- CRON JOB SETUP: Daily refresh of gold/silver rates
-- Runs every day at 10:00 AM IST (04:30 UTC)
-- ============================================================

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a function that pg_cron can call to trigger the edge function
-- This uses pg_net to make HTTP request to the edge function
CREATE OR REPLACE FUNCTION public.fetch_daily_metal_rates()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  response jsonb;
BEGIN
  -- Call the edge function via HTTP
  -- Note: This requires pg_net extension and proper network config
  -- For Supabase, better to schedule via Dashboard → Cron Jobs
  -- This function is provided for reference
  RAISE NOTICE 'Daily metal rates fetch triggered at %', now();
END;
$$;

-- Schedule via pg_cron (run at 04:30 UTC = 10:00 AM IST)
-- Uncomment after ensuring pg_net is configured:
-- SELECT cron.schedule(
--   'daily-metal-rates-refresh',
--   '30 4 * * *',
--   'SELECT public.fetch_daily_metal_rates()'
-- );

-- ============================================================
-- RECOMMENDED: Set up via Supabase Dashboard (easier)
-- ============================================================
-- 1. Go to Supabase Dashboard → Project → Settings → Edge Functions
-- 2. Copy the fetch-metal-rates function URL
-- 3. Go to Database → Cron Jobs → Create new job
-- 4. Schedule: "30 4 * * *" (04:30 UTC daily)
-- 5. Command: 
--    curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/fetch-metal-rates" \
--      -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
--      -H "Content-Type: application/json" \
--      -d '{}'
-- 6. Save