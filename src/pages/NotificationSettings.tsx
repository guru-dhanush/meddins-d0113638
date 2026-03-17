import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Bell, Mail, Calendar, MessageSquare, UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Preferences = {
  booking_created: boolean;
  booking_confirmed: boolean;
  booking_cancelled: boolean;
  booking_reminder_24h: boolean;
  booking_reminder_1h: boolean;
  connection_request: boolean;
  message_received: boolean;
  email_enabled: boolean;
  in_app_enabled: boolean;
};

const defaultPrefs: Preferences = {
  booking_created: true,
  booking_confirmed: true,
  booking_cancelled: true,
  booking_reminder_24h: true,
  booking_reminder_1h: true,
  connection_request: true,
  message_received: true,
  email_enabled: true,
  in_app_enabled: true,
};

const NotificationSettings = () => {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Preferences>(defaultPrefs);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setPrefs({
          booking_created: data.booking_created,
          booking_confirmed: data.booking_confirmed,
          booking_cancelled: data.booking_cancelled,
          booking_reminder_24h: data.booking_reminder_24h,
          booking_reminder_1h: data.booking_reminder_1h,
          connection_request: data.connection_request,
          message_received: data.message_received,
          email_enabled: data.email_enabled,
          in_app_enabled: data.in_app_enabled,
        });
      }
      setLoading(false);
    })();
  }, [user]);

  const updatePref = async (key: keyof Preferences, value: boolean) => {
    if (!user) return;
    setPrefs((prev) => ({ ...prev, [key]: value }));
    setSaving(true);

    const { error } = await supabase
      .from("notification_preferences")
      .upsert(
        { user_id: user.id, ...prefs, [key]: value },
        { onConflict: "user_id" }
      );

    setSaving(false);
    if (error) {
      toast.error("Failed to save preference");
      setPrefs((prev) => ({ ...prev, [key]: !value }));
    }
  };

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
    <AppLayout>
      <div className="container max-w-2xl py-6 px-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notification Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Choose how and when you want to be notified
          </p>
        </div>

        {/* Channels */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              Notification Channels
            </CardTitle>
            <CardDescription>Enable or disable notification delivery methods</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="in_app" className="flex items-center gap-2 cursor-pointer">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">In-App Notifications</p>
                  <p className="text-xs text-muted-foreground">Show notifications inside the app</p>
                </div>
              </Label>
              <Switch id="in_app" checked={prefs.in_app_enabled} onCheckedChange={(v) => updatePref("in_app_enabled", v)} />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label htmlFor="email" className="flex items-center gap-2 cursor-pointer">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Email Notifications</p>
                  <p className="text-xs text-muted-foreground">Receive notifications via email</p>
                </div>
              </Label>
              <Switch id="email" checked={prefs.email_enabled} onCheckedChange={(v) => updatePref("email_enabled", v)} />
            </div>
          </CardContent>
        </Card>

        {/* Booking Notifications */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Booking Notifications
            </CardTitle>
            <CardDescription>Manage notifications for your appointments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {([
              { key: "booking_created" as const, label: "Booking Created", desc: "When a new booking is made" },
              { key: "booking_confirmed" as const, label: "Booking Confirmed", desc: "When a booking is confirmed" },
              { key: "booking_cancelled" as const, label: "Booking Cancelled", desc: "When a booking is cancelled" },
            ]).map(({ key, label, desc }, i) => (
              <div key={key}>
                {i > 0 && <Separator className="mb-4" />}
                <div className="flex items-center justify-between">
                  <Label htmlFor={key} className="cursor-pointer">
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </Label>
                  <Switch id={key} checked={prefs[key]} onCheckedChange={(v) => updatePref(key, v)} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Reminders */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              Booking Reminders
            </CardTitle>
            <CardDescription>Get reminded before your appointments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="reminder_24h" className="cursor-pointer">
                <p className="text-sm font-medium">24 Hours Before</p>
                <p className="text-xs text-muted-foreground">Reminder one day before appointment</p>
              </Label>
              <Switch id="reminder_24h" checked={prefs.booking_reminder_24h} onCheckedChange={(v) => updatePref("booking_reminder_24h", v)} />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label htmlFor="reminder_1h" className="cursor-pointer">
                <p className="text-sm font-medium">1 Hour Before</p>
                <p className="text-xs text-muted-foreground">Reminder one hour before appointment</p>
              </Label>
              <Switch id="reminder_1h" checked={prefs.booking_reminder_1h} onCheckedChange={(v) => updatePref("booking_reminder_1h", v)} />
            </div>
          </CardContent>
        </Card>

        {/* Other */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              Other Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="connection_request" className="flex items-center gap-2 cursor-pointer">
                <UserPlus className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Connection Requests</p>
                  <p className="text-xs text-muted-foreground">When someone sends you a connection request</p>
                </div>
              </Label>
              <Switch id="connection_request" checked={prefs.connection_request} onCheckedChange={(v) => updatePref("connection_request", v)} />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label htmlFor="message_received" className="flex items-center gap-2 cursor-pointer">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">New Messages</p>
                  <p className="text-xs text-muted-foreground">When you receive a new message</p>
                </div>
              </Label>
              <Switch id="message_received" checked={prefs.message_received} onCheckedChange={(v) => updatePref("message_received", v)} />
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default NotificationSettings;
