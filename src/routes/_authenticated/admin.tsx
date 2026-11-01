import { requireAdminPanel } from "@/lib/role-guard";
import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useMe, formatNaira } from "@/lib/hooks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { UPGRADE_KIND, parseUpgradeNote } from "@/lib/upgrade";
import { adjustBalance } from "@/lib/balance";
import { walletFromNote, shortAddress, noteText } from "@/lib/crypto";
import { useServerFn } from "@tanstack/react-start";
import { AdminReadOnlyContext, useAdminReadOnly, canOpenSection } from "@/lib/admin-permissions";
import { createAdminAccount, listAdminAccounts, setAdminRole } from "@/lib/admin.functions";
import { adminAccountSchema } from "@/lib/admin-account";
import { makeSongs, premiumSongs, WAREHOUSE_TIERS as MEMBERSHIP_TIERS, type Song } from "@/lib/warehouse";
import { useWarehouseSongs, saveWarehouseSongs } from "@/lib/settings";

import { AccountEditDialog } from "@/components/admin/AccountEditDialog";

import {
  Shield, Check, X, Users, CreditCard, LayoutDashboard, Warehouse,
  GraduationCap, ArrowUpCircle, ShieldCheck, Settings, MessageCircle,
  Megaphone, LogOut, TrendingUp, Search, Plus, Trash2, Edit3,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

import { UserManagement } from "@/components/admin/UserManagement";
import { LiveChat } from "@/components/admin/LiveChat";
import { PlatformSettingsPanel } from "@/components/admin/PlatformSettingsPanel";
import { TrainingAccounts } from "@/components/admin/TrainingAccounts";
import { BulkSongUpload } from "@/components/admin/BulkSongUpload";
import { PaymentHistoryDialog } from "@/components/admin/PaymentHistoryDialog";
import { useAllChats, useChatRealtime } from "@/lib/chat";
import { useSeen } from "@/components/admin/seen-store";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: () => requireAdminPanel(),
  head: () => ({
    meta: [
      {"title": "Administrator Panel \u2014 SoundCampaign"},
      {"name": "description", "content": "Manage SoundCampaign members, tracks, payments and platform settings."},
      {"property": "og:title", "content": "Administrator Panel \u2014 SoundCampaign"},
      {"property": "og:description", "content": "Manage SoundCampaign members, tracks, payments and platform settings."},
      {"property": "og:type", "content": "website"},
      {"name": "twitter:card", "content": "summary"},
    ],
  }),
  component: AdminPage,
});

type Section =
  | "overview" | "users" | "warehouse" | "training"
  | "payments" | "upgrades" | "admins" | "settings" | "chat" | "announcements";

const MENU: { key: Section; title: string; icon: typeof LayoutDashboard }[] = [
  { key: "overview",      title: "Overview",          icon: LayoutDashboard },
  { key: "users",         title: "User Management",   icon: Users },
  { key: "warehouse",     title: "Song Warehouse",    icon: Warehouse },
  { key: "training",      title: "Training Accounts", icon: GraduationCap },
  { key: "payments",      title: "Payments",          icon: CreditCard },
  { key: "upgrades",      title: "Upgrades",          icon: ArrowUpCircle },
  { key: "admins",        title: "Manage Admins",     icon: ShieldCheck },
  { key: "settings",      title: "Platform Settings", icon: Settings },
  { key: "chat",          title: "Live Chat",         icon: MessageCircle },
  { key: "announcements", title: "Announcements",     icon: Megaphone },
];

function AdminPage() {
  const { data: me, isLoading } = useMe();
  const [section, setSection] = useState<Section>("overview");
  const isSuper = !!me?.isSuperAdmin;
  const menu = MENU.filter((m) => canOpenSection(isSuper, m.key));
  const shown: Section = canOpenSection(isSuper, section) ? section : "users";
  const [chatThreadId, setChatThreadId] = useState<string | null>(null);

  if (isLoading) return <div className="p-8 text-center">Loading…</div>;
  if (!me) return me === null ? <Navigate to="/auth" /> : null;
  if (!me.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-background">
        <div className="bg-card border border-border rounded-xl p-8 text-center max-w-md">
          <Shield className="w-12 h-12 mx-auto text-destructive mb-3" />
          <div className="text-lg font-semibold">Admin only</div>
          <div className="text-sm text-muted-foreground mt-1">
            This area is restricted to administrator accounts.
          </div>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar section={shown} setSection={setSection} menu={menu} />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b border-border bg-card px-4 sticky top-0 z-10">
            <SidebarTrigger className="mr-3" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-[var(--nrc-gold)] flex items-center justify-center text-[var(--nrc-green-dark)]">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div className="font-bold text-sm">
                Sound<span className="text-[var(--nrc-gold)]">Campaign</span>
                <span className="text-[10px] ml-1.5 text-muted-foreground uppercase tracking-wide">Admin</span>
              </div>
            </div>
            <div className="ml-auto text-xs text-muted-foreground hidden sm:block">
              Signed in as <span className="font-semibold text-foreground">{me.profile?.display_name || me.profile?.username}</span>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            <AdminReadOnlyContext.Provider value={!isSuper}>
            {!isSuper && (
              <div className="mb-4 rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                Limited admin access — you can view records and use "View as User". You can create training accounts and fully manage only the ones you created; you cannot approve payments or upgrades.
              </div>
            )}
            {shown === "overview"      && (
              <Overview onOpenThread={(id) => { setChatThreadId(id); setSection("chat"); }} />
            )}
            {shown === "users"         && <UserManagement />}
            
            {shown === "warehouse"     && <SongWarehouse />}
            {shown === "training"      && <TrainingAccounts />}
            {shown === "payments"      && <Payments />}
            {shown === "upgrades"      && <Upgrades />}
            {shown === "admins"        && <ManageAdmins />}
            {shown === "settings"      && <PlatformSettingsPanel />}
            {shown === "chat"          && <LiveChat key={chatThreadId ?? "default"} initialThreadId={chatThreadId} />}
            {shown === "announcements" && <Announcements />}
            </AdminReadOnlyContext.Provider>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

const WAREHOUSE_TIERS = [
  { key: "basic",     label: "Basic",     perSub: 30 },
  { key: "advance",   label: "Advance",   perSub: 35 },
  { key: "pro",       label: "Pro",       perSub: 40 },
  { key: "elite",     label: "Elite",     perSub: 45 },
  { key: "unlimited", label: "Unlimited", perSub: 50 },
] as const;

function SongWarehouse() {
  const qc = useQueryClient();
  const [tier, setTier] = useState<typeof WAREHOUSE_TIERS[number]["key"]>("basic");
  const [openDay, setOpenDay] = useState<number | null>(1);
  const [openGroup, setOpenGroup] = useState<string | null>("A");
  const [editing, setEditing] = useState<{ key: string; song: Song } | null>(null);
  const [songMap, setSongMap] = useState<Record<string, Song[]>>({});
  const { data: savedMap } = useWarehouseSongs();
  const readOnly = useAdminReadOnly();

  // Saved data stays authoritative across other administrator sessions.
  useEffect(() => {
    if (savedMap) setSongMap(savedMap);
  }, [savedMap]);

  /** Persist the whole map so price edits reach the exclusive-task dialog instantly. */
  const persistMap = async (m: Record<string, Song[]>) => {
    if (readOnly) throw new Error("Only the Super Admin can change the warehouse");
    await saveWarehouseSongs(m);
    setSongMap(m);
    qc.setQueryData(["warehouse-songs"], m);
  };
  const [bulk, setBulk] = useState<{ key: string; label: string; songs: Song[]; targets: number[] } | null>(null);
  const [sel, setSel] = useState<Record<string, string[]>>({});
  const [pickN, setPickN] = useState("5");

  const current = WAREHOUSE_TIERS.find((t) => t.key === tier) ?? WAREHOUSE_TIERS[0];
  const days = [1, 2, 3, 4, 5];
  const perDay = current.perSub * 2;
  const premiumCount = 5;
  const [premiumOpen, setPremiumOpen] = useState(false);
  const premiumKey = `${tier}-premium`;

  const groupKey = (d: number, g: string) => `${tier}-${d}-${g}`;
  const getSongs = (d: number, g: string, count: number) => {
    const k = groupKey(d, g);
    if (savedMap?.[k]) return savedMap[k];
    if (!songMap[k]) {
      const generated = makeSongs(tier, d, g, count);
      // seed lazily
      setTimeout(() => setSongMap((m) => (m[k] ? m : { ...m, [k]: generated })), 0);
      return generated;
    }
    return songMap[k];
  };

  const updateSong = async (k: string, updated: Song) => {
    await persistMap({ ...songMap, [k]: (songMap[k] || []).map((s) => s.id === updated.id ? updated : s) });
  };
  const deleteSong = async (k: string, id: string) => {
    try {
      await persistMap({ ...songMap, [k]: (songMap[k] || []).filter((s) => s.id !== id) });
      toast.success("Song removed");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not remove song"); }
  };

  // ---- selection helpers (per group key) ----
  const selIds = (k: string) => sel[k] ?? [];
  const setSelFor = (k: string, ids: string[]) => setSel((m) => ({ ...m, [k]: ids }));
  const toggleSel = (k: string, id: string) =>
    setSel((m) => {
      const cur = m[k] ?? [];
      return { ...m, [k]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] };
    });
  const selectAll = (k: string, songs: Song[]) => setSelFor(k, songs.map((s) => s.id));
  const clearSel = (k: string) => setSelFor(k, []);
  const selectSequential = (k: string, songs: Song[], n: number) =>
    setSelFor(k, songs.slice(0, Math.max(0, Math.min(n, songs.length))).map((s) => s.id));
  const selectRandom = (k: string, songs: Song[], n: number) => {
    const shuffled = [...songs].sort(() => Math.random() - 0.5);
    setSelFor(k, shuffled.slice(0, Math.max(0, Math.min(n, songs.length))).map((s) => s.id));
  };

  const getPremium = () => {
    if (savedMap?.[premiumKey]) return savedMap[premiumKey];
    if (!songMap[premiumKey]) {
      const generated = premiumSongs(tier);
      setTimeout(() => setSongMap((m) => (m[premiumKey] ? m : { ...m, [premiumKey]: generated })), 0);
      return generated;
    }
    return songMap[premiumKey];
  };

  const renderToolbar = (k: string, songs: Song[], label: string) => {
    const selected = selIds(k);
    const selectedSongs = songs.filter((s) => selected.includes(s.id));
    const n = Math.max(1, parseInt(pickN, 10) || 1);
    return (
      <div className="mb-3 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground mr-1">
            {selected.length} of {songs.length} selected
          </span>
          <Button size="sm" variant="outline" onClick={() => selectAll(k, songs)}>Select all</Button>
          <Button size="sm" variant="outline" onClick={() => clearSel(k)}>Clear</Button>
          <div className="flex items-center gap-1">
            <Input
              type="number" min={1} max={songs.length} value={pickN}
              onChange={(e) => setPickN(e.target.value)}
              className="h-8 w-16 text-xs"
            />
            <Button size="sm" variant="outline" onClick={() => selectSequential(k, songs, n)}>
              First {n}
            </Button>
            <Button size="sm" variant="outline" onClick={() => selectRandom(k, songs, n)}>
              Random {n}
            </Button>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          {!readOnly && <Button size="sm" variant="outline"
            onClick={() => {
              if (selectedSongs.length === 0) return toast.error("Select songs first — use Select all, First N, Random N, or tap songs");
              const targets = songs.map((s, i) => (selected.includes(s.id) ? i : -1)).filter((i) => i >= 0);
              setBulk({ key: k, label, songs, targets });
            }}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Bulk upload ({selected.length})
          </Button>}
          <Button size="sm" variant="outline"
            onClick={async () => {
              if (selectedSongs.length === 0) return toast.error("Select songs first — use Select all, First N, Random N, or tap songs");
              const id = toast.loading(`Preparing ${selectedSongs.length} songs…`);
              try {
                const { downloadSongsZip } = await import("@/lib/songDownload");
                const { failed } = await downloadSongsZip(selectedSongs, `${current.label} ${label}`);
                toast.success(failed ? `Downloaded (${failed} files couldn't be fetched — links are in titles.csv)` : "Download ready", { id });
              } catch (e: any) {
                toast.error(e?.message ?? "Download failed", { id });
              }
            }}>
            Bulk download ({selected.length})
          </Button>
        </div>
      </div>
    );
  };

  const renderCard = (s: Song, k: string) => (
    <div key={s.id}
      className={`rounded-lg border bg-card overflow-hidden flex flex-col cursor-pointer transition ${
        selIds(k).includes(s.id) ? "ring-2 ring-orange-500 border-orange-500" : "hover:border-orange-300"
      }`}
      onClick={() => toggleSel(k, s.id)}>
      <div className="relative">
        <img src={s.poster} alt="" className="w-full h-36 object-cover" />
        <div className={`absolute top-2 left-2 h-5 w-5 rounded border flex items-center justify-center text-[11px] font-bold ${
          selIds(k).includes(s.id) ? "bg-orange-500 border-orange-500 text-white" : "bg-white/80 border-muted-foreground/40 text-transparent"
        }`}>
          ✓
        </div>
        {s.exclusive && (
          <span className="absolute top-2 right-2 rounded bg-yellow-500 px-1.5 py-0.5 text-[10px] font-bold text-white">PREMIUM</span>
        )}
      </div>
      <div className="p-3 flex-1 flex flex-col">
        <div className="text-sm font-medium truncate">
          {(() => {
            const sep = s.name.indexOf(" — ") !== -1 ? " — " : s.name.includes(" by ") ? " by " : null;
            const title = sep ? s.name.slice(0, s.name.indexOf(sep)) : s.name;
            const artist = sep ? s.name.slice(s.name.indexOf(sep) + sep.length) : null;
            const q = (text: string) => `https://www.google.com/search?q=${encodeURIComponent(text)}`;
            return (
              <>
                <a
                  href={q(s.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline cursor-pointer"
                  title={`Search Google: ${s.name}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {title}
                </a>
                {artist && (
                  <>
                    {" — "}
                    <a
                      href={q(artist)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:underline cursor-pointer"
                      title={`Search Google: ${artist}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {artist}
                    </a>
                  </>
                )}
              </>
            );
          })()}
        </div>
        <div className="text-orange-500 font-semibold text-sm mt-1">${s.amount}</div>
        <div className="text-[11px] text-muted-foreground">{s.commission}% comm</div>
        <div className="text-[11px] text-muted-foreground">♪ Audio attached</div>
        <div className="mt-3 flex items-center gap-1 border-t pt-2">
          <Button size="sm" variant="ghost" className="flex-1 h-8"
            aria-label={`Play ${s.name}`}
            onClick={(e) => { e.stopPropagation(); const a = new Audio(s.audio); a.play().catch(() => {}); }}>
            ▶
          </Button>
          {!readOnly && (<>
          <Button size="sm" variant="ghost" className="flex-1 h-8"
            aria-label={`Edit ${s.name}`}
            onClick={(e) => { e.stopPropagation(); setEditing({ key: k, song: s }); }}>
            <Edit3 className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="flex-1 h-8 text-destructive"
            aria-label={`Delete ${s.name}`}
            onClick={(e) => { e.stopPropagation(); deleteSong(k, s.id); }}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          </>)}
        </div>
      </div>
    </div>
  );

  if (!savedMap) return <div className="p-6 text-sm text-muted-foreground">Loading warehouse…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Song Warehouse</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Catalog of promotable tracks across partners, grouped by subscription tier.
        </p>
      </div>

      <div className="grid grid-cols-5 rounded-lg bg-muted p-1 text-sm">
        {WAREHOUSE_TIERS.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTier(t.key); setOpenDay(1); setOpenGroup("A"); }}
            className={`py-2 rounded-md transition ${
              tier === t.key ? "bg-background shadow font-semibold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {days.map((d) => {
          const isOpen = openDay === d;
          return (
            <div key={d} className="rounded-lg border bg-card overflow-hidden">
              <button
                onClick={() => { setOpenDay(isOpen ? null : d); setOpenGroup("A"); }}
                className={`w-full flex items-center justify-between px-4 py-3 transition ${
                  isOpen ? "bg-orange-500 text-white" : "hover:bg-muted/50"
                }`}
              >
                <span className="font-medium">Day {d}</span>
                <span className={`text-sm ${isOpen ? "text-white/90" : "text-muted-foreground"}`}>{perDay} songs</span>
              </button>
              {isOpen && (
                <div className="border-t">
                  {(["A", "B"] as const).map((sub) => {
                    const gOpen = openGroup === sub;
                    const k = groupKey(d, sub);
                    const songs = gOpen ? getSongs(d, sub, current.perSub) : [];
                    return (
                      <div key={sub} className="border-b last:border-b-0">
                        <button
                          onClick={() => setOpenGroup(gOpen ? null : sub)}
                          className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/40"
                        >
                          <div className="text-sm font-medium">Group {sub}</div>
                          <div className="text-xs text-muted-foreground">{current.perSub} items</div>
                        </button>
                        {gOpen && (
                          <div className="p-4 bg-muted/30">
                            {renderToolbar(k, songs, `Day ${d} · Group ${sub}`)}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                              {songs.map((s) => renderCard(s, k))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        <div className="rounded-lg border bg-card overflow-hidden">
          <button
            onClick={() => setPremiumOpen((o) => !o)}
            className={`w-full px-4 py-3 flex items-center justify-between transition ${
              premiumOpen ? "bg-yellow-500 text-white" : "hover:bg-muted/50"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={premiumOpen ? "text-white" : "text-yellow-500"}>★</span>
              <span className="font-medium">Premium Songs — {current.label}</span>
            </div>
            <span className={`text-sm ${premiumOpen ? "text-white/90" : "text-muted-foreground"}`}>{premiumCount} songs</span>
          </button>
          {premiumOpen && (
            <div className="border-t p-4 bg-muted/30">
              {(() => {
                const songs = getPremium();
                return (
                  <>
                    {renderToolbar(premiumKey, songs, "Premium")}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                      {songs.map((s) => renderCard(s, premiumKey))}
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      <EditSongDialog
        editing={editing}
        onClose={() => setEditing(null)}
        onSave={async (updated) => {
          if (!editing) return;
          await updateSong(editing.key, updated);
          setEditing(null);
          toast.success("Song updated");
        }}
      />

      <BulkSongUpload
        open={!!bulk}
        groupLabel={bulk?.label ?? ""}
        existing={bulk?.songs ?? []}
        targets={bulk?.targets}
        onClose={() => setBulk(null)}
        onApply={async (songs) => { if (bulk) await persistMap({ ...songMap, [bulk.key]: songs }); }}
      />
    </div>
  );
}

function EditSongDialog({
  editing, onClose, onSave,
}: {
  editing: { key: string; song: Song } | null;
  onClose: () => void;
  onSave: (s: Song) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Song | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setDraft(editing?.song ?? null); }, [editing]);
  if (!editing || !draft) return null;
  const profit = ((draft.amount * draft.commission) / 100).toFixed(2);
  return (
    <Dialog open={!!editing} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Song</DialogTitle>
          <DialogDescription>Update song details</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Song Name</Label>
            <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <div>
            <Label>Poster Photo/Video URL</Label>
            <Input value={draft.poster} onChange={(e) => setDraft({ ...draft, poster: e.target.value })} />
          </div>
          <div>
            <Label>Audio (URL)</Label>
            <Input value={draft.audio} onChange={(e) => setDraft({ ...draft, audio: e.target.value })} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Amount ($)</Label>
              <Input type="number" value={draft.amount}
                onChange={(e) => setDraft({ ...draft, amount: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Commission (%)</Label>
              <Input type="number" step="0.1" value={draft.commission}
                onChange={(e) => setDraft({ ...draft, commission: Number(e.target.value) })} />
            </div>
          </div>
          <div className="text-sm text-orange-500 font-medium">Profit: ${profit}</div>
        </div>
        <DialogFooter>
          <Button className="w-full bg-orange-500 hover:bg-orange-600" disabled={saving} onClick={async () => {
            if (!Number.isFinite(draft.amount) || draft.amount <= 0 || !Number.isFinite(draft.commission) || draft.commission < 0) return toast.error("Enter a valid cost and commission");
            setSaving(true);
            try { await onSave(draft); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not save song"); } finally { setSaving(false); }
          }}>
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdminSidebar({ section, setSection, menu }: { section: Section; setSection: (s: Section) => void; menu: typeof MENU }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="flex flex-col h-full">
        <div className="p-4">
          {!collapsed && (
            <span className="text-sm font-bold text-sidebar-foreground">
              Sound<span className="text-[var(--nrc-gold)]">Campaign</span>
              <span className="text-[10px] ml-1 text-sidebar-foreground/50 uppercase">Admin</span>
            </span>
          )}
        </div>
        <SidebarGroup>
          <SidebarGroupLabel>Admin</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menu.map((item) => {
                const active = section === item.key;
                return (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                      isActive={active}
                      onClick={() => setSection(item.key)}
                      className={active ? "bg-sidebar-accent text-sidebar-primary font-medium" : "hover:bg-sidebar-accent/50"}
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <div className="mt-auto p-3 space-y-1">
          <Button
            variant="ghost" size="sm"
            onClick={() => navigate({ to: "/dashboard" })}
            className="w-full justify-start text-sidebar-foreground/70"
          >
            <LayoutDashboard className="h-4 w-4 mr-2" />
            {!collapsed && "Back to app"}
          </Button>
          <Button
            variant="ghost" size="sm"
            onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/auth" }); }}
            className="w-full justify-start text-sidebar-foreground/60 hover:text-sidebar-foreground"
          >
            <LogOut className="h-4 w-4 mr-2" />
            {!collapsed && "Logout"}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

/* ---------- Overview ---------- */
function Overview({ onOpenThread }: { onOpenThread: (id: string) => void }) {
  const { isSeen, markSeen } = useSeen();
  const { data } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const [users, txs, anns] = await Promise.all([
        supabase.from("profiles").select("id, balance, vip_level, is_training, username, display_name", { count: "exact" }),
        supabase.from("mock_transactions").select("id, user_id, status, amount, kind, created_at")
          .in("kind", ["recharge", "deposit", "withdraw", "upgrade"])
          .eq("status", "pending")
          .order("created_at", { ascending: false }).limit(20),
        supabase.from("announcements").select("id", { count: "exact", head: true }),
      ]);
      const allUsers = users.data ?? [];
      const realUsers = allUsers.filter((u) => !u.is_training);
      const realIds = new Set(realUsers.map((u) => u.id));
      // Only pending deposits/withdrawals/upgrades from REAL users
      const recent = (txs.data ?? []).filter((t) => realIds.has(t.user_id));
      // Real users currently on a negative balance
      const negativeUsers = realUsers
        .filter((u) => Number(u.balance ?? 0) < 0)
        .map((u) => ({ id: u.id, name: u.display_name || u.username, balance: Number(u.balance) }));
      return {
        totalUsers: users.count ?? 0,
        totalAnns: anns.count ?? 0,
        pending: recent.length,
        recent,
        negativeUsers,
      };
    },
  });

  const stats = [
    { label: "Total Users",      value: data?.totalUsers ?? "—", icon: Users },
    { label: "Pending Payments", value: data?.pending ?? "—", icon: ArrowUpCircle },
    { label: "VIP Plans",        value: MEMBERSHIP_TIERS.length, icon: Settings },
  ];
  const { data: allThreads = [] } = useAllChats();
  useChatRealtime([["support-chat-all"]]);
  const threads = allThreads.filter((t) => t.unread > 0 && !isSeen(`thread:${t.id}`));
  const recent = (data?.recent ?? []).filter((t) => !isSeen(`tx:${t.id}`));
  const negativeUsers = (data?.negativeUsers ?? []).filter((u) => !isSeen(`neg:${u.id}`));
  const unread = threads.reduce((a, t) => a + t.unread, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-sm text-muted-foreground">Snapshot of platform activity.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{s.label}</span>
              <s.icon className="w-4 h-4 text-[var(--nrc-gold)]" />
            </div>
            <div className="mt-2 text-xl font-bold">{s.value}</div>
          </div>
        ))}
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 font-semibold border-b border-border flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-[var(--nrc-gold)]" /> Incoming Messages
          {unread > 0 && (
            <span className="text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full px-2 py-0.5">{unread}</span>
          )}
          <span className="ml-auto text-xs text-muted-foreground">Live chat</span>
        </div>
        <ul className="divide-y divide-border max-h-80 overflow-auto">
          {threads.length === 0 && (
            <li className="px-4 py-6 text-sm text-muted-foreground text-center">No new messages.</li>
          )}
          {threads.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => { markSeen(`thread:${t.id}`); onOpenThread(t.id); }}
                className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-accent/50 transition-colors"
              >
              <span className="w-8 h-8 rounded-full bg-[var(--nrc-green)] text-primary-foreground grid place-items-center text-[11px] font-bold shrink-0">{t.initials}</span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{t.name}</div>
                <div className="text-[11px] text-muted-foreground truncate">{t.preview}</div>
              </div>
              <span className="text-[11px] text-muted-foreground shrink-0">{new Date(t.lastAt).toLocaleString()}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 font-semibold border-b border-border">Recent activity</div>
        {recent.length === 0 && negativeUsers.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground text-center">No new activity.</div>
        ) : (
          <ul className="divide-y divide-border">
            {recent.map((t) => (
              <li key={t.id}>
              <button
                type="button"
                onClick={() => markSeen(`tx:${t.id}`)}
                className="w-full px-4 py-3 text-sm flex items-center justify-between text-left hover:bg-accent/50 transition-colors"
              >
                <div>
                  <div className="font-medium capitalize">
                    {t.kind === "upgrade" ? "Upgrade request" : isDeposit(t.kind) ? "Deposit" : "Withdrawal"} · {formatNaira(Number(t.amount))}
                  </div>
                  <div className="text-[11px] text-muted-foreground">{new Date(t.created_at).toLocaleString()}</div>
                </div>
                <StatusBadge status={t.status} />
              </button>
              </li>
            ))}
            {negativeUsers.map((u) => (
              <li key={`neg-${u.id}`}>
              <button
                type="button"
                onClick={() => markSeen(`neg:${u.id}`)}
                className="w-full px-4 py-3 text-sm flex items-center justify-between text-left hover:bg-accent/50 transition-colors"
              >
                <div>
                  <div className="font-medium">Negative balance · {u.name}</div>
                  <div className="text-[11px] text-muted-foreground">Balance: {formatNaira(u.balance)}</div>
                </div>
                <span className="text-[10px] uppercase font-semibold px-2 py-1 rounded bg-destructive text-destructive-foreground">Negative</span>
              </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls = status === "approved" ? "bg-[var(--nrc-green)] text-primary-foreground"
    : status === "rejected" ? "bg-destructive text-destructive-foreground"
    : "bg-muted text-muted-foreground";
  return <span className={`text-[10px] uppercase font-semibold px-2 py-1 rounded ${cls}`}>{status}</span>;
}

/* ---------- Payments / Upgrades (shared queue) ---------- */
function useTxQueue(kindFilter?: (kind: string) => boolean) {
  const qc = useQueryClient();
  const { data: txs = [] } = useQuery({
    queryKey: ["admin-tx"],
    queryFn: async () => (await supabase.from("mock_transactions").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const review = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "rejected" }) => {
      const row = (txs as any[]).find((t) => t.id === id);
      const { error } = await supabase.from("mock_transactions")
        .update({ status, reviewed_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
      // Apply the money movement only when a pending payment is approved.
      if (row && row.status === "pending" && status === "approved") {
        const amount = Number(row.amount) || 0;
        if (isDeposit(row.kind)) await adjustBalance(row.user_id, amount);
        else if (row.kind === "withdraw") await adjustBalance(row.user_id, -amount);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-tx"] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["me"] });
      toast.success("Updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = kindFilter ? txs.filter((t: any) => kindFilter(t.kind)) : txs;
  return { txs: filtered, review };
}

function TxQueueList({ rows, onReview }: { rows: any[]; onReview: (id: string, status: "approved" | "rejected") => void }) {
  if (rows.length === 0) return <div className="p-6 text-sm text-muted-foreground text-center">Queue is empty.</div>;
  return (
    <ul className="divide-y divide-border">
      {rows.map((t) => (
        <li key={t.id} className="px-4 py-3 text-sm flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="font-medium capitalize">{t.kind} · {formatNaira(Number(t.amount))}</div>
            <div className="text-[11px] text-muted-foreground truncate">{t.note || "—"} · {new Date(t.created_at).toLocaleString()}</div>
            <div className="mt-1"><StatusBadge status={t.status} /></div>
          </div>
          {t.status === "pending" && (
            <div className="flex gap-1 shrink-0">
              <Button size="sm" onClick={() => onReview(t.id, "approved")}><Check className="w-4 h-4" /></Button>
              <Button size="sm" variant="destructive" onClick={() => onReview(t.id, "rejected")}><X className="w-4 h-4" /></Button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

const PAY_KINDS = ["recharge", "deposit", "withdraw"];
const isDeposit = (k: string) => k === "recharge" || k === "deposit";

function usePayProfiles(ids: string[]) {
  const key = [...new Set(ids)].sort().join(",");
  return useQuery({
    queryKey: ["pay-profiles", key],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, username, display_name").in("id", [...new Set(ids)]);
      const map: Record<string, string> = {};
      (data ?? []).forEach((p: any) => { map[p.id] = p.display_name || p.username; });
      return map;
    },
  });
}

function Payments() {
  const readOnly = useAdminReadOnly();
  const { txs, review } = useTxQueue((k) => PAY_KINDS.includes(k));
  const [tab, setTab] = useState<"all" | "deposits" | "withdrawals">("all");
  const [userId, setUserId] = useState<string | null>(null);
  const [histOpen, setHistOpen] = useState(false);
  const [editTx, setEditTx] = useState<any>(null);

  const { data: names = {} } = usePayProfiles(txs.map((t: any) => t.user_id));

  const rows = useMemo(() => {
    if (tab === "all") return txs.filter((t: any) => t.status === "pending");
    if (tab === "deposits") return txs.filter((t: any) => isDeposit(t.kind) && t.status !== "pending");
    return txs.filter((t: any) => t.kind === "withdraw" && t.status !== "pending");
  }, [txs, tab]);

  const userRows = useMemo(
    () => (userId ? txs.filter((t: any) => t.user_id === userId && t.status !== "pending") : []),
    [txs, userId],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Payments</h1>
          <p className="text-sm text-muted-foreground">Deposit and withdrawal requests.</p>
        </div>
        {!readOnly && <Button size="sm" onClick={() => { setEditTx(null); setHistOpen(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Generate history
        </Button>}
      </div>

      <div className="flex gap-2">
        {([["all", "All (Pending)"], ["deposits", "Deposits"], ["withdrawals", "Withdrawals"]] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`text-xs font-semibold px-3 py-2 rounded-lg border ${tab === k ? "bg-[var(--nrc-green)] text-primary-foreground border-transparent" : "border-border bg-card"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <PayList
          rows={rows}
          names={names}
          onUser={tab === "all" ? undefined : setUserId}
          readOnly={readOnly}
          onEdit={readOnly ? undefined : (t) => { setEditTx(t); setHistOpen(true); }}
          onReview={(id, status) => review.mutate({ id, status })}
        />
      </div>

      <Dialog open={!!userId} onOpenChange={(o) => !o && setUserId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{userId ? names[userId] ?? "User" : ""}</DialogTitle>
            <DialogDescription>All approved and rejected deposits and withdrawals.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto -mx-6">
            <PayList
              rows={userRows}
              names={names}
              readOnly={readOnly}
              onEdit={readOnly ? undefined : (t) => { setEditTx(t); setHistOpen(true); }}
              onReview={() => {}}
            />
          </div>
        </DialogContent>
      </Dialog>

      <PaymentHistoryDialog
        open={histOpen}
        onOpenChange={setHistOpen}
        tx={editTx}
        defaultUserId={userId}
      />
    </div>
  );
}


function proofPath(note: string | null): string | null {
  const m = /proof:(\S+)/.exec(note ?? "");
  return m ? m[1]! : null;
}

function ReceiptViewer({ path }: { path: string }) {
  const [open, setOpen] = useState(false);
  const { data: url, isLoading } = useQuery({
    queryKey: ["deposit-proof", path],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("deposit-proofs").createSignedUrl(path, 60 * 10);
      if (error) throw error;
      return data.signedUrl;
    },
  });
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="mt-1 text-[11px] font-semibold text-[var(--nrc-green)] hover:underline"
      >
        View receipt
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Payment receipt</DialogTitle>
            <DialogDescription>Proof of payment uploaded by the user.</DialogDescription>
          </DialogHeader>
          {isLoading && <div className="p-6 text-sm text-muted-foreground text-center">Loading…</div>}
          {url && (
            <div className="space-y-2">
              <img src={url} alt="Deposit payment receipt" className="w-full rounded-lg border border-border max-h-[60vh] object-contain bg-muted" />
              <a href={url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[var(--nrc-green)] hover:underline">Open full size</a>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function PayList({ rows, names, onReview, onUser, onEdit, readOnly = false }: {
  rows: any[]; names: Record<string, string>; readOnly?: boolean;
  onReview: (id: string, status: "approved" | "rejected") => void;
  onUser?: (id: string) => void;
  onEdit?: (tx: any) => void;
}) {
  if (rows.length === 0) return <div className="p-6 text-sm text-muted-foreground text-center">Nothing here.</div>;
  return (
    <ul className="divide-y divide-border">
      {rows.map((t) => {
        const proof = proofPath(t.note);
        return (
        <li key={t.id} className="px-4 py-3 text-sm flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="font-medium">
              {isDeposit(t.kind) ? "Deposit" : "Withdrawal"} · {formatNaira(Number(t.amount))}
            </div>
            {onUser ? (
              <button onClick={() => onUser(t.user_id)} className="text-[12px] font-semibold text-[var(--nrc-green)] hover:underline">
                {names[t.user_id] ?? "Unknown user"}
              </button>
            ) : (
              <div className="text-[12px] font-semibold">{names[t.user_id] ?? "Unknown user"}</div>
            )}
            {walletFromNote(t.note) && (
              <div className="text-[11px] font-mono text-muted-foreground truncate">{shortAddress(walletFromNote(t.note)!)}</div>
            )}
            <div className="text-[11px] text-muted-foreground truncate">{noteText(t.note) || "—"} · {new Date(t.created_at).toLocaleString()}</div>
            {proof && <ReceiptViewer path={proof} />}
            <div className="mt-1"><StatusBadge status={t.status} /></div>
          </div>
          <div className="flex gap-1 shrink-0">
            {onEdit && (
              <Button size="sm" variant="outline" onClick={() => onEdit(t)}><Edit3 className="w-4 h-4" /></Button>
            )}
            {t.status === "pending" && !readOnly && (
              <>
                <Button size="sm" onClick={() => onReview(t.id, "approved")}><Check className="w-4 h-4" /></Button>
                <Button size="sm" variant="destructive" onClick={() => onReview(t.id, "rejected")}><X className="w-4 h-4" /></Button>
              </>
            )}
          </div>

        </li>
        );
      })}
    </ul>
  );
}



function Upgrades() {
  const readOnly = useAdminReadOnly();
  const qc = useQueryClient();
  const { txs } = useTxQueue((k) => k === "vip" || k === UPGRADE_KIND);
  const { data: names = {} } = usePayProfiles(txs.map((t: any) => t.user_id));

  const review = useMutation({
    mutationFn: async ({ row, status }: { row: any; status: "approved" | "rejected" }) => {
      if (status === "approved") {
        const { level } = parseUpgradeNote(row.note);
        if (level !== null) {
          const { error } = await supabase.from("profiles")
            .update({ vip_level: level, level_locked: true }).eq("id", row.user_id);
          if (error) throw error;
          await supabase.from("user_task_settings")
            .update({ upgrade_position: null }).eq("user_id", row.user_id);
        }
      }
      const { error } = await supabase.from("mock_transactions")
        .update({ status, reviewed_at: new Date().toISOString() }).eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-tx"] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["me"] });
      toast.success("Updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const pending = txs.filter((t: any) => t.status === "pending");
  const history = txs.filter((t: any) => t.status !== "pending");

  const List = ({ rows }: { rows: any[] }) => (
    rows.length === 0
      ? <div className="p-6 text-sm text-muted-foreground text-center">Nothing here.</div>
      : <ul className="divide-y divide-border">
          {rows.map((t: any) => (
            <li key={t.id} className="px-4 py-3 text-sm flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="font-medium">{names[t.user_id] ?? "Unknown user"}</div>
                <div className="text-[12px]">{t.note || "Upgrade request"}</div>
                <div className="text-[11px] text-muted-foreground">{new Date(t.created_at).toLocaleString()}</div>
                <div className="mt-1"><StatusBadge status={t.status} /></div>
              </div>
              {t.status === "pending" && !readOnly && (
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" disabled={review.isPending} onClick={() => review.mutate({ row: t, status: "approved" })}><Check className="w-4 h-4" /></Button>
                  <Button size="sm" variant="destructive" disabled={review.isPending} onClick={() => review.mutate({ row: t, status: "rejected" })}><X className="w-4 h-4" /></Button>
                </div>
              )}
            </li>
          ))}
        </ul>
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Upgrades</h1>
        <p className="text-sm text-muted-foreground">Pending level upgrade requests submitted by users.</p>
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-2 text-xs font-bold uppercase bg-muted/50">Pending ({pending.length})</div>
        <List rows={pending} />
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-2 text-xs font-bold uppercase bg-muted/50">History</div>
        <List rows={history} />
      </div>
    </div>
  );
}

/* ---------- Manage Admins ---------- */
function ManageAdmins() {
  const [editing, setEditing] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const [promoteQ, setPromoteQ] = useState("");
  const qc = useQueryClient();
  const setRole = useServerFn(setAdminRole);
  const listAdmins = useServerFn(listAdminAccounts);
  const { data: admins = [], isPending: adminsLoading, error: adminsError } = useQuery({
    queryKey: ["admin-list"],
    queryFn: () => listAdmins(),
  });
  const { data: candidates = [] } = useQuery({
    queryKey: ["admin-promote-search", promoteQ],
    enabled: promoteQ.trim().length >= 2,
    queryFn: async () => {
      const q = promoteQ.trim().replace(/[%,()]/g, "");
      const { data } = await supabase.from("profiles").select("id, username, display_name")
        .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`).limit(8);
      return data ?? [];
    },
  });
  const changeRole = useMutation({
    mutationFn: (v: { userId: string; makeAdmin: boolean }) => setRole({ data: v }),
    onSuccess: (_r, v) => {
      toast.success(v.makeAdmin ? "User promoted to Admin" : "Admin access removed");
      setPromoteQ("");
      qc.invalidateQueries({ queryKey: ["admin-list"] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not change role"),
  });
  const adminIds = new Set(admins.map((a: any) => a.id));
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Manage Admins</h1>
          <p className="text-sm text-muted-foreground">Accounts with administrator role.</p>
        </div>
        <Button size="sm" onClick={() => setCreating(true)}><Plus className="w-4 h-4 mr-1" /> New Admin</Button>
      </div>
      <div className="bg-card border border-border rounded-xl p-4 space-y-2">
        <Label>Promote an existing user to Admin</Label>
        <Input placeholder="Search by username or name…" value={promoteQ} onChange={(e) => setPromoteQ(e.target.value)} />
        {candidates.filter((c: any) => !adminIds.has(c.id)).map((c: any) => (
          <div key={c.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate">{c.display_name || c.username} <span className="text-muted-foreground">@{c.username}</span></span>
            <Button size="sm" disabled={changeRole.isPending}
              onClick={() => { if (confirm(`Make ${c.username} a read-only Admin?`)) changeRole.mutate({ userId: c.id, makeAdmin: true }); }}>
              Make Admin
            </Button>
          </div>
        ))}
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {adminsError ? <div role="alert" className="p-6 text-sm text-destructive">Could not load administrator accounts. Please refresh and try again.</div>
          : adminsLoading ? <div className="p-6 text-sm text-muted-foreground text-center">Loading…</div>
          : admins.length === 0
          ? <div className="p-6 text-sm text-muted-foreground text-center">No admins.</div>
          : (
            <ul className="divide-y divide-border">
              {admins.map((a: any) => (
                <li key={a.id} className="px-4 py-3 text-sm flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{a.display_name || a.username}</div>
                    <div className="text-[11px] text-muted-foreground truncate">@{a.username}{a.phone ? ` · ${a.phone}` : ""}</div>
                    <div className="text-xs text-muted-foreground break-all">Login email: {a.email}</div>
                    <div className="mt-1 flex flex-wrap items-baseline gap-x-2 text-xs">
                      <span className="text-muted-foreground">Referral code</span>
                      <span className="font-mono font-semibold break-all">{a.invite_code || "—"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className="bg-[var(--nrc-gold)] text-[var(--nrc-green-dark)]">{a.isSuper ? "Super Admin" : "Admin"}</Badge>
                    <Button size="sm" variant="outline" onClick={() => setEditing(a)}>Edit</Button>
                    {!a.isSuper && (
                      <Button size="sm" variant="outline" className="text-destructive" disabled={changeRole.isPending}
                        onClick={() => { if (confirm(`Remove admin access from ${a.username}?`)) changeRole.mutate({ userId: a.id, makeAdmin: false }); }}>
                        Remove Admin
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )
        }
      </div>
      {editing && (
        <AccountEditDialog
          account={editing}
          open={!!editing}
          onClose={() => setEditing(null)}
          invalidateKeys={[["admin-list"], ["admin-users"]]}
        />
      )}
      <NewAdminDialog open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}

function NewAdminDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const create = useServerFn(createAdminAccount);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");

  const save = useMutation({
    mutationFn: async () => create({ data: { email, password, username, displayName, phone } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-list"] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Admin created");
      setEmail(""); setPassword(""); setUsername(""); setDisplayName(""); setPhone("");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const valid = adminAccountSchema.safeParse({ email, password, username, displayName, phone }).success;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Admin</DialogTitle>
          <DialogDescription>This account signs in straight into the admin panel.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div><Label htmlFor="admin-email">Email</Label><Input id="admin-email" type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div><Label htmlFor="admin-password">Password</Label><Input id="admin-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="admin-username">Username</Label><Input id="admin-username" autoComplete="off" value={username} onChange={(e) => setUsername(e.target.value)} /></div>
            <div><Label>Display name</Label><Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></div>
          </div>
          <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!valid || save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? "Creating…" : "Create admin"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


/* ---------- Announcements ---------- */
function Announcements() {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const { data: rows = [] } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => (await supabase.from("announcements").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const create = useMutation({
    mutationFn: async (message: string) => {
      const { error } = await supabase.from("announcements").insert({ message, active: true });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["announcements"] }); setText(""); toast.success("Posted"); },
    onError: (e: any) => toast.error(e.message),
  });
  const toggle = useMutation({
    mutationFn: async (r: { id: string; active: boolean }) => {
      const { error } = await supabase.from("announcements").update({ active: !r.active }).eq("id", r.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["announcements"] }); toast.success("Announcement updated"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("announcements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["announcements"] }); toast.success("Deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Announcements</h1>
        <p className="text-sm text-muted-foreground">Messages displayed in the home page ticker.</p>
      </div>
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <Textarea placeholder="New announcement…" value={text} onChange={(e)=>setText(e.target.value)} rows={2} />
        <Button onClick={()=> text.trim() && create.mutate(text.trim())} disabled={!text.trim() || create.isPending}>
          <Plus className="w-4 h-4 mr-1" /> Post
        </Button>
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {rows.length === 0
          ? <div className="p-6 text-sm text-muted-foreground text-center">No announcements.</div>
          : <ul className="divide-y divide-border">
              {rows.map((r: any) => (
                <li key={r.id} className="px-4 py-3 text-sm flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{r.message}</div>
                    <div className="text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
                  </div>
                  <Button size="sm" variant={r.active ? "default" : "outline"} onClick={()=>toggle.mutate(r)}>
                    {r.active ? "Active" : "Hidden"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={()=>remove.mutate(r.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>}
      </div>
    </div>
  );
}

/* ---------- Placeholder for un-backed sections ---------- */
function PlaceholderSection({ title, desc, icon: Icon }: { title: string; desc: string; icon: typeof LayoutDashboard }) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
      <div className="bg-card border border-border rounded-xl p-10 text-center">
        <Icon className="w-10 h-10 mx-auto text-[var(--nrc-gold)] mb-3" />
        <div className="font-semibold">Coming soon</div>
        <div className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
          This section was ported from the uploaded admin panel UI. Backing tables for it are not present in this project yet.
        </div>
      </div>
    </div>
  );
}