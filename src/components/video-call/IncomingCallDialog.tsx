import { useVideoCall } from "@/contexts/VideoCallContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff } from "lucide-react";

const IncomingCallDialog = () => {
  const { incomingCall, acceptCall, declineCall } = useVideoCall();

  if (!incomingCall) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-card rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl border border-border text-center space-y-6 animate-in zoom-in-95 fade-in duration-300">
        {/* Pulsing ring effect */}
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
          <div className="absolute inset-2 rounded-full bg-primary/10 animate-pulse" />
          <Avatar className="h-24 w-24 relative z-10 ring-4 ring-primary/30">
            <AvatarImage src={incomingCall.remoteAvatar || undefined} />
            <AvatarFallback className="bg-primary/20 text-primary text-2xl font-bold">
              {incomingCall.remoteName[0]?.toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
        </div>

        <div>
          <p className="text-lg font-bold text-foreground">{incomingCall.remoteName}</p>
          <p className="text-sm text-muted-foreground mt-1">Incoming video call...</p>
        </div>

        <div className="flex items-center justify-center gap-6">
          <button
            onClick={declineCall}
            className="h-16 w-16 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition-colors shadow-lg"
          >
            <PhoneOff className="h-7 w-7" />
          </button>
          <button
            onClick={acceptCall}
            className="h-16 w-16 rounded-full bg-green-600 text-white flex items-center justify-center hover:bg-green-700 transition-colors shadow-lg animate-pulse"
          >
            <Phone className="h-7 w-7" />
          </button>
        </div>

        <div className="flex justify-center gap-8 text-xs text-muted-foreground">
          <span>Decline</span>
          <span>Accept</span>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallDialog;
