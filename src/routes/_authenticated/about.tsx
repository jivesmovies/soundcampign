import { requireUserPanel } from "@/lib/role-guard";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useMe } from "@/lib/hooks";
import { Music2, Users, Globe2, Target } from "lucide-react";
import { usePlatformConfig } from "@/lib/platform-config";

export const Route = createFileRoute("/_authenticated/about")({
  beforeLoad: () => requireUserPanel(),
  head: () => ({
    meta: [
      {"title": "About \u2014 SoundCampaign"},
      {"name": "description", "content": "Learn about SoundCampaign music promotion and its partner platforms."},
      {"property": "og:title", "content": "About \u2014 SoundCampaign"},
      {"property": "og:description", "content": "Learn about SoundCampaign music promotion and its partner platforms."},
      {"property": "og:type", "content": "website"},
      {"name": "twitter:card", "content": "summary"},
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const { data: me } = useMe();
  const { data: config } = usePlatformConfig();
  return (
    <AppShell title="About" isAdmin={me?.isAdmin}>
      <h1 className="text-2xl md:text-3xl font-black">About SoundCampaign</h1>
      <p className="text-sm text-muted-foreground">Helping independent artists go viral across the world's biggest music platforms.</p>

      {config?.about ? <section className="mt-5 whitespace-pre-wrap text-sm leading-relaxed">{config.about}</section> : <>

      <section className="mt-5 rounded-2xl p-6 md:p-8 text-white"
        style={{ background: "linear-gradient(135deg, var(--nrc-green-dark), var(--nrc-green))" }}>
        <div className="text-xs tracking-widest opacity-70">OUR MISSION</div>
        <h2 className="text-xl md:text-2xl font-bold mt-1">Turn great music into global momentum.</h2>
        <p className="mt-3 text-sm opacity-90 max-w-2xl">
          SoundCampaign connects artists, labels and curators with promotion channels across Spotify,
          Apple Music, YouTube Music, SoundCloud, Tidal and Deezer — combining editorial pitching,
          playlist placement and influencer amplification in a single dashboard.
        </p>
      </section>

      <div className="grid md:grid-cols-4 gap-3 mt-4">
        {[
          { icon: Music2, label: "Tracks promoted", value: "120K+" },
          { icon: Users, label: "Artists onboarded", value: "13.3K" },
          { icon: Globe2, label: "Countries reached", value: "94" },
          { icon: Target, label: "Avg. campaign lift", value: "3.4x" },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <s.icon className="w-5 h-5 text-[var(--nrc-green)] mb-2" />
            <div className="text-2xl font-black">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <section className="mt-5 grid md:grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="font-bold mb-2">Who we are</div>
          <p className="text-sm text-muted-foreground">Founded in 2022, SoundCampaign is a team of music marketers, engineers and playlist curators
          based across three continents. We work with independent artists and labels to make quality music discoverable.</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="font-bold mb-2">What we value</div>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
            <li>Transparent reporting on every campaign</li>
            <li>Fair, tier-based pricing that scales with the artist</li>
            <li>Real human curators — no fake streams, no bots</li>
            <li>Long-term artist development over one-off spikes</li>
          </ul>
        </div>
      </section>
      </>}
    </AppShell>
  );
}