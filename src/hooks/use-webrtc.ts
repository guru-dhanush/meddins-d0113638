import { useRef, useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export type CallState = "idle" | "calling" | "ringing" | "connected" | "ended";

interface UseWebRTCOptions {
  localUserId: string;
  remoteUserId: string;
  callId: string;
  onRemoteStream?: (stream: MediaStream) => void;
  onCallEnded?: () => void;
  onCallConnected?: () => void;
}

export function useWebRTC({
  localUserId,
  remoteUserId,
  callId,
  onRemoteStream,
  onCallEnded,
  onCallConnected,
}: UseWebRTCOptions) {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [callState, setCallState] = useState<CallState>("idle");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  const cleanup = useCallback(() => {
    if (offerIntervalRef.current) {
      clearInterval(offerIntervalRef.current);
      offerIntervalRef.current = null;
    }
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setIsMuted(false);
    setIsCameraOff(false);
    pendingCandidatesRef.current = [];
  }, []);

  const setupPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    // Remote stream
    const remote = new MediaStream();
    setRemoteStream(remote);
    onRemoteStream?.(remote);

    pc.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach(track => {
        remote.addTrack(track);
      });
      setRemoteStream(new MediaStream(remote.getTracks()));
      onRemoteStream?.(remote);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "ice-candidate",
          payload: { candidate: event.candidate.toJSON(), from: localUserId },
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        setCallState("connected");
        onCallConnected?.();
      }
      if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed" || pc.iceConnectionState === "closed") {
        setCallState("ended");
        onCallEnded?.();
      }
    };

    return pc;
  }, [localUserId, onRemoteStream, onCallEnded, onCallConnected]);

  const getMediaStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch {
      // Fallback: audio only
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        localStreamRef.current = stream;
        setLocalStream(stream);
        setIsCameraOff(true);
        return stream;
      } catch (err) {
        throw new Error("Could not access camera or microphone");
      }
    }
  }, []);

  const offerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const setupChannel = useCallback((role: "caller" | "callee") => {
    const channel = supabase.channel(`call:${callId}`, {
      config: { broadcast: { self: false } },
    });
    channelRef.current = channel;

    channel.on("broadcast", { event: "offer" }, async ({ payload }) => {
      if (payload.from === localUserId) return;
      const pc = pcRef.current;
      if (!pc) return;
      // Only set remote description if we haven't already
      if (pc.remoteDescription) return;

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));

        // Add pending ICE candidates
        for (const c of pendingCandidatesRef.current) {
          await pc.addIceCandidate(new RTCIceCandidate(c));
        }
        pendingCandidatesRef.current = [];

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        channel.send({
          type: "broadcast",
          event: "answer",
          payload: { sdp: answer, from: localUserId },
        });
      } catch (e) {
        console.error("Error handling offer:", e);
      }
    });

    channel.on("broadcast", { event: "answer" }, async ({ payload }) => {
      if (payload.from === localUserId) return;
      const pc = pcRef.current;
      if (!pc) return;
      if (pc.remoteDescription) return;

      try {
        // Stop retrying offers once we get an answer
        if (offerIntervalRef.current) {
          clearInterval(offerIntervalRef.current);
          offerIntervalRef.current = null;
        }

        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));

        // Add pending ICE candidates
        for (const c of pendingCandidatesRef.current) {
          await pc.addIceCandidate(new RTCIceCandidate(c));
        }
        pendingCandidatesRef.current = [];
      } catch (e) {
        console.error("Error handling answer:", e);
      }
    });

    channel.on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
      if (payload.from === localUserId) return;
      const pc = pcRef.current;
      if (!pc) return;

      try {
        if (pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } else {
          pendingCandidatesRef.current.push(payload.candidate);
        }
      } catch (e) {
        console.error("Error adding ICE candidate:", e);
      }
    });

    // When callee is ready, caller should send/resend offer
    channel.on("broadcast", { event: "ready" }, async () => {
      if (role !== "caller") return;
      const pc = pcRef.current;
      if (!pc || pc.remoteDescription) return;
      // Re-send the current local description (offer)
      if (pc.localDescription) {
        channel.send({
          type: "broadcast",
          event: "offer",
          payload: { sdp: pc.localDescription, from: localUserId },
        });
      }
    });

    channel.on("broadcast", { event: "end-call" }, () => {
      if (offerIntervalRef.current) {
        clearInterval(offerIntervalRef.current);
        offerIntervalRef.current = null;
      }
      setCallState("ended");
      cleanup();
      onCallEnded?.();
    });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED" && role === "callee") {
        // Signal to caller that we're ready
        channel.send({
          type: "broadcast",
          event: "ready",
          payload: { from: localUserId },
        });
      }
    });
    return channel;
  }, [callId, localUserId, cleanup, onCallEnded]);

  // Start call (caller)
  const startCall = useCallback(async () => {
    setCallState("calling");
    const stream = await getMediaStream();
    const pc = setupPeerConnection();

    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    const channel = setupChannel("caller");

    // Create offer and send it repeatedly until we get an answer
    const sendOffer = async () => {
      try {
        if (!pc.localDescription) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
        }
        if (pc.localDescription && !pc.remoteDescription) {
          channel.send({
            type: "broadcast",
            event: "offer",
            payload: { sdp: pc.localDescription, from: localUserId },
          });
        }
      } catch (e) {
        console.error("Error sending offer:", e);
      }
    };

    // Wait for channel subscription, then retry offer every 2s
    setTimeout(() => {
      sendOffer();
      offerIntervalRef.current = setInterval(() => {
        if (pcRef.current?.remoteDescription) {
          if (offerIntervalRef.current) clearInterval(offerIntervalRef.current);
          return;
        }
        sendOffer();
      }, 2000);
    }, 1000);
  }, [getMediaStream, setupPeerConnection, setupChannel, localUserId]);

  // Answer call (callee)
  const answerCall = useCallback(async () => {
    setCallState("ringing");
    const stream = await getMediaStream();
    const pc = setupPeerConnection();

    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    setupChannel("callee");
  }, [getMediaStream, setupPeerConnection, setupChannel]);

  const endCall = useCallback(() => {
    channelRef.current?.send({
      type: "broadcast",
      event: "end-call",
      payload: { from: localUserId },
    });
    setCallState("ended");
    cleanup();
    onCallEnded?.();
  }, [localUserId, cleanup, onCallEnded]);

  const toggleMute = useCallback(() => {
    localStreamRef.current?.getAudioTracks().forEach(t => {
      t.enabled = !t.enabled;
    });
    setIsMuted(prev => !prev);
  }, []);

  const toggleCamera = useCallback(() => {
    localStreamRef.current?.getVideoTracks().forEach(t => {
      t.enabled = !t.enabled;
    });
    setIsCameraOff(prev => !prev);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => { cleanup(); };
  }, [cleanup]);

  return {
    callState,
    localStream,
    remoteStream,
    isMuted,
    isCameraOff,
    startCall,
    answerCall,
    endCall,
    toggleMute,
    toggleCamera,
  };
}
