import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Loader2, Send, ArrowLeft, Bot, User, Trash2,
  Mic, MicOff, X, Sparkles, MessageCircle,
  Search, PenSquare, MoreHorizontal, History
} from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import AppLayout from "@/components/AppLayout";
import { formatDistanceToNow } from "date-fns";

interface AiConversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface AiMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/health-chat`;

const AIChat = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeChatId = searchParams.get("chat");

  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [showVoiceOverlay, setShowVoiceOverlay] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("ai_conversations")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    setConversations((data as AiConversation[]) || []);
    setLoadingConvs(false);
  }, [user]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  const fetchMessages = useCallback(async (convId: string) => {
    const { data } = await supabase
      .from("ai_messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });
    setMessages((data as AiMessage[]) || []);
  }, []);

  useEffect(() => {
    if (activeChatId) fetchMessages(activeChatId);
    else setMessages([]);
  }, [activeChatId, fetchMessages]);

  useEffect(() => { scrollToBottom(); }, [messages]);

  const createConversation = async () => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("ai_conversations")
      .insert({ user_id: user.id, title: "New Chat" })
      .select("id")
      .single();
    if (error || !data) { toast.error("Failed to create conversation"); return null; }
    await fetchConversations();
    return (data as any).id as string;
  };

  const sendMessage = async (overrideText?: string) => {
    const text = overrideText || input.trim();
    if (!text || !user || isLoading) return;
    setInput("");
    setIsLoading(true);

    let convId = activeChatId;
    if (!convId) {
      convId = await createConversation();
      if (!convId) { setIsLoading(false); return; }
      setSearchParams({ chat: convId });
    }

    await supabase.from("ai_messages").insert({ conversation_id: convId, role: "user", content: text });

    const userMsg: AiMessage = { role: "user", content: text };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);

    if (messages.length === 0) {
      const title = text.slice(0, 60) + (text.length > 60 ? "..." : "");
      await supabase.from("ai_conversations").update({ title } as any).eq("id", convId);
      fetchConversations();
    }

    let assistantContent = "";
    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: allMessages.map(m => ({ role: m.role, content: m.content })) }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `Error ${resp.status}`);
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
                }
                return [...prev, { role: "assistant", content: assistantContent }];
              });
            }
          } catch { /* partial JSON */ }
        }
      }

      if (assistantContent) {
        await supabase.from("ai_messages").insert({ conversation_id: convId, role: "assistant", content: assistantContent });
        await supabase.from("ai_conversations").update({ updated_at: new Date().toISOString() } as any).eq("id", convId);
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to get AI response");
      setMessages(prev => prev.filter(m => !(m.role === "assistant" && !m.id && m.content === "")));
    }

    setIsLoading(false);
    inputRef.current?.focus();
  };

  const handleNewChat = () => {
    setSearchParams({});
    setMessages([]);
  };

  const handleDeleteConv = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    await supabase.from("ai_messages").delete().eq("conversation_id", convId);
    await supabase.from("ai_conversations").delete().eq("id", convId);
    if (activeChatId === convId) { setSearchParams({}); setMessages([]); }
    fetchConversations();
  };

  // ─── Voice ───
  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { toast.error("Voice input not supported in this browser"); return; }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onstart = () => { setIsListening(true); setShowVoiceOverlay(true); };
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results).map((result: any) => result[0].transcript).join("");
      setInput(transcript);
    };
    recognition.onend = () => { setIsListening(false); };
    recognition.onerror = () => { setIsListening(false); setShowVoiceOverlay(false); toast.error("Voice recognition error"); };
    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) { recognitionRef.current.stop(); setIsListening(false); setShowVoiceOverlay(false); }
  };

  const filteredConversations = useMemo(() => {
    if (!searchQuery) return conversations;
    return conversations.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [conversations, searchQuery]);

  const userName = user?.user_metadata?.full_name?.split(" ")[0] || "there";

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  };

  // ─── Shared UI Components ───

  const ConversationListPanel = ({ className = "" }: { className?: string }) => (
    <div className={`flex flex-col bg-card ${className}`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">AI History</h2>
        <Button onClick={handleNewChat} variant="ghost" size="icon" className="h-8 w-8 text-primary">
          <PenSquare className="h-4 w-4" />
        </Button>
      </div>

      <div className="px-3 py-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search history"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-8 text-sm bg-muted/50 border-none"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {loadingConvs ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-2 px-4">
            <History className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No history yet</p>
          </div>
        ) : (
          <div className="py-1">
            {filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSearchParams({ chat: conv.id })}
                className={`w-full group flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left relative ${activeChatId === conv.id ? "bg-muted/70 border-l-2 border-primary" : ""
                  }`}
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-foreground truncate pr-6">{conv.title}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}
                  </p>
                </div>
                <button
                  onClick={(e) => handleDeleteConv(e, conv.id)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 rounded-full hover:bg-destructive/10 text-destructive transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );

  const ChatPanel = ({ className = "", showBackButton = false }: { className?: string; showBackButton?: boolean }) => {
    if (!activeChatId && messages.length === 0) {
      return (
        <div className={`flex flex-col h-full bg-gradient-to-b from-muted/30 via-background to-background relative p-6 ${className}`}>
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 overflow-hidden shadow-lg shadow-primary/10 ring-4 ring-background">
              <img src="/logo.png" alt="Meddin" className="h-14 object-contain" />
            </div>

            <h1 className="text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
              {getGreeting()}, {userName}!
            </h1>
            <p className="text-base text-muted-foreground mt-2 max-w-md leading-relaxed">
              Your health companion — clear, simple, and made for you.
            </p>

            <div className="w-full max-w-xl mt-8">
              <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden text-left">
                <div className="px-5 pt-4 pb-2">
                  <textarea
                    placeholder="Ask Meddin AI Assistant..."
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    className="w-full bg-transparent text-base text-foreground placeholder:text-muted-foreground/60 outline-none resize-none min-h-[100px]"
                    maxLength={2000}
                    disabled={isLoading}
                    rows={3}
                  />
                </div>
                <div className="flex items-center justify-between px-4 py-3 border-t border-border/40 bg-muted/20">
                  <button onClick={startListening} className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors">
                    <Mic className="h-4.5 w-4.5" />
                  </button>
                  <button
                    onClick={() => sendMessage()}
                    disabled={!input.trim() || isLoading}
                    className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 shadow-md shadow-primary/20"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={`flex flex-col h-full bg-background ${className}`}>
        {/* Chat Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-10">
          {showBackButton && (
            <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden" onClick={() => setSearchParams({})}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden ring-1 ring-border shadow-sm">
            <img src="/logo.png" alt="Meddin" className="h-6 w-6 object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-sm truncate">Health Assistant</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Online</span>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNewChat}>
            <Sparkles className="h-4 w-4 text-primary" />
          </Button>
        </div>

        {/* Messages list */}
        <ScrollArea className="flex-1">
          <div className="space-y-6 px-4 py-8 max-w-2xl mx-auto">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1 ring-1 ring-border overflow-hidden">
                    <img src="/logo.png" alt="" className="h-5 w-5 object-contain" />
                  </div>
                )}
                <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-[14.5px] leading-relaxed shadow-sm ${msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-muted/80 text-foreground border border-border/40 rounded-tl-sm ring-1 ring-white/10"
                  }`}>
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none 
                      [&>p]:my-1.5 [&>p]:leading-relaxed 
                      [&>ul]:my-2 [&>ol]:my-2 
                      [&>li]:my-0.5
                      [&>h1]:text-lg [&>h1]:font-bold [&>h1]:mb-2
                      [&>h2]:text-base [&>h2]:font-bold [&>h2]:mb-2
                      [&>h3]:text-sm [&>h3]:font-bold [&>h3]:mb-1
                      [&>code]:bg-black/10 [&>code]:dark:bg-white/10 [&>code]:px-1 [&>code]:rounded
                    ">
                      <ReactMarkdown>{msg.content || "Thinking..."}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-1 shadow-md">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (!messages.length || messages[messages.length - 1].role === "user") && (
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 ring-1 ring-border overflow-hidden">
                  <img src="/logo.png" alt="" className="h-5 w-5 object-contain" />
                </div>
                <div className="bg-muted/60 rounded-2xl rounded-tl-sm px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Bar */}
        <div className="p-4 border-t border-border bg-card/80 backdrop-blur-md">
          <div className="max-w-2xl mx-auto flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 bg-muted/50 rounded-full px-4 py-2 border border-border/60 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
              <input
                ref={inputRef as any}
                placeholder="Ask Meddin..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none h-8"
                maxLength={2000}
                disabled={isLoading}
              />
              <button onClick={startListening} className="flex-shrink-0 text-muted-foreground hover:text-red-500 transition-colors">
                <Mic className="h-4.5 w-4.5" />
              </button>
            </div>
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 shadow-md shadow-primary/20"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ─── Voice Overlay ───
  const VoiceOverlay = () => (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center animate-in fade-in duration-300" style={{
      background: "linear-gradient(160deg, var(--primary) 0%, #0A66C2 40%, #004182 100%)",
    }}>
      <button
        onClick={stopListening}
        className="absolute top-6 left-6 h-11 w-11 rounded-full flex items-center justify-center text-white/90 hover:text-white transition-all bg-white/10 backdrop-blur-md border border-white/20 hover:scale-110"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="flex flex-col items-center gap-8">
        <div className="relative">
          <div className="absolute -inset-6 rounded-full animate-ping opacity-20 bg-white" style={{ animationDuration: "2s" }} />
          <div className="absolute -inset-4 rounded-full opacity-30 bg-white/20 backdrop-blur-sm" />
          <div className="h-28 w-28 rounded-full flex items-center justify-center bg-white/20 backdrop-blur-xl border border-white/30 shadow-2xl">
            <Mic className="h-12 w-12 text-white" />
          </div>
        </div>

        <div className="flex items-end gap-[4px] h-12">
          {Array.from({ length: 24 }).map((_, i) => (
            <div
              key={i}
              className="rounded-full bg-white/70"
              style={{
                width: "4px",
                height: `${Math.random() * 40 + 8}px`,
                animation: `pulse 0.6s ease-in-out ${i * 0.04}s infinite alternate`,
              }}
            />
          ))}
        </div>

        <div className="min-h-[2rem]">
          {input ? (
            <p className="text-white text-2xl font-bold text-center px-8 max-w-lg tracking-tight leading-tight drop-shadow-md">
              {input}
            </p>
          ) : (
            <p className="text-white/60 text-lg font-medium animate-pulse">Listening...</p>
          )}
        </div>

        <button
          onClick={() => { stopListening(); if (input.trim()) sendMessage(); }}
          className="h-16 w-16 rounded-full bg-destructive shadow-2xl shadow-destructive/40 flex items-center justify-center text-white transition-all active:scale-90 hover:scale-105"
        >
          <MicOff className="h-7 w-7" />
        </button>
      </div>
    </div>
  );

  if (authLoading) {
    return (
      <AppLayout className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </AppLayout>
    );
  }

  // ─── FINAL RENDER ───
  return (
    <>
      {showVoiceOverlay && <VoiceOverlay />}

      <AppLayout className="p-0">
        {/* Split Panel Layout */}
        <div className="container max-w-6xl mx-auto px-4 py-4">
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm flex relative" style={{ height: "calc(100vh - 7.5rem)" }}>

            {/* Mobile: View logic identical to Messages.tsx */}
            {activeChatId ? (
              <>
                {/* Mobile: Active Chat */}
                <ChatPanel className="flex-1 lg:hidden" showBackButton={true} />
                {/* Desktop: Sidebar + Chat */}
                <ConversationListPanel className="hidden lg:flex w-[320px] xl:w-[360px] border-r border-border flex-shrink-0" />
                <ChatPanel className="hidden lg:flex flex-1" showBackButton={false} />
              </>
            ) : (
              <>
                {/* Mobile: List only */}
                <ConversationListPanel className="w-full lg:hidden" />
                {/* Desktop: Sidebar + Welcome/New Chat */}
                <ConversationListPanel className="hidden lg:flex w-[320px] xl:w-[360px] border-r border-border flex-shrink-0" />
                <ChatPanel className="hidden lg:flex flex-1" showBackButton={false} />
              </>
            )}
          </div>
        </div>
      </AppLayout>

      <style>{`
        @keyframes pulse {
          0% { opacity: 0.4; transform: scaleY(0.8); }
          100% { opacity: 1; transform: scaleY(1.5); }
        }
      `}</style>
    </>
  );
};

export default AIChat;
