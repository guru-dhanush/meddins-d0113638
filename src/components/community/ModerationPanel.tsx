import { useState, useEffect, useCallback } from "react";
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, MoreHorizontal, Shield, ShieldOff, Ban, UserCheck, Loader2, UserX, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ModerationPanelProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    communityId: string;
    communityName: string;
    currentUserRole: string | null;
}

interface MemberRow {
    id: string;
    user_id: string;
    role: string;
    status: string;
    joined_at: string;
    full_name: string;
    avatar_url: string | null;
}

interface ReportRow {
    id: string;
    reporter_id: string;
    post_id: string | null;
    reason: string;
    description: string | null;
    status: string;
    created_at: string;
    reporter_name?: string;
}

const ModerationPanel = ({ open, onOpenChange, communityId, communityName, currentUserRole }: ModerationPanelProps) => {
    const { toast } = useToast();
    const [members, setMembers] = useState<MemberRow[]>([]);
    const [pendingMembers, setPendingMembers] = useState<MemberRow[]>([]);
    const [reports, setReports] = useState<ReportRow[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Confirmation dialog state
    const [confirmDialog, setConfirmDialog] = useState<{
        open: boolean;
        title: string;
        description: string;
        action: () => Promise<void>;
        variant?: "destructive" | "default";
    }>({ open: false, title: "", description: "", action: async () => { } });

    const isCreator = currentUserRole === "creator";

    const fetchData = useCallback(async () => {
        setLoading(true);

        const { data: membersData } = await (supabase as any)
            .from("community_members")
            .select("id, user_id, role, status, joined_at")
            .eq("community_id", communityId)
            .order("joined_at", { ascending: true });

        if (membersData) {
            const userIds = membersData.map((m: any) => m.user_id);
            const { data: profiles } = await supabase
                .from("profiles")
                .select("user_id, full_name, avatar_url")
                .in("user_id", userIds);

            const profileMap = new Map(profiles?.map(p => [p.user_id, p]));

            const enriched: MemberRow[] = membersData.map((m: any) => ({
                ...m,
                full_name: profileMap.get(m.user_id)?.full_name || "Unknown",
                avatar_url: profileMap.get(m.user_id)?.avatar_url || null,
            }));

            setMembers(enriched.filter(m => m.status === "active"));
            setPendingMembers(enriched.filter(m => m.status === "pending"));
        }

        const { data: reportsData } = await (supabase as any)
            .from("community_reports")
            .select("*")
            .eq("community_id", communityId)
            .eq("status", "pending")
            .order("created_at", { ascending: false });

        if (reportsData) {
            const reporterIds = [...new Set(reportsData.map((r: any) => r.reporter_id))] as string[];
            const { data: reporterProfiles } = await supabase
                .from("profiles")
                .select("user_id, full_name")
                .in("user_id", reporterIds);

            const nameMap = new Map(reporterProfiles?.map(p => [p.user_id, p.full_name || "Unknown"]));
            setReports(reportsData.map((r: any) => ({ ...r, reporter_name: nameMap.get(r.reporter_id) })));
        }

        setLoading(false);
    }, [communityId]);

    useEffect(() => {
        if (open) fetchData();
    }, [open, fetchData]);

    const executeAction = async (memberId: string, action: "promote" | "demote" | "ban" | "unban" | "kick") => {
        setActionLoading(memberId);
        try {
            if (action === "kick") {
                await (supabase as any).from("community_members").delete().eq("id", memberId);
            } else if (action === "ban") {
                await (supabase as any).from("community_members").update({ status: "banned" }).eq("id", memberId);
            } else if (action === "unban") {
                await (supabase as any).from("community_members").update({ status: "active" }).eq("id", memberId);
            } else if (action === "promote") {
                await (supabase as any).from("community_members").update({ role: "moderator" }).eq("id", memberId);
            } else if (action === "demote") {
                await (supabase as any).from("community_members").update({ role: "member" }).eq("id", memberId);
            }
            toast({ title: `Action completed ✓` });
            fetchData();
        } catch (err: any) {
            toast({ title: "Action failed", description: err.message, variant: "destructive" });
        } finally {
            setActionLoading(null);
        }
    };

    const handleAction = (memberId: string, memberName: string, action: "promote" | "demote" | "ban" | "unban" | "kick") => {
        const configs: Record<string, { title: string; description: string; variant?: "destructive" | "default" }> = {
            promote: { title: `Promote ${memberName}?`, description: "They will be able to manage members, pin posts, and review reports." },
            demote: { title: `Demote ${memberName}?`, description: "They will lose moderator privileges." },
            ban: { title: `Ban ${memberName}?`, description: "They will be unable to view or participate in this community.", variant: "destructive" },
            unban: { title: `Unban ${memberName}?`, description: "They will regain access to the community." },
            kick: { title: `Remove ${memberName}?`, description: "They will be removed from the community but can rejoin.", variant: "destructive" },
        };
        const config = configs[action];
        setConfirmDialog({
            open: true,
            title: config.title,
            description: config.description,
            variant: config.variant,
            action: () => executeAction(memberId, action),
        });
    };

    const handlePendingAction = async (memberId: string, approve: boolean) => {
        setActionLoading(memberId);
        try {
            if (approve) {
                await (supabase as any).from("community_members").update({ status: "active" }).eq("id", memberId);
                toast({ title: "Member approved ✓" });
            } else {
                await (supabase as any).from("community_members").delete().eq("id", memberId);
                toast({ title: "Request rejected" });
            }
            fetchData();
        } catch (err: any) {
            toast({ title: "Failed", description: err.message, variant: "destructive" });
        } finally {
            setActionLoading(null);
        }
    };

    const handleReportAction = async (reportId: string, action: "resolved" | "dismissed") => {
        setActionLoading(reportId);
        try {
            await (supabase as any)
                .from("community_reports")
                .update({ status: action, resolved_at: new Date().toISOString() })
                .eq("id", reportId);
            toast({ title: action === "resolved" ? "Report resolved" : "Report dismissed" });
            fetchData();
        } catch (err: any) {
            toast({ title: "Failed", description: err.message, variant: "destructive" });
        } finally {
            setActionLoading(null);
        }
    };

    const filteredMembers = members.filter(m =>
        m.full_name.toLowerCase().includes(search.toLowerCase())
    );

    const ROLE_BADGE: Record<string, string> = {
        creator: "bg-amber-500/10 text-amber-600 border-amber-500/20",
        moderator: "bg-primary/10 text-primary border-primary/20",
        member: "bg-muted text-muted-foreground border-border",
    };

    return (
        <>
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent className="sm:max-w-lg overflow-y-auto">
                    <SheetHeader className="pb-4">
                        <SheetTitle className="text-xl font-bold">Moderation</SheetTitle>
                        <SheetDescription>Manage h/{communityName}</SheetDescription>
                    </SheetHeader>

                    <Tabs defaultValue="members" className="w-full">
                        <TabsList className="w-full grid grid-cols-3 mb-4">
                            <TabsTrigger value="members">Members ({members.length})</TabsTrigger>
                            <TabsTrigger value="pending">
                                Pending {pendingMembers.length > 0 && <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-[10px] justify-center">{pendingMembers.length}</Badge>}
                            </TabsTrigger>
                            <TabsTrigger value="reports">
                                Reports {reports.length > 0 && <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-[10px] justify-center">{reports.length}</Badge>}
                            </TabsTrigger>
                        </TabsList>

                        {/* ── Members Tab ── */}
                        <TabsContent value="members">
                            <div className="relative mb-3">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Search members..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-10" />
                            </div>

                            {loading ? (
                                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                            ) : (
                                <div className="space-y-1">
                                    {filteredMembers.map(member => (
                                        <div key={member.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors">
                                            <Avatar className="h-9 w-9">
                                                <AvatarImage src={member.avatar_url || undefined} />
                                                <AvatarFallback className="text-xs">{member.full_name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-foreground truncate">{member.full_name}</p>
                                                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${ROLE_BADGE[member.role] || ROLE_BADGE.member}`}>
                                                    {member.role}
                                                </Badge>
                                            </div>
                                            {member.role !== "creator" && isCreator && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={actionLoading === member.id}>
                                                            {actionLoading === member.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        {member.role === "member" && (
                                                            <DropdownMenuItem onClick={() => handleAction(member.id, member.full_name, "promote")}>
                                                                <Shield className="h-4 w-4 mr-2" /> Make Moderator
                                                            </DropdownMenuItem>
                                                        )}
                                                        {member.role === "moderator" && (
                                                            <DropdownMenuItem onClick={() => handleAction(member.id, member.full_name, "demote")}>
                                                                <ShieldOff className="h-4 w-4 mr-2" /> Remove Moderator
                                                            </DropdownMenuItem>
                                                        )}
                                                        {member.status === "active" && (
                                                            <DropdownMenuItem onClick={() => handleAction(member.id, member.full_name, "ban")} className="text-destructive">
                                                                <Ban className="h-4 w-4 mr-2" /> Ban User
                                                            </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuItem onClick={() => handleAction(member.id, member.full_name, "kick")} className="text-destructive">
                                                            <UserX className="h-4 w-4 mr-2" /> Remove
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </div>
                                    ))}
                                    {filteredMembers.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No members found</p>}
                                </div>
                            )}
                        </TabsContent>

                        {/* ── Pending Tab ── */}
                        <TabsContent value="pending">
                            {pendingMembers.length === 0 ? (
                                <div className="text-center py-10">
                                    <UserCheck className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                                    <p className="text-sm text-muted-foreground">No pending requests</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {pendingMembers.map(member => (
                                        <div key={member.id} className="flex items-center gap-3 p-3 rounded-xl border-2 border-border">
                                            <Avatar className="h-9 w-9">
                                                <AvatarImage src={member.avatar_url || undefined} />
                                                <AvatarFallback className="text-xs">{member.full_name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{member.full_name}</p>
                                                <p className="text-xs text-muted-foreground">{new Date(member.joined_at).toLocaleDateString()}</p>
                                            </div>
                                            <div className="flex gap-1">
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600 hover:bg-emerald-500/10"
                                                    onClick={() => handlePendingAction(member.id, true)} disabled={actionLoading === member.id}>
                                                    <Check className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                                    onClick={() => handlePendingAction(member.id, false)} disabled={actionLoading === member.id}>
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </TabsContent>

                        {/* ── Reports Tab ── */}
                        <TabsContent value="reports">
                            {reports.length === 0 ? (
                                <div className="text-center py-10">
                                    <Shield className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                                    <p className="text-sm text-muted-foreground">No pending reports</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {reports.map(report => (
                                        <div key={report.id} className="p-4 rounded-xl border-2 border-border space-y-2">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <Badge variant="outline" className="text-xs mb-1">{report.reason.replace("_", " ")}</Badge>
                                                    <p className="text-sm text-foreground">{report.description || "No details"}</p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        by {report.reporter_name} • {new Date(report.created_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="outline" className="text-xs h-7"
                                                    onClick={() => handleReportAction(report.id, "resolved")} disabled={actionLoading === report.id}>
                                                    Resolve
                                                </Button>
                                                <Button size="sm" variant="ghost" className="text-xs h-7 text-muted-foreground"
                                                    onClick={() => handleReportAction(report.id, "dismissed")} disabled={actionLoading === report.id}>
                                                    Dismiss
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </SheetContent>
            </Sheet>

            {/* Confirmation Dialog */}
            <AlertDialog open={confirmDialog.open} onOpenChange={(o) => setConfirmDialog(prev => ({ ...prev, open: o }))}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
                        <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={async () => { setConfirmDialog(prev => ({ ...prev, open: false })); await confirmDialog.action(); }}
                            className={confirmDialog.variant === "destructive" ? "bg-destructive text-destructive-foreground" : ""}
                        >
                            Confirm
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

export default ModerationPanel;
