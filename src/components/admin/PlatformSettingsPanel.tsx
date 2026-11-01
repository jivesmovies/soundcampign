import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Wrench, UserPlus, Gift, Wallet, MessageCircle, Send, Images, BarChart3,
  Sparkles, Camera, BadgeCheck, FileText, HelpCircle, Info, ChevronRight, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { CRYPTO_ASSETS, type CryptoAsset } from "@/lib/crypto";
import {
  useDepositAddresses, saveDepositAddresses, useTrendingSongs, uploadTrendingMedia,
  type DepositAddresses, type TrendingSong,
} from "@/lib/settings";
import { Loader2, Music2, Trash2, Upload } from "lucide-react";
import { EventsRewardsEditor, MembershipChartEditor } from "@/components/admin/EventsRewardsEditor";
import { SupportContactEditor } from "@/components/admin/SupportContactEditor";
import { PlatformConfigEditor } from "@/components/admin/PlatformConfigEditor";

type RowKey =
  | "maintenance" | "registrations" | "bonuses" | "wallets" | "whatsapp" | "telegram"
  | "trending" | "activities" | "events" | "testimonials" | "licenses" | "terms" | "faq" | "about";

const ROWS: { key: RowKey; title: string; desc: string; icon: typeof Wrench; tone: string }[] = [
  { key: "maintenance",   title: "Maintenance Mode",       desc: "Temporarily disable the platform for users",        icon: Wrench,        tone: "text-rose-500" },
  { key: "registrations", title: "Allow New Registrations",desc: "Allow new users to sign up",                        icon: UserPlus,      tone: "text-sky-500" },
  { key: "bonuses",       title: "Registration Bonuses",   desc: "Configure welcome and trial bonuses for new sign-ups", icon: Gift,       tone: "text-emerald-500" },
  { key: "wallets",       title: "Deposit Wallet Addresses", desc: "Update the crypto wallet addresses users send deposits to", icon: Wallet, tone: "text-amber-500" },
  { key: "whatsapp",      title: "WhatsApp Support Number", desc: "Update the WhatsApp number for customer support",  icon: MessageCircle, tone: "text-emerald-500" },
  { key: "telegram",      title: "Telegram Support",       desc: "Update the Telegram username for customer support", icon: Send,          tone: "text-sky-500" },
  { key: "trending",      title: "Trending Songs",         desc: "Update trending song titles, artists, posters and audio", icon: Images,      tone: "text-fuchsia-500" },
  { key: "activities",    title: "Activities Management",  desc: "Edit check-in program, membership & employee levels", icon: BarChart3,   tone: "text-indigo-500" },
  { key: "events",        title: "Events & Rewards",       desc: "Manage check-in, spin wheel, and magic box events",  icon: Sparkles,      tone: "text-pink-500" },
  { key: "testimonials",  title: "Testimonial Photos",     desc: "Upload, replace, or remove testimonial logos and photos", icon: Camera,   tone: "text-orange-500" },
  { key: "licenses",      title: "Business Licenses",      desc: "Upload business license certificates visible to users", icon: BadgeCheck, tone: "text-emerald-500" },
  { key: "terms",         title: "Terms & Conditions",     desc: "Edit the T&C sections shown to users",               icon: FileText,     tone: "text-indigo-500" },
  { key: "faq",           title: "FAQ",                    desc: "Edit the frequently asked questions",                icon: HelpCircle,   tone: "text-sky-500" },
  { key: "about",         title: "About Page",             desc: "Edit About page text and images",                    icon: Info,         tone: "text-slate-500" },
];

export function PlatformSettingsPanel() {
  const [open, setOpen] = useState<RowKey | null>("maintenance");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Platform Settings</h1>
        <p className="text-sm text-muted-foreground">Payment methods and platform configuration.</p>
      </div>
      <div className="space-y-2">
        {ROWS.map((r) => {
          const isOpen = open === r.key;
          return (
            <div key={r.key} className="bg-card border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setOpen(isOpen ? null : r.key)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/40"
              >
                <span className="w-8 h-8 rounded-lg bg-muted grid place-items-center shrink-0">
                  <r.icon className={`w-4 h-4 ${r.tone}`} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold">{r.title}</span>
                  <span className="block text-[11px] text-muted-foreground truncate">{r.desc}</span>
                </span>
                {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </button>
              {isOpen && (
                <div className="px-4 pb-4 border-t border-border pt-3">
                  {r.key === "maintenance" && <PlatformConfigEditor field="maintenance" />}
                  {r.key === "registrations" && <PlatformConfigEditor field="registrations" />}
                  {r.key === "bonuses" && <PlatformConfigEditor field="welcomeBonus" />}
                  {r.key === "activities" && (
                    <div className="space-y-6">
                      <MembershipLevels />
                      <div className="border-t border-border pt-4">
                        <MembershipChartEditor />
                      </div>
                    </div>
                  )}
                  {r.key === "wallets" && <DepositWallets />}
                  {r.key === "trending" && <TrendingSongsEditor />}
                  {r.key === "events" && <EventsRewardsEditor />}
                  {(r.key === "whatsapp" || r.key === "telegram") && <SupportContactEditor channel={r.key} />}
                  {(r.key === "testimonials" || r.key === "licenses" || r.key === "terms" || r.key === "faq" || r.key === "about") && <PlatformConfigEditor field={r.key} />}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MembershipLevels() {
  const qc = useQueryClient();
  const { data: plans = [] } = useQuery({
    queryKey: ["vip_plans"],
    queryFn: async () => (await supabase.from("vip_plans").select("*").order("id")).data ?? [],
  });
  const update = useMutation({
    mutationFn: async (p: { id: number; price: number; daily_income: number }) => {
      const { error } = await supabase.from("vip_plans").update({ price: p.price, daily_income: p.daily_income }).eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vip_plans"] }); toast.success("Level updated"); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <ul className="divide-y divide-border">
      {plans.map((p: any) => (
        <li key={p.id} className="py-3 grid grid-cols-[auto_1fr_1fr_auto] gap-2 items-end">
          <div className="font-bold w-16 text-[var(--nrc-gold)]">{p.name}</div>
          <label className="text-xs text-muted-foreground">Price
            <Input type="number" defaultValue={p.price} id={`ps-price-${p.id}`} className="h-8" />
          </label>
          <label className="text-xs text-muted-foreground">Daily
            <Input type="number" defaultValue={p.daily_income} id={`ps-daily-${p.id}`} className="h-8" />
          </label>
          <Button size="sm" onClick={() => update.mutate({
            id: p.id,
            price: Number((document.getElementById(`ps-price-${p.id}`) as HTMLInputElement).value),
            daily_income: Number((document.getElementById(`ps-daily-${p.id}`) as HTMLInputElement).value),
          })}>Save</Button>
        </li>
      ))}
    </ul>
  );
}

function DepositWallets() {
  const qc = useQueryClient();
  const { data: addresses } = useDepositAddresses();
  const [draft, setDraft] = useState<DepositAddresses | null>(null);
  const value = draft ?? addresses ?? null;
  const save = useMutation({
    mutationFn: async () => { if (value) await saveDepositAddresses(value); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["deposit-addresses"] }); toast.success("Deposit addresses updated"); },
    onError: (e: any) => toast.error(e.message),
  });
  if (!value) return <div className="text-sm text-muted-foreground">Loading…</div>;
  return (
    <div className="space-y-3">
      {CRYPTO_ASSETS.map((c) => {
        const k = c.key as CryptoAsset;
        return (
          <div key={c.key} className="space-y-1">
            <div className="text-xs font-semibold">{c.name} · {value[k]?.network || c.network}</div>
            <Input
              value={value[k]?.address ?? ""}
              placeholder={`${c.key} wallet address`}
              onChange={(e) => setDraft({ ...value, [k]: { ...value[k], address: e.target.value } })}
            />
            <Input
              className="h-8 text-xs"
              value={value[k]?.network ?? ""}
              placeholder="Network label"
              onChange={(e) => setDraft({ ...value, [k]: { ...value[k], network: e.target.value } })}
            />
          </div>
        );
      })}
      <Button size="sm" disabled={save.isPending} onClick={() => save.mutate()}>
        {save.isPending && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />} Save addresses
      </Button>
    </div>
  );
}

function TrendingSongsEditor() {
  const qc = useQueryClient();
  const { data: songs = [] } = useTrendingSongs();
  const refresh = () => qc.invalidateQueries({ queryKey: ["trending-songs"] });

  const add = async () => {
    const { error } = await supabase.from("trending_songs").insert({
      position: (songs[songs.length - 1]?.position ?? 0) + 1,
      title: "New trending song",
      artist: "Unknown artist",
    });
    if (error) return toast.error(error.message);
    refresh();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">{songs.length} songs shown on the user dashboard</div>
        <Button size="sm" variant="outline" onClick={add}>Add song</Button>
      </div>
      {songs.map((s) => <TrendingRow key={s.id} song={s} onChanged={refresh} />)}
    </div>
  );
}

function TrendingRow({ song, onChanged }: { song: TrendingSong; onChanged: () => void }) {
  const [draft, setDraft] = useState(song);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const { error } = await supabase.from("trending_songs").update({
      title: draft.title, artist: draft.artist, poster: draft.poster,
      audio_url: draft.audio_url, duration: draft.duration, position: draft.position,
    }).eq("id", song.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Trending song updated");
    onChanged();
  };

  const remove = async () => {
    const { error } = await supabase.from("trending_songs").delete().eq("id", song.id);
    if (error) return toast.error(error.message);
    toast.success("Song removed");
    onChanged();
  };

  const upload = async (file: File | undefined, field: "audio_url" | "poster") => {
    if (!file) return;
    setBusy(true);
    try {
      const url = await uploadTrendingMedia(file);
      setDraft((d) => ({ ...d, [field]: url }));
      const patch = field === "audio_url" ? { audio_url: url } : { poster: url };
      const { error } = await supabase.from("trending_songs").update(patch).eq("id", song.id);
      if (error) throw error;
      toast.success(field === "audio_url" ? "Audio uploaded" : "Poster uploaded");
      onChanged();
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-border p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="w-9 h-9 rounded-md bg-muted overflow-hidden grid place-items-center shrink-0">
          {draft.poster ? <img src={draft.poster} alt="" className="w-full h-full object-cover" /> : <Music2 className="w-4 h-4" />}
        </span>
        <Input className="h-8" value={String(draft.position)} onChange={(e) => setDraft({ ...draft, position: Number(e.target.value) || 0 })} placeholder="#" style={{ width: 56 }} />
        <Input className="h-8" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Song title" />
        <Input className="h-8" value={draft.artist} onChange={(e) => setDraft({ ...draft, artist: e.target.value })} placeholder="Artist name" />
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        <Input className="h-8" value={draft.poster ?? ""} onChange={(e) => setDraft({ ...draft, poster: e.target.value })} placeholder="Poster image URL" />
        <Input className="h-8" value={draft.duration ?? ""} onChange={(e) => setDraft({ ...draft, duration: e.target.value })} placeholder="Duration (3:24)" />
      </div>
      <Input className="h-8" value={draft.audio_url ?? ""} onChange={(e) => setDraft({ ...draft, audio_url: e.target.value })} placeholder="Audio URL" />
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs font-semibold border border-border rounded-md px-2.5 py-1.5 cursor-pointer inline-flex items-center gap-1">
          <Upload className="w-3 h-3" /> Upload audio
          <input type="file" accept="audio/*" className="hidden" onChange={(e) => upload(e.target.files?.[0], "audio_url")} />
        </label>
        <label className="text-xs font-semibold border border-border rounded-md px-2.5 py-1.5 cursor-pointer inline-flex items-center gap-1">
          <Upload className="w-3 h-3" /> Upload poster
          <input type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0], "poster")} />
        </label>
        <Button size="sm" disabled={busy} onClick={save}>
          {busy && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />} Save
        </Button>
        <Button size="sm" variant="ghost" className="text-destructive" onClick={remove}><Trash2 className="w-3.5 h-3.5" /></Button>
      </div>
    </div>
  );
}
