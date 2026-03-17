import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: ReactNode;
  className?: string;
}

const AppLayout = ({ children, className = "" }: AppLayoutProps) => {
  return (
    <div className="min-h-screen bg-muted">
      <Header />
      <main className="pt-14">
        <div className={cn("pb-20 md:pb-8", className)}>
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default AppLayout;
