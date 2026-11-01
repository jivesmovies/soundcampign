import { holdValue } from "@/lib/balance";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { setViewAsId } from "@/lib/hooks";
import { useAdminReadOnly, canManageAccount } from "@/lib/admin-permissions";
import { LEVEL_FOR_TIER_INDEX, WAREHOUSE_GROUPS, WAREHOUSE_TIERS, groupLabelForSeed, groupSeedFromNote, makeSongs, premiumSongs, stickyTier, stickyTierIndex, tierIndexForLevel } from "@/lib/warehouse";
import { useWarehouseSongs } from "@/lib/settings";
import { useExclusiveTasks, useTaskSettings } from "@/lib/exclusive";
import { pairAccounts, matchesAccount } from "@/lib/account-pairing";

import { useServerFn } from "@tanstack/react-start";
import { deleteUserAccount, updateUserAccount, listUserAccounts } from "@/lib/admin.functions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Search, ArrowLeft, MapPin, Mail, Pencil, DollarSign, LogIn, Ban, Trash2, ArrowUpCircle, Eye, EyeOff, Save, Plus, Minus, RotateCcw, XCircle, FileText, Layers, Gift,
} from "lucide-react";
import { toast } from "sonner";


const TIER_NAME: Record<string, string> = {
  basic: "NORMAL", advance: "SILVER", pro: "GOLD", elite: "PLATINUM", unlimited: "DIAMOND",
};

function useUsers() {
  const list = useServerFn(listUserAccounts);
  return useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => list({ data: undefined as never }),
  });
}

function useAdminIds() {
  return useQuery({
    queryKey: ["admin-role-ids"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      return new Set((data ?? []).map((r: any) => r.user_id));
    },
  });
}

export function UserManagement() {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { data: all = [] } = useUsers();
  const { data: adminIds } = useAdminIds();

  useEffect(() => {
    const refreshUsers = () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-role-ids"] });
    };

    const channel = supabase
      .channel("admin-user-list-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, refreshUsers)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_roles" }, refreshUsers)
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const pairs = useMemo(() => pairAccounts(all, adminIds), [all, adminIds]);
  const filtered = useMemo(() => pairs.filter((pair) =>
    (pair.referrer && matchesAccount(pair.referrer, q)) || pair.training.some((account) => matchesAccount(account, q))), [pairs, q]);
  const realCount = all.filter((account) => !account.is_training && !adminIds?.has(account.id)).length;
  const trainingCount = all.filter((account) => account.is_training).length;
  const current = all.find((u) => u.id === selected);
  if (current) return <UserDetail user={current} onBack={() => setSelected(null)} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-sm text-muted-foreground">{realCount} real accounts · {trainingCount} training accounts</p>
        </div>
        <div className="relative w-64 max-w-full">
          <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search users…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-muted-foreground">
        <div>Real accounts</div><div>Training accounts</div>
      </div>
      <div className="space-y-3">
        {filtered.map((pair) => (
          <div key={pair.key} data-account-pair={pair.key} className="grid grid-cols-2 items-start gap-2">
            <div className="min-w-0">
              {pair.referrer ? <AccountCard user={pair.referrer} onSelect={() => setSelected(pair.referrer?.id ?? null)} />
                : <div className="p-3 text-xs text-muted-foreground">No linked referrer</div>}
            </div>
            <div className="min-w-0 space-y-2">
              {pair.training.map((account) => <AccountCard key={account.id} user={account} onSelect={() => setSelected(account.id)} />)}
              {!pair.training.length && <div className="p-3 text-xs text-muted-foreground">No training accounts</div>}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">No matches.</div>}
      </div>
    </div>
  );
}

function AccountCard({ user, onSelect }: { user: Awaited<ReturnType<typeof listUserAccounts>>[number]; onSelect: () => void }) {
  const tier = user.level_locked ? WAREHOUSE_TIERS[tierIndexForLevel(user.vip_level)] : stickyTier(user.balance, user.vip_level);
  return (
    <Button variant="outline" onClick={onSelect} data-account-id={user.id}
      className="h-auto w-full min-w-0 whitespace-normal justify-start bg-card px-2 py-3 text-left sm:px-3">
      <span className="hidden lg:grid w-10 h-10 rounded-full bg-primary text-primary-foreground place-items-center font-bold text-xs shrink-0">
        {(user.display_name || user.username || "?").slice(0, 2).toUpperCase()}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1">
          <span className="font-semibold break-all">{user.display_name || user.username}</span>
          <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{user.is_training ? "Training" : "Real"}</span>
        </span>
        <span className="block text-[11px] text-muted-foreground break-all">@{user.username}{user.phone ? ` · ${user.phone}` : ""}</span>
        <span className="flex flex-wrap items-center justify-between gap-1 mt-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-muted">{TIER_NAME[tier.key]}</span>
          <span className="text-sm font-black text-primary">${Number(user.balance).toFixed(2)}</span>
        </span>
      </span>
    </Button>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}

export function UserDetail({ user, onBack }: { user: any; onBack: () => void }) {
  const restricted = useAdminReadOnly();
  const { data: myId } = useQuery({
    queryKey: ["auth-uid"],
    queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null,
  });
  const readOnly = !canManageAccount(!restricted, myId, user);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [fundsOpen, setFundsOpen] = useState(false);
  const [levelOpen, setLevelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [exclusiveOpen, setExclusiveOpen] = useState(false);
  const [setUpgradeOpen, setSetUpgradeOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [rewardOpen, setRewardOpen] = useState(false);
  const { data: settings } = useTaskSettings(user.id);
  const { data: exclusives = [] } = useExclusiveTasks(user.id);
  const tier = user.level_locked
    ? WAREHOUSE_TIERS[tierIndexForLevel(user.vip_level)]
    : stickyTier(user.balance, user.vip_level);


  const suspend = useMutation({
    mutationFn: async (next: boolean) => {
      const { error } = await supabase.from("profiles").update({ suspended: next }).eq("id", user.id);
      if (error) throw error;
      return next;
    },
    onSuccess: (next) => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["training-accounts"] });
      toast.success(next ? "User suspended — they can no longer sign in" : "User unsuspended");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const { data: txs = [] } = useQuery({
    queryKey: ["admin-tx"],
    queryFn: async () => (await supabase.from("mock_transactions").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const onHold = txs
    .filter((t: any) => t.user_id === user.id && t.status === "pending")
    .reduce((a: number, b: any) => a + holdValue(b), 0);

  const promoTx = txs.filter((t: any) => t.user_id === user.id && t.kind === "promotion");
  const submittedCount = promoTx.filter((t: any) => t.status !== "pending").length;
  const quota = tier.perSub;
  const submittedShown = Math.min(submittedCount, quota);
  const negative = Number(user.balance) < 0;
  const currentSeed = settings?.group_seed ?? 0;
  const usedSeeds = new Set<number>(
    promoTx.map((t: any) => groupSeedFromNote(t.note)).filter((v: number | null): v is number => v !== null),
  );
  if (promoTx.length > 0) usedSeeds.add(currentSeed);

  const setLevel = useMutation({
    mutationFn: async (index: number) => {
      if (submittedCount > WAREHOUSE_TIERS[index].perSub) {
        throw new Error(
          `Clear this user's records first — they have ${submittedCount} submitted tasks, above the ${WAREHOUSE_TIERS[index].label} limit of ${WAREHOUSE_TIERS[index].perSub}.`,
        );
      }
      const { error } = await supabase.from("profiles")
        .update({ vip_level: LEVEL_FOR_TIER_INDEX[index], level_locked: true })
        .eq("id", user.id);
      if (error) throw error;
      return WAREHOUSE_TIERS[index].label;
    },
    onSuccess: (label) => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-tx"] });
      qc.invalidateQueries({ queryKey: ["me"] });
      toast.success(`Level set to ${label}`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const clearNegative = useMutation({
    mutationFn: async () => {
      if (!negative) throw new Error("This user has no negative balance");
      const { error } = await supabase.from("profiles").update({ balance: 0 }).eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-tx"] });
      qc.invalidateQueries({ queryKey: ["me"] });
      toast.success("Negative balance cleared — the user can submit tasks again");
    },
    onError: (e: any) => toast.error(e.message),
  });


  const resetTasks = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("mock_transactions").delete()
        .eq("user_id", user.id).eq("kind", "promotion");
      if (error) throw error;
      const { error: settingsError } = await supabase.from("user_task_settings")
        .upsert({ user_id: user.id, group_seed: (settings?.group_seed ?? 0) + 1, upgrade_position: null, group_assigned: false }, { onConflict: "user_id" });
      if (settingsError) throw settingsError;
      const { error: premiumError } = await supabase.from("user_exclusive_tasks").delete().eq("user_id", user.id);
      if (premiumError) throw premiumError;
      return quota;
    },

    onSuccess: (q) => {
      qc.invalidateQueries({ queryKey: ["admin-tx"] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["today-promos"] });
      qc.invalidateQueries({ queryKey: ["my-tx"] });
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["task-settings", user.id] });
      qc.invalidateQueries({ queryKey: ["exclusive-tasks", user.id] });
      toast.success(`Records cleared — ${tier.label} tasks reset to 0/${q}. Use “Set” to assign a song group before the user can submit`);
    },


    onError: (e: any) => toast.error(e.message),
  });

  const newSongGroup = useMutation({
    mutationFn: async () => {
      const nextSeed = (settings?.group_seed ?? 0) + 1;
      const { error } = await supabase.from("user_task_settings")
        .upsert({ user_id: user.id, group_seed: nextSeed, group_assigned: false }, { onConflict: "user_id" });
      if (error) throw error;
      const { error: premiumError } = await supabase.from("user_exclusive_tasks").delete().eq("user_id", user.id).eq("consumed", false);
      if (premiumError) throw premiumError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task-settings", user.id] });
      qc.invalidateQueries({ queryKey: ["exclusive-tasks", user.id] });
      toast.success("Songs deleted — use “Set” to assign a new group before the user can submit");
    },
    onError: (e: any) => toast.error(e.message),
  });



  const viewAsUser = () => {
    setViewAsId(user.id);
    qc.invalidateQueries({ queryKey: ["me"] });
    toast.success(`Viewing as ${user.display_name || user.username}`);
    navigate({ to: "/dashboard" });
  };


  return (
    <div className="space-y-4 max-w-3xl">
      <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-1" /> Back to users</Button>

      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-full bg-sky-600 text-white grid place-items-center font-black">
          {(user.display_name || user.username || "?").slice(0, 2).toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{user.display_name || user.username}</h1>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-muted">{user.is_training ? "Training Account" : "Real Account"}</span>
          </div>
          <div className="text-sm text-muted-foreground">{user.phone || "—"}</div>
        </div>
      </div>

      <div className="rounded-xl bg-sky-500/10 px-4 py-3 flex items-center gap-2 text-sm">
        <MapPin className="w-4 h-4 text-sky-600" />
        <div>
          <div className="text-xs text-muted-foreground">Current Location</div>
          <div className="font-semibold">Los Angeles, California, United States</div>
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> Email</div>
        <div className="text-sm font-semibold">{user.email || `${user.username}@soundcampaign.demo`}</div>
      </div>

      <div className="grid grid-cols-2 gap-4 bg-card border border-border rounded-xl p-4">
        <Field label="Phone" value={user.phone || "—"} />
        <Field label="Invitation Code" value={<span className="font-mono">{user.invite_code}</span>} />
        <Field label="Membership Level" value={<span className="text-[10px] font-bold px-2 py-0.5 rounded bg-muted">{TIER_NAME[tier.key]}</span>} />
        <Field label="Account Type" value={user.is_training ? "Training" : "Real"} />
        <Field label="Wallet Balance" value={`$${Number(user.balance).toFixed(2)}`} />
        <Field label="On Hold Balance" value={`$${onHold.toFixed(2)}`} />
        <Field label="Status" value={user.suspended
          ? <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-destructive/15 text-destructive">Suspended</span>
          : <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--nrc-green)]/15 text-[var(--nrc-green)]">Active</span>} />
        <Field label="Total Earned" value={`$${Number(user.total_earned).toFixed(2)}`} />
        <Field label="Joined" value={new Date(user.created_at).toLocaleDateString()} />
        <Field label="Team Size" value={user.team_size} />
        <Field label="Total Submitted" value={
          <span className="text-[var(--nrc-gold)] font-black">{submittedShown} / {quota}</span>
        } />
        <Field label="Tasks Available" value={
          <span className="text-[var(--nrc-green)] font-black">{quota - submittedShown} / {quota}</span>
        } />

        <Field label="Exclusive Tasks" value={
          <span className="text-[var(--nrc-gold)] font-black">{exclusives.filter((e) => !e.consumed).length}</span>
        } />
        <Field label="Upgrade Checkpoint" value={settings?.upgrade_position ? `#${settings.upgrade_position}` : "—"} />
        <Field label="Song Group" value={settings?.group_assigned
          ? groupLabelForSeed(settings?.group_seed)
          : <span className="text-destructive font-bold">Not set — songs hidden</span>} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" className="text-[var(--nrc-green)]" onClick={viewAsUser}>
          <LogIn className="w-4 h-4 mr-1" /> View as User
        </Button>
        {!readOnly && (<>
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}><Pencil className="w-4 h-4 mr-1" /> Edit</Button>
        <Button variant="outline" size="sm" onClick={() => setFundsOpen(true)}><DollarSign className="w-4 h-4 mr-1" /> Funds</Button>
        <Button variant="outline" size="sm" className={user.suspended ? "text-[var(--nrc-green)]" : "text-destructive"}
          onClick={() => suspend.mutate(!user.suspended)} disabled={suspend.isPending}>
          <Ban className="w-4 h-4 mr-1" /> {user.suspended ? "Unsuspend" : "Suspend"}
        </Button>
        <Button size="sm" className="bg-[var(--nrc-green)] text-primary-foreground" onClick={() => setExclusiveOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> Add Exclusive
        </Button>
        <Button variant="outline" size="sm" className="text-destructive" disabled={newSongGroup.isPending}
          onClick={() => { if (confirm("Delete the songs assigned to this user and assign a brand new group?")) newSongGroup.mutate(); }}>
          <Trash2 className="w-4 h-4 mr-1" /> Delete Songs
        </Button>
        <Button variant="outline" size="sm" className="text-indigo-600" onClick={() => setGroupOpen(true)}>
          <Layers className="w-4 h-4 mr-1" /> Set
        </Button>
        <Button variant="outline" size="sm" className="text-emerald-600" onClick={() => setRewardOpen(true)}>
          <Gift className="w-4 h-4 mr-1" /> Reward Event
        </Button>
        <Button variant="outline" size="sm" className="text-fuchsia-600" onClick={() => setSetUpgradeOpen(true)}>
          <ArrowUpCircle className="w-4 h-4 mr-1" /> Set Upgrade
        </Button>
        <Button variant="outline" size="sm" className="text-orange-600" disabled={!negative || clearNegative.isPending}
          onClick={() => clearNegative.mutate()}>
          <XCircle className="w-4 h-4 mr-1" /> Clear Negative
        </Button>
        <Button variant="outline" size="sm" className="text-amber-600" disabled={resetTasks.isPending}
          onClick={() => { if (confirm("Clear all task records for this user? Tasks reset to 0 and a new group of songs is assigned.")) resetTasks.mutate(); }}>
          <FileText className="w-4 h-4 mr-1" /> Clear Record
        </Button>
        <Button variant="outline" size="sm" className="text-destructive" onClick={() => setDeleteOpen(true)}>
          <Trash2 className="w-4 h-4 mr-1" /> Delete Account
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="text-sky-600" disabled={setLevel.isPending}>
              <ArrowUpCircle className="w-4 h-4 mr-1" /> Upgrade
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60 bg-popover">
            <DropdownMenuLabel>Set membership level</DropdownMenuLabel>
            {WAREHOUSE_TIERS.map((t, i) => {
              const blocked = submittedCount > t.perSub;
              return (
                <DropdownMenuItem key={t.key} onSelect={() => setLevel.mutate(i)}
                  className="flex items-center justify-between gap-2">
                  <span className={t.key === tier.key ? "font-bold" : ""}>{t.label}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {blocked ? "clear records first" : `0/${t.perSub} · $${t.minBalance.toLocaleString()}`}
                  </span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
        </>)}
      </div>


      {!readOnly && (<>
      <EditUserDialog user={user} open={editOpen} onClose={() => setEditOpen(false)} />
      <FundsDialog user={user} onHold={onHold} open={fundsOpen} onClose={() => setFundsOpen(false)} />
      <LevelDialog user={user} open={levelOpen} onClose={() => setLevelOpen(false)} submittedCount={submittedCount} />
      <ExclusiveDialog user={user} tierKey={tier.key} tierLabel={tier.label} quota={quota}
        groupSeed={settings?.group_seed ?? 0} open={exclusiveOpen} onClose={() => setExclusiveOpen(false)} />
      <GroupDialog user={user} tierLabel={tier.label} quota={quota} current={currentSeed} used={usedSeeds}
        open={groupOpen} onClose={() => setGroupOpen(false)} />
      <SetUpgradeDialog user={user} quota={quota} current={settings?.upgrade_position ?? null}
        open={setUpgradeOpen} onClose={() => setSetUpgradeOpen(false)} />

      <DeleteDialog user={user} open={deleteOpen} onClose={() => setDeleteOpen(false)} onDeleted={onBack} />
      <RewardDialog user={user} open={rewardOpen} onClose={() => setRewardOpen(false)} />
      </>)}


    </div>
  );
}

function LevelDialog({ user, open, onClose, submittedCount = 0 }: { user: any; open: boolean; onClose: () => void; submittedCount?: number }) {
  const qc = useQueryClient();
  const currentIndex = user.level_locked ? tierIndexForLevel(user.vip_level) : stickyTierIndex(user.balance, user.vip_level);
  const [pick, setPick] = useState(currentIndex);

  const save = useMutation({
    mutationFn: async () => {
      if (submittedCount > WAREHOUSE_TIERS[pick].perSub) {
        throw new Error(`Clear this user's records first — ${submittedCount} submitted tasks exceed the ${WAREHOUSE_TIERS[pick].label} limit of ${WAREHOUSE_TIERS[pick].perSub}.`);
      }
      const { error } = await supabase.from("profiles")
        .update({ vip_level: LEVEL_FOR_TIER_INDEX[pick], level_locked: true })
        .eq("id", user.id);
      if (error) throw error;
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["me"] });
      toast.success(`Level set to ${WAREHOUSE_TIERS[pick].label}`);
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Change Membership Level</DialogTitle>
          <DialogDescription>Select a level for {user.display_name || user.username}, then confirm.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {WAREHOUSE_TIERS.map((t, i) => (
            <button key={t.key} onClick={() => setPick(i)}
              className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                pick === i ? "border-[var(--nrc-green)] bg-[var(--nrc-green)]/10" : "border-border hover:bg-accent/40"}`}>
              <div className="flex items-center justify-between">
                <span className="font-semibold">{t.label}</span>
                {i === currentIndex && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-muted">CURRENT</span>}
              </div>
              <div className="text-[11px] text-muted-foreground">{t.perSub} tasks/day · requires ${t.minBalance}</div>
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Done</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>Add Premium</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({ user, open, onClose, onDeleted }: { user: any; open: boolean; onClose: () => void; onDeleted: () => void }) {
  const qc = useQueryClient();
  const remove = useServerFn(deleteUserAccount);
  const del = useMutation({
    mutationFn: async () => remove({ data: { userId: user.id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Account permanently deleted");
      onClose();
      onDeleted();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Account</DialogTitle>
          <DialogDescription>
            This permanently deletes {user.display_name || user.username} and all their data. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={() => del.mutate()} disabled={del.isPending}>
            {del.isPending ? "Deleting…" : "Delete permanently"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function EditUserDialog({ user, open, onClose }: { user: any; open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const updateAccount = useServerFn(updateUserAccount);
  const [fullName, setFullName] = useState(user.display_name || "");
  const [username, setUsername] = useState(user.username || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [email, setEmail] = useState(user.email || "");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
    : "—";

  const save = useMutation({
    mutationFn: async () => {
      await updateAccount({
        data: {
          userId: user.id,
          displayName: fullName,
          username,
          phone,
          email: email || undefined,
          password: password || undefined,
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-tx"] });
      qc.invalidateQueries({ queryKey: ["me"] });
      toast.success("User details updated");
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });


  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>Editing {user.display_name || user.username}'s account details</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div><Label>Full Name</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
          <div><Label>Username</Label><Input value={username} onChange={(e) => setUsername(e.target.value)} /></div>
          <div><Label>Phone Number</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div>
            <Label>Member Since</Label>
            <Input value={memberSince} disabled readOnly className="bg-muted/50" />
          </div>
          <div>
            <Label>New Password <span className="text-muted-foreground font-normal">(leave blank to keep current)</span></Label>
            <div className="relative">
              <Input type={showPw ? "text" : "password"} value={password} placeholder="Enter new password"
                onChange={(e) => setPassword(e.target.value)} />
              <button type="button" className="absolute right-2 top-2.5 text-muted-foreground" onClick={() => setShowPw((v) => !v)}>
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? "Saving…" : <><Save className="w-4 h-4 mr-1" /> Save Changes</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type Mode = "add" | "deduct" | "return";
type Target = "balance" | "today" | "hold";

function FundsDialog({ user, onHold, open, onClose }: { user: any; onHold: number; open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<Mode>("add");
  const [target, setTarget] = useState<Target>("balance");
  const [amount, setAmount] = useState("");

  /** Reduce a user's on-hold (pending) rows by `amt`; returns the amount actually released. */
  const releaseHold = async (amt: number) => {
    const { data: pend } = await supabase
      .from("mock_transactions")
      .select("id,amount")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    let left = amt;
    for (const row of pend ?? []) {
      if (left <= 0) break;
      const rowAmt = Number(row.amount);
      if (rowAmt <= left) {
        const { error } = await supabase.from("mock_transactions").delete().eq("id", row.id);
        if (error) throw error;
        left -= rowAmt;
      } else {
        const { error } = await supabase.from("mock_transactions")
          .update({ amount: Number((rowAmt - left).toFixed(2)) }).eq("id", row.id);
        if (error) throw error;
        left = 0;
      }
    }
    return Number((amt - left).toFixed(2));
  };

  const setProfile = async (patch: { balance?: number; total_earned?: number }) => {
    const { error } = await supabase.from("profiles").update(patch).eq("id", user.id).select("id").single();
    if (error) throw error;
  };

  const apply = useMutation({
    mutationFn: async () => {
      const amt = Number(amount || 0);
      if (!Number.isFinite(amt) || amt <= 0) throw new Error("Enter an amount greater than 0");
      const balance = Number(user.balance);
      const earned = Number(user.total_earned);

      // Return Balance: move held funds back into the wallet balance.
      if (mode === "return") {
        const released = await releaseHold(amt);
        if (released <= 0) throw new Error("This user has no held funds to return");
        await setProfile({ balance: Number((balance + released).toFixed(2)) });
        return `Returned $${released.toFixed(2)} from On Hold to Balance`;
      }

      const sign = mode === "deduct" ? -1 : 1;

      if (target === "balance" || target === "today") {
        const { error } = await supabase.rpc("admin_adjust_account_funds", { p_user: user.id, p_delta: sign * amt, p_earned_delta: target === "today" ? sign * amt : 0 });
        if (error) throw error;
        return `${sign > 0 ? "Added" : "Deducted"} $${amt.toFixed(2)} ${sign > 0 ? "to" : "from"} ${target === "today" ? "today's earnings" : "balance"}`;
      }

      if (target === "hold") {
        if (sign > 0) {
          const { error } = await supabase.from("mock_transactions").insert({
            user_id: user.id, kind: "promotion", amount: amt, status: "pending",
            note: "Admin hold adjustment",
          });
          if (error) throw error;
          return `Added $${amt.toFixed(2)} to On Hold`;
        }
        const released = await releaseHold(amt);
        if (released <= 0) throw new Error("This user has no held funds to deduct");
        return `Deducted $${released.toFixed(2)} from On Hold`;
      }

    },
    onSuccess: (msg) => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-tx"] });
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["on-hold"] });
      qc.invalidateQueries({ queryKey: ["my-tx"] });
      qc.invalidateQueries({ queryKey: ["today-promos"] });
      toast.success(msg ?? "Funds updated");
      setAmount("");
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });


  const modeBtn = (m: Mode, label: string, Icon: any) => (
    <Button size="sm" variant={mode === m ? "default" : "outline"} onClick={() => setMode(m)}>
      <Icon className="w-4 h-4 mr-1" /> {label}
    </Button>
  );
  const targetBtn = (t: Target, label: string) => (
    <Button size="sm" variant={target === t ? "default" : "outline"} onClick={() => setTarget(t)}>{label}</Button>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Manage Funds</DialogTitle>
          <DialogDescription>
            {user.display_name || user.username} — Balance: ${Number(user.balance).toFixed(2)} · On Hold: ${onHold.toFixed(2)}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          {modeBtn("add", "Add Funds", Plus)}
          {modeBtn("deduct", "Deduct Funds", Minus)}
          {modeBtn("return", "Return Balance", RotateCcw)}
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">Apply to</div>
          <div className="flex flex-wrap gap-2">
            {targetBtn("balance", "Balance")}
            {targetBtn("today", "Today's Earnings")}
            {targetBtn("hold", "On Hold")}
          </div>
        </div>
        <div>
          <Label>Amount ($)</Label>
          <Input type="number" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={apply.isPending} onClick={() => apply.mutate()}>
            {mode === "deduct" ? "Deduct" : mode === "return" ? "Return" : "Add"} ${Number(amount || 0).toFixed(2)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ExclusiveDialog({ user, tierKey, tierLabel, quota, groupSeed, open, onClose }: {
  user: any; tierKey: string; tierLabel: string; quota: number; groupSeed: number; open: boolean; onClose: () => void;
}) {
  const qc = useQueryClient();
  const { data: savedMap } = useWarehouseSongs();
  const catalogue = useMemo(() => {
    const base = savedMap?.[`${tierKey}-1-A`] ?? makeSongs(tierKey, 1, "A", quota, groupSeed);
    const premium = savedMap?.[`${tierKey}-premium`] ?? premiumSongs(tierKey);
    return [...base, ...premium];
  }, [savedMap, tierKey, quota, groupSeed]);
  const [songId, setSongId] = useState("");
  const [amount, setAmount] = useState("");
  const [position, setPosition] = useState("");
  const [commission, setCommission] = useState("5");
  const { data: assigned = [] } = useExclusiveTasks(user.id);
  const scheduled = assigned.filter((e) => !e.consumed).sort((a, b) => a.position - b.position);

  const song = catalogue.find((s) => s.id === songId);
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_exclusive_tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["exclusive-tasks", user.id] }); toast.success("Premium removed"); },
    onError: (e: any) => toast.error(e.message),
  });
  const [customCost, setCustomCost] = useState(false);

  // Keep the Cost field in sync with the song's current price unless the admin typed a custom value.
  useEffect(() => {
    if (song && !customCost) setAmount(String(song.amount));
  }, [song?.amount, customCost]);

  const save = useMutation({
    mutationFn: async () => {
      if (!song) throw new Error("Select a product first");
      const pos = Number(position);
      const amt = Number(amount);
      if (!pos || pos < 1 || pos > quota) throw new Error(`Position must be between 1 and ${quota}`);
      if (!amt || amt <= 0) throw new Error("Enter a valid amount");
      if (scheduled.some((e) => e.position === pos)) throw new Error(`Position #${pos} already has a premium — choose another position`);
      if (scheduled.some((e) => e.name === song.name)) throw new Error("This song is already set as a premium for this user");
      const { error } = await supabase.from("user_exclusive_tasks").insert({
        user_id: user.id, position: pos, name: song.name, amount: amt,
        commission: Number(commission) || 5, poster: song.poster, consumed: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exclusive-tasks", user.id] });
      toast.success("Premium added — you can add another");
      setSongId(""); setAmount(""); setPosition(""); setCustomCost(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-card">
        <DialogHeader>
          <DialogTitle>Add Exclusive Task</DialogTitle>
          <DialogDescription>
            {tierLabel} · Current balance ${Number(user.balance).toFixed(2)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-lg border border-border p-2">
            <div className="text-xs font-bold mb-1">Scheduled premiums ({scheduled.length})</div>
            {scheduled.length === 0 && <div className="text-xs text-muted-foreground">None yet. Add one or more below, each at its own position.</div>}
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {scheduled.map((e) => (
                <div key={e.id} className="flex items-center gap-2 text-xs">
                  <span className="font-black text-[var(--nrc-gold)] w-10">#{e.position}</span>
                  <span className="flex-1 truncate">{e.name}</span>
                  <span>${Number(e.amount).toFixed(2)}</span>
                  <button className="text-destructive font-semibold" onClick={() => remove.mutate(e.id)}>Remove</button>
                </div>
              ))}
            </div>
          </div>
          <div>
            <Label>Select product</Label>
            <select value={songId} onChange={(e) => {
              setSongId(e.target.value);
              setCustomCost(false);
              const s = catalogue.find((c) => c.id === e.target.value);
              if (s) setAmount(String(s.amount));
            }} className="mt-1 w-full h-10 rounded-md border border-border bg-background px-3 text-sm">
              <option value="">Choose a song…</option>
              {catalogue.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          {song && (
            <div className="flex items-center gap-3 rounded-lg border border-border p-2">
              <img src={song.poster} alt="" className="w-12 h-12 rounded object-cover" />
              <div className="text-xs flex-1 min-w-0">
                <div className="font-semibold truncate">{song.name}</div>
                <div className="text-muted-foreground">Cost ${(Number(amount) || 0).toFixed(2)}</div>
              </div>
              <div className="text-xs text-right shrink-0">
                <div className="text-muted-foreground">Profit</div>
                <div className="font-black text-[var(--nrc-green)]">
                  ${((Number(amount) || 0) * (Number(commission) || 0) / 100).toFixed(2)}
                </div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label>Cost ($)</Label>
              <Input value={amount} onChange={(e) => { setAmount(e.target.value); setCustomCost(true); }} inputMode="decimal" placeholder="0.00" />
            </div>
            <div>
              <Label>Position</Label>
              <Input value={position} onChange={(e) => setPosition(e.target.value)} inputMode="numeric" placeholder={`1-${quota}`} />
            </div>
            <div>
              <Label>Commission %</Label>
              <Input value={commission} onChange={(e) => setCommission(e.target.value)} inputMode="decimal" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SetUpgradeDialog({ user, quota, current, open, onClose }: {
  user: any; quota: number; current: number | null; open: boolean; onClose: () => void;
}) {
  const qc = useQueryClient();
  const [pos, setPos] = useState(current ? String(current) : "");

  const save = useMutation({
    mutationFn: async (clear?: boolean) => {
      const value = clear ? null : Number(pos);
      if (!clear && (!value || value < 1 || value > quota)) throw new Error(`Position must be between 1 and ${quota}`);
      const { error } = await supabase.from("user_task_settings")
        .upsert({ user_id: user.id, upgrade_position: value }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task-settings", user.id] });
      toast.success("Upgrade checkpoint updated");
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-card">
        <DialogHeader>
          <DialogTitle>Set Upgrade</DialogTitle>
          <DialogDescription>
            When the user reaches this task position they must upgrade their account before continuing.
          </DialogDescription>
        </DialogHeader>
        <div>
          <Label>Upgrade at position</Label>
          <Input value={pos} onChange={(e) => setPos(e.target.value)} inputMode="numeric" placeholder={`1-${quota}`} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => save.mutate(true)} disabled={save.isPending}>Remove</Button>
          <Button onClick={() => save.mutate(false)} disabled={save.isPending}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GroupDialog({ user, tierLabel, quota, current, used, open, onClose }: {
  user: any; tierLabel: string; quota: number; current: number; used: Set<number>; open: boolean; onClose: () => void;
}) {
  const qc = useQueryClient();

  const assign = useMutation({
    mutationFn: async (seed: number) => {
      if (used.has(seed)) throw new Error("This group has already been submitted by the user");
      const { error } = await supabase.from("user_task_settings")
        .upsert({ user_id: user.id, group_seed: seed, group_assigned: true }, { onConflict: "user_id" });
      if (error) throw error;
      const { error: premiumError } = await supabase.from("user_exclusive_tasks").delete().eq("user_id", user.id).eq("consumed", false);
      if (premiumError) throw premiumError;
      return seed;
    },
    onSuccess: (seed) => {
      qc.invalidateQueries({ queryKey: ["task-settings", user.id] });
      qc.invalidateQueries({ queryKey: ["exclusive-tasks", user.id] });
      qc.invalidateQueries({ queryKey: ["me"] });
      toast.success(`${groupLabelForSeed(seed)} assigned to this user`);
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-card">
        <DialogHeader>
          <DialogTitle>Assign warehouse group</DialogTitle>
          <DialogDescription>
            {tierLabel} level · {quota} songs per group. Each group can be assigned only once — groups the user has
            already submitted are disabled.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto">
          {WAREHOUSE_GROUPS.map((g) => {
            const isUsed = used.has(g.seed);
            const isCurrent = g.seed === current;
            return (
              <button key={g.seed} disabled={isUsed || assign.isPending}
                onClick={() => assign.mutate(g.seed)}
                className={`rounded-lg border p-3 text-left text-sm transition ${
                  isCurrent ? "border-[var(--nrc-green)] bg-[var(--nrc-green)]/10" : "border-border hover:bg-muted"
                } disabled:opacity-40 disabled:cursor-not-allowed`}>
                <div className="font-semibold">{g.label}</div>
                <div className="text-[11px] text-muted-foreground">
                  {isUsed ? "Submitted — locked" : isCurrent ? "Current group" : `${quota} songs`}
                </div>
              </button>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RewardDialog({ user, open, onClose }: { user: any; open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [kind, setKind] = useState<"spin" | "checkin">("spin");
  const [amount, setAmount] = useState("10");
  const [note, setNote] = useState("");

  const { data: active } = useQuery({
    queryKey: ["admin-reward", user.id],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase.from("user_rewards").select("*")
        .eq("user_id", user.id).eq("status", "available")
        .order("created_at", { ascending: true }).limit(1).maybeSingle();
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const value = Number(amount);
      if (!isFinite(value) || value <= 0) throw new Error("Enter a valid prize amount");
      // one active event per user at a time
      const { error: removeError } = await supabase.from("user_rewards").delete().eq("user_id", user.id).eq("status", "available");
      if (removeError) throw removeError;
      const { error } = await supabase.from("user_rewards")
        .insert({ user_id: user.id, kind, amount: value, note: note || null });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-reward", user.id] });
      toast.success(`${kind === "spin" ? "Spin & Win" : "Daily check-in"} enabled for this user`);
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const cancel = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("user_rewards").delete()
        .eq("user_id", user.id).eq("status", "available");
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-reward", user.id] });
      toast.success("Reward event disabled");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-card">
        <DialogHeader>
          <DialogTitle>Reward event</DialogTitle>
          <DialogDescription>
            Enable a Spin &amp; Win or Daily check-in reward for this user. The user can claim it once; afterwards the
            event disables itself until you set a new one.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-border p-3 text-sm">
            {active
              ? <span>Active: <b>{active.kind === "spin" ? "Spin & Win" : "Daily check-in"}</b> · ${Number(active.amount).toFixed(2)} — waiting to be claimed.</span>
              : <span className="text-muted-foreground">No active event for this user.</span>}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(["spin", "checkin"] as const).map((k) => (
              <button key={k} onClick={() => setKind(k)}
                className={`rounded-lg border p-3 text-sm font-semibold ${kind === k ? "border-[var(--nrc-green)] bg-[var(--nrc-green)]/10" : "border-border hover:bg-muted"}`}>
                {k === "spin" ? "Spin & Win" : "Daily check-in"}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label>Prize amount (USD)</Label>
            <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Note (optional)</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Shown to the user" />
          </div>
        </div>

        <DialogFooter className="gap-2">
          {active && (
            <Button variant="outline" className="text-destructive" disabled={cancel.isPending}
              onClick={() => cancel.mutate()}>Disable current</Button>
          )}
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button className="bg-[var(--nrc-green)] text-primary-foreground" disabled={save.isPending}
            onClick={() => save.mutate()}>Enable event</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
