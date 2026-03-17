import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, ArrowLeft, Smile, MessageCircle, Check, X, Search, PenSquare, MoreHorizontal } from "lucide-react";
import { MessagesSkeleton } from "@/components/skeletons/PageSkeletons";
import { formatDistanceToNow } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import TypingIndicator from "@/components/messages/TypingIndicator";
import MessageBubble from "@/components/messages/MessageBubble";
import ChatAttachmentButton from "@/components/messages/ChatAttachmentButton";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";

const EMOJI_LIST = ["😀", "😂", "😍", "🥰", "😊", "👍", "❤️", "🔥", "🎉", "👏", "💪", "🙏", "😎", "🤗", "😢", "😮", "🤔", "💯", "✨", "🌟", "👋", "🤝", "💕", "😇", "🥳"];

interface Conversation {
  id: string;
  participant_1: string;
  participant_2: string;
  last_message_at: string;
  is_request?: boolean;
  request_sender_id?: string | null;
  other_user?: { full_name: string; avatar_url: string | null };
  last_message_preview?: string;
}

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

const Messages = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeChatId = searchParams.get("chat");
  const showRequests = searchParams.get("view") === "requests";
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [otherTyping, setOtherTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("conversations")
      .select("*")
      .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
      .order("last_message_at", { ascending: false });

    if (!data) { setConversations([]); setLoading(false); return; }

    const otherIds = data.map(c => c.participant_1 === user.id ? c.participant_2 : c.participant_1);
    const uniqueIds = [...new Set(otherIds)];
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", uniqueIds);
    const profileMap = new Map(profiles?.map(p => [p.user_id, p]));

    const convIds = data.map(c => c.id);
    const lastMessages = new Map<string, string>();
    if (convIds.length > 0) {
      // Batch fetch all messages and pick the latest per conversation
      const { data: allMsgs } = await supabase.from("messages").select("conversation_id, content, created_at").in("conversation_id", convIds).order("created_at", { ascending: false });
      if (allMsgs) {
        for (const msg of allMsgs) {
          if (!lastMessages.has(msg.conversation_id)) {
            lastMessages.set(msg.conversation_id, msg.content);
          }
        }
      }
    }

    const enriched: Conversation[] = data.map(c => {
      const otherId = c.participant_1 === user.id ? c.participant_2 : c.participant_1;
      const otherProfile = profileMap.get(otherId);
      return {
        ...c,
        is_request: (c as any).is_request ?? false,
        request_sender_id: (c as any).request_sender_id || null,
        other_user: { full_name: otherProfile?.full_name || "User", avatar_url: otherProfile?.avatar_url || null },
        last_message_preview: lastMessages.get(c.id),
      };
    });

    setConversations(enriched);
    setLoading(false);
  }, [user]);

  const fetchMessages = useCallback(async () => {
    if (!activeChatId) return;
    const { data } = await supabase.from("messages").select("*").eq("conversation_id", activeChatId).order("created_at", { ascending: true });
    setMessages(data || []);
    if (user) {
      await supabase.from("messages").update({ read: true }).eq("conversation_id", activeChatId).neq("sender_id", user.id).eq("read", false);
    }
  }, [activeChatId, user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    fetchConversations();
  }, [user, authLoading, navigate, fetchConversations]);

  useEffect(() => { if (activeChatId) fetchMessages(); }, [activeChatId, fetchMessages]);
  useEffect(() => { scrollToBottom(); }, [messages]);

  useEffect(() => {
    if (!activeChatId || !user) return;
    const channel = supabase.channel(`messages-${activeChatId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${activeChatId}` }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
        if (newMsg.sender_id !== user.id) supabase.from("messages").update({ read: true }).eq("id", newMsg.id);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${activeChatId}` }, (payload) => {
        const updated = payload.new as Message;
        setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages", filter: `conversation_id=eq.${activeChatId}` }, (payload) => {
        const deleted = payload.old as { id: string };
        setMessages(prev => prev.filter(m => m.id !== deleted.id));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeChatId, user]);

  useEffect(() => {
    if (!activeChatId || !user) return;
    const channel = supabase.channel(`typing-${activeChatId}`);
    channel.on("broadcast", { event: "typing" }, (payload) => {
      if (payload.payload?.user_id !== user.id) {
        setOtherTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setOtherTyping(false), 2000);
      }
    }).subscribe();
    return () => { supabase.removeChannel(channel); if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current); setOtherTyping(false); };
  }, [activeChatId, user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel("conversations-list").on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => fetchConversations()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchConversations]);

  const sendMessage = async () => {
    if (!messageText.trim() || !user || !activeChatId) return;
    setSending(true);
    const content = messageText.trim();
    setMessageText("");
    await supabase.from("messages").insert({ conversation_id: activeChatId, sender_id: user.id, content });
    await supabase.from("conversations").update({ last_message_at: new Date().toISOString() } as any).eq("id", activeChatId);
    setSending(false);
    inputRef.current?.focus();
  };

  const deleteMessage = async (messageId: string) => {
    const { error } = await supabase.from("messages").delete().eq("id", messageId);
    if (error) toast.error("Failed to delete message");
    else setMessages(prev => prev.filter(m => m.id !== messageId));
  };

  const broadcastTyping = useCallback(() => {
    if (!activeChatId || !user) return;
    supabase.channel(`typing-${activeChatId}`).send({ type: "broadcast", event: "typing", payload: { user_id: user.id } });
  }, [activeChatId, user]);

  const addEmoji = (emoji: string) => { setMessageText(prev => prev + emoji); broadcastTyping(); inputRef.current?.focus(); };

  const handleAcceptRequest = async (convId: string) => {
    await supabase.from("conversations").update({ is_request: false } as any).eq("id", convId);
    toast.success("Message request accepted");
    fetchConversations();
  };

  const handleDeclineRequest = async (convId: string) => {
    await supabase.from("messages").delete().eq("conversation_id", convId);
    await supabase.from("conversations").delete().eq("id", convId);
    toast.success("Message request declined");
    fetchConversations();
  };

  const activeConversation = conversations.find(c => c.id === activeChatId);

  // Filter conversations
  // Requests tab shows ONLY conversations where current user is the RECEIVER (not the sender)
  // The sender sees request conversations as regular conversations
  const requestConversations = conversations.filter(c => c.is_request && c.request_sender_id && c.request_sender_id !== user?.id);
  const regularConversations = conversations.filter(c => !c.is_request || (c.is_request && c.request_sender_id === user?.id));
  const displayConversations = showRequests ? requestConversations : regularConversations;
  const filteredConversations = searchQuery
    ? displayConversations.filter(c => c.other_user?.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
    : displayConversations;

  // ─── Conversation list panel (shared between mobile list view and desktop left panel) ───
  const ConversationListPanel = ({ className = "" }: { className?: string }) => (
    <div className={`flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">Messaging</h2>
        <div className="flex items-center gap-1">
          {!showRequests && requestConversations.length > 0 && (
            <button onClick={() => setSearchParams({ view: "requests" })} className="text-xs text-primary px-2 py-1 rounded hover:bg-muted transition-colors">
              Requests ({requestConversations.length})
            </button>
          )}
          {showRequests && (
            <button onClick={() => setSearchParams({})} className="text-xs text-primary px-2 py-1 rounded hover:bg-muted transition-colors">
              ← Messages
            </button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <PenSquare className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search messages"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-8 text-sm bg-muted/50 border-none"
          />
        </div>
      </div>

      {/* Conversation list */}
      <ScrollArea className="flex-1">
        {loading ? (
          <MessagesSkeleton />
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-2 px-4">
            <MessageCircle className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">{showRequests ? "No message requests" : "No conversations yet"}</p>
          </div>
        ) : (
          <div className="py-1">
            {filteredConversations.map((conv) => (
              <div key={conv.id} className="flex items-center">
                <button
                  onClick={() => setSearchParams({ chat: conv.id })}
                  className={`flex-1 flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left ${activeChatId === conv.id ? "bg-muted/70 border-l-2 border-primary" : ""
                    }`}
                >
                  <Avatar className="h-12 w-12 flex-shrink-0">
                    <AvatarImage src={conv.other_user?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">{conv.other_user?.full_name?.[0]?.toUpperCase() || "?"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-foreground truncate">{conv.other_user?.full_name}</span>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-2">
                        {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: false })}
                      </span>
                    </div>
                    {conv.last_message_preview && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.last_message_preview}</p>
                    )}
                  </div>
                </button>
                {showRequests && (
                  <div className="flex gap-1 flex-shrink-0 pr-2">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleAcceptRequest(conv.id)}><Check className="h-4 w-4 text-primary" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDeclineRequest(conv.id)}><X className="h-4 w-4 text-destructive" /></Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );

  // ─── Chat panel (shared between mobile chat view and desktop right panel) ───
  const ChatPanel = ({ className = "", showBackButton = true }: { className?: string; showBackButton?: boolean }) => {
    if (!activeChatId || !activeConversation) {
      // Empty state for desktop when no chat is selected
      return (
        <div className={`flex flex-col items-center justify-center text-center gap-3 ${className}`}>
          <MessageCircle className="h-16 w-16 text-muted-foreground/30" />
          <h3 className="text-lg font-semibold text-foreground">Your Messages</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Select a conversation from the left to start messaging</p>
        </div>
      );
    }

    return (
      <div className={`flex flex-col ${className}`}>
        {/* Chat header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background/80 backdrop-blur-sm">
          {showBackButton && (
            <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden" onClick={() => setSearchParams({})}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          {activeConversation.other_user && (
            <>
              <Avatar className="h-9 w-9 cursor-pointer" onClick={() => {
                const otherId = activeConversation.participant_1 === user?.id ? activeConversation.participant_2 : activeConversation.participant_1;
                navigate(`/user/${otherId}`);
              }}>
                <AvatarImage src={activeConversation.other_user.avatar_url || undefined} />
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">{activeConversation.other_user.full_name?.[0]?.toUpperCase() || "?"}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-foreground text-sm">{activeConversation.other_user.full_name}</span>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        {/* Request banner — only show Accept/Decline to the receiver */}
        {activeConversation.is_request && user && activeConversation.request_sender_id !== user.id && (
          <div className="flex items-center justify-between px-4 py-2 bg-muted border-b border-border">
            <span className="text-xs text-muted-foreground">This is a message request</span>
            <div className="flex gap-2">
              <Button size="sm" variant="default" onClick={() => handleAcceptRequest(activeConversation.id)}><Check className="h-3 w-3 mr-1" /> Accept</Button>
              <Button size="sm" variant="outline" onClick={() => handleDeclineRequest(activeConversation.id)}><X className="h-3 w-3 mr-1" /> Decline</Button>
            </div>
          </div>
        )}
        {/* Pending status for the sender */}
        {activeConversation.is_request && user && activeConversation.request_sender_id === user.id && (
          <div className="flex items-center justify-center px-4 py-2 bg-muted/50 border-b border-border">
            <span className="text-xs text-muted-foreground">⏳ Message request pending — waiting for acceptance</span>
          </div>
        )}

        {/* Messages */}
        <ScrollArea className="flex-1 px-4 py-3">
          <div className="space-y-3">
            {messages.length === 0 && <p className="text-center text-muted-foreground text-sm py-10">No messages yet. Say hi! 👋</p>}
            {messages.map((msg) => <MessageBubble key={msg.id} msg={msg} isMine={msg.sender_id === user?.id} onDelete={deleteMessage} />)}
            {otherTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-border bg-background">
          <Popover>
            <PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0"><Smile className="h-5 w-5 text-muted-foreground" /></Button></PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="start">
              <div className="grid grid-cols-5 gap-1">{EMOJI_LIST.map((emoji) => (<button key={emoji} onClick={() => addEmoji(emoji)} className="text-xl p-1.5 rounded hover:bg-muted transition-colors">{emoji}</button>))}</div>
            </PopoverContent>
          </Popover>
          <ChatAttachmentButton userId={user!.id} conversationId={activeChatId} onAttachmentSent={() => inputRef.current?.focus()} />
          <Input ref={inputRef} placeholder="Write a message..." value={messageText} onChange={(e) => { setMessageText(e.target.value); broadcastTyping(); }} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()} className="flex-1" maxLength={2000} />
          <Button size="icon" onClick={sendMessage} disabled={!messageText.trim() || sending} className="flex-shrink-0"><Send className="h-4 w-4" /></Button>
        </div>
      </div>
    );
  };

  // ─── Mobile: original behavior (list OR chat full-screen) ───
  // ─── Desktop (lg+): LinkedIn-style split panel ───

  // Mobile: active chat = full screen chat, no header/nav
  if (activeChatId) {
    return (
      <>
        {/* Mobile: full-screen chat */}
        <div className="lg:hidden min-h-screen bg-background">
          <ChatPanel className="h-screen" showBackButton={true} />
        </div>

        {/* Desktop: split panel inside AppLayout */}
        <div className="hidden lg:block">
          <AppLayout className="">
            <div className="container max-w-6xl px-4 py-4">
              <div className="bg-card border border-border rounded-lg overflow-hidden flex" style={{ height: "calc(100vh - 7rem)" }}>
                {/* Left: conversation list */}
                <ConversationListPanel className="w-[360px] border-r border-border flex-shrink-0" />
                {/* Right: active chat */}
                <ChatPanel className="flex-1" showBackButton={false} />
              </div>
            </div>
          </AppLayout>
        </div>
      </>
    );
  }

  // No active chat
  return (
    <>
      {/* Mobile: conversation list only — polished like desktop */}
      <div className="lg:hidden">
        <AppLayout className="">
          <div className="flex flex-col" style={{ height: "calc(100vh - 7.5rem)" }}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h1 className="text-xl font-bold text-foreground">Messaging</h1>
              <div className="flex items-center gap-1">
                {!showRequests && requestConversations.length > 0 && (
                  <button onClick={() => setSearchParams({ view: "requests" })} className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                    Requests ({requestConversations.length})
                  </button>
                )}
                {showRequests && (
                  <button onClick={() => setSearchParams({})} className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                    ← Messages
                  </button>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <PenSquare className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Search */}
            <div className="px-4 py-2 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search messages"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-sm bg-muted/50 border-none"
                />
              </div>
            </div>

            {/* Conversation list */}
            <ScrollArea className="flex-1">
              {loading ? (
                <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center gap-3 px-4">
                  <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center">
                    <MessageCircle className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                  <p className="font-medium text-foreground">{showRequests ? "No message requests" : "No conversations yet"}</p>
                  {!showRequests && <p className="text-sm text-muted-foreground">Visit a user's profile and tap "Message" to start chatting</p>}
                </div>
              ) : (
                <div>
                  {filteredConversations.map((conv) => (
                    <div key={conv.id} className="flex items-center border-b border-border/50 last:border-b-0">
                      <button
                        onClick={() => setSearchParams({ chat: conv.id })}
                        className="flex-1 flex items-center gap-3 px-4 py-3 hover:bg-muted/40 active:bg-muted/60 transition-colors text-left"
                      >
                        <Avatar className="h-12 w-12 flex-shrink-0">
                          <AvatarImage src={conv.other_user?.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">{conv.other_user?.full_name?.[0]?.toUpperCase() || "?"}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-sm text-foreground truncate">{conv.other_user?.full_name}</span>
                            <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-2">
                              {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: false })}
                            </span>
                          </div>
                          {conv.last_message_preview && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.last_message_preview}</p>
                          )}
                        </div>
                      </button>
                      {showRequests && (
                        <div className="flex gap-1 flex-shrink-0 pr-3">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleAcceptRequest(conv.id)}><Check className="h-4 w-4 text-primary" /></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDeclineRequest(conv.id)}><X className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </AppLayout>
      </div>

      {/* Desktop: split panel with empty state */}
      <div className="hidden lg:block">
        <AppLayout className="">
          <div className="container max-w-6xl px-4 py-4">
            <div className="bg-card border border-border rounded-lg overflow-hidden flex" style={{ height: "calc(100vh - 7rem)" }}>
              {/* Left: conversation list */}
              <ConversationListPanel className="w-[360px] border-r border-border flex-shrink-0" />
              {/* Right: empty state */}
              <ChatPanel className="flex-1" showBackButton={false} />
            </div>
          </div>
        </AppLayout>
      </div>
    </>
  );
};

export default Messages;
