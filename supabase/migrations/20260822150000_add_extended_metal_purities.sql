ALTER TABLE public.daily_metal_rates
  ADD COLUMN gold_23k numeric(12,2),
  ADD COLUMN gold_20k numeric(12,2),
  ADD COLUMN gold_16k numeric(12,2),
  ADD COLUMN gold_14k numeric(12,2),
  ADD COLUMN gold_10k numeric(12,2),
  ADD COLUMN silver_995 numeric(12,2),
  ADD COLUMN silver_958 numeric(12,2),
  ADD COLUMN silver_925 numeric(12,2),
  ADD COLUMN silver_900 numeric(12,2),
  ADD COLUMN silver_800 numeric(12,2);
