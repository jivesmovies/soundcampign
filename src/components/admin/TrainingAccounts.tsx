import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  createTrainingAccount, listTrainingAccounts, updateTrainingAccount,
  deleteUserAccount, deleteAllTrainingAccounts,
} from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, Edit3, UserCog, Hash, Users } from "lucide-react";
import { toast } from "sonner";
import { UserDetail } from "@/components/admin/UserManagement";
import { Settings2 } from "lucide-react";
import { WAREHOUSE_TIERS, LEVEL_FOR_TIER_INDEX, tierIndexForLevel } from "@/lib/warehouse";
import { useAdminReadOnly } from "@/lib/admin-permissions";

type Row = Awaited<ReturnType<typeof listTrainingAccounts>>[number];

const blank = {
  email: "", password: "", username: "", displayName: "",
  phone: "", balance: "0", vipLevel: "0", inviteCode: "",
};

export function TrainingAccounts() {
  const readOnly = useAdminReadOnly();
  const qc = useQueryClient();
  const list = useServerFn(listTrainingAccounts);
  const create = useServerFn(createTrainingAccount);
  const update = useServerFn(updateTrainingAccount);
  const del = useServerFn(deleteUserAccount);
  const delAll = useServerFn(deleteAllTrainingAccounts);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["training-accounts"],
    queryFn: () => list({ data: undefined as never }),
    refetchInterval: 4000,
  });

  const [open, setOpen] = useState(false);
  const [managing, setManaging] = useState<string | null>(null);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState({ ...blank });
  const set = (k: keyof typeof blank, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["training-accounts"] });
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  };

  const save = useMutation({
    mutationFn: async () => {
      if (editing) {
        return update({
          data: {
            userId: editing.id,
            email: form.email || undefined,
            password: form.password || undefined,
            username: form.username || undefined,
            displayName: form.displayName || undefined,
            phone: form.phone,
            balance: Number(form.balance) || 0,
          },
        });
      }
      if (!form.email || !form.password || !form.username) throw new Error("Email, username and password are required");
      if (form.password.length < 6) throw new Error("Password must be at least 6 characters");
      return create({
        data: {
          email: form.email,
          password: form.password,
          username: form.username,
          displayName: form.displayName || form.username,
          phone: form.phone,
          balance: Number(form.balance) || 0,
          vipLevel: LEVEL_FOR_TIER_INDEX[Number(form.vipLevel) || 0] ?? 0,
          inviteCode: form.inviteCode,
        },
      });
    },
    onSuccess: () => {
      toast.success(editing ? "Training account updated" : "Training account created — it can now log in");
      setOpen(false); setEditing(null); setForm({ ...blank }); refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => del({ data: { userId: id } }),
    onSuccess: () => { toast.success("Account deleted"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeAll = useMutation({
    mutationFn: () => delAll({ data: undefined as never }),
    onSuccess: (result) => { toast.success(`${result.count} training accounts deleted`); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const managed = rows.find((r) => r.id === managing);
  if (managed) return <UserDetail user={managed} onBack={() => { setManaging(null); refresh(); }} />;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Training Accounts</h2>
        <p className="text-sm text-muted-foreground">
          Create virtual accounts for training purposes. These accounts can log in to the user panel and perform tasks like normal users.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => { setEditing(null); setForm({ ...blank }); setOpen(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Create Training/Virtual Account
        </Button>
        <Button
          variant="destructive"
          disabled={!rows.length || removeAll.isPending}
          onClick={() => { if (confirm(`Permanently delete ${readOnly ? "all training accounts you created" : "all training accounts"}?`)) removeAll.mutate(); }}
        >
          <Trash2 className="w-4 h-4 mr-1" /> {readOnly ? "Delete My Accounts" : "Delete All"} ({rows.length})
        </Button>
      </div>

      {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
      {!isLoading && !rows.length && (
        <div className="border border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
          No training accounts yet.
        </div>
      )}

      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.id} className="grid grid-cols-2 items-start gap-2">
            <div className="min-w-0 border border-border rounded-lg p-3 bg-card">
              <div className="text-xs text-muted-foreground">Referring account</div>
              <div className="font-semibold break-all mt-1">{r.referrerName || "No linked referrer"}</div>
            </div>
            <div className="min-w-0 border border-border rounded-lg p-3 flex flex-wrap items-center gap-3 bg-card">
            <div className="hidden lg:grid w-10 h-10 rounded-full bg-muted place-items-center shrink-0">
              <UserCog className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold break-all">{r.display_name || r.username}</span>
                <Badge variant="secondary">{WAREHOUSE_TIERS[tierIndexForLevel(r.vip_level)]?.label ?? "Normal"}</Badge>
                <Badge variant="outline">Training</Badge>
              </div>
              <div className="text-xs text-muted-foreground truncate">
                @{r.username}{r.email ? ` · ${r.email}` : ""}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap mt-0.5">
                <span className="flex items-center gap-1"><Hash className="w-3 h-3" /> Code: <span className="font-mono font-semibold">{r.invite_code}</span></span>
                {r.referrerName && (
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Referred by: <span className="font-semibold">{r.referrerName}</span></span>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-bold">${Number(r.balance).toFixed(2)}</div>
              <div className="text-[11px] text-muted-foreground">Balance</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setManaging(r.id)}>
                <Settings2 className="w-4 h-4 mr-1" /> Manage
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                setEditing(r);
                setForm({
                  ...blank, email: r.email, username: r.username,
                  displayName: r.display_name || "", phone: r.phone || "",
                  balance: String(r.balance), vipLevel: String(tierIndexForLevel(r.vip_level)),
                });
                setOpen(true);
              }}>
                <Edit3 className="w-4 h-4 mr-1" /> Edit
              </Button>
              <Button variant="destructive" size="sm" disabled={remove.isPending}
                onClick={() => { if (confirm(`Permanently delete ${r.username}?`)) remove.mutate(r.id); }}>
                <Trash2 className="w-4 h-4 mr-1" /> Delete
              </Button>
            </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Training Account" : "Create Training/Virtual Account"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update the login details or balance." : "The account can sign in to the user panel with this email and password."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Username</Label><Input value={form.username} onChange={(e) => set("username", e.target.value)} /></div>
              <div><Label>Display name</Label><Input value={form.displayName} onChange={(e) => set("displayName", e.target.value)} /></div>
            </div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></div>
            <div>
              <Label>Password {editing && <span className="text-muted-foreground text-xs">(leave blank to keep)</span>}</Label>
              <Input value={form.password} onChange={(e) => set("password", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} /></div>
              <div><Label>Balance ($)</Label><Input type="number" value={form.balance} onChange={(e) => set("balance", e.target.value)} /></div>
            </div>
            {!editing && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Level</Label>
                  <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={form.vipLevel} onChange={(e) => set("vipLevel", e.target.value)}>
                    {WAREHOUSE_TIERS.map((t, i: number) => <option key={t.key} value={i}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Invitation code</Label>
                  <Input value={form.inviteCode} onChange={(e) => set("inviteCode", e.target.value)} placeholder="Referrer code" />
                </div>
              </div>
            )}
            {!editing && (
              <p className="text-[11px] text-muted-foreground">
                The referrer earns an extra 20% of every profit this account submits — nothing is deducted from this account.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? "Saving…" : editing ? "Save changes" : "Create account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
