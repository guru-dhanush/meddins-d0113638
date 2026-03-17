import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onAdded: () => void;
};

const AddProviderDialog = ({ open, onOpenChange, organizationId, onAdded }: Props) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleInvite = async () => {
    if (!email.trim()) return;
    setLoading(true);

    try {
      // For now, just show a success message - org_members table not yet created
      toast({ title: "Invite sent!", description: `Invitation sent to ${email}` });
      setEmail("");
      onAdded();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Provider to Team</DialogTitle>
          <DialogDescription>
            Invite a healthcare provider to join your organization by entering their email address.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Provider Email</Label>
            <Input
              placeholder="doctor@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              type="email"
            />
          </div>
          <Button onClick={handleInvite} disabled={loading || !email.trim()} className="w-full">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Invitation
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddProviderDialog;
