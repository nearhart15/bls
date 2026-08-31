/*
 * Player profile — sports dashboard layout (radar, switcher, KPI rings) © 2026
 */

import {type FC, useEffect, useState} from "react";
import {Link} from "react-router";
import Chart from "react-apexcharts";
import type {ApexOptions} from "apexcharts";
import {Card, CardBody} from "react-bootstrap";

import type {
    AggregatedPlayerData,
    PlayerLeagueAppearance,
} from "../../../data/player/player-aggregate";
import type {PlayerStats} from "../../../data/player/player-stats";
import {useTheme} from "../theme";
import {chartPalette} from "../charts/chart-theme";
import {
    AppearancesPanel,
    SeasonBreakdownTable,
    PlayerSwitcher,
} from "./player-detail-tables";
import {AllStatsPanel} from "./player-all-stats";

const numberFormat = Intl.NumberFormat("en-US", {style: "decimal", maximumFractionDigits: 1});
const intFormat = Intl.NumberFormat("en-US", {style: "decimal", maximumFractionDigits: 0});

function pct(rg: {numerator: number; denominator: number; pct: number}): number {
    if (rg.denominator <= 0) return 0;
    return Math.round(rg.pct * 1000) / 10;
}

function avgScore(avg: number): number {
    return Math.max(0, Math.min(100, ((avg - 140) / 80) * 100));
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

interface RadialProps {
    label: string;
    value: number;
    display: string;
    max?: number;
    color: string;
}

const RadialStat: FC<RadialProps> = ({label, value, display, max = 100, color}) => {
    const {theme} = useTheme();
    const palette = chartPalette(theme);
    const pctVal = max > 0 ? Math.min(100, (value / max) * 100) : 0;
    const options: ApexOptions = {
        chart: {type: "radialBar", sparkline: {enabled: true}, background: "transparent"},
        plotOptions: {
            radialBar: {
                startAngle: -135, endAngle: 135, hollow: {size: "62%"},
                track: {background: theme === "dark" ? "#1a1a1a" : "#e8e8ed", strokeWidth: "100%"},
                dataLabels: {
                    name: {show: false},
                    value: {show: true, fontSize: "1.05rem", fontWeight: 700, color: palette.textStrong, offsetY: 6, formatter: () => display},
                },
            },
        },
        colors: [color],
        stroke: {lineCap: "round"},
        labels: [label],
    };
    return (
        <div className="bls-radial-stat">
            <Chart options={options} series={[pctVal]} type="radialBar" height={120} width={120} />
            <div className="bls-radial-label">{label}</div>
        </div>
    );
};

const CareerRadar: FC<{stats: PlayerStats}> = ({stats}) => {
    const {theme} = useTheme();
    const palette = chartPalette(theme);
    const narrow = useIsNarrow();
    const games = Math.max(1, stats.gameStats.count);
    const displayVals = [
        numberFormat.format(stats.gameStats.average),
        `${pct(stats.strikes)}%`,
        `${pct(stats.spares)}%`,
        String(stats.cleanGames),
        String(stats.hungCount),
        String(stats.turkeyCount),
        String(stats.games200),
    ];
    const categories = narrow
        ? ["Avg", "Strike %", "Spare %", "Clean", "Hung", "Turkey", "200+"]
        : [
              `${displayVals[0]} Average`,
              `${displayVals[1]} Strike %`,
              `${displayVals[2]} Spare %`,
              `${displayVals[3]} Clean Games`,
              `${displayVals[4]} Got Hung`,
              `${displayVals[5]} Turkeys`,
              `${displayVals[6]} 200+ Games`,
          ];
    const seriesVals = [
        avgScore(stats.gameStats.average),
        pct(stats.strikes),
        pct(stats.spares),
        Math.min(100, (stats.cleanGames / games) * 100),
        Math.min(100, (stats.hungCount / games) * 40),
        Math.min(100, (stats.turkeyCount / games) * 25),
        Math.min(100, (stats.games200 / games) * 100 * 3),
    ];
    const chartHeight = narrow ? 280 : 360;
    const labelSize = narrow ? "10px" : "12px";
    const options: ApexOptions = {
        chart: {type: "radar", background: "transparent", toolbar: {show: false}, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', parentHeightOffset: 0},
        theme: {mode: theme},
        colors: ["#ffd60a"],
        fill: {opacity: 0.2},
        stroke: {width: 3, colors: ["#ffd60a"]},
        markers: {size: narrow ? 4 : 5, colors: ["#ffd60a"], strokeColors: theme === "dark" ? "#0a0a0a" : "#fff", strokeWidth: 2},
        xaxis: {categories, labels: {show: true, style: {colors: Array(categories.length).fill("#ffd60a"), fontSize: labelSize, fontWeight: 700}}},
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
        <div className="bls-radar-wrap">
            <Chart key={narrow ? "radar-sm" : "radar-lg"} options={options} series={[{name: "Career", data: seriesVals}]} type="radar" height={chartHeight} width="100%" />
            <div className="bls-radar-callouts">
                <div><strong>{numberFormat.format(stats.gameStats.average)}</strong><span>Average</span></div>
                <div><strong>{stats.cleanGames}</strong><span>Clean Games</span></div>
                <div><strong>{stats.hungCount}</strong><span>Got Hung</span></div>
                <div><strong>{stats.turkeyCount}</strong><span>Turkeys</span></div>
                <div><strong>{stats.games200}</strong><span>200+ Games</span></div>
                <div><strong>{intFormat.format(stats.pinfall)}</strong><span>Pinfall</span></div>
            </div>
        </div>
    );
};

const LeagueTrendChart: FC<{appearances: PlayerLeagueAppearance[]}> = ({appearances}) => {
    const {theme} = useTheme();
    const palette = chartPalette(theme);
    const ordered = [...appearances]
        .filter((a) => (a.stats?.gameStats.count ?? 0) > 0)
        .sort((a, b) => a.season.localeCompare(b.season) || a.leagueName.localeCompare(b.leagueName));
    if (ordered.length < 1) return null;
    const nameCounts = new Map<string, number>();
    for (const a of ordered) nameCounts.set(a.leagueName, (nameCounts.get(a.leagueName) ?? 0) + 1);
    const labels = ordered.map((a) => nameCounts.get(a.leagueName)! > 1 ? `${a.leagueName} (${a.season})` : a.leagueName);
    const options: ApexOptions = {
        chart: {type: "area", background: "transparent", toolbar: {show: false}, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'},
        theme: {mode: theme},
        colors: [palette.series[0], palette.series[2]],
        dataLabels: {enabled: false},
        stroke: {curve: "smooth", width: 3},
        fill: {type: "gradient", gradient: {shadeIntensity: 0.4, opacityFrom: 0.45, opacityTo: 0.05}},
        grid: {borderColor: palette.grid, strokeDashArray: 3},
        xaxis: {categories: labels, labels: {show: false}, axisBorder: {show: false}, axisTicks: {show: false}},
        yaxis: [
            {title: {text: "Average", style: {color: palette.series[0], fontSize: "11px"}}, labels: {style: {colors: palette.text, fontSize: "11px"}, formatter: (v) => Math.round(v).toString()}},
            {opposite: true, title: {text: "Games", style: {color: palette.series[2], fontSize: "11px"}}, labels: {style: {colors: palette.text, fontSize: "11px"}, formatter: (v) => Math.round(v).toString()}},
        ],
        legend: {position: "top", horizontalAlign: "right", labels: {colors: palette.text}},
        tooltip: {theme},
    };
    return (
        <Chart options={options} series={[
            {name: "Average", type: "area", data: ordered.map((a) => Math.round((a.stats?.gameStats.average ?? 0) * 10) / 10)},
            {name: "Games", type: "column", data: ordered.map((a) => a.stats?.gameStats.count ?? 0)},
        ]} type="area" height={220} width="100%" />
    );
};

const PlayerDetail: FC<{data: AggregatedPlayerData}> = ({data}) => {
    const {theme} = useTheme();
    const palette = chartPalette(theme);
    const {player, careerStats: stats, seasonStats, appearances, seasonSlicesFull, appearanceSlicesFull} = data;
    const displayName = player.name ?? player.id;
    const hasGames = stats.gameStats.count > 0;
    const [tab, setTab] = useState<"overview" | "all">("overview");
    return (
        <div className="bls-player-profile">
            <PlayerSwitcher currentId={player.id} />
            <div className="bls-player-profile-main">
                <div className="bls-profile-hero">
                    <span className="bls-hero-kicker">Player profile</span>
                    <h1 className="bls-profile-hero-name">{displayName}</h1>
                    <p className="text-body-secondary mb-0">
                        <Link to="/player" className="bls-link">All players</Link>{" · "}
                        <Link to="/player/compare" className="bls-link">Player Compare</Link>
                    </p>
                    <div className="bls-scope-pills mt-3" role="tablist" aria-label="Player views">
                        <button type="button" role="tab" aria-selected={tab === "overview"} className={`bls-scope-pill${tab === "overview" ? " is-active" : ""}`} onClick={() => setTab("overview")}>
                            <span className="bls-scope-pill-label">Overview</span>
                            <span className="bls-scope-pill-sub">Dashboard</span>
                        </button>
                        <button type="button" role="tab" aria-selected={tab === "all"} className={`bls-scope-pill${tab === "all" ? " is-active" : ""}`} onClick={() => setTab("all")}>
                            <span className="bls-scope-pill-label">All stats</span>
                            <span className="bls-scope-pill-sub">Career</span>
                        </button>
                    </div>
                </div>
                {tab === "all" && (
                    <AllStatsPanel
                        careerStats={stats}
                        seasonSlicesFull={seasonSlicesFull ?? []}
                        appearanceSlicesFull={appearanceSlicesFull ?? []}
                        appearances={appearances}
                    />
                )}
                {tab === "overview" && <>
                <div className="row g-3 mb-3">
                    <div className="col-md-5">
                        <Card className="bls-profile-card bls-kpi-hero h-100">
                            <div className="bls-profile-card-head">Career highlight</div>
                            <CardBody>
                                <div className="bls-kpi-big">{hasGames ? numberFormat.format(stats.gameStats.average) : "—"}</div>
                                <div className="bls-kpi-big-label">Scratch average</div>
                                <div className="row g-2 mt-3">
                                    <div className="col-6 col-lg-4"><div className="bls-kpi-mini"><div className="bls-kpi-mini-val">{stats.gameStats.count || "—"}</div><div className="bls-kpi-mini-lbl">Games</div></div></div>
                                    <div className="col-6 col-lg-4"><div className="bls-kpi-mini"><div className="bls-kpi-mini-val">{stats.games200 || "—"}</div><div className="bls-kpi-mini-lbl">200+ Games</div></div></div>
                                    <div className="col-6 col-lg-4"><div className="bls-kpi-mini"><div className="bls-kpi-mini-val">{stats.cleanGames || "—"}</div><div className="bls-kpi-mini-lbl">Clean Games</div></div></div>
                                    <div className="col-6 col-lg-4"><div className="bls-kpi-mini"><div className="bls-kpi-mini-val">{stats.hungCount || "—"}</div><div className="bls-kpi-mini-lbl">Got Hung</div></div></div>
                                    <div className="col-6 col-lg-4"><div className="bls-kpi-mini"><div className="bls-kpi-mini-val">{stats.turkeyCount || "—"}</div><div className="bls-kpi-mini-lbl">Turkeys</div></div></div>
                                </div>
                            </CardBody>
                        </Card>
                    </div>
                    <div className="col-md-7">
                        <Card className="bls-profile-card h-100">
                            <div className="bls-profile-card-head">League trend</div>
                            <CardBody>
                                {appearances.some((a) => (a.stats?.gameStats.count ?? 0) > 0)
                                    ? <LeagueTrendChart appearances={appearances} />
                                    : <p className="text-body-secondary mb-0 fs-sm">Not enough league history for a trend chart.</p>}
                            </CardBody>
                        </Card>
                    </div>
                </div>
                <div className="row g-3 mb-3">
                    <div className="col-lg-7">
                        <Card className="bls-profile-card">
                            <div className="bls-profile-card-head">{displayName} — overall career shape</div>
                            <CardBody><CareerRadar stats={stats} /></CardBody>
                        </Card>
                    </div>
                    <div className="col-lg-5">
                        <Card className="bls-profile-card h-100">
                            <div className="bls-profile-card-head">Season snapshot</div>
                            <CardBody>
                                <div className="bls-radial-grid">
                                    <RadialStat label="Strike %" value={pct(stats.strikes)} display={`${pct(stats.strikes)}%`} color={palette.series[0]} />
                                    <RadialStat label="Spare %" value={pct(stats.spares)} display={`${pct(stats.spares)}%`} color={palette.series[1]} />
                                    <RadialStat label="Clean" value={Math.min(100, (stats.cleanGames / Math.max(1, stats.gameStats.count)) * 100)} display={`${stats.cleanGames}`} color={palette.series[2]} />
                                    <RadialStat label="Turkeys" value={Math.min(100, (stats.turkeyCount / Math.max(1, stats.gameStats.count)) * 25)} display={`${stats.turkeyCount}`} color={palette.series[3]} />
                                </div>
                            </CardBody>
                        </Card>
                    </div>
                </div>
                <div className="row g-3 mb-3">
                    <div className="col-lg-6"><SeasonBreakdownTable seasons={seasonStats} /></div>
                    <div className="col-lg-6"><AppearancesPanel appearances={appearances} /></div>
                </div>
                </>}
            </div>
        </div>
    );
};

export default PlayerDetail;
