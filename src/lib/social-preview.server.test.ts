import { describe, expect, it } from "vitest";
import { suppressVisualPreview } from "./social-preview.server";

const document = '<!doctype html><html><head><title>SoundCampaign</title></head><body>private-account-content</body></html>';
const response = () => new Response(document, {
  headers: { "content-type": "text/html; charset=utf-8", vary: "Accept-Encoding", "x-robots-tag": "noarchive" },
});

describe("shared-link response delivery", () => {
  it.each(["WhatsApp/2.26", "TelegramBot", "facebookexternalhit/1.1"])(
    "does not deliver page content to %s for image extraction",
    async (userAgent) => {
      const result = await suppressVisualPreview(response(), new Request("https://soundcampaign.online/auth", {
        headers: { "user-agent": userAgent },
      }));
      expect(await result.text()).not.toContain("private-account-content");
      expect(result.headers.get("cache-control")).toBe("private, no-store");
      expect(result.headers.get("vary")).toBe("Accept-Encoding, User-Agent");
    },
  );

  it("keeps browser page content and existing indexing restrictions", async () => {
    const result = await suppressVisualPreview(response(), new Request("https://soundcampaign.online", {
      headers: { "user-agent": "Mozilla/5.0" },
    }));
    expect(await result.text()).toContain("private-account-content");
    expect(result.headers.get("x-robots-tag")).toBe("noarchive, noimageindex, max-image-preview:none");
    expect(result.headers.get("cache-control")).toBeNull();
  });

  it("does not modify access-control redirects", async () => {
    const redirect = new Response(null, { status: 302, headers: { location: "/auth" } });
    const result = await suppressVisualPreview(redirect, new Request("https://soundcampaign.online/admin", {
      headers: { "user-agent": "TelegramBot" },
    }));
    expect(result).toBe(redirect);
    expect(result.status).toBe(302);
    expect(result.headers.get("location")).toBe("/auth");
  });

  it("does not change API data or non-GET requests", async () => {
    const data = Response.json({ ok: true });
    expect(await suppressVisualPreview(data, new Request("https://soundcampaign.online/api/public/test"))).toBe(data);
    const post = response();
    expect(await suppressVisualPreview(post, new Request("https://soundcampaign.online", { method: "POST" }))).toBe(post);
  });

  it("preserves wildcard cache variation and avoids duplicate User-Agent fields", async () => {
    for (const vary of ["*", "Accept-Encoding, User-Agent"]) {
      const source = response();
      source.headers.set("vary", vary);
      const result = await suppressVisualPreview(source, new Request("https://soundcampaign.online"));
      expect(result.headers.get("vary")).toBe(vary);
    }
  });
});