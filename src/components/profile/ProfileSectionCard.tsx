import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { ReactNode } from "react";

interface ProfileSectionCardProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  canEdit?: boolean;
  onEdit?: () => void;
  emptyText?: string;
  isEmpty?: boolean;
}

const ProfileSectionCard = ({ title, icon, children, canEdit, onEdit, emptyText, isEmpty }: ProfileSectionCardProps) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between py-4 px-5">
      <CardTitle className="text-base font-semibold flex items-center gap-2">
        {icon} {title}
      </CardTitle>
      {canEdit && (
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
          <Pencil className="h-4 w-4 text-muted-foreground" />
        </Button>
      )}
    </CardHeader>
    <CardContent className="px-5 pb-5 pt-0">
      {isEmpty ? (
        <p className="text-sm text-muted-foreground">{emptyText || "Nothing added yet."}</p>
      ) : children}
    </CardContent>
  </Card>
);

export default ProfileSectionCard;
