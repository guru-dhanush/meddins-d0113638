import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle, Calendar, Filter } from "lucide-react";

type OrgBooking = {
  id: string;
  booking_date: string;
  booking_time: string;
  status: string;
  notes: string | null;
  provider_id: string;
  patient_id: string;
  provider_name: string;
  patient_name: string;
};

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  accepted: "bg-secondary/20 text-secondary-foreground",
  declined: "bg-destructive/20 text-destructive",
  completed: "bg-primary/20 text-primary",
  cancelled: "bg-muted text-muted-foreground",
};

const OrgBookings = () => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<OrgBooking[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    if (!loading && (!user || userRole !== "organization")) navigate("/dashboard");
  }, [loading, user, userRole, navigate]);

  const fetchBookings = async () => {
    if (!user) return;
    setDataLoading(true);

    // For now, org bookings feature requires org_members table which isn't created yet
    // Show empty state
    setBookings([]);
    setDataLoading(false);
  };

  useEffect(() => {
    if (user && userRole === "organization") fetchBookings();
  }, [user, userRole]);

  const handleUpdateStatus = async (bookingId: string, status: "accepted" | "declined") => {
    const { error } = await supabase
      .from("bookings")
      .update({ status })
      .eq("id", bookingId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: status === "accepted" ? "Booking accepted" : "Booking declined" });
      fetchBookings();
    }
  };

  const filtered = useMemo(() => {
    return bookings.filter(b => {
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (dateFilter && b.booking_date !== dateFilter) return false;
      return true;
    });
  }, [bookings, statusFilter, dateFilter]);

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppLayout className="container mx-auto px-4 py-4">
      <h1 className="font-display text-3xl font-bold text-foreground mb-2">All Bookings</h1>
      <p className="text-muted-foreground mb-6">Manage appointments across your team</p>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative w-full sm:w-[200px]">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="pl-10" />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" /> Bookings ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>No bookings found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(b => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.patient_name}</TableCell>
                      <TableCell>{b.provider_name}</TableCell>
                      <TableCell>{new Date(b.booking_date).toLocaleDateString()}</TableCell>
                      <TableCell>{b.booking_time}</TableCell>
                      <TableCell>
                        <Badge className={`text-xs capitalize ${statusColors[b.status] || ""}`}>{b.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {b.status === "pending" ? (
                          <div className="flex gap-1">
                            <Button size="sm" variant="default" onClick={() => handleUpdateStatus(b.id, "accepted")}>
                              <CheckCircle className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(b.id, "declined")}>
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default OrgBookings;
