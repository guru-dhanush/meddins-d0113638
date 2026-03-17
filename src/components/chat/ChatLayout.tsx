import React from "react";
import { cn } from "@/lib/utils";

interface ChatLayoutProps {
    sidebarContent: React.ReactNode;
    mainContent: React.ReactNode;
    showSidebarOnMobile: boolean;
    className?: string;
}

/**
 * Chat layout.
 * On mobile: fullscreen overlay (fixed inset-0, no header/bottom nav).
 * On desktop (lg+): inline within AppLayout, normal page flow.
 */
const ChatLayout = ({
    sidebarContent,
    mainContent,
    showSidebarOnMobile,
    className
}: ChatLayoutProps) => {
    return (
        <div className={cn(
            "bg-background flex",
            // Mobile: fixed fullscreen overlay
            "fixed inset-0 z-50",
            // Desktop: inline, fill available height
            "lg:static lg:z-auto lg:h-[calc(100vh-4rem)]",
            className
        )}>
            {/* Sidebar Area */}
            <div className={cn(
                "flex-shrink-0 flex flex-col border-r border-border bg-card",
                "w-full lg:w-[320px] xl:w-[360px]",
                showSidebarOnMobile ? "flex" : "hidden lg:flex"
            )}>
                {sidebarContent}
            </div>

            {/* Main Chat Area */}
            <div className={cn(
                "flex-1 flex flex-col min-w-0",
                showSidebarOnMobile ? "hidden lg:flex" : "flex"
            )}>
                {mainContent}
            </div>
        </div>
    );
};

export default ChatLayout;
