import { Check, CheckCheck } from "lucide-react";

interface ReadReceiptProps {
  isMine: boolean;
  read: boolean;
}

const ReadReceipt = ({ isMine, read }: ReadReceiptProps) => {
  if (!isMine) return null;

  return read ? (
    <CheckCheck className="h-3.5 w-3.5 text-blue-400 inline-block ml-1" />
  ) : (
    <Check className="h-3.5 w-3.5 text-primary-foreground/50 inline-block ml-1" />
  );
};

export default ReadReceipt;
