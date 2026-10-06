-- ============================================================
-- RPC: Atomic customer code generation using sequence
-- ============================================================

-- Create a sequence per shop (or use a single sequence with shop prefix)
CREATE SEQUENCE IF NOT EXISTS public.customer_code_seq;

-- Function to get next customer code atomically
CREATE OR REPLACE FUNCTION public.get_next_customer_code(p_shop_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next_num bigint;
  v_code text;
BEGIN
  -- Atomically get next sequence value
  v_next_num := nextval('public.customer_code_seq');
  
  -- Format: CUS-0001, CUS-0002, etc.
  v_code := 'CUS-' || lpad(v_next_num::text, 4, '0');
  
  RETURN v_code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_next_customer_code(uuid) TO authenticated;