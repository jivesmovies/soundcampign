import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Home, Zap, History, Banknote, Bell, LogOut, Users, MoreHorizontal, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useMe, setViewAsId } from "@/lib/hooks";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { ReactNode } from "react";
import { useState } from "react";
import scMark from "@/assets/sc-mark.png.asset.json";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useI18n } from "@/lib/i18n";
import { PlatformAvailability } from "@/components/PlatformAvailability";


function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <img src="/favicon.png" alt="SoundCampaign logo" width={32} height={32} className="w-8 h-8 shrink-0 rounded-lg object-contain" />
      {!compact && (
        <span className="truncate text-sm font-black text-primary-foreground sm:text-base">
          SOUND<span className="text-[var(--nrc-gold)]">CAMPAIGN</span>
        </span>
      )}
    </div>
  );
}

export function TopBar({ title }: { title?: string }) {
  return (
    <header className="bg-[var(--nrc-green-dark)] border-b border-border">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 min-h-14 px-4 max-w-7xl mx-auto text-primary-foreground sm:flex sm:justify-between">
        <BrandMark />
        {title && <span className="hidden text-sm font-semibold text-muted-foreground sm:block">{title}</span>}
        <LanguageSwitcher className="text-primary-foreground" />
      </div>
    </header>
  );
}

const NAV = [
  { to: "/dashboard", icon: Home, label: "Home" },
  { to: "/vip", icon: Zap, label: "Earn" },
  { to: "/notifications", icon: Bell, label: "Notifications" },
  { to: "/wallet", icon: Banknote, label: "Cashout" },
  { to: "/team", icon: History, label: "History" },
] as const;

const MOBILE_NAV: Array<{ to: string; icon: typeof Home; label: string }> = [
  { to: "/dashboard", icon: Home, label: "Home" },
  { to: "/vip", icon: Zap, label: "Earn" },
  { to: "/wallet", icon: Banknote, label: "Cashout" },
  { to: "/team", icon: History, label: "History" },
];

const MORE_ITEMS: Array<{ to: string; icon: typeof Home; label: string }> = [
  { to: "/dashboard", icon: Home, label: "Home" },
  { to: "/vip", icon: Zap, label: "Earn" },
  { to: "/notifications", icon: Bell, label: "Notifications" },
  { to: "/community", icon: Users, label: "Community" },
  { to: "/wallet", icon: Banknote, label: "Cashout" },
  { to: "/team", icon: History, label: "History" },
];

export function AppShell({ title, children, isAdmin }: { title: string; children: ReactNode; isAdmin?: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: me } = useMe();
  const [moreOpen, setMoreOpen] = useState(false);
  const { t } = useI18n();
  const L = (label: string) => t("nav." + label.toLowerCase().replace(/\s+/g, ""), label);
  const initials = (me?.profile?.display_name || me?.profile?.username || me?.user?.email || "U")
    .split(/\s+/).map((s) => s[0]).join("").slice(0, 2).toUpperCase();

  const items: Array<{ to: string; icon: typeof Home; label: string }> = [...NAV];
  items.splice(3, 0, { to: "/community", icon: Users, label: "Community" });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen flex bg-[oklch(0.97_0.01_250)] dark:bg-background">
      {me?.viewingAs && (
        <div className="fixed top-0 inset-x-0 z-50 bg-[var(--nrc-gold)] text-[var(--nrc-green-dark)] text-xs font-semibold px-3 py-1.5 flex items-center justify-center gap-3">
          <span>Viewing as {me.viewingAs.display_name || me.viewingAs.username}</span>
          <button
            className="underline"
            onClick={() => { setViewAsId(null); qc.invalidateQueries(); navigate({ to: "/admin" }); }}
          >
            Exit
          </button>
        </div>
      )}
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col bg-[var(--nrc-green-dark)] text-primary-foreground">
        <div className="px-5 py-4 flex items-center gap-2 border-b border-white/10">
          <img src="/favicon.png" alt="SoundCampaign logo" width={32} height={32} className="w-8 h-8 shrink-0 rounded-lg object-contain" />
          <span className="font-black tracking-wider">SOUND<span className="text-[var(--nrc-gold)]">CAMPAIGN</span></span>
        </div>
        <div className="px-5 pt-4 pb-2 text-[10px] uppercase tracking-widest opacity-60">{L("Menu")}</div>
        <nav className="flex-1 px-2 space-y-1">
          {items.map((it) => {
            const active = pathname === it.to;
            const Icon = it.icon;
            return (
              <Link key={it.to} to={it.to as any}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm ${active ? "bg-[var(--nrc-green)] text-primary-foreground font-semibold" : "text-white/70 hover:bg-white/5"}`}>
                <Icon className="w-4 h-4" /> {L(it.label)}
              </Link>
            );
          })}
          <Link to="/profile"
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm ${pathname === "/profile" ? "bg-[var(--nrc-green)] text-primary-foreground font-semibold" : "text-white/70 hover:bg-white/5"}`}>
            <Avatar className="w-5 h-5"><AvatarFallback className="text-[10px] bg-[var(--nrc-gold)] text-[var(--nrc-green-dark)] font-bold">{initials}</AvatarFallback></Avatar>
            {L("Profile")}
          </Link>
        </nav>
        <button onClick={signOut} className="m-3 flex items-center gap-2 px-3 py-2 rounded-md text-sm text-white/70 hover:bg-white/5">
          <LogOut className="w-4 h-4" /> {L("Logout")}
        </button>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden bg-[var(--nrc-green-dark)] border-b border-border">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 h-14 px-4 text-primary-foreground">
            <BrandMark />
            <LanguageSwitcher className="text-primary-foreground" />
          </div>
        </header>
        {/* Desktop top bar slim */}
        <header className="hidden md:flex items-center justify-between h-12 px-6 border-b border-border bg-card">
          <span className="text-sm font-semibold">{title}</span>
          <LanguageSwitcher />
        </header>

        <main className="flex-1 pb-24 md:pb-8 w-full max-w-7xl mx-auto px-4 md:px-8 py-4 md:py-6"><PlatformAvailability>{children}</PlatformAvailability></main>

        {/* Mobile "More" sheet */}
        {moreOpen && (
          <div className="md:hidden fixed inset-0 z-40" onClick={() => setMoreOpen(false)}>
            <div className="absolute inset-0 bg-black/60" />
            <div className="absolute bottom-0 inset-x-0 bg-[var(--nrc-green-dark)] text-primary-foreground rounded-t-2xl p-4 pb-24"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold">{L("More")}</span>
                <button onClick={() => setMoreOpen(false)} className="text-white/70"><X className="w-5 h-5" /></button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {MORE_ITEMS.map((it) => {
                  const Icon = it.icon;
                  const active = pathname === it.to;
                  return (
                    <Link key={it.to} to={it.to as any} onClick={() => setMoreOpen(false)}
                      className={`flex flex-col items-center gap-1.5 rounded-xl py-3 text-[11px] ${active ? "bg-[var(--nrc-green)] font-semibold" : "bg-white/5 text-white/80"}`}>
                      <Icon className="w-5 h-5" /> {L(it.label)}
                    </Link>
                  );
                })}
                <Link to="/profile" onClick={() => setMoreOpen(false)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl py-3 text-[11px] ${pathname === "/profile" ? "bg-[var(--nrc-green)] font-semibold" : "bg-white/5 text-white/80"}`}>
                  <Avatar className="w-5 h-5"><AvatarFallback className="text-[9px] bg-[var(--nrc-gold)] text-[var(--nrc-green-dark)] font-bold">{initials}</AvatarFallback></Avatar>
                  {L("Profile")}
                </Link>
              </div>
              <button onClick={signOut} className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 text-white/80 text-sm">
                <LogOut className="w-4 h-4" /> {L("Logout")}
              </button>
            </div>
          </div>
        )}

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 bg-[var(--nrc-green-dark)] border-t border-white/10 z-50">
          <div className="grid grid-cols-5 px-1">
            {MOBILE_NAV.map((it) => {
              const active = pathname === it.to;
              const Icon = it.icon;
              return (
                <Link key={it.to} to={it.to as any} onClick={() => setMoreOpen(false)}
                  className="flex flex-col items-center justify-center py-2 text-[10px] text-white">
                <span className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-xl transition-colors ${active ? "text-[var(--nrc-gold)] font-bold" : "text-white"}`}>
                    <Icon className="w-5 h-5 mb-0.5" />
                    {L(it.label)}
                  </span>
                </Link>
              );
            })}
            <button onClick={() => setMoreOpen((s) => !s)}
              className="flex flex-col items-center justify-center py-2 text-[10px] text-white">
              <span className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-xl transition-colors ${moreOpen ? "text-[var(--nrc-gold)] font-bold" : "text-white"}`}>
                  <MoreHorizontal className="w-5 h-5 mb-0.5" />
                  {L("More")}
                </span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}
