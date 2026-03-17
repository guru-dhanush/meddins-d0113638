import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Calendar, Loader2, Clock, CheckCircle, XCircle,
  List, ChevronLeft, ChevronRight, MoreHorizontal, Search,
  CalendarDays, Users, TrendingUp, DollarSign, Eye, Monitor, Building2, Home
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/contexts/CurrencyContext";
import { formatPrice } from "@/lib/currency";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import BookingDetailDialog from "@/components/BookingDetailDialog";
import AvailabilityEditor from "@/components/availability/AvailabilityEditor";
import ServiceManager from "@/components/services/ServiceManager";
import ProviderPrescriptionHistory from "@/components/prescription/ProviderPrescriptionHistory";

type Booking = {
  id: string;
  booking_date: string;
  booking_time: string;
  status: string;
  notes: string | null;
  provider_id: string;
  patient_id: string;
  created_at: string;
  provider_name?: string;
  patient_name?: string;
  patient_avatar?: string | null;
  provider_avatar?: string | null;
  service_name?: string;
  consultation_mode?: string;
};

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  accepted: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  declined: "bg-destructive/10 text-destructive",
  completed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  cancelled: "bg-muted text-muted-foreground",
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const Dashboard = () => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userCurrency } = useCurrency();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"table" | "calendar">("table");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [totalSpent, setTotalSpent] = useState(0);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [providerProfileId, setProviderProfileId] = useState<string | null>(null);
  const [providerCurrency, setProviderCurrency] = useState("USD");

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [loading, user, navigate]);

  const fetchBookings = async () => {
    if (!user) return;
    setBookingsLoading(true);

    const allBookings: Booking[] = [];
    const seenIds = new Set<string>();

    // Patient bookings
    const { data: patientData } = await supabase
      .from("bookings").select("*").eq("patient_id", user.id).order("booking_date", { ascending: true });

    if (patientData?.length) {
      const providerIds = [...new Set(patientData.map(b => b.provider_id))];
      const { data: pps } = await supabase.from("provider_profiles").select("id, user_id").in("id", providerIds);
      const ppMap = new Map(pps?.map(p => [p.id, p.user_id]) || []);
      const ppUserIds = pps?.map(p => p.user_id) || [];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", ppUserIds);
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Fetch service names for bookings that have service_id
      const serviceIds = [...new Set(patientData.filter(b => (b as any).service_id).map(b => (b as any).service_id))];
      let serviceMap = new Map<string, string>();
      if (serviceIds.length) {
        const { data: servicesData } = await supabase.from("services").select("id, name").in("id", serviceIds);
        serviceMap = new Map(servicesData?.map(s => [s.id, s.name]) || []);
      }

      patientData.forEach(b => {
        if (seenIds.has(b.id)) return;
        seenIds.add(b.id);
        const provUserId = ppMap.get(b.provider_id) || "";
        allBookings.push({
          ...b,
          provider_name: profileMap.get(provUserId)?.full_name || "Provider",
          provider_avatar: profileMap.get(provUserId)?.avatar_url || null,
          service_name: (b as any).service_id ? serviceMap.get((b as any).service_id) : undefined,
          consultation_mode: (b as any).consultation_mode || undefined,
        });
      });
    }

    // Provider bookings
    const { data: pp } = await supabase.from("provider_profiles").select("id, currency").eq("user_id", user.id).maybeSingle();
    if (pp) {
      setProviderProfileId(pp.id);
      setProviderCurrency((pp as any).currency || "USD");
      const { data: provData } = await supabase.from("bookings").select("*").eq("provider_id", pp.id).order("booking_date", { ascending: true });
      if (provData?.length) {
        const patientIds = [...new Set(provData.filter(b => !seenIds.has(b.id)).map(b => b.patient_id))];

        // Fetch service names
        const serviceIds = [...new Set(provData.filter(b => (b as any).service_id).map(b => (b as any).service_id))];
        let serviceMap = new Map<string, string>();
        if (serviceIds.length) {
          const { data: servicesData } = await supabase.from("services").select("id, name").in("id", serviceIds);
          serviceMap = new Map(servicesData?.map(s => [s.id, s.name]) || []);
        }

        if (patientIds.length) {
          const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", patientIds);
          const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
          provData.forEach(b => {
            if (seenIds.has(b.id)) return;
            seenIds.add(b.id);
            allBookings.push({
              ...b,
              patient_name: profileMap.get(b.patient_id)?.full_name || "Patient",
              patient_avatar: profileMap.get(b.patient_id)?.avatar_url || null,
              service_name: (b as any).service_id ? serviceMap.get((b as any).service_id) : undefined,
              consultation_mode: (b as any).consultation_mode || undefined,
            });
          });
        }
      }
    }

    setBookings(allBookings);
    setBookingsLoading(false);

    // Fetch total spent for patient
    const { data: payments } = await supabase.from("payments" as any).select("amount").eq("user_id", user.id);
    if (payments) {
      setTotalSpent((payments as any[]).reduce((sum: number, p: any) => sum + Number(p.amount), 0));
    }
  };

  useEffect(() => {
    if (!loading && user) fetchBookings();
  }, [loading, user]);

  const handleUpdateStatus = async (bookingId: string, status: "accepted" | "declined" | "completed") => {
    const { error } = await supabase.from("bookings").update({ status }).eq("id", bookingId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: status === "accepted" ? "Booking accepted" : status === "completed" ? "Booking completed" : "Booking declined" });
      fetchBookings();

      // Send notification to patient
      const booking = bookings.find((b) => b.id === bookingId);
      if (booking) {
        const typeMap: Record<string, string> = { accepted: "booking_confirmed", declined: "booking_cancelled", completed: "booking_confirmed" };
        const titleMap: Record<string, string> = { accepted: "Booking Confirmed", declined: "Booking Declined", completed: "Booking Completed" };
        const msgMap: Record<string, string> = {
          accepted: `Your booking on ${booking.booking_date} has been confirmed.`,
          declined: `Your booking on ${booking.booking_date} has been declined.`,
          completed: `Your booking on ${booking.booking_date} has been completed.`,
        };
        supabase.functions.invoke("create-notification", {
          body: {
            user_id: booking.patient_id,
            title: titleMap[status],
            message: msgMap[status],
            type: typeMap[status],
            metadata: { booking_id: bookingId },
          },
        }).catch(console.error);
      }
    }
  };

  const filteredBookings = useMemo(() => {
    let filtered = bookings;
    if (statusFilter !== "all") filtered = filtered.filter(b => b.status === statusFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(b =>
        (b.patient_name?.toLowerCase().includes(q)) ||
        (b.provider_name?.toLowerCase().includes(q)) ||
        b.booking_date.includes(q)
      );
    }
    return filtered;
  }, [bookings, statusFilter, searchQuery]);

  const calendarYear = calendarDate.getFullYear();
  const calendarMonth = calendarDate.getMonth();
  const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();

  const bookingsByDate = useMemo(() => {
    const map = new Map<string, Booking[]>();
    filteredBookings.forEach(b => {
      const existing = map.get(b.booking_date) || [];
      existing.push(b);
      map.set(b.booking_date, existing);
    });
    return map;
  }, [filteredBookings]);

  const prevMonth = () => setCalendarDate(new Date(calendarYear, calendarMonth - 1, 1));
  const nextMonth = () => setCalendarDate(new Date(calendarYear, calendarMonth + 1, 1));

  const today = new Date().toISOString().split("T")[0];

  // Next upcoming appointment for patient
  const nextAppointment = useMemo(() => {
    return bookings
      .filter(b => b.booking_date >= today && ["pending", "accepted"].includes(b.status))
      .sort((a, b) => a.booking_date.localeCompare(b.booking_date) || a.booking_time.localeCompare(b.booking_time))[0] || null;
  }, [bookings, today]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const isProvider = userRole === "provider";
  const pending = bookings.filter(b => b.status === "pending");
  const todayBookings = bookings.filter(b => b.booking_date === today && !["declined", "cancelled"].includes(b.status));
  const totalUpcoming = bookings.filter(b => b.booking_date >= today && !["declined", "cancelled"].includes(b.status));
  const completedCount = bookings.filter(b => b.status === "completed").length;

  const openDetail = (booking: Booking) => {
    setSelectedBooking(booking);
    setDetailOpen(true);
  };

  // ─── Stats cards ───
  const StatsRow = () => (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      <Card className="bg-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">{isProvider ? "Today" : "Upcoming"}</p>
              <p className="text-2xl font-bold text-foreground">{isProvider ? todayBookings.length : totalUpcoming.length}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Pending</p>
              <p className="text-2xl font-bold text-foreground">{pending.length}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Completed</p>
              <p className="text-2xl font-bold text-foreground">{completedCount}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">{isProvider ? "Total" : "Total Spent"}</p>
              <p className="text-2xl font-bold text-foreground">
                {isProvider ? bookings.length : totalSpent > 0 ? formatPrice(totalSpent, userCurrency, { decimals: 0 }) : formatPrice(0, userCurrency, { decimals: 0 })}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              {isProvider ? <Users className="h-5 w-5 text-blue-500" /> : <DollarSign className="h-5 w-5 text-blue-500" />}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // ─── Next Appointment Card (patient only) ───
  const NextAppointmentCard = () => {
    if (!nextAppointment || isProvider) return null;
    return (
      <Card className="mb-6 border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={nextAppointment.provider_avatar || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {nextAppointment.provider_name?.[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold text-foreground">Next Appointment</p>
                <p className="text-xs text-muted-foreground">
                  {nextAppointment.provider_name} · {new Date(nextAppointment.booking_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} at {nextAppointment.booking_time}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={statusColors[nextAppointment.status] || ""}>{nextAppointment.status}</Badge>
              <Button variant="outline" size="sm" className="h-8" onClick={() => openDetail(nextAppointment)}>
                <Eye className="h-3.5 w-3.5 mr-1" /> View
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // ─── Table view ───
  const TableView = () => (
    <div className="overflow-x-auto">
      <div className="hidden md:grid grid-cols-[1fr_2fr_1.5fr_1.5fr_1fr_80px] gap-4 px-4 py-3 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wider">
        <span>ID</span>
        <span>{isProvider ? "Patient" : "Provider"}</span>
        <span>Date</span>
        <span>Time</span>
        <span>Status</span>
        <span></span>
      </div>

      {filteredBookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
          <Calendar className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No appointments found</p>
        </div>
      ) : (
        filteredBookings.map((booking) => (
          <div
            key={booking.id}
            className="grid grid-cols-1 md:grid-cols-[1fr_2fr_1.5fr_1.5fr_1fr_80px] gap-2 md:gap-4 px-4 py-3 items-center border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
            onClick={() => openDetail(booking)}
          >
            <span className="text-xs text-muted-foreground font-mono hidden md:block">#{booking.id.slice(0, 6)}</span>
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={(isProvider ? booking.patient_avatar : booking.provider_avatar) || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {(isProvider ? booking.patient_name : booking.provider_name)?.[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {isProvider ? booking.patient_name : booking.provider_name}
                </p>
                {booking.service_name && (
                  <p className="text-[10px] text-muted-foreground truncate">{booking.service_name}</p>
                )}
                <p className="text-[10px] text-muted-foreground md:hidden">
                  {new Date(booking.booking_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {booking.booking_time}
                  {booking.consultation_mode && ` · ${booking.consultation_mode.replace("_", " ")}`}
                </p>
              </div>
            </div>
            <span className="text-sm text-foreground hidden md:block">
              {new Date(booking.booking_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
            </span>
            <span className="text-sm text-foreground hidden md:block">{booking.booking_time}</span>
            <div className="hidden md:block">
              <Badge className={`text-xs font-medium ${statusColors[booking.status] || ""}`}>{booking.status}</Badge>
            </div>

            {/* Mobile status */}
            <div className="flex items-center justify-between md:hidden mt-1">
              <Badge className={`text-xs font-medium ${statusColors[booking.status] || ""}`}>{booking.status}</Badge>
            </div>

            {/* Actions */}
            <div className="hidden md:flex justify-end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openDetail(booking)}>
                    <Eye className="h-4 w-4 mr-2" /> View Details
                  </DropdownMenuItem>
                  {isProvider && booking.status === "pending" && (
                    <>
                      <DropdownMenuItem onClick={() => handleUpdateStatus(booking.id, "accepted")}>
                        <CheckCircle className="h-4 w-4 mr-2 text-primary" /> Accept
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleUpdateStatus(booking.id, "declined")}>
                        <XCircle className="h-4 w-4 mr-2 text-destructive" /> Decline
                      </DropdownMenuItem>
                    </>
                  )}
                  {isProvider && booking.status === "accepted" && (
                    <DropdownMenuItem onClick={() => handleUpdateStatus(booking.id, "completed")}>
                      <CheckCircle className="h-4 w-4 mr-2" /> Mark Complete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))
      )}
    </div>
  );

  // ─── Calendar view ───
  const CalendarView = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
          <h3 className="font-semibold text-foreground">{MONTHS[calendarMonth]} {calendarYear}</h3>
          <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAYS.map(d => (
            <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} className="aspect-square" />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayBookings = bookingsByDate.get(dateStr) || [];
            const isToday = dateStr === todayStr;
            return (
              <div
                key={day}
                className={`aspect-square rounded-lg border p-1 text-xs flex flex-col transition-colors cursor-default ${isToday ? "border-primary bg-primary/5" : dayBookings.length > 0 ? "border-border bg-card hover:bg-muted/30" : "border-transparent"}`}
              >
                <span className={`font-medium text-[10px] ${isToday ? "text-primary" : "text-foreground"}`}>{day}</span>
                {dayBookings.length > 0 && (
                  <div className="flex-1 flex flex-col gap-0.5 mt-0.5 overflow-hidden">
                    {dayBookings.slice(0, 2).map(b => (
                      <div key={b.id} className={`rounded px-1 py-0.5 text-[8px] leading-tight truncate font-medium cursor-pointer ${statusColors[b.status] || "bg-muted text-muted-foreground"}`} onClick={() => openDetail(b)}>
                        {b.booking_time}
                      </div>
                    ))}
                    {dayBookings.length > 2 && <span className="text-[8px] text-muted-foreground">+{dayBookings.length - 2} more</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <AppLayout className="container max-w-6xl mx-auto px-2 py-2 md:px-4 md:py-4">
      <StatsRow />
      <NextAppointmentCard />

      {/* Health Records quick access */}
      {!isProvider && (
        <Card className="mb-6 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/health-records")}>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-lg">📋</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Health Records</p>
                <p className="text-xs text-muted-foreground">Upload & manage your medical documents</p>
              </div>
            </div>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>
      )}

      {/* Provider management sections */}
      {isProvider && providerProfileId && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <AvailabilityEditor providerId={providerProfileId} />
          <ServiceManager providerId={providerProfileId} providerCurrency={providerCurrency} />
        </div>
      )}

      {/* Provider prescription history */}
      {isProvider && providerProfileId && (
        <div className="mb-6">
          <ProviderPrescriptionHistory providerId={providerProfileId} />
        </div>
      )}

      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{isProvider ? "All Appointments" : "My Appointments"}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {filteredBookings.length} {filteredBookings.length === 1 ? "appointment" : "appointments"}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 h-8 w-36 text-xs" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center border border-border rounded-md overflow-hidden">
              <button onClick={() => setViewMode("table")} className={`p-1.5 transition-colors ${viewMode === "table" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}>
                <List className="h-4 w-4" />
              </button>
              <button onClick={() => setViewMode("calendar")} className={`p-1.5 transition-colors ${viewMode === "calendar" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}>
                <CalendarDays className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {bookingsLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : viewMode === "table" ? <TableView /> : <CalendarView />}
      </Card>

      <BookingDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        booking={selectedBooking}
        onStatusUpdate={fetchBookings}
      />
    </AppLayout>
  );
};

export default Dashboard;
