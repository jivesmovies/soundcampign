import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";

import { linkReferralCode } from "@/lib/admin.functions";
import { signInWithUsername, checkInviteCode } from "@/lib/auth.functions";
import { hasAdminAccess } from "@/lib/auth-roles";
import { setViewAsId } from "@/lib/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { TopBar } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { CountrySelect } from "@/components/CountrySelect";
import { Loader2, User, Mail, Lock, Phone, KeyRound, Eye, EyeOff, Ticket } from "lucide-react";
import { z } from "zod";
import { WELCOME_BONUS_KEY } from "@/components/WelcomeBonus";
import { sharedLinkMeta } from "@/lib/social-sharing";
import { getRequestOrigin } from "@/lib/origin.functions";
import { fetchPlatformConfig, usePlatformConfig } from "@/lib/platform-config";


/** Blocks suspended accounts: signs them straight back out. */
async function assertNotSuspended() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  const { data: prof } = await supabase.from("profiles").select("suspended").eq("id", auth.user.id).maybeSingle();
  if (prof?.suspended) {
    await supabase.auth.signOut();
    throw new Error("Your account has been suspended. Please contact support.");
  }
}

export const Route = createFileRoute("/auth")({
  loader: () => getRequestOrigin(),
  head: ({ loaderData }) => ({
    meta: [
      { title: "Sign up — SoundCampaign Music Promotion" },
      { name: "description", content: "Create your SoundCampaign account: name, phone, password, withdrawal PIN and invitation code." },
      { property: "og:title", content: "Sign up — SoundCampaign Music Promotion" },
      { property: "og:description", content: "Create your SoundCampaign account to start promoting music." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${loaderData ?? ""}/auth` },
      ...sharedLinkMeta(),
      { name: "twitter:title", content: "SoundCampaign — Music Promotion" },
      { name: "twitter:description", content: "Real playlist placements, TikTok creator campaigns and honest curator feedback for artists." },
    ],
    links: [{ rel: "canonical", href: `${loaderData ?? ""}/auth` }],
  }),
  component: AuthPage,
});

const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(80),
  username: z.string().min(3, "Username must be at least 3 characters").max(30)
    .regex(/^(?=.*[A-Za-z])[A-Za-z0-9]+$/, "Username must be one word with letters only, or letters and numbers (e.g. SoundCamp26) — no spaces or symbols"),
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
  confirmPassword: z.string(),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  withdrawPin: z.string().trim().min(4, "Withdrawal PIN must be at least 4 characters").max(32),
  confirmPin: z.string(),
  inviteCode: z.string().trim().min(1, "Invitation code is required").max(64).regex(/^[A-Za-z0-9_-]+$/, "Use the invitation code exactly as provided"),
  agreed: z.literal(true, { message: "You must accept the Terms and Conditions" }),
}).refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match" })
  .refine((d) => d.withdrawPin === d.confirmPin, { path: ["confirmPin"], message: "Withdrawal PINs do not match" });

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold">
        {label} {hint && <span className="text-muted-foreground font-medium">{hint}</span>}
      </label>
      {children}
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
}

const inputCls =
  "w-full bg-background border border-input rounded-lg pl-9 pr-9 py-2.5 text-sm outline-none focus:border-[var(--nrc-green)] focus:ring-2 focus:ring-[var(--nrc-green)]/20";

function IconInput(props: React.InputHTMLAttributes<HTMLInputElement> & { icon: React.ReactNode; reveal?: boolean }) {
  const { icon, reveal, type, ...rest } = props;
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>
      <input {...rest} type={reveal ? (show ? "text" : "password") : type} className={inputCls} />
      {reveal && (
        <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide" : "Show"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
}

function AuthPage() {
  const { data: platformConfig } = usePlatformConfig();
  const { t } = useI18n();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  
  const linkReferral = useServerFn(linkReferralCode);
  const usernameSignIn = useServerFn(signInWithUsername);
  const queryClient = useQueryClient();
  const checkInvite = useServerFn(checkInviteCode);

  // shared
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // signup only
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [dial, setDial] = useState("+1");
  const [countryCode, setCountryCode] = useState("US");
  const [phone, setPhone] = useState("");
  const [withdrawPin, setWithdrawPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [agreed, setAgreed] = useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setMsg(null); setErrors({});
    try {
      const id = email.trim();
      if (!id) { setErrors({ email: "Enter your email or username" }); return; }
      if (!password) { setErrors({ password: "Enter your password" }); return; }
      if (!id.includes("@")) {
        const session = await usernameSignIn({ data: { username: id, password } });
        const { error } = await supabase.auth.setSession(session);
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: id.toLowerCase(), password });
        if (error) throw error;
      }
      await assertNotSuspended();
      const { data: auth } = await supabase.auth.getUser();
      let isAdmin = false;
      if (auth.user) {
        const { data: roles, error: roleError } = await supabase
          .from("user_roles").select("role").eq("user_id", auth.user.id);
        if (roleError) throw new Error("Could not verify account access. Please try again.");
        isAdmin = hasAdminAccess(roles ?? []);
      }
      setViewAsId(null);
      queryClient.clear();
      navigate({ to: isAdmin ? "/admin" : "/dashboard" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Authentication failed";
      setMsg(message === "Invalid login credentials" ? "Email/username or password is incorrect. Use the exact username or email saved on your account and the assigned password." : message);
    } finally { setLoading(false); }
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const parsed = signupSchema.safeParse({
      fullName, username, email, password, confirmPassword,
      phone, withdrawPin, confirmPin, inviteCode, agreed,
    });
    if (!parsed.success) {
      const map: Record<string, string> = {};
      for (const issue of parsed.error.issues) map[String(issue.path[0])] = issue.message;
      setErrors(map);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const config = await fetchPlatformConfig();
      if (!config.registrations) throw new Error("New registrations are currently closed.");
      let inviteOk = false;
      try { inviteOk = (await checkInvite({ data: { code: inviteCode.trim() } })).valid; } catch { inviteOk = false; }
      if (!inviteOk) {
        setErrors({ inviteCode: "Invalid invitation code" });
        return;
      }
      const fullPhone = phone.trim() ? `${dial} ${phone.trim()}` : null;
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            username: username.trim(),
            display_name: fullName.trim(),
            phone: fullPhone,
            invited_by: inviteCode.trim() || null,
          },
        },
      });
      if (error) throw error;
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) {
        setMsg("Account created. Please sign in with your username or email and password.");
        setMode("signin");
        return;
      }
      const { data: auth } = await supabase.auth.getUser();
      if (auth.user && fullPhone) {
        await supabase.from("profiles").update({ phone: fullPhone }).eq("id", auth.user.id);
      }
      if (inviteCode.trim()) {
        try { await linkReferral({ data: { code: inviteCode.trim() } }); } catch { /* ignore */ }
      }
      sessionStorage.setItem(WELCOME_BONUS_KEY, "1");
      navigate({ to: "/dashboard" });
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Registration failed");
    } finally { setLoading(false); }
  }


  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <div className="max-w-lg mx-auto px-4 py-6">
        <img src="/soundcampaign-music-promotion.jpg" onError={(event) => { event.currentTarget.src = "/og-soundcampaign.jpg"; }} alt="SoundCampaign Music Promotion" width={1200} height={630} className="mb-5 h-auto w-full object-contain" fetchPriority="high" />
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex gap-2 mb-5">
            <button onClick={() => setMode("signin")} className={`flex-1 py-2 rounded-md text-sm font-semibold ${mode==="signin"?"bg-[var(--nrc-green)] text-primary-foreground":"bg-muted text-muted-foreground"}`}>{t("auth.signIn")}</button>
            <button disabled={platformConfig?.registrations === false} onClick={() => setMode("signup")} className={`flex-1 py-2 rounded-md text-sm font-semibold disabled:opacity-50 ${mode==="signup"?"bg-[var(--nrc-green)] text-primary-foreground":"bg-muted text-muted-foreground"}`}>{t("auth.signUp")}</button>
          </div>

          {mode === "signin" ? (
            <form onSubmit={signIn} className="space-y-3">
              <Field label="Email or Username" error={errors['email']}>
                <IconInput aria-label="Email or Username" autoComplete="username" icon={<Mail className="w-4 h-4" />} placeholder="you@example.com or username" value={email} onChange={(e)=>setEmail(e.target.value)} required />
              </Field>
              <Field label={t("auth.password")} error={errors['password']}>
                <IconInput aria-label="Password" autoComplete="current-password" icon={<Lock className="w-4 h-4" />} reveal placeholder="Password" value={password} onChange={(e)=>setPassword(e.target.value)} required />
              </Field>
              <Button type="submit" disabled={loading} className="w-full h-auto font-bold py-3 text-sm">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />} {t("auth.signIn")}
              </Button>
            </form>
          ) : (
            <form onSubmit={signUp} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Full Name" error={errors['fullName']}>
                  <IconInput icon={<User className="w-4 h-4" />} placeholder="John Doe" value={fullName} onChange={(e)=>setFullName(e.target.value)} />
                </Field>
                <Field label="Username" error={errors['username']}>
                  <IconInput icon={<User className="w-4 h-4" />} placeholder="johndoe" value={username} onChange={(e)=>setUsername(e.target.value)} />
                </Field>
              </div>

              <Field label={t("auth.email")} error={errors['email']}>
                <IconInput icon={<Mail className="w-4 h-4" />} type="email" placeholder="you@example.com" value={email} onChange={(e)=>setEmail(e.target.value)} />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label={t("auth.password")} error={errors['password']}>
                  <IconInput icon={<Lock className="w-4 h-4" />} reveal placeholder="Password" value={password} onChange={(e)=>setPassword(e.target.value)} />
                </Field>
                <Field label="Confirm Password" error={errors['confirmPassword']}>
                  <IconInput icon={<Lock className="w-4 h-4" />} reveal placeholder="Confirm" value={confirmPassword} onChange={(e)=>setConfirmPassword(e.target.value)} />
                </Field>
              </div>

              <Field label="Phone Number" hint="(optional)" error={errors['phone']}>
                <div className="flex gap-2">
                  <CountrySelect value={dial} countryCode={countryCode} onChange={(d, c) => { setDial(d); setCountryCode(c); }} />
                  <div className="flex-1">
                    <IconInput icon={<Phone className="w-4 h-4" />} type="tel" placeholder="Phone number" value={phone} onChange={(e)=>setPhone(e.target.value)} />
                  </div>
                </div>
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Transaction Password" error={errors['withdrawPin']}>
                  <IconInput icon={<KeyRound className="w-4 h-4" />} reveal placeholder="Withdrawal PIN" value={withdrawPin} onChange={(e)=>setWithdrawPin(e.target.value)} />
                </Field>
                <Field label="Confirm Password" error={errors['confirmPin']}>
                  <IconInput icon={<KeyRound className="w-4 h-4" />} reveal placeholder="Confirm" value={confirmPin} onChange={(e)=>setConfirmPin(e.target.value)} />
                </Field>
              </div>

              <Field label="Invitation Code" hint="(required)" error={errors['inviteCode']}>
                <IconInput icon={<Ticket className="w-4 h-4" />} placeholder="SH123456" value={inviteCode} onChange={(e)=>setInviteCode(e.target.value.toUpperCase())} />
              </Field>

              <div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={agreed} onChange={(e)=>setAgreed(e.target.checked)}
                    className="w-4 h-4 accent-[var(--nrc-green)]" />
                  <span>I agree to the <Link to="/terms" className="text-[var(--nrc-green)] font-semibold underline">Terms and Conditions</Link></span>
                </label>
                {errors['agreed'] && <p className="text-[11px] text-destructive mt-1">{errors['agreed']}</p>}
              </div>

              <button disabled={loading} className="w-full bg-[var(--nrc-green)] text-primary-foreground font-bold py-3 rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />} {t("auth.signUp")}
              </button>
              <p className="text-center text-xs text-muted-foreground">
                Already have an account?{" "}
                <button type="button" onClick={()=>setMode("signin")} className="text-[var(--nrc-green)] font-bold">{t("auth.signIn")}</button>
              </p>
            </form>
          )}

          {msg && <p role="alert" className="text-xs text-destructive mt-3">{msg}</p>}
        </div>
        <div className="text-center mt-4">
          <Link to="/" className="text-xs text-muted-foreground">{t("auth.backHome")}</Link>
        </div>
      </div>
    </div>
  );
}
