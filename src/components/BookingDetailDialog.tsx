import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Download, CalendarDays, Clock, FileText, CreditCard, Monitor, Building2, Home, Stethoscope, Star, ClipboardPlus, Pill, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { openInvoice } from "@/lib/invoice";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { convertAndFormat, convertCurrency } from "@/lib/currency";
import RateProviderDialog from "@/components/RateProviderDialog";
import WritePrescriptionDialog from "@/components/prescription/WritePrescriptionDialog";
import PrescriptionDetailDialog from "@/components/prescription/PrescriptionDetailDialog";
import { useVideoCall } from "@/contexts/VideoCallContext";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

type BookingDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: {
    id: string;
    booking_date: string;
    booking_time: string;
    status: string;
    notes: string | null;
    provider_id: string;
    patient_id: string;
    provider_name?: string;
    provider_avatar?: string | null;
    patient_name?: string;
    service_name?: string;
    consultation_mode?: string;
  } | null;
  onStatusUpdate?: () => void;
};

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  accepted: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  declined: "bg-destructive/10 text-destructive",
  completed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  cancelled: "bg-muted text-muted-foreground",
};

const getModeIcon = (mode: string) => {
  if (mode === "online") return <Monitor className="h-4 w-4 text-muted-foreground" />;
  if (mode === "home_visit") return <Home className="h-4 w-4 text-muted-foreground" />;
  return <Building2 className="h-4 w-4 text-muted-foreground" />;
};

const getModeLabel = (mode: string) => {
  if (mode === "online") return "Online";
  if (mode === "home_visit") return "Home Visit";
  if (mode === "in_clinic") return "In-Clinic";
  return mode;
};

const BookingDetailDialog = ({ open, onOpenChange, booking, onStatusUpdate }: BookingDetailDialogProps) => {
  const { user } = useAuth();
  const { userCurrency } = useCurrency();
  const { startCall, isInCall } = useVideoCall();
  const [payment, setPayment] = useState<any>(null);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [patientName, setPatientName] = useState("");
  const [providerCurrency, setProviderCurrency] = useState("USD");
  const [serviceName, setServiceName] = useState("");
  const [rateDialogOpen, setRateDialogOpen] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [rxDialogOpen, setRxDialogOpen] = useState(false);
  const [existingRxId, setExistingRxId] = useState<string | null>(null);
  const [rxDetailOpen, setRxDetailOpen] = useState(false);
  const [isProviderUser, setIsProviderUser] = useState(false);

  useEffect(() => {
    if (!open || !booking) return;

    setLoadingPayment(true);
    supabase
      .from("payments" as any)
      .select("*")
      .eq("booking_id", booking.id)
      .maybeSingle()
      .then(({ data }) => {
        setPayment(data);
        setLoadingPayment(false);
      });

    supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", booking.patient_id)
      .maybeSingle()
      .then(({ data }) => setPatientName(data?.full_name || "Patient"));

    supabase
      .from("provider_profiles")
      .select("currency")
      .eq("id", booking.provider_id)
      .maybeSingle()
      .then(({ data }) => setProviderCurrency((data as any)?.currency || "USD"));

    // Fetch service name if we don't have it
    if (booking.service_name) {
      setServiceName(booking.service_name);
    } else {
      // Try to get from DB
      supabase
        .from("bookings")
        .select("service_id")
        .eq("id", booking.id)
        .maybeSingle()
        .then(({ data }) => {
          const serviceId = (data as any)?.service_id;
          if (serviceId) {
            supabase.from("services").select("name").eq("id", serviceId).maybeSingle()
              .then(({ data: svc }) => setServiceName(svc?.name || ""));
          }
        });
    }

    // Check if patient already reviewed this provider
    if (user?.id === booking.patient_id && booking.status === "completed") {
      supabase
        .from("reviews")
        .select("id")
        .eq("provider_id", booking.provider_id)
        .eq("patient_id", user.id)
        .maybeSingle()
        .then(({ data }) => setHasReviewed(!!data));
    }

    // Check if user is the provider for this booking
    supabase
      .from("provider_profiles")
      .select("id, user_id")
      .eq("id", booking.provider_id)
      .maybeSingle()
      .then(({ data }) => setIsProviderUser(data?.user_id === user?.id));

    // Check if prescription exists for this booking
    supabase
      .from("prescriptions")
      .select("id")
      .eq("booking_id", booking.id)
      .maybeSingle()
      .then(({ data }) => setExistingRxId((data as any)?.id || null));
  }, [open, booking]);

  if (!booking) return null;

  const isUpcoming = booking.booking_date >= new Date().toISOString().split("T")[0];
  const canCancel = user?.id === booking.patient_id && ["pending", "accepted"].includes(booking.status) && isUpcoming;

  const handleCancel = async () => {
    await supabase.from("bookings").update({ status: "cancelled" }).eq("id", booking.id);

    // Notify provider about cancellation
    if (booking.provider_id) {
      const { data: providerData } = await supabase
        .from("provider_profiles")
        .select("user_id")
        .eq("id", booking.provider_id)
        .single();
      if (providerData?.user_id) {
        supabase.functions.invoke("create-notification", {
          body: {
            user_id: providerData.user_id,
            title: "Booking Cancelled",
            message: `A booking on ${booking.booking_date} has been cancelled by the patient.`,
            type: "booking_cancelled",
            metadata: { booking_id: booking.id },
          },
        }).catch(console.error);
      }
    }

    onStatusUpdate?.();
    onOpenChange(false);
  };

  const handleDownloadInvoice = () => {
    if (!payment) return;
    const amt = Number(payment.amount);
    const convertedAmt = convertCurrency(amt, providerCurrency, userCurrency);
    openInvoice({
      bookingId: booking.id,
      transactionId: payment.transaction_id,
      providerName: booking.provider_name || "Provider",
      patientName,
      date: format(new Date(booking.booking_date), "PPP"),
      time: booking.booking_time,
      amount: amt,
      currency: providerCurrency,
      paymentMethod: payment.payment_method || "Card",
      paidAt: new Date(payment.created_at).toLocaleDateString(),
      convertedAmount: convertedAmt,
      convertedCurrency: userCurrency,
    });
  };

  const consultationMode = booking.consultation_mode;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Appointment Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge className={statusColors[booking.status] || ""}>{booking.status}</Badge>
          </div>

          {/* Details */}
          <div className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">
                {format(new Date(booking.booking_date), "EEEE, MMMM d, yyyy")}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">{booking.booking_time}</p>
            </div>
            <div className="flex items-center gap-3">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Provider</p>
                <p className="text-sm font-medium text-foreground">{booking.provider_name || "Provider"}</p>
              </div>
            </div>
            {/* Service info */}
            {serviceName && (
              <div className="flex items-center gap-3">
                <Stethoscope className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Service</p>
                  <p className="text-sm font-medium text-foreground">{serviceName}</p>
                </div>
              </div>
            )}
            {/* Consultation mode */}
            {consultationMode && (
              <div className="flex items-center gap-3">
                {getModeIcon(consultationMode)}
                <div>
                  <p className="text-xs text-muted-foreground">Consultation Mode</p>
                  <p className="text-sm font-medium text-foreground">{getModeLabel(consultationMode)}</p>
                </div>
              </div>
            )}
            {booking.notes && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground mb-1">Notes</p>
                <p className="text-sm text-foreground">{booking.notes}</p>
              </div>
            )}
          </div>

          {/* Payment info */}
          {payment && (
            <div className="rounded-lg border border-border p-4 space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Payment</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium text-foreground">
                  {convertAndFormat(Number(payment.amount), providerCurrency, userCurrency, { showOriginal: providerCurrency !== userCurrency })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Transaction</span>
                <span className="font-mono text-xs text-foreground">{payment.transaction_id}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-xs">
                  {payment.status}
                </Badge>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 flex-wrap">
            {/* Video Call for online accepted bookings */}
            {booking.consultation_mode === "online" && booking.status === "accepted" && isUpcoming && (
              <Button
                variant="default"
                className="flex-1"
                disabled={isInCall}
                onClick={async () => {
                  // Get the other party's name
                  const otherIsPatient = user?.id !== booking.patient_id;
                  const name = otherIsPatient ? patientName : (booking.provider_name || "Provider");
                  const otherId = otherIsPatient ? booking.patient_id : undefined;
                  if (otherId) {
                    const { data: pp } = await supabase.from("provider_profiles").select("user_id").eq("id", booking.provider_id).single();
                    startCall(otherId, name);
                  } else {
                    // Current user is patient, call provider
                    const { data: pp } = await supabase.from("provider_profiles").select("user_id").eq("id", booking.provider_id).single();
                    if (pp?.user_id) startCall(pp.user_id, booking.provider_name || "Provider", booking.provider_avatar);
                  }
                  onOpenChange(false);
                }}
              >
                <Video className="mr-2 h-4 w-4" /> Start Video Call
              </Button>
            )}
            {payment && (
              <Button variant="outline" className="flex-1" onClick={handleDownloadInvoice}>
                <Download className="mr-2 h-4 w-4" /> Invoice
              </Button>
            )}
            {/* Provider: Write or View Prescription */}
            {booking.status === "completed" && isProviderUser && !existingRxId && (
              <Button variant="default" className="flex-1" onClick={() => setRxDialogOpen(true)}>
                <ClipboardPlus className="mr-2 h-4 w-4" /> Write Prescription
              </Button>
            )}
            {existingRxId && (
              <Button variant="outline" className="flex-1" onClick={() => setRxDetailOpen(true)}>
                <Pill className="mr-2 h-4 w-4" /> View Prescription
              </Button>
            )}
            {booking.status === "completed" && user?.id === booking.patient_id && !hasReviewed && (
              <Button variant="default" className="flex-1" onClick={() => setRateDialogOpen(true)}>
                <Star className="mr-2 h-4 w-4" /> Rate Provider
              </Button>
            )}
            {booking.status === "completed" && user?.id === booking.patient_id && hasReviewed && (
              <Button variant="secondary" className="flex-1" disabled>
                <Star className="mr-2 h-4 w-4 fill-yellow-400 text-yellow-400" /> Reviewed
              </Button>
            )}
            {canCancel && (
              <Button variant="destructive" className="flex-1" onClick={handleCancel}>
                Cancel Booking
              </Button>
            )}
          </div>
        </div>

        {/* Rate Provider Dialog */}
        <RateProviderDialog
          open={rateDialogOpen}
          onOpenChange={setRateDialogOpen}
          providerId={booking.provider_id}
          providerName={booking.provider_name || "Provider"}
          bookingId={booking.id}
          onRated={() => {
            setHasReviewed(true);
            onStatusUpdate?.();
          }}
        />

        {/* Write Prescription Dialog */}
        <WritePrescriptionDialog
          open={rxDialogOpen}
          onOpenChange={setRxDialogOpen}
          bookingId={booking.id}
          providerId={booking.provider_id}
          patientId={booking.patient_id}
          patientName={patientName}
          onCreated={() => {
            // Refresh to show View Prescription button
            supabase.from("prescriptions").select("id").eq("booking_id", booking.id).maybeSingle()
              .then(({ data }) => setExistingRxId((data as any)?.id || null));
            onStatusUpdate?.();
          }}
        />

        {/* Prescription Detail Dialog */}
        <PrescriptionDetailDialog
          open={rxDetailOpen}
          onOpenChange={setRxDetailOpen}
          prescriptionId={existingRxId}
        />
      </DialogContent>
    </Dialog>
  );
};

export default BookingDetailDialog;
