import { useEffect, useState } from "react";
import { Gift, X } from "lucide-react";
import { useMe } from "@/lib/hooks";
import { usePlatformConfig } from "@/lib/platform-config";

export const WELCOME_BONUS_KEY = "gt_welcome_bonus";

/** Shows a dismissible $10 welcome bonus card right after sign up. */
export function WelcomeBonus() {
  const { data: me } = useMe();
  const { data: config } = usePlatformConfig();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(WELCOME_BONUS_KEY) === "1") setOpen(true);
  }, []);

  function close() {
    sessionStorage.removeItem(WELCOME_BONUS_KEY);
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="relative w-full max-w-sm bg-card border border-border rounded-2xl p-6 text-center shadow-lg">
        <button
          onClick={close}
          aria-label="Close"
          className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="mx-auto w-14 h-14 rounded-full bg-[var(--nrc-green)]/15 grid place-items-center">
          <Gift className="w-7 h-7 text-[var(--nrc-green)]" />
        </div>
        <h2 className="mt-3 text-xl font-black">Welcome bonus unlocked!</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          <span className="font-bold text-[var(--nrc-green)]">${Number(me?.profile?.balance ?? config?.welcomeBonus ?? 10).toFixed(2)}</span> has been credited to your
          account balance to help you start promoting.
        </p>
        <button
          onClick={close}
          className="mt-5 w-full bg-[var(--nrc-green)] text-primary-foreground font-bold py-2.5 rounded-lg text-sm"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
