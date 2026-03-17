import { useRef, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useVideoCall } from "@/contexts/VideoCallContext";
import { useWebRTC } from "@/hooks/use-webrtc";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, Maximize2, Minimize2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const VideoCallOverlay = () => {
  const { user } = useAuth();
  const { activeCall, endCall: ctxEndCall } = useVideoCall();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasStartedRef = useRef(false);

  const {
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
  } = useWebRTC({
    localUserId: user?.id || "",
    remoteUserId: activeCall?.remoteUserId || "",
    callId: activeCall?.callId || "",
    onCallEnded: () => {
      ctxEndCall();
    },
    onCallConnected: () => {
      timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
    },
  });

  // Determine if we're the caller or callee
  useEffect(() => {
    if (!activeCall || !user?.id || hasStartedRef.current) return;
    hasStartedRef.current = true;

    const isCaller = activeCall.callId.startsWith(user.id);
    if (isCaller) {
      startCall();
    } else {
      answerCall();
    }
  }, [activeCall, user?.id]);

  // Attach streams to video elements
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (!activeCall) return null;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const handleEndCall = () => {
    endCall();
    ctxEndCall();
    if (timerRef.current) clearInterval(timerRef.current);
  };

  if (isMinimized) {
    return (
      <div
        className="fixed bottom-20 right-4 z-[100] w-40 h-28 rounded-xl overflow-hidden shadow-2xl border-2 border-primary cursor-pointer"
        onClick={() => setIsMinimized(false)}
      >
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover bg-muted"
        />
        <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-md font-mono">
          {formatTime(callDuration)}
        </div>
        <div className="absolute top-1 right-1">
          <Maximize2 className="h-3.5 w-3.5 text-white" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      {/* Remote video (full screen) */}
      <div className="flex-1 relative">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Overlay when no remote video */}
        {(callState === "calling" || callState === "ringing" || !remoteStream?.getVideoTracks().some(t => t.enabled)) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-black">
            <Avatar className="h-24 w-24 mb-4 ring-4 ring-primary/30">
              <AvatarImage src={activeCall.remoteAvatar || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary text-2xl font-bold">
                {activeCall.remoteName[0]?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <p className="text-white text-lg font-semibold">{activeCall.remoteName}</p>
            <p className="text-white/60 text-sm mt-1">
              {callState === "calling" ? "Calling..." : callState === "ringing" ? "Connecting..." : callState === "connected" ? formatTime(callDuration) : ""}
            </p>
            {callState === "calling" && (
              <div className="flex gap-1 mt-3">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="h-2 w-2 rounded-full bg-primary animate-pulse"
                    style={{ animationDelay: `${i * 0.3}s` }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Local video (PiP) */}
        <div className="absolute top-4 right-4 w-32 h-44 sm:w-40 sm:h-56 rounded-xl overflow-hidden shadow-2xl border-2 border-white/20">
          {localStream && !isCameraOff ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror"
              style={{ transform: "scaleX(-1)" }}
            />
          ) : (
            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
              <VideoOff className="h-8 w-8 text-white/40" />
            </div>
          )}
        </div>

        {/* Duration badge */}
        {callState === "connected" && (
          <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm text-white text-sm px-3 py-1.5 rounded-full font-mono">
            {formatTime(callDuration)}
          </div>
        )}

        {/* Minimize button */}
        <button
          className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-sm text-white p-2 rounded-full hover:bg-black/60 transition-colors"
          onClick={() => setIsMinimized(true)}
        >
          <Minimize2 className="h-4 w-4" />
        </button>
      </div>

      {/* Controls */}
      <div className="bg-black/80 backdrop-blur-xl px-6 py-5 flex items-center justify-center gap-4">
        <button
          onClick={toggleMute}
          className={cn(
            "h-14 w-14 rounded-full flex items-center justify-center transition-colors",
            isMuted ? "bg-white text-black" : "bg-white/15 text-white hover:bg-white/25"
          )}
        >
          {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
        </button>

        <button
          onClick={toggleCamera}
          className={cn(
            "h-14 w-14 rounded-full flex items-center justify-center transition-colors",
            isCameraOff ? "bg-white text-black" : "bg-white/15 text-white hover:bg-white/25"
          )}
        >
          {isCameraOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
        </button>

        <button
          onClick={handleEndCall}
          className="h-14 w-14 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition-colors"
        >
          <PhoneOff className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
};

export default VideoCallOverlay;
