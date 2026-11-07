import { useState } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import { Bold, Highlighter, Pilcrow, Space, CornerDownLeft, Eraser, Undo2, Redo2, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { chatBodyText, encodeChatDocument } from "@/lib/chat-format";
import { toast } from "sonner";

export function ChatReplyComposer({ disabled, onSend, initialContent, submitLabel = "Send", onCancel }: {
  disabled: boolean;
  onSend: (body: string) => Promise<void>;
  initialContent?: object | string;
  submitLabel?: string;
  onCancel?: () => void;
}) {
  const [sending, setSending] = useState(false);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        blockquote: false, bulletList: false, code: false, codeBlock: false,
        heading: false, horizontalRule: false, italic: false, listItem: false,
        listKeymap: false, link: false, orderedList: false, strike: false, underline: false,
      }),
      Highlight,
    ],
    content: initialContent ?? "",
    editable: !disabled,
    parseOptions: { preserveWhitespace: "full" },
    editorProps: {
      attributes: {
        role: "textbox", "aria-label": "Reply message", "aria-multiline": "true",
        class: "chat-message-content min-h-24 max-h-60 overflow-y-auto px-3 py-2 text-sm outline-none",
      },
    },
  });
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current?.isActive("bold") ?? false,
      highlight: current?.isActive("highlight") ?? false,
      hasText: current ? Boolean(chatBodyText(encodeChatDocument(current.getJSON())).trim()) : false,
      undo: current?.can().undo() ?? false,
      redo: current?.can().redo() ?? false,
    }),
  });

  const send = async () => {
    if (!editor || disabled || sending) return;
    const body = encodeChatDocument(editor.getJSON());
    if (!chatBodyText(body).trim()) return;
    setSending(true);
    editor.setEditable(false);
    try {
      await onSend(body);
      editor.commands.clearContent();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send message");
    } finally {
      setSending(false);
      if (!editor.isDestroyed) editor.setEditable(!disabled);
    }
  };

  const tools = [
    { label: "Bold", icon: Bold, active: state?.bold, run: () => editor?.chain().focus().toggleBold().run() },
    { label: "Highlight text", icon: Highlighter, active: state?.highlight, run: () => editor?.chain().focus().toggleHighlight().run() },
    { label: "New paragraph", icon: Pilcrow, run: () => editor?.chain().focus().splitBlock().run() },
    { label: "Line break", icon: CornerDownLeft, run: () => editor?.chain().focus().setHardBreak().run() },
    { label: "Insert space", icon: Space, run: () => editor?.chain().focus().insertContent(" ", { parseOptions: { preserveWhitespace: "full" } }).run() },
    { label: "Clear formatting", icon: Eraser, run: () => editor?.chain().focus().unsetAllMarks().run() },
    { label: "Undo", icon: Undo2, unavailable: !state?.undo, run: () => editor?.chain().focus().undo().run() },
    { label: "Redo", icon: Redo2, unavailable: !state?.redo, run: () => editor?.chain().focus().redo().run() },
  ];

  return (
    <div className="border-t border-border p-3">
      <div className="overflow-hidden rounded-lg border border-input bg-background text-foreground">
        <TooltipProvider delayDuration={200}>
          <div role="toolbar" aria-label="Reply formatting" className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/40 p-1">
            {tools.map((tool) => (
              <Tooltip key={tool.label}>
                <TooltipTrigger asChild>
                  <Button type="button" variant={tool.active ? "secondary" : "ghost"} size="icon"
                    className="h-8 w-8 shrink-0" aria-label={tool.label}
                    aria-pressed={tool.active} disabled={disabled || sending || !editor || tool.unavailable}
                    onMouseDown={(event) => event.preventDefault()} onClick={tool.run}>
                    <tool.icon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{tool.label}</TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
        <EditorContent editor={editor} />
        <div className="flex justify-end gap-2 border-t border-border p-2">
          {onCancel && <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={sending}>Cancel</Button>}
          <Button type="button" size="sm" onClick={send} aria-label={submitLabel === "Send" ? "Send reply" : submitLabel} disabled={disabled || sending || !state?.hasText}>
            {sending ? <Loader2 className="animate-spin" /> : <Send />} {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}