import { requireUserPanel } from "@/lib/role-guard";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useMe } from "@/lib/hooks";
import { usePlatformConfig } from "@/lib/platform-config";

export const Route = createFileRoute("/_authenticated/terms")({
  beforeLoad: () => requireUserPanel(),
  head: () => ({
    meta: [
      {"title": "Terms and Conditions — SoundCampaign"},
      {"name": "description", "content": "Read the SoundCampaign platform terms and conditions."},
      {"property": "og:title", "content": "Terms and Conditions — SoundCampaign"},
      {"property": "og:description", "content": "Read the SoundCampaign platform terms and conditions."},
      {"property": "og:type", "content": "website"},
      {"name": "twitter:card", "content": "summary"},
    ],
  }),
  component: TermsPage,
});

const SECTIONS = [
  { title: "1. Acceptance of Terms", body: "By accessing SoundCampaign you agree to be bound by these Terms & Conditions. If you do not agree, please discontinue use of the platform." },
  { title: "2. Eligibility", body: "You must be at least 18 years old and legally able to enter contracts to open an account or subscribe to a membership tier." },
  { title: "3. Membership Tiers", body: "Tiers (Normal, Silver, Gold, Platinum, Diamond) grant access to a set number of daily promotion tasks and a fixed commission rate as displayed on the Activities page." },
  { title: "4. Payments & Refunds", body: "Deposits are processed through supported channels. Because promotion campaigns begin immediately, deposits are non-refundable once tasks have been assigned." },
  { title: "5. User Conduct", body: "You may not upload illegal content, misrepresent ownership of tracks, or attempt to manipulate the promotion queue. Violations may result in suspension." },
  { title: "6. Intellectual Property", body: "You retain rights to your music. By submitting a track you grant SoundCampaign a limited license to use it for the requested promotion." },
  { title: "7. Limitation of Liability", body: "SoundCampaign is not liable for indirect or consequential damages arising from use of the platform, subject to applicable law." },
  { title: "8. Changes to Terms", body: "We may update these Terms from time to time. Continued use of the platform after changes constitutes acceptance of the updated Terms." },
  { title: "9. Contact", body: "Questions about these Terms can be sent through the in-app Support option or via our published contact channels." },
];

function TermsPage() {
  const { data: me } = useMe();
  const { data: config } = usePlatformConfig();
  return (
    <AppShell title="Terms & Conditions" isAdmin={me?.isAdmin}>
      <h1 className="text-2xl md:text-3xl font-black">Terms & Conditions</h1>
      <p className="text-sm text-muted-foreground">Last updated: January 2026</p>
      {config?.terms ? <section className="mt-5 whitespace-pre-wrap text-sm leading-relaxed">{config.terms}</section> : <div className="mt-5 space-y-3">
        {SECTIONS.map((s) => (
          <div key={s.title} className="bg-card border border-border rounded-xl p-4">
            <div className="font-bold">{s.title}</div>
            <p className="text-sm text-muted-foreground mt-1">{s.body}</p>
          </div>
        ))}
      </div>}
    </AppShell>
  );
}