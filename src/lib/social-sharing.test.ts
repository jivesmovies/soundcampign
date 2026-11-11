import { describe, expect, it } from "vitest";
import { isSocialPreviewCrawler, requestOrigin, SHARED_LINK_POLICY } from "./social-sharing";

describe("SoundCampaign shared-link policy", () => {
  it("does not supply a thumbnail or request a large visual preview", () => {
    expect(SHARED_LINK_POLICY.imageUrl).toBe("");
    expect(SHARED_LINK_POLICY.cardType).toBe("summary");
    expect(SHARED_LINK_POLICY.imageIndexing).toBe("noimageindex, max-image-preview:none");
  });

  it.each(["WhatsApp/2.26", "TelegramBot (like TwitterBot)", "facebookexternalhit/1.1", "Twitterbot/1.0", "LinkedInBot/1.0", "Slackbot-LinkExpanding 1.0", "Discordbot/2.0"])(
    "identifies %s for metadata-only sharing responses",
    (userAgent) => expect(isSocialPreviewCrawler(userAgent)).toBe(true),
  );

  it.each(["Mozilla/5.0 Chrome/131 Safari/537.36", "Mozilla/5.0 iPhone Mobile Safari/604.1", "Googlebot/2.1", "bingbot/2.0", ""])(
    "preserves full page delivery for %s",
    (userAgent) => expect(isSocialPreviewCrawler(userAgent)).toBe(false),
  );

  it("uses the published origin rather than untrusted forwarded hosts", () => {
    const request = new Request("https://www.soundcampaign.online/auth", {
      headers: { "x-forwarded-host": "untrusted.example" },
    });
    expect(requestOrigin(request)).toBe("https://www.soundcampaign.online");
  });

  it("resolves the sandbox preview origin without hardcoding a project domain", () => {
    const request = new Request("http://localhost:8080/auth", {
      headers: { "x-forwarded-host": "preview.soundcampaign.online" },
    });
    expect(requestOrigin(request)).toBe("https://preview.soundcampaign.online");
  });
});