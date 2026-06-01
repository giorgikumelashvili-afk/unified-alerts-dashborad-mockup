import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Props {
  /** file name that will be downloaded, e.g. "per-team_vulcan_02-06-2026.csv" */
  filename: string;
  onConfirm: () => void;
}

/** Export button that first confirms the download in a small dialog (OK / Cancel). */
export function ExportButton({ filename, onConfirm }: Props) {
  const [open, setOpen] = useState(false);

  const confirm = () => {
    onConfirm();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="shrink-0">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Download CSV</DialogTitle>
          <DialogDescription>
            Clicking OK will download <span className="font-medium text-foreground">{filename}</span> to your
            computer.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button onClick={confirm}>OK</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
