import {execFileSync} from "node:child_process";
import {mkdtempSync, readFileSync, rmSync, statSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {isAbsolute, join, relative, resolve} from "node:path";

export const MiB = 1024 * 1024;

function hostAllowed(hostname, allowedHosts) {
    const host = hostname.toLowerCase();
    return allowedHosts.some(domain => {
        const allowed = String(domain).toLowerCase();
        return host === allowed || host.endsWith("." + allowed);
    });
}

export function assertTrustedUrl(value, allowedHosts) {
    const url = value instanceof URL ? new URL(value.href) : new URL(String(value));
    if (url.protocol !== "https:" || url.username || url.password) throw new Error("Untrusted URL scheme or credentials");
    if (!hostAllowed(url.hostname, allowedHosts)) throw new Error("Untrusted URL host: " + url.hostname);
    return url;
}

function redirectMethod(status, method) {
    if (status === 303) return "GET";
    if ((status === 301 || status === 302) && method === "POST") return "GET";
    return method;
}

export async function safeFetch(value, options = {}, config = {}) {
    const allowedHosts = config.allowedHosts ?? [];
    const timeoutMs = config.timeoutMs ?? 15_000;
    const maxRedirects = config.maxRedirects ?? 3;
    let url = assertTrustedUrl(value, allowedHosts);
    let method = String(options.method ?? "GET").toUpperCase();
    let body = options.body;
    let headers = new Headers(options.headers ?? {});

    for (let redirects = 0; redirects <= maxRedirects; redirects += 1) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        let response;
        try {
            response = await fetch(url, {...options, method, body, headers, redirect: "manual", signal: controller.signal});
        } finally {
            clearTimeout(timer);
        }

        if ([301, 302, 303, 307, 308].includes(response.status)) {
            const location = response.headers.get("location");
            if (!location) throw new Error("Redirect response did not include a location");
            if (redirects >= maxRedirects) throw new Error("Too many redirects");
            const next = assertTrustedUrl(new URL(location, url), allowedHosts);
            if (next.origin !== url.origin) {
                headers = new Headers(headers);
                headers.delete("authorization");
                headers.delete("cookie");
            }
            const nextMethod = redirectMethod(response.status, method);
            if (nextMethod === "GET" && method !== "GET") {
                body = undefined;
                headers = new Headers(headers);
                headers.delete("content-type");
                headers.delete("content-length");
            }
            method = nextMethod;
            url = next;
            continue;
        }

        return response;
    }
    throw new Error("Too many redirects");
}

function declaredSize(response) {
    const value = Number(response.headers.get("content-length"));
    return Number.isFinite(value) && value >= 0 ? value : null;
}

export async function readLimitedBytes(response, maxBytes) {
    const declared = declaredSize(response);
    if (declared != null && declared > maxBytes) throw new Error("Remote response is too large");
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Remote response had no body");
    const chunks = [];
    let size = 0;
    while (true) {
        const {done, value} = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxBytes) {
            await reader.cancel();
            throw new Error("Remote response is too large");
        }
        chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
    }
    return bytes;
}

export async function readLimitedText(response, maxBytes) {
    const bytes = await readLimitedBytes(response, maxBytes);
    return new TextDecoder("utf-8", {fatal: true}).decode(bytes);
}

export async function readLimitedJson(response, maxBytes) {
    return JSON.parse(await readLimitedText(response, maxBytes));
}

export function boundedEnvInt(value, fallback, min, max) {
    const parsed = Number.parseInt(String(value ?? ""), 10);
    return Number.isSafeInteger(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

function childEnvironment() {
    const blocked = new Set(["GITHUB_ENV", "GITHUB_PATH", "GITHUB_OUTPUT", "GITHUB_STATE", "GITHUB_STEP_SUMMARY"]);
    return Object.fromEntries(Object.entries(process.env).filter(([key]) => !blocked.has(key)));
}

export function pdfBytesToText(bytes, options = {}) {
    const maxTextBytes = options.maxTextBytes ?? 5 * MiB;
    const timeoutMs = options.timeoutMs ?? 30_000;
    const prefix = options.prefix ?? "bls-pdf-";
    const workDir = mkdtempSync(join(tmpdir(), prefix));
    const pdfPath = join(workDir, "input.pdf");
    const textPath = join(workDir, "output.txt");
    try {
        writeFileSync(pdfPath, bytes, {mode: 0o600});
        execFileSync("pdftotext", ["-layout", "-nopgbrk", pdfPath, textPath], {
            stdio: "ignore",
            timeout: timeoutMs,
            env: childEnvironment(),
            windowsHide: true,
        });
        if (statSync(textPath).size > maxTextBytes) throw new Error("Extracted PDF text is too large");
        return readFileSync(textPath, "utf8");
    } finally {
        rmSync(workDir, {recursive: true, force: true});
    }
}


export function safeWorkspacePath(value, root = process.cwd()) {
    const raw = String(value ?? "");
    if (!raw || raw.includes("\0") || isAbsolute(raw)) throw new Error("Output path must be a relative workspace path");
    const workspace = resolve(root);
    const target = resolve(workspace, raw);
    const rel = relative(workspace, target);
    if (!rel || rel === "." || rel.startsWith("..") || isAbsolute(rel)) throw new Error("Output path escapes the workspace");
    return target;
}
