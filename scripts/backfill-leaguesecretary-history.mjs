import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {boundedEnvInt, MiB, readLimitedJson, readLimitedText, safeFetch} from "./security-utils.mjs";

export const LEAGUE_ID = 133016;
export const QUALIFYING_TEAM = "Pins Go Boom!";
export const BASE_PAGE = "https://www.leaguesecretary.com/bowling-centers/arapahoe-bowling-center/bowling-leagues/beer-fall-2026";
export const RECAP_SHEETS_URL = `${BASE_PAGE}/league/recaps-png/${LEAGUE_ID}`;
export const INTERACTIVE_RECAPS_URL = "https://www.leaguesecretary.com/League/InteractiveRecaps_Read";
const OUTPUT_DIR = process.env.LEAGUESECRETARY_HISTORY_DIR || "public/data/leaguesecretary-beer-history";
const USER_AGENT = "BLS historical importer (+https://github.com/nearhart15/bls)";
const API_CONCURRENCY = boundedEnvInt(process.env.LEAGUESECRETARY_CONCURRENCY, 6, 1, 12);
const TRUSTED_HOSTS = ["leaguesecretary.com"];

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
function numberOrZero(value) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function numberOrNull(value) {
    if (value == null || String(value).trim() === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}
function flag(value) { return value === true || String(value).toLowerCase() === "true"; }

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
            const response = await safeFetch(url, {
                ...options,
                headers: {"user-agent": USER_AGENT, accept: "text/html,application/json,*/*;q=0.8", ...(options.headers || {})},
            }, {allowedHosts: TRUSTED_HOSTS});
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

function recapPageUrl(period, teamId = 0) {
    return BASE_PAGE + "/league/recaps/" + LEAGUE_ID + "/" + period.year + "/" + period.seasonCode + "/" + period.week + "/" + teamId;
}
function seasonKey(period) { return period.year + "-" + period.seasonCode; }
function snapshotPath(period) { return slug(period.label) + "/week-" + String(period.week).padStart(2, "0") + ".json"; }
function teamPresent(options, name = QUALIFYING_TEAM) {
    const target = normalize(name);
    return options.some(option => normalize(option.text ?? option.name) === target);
}

function cookieHeader(response) {
    const values = typeof response.headers.getSetCookie === "function"
        ? response.headers.getSetCookie()
        : [response.headers.get("set-cookie")].filter(Boolean);
    return values.map(value => String(value).split(";", 1)[0]).filter(Boolean).join("; ");
}

async function openRecapSession(period) {
    const url = recapPageUrl(period, 0);
    const response = await request(url);
    const html = await readLimitedText(response, 3 * MiB);
    const token = decodeHtml(html.match(/name=["']__RequestVerificationToken["'][^>]*value=["']([^"']+)["']/i)?.[1] ?? "");
    if (!token) throw new Error("LeagueSecretary request-verification token was not found for " + period.sourceLabel + ".");
    const teams = extractSelectOptions(html, "leagueRecapTeam")
        .map(option => ({id: Number.parseInt(option.value, 10) || 0, name: option.text}))
        .filter(team => team.id > 0 && team.name);
    if (!teams.length) throw new Error("No LeagueSecretary recap teams were found for " + period.sourceLabel + ".");
    return {url, token, cookie: cookieHeader(response), teams};
}

async function fetchTeamRecapRows(period, teamId, session) {
    const body = new URLSearchParams({
        leagueId: String(LEAGUE_ID),
        year: String(period.year),
        season: period.seasonCode,
        weekNum: String(period.week),
        teamId: String(teamId),
        page: "1",
        pageSize: "100",
        __RequestVerificationToken: session.token,
    });
    const response = await request(INTERACTIVE_RECAPS_URL, {
        method: "POST",
        headers: {
            "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
            accept: "application/json,text/plain,*/*",
            "x-requested-with": "XMLHttpRequest",
            referer: session.url,
            origin: "https://www.leaguesecretary.com",
            ...(session.cookie ? {cookie: session.cookie} : {}),
        },
        body,
    });
    const payload = await readLimitedJson(response, 5 * MiB);
    if (payload?.Errors) throw new Error("LeagueSecretary recap API returned errors for " + period.sourceLabel + ", team " + teamId + ": " + JSON.stringify(payload.Errors));
    if (!Array.isArray(payload?.Data)) throw new Error("LeagueSecretary recap API did not return rows for " + period.sourceLabel + ", team " + teamId + ".");
    if (payload.Data.length > 1000) throw new Error("LeagueSecretary recap API returned too many rows.");
    return payload.Data;
}

function scratchGames(row) {
    const games = [];
    for (let index = 1; index <= 6; index += 1) {
        const raw = row["Game" + index];
        const type = String(row["ScoreType" + index] ?? "").trim().toUpperCase();
        const score = numberOrNull(raw);
        if (type === "S" && score != null && score >= 0) games.push({game: index, score, type, raw: String(raw)});
    }
    return games;
}

export function parseRecapRows(rows, fallbackTeam = null) {
    const teams = [];
    let current = null;
    const ensureTeam = () => {
        if (!current && fallbackTeam?.id) {
            current = {id: fallbackTeam.id, name: fallbackTeam.name ?? "", number: fallbackTeam.number ?? fallbackTeam.id, players: []};
        }
        return current;
    };

    for (const row of Array.isArray(rows) ? rows : []) {
        if (!row || typeof row !== "object") continue;
        if (flag(row.IsHeader)) {
            if (current) teams.push(current);
            const id = numberOrZero(row.TeamID) || fallbackTeam?.id || 0;
            const name = stripHtml(row.TeamName || row.BowlerTitle || fallbackTeam?.name || "");
            current = {
                id,
                name,
                number: numberOrZero(row.TeamNum) || numberOrZero(row.TeamNumber) || id,
                lane: numberOrNull(row.LaneBowledOn),
                pointsWon: numberOrNull(row.TeamPointsWon),
                players: [],
            };
            continue;
        }
        if (flag(row.IsTotal) || !numberOrZero(row.BowlerID)) continue;
        const team = ensureTeam();
        if (!team) continue;

        const games = scratchGames(row);
        const weekPins = games.length ? games.reduce((sum, game) => sum + game.score, 0) : null;
        const sourceName = stripHtml(row.BowlerTitle || row.BowlerName || "");
        const name = displayBowlerName(sourceName);
        const player = {
            sourcePlayerId: numberOrZero(row.BowlerID),
            sourceName,
            name,
            normalizedName: normalize(name),
            teamId: team.id,
            teamName: team.name,
            teamNumber: team.number,
            enteringAverage: numberOrNull(row.Average),
            handicap: numberOrNull(row.Handicap),
            games,
            weekGames: games.length || null,
            weekPins,
            weekAverage: weekPins == null ? null : round(weekPins / games.length, 1),
            weekSeries: games.length === 3 ? weekPins : null,
        };
        if (player.sourceName) team.players.push(player);
    }
    if (current) teams.push(current);
    return teams;
}

async function fetchWeekSnapshot(period) {
    const session = await openRecapSession(period);
    if (!teamPresent(session.teams)) {
        return {snapshot: null, reason: QUALIFYING_TEAM + " is not in this reporting period"};
    }

    const parsedTeams = [];
    for (let offset = 0; offset < session.teams.length; offset += API_CONCURRENCY) {
        const batch = session.teams.slice(offset, offset + API_CONCURRENCY);
        const results = await Promise.all(batch.map(async team => {
            const rows = await fetchTeamRecapRows(period, team.id, session);
            const parsed = parseRecapRows(rows, team);
            if (!parsed.length) return {id: team.id, name: team.name, number: team.id, players: []};
            const exact = parsed.find(item => item.id === team.id) ?? parsed[0];
            if (!exact.name) exact.name = team.name;
            return exact;
        }));
        parsedTeams.push(...results);
        if (offset + API_CONCURRENCY < session.teams.length) await sleep(60);
    }

    const bowlers = parsedTeams.flatMap(team => team.players);
    if (!bowlers.some(row => row.weekGames && row.weekGames > 0)) {
        throw new Error("No scratch games were returned for " + period.sourceLabel + ".");
    }
    return {
        snapshot: {
            source: {provider: "LeagueSecretary", leagueId: LEAGUE_ID, url: recapPageUrl(period, 0), endpoint: INTERACTIVE_RECAPS_URL},
            reporting: period,
            qualifyingTeam: QUALIFYING_TEAM,
            teams: parsedTeams.map(team => ({
                id: team.id,
                name: team.name,
                number: team.number,
                lane: team.lane ?? null,
                pointsWon: team.pointsWon ?? null,
            })),
            bowlers,
        },
        reason: null,
    };
}

export function buildPlayerHistory(snapshots) {
    const ordered = [...snapshots].sort((a, b) => a.reporting.date.localeCompare(b.reporting.date) || a.reporting.week - b.reporting.week);
    const ambiguousNames = new Set();

    for (const snapshot of ordered) {
        const idsByName = new Map();
        for (const row of snapshot.bowlers) {
            if (!row.sourcePlayerId || !row.normalizedName) continue;
            const ids = idsByName.get(row.normalizedName) ?? new Set();
            ids.add(row.sourcePlayerId);
            idsByName.set(row.normalizedName, ids);
        }
        for (const [name, ids] of idsByName) if (ids.size > 1) ambiguousNames.add(name);
    }

    const players = new Map();
    const seasonTotals = new Map();
    for (const snapshot of ordered) {
        const season = seasonKey(snapshot.reporting);
        for (const row of snapshot.bowlers) {
            if (!row.sourcePlayerId || !row.normalizedName) continue;
            const playerKey = ambiguousNames.has(row.normalizedName)
                ? row.normalizedName + ":" + row.sourcePlayerId
                : row.normalizedName;
            const current = players.get(playerKey) ?? {
                sourcePlayerId: row.sourcePlayerId,
                sourcePlayerIds: [],
                name: row.name,
                sourceName: row.sourceName,
                normalizedName: row.normalizedName,
                history: [],
            };
            current.sourcePlayerId = row.sourcePlayerId;
            current.name = row.name || current.name;
            current.sourceName = row.sourceName || current.sourceName;
            if (!current.sourcePlayerIds.includes(row.sourcePlayerId)) current.sourcePlayerIds.push(row.sourcePlayerId);

            const totalKey = season + ":" + playerKey;
            const totals = seasonTotals.get(totalKey) ?? {games: 0, pins: 0, highGame: 0, highSeries: 0};
            if (row.weekGames && row.weekPins != null) {
                totals.games += row.weekGames;
                totals.pins += row.weekPins;
                for (const game of row.games ?? []) totals.highGame = Math.max(totals.highGame, game.score);
                if (row.weekSeries != null) totals.highSeries = Math.max(totals.highSeries, row.weekSeries);
            }
            seasonTotals.set(totalKey, totals);

            current.history.push({
                season: snapshot.reporting.label,
                seasonKey: season,
                week: snapshot.reporting.week,
                date: snapshot.reporting.date,
                teamId: row.teamId,
                teamName: row.teamName,
                teamNumber: row.teamNumber,
                games: totals.games,
                pins: totals.pins,
                seasonAverage: totals.games ? round(totals.pins / totals.games, 1) : null,
                weekGames: row.weekGames,
                weekPins: row.weekPins,
                weekAverage: row.weekAverage,
                weekSeries: row.weekSeries,
                weekScores: (row.games ?? []).map(game => game.score),
                handicap: row.handicap,
                highGame: totals.highGame,
                highSeries: totals.highSeries,
            });
            players.set(playerKey, current);
        }
    }

    return [...players.values()]
        .map(player => ({...player, sourcePlayerIds: [...player.sourcePlayerIds].sort((a, b) => a - b)}))
        .sort((a, b) => a.name.localeCompare(b.name) || a.sourcePlayerId - b.sourcePlayerId);
}

export function buildLeagueWeekHistory(snapshots) {
    const ordered = [...snapshots].sort((a, b) => a.reporting.date.localeCompare(b.reporting.date) || a.reporting.week - b.reporting.week);
    const ambiguousNames = new Set();

    for (const snapshot of ordered) {
        const idsByName = new Map();
        for (const row of snapshot.bowlers) {
            if (!row.sourcePlayerId || !row.normalizedName) continue;
            const ids = idsByName.get(row.normalizedName) ?? new Set();
            ids.add(row.sourcePlayerId);
            idsByName.set(row.normalizedName, ids);
        }
        for (const [name, ids] of idsByName) if (ids.size > 1) ambiguousNames.add(name);
    }

    return ordered.map(snapshot => ({
        season: snapshot.reporting.label,
        seasonKey: seasonKey(snapshot.reporting),
        week: snapshot.reporting.week,
        date: snapshot.reporting.date,
        bowlers: snapshot.bowlers
            .filter(row => row.sourcePlayerId && row.normalizedName)
            .map(row => ({
                playerKey: ambiguousNames.has(row.normalizedName)
                    ? row.normalizedName + ":" + row.sourcePlayerId
                    : row.normalizedName,
                weekGames: row.weekGames,
                weekPins: row.weekPins,
                weekSeries: row.weekSeries,
                weekScores: (row.games ?? []).map(game => game.score),
                handicap: row.handicap,
            })),
    }));
}

export function compactLeagueWeekHistory(weeks) {
    const players = [...new Set(weeks.flatMap(week => week.bowlers.map(bowler => bowler.playerKey)))].sort();
    const playerIndex = new Map(players.map((playerKey, index) => [playerKey, index]));
    return {
        players,
        weeks: weeks.map(week => [
            week.date,
            week.week,
            week.bowlers.map(bowler => [
                playerIndex.get(bowler.playerKey),
                bowler.weekGames,
                bowler.weekPins,
                bowler.weekSeries,
                bowler.handicap,
                ...bowler.weekScores,
            ]),
        ]),
    };
}

export async function backfillLeagueSecretaryHistory() {
    console.log(`Loading reporting periods from ${RECAP_SHEETS_URL}`);
    const baseHtml = await readLimitedText(await request(RECAP_SHEETS_URL), 3 * MiB);
    const periods = extractSelectOptions(baseHtml, "leaguePngViewer-recaps-period").map(parseReportingPeriod).filter(Boolean);
    if (!periods.length) throw new Error("No LeagueSecretary reporting periods were found.");

    const snapshots = [], skipped = [];
    for (const [index, period] of periods.entries()) {
        console.log("[" + (index + 1) + "/" + periods.length + "] " + period.label + " week " + period.week);
        const {snapshot, reason} = await fetchWeekSnapshot(period);
        if (!snapshot) {
            skipped.push({...period, reason});
            continue;
        }
        snapshots.push(snapshot);
        const output = resolve(OUTPUT_DIR, snapshotPath(period));
        mkdirSync(dirname(output), {recursive: true});
        writeFileSync(output, JSON.stringify(snapshot, null, 2) + "\n");
        await sleep(60);
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
        source: {provider: "LeagueSecretary", leagueId: LEAGUE_ID, url: RECAP_SHEETS_URL, endpoint: INTERACTIVE_RECAPS_URL},
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
    const players = buildPlayerHistory(snapshots);
    const playerDirectory = resolve(OUTPUT_DIR, "players");
    rmSync(playerDirectory, {recursive: true, force: true});
    mkdirSync(playerDirectory, {recursive: true});
    for (const player of players) {
        writeFileSync(resolve(playerDirectory, `${player.sourcePlayerId}.json`), `${JSON.stringify(player)}\n`);
    }
    const historyIndex = {
        generatedAt: index.generatedAt,
        source: index.source,
        qualifyingTeam: QUALIFYING_TEAM,
        seasons,
        importedWeeks: snapshots.length,
        players: players.map(player => ({
            sourcePlayerId: player.sourcePlayerId,
            sourcePlayerIds: player.sourcePlayerIds,
            name: player.name,
            sourceName: player.sourceName,
            normalizedName: player.normalizedName,
            teamNames: [...new Set(player.history.map(point => point.teamName).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
        })),
    };
    writeFileSync(resolve(OUTPUT_DIR, "player-history-index.json"), `${JSON.stringify(historyIndex)}\n`);
    const compactLeagueHistory = compactLeagueWeekHistory(buildLeagueWeekHistory(snapshots));
    const leagueWeekHistory = {
        version: 2,
        generatedAt: index.generatedAt,
        qualifyingTeam: QUALIFYING_TEAM,
        players: compactLeagueHistory.players,
        weeks: compactLeagueHistory.weeks,
    };
    writeFileSync(resolve(OUTPUT_DIR, "league-week-history.json"), `${JSON.stringify(leagueWeekHistory)}\n`);
    rmSync(resolve(OUTPUT_DIR, "player-history.json"), {force: true});
    console.log(`Imported ${snapshots.length} of ${periods.length} reporting weeks across ${seasons.length} qualifying seasons for ${players.length} bowlers.`);
    return {index, historyIndex, players, leagueWeekHistory};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    backfillLeagueSecretaryHistory().catch(error => {
        console.error(error instanceof Error ? error.stack : error);
        process.exitCode = 1;
    });
}
