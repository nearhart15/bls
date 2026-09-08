import {mergeStats} from "../../../data/player/merge-stats";
/*
 * Handicap guide - expected stats vs an optional bowler
 */

import {type FC, type ReactNode, useCallback, useEffect, useMemo, useState} from "react";
import {Card, CardBody, Form} from "react-bootstrap";

import {
    aggregatePlayerData,
    buildFullPlayerList,
    PLAYER_DETAIL_CACHE_CATEGORY,
    PLAYER_INDEX_CACHE_CATEGORY,
    type AggregatedPlayerData,
    type PlayerListEntry,
    type PlayerSliceStats,
} from "../../../data/player/player-aggregate";
import {PlayerStats} from "../../../data/player/player-stats";
import {
    actualHandicapStats,
    handicapForAverage,
    MAX_HANDICAP,
    normalizeHandicap,
    predictHandicapStats,
    type StatKey,
} from "../../../data/player/handicap-guide-math";
import {comparePinnedThen} from "../../../data/player/player-pin";
import {useCachedFetcher} from "../cache/data-loader";

type HdcpScope = "career" | "last-league" | "last-year";

function round2(n: number): number {
    return Math.round(n * 100) / 100;
}

const LOWER_BETTER = new Set<StatKey>([
    "open", "split", "hung", "sd",
    "frames50", "balls50", "frames100", "balls100",
    "frames150", "balls150", "frames200", "balls200", "ballsGame",
]);

const NO_PCT_DIFF = new Set<StatKey>(["avg", "hdcp"]);


function currentBowlingTerm(now = new Date()): {year: number; label: string; keys: string[]} {
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    if (month >= 6 && month <= 8) return {year, label: `Summer ${year}`, keys: ["summer"]};
    if (month >= 9 && month <= 11) return {year, label: `Fall ${year}`, keys: ["fall", "autumn"]};
    if (month >= 3 && month <= 5) return {year, label: `Spring ${year}`, keys: ["spring"]};
    return {year, label: `Winter ${year}`, keys: ["winter"]};
}







function matchAppearance(detail: AggregatedPlayerData, slice: PlayerSliceStats) {
    return detail.appearances.find((a) => a.season === slice.season && a.leagueId === slice.leagueId && a.teamId === slice.teamId);
}

function pickCurrentSeasonStats(detail: AggregatedPlayerData): {stats: PlayerStats; season: string} | null {
    const seasons = [...new Set(detail.appearanceSlicesFull.map((s) => s.season).filter((s): s is string => Boolean(s)))].sort((a, b) => b.localeCompare(a, undefined, {numeric: true}));
    const season = seasons[0];
    if (!season) return null;
    const stats = mergeStats(detail.appearanceSlicesFull.filter((s) => s.season === season).map((s) => s.stats));
    return stats.gameStats.count > 0 ? {stats, season} : null;
}

function pickCurrentLeagueSlice(detail: AggregatedPlayerData): PlayerSliceStats | null {
    return [...detail.appearanceSlicesFull].filter(s => s.stats.gameStats.count > 0).sort((a,b) => (b.lastBowled ?? 0) - (a.lastBowled ?? 0))[0] ?? null;
}



interface ScopedPick {
    stats: PlayerStats;
    label: string;
    leagueHdcp: number | null;
    leagueAvg: number | null;
}

function extrasFromAppearance(detail: AggregatedPlayerData, slice: PlayerSliceStats): {leagueHdcp: number | null; leagueAvg: number | null} {
    const ap = matchAppearance(detail, slice);
    const st = ap?.stats;
    const leagueHdcp = st && st.leagueGames > 0 ? st.leagueHandicap : null;
    const leagueAvg = st && st.leagueGames > 0 ? st.leagueAverage : null;
    return {leagueHdcp, leagueAvg};
}

function pickScopedStats(detail: AggregatedPlayerData | null, scope: HdcpScope): ScopedPick | null {
    if (!detail?.careerStats || detail.player?.id === "") return null;
    if (scope === "career") {
        return {stats: detail.careerStats, label: "career", leagueHdcp: null, leagueAvg: null};
    }
    if (scope === "current-season") {
        const current = pickCurrentSeasonStats(detail);
        return current ? {stats: current.stats, label: current.season, leagueHdcp: null, leagueAvg: null} : null;
    }
    if (scope === "last-league") {
        const slice = pickCurrentLeagueSlice(detail);
        if (!slice) return null;
        const term = currentBowlingTerm();
        const label = slice.leagueName?.match(/summer|fall|autumn|winter|spring/i)
            ? slice.leagueName
            : [slice.leagueName || term.label, slice.season].filter(Boolean).join(" ");
        return {stats: slice.stats, label, ...extrasFromAppearance(detail, slice)};
    }
    const year = new Date().getFullYear() - 1;
    const stats = mergeStats(detail.appearanceSlicesFull.map(s => s.calendarStats?.[String(year)] ?? new PlayerStats()));
    return stats.gameStats.count > 0 ? {stats, label: String(year), leagueHdcp: null, leagueAvg: null} : null;
}

function diffPct(actual: number | undefined, expected: number | undefined): number | null {
    if (actual == null || !expected) return null;
    return round2(((actual - expected) / Math.abs(expected)) * 100);
}

type ValueKind = "num" | "pct" | "whole" | "ratio";

function formatVal(n: number | undefined, kind: ValueKind): string {
    if (n == null || Number.isNaN(n)) return "--";
    if (kind === "whole") return String(Math.round(n));
    if (kind === "ratio") return `${round2(n).toFixed(2)} : 1`;
    const value = round2(n).toFixed(2);
    return kind === "pct" ? `${value}%` : value;
}

const PCT_KEYS = new Set<StatKey>([
    "strike", "spare", "single", "open", "split",
    "clean", "twoHundred", "threeHundred", "sixHundred", "frameCoverage", "splitConversion",
]);

const WHOLE_KEYS = new Set<StatKey>([
    "hdcp", "games", "completeSeries", "frameGames", "lowGame", "highGame", "lowSeries", "highSeries",
]);

const RATIO_KEYS = new Set<StatKey>(["strikeToSpare"]);

function valueKind(statKey: StatKey): ValueKind {
    if (PCT_KEYS.has(statKey)) return "pct";
    if (WHOLE_KEYS.has(statKey)) return "whole";
    if (RATIO_KEYS.has(statKey)) return "ratio";
    return "num";
}

const Tile: FC<{
    label: string;
    statKey: StatKey;
    expected?: number;
    actual?: number;
    showActual: boolean;
    compareActual?: boolean;
}> = ({label, statKey, expected, actual, showActual, compareActual = true}) => {
    const kind = valueKind(statKey);
    const skipDiff = NO_PCT_DIFF.has(statKey);
    const displayActual = compareActual ? actual : undefined;
    const diff = showActual && compareActual && !skipDiff ? diffPct(displayActual, expected) : null;
    const lowerBetter = LOWER_BETTER.has(statKey);
    let tone = "";
    if (diff != null) {
        const better = lowerBetter ? diff < -1 : diff > 1;
        const worse = lowerBetter ? diff > 1 : diff < -1;
        tone = better ? " is-better" : worse ? " is-worse" : "";
    }
    return (
        <div className={`bls-allstats-cell${showActual ? " bls-hdcp-compare" : ""}`}>
            <div className="bls-allstats-val">{formatVal(expected, kind)}</div>
            <div className="bls-allstats-lbl">{label}</div>
            {showActual && compareActual && (
                <div className="d-flex justify-content-between mt-2 fs-sm" style={{color: tone === " is-better" ? "#30d158" : tone === " is-worse" ? "#ff453a" : undefined}}>
                    <span>{formatVal(displayActual, kind)}</span>
                    <span>{skipDiff ? "rule" : diff == null ? "--" : `${diff > 0 ? "+" : ""}${diff.toFixed(2)}%`}</span>
                </div>
            )}
        </div>
    );
};

const ObservedTile: FC<{label: string; statKey: StatKey; value?: number}> = ({label, statKey, value}) => (
    <div className="bls-allstats-cell">
        <div className="bls-allstats-val">{formatVal(value, valueKind(statKey))}</div>
        <div className="bls-allstats-lbl">{label}</div>
    </div>
);

const Group: FC<{title: string; children: ReactNode}> = ({title, children}) => (
    <div className="bls-allstats-group mb-3">
        <div className="bls-allstats-group-head">{title}</div>
        <div className="bls-allstats-grid">{children}</div>
    </div>
);

const emptyPlayer = {id: "", name: "none"} as AggregatedPlayerData["player"];
const lastYearNum = new Date().getFullYear() - 1;
const currentTerm = currentBowlingTerm();

const SCOPE_OPTIONS: {id: HdcpScope; label: string; hint: string}[] = [
    {id: "career", label: "Career", hint: "All seasons"},
    {id: "current-season", label: "Current season", hint: "Latest recorded league season"},
    {id: "last-league", label: "Last league", hint: currentTerm.label},
    {id: "last-year", label: "Last year", hint: String(lastYearNum)},
];

const HandicapGuide: FC = () => {
    const [hdcp, setHdcp] = useState(36);
    const [playerId, setPlayerId] = useState("");
    const [scope, setScope] = useState<HdcpScope>("career");
    const expected = useMemo(() => predictHandicapStats(hdcp), [hdcp]);

    const listFetcher = useCallback(() => buildFullPlayerList(), []);
    const {data: list} = useCachedFetcher<PlayerListEntry[]>(listFetcher, PLAYER_INDEX_CACHE_CATEGORY);
    const players = useMemo(() => {
        const rows = [...(list ?? [])];
        rows.sort((a, b) => comparePinnedThen(a.name, b.name, a.name.localeCompare(b.name)));
        return rows;
    }, [list]);

    const detailFetcher = useCallback(async () => {
        if (!playerId) {
            return {player: emptyPlayer, careerStats: null} as unknown as AggregatedPlayerData;
        }
        return aggregatePlayerData(playerId);
    }, [playerId]);
    const {data: detail, isLoading} = useCachedFetcher<AggregatedPlayerData>(
        detailFetcher,
        PLAYER_DETAIL_CACHE_CATEGORY,
        playerId || "none"
    );

    const scoped = useMemo(() => pickScopedStats(detail ?? null, scope), [detail, scope]);
    const actual = useMemo(() => {
        if (!playerId || !scoped) return null;
        return actualHandicapStats(scoped.stats);
    }, [playerId, scoped]);

    useEffect(() => {
        if (!playerId || !scoped) return;
        if (scoped.stats.gameStats.count > 0) setHdcp(handicapForAverage(scoped.stats.gameStats.average));
    }, [playerId, scope, scoped]);

    const selectedName = players.find((p) => p.id === playerId)?.name;
    const showActual = Boolean(actual);
    const missingScope = Boolean(playerId && !isLoading && !scoped);
    const playerHdcp = actual?.hdcp;
    const playerAvg = actual?.avg;

    const tile = (key: StatKey, label: string, compareActual = true) => (
        <Tile
            key={key}
            statKey={key}
            label={label}
            expected={expected[key]}
            actual={actual?.[key]}
            showActual={showActual}
            compareActual={compareActual}
        />
    );

    const observedTile = (key: StatKey, label: string) => (
        <ObservedTile key={key} statKey={key} label={label} value={actual?.[key]}/>
    );

    return (
        <div className="container-md bls-hdcp-guide">
            <Card className="bls-profile-card mb-3">
                <div className="bls-profile-card-head">Handicap guide</div>
                <CardBody>
                    <p className="text-body-secondary mb-4">
                        House rule: drop the average decimal, take 90% of the difference from 210, then drop the handicap decimal.
                        A 191.80 average therefore posts a 17 handicap.
                    </p>
                    <div className="bls-hdcp-hero mb-3 text-center">
                        <div className="bls-hdcp-hero-num tabular-nums">{hdcp}</div>
                        <div className="bls-hdcp-hero-lbl">Handicap pins</div>
                        <div className="bls-hdcp-hero-sub">
                            floor(0.90 x (210 - {expected.avg})) = {hdcp}
                            {selectedName && playerAvg != null ? ` | ${selectedName} ${playerAvg.toFixed(2)} scratch` : ""}
                            {scoped?.leagueHdcp != null ? ` | card ${scoped.leagueHdcp}` : ""}
                            {scoped && scoped.label !== "career" ? ` | ${scoped.label}` : ""}
                        </div>
                    </div>
                    <Form.Label htmlFor="hdcp-slider" className="visually-hidden">Handicap</Form.Label>
                    <Form.Range
                        id="hdcp-slider"
                        min={0}
                        max={MAX_HANDICAP}
                        step={1}
                        value={hdcp}
                        onChange={(e) => { setHdcp(normalizeHandicap(Number(e.target.value))); }}
                    />
                    <div className="d-flex justify-content-between text-body-secondary fs-sm mb-3">
                        <span>0 hdcp / 210 avg</span>
                        <span>{MAX_HANDICAP} hdcp / 0 avg</span>
                    </div>
                    <Form.Label htmlFor="hdcp-player">Compare a bowler</Form.Label>
                    <Form.Select
                        id="hdcp-player"
                        className="mb-3"
                        value={playerId}
                        onChange={(e) => { setPlayerId(e.target.value); }}
                    >
                        <option value="">No bowler selected</option>
                        {players.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name}{p.average != null ? ` (${p.average.toFixed(2)} avg)` : ""}
                            </option>
                        ))}
                    </Form.Select>
                    <div className="bls-scope-pills mb-2" role="tablist" aria-label="Compare window">
                        {SCOPE_OPTIONS.map((opt) => (
                            <button
                                key={opt.id}
                                type="button"
                                role="tab"
                                aria-selected={scope === opt.id}
                                className={`bls-scope-pill${scope === opt.id ? " is-active" : ""}`}
                                onClick={() => { setScope(opt.id); }}
                            >
                                <span className="bls-scope-pill-label">{opt.label}</span>
                                <span className="bls-scope-pill-sub">{opt.hint}</span>
                            </button>
                        ))}
                    </div>
                    {playerId && isLoading && (
                        <div className="text-body-secondary fs-sm mt-2">Loading bowler stats...</div>
                    )}
                    {missingScope && (
                        <div className="text-body-secondary fs-sm mt-2">
                            No games in {scope === "last-league" ? currentTerm.label : "that window"} for this bowler. Try Career.
                        </div>
                    )}
                    {showActual && (
                        <div className="text-body-secondary fs-sm mt-2">
                            The large value is the guide; the smaller value is the selected bowler's recorded result.
                            {playerAvg != null && playerHdcp != null ? ` ${playerAvg.toFixed(2)} avg -> ${playerHdcp} pins.` : ""}
                            {scoped?.leagueHdcp != null ? ` League card posted ${scoped.leagueHdcp}.` : ""}
                        </div>
                    )}
                    <div className="text-body-secondary fs-sm mt-2">
                        Handicap totals follow the league rule. Performance values are illustrative average-based estimates, not calibrated league benchmarks.
                        Frame-derived comparisons use only games with recorded frames.
                    </div>
                </CardBody>
            </Card>

            <Group title="Handicap math">
                {tile("avg", "Representative book average")}
                {tile("hdcp", "Whole-pin handicap")}
                {tile("hdcpGame", "Expected hdcp game")}
                {tile("series", "Expected 3-game series")}
                {tile("hdcpSeries", "Expected hdcp series")}
            </Group>

            {showActual && <Group title="Observed bowler record">
                {observedTile("games", "Games bowled")}
                {observedTile("completeSeries", "Complete series")}
                {observedTile("frameGames", "Games with frames")}
                {observedTile("frameCoverage", "Frame coverage")}
                {observedTile("lowGame", "Low game")}
                {observedTile("highGame", "High game")}
                {observedTile("lowSeries", "Low series")}
                {observedTile("highSeries", "High series")}
                {observedTile("gameOneAverage", "Game 1 average")}
                {observedTile("gameTwoAverage", "Game 2 average")}
                {observedTile("gameThreeAverage", "Game 3 average")}
                {observedTile("tenthMarks", "Avg tenth-frame marks")}
                {observedTile("strikeToSpare", "Strike : spare")}
                {observedTile("splitConversion", "Split conversion")}
            </Group>}

            <Group title="Illustrative scoring profile">
                {tile("sd", "Illustrative game SD")}
                {tile("highGame", "Illustrative hot-game estimate", false)}
                {tile("twoHundred", "Games 200+")}
                {tile("threeHundred", "Games 300")}
                {tile("sixHundred", "Series 600+")}
            </Group>

            <Group title="Illustrative conversion profile">
                {tile("strike", "Strike rate")}
                {tile("spare", "Spare rate")}
                {tile("single", "Single-pin pickup")}
                {tile("open", "Open frames")}
                {tile("split", "Frames with splits")}
                {tile("firstBall", "First-ball average")}
                {tile("clean", "Clean games")}
                {tile("hung", "Got hung / game")}
                {tile("turkey", "Turkeys / game")}
            </Group>

            <Group title="Pace and frames">
                {tile("pinfallFrame", "Pinfall per frame")}
                {tile("marksGame", "Marks per game")}
                {tile("ballsGame", "Balls thrown per game")}
                {tile("frames50", "Scorecard frame at 50")}
                {tile("frames100", "Scorecard frame at 100")}
                {tile("frames150", "Scorecard frame at 150")}
                {tile("frames200", "Scorecard frame at 200")}
            </Group>
            <p className="text-body-secondary fs-sm">
                Scorecard-frame milestones use finalized frame totals, including strike and spare bonuses, and average only games that reached the milestone.
            </p>
        </div>
    );
};

export default HandicapGuide;

