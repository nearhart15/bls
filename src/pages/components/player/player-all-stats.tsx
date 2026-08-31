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

function mergeStats(list: PlayerStats[]): PlayerStats {
    const out = new PlayerStats();
    if (list.length === 0) return out;
    if (list.length === 1) return list[0];
    let games = 0, pinfall = 0, firstBallW = 0, singlePinW = 0;
    const streak = new Map<number, number>();
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
        const one = apps.length === 1 ? appearances.find((a) => a.season === apps[0].season && a.leagueId === apps[0].leagueId) : undefined;
        const leagueName = leagueId === "all" ? "All leagues" : (leagues.find(([id]) => id === leagueId)?.[1] ?? "League");
        const timeLabel = timeframe === "career" ? "Career" : timeframe === "last-year" ? lastYear : timeframe;
        return {stats, extras: one?.stats, label: `${timeLabel} · ${leagueName}`};
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
                        <FullStatsGrid stats={selected.stats} leagueExtras={selected.extras} hideGroups={["Conversion"]} />
                      </>
                    : <p className="text-body-secondary mb-0">No games for this timeframe / league.</p>}
            </CardBody>
        </Card>
    );
};

export default AllStatsPanel;
