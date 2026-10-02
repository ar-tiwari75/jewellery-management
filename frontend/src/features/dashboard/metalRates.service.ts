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

function getTodayDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

async function fetchAndStoreTodaysRates(): Promise<DailyMetalRate | null> {
  const today = getTodayDate();
  
  try {
    const response = await fetch(
      "https://ucrsqdjhkhedyzmjonjk.supabase.co/functions/v1/fetch-metal-rates",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      }
    );

    if (!response.ok) {
      console.error("Failed to fetch metal rates from edge function");
      return null;
    }

    const result = await response.json();
    
    if (result.success && result.rate) {
      return result.rate as DailyMetalRate;
    }
    
    return null;
  } catch (error) {
    console.error("Error fetching metal rates:", error);
    return null;
  }
}

export async function getLatestMetalRate(): Promise<DailyMetalRate | null> {
  const today = getTodayDate();

  // First, try to get today's rates from database
  const { data: existingRate, error } = await supabase
    .from("daily_metal_rates")
    .select("*")
    .eq("city", "Mumbai")
    .eq("rate_date", today)
    .maybeSingle();

  if (error) {
    console.error("Unable to load metal rates:", error);
    throw new Error("Unable to load today's market rates.");
  }

  // If today's rates exist, return them
  if (existingRate) {
    return existingRate;
  }

  // No rates for today - fetch from edge function
  console.log("No rates for today, fetching from edge function...");
  const freshRate = await fetchAndStoreTodaysRates();
  
  if (freshRate) {
    return freshRate;
  }

  // Fallback: try to get the most recent rate (any date)
  const { data: fallbackRate, error: fallbackError } = await supabase
    .from("daily_metal_rates")
    .select("*")
    .eq("city", "Mumbai")
    .order("rate_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fallbackError) {
    console.error("Unable to load fallback metal rates:", fallbackError);
    throw new Error("Unable to load market rates.");
  }

  return fallbackRate;
}