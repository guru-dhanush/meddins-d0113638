import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Loader2, Upload } from "lucide-react";

interface UploadRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded: () => void;
  defaultCategory?: string;
  defaultFolderId?: string;
}

const categories = [
  { value: "lab_report", label: "Lab Report" },
  { value: "prescription", label: "Prescription" },
  { value: "imaging", label: "Imaging" },
  { value: "vaccination", label: "Vaccination" },
  { value: "other", label: "Other" },
];

const UploadRecordDialog = ({ open, onOpenChange, onUploaded, defaultCategory, defaultFolderId }: UploadRecordDialogProps) => {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(defaultCategory || "other");
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split("T")[0]);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Reset category when dialog opens with new defaults
  const handleOpenChange = (o: boolean) => {
    if (o) setCategory(defaultCategory || "other");
    onOpenChange(o);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !file || !title.trim()) return;

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${user.id}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage.from("health-records").upload(filePath, file);
      if (uploadError) throw uploadError;

      const fileType = file.type.startsWith("image/") ? "image" : ext || "pdf";

      const { error: insertError } = await supabase.from("health_records").insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        file_url: filePath,
        file_type: fileType,
        record_date: recordDate,
        category,
        folder_id: defaultFolderId || null,
      });

      if (insertError) throw insertError;

      toast({ title: "Record uploaded", description: "Your health record has been saved securely." });
      onUploaded();
      onOpenChange(false);
      setTitle("");
      setDescription("");
      setCategory(defaultCategory || "other");
      setFile(null);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Health Record</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Blood Test Results" required maxLength={100} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="record-date">Record Date</Label>
            <Input id="record-date" type="date" value={recordDate} onChange={(e) => setRecordDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Notes (optional)</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Any additional notes..." maxLength={500} rows={3} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="file">File *</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
              <input id="file" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" />
              <label htmlFor="file" className="cursor-pointer flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                <Upload className="h-8 w-8" />
                <span className="text-sm">{file ? file.name : "Click to select a file"}</span>
                <span className="text-xs">PDF, Images, Documents (max 20MB)</span>
              </label>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={uploading || !file || !title.trim()}>
            {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</> : "Upload Record"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UploadRecordDialog;
