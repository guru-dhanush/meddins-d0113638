import { useState, useEffect, useMemo } from "react";
import { format, addDays, getDay, startOfDay, isBefore } from "date-fns";
import { CalendarIcon, Loader2, CheckCircle, CreditCard, Download, Monitor, Building2, Home, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { convertAndFormat, formatPrice, convertCurrency } from "@/lib/currency";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { openInvoice } from "@/lib/invoice";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";

type BookingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providerId: string;
  providerName: string;
  preSelectedServiceId?: string;
};

type Service = {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  duration_minutes: number | null;
  consultation_modes: string[];
  pricing: Record<string, number>;
};

type AvailabilitySlot = {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean | null;
  consultation_mode: string;
};

type ExistingBooking = {
  booking_date: string;
  booking_time: string;
  status: string;
};

const MODES = [
  { value: "online", label: "Online", icon: Monitor },
  { value: "in_clinic", label: "In-Clinic", icon: Building2 },
  { value: "home_visit", label: "Home Visit", icon: Home },
];

function generateSlots(start: string, end: string, durationMinutes: number = 30): string[] {
  const slots: string[] = [];
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let mins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  while (mins + durationMinutes <= endMins) {
    const h = Math.floor(mins / 60).toString().padStart(2, "0");
    const m = (mins % 60).toString().padStart(2, "0");
    slots.push(`${h}:${m}`);
    mins += durationMinutes;
  }
  return slots;
}

type Step = "service" | "mode" | "datetime" | "notes" | "payment" | "success";

const BookingDialog = ({
  open, onOpenChange, providerId, providerName, preSelectedServiceId,
}: BookingDialogProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userCurrency } = useCurrency();

  const [step, setStep] = useState<Step>("service");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedMode, setSelectedMode] = useState("");
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Data
  const [services, setServices] = useState<Service[]>([]);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [existingBookings, setExistingBookings] = useState<ExistingBooking[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [providerCurrency, setProviderCurrency] = useState("USD");

  // Result
  const [bookingId, setBookingId] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [patientName, setPatientName] = useState("");

  useEffect(() => {
    if (!open || !providerId) return;
    setLoadingData(true);

    const fetchData = async () => {
      const [servicesRes, availRes, bookingsRes, providerRes] = await Promise.all([
        supabase.from("services").select("*").eq("provider_id", providerId).order("name"),
        supabase.from("availability").select("day_of_week, start_time, end_time, is_active, consultation_mode").eq("provider_id", providerId).eq("is_active", true),
        supabase.from("bookings").select("booking_date, booking_time, status").eq("provider_id", providerId).in("status", ["pending", "accepted"]),
        supabase.from("provider_profiles").select("consultation_fee, currency").eq("id", providerId).maybeSingle(),
      ]);

      // Fetch pricing for services
      const serviceIds = servicesRes.data?.map(s => s.id) || [];
      let pricingMap = new Map<string, Record<string, number>>();
      if (serviceIds.length) {
        const { data: pricingData } = await (supabase as any).from("service_pricing").select("*").in("service_id", serviceIds);
        (pricingData as any[])?.forEach(p => {
          if (!pricingMap.has(p.service_id)) pricingMap.set(p.service_id, {});
          pricingMap.get(p.service_id)![p.consultation_mode] = Number(p.price);
        });
      }

      setServices((servicesRes.data || []).map(s => ({
        ...s,
        consultation_modes: (s as any).consultation_modes || [],
        pricing: pricingMap.get(s.id) || {},
      })));
      setAvailability((availRes.data as AvailabilitySlot[]) || []);
      setExistingBookings((bookingsRes.data as ExistingBooking[]) || []);
      setProviderCurrency((providerRes.data as any)?.currency || "USD");
      setLoadingData(false);
    };

    if (user) {
      supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle()
        .then(({ data }) => setPatientName(data?.full_name || "Patient"));
    }

    fetchData();
  }, [open, providerId, user]);

  // Auto-select pre-selected service
  useEffect(() => {
    if (!preSelectedServiceId || loadingData || services.length === 0) return;
    const svc = services.find(s => s.id === preSelectedServiceId);
    if (svc) {
      setSelectedService(svc);
      const availModes = (svc.consultation_modes || []).filter(m => availability.some(a => a.consultation_mode === m));
      if (availModes.length === 1) {
        setSelectedMode(availModes[0]);
        setStep("datetime");
      } else if (availModes.length > 1) {
        setStep("mode");
      }
    }
  }, [preSelectedServiceId, loadingData, services, availability]);

  // Filter availability by selected mode
  const modeAvailability = useMemo(
    () => availability.filter(a => a.consultation_mode === selectedMode),
    [availability, selectedMode]
  );

  const activeDays = useMemo(
    () => new Set(modeAvailability.map(a => a.day_of_week)),
    [modeAvailability]
  );

  const bookedMap = useMemo(() => {
    const m = new Map<string, Set<string>>();
    existingBookings.forEach(b => {
      if (!m.has(b.booking_date)) m.set(b.booking_date, new Set());
      m.get(b.booking_date)!.add(b.booking_time);
    });
    return m;
  }, [existingBookings]);

  const slotDuration = selectedService?.duration_minutes || 30;

  const slotsForDow = useMemo(() => {
    const m = new Map<number, string[]>();
    modeAvailability.forEach(a => {
      const existing = m.get(a.day_of_week) || [];
      m.set(a.day_of_week, [...existing, ...generateSlots(a.start_time, a.end_time, slotDuration)]);
    });
    m.forEach((slots, dow) => {
      m.set(dow, [...new Set(slots)].sort());
    });
    return m;
  }, [modeAvailability, slotDuration]);

  const isDateFullyBooked = (d: Date) => {
    const dow = getDay(d);
    const allSlots = slotsForDow.get(dow);
    if (!allSlots || allSlots.length === 0) return true;
    const dateKey = format(d, "yyyy-MM-dd");
    const booked = bookedMap.get(dateKey);
    if (!booked) return false;
    return allSlots.every(s => booked.has(s));
  };

  const disableDate = (d: Date) => {
    if (isBefore(d, startOfDay(new Date()))) return true;
    if (!activeDays.has(getDay(d))) return true;
    if (isDateFullyBooked(d)) return true;
    return false;
  };

  const availableSlots = useMemo(() => {
    if (!date) return [];
    const dow = getDay(date);
    const allSlots = slotsForDow.get(dow) || [];
    const dateKey = format(date, "yyyy-MM-dd");
    const booked = bookedMap.get(dateKey) || new Set();
    const now = new Date();
    const isToday = format(date, "yyyy-MM-dd") === format(now, "yyyy-MM-dd");

    return allSlots.filter(s => {
      if (booked.has(s)) return false;
      if (isToday) {
        const [h, m] = s.split(":").map(Number);
        if (h * 60 + m <= now.getHours() * 60 + now.getMinutes()) return false;
      }
      return true;
    });
  }, [date, slotsForDow, bookedMap]);

  const currentPrice = useMemo(() => {
    if (!selectedService || !selectedMode) return 0;
    return selectedService.pricing[selectedMode] ?? selectedService.price ?? 0;
  }, [selectedService, selectedMode]);

  const reset = () => {
    setStep("service");
    setSelectedService(null);
    setSelectedMode("");
    setDate(undefined);
    setTime("");
    setNotes("");
    setSubmitting(false);
    setBookingId("");
    setTransactionId("");
  };

  const handleOpenChange = (val: boolean) => {
    if (!val) reset();
    onOpenChange(val);
  };

  const goBack = () => {
    if (step === "mode") setStep("service");
    else if (step === "datetime") { setStep("mode"); setDate(undefined); setTime(""); }
    else if (step === "notes") setStep("datetime");
    else if (step === "payment") setStep("notes");
  };

  const handlePayNow = async () => {
    if (!user || !date || !time || !selectedService) return;
    setSubmitting(true);

    const txnId = `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const { data: bookingData, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        patient_id: user.id,
        provider_id: providerId,
        booking_date: format(date, "yyyy-MM-dd"),
        booking_time: time,
        notes: notes || null,
        status: "accepted",
        service_id: selectedService.id,
        consultation_mode: selectedMode,
      } as any)
      .select("id")
      .single();

    if (bookingError) {
      toast({ title: "Booking failed", description: bookingError.message, variant: "destructive" });
      setSubmitting(false);
      return;
    }

    const { error: paymentError } = await supabase
      .from("payments" as any)
      .insert({
        booking_id: bookingData.id,
        user_id: user.id,
        amount: currentPrice,
        status: "completed",
        payment_method: "card",
        transaction_id: txnId,
      });

    if (paymentError) {
      toast({ title: "Payment record failed", description: paymentError.message, variant: "destructive" });
    }

    setBookingId(bookingData.id);
    setTransactionId(txnId);
    setSubmitting(false);
    setStep("success");

    // Send notifications + auto-create chat conversation
    const bookingDate = format(date, "MMM dd, yyyy");
    try {
      // Get provider's user_id
      const { data: providerData } = await supabase
        .from("provider_profiles")
        .select("user_id")
        .eq("id", providerId)
        .single();

      // Notify patient
      supabase.functions.invoke("create-notification", {
        body: {
          user_id: user.id,
          title: "Booking Confirmed",
          message: `Your appointment with ${providerName} on ${bookingDate} at ${time} has been confirmed.`,
          type: "booking_created",
          metadata: { booking_id: bookingData.id },
        },
      });

      // Notify provider
      if (providerData?.user_id) {
        supabase.functions.invoke("create-notification", {
          body: {
            user_id: providerData.user_id,
            title: "New Booking Received",
            message: `You have a new appointment on ${bookingDate} at ${time}.`,
            type: "booking_created",
            metadata: { booking_id: bookingData.id },
          },
        });

        // Auto-create chat conversation between patient and provider
        const p1 = user.id < providerData.user_id ? user.id : providerData.user_id;
        const p2 = user.id < providerData.user_id ? providerData.user_id : user.id;

        // Check if conversation already exists
        const { data: existingConvo } = await supabase
          .from("conversations")
          .select("id")
          .or(`and(participant_1.eq.${p1},participant_2.eq.${p2}),and(participant_1.eq.${p2},participant_2.eq.${p1})`)
          .maybeSingle();

        let conversationId = existingConvo?.id;

        if (!conversationId) {
          const { data: newConvo } = await supabase
            .from("conversations")
            .insert({
              participant_1: p1,
              participant_2: p2,
              is_request: false,
            })
            .select("id")
            .single();
          conversationId = newConvo?.id;
        }

        if (conversationId) {
          const modeLabel = selectedMode === "online" ? "Online" : selectedMode === "in_clinic" ? "In-Clinic" : "Home Visit";
          const systemMsg = selectedMode === "online"
            ? `[SYSTEM] 📅 Appointment booked for ${bookingDate} at ${time} (${modeLabel}). A video call link will appear here before the appointment.`
            : `[SYSTEM] 📅 Appointment booked for ${bookingDate} at ${time} (${modeLabel}).`;

          await supabase.from("messages").insert({
            conversation_id: conversationId,
            sender_id: user.id,
            content: systemMsg,
            read: false,
          });
        }
      }
    } catch (e) {
      console.error("Notification/chat error:", e);
    }
  };

  const handleDownloadInvoice = () => {
    if (!date) return;
    const convertedAmt = convertCurrency(currentPrice, providerCurrency, userCurrency);
    openInvoice({
      bookingId,
      transactionId,
      providerName,
      patientName,
      date: format(date, "PPP"),
      time,
      amount: currentPrice,
      currency: providerCurrency,
      paymentMethod: "Card",
      paidAt: new Date().toLocaleDateString(),
      convertedAmount: convertedAmt,
      convertedCurrency: userCurrency,
    });
  };

  if (!user) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sign in to book</DialogTitle>
            <DialogDescription>
              Create an account or sign in to book an appointment with {providerName}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button className="flex-1" onClick={() => navigate("/auth?tab=signin")}>Sign In</Button>
            <Button className="flex-1" variant="outline" onClick={() => navigate("/auth?tab=signup")}>Sign Up</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const stepTitle = {
    service: `Book with ${providerName}`,
    mode: "Select Consultation Mode",
    datetime: "Select Date & Time",
    notes: "Additional Notes",
    payment: "Payment Summary",
    success: "Booking Confirmed!",
  };

  const stepDescription = {
    service: "Choose a service you'd like to book",
    mode: "How would you like to consult?",
    datetime: "Pick a convenient date and time",
    notes: "Any additional information for the provider",
    payment: "Review and complete your payment",
    success: "",
  };

  const getModeIcon = (mode: string) => {
    const m = MODES.find(x => x.value === mode);
    return m ? <m.icon className="h-4 w-4" /> : null;
  };

  const getModeLabel = (mode: string) => MODES.find(x => x.value === mode)?.label || mode;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{stepTitle[step]}</DialogTitle>
          {stepDescription[step] && <DialogDescription>{stepDescription[step]}</DialogDescription>}
        </DialogHeader>

        {loadingData && step !== "success" ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Loading…</span>
          </div>
        ) : (
          <>
            {/* ─── Step 1: Select Service ─── */}
            {step === "service" && (
              <div className="space-y-3">
                {services.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground text-sm">This provider hasn't set up services yet.</p>
                  </div>
                ) : (
                  services.map(service => {
                    const modes = service.consultation_modes || [];
                    const minPrice = modes.length > 0
                      ? Math.min(...modes.map(m => service.pricing[m] ?? service.price ?? 0))
                      : service.price ?? 0;
                    return (
                      <button
                        key={service.id}
                        onClick={() => {
                          setSelectedService(service);
                          const availModes = modes.filter(m => availability.some(a => a.consultation_mode === m));
                          if (availModes.length === 1) {
                            setSelectedMode(availModes[0]);
                            setStep("datetime");
                          } else {
                            setStep("mode");
                          }
                        }}
                        className={cn(
                          "w-full text-left p-4 rounded-lg border transition-all hover:border-primary/50 hover:bg-primary/5",
                          selectedService?.id === service.id ? "border-primary bg-primary/5" : "border-border"
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-sm font-semibold text-foreground">{service.name}</h4>
                            {service.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{service.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              {modes.map(mode => (
                                <Badge key={mode} variant="outline" className="text-[10px] gap-1 px-1.5 py-0.5">
                                  {getModeIcon(mode)}
                                  {getModeLabel(mode)}
                                </Badge>
                              ))}
                              {service.duration_minutes && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                                  {service.duration_minutes} min
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-right ml-3">
                            <span className="text-sm font-bold text-foreground">
                              {minPrice > 0 ? (modes.length > 1 ? `From ${convertAndFormat(minPrice, providerCurrency, userCurrency)}` : convertAndFormat(minPrice, providerCurrency, userCurrency)) : "Free"}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}

            {/* ─── Step 2: Select Mode ─── */}
            {step === "mode" && selectedService && (
              <div className="space-y-3">
                <Button variant="ghost" size="sm" className="mb-1 -ml-2 text-xs" onClick={goBack}>
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
                </Button>
                <p className="text-sm text-muted-foreground">
                  Choose how you'd like to consult for <span className="font-medium text-foreground">{selectedService.name}</span>
                </p>
                {(selectedService.consultation_modes || []).map(mode => {
                  const hasAvailability = availability.some(a => a.consultation_mode === mode);
                  const price = selectedService.pricing[mode] ?? selectedService.price ?? 0;
                  const ModeIcon = MODES.find(m => m.value === mode)?.icon || Monitor;
                  return (
                    <button
                      key={mode}
                      disabled={!hasAvailability}
                      onClick={() => {
                        setSelectedMode(mode);
                        setStep("datetime");
                      }}
                      className={cn(
                        "w-full text-left p-4 rounded-lg border transition-all flex items-center gap-4",
                        hasAvailability ? "hover:border-primary/50 hover:bg-primary/5 border-border" : "opacity-50 cursor-not-allowed border-border",
                        selectedMode === mode && "border-primary bg-primary/5"
                      )}
                    >
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <ModeIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-foreground">{getModeLabel(mode)}</h4>
                        {!hasAvailability && (
                          <p className="text-xs text-muted-foreground">No availability set for this mode</p>
                        )}
                      </div>
                      <span className="text-sm font-bold text-foreground">
                        {price > 0 ? convertAndFormat(price, providerCurrency, userCurrency) : "Free"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* ─── Step 3: Date & Time ─── */}
            {step === "datetime" && (
              <div className="space-y-4">
                <Button variant="ghost" size="sm" className="mb-1 -ml-2 text-xs" onClick={goBack}>
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
                </Button>

                {/* Summary badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedService && <Badge variant="secondary" className="text-xs">{selectedService.name}</Badge>}
                  {selectedMode && (
                    <Badge variant="outline" className="text-xs gap-1">
                      {getModeIcon(selectedMode)} {getModeLabel(selectedMode)}
                    </Badge>
                  )}
                </div>

                {modeAvailability.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground text-sm">No availability for this mode. Please try another.</p>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">Select Date</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date ? format(date, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={date}
                            onSelect={(d) => { setDate(d); setTime(""); }}
                            disabled={disableDate}
                            fromDate={new Date()}
                            toDate={addDays(new Date(), 60)}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {date && (
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">
                          Select Time
                          <span className="text-muted-foreground font-normal ml-1">
                            ({availableSlots.length} slot{availableSlots.length !== 1 ? "s" : ""})
                          </span>
                        </label>
                        {availableSlots.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-2">No available slots for this date.</p>
                        ) : (
                          <div className="grid grid-cols-4 gap-2">
                            {availableSlots.map(slot => (
                              <button
                                key={slot}
                                onClick={() => setTime(slot)}
                                className={cn(
                                  "py-2 px-3 rounded-md text-sm font-medium transition-colors border",
                                  time === slot
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "border-border text-foreground hover:border-primary/50"
                                )}
                              >
                                {slot}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <Button onClick={() => setStep("notes")} disabled={!date || !time} className="w-full">
                      Continue
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* ─── Step 4: Notes ─── */}
            {step === "notes" && (
              <div className="space-y-4">
                <Button variant="ghost" size="sm" className="mb-1 -ml-2 text-xs" onClick={goBack}>
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
                </Button>

                <div className="flex items-center gap-2 flex-wrap">
                  {selectedService && <Badge variant="secondary" className="text-xs">{selectedService.name}</Badge>}
                  {selectedMode && <Badge variant="outline" className="text-xs gap-1">{getModeIcon(selectedMode)} {getModeLabel(selectedMode)}</Badge>}
                  {date && <Badge variant="outline" className="text-xs">{format(date, "MMM d")}</Badge>}
                  {time && <Badge variant="outline" className="text-xs">{time}</Badge>}
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Notes <span className="text-muted-foreground font-normal">(optional)</span>
                  </label>
                  <Textarea
                    placeholder="Describe your symptoms or reason for visit..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <Button onClick={() => setStep("payment")} className="w-full">
                  Continue to Payment
                </Button>
              </div>
            )}

            {/* ─── Step 5: Payment ─── */}
            {step === "payment" && date && (
              <div className="space-y-4">
                <Button variant="ghost" size="sm" className="mb-1 -ml-2 text-xs" onClick={goBack}>
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
                </Button>

                <div className="rounded-lg border border-border p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Provider</span>
                    <span className="font-medium text-foreground">{providerName}</span>
                  </div>
                  {selectedService && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Service</span>
                      <span className="font-medium text-foreground">{selectedService.name}</span>
                    </div>
                  )}
                  {selectedMode && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Mode</span>
                      <span className="font-medium text-foreground flex items-center gap-1.5">
                        {getModeIcon(selectedMode)} {getModeLabel(selectedMode)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Date</span>
                    <span className="font-medium text-foreground">{format(date, "PPP")}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Time</span>
                    <span className="font-medium text-foreground">{time}</span>
                  </div>
                  {selectedService?.duration_minutes && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Duration</span>
                      <span className="font-medium text-foreground">{selectedService.duration_minutes} min</span>
                    </div>
                  )}
                  {notes && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Notes</span>
                      <span className="font-medium text-foreground text-right max-w-[60%] truncate">{notes}</span>
                    </div>
                  )}
                  <div className="border-t border-border pt-3 flex justify-between">
                    <span className="font-semibold text-foreground">Total</span>
                    <span className="font-bold text-lg text-foreground">
                      {currentPrice > 0 ? convertAndFormat(currentPrice, providerCurrency, userCurrency, { showOriginal: providerCurrency !== userCurrency }) : "Free"}
                    </span>
                  </div>
                </div>

                <div className="rounded-lg border border-border p-3 flex items-center gap-3 bg-muted/30">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Card Payment</p>
                    <p className="text-xs text-muted-foreground">Simulated payment — no real charge</p>
                  </div>
                </div>

                <Button className="w-full" onClick={handlePayNow} disabled={submitting}>
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                  {currentPrice > 0 ? `Pay ${convertAndFormat(currentPrice, providerCurrency, userCurrency)}` : "Confirm Booking"}
                </Button>
              </div>
            )}

            {/* ─── Step 6: Success ─── */}
            {step === "success" && date && (
              <div className="text-center py-6 space-y-4">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                <div>
                  <p className="font-semibold text-foreground text-lg">Booking Confirmed!</p>
                  <p className="text-muted-foreground text-sm mt-1">
                    Your {selectedService?.name} appointment with {providerName} on {format(date, "PPP")} at {time} is confirmed.
                  </p>
                  {selectedMode && (
                    <div className="flex items-center justify-center gap-1.5 mt-2">
                      <Badge variant="outline" className="text-xs gap-1">
                        {getModeIcon(selectedMode)} {getModeLabel(selectedMode)}
                      </Badge>
                    </div>
                  )}
                  {transactionId && (
                    <p className="text-xs text-muted-foreground mt-2 font-mono">Transaction: {transactionId}</p>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={handleDownloadInvoice}>
                    <Download className="mr-2 h-4 w-4" /> Invoice
                  </Button>
                  <Button className="flex-1" onClick={() => { handleOpenChange(false); navigate("/dashboard"); }}>
                    Go to Dashboard
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BookingDialog;
