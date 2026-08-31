/*
 * Player Compare — FIFA-style dashboard © 2026
 */

import {type FC, type ReactNode, useCallback, useMemo, useState} from "react";
import Chart from "react-apexcharts";
import type {ApexOptions} from "apexcharts";
import {Badge, Card, CardBody, Col, Form, Row} from "react-bootstrap";

import {
    aggregatePlayerData,
    buildFullPlayerList,
    PLAYER_DETAIL_CACHE_CATEGORY,
    PLAYER_INDEX_CACHE_CATEGORY,
    type AggregatedPlayerData,
    type PlayerAppearanceSlice,
    type PlayerListEntry,
    type PlayerListSeasonSlice,
} from "../../../data/player/player-aggregate";
import type {PlayerStats} from "../../../data/player/player-stats";
import {useCachedFetcher} from "../cache/data-loader";
import Loader from "../loader";
import ErrorDisplay from "../error-display";
import {useTheme} from "../theme";
import {chartPalette} from "../charts/chart-theme";

const numberFormat = Intl.NumberFormat("en-US", {style: "decimal", maximumFractionDigits: 1});
const intFormat = Intl.NumberFormat("en-US", {style: "decimal", maximumFractionDigits: 0});

const COLOR_A = "#ff2d55";
const COLOR_B = "#00d4ff";

type Mode = "career" | "season";
type TabId = "scoring" | "conversion" | "volume";

interface StatDef {
    key: string;
    label: string;
    format: (v: number | null | undefined) => string;
}

const fmtN = (v: number | null | undefined) => (v != null ? numberFormat.format(v) : "—");
const fmtI = (v: number | null | undefined) => (v != null ? intFormat.format(v) : "—");
const fmtP = (v: number | null | undefined) => (v != null ? `${numberFormat.format(v)}%` : "—");

const SCORING: StatDef[] = [
    {key: "average", label: "Average", format: fmtN},
    {key: "highGame", label: "High game", format: fmtI},
    {key: "highSeries", label: "High series", format: fmtI},
    {key: "lowGame", label: "Low game", format: fmtI},
    {key: "lowSeries", label: "Low series", format: fmtI},
    {key: "firstBall", label: "First ball avg", format: fmtN},
];

const CONVERSION: StatDef[] = [
    {key: "strikePct", label: "Strike %", format: fmtP},
    {key: "sparePct", label: "Spare %", format: fmtP},
    {key: "singlePinPct", label: "Single-pin spare %", format: fmtP},
    {key: "openPct", label: "Open %", format: fmtP},
    {key: "splitPct", label: "Split %", format: fmtP},
    {key: "strikeToSparePct", label: "Strike→spare %", format: fmtP},
    {key: "singlePinPickup", label: "Single pins pickup", format: fmtP},
    {key: "cleanGames", label: "Clean games", format: fmtI},
    {key: "hungCount", label: "Got hung", format: fmtI},
    {key: "turkeyCount", label: "Turkeys", format: fmtI},
];

const VOLUME: StatDef[] = [
    {key: "games", label: "Games", format: fmtI},
    {key: "seriesCount", label: "Series", format: fmtI},
    {key: "pinfall", label: "Pinfall", format: fmtI},
    {key: "games200", label: "200+ games", format: fmtI},
    {key: "games300", label: "300 games", format: fmtI},
    {key: "series600", label: "600+ series", format: fmtI},
    {key: "series800", label: "800+ series", format: fmtI},
];

const ALL_STATS = [...SCORING, ...CONVERSION, ...VOLUME];

function num(v: number | null | undefined): number {
    return v == null || Number.isNaN(v) ? 0 : v;
}

function ratioPct(rg?: {pct: number; denominator: number}): number | null {
    if (!rg || rg.denominator <= 0) return null;
    return Math.round(rg.pct * 1000) / 10;
}

type StatBag = Record<string, number | null>;

type RichSlice = {
    average: number | null;
    games: number;
    pinfall: number;
    highGame: number;
    highSeries: number;
    games200: number;
    games300?: number;
    series600?: number;
    series800?: number;
    cleanGames?: number;
    hungCount?: number;
    turkeyCount?: number;
    firstBall?: number | null;
    strikePct?: number | null;
    sparePct?: number | null;
    singlePinPct?: number | null;
    openPct?: number | null;
    splitPct?: number | null;
    strikeToSparePct?: number | null;
    singlePinPickup?: number | null;
    lowGame?: number | null;
    lowSeries?: number | null;
    seriesCount?: number;
};

function bagFromSlices(slices: RichSlice[]): StatBag {
    let games = 0, pinfall = 0, highGame = 0, highSeries = 0, games200 = 0;
    let games300 = 0, series600 = 0, series800 = 0, cleanGames = 0, hungCount = 0, turkeyCount = 0, seriesCount = 0;
    let weighted = 0;
    let firstW = 0, firstG = 0;
    let strikeW = 0, spareW = 0, singleW = 0, openW = 0, splitW = 0, s2sW = 0, pickupW = 0, pctG = 0;
    let lowGame: number | null = null;
    let lowSeries: number | null = null;
    for (const s of slices) {
        games += s.games;
        pinfall += s.pinfall;
        highGame = Math.max(highGame, s.highGame);
        highSeries = Math.max(highSeries, s.highSeries);
        games200 += s.games200;
        games300 += s.games300 ?? 0;
        series600 += s.series600 ?? 0;
        series800 += s.series800 ?? 0;
        cleanGames += s.cleanGames ?? 0;
        hungCount += s.hungCount ?? 0;
        turkeyCount += s.turkeyCount ?? 0;
        seriesCount += s.seriesCount ?? 0;
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
        if (s.lowGame != null) lowGame = lowGame == null ? s.lowGame : Math.min(lowGame, s.lowGame);
        if (s.lowSeries != null) lowSeries = lowSeries == null ? s.lowSeries : Math.min(lowSeries, s.lowSeries);
    }
    return {
        average: games > 0 ? weighted / games : null,
        games, pinfall, highGame, highSeries, games200,
        games300, series600, series800, cleanGames, hungCount, turkeyCount, seriesCount,
        firstBall: firstG > 0 ? firstW / firstG : null,
        strikePct: pctG > 0 && strikeW > 0 ? strikeW / pctG : null,
        sparePct: pctG > 0 && spareW > 0 ? spareW / pctG : null,
        singlePinPct: pctG > 0 && singleW > 0 ? singleW / pctG : null,
        openPct: pctG > 0 && openW > 0 ? openW / pctG : null,
        splitPct: pctG > 0 && splitW > 0 ? splitW / pctG : null,
        strikeToSparePct: pctG > 0 && s2sW > 0 ? s2sW / pctG : null,
        singlePinPickup: pctG > 0 && pickupW > 0 ? pickupW / pctG : null,
        lowGame, lowSeries,
    };
}

function bagFromListEntry(entry: PlayerListEntry): StatBag {
    return bagFromSlices(entry.seasonSlices ?? [{
        average: entry.average, games: entry.games, pinfall: entry.pinfall,
        highGame: entry.highGame, highSeries: entry.highSeries, games200: entry.games200,
    }]);
}

function bagFromCareer(stats: PlayerStats): StatBag {
    return {
        average: stats.gameStats.count > 0 ? stats.gameStats.average : null,
        games: stats.gameStats.count,
        pinfall: stats.pinfall,
        highGame: stats.gameStats.max || null,
        highSeries: stats.seriesStats.max || null,
        games200: stats.games200,
        games300: stats.games300,
        series600: stats.series600,
        series800: stats.series800,
        cleanGames: stats.cleanGames,
        hungCount: stats.hungCount,
        turkeyCount: stats.turkeyCount,
        firstBall: stats.firstBallAverage || null,
        strikePct: ratioPct(stats.strikes),
        sparePct: ratioPct(stats.spares),
        singlePinPct: ratioPct(stats.singlePinSpares),
        openPct: ratioPct(stats.opens),
        splitPct: ratioPct(stats.splits),
        strikeToSparePct: ratioPct(stats.strikesToSpares),
        singlePinPickup: stats.allSinglePinsPickedUpAverage > 0
            ? Math.round(stats.allSinglePinsPickedUpAverage * 1000) / 10 : null,
        lowGame: stats.gameStats.min || null,
        lowSeries: stats.seriesStats.min || null,
        seriesCount: stats.seriesStats.count || null,
    };
}

function scopeListEntry(entry: PlayerListEntry, mode: Mode, season: string, leagueId: string): StatBag {
    if (mode === "career") return bagFromListEntry(entry);
    const apps = entry.appearanceSlices ?? [];
    if (leagueId && season) {
        return bagFromSlices(apps.filter((a: PlayerAppearanceSlice) => a.leagueId === leagueId && a.season === season));
    }
    if (season) {
        const seasonSlices = (entry.seasonSlices ?? []).filter((s: PlayerListSeasonSlice) => s.season === season);
        if (seasonSlices.length > 0) return bagFromSlices(seasonSlices);
        return bagFromSlices(apps.filter((a) => a.season === season));
    }
    return bagFromListEntry(entry);
}

const FifaBar: FC<{
    label: string;
    valueA: number | null;
    valueB: number | null;
    format: (v: number | null | undefined) => string;
}> = ({label, valueA, valueB, format}) => {
    const a = num(valueA);
    const b = num(valueB);
    const total = a + b;
    const fill = total > 0 ? (Math.max(a, b) / total) * 100 : 50;
    const leader: "a" | "b" | "tie" = a > b ? "a" : b > a ? "b" : "tie";
    const color = leader === "a" ? COLOR_A : leader === "b" ? COLOR_B : "#6e6e73";
    return (
        <div className="bls-fifa-row">
            <div className="bls-fifa-row-label">{label}</div>
            <div className="bls-fifa-row-trackline">
                <span className={`bls-fifa-val${leader === "a" ? " is-lead" : ""}`} style={{color: COLOR_A}}>{format(valueA)}</span>
                <div className="bls-fifa-track">
                    <div className="bls-fifa-fill" style={{width: `${fill}%`, background: color, boxShadow: leader === "tie" ? undefined : `0 0 10px ${color}`, marginLeft: leader === "b" ? "auto" : 0}} />
                </div>
                <span className={`bls-fifa-val${leader === "b" ? " is-lead" : ""}`} style={{color: COLOR_B}}>{format(valueB)}</span>
            </div>
        </div>
    );
};

const DualRadar: FC<{bagA: StatBag; bagB: StatBag; nameA: string; nameB: string}> = ({bagA, bagB, nameA, nameB}) => {
    const {theme} = useTheme();
    const palette = chartPalette(theme);
    const gamesA = Math.max(1, num(bagA.games));
    const gamesB = Math.max(1, num(bagB.games));
    const scaleAvg = (v: number | null) => Math.max(0, Math.min(100, ((num(v) - 140) / 80) * 100));
    const cats = ["Avg", "Strike %", "Spare %", "Clean", "Hung", "Turkey"];
    const seriesA = [
        scaleAvg(bagA.average), num(bagA.strikePct), num(bagA.sparePct),
        Math.min(100, (num(bagA.cleanGames) / gamesA) * 100),
        Math.min(100, (num(bagA.hungCount) / gamesA) * 40),
        Math.min(100, (num(bagA.turkeyCount) / gamesA) * 25),
    ];
    const seriesB = [
        scaleAvg(bagB.average), num(bagB.strikePct), num(bagB.sparePct),
        Math.min(100, (num(bagB.cleanGames) / gamesB) * 100),
        Math.min(100, (num(bagB.hungCount) / gamesB) * 40),
        Math.min(100, (num(bagB.turkeyCount) / gamesB) * 25),
    ];
    const options: ApexOptions = {
        chart: {type: "radar", background: "transparent", toolbar: {show: false}, fontFamily: "Inter, sans-serif"},
        theme: {mode: theme},
        colors: [COLOR_A, COLOR_B],
        fill: {opacity: 0.18},
        stroke: {width: 2},
        markers: {size: 3, strokeWidth: 0},
        xaxis: {categories: cats, labels: {style: {colors: Array(cats.length).fill(palette.text), fontSize: "11px", fontWeight: 600}}},
        yaxis: {show: false, min: 0, max: 100, tickAmount: 4},
        legend: {position: "bottom", labels: {colors: palette.text}},
        tooltip: {theme},
        plotOptions: {
            radar: {
                polygons: {
                    strokeColors: palette.grid,
                    connectorColors: palette.grid,
                    fill: {colors: theme === "dark" ? ["#0a0a0a", "#111"] : ["#fff", "#f5f5f7"]},
                },
            },
        },
    };
    return (
        <Chart options={options} series={[{name: nameA, data: seriesA}, {name: nameB, data: seriesB}]} type="radar" height={340} width="100%" />
    );
};

const PlayerCareerFetch: FC<{playerId: string; children: (d: AggregatedPlayerData | null, loading: boolean) => ReactNode}> = ({playerId, children}) => {
    const fetcher = useCallback(() => aggregatePlayerData(playerId), [playerId]);
    const {data, isLoading} = useCachedFetcher<AggregatedPlayerData>(fetcher, PLAYER_DETAIL_CACHE_CATEGORY, playerId);
    return <>{children(data ?? null, isLoading)}</>;
};

const CareerPair: FC<{idA: string; idB: string; children: (a: StatBag | null, b: StatBag | null, loading: boolean) => ReactNode}> = ({idA, idB, children}) => (
    <PlayerCareerFetch playerId={idA}>
        {(dataA, loadA) => (
            <PlayerCareerFetch playerId={idB}>
                {(dataB, loadB) => children(dataA ? bagFromCareer(dataA.careerStats) : null, dataB ? bagFromCareer(dataB.careerStats) : null, loadA || loadB)}
            </PlayerCareerFetch>
        )}
    </PlayerCareerFetch>
);

const PlayerCard: FC<{
    side: "a" | "b"; name: string; bag: StatBag; players: PlayerListEntry[];
    selectedId: string; otherId: string; onChange: (id: string) => void; disabled?: boolean;
}> = ({side, name, bag, players, selectedId, otherId, onChange, disabled}) => {
    const color = side === "a" ? COLOR_A : COLOR_B;
    return (
        <div className={`bls-fifa-pcard bls-fifa-pcard-${side}`} style={{borderColor: color, boxShadow: `0 0 18px ${color}40`}}>
            <div className="bls-fifa-pcard-badge" style={{borderColor: color, color}}>
                {bag.average != null ? numberFormat.format(bag.average) : "—"}
            </div>
            <div className="bls-fifa-pcard-body">
                <div className="bls-fifa-pcard-name" style={{color}}>{name}</div>
                <div className="bls-fifa-pcard-meta">
                    <span>{bag.games != null ? `${intFormat.format(bag.games)} games` : "—"}</span>
                    <span>{bag.highGame != null ? `HG ${intFormat.format(bag.highGame)}` : ""}</span>
                </div>
                <Form.Select size="sm" className="bls-fifa-change" value={selectedId} disabled={disabled} onChange={(e) => onChange(e.target.value)} style={{borderColor: color}}>
                    <option value="">Change</option>
                    {players.map((p) => (<option key={p.id} value={p.id} disabled={p.id === otherId}>{p.name}</option>))}
                </Form.Select>
            </div>
        </div>
    );
};

const StatColumn: FC<{title: string; stats: StatDef[]; bagA: StatBag; bagB: StatBag}> = ({title, stats, bagA, bagB}) => (
    <div className="bls-fifa-col">
        <div className="bls-fifa-col-title">{title}</div>
        {stats.map((s) => (
            <FifaBar key={s.key} label={s.label} valueA={bagA[s.key] ?? null} valueB={bagB[s.key] ?? null} format={s.format} />
        ))}
    </div>
);

const PlayerCompare: FC = () => {
    const listFetcher = useCallback(buildFullPlayerList, []);
    const {data, isLoading, error} = useCachedFetcher<PlayerListEntry[]>(listFetcher, PLAYER_INDEX_CACHE_CATEGORY);
    const [mode, setMode] = useState<Mode>("career");
    const [tab, setTab] = useState<TabId>("scoring");
    const [season, setSeason] = useState("");
    const [leagueId, setLeagueId] = useState("");
    const [idA, setIdA] = useState("");
    const [idB, setIdB] = useState("");

    const seasons = useMemo(() => {
        if (!data) return [] as string[];
        const set = new Set<string>();
        for (const p of data) {
            for (const s of p.seasonSlices ?? []) set.add(s.season);
            for (const a of p.appearanceSlices ?? []) if (a.season) set.add(a.season);
        }
        return [...set].sort((a, b) => b.localeCompare(a));
    }, [data]);

    const leagues = useMemo(() => {
        if (!data || !season) return [] as {id: string; name: string}[];
        const map = new Map<string, string>();
        for (const p of data) {
            for (const a of p.appearanceSlices ?? []) {
                if (!a.leagueId || a.season !== season) continue;
                if (!map.has(a.leagueId)) map.set(a.leagueId, a.leagueName || a.leagueId);
            }
        }
        return [...map.entries()].map(([id, name]) => ({id, name})).sort((x, y) => x.name.localeCompare(y.name));
    }, [data, season]);

    const eligible = useMemo(() => {
        if (!data) return [] as PlayerListEntry[];
        return data.filter((p) => num(scopeListEntry(p, mode, season, leagueId).games) > 0).sort((x, y) => x.name.localeCompare(y.name));
    }, [data, mode, season, leagueId]);

    const aEntry = eligible.find((p) => p.id === idA);
    const bEntry = eligible.find((p) => p.id === idB);
    const listBagA = aEntry ? scopeListEntry(aEntry, mode, season, leagueId) : null;
    const listBagB = bEntry ? scopeListEntry(bEntry, mode, season, leagueId) : null;

    const Board: FC<{bagA: StatBag; bagB: StatBag; nameA: string; nameB: string}> = ({bagA, bagB, nameA, nameB}) => {
        let scoreA = 0, scoreB = 0;
        for (const s of ALL_STATS) {
            const av = num(bagA[s.key]), bv = num(bagB[s.key]);
            if (av > bv) scoreA++;
            else if (bv > av) scoreB++;
        }
        return (
            <>
                <div className="bls-fifa-heads mb-3">
                    <PlayerCard side="a" name={nameA} bag={bagA} players={eligible} selectedId={idA} otherId={idB} onChange={setIdA} disabled={mode === "season" && !season} />
                    <div className="bls-fifa-vs"><span>VS</span><Badge pill style={{background: scoreA >= scoreB ? COLOR_A : COLOR_B, color: "#fff"}}>{scoreA}–{scoreB}</Badge></div>
                    <PlayerCard side="b" name={nameB} bag={bagB} players={eligible} selectedId={idB} otherId={idA} onChange={setIdB} disabled={mode === "season" && !season} />
                </div>
                <div className="bls-fifa-tabs" role="tablist">
                    {([["scoring", "Scoring"], ["conversion", "Conversion"], ["volume", "Volume"]] as [TabId, string][]).map(([id, label]) => (
                        <button key={id} type="button" className={`bls-fifa-tab${tab === id ? " is-active" : ""}`} onClick={() => setTab(id)}>{label}</button>
                    ))}
                </div>
                <Row className="g-3">
                    <Col lg={8}>
                        <Card className="bls-profile-card bls-fifa-panel">
                            <CardBody>
                                {tab === "scoring" && <StatColumn title="Match scoring" stats={SCORING} bagA={bagA} bagB={bagB} />}
                                {tab === "conversion" && <StatColumn title="Conversion & spare game" stats={CONVERSION} bagA={bagA} bagB={bagB} />}
                                {tab === "volume" && <StatColumn title="Workload & honor scores" stats={VOLUME} bagA={bagA} bagB={bagB} />}
                            </CardBody>
                        </Card>
                    </Col>
                    <Col lg={4}>
                        <Card className="bls-profile-card bls-fifa-panel h-100">
                            <div className="bls-profile-card-head">Attributes map</div>
                            <CardBody><DualRadar bagA={bagA} bagB={bagB} nameA={nameA} nameB={nameB} /></CardBody>
                        </Card>
                    </Col>
                </Row>
            </>
        );
    };

    return (
        <div className="bls-compare bls-fifa-compare">
            <div className="bls-compare-hero mb-3">
                <span className="bls-hero-kicker">Head to head</span>
                <h1>Player Compare</h1>
            </div>
            {isLoading && <Loader />}
            {error != null && <ErrorDisplay message="Error loading players." error={error} />}
            {data && (
                <>
                    <Card className="bls-profile-card mb-3 bls-fifa-panel">
                        <CardBody>
                            <Row className="g-3">
                                <Col xs={12}>
                                    <div className="bls-scope-pills">
                                        <button type="button" className={`bls-scope-pill${mode === "career" ? " is-active" : ""}`} onClick={() => { setMode("career"); setSeason(""); setLeagueId(""); }}>
                                            <span className="bls-scope-pill-label">Careers</span>
                                            <span className="bls-scope-pill-sub">All seasons</span>
                                        </button>
                                        <button type="button" className={`bls-scope-pill${mode === "season" ? " is-active" : ""}`} onClick={() => setMode("season")}>
                                            <span className="bls-scope-pill-label">Season / league</span>
                                            <span className="bls-scope-pill-sub">Year first</span>
                                        </button>
                                    </div>
                                </Col>
                                {mode === "season" && (
                                    <>
                                        <Col md={6}>
                                            <Form.Label className="bls-meta-label">Season / year</Form.Label>
                                            <Form.Select value={season} onChange={(e) => { setSeason(e.target.value); setLeagueId(""); }}>
                                                <option value="">Select a season…</option>
                                                {seasons.map((s) => <option key={s} value={s}>{s}</option>)}
                                            </Form.Select>
                                        </Col>
                                        <Col md={6}>
                                            <Form.Label className="bls-meta-label">League</Form.Label>
                                            <Form.Select value={leagueId} onChange={(e) => setLeagueId(e.target.value)} disabled={!season}>
                                                <option value="">{season ? "All leagues this season" : "Select a season first"}</option>
                                                {leagues.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                                            </Form.Select>
                                        </Col>
                                    </>
                                )}
                            </Row>
                        </CardBody>
                    </Card>
                    {mode === "season" && !season && (
                        <Card className="bls-profile-card"><CardBody className="text-center text-body-secondary py-5">Choose a season before picking a league or bowlers.</CardBody></Card>
                    )}
                    {(!aEntry || !bEntry) && !(mode === "season" && !season) && (
                        <Row className="g-3 mb-3">
                            <Col md={6}>
                                <Form.Label className="bls-meta-label" style={{color: COLOR_A}}>Player A</Form.Label>
                                <Form.Select value={idA} onChange={(e) => setIdA(e.target.value)} style={{borderColor: COLOR_A}} disabled={mode === "season" && !season}>
                                    <option value="">Select bowler…</option>
                                    {eligible.map((p) => <option key={p.id} value={p.id} disabled={p.id === idB}>{p.name}</option>)}
                                </Form.Select>
                            </Col>
                            <Col md={6}>
                                <Form.Label className="bls-meta-label" style={{color: COLOR_B}}>Player B</Form.Label>
                                <Form.Select value={idB} onChange={(e) => setIdB(e.target.value)} style={{borderColor: COLOR_B}} disabled={mode === "season" && !season}>
                                    <option value="">Select bowler…</option>
                                    {eligible.map((p) => <option key={p.id} value={p.id} disabled={p.id === idA}>{p.name}</option>)}
                                </Form.Select>
                            </Col>
                        </Row>
                    )}
                    {aEntry && bEntry && mode === "career" && (
                        <CareerPair idA={aEntry.id} idB={bEntry.id}>
                            {(bagA, bagB, loading) => loading ? <Loader /> : bagA && bagB
                                ? <Board bagA={bagA} bagB={bagB} nameA={aEntry.name} nameB={bEntry.name} />
                                : listBagA && listBagB
                                    ? <Board bagA={listBagA} bagB={listBagB} nameA={aEntry.name} nameB={bEntry.name} />
                                    : null}
                        </CareerPair>
                    )}
                    {aEntry && bEntry && mode === "season" && season && listBagA && listBagB && (
                        <Board bagA={listBagA} bagB={listBagB} nameA={aEntry.name} nameB={bEntry.name} />
                    )}
                </>
            )}
        </div>
    );
};

export default PlayerCompare;
