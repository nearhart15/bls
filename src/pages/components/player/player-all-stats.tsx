/*
 * Filterable all-stats panel © 2026
 */

import {type FC, useEffect, useMemo, useState} from "react";
import Chart from "react-apexcharts";
import type {ApexOptions} from "apexcharts";
import {Card, CardBody} from "react-bootstrap";

import type {
    PlayerLeagueAppearance,
    PlayerSliceStats,
} from "../../../data/player/player-aggregate";
import {PlayerStats} from "../../../data/player/player-stats";
import type {LeaguePlayerStats} from "../../../data/league/league-team-details";
import {FullStatsGrid} from "./player-detail-tables";
import {useTheme} from "../theme";
import {chartPalette} from "../charts/chart-theme";

function pct(rg: {numerator: number; denominator: number; pct: number}): number {
    if (rg.denominator <= 0) return 0;
    const raw = rg.pct > 1 ? rg.pct : rg.pct * 100;
    return Math.round(Math.max(0, Math.min(100, raw)) * 10) / 10;
}

function firstBallPct(n: number): number {
    if (!n) return 0;
    return Math.round(Math.max(0, Math.min(100, (n / 10) * 100)) * 10) / 10;
}

function useIsNarrow(maxWidth = 767): boolean {
    const [narrow, setNarrow] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia(`(max-width: ${maxWidth}px)`);
        const apply = () => setNarrow(mq.matches);
        apply();
        mq.addEventListener("change", apply);
        return () => mq.removeEventListener("change", apply);
    }, [maxWidth]);
    return narrow;
}

const ConversionRadar: FC<{stats: PlayerStats}> = ({stats}) => {
    const {theme} = useTheme();
    const palette = chartPalette(theme);
    const narrow = useIsNarrow();
    const strike = pct(stats.strikes);
    const spare = pct(stats.spares);
    const pickup = pct(stats.singlePinSpares);
    const splitConv = pct(stats.splits);
    const closed = Math.round((100 - pct(stats.opens)) * 10) / 10;
    const firstBall = firstBallPct(stats.firstBallAverage);
    const displayVals = [
        `${strike}%`,
        `${spare}%`,
        `${pickup}%`,
        `${splitConv}%`,
        `${closed}%`,
        `${(stats.firstBallAverage || 0).toFixed(1)} pins`,
    ];
    const labels = ["Strike %", "Spare %", "Pickup %", "Split conv %", "Closed %", "First ball"];
    const categories = narrow
        ? labels
        : labels.map((label, i) => `${displayVals[i]} ${label}`);
    const options: ApexOptions = {
        chart: {type: "radar", background: "transparent", toolbar: {show: false}, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', parentHeightOffset: 0},
        theme: {mode: theme},
        colors: ["#ffd60a"],
        fill: {opacity: 0.22},
        stroke: {width: 3, colors: ["#ffd60a"]},
        markers: {size: narrow ? 4 : 5, colors: ["#ffd60a"], strokeColors: theme === "dark" ? "#0a0a0a" : "#fff", strokeWidth: 2},
        xaxis: {categories, labels: {show: true, style: {colors: Array(categories.length).fill("#ffd60a"), fontSize: narrow ? "10px" : "12px", fontWeight: 700}}},
        yaxis: {show: false, min: 0, max: 100, tickAmount: 4},
        plotOptions: {
            radar: {
                size: narrow ? 100 : 130, offsetX: 0, offsetY: 0,
                polygons: {
                    strokeColors: palette.grid, connectorColors: palette.grid,
                    fill: {colors: theme === "dark" ? ["#0a0a0a", "#111111"] : ["#ffffff", "#f5f5f7"]},
                },
            },
        },
        legend: {show: false},
        tooltip: {theme, y: {formatter: (_v, opts) => displayVals[opts?.dataPointIndex ?? 0] ?? String(_v)}},
    };
    return (
        <div className="bls-allstats-group">
            <div className="bls-allstats-group-head">Conversion</div>
            <div className="bls-radar-wrap">
                <Chart key={`conv-${narrow ? "sm" : "lg"}-v2`} options={options} series={[{name: "Conversion", data: [strike, spare, pickup, splitConv, closed, firstBall]}]} type="radar" height={narrow ? 280 : 360} width="100%" />
            </div>
        </div>
    );
};

const FramePinfallChart: FC<{stats: PlayerStats}> = ({stats}) => {
    const {theme} = useTheme();
    const palette = chartPalette(theme);
    const narrow = useIsNarrow();
    const values = (stats.framePinfallAvg ?? []).slice(0, 10);
    if (values.every((v) => !v)) return null;
    const minVal = Math.min(...values.filter((v) => v > 0));
    const colors = values.map((v) => (v === minVal ? "#ff453a" : "#ffd60a"));
    const options: ApexOptions = {
        chart: {type: "bar", background: "transparent", toolbar: {show: false}, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'},
        theme: {mode: theme},
        plotOptions: {bar: {columnWidth: "55%", borderRadius: 6, distributed: true}},
        colors,
        dataLabels: {
            enabled: true,
            formatter: (v) => Number(v).toFixed(1),
            style: {fontSize: narrow ? "10px" : "11px", colors: [theme === "dark" ? "#fff" : "#111"]},
        },
        legend: {show: false},
        grid: {borderColor: palette.grid, strokeDashArray: 3},
        xaxis: {
            categories: values.map((_, i) => `F${i + 1}`),
            labels: {style: {colors: palette.text, fontSize: "11px", fontWeight: 600}},
        },
        yaxis: {
            min: 0,
            max: 30,
            tickAmount: 6,
            labels: {style: {colors: palette.text, fontSize: "11px"}, formatter: (v) => v.toFixed(0)},
        },
        tooltip: {theme, y: {formatter: (v) => `${Number(v).toFixed(2)} pins`}},
    };
    return (
        <div className="bls-allstats-group">
            <div className="bls-allstats-group-head">Avg pinfall by frame</div>
            <p className="text-body-secondary fs-sm mb-2">Lowest frame is highlighted. Values include strike and spare bonuses credited to that frame.</p>
            <Chart key={`frame-pf-${narrow ? "sm" : "lg"}`} options={options} series={[{name: "Avg pins", data: values.map((v) => Math.round(v * 10) / 10)}]} type="bar" height={narrow ? 220 : 280} width="100%" />
        </div>
    );
};

function mergeStats(list: PlayerStats[]): PlayerStats {
    const out = new PlayerStats();
    if (list.length === 0) return out;
    if (list.length === 1) return list[0];
    let games = 0, pinfall = 0, firstBallW = 0, singlePinW = 0, tenthMarksW = 0;
    const streak = new Map<number, number>();
    const gameAvgW: number[] = [];
    const gameAvgN: number[] = [];
    const frameW: number[] = [];
    const frameNAcc: number[] = [];
    const paceFW = [0, 0, 0, 0];
    const paceBW = [0, 0, 0, 0];
    const paceN = [0, 0, 0, 0];
    for (const s of list) {
        const g = s.gameStats.count || 0;
        games += g;
        pinfall += s.pinfall || 0;
        out.cleanGames += s.cleanGames || 0;
        out.hungCount += s.hungCount || 0;
        out.turkeyCount += s.turkeyCount || 0;
        out.games200 += s.games200 || 0;
        out.games300 += s.games300 || 0;
        out.series600 += s.series600 || 0;
        out.series800 += s.series800 || 0;
        out.gameStats.count += s.gameStats.count || 0;
        out.seriesStats.count += s.seriesStats.count || 0;
        out.gameStats.max = Math.max(out.gameStats.max || 0, s.gameStats.max || 0);
        out.seriesStats.max = Math.max(out.seriesStats.max || 0, s.seriesStats.max || 0);
        if (s.gameStats.min > 0) out.gameStats.min = out.gameStats.min > 0 ? Math.min(out.gameStats.min, s.gameStats.min) : s.gameStats.min;
        if (s.seriesStats.min > 0) out.seriesStats.min = out.seriesStats.min > 0 ? Math.min(out.seriesStats.min, s.seriesStats.min) : s.seriesStats.min;
        out.strikes.numerator += s.strikes.numerator;
        out.strikes.denominator += s.strikes.denominator;
        out.spares.numerator += s.spares.numerator;
        out.spares.denominator += s.spares.denominator;
        out.singlePinSpares.numerator += s.singlePinSpares.numerator;
        out.singlePinSpares.denominator += s.singlePinSpares.denominator;
        out.opens.numerator += s.opens.numerator;
        out.opens.denominator += s.opens.denominator;
        out.splits.numerator += s.splits.numerator;
        out.splits.denominator += s.splits.denominator;
        out.strikesToSpares.numerator += s.strikesToSpares.numerator;
        out.strikesToSpares.denominator += s.strikesToSpares.denominator;
        if (g > 0) {
            firstBallW += (s.firstBallAverage || 0) * g;
            singlePinW += (s.allSinglePinsPickedUpAverage || 0) * g;
        }
        out.incompleteFrameData = out.incompleteFrameData || s.incompleteFrameData;
        for (const [len, count] of s.strikesInARow ?? []) streak.set(len, (streak.get(len) ?? 0) + count);
        (s.gameAverages ?? []).forEach((ga, i) => {
            if (!ga) return;
            const seriesN = s.seriesStats.count || 1;
            gameAvgW[i] = (gameAvgW[i] ?? 0) + ga * seriesN;
            gameAvgN[i] = (gameAvgN[i] ?? 0) + seriesN;
        });
        out.splitsOccurred.numerator += s.splitsOccurred?.numerator ?? 0;
        out.splitsOccurred.denominator += s.splitsOccurred?.denominator ?? 0;
        out.tenthMarkGames += s.tenthMarkGames || 0;
        tenthMarksW += (s.avgTenthMarks || 0) * (s.tenthMarkGames || 0);
        const frameN = s.framePinfallN ?? [];
        const frameAvg = s.framePinfallAvg ?? [];
        for (let i = 0; i < 10; i++) {
            const n = frameN[i] || 0;
            if (!n) continue;
            frameW[i] = (frameW[i] ?? 0) + (frameAvg[i] || 0) * n;
            frameNAcc[i] = (frameNAcc[i] ?? 0) + n;
        }
        for (let i = 0; i < 4; i++) {
            const n = s.paceN?.[i] || 0;
            if (!n) continue;
            paceFW[i] += (s.paceAvgFrames?.[i] || 0) * n;
            paceBW[i] += (s.paceAvgBalls?.[i] || 0) * n;
            paceN[i] += n;
        }
    }
    out.pinfall = pinfall;
    out.gameStats.average = games > 0 ? pinfall / games : 0;
    let seriesWeighted = 0, seriesCount = 0;
    for (const s of list) {
        if (s.seriesStats.count > 0 && s.seriesStats.average > 0) {
            seriesWeighted += s.seriesStats.average * s.seriesStats.count;
            seriesCount += s.seriesStats.count;
        }
    }
    out.seriesStats.average = seriesCount > 0 ? seriesWeighted / seriesCount : 0;
    out.firstBallAverage = games > 0 ? firstBallW / games : 0;
    out.allSinglePinsPickedUpAverage = games > 0 ? singlePinW / games : 0;
    const ratio = (n: number, d: number) => (d === 0 ? 0 : n / d);
    out.strikes.pct = ratio(out.strikes.numerator, out.strikes.denominator);
    out.spares.pct = ratio(out.spares.numerator, out.spares.denominator);
    out.singlePinSpares.pct = ratio(out.singlePinSpares.numerator, out.singlePinSpares.denominator);
    out.opens.pct = ratio(out.opens.numerator, out.opens.denominator);
    out.splits.pct = ratio(out.splits.numerator, out.splits.denominator);
    out.strikesToSpares.pct = ratio(out.strikesToSpares.numerator, out.strikesToSpares.denominator);
    out.strikesInARow = [...streak.entries()].sort((a, b) => a[0] - b[0]);
    out.gameAverages = gameAvgW.map((sum, i) => (gameAvgN[i] ? sum / gameAvgN[i] : 0));
    const frameCount = frameNAcc.reduce((s, n) => s + (n || 0), 0);
    const framePinSum = frameW.reduce((s, v) => s + (v || 0), 0);
    out.avgPinfallPerFrame = frameCount > 0 ? framePinSum / frameCount : 0;
    out.avgTenthMarks = out.tenthMarkGames > 0 ? tenthMarksW / out.tenthMarkGames : 0;
    out.splitsOccurred.pct = ratio(out.splitsOccurred.numerator, out.splitsOccurred.denominator);
    out.framePinfallAvg = Array.from({length: 10}, (_, i) => frameNAcc[i] ? frameW[i] / frameNAcc[i] : 0);
    out.framePinfallN = Array.from({length: 10}, (_, i) => frameNAcc[i] || 0);
    out.paceAvgFrames = paceN.map((n, i) => n ? paceFW[i] / n : 0);
    out.paceAvgBalls = paceN.map((n, i) => n ? paceBW[i] / n : 0);
    out.paceN = [...paceN];
    return out;
}

function seasonMatchesTimeframe(season: string, timeframe: string, lastYear: string): boolean {
    if (timeframe === "career") return true;
    if (timeframe === "last-year") return season.includes(lastYear);
    return season === timeframe;
}

export const AllStatsPanel: FC<{
    careerStats: PlayerStats;
    seasonSlicesFull: PlayerSliceStats[];
    appearanceSlicesFull: PlayerSliceStats[];
    appearances: PlayerLeagueAppearance[];
}> = ({careerStats, seasonSlicesFull, appearanceSlicesFull, appearances}) => {
    const seasons = [...new Set(seasonSlicesFull.map((s) => s.season).filter(Boolean) as string[])].sort((a, b) => b.localeCompare(a));
    const leagues = [...new Map(appearances.map((a) => [a.leagueId, a.leagueName])).entries()];
    const lastYear = String(new Date().getFullYear() - 1);
    const [timeframe, setTimeframe] = useState("career");
    const [leagueId, setLeagueId] = useState("all");

    const selected = useMemo(() => {
        const apps = appearanceSlicesFull.filter((s) =>
            seasonMatchesTimeframe(s.season ?? "", timeframe, lastYear)
            && (leagueId === "all" || s.leagueId === leagueId)
        );
        if (timeframe === "career" && leagueId === "all") {
            return {stats: careerStats, extras: undefined as LeaguePlayerStats | undefined, label: "Career"};
        }
        if (leagueId === "all" && timeframe !== "career" && timeframe !== "last-year") {
            const row = seasonSlicesFull.find((s) => s.season === timeframe);
            if (row) return {stats: row.stats, extras: undefined as LeaguePlayerStats | undefined, label: timeframe};
        }
        const stats = apps.length === 0 ? new PlayerStats() : mergeStats(apps.map((a) => a.stats));
        const bookCandidates = appearances
            .filter((a) => seasonMatchesTimeframe(a.season, timeframe, lastYear) && (leagueId === "all" || a.leagueId === leagueId))
            .sort((a, b) => b.season.localeCompare(a.season));
        const extras = bookCandidates.length === 1 ? bookCandidates[0].stats
            : (leagueId !== "all" ? bookCandidates[0]?.stats : undefined);
        const leagueName = leagueId === "all" ? "All leagues" : (leagues.find(([id]) => id === leagueId)?.[1] ?? "League");
        const timeLabel = timeframe === "career" ? "Career" : timeframe === "last-year" ? lastYear : timeframe;
        return {stats, extras, label: `${timeLabel} \u00b7 ${leagueName}`};
    }, [careerStats, seasonSlicesFull, appearanceSlicesFull, appearances, timeframe, leagueId, lastYear, leagues]);

    return (
        <Card className="bls-profile-card mb-3">
            <div className="bls-profile-card-head">All stats</div>
            <CardBody>
                <div className="bls-allstats-filters">
                    <label className="bls-allstats-filter">
                        <span>Timeframe</span>
                        <select className="form-select form-select-sm" value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
                            <option value="career">Career</option>
                            <option value="last-year">Last calendar year ({lastYear})</option>
                            {seasons.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </label>
                    <label className="bls-allstats-filter">
                        <span>League</span>
                        <select className="form-select form-select-sm" value={leagueId} onChange={(e) => setLeagueId(e.target.value)}>
                            <option value="all">All leagues</option>
                            {leagues.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                        </select>
                    </label>
                </div>
                <div className="text-body-secondary fs-sm mb-3">{selected.label}</div>
                {selected.stats.gameStats.count > 0
                    ? <>
                        <ConversionRadar stats={selected.stats} />
                        <FramePinfallChart stats={selected.stats} />
                        <FullStatsGrid stats={selected.stats} leagueExtras={selected.extras} />
                      </>
                    : <p className="text-body-secondary mb-0">No games for this timeframe / league.</p>}
            </CardBody>
        </Card>
    );
};

export default AllStatsPanel;
