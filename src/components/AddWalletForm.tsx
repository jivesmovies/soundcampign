import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CRYPTO_ASSETS, type CryptoAsset } from "@/lib/crypto";
import { toast } from "sonner";

export function AddWalletForm({ userId, onDone }: { userId: string; onDone: () => void }) {
  const qc = useQueryClient();
  const [asset, setAsset] = useState<CryptoAsset | "">("");
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    const a = address.trim();
    if (!asset) return toast.error("Select a cryptocurrency.");
    if (a.length < 12 || /\s/.test(a)) return toast.error("Enter a valid wallet address.");
    setBusy(true);
    const { error } = await supabase.from("user_wallets").insert({ user_id: userId, asset, address: a, label: label.trim() || null });
    setBusy(false);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["wallets", userId] });
    toast.success("Wallet saved.");
    onDone();
  };
  const cls = "w-full bg-background border border-border rounded-md px-3 py-2 text-sm";
  return (
    <div className="mt-3 rounded-lg border border-border p-3 space-y-2">
      <select value={asset} onChange={(e) => setAsset(e.target.value as CryptoAsset)} className={cls} aria-label="Cryptocurrency">
        <option value="">Choose a cryptocurrency</option>
        {CRYPTO_ASSETS.map((c) => <option key={c.key} value={c.key}>{c.key} · {c.network}</option>)}
      </select>
      <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (optional)" className={cls} />
      <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Wallet address" aria-label="Wallet address" className={`${cls} font-mono`} />
      <div className="grid grid-cols-2 gap-2">
        <button onClick={onDone} className="border border-border text-sm font-semibold py-2 rounded-md">Cancel</button>
        <button onClick={save} disabled={busy} className="bg-[var(--nrc-green)] text-primary-foreground text-sm font-semibold py-2 rounded-md disabled:opacity-60">
          {busy ? "Saving…" : "Save Wallet"}
        </button>
      </div>
    </div>
  );
}
