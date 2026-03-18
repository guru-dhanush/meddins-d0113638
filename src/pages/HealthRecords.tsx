import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  Plus, FileText, Image, File, Trash2, Share2, Download, Loader2,
  Search, Folder, FolderPlus, ChevronRight, ChevronLeft, MoreHorizontal, Pencil,
  ShieldCheck, Lock, Eye, FlaskConical, Pill, ScanLine, Syringe, ClipboardList,
} from "lucide-react";
import { format } from "date-fns";
import UploadRecordDialog from "@/components/health/UploadRecordDialog";
import PrescriptionList from "@/components/prescription/PrescriptionList";
import ShareRecordDialog from "@/components/health/ShareRecordDialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const categoryLabels: Record<string, string> = {
  lab_report: "Lab Report",
  prescription: "Prescription",
  imaging: "Imaging",
  vaccination: "Vaccination",
  other: "Other",
};

const categoryIcons: Record<string, React.ElementType> = {
  lab_report: FlaskConical,
  prescription: Pill,
  imaging: ScanLine,
  vaccination: Syringe,
  other: ClipboardList,
};

const categoryColors: Record<string, string> = {
  lab_report: "bg-primary/10 text-primary",
  prescription: "bg-accent/20 text-accent-foreground",
  imaging: "bg-secondary text-secondary-foreground",
  vaccination: "bg-primary/15 text-primary",
  other: "bg-muted text-muted-foreground",
};

const FileIcon = ({ type }: { type: string }) => {
  if (type === "image" || type === "jpg" || type === "png" || type === "jpeg" || type === "webp")
    return <Image className="h-5 w-5 text-primary" />;
  if (type === "pdf") return <FileText className="h-5 w-5 text-primary" />;
  return <File className="h-5 w-5 text-muted-foreground" />;
};

interface HealthRecord {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_type: string;
  record_date: string;
  category: string;
  created_at: string;
  folder_id: string | null;
  shareCount?: number;
}

interface RecordFolder {
  id: string;
  name: string;
  parent_category: string | null;
  created_at: string;
  recordCount?: number;
}

// View states: 'root' -> category folders, clicking category -> sub-folders + records
type ViewState =
  | { type: "root" }
  | { type: "category"; category: string }
  | { type: "folder"; folderId: string; folderName: string; category: string };

const HealthRecords = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [folders, setFolders] = useState<RecordFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [shareRecordId, setShareRecordId] = useState<string | null>(null);
  const [viewState, setViewState] = useState<ViewState>({ type: "root" });
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingFolder, setEditingFolder] = useState<RecordFolder | null>(null);
  const [creatingFolder, setCreatingFolder] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: recs }, { data: flds }, { data: shares }] = await Promise.all([
      supabase.from("health_records").select("*").eq("user_id", user.id).order("record_date", { ascending: false }),
      supabase.from("health_record_folders").select("*").eq("user_id", user.id).order("name"),
      supabase.from("health_record_shares").select("record_id"),
    ]);

    const shareCounts: Record<string, number> = {};
    (shares || []).forEach((s) => { shareCounts[s.record_id] = (shareCounts[s.record_id] || 0) + 1; });

    setRecords((recs || []).map((r) => ({ ...r, shareCount: shareCounts[r.id] || 0 })));

    // Count records per folder
    const folderCounts: Record<string, number> = {};
    (recs || []).forEach((r) => { if (r.folder_id) folderCounts[r.folder_id] = (folderCounts[r.folder_id] || 0) + 1; });
    setFolders((flds || []).map((f) => ({ ...f, recordCount: folderCounts[f.id] || 0 })));

    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleDelete = async (record: HealthRecord) => {
    if (!confirm("Delete this record? This cannot be undone.")) return;
    await supabase.storage.from("health-records").remove([record.file_url]);
    const { error } = await supabase.from("health_records").delete().eq("id", record.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Deleted" }); fetchAll(); }
  };

  const handleDownload = async (record: HealthRecord) => {
    const { data, error } = await supabase.storage.from("health-records").createSignedUrl(record.file_url, 60);
    if (error || !data?.signedUrl) { toast({ title: "Error", description: "Could not generate download link", variant: "destructive" }); return; }
    window.open(data.signedUrl, "_blank");
  };

  const handleCreateFolder = async () => {
    if (!user || !newFolderName.trim()) return;
    setCreatingFolder(true);
    const parentCategory = viewState.type === "category" ? viewState.category : null;

    if (editingFolder) {
      await supabase.from("health_record_folders").update({ name: newFolderName.trim() }).eq("id", editingFolder.id);
    } else {
      await supabase.from("health_record_folders").insert({ user_id: user.id, name: newFolderName.trim(), parent_category: parentCategory });
    }
    setCreatingFolder(false);
    setFolderDialogOpen(false);
    setNewFolderName("");
    setEditingFolder(null);
    fetchAll();
  };

  const handleDeleteFolder = async (folder: RecordFolder) => {
    if (!confirm(`Delete folder "${folder.name}"? Records inside will be moved out.`)) return;
    // Unset folder_id on records
    await supabase.from("health_records").update({ folder_id: null } as any).eq("folder_id", folder.id);
    await supabase.from("health_record_folders").delete().eq("id", folder.id);
    fetchAll();
    if (viewState.type === "folder" && viewState.folderId === folder.id) {
      setViewState({ type: "category", category: folder.parent_category || "other" });
    }
  };

  // Compute what to show
  const allCategories = ["lab_report", "prescription", "imaging", "vaccination", "other"];
  const categoryCounts = allCategories.reduce((acc, cat) => {
    acc[cat] = records.filter((r) => r.category === cat).length;
    return acc;
  }, {} as Record<string, number>);

  const currentRecords = (() => {
    let recs = records;
    if (viewState.type === "category") {
      recs = recs.filter((r) => r.category === viewState.category && !r.folder_id);
    } else if (viewState.type === "folder") {
      recs = recs.filter((r) => r.folder_id === viewState.folderId);
    } else {
      return []; // root shows folders only
    }
    if (search) recs = recs.filter((r) => r.title.toLowerCase().includes(search.toLowerCase()));
    return recs;
  })();

  const currentFolders = (() => {
    if (viewState.type === "category") {
      return folders.filter((f) => f.parent_category === viewState.category);
    }
    return [];
  })();

  const breadcrumb = (() => {
    const parts: { label: string; onClick?: () => void }[] = [{ label: "Health Records", onClick: () => setViewState({ type: "root" }) }];
    if (viewState.type === "category") {
      parts.push({ label: categoryLabels[viewState.category] || viewState.category });
    } else if (viewState.type === "folder") {
      parts.push({ label: categoryLabels[viewState.category] || viewState.category, onClick: () => setViewState({ type: "category", category: viewState.category }) });
      parts.push({ label: viewState.folderName });
    }
    return parts;
  })();

  return (
    <AppLayout className="p-0">
      <div className="max-w-6xl mx-auto">
        <div className="bg-background md:rounded-md md:my-4 md:mx-4 lg:mx-auto">
          <div className="px-4 py-4 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">Health Records</h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-muted-foreground hidden sm:block">Securely store & share medical documents</p>
              <div className="relative group">
                <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 cursor-help">
                  <ShieldCheck className="h-3 w-3" />
                  <span className="font-medium hidden sm:inline">Secured</span>
                </div>
                {/* Hover tooltip */}
                <div className="absolute left-0 top-full mt-2 z-50 w-64 p-3 rounded-lg border bg-popover text-popover-foreground shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="h-4 w-4 text-emerald-500" />
                    <span className="font-semibold text-sm">Your data is protected</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-muted-foreground">
                    <li className="flex items-center gap-1.5"><ShieldCheck className="h-3 w-3 text-emerald-500 shrink-0" /> 256-bit AES Encryption</li>
                    <li className="flex items-center gap-1.5"><Lock className="h-3 w-3 text-emerald-500 shrink-0" /> HIPAA-compliant private vault</li>
                    <li className="flex items-center gap-1.5"><Eye className="h-3 w-3 text-emerald-500 shrink-0" /> You control who can access</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            {viewState.type !== "root" && (
              <Button variant="outline" size="sm" onClick={() => { setFolderDialogOpen(true); setEditingFolder(null); setNewFolderName(""); }}>
                <FolderPlus className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Folder</span>
              </Button>
            )}
            <Button size="sm" onClick={() => setUploadOpen(true)}>
              <Plus className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Upload</span>
            </Button>
          </div>
        </div>

        {/* Breadcrumb */}
        {viewState.type !== "root" && (
          <div className="flex items-center gap-1 text-sm">
            {breadcrumb.map((part, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                {part.onClick ? (
                  <button onClick={part.onClick} className="text-primary hover:underline">{part.label}</button>
                ) : (
                  <span className="text-foreground font-medium">{part.label}</span>
                )}
              </span>
            ))}
          </div>
        )}

        {/* Search (when not at root) */}
        {viewState.type !== "root" && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search records..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : viewState.type === "root" ? (
          <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {allCategories.map((cat) => {
              const IconComp = categoryIcons[cat];
              return (
                <Card
                  key={cat}
                  className="cursor-pointer hover:shadow-lg transition-all hover:border-primary/30 group"
                  onClick={() => setViewState({ type: "category", category: cat })}
                >
                  <CardContent className="p-5 flex flex-col items-center text-center gap-3">
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${categoryColors[cat]} transition-transform group-hover:scale-110`}>
                      <IconComp className="h-6 w-6" />
                    </div>
                    <h3 className="font-medium text-sm text-foreground">{categoryLabels[cat]}</h3>
                    <Badge variant="secondary" className="text-xs">{categoryCounts[cat]} record{categoryCounts[cat] !== 1 ? "s" : ""}</Badge>
                  </CardContent>
                </Card>
              );
            })}
            <Card
              className="cursor-pointer hover:shadow-lg transition-all hover:border-primary/30 group"
              onClick={() => setViewState({ type: "category", category: "all" })}
            >
              <CardContent className="p-5 flex flex-col items-center text-center gap-3">
                <div className="h-12 w-12 rounded-2xl flex items-center justify-center bg-primary/10 text-primary transition-transform group-hover:scale-110">
                  <Folder className="h-6 w-6" />
                </div>
                <h3 className="font-medium text-sm text-foreground">All Records</h3>
                <Badge variant="secondary" className="text-xs">{records.length} total</Badge>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span className="text-xl font-serif text-primary">℞</span> Digital Prescriptions
            </h2>
            <PrescriptionList />
          </div>
          </>
        ) : (
          /* ── Category/Folder view: Sub-folders + Records ── */
          <div className="space-y-3">
            {/* Sub-folders */}
            {currentFolders.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Folders</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {currentFolders.map((folder) => (
                    <Card
                      key={folder.id}
                      className="cursor-pointer hover:shadow-md transition-all group"
                      onClick={() => setViewState({ type: "folder", folderId: folder.id, folderName: folder.name, category: folder.parent_category || "other" })}
                    >
                      <CardContent className="p-3 flex items-center gap-3">
                        <Folder className="h-8 w-8 text-primary/70 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{folder.name}</p>
                          <p className="text-xs text-muted-foreground">{folder.recordCount} file{folder.recordCount !== 1 ? "s" : ""}</p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <button className="p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingFolder(folder); setNewFolderName(folder.name); setFolderDialogOpen(true); }}>
                              <Pencil className="h-3.5 w-3.5 mr-2" /> Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder); }}>
                              <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Records */}
            {currentFolders.length > 0 && currentRecords.length > 0 && (
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider pt-2">Files</p>
            )}
            {currentRecords.length === 0 && currentFolders.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-muted-foreground">No records here yet.</p>
                  <Button className="mt-3" size="sm" onClick={() => setUploadOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Upload Record
                  </Button>
                </CardContent>
              </Card>
            ) : (
              currentRecords.map((record) => (
                <Card key={record.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-muted/50 shrink-0">
                        <FileIcon type={record.file_type} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-medium text-sm truncate">{record.title}</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {format(new Date(record.record_date), "MMM d, yyyy")}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="outline" className={categoryColors[record.category]}>
                              {categoryLabels[record.category] || record.category}
                            </Badge>
                            {(record.shareCount || 0) > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                <Share2 className="h-3 w-3 mr-1" />{record.shareCount}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {record.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{record.description}</p>}
                        <div className="flex items-center gap-2 mt-3">
                          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleDownload(record)}>
                            <Download className="h-3 w-3 mr-1" /> View
                          </Button>
                          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setShareRecordId(record.id)}>
                            <Share2 className="h-3 w-3 mr-1" /> Share
                          </Button>
                          <Button size="sm" variant="ghost" className="text-xs h-7 text-destructive hover:text-destructive" onClick={() => handleDelete(record)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Dialogs */}
        <UploadRecordDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          onUploaded={fetchAll}
          defaultCategory={viewState.type === "category" && viewState.category !== "all" ? viewState.category : undefined}
          defaultFolderId={viewState.type === "folder" ? viewState.folderId : undefined}
        />
        {shareRecordId && (
          <ShareRecordDialog
            open={!!shareRecordId}
            onOpenChange={(o) => !o && setShareRecordId(null)}
            recordId={shareRecordId}
            onChanged={fetchAll}
          />
        )}

        {/* Create/Edit Folder dialog */}
        <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{editingFolder ? "Rename Folder" : "New Folder"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Folder Name</Label>
                <Input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="e.g. 2024 Tests" maxLength={50} />
              </div>
              <Button className="w-full" disabled={!newFolderName.trim() || creatingFolder} onClick={handleCreateFolder}>
                {creatingFolder ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {editingFolder ? "Rename" : "Create Folder"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default HealthRecords;
