import {aggregateSlices} from "../../../data/player/slice-stats";
/*
 * Player leaderboard — rank by any stat on a per-game basis © 2026
 */

import {type FC, useCallback, useMemo, useState} from "react";
import {Form} from "react-bootstrap";
import {LeaderboardPodium} from "./leaderboard-podium";

import {
    buildFullPlayerList,
    PLAYER_INDEX_CACHE_CATEGORY,
    type PlayerAppearanceSlice,
    type PlayerListEntry,
    type PlayerListSeasonSlice,
} from "../../../data/player/player-aggregate";
import {useCachedFetcher} from "../cache/data-loader";
import Loader from "../loader";
import ErrorDisplay from "../error-display";

const numberFormat = Intl.NumberFormat("en-US", {style: "decimal", maximumFractionDigits: 2});
const pctFormat = Intl.NumberFormat("en-US", {style: "decimal", maximumFractionDigits: 1});

type Scope = "career" | "current" | "last-year";
type Kind = "avg" | "pct" | "ratio" | "perGame" | "perSeries";

interface StatDef {
    id: string;
    label: string;
    kind: Kind;
}

const STATS: StatDef[] = [
    {id: "average", label: "Average", kind: "avg"},
    {id: "firstBall", label: "First-ball average", kind: "avg"},
    {id: "singlePinPickup", label: "Single-pin average", kind: "avg"},
    {id: "strikePct", label: "Strike %", kind: "pct"},
    {id: "sparePct", label: "Spare %", kind: "pct"},
    {id: "singlePinPct", label: "Single-pin spare %", kind: "pct"},
    {id: "openPct", label: "Open %", kind: "pct"},
    {id: "splitPct", label: "Split conversion %", kind: "pct"},
    {id: "strikeToSparePct", label: "Strike : spare", kind: "ratio"},
    {id: "games200", label: "200+ games / game", kind: "perGame"},
    {id: "games300", label: "300 games / game", kind: "perGame"},
    {id: "cleanGames", label: "Clean games / game", kind: "perGame"},
    {id: "hungCount", label: "Got hung / game", kind: "perGame"},
    {id: "turkeyCount", label: "Turkeys / game", kind: "perGame"},
    {id: "series600", label: "600+ series / series", kind: "perSeries"},
    {id: "series800", label: "800+ series / series", kind: "perSeries"},
    {id: "pinfall", label: "Pinfall / game", kind: "perGame"},
];

const LOWER_IS_BETTER = new Set(["openPct", "hungCount"]);

interface Row {
    id: string;
    name: string;
    games: number;
    seriesCount: number;
    values: Record<string, number | null>;
}

function resolveCurrentSeason(entries: PlayerListEntry[]): string {
    let best = "";
    for (const e of entries) {
        for (const s of e.seasonSlices ?? []) {
            if (s.season.localeCompare(best) > 0) best = s.season;
        }
    }
    return best;
}

function mergeSlices(slices: (PlayerListSeasonSlice | PlayerAppearanceSlice)[]): Omit<Row, "id" | "name"> {
    const values = aggregateSlices(slices);
    return {games: values.games, seriesCount: values.seriesCount, values};
}

function careerRow(e: PlayerListEntry): Omit<Row, "id" | "name"> {
    const slices = e.seasonSlices ?? [];
    if (slices.length > 0) return mergeSlices(slices);
    return {
        games: e.games,
        seriesCount: 0,
        values: {
            average: e.average,
            pinfall: e.pinfall,
            games200: e.games200,
        },
    };
}

function seasonMatches(season: string, scope: Scope, current: string, lastYear: string): boolean {
    if (scope === "career") return true;
    if (scope === "current") return season === current;
    return season === lastYear;
}

function shortTeamName(a: {teamName?: string; teamId?: string; leagueName?: string}): string {
    const raw = (a.teamName || a.teamId || "").trim();
    if (!raw) return "";
    const dash = raw.split(/\s+[\u2014\u2013-]\s+/);
    if (dash.length >= 2 && /league/i.test(dash[0])) return dash.slice(1).join(" \u2014 ").trim();
    if (a.leagueName && raw.startsWith(a.leagueName)) {
        return raw.slice(a.leagueName.length).replace(/^[\s\u2014\u2013-]+/, "").trim() || raw;
    }
    return raw;
}

function filteredAppearances(
    entry: PlayerListEntry,
    scope: Scope,
    current: string,
    lastYear: string,
    leagueId: string,
    teamName: string,
): PlayerAppearanceSlice[] {
    return (scope === "last-year" ? entry.appearanceSlices.flatMap(a => a.calendarSlices ?? []) : entry.appearanceSlices).filter((a) => {
        if (!seasonMatches(a.season, scope, current, lastYear)) return false;
        if (leagueId && a.leagueId !== leagueId) return false;
        if (teamName && shortTeamName(a) !== teamName) return false;
        return true;
    });
}

function toRows(
    entries: PlayerListEntry[],
    scope: Scope,
    leagueId: string,
    teamName: string,
): Row[] {
    const current = resolveCurrentSeason(entries);
    const lastYear = String(new Date().getFullYear() - 1);
    const rows: Row[] = [];
    const useApps = Boolean(leagueId || teamName);
    for (const e of entries) {
        let stats: Omit<Row, "id" | "name">;
        if (useApps) {
            stats = mergeSlices(filteredAppearances(e, scope, current, lastYear, leagueId, teamName));
        } else if (scope === "career") {
            stats = careerRow(e);
        } else if (scope === "current") {
            stats = mergeSlices((e.seasonSlices ?? []).filter((s) => s.season === current));
        } else {
            stats = mergeSlices(e.calendarSlices.filter((s) => s.season === lastYear));
        }
        if (stats.games <= 0) continue;
        rows.push({id: e.id, name: e.name, ...stats});
    }
    return rows;
}

function statValue(row: Row, def: StatDef): number | null {
    const raw = row.values[def.id];
    if (raw == null) return null;
    if (def.kind === "perGame") return row.games > 0 ? raw / row.games : null;
    if (def.kind === "perSeries") return row.seriesCount > 0 ? raw / row.seriesCount : null;
    return raw;
}

function formatValue(v: number | null, def: StatDef): string {
    if (v == null || Number.isNaN(v)) return "\u2014";
    if (def.kind === "pct") return `${pctFormat.format(v)}%`;
    if (def.kind === "ratio") return `${numberFormat.format(v)} : 1`;
    return numberFormat.format(v);
}

const PlayerLeaderboard: FC = () => {
    const fetcher = useCallback(() => buildFullPlayerList(), []);
    const {data, isLoading, error} = useCachedFetcher<PlayerListEntry[]>(fetcher, PLAYER_INDEX_CACHE_CATEGORY);
    const [scope, setScope] = useState<Scope>("career");
    const [statId, setStatId] = useState("average");
    const [minGames, setMinGames] = useState(9);
    const [leagueId, setLeagueId] = useState("");
    const [teamName, setTeamName] = useState("");

    const def = STATS.find((s) => s.id === statId) ?? STATS[0];
    const currentSeason = useMemo(() => (data ? resolveCurrentSeason(data) : ""), [data]);
    const lastYear = String(new Date().getFullYear() - 1);

    const leagues = useMemo(() => {
        if (!data) return [] as {id: string; name: string}[];
        const map = new Map<string, string>();
        for (const p of data) {
            for (const a of p.appearanceSlices ?? []) {
                if (!a.leagueId) continue;
                if (!seasonMatches(a.season, scope, currentSeason, lastYear)) continue;
                if (!map.has(a.leagueId)) map.set(a.leagueId, a.leagueName || a.leagueId);
            }
        }
        return [...map.entries()].map(([id, name]) => ({id, name})).sort((a, b) => a.name.localeCompare(b.name));
    }, [data, scope, currentSeason, lastYear]);

    const teams = useMemo(() => {
        if (!data) return [] as string[];
        const set = new Set<string>();
        for (const p of data) {
            for (const a of p.appearanceSlices ?? []) {
                const name = shortTeamName(a);
                if (!name) continue;
                if (!seasonMatches(a.season, scope, currentSeason, lastYear)) continue;
                if (leagueId && a.leagueId !== leagueId) continue;
                set.add(name);
            }
        }
        return [...set].sort((a, b) => a.localeCompare(b));
    }, [data, scope, currentSeason, lastYear, leagueId]);

    const lowerIsBetter = LOWER_IS_BETTER.has(def.id);
    const entries = useMemo(() => toRows(data ?? [], scope, leagueId, teamName)
        .filter(row => row.games >= minGames)
        .flatMap(row => {
            const value = statValue(row, def);
            return value != null && Number.isFinite(value) ? [{id: row.id, name: row.name, games: row.games, value}] : [];
        })
        .sort((a, b) => (lowerIsBetter ? a.value - b.value : b.value - a.value) || a.name.localeCompare(b.name)),
    [data, scope, leagueId, teamName, minGames, def, lowerIsBetter]);

    if (isLoading) return <Loader />;
    if (error != null) return <ErrorDisplay message="Error loading players." error={error} />;

    const scopeLabel = scope === "career" ? "Career" : scope === "current" ? currentSeason || "Current season" : lastYear;
    const filters = <>
        <div className="bls-scope-pills mb-3" role="group" aria-label="Ranking period">
            {([
                ["career", "Career", "All seasons"],
                ["current", "Current season", currentSeason || "Latest"],
                ["last-year", "Last calendar year", lastYear],
            ] as const).map(([id, label, sub]) => (
                <button key={id} type="button" aria-pressed={scope === id}
                    className={"bls-scope-pill" + (scope === id ? " is-active" : "")}
                    onClick={() => { setScope(id); setLeagueId(""); setTeamName(""); }}>
                    <span className="bls-scope-pill-label">{label}</span>
                    <span className="bls-scope-pill-sub">{sub}</span>
                </button>
            ))}
        </div>
        <div className="bls-podium-filter-grid">
            <Form.Group controlId="frame-leaderboard-stat">
                <Form.Label>Stat</Form.Label>
                <Form.Select value={statId} onChange={event => { setStatId(event.target.value); }}>
                    {STATS.map(stat => <option key={stat.id} value={stat.id}>{stat.label}</option>)}
                </Form.Select>
            </Form.Group>
            <Form.Group controlId="frame-leaderboard-games">
                <Form.Label>Minimum games</Form.Label>
                <Form.Select value={minGames} onChange={event => { setMinGames(Number(event.target.value)); }}>
                    {[1, 6, 9, 12, 21, 36].map(n => <option key={n} value={n}>{n}+</option>)}
                </Form.Select>
            </Form.Group>
            <Form.Group controlId="frame-leaderboard-league">
                <Form.Label>League</Form.Label>
                <Form.Select value={leagueId} onChange={event => { setLeagueId(event.target.value); setTeamName(""); }}>
                    <option value="">All leagues</option>
                    {leagues.map(league => <option key={league.id} value={league.id}>{league.name}</option>)}
                </Form.Select>
            </Form.Group>
            <Form.Group controlId="frame-leaderboard-team">
                <Form.Label>Team</Form.Label>
                <Form.Select value={teamName} onChange={event => { setTeamName(event.target.value); }}>
                    <option value="">All teams</option>
                    {teams.map(team => <option key={team} value={team}>{team}</option>)}
                </Form.Select>
            </Form.Group>
        </div>
    </>;

    return <LeaderboardPodium entries={entries} metric={def.label} scope={"BinBin Data · " + scopeLabel}
        filters={filters} lowerIsBetter={lowerIsBetter} formatValue={value => formatValue(value, def)} />;
};

export default PlayerLeaderboard;
