import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/hooks";
import { walletFromNote } from "@/lib/crypto";
import { Copy, Download, Receipt, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

type Tx = { id: string; amount: number; created_at: string; reviewed_at: string | null; note: string | null; status: string };

function receiptLines(t: Tx, username?: string | null) {
  const address = walletFromNote(t.note);
  return [
    ["Receipt No.", t.id.slice(0, 8).toUpperCase()],
    ["Type", "Withdrawal"],
    ["Status", "Approved"],
    ["Amount", formatMoney(t.amount)],
    ...(username ? [["Account", username]] : []),
    ...(address ? [["Wallet address", address]] : []),
    ["Requested", new Date(t.created_at).toLocaleString()],
    ["Approved", t.reviewed_at ? new Date(t.reviewed_at).toLocaleString() : "—"],
    ["Transaction ID", t.id],
  ] as [string, string][];
}

export function receiptText(t: Tx, username?: string | null) {
  return ["SoundCampaign — Withdrawal Receipt", "", ...receiptLines(t, username).map(([k, v]) => `${k}: ${v}`)].join("\n");
}

export function WithdrawReceiptButton({ tx, username }: { tx: Tx; username?: string | null }) {
  const [open, setOpen] = useState(false);
  const lines = receiptLines(tx, username);
  const copy = async () => {
    try { await navigator.clipboard.writeText(receiptText(tx, username)); toast.success("Receipt copied"); }
    catch { toast.error("Could not copy receipt"); }
  };
  const download = () => {
    const blob = new Blob([receiptText(tx, username)], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `soundcampaign-receipt-${tx.id.slice(0, 8)}.txt`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  };
  return (
    <>
      <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setOpen(true)}>
        <Receipt className="w-3.5 h-3.5 mr-1" /> View receipt
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-primary" /> Withdrawal Receipt</DialogTitle>
            <DialogDescription>SoundCampaign</DialogDescription>
          </DialogHeader>
          <div className="text-center py-2">
            <div className="text-3xl font-bold">{formatMoney(tx.amount)}</div>
          </div>
          <dl className="divide-y divide-border text-sm">
            {lines.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 py-2">
                <dt className="text-muted-foreground shrink-0">{k}</dt>
                <dd className="font-medium text-right break-all">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button variant="outline" onClick={copy}><Copy className="w-4 h-4 mr-1" /> Copy</Button>
            <Button onClick={download}><Download className="w-4 h-4 mr-1" /> Download</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
