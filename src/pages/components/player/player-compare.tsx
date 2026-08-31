/*
 * Player comparison — filters + tug-of-war slider leads © 2026
 */

import {type FC, useCallback, useMemo, useState} from "react";
import {
    Badge,
    Card,
    CardBody,
    CardHeader,
    Col,
    Form,
    Row,
} from "react-bootstrap";

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

const numberFormat = Intl.NumberFormat("en-US", {
    style: "decimal",
    maximumFractionDigits: 1,
});

const COLOR_A = "#2997ff";
const COLOR_B = "#ff9f0a";
const COLOR_A_SOFT = "rgba(41, 151, 255, 0.14)";
const COLOR_B_SOFT = "rgba(255, 159, 10, 0.14)";

interface StatDef {
    key: "average" | "games" | "pinfall" | "highGame" | "highSeries" | "games200";
    label: string;
    format: (v: number | null | undefined) => string;
}

const STATS: StatDef[] = [
    {
        key: "average",
        label: "Average",
        format: (v) => (v != null ? numberFormat.format(v) : "—"),
    },
    {key: "games", label: "Games", format: (v) => (v != null ? String(v) : "—")},
    {key: "pinfall", label: "Pinfall", format: (v) => (v != null ? String(v) : "—")},
    {key: "highGame", label: "High game", format: (v) => (v != null ? String(v) : "—")},
    {key: "highSeries", label: "High series", format: (v) => (v != null ? String(v) : "—")},
    {key: "games200", label: "200+ games", format: (v) => (v != null ? String(v) : "—")},
];

interface ScopedStats {
    average: number | null;
    games: number;
    pinfall: number;
    highGame: number;
    highSeries: number;
    games200: number;
}

function num(v: number | null | undefined): number {
    return v == null || Number.isNaN(v) ? 0 : v;
}

function mergeAppearanceSlices(slices: PlayerAppearanceSlice[]): ScopedStats {
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
        games,
        pinfall,
        highGame,
        highSeries,
        games200,
        average: games > 0 ? weighted / games : null,
    };
}

function mergeSeasonSlices(slices: PlayerListSeasonSlice[]): ScopedStats {
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
        games,
        pinfall,
        highGame,
        highSeries,
        games200,
        average: games > 0 ? weighted / games : null,
    };
}

function scopePlayer(
    entry: PlayerListEntry,
    season: string,
    leagueId: string
): ScopedStats {
    const apps = entry.appearanceSlices ?? [];
    if (leagueId && season) {
        return mergeAppearanceSlices(
            apps.filter((a) => a.leagueId === leagueId && a.season === season)
        );
    }
    if (leagueId) {
        return mergeAppearanceSlices(apps.filter((a) => a.leagueId === leagueId));
    }
    if (season) {
        const seasonSlices = (entry.seasonSlices ?? []).filter((s) => s.season === season);
        if (seasonSlices.length > 0) return mergeSeasonSlices(seasonSlices);
        return mergeAppearanceSlices(apps.filter((a) => a.season === season));
    }
    return {
        average: entry.average,
        games: entry.games,
        pinfall: entry.pinfall,
        highGame: entry.highGame,
        highSeries: entry.highSeries,
        games200: entry.games200,
    };
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
        <div className="bls-lead-slider" style={{background: rowBg}}>
            <div className="bls-lead-slider-head">
                <span className="bls-lead-slider-label">{label}</span>
                {leader !== "tie" && (
                    <Badge
                        pill
                        style={{
                            background: leader === "a" ? COLOR_A : COLOR_B,
                            color: "#0a0a0a",
                            fontWeight: 700,
                        }}
                    >
                        {leader === "a" ? nameA : nameB} leads
                    </Badge>
                )}
                {leader === "tie" && (
                    <Badge bg="secondary" pill>
                        Tie
                    </Badge>
                )}
            </div>
            <div className="bls-lead-slider-values">
                <span className="bls-lead-val bls-lead-val-a" style={{color: COLOR_A}}>
                    {format(valueA)}
                </span>
                <span className="bls-lead-val bls-lead-val-b" style={{color: COLOR_B}}>
                    {format(valueB)}
                </span>
            </div>
            <div
                className="bls-lead-track"
                role="img"
                aria-label={`${label}: ${format(valueA)} vs ${format(valueB)}`}
            >
                <div
                    className="bls-lead-fill bls-lead-fill-a"
                    style={{
                        width: `${pctA}%`,
                        background: COLOR_A,
                        opacity: leader === "b" ? 0.45 : 1,
                        boxShadow: leader === "a" ? `0 0 12px ${COLOR_A}` : undefined,
                    }}
                />
                <div
                    className="bls-lead-fill bls-lead-fill-b"
                    style={{
                        width: `${pctB}%`,
                        background: COLOR_B,
                        opacity: leader === "a" ? 0.45 : 1,
                        boxShadow: leader === "b" ? `0 0 12px ${COLOR_B}` : undefined,
                    }}
                />
                <div className="bls-lead-center" aria-hidden />
            </div>
            <div className="bls-lead-slider-foot">
                <span style={{color: COLOR_A}}>{nameA}</span>
                <span style={{color: COLOR_B}}>{nameB}</span>
            </div>
        </div>
    );
};

const PlayerCompare: FC = () => {
    const fetcher = useCallback(buildFullPlayerList, []);
    const {data, isLoading, error} = useCachedFetcher<PlayerListEntry[]>(
        fetcher,
        PLAYER_INDEX_CACHE_CATEGORY
    );

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
        if (!data) return [] as {id: string; name: string}[];
        const map = new Map<string, string>();
        for (const p of data) {
            for (const a of p.appearanceSlices ?? []) {
                if (!a.leagueId) continue;
                if (season && a.season !== season) continue;
                if (!map.has(a.leagueId)) map.set(a.leagueId, a.leagueName || a.leagueId);
            }
        }
        return [...map.entries()]
            .map(([id, name]) => ({id, name}))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [data, season]);

    const eligible = useMemo(() => {
        if (!data) return [] as PlayerListEntry[];
        return data
            .filter((p) => {
                const s = scopePlayer(p, season, leagueId);
                return s.games > 0 || (!season && !leagueId && p.games > 0);
            })
            .sort((x, y) => x.name.localeCompare(y.name));
    }, [data, season, leagueId]);

    const aEntry = eligible.find((p) => p.id === idA);
    const bEntry = eligible.find((p) => p.id === idB);

    const statsA = aEntry ? scopePlayer(aEntry, season, leagueId) : null;
    const statsB = bEntry ? scopePlayer(bEntry, season, leagueId) : null;

    const leads = useMemo(() => {
        if (!statsA || !statsB) return null;
        let scoreA = 0;
        let scoreB = 0;
        for (const s of STATS) {
            const av = num(statsA[s.key]);
            const bv = num(statsB[s.key]);
            if (av > bv) scoreA++;
            else if (bv > av) scoreB++;
        }
        return {scoreA, scoreB};
    }, [statsA, statsB]);

    const scopeLabel = useMemo(() => {
        const parts: string[] = [];
        if (season) parts.push(season);
        if (leagueId) {
            const lg = leagues.find((l) => l.id === leagueId);
            parts.push(lg?.name ?? leagueId);
        }
        return parts.length ? parts.join(" · ") : "Career (all leagues & seasons)";
    }, [season, leagueId, leagues]);

    return (
        <div className="bls-compare">
            <div className="bls-compare-hero mb-3">
                <span className="bls-hero-kicker">Head to head</span>
                <h1>Player Compare</h1>
                <p className="text-body-secondary mb-0">
                    Filter by season or league, pick two bowlers, and see who leads each stat.
                </p>
            </div>

            {isLoading && <Loader />}
            {error != null && (
                <ErrorDisplay message="Error loading players." error={error} />
            )}

            {data && (
                <>
                    <Card className="bls-profile-card mb-3">
                        <CardBody>
                            <Row className="g-3">
                                <Col md={6} lg={3}>
                                    <Form.Label className="bls-meta-label">Season / year</Form.Label>
                                    <Form.Select
                                        value={season}
                                        onChange={(e) => {
                                            setSeason(e.target.value);
                                            setLeagueId("");
                                        }}
                                        aria-label="Filter by season"
                                    >
                                        <option value="">All seasons (career)</option>
                                        {seasons.map((s) => (
                                            <option key={s} value={s}>
                                                {s}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Col>
                                <Col md={6} lg={3}>
                                    <Form.Label className="bls-meta-label">League</Form.Label>
                                    <Form.Select
                                        value={leagueId}
                                        onChange={(e) => setLeagueId(e.target.value)}
                                        aria-label="Filter by league"
                                    >
                                        <option value="">All leagues</option>
                                        {leagues.map((l) => (
                                            <option key={l.id} value={l.id}>
                                                {l.name}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Col>
                                <Col md={6} lg={3}>
                                    <Form.Label className="bls-meta-label" style={{color: COLOR_A}}>
                                        Player A
                                    </Form.Label>
                                    <Form.Select
                                        value={aEntry ? idA : ""}
                                        onChange={(e) => setIdA(e.target.value)}
                                        aria-label="Select player A"
                                        style={{borderColor: COLOR_A}}
                                    >
                                        <option value="">Select bowler…</option>
                                        {eligible.map((p) => (
                                            <option key={p.id} value={p.id} disabled={p.id === idB}>
                                                {p.name}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Col>
                                <Col md={6} lg={3}>
                                    <Form.Label className="bls-meta-label" style={{color: COLOR_B}}>
                                        Player B
                                    </Form.Label>
                                    <Form.Select
                                        value={bEntry ? idB : ""}
                                        onChange={(e) => setIdB(e.target.value)}
                                        aria-label="Select player B"
                                        style={{borderColor: COLOR_B}}
                                    >
                                        <option value="">Select bowler…</option>
                                        {eligible.map((p) => (
                                            <option key={p.id} value={p.id} disabled={p.id === idA}>
                                                {p.name}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Col>
                            </Row>
                            <div className="fs-xs text-body-secondary mt-2">{scopeLabel}</div>
                        </CardBody>
                    </Card>

                    {aEntry && bEntry && statsA && statsB && leads && (
                        <>
                            <Row className="g-3 mb-3">
                                <Col md={6}>
                                    <Card
                                        className="bls-profile-card h-100 bls-compare-card"
                                        style={{
                                            borderColor: COLOR_A,
                                            boxShadow: `0 0 0 1px ${COLOR_A}33`,
                                        }}
                                    >
                                        <CardHeader className="d-flex justify-content-between align-items-center">
                                            <span style={{color: COLOR_A, fontWeight: 700}}>
                                                {aEntry.name}
                                            </span>
                                            <Badge
                                                pill
                                                style={{
                                                    background:
                                                        leads.scoreA >= leads.scoreB
                                                            ? COLOR_A
                                                            : "#6e6e73",
                                                    color: "#0a0a0a",
                                                }}
                                            >
                                                {leads.scoreA} leads
                                            </Badge>
                                        </CardHeader>
                                        <CardBody>
                                            <div
                                                className="bls-kpi-big"
                                                style={{fontSize: "2.25rem", color: COLOR_A}}
                                            >
                                                {statsA.average != null
                                                    ? numberFormat.format(statsA.average)
                                                    : "—"}
                                            </div>
                                            <div className="bls-kpi-big-label">Average in scope</div>
                                        </CardBody>
                                    </Card>
                                </Col>
                                <Col md={6}>
                                    <Card
                                        className="bls-profile-card h-100 bls-compare-card"
                                        style={{
                                            borderColor: COLOR_B,
                                            boxShadow: `0 0 0 1px ${COLOR_B}33`,
                                        }}
                                    >
                                        <CardHeader className="d-flex justify-content-between align-items-center">
                                            <span style={{color: COLOR_B, fontWeight: 700}}>
                                                {bEntry.name}
                                            </span>
                                            <Badge
                                                pill
                                                style={{
                                                    background:
                                                        leads.scoreB >= leads.scoreA
                                                            ? COLOR_B
                                                            : "#6e6e73",
                                                    color: "#0a0a0a",
                                                }}
                                            >
                                                {leads.scoreB} leads
                                            </Badge>
                                        </CardHeader>
                                        <CardBody>
                                            <div
                                                className="bls-kpi-big"
                                                style={{fontSize: "2.25rem", color: COLOR_B}}
                                            >
                                                {statsB.average != null
                                                    ? numberFormat.format(statsB.average)
                                                    : "—"}
                                            </div>
                                            <div className="bls-kpi-big-label">Average in scope</div>
                                        </CardBody>
                                    </Card>
                                </Col>
                            </Row>

                            <Card className="bls-profile-card mb-3">
                                <div className="bls-profile-card-head">Stat leads</div>
                                <CardBody className="d-flex flex-column gap-3">
                                    {STATS.map((s) => (
                                        <LeadSlider
                                            key={s.key}
                                            label={s.label}
                                            valueA={statsA[s.key]}
                                            valueB={statsB[s.key]}
                                            format={s.format}
                                            nameA={aEntry.name}
                                            nameB={bEntry.name}
                                        />
                                    ))}
                                </CardBody>
                            </Card>
                        </>
                    )}

                    {(!aEntry || !bEntry) && (
                        <Card className="bls-profile-card">
                            <CardBody className="text-body-secondary text-center py-5">
                                {eligible.length < 2
                                    ? "Not enough bowlers in this season/league filter. Try widening the scope."
                                    : "Select two different bowlers to unlock the comparison."}
                            </CardBody>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
};

export default PlayerCompare;
