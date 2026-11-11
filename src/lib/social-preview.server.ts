import { isSocialPreviewCrawler, sharedLinkMeta, SHARED_LINK_POLICY } from "./social-sharing";

function escapeAttribute(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function attributeValue(tag: string, attribute: string) {
  const match = tag.match(new RegExp(`\\b${attribute}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? "";
}

/** Suppress visual link previews without changing browser content or account access. */
export async function suppressVisualPreview(response: Response, request: Request): Promise<Response> {
  if (request.method !== "GET" || !response.ok || !response.headers.get("content-type")?.includes("text/html")) {
    return response;
  }

  const html = await response.clone().text();
  const endOfHead = html.search(/<\/head\s*>/i);
  if (endOfHead < 0) return response;
  const crawler = isSocialPreviewCrawler(request.headers.get("user-agent") ?? "");
  // Remove all old image/media variants before inserting the image-free policy.
  let head = html.slice(0, endOfHead).replace(/<meta\b[^>]*>/gi, (tag) => {
    const key = (attributeValue(tag, "property") || attributeValue(tag, "name")).toLowerCase();
    return /^(?:og:(?:image|video|audio)(?::|$)|twitter:(?:image|player)(?::|$)|twitter:card$|thumbnail$|thumbnailurl$)/.test(key) ? "" : tag;
  }).replace(/<link\b[^>]*>/gi, (tag) => {
    const rel = attributeValue(tag, "rel").toLowerCase();
    return rel === "image_src" ? "" : tag;
  });

  const tags = sharedLinkMeta().map((tag) => {
    const attribute = "property" in tag ? `property="${tag.property}"` : `name="${tag.name}"`;
    return `<meta ${attribute} content="${escapeAttribute(tag.content)}"/>`;
  }).join("");

  if (crawler) {
    // Unfurlers sometimes pick an arbitrary body image or favicon when OG images
    // are absent. Give them metadata only, after the normal access checks ran.
    head = head.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, "")
      .replace(/<link\b[^>]*>/gi, (tag) => attributeValue(tag, "rel").toLowerCase() === "canonical" ? tag : "");
  }

  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.delete("etag");
  headers.delete("content-encoding");
  const vary = headers.get("vary")?.split(",").map((value) => value.trim()).filter(Boolean) ?? [];
  if (!vary.some((value) => value.toLowerCase() === "user-agent") && !vary.includes("*")) vary.push("User-Agent");
  headers.set("vary", vary.join(", "));
  // This restricts images only, not indexing of the page's text.
  const robots = headers.get("x-robots-tag");
  headers.set("x-robots-tag", [robots, SHARED_LINK_POLICY.imageIndexing].filter(Boolean).join(", "));
  if (crawler) headers.set("cache-control", "private, no-store");
  const body = crawler
    ? `${head}${tags}</head><body></body></html>`
    : `${head}${tags}${html.slice(endOfHead)}`;
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}