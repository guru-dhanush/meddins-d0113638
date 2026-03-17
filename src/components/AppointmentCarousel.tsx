import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { useCallback } from "react";

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
};

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  accepted: "bg-secondary/20 text-secondary-foreground",
  declined: "bg-destructive/20 text-destructive",
  completed: "bg-primary/20 text-primary",
  cancelled: "bg-muted text-muted-foreground",
};

interface AppointmentCarouselProps {
  bookings: Booking[];
  isProvider: boolean;
  onViewAll: () => void;
}

const AppointmentCarousel = ({ bookings, isProvider, onViewAll }: AppointmentCarouselProps) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    slidesToScroll: 1,
    containScroll: "trimSnaps",
  });

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  if (bookings.length === 0) {
    return (
      <div className="text-center py-8">
        <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">No upcoming appointments.</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={onViewAll}>
          View Calendar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex gap-4 pr-4">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="flex-[0_0_280px] min-w-0 rounded-xl border border-border bg-card p-4 shadow-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm text-foreground truncate">
                    {isProvider ? booking.patient_name : booking.provider_name}
                  </span>
                  <Badge className={`text-xs shrink-0 ${statusColors[booking.status] || ""}`}>
                    {booking.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-1">{booking.service_name}</p>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>
                    {new Date(booking.scheduled_date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    at {booking.scheduled_time}
                  </span>
                </div>
                <p className="text-sm font-semibold text-foreground mt-2">${booking.total_price}</p>
              </div>
            ))}
          </div>
        </div>

        {bookings.length > 1 && (
          <>
            <Button
              variant="outline"
              size="icon"
              className="absolute -left-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background shadow-md border-border"
              onClick={scrollPrev}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="absolute -right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background shadow-md border-border"
              onClick={scrollNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      <div className="text-center">
        <Button variant="outline" size="sm" onClick={onViewAll}>
          <Calendar className="h-4 w-4 mr-1.5" />
          View All
        </Button>
      </div>
    </div>
  );
};

export default AppointmentCarousel;
