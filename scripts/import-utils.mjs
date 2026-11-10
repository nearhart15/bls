import { readFileSync } from "node:fs";
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
  const entities = {
    "&amp;": "&",
    "&quot;": '"',
    "&#039;": "'",
    "&#x27;": "'",
    "&#39;": "'",
    "&apos;": "'",
    "&lt;": "<",
    "&gt;": ">",
  };
  return String(value ?? "").replace(
    /&(?:amp|quot|#039|#x27|#39|apos|lt|gt);/g,
    (entity) => entities[entity],
  );
}

export function readTextIfPresent(path) {
  try {
    return readFileSync(path, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
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
