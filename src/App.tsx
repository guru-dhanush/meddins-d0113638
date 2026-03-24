import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { VideoCallProvider } from "@/contexts/VideoCallContext";
import { AppModeProvider } from "@/contexts/AppModeContext";
import { ExplorationModeProvider } from "@/contexts/ExplorationModeContext";
import VideoCallOverlay from "@/components/video-call/VideoCallOverlay";
import IncomingCallDialog from "@/components/video-call/IncomingCallDialog";
import { Loader2 } from "lucide-react";
import Feed from "./pages/Feed";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import BrowseProviders from "./pages/BrowseProviders";
import ProviderProfile from "./pages/ProviderProfile";
import NotFound from "./pages/NotFound";
import CreatePost from "./pages/CreatePost";
import OrgDashboard from "./pages/OrgDashboard";
import OrgProfileEdit from "./pages/OrgProfileEdit";
import OrgTeam from "./pages/OrgTeam";
import OrgBookings from "./pages/OrgBookings";
import OrgProfile from "./pages/OrgProfile";
import UserProfile from "./pages/UserProfile";
import Chats from "./pages/Chats";
import UpgradeToProvider from "./pages/UpgradeToProvider";
import Invitations from "./pages/Invitations";
import AIChat from "./components/voice-chat/page";
import Communities from "./pages/Communities";
import CommunityPage from "./pages/CommunityPage";
import Notifications from "./pages/Notifications";
import NotificationSettings from "./pages/NotificationSettings";
import Settings from "./pages/Settings";
import Connections from "./pages/Connections";
import HealthRecords from "./pages/HealthRecords";

const queryClient = new QueryClient();

// ─── Onboarding guard: redirects to /onboarding if not completed ───────────
const OnboardingGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, onboardingCompleted, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not logged in — redirect to auth
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Logged in but onboarding not done — redirect to onboarding
  // (skip if already on /onboarding or /auth to avoid loops)
  if (onboardingCompleted === false && location.pathname !== "/onboarding" && location.pathname !== "/auth") {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ThemeProvider>
          <CurrencyProvider>
          <AppModeProvider>
          <AuthProvider>
            <VideoCallProvider>
            <VideoCallOverlay />
            <IncomingCallDialog />
            <Routes>
              {/* Public routes */}
              <Route path="/auth" element={<Auth />} />
              <Route path="/onboarding" element={<Onboarding />} />

              {/* Legacy redirect */}
              <Route path="/select-role" element={<Navigate to="/onboarding" replace />} />
              <Route path="/ai-agent" element={<AIChat />} />

              {/* Protected routes — require auth + onboarding */}
              <Route path="/" element={<OnboardingGuard><Feed /></OnboardingGuard>} />
              <Route path="/feed" element={<OnboardingGuard><Feed /></OnboardingGuard>} />
              <Route path="/dashboard" element={<OnboardingGuard><Dashboard /></OnboardingGuard>} />
              <Route path="/providers" element={<OnboardingGuard><BrowseProviders /></OnboardingGuard>} />
              <Route path="/provider/:id" element={<OnboardingGuard><ProviderProfile /></OnboardingGuard>} />
              <Route path="/profile" element={<OnboardingGuard><UserProfile /></OnboardingGuard>} />
              <Route path="/post" element={<OnboardingGuard><CreatePost /></OnboardingGuard>} />
              <Route path="/user/:id" element={<OnboardingGuard><UserProfile /></OnboardingGuard>} />
              <Route path="/messages" element={<OnboardingGuard><Chats /></OnboardingGuard>} />
              <Route path="/upgrade-to-provider" element={<OnboardingGuard><UpgradeToProvider /></OnboardingGuard>} />
              <Route path="/invitations" element={<OnboardingGuard><Invitations /></OnboardingGuard>} />
              <Route path="/ai-chat" element={<OnboardingGuard><Chats /></OnboardingGuard>} />
              <Route path="/communities" element={<OnboardingGuard><Communities /></OnboardingGuard>} />
              <Route path="/community/:slug" element={<OnboardingGuard><CommunityPage /></OnboardingGuard>} />
              <Route path="/notifications" element={<OnboardingGuard><Notifications /></OnboardingGuard>} />
              <Route path="/notification-settings" element={<OnboardingGuard><NotificationSettings /></OnboardingGuard>} />
              <Route path="/settings" element={<OnboardingGuard><Settings /></OnboardingGuard>} />
              <Route path="/connections" element={<OnboardingGuard><Connections /></OnboardingGuard>} />
              <Route path="/connections/:id" element={<OnboardingGuard><Connections /></OnboardingGuard>} />
              <Route path="/health-records" element={<OnboardingGuard><HealthRecords /></OnboardingGuard>} />

              {/* Org routes */}
              <Route path="/org/dashboard" element={<OnboardingGuard><OrgDashboard /></OnboardingGuard>} />
              <Route path="/org/profile/edit" element={<OnboardingGuard><OrgProfileEdit /></OnboardingGuard>} />
              <Route path="/org/team" element={<OnboardingGuard><OrgTeam /></OnboardingGuard>} />
              <Route path="/org/bookings" element={<OnboardingGuard><OrgBookings /></OnboardingGuard>} />
              <Route path="/org/:id" element={<OnboardingGuard><OrgProfile /></OnboardingGuard>} />

              {/* Provider profile edit redirect */}
              <Route path="/provider-profile/edit" element={<Navigate to="/profile" replace />} />

              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </VideoCallProvider>
          </AuthProvider>
          </AppModeProvider>
          </CurrencyProvider>
        </ThemeProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
