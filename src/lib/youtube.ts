// A key-less YouTube search. We fetch the public results page and read the
// `ytInitialData` blob YouTube embeds for its own client to hydrate from.
// No API key, no quota — but it depends on YouTube's page shape, so every
// access is defensive and a failure degrades to "no results" rather than a
// throw the UI can't recover from.

export type Accompaniment = {
  videoId: string;
  title: string;
  channel: string;
  duration: string | null; // e.g. "4:12", null for live/unknown
  thumbnail: string;
  url: string;
};

// Pull the `var ytInitialData = {...};` object out of the results HTML.
function extractInitialData(html: string): unknown | null {
  // The blob appears as either `var ytInitialData = {...};` or
  // `window["ytInitialData"] = {...};` depending on the surface.
  const marker = html.indexOf("ytInitialData");
  if (marker === -1) return null;
  const start = html.indexOf("{", marker);
  if (start === -1) return null;

  // Walk the string tracking brace depth so we grab exactly the JSON object,
  // ignoring braces that appear inside string literals.
  let depth = 0;
  let inStr = false;
  let escaped = false;
  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (inStr) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

// Recursively collect every `videoRenderer` node in the parsed data. The
// search response nests them under a few layers that YouTube reshuffles often,
// so we walk the whole tree instead of hardcoding the path.
function collectVideoRenderers(node: unknown, out: Record<string, unknown>[]) {
  if (Array.isArray(node)) {
    for (const item of node) collectVideoRenderers(item, out);
    return;
  }
  if (node && typeof node === "object") {
    const obj = node as Record<string, unknown>;
    if (obj.videoRenderer && typeof obj.videoRenderer === "object") {
      out.push(obj.videoRenderer as Record<string, unknown>);
    }
    for (const key of Object.keys(obj)) collectVideoRenderers(obj[key], out);
  }
}

// Dig `runs[0].text` / `simpleText` out of a YouTube text object.
function readText(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const v = value as Record<string, unknown>;
  if (typeof v.simpleText === "string") return v.simpleText;
  if (Array.isArray(v.runs)) {
    return (v.runs as Record<string, unknown>[])
      .map((r) => (typeof r.text === "string" ? r.text : ""))
      .join("");
  }
  return "";
}

export async function searchAccompaniments(
  query: string,
  limit = 12,
): Promise<Accompaniment[]> {
  const url =
    "https://www.youtube.com/results?search_query=" +
    encodeURIComponent(query) +
    // sp=EgIQAQ%3D%3D restricts results to videos only (no channels/playlists).
    "&sp=EgIQAQ%253D%253D";

  const res = await fetch(url, {
    headers: {
      // A desktop UA and English locale keep YouTube serving the HTML page
      // (with ytInitialData) rather than a consent interstitial.
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
    // Results shift constantly; don't let Next cache a stale page.
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`YouTube responded with ${res.status}`);
  }

  const html = await res.text();
  const data = extractInitialData(html);
  if (!data) return [];

  const renderers: Record<string, unknown>[] = [];
  collectVideoRenderers(data, renderers);

  const results: Accompaniment[] = [];
  const seen = new Set<string>();

  for (const r of renderers) {
    const videoId = typeof r.videoId === "string" ? r.videoId : null;
    if (!videoId || seen.has(videoId)) continue;

    const title = readText(r.title);
    if (!title) continue;

    const channel = readText(r.ownerText) || readText(r.longBylineText);
    const duration = readText(r.lengthText) || null;

    seen.add(videoId);
    results.push({
      videoId,
      title,
      channel,
      duration,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      url: `https://www.youtube.com/watch?v=${videoId}`,
    });

    if (results.length >= limit) break;
  }

  return results;
}
