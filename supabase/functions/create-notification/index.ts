import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { user_id, title, message, type, metadata } = await req.json();

    if (!user_id || !title || !message) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check user preferences
    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user_id)
      .maybeSingle();

    // Default: all enabled
    const preferences = prefs || {
      booking_created: true,
      booking_confirmed: true,
      booking_cancelled: true,
      booking_reminder_24h: true,
      booking_reminder_1h: true,
      connection_request: true,
      message_received: true,
      email_enabled: true,
      in_app_enabled: true,
    };

    // Check if this notification type is enabled
    const typeMap: Record<string, string> = {
      booking_created: "booking_created",
      booking_confirmed: "booking_confirmed",
      booking_cancelled: "booking_cancelled",
      booking_reminder: "booking_reminder_24h",
      connection_request: "connection_request",
      message: "message_received",
    };

    const prefKey = typeMap[type];
    if (prefKey && !(preferences as any)[prefKey]) {
      return new Response(JSON.stringify({ skipped: true, reason: "disabled_by_user" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create in-app notification
    if (preferences.in_app_enabled) {
      const { error: insertError } = await supabase.from("notifications").insert({
        user_id,
        title,
        message,
        type: type || "general",
        metadata: metadata || {},
      });

      if (insertError) {
        console.error("Insert error:", insertError);
        return new Response(JSON.stringify({ error: insertError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Email notification placeholder
    // In a production setup, you'd integrate with an email service here
    if (preferences.email_enabled) {
      console.log(`[Email] Would send email to user ${user_id}: ${title} - ${message}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
