import { supabase } from "../../lib/supabase";

export interface DailyMetalRate {
  id: string;
  rate_date: string;
  city: string;

  gold_24k: number;
  gold_22k: number;
  gold_18k: number;

  silver_999: number;

  gold_unit: string;
  silver_unit: string;

  fetched_at: string | null;
}

export async function getLatestMetalRate(): Promise<DailyMetalRate | null> {
  const { data, error } = await supabase
    .from("daily_metal_rates")
    .select(
      `
        id,
        rate_date,
        city,
        gold_24k,
        gold_22k,
        gold_18k,
        silver_999,
        gold_unit,
        silver_unit,
        fetched_at
      `,
    )
    .eq("city", "Mumbai")
    .order("rate_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Unable to load metal rates:", error);

    throw new Error(
      "Unable to load today's market rates.",
    );
  }

  return data;
}