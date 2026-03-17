import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface CallInfo {
  callId: string;
  remoteUserId: string;
  remoteName: string;
  remoteAvatar?: string | null;
}

interface VideoCallContextType {
  activeCall: CallInfo | null;
  incomingCall: CallInfo | null;
  startCall: (remoteUserId: string, remoteName: string, remoteAvatar?: string | null) => void;
  acceptCall: () => void;
  declineCall: () => void;
  endCall: () => void;
  isInCall: boolean;
}

const VideoCallContext = createContext<VideoCallContextType>({
  activeCall: null,
  incomingCall: null,
  startCall: () => {},
  acceptCall: () => {},
  declineCall: () => {},
  endCall: () => {},
  isInCall: false,
});

export const useVideoCall = () => useContext(VideoCallContext);

export const VideoCallProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [activeCall, setActiveCall] = useState<CallInfo | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallInfo | null>(null);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);

  // Listen for incoming calls via a personal broadcast channel
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase.channel(`user-calls:${user.id}`, {
      config: { broadcast: { self: false } },
    });

    channel.on("broadcast", { event: "incoming-call" }, async ({ payload }) => {
      if (activeCall) return; // Already in a call

      // Fetch caller info
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("user_id", payload.callerId)
        .single();

      setIncomingCall({
        callId: payload.callId,
        remoteUserId: payload.callerId,
        remoteName: profile?.full_name || "Unknown",
        remoteAvatar: profile?.avatar_url,
      });
    });

    channel.on("broadcast", { event: "call-cancelled" }, () => {
      setIncomingCall(null);
    });

    channel.subscribe();
    presenceChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, activeCall]);

  const startCall = useCallback((remoteUserId: string, remoteName: string, remoteAvatar?: string | null) => {
    if (!user?.id) return;
    const callId = `${user.id}-${remoteUserId}-${Date.now()}`;

    setActiveCall({ callId, remoteUserId, remoteName, remoteAvatar });

    // Notify remote user — send multiple times to ensure delivery
    const remoteChannel = supabase.channel(`user-calls:${remoteUserId}`, {
      config: { broadcast: { self: false } },
    });
    remoteChannel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        const payload = { callId, callerId: user.id };
        // Send immediately and retry a few times to ensure delivery
        const sendNotification = () => {
          remoteChannel.send({
            type: "broadcast",
            event: "incoming-call",
            payload,
          });
        };
        sendNotification();
        setTimeout(sendNotification, 1000);
        setTimeout(sendNotification, 2500);
        setTimeout(sendNotification, 5000);
        // Keep channel alive longer for signaling reliability
        setTimeout(() => supabase.removeChannel(remoteChannel), 8000);
      }
    });
  }, [user?.id]);

  const acceptCall = useCallback(() => {
    if (!incomingCall) return;
    setActiveCall(incomingCall);
    setIncomingCall(null);
  }, [incomingCall]);

  const declineCall = useCallback(() => {
    if (!incomingCall) return;
    // Notify caller that call was declined
    const callerChannel = supabase.channel(`user-calls:${incomingCall.remoteUserId}`, {
      config: { broadcast: { self: false } },
    });
    callerChannel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        callerChannel.send({
          type: "broadcast",
          event: "call-cancelled",
          payload: {},
        });
        setTimeout(() => supabase.removeChannel(callerChannel), 1000);
      }
    });
    setIncomingCall(null);
  }, [incomingCall]);

  const callStartTimeRef = useRef<Date | null>(null);

  // Track call start time when activeCall is set
  useEffect(() => {
    if (activeCall) {
      callStartTimeRef.current = new Date();
    } else {
      callStartTimeRef.current = null;
    }
  }, [activeCall]);

  const endCall = useCallback(async () => {
    if (!activeCall || !user?.id) {
      setActiveCall(null);
      return;
    }

    const endedAt = new Date();
    const startedAt = callStartTimeRef.current || endedAt;
    const durationSeconds = Math.round((endedAt.getTime() - startedAt.getTime()) / 1000);

    try {
      // Insert call log
      await supabase.from("call_logs" as any).insert({
        caller_id: activeCall.callId.startsWith(user.id) ? user.id : activeCall.remoteUserId,
        callee_id: activeCall.callId.startsWith(user.id) ? activeCall.remoteUserId : user.id,
        started_at: startedAt.toISOString(),
        ended_at: endedAt.toISOString(),
        duration_seconds: durationSeconds,
        status: durationSeconds > 0 ? "completed" : "missed",
      });

      // Find conversation between the two users and insert call log message
      const p1 = user.id < activeCall.remoteUserId ? user.id : activeCall.remoteUserId;
      const p2 = user.id < activeCall.remoteUserId ? activeCall.remoteUserId : user.id;

      const { data: convo } = await supabase
        .from("conversations")
        .select("id")
        .or(`and(participant_1.eq.${p1},participant_2.eq.${p2}),and(participant_1.eq.${p2},participant_2.eq.${p1})`)
        .maybeSingle();

      if (convo?.id) {
        const callLogContent = `[CALL_LOG:${JSON.stringify({ duration: durationSeconds, status: durationSeconds > 0 ? "completed" : "missed" })}]`;
        await supabase.from("messages").insert({
          conversation_id: convo.id,
          sender_id: user.id,
          content: callLogContent,
          read: false,
        });
      }
    } catch (e) {
      console.error("Error logging call:", e);
    }

    setActiveCall(null);
  }, [activeCall, user?.id]);

  return (
    <VideoCallContext.Provider value={{
      activeCall,
      incomingCall,
      startCall,
      acceptCall,
      declineCall,
      endCall,
      isInCall: !!activeCall,
    }}>
      {children}
    </VideoCallContext.Provider>
  );
};
