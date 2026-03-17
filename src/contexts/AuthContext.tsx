import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  userRole: string | null;
  onboardingCompleted: boolean | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  userRole: null,
  onboardingCompleted: null,
  loading: true,
  signOut: async () => { },
  refreshRole: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = useCallback(async (userId: string, session: Session | null, retryCount = 0): Promise<boolean> => {
    try {
      const { data: profileData, error: profileError } = await (supabase as any)
        .from("profiles")
        .select("onboarding_completed")
        .eq("user_id", userId)
        .maybeSingle();

      if (profileError && profileError.code !== "PGRST116") {
        console.error("Error fetching profile:", profileError);
      }

      // Profile may not exist yet for new OAuth users (trigger race condition)
      // After 1 retry, auto-create the profile using session metadata
      if (!profileData) {
        if (retryCount < 1) {
          console.log(`Profile not found yet, retrying in 1s (attempt ${retryCount + 1}/2)`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          return fetchRole(userId, session, retryCount + 1);
        }

        // Auto-create profile from session user metadata
        const userMeta = session?.user?.user_metadata;
        console.log("Profile still missing after retry — auto-creating profile");
        
        const { error: insertError } = await supabase
          .from("profiles")
          .insert({
            user_id: userId,
            full_name: userMeta?.full_name || userMeta?.name || session?.user?.email || "",
            avatar_url: userMeta?.avatar_url || userMeta?.picture || null,
            onboarding_completed: false,
          });

        if (insertError) {
          // If insert fails (maybe RLS or duplicate), check one more time
          console.error("Failed to auto-create profile:", insertError);
          const { data: recheckData } = await (supabase as any)
            .from("profiles")
            .select("onboarding_completed")
            .eq("user_id", userId)
            .maybeSingle();
          
          if (!recheckData) {
            console.warn("Could not create profile — signing out");
            await supabase.auth.signOut();
            setUser(null);
            setSession(null);
            setUserRole(null);
            setOnboardingCompleted(null);
            return false;
          }
          setOnboardingCompleted(recheckData.onboarding_completed ?? false);
        } else {
          setOnboardingCompleted(false);
        }
      } else {
        setOnboardingCompleted(profileData.onboarding_completed ?? false);
      }

      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      if (roleError && roleError.code !== "PGRST116") {
        console.error("Error fetching role:", roleError);
      }

      const raw = roleData?.role ?? null;
      setUserRole(raw === "patient" ? "member" : raw);
      return true;
    } catch (err) {
      console.error("fetchRole failed:", err);
      setUserRole(null);
      setOnboardingCompleted(false);
      return true;
    }
  }, []);

  const refreshRole = useCallback(async () => {
    if (user && session) {
      await fetchRole(user.id, session);
    }
  }, [user, session, fetchRole]);

  useEffect(() => {
    let mounted = true;

    // Set up listener FIRST
    // IMPORTANT: Supabase warns against async in onAuthStateChange callbacks
    // (can cause deadlocks). Use setTimeout to defer the async work,
    // but track a loading counter to ensure `loading` stays true.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          const uid = session.user.id;
          const sess = session;
          // Defer to avoid Supabase deadlock, but keep loading true
          setTimeout(async () => {
            if (!mounted) return;
            await fetchRole(uid, sess);
            if (mounted) setLoading(false);
          }, 0);
        } else {
          setUserRole(null);
          setOnboardingCompleted(null);
          setLoading(false);
        }
      }
    );

    // Then check existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchRole(session.user.id, session);
      }
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchRole]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUserRole(null);
    setOnboardingCompleted(null);
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, userRole, onboardingCompleted, loading, signOut, refreshRole }}>
      {children}
    </AuthContext.Provider>
  );
};
