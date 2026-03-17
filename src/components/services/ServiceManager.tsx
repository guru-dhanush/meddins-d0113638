import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/contexts/CurrencyContext";
import { formatPrice } from "@/lib/currency";
import { Loader2, Plus, Pencil, Trash2, Monitor, Building2, Home, X } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

const MODES = [
  { value: "online", label: "Online", icon: Monitor },
  { value: "in_clinic", label: "In-Clinic", icon: Building2 },
  { value: "home_visit", label: "Home Visit", icon: Home },
];

type Service = {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  duration_minutes: number | null;
  consultation_mode: string | null;
  consultation_modes: string[];
  pricing?: Record<string, number>;
};

type ServiceManagerProps = {
  providerId: string;
  providerCurrency: string;
};

const ServiceManager = ({ providerId, providerCurrency }: ServiceManagerProps) => {
  const { toast } = useToast();
  const { userCurrency } = useCurrency();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("30");
  const [selectedModes, setSelectedModes] = useState<string[]>([]);
  const [modePrices, setModePrices] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchServices();
  }, [providerId]);

  const fetchServices = async () => {
    setLoading(true);
    const { data: servicesData } = await supabase
      .from("services")
      .select("*")
      .eq("provider_id", providerId)
      .order("name");

    if (!servicesData?.length) {
      setServices([]);
      setLoading(false);
      return;
    }

    // Fetch pricing for all services
    const serviceIds = servicesData.map(s => s.id);
    const { data: pricingData } = await supabase
      .from("service_pricing" as any)
      .select("*")
      .in("service_id", serviceIds);

    const pricingMap = new Map<string, Record<string, number>>();
    (pricingData as any[])?.forEach(p => {
      if (!pricingMap.has(p.service_id)) pricingMap.set(p.service_id, {});
      pricingMap.get(p.service_id)![p.consultation_mode] = Number(p.price);
    });

    setServices(servicesData.map(s => ({
      ...s,
      consultation_modes: (s as any).consultation_modes || [],
      pricing: pricingMap.get(s.id) || {},
    })));
    setLoading(false);
  };

  const openAdd = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setDuration("30");
    setSelectedModes([]);
    setModePrices({});
    setDialogOpen(true);
  };

  const openEdit = (service: Service) => {
    setEditing(service);
    setName(service.name);
    setDescription(service.description || "");
    setDuration(String(service.duration_minutes || 30));
    setSelectedModes(service.consultation_modes || []);
    const prices: Record<string, string> = {};
    if (service.pricing) {
      Object.entries(service.pricing).forEach(([mode, price]) => {
        prices[mode] = String(price);
      });
    }
    setModePrices(prices);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim() || selectedModes.length === 0) {
      toast({ title: "Please fill in name and select at least one mode", variant: "destructive" });
      return;
    }
    setSaving(true);

    const basePrice = selectedModes.length > 0
      ? Number(modePrices[selectedModes[0]] || 0)
      : 0;

    if (editing) {
      // Update service
      const { error } = await supabase
        .from("services")
        .update({
          name: name.trim(),
          description: description.trim() || null,
          duration_minutes: Number(duration),
          price: basePrice,
          consultation_modes: selectedModes,
        } as any)
        .eq("id", editing.id);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        setSaving(false);
        return;
      }

      // Update pricing: delete old, insert new
      await (supabase as any).from("service_pricing").delete().eq("service_id", editing.id);
      const pricingRows = selectedModes.map(mode => ({
        service_id: editing.id,
        consultation_mode: mode,
        price: Number(modePrices[mode] || 0),
      }));
      if (pricingRows.length) {
        await (supabase as any).from("service_pricing").insert(pricingRows);
      }
    } else {
      // Create service
      const { data: newService, error } = await supabase
        .from("services")
        .insert({
          provider_id: providerId,
          name: name.trim(),
          description: description.trim() || null,
          duration_minutes: Number(duration),
          price: basePrice,
          consultation_modes: selectedModes,
        } as any)
        .select("id")
        .single();

      if (error || !newService) {
        toast({ title: "Error", description: error?.message, variant: "destructive" });
        setSaving(false);
        return;
      }

      // Insert pricing
      const pricingRows = selectedModes.map(mode => ({
        service_id: newService.id,
        consultation_mode: mode,
        price: Number(modePrices[mode] || 0),
      }));
      if (pricingRows.length) {
        await (supabase as any).from("service_pricing").insert(pricingRows);
      }
    }

    toast({ title: editing ? "Service updated!" : "Service added!" });
    setDialogOpen(false);
    await fetchServices();
    setSaving(false);
  };

  const handleDelete = async (serviceId: string) => {
    await supabase.from("services").delete().eq("id", serviceId);
    toast({ title: "Service removed" });
    fetchServices();
  };

  const toggleMode = (mode: string) => {
    setSelectedModes(prev =>
      prev.includes(mode) ? prev.filter(m => m !== mode) : [...prev, mode]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Services</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Define services with per-mode pricing</p>
            </div>
            <Button size="sm" onClick={openAdd}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Service
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {services.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">No services yet. Add your first service to get started.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {services.map(service => (
                <div key={service.id} className="flex items-start justify-between p-3 rounded-lg border border-border bg-muted/20">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-medium text-foreground">{service.name}</h4>
                      {service.duration_minutes && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {service.duration_minutes} min
                        </Badge>
                      )}
                    </div>
                    {service.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{service.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {(service.consultation_modes || []).map(mode => {
                        const price = service.pricing?.[mode];
                        const ModeIcon = MODES.find(m => m.value === mode)?.icon || Monitor;
                        const modeLabel = MODES.find(m => m.value === mode)?.label || mode;
                        return (
                          <Badge key={mode} variant="secondary" className="text-[10px] gap-1 px-1.5 py-0.5">
                            <ModeIcon className="h-2.5 w-2.5" />
                            {modeLabel}: {price != null ? formatPrice(price, providerCurrency) : "Free"}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(service)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(service.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Service" : "Add Service"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Service Name</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Ear Examination" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Description</label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description..." rows={2} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Duration (minutes)</label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[15, 20, 30, 45, 60, 90, 120].map(d => (
                    <SelectItem key={d} value={String(d)}>{d} min</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Available Modes & Pricing</label>
              <div className="space-y-2">
                {MODES.map(mode => {
                  const isSelected = selectedModes.includes(mode.value);
                  return (
                    <div key={mode.value} className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${isSelected ? "border-primary/50 bg-primary/5" : "border-border"}`}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleMode(mode.value)}
                      />
                      <mode.icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium flex-1">{mode.label}</span>
                      {isSelected && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">{providerCurrency}</span>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={modePrices[mode.value] || ""}
                            onChange={e => setModePrices(prev => ({ ...prev, [mode.value]: e.target.value }))}
                            placeholder="0"
                            className="h-8 w-20 text-xs"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <Button className="w-full" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? "Update Service" : "Add Service"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ServiceManager;
