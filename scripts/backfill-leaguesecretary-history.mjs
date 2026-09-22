import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const LEAGUE_ID = 133016;
export const QUALIFYING_TEAM = "Pins Go Boom!";
export const BASE_PAGE = "https://www.leaguesecretary.com/bowling-centers/arapahoe-bowling-center/bowling-leagues/beer-fall-2026";
export const RECAP_SHEETS_URL = `${BASE_PAGE}/league/recaps-png/${LEAGUE_ID}`;
const OUTPUT_DIR = process.env.LEAGUESECRETARY_HISTORY_DIR || "public/data/leaguesecretary-beer-history";
const USER_AGENT = "BLS historical importer (+https://github.com/nearhart15/bls)";

function sleep(ms) { return new Promise(resolvePromise => setTimeout(resolvePromise, ms)); }
function decodeHtml(value) {
    return String(value ?? "")
        .replaceAll("&amp;", "&").replaceAll("&quot;", '"').replaceAll("&#x27;", "'")
        .replaceAll("&#39;", "'").replaceAll("&lt;", "<").replaceAll("&gt;", ">");
}
function stripHtml(value) { return decodeHtml(String(value ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()); }
function normalize(value) { return String(value ?? "").toLocaleLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, ""); }
function slug(value) { return String(value ?? "").toLocaleLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function round(value, digits = 1) { const scale = 10 ** digits; return Math.round(value * scale) / scale; }

export function displayBowlerName(sourceName) {
    const text = String(sourceName ?? "").trim();
    const comma = text.indexOf(",");
    if (comma < 0) return text;
    const last = text.slice(0, comma).trim();
    const first = text.slice(comma + 1).trim();
    return `${first} ${last}`.trim();
}

async function request(url, options = {}, attempts = 3) {
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
            const response = await fetch(url, {
                redirect: "follow",
                ...options,
                headers: {"user-agent": USER_AGENT, accept: "text/html,application/json,*/*;q=0.8", ...(options.headers || {})},
            });
            if (!response.ok) throw new Error(`${response.status} ${response.statusText} fetching ${url}`);
            return response;
        } catch (error) {
            lastError = error;
            if (attempt < attempts) await sleep(500 * attempt);
        }
    }
    throw lastError;
}

export function extractSelectOptions(html, selectId) {
    const escaped = selectId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = String(html).match(new RegExp(`<select\\b[^>]*\\bid=["']${escaped}["'][^>]*>([\\s\\S]*?)<\\/select>`, "i"));
    if (!match) return [];
    return [...match[1].matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/gi)].map(option => ({
        value: decodeHtml(option[1].match(/\bvalue=["']([^"']*)["']/i)?.[1] ?? ""),
        selected: /\bselected\b/i.test(option[1]),
        text: stripHtml(option[2]),
    }));
}

function extractBalancedJson(text, startIndex) {
    const source = String(text);
    const open = source[startIndex];
    const close = open === "[" ? "]" : open === "{" ? "}" : null;
    if (!close) throw new Error(`Expected JSON opener at ${startIndex}.`);
    let depth = 0, inString = false, escaped = false;
    for (let index = startIndex; index < source.length; index += 1) {
        const char = source[index];
        if (inString) {
            if (escaped) escaped = false;
            else if (char === "\\") escaped = true;
            else if (char === '"') inString = false;
            continue;
        }
        if (char === '"') { inString = true; continue; }
        if (char === open) depth += 1;
        else if (char === close) {
            depth -= 1;
            if (depth === 0) return source.slice(startIndex, index + 1);
        }
    }
    throw new Error("Unterminated embedded JSON payload.");
}

export function extractLeagueBowlerData(html) {
    const source = String(html).replaceAll('\\"', '"');
    const marker = '"dataSource":';
    let offset = 0;
    while (offset < source.length) {
        const markerIndex = source.indexOf(marker, offset);
        if (markerIndex < 0) break;
        const arrayStart = source.indexOf("[", markerIndex + marker.length);
        if (arrayStart < 0) break;
        try {
            const rows = JSON.parse(extractBalancedJson(source, arrayStart));
            if (Array.isArray(rows) && rows.some(row => row && typeof row === "object" && "BowlerID" in row && "BowlerName" in row)) {
                return rows;
            }
        } catch {
            // This page has multiple Kendo data sources. Keep scanning until the bowler array is found.
        }
        offset = markerIndex + marker.length;
    }
    throw new Error("LeagueSecretary bowler dataSource was not found.");
}

export function parseReportingPeriod(option) {
    const [weekRaw, yearRaw, seasonCode] = String(option.value ?? "").split("|");
    const week = Number.parseInt(weekRaw, 10), year = Number.parseInt(yearRaw, 10);
    const dateMatch = String(option.text ?? "").match(/(\d{2}\/\d{2}\/\d{4})$/);
    const seasonMatch = String(option.text ?? "").match(/^(.+?)\s+Week\s+\d+/i);
    if (!Number.isInteger(week) || !Number.isInteger(year) || !seasonCode || !dateMatch || !seasonMatch) return null;
    const [month, day, dateYear] = dateMatch[1].split("/");
    return {
        week, year, seasonCode, label: seasonMatch[1].trim(), date: `${dateYear}-${month}-${day}`,
        sourceLabel: option.text,
    };
}

function cleanBowler(row) {
    return {
        sourcePlayerId: Number(row.BowlerID) || 0,
        sourceName: String(row.BowlerName ?? "").trim(),
        name: displayBowlerName(row.BowlerName),
        teamId: Number(row.TeamID) || 0,
        teamName: String(row.TeamName ?? "").trim(),
        teamNumber: Number(row.TeamNum) || 0,
        gender: row.Gender == null ? null : String(row.Gender),
        status: row.BowlerStatus == null ? null : String(row.BowlerStatus),
        position: Number(row.BowlerPosition) || 0,
        games: Number(row.TotalGames) || 0,
        pins: Number(row.TotalPins) || 0,
        average: Number(row.Average) || 0,
        enteringAverage: Number(row.EnteringAverage) || 0,
        handicap: Number(row.HandicapAfterBowling) || 0,
        highGame: Number(row.HighScratchGame) || 0,
        highSeries: Number(row.HighScratchSeries) || 0,
        highHandicapGame: Number(row.HighHandicapGame) || 0,
        highHandicapSeries: Number(row.HighHandicapSeries) || 0,
    };
}

function seasonKey(period) { return `${period.year}-${period.seasonCode}`; }
function snapshotPath(period) { return `${slug(period.label)}/week-${String(period.week).padStart(2, "0")}.json`; }
function teamPresent(options, name = QUALIFYING_TEAM) { const target = normalize(name); return options.some(option => normalize(option.text) === target); }

export function buildPlayerHistory(snapshots) {
    const ordered = [...snapshots].sort((a, b) => a.reporting.date.localeCompare(b.reporting.date) || a.reporting.week - b.reporting.week);
    const players = new Map();
    const previousBySeasonAndPlayer = new Map();

    for (const snapshot of ordered) {
        const season = seasonKey(snapshot.reporting);
        for (const row of snapshot.bowlers) {
            if (!row.sourcePlayerId || row.games <= 0) continue;
            const key = String(row.sourcePlayerId);
            const previousKey = `${season}:${key}`;
            const previous = previousBySeasonAndPlayer.get(previousKey);
            let weekGames = null, weekPins = null, weekAverage = null, weekSeries = null;
            if (previous) {
                const gameDelta = row.games - previous.games;
                const pinDelta = row.pins - previous.pins;
                if (gameDelta > 0 && pinDelta >= 0) {
                    weekGames = gameDelta;
                    weekPins = pinDelta;
                    weekAverage = round(pinDelta / gameDelta, 1);
                    weekSeries = gameDelta === 3 ? pinDelta : null;
                }
            } else if (snapshot.reporting.week === 1 && row.games > 0 && row.pins >= 0) {
                weekGames = row.games;
                weekPins = row.pins;
                weekAverage = round(row.pins / row.games, 1);
                weekSeries = row.games === 3 ? row.pins : null;
            }
            previousBySeasonAndPlayer.set(previousKey, {games: row.games, pins: row.pins});

            const current = players.get(key) ?? {
                sourcePlayerId: row.sourcePlayerId,
                name: row.name,
                sourceName: row.sourceName,
                normalizedName: normalize(row.name),
                history: [],
            };
            current.name = row.name || current.name;
            current.sourceName = row.sourceName || current.sourceName;
            current.history.push({
                season: snapshot.reporting.label,
                seasonKey: season,
                week: snapshot.reporting.week,
                date: snapshot.reporting.date,
                teamId: row.teamId,
                teamName: row.teamName,
                teamNumber: row.teamNumber,
                games: row.games,
                pins: row.pins,
                seasonAverage: round(row.pins / row.games, 1),
                weekGames,
                weekPins,
                weekAverage,
                weekSeries,
                highGame: row.highGame,
                highSeries: row.highSeries,
            });
            players.set(key, current);
        }
    }
    return [...players.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function backfillLeagueSecretaryHistory() {
    console.log(`Loading reporting periods from ${RECAP_SHEETS_URL}`);
    const baseHtml = await (await request(RECAP_SHEETS_URL)).text();
    const periods = extractSelectOptions(baseHtml, "leaguePngViewer-recaps-period").map(parseReportingPeriod).filter(Boolean);
    if (!periods.length) throw new Error("No LeagueSecretary reporting periods were found.");

    const snapshots = [], skipped = [];
    for (const [index, period] of periods.entries()) {
        const url = `${BASE_PAGE}/league/recaps/${LEAGUE_ID}/${period.year}/${period.seasonCode}/${period.week}/0`;
        console.log(`[${index + 1}/${periods.length}] ${period.label} week ${period.week}`);
        const html = await (await request(url)).text();
        const teams = extractSelectOptions(html, "leagueRecapTeam");
        if (!teamPresent(teams)) {
            skipped.push({...period, reason: `${QUALIFYING_TEAM} is not in this reporting period`});
            await sleep(80);
            continue;
        }
        const bowlers = extractLeagueBowlerData(html).map(cleanBowler).filter(row => row.sourcePlayerId && (row.teamId > 0 || row.games > 0));
        const snapshot = {
            source: {provider: "LeagueSecretary", leagueId: LEAGUE_ID, url},
            reporting: period,
            qualifyingTeam: QUALIFYING_TEAM,
            teams: teams.map(team => ({id: Number(team.value) || 0, name: team.text})),
            bowlers,
        };
        snapshots.push(snapshot);
        const output = resolve(OUTPUT_DIR, snapshotPath(period));
        mkdirSync(dirname(output), {recursive: true});
        writeFileSync(output, `${JSON.stringify(snapshot, null, 2)}\n`);
        await sleep(80);
    }

    const seasonMap = new Map();
    for (const snapshot of snapshots) {
        const key = seasonKey(snapshot.reporting);
        const current = seasonMap.get(key) ?? {key, label: snapshot.reporting.label, year: snapshot.reporting.year, seasonCode: snapshot.reporting.seasonCode, weeks: 0, firstDate: snapshot.reporting.date, lastDate: snapshot.reporting.date};
        current.weeks += 1;
        if (snapshot.reporting.date < current.firstDate) current.firstDate = snapshot.reporting.date;
        if (snapshot.reporting.date > current.lastDate) current.lastDate = snapshot.reporting.date;
        seasonMap.set(key, current);
    }
    const seasons = [...seasonMap.values()].sort((a, b) => a.firstDate.localeCompare(b.firstDate));
    const index = {
        generatedAt: new Date().toISOString(),
        source: {provider: "LeagueSecretary", leagueId: LEAGUE_ID, url: RECAP_SHEETS_URL},
        qualifyingTeam: QUALIFYING_TEAM,
        totalReportingPeriods: periods.length,
        importedWeeks: snapshots.length,
        skippedWeeks: skipped.length,
        seasons,
        snapshots: snapshots.map(snapshot => ({
            season: snapshot.reporting.label,
            seasonKey: seasonKey(snapshot.reporting),
            week: snapshot.reporting.week,
            date: snapshot.reporting.date,
            path: snapshotPath(snapshot.reporting),
            bowlerCount: snapshot.bowlers.length,
            teamCount: snapshot.teams.length,
            sourceUrl: snapshot.source.url,
        })),
        skipped,
    };
    mkdirSync(resolve(OUTPUT_DIR), {recursive: true});
    writeFileSync(resolve(OUTPUT_DIR, "index.json"), `${JSON.stringify(index, null, 2)}\n`);
    const history = {
        generatedAt: index.generatedAt,
        source: index.source,
        qualifyingTeam: QUALIFYING_TEAM,
        seasons,
        importedWeeks: snapshots.length,
        players: buildPlayerHistory(snapshots),
    };
    writeFileSync(resolve(OUTPUT_DIR, "player-history.json"), `${JSON.stringify(history, null, 2)}\n`);
    console.log(`Imported ${snapshots.length} of ${periods.length} reporting weeks across ${seasons.length} qualifying seasons.`);
    return {index, history};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    backfillLeagueSecretaryHistory().catch(error => {
        console.error(error instanceof Error ? error.stack : error);
        process.exitCode = 1;
    });
}
