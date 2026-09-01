/*
 * Handicap guide - expected stats vs an optional bowler
 */

import {type FC, type ReactNode, useCallback, useMemo, useState} from "react";
import {Card, CardBody, Form} from "react-bootstrap";

import {
    aggregatePlayerData,
    buildFullPlayerList,
    PLAYER_DETAIL_CACHE_CATEGORY,
    PLAYER_INDEX_CACHE_CATEGORY,
    type AggregatedPlayerData,
    type PlayerListEntry,
} from "../../../data/player/player-aggregate";
import type {PlayerStats} from "../../../data/player/player-stats";
import {comparePinnedThen} from "../../../data/player/player-pin";
import {useCachedFetcher} from "../cache/data-loader";

function clamp(n: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, n));
}

function round1(n: number): number {
    return Math.round(n * 10) / 10;
}

function round0(n: number): number {
    return Math.round(n);
}

function avgFromHandicap(hdcp: number): number {
    return clamp(220 - hdcp / 0.9, 110, 230);
}

function handicapFromAvg(avg: number): number {
    return Math.max(0, Math.round(0.9 * (220 - avg)));
}

function ratioPct(rg?: {pct?: number; denominator?: number} | null): number | null {
    if (!rg || !rg.denominator) return null;
    return round1((rg.pct ?? 0) * 100);
}

interface ExpectedStats {
    hdcp: number;
    avg: number;
    hdcpGame: number;
    series: number;
    hdcpSeries: number;
    strike: number;
    spare: number;
    single: number;
    open: number;
    split: number;
    firstBall: number;
    clean: number;
    hung: number;
    turkey: number;
    twoHundred: number;
    threeHundred: number;
    sixHundred: number;
    sd: number;
    highGame: number;
    pinfallFrame: number;
    marksGame: number;
    ballsGame: number;
    frames50: number;
    balls50: number;
    frames100: number;
    balls100: number;
    frames150: number;
    balls150: number;
    frames200: number;
    balls200: number;
}

type StatKey = keyof ExpectedStats;

function predict(hdcp: number): ExpectedStats {
    const avg = avgFromHandicap(hdcp);
    const a = clamp(avg, 110, 230);
    const strike = clamp(28 + (a - 150) * 0.37, 12, 62);
    const spare = clamp(42 + (a - 150) * 0.33, 28, 72);
    const single = clamp(70 + (a - 150) * 0.33, 55, 96);
    const open = clamp(26 - (a - 150) * 0.27, 6, 40);
    const split = clamp(12 - (a - 150) * 0.08, 4, 16);
    const firstBall = clamp(7.6 + (a - 150) * 0.023, 7.0, 9.6);
    const clean = clamp(8 + (a - 150) * 0.2, 4, 28);
    const hung = clamp(18 - (a - 150) * 0.1, 6, 22);
    const turkey = clamp(4 + (a - 150) * 0.12, 2, 16);
    const twoHundred = clamp(8 + (a - 150) * 0.35, 1, 45);
    const threeHundred = clamp((a - 180) * 0.04, 0, 3);
    const sixHundred = clamp(12 + (a - 150) * 0.4, 2, 55);
    const sd = clamp(32 - (a - 150) * 0.08, 18, 36);
    const ppf = avg / 10;
    const ballsPerFrame = 1 + (1 - strike / 100);
    const pace = (target: number) => {
        const frames = clamp(target / Math.max(ppf, 0.1), 2, 10);
        return {frames, balls: frames * ballsPerFrame};
    };
    const p50 = pace(50);
    const p100 = pace(100);
    const p150 = pace(150);
    const p200 = pace(200);
    return {
        hdcp,
        avg: round1(avg),
        hdcpGame: round1(avg + hdcp),
        series: round1(avg * 3),
        hdcpSeries: round1((avg + hdcp) * 3),
        strike: round1(strike),
        spare: round1(spare),
        single: round1(single),
        open: round1(open),
        split: round1(split),
        firstBall: round1(firstBall),
        clean: round1(clean),
        hung: round1(hung),
        turkey: round1(turkey),
        twoHundred: round1(twoHundred),
        threeHundred: round1(threeHundred),
        sixHundred: round1(sixHundred),
        sd: round1(sd),
        highGame: round0(avg + 1.65 * sd),
        pinfallFrame: round1(ppf),
        marksGame: round1(10 * (1 - open / 100)),
        ballsGame: round1(9 * ballsPerFrame + 2.4),
        frames50: round1(p50.frames),
        balls50: round1(p50.balls),
        frames100: round1(p100.frames),
        balls100: round1(p100.balls),
        frames150: round1(p150.frames),
        balls150: round1(p150.balls),
        frames200: round1(p200.frames),
        balls200: round1(p200.balls),
    };
}

const LOWER_BETTER = new Set<StatKey>([
    "open", "split", "hung", "sd",
    "frames50", "balls50", "frames100", "balls100",
    "frames150", "balls150", "frames200", "balls200", "ballsGame",
]);

function actualFromStats(stats: PlayerStats, sliderHdcp: number): Partial<Record<StatKey, number>> {
    const games = stats.gameStats.count || 0;
    const seriesN = stats.seriesStats.count || 0;
    const avg = stats.gameStats.average || 0;
    const open = ratioPct(stats.opens);
    const strike = ratioPct(stats.strikes);
    const out: Partial<Record<StatKey, number>> = {
        hdcp: avg > 0 ? handicapFromAvg(avg) : undefined,
        avg: avg > 0 ? round1(avg) : undefined,
        hdcpGame: avg > 0 ? round1(avg + sliderHdcp) : undefined,
        series: seriesN > 0 ? round1(stats.seriesStats.average) : undefined,
        hdcpSeries: seriesN > 0 ? round1(stats.seriesStats.average + sliderHdcp * 3) : undefined,
        strike: strike ?? undefined,
        spare: ratioPct(stats.spares) ?? undefined,
        single: ratioPct(stats.singlePinSpares) ?? undefined,
        open: open ?? undefined,
        split: ratioPct(stats.splitsOccurred) ?? ratioPct(stats.splits) ?? undefined,
        firstBall: stats.firstBallAverage || undefined,
        clean: games > 0 ? round1((stats.cleanGames / games) * 100) : undefined,
        hung: games > 0 ? round1((stats.hungCount / games) * 100) : undefined,
        turkey: games > 0 ? round1((stats.turkeyCount / games) * 100) : undefined,
        twoHundred: games > 0 ? round1((stats.games200 / games) * 100) : undefined,
        threeHundred: games > 0 ? round1((stats.games300 / games) * 100) : undefined,
        sixHundred: seriesN > 0 ? round1((stats.series600 / seriesN) * 100) : undefined,
        sd: stats.gameStats.sd || undefined,
        highGame: stats.gameStats.max || undefined,
        pinfallFrame: stats.avgPinfallPerFrame || undefined,
        marksGame: open != null ? round1(10 * (1 - open / 100)) : undefined,
        ballsGame: strike != null ? round1(9 * (1 + (1 - strike / 100)) + 2.4) : undefined,
    };
    const frames = stats.paceAvgFrames ?? [];
    const balls = stats.paceAvgBalls ?? [];
    const n = stats.paceN ?? [];
    const keys: StatKey[][] = [
        ["frames50", "balls50"],
        ["frames100", "balls100"],
        ["frames150", "balls150"],
        ["frames200", "balls200"],
    ];
    keys.forEach((pair, i) => {
        if ((n[i] ?? 0) > 0) {
            out[pair[0]] = frames[i] != null ? round1(frames[i]) : undefined;
            out[pair[1]] = balls[i] != null ? round1(balls[i]) : undefined;
        }
    });
    return out;
}

function diffPct(actual: number | undefined, expected: number): number | null {
    if (actual == null || !expected) return null;
    return round1(((actual - expected) / Math.abs(expected)) * 100);
}

function formatVal(n: number | undefined, kind: "num" | "pct"): string {
    if (n == null || Number.isNaN(n)) return "--";
    return kind === "pct" ? `${round1(n)}%` : String(n);
}

const PCT_KEYS = new Set<StatKey>([
    "strike", "spare", "single", "open", "split",
    "clean", "hung", "turkey", "twoHundred", "threeHundred", "sixHundred",
]);

const Tile: FC<{
    label: string;
    statKey: StatKey;
    expected: number;
    actual?: number;
    showActual: boolean;
}> = ({label, statKey, expected, actual, showActual}) => {
    const kind = PCT_KEYS.has(statKey) ? "pct" : "num";
    const diff = showActual ? diffPct(actual, expected) : null;
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
            {showActual && (
                <div className="d-flex justify-content-between mt-2 fs-sm" style={{color: tone === " is-better" ? "#30d158" : tone === " is-worse" ? "#ff453a" : undefined}}>
                    <span>{formatVal(actual, kind)}</span>
                    <span>{diff == null ? "--" : `${diff > 0 ? "+" : ""}${diff}%`}</span>
                </div>
            )}
        </div>
    );
};

const Group: FC<{title: string; children: ReactNode}> = ({title, children}) => (
    <div className="bls-allstats-group mb-3">
        <div className="bls-allstats-group-head">{title}</div>
        <div className="bls-allstats-grid">{children}</div>
    </div>
);

const emptyPlayer = {id: "", name: "none"} as AggregatedPlayerData["player"];

const HandicapGuide: FC = () => {
    const [hdcp, setHdcp] = useState(36);
    const [playerId, setPlayerId] = useState("");
    const expected = useMemo(() => predict(hdcp), [hdcp]);

    const listFetcher = useCallback(buildFullPlayerList, []);
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

    const actual = useMemo(() => {
        if (!playerId || !detail?.careerStats || detail.player?.id === "") return null;
        return actualFromStats(detail.careerStats, hdcp);
    }, [playerId, detail, hdcp]);

    const selectedName = players.find((p) => p.id === playerId)?.name;
    const showActual = Boolean(actual);

    const tile = (key: StatKey, label: string) => (
        <Tile
            key={key}
            statKey={key}
            label={label}
            expected={expected[key]}
            actual={actual?.[key]}
            showActual={showActual}
        />
    );

    return (
        <div className="container-md bls-hdcp-guide">
            <Card className="bls-profile-card mb-3">
                <div className="bls-profile-card-head">Handicap guide</div>
                <CardBody>
                    <p className="text-body-secondary mb-4">
                        Drag the slider to a house handicap. Numbers below are what that handicap
                        usually looks like on a typical 90% of 220 league. Add a bowler to see
                        their career numbers vs those targets.
                    </p>
                    <div className="bls-hdcp-hero mb-3 text-center">
                        <div className="bls-hdcp-hero-num tabular-nums">{hdcp}</div>
                        <div className="bls-hdcp-hero-lbl">Handicap pins</div>
                        <div className="bls-hdcp-hero-sub">
                            About a {expected.avg} scratch average
                            {selectedName ? ` | comparing ${selectedName}` : ""}
                        </div>
                    </div>
                    <Form.Label htmlFor="hdcp-slider" className="visually-hidden">Handicap</Form.Label>
                    <Form.Range
                        id="hdcp-slider"
                        min={0}
                        max={90}
                        step={1}
                        value={hdcp}
                        onChange={(e) => setHdcp(Number(e.target.value))}
                    />
                    <div className="d-flex justify-content-between text-body-secondary fs-sm mb-3">
                        <span>0 hdcp / 220 avg</span>
                        <span>90 hdcp / 120 avg</span>
                    </div>
                    <Form.Label htmlFor="hdcp-player">Compare a bowler</Form.Label>
                    <Form.Select
                        id="hdcp-player"
                        value={playerId}
                        onChange={(e) => setPlayerId(e.target.value)}
                    >
                        <option value="">No bowler selected</option>
                        {players.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name}{p.average != null ? ` (${p.average.toFixed(1)} avg)` : ""}
                            </option>
                        ))}
                    </Form.Select>
                    {playerId && isLoading && (
                        <div className="text-body-secondary fs-sm mt-2">Loading bowler stats...</div>
                    )}
                    {showActual && (
                        <div className="text-body-secondary fs-sm mt-2">
                            Each tile shows expected, then the bowler value and % difference vs the slider target.
                            Green means better than the target, red means behind.
                        </div>
                    )}
                </CardBody>
            </Card>

            <Group title="Scoring">
                {tile("avg", "Expected scratch avg")}
                {tile("hdcp", "House handicap (90/220)")}
                {tile("hdcpGame", "Expected hdcp game")}
                {tile("series", "Expected 3-game series")}
                {tile("hdcpSeries", "Expected hdcp series")}
                {tile("sd", "Typical game SD")}
                {tile("highGame", "Typical hot game (95th)")}
                {tile("twoHundred", "Games 200+")}
                {tile("threeHundred", "Games 300")}
                {tile("sixHundred", "Series 600+")}
            </Group>

            <Group title="Conversion">
                {tile("strike", "Strike rate")}
                {tile("spare", "Spare rate")}
                {tile("single", "Single-pin pickup")}
                {tile("open", "Open frames")}
                {tile("split", "Splits")}
                {tile("firstBall", "First-ball average")}
                {tile("clean", "Clean games")}
                {tile("hung", "Got hung (per game)")}
                {tile("turkey", "Turkeys (per game)")}
            </Group>

            <Group title="Pace and frames">
                {tile("pinfallFrame", "Expected pinfall per frame")}
                {tile("marksGame", "Marks per game")}
                {tile("ballsGame", "Balls thrown per game")}
                {tile("frames50", "Frames to reach 50")}
                {tile("balls50", "Balls to reach 50")}
                {tile("frames100", "Frames to reach 100")}
                {tile("balls100", "Balls to reach 100")}
                {tile("frames150", "Frames to reach 150")}
                {tile("balls150", "Balls to reach 150")}
                {tile("frames200", "Frames to reach 200")}
                {tile("balls200", "Balls to reach 200")}
            </Group>
        </div>
    );
};

export default HandicapGuide;
