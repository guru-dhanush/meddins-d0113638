import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  Plus, FileText, Image, File, Trash2, Share2, Download, Loader2,
  Search, Folder, FolderPlus, ChevronRight, MoreHorizontal, Pencil,
  ShieldCheck, Lock, Eye, FlaskConical, Pill, ScanLine, Syringe, ClipboardList, Star,
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
  all: Star,
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

const CATEGORY_FILTERS = [
  { value: "all", label: "All", icon: Star },
  { value: "lab_report", label: "Lab Report", icon: FlaskConical },
  { value: "prescription", label: "Prescription", icon: Pill },
  { value: "imaging", label: "Imaging", icon: ScanLine },
  { value: "vaccination", label: "Vaccination", icon: Syringe },
  { value: "other", label: "Other", icon: ClipboardList },
];

const FilterPill = ({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
      active
        ? "bg-primary text-primary-foreground"
        : "bg-muted text-muted-foreground hover:bg-muted/80"
    }`}
  >
    <Icon className="h-3 w-3" />
    <span>{label}</span>
  </button>
);

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

const HealthRecords = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [folders, setFolders] = useState<RecordFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [shareRecordId, setShareRecordId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [currentFolderName, setCurrentFolderName] = useState<string | null>(null);
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
    const parentCategory = categoryFilter !== "all" ? categoryFilter : null;

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
    await supabase.from("health_records").update({ folder_id: null } as any).eq("folder_id", folder.id);
    await supabase.from("health_record_folders").delete().eq("id", folder.id);
    fetchAll();
    if (currentFolderId === folder.id) {
      setCurrentFolderId(null);
      setCurrentFolderName(null);
    }
  };

  // Filter records based on current state
  const filteredRecords = (() => {
    let recs = records;
    if (currentFolderId) {
      recs = recs.filter((r) => r.folder_id === currentFolderId);
    } else {
      if (categoryFilter !== "all") {
        recs = recs.filter((r) => r.category === categoryFilter && !r.folder_id);
      }
    }
    if (search) recs = recs.filter((r) => r.title.toLowerCase().includes(search.toLowerCase()));
    return recs;
  })();

  const filteredFolders = (() => {
    if (currentFolderId) return [];
    if (categoryFilter !== "all") {
      return folders.filter((f) => f.parent_category === categoryFilter);
    }
    return folders;
  })();

  const isInsideFolder = !!currentFolderId;

  const breadcrumb = (() => {
    const parts: { label: string; onClick?: () => void }[] = [
      { label: "Health Records", onClick: () => { setCurrentFolderId(null); setCurrentFolderName(null); } },
    ];
    if (currentFolderId && currentFolderName) {
      parts.push({ label: currentFolderName });
    }
    return parts;
  })();

  return (
    <AppLayout className="p-0">
      <div className="container max-w-6xl mx-auto p-2 md:p-4">
        {/* Header bar — matches Communities */}
        <div className="flex items-center justify-between mb-2 p-4 bg-background rounded-none md:rounded-md">
          <div>
            <h1 className="text-sm font-semibold text-foreground">Health Records</h1>
            <p className="text-xs text-muted-foreground">Securely store & share medical documents</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative group">
              <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 cursor-help">
                <ShieldCheck className="h-3 w-3" />
                <span className="font-medium hidden sm:inline">Secured</span>
              </div>
              <div className="absolute right-0 top-full mt-2 z-50 w-64 p-3 rounded-lg border bg-popover text-popover-foreground shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
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
            <Button size="sm" className="gap-1.5 h-8 px-3 text-xs font-semibold" onClick={() => setUploadOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Upload</span>
            </Button>
          </div>
        </div>

        {/* Content panel */}
        <div className="bg-background p-4 rounded-none md:rounded-md">
          {/* Category filter pills — same as Communities */}
          <ScrollArea className="w-full mb-4">
            <div className="flex items-center gap-1.5 pb-2">
              {CATEGORY_FILTERS.map((f) => (
                <FilterPill
                  key={f.value}
                  active={categoryFilter === f.value}
                  icon={f.icon}
                  label={f.label}
                  onClick={() => { setCategoryFilter(f.value); setCurrentFolderId(null); setCurrentFolderName(null); }}
                />
              ))}
              <div className="w-px h-5 bg-border flex-shrink-0" />
              <FilterPill
                active={false}
                icon={FolderPlus}
                label="New Folder"
                onClick={() => { setFolderDialogOpen(true); setEditingFolder(null); setNewFolderName(""); }}
              />
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          {/* Breadcrumb when inside folder */}
          {isInsideFolder && (
            <div className="flex items-center gap-1 text-sm mb-3">
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

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search records..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              {/* Sub-folders */}
              {filteredFolders.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Folders</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {filteredFolders.map((folder) => (
                      <Card
                        key={folder.id}
                        className="cursor-pointer hover:shadow-md transition-all group"
                        onClick={() => { setCurrentFolderId(folder.id); setCurrentFolderName(folder.name); }}
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
              {filteredFolders.length > 0 && filteredRecords.length > 0 && (
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider pt-2">Files</p>
              )}
              {filteredRecords.length === 0 && filteredFolders.length === 0 ? (
                <div className="text-center py-20">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground">No records found</h3>
                  <p className="text-muted-foreground text-sm mb-4">Upload your first health record to get started</p>
                  <Button onClick={() => setUploadOpen(true)} variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" /> Upload Record
                  </Button>
                </div>
              ) : (
                filteredRecords.map((record) => (
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

              {/* Prescriptions section — only on "all" or "prescription" filter */}
              {!isInsideFolder && (categoryFilter === "all" || categoryFilter === "prescription") && (
                <div className="mt-6">
                  <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <span className="text-xl font-serif text-primary">℞</span> Digital Prescriptions
                  </h2>
                  <PrescriptionList />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <UploadRecordDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUploaded={fetchAll}
        defaultCategory={categoryFilter !== "all" ? categoryFilter : undefined}
        defaultFolderId={currentFolderId || undefined}
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
    </AppLayout>
  );
};

export default HealthRecords;
