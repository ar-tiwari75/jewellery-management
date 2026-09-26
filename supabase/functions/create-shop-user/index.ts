import { createClient } from "@supabase/supabase-js";

const ALLOWED_ORIGIN = "https://jewellery-management-xi.vercel.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Credentials": "true",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authorization = req.headers.get("Authorization");
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase server configuration is missing.");
    if (!authorization?.startsWith("Bearer ")) return jsonResponse({ error: "You must be authenticated." }, 401);

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    const { data: authData, error: authError } = await supabase.auth.getUser(authorization.slice("Bearer ".length));
    if (authError || !authData.user) return jsonResponse({ error: `Your session is invalid: ${authError?.message || "User not found"}` }, 401);

    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
    const role = body.role;
    if (!email || !fullName || !["MANAGER", "STAFF"].includes(role)) return jsonResponse({ error: "Name, email, and a valid role are required." }, 400);

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    let callerProfile: { shop_id: string | null; role: string | null } | null = null;

    // 1. Try service role client
    const { data: adminProfileData, error: profileError } = await supabase
      .from("profiles")
      .select("shop_id, role")
      .eq("id", authData.user.id)
      .single();

    if (!profileError && adminProfileData) {
      callerProfile = adminProfileData;
    } else if (anonKey) {
      // 2. Fallback to user-authenticated client (uses caller's JWT token & RLS policy)
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authorization } },
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data: userProfileData, error: userProfileError } = await userClient
        .from("profiles")
        .select("shop_id, role")
        .eq("id", authData.user.id)
        .single();

      if (!userProfileError && userProfileData) {
        callerProfile = userProfileData;
      } else {
        console.error("Profile lookup error (service_role):", profileError);
        console.error("Profile lookup error (user_client):", userProfileError);
        return jsonResponse({
          error: `Admin profile lookup failed: ${profileError?.message || userProfileError?.message || "Profile not found"}`,
        }, 500);
      }
    } else {
      console.error("Profile query error:", profileError);
      return jsonResponse({ error: `Admin profile lookup failed: ${profileError?.message}` }, 500);
    }

    if (!callerProfile) {
      return jsonResponse({ error: "No profile found for your user account." }, 403);
    }

    if (callerProfile.role?.toUpperCase() !== "ADMIN") {
      return jsonResponse({ error: `Only shop administrators can invite users. (Your current role is: ${callerProfile.role})` }, 403);
    }

    if (!callerProfile.shop_id) {
      return jsonResponse({ error: "Your administrator account is not linked to any shop." }, 403);
    }

    const siteUrl = Deno.env.get("SITE_URL") ?? "http://127.0.0.1:3000";
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName, onboarding_type: "SHOP_USER", shop_id: callerProfile.shop_id, role },
      redirectTo: `${siteUrl.replace(/\/$/, "")}/set-password`,
    });
    if (error) return jsonResponse({ error: error.message }, 400);

    const { error: profileUpsertError } = await supabase.from("profiles").upsert({
      id: data.user.id,
      full_name: fullName,
      role,
      shop_id: callerProfile.shop_id,
    });
    if (profileUpsertError) {
      console.error("Failed to create profile:", profileUpsertError);
      return jsonResponse({
        error: `Invited user (${email}) but failed to initialize profile: ${profileUpsertError.message}. Please run the database migration/grants for service_role.`,
      }, 500);
    }

    return jsonResponse({ id: data.user.id, email: data.user.email, full_name: fullName, role });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unable to invite team member." }, 500);
  }
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
