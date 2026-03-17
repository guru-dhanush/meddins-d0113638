import { useState, useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle, XCircle, Clock, Monitor, Building2, Home } from "lucide-react";
import { format, parseISO, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";

type Booking = {
  id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  total_price: number;
  health_concern: string | null;
  provider_name?: string;
  patient_name?: string;
  service_name?: string;
  consultation_mode?: string;
};

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  accepted: "bg-secondary/20 text-secondary-foreground",
  declined: "bg-destructive/20 text-destructive",
  completed: "bg-primary/20 text-primary",
  cancelled: "bg-muted text-muted-foreground",
};

const modeIcons: Record<string, typeof Monitor> = {
  online: Monitor,
  in_clinic: Building2,
  home_visit: Home,
};

interface AppointmentCalendarProps {
  bookings: Booking[];
  isProvider: boolean;
  onBack: () => void;
  onUpdateStatus?: (bookingId: string, status: "accepted" | "declined") => void;
}

const AppointmentCalendar = ({ bookings, isProvider, onBack, onUpdateStatus }: AppointmentCalendarProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [dialogOpen, setDialogOpen] = useState(false);

  const bookedDates = useMemo(() => {
    const dates = new Map<string, Booking[]>();
    bookings.forEach((b) => {
      const key = b.scheduled_date;
      if (!dates.has(key)) dates.set(key, []);
      dates.get(key)!.push(b);
    });
    return dates;
  }, [bookings]);

  const datesWithBookings = useMemo(
    () => Array.from(bookedDates.keys()).map((d) => parseISO(d)),
    [bookedDates]
  );

  const handleDateClick = (date: Date | undefined) => {
    if (!date) return;
    const key = format(date, "yyyy-MM-dd");
    if (bookedDates.has(key)) {
      setSelectedDate(date);
      setDialogOpen(true);
    }
  };

  const selectedDateBookings = useMemo(() => {
    if (!selectedDate) return [];
    const key = format(selectedDate, "yyyy-MM-dd");
    const list = bookedDates.get(key) || [];
    return [...list].sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time));
  }, [selectedDate, bookedDates]);

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground">
        <ArrowLeft className="h-4 w-4 mr-1.5" />
        Back to Carousel
      </Button>

      <div className="flex justify-center">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateClick}
          className={cn("p-3 pointer-events-auto")}
          modifiers={{ booked: datesWithBookings }}
          modifiersStyles={{
            booked: {
              fontWeight: "bold",
              position: "relative",
            },
          }}
          components={{
            DayContent: ({ date }) => {
              const key = format(date, "yyyy-MM-dd");
              const count = bookedDates.get(key)?.length || 0;
              return (
                <div className="relative flex flex-col items-center">
                  <span>{date.getDate()}</span>
                  {count > 0 && (
                    <div className="flex gap-0.5 mt-0.5">
                      {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                        <span
                          key={i}
                          className="block h-1 w-1 rounded-full bg-primary"
                        />
                      ))}
                      {count > 3 && (
                        <span className="text-[8px] leading-none text-primary font-bold">+</span>
                      )}
                    </div>
                  )}
                </div>
              );
            },
          }}
        />
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground justify-center">
        <div className="flex items-center gap-1">
          <span className="block h-1.5 w-1.5 rounded-full bg-primary" />
          <span>= 1 appointment</span>
        </div>
        <div className="flex items-center gap-0.5">
          <span className="block h-1.5 w-1.5 rounded-full bg-primary" />
          <span className="block h-1.5 w-1.5 rounded-full bg-primary" />
          <span className="ml-0.5">= 2+</span>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedDate ? format(selectedDate, "MMMM d, yyyy") : "Appointments"}
              {selectedDateBookings.length > 1 && (
                <Badge variant="secondary" className="text-xs">
                  {selectedDateBookings.length} appointments
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedDateBookings.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">No appointments on this date.</p>
          ) : (
            <div className="space-y-3">
              {selectedDateBookings.map((booking, idx) => {
                const ModeIcon = modeIcons[booking.consultation_mode || ""] || Clock;
                return (
                  <div key={booking.id} className="border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm text-foreground">
                        {isProvider ? booking.patient_name : booking.provider_name}
                      </span>
                      <Badge className={`text-xs ${statusColors[booking.status] || ""}`}>
                        {booking.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{booking.service_name}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{booking.scheduled_time}</span>
                      </div>
                      {booking.consultation_mode && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <ModeIcon className="h-3 w-3" />
                          <span className="capitalize">{booking.consultation_mode.replace("_", " ")}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-foreground mt-1">${booking.total_price}</p>
                    {booking.health_concern && (
                      <p className="text-xs text-muted-foreground mt-1">Concern: {booking.health_concern}</p>
                    )}

                    {isProvider && booking.status === "pending" && onUpdateStatus && (
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" variant="default" onClick={() => onUpdateStatus(booking.id, "accepted")}>
                          <CheckCircle className="h-4 w-4 mr-1" /> Accept
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => onUpdateStatus(booking.id, "declined")}>
                          <XCircle className="h-4 w-4 mr-1" /> Decline
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AppointmentCalendar;
