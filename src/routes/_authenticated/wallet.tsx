import { requireUserPanel } from "@/lib/role-guard";
import { createFileRoute, Navigate, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useMe, formatMoney, useOnHold } from "@/lib/hooks";
import { fetchCashoutHistory } from "@/lib/cashout-history";
import { WithdrawReceiptButton } from "@/components/WithdrawReceipt";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { walletFromNote, shortAddress } from "@/lib/crypto";
import { Wallet as WalletIcon, Clock, ArrowDownToLine, ArrowUpFromLine, Plus, Inbox } from "lucide-react";
import { useEffect, useState } from "react";
import { AddWalletForm } from "@/components/AddWalletForm";

export const Route = createFileRoute("/_authenticated/wallet")({
  beforeLoad: () => requireUserPanel(),
  head: () => ({
    meta: [
      {"title": "Wallet — SoundCampaign"},
      {"name": "description", "content": "View your SoundCampaign balance, deposits and withdrawal options."},
      {"property": "og:title", "content": "Wallet — SoundCampaign"},
      {"property": "og:description", "content": "View your SoundCampaign balance, deposits and withdrawal options."},
      {"property": "og:type", "content": "website"},
      {"name": "twitter:card", "content": "summary"},
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { deposit?: boolean } =>
    s.deposit === true || s.deposit === "true" ? { deposit: true } : {},
  component: WalletPage,
});

function WalletPage() {
  const { data: me } = useMe();
  const { deposit } = Route.useSearch();
  const navigate = useNavigate();

  useEffect(() => {
    if (deposit) navigate({ to: "/deposit" });
  }, [deposit, navigate]);
  const userId = me?.user.id;
  const [adding, setAdding] = useState(false);
  const { data: wallets = [] } = useQuery({
    queryKey: ["wallets", me?.user.id],
    enabled: !!me?.user.id,
    queryFn: async () => {
      if (!userId) return [];
      return (await supabase.from("user_wallets").select("*").eq("user_id", userId).order("created_at", { ascending: false })).data ?? [];
    },
  });
  const { data: hold = 0 } = useOnHold(me?.user.id);
  const { data: tx = [], isPending: historyLoading, isError: historyError, refetch: retryHistory } = useQuery({
    queryKey: ["my-tx", userId, "cashout"],
    enabled: !!me?.user.id,
    queryFn: async () => {
      if (!userId) return [];
      return fetchCashoutHistory(userId);
    },
  });
  if (!me) return me === null ? <Navigate to="/auth" /> : null;
  const p = me.profile;

  return (
    <AppShell title="Wallet" isAdmin={me.isAdmin}>
      <h1 className="text-2xl font-black">Wallet</h1>
      <p className="text-sm text-muted-foreground">Manage your crypto deposits and withdrawals</p>

      <div className="grid md:grid-cols-2 gap-3 mt-4">
        <Balance tone="balance" label="AVAILABLE BALANCE" value={formatMoney(p?.balance)} icon={WalletIcon} hold={Number(p?.balance ?? 0) < 0 ? hold : null} />
        <Balance tone="balance" label="TOTAL EARNED"      value={formatMoney(p?.total_earned)} icon={WalletIcon} />
      </div>

      <div className="grid md:grid-cols-2 gap-3 mt-3">
        <Link to="/deposit" className="bg-[var(--nrc-green-dark)] text-primary-foreground font-semibold py-3 rounded-lg inline-flex items-center justify-center gap-2">
          <ArrowDownToLine className="w-4 h-4" /> Deposit
        </Link>
        <Link to="/withdraw" className="bg-card border border-border font-semibold py-3 rounded-lg inline-flex items-center justify-center gap-2">
          <ArrowUpFromLine className="w-4 h-4" /> Withdraw
        </Link>
      </div>

      <section className="mt-5 bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="font-semibold">Saved Wallets</div>
          <button onClick={() => setAdding((v) => !v)} className="text-xs font-semibold border border-border rounded-md px-3 py-1.5 inline-flex items-center gap-1">
            <Plus className="w-3 h-3" /> Add Wallet
          </button>
        </div>
        {adding && userId && <AddWalletForm userId={userId} onDone={() => setAdding(false)} />}
        {wallets.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">No saved wallets yet.</div>
        ) : (
          <ul className="divide-y divide-border">
            {wallets.map((w) => (
              <li key={w.id} className="py-2.5 text-sm">
                <div className="font-medium">{w.label || w.asset}</div>
                <div className="text-[11px] text-muted-foreground break-all">{w.asset} · {w.address}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-4 bg-card border border-border rounded-xl p-4">
        <div className="font-semibold mb-2">Transaction History</div>
        {historyError ? (
          <div role="alert" className="py-8 text-center text-sm text-destructive">
            <p>Could not load deposit and withdrawal history.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => retryHistory()}>Try again</Button>
          </div>
        ) : historyLoading ? (
          <div role="status" className="py-8 text-center text-sm text-muted-foreground">Loading transactions…</div>
        ) : tx.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground"><Inbox className="w-8 h-8 mx-auto mb-2 opacity-40" />No deposits or withdrawals yet.</div>
        ) : (
          <ul className="divide-y divide-border">
            {tx.map((t) => {
              const address = walletFromNote(t.note);
              return (
              <li key={t.id} className="flex items-center justify-between py-2.5 text-sm">
                <div className="min-w-0">
                  <div className="font-medium">{t.kind === "withdraw" ? "Withdrawal" : "Deposit"}</div>
                  {address && (
                    <div className="text-[11px] font-mono text-muted-foreground truncate">{shortAddress(address)}</div>
                  )}
                  <div className="text-[11px] text-muted-foreground">{new Date(t.created_at).toLocaleString()}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="font-semibold">{formatMoney(t.amount)}</span>
                  {t.kind === "withdraw" && t.status === "approved" && <WithdrawReceiptButton tx={t} username={p?.username} />}
                </div>
              </li>
              );
            })}
          </ul>
        )}
      </section>

    </AppShell>
  );
}

function Balance({ tone, label, value, icon: Icon, hold }: { tone: "balance" | "hold"; label: string; value: string; icon: React.ComponentType<{ className?: string }>; hold?: number | null }) {
  const isBal = tone === "balance";
  return (
    <div className={`rounded-xl p-5 ${isBal ? "bg-[var(--nrc-green)]/10 border border-[var(--nrc-green)]/30" : "bg-[var(--nrc-gold)]/10 border border-[var(--nrc-gold)]/30"}`}>
      <div className={`inline-flex items-center gap-2 text-[11px] font-bold tracking-widest ${isBal ? "text-[var(--nrc-green)]" : "text-[var(--nrc-gold)]"}`}>
        <span className={`w-7 h-7 rounded-md grid place-items-center ${isBal ? "bg-[var(--nrc-green)]/20" : "bg-[var(--nrc-gold)]/20"}`}><Icon className="w-4 h-4" /></span>
        {label}
      </div>
      <div className="mt-3 text-3xl font-black">{value}</div>
      {hold != null && hold > 0 && (
        <div className="mt-3 pt-2 border-t border-[var(--nrc-gold)]/40 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-widest text-[var(--nrc-gold)]"><Clock className="w-3.5 h-3.5" /> ON HOLD</span>
          <span className="font-black text-sm text-[var(--nrc-gold)]">{formatMoney(hold)}</span>
        </div>
      )}
    </div>
  );
}