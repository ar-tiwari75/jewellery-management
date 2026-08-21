import { supabase } from "../../lib/supabase";

export interface DailyMetalRate {
  id: string;
  rate_date: string;
  city: string;

  gold_24k: number;
  gold_23k: number | null;
  gold_22k: number;
  gold_20k: number | null;
  gold_18k: number;
  gold_16k: number | null;
  gold_14k: number | null;
  gold_10k: number | null;

  silver_999: number;
  silver_995: number | null;
  silver_958: number | null;
  silver_925: number | null;
  silver_900: number | null;
  silver_800: number | null;

  gold_unit: string;
  silver_unit: string;

  fetched_at: string | null;
}

export async function getLatestMetalRate(): Promise<DailyMetalRate | null> {
  const { data, error } = await supabase
    .from("daily_metal_rates")
    .select("*")
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