/*
 * Player leaderboard — rank by any stat on a per-game basis © 2026
 */

import {type FC, useCallback, useMemo, useState} from "react";
import {Link} from "react-router";
import {Badge, Card, CardBody, Form, Table} from "react-bootstrap";

import {
    buildFullPlayerList,
    PLAYER_INDEX_CACHE_CATEGORY,
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

function mergeSlices(slices: PlayerListSeasonSlice[]): Omit<Row, "id" | "name"> {
    let games = 0, pinfall = 0, seriesCount = 0;
    let games200 = 0, games300 = 0, series600 = 0, series800 = 0;
    let cleanGames = 0, hungCount = 0, turkeyCount = 0;
    let weighted = 0, firstW = 0, firstG = 0;
    let strikeW = 0, spareW = 0, singleW = 0, openW = 0, splitW = 0, s2sW = 0, pickupW = 0, pctG = 0;
    for (const s of slices) {
        games += s.games;
        pinfall += s.pinfall;
        seriesCount += s.seriesCount ?? 0;
        games200 += s.games200 ?? 0;
        games300 += s.games300 ?? 0;
        series600 += s.series600 ?? 0;
        series800 += s.series800 ?? 0;
        cleanGames += s.cleanGames ?? 0;
        hungCount += s.hungCount ?? 0;
        turkeyCount += s.turkeyCount ?? 0;
        if (s.average != null && s.games > 0) weighted += s.average * s.games;
        if (s.firstBall != null && s.games > 0) { firstW += s.firstBall * s.games; firstG += s.games; }
        if (s.games > 0) {
            pctG += s.games;
            if (s.strikePct != null) strikeW += s.strikePct * s.games;
            if (s.sparePct != null) spareW += s.sparePct * s.games;
            if (s.singlePinPct != null) singleW += s.singlePinPct * s.games;
            if (s.openPct != null) openW += s.openPct * s.games;
            if (s.splitPct != null) splitW += s.splitPct * s.games;
            if (s.strikeToSparePct != null) s2sW += s.strikeToSparePct * s.games;
            if (s.singlePinPickup != null) pickupW += s.singlePinPickup * s.games;
        }
    }
    const wavg = (sum: number) => (pctG > 0 && sum > 0 ? sum / pctG : null);
    return {
        games,
        seriesCount,
        values: {
            average: games > 0 ? weighted / games : null,
            firstBall: firstG > 0 ? firstW / firstG : null,
            singlePinPickup: wavg(pickupW),
            strikePct: wavg(strikeW),
            sparePct: wavg(spareW),
            singlePinPct: wavg(singleW),
            openPct: wavg(openW),
            splitPct: wavg(splitW),
            strikeToSparePct: wavg(s2sW),
            games200,
            games300,
            series600,
            series800,
            cleanGames,
            hungCount,
            turkeyCount,
            pinfall,
        },
    };
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

function toRows(entries: PlayerListEntry[], scope: Scope): Row[] {
    const current = resolveCurrentSeason(entries);
    const lastYear = String(new Date().getFullYear() - 1);
    const rows: Row[] = [];
    for (const e of entries) {
        let stats: Omit<Row, "id" | "name">;
        if (scope === "career") stats = careerRow(e);
        else if (scope === "current") stats = mergeSlices((e.seasonSlices ?? []).filter((s) => s.season === current));
        else stats = mergeSlices((e.seasonSlices ?? []).filter((s) => s.season.includes(lastYear)));
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
    if (v == null || Number.isNaN(v)) return "—";
    if (def.kind === "pct") return `${pctFormat.format(v)}%`;
    if (def.kind === "ratio") return `${numberFormat.format(v)} : 1`;
    return numberFormat.format(v);
}

const PlayerLeaderboard: FC = () => {
    const fetcher = useCallback(buildFullPlayerList, []);
    const {data, isLoading, error} = useCachedFetcher<PlayerListEntry[]>(fetcher, PLAYER_INDEX_CACHE_CATEGORY);
    const [scope, setScope] = useState<Scope>("career");
    const [statId, setStatId] = useState("average");
    const [minGames, setMinGames] = useState(9);

    const def = STATS.find((s) => s.id === statId) ?? STATS[0];
    const currentSeason = useMemo(() => (data ? resolveCurrentSeason(data) : ""), [data]);
    const ranked = useMemo(() => {
        if (!data) return [] as {row: Row; value: number | null}[];
        const lower = LOWER_IS_BETTER.has(def.id);
        return toRows(data, scope)
            .filter((r) => r.games >= minGames)
            .map((row) => ({row, value: statValue(row, def)}))
            .filter((r) => r.value != null)
            .sort((a, b) => {
                const av = a.value ?? 0;
                const bv = b.value ?? 0;
                const cmp = lower ? av - bv : bv - av;
                if (cmp !== 0) return cmp;
                return a.row.name.localeCompare(b.row.name);
            });
    }, [data, scope, def, minGames]);

    const max = ranked[0]?.value ?? 0;
    const min = ranked[ranked.length - 1]?.value ?? 0;
    const span = Math.max(0.0001, Math.abs(max - min));

    return (
        <div className="bls-compare">
            <div className="bls-compare-hero mb-3">
                <span className="bls-hero-kicker">Players</span>
                <h1>Leaderboard</h1>
            </div>
            <Card className="bls-profile-card mb-3">
                <CardBody>
                    <div className="bls-scope-pills mb-3">
                        {([
                            ["career", "Career", "All seasons"],
                            ["current", "Current season", currentSeason || "Latest"],
                            ["last-year", "Last calendar year", String(new Date().getFullYear() - 1)],
                        ] as [Scope, string, string][]).map(([id, label, sub]) => (
                            <button key={id} type="button" className={`bls-scope-pill${scope === id ? " is-active" : ""}`} onClick={() => setScope(id)}>
                                <span className="bls-scope-pill-label">{label}</span>
                                <span className="bls-scope-pill-sub">{sub}</span>
                            </button>
                        ))}
                    </div>
                    <div className="row g-3">
                        <div className="col-md-8">
                            <Form.Label className="bls-meta-label">Stat</Form.Label>
                            <Form.Select value={statId} onChange={(e) => setStatId(e.target.value)}>
                                {STATS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                            </Form.Select>
                        </div>
                        <div className="col-md-4">
                            <Form.Label className="bls-meta-label">Min games</Form.Label>
                            <Form.Select value={minGames} onChange={(e) => setMinGames(Number(e.target.value))}>
                                {[1, 6, 9, 12, 21, 36].map((n) => <option key={n} value={n}>{n}+</option>)}
                            </Form.Select>
                        </div>
                    </div>
                    <div className="text-body-secondary small mt-2">
                        Count stats are shown per game (or per series). Rates stay as percentages.
                    </div>
                </CardBody>
            </Card>
            {isLoading && <Loader />}
            {error != null && <ErrorDisplay message="Error loading players." error={error} />}
            {data && (
                <Card className="bls-profile-card">
                    <CardBody className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                        <strong>{def.label}</strong>
                        <Badge bg="secondary" pill>{ranked.length} bowlers</Badge>
                    </CardBody>
                    <div className="bls-perf-scroll bls-perf-table-wrap d-none d-sm-block">
                        <Table className="bls-perf-table mb-0" size="sm" hover>
                            <thead>
                                <tr>
                                    <th style={{width: "3rem"}} className="text-center">#</th>
                                    <th>Bowler</th>
                                    <th className="text-end">{def.label}</th>
                                    <th className="text-end d-none d-md-table-cell">Games</th>
                                    <th className="d-none d-md-table-cell" style={{width: "40%"}}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {ranked.length === 0 && (
                                    <tr><td colSpan={5} className="text-center text-body-secondary py-4">No bowlers meet the filter.</td></tr>
                                )}
                                {ranked.map((r, idx) => {
                                    const fill = r.value == null ? 0 : (LOWER_IS_BETTER.has(def.id)
                                        ? ((max - r.value) / span) * 100
                                        : ((r.value - min) / span) * 100);
                                    return (
                                        <tr key={r.row.id}>
                                            <td className="text-center fw-semibold">{idx + 1}</td>
                                            <td><Link to={`/player/${r.row.id}`} className="bls-link fw-semibold">{r.row.name}</Link></td>
                                            <td className="text-end tabular-nums fw-semibold">{formatValue(r.value, def)}</td>
                                            <td className="text-end d-none d-md-table-cell tabular-nums">{r.row.games}</td>
                                            <td className="d-none d-md-table-cell">
                                                <div className="bls-fifa-track" style={{height: "8px"}}>
                                                    <div className="bls-fifa-fill" style={{width: `${Math.max(4, fill)}%`, background: idx === 0 ? "#ffd60a" : idx === 1 ? "#c7c7cc" : idx === 2 ? "#c47b3a" : "var(--bls-accent, #00d4ff)"}} />
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </Table>
                    </div>
                    <div className="bls-player-cards">
                        {ranked.map((r, idx) => (
                            <div className="bls-player-card" key={`lb-${r.row.id}`}>
                                <div className="bls-player-card-top">
                                    <div>
                                        <div className="bls-player-card-meta">#{idx + 1}</div>
                                        <Link to={`/player/${r.row.id}`} className="bls-link bls-player-card-name">{r.row.name}</Link>
                                    </div>
                                    <strong className="tabular-nums">{formatValue(r.value, def)}</strong>
                                </div>
                                <div className="bls-player-card-grid">
                                    <div className="bls-player-card-stat"><strong>{r.row.games}</strong><span>Games</span></div>
                                    <div className="bls-player-card-stat"><strong>{def.label}</strong><span>Ranked stat</span></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    );
};

export default PlayerLeaderboard;
