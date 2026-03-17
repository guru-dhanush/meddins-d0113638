import React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ChatToggleProps {
    mode: "direct" | "ai";
    onChange: (mode: "direct" | "ai") => void;
}

const ChatToggle = ({ mode, onChange }: ChatToggleProps) => {
    return (
        <div className="">
            <Tabs
                value={mode}
                onValueChange={(value) => onChange(value as "direct" | "ai")}
                className="w-full"
            >
                <TabsList className="w-full h-9 p-1">
                    <TabsTrigger value="direct" className="flex-1 text-xs font-semibold">
                        Messages
                    </TabsTrigger>
                    <TabsTrigger value="ai" className="flex-1 text-xs font-semibold">
                        Med AI
                    </TabsTrigger>
                </TabsList>
            </Tabs>
        </div>
    );
};

export default ChatToggle;
