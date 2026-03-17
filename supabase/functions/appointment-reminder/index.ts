import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find bookings starting in the next 10 minutes that are online & accepted
    const now = new Date();
    const tenMinLater = new Date(now.getTime() + 10 * 60 * 1000);
    const todayStr = now.toISOString().split("T")[0];

    // Get current time and +10min time as HH:MM
    const nowTime = `${now.getUTCHours().toString().padStart(2, "0")}:${now.getUTCMinutes().toString().padStart(2, "0")}`;
    const laterTime = `${tenMinLater.getUTCHours().toString().padStart(2, "0")}:${tenMinLater.getUTCMinutes().toString().padStart(2, "0")}`;

    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("id, patient_id, provider_id, booking_date, booking_time, consultation_mode")
      .eq("status", "accepted")
      .eq("consultation_mode", "online")
      .eq("booking_date", todayStr)
      .gte("booking_time", nowTime)
      .lte("booking_time", laterTime);

    if (error) {
      console.error("Error fetching bookings:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sentCount = 0;

    for (const booking of bookings || []) {
      // Get provider's user_id
      const { data: provider } = await supabase
        .from("provider_profiles")
        .select("user_id")
        .eq("id", booking.provider_id)
        .single();

      if (!provider?.user_id) continue;

      const patientId = booking.patient_id;
      const providerUserId = provider.user_id;

      // Find conversation
      const p1 = patientId < providerUserId ? patientId : providerUserId;
      const p2 = patientId < providerUserId ? providerUserId : patientId;

      const { data: convo } = await supabase
        .from("conversations")
        .select("id")
        .or(
          `and(participant_1.eq.${p1},participant_2.eq.${p2}),and(participant_1.eq.${p2},participant_2.eq.${p1})`
        )
        .maybeSingle();

      if (!convo?.id) continue;

      // Check if reminder already sent (avoid duplicates)
      const { data: existing } = await supabase
        .from("messages")
        .select("id")
        .eq("conversation_id", convo.id)
        .like("content", `%[SYSTEM]%video call link%${booking.booking_time}%`)
        .limit(1);

      if (existing && existing.length > 0) continue;

      // Send reminder message to both users via a system message
      const reminderMsg = `[SYSTEM] 🔔 Your appointment at ${booking.booking_time} is starting soon! Tap the video call button in the chat header to join.`;

      await supabase.from("messages").insert({
        conversation_id: convo.id,
        sender_id: patientId, // Use patient as sender for RLS
        content: reminderMsg,
        read: false,
      });

      sentCount++;
    }

    return new Response(
      JSON.stringify({ success: true, reminders_sent: sentCount }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Appointment reminder error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
