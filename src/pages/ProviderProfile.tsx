import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

// Redirect /provider/:id to /user/:userId for unified profile
const ProviderProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const resolve = async () => {
      const { data } = await supabase.from("provider_profiles").select("user_id").eq("id", id).single();
      if (data) {
        navigate(`/user/${data.user_id}`, { replace: true });
      } else {
        navigate("/providers", { replace: true });
      }
      setLoading(false);
    };
    resolve();
  }, [id, navigate]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  return null;
};

export default ProviderProfile;
