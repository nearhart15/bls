import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import {existsSync, mkdirSync, readFileSync, rmSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join, resolve} from "node:path";
import {parseBlsText} from "./import-beer-league.mjs";

const BINBIN_LEAGUES_URL = process.env.BINBIN_LEAGUES_URL || "https://bls.bindul.name/data/leagues.json";
const MEDIA_URL = "https://arapahoebowl.com/wp-json/wp/v2/media";
const HISTORY_DIR = process.env.BEER_LEAGUE_HISTORY_DIR || "public/data/beer-league-history";
const USER_AGENT = "BLS Beer League history backfill (+https://github.com/nearhart15/bls)";

async function request(url) {
    const response = await fetch(url, {redirect: "follow", headers: {"user-agent": USER_AGENT, accept: "application/json,application/pdf,*/*;q=0.8"}});
    if (!response.ok) throw new Error(`${response.status} ${response.statusText} fetching ${url}`);
    return response;
}

function collectYears(value, years = new Set()) {
    if (typeof value === "string") for (const match of value.matchAll(/\b(20\d{2})\b/g)) years.add(Number(match[1]));
    else if (Array.isArray(value)) for (const child of value) collectYears(child, years);
    else if (value && typeof value === "object") for (const child of Object.values(value)) collectYears(child, years);
    return years;
}

export function yearsFromBinBinIndex(index, now = new Date()) {
    const current = now.getUTCFullYear();
    return [...collectYears(index)].filter(year => year >= 2010 && year <= current).sort((a, b) => a - b);
}

function mediaPdfUrl(item) {
    const url = String(item.source_url ?? item.guid?.rendered ?? "");
    const title = String(item.title?.rendered ?? item.slug ?? "");
    if (!/\.pdf(?:$|[?#])/i.test(url)) return null;
    if (!/beer/i.test(`${title} ${url}`) || !/stand|wk|week|final/i.test(`${title} ${url}`)) return null;
    return url;
}

async function mediaForYear(year) {
    const found = new Map();
    for (let page = 1; page <= 20; page += 1) {
        const url = new URL(MEDIA_URL);
        url.searchParams.set("search", "Beer");
        url.searchParams.set("media_type", "application");
        url.searchParams.set("per_page", "100");
        url.searchParams.set("page", String(page));
        url.searchParams.set("after", `${year}-01-01T00:00:00`);
        url.searchParams.set("before", `${year}-12-31T23:59:59`);
        const response = await fetch(url, {headers: {"user-agent": USER_AGENT, accept: "application/json"}});
        if (response.status === 400 && page > 1) break;
        if (!response.ok) throw new Error(`${response.status} ${response.statusText} fetching ${url}`);
        const rows = await response.json();
        for (const row of rows) {
            const pdf = mediaPdfUrl(row);
            if (pdf) found.set(pdf, row);
        }
        const totalPages = Number(response.headers.get("x-wp-totalpages") ?? 1);
        if (page >= totalPages) break;
    }
    return [...found.entries()].map(([url, item]) => ({url, item}));
}

function inferSeason(parsed, media, year) {
    const text = `${parsed.league.name ?? ""} ${media.title?.rendered ?? ""} ${media.slug ?? ""} ${media.source_url ?? ""}`;
    const summer = text.match(/summer[^0-9]*(20\d{2})|\bS(?:ummer)?[-_ ]?(\d{2})\b/i);
    if (summer) {
        const y = summer[1] ? Number(summer[1]) : 2000 + Number(summer[2]);
        return `Summer ${y}`;
    }
    const fall = text.match(/fall[^0-9]*(20\d{2})|\bF(?:all)?[-_ ]?(\d{2})\b/i);
    if (fall) {
        const y = fall[1] ? Number(fall[1]) : 2000 + Number(fall[2]);
        return `Fall / Winter ${y}–${String(y + 1).slice(-2)}`;
    }
    return `Beer ${year}`;
}

function seasonSlug(season) {
    return season.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function archive(parsed, bytes) {
    const week = parsed.league.week;
    if (!Number.isInteger(week) || week < 1) return false;
    const season = parsed.league.season;
    const slug = seasonSlug(season);
    const dir = resolve(HISTORY_DIR, slug);
    mkdirSync(dir, {recursive: true});
    const prefix = `week-${String(week).padStart(2, "0")}`;
    const hash = createHash("sha256").update(bytes).digest("hex");
    let revision = 1;
    while (existsSync(join(dir, revision === 1 ? `${prefix}.json` : `${prefix}-r${revision}.json`))) {
        const jsonPath = join(dir, revision === 1 ? `${prefix}.json` : `${prefix}-r${revision}.json`);
        const existing = JSON.parse(readFileSync(jsonPath, "utf8"));
        if (existing.archive?.pdfSha256 === hash) return false;
        revision += 1;
    }
    const base = revision === 1 ? prefix : `${prefix}-r${revision}`;
    const pdfFile = `${base}.pdf`;
    const snapshot = {...parsed, archive: {week, revision, pdfSha256: hash, pdfFile, archivedAt: new Date().toISOString(), historicalBackfill: true}};
    writeFileSync(join(dir, `${base}.json`), `${JSON.stringify(snapshot, null, 2)}\n`);
    writeFileSync(join(dir, pdfFile), bytes);

    const indexPath = resolve(HISTORY_DIR, "index.json");
    let index = {snapshots: []};
    if (existsSync(indexPath)) index = JSON.parse(readFileSync(indexPath, "utf8"));
    index.snapshots = (index.snapshots ?? []).filter(row => !(row.season === season && row.week === week && row.revision === revision));
    index.snapshots.push({season, week, revision, date: parsed.league.date, json: `${slug}/${base}.json`, pdf: `${slug}/${pdfFile}`, pdfSha256: hash});
    index.snapshots.sort((a, b) => String(a.season).localeCompare(String(b.season)) || a.week - b.week || a.revision - b.revision);
    writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);
    return true;
}

async function parsePdf(url, media, year) {
    const bytes = Buffer.from(await (await request(url)).arrayBuffer());
    if (bytes.subarray(0, 5).toString("ascii") !== "%PDF-") return false;
    const workDir = join(tmpdir(), `bls-beer-backfill-${process.pid}-${Date.now()}`);
    mkdirSync(workDir, {recursive: true});
    const pdfPath = join(workDir, "standings.pdf");
    const textPath = join(workDir, "standings.txt");
    writeFileSync(pdfPath, bytes);
    try {
        execFileSync("pdftotext", ["-layout", "-nopgbrk", pdfPath, textPath], {stdio: "ignore"});
        const parsed = parseBlsText(readFileSync(textPath, "utf8"), {directoryUrl: MEDIA_URL, pdfUrl: url});
        if (!/^beer\b/i.test(parsed.league.name ?? "") || !/^Thursday$/i.test(parsed.league.day ?? "")) return false;
        if (!parsed.standings.length || !parsed.teams.length) return false;
        parsed.league.season = inferSeason(parsed, media, year);
        return archive(parsed, bytes);
    } finally {
        rmSync(workDir, {recursive: true, force: true});
    }
}

export async function backfillBeerLeagueHistory() {
    const binbin = await (await request(BINBIN_LEAGUES_URL)).json();
    const years = yearsFromBinBinIndex(binbin);
    if (!years.length) throw new Error("Could not determine any BinBin league years.");
    console.log(`BinBin years: ${years.join(", ")}`);
    let discovered = 0;
    let archived = 0;
    for (const year of years) {
        const media = await mediaForYear(year);
        console.log(`${year}: ${media.length} Beer standings PDF candidate(s)`);
        discovered += media.length;
        for (const candidate of media) {
            try {
                if (await parsePdf(candidate.url, candidate.item, year)) archived += 1;
            } catch (error) {
                console.warn(`Skipping ${candidate.url}: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    }
    console.log(`Historical backfill complete: ${discovered} candidate PDFs checked, ${archived} new snapshots archived.`);
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
    backfillBeerLeagueHistory().catch(error => { console.error(error instanceof Error ? error.stack : error); process.exitCode = 1; });
}
