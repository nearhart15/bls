/*
 * Player Compare — neon tug-of-war, career + season/league scopes © 2026
 */

import {type FC, type ReactNode, useCallback, useMemo, useState} from "react";
import {Badge, Card, CardBody, CardHeader, Col, Form, Row} from "react-bootstrap";

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

const numberFormat = Intl.NumberFormat("en-US", {
    style: "decimal",
    maximumFractionDigits: 1,
});
const intFormat = Intl.NumberFormat("en-US", {
    style: "decimal",
    maximumFractionDigits: 0,
});

const COLOR_A = "#ff2d55";
const COLOR_B = "#00d4ff";
const COLOR_A_SOFT = "rgba(255, 45, 85, 0.16)";
const COLOR_B_SOFT = "rgba(0, 212, 255, 0.16)";
const COLOR_A_GLOW = "0 0 14px rgba(255, 45, 85, 0.85)";
const COLOR_B_GLOW = "0 0 14px rgba(0, 212, 255, 0.85)";

type Mode = "career" | "season";

interface StatDef {
    key: string;
    label: string;
    format: (v: number | null | undefined) => string;
}

const CORE_STATS: StatDef[] = [
    {key: "average", label: "Average", format: (v) => (v != null ? numberFormat.format(v) : "—")},
    {key: "games", label: "Games", format: (v) => (v != null ? intFormat.format(v) : "—")},
    {key: "pinfall", label: "Pinfall", format: (v) => (v != null ? intFormat.format(v) : "—")},
    {key: "highGame", label: "High game", format: (v) => (v != null ? intFormat.format(v) : "—")},
    {key: "highSeries", label: "High series", format: (v) => (v != null ? intFormat.format(v) : "—")},
    {key: "games200", label: "200+ games", format: (v) => (v != null ? intFormat.format(v) : "—")},
];

const CAREER_EXTRA: StatDef[] = [
    {key: "games300", label: "300 games", format: (v) => (v != null ? intFormat.format(v) : "—")},
    {key: "series600", label: "600+ series", format: (v) => (v != null ? intFormat.format(v) : "—")},
    {key: "series800", label: "800+ series", format: (v) => (v != null ? intFormat.format(v) : "—")},
    {key: "cleanGames", label: "Clean games", format: (v) => (v != null ? intFormat.format(v) : "—")},
    {key: "firstBall", label: "First ball avg", format: (v) => (v != null ? numberFormat.format(v) : "—")},
    {key: "strikePct", label: "Strike %", format: (v) => (v != null ? `${numberFormat.format(v)}%` : "—")},
    {key: "sparePct", label: "Spare %", format: (v) => (v != null ? `${numberFormat.format(v)}%` : "—")},
    {key: "singlePinPct", label: "Single-pin spare %", format: (v) => (v != null ? `${numberFormat.format(v)}%` : "—")},
    {key: "openPct", label: "Open %", format: (v) => (v != null ? `${numberFormat.format(v)}%` : "—")},
    {key: "splitPct", label: "Split %", format: (v) => (v != null ? `${numberFormat.format(v)}%` : "—")},
    {key: "strikeToSparePct", label: "Strike→spare %", format: (v) => (v != null ? `${numberFormat.format(v)}%` : "—")},
    {key: "singlePinPickup", label: "All single pins pickup", format: (v) => (v != null ? `${numberFormat.format(v)}%` : "—")},
    {key: "lowGame", label: "Low game", format: (v) => (v != null ? intFormat.format(v) : "—")},
    {key: "lowSeries", label: "Low series", format: (v) => (v != null ? intFormat.format(v) : "—")},
    {key: "seriesCount", label: "Series bowled", format: (v) => (v != null ? intFormat.format(v) : "—")},
];

function num(v: number | null | undefined): number {
    return v == null || Number.isNaN(v) ? 0 : v;
}

function ratioPct(rg?: {pct: number; denominator: number}): number | null {
    if (!rg || rg.denominator <= 0) return null;
    return Math.round(rg.pct * 1000) / 10;
}

type StatBag = Record<string, number | null>;

function bagFromSlices(
    slices: {average: number | null; games: number; pinfall: number; highGame: number; highSeries: number; games200: number}[]
): StatBag {
    let games = 0;
    let pinfall = 0;
    let highGame = 0;
    let highSeries = 0;
    let games200 = 0;
    let weighted = 0;
    for (const s of slices) {
        games += s.games;
        pinfall += s.pinfall;
        highGame = Math.max(highGame, s.highGame);
        highSeries = Math.max(highSeries, s.highSeries);
        games200 += s.games200;
        if (s.average != null && s.games > 0) weighted += s.average * s.games;
    }
    return {
        average: games > 0 ? weighted / games : null,
        games,
        pinfall,
        highGame,
        highSeries,
        games200,
    };
}

function bagFromListEntry(entry: PlayerListEntry): StatBag {
    return {
        average: entry.average,
        games: entry.games,
        pinfall: entry.pinfall,
        highGame: entry.highGame,
        highSeries: entry.highSeries,
        games200: entry.games200,
    };
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
        firstBall: stats.firstBallAverage || null,
        strikePct: ratioPct(stats.strikes),
        sparePct: ratioPct(stats.spares),
        singlePinPct: ratioPct(stats.singlePinSpares),
        openPct: ratioPct(stats.opens),
        splitPct: ratioPct(stats.splits),
        strikeToSparePct: ratioPct(stats.strikesToSpares),
        singlePinPickup:
            stats.allSinglePinsPickedUpAverage > 0
                ? Math.round(stats.allSinglePinsPickedUpAverage * 1000) / 10
                : null,
        lowGame: stats.gameStats.min || null,
        lowSeries: stats.seriesStats.min || null,
        seriesCount: stats.seriesStats.count || null,
    };
}

function scopeListEntry(
    entry: PlayerListEntry,
    mode: Mode,
    season: string,
    leagueId: string
): StatBag {
    if (mode === "career") return bagFromListEntry(entry);
    const apps = entry.appearanceSlices ?? [];
    if (leagueId && season) {
        return bagFromSlices(
            apps.filter((a: PlayerAppearanceSlice) => a.leagueId === leagueId && a.season === season)
        );
    }
    if (season) {
        const seasonSlices = (entry.seasonSlices ?? []).filter(
            (s: PlayerListSeasonSlice) => s.season === season
        );
        if (seasonSlices.length > 0) return bagFromSlices(seasonSlices);
        return bagFromSlices(apps.filter((a) => a.season === season));
    }
    return bagFromListEntry(entry);
}

const LeadSlider: FC<{
    label: string;
    valueA: number | null;
    valueB: number | null;
    format: (v: number | null | undefined) => string;
    nameA: string;
    nameB: string;
}> = ({label, valueA, valueB, format, nameA, nameB}) => {
    const a = num(valueA);
    const b = num(valueB);
    const total = a + b;
    const pctA = total > 0 ? (a / total) * 100 : 50;
    const pctB = total > 0 ? (b / total) * 100 : 50;
    const leader: "a" | "b" | "tie" = a > b ? "a" : b > a ? "b" : "tie";
    const rowBg =
        leader === "a" ? COLOR_A_SOFT : leader === "b" ? COLOR_B_SOFT : "transparent";

    return (
        <div className="bls-lead-slider bls-neon-slider" style={{background: rowBg}}>
            <div className="bls-lead-slider-head">
                <span className="bls-lead-winner-slot">
                    {leader === "a" && (
                        <Badge pill className="bls-neon-badge-a" style={{background: COLOR_A, color: "#fff", fontWeight: 700}}>
                            {nameA} leads
                        </Badge>
                    )}
                </span>
                <span className="bls-lead-slider-label">{label}</span>
                <span className="bls-lead-winner-slot bls-lead-winner-slot-right">
                    {leader === "b" && (
                        <Badge pill className="bls-neon-badge-b" style={{background: COLOR_B, color: "#041018", fontWeight: 700}}>
                            {nameB} leads
                        </Badge>
                    )}
                    {leader === "tie" && (
                        <Badge bg="secondary" pill>Tie</Badge>
                    )}
                </span>
            </div>
            <div className="bls-lead-slider-values">
                <span style={{color: COLOR_A}}>{format(valueA)}</span>
                <span style={{color: COLOR_B}}>{format(valueB)}</span>
            </div>
            <div className="bls-lead-track bls-neon-track" role="img" aria-label={`${label}: ${format(valueA)} vs ${format(valueB)}`}>
                <div className="bls-lead-fill" style={{width: `${pctA}%`, background: COLOR_A, opacity: leader === "b" ? 0.4 : 1, boxShadow: leader === "a" ? COLOR_A_GLOW : undefined}} />
                <div className="bls-lead-fill" style={{width: `${pctB}%`, background: COLOR_B, opacity: leader === "a" ? 0.4 : 1, boxShadow: leader === "b" ? COLOR_B_GLOW : undefined}} />
                <div className="bls-lead-center" aria-hidden />
            </div>
            <div className="bls-lead-slider-foot">
                <span style={{color: COLOR_A}}>{nameA}</span>
                <span style={{color: COLOR_B}}>{nameB}</span>
            </div>
        </div>
    );
};

const PlayerCareerFetch: FC<{playerId: string; children: (d: AggregatedPlayerData | null, loading: boolean) => ReactNode}> = ({
    playerId,
    children,
}) => {
    const fetcher = useCallback(() => aggregatePlayerData(playerId), [playerId]);
    const {data, isLoading} = useCachedFetcher<AggregatedPlayerData>(
        fetcher,
        PLAYER_DETAIL_CACHE_CATEGORY,
        playerId
    );
    return <>{children(data ?? null, isLoading)}</>;
};

const CareerPair: FC<{
    idA: string;
    idB: string;
    children: (a: StatBag | null, b: StatBag | null, loading: boolean) => ReactNode;
}> = ({idA, idB, children}) => {
    return (
        <PlayerCareerFetch playerId={idA}>
            {(dataA, loadA) => (
                <PlayerCareerFetch playerId={idB}>
                    {(dataB, loadB) =>
                        children(
                            dataA ? bagFromCareer(dataA.careerStats) : null,
                            dataB ? bagFromCareer(dataB.careerStats) : null,
                            loadA || loadB
                        )
                    }
                </PlayerCareerFetch>
            )}
        </PlayerCareerFetch>
    );
};

const PlayerCompare: FC = () => {
    const listFetcher = useCallback(buildFullPlayerList, []);
    const {data, isLoading, error} = useCachedFetcher<PlayerListEntry[]>(
        listFetcher,
        PLAYER_INDEX_CACHE_CATEGORY
    );

    const [mode, setMode] = useState<Mode>("career");
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
        return [...map.entries()]
            .map(([id, name]) => ({id, name}))
            .sort((x, y) => x.name.localeCompare(y.name));
    }, [data, season]);

    const eligible = useMemo(() => {
        if (!data) return [] as PlayerListEntry[];
        return data
            .filter((p) => num(scopeListEntry(p, mode, season, leagueId).games) > 0)
            .sort((x, y) => x.name.localeCompare(y.name));
    }, [data, mode, season, leagueId]);

    const aEntry = eligible.find((p) => p.id === idA);
    const bEntry = eligible.find((p) => p.id === idB);
    const listBagA = aEntry ? scopeListEntry(aEntry, mode, season, leagueId) : null;
    const listBagB = bEntry ? scopeListEntry(bEntry, mode, season, leagueId) : null;

    const scopeLabel = useMemo(() => {
        if (mode === "career") return "Career — all seasons & leagues";
        const parts: string[] = [];
        if (season) parts.push(season);
        if (leagueId) {
            const lg = leagues.find((l) => l.id === leagueId);
            parts.push(lg?.name ?? leagueId);
        }
        return parts.length ? parts.join(" · ") : "Pick a season to compare";
    }, [mode, season, leagueId, leagues]);

    const statList = mode === "career" ? [...CORE_STATS, ...CAREER_EXTRA] : CORE_STATS;

    const CompareBody: FC<{bagA: StatBag; bagB: StatBag; nameA: string; nameB: string}> = ({
        bagA, bagB, nameA, nameB,
    }) => {
        let scoreA = 0;
        let scoreB = 0;
        for (const s of statList) {
            const av = num(bagA[s.key]);
            const bv = num(bagB[s.key]);
            if (av > bv) scoreA++;
            else if (bv > av) scoreB++;
        }
        return (
            <>
                <Row className="g-3 mb-3">
                    <Col md={6}>
                        <Card className="bls-profile-card h-100 bls-neon-card-a" style={{borderColor: COLOR_A, boxShadow: `0 0 18px ${COLOR_A}55`}}>
                            <CardHeader className="d-flex justify-content-between align-items-center">
                                <span style={{color: COLOR_A, fontWeight: 700}}>{nameA}</span>
                                <Badge pill style={{background: scoreA >= scoreB ? COLOR_A : "#3a3a3c", color: "#fff"}}>{scoreA} leads</Badge>
                            </CardHeader>
                            <CardBody>
                                <div className="bls-kpi-big" style={{fontSize: "2.25rem", color: COLOR_A}}>
                                    {bagA.average != null ? numberFormat.format(bagA.average) : "—"}
                                </div>
                                <div className="bls-kpi-big-label">Average in scope</div>
                            </CardBody>
                        </Card>
                    </Col>
                    <Col md={6}>
                        <Card className="bls-profile-card h-100 bls-neon-card-b" style={{borderColor: COLOR_B, boxShadow: `0 0 18px ${COLOR_B}55`}}>
                            <CardHeader className="d-flex justify-content-between align-items-center">
                                <span style={{color: COLOR_B, fontWeight: 700}}>{nameB}</span>
                                <Badge pill style={{background: scoreB >= scoreA ? COLOR_B : "#3a3a3c", color: scoreB >= scoreA ? "#041018" : "#fff"}}>{scoreB} leads</Badge>
                            </CardHeader>
                            <CardBody>
                                <div className="bls-kpi-big" style={{fontSize: "2.25rem", color: COLOR_B}}>
                                    {bagB.average != null ? numberFormat.format(bagB.average) : "—"}
                                </div>
                                <div className="bls-kpi-big-label">Average in scope</div>
                            </CardBody>
                        </Card>
                    </Col>
                </Row>
                <Card className="bls-profile-card mb-3 bls-neon-panel">
                    <div className="bls-profile-card-head">Stat leads</div>
                    <CardBody className="d-flex flex-column gap-3">
                        {statList.map((s) => (
                            <LeadSlider
                                key={s.key}
                                label={s.label}
                                valueA={bagA[s.key] ?? null}
                                valueB={bagB[s.key] ?? null}
                                format={s.format}
                                nameA={nameA}
                                nameB={nameB}
                            />
                        ))}
                    </CardBody>
                </Card>
            </>
        );
    };

    return (
        <div className="bls-compare bls-neon-compare">
            <div className="bls-compare-hero mb-3">
                <span className="bls-hero-kicker">Head to head</span>
                <h1>Player Compare</h1>
                <p className="text-body-secondary mb-0">
                    Career vs career, or lock a season first — then optionally a league.
                </p>
            </div>
            {isLoading && <Loader />}
            {error != null && <ErrorDisplay message="Error loading players." error={error} />}
            {data && (
                <>
                    <Card className="bls-profile-card mb-3 bls-neon-panel">
                        <CardBody>
                            <Row className="g-3">
                                <Col xs={12}>
                                    <div className="bls-scope-pills" role="tablist" aria-label="Compare mode">
                                        <button type="button" className={`bls-scope-pill${mode === "career" ? " is-active" : ""}`} onClick={() => { setMode("career"); setSeason(""); setLeagueId(""); }}>
                                            <span className="bls-scope-pill-label">Careers</span>
                                            <span className="bls-scope-pill-sub">All seasons combined</span>
                                        </button>
                                        <button type="button" className={`bls-scope-pill${mode === "season" ? " is-active" : ""}`} onClick={() => setMode("season")}>
                                            <span className="bls-scope-pill-label">Season / league</span>
                                            <span className="bls-scope-pill-sub">Year required first</span>
                                        </button>
                                    </div>
                                </Col>
                                {mode === "season" && (
                                    <>
                                        <Col md={6} lg={3}>
                                            <Form.Label className="bls-meta-label">Season / year</Form.Label>
                                            <Form.Select value={season} onChange={(e) => { setSeason(e.target.value); setLeagueId(""); }} aria-label="Filter by season">
                                                <option value="">Select a season…</option>
                                                {seasons.map((s) => (<option key={s} value={s}>{s}</option>))}
                                            </Form.Select>
                                        </Col>
                                        <Col md={6} lg={3}>
                                            <Form.Label className="bls-meta-label">League</Form.Label>
                                            <Form.Select value={leagueId} onChange={(e) => setLeagueId(e.target.value)} aria-label="Filter by league" disabled={!season} title={!season ? "Pick a season first" : undefined}>
                                                <option value="">{season ? "All leagues this season" : "Select a season first"}</option>
                                                {leagues.map((l) => (<option key={l.id} value={l.id}>{l.name}</option>))}
                                            </Form.Select>
                                        </Col>
                                    </>
                                )}
                                <Col md={6} lg={mode === "career" ? 6 : 3}>
                                    <Form.Label className="bls-meta-label" style={{color: COLOR_A}}>Player A</Form.Label>
                                    <Form.Select value={aEntry ? idA : ""} onChange={(e) => setIdA(e.target.value)} aria-label="Select player A" style={{borderColor: COLOR_A, boxShadow: `0 0 8px ${COLOR_A}55`}} disabled={mode === "season" && !season}>
                                        <option value="">Select bowler…</option>
                                        {eligible.map((p) => (<option key={p.id} value={p.id} disabled={p.id === idB}>{p.name}</option>))}
                                    </Form.Select>
                                </Col>
                                <Col md={6} lg={mode === "career" ? 6 : 3}>
                                    <Form.Label className="bls-meta-label" style={{color: COLOR_B}}>Player B</Form.Label>
                                    <Form.Select value={bEntry ? idB : ""} onChange={(e) => setIdB(e.target.value)} aria-label="Select player B" style={{borderColor: COLOR_B, boxShadow: `0 0 8px ${COLOR_B}55`}} disabled={mode === "season" && !season}>
                                        <option value="">Select bowler…</option>
                                        {eligible.map((p) => (<option key={p.id} value={p.id} disabled={p.id === idA}>{p.name}</option>))}
                                    </Form.Select>
                                </Col>
                            </Row>
                            <div className="fs-xs text-body-secondary mt-2">{scopeLabel}</div>
                        </CardBody>
                    </Card>
                    {mode === "season" && !season && (
                        <Card className="bls-profile-card"><CardBody className="text-body-secondary text-center py-5">Choose a season before picking a league or bowlers.</CardBody></Card>
                    )}
                    {aEntry && bEntry && mode === "career" && (
                        <CareerPair idA={aEntry.id} idB={bEntry.id}>
                            {(bagA, bagB, loading) =>
                                loading ? <Loader /> : bagA && bagB ? (
                                    <CompareBody bagA={bagA} bagB={bagB} nameA={aEntry.name} nameB={bEntry.name} />
                                ) : listBagA && listBagB ? (
                                    <CompareBody bagA={listBagA} bagB={listBagB} nameA={aEntry.name} nameB={bEntry.name} />
                                ) : null
                            }
                        </CareerPair>
                    )}
                    {aEntry && bEntry && mode === "season" && season && listBagA && listBagB && (
                        <CompareBody bagA={listBagA} bagB={listBagB} nameA={aEntry.name} nameB={bEntry.name} />
                    )}
                    {mode === "career" && (!aEntry || !bEntry) && (
                        <Card className="bls-profile-card"><CardBody className="text-body-secondary text-center py-5">Select two different bowlers to unlock the comparison.</CardBody></Card>
                    )}
                    {mode === "season" && season && (!aEntry || !bEntry) && (
                        <Card className="bls-profile-card"><CardBody className="text-body-secondary text-center py-5">{eligible.length < 2 ? "Not enough bowlers in this season/league. Try widening the scope." : "Select two different bowlers to unlock the comparison."}</CardBody></Card>
                    )}
                </>
            )}
        </div>
    );
};

export default PlayerCompare;
