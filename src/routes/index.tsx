import scMark from "@/assets/sc-mark.png.asset.json";
import heroSpotify from "@/assets/hero-spotify.png.asset.json";
import heroTiktok from "@/assets/hero-tiktok.png.asset.json";
import heroPhone from "@/assets/hero-phone.png.asset.json";
import heroAvatars from "@/assets/hero-avatars.png.asset.json";

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type SyntheticEvent } from "react";
import { CountUp } from "@/components/CountUp";
import { shareImageMeta } from "@/lib/social-sharing";
import { getRequestOrigin } from "@/lib/origin.functions";
import { usePlatformConfig } from "@/lib/platform-config";

import { useI18n } from "@/lib/i18n";

const stats: { to: number; decimals?: number; suffix: string; label: string }[] = [
  { to: 10597, suffix: "+", label: "Available playlists" },
  { to: 13049, suffix: "+", label: "Created campaigns" },
  { to: 157.2, decimals: 1, suffix: "M+", label: "Streams" },
];


import { ArrowRight, Check, X, ChevronDown, Heart } from "lucide-react";



export const Route = createFileRoute("/")({
  loader: () => getRequestOrigin(),
  head: ({ loaderData }) => ({
    meta: [
      { title: "SoundCampaign — Music Promotion" },
      {
        name: "description",
        content:
          "The easiest way for musicians to promote their music with real Spotify playlist placements, TikTok creator videos and honest curator feedback.",
      },
      { property: "og:title", content: "SoundCampaign — Music Promotion" },
      {
        property: "og:description",
        content:
          "Real playlist placements, TikTok creator campaigns and honest curator feedback for independent artists and labels.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: `${loaderData ?? ""}/` },
      ...shareImageMeta(loaderData),
      { name: "twitter:title", content: "SoundCampaign — Music Promotion" },
      { name: "twitter:description", content: "Real playlist placements, TikTok creator campaigns and honest curator feedback for artists." },
    ],
    links: [{ rel: "canonical", href: `${loaderData ?? ""}/` }],
  }),
  component: Landing,
});

const green = "text-[var(--lp-green)]";
const card = "rounded-2xl border border-[var(--lp-border)] bg-[var(--lp-surface)]";

function handleImageError(event: SyntheticEvent<HTMLImageElement>) {
  event.currentTarget.onerror = null;
  event.currentTarget.src = "/og-soundcampaign.jpg";
}

const tiktokPoints = [
  "Creators use your music in their videos",
  "Grow your global audience in just days",
  "High opportunity to go viral",
  "Get videos you can share with your followers",
];


const testimonials = [
  {
    name: "Tyrone",
    avatar: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-tz91c870EdRO0p3gDExgVCVRBbKne1.png",
    stars: 5,
    role: "Rapper",
    quote:
      "Although pricey, it sure is worth the investment. If SoundCampaign does ever lower their price or have some special deals on, then I'll definitely take advantage of them!",
  },
  {
    name: "Santiago",
    avatar: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-dcDO0tNGKEdTIEnAKmRje4GW3yGdSv.png",
    stars: 5,
    role: "Singer & Music Producer / Reached over 500K streams on Spotify",
    quote:
      "SoundCampaign is an excellent service! It certainly has access to good playlist curators as well as having a large audience base. If I send a song to the right curator or genre, I tend to have way more success than I would've gotten by my efforts!",
  },
  {
    name: "Stefan",
    avatar: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-l2al7vNdpKBcjBlkFp3CqBgSA1Rj0T.png",
    stars: 4,
    role: "DJ & Music Producer",
    quote:
      "SoundCampaign did pretty much what they said they'd do or promised. My genre is quite specific, so I only wished they had more different playlists that matched my music. Overall, I received very good exposure and got connected with the right playlist curators.",
  },
  {
    name: "Joseph",
    avatar: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-vGlnf2IHJrFTOIQxjB0s98vsX1dtbP.png",
    stars: 5,
    role: "Singer / Reached over 350K streams on Spotify",
    quote:
      "I'm so glad I decided to work with you fellas at SoundCampaign! You definitely gave me awesome feedback and insights from every listener about my songs. Fantastic results all around — I'm definitely looking forward to my next campaign!",
  },
  {
    name: "Richard",
    avatar: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-wQEPxIqkXRX5W7q8O3UHzM768yekMO.png",
    stars: 5,
    role: "Singer",
    quote:
      "This music promotion service sure does give top notch service. The curators for my specific genre, hip hop, were pretty honest with their reviews, and as a result, the streams for my songs have significantly grown!",
  },
  {
    name: "Amara",
    avatar: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-8bOZmsPHyd7hA0elCXUjQDBB44MXV5.png",
    stars: 5,
    role: "Independent Artist",
    quote:
      "Real listeners, real feedback, no bots. My monthly listeners more than doubled during the campaign and I finally know which playlists fit my sound.",
  },
];

const comparisons = [
  "Access to extensive network (10,000+)",
  "No bot streams, only active listeners",
  "100% guaranteed response rate from curators",
  "Comprehensive campaign tracking in real-time",
  "Quick results within days",
];

const faqs = [
  {
    q: "What is SoundCampaign and how does it work? Is it legit?",
    a: "SoundCampaign is an online music promotion service. It helps artists get access to relevant playlists and TikTok creators, enabling them to be discovered by new music fans. Curators are compensated for reviews, not for placements, so we can't guarantee playlist placement for all reviews — but we do offer organic, honest reviews from real curators.",
  },
  {
    q: "How can I promote my music?",
    a: "Submit your track, choose Spotify playlist promotion or a TikTok creator campaign, set your budget, and we automatically match your song with the right curators and creators.",
  },
  {
    q: "Can I promote my music for free?",
    a: "Campaigns are paid because curators are compensated for their listening time, but new accounts start with a bonus credit you can put toward your first campaign.",
  },
  {
    q: "Do you offer music promotion for independent music artists?",
    a: "Yes. Most of our users are independent artists and small labels. There's no minimum follower count or label requirement.",
  },
  {
    q: "How much do the best music promotion services cost?",
    a: "Pricing depends on how many curators review your track. You only pay for reviews that are actually completed — unreviewed submissions are credited back.",
  },
  {
    q: "How do I track the performance of a music promotion campaign?",
    a: "Your dashboard shows reviews, placements, playlist followers reached and stream growth in real time, with full reporting after the campaign ends.",
  },
  {
    q: "How does the TikTok music promotion service work?",
    a: "We match your sound with vetted TikTok creators who post videos using it. You receive the videos and can reshare them with your own followers.",
  },
  {
    q: "Once I've paid, am I guaranteed Spotify playlist placements?",
    a: "No service can guarantee placements without breaking Spotify's rules. We guarantee reviews and honest feedback from real curators, who add music they genuinely like.",
  },
  {
    q: "I need assistance with my campaign. What should I do?",
    a: "Reach out from your dashboard and our support team will respond, usually within a few hours.",
  },
];

const footerCols = [
  [
    "Help Center",
    "Blog",
    "Spotify Playlist Submission",
    "Get Paid to Listen to Music",
    "Careers",
    "About us",
    "Terms of Service",
    "Privacy Policy",
    "Sitemap",
  ],
  [
    "Affiliate Program",
    "SoundCampaign Reviews",
    "Spotify Royalties Calculator",
    "TikTok Money Calculator",
    "Spotify Stream Checker",
    "Music Genre Finder",
    "BPM Counter",
    "Best Music Promotion Services",
    "Best Music Smart Links",
  ],
];

function Numbered({ i }: { i: number }) {
  return (
    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--lp-green)] text-xs font-bold text-[var(--lp-green-ink)]">
      {i}
    </span>
  );
}

function Landing() {
  const { data: config } = usePlatformConfig();
  const { t } = useI18n();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [showAllTestimonials, setShowAllTestimonials] = useState(true);

  return (
    <div className="min-h-screen bg-[var(--lp-bg)] text-[var(--lp-text)]">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-[var(--lp-border)] bg-[var(--lp-bg)]/90 backdrop-blur">
        <div className="mx-auto grid min-h-16 max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 md:flex md:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <img src="/favicon.png" alt="SoundCampaign logo" width={32} height={32} className="h-8 w-8 shrink-0 object-contain" />
            <span className="truncate text-sm font-black sm:text-base">SOUND<span className={green}>CAMPAIGN</span></span>
          </div>
          <nav className="hidden items-center gap-7 text-sm text-[var(--lp-muted)] md:flex">
            <a href="#spotify" className="hover:text-[var(--lp-text)]">Music Promotion</a>
            <a href="#results" className="hover:text-[var(--lp-text)]">Case Studies</a>
            <a href="#tiktok" className="hover:text-[var(--lp-text)]">TikTok</a>
            <Link to="/auth" className="hover:text-[var(--lp-text)]">{t("auth.signIn")}</Link>
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/auth"
              className="rounded-full bg-[var(--lp-text)] px-3 py-2 text-xs font-bold text-[var(--lp-bg)] sm:px-5 sm:text-sm"
            >
              {t("landing.promote")}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-8 px-4 py-10 sm:px-6 md:grid-cols-2 md:gap-10 md:py-16 lg:py-20">
        <div className="min-w-0">
          <h1 className="text-[clamp(2rem,5.2vw,3.75rem)] font-extrabold leading-[1.05] tracking-tight">
            Music promotion with <span className={green}>proven</span> results.
          </h1>
          <p className="mt-3 max-w-md text-sm text-[var(--lp-muted)] md:mt-6 md:text-base lg:text-lg">
            SoundCampaign is the easiest way for musicians to promote their music with real
            placements, and honest curator feedback.
          </p>
          <div className="mt-4 flex flex-nowrap items-center gap-3 md:mt-8 md:gap-6">
            <Link
              to="/auth"
              className="whitespace-nowrap rounded-full bg-[var(--lp-green)] px-4 py-2 text-sm font-bold text-[var(--lp-green-ink)] md:px-9 md:py-4 md:text-base"
            >
              Get Started
            </Link>
            <a href="#spotify" className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold md:gap-2 md:text-base">
              Learn more <ArrowRight className="h-3 w-3 md:h-4 md:w-4" />
            </a>
          </div>
          <div className="mt-6 md:mt-10">
            <img src="/trusted-artists.png" alt="Rated Excellent — trusted by 100,000+ artists & labels" width={322} height={34} className="h-8 w-auto max-w-full object-contain object-left md:h-[34px]" />
          </div>
        </div>

        <div className="min-w-0">
          <img src="/soundcampaign-music-promotion.jpg" alt="SoundCampaign Music Promotion — studio headphones and microphone" width={1200} height={630} className="h-auto w-full object-contain" fetchPriority="high" />
        </div>
      </section>

      {/* Reviews & stats strip */}
      <section className="mx-auto max-w-6xl px-4">
        <div className="flex justify-center py-5">
          <div className="flex flex-col items-center gap-4 lg:flex-row lg:gap-8">
            <img src="/tp-reviews.png" alt="Excellent — based on 2,264 reviews on Trustpilot" width={424} height={20} className="h-auto w-full max-w-[424px] object-contain" />
            <img src="/tp-stats.png" alt="500,000+ campaigns run · 1B+ streams generated" width={348} height={14} className="h-auto w-[90%] max-w-[348px] object-contain" />
          </div>
        </div>
      </section>

      {/* Trusted by the industry */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-center text-lg font-bold">Trusted by the industry</p>
        <div className="mt-8 flex min-h-[118px] flex-wrap items-center justify-center gap-x-6 gap-y-7 overflow-hidden rounded-sm bg-black px-4 py-7 sm:gap-x-10 md:gap-x-14">
          {[
            ["/logo-spotify.png", "Spotify"],
            ["/logo-symphonic.png", "Symphonic"],
            ["/logo-apple-music.png", "Apple Music"],
            ["/logo-ditto.png", "Ditto"],
            ["/logo-youtube-music.png", "YouTube Music"],
            ["/logo-warner-music.png", "Warner Music Group"],
            ["/logo-equalizer.png", "Music platform"],
          ].map(([src, alt]) => (
            <img
              key={src}
              src={src}
              alt={alt}
              className="h-auto max-h-10 w-auto max-w-[82px] object-contain sm:max-h-14 sm:max-w-[150px]"
            />
          ))}
        </div>
      </section>


      {/* Spotify promotion → power in numbers */}
      <section id="spotify" className="mx-auto max-w-6xl px-4 py-12">
        <div className="overflow-hidden rounded-[28px]">
          <img
            src="/olivia-rose-playlist.png"
            alt="Olivia Rose playlist promotion featuring girls like you by Olivia Rodrigo"
            loading="lazy"
            className="block w-full"
          />
        </div>
        <div
          id="results"
          className="mt-8 overflow-hidden rounded-[28px] bg-[#161616] px-4 pt-12 text-center md:mt-12 md:pt-16"
        >
          <h2 className="text-2xl font-extrabold md:text-4xl">Our Power in Numbers</h2>
          <div className="mx-auto mt-8 grid max-w-3xl grid-cols-3 gap-4">
            {stats.map((s) => (
              <div key={s.label}>
                <div className="text-xl font-extrabold leading-none md:text-4xl">
                  <CountUp to={s.to} decimals={s.decimals} suffix={s.suffix} />
                </div>
                <div className="mt-2 text-[11px] text-white/70 md:text-sm">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="mt-8 flex justify-center">
            <Link
              to="/auth"
              className="rounded-full bg-[var(--lp-green)] px-9 py-3.5 font-bold text-[var(--lp-green-ink)] shadow-lg shadow-black/30 transition hover:brightness-110"
            >
              Start Now
            </Link>
          </div>
          <img
            src="/global-network-map.png"
            alt="Global network of SoundCampaign artists and curators"
            loading="lazy"
            width={1536}
            height={768}
            className="pointer-events-none mx-auto mt-10 block w-full max-w-5xl select-none md:mt-14"
          />
        </div>
      </section>



      {/* TikTok promotion */}
      <section id="tiktok" className="mx-auto max-w-6xl px-4 pb-16 pt-8 md:pt-16">
        <div className="relative">
          <div className={`${card} grid items-center gap-8 p-7 md:p-12 lg:grid-cols-[1.05fr_1fr]`}>
            <div>
              <span className="inline-block rounded-md bg-[var(--lp-green)] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-[var(--lp-green-ink)] md:text-xs">
                TikTok music promotion
              </span>
              <h2 className="mt-6 text-2xl font-extrabold leading-tight md:text-4xl">
                Promote your music with
                <br className="hidden md:block" /> influencers' TikTok videos
              </h2>
              <ul className="mt-7 space-y-4">
                {tiktokPoints.map((p, i) => (
                  <li key={p} className="flex items-center gap-3 text-[var(--lp-text)]/90">
                    <Numbered i={i + 1} />
                    <span className="text-sm md:text-base">{p}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="hidden lg:block" />
          </div>
          <img
            src="/tiktok-creator-phones.png"
            alt="TikTok videos featuring artists promoting music"
            loading="lazy"
            className="pointer-events-none mx-auto -mt-4 w-full max-w-[560px] rounded-2xl select-none object-contain lg:absolute lg:right-4 lg:top-1/2 lg:mt-0 lg:max-h-[460px] lg:w-[48%] lg:-translate-y-1/2"
          />
        </div>
      </section>


      {/* Creators */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 lg:grid-cols-2">
        <img
          src="/music-creators.png"
          alt="TikTok creators with follower and like counts"
          loading="lazy"
          className="mx-auto w-full max-w-md rounded-2xl"
        />

        <div>
          <h2 className="text-3xl font-extrabold leading-tight md:text-4xl">
            Manually moderated creator base
          </h2>
          <p className="mt-5 text-[var(--lp-muted)]">
            In our TikTok music promotion, we manually moderate our creators' base. This ensures
            the highest quality and authenticity in the videos you receive from our creators.
          </p>
        </div>
      </section>

      {/* TikTok numbers */}
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className={`${card} px-6 py-12 text-center`}>
          <div className="grid gap-10 sm:grid-cols-3">
            {[
              { v: "7,239+", l: "TikTok creators" },
              { v: "53,287+", l: "Videos posted" },
              { v: "1.7B+", l: "Video views" },
            ].map((s) => (
              <div key={s.l}>
                <div className="text-4xl font-extrabold">{s.v}</div>
                <div className="mt-1 text-sm text-[var(--lp-muted)]">{s.l}</div>
              </div>
            ))}
          </div>
          <Link
            to="/auth"
            className="mt-10 inline-flex rounded-full bg-[var(--lp-green)] px-9 py-3.5 font-bold text-[var(--lp-green-ink)]"
          >
            Start Campaign
          </Link>
        </div>
      </section>

      {/* Scalable platform */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 lg:grid-cols-2">
        <div>
          <h2 className="text-3xl font-extrabold leading-tight md:text-4xl">
            Scalable platform for musicians
          </h2>
          <p className="mt-5 max-w-md text-[var(--lp-muted)]">
            From emerging artists to seasoned pros, our music promotion service provides the
            tools and resources to help you grow your fan base and elevate your music career to
            new heights.
          </p>
        </div>
        <img
          src="/fresh-releases.png"
          alt="Campaign releases with days left and details"
          loading="lazy"
          className="mx-auto w-full max-w-md rounded-2xl"
        />

      </section>

      {/* Analytics */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 lg:grid-cols-2">
        <img
          src="/trending-sounds.png"
          alt="TikTok campaign video views chart up 89%"
          loading="lazy"
          className="w-full rounded-2xl"
        />

        <div>
          <h2 className="text-3xl font-extrabold leading-tight md:text-4xl">
            In-depth analytics &amp; reporting
          </h2>
          <p className="mt-5 text-[var(--lp-muted)]">
            Get useful insights for your music promotion and make smart choices using our
            detailed analytics and reports. Keep an eye on your campaign's performance, evaluate
            its success, and adjust your strategy to achieve the best results.
          </p>
          <Link
            to="/auth"
            className="mt-8 inline-flex rounded-full bg-[var(--lp-green)] px-9 py-3.5 font-bold text-[var(--lp-green-ink)]"
          >
            Get Started
          </Link>
        </div>
      </section>

      {/* Artist wall */}
      <section className="relative overflow-hidden">
        <img
          src="/artist-wall.png"
          alt="We've helped over 100,000 artists be heard"
          loading="lazy"
          className="w-full"
        />
      </section>


      {/* Testimonials */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <div
              key={t.name}
              className={`rounded-2xl bg-card p-6 text-card-foreground shadow-lg ${!showAllTestimonials && i > 1 ? "hidden md:block" : ""}`}
            >
              <div className="flex items-center gap-3">
                {t.avatar ? (
                  <img
                    src={config?.testimonials[i] ?? t.avatar}
                    onError={handleImageError}
                    alt={`${t.name}, ${t.role}`}
                    loading="lazy"
                    className="h-12 w-12 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span className="h-12 w-12 shrink-0 rounded-full bg-gradient-to-br from-[var(--lp-pink)] to-[oklch(0.55_0.15_250)]" />
                )}

                <div className="min-w-0">
                  <div className="truncate font-bold">{t.name}</div>
                  <div className="text-sm text-[oklch(0.75_0.15_75)]">
                    {"★".repeat(t.stars)}
                    <span className="text-muted-foreground">{"★".repeat(5 - t.stars)}</span>
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{t.role}</div>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed">{t.quote}</p>
            </div>
          ))}
        </div>
        {!showAllTestimonials && testimonials.length > 2 && (
          <div className="mt-6 flex justify-center md:hidden">
            <button
              type="button"
              onClick={() => setShowAllTestimonials(true)}
              className="rounded-full bg-[var(--lp-surface)] px-6 py-2 text-sm font-bold text-[var(--lp-text)] hover:bg-[var(--lp-surface-2)]"
            >
              View More
            </button>
          </div>
        )}
      </section>


      {/* Why promote with us */}
      <section className="mx-auto max-w-4xl px-4 py-16">
        <h2 className="text-center text-3xl font-extrabold md:text-4xl">Why promote with us</h2>
        <div className="mt-10 overflow-hidden">
          <div className="flex justify-end">
            <div className="grid w-[220px] grid-cols-2 overflow-hidden rounded-t-2xl text-center text-sm font-extrabold">
              <div className="bg-[var(--lp-text)] py-3 text-[var(--lp-bg)]">DIY</div>
              <div className="bg-[var(--lp-green)] py-3 text-[var(--lp-green-ink)]">SOUNDCAMPAIGN</div>
            </div>
          </div>
          <div className="border-t border-[var(--lp-border)]">
            {comparisons.map((c) => (
              <div
                key={c}
                className="flex items-center justify-between border-b border-[var(--lp-border)] py-5"
              >
                <span className="pr-4 text-sm md:text-base">{c}</span>
                <span className="flex w-[220px] shrink-0 justify-around">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--lp-surface-2)]">
                    <X className="h-4 w-4" />
                  </span>
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--lp-green)] text-[var(--lp-green-ink)]">
                    <Check className="h-4 w-4" />
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-16">
        <h2 className="text-center text-3xl font-extrabold md:text-4xl">
          Frequently asked questions
        </h2>
        <div className="mt-10 space-y-3">
          {faqs.map((f, i) => (
            <div key={f.q}>
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="flex w-full items-center justify-between gap-4 rounded-xl bg-[var(--lp-surface)] px-5 py-4 text-left text-sm font-semibold md:text-base"
              >
                {f.q}
                <ChevronDown
                  className={`h-4 w-4 shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`}
                />
              </button>
              {openFaq === i && (
                <p className="px-5 py-4 text-sm leading-relaxed text-[var(--lp-muted)]">{f.a}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-[var(--lp-border)] bg-[var(--lp-surface)]">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2">
              <img src="/favicon.png" alt="SoundCampaign logo" width={28} height={28} className="h-7 w-7 shrink-0 object-contain" />
              <span className="font-black">SOUND<span className={green}>CAMPAIGN</span></span>
            </div>
            <p className="mt-6 flex items-center gap-1.5 text-sm">
              Made with <Heart className="h-4 w-4 fill-[var(--lp-pink)] text-[var(--lp-pink)]" /> by
              artists for artists
            </p>
            <p className="mt-4 text-sm text-[var(--lp-muted)]">
              © {new Date().getFullYear()} SoundCampaign. All rights reserved.
            </p>
          </div>
          {footerCols.map((col) => (
            <ul key={col[0]} className="space-y-2.5 text-sm text-[var(--lp-muted)]">
              {col.map((item) => (
                <li key={item}>
                  <a href="#" className="hover:text-[var(--lp-text)]">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </footer>
    </div>
  );
}
