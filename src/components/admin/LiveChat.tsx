import { useEffect, useState } from "react";
import { MessageCircle, Paperclip, Trash2, CheckSquare, X, Pencil } from "lucide-react";
import { ChatReplyComposer } from "@/components/admin/ChatReplyComposer";
import { ChatMessageBody } from "@/components/ChatMessageBody";
import { ReadTicks } from "@/components/ReadTicks";
import { useAdminReadOnly } from "@/lib/admin-permissions";
import {
  useAllChats,
  useChatRealtime,
  sendChatMessage,
  markThreadRead,
  toggleMessageSelection,
  deleteChatMessages,
  editChatMessage,
  deleteChatThread,
  deleteAllChats,
} from "@/lib/chat";
import { decodeChatDocument } from "@/lib/chat-format";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Confirm =
  | { kind: "selected" }
  | { kind: "thread"; userId: string; name: string }
  | { kind: "all" }
  | null;

export function LiveChat({ initialThreadId }: { initialThreadId?: string | null }) {
  const qc = useQueryClient();
  const readOnly = useAdminReadOnly();
  const { data: threads = [], isLoading } = useAllChats();
  useChatRealtime([["support-chat-all"]]);
  const [activeId, setActiveId] = useState<string | null>(initialThreadId ?? null);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeId && threads.length) setActiveId(threads[0].id);
  }, [threads, activeId]);

  const active = threads.find((t) => t.id === activeId) ?? null;

  useEffect(() => {
    if (!readOnly && active && active.unread > 0) {
      markThreadRead(active.id, "admin").then(() =>
        qc.invalidateQueries({ queryKey: ["support-chat-all"] }),
      );
    }
  }, [active?.id, active?.unread, qc]);

  // Leaving a thread or turning off selection clears any picked messages.
  useEffect(() => {
    setSelecting(false);
    setSelected([]);
    setEditingId(null);
  }, [activeId]);

  const send = async (body: string) => {
    if (!active) throw new Error("Select a conversation first.");
    await sendChatMessage({ userId: active.id, sender: "admin", body });
    await qc.invalidateQueries({ queryKey: ["support-chat-all"] });
  };

  const editingMsg = active?.messages.find((m) => m.id === editingId && m.sender === "admin") ?? null;

  const refresh = () => qc.invalidateQueries({ queryKey: ["support-chat-all"] });

  const runDelete = async () => {
    if (!confirm) return;
    setDeleting(true);
    try {
      if (confirm.kind === "selected") {
        await deleteChatMessages(selected);
        toast.success(`Deleted ${selected.length} message${selected.length === 1 ? "" : "s"}.`);
        setSelected([]);
        setSelecting(false);
      } else if (confirm.kind === "thread") {
        await deleteChatThread(confirm.userId);
        toast.success(`Deleted the conversation with ${confirm.name}.`);
        if (activeId === confirm.userId) setActiveId(null);
      } else {
        await deleteAllChats();
        toast.success("Deleted all chat history.");
        setActiveId(null);
      }
      setConfirm(null);
      await refresh();
    } catch (err: any) {
      toast.error(err.message ?? "Could not delete. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const confirmText =
    confirm?.kind === "selected"
      ? `This permanently deletes the ${selected.length} selected message${selected.length === 1 ? "" : "s"}. This cannot be undone.`
      : confirm?.kind === "thread"
        ? `This permanently deletes the entire conversation with ${confirm.name}. This cannot be undone.`
        : confirm?.kind === "all"
          ? "This permanently deletes every support conversation for all members. This cannot be undone."
          : "";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Live Chat</h1>
          <p className="text-sm text-muted-foreground">Real-time support conversations with users.</p>
        </div>
        {!readOnly && threads.length > 0 && (
          <button
            type="button"
            onClick={() => setConfirm({ kind: "all" })}
            className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/40 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete all
          </button>
        )}
      </div>
      <div className="grid md:grid-cols-[280px_minmax(0,1fr)] gap-3">
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <ul className="divide-y divide-border max-h-[70vh] overflow-auto">
            {threads.length === 0 && (
              <li className="px-3 py-6 text-center text-xs text-muted-foreground">
                {isLoading ? "Loading conversations…" : "No conversations yet."}
              </li>
            )}
            {threads.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => setActiveId(t.id)}
                  className={`w-full text-left px-3 py-3 flex items-center gap-3 ${t.id === activeId ? "bg-accent" : "hover:bg-accent/50"}`}
                >
                  <span className="w-9 h-9 rounded-full bg-[var(--nrc-green)] text-primary-foreground grid place-items-center text-xs font-bold shrink-0">{t.initials}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold truncate">{t.name}</span>
                    <span className="block text-[11px] text-muted-foreground truncate">{t.preview}</span>
                  </span>
                  {t.unread > 0 && <span className="text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full px-1.5 py-0.5">{t.unread}</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-card border border-border rounded-xl flex min-w-0 flex-col min-h-[60vh]">
          <div className="px-4 py-3 border-b border-border font-semibold flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-[var(--nrc-gold)]" />
            <span className="min-w-0 flex-1 truncate">{active?.name ?? "No conversation"}</span>
            {!readOnly && active && !selecting && (
              <>
                <button
                  type="button"
                  onClick={() => setSelecting(true)}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:bg-accent"
                >
                  <CheckSquare className="w-3.5 h-3.5" /> Select
                </button>
                <button
                  type="button"
                  aria-label="Delete conversation"
                  onClick={() => setConfirm({ kind: "thread", userId: active.id, name: active.name })}
                  className="inline-flex items-center gap-1 rounded-lg border border-destructive/40 px-2.5 py-1 text-xs font-medium text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </>
            )}
            {active && selecting && (
              <button
                type="button"
                onClick={() => {
                  setSelecting(false);
                  setSelected([]);
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:bg-accent"
              >
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
            )}
          </div>
          <div className="flex-1 p-4 space-y-3 overflow-auto">
            {active?.messages.map((m) => {
              const picked = selected.includes(m.id);
              const bubble = (
                <div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${m.sender === "admin" ? "ml-auto bg-[var(--nrc-green)] text-primary-foreground" : "bg-muted"} ${selecting && picked ? "ring-2 ring-destructive" : ""}`}>
                  {m.body && <ChatMessageBody body={m.body} formatted={m.sender === "admin"} />}
                  {m.attachments.map((a, i) => (
                    <div key={i} className="mt-1 inline-flex items-center gap-1 text-[11px] opacity-90">
                      <Paperclip className="w-3 h-3" /> {a.name}
                    </div>
                  ))}
                  <div className="text-[10px] opacity-70 mt-1 flex items-center justify-end gap-1">
                    {m.edited_at && <span>edited ·</span>}
                    <span>{new Date(m.created_at).toLocaleString()}</span>
                    {!readOnly && !selecting && m.sender === "admin" && (
                      <button type="button" aria-label="Edit message" onClick={() => setEditingId(m.id)}
                        className="ml-1 rounded p-0.5 hover:bg-background/20">
                        <Pencil className="w-3 h-3" />
                      </button>
                    )}
                    {m.sender === "admin" && <ReadTicks seen={m.read_by_user} />}
                  </div>
                </div>
              );
              return selecting ? (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelected((s) => toggleMessageSelection(s, m.id))}
                  className="flex w-full items-center gap-2 text-left"
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${picked ? "border-destructive bg-destructive text-destructive-foreground" : "border-border"}`}
                  >
                    {picked && <CheckSquare className="w-3.5 h-3.5" />}
                  </span>
                  <span className="min-w-0 flex-1">{bubble}</span>
                </button>
              ) : (
                <div key={m.id}>{bubble}</div>
              );
            })}
          </div>
          {selecting ? (
            <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
              <span className="text-xs text-muted-foreground">
                {selected.length} selected
              </span>
              <button
                type="button"
                disabled={selected.length === 0}
                onClick={() => setConfirm({ kind: "selected" })}
                className="inline-flex items-center gap-1.5 rounded-lg bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete selected
              </button>
            </div>
          ) : (
            readOnly ? (
              <div className="border-t border-border px-4 py-3 text-center text-xs text-muted-foreground">
                Read-only access — you can view this conversation but cannot reply.
              </div>
            ) : (
              editingMsg ? (
                <ChatReplyComposer
                  key={`edit-${editingMsg.id}`}
                  disabled={false}
                  initialContent={decodeChatDocument(editingMsg.body) ?? editingMsg.body}
                  submitLabel="Save edit"
                  onCancel={() => setEditingId(null)}
                  onSend={async (body) => {
                    await editChatMessage(editingMsg.id, body);
                    toast.success("Message updated.");
                    setEditingId(null);
                    await refresh();
                  }}
                />
              ) : (
                <ChatReplyComposer key={active?.id ?? "empty"} disabled={!active} onSend={send} />
              )
            )
          )}
        </div>
      </div>

      <AlertDialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.kind === "all"
                ? "Delete all chat history?"
                : confirm?.kind === "thread"
                  ? "Delete this conversation?"
                  : "Delete selected messages?"}
            </AlertDialogTitle>
            <AlertDialogDescription>{confirmText}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void runDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting…" : "Delete permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
