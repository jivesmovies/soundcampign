import { requireUserPanel } from "@/lib/role-guard";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useMe } from "@/lib/hooks";
import { Award, FileBadge, Trophy, Download } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePlatformConfig } from "@/lib/platform-config";

export const Route = createFileRoute("/_authenticated/certificate")({
  beforeLoad: () => requireUserPanel(),
  head: () => ({
    meta: [
      {"title": "Certificates \u2014 SoundCampaign"},
      {"name": "description", "content": "View SoundCampaign platform documents and certificates."},
      {"property": "og:title", "content": "Certificates \u2014 SoundCampaign"},
      {"property": "og:description", "content": "View SoundCampaign platform documents and certificates."},
      {"property": "og:type", "content": "website"},
      {"name": "twitter:card", "content": "summary"},
    ],
  }),
  component: CertificatePage,
});

const DOCS = [
  { key: "cert",    icon: FileBadge, title: "Platform Certificate",    subtitle: "SoundCampaign Music Promotion Certification", issued: "Jan 2024", ref: "GT-CERT-2024-0142" },
  { key: "license", icon: Award,     title: "Business License",         subtitle: "Registered music services provider",     issued: "Mar 2022", ref: "BL-778-2022" },
  { key: "award",   icon: Trophy,    title: "Industry Award",           subtitle: "Best Independent Promotion Platform 2025", issued: "Nov 2025", ref: "AWD-IND-2025" },
];

function CertificatePage() {
  const { data: me } = useMe();
  const { data: config } = usePlatformConfig();
  const [open, setOpen] = useState<null | typeof DOCS[number]>(null);
  return (
    <AppShell title="Certificate" isAdmin={me?.isAdmin}>
      <h1 className="text-2xl md:text-3xl font-black">Certificates & Credentials</h1>
      <p className="text-sm text-muted-foreground">Verified documents that authorize SoundCampaign to operate.</p>

      {!!config?.licenses.length && <section className="mt-5 grid gap-3 md:grid-cols-3">{config.licenses.map((url, i) => <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-border bg-card p-3">{/\.pdf(?:\?|$)/i.test(url) ? <FileBadge className="mx-auto h-16 w-16 text-primary" /> : <img src={url} alt={`Platform document ${i + 1}`} className="aspect-[4/3] w-full object-contain" />}<span className="mt-2 block text-sm font-semibold">View document {i + 1}</span></a>)}</section>}

      <div className="grid md:grid-cols-3 gap-3 mt-5">
        {DOCS.map((d) => (
          <button key={d.key} onClick={() => setOpen(d)} className="text-left bg-card border border-border rounded-xl p-5 hover:border-[var(--nrc-green)] transition-colors">
            <div className="w-12 h-12 rounded-lg bg-[var(--nrc-green)]/10 text-[var(--nrc-green)] grid place-items-center mb-3"><d.icon className="w-6 h-6" /></div>
            <div className="font-bold">{d.title}</div>
            <div className="text-xs text-muted-foreground mt-1">{d.subtitle}</div>
            <div className="text-[11px] text-muted-foreground mt-3">Ref: {d.ref}</div>
            <div className="text-[11px] text-muted-foreground">Issued: {d.issued}</div>
            <div className="mt-3 text-xs font-semibold text-[var(--nrc-green)]">View certificate →</div>
          </button>
        ))}
      </div>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-lg">
          {open && (
            <>
              <DialogHeader><DialogTitle>{open.title}</DialogTitle></DialogHeader>
              <div className="mt-2 relative rounded-xl border-4 border-[var(--nrc-gold)] p-8 text-center bg-gradient-to-br from-white to-amber-50 dark:from-slate-900 dark:to-slate-950">
                <open.icon className="w-16 h-16 mx-auto text-[var(--nrc-gold)]" />
                <div className="text-xs tracking-[0.5em] text-muted-foreground mt-3">CERTIFICATE OF</div>
                <div className="text-2xl font-serif font-black mt-1">{open.title.toUpperCase()}</div>
                <div className="text-xs text-muted-foreground mt-4">This is to certify that</div>
                <div className="text-lg font-bold mt-1">SoundCampaign Music Promotion Ltd.</div>
                <div className="text-xs text-muted-foreground mt-2 max-w-sm mx-auto">{open.subtitle}. Verified and endorsed for continued operation in accordance with applicable standards.</div>
                <div className="mt-6 flex justify-between text-[10px] tracking-widest text-muted-foreground">
                  <span>REF · {open.ref}</span><span>ISSUED · {open.issued}</span>
                </div>
              </div>
              <button className="mt-3 inline-flex items-center justify-center gap-2 bg-[var(--nrc-green)] text-primary-foreground py-2 rounded-md text-sm font-semibold">
                <Download className="w-4 h-4" /> Download PDF
              </button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}