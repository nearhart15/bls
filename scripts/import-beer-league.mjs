import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const LEAGUES_URL = "https://arapahoebowl.com/league-options/";
const AJAX_URL = new URL("/wp-admin/admin-ajax.php", LEAGUES_URL).href;
const USER_AGENT = "BLS Beer League importer (+https://github.com/nearhart15/bls)";
const OUTPUT = process.env.BEER_LEAGUE_OUTPUT || "public/data/beer-league.json";

function decodeHtml(value) {
  return value.replaceAll("&amp;", "&").replaceAll("&quot;", "\"").replaceAll("&#039;", "'").replaceAll("&apos;", "'").replaceAll("&lt;", "<").replaceAll("&gt;", ">");
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    redirect: "follow",
    ...options,
    headers: {
      "user-agent": USER_AGENT,
      accept: "text/html,application/json,application/pdf,*/*;q=0.8",
      ...(options.headers || {}),
    },
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} fetching ${url}`);
  return response;
}

function publicActions(html) {
  return [...new Set([...html.matchAll(/publicRequest\(\s*["']([^"']+)["']\s*\)/g)].map((match) => match[1]))];
}

async function publicData(action) {
  const response = await request(AJAX_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
    body: new URLSearchParams({ action }).toString(),
  });
  const json = await response.json();
  if (!json?.success) throw new Error(`Public AJAX action ${action} failed.`);
  return json.data;
}

function objects(value, output = []) {
  if (!value || typeof value !== "object") return output;
  if (!Array.isArray(value)) output.push(value);
  for (const child of Object.values(value)) objects(child, output);
  return output;
}

function beerScore(item) {
  const title = String(item.title ?? item.name ?? item.league_name ?? "");
  const day = String(item.day ?? item.weekday ?? item.bowling_day ?? "");
  const time = String(item.time ?? item.start_time ?? item.bowling_time ?? "");
  const season = String(item.season_label ?? item.season ?? item.season_name ?? "");
  let score = 0;
  if (/^beer$/i.test(title.trim())) score += 20;
  else if (/\bbeer\b/i.test(title)) score += 8;
  if (/thursday/i.test(day)) score += 6;
  if (/8\s*:\s*00\s*pm/i.test(time)) score += 6;
  if (/2026\s*[–-]\s*27/i.test(season)) score += 3;
  return score;
}

function findBeerLeague(dataSets) {
  const candidates = dataSets
    .flatMap(({ action, data }) => objects(data).map((item) => ({ action, item, score: beerScore(item) })))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score);
  if (!candidates.length || candidates[0].score < 20) throw new Error("Public league data did not contain the Beer league.");
  return candidates[0];
}

function urlsFromObject(item) {
  return Object.entries(item)
    .filter(([, value]) => typeof value === "string" && /^https?:\/\//i.test(value))
    .map(([key, value]) => ({ key, url: decodeHtml(value) }));
}

function chooseLeaguePage(item) {
  const urls = urlsFromObject(item);
  return urls.find((entry) => /permalink|page|link|url/i.test(entry.key) && !/pdf|stand|cover/i.test(entry.key))?.url
    ?? urls.find((entry) => !/\.pdf(?:$|[?#])/i.test(entry.url) && !/wp-content\/uploads/i.test(entry.url))?.url
    ?? null;
}

function pdfUrlsFromHtml(html, baseUrl) {
  const patterns = [
    /(?:https?:\\?\/\\?\/)[^"'<>\s\\]+\.pdf(?:[?#][^"'<>\s\\]*)?/gi,
    /\/wp-content\/uploads\/[^"'<>\s\\]+\.pdf(?:[?#][^"'<>\s\\]*)?/gi,
  ];
  const urls = [];
  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const raw = decodeHtml(match[0].replaceAll("\\/", "/"));
      try { urls.push(new URL(raw, baseUrl).href); } catch { /* malformed candidate */ }
    }
  }
  return [...new Set(urls)];
}

function choosePdf(item, leagueHtml, leaguePageUrl) {
  const objectPdf = urlsFromObject(item).filter((entry) => /\.pdf(?:$|[?#])/i.test(entry.url));
  const htmlPdf = pdfUrlsFromHtml(leagueHtml, leaguePageUrl).map((url) => ({ key: "html", url }));
  const candidates = [...objectPdf, ...htmlPdf]
    .map((entry) => {
      let score = 0;
      if (/stand/i.test(entry.key)) score += 8;
      if (/beer/i.test(entry.url)) score += 4;
      if (/stand/i.test(entry.url)) score += 4;
      if (/wk|week/i.test(entry.url)) score += 2;
      return { ...entry, score };
    })
    .filter((entry) => entry.score >= 4)
    .sort((a, b) => b.score - a.score);
  return candidates[0]?.url ?? null;
}

function compactLines(text) {
  return text.split(/\r?\n/).map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean);
}

function points(value) {
  const normalized = String(value).replace("¾", ".75").replace("½", ".5").replace("¼", ".25");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function integer(value) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function scoreValue(value) {
  const match = String(value).match(/(\d+)$/);
  return match ? Number.parseInt(match[1], 10) : null;
}

function parsePlayerRow(line) {
  const tokens = line.split(/\s+/);
  let statsIndex = -1;
  for (let i = 1; i <= tokens.length - 8; i += 1) {
    if (tokens.slice(i, i + 8).every((token) => /^\d+$/.test(token))) {
      statsIndex = i;
      break;
    }
  }
  if (statsIndex < 1) return null;
  const name = tokens.slice(0, statsIndex).join(" ");
  if (!name || /^(Name|High|HDCP)$/i.test(name)) return null;
  const base = tokens.slice(statsIndex, statsIndex + 8).map(integer);
  const tail = tokens.slice(statsIndex + 8);
  const result = {
    name,
    average: base[0], handicap: base[1], pins: base[2], games: base[3],
    highGame: base[4], highSeries: base[5], highHandicapGame: base[6], highHandicapSeries: base[7],
    weekScoresRaw: [], weekScores: [], weekTotal: null, weekHandicapTotal: null,
  };
  if (tail.length >= 5) {
    const scores = tail.slice(0, tail.length - 2);
    result.weekScoresRaw = scores;
    result.weekScores = scores.map(scoreValue);
    result.weekTotal = integer(tail.at(-2));
    result.weekHandicapTotal = integer(tail.at(-1));
  } else if (tail.length === 2) {
    result.weekTotal = integer(tail[0]);
    result.weekHandicapTotal = integer(tail[1]);
  } else if (tail.length > 0) {
    result.weekScoresRaw = tail;
    result.weekScores = tail.map(scoreValue);
  }
  return result;
}

export function parseBlsText(text, source = {}) {
  const lines = compactLines(text);
  const header = lines.find((line) => /\d{2}\/\d{2}\/\d{4}\s+Week\s+\d+\s+of\s+\d+/i.test(line)) ?? "";
  const headerMatch = header.match(/(\d{2}\/\d{2}\/\d{4})\s+Week\s+(\d+)\s+of\s+(\d+)\s+(.+?)\s+Page\s+\d+/i);
  const schedule = lines.find((line) => /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i.test(line)) ?? "";
  const scheduleMatch = schedule.match(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+(\d{1,2}:\d{2}\s*[ap]m)/i);

  const standings = [];
  const standingsStart = lines.findIndex((line) => /^Team Standings/i.test(line));
  const standingsEnd = lines.findIndex((line, index) => index > standingsStart && /^Review of Last Week/i.test(line));
  const standingRow = /^(\d+)\s+(\d+)\s+(.+?)\s+([0-9½¼¾.]+)\s+([0-9½¼¾.]+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)$/;
  let division = null;
  if (standingsStart >= 0) {
    const end = standingsEnd > standingsStart ? standingsEnd : lines.length;
    for (const line of lines.slice(standingsStart + 1, end)) {
      const match = line.match(standingRow);
      if (match) {
        standings.push({
          division, place: integer(match[1]), number: integer(match[2]), name: match[3], won: points(match[4]), lost: points(match[5]),
          average: integer(match[6]), handicap: integer(match[7]), pinsWithHandicap: integer(match[8]), scratchPins: integer(match[9]),
          highHandicapGame: integer(match[10]), highHandicapSeries: integer(match[11]), highScratchGame: integer(match[12]), highScratchSeries: integer(match[13]),
        });
      } else if (!/\d/.test(line) && !/(Points|Place|Team|Standings|Pins|Scratch|HDCP|High)/i.test(line) && line.length <= 80) {
        division = line;
      }
    }
  }

  const teams = [];
  const substitutes = [];
  const rosterStart = lines.findIndex((line) => /^Team Rosters$/i.test(line));
  const subsStart = lines.findIndex((line) => /^Temporary Substitutes$/i.test(line));
  if (rosterStart >= 0) {
    const end = subsStart > rosterStart ? subsStart : lines.length;
    let current = null;
    for (const line of lines.slice(rosterStart + 1, end)) {
      const teamMatch = line.match(/^(\d+)\s+-\s+(.+)$/);
      if (teamMatch) {
        current = { number: integer(teamMatch[1]), name: teamMatch[2], players: [] };
        teams.push(current);
        continue;
      }
      if (!current || /^(High|Name)\b/i.test(line) || /Page \d+ of \d+/i.test(line)) continue;
      const player = parsePlayerRow(line);
      if (player) current.players.push(player);
    }
  }
  if (subsStart >= 0) {
    for (const line of lines.slice(subsStart + 1)) {
      if (/^View Standings on the Web/i.test(line)) break;
      if (/^(High|Name)\b/i.test(line) || /Page \d+ of \d+/i.test(line)) continue;
      const player = parsePlayerRow(line);
      if (player) substitutes.push(player);
    }
  }

  const standingsByNumber = new Map(standings.map((team) => [team.number, team]));
  for (const team of teams) {
    const standing = standingsByNumber.get(team.number);
    if (standing) Object.assign(team, { division: standing.division, place: standing.place, won: standing.won, lost: standing.lost, average: standing.average, handicap: standing.handicap });
  }

  return {
    status: "ready",
    generatedAt: new Date().toISOString(),
    source: { directoryUrl: source.directoryUrl ?? LEAGUES_URL, leaguePageUrl: source.leaguePageUrl ?? null, pdfUrl: source.pdfUrl ?? null },
    league: {
      name: headerMatch?.[4]?.trim() || "Beer", date: headerMatch?.[1] ?? null, week: headerMatch ? integer(headerMatch[2]) : null,
      totalWeeks: headerMatch ? integer(headerMatch[3]) : null, day: scheduleMatch?.[1] ?? "Thursday", time: scheduleMatch?.[2] ?? null, season: source.season ?? null,
    },
    standings, teams, substitutes,
  };
}

export async function importBeerLeague() {
  console.log(`Loading ${LEAGUES_URL}`);
  const directoryHtml = await (await request(LEAGUES_URL)).text();
  const actions = publicActions(directoryHtml);
  if (!actions.length) throw new Error("Could not discover the public league AJAX actions.");

  const dataSets = [];
  for (const action of actions) dataSets.push({ action, data: await publicData(action) });
  const league = findBeerLeague(dataSets);
  const leaguePageUrl = chooseLeaguePage(league.item);
  if (!leaguePageUrl) throw new Error("Beer league data did not include a View League URL.");

  console.log(`Following Beer View League target: ${leaguePageUrl}`);
  const leagueHtml = await (await request(leaguePageUrl)).text();
  const pdfUrl = choosePdf(league.item, leagueHtml, leaguePageUrl);
  if (!pdfUrl) throw new Error("Beer league page did not expose a standings PDF URL.");

  console.log(`Downloading standings PDF: ${pdfUrl}`);
  const bytes = Buffer.from(await (await request(pdfUrl)).arrayBuffer());
  if (bytes.length < 5 || bytes.subarray(0, 5).toString("ascii") !== "%PDF-") throw new Error("Standings URL did not return a PDF.");

  const workDir = join(tmpdir(), `bls-beer-${process.pid}`);
  mkdirSync(workDir, { recursive: true });
  const pdfPath = join(workDir, "standings.pdf");
  const textPath = join(workDir, "standings.txt");
  writeFileSync(pdfPath, bytes);
  try {
    execFileSync("pdftotext", ["-layout", "-nopgbrk", pdfPath, textPath], { stdio: "inherit" });
    const parsed = parseBlsText(readFileSync(textPath, "utf8"), { directoryUrl: LEAGUES_URL, leaguePageUrl, pdfUrl, season: league.item.season_label ?? null });
    if (!parsed.standings.length || !parsed.teams.length) throw new Error(`PDF parsed incompletely: ${parsed.standings.length} standings rows, ${parsed.teams.length} teams.`);
    if (!/^Thursday$/i.test(parsed.league.day ?? "") || !/^0?8:00\s*pm$/i.test(parsed.league.time ?? "")) {
      throw new Error(`Discovered PDF does not look like Thursday Beer League at 8:00 PM (${parsed.league.day ?? "unknown"} ${parsed.league.time ?? "unknown"}).`);
    }
    mkdirSync(dirname(resolve(OUTPUT)), { recursive: true });
    writeFileSync(OUTPUT, `${JSON.stringify(parsed, null, 2)}\n`);
    console.log(`Wrote ${OUTPUT}: ${parsed.standings.length} standings teams, ${parsed.teams.length} rosters, ${parsed.substitutes.length} substitutes.`);
    return parsed;
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  importBeerLeague().catch((error) => {
    console.error(error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  });
}
