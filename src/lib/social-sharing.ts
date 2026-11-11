/** Explicit empty image fields opt out instead of leaving room for screenshot fallbacks. */
export const SHARED_LINK_POLICY = {
  imageUrl: "",
  cardType: "summary",
  imageIndexing: "noimageindex, max-image-preview:none",
} as const;

/** Link-unfurl services only; ordinary browsers and search crawlers keep the full page. */
export function isSocialPreviewCrawler(userAgent: string) {
  return /\b(?:WhatsApp|TelegramBot|facebookexternalhit|Facebot|meta-externalagent|meta-externalfetcher|Twitterbot|LinkedInBot|Slackbot|Discordbot|SkypeUriPreview|Pinterestbot|redditbot|vkShare|Viber|Iframely|Embedly|Applebot-LinkPreview)\b/i.test(userAgent);
}

/** Only trust proxy-provided hosts in the sandbox; published URLs use the request origin. */
export function requestOrigin(request: Request) {
  const url = new URL(request.url);
  const sandboxHost = url.hostname === "localhost" ? request.headers.get("x-forwarded-host") : null;
  return sandboxHost ? `https://${sandboxHost}` : url.origin;
}

export function sharedLinkMeta() {
  return [
    { property: "og:image", content: SHARED_LINK_POLICY.imageUrl },
    { name: "twitter:image", content: SHARED_LINK_POLICY.imageUrl },
    { name: "twitter:card", content: SHARED_LINK_POLICY.cardType },
  ];
}
