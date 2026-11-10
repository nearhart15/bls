import { safeFetch } from "./security-utils.mjs";
export const QUALIFYING_TEAM = "Pins Go Boom!";
export function slug(value) {
  return String(value ?? "")
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
export function normalizeName(value) {
  return String(value ?? "")
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "");
}
export function decodeHtml(value) {
  return String(value ?? "")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#039;", "'")
    .replaceAll("&#x27;", "'")
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}
export function createRequest({ allowedHosts, userAgent, accept }) {
  return async (url, options = {}) => {
    const response = await safeFetch(
      url,
      {
        ...options,
        headers: {
          "user-agent": userAgent,
          accept,
          ...(options.headers || {}),
        },
      },
      { allowedHosts },
    );
    if (!response.ok)
      throw new Error(
        `${response.status} ${response.statusText} fetching ${url}`,
      );
    return response;
  };
}
