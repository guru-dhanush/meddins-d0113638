import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Monitor, Building2, Home } from "lucide-react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MODES = [
  { value: "online", label: "Online", icon: Monitor },
  { value: "in_clinic", label: "In-Clinic", icon: Building2 },
  { value: "home_visit", label: "Home Visit", icon: Home },
] as const;

const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`);
const HALF_HOURS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});

type Slot = {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  consultation_mode: string;
};

type AvailabilityEditorProps = {
  providerId: string;
};

const AvailabilityEditor = ({ providerId }: AvailabilityEditorProps) => {
  const { toast } = useToast();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeMode, setActiveMode] = useState("in_clinic");

  useEffect(() => {
    fetchSlots();
  }, [providerId]);

  const fetchSlots = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("availability")
      .select("*")
      .eq("provider_id", providerId)
      .order("day_of_week")
      .order("start_time");
    setSlots((data as any[])?.map(s => ({ ...s, is_active: s.is_active ?? true })) || []);
    setLoading(false);
  };

  const modeSlots = slots.filter(s => s.consultation_mode === activeMode);

  const addSlot = () => {
    setSlots(prev => [...prev, {
      day_of_week: 1,
      start_time: "09:00",
      end_time: "17:00",
      is_active: true,
      consultation_mode: activeMode,
    }]);
  };

  const updateSlot = (index: number, field: keyof Slot, value: any) => {
    const globalIndex = slots.findIndex((s, i) => {
      let count = 0;
      for (let j = 0; j <= i; j++) {
        if (slots[j].consultation_mode === activeMode) count++;
      }
      return count - 1 === index && s.consultation_mode === activeMode;
    });
    if (globalIndex === -1) return;
    setSlots(prev => prev.map((s, i) => i === globalIndex ? { ...s, [field]: value } : s));
  };

  const removeSlot = (index: number) => {
    let count = -1;
    const globalIndex = slots.findIndex(s => {
      if (s.consultation_mode === activeMode) count++;
      return count === index;
    });
    if (globalIndex === -1) return;
    const slot = slots[globalIndex];
    if (slot.id) {
      supabase.from("availability").delete().eq("id", slot.id).then(() => {});
    }
    setSlots(prev => prev.filter((_, i) => i !== globalIndex));
  };

  const handleSave = async () => {
    setSaving(true);

    // Delete all existing for this mode
    await supabase
      .from("availability")
      .delete()
      .eq("provider_id", providerId)
      .eq("consultation_mode", activeMode);

    // Insert active slots for this mode
    const activeSlots = slots
      .filter(s => s.consultation_mode === activeMode && s.is_active)
      .map(s => ({
        provider_id: providerId,
        day_of_week: s.day_of_week,
        start_time: s.start_time,
        end_time: s.end_time,
        is_active: true,
        consultation_mode: activeMode,
      }));

    if (activeSlots.length > 0) {
      const { error } = await supabase.from("availability").insert(activeSlots);
      if (error) {
        toast({ title: "Error saving", description: error.message, variant: "destructive" });
        setSaving(false);
        return;
      }
    }

    toast({ title: "Availability saved!" });
    await fetchSlots();
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Manage Availability</CardTitle>
        <p className="text-xs text-muted-foreground">Set your schedule for each consultation mode</p>
      </CardHeader>
      <CardContent>
        <Tabs value={activeMode} onValueChange={setActiveMode}>
          <TabsList className="w-full grid grid-cols-3 mb-4">
            {MODES.map(m => (
              <TabsTrigger key={m.value} value={m.value} className="text-xs gap-1.5">
                <m.icon className="h-3.5 w-3.5" />
                {m.label}
                {slots.filter(s => s.consultation_mode === m.value && s.is_active).length > 0 && (
                  <Badge variant="secondary" className="text-[9px] px-1 py-0 ml-1">
                    {slots.filter(s => s.consultation_mode === m.value && s.is_active).length}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {MODES.map(m => (
            <TabsContent key={m.value} value={m.value} className="space-y-3">
              {modeSlots.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground mb-3">No {m.label.toLowerCase()} slots configured</p>
                  <Button variant="outline" size="sm" onClick={addSlot}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Slot
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {modeSlots.map((slot, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/20">
                        <Switch
                          checked={slot.is_active}
                          onCheckedChange={(v) => updateSlot(idx, "is_active", v)}
                          className="scale-75"
                        />
                        <Select value={String(slot.day_of_week)} onValueChange={(v) => updateSlot(idx, "day_of_week", Number(v))}>
                          <SelectTrigger className="h-8 min-w-[5rem] text-xs">
                            <SelectValue>{DAYS[slot.day_of_week]?.slice(0, 3)}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {DAYS.map((d, i) => (
                              <SelectItem key={i} value={String(i)}>{d.slice(0, 3)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={slot.start_time} onValueChange={(v) => updateSlot(idx, "start_time", v)}>
                          <SelectTrigger className="h-8 min-w-[4.5rem] text-xs">
                            <SelectValue>{slot.start_time}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {HALF_HOURS.map(t => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-xs text-muted-foreground">to</span>
                        <Select value={slot.end_time} onValueChange={(v) => updateSlot(idx, "end_time", v)}>
                          <SelectTrigger className="h-8 min-w-[4.5rem] text-xs">
                            <SelectValue>{slot.end_time}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {HALF_HOURS.map(t => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeSlot(idx)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <Button variant="outline" size="sm" onClick={addSlot}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Slot
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving}>
                      {saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                      Save {m.label}
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AvailabilityEditor;
