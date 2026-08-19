import { createClient } from "@supabase/supabase-js";

import { AutomaticMetalRateProvider } from "../_shared/automatic-metal-rate-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      {
        error: "Method not allowed",
      },
      405,
    );
  }

  try {
    const supabaseUrl =
      Deno.env.get("SUPABASE_URL");

    const serviceRoleKey =
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY",
      );

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error(
        "Supabase server configuration is missing.",
      );
    }

    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey,
    );

    const provider =
      new AutomaticMetalRateProvider();

    const rate =
      await provider.getDailyRate();

    const { data, error } =
      await supabase
        .from("daily_metal_rates")
        .upsert(
          {
            rate_date: rate.rateDate,
            city: rate.city,

            gold_24k: rate.gold24k,
            gold_22k: rate.gold22k,
            gold_18k: rate.gold18k,

            silver_999: rate.silver999,

            gold_unit: rate.goldUnit,
            silver_unit: rate.silverUnit,

            fetched_at:
              new Date().toISOString(),
          },
          {
            onConflict:
              "rate_date,city",
          },
        )
        .select()
        .single();

    if (error) {
  console.error(
    "Metal rate database error:",
    error,
  );

  throw new Error(
    `Unable to store today's metal rates: ${error.message}`,
  );
}

    return jsonResponse({
      success: true,
      rate: data,
    });
  } catch (error) {
    console.error(
      "fetch-metal-rates error:",
      error,
    );

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to fetch metal rates.",
      },
      500,
    );
  }
});

function jsonResponse(
  body: unknown,
  status = 200,
): Response {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type":
          "application/json",
      },
    },
  );
}