import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { X, Send, MessagesSquare, ArrowLeft, Paperclip, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useMyChat, useChatRealtime, sendChatMessage, markThreadRead } from "@/lib/chat";
import { useMe } from "@/lib/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChatMessageBody } from "@/components/ChatMessageBody";
import { SupportContactLinks } from "@/components/SupportContactLinks";
import { useSupportContactsRealtime } from "@/lib/support-contacts";
import { ReadTicks } from "@/components/ReadTicks";

type Attachment = { name: string; type: string; url?: string };
type ChatMsg = { id: string; from: "user" | "agent"; text: string; files?: Attachment[]; seen?: boolean };


function DoubleChatIcon({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex", className)}>
      <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" aria-hidden="true">
        {/* back bubble */}
        <path
          d="M8 4h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-1v3l-3.2-3H10a2 2 0 0 1-2-2V4Z"
          fill="currentColor"
          opacity="0.45"
        />
        {/* front bubble */}
        <path
          d="M4 2h11a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H8.5L4.8 16.4A.5.5 0 0 1 4 16v-3a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"
          fill="currentColor"
        />
        <circle cx="6.5" cy="7.5" r="1.1" className="text-primary" fill="var(--primary)" />
        <circle cx="9.9" cy="7.5" r="1.1" fill="var(--primary)" />
        <circle cx="13.3" cy="7.5" r="1.1" fill="var(--primary)" />
      </svg>
      <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[11px] font-bold flex items-center justify-center border-2 border-primary">
        1
      </span>
    </span>
  );
}

export function SupportWidget() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const qc = useQueryClient();
  useSupportContactsRealtime();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"menu" | "chat">("menu");
  const [input, setInput] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Attachment[]>([]);

  useEffect(() => {
    // Saved chat is tied to the account, so keep the signed-in id stable across
    // refreshes; only an explicit sign-out clears it (the history stays saved).
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user?.id) setUserId(data.session.user.id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user?.id) setUserId(session.user.id);
      else if (event === "SIGNED_OUT") setUserId(null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // When an administrator uses "View as User", show that member's saved thread
  // (read-only) instead of the administrator's own empty thread.
  const { data: me } = useMe();
  const viewingAs = !!me?.viewingAs;
  const threadId = viewingAs ? me!.user.id : userId;

  const { data: dbMessages = [], isError: chatLoadFailed, refetch: reloadChat } = useMyChat(threadId ?? undefined);
  useEffect(() => {
    if (chatLoadFailed) reloadChat();
  }, [chatLoadFailed, reloadChat]);
  useChatRealtime([["support-chat", threadId]]);

  const messages: ChatMsg[] = [
    {
      id: "greeting",
      from: "agent" as const,
      text: "Hi 👋 Welcome to SoundCampaign support. How can we help you today?",
    },
    ...dbMessages.map((m) => ({
      id: m.id,
      from: (m.sender === "admin" ? "agent" : "user") as "user" | "agent",
      text: m.body,
      files: m.attachments,
      seen: m.read_by_admin,
    })),
  ];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [dbMessages.length, view]);

  useEffect(() => {
    if (open && view === "chat" && userId && !viewingAs) markThreadRead(userId, "user");
  }, [open, view, userId, viewingAs, dbMessages.length]);

  if (pathname.startsWith("/admin")) return null;

  const pickFiles = (list: FileList | null) => {
    if (!list) return;
    const next = Array.from(list).map((f) => ({
      name: f.name,
      type: f.type,
      url: URL.createObjectURL(f),
    }));
    setPending((p) => [...p, ...next]);
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text && pending.length === 0) return;
    if (!userId) {
      toast.error("Please sign in to chat with support.");
      return;
    }
    if (viewingAs) {
      toast.error("Viewing as a member is read-only. Reply from the Admin Live Chat.");
      return;
    }
    const files = pending.map((f) => ({ name: f.name, type: f.type }));
    try {
      await sendChatMessage({ userId, sender: "user", body: text, attachments: files });
      setInput("");
      setPending([]);
      await qc.invalidateQueries({ queryKey: ["support-chat", userId] });
    } catch (err: any) {
      // Keep the typed message so nothing is lost when sending fails.
      toast.error(err.message ?? "Could not send message");
    }
  };

  return (
    <div className="fixed bottom-20 right-4 z-[60] sm:bottom-6 sm:right-6 flex flex-col items-end gap-3 print:hidden">
      {open && (

        <div className="w-[300px] sm:w-[340px] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2 px-4 py-3 bg-primary text-primary-foreground">
            {view === "chat" && (
              <button type="button" aria-label="Back" onClick={() => setView("menu")}>
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="flex-1">
              <p className="text-sm font-semibold leading-tight">
                {view === "chat" ? "Live Chat" : "Support"}
              </p>
              <p className="text-[11px] opacity-80 leading-tight">We typically reply in minutes</p>
            </div>
            <button type="button" aria-label="Close support" onClick={() => setOpen(false)}>
              <X className="w-4 h-4" />
            </button>
          </div>

          {view === "menu" ? (
            <div className="p-3 space-y-2">
              <button
                type="button"
                onClick={() => setView("chat")}
                className="w-full flex items-center gap-3 rounded-xl border border-border p-3 text-left hover:bg-accent transition-colors"
              >
                <span className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <MessagesSquare className="w-4 h-4" />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-medium">Live Chat</span>
                  <span className="block text-xs text-muted-foreground">Chat with our team now</span>
                </span>
              </button>

              <SupportContactLinks />
            </div>
          ) : (
            <div className="flex flex-col h-[320px]">
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                      m.from === "user"
                        ? "ml-auto bg-primary text-primary-foreground"
                        : "mr-auto bg-muted text-foreground",
                    )}
                  >
                    {m.text && <ChatMessageBody body={m.text} formatted={m.from === "agent"} />}
                    {m.files && m.files.length > 0 && (
                      <div className={cn("space-y-1", m.text && "mt-2")}>
                        {m.files.map((f, fi) => (
                          <div key={`${f.name}-${fi}`}>
                            {f.type.startsWith("image/") && f.url ? (
                              <img
                                src={f.url}
                                alt={f.name}
                                className="max-h-32 rounded-lg object-cover"
                              />
                            ) : (
                              <a
                                href={f.url ?? "#"}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 rounded-lg bg-background/20 px-2 py-1 text-xs underline"
                              >
                                <FileText className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate max-w-[160px]">{f.name}</span>
                              </a>
                            )}
                          </div>
                        ))}

                      </div>
                    )}
                    {m.from === "user" && (
                      <div className="flex justify-end mt-0.5 opacity-80">
                        <ReadTicks seen={!!m.seen} />
                      </div>
                    )}
                  </div>
                ))}
                <div ref={endRef} />
              </div>

              {pending.length > 0 && (
                <div className="flex flex-wrap gap-1 border-t border-border px-2 pt-2">
                  {pending.map((f, i) => (
                    <span
                      key={`${f.name}-${i}`}
                      className="flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-[11px]"
                    >
                      <FileText className="w-3 h-3" />
                      <span className="truncate max-w-[110px]">{f.name}</span>
                      <button
                        type="button"
                        aria-label={`Remove ${f.name}`}
                        onClick={() => setPending((p) => p.filter((_, j) => j !== i))}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <form onSubmit={send} className="flex items-center gap-2 border-t border-border p-2">
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  accept="image/*,application/pdf,.doc,.docx,.txt,.zip,audio/*,video/*"
                  className="hidden"
                  onChange={(e) => {
                    pickFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  aria-label="Attach file"
                  onClick={() => fileRef.current?.click()}
                  className="w-9 h-9 rounded-full text-muted-foreground hover:bg-accent flex items-center justify-center shrink-0"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 min-w-0 bg-transparent px-2 py-2 text-sm outline-none"
                />
                <button
                  type="submit"
                  aria-label="Send message"
                  className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 shrink-0"
                  disabled={!input.trim() && pending.length === 0}
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close support" : "Open support"}
        className="w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
      >
        {open ? <X className="w-6 h-6" /> : <DoubleChatIcon />}
      </button>
    </div>
  );
}
