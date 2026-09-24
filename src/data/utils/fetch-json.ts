import {validateFrames} from "./bowling-input";

const MAX_BYTES = 8 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 15_000;

function pageUrl(): URL {
    return new URL(window.location.href);
}

function configuredDataOrigins(): Set<string> {
    const page = pageUrl();
    const origins = new Set<string>([page.origin]);
    const configured = [
        import.meta.env.VITE_DATA_URL_BASE,
        import.meta.env.VITE_DATA_LEAGUES_INDEX_RESOURCE,
        import.meta.env.VITE_DATA_PLAYERS_INDEX_RESOURCE,
        import.meta.env.VITE_DATA_NEWS_INDEX_RESOURCE,
    ];
    for (const value of configured) {
        if (!value) continue;
        try { origins.add(new URL(value, page).origin); } catch { /* Invalid config is rejected when used. */ }
    }
    return origins;
}

function isLoopback(url: URL): boolean {
    return url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
}

/** Only same-site or explicitly configured data origins may be fetched by the browser. */
export function trustedDataUrl(value: string): URL {
    const url = new URL(value, pageUrl());
    if (url.username || url.password) throw new Error("Data URL must not contain credentials");
    if (url.protocol !== "https:" && !(url.protocol === "http:" && isLoopback(url))) {
        throw new Error("Data URL must use HTTPS");
    }
    if (!configuredDataOrigins().has(url.origin)) throw new Error("Untrusted data origin");
    return url;
}

/** Keep data-loc inside the configured data directory, including after URL normalization. */
export function dataUrl(base: string, location: string): string {
    const origin = trustedDataUrl(base);
    if (!/^[A-Za-z0-9_./-]+\.json$/.test(location)) throw new Error("Invalid data filename");
    if (!location || /[\\?#]/.test(location) || location.split("/").some(part => part === "..")) throw new Error("Invalid data location");
    const url = trustedDataUrl(new URL(location, origin).href);
    const basePath = origin.pathname.endsWith("/") ? origin.pathname : origin.pathname + "/";
    if (url.origin !== origin.origin || !url.pathname.startsWith(basePath)) throw new Error("Data location is outside the configured directory");
    return url.href;
}

export function validateJson(value: unknown, key = "", depth = 0): void {
    if (depth > 30) throw new Error("Data nesting limit exceeded");
    if (typeof value === "number" && !Number.isFinite(value)) throw new Error("Invalid number: " + key);
    if (typeof value === "string" && (value.length > 20000 || (["id","player","name"].includes(key) && (value.length > 200 || /[\r\n\x00-\x1f]/.test(value))))) {
        throw new Error("Invalid text: " + key);
    }
    const bounds: Record<string, [number,number]> = {
        "games-per-week":[1,12],"lineup":[1,20],"legal-min-lineup":[0,20],"roster":[0,100],
        "scratch-score":[0,6000],"entering-avg":[0,300],"entering-average":[0,300],"hdcp":[0,6000],
        "week":[1,200],"duration":[1,200],"pct-to-target":[0,100],"target":[0,300],"default-penalty":[0,300],
    };
    const structuralField = (key === "hdcp" && typeof value === "object") || (key === "roster" && Array.isArray(value));
    if (key in bounds && value != null && !structuralField) {
        const [min,max] = bounds[key];
        if (typeof value !== "number" || value < min || value > max || (["games-per-week","lineup","roster","week","duration"].includes(key) && !Number.isInteger(value))) {
            throw new Error("Invalid numeric range: " + key);
        }
    }
    if (Array.isArray(value)) {
        if (value.length > 10000) throw new Error("Too many records: " + key);
        if (key === "frames" && value.length) validateFrames(value);
        const ids = new Set<string>();
        for (const item of value as unknown[]) {
            if (item && typeof item === "object" && "id" in item && typeof item.id === "string") {
                if (ids.has(item.id)) throw new Error("Duplicate ID: " + item.id);
                ids.add(item.id);
            }
            validateJson(item, "", depth + 1);
        }
    } else if (value && typeof value === "object") {
        if (Object.keys(value).length > 200) throw new Error("Too many object fields");
        for (const [field,item] of Object.entries(value)) {
            if (["__proto__","constructor","prototype"].includes(field)) throw new Error("Forbidden object field");
            validateJson(item, field, depth + 1);
        }
    }
}

export async function fetchJson(url: string): Promise<object> {
    const requested = trustedDataUrl(url);
    const controller = new AbortController();
    const timer = setTimeout(() => { controller.abort(); }, REQUEST_TIMEOUT_MS);
    try {
        const response = await fetch(requested.href, {
            signal: controller.signal,
            credentials: "omit",
            referrerPolicy: "no-referrer",
            cache: "no-cache",
        });
        if (!response.ok) throw new Error("Data request failed (HTTP " + response.status + ")");
        if (response.url) {
            const finalUrl = trustedDataUrl(response.url);
            if (finalUrl.origin !== requested.origin) throw new Error("Cross-origin data redirect rejected");
        }
        const contentType = response.headers.get("content-type");
        if (contentType && !/(^|;)\s*(application\/(?:[a-z0-9.+-]*\+)?json|text\/json)\b/i.test(contentType)) {
            throw new Error("Data response is not JSON");
        }
        const declared = Number(response.headers.get("content-length"));
        if (Number.isFinite(declared) && declared > MAX_BYTES) throw new Error("Data file is too large");
        const reader = response.body?.getReader();
        if (!reader) throw new Error("Empty data response");
        const chunks: Uint8Array[] = [];
        let size = 0;
        while (true) {
            const {done,value} = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > MAX_BYTES) {
                await reader.cancel();
                throw new Error("Data file is too large");
            }
            chunks.push(value);
        }
        const bytes = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
        const result: unknown = JSON.parse(new TextDecoder("utf-8", {fatal: true}).decode(bytes));
        if (!result || typeof result !== "object" || Array.isArray(result)) throw new Error("Expected a JSON document");
        validateJson(result);
        return result;
    } finally {
        clearTimeout(timer);
    }
}
