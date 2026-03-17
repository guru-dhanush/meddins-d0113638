import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Search, UserMinus, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ConnectionUser {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  connection_id: string;
}

const Connections = () => {
  const { id: paramId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const profileUserId = paramId || user?.id;
  const isOwnProfile = user?.id === profileUserId;

  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState<ConnectionUser[]>([]);
  const [search, setSearch] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<string>("public");
  const [allowed, setAllowed] = useState(true);

  useEffect(() => {
    if (!profileUserId) return;
    fetchConnections();
  }, [profileUserId, user]);

  const fetchConnections = async () => {
    if (!profileUserId) return;
    setLoading(true);

    // Check visibility setting for non-own profiles
    if (!isOwnProfile && user) {
      const { data: settings } = await supabase
        .from("user_settings")
        .select("connection_visibility")
        .eq("user_id", profileUserId)
        .maybeSingle();

      const vis = (settings as any)?.connection_visibility || "public";
      setVisibility(vis);

      if (vis === "only_me") {
        setAllowed(false);
        setLoading(false);
        return;
      }

      if (vis === "connections") {
        // Check if viewer is connected
        const { data: conn } = await supabase
          .from("connections")
          .select("id")
          .eq("status", "accepted")
          .or(`and(requester_id.eq.${user.id},receiver_id.eq.${profileUserId}),and(requester_id.eq.${profileUserId},receiver_id.eq.${user.id})`)
          .maybeSingle();

        if (!conn) {
          setAllowed(false);
          setLoading(false);
          return;
        }
      }
    } else if (!isOwnProfile && !user) {
      // Check if public
      const { data: settings } = await supabase
        .from("user_settings")
        .select("connection_visibility")
        .eq("user_id", profileUserId)
        .maybeSingle();

      const vis = (settings as any)?.connection_visibility || "public";
      if (vis !== "public") {
        setAllowed(false);
        setLoading(false);
        return;
      }
    }

    setAllowed(true);

    // Fetch accepted connections
    const { data: conns } = await supabase
      .from("connections")
      .select("id, requester_id, receiver_id")
      .eq("status", "accepted")
      .or(`requester_id.eq.${profileUserId},receiver_id.eq.${profileUserId}`);

    if (!conns || conns.length === 0) {
      setConnections([]);
      setLoading(false);
      return;
    }

    // Get the other user's ID for each connection
    const otherIds = conns.map(c =>
      c.requester_id === profileUserId ? c.receiver_id : c.requester_id
    );
    const connMap = new Map(conns.map(c => [
      c.requester_id === profileUserId ? c.receiver_id : c.requester_id,
      c.id,
    ]));

    // Fetch profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url, bio")
      .in("user_id", otherIds);

    const result: ConnectionUser[] = (profiles || []).map(p => ({
      user_id: p.user_id,
      full_name: p.full_name || "User",
      avatar_url: p.avatar_url,
      bio: p.bio,
      connection_id: connMap.get(p.user_id) || "",
    }));

    setConnections(result);
    setLoading(false);
  };

  const handleRemove = async (connectionId: string) => {
    setRemoving(connectionId);
    const { error } = await supabase.from("connections").delete().eq("id", connectionId);
    if (error) {
      toast({ title: "Error", description: "Failed to remove connection", variant: "destructive" });
    } else {
      setConnections(prev => prev.filter(c => c.connection_id !== connectionId));
      toast({ title: "Connection removed" });
    }
    setRemoving(null);
  };

  const filtered = connections.filter(c =>
    c.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout className="container max-w-2xl px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">Connections</h1>
          <p className="text-sm text-muted-foreground">{connections.length} connection{connections.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !allowed ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">This user's connections are private.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {connections.length > 5 && (
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search connections..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          )}

          {filtered.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  {connections.length === 0 ? "No connections yet." : "No connections match your search."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filtered.map(conn => (
                <Card key={conn.connection_id} className="hover:bg-muted/30 transition-colors">
                  <CardContent className="py-3 flex items-center gap-3">
                    <Avatar
                      className="h-12 w-12 cursor-pointer"
                      onClick={() => navigate(`/user/${conn.user_id}`)}
                    >
                      <AvatarImage src={conn.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                        {conn.full_name?.split(" ").map(n => n[0]).join("").toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => navigate(`/user/${conn.user_id}`)}
                    >
                      <p className="font-medium text-sm text-foreground truncate">{conn.full_name}</p>
                      {conn.bio && (
                        <p className="text-xs text-muted-foreground truncate">{conn.bio}</p>
                      )}
                    </div>
                    {isOwnProfile && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleRemove(conn.connection_id)}
                        disabled={removing === conn.connection_id}
                      >
                        {removing === conn.connection_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <UserMinus className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </AppLayout>
  );
};

export default Connections;
