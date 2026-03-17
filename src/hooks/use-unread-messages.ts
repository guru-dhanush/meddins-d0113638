import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Global hook to track total unread message count.
 * Subscribes to realtime inserts on messages table.
 */
export function useUnreadMessages() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    if (!user?.id) { setUnreadCount(0); return; }

    // Get all conversations the user is part of
    const { data: convs } = await supabase
      .from("conversations")
      .select("id")
      .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`);

    if (!convs?.length) { setUnreadCount(0); return; }

    const convIds = convs.map(c => c.id);

    // Count unread messages not sent by user
    const { count, error } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .in("conversation_id", convIds)
      .neq("sender_id", user.id)
      .eq("read", false);

    if (!error) setUnreadCount(count ?? 0);
  }, [user?.id]);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // Realtime subscription for new messages
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel("global-unread-badge")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, fetchUnreadCount]);

  return { unreadCount, refetchUnread: fetchUnreadCount };
}
