import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Calendar, Check, CheckCheck, Loader2, MessageSquare, Settings, UserPlus, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  metadata: any;
  created_at: string;
};

const typeIcon: Record<string, React.ReactNode> = {
  booking_created: <Calendar className="h-5 w-5 text-primary" />,
  booking_confirmed: <Check className="h-5 w-5 text-green-500" />,
  booking_cancelled: <Calendar className="h-5 w-5 text-destructive" />,
  booking_reminder: <Bell className="h-5 w-5 text-amber-500" />,
  connection_request: <UserPlus className="h-5 w-5 text-primary" />,
  message: <MessageSquare className="h-5 w-5 text-primary" />,
  general: <Bell className="h-5 w-5 text-muted-foreground" />,
};

const Notifications = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setNotifications((data as Notification[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchNotifications();

    // Realtime subscription
    if (!user) return;
    const channel = supabase
      .channel("user-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const markAllRead = async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    toast.success(t("notifications.allMarkedRead"));
  };

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const clearAll = async () => {
    if (!user) return;
    await supabase.from("notifications").delete().eq("user_id", user.id);
    setNotifications([]);
    toast.success(t("notifications.allCleared"));
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout className="p-0">
      <div className="container max-w-6xl mx-auto p-2 md:p-4">
        <div className="flex items-center justify-between mb-2 p-4 bg-background rounded-none md:rounded-md">
          <div>
            <h1 className="text-sm font-semibold text-foreground">{t("notifications.title")}</h1>
            {unreadCount > 0 && (
              <p className="text-xs text-muted-foreground">{t("notifications.unread", { count: unreadCount })}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllRead} className="h-8 text-xs">
                <CheckCheck className="h-3.5 w-3.5 mr-1" /> {t("notifications.markAllRead")}
              </Button>
            )}
            {notifications.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAll} className="h-8 text-xs">
                <Trash2 className="h-3.5 w-3.5 mr-1" /> {t("notifications.clear")}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => navigate("/notification-settings")} className="h-8">
              <Settings className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="bg-background p-4 rounded-none md:rounded-md">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Bell className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">No notifications yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">We'll notify you when something happens</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((n) => (
                <Card
                  key={n.id}
                  className={`p-4 cursor-pointer transition-colors hover:bg-accent/50 ${!n.is_read ? "border-primary/30 bg-primary/5" : ""}`}
                  onClick={() => markRead(n.id)}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {typeIcon[n.type] || typeIcon.general}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm ${!n.is_read ? "font-semibold" : "font-medium"} text-foreground`}>
                          {n.title}
                        </p>
                        {!n.is_read && (
                          <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Notifications;
