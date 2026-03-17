import { useState, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import ReadReceipt from "./ReadReceipt";
import { Trash2, Image as ImageIcon, FileText, Phone, PhoneOff, PhoneMissed, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read: boolean;
  attachment_url?: string | null;
  attachment_type?: string | null;
}

interface MessageBubbleProps {
  msg: Message;
  isMine: boolean;
  onDelete: (id: string) => void;
}

// Parse call log metadata from content
function parseCallLog(content: string): { duration: number; status: string } | null {
  const match = content.match(/^\[CALL_LOG:(.*)\]$/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

// Check if it's a system message
function isSystemMessage(content: string): boolean {
  return content.startsWith("[SYSTEM]");
}

function formatCallDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

const CallLogCard = ({ data, time }: { data: { duration: number; status: string }; time: string }) => {
  const isMissed = data.status === "missed" || data.status === "declined";
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/50 border border-border max-w-[75%]">
      <div className={cn(
        "h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0",
        isMissed ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
      )}>
        {isMissed ? <PhoneMissed className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">
          {isMissed ? "Missed Call" : "Video Call"}
        </p>
        <p className="text-xs text-muted-foreground">
          {isMissed ? "No answer" : formatCallDuration(data.duration)} · {formatDistanceToNow(new Date(time), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
};

const SystemMessageCard = ({ content, time }: { content: string; time: string }) => {
  const text = content.replace(/^\[SYSTEM\]\s*/, "");
  return (
    <div className="flex justify-center my-2">
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/60 border border-border/50 max-w-[85%]">
        <Info className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        <p className="text-xs text-muted-foreground text-center">{text}</p>
      </div>
    </div>
  );
};

const MessageBubble = ({ msg, isMine, onDelete }: MessageBubbleProps) => {
  const [showActions, setShowActions] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  // Check for special message types
  const callLog = parseCallLog(msg.content);
  const isSystem = isSystemMessage(msg.content);

  if (callLog) {
    return <div className="flex justify-center"><CallLogCard data={callLog} time={msg.created_at} /></div>;
  }

  if (isSystem) {
    return <SystemMessageCard content={msg.content} time={msg.created_at} />;
  }

  const handlePointerDown = () => {
    if (!isMine) return;
    longPressTimer.current = setTimeout(() => {
      setShowActions(true);
    }, 600);
  };

  const handlePointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const isImage = msg.attachment_type?.startsWith("image/");

  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"} group`}>
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-2 text-sm relative select-none",
          isMine
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted text-foreground rounded-bl-md"
        )}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onContextMenu={(e) => {
          if (isMine) {
            e.preventDefault();
            setShowActions(true);
          }
        }}
      >
        {/* Attachment */}
        {msg.attachment_url && (
          <div className="mb-1.5">
            {isImage ? (
              <img
                src={msg.attachment_url}
                alt="Shared image"
                className="rounded-lg max-h-52 w-auto object-cover cursor-pointer"
                onClick={() => window.open(msg.attachment_url!, "_blank")}
              />
            ) : (
              <a
                href={msg.attachment_url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-xs",
                  isMine ? "bg-primary-foreground/10" : "bg-background/50"
                )}
              >
                <FileText className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">Attachment</span>
              </a>
            )}
          </div>
        )}

        {msg.content && (
          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
        )}

        <div
          className={`flex items-center justify-end gap-0.5 mt-1 ${
            isMine ? "text-primary-foreground/70" : "text-muted-foreground"
          }`}
        >
          <span className="text-[10px]">
            {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
          </span>
          <ReadReceipt isMine={isMine} read={msg.read} />
        </div>

        {/* Delete action overlay */}
        {showActions && isMine && (
          <div className="absolute -top-8 right-0 bg-destructive text-destructive-foreground rounded-lg shadow-lg flex overflow-hidden z-10">
            <button
              onClick={() => {
                onDelete(msg.id);
                setShowActions(false);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs hover:bg-destructive/80 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Click outside to dismiss */}
      {showActions && (
        <div
          className="fixed inset-0 z-[5]"
          onClick={() => setShowActions(false)}
        />
      )}
    </div>
  );
};

export default MessageBubble;
