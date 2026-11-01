import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, Image as ImageIcon, Music2 } from "lucide-react";
import { toast } from "sonner";
import { uploadTrendingMedia } from "@/lib/settings";
import type { Song } from "@/lib/warehouse";

type Props = {
  open: boolean;
  onClose: () => void;
  groupLabel: string;
  existing: Song[];
  /** Indices into `existing` that the uploaded items should replace, in order. Defaults to 0..n. */
  targets?: number[];
  onApply: (songs: Song[]) => void | Promise<void>;
};

/** Bulk-upload album art, titles and audio files into a warehouse group. */
export function BulkSongUpload({ open, onClose, groupLabel, existing, targets, onApply }: Props) {
  const [titles, setTitles] = useState("");
  const [posters, setPosters] = useState<File[]>([]);
  const [audios, setAudios] = useState<File[]>([]);
  const [amount, setAmount] = useState("");
  const [commission, setCommission] = useState("1.5");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  const titleList = titles.split("\n").map((t) => t.trim()).filter(Boolean);
  const count = Math.max(titleList.length, posters.length, audios.length);

  const reset = () => { setTitles(""); setPosters([]); setAudios([]); setProgress(0); };

  const apply = async () => {
    if (count === 0) return toast.error("Add titles, photos or audio files first");
    setBusy(true);
    setProgress(0);
    try {
      const total = posters.length + audios.length;
      let done = 0;
      const bump = () => { done += 1; setProgress(Math.round((done / Math.max(total, 1)) * 100)); };

      const posterUrls: string[] = [];
      for (const f of posters) { posterUrls.push(await uploadTrendingMedia(f)); bump(); }
      const audioUrls: string[] = [];
      for (const f of audios) { audioUrls.push(await uploadTrendingMedia(f)); bump(); }

      const next = [...existing];
      for (let i = 0; i < count; i++) {
        const slot = targets && targets.length > 0 ? targets[i] : i;
        if (slot === undefined) break; // more uploads than selected slots
        const base: Song = next[slot] ?? {
          id: `bulk-${Date.now()}-${i}`,
          name: `Untitled ${i + 1}`,
          poster: "",
          audio: "",
          description: "Promotable track curated for the SoundCampaign catalog.",
          amount: 50,
          commission: 1.5,
        };
        next[slot] = {
          ...base,
          name: titleList[i] ?? base.name,
          poster: posterUrls[i] ?? base.poster,
          audio: audioUrls[i] ?? base.audio,
          amount: amount.trim() ? Number(amount) : base.amount,
          commission: commission.trim() ? Number(commission) : base.commission,
        };
      }
      await onApply(next);
      toast.success(`${count} song${count > 1 ? "s" : ""} uploaded to ${groupLabel}`);
      reset();
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Bulk upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !busy) { reset(); onClose(); } }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk upload songs</DialogTitle>
          <DialogDescription>
            Upload album photos, titles and audio files into {groupLabel}
            {targets && targets.length > 0 ? ` — replacing the ${targets.length} selected song${targets.length > 1 ? "s" : ""} in order` : ""}.
            Items are matched in order (1st title ↔ 1st photo ↔ 1st audio).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Song titles — one per line</Label>
            <Textarea
              rows={5}
              placeholder={"Midnight Silver — Lumen West\nGolden Velvet — Sable Moon"}
              value={titles}
              onChange={(e) => setTitles(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground mt-1">{titleList.length} titles</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="flex items-center gap-1"><ImageIcon className="w-3.5 h-3.5" /> Album photos</Label>
              <Input type="file" accept="image/*" multiple
                onChange={(e) => setPosters(Array.from(e.target.files ?? []))} />
              <p className="text-[11px] text-muted-foreground mt-1">{posters.length} selected</p>
            </div>
            <div>
              <Label className="flex items-center gap-1"><Music2 className="w-3.5 h-3.5" /> Audio files</Label>
              <Input type="file" accept="audio/*" multiple
                onChange={(e) => setAudios(Array.from(e.target.files ?? []))} />
              <p className="text-[11px] text-muted-foreground mt-1">{audios.length} selected</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Cost for all (optional)</Label>
              <Input type="number" placeholder="Keep existing" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <Label>Commission %</Label>
              <Input type="number" step="0.1" value={commission} onChange={(e) => setCommission(e.target.value)} />
            </div>
          </div>

          {busy && (
            <div className="h-1.5 rounded bg-muted overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button disabled={busy || count === 0} onClick={apply}>
            {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
            Upload {count > 0 ? `${count} song${count > 1 ? "s" : ""}` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
