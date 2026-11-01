import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { PLATFORM_CONFIG_KEY, savePlatformConfigField, usePlatformConfig, type PlatformConfig } from "@/lib/platform-config";
import { uploadTrendingMedia } from "@/lib/settings";

export function PlatformConfigEditor({ field }: { field: keyof PlatformConfig }) {
  const qc = useQueryClient();
  const { data: config, isLoading, error } = usePlatformConfig();
  const [draft, setDraft] = useState<string | null>(null);
  const [expected, setExpected] = useState<PlatformConfig[typeof field] | null>(null);
  const [uploading, setUploading] = useState(false);
  const isToggle = field === "maintenance" || field === "registrations";
  const isMedia = field === "testimonials" || field === "licenses";
  const saved = config?.[field];
  const text = draft ?? (Array.isArray(saved) ? saved.join("\n") : String(saved ?? ""));
  const edit = (value: string) => { if (expected === null && saved !== undefined) setExpected(saved); setDraft(value); };
  const save = useMutation({
    mutationFn: async (toggle?: boolean) => {
      if (!config) throw new Error("Settings have not loaded. Please try again.");
      const value = isToggle ? toggle : field === "welcomeBonus" ? Number(text) : isMedia ? text.split("\n").map((s) => s.trim()).filter(Boolean) : text;
      if (value === undefined) throw new Error("Choose a value first.");
      return savePlatformConfigField(field, value, expected ?? config[field]);
    },
    onSuccess: (next) => { qc.setQueryData([PLATFORM_CONFIG_KEY], next); setDraft(null); setExpected(null); toast.success("Platform setting saved"); },
    onError: (e: Error) => toast.error(e.message),
  });
  if (isLoading) return <Loader2 className="h-4 w-4 animate-spin" />;
  if (error || !config) return <div className="text-sm text-destructive">Could not load settings. Refresh to retry.</div>;
  if (isToggle) return <div className="flex items-center justify-between gap-3"><span className="text-sm">{field === "maintenance" ? "Enable maintenance mode" : "Allow new users to register"}</span><Switch checked={config[field] as boolean} disabled={save.isPending} onCheckedChange={(v) => save.mutate(v)} /></div>;
  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) urls.push(await uploadTrendingMedia(file));
      edit([text.trim(), ...urls].filter(Boolean).join("\n"));
    } catch (e) { toast.error(e instanceof Error ? e.message : "Upload failed"); }
    finally { setUploading(false); }
  };
  return <div className="space-y-3">
    {field === "welcomeBonus" ? <label className="block space-y-1 text-sm">Welcome bonus ($)<Input aria-label="Welcome bonus" type="number" min="0" step="0.01" value={text} onChange={(e) => edit(e.target.value)} /></label> : <Textarea aria-label={`${field} content`} rows={isMedia ? 4 : 8} value={text} onChange={(e) => edit(e.target.value)} placeholder={isMedia ? "Media URLs, one per line" : "Page text"} />}
    {isMedia && <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-primary"><Upload className="h-4 w-4" />Upload {field === "licenses" ? "documents" : "photos"}<input type="file" aria-label={`Upload ${field}`} accept={field === "licenses" ? "image/*,application/pdf" : "image/*"} multiple className="hidden" disabled={uploading} onChange={(e) => void upload(e.target.files)} /></label>}
    <div className="flex gap-2"><Button size="sm" disabled={save.isPending || uploading || draft === null} onClick={() => save.mutate(undefined)}>{(save.isPending || uploading) && <Loader2 className="h-4 w-4 animate-spin" />}Save</Button>{draft !== null && <Button size="sm" variant="outline" onClick={() => { setDraft(null); setExpected(null); }}>Discard</Button>}</div>
  </div>;
}