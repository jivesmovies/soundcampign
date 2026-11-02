import { requireUserPanel } from "@/lib/role-guard";
import { createFileRoute, Link, Navigate, useNavigate, useParams } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useMe, formatMoney, MUSIC_PARTNERS } from "@/lib/hooks";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Music2, Wallet as WalletIcon, Clock, Package, Loader2, AlertTriangle, Zap } from "lucide-react";
import { useState } from "react";
import { makeSongs, WAREHOUSE_TIERS, LEVEL_FOR_TIER_INDEX, POSTERS, AUDIO_URL, type Song } from "@/lib/warehouse";
import { useStickyTier } from "@/lib/tier";
import { useTaskSettings, useExclusiveTasks, applyExclusives, buildTaskQueue } from "@/lib/exclusive";
import { requestUpgrade, usePendingUpgrade } from "@/lib/upgrade";



import { TrackSubmitDialog } from "@/components/TrackSubmitDialog";
import { adjustBalance, holdValue } from "@/lib/balance";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/partner/$key")({
  beforeLoad: () => requireUserPanel(),
  head: () => ({
    meta: [
      {"title": "Music Partner \u2014 SoundCampaign"},
      {"name": "description", "content": "Explore music promotion tracks on SoundCampaign partner platforms."},
      {"property": "og:title", "content": "Music Partner \u2014 SoundCampaign"},
      {"property": "og:description", "content": "Explore music promotion tracks on SoundCampaign partner platforms."},
      {"property": "og:type", "content": "website"},
      {"name": "twitter:card", "content": "summary"},
    ],
  }),
  component: PartnerPage,
});

function PartnerPage() {
  const { key } = useParams({ from: "/_authenticated/partner/$key" });
  const { data: me } = useMe();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const partner = MUSIC_PARTNERS.find((m) => m.key === key);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [onHold, setOnHold] = useState<Record<string, string>>({});
  const [activeSong, setActiveSong] = useState<Song | null>(null);
  const [pendingTxId, setPendingTxId] = useState<string | null>(null);
  const [justSubmitted, setJustSubmitted] = useState<string[]>([]);

  const userId = me?.user.id;
  const balance = Number(me?.profile?.balance ?? 0);
  const tier = useStickyTier(userId, balance, me?.profile?.vip_level, (me?.profile as any)?.level_locked);
  // The user must hold the minimum balance for their level (and not be negative)
  // before promoting. Otherwise "Add Funds to Promote" is shown instead.
  const eligible = balance >= 0 && balance >= tier.minBalance;
  const shortfall = Math.max(0, tier.minBalance - balance);

  const quota = tier.perSub;


  // All promotion transactions for this user (used for global de-duplication)
  const { data: allTx = [] } = useQuery({
    queryKey: ["today-promos", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("mock_transactions")
        .select("id,status,amount,created_at,note")
        .eq("user_id", userId!).eq("kind", "promotion")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  // Tasks never auto-reset — only an admin clearing the records resets the cycle
  const doneTx = allTx.filter((t) => t.status !== "pending");
  const pendingTxs = allTx.filter((t) => t.status === "pending");
  const holdAmount = pendingTxs.reduce((a, b) => a + holdValue(b), 0);

  const titleOf = (note: string | null) => (note || "").replace(/^PENDING:\s*/, "").split("·")[0].trim();
  const submittedNames = new Set(doneTx.map((t) => titleOf(t.note)));
  // include optimistic submissions that haven't been refetched yet
  justSubmitted.forEach((n) => submittedNames.add(n));

  // Same catalogue on every platform, so a submitted song disappears everywhere
  const { data: settings } = useTaskSettings(userId);
  const { data: exclusives = [] } = useExclusiveTasks(userId);
  const groupAssigned = !!settings?.group_assigned;
  const baseSongs: Song[] = groupAssigned ? makeSongs(tier.key, 1, "A", quota, settings?.group_seed ?? 0) : [];
  const allSongs: Song[] = groupAssigned ? applyExclusives(baseSongs, exclusives) : [];

  // Persistent lifetime count: every track ever started/submitted (pending included).
  // Only an admin clearing/deleting records brings this back to 0.
  const allSubmittedNames = new Set(allTx.map((t) => titleOf(t.note)));
  justSubmitted.forEach((n) => allSubmittedNames.add(n));
  const submittedToday = Math.min(quota, allSubmittedNames.size);
  const completed = submittedToday >= quota;
  // Remove submitted tracks by name, then guarantee the list length always equals
  // the exact number of remaining tracks (quota - submitted), for every level.
  const remainingCount = Math.max(0, quota - submittedToday);
  // Premium tracks land exactly on their admin-set task number, counted from real progress.
  const visibleSongs: Song[] = groupAssigned
    ? buildTaskQueue(baseSongs, exclusives, submittedNames, submittedToday, quota)
    : [];


  // Admin-set upgrade checkpoint: the user must upgrade before continuing past it
  const upgradePos = settings?.upgrade_position ?? null;
  const upgradeRequired = !!upgradePos && submittedToday + 1 >= upgradePos && !completed;
  const nextTierIndex = Math.min(WAREHOUSE_TIERS.findIndex((t) => t.key === tier.key) + 1, WAREHOUSE_TIERS.length - 1);
  const nextTier = WAREHOUSE_TIERS[nextTierIndex];

  const { data: pendingUpgrade } = usePendingUpgrade(userId);

  const doUpgrade = async () => {
    if (!userId) return;
    if (pendingUpgrade) {
      toast.info("Your upgrade request is pending admin approval.");
      return;
    }
    try {
      await requestUpgrade(userId, nextTierIndex);
      qc.invalidateQueries({ queryKey: ["pending-upgrade", userId] });
      toast.success(`Upgrade to ${nextTier.label} requested — waiting for admin approval.`);
    } catch (e: any) {
      toast.error(e.message ?? "Could not submit upgrade request");
    }
  };





  // A song whose dialog was closed before submitting stays pending (its cost is
  // on hold). Rebuild it from the transaction note so it can be resumed and
  // submitted — on submit the cost + profit return to the balance.
  const resumePending = (tx: (typeof pendingTxs)[number]) => {
    const name = titleOf(tx.note);
    const found = visibleSongs.find((s) => s.name === name) ?? allSongs.find((s) => s.name === name);
    const c = /(?:^|·)\s*c:([\d.]+)/.exec(tx.note ?? "");
    const p = /(?:^|·)\s*p:([\d.]+)/.exec(tx.note ?? "");
    const amount = c ? Number(c[1]) : Number(tx.amount);
    const profit = p ? Number(p[1]) : 0;
    const song: Song = found ?? {
      id: `pending-${tx.id}`,
      name,
      poster: POSTERS[0],
      audio: AUDIO_URL,
      description: "Resume your pending submission.",
      amount,
      commission: amount > 0 ? Number(((profit / amount) * 100).toFixed(2)) : 0,
    };
    setPendingTxId(tx.id);
    setActiveSong(song);
  };

  const promote = async (s: Song) => {
    if (!userId || !partner) return;
    // Finish the held submission first — its cost is already on hold.
    if (pendingTxs.length > 0) {
      resumePending(pendingTxs[0]);
      return;
    }
    if (!eligible) {
      if (balance < 0) {
        toast.error(`Your balance is negative ($${Math.abs(balance).toFixed(2)}). Deposit to clear it or contact support before submitting.`);
      } else {
        toast.error(`${tier.label} level requires a minimum balance of $${tier.minBalance.toLocaleString()}. Add $${shortfall.toFixed(2)} to start submitting.`);
      }
      return;
    }
    if (!groupAssigned) {
      toast.error("No songs assigned yet. Please contact customer support to have your song group set.");
      return;
    }
    if (completed) {

      toast.error("Task completed. Please contact customer support to reset your tasks.");
      return;
    }
    if (upgradeRequired) {
      toast.error(`Upgrade to ${nextTier.label} to continue from task #${upgradePos}.`);
      return;
    }


    if (visibleSongs[0]?.id !== s.id) return; // must submit in sequential order
    if (busyId) return;
    setBusyId(s.id);
    try {
      // Cost is placed on hold and deducted from balance (may go negative)
      const { data: tx, error } = await supabase.from("mock_transactions").insert({
        user_id: userId, kind: "promotion", amount: s.amount, status: "pending",
        note: `PENDING: ${s.name} · ${partner.name} · tier:${tier.key} · g:${settings?.group_seed ?? 0} · c:${s.amount.toFixed(2)} · p:${(s.amount * s.commission / 100).toFixed(2)}`,
      }).select("id").single();
      if (error || !tx) { toast.error(error?.message ?? "Could not start task"); return; }
      await adjustBalance(userId, -s.amount);
      setOnHold((h) => { const n = { ...h }; delete n[s.id]; return n; });
      setPendingTxId(tx.id);
      setActiveSong(s);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["me"] }),
        qc.invalidateQueries({ queryKey: ["today-promos", userId] }),
        qc.invalidateQueries({ queryKey: ["my-tx"] }),
        qc.invalidateQueries({ queryKey: ["on-hold", userId] }),
        qc.invalidateQueries({ queryKey: ["admin-tx"] }),
        qc.invalidateQueries({ queryKey: ["admin-users"] }),
      ]);
    } finally {
      setBusyId(null);
    }
  };


  if (!me) return me === null ? <Navigate to="/auth" /> : null;
  if (!partner) return <Navigate to="/vip" />;

  return (
    <AppShell title={partner.name} isAdmin={me.isAdmin}>
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate({ to: "/vip" })} className="flex items-center gap-2 text-sm font-semibold">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <span className="inline-flex items-center gap-2 text-xs font-bold text-white px-3 py-1 rounded-full" style={{ background: partner.color }}>
          <span className="w-5 h-5 rounded-full bg-white grid place-items-center p-0.5 overflow-hidden shrink-0"><img src={partner.logo} alt="" className="max-w-full max-h-full w-full h-full object-contain" /></span>
          {partner.name}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <Summary tone="balance" icon={WalletIcon} label="BALANCE" value={formatMoney(me.profile?.balance)} hold={Number(me.profile?.balance ?? 0) < 0 ? holdAmount : null} />
      </div>

      {pendingTxs.length > 0 && (
        <div className="mt-3 rounded-xl border border-[var(--nrc-gold)]/40 bg-[var(--nrc-gold)]/10 p-4 text-xs">
          <div className="font-bold text-[var(--nrc-gold)] mb-1 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Song on hold
          </div>
          <span className="font-semibold">{titleOf(pendingTxs[0].note)}</span> is on hold. Please resubmit to continue.
          <button onClick={() => resumePending(pendingTxs[0])}
            className="mt-3 w-full bg-[var(--nrc-gold)] text-black text-xs font-bold py-2 rounded-md">
            Resubmit Song
          </button>
        </div>
      )}

      <div className="mt-3 rounded-2xl p-5 text-white relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${partner.color}, #111)` }}>
        <div className="inline-flex items-center gap-2 text-xs font-bold tracking-widest opacity-90">
          <Package className="w-4 h-4" /> TOTAL SUBMITTED
        </div>
        <div className="mt-2 text-4xl font-black tabular-nums">{submittedToday}/{quota}</div>
        <div className="mt-1 text-xs opacity-80">{tier.label} tier · {groupAssigned ? `${visibleSongs.length} tracks available` : "awaiting song assignment"} · limit {quota}/{quota}</div>
      </div>

      {completed && (
        <div className="mt-3 rounded-xl border border-[var(--nrc-green)]/40 bg-[var(--nrc-green)]/10 p-4 text-xs">
          <div className="font-bold text-[var(--nrc-green)] mb-1">Task completed · {quota}/{quota}</div>
          You have reached the maximum task limit for your {tier.label} level. Tasks do not reset automatically —
          please contact customer support.

        </div>
      )}

      {upgradeRequired && (
        <div className="mt-3 rounded-xl border border-sky-500/40 bg-sky-500/10 p-4 text-xs">
          <div className="font-bold text-sky-600 mb-1">Upgrade required at task #{upgradePos}</div>
          Your account must be upgraded to <span className="font-semibold">{nextTier.label}</span> before you can continue submitting.
          {pendingUpgrade
            ? <div className="mt-3 w-full bg-sky-600/20 text-sky-700 text-xs font-bold py-2 rounded-md text-center">
                Upgrade pending admin approval
              </div>
            : <button onClick={doUpgrade}
                className="mt-3 w-full bg-sky-600 text-white text-xs font-bold py-2 rounded-md">
                Upgrade to {nextTier.label}
              </button>}

        </div>
      )}


      {balance < 0 && (
        <div className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-xs">
          <div className="font-bold text-destructive mb-1">Negative balance · ${Math.abs(balance).toFixed(2)}</div>
          Your last task cost more than your available balance. Deposit at least ${Math.abs(balance).toFixed(2)} to clear it — the task stays pending until then.
        </div>
      )}

      {balance >= 0 && shortfall > 0 && (
        <div className="mt-3 rounded-xl border border-[var(--nrc-gold)]/40 bg-[var(--nrc-gold)]/10 p-4 text-xs">
          <div className="font-bold text-[var(--nrc-gold)] mb-1">
            Minimum balance required · ${tier.minBalance.toLocaleString()}
          </div>
          Your {tier.label} level needs at least ${tier.minBalance.toLocaleString()} in your wallet balance to start submitting.
          Add ${shortfall.toFixed(2)} more to unlock Promote Now.
        </div>
      )}





      <h2 className="font-bold mt-6 mb-3">{partner.name} Tracks</h2>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {!groupAssigned && (
          <div className="col-span-full rounded-xl border border-[var(--nrc-gold)]/40 bg-[var(--nrc-gold)]/10 p-5 text-center text-sm">
            <div className="font-bold text-[var(--nrc-gold)] mb-1">No songs assigned yet</div>
            Your song group has not been set. Please contact customer support to have your {tier.label} tracks
            assigned before you can start submitting.
          </div>
        )}
        {groupAssigned && visibleSongs.length === 0 && (
          <div className="col-span-full text-center text-sm text-muted-foreground py-10">
            Task completed — all {quota} tracks submitted. Contact customer support to reset your tasks.
          </div>
        )}
        {visibleSongs.map((s, idx) => {
          const [title, artist] = s.name.split(" — ");
          const held = onHold[s.id];
          const isNext = idx === 0;
          const position = submittedToday + idx + 1;
          return (
            <div key={s.id} className="bg-card border border-border rounded-xl p-3">
              <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                <img src={s.poster} alt={title} className="w-full h-full object-cover" />
                <span className="absolute top-2 left-2 w-7 h-7 rounded-full bg-white grid place-items-center p-1 overflow-hidden shadow">
                  <img src={partner.logo} alt={partner.name} className="max-w-full max-h-full w-full h-full object-contain" />
                </span>
                <span className="absolute top-2 right-2 text-[10px] font-bold bg-black/70 text-white px-2 py-0.5 rounded-full">
                  #{position}
                </span>
                {s.exclusive && (
                  <span className="absolute bottom-2 right-2 text-[10px] font-black bg-[var(--nrc-gold)] text-black px-2 py-0.5 rounded-full">
                    EXCLUSIVE
                  </span>
                )}

                {!isNext && <div className="absolute inset-0 bg-background/60" />}
                {held && (
                  <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 text-[10px] font-bold bg-[var(--nrc-gold)] text-black px-2 py-0.5 rounded-full">
                    <AlertTriangle className="w-3 h-3" /> On Hold
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-start gap-2">
                <Music2 className="w-4 h-4 text-[var(--nrc-gold)] shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm truncate">{title}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{artist} · {partner.name}</div>
                </div>
              </div>
              {held && <div className="mt-2 text-[10px] text-[var(--nrc-gold)]">{held}</div>}
              <button
                onClick={() => (!eligible ? navigate({ to: "/wallet", search: { deposit: true } }) : promote(s))}
                disabled={busyId === s.id || !isNext || submittedToday >= quota || (isNext && upgradeRequired)}
                className="mt-3 w-full inline-flex items-center justify-center gap-2 bg-[var(--nrc-green)] text-primary-foreground text-xs font-bold py-2 rounded-md disabled:opacity-60"
              >
                {busyId === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                {busyId === s.id ? "Submitting..." : isNext && upgradeRequired ? `Upgrade to ${nextTier.label} to continue` : !eligible ? "Add Funds to Promote" : !isNext ? `Locked · #${position}` : held ? "Promote Now (Retry)" : "Promote Now"}
              </button>

            </div>
          );
        })}
      </div>

      <div className="mt-6 text-center">
        <Link to="/vip" className="text-xs text-muted-foreground underline">← All platforms</Link>
      </div>

      {userId && (
        <TrackSubmitDialog
          userId={userId}
          song={activeSong}
          partnerKey={partner.key}
          tierKey={tier.key}
          pendingTxId={pendingTxId}
          onClose={() => { setActiveSong(null); setPendingTxId(null); }}
          onSubmitted={() => {
            if (activeSong) setJustSubmitted((v) => [...v, activeSong.name]);
            if (activeSong?.exclusiveId) {
              supabase.from("user_exclusive_tasks").update({ consumed: true }).eq("id", activeSong.exclusiveId)
                .then(() => qc.invalidateQueries({ queryKey: ["exclusive-tasks", userId] }));
            }
            qc.invalidateQueries({ queryKey: ["today-promos", userId] });
            qc.invalidateQueries({ queryKey: ["my-tx"] });
            qc.invalidateQueries({ queryKey: ["on-hold", userId] });
          }}

        />
      )}
    </AppShell>
  );
}

function Summary({ tone, icon: Icon, label, value, className, hold }: { tone: "balance" | "hold"; icon: React.ComponentType<{ className?: string }>; label: string; value: string; className?: string; hold?: number | null }) {
  const isBal = tone === "balance";
  return (
    <div className={`rounded-xl p-4 ${isBal ? "bg-[var(--nrc-green)]/10 border border-[var(--nrc-green)]/30" : "bg-[var(--nrc-gold)]/10 border border-[var(--nrc-gold)]/30"} ${className ?? ""}`}>
      <div className={`inline-flex items-center gap-2 text-[11px] font-bold tracking-widest ${isBal ? "text-[var(--nrc-green)]" : "text-[var(--nrc-gold)]"}`}>
        <span className={`w-7 h-7 rounded-md grid place-items-center ${isBal ? "bg-[var(--nrc-green)]/20" : "bg-[var(--nrc-gold)]/20"}`}><Icon className="w-4 h-4" /></span>
        {label}
      </div>
      <div className="mt-2 text-2xl font-black">{value}</div>
      {hold != null && hold > 0 && (
        <div className="mt-3 pt-2 border-t border-[var(--nrc-gold)]/40 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-widest text-[var(--nrc-gold)]"><Clock className="w-3.5 h-3.5" /> ON HOLD</span>
          <span className="font-black text-sm text-[var(--nrc-gold)]">{formatMoney(hold)}</span>
        </div>
      )}
    </div>
  );
}
