/*
 * Player profile — sports dashboard layout (radar, switcher, KPI rings) © 2026
 */

import {type FC} from "react";
import {Link} from "react-router";
import Chart from "react-apexcharts";
import type {ApexOptions} from "apexcharts";
import {Card, CardBody} from "react-bootstrap";

import type {
    AggregatedPlayerData,
    PlayerSeasonStats,
} from "../../../data/player/player-aggregate";
import type {PlayerStats} from "../../../data/player/player-stats";
import {useTheme} from "../theme";
import {chartPalette} from "../charts/chart-theme";
import {
    AppearancesPanel,
    SeasonBreakdownTable,
    PlayerSwitcher,
} from "./player-detail-tables";

const numberFormat = Intl.NumberFormat("en-US", {
    style: "decimal",
    maximumFractionDigits: 1,
});
const intFormat = Intl.NumberFormat("en-US", {
    style: "decimal",
    maximumFractionDigits: 0,
});

function pct(rg: {numerator: number; denominator: number; pct: number}): number {
    if (rg.denominator <= 0) return 0;
    return Math.round(rg.pct * 1000) / 10;
}

function avgScore(avg: number): number {
    return Math.max(0, Math.min(100, ((avg - 140) / 80) * 100));
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
        chart: {
            type: "radialBar",
            sparkline: {enabled: true},
            background: "transparent",
        },
        plotOptions: {
            radialBar: {
                startAngle: -135,
                endAngle: 135,
                hollow: {size: "62%"},
                track: {
                    background: theme === "dark" ? "#1a1a1a" : "#e8e8ed",
                    strokeWidth: "100%",
                },
                dataLabels: {
                    name: {show: false},
                    value: {
                        show: true,
                        fontSize: "1.05rem",
                        fontWeight: 700,
                        color: palette.textStrong,
                        offsetY: 6,
                        formatter: () => display,
                    },
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

interface RadarProps {
    stats: PlayerStats;
}

const CareerRadar: FC<RadarProps> = ({stats}) => {
    const {theme} = useTheme();
    const palette = chartPalette(theme);

    const games = Math.max(1, stats.gameStats.count);
    const displayVals = [
        numberFormat.format(stats.gameStats.average),
        `${pct(stats.strikes)}%`,
        `${pct(stats.spares)}%`,
        `${pct(stats.singlePinSpares)}%`,
        String(stats.cleanGames),
        numberFormat.format(stats.firstBallAverage),
        String(stats.games200),
    ];
    const categories = [
        `${displayVals[0]} Average`,
        `${displayVals[1]} Strike %`,
        `${displayVals[2]} Spare %`,
        `${displayVals[3]} Single Pin %`,
        `${displayVals[4]} Clean Games`,
        `${displayVals[5]} First Ball`,
        `${displayVals[6]} 200+ Games`,
    ];

    const seriesVals = [
        avgScore(stats.gameStats.average),
        pct(stats.strikes),
        pct(stats.spares),
        pct(stats.singlePinSpares),
        Math.min(100, (stats.cleanGames / games) * 100),
        Math.min(100, (stats.firstBallAverage / 10) * 100),
        Math.min(100, (stats.games200 / games) * 100 * 3),
    ];

    const options: ApexOptions = {
        chart: {
            type: "radar",
            background: "transparent",
            toolbar: {show: false},
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        },
        theme: {mode: theme},
        colors: ["#ffd60a"],
        fill: {opacity: 0.2},
        stroke: {width: 3, colors: ["#ffd60a"]},
        markers: {
            size: 5,
            colors: ["#ffd60a"],
            strokeColors: theme === "dark" ? "#0a0a0a" : "#fff",
            strokeWidth: 2,
        },
        xaxis: {
            categories,
            labels: {
                style: {
                    colors: Array(categories.length).fill(palette.text),
                    fontSize: "12px",
                    fontWeight: 600,
                },
            },
        },
        yaxis: {show: false, min: 0, max: 100, tickAmount: 4},
        plotOptions: {
            radar: {
                polygons: {
                    strokeColors: palette.grid,
                    connectorColors: palette.grid,
                    fill: {
                        colors:
                            theme === "dark"
                                ? ["#0a0a0a", "#111111"]
                                : ["#ffffff", "#f5f5f7"],
                    },
                },
            },
        },
        legend: {show: false},
        tooltip: {
            theme,
            y: {formatter: (v) => `${Math.round(v)}`},
        },
    };

    return (
        <div className="bls-radar-wrap">
            <Chart
                options={options}
                series={[{name: "Career", data: seriesVals}]}
                type="radar"
                height={360}
            />
            <div className="bls-radar-callouts">
                <div>
                    <strong>{numberFormat.format(stats.gameStats.average)}</strong>
                    <span>Average</span>
                </div>
                <div>
                    <strong>{pct(stats.strikes)}%</strong>
                    <span>Strikes</span>
                </div>
                <div>
                    <strong>{pct(stats.spares)}%</strong>
                    <span>Spares</span>
                </div>
                <div>
                    <strong>{stats.games200}</strong>
                    <span>200+ Games</span>
                </div>
                <div>
                    <strong>{stats.cleanGames}</strong>
                    <span>Clean Games</span>
                </div>
                <div>
                    <strong>{intFormat.format(stats.pinfall)}</strong>
                    <span>Pinfall</span>
                </div>
            </div>
        </div>
    );
};

interface SeasonTrendProps {
    seasons: PlayerSeasonStats[];
}

const SeasonTrendChart: FC<SeasonTrendProps> = ({seasons}) => {
    const {theme} = useTheme();
    const palette = chartPalette(theme);
    const ordered = [...seasons].reverse();
    if (ordered.length < 1) return null;

    const options: ApexOptions = {
        chart: {
            type: "area",
            background: "transparent",
            toolbar: {show: false},
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        },
        theme: {mode: theme},
        colors: [palette.series[0], palette.series[2]],
        dataLabels: {enabled: false},
        stroke: {curve: "smooth", width: 3},
        fill: {
            type: "gradient",
            gradient: {shadeIntensity: 0.4, opacityFrom: 0.45, opacityTo: 0.05},
        },
        grid: {borderColor: palette.grid, strokeDashArray: 3},
        xaxis: {
            categories: ordered.map((s) => s.season),
            labels: {style: {colors: palette.text, fontSize: "11px"}},
            axisBorder: {show: false},
            axisTicks: {show: false},
        },
        yaxis: [
            {
                title: {text: "Average", style: {color: palette.series[0], fontSize: "11px"}},
                labels: {
                    style: {colors: palette.text, fontSize: "11px"},
                    formatter: (v) => Math.round(v).toString(),
                },
            },
            {
                opposite: true,
                title: {text: "Games", style: {color: palette.series[2], fontSize: "11px"}},
                labels: {
                    style: {colors: palette.text, fontSize: "11px"},
                    formatter: (v) => Math.round(v).toString(),
                },
            },
        ],
        legend: {
            position: "top",
            horizontalAlign: "right",
            labels: {colors: palette.text},
        },
        tooltip: {theme},
    };

    return (
        <Chart
            options={options}
            series={[
                {
                    name: "Average",
                    type: "area",
                    data: ordered.map((s) => Math.round(s.average * 10) / 10),
                },
                {
                    name: "Games",
                    type: "column",
                    data: ordered.map((s) => s.games),
                },
            ]}
            type="line"
            height={220}
        />
    );
};

interface PlayerDetailProps {
    data: AggregatedPlayerData;
}

const PlayerDetail: FC<PlayerDetailProps> = ({data}) => {
    const {player, appearances, careerStats, seasonStats} = data;
    const {theme} = useTheme();
    const palette = chartPalette(theme);
    const stats = careerStats;
    const hasGames = stats.gameStats.count > 0;
    const displayName = player.name ?? player.id ?? "Player";

    return (
        <div className="bls-player-profile">
            <PlayerSwitcher currentId={player.id || ""} />

            <div className="bls-player-profile-main">
                <section className="bls-player-hero">
                    <div className="bls-player-hero-text">
                        <span className="bls-hero-kicker">Player profile</span>
                        <h1>{displayName}</h1>
                        <div className="bls-player-meta">
                            <div>
                                <span className="bls-meta-label">Career avg</span>
                                <span className="bls-meta-value">
                                    {hasGames ? numberFormat.format(stats.gameStats.average) : "—"}
                                </span>
                            </div>
                            <div>
                                <span className="bls-meta-label">Games</span>
                                <span className="bls-meta-value">{stats.gameStats.count || "—"}</span>
                            </div>
                            <div>
                                <span className="bls-meta-label">Pinfall</span>
                                <span className="bls-meta-value">
                                    {hasGames ? intFormat.format(stats.pinfall) : "—"}
                                </span>
                            </div>
                            <div>
                                <span className="bls-meta-label">Appearances</span>
                                <span className="bls-meta-value">{appearances.length}</span>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="row g-3 mb-3">
                    <div className="col-lg-8">
                        <AppearancesPanel appearances={appearances} />
                    </div>
                    <div className="col-lg-4">
                        <Card className="bls-profile-card bls-kpi-hero h-100">
                            <div className="bls-profile-card-head">Career highlight</div>
                            <CardBody>
                                <div className="bls-kpi-big">
                                    {hasGames ? numberFormat.format(stats.gameStats.average) : "—"}
                                </div>
                                <div className="bls-kpi-big-label">Scratch average</div>
                                <div className="row g-2 mt-3">
                                    <div className="col-6">
                                        <div className="bls-kpi-mini">
                                            <div className="bls-kpi-mini-val text-warning">
                                                {stats.gameStats.max || "—"}
                                            </div>
                                            <div className="bls-kpi-mini-lbl">High game</div>
                                        </div>
                                    </div>
                                    <div className="col-6">
                                        <div className="bls-kpi-mini">
                                            <div className="bls-kpi-mini-val text-info">
                                                {stats.seriesStats.max || "—"}
                                            </div>
                                            <div className="bls-kpi-mini-lbl">High series</div>
                                        </div>
                                    </div>
                                    <div className="col-6">
                                        <div className="bls-kpi-mini">
                                            <div className="bls-kpi-mini-val" style={{color: palette.series[1]}}>
                                                {stats.games200}
                                            </div>
                                            <div className="bls-kpi-mini-lbl">200+ games</div>
                                        </div>
                                    </div>
                                    <div className="col-6">
                                        <div className="bls-kpi-mini">
                                            <div className="bls-kpi-mini-val" style={{color: palette.series[3]}}>
                                                {stats.games300}
                                            </div>
                                            <div className="bls-kpi-mini-lbl">300 games</div>
                                        </div>
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    </div>
                </div>

                {hasGames && (
                    <div className="row g-3 mb-3">
                        <div className="col-lg-7">
                            <Card className="bls-profile-card">
                                <div className="bls-profile-card-head">
                                    {displayName} — overall career shape
                                </div>
                                <CardBody>
                                    <CareerRadar stats={stats} />
                                </CardBody>
                            </Card>
                        </div>
                        <div className="col-lg-5">
                            <Card className="bls-profile-card h-100">
                                <div className="bls-profile-card-head">Season snapshot</div>
                                <CardBody>
                                    <div className="bls-radial-grid">
                                        <RadialStat
                                            label="Strike %"
                                            value={pct(stats.strikes)}
                                            display={`${pct(stats.strikes)}%`}
                                            color={palette.series[0]}
                                        />
                                        <RadialStat
                                            label="Spare %"
                                            value={pct(stats.spares)}
                                            display={`${pct(stats.spares)}%`}
                                            color={palette.series[1]}
                                        />
                                        <RadialStat
                                            label="Clean %"
                                            value={Math.min(
                                                100,
                                                (stats.cleanGames / Math.max(1, stats.gameStats.count)) * 100
                                            )}
                                            display={`${Math.round(
                                                (stats.cleanGames / Math.max(1, stats.gameStats.count)) * 100
                                            )}%`}
                                            color={palette.series[2]}
                                        />
                                        <RadialStat
                                            label="Open %"
                                            value={pct(stats.opens)}
                                            display={`${pct(stats.opens)}%`}
                                            color={palette.series[4]}
                                        />
                                    </div>
                                    {seasonStats.length > 0 && (
                                        <div className="mt-3">
                                            <div className="bls-section-title mb-2">By season</div>
                                            <SeasonTrendChart seasons={seasonStats} />
                                        </div>
                                    )}
                                </CardBody>
                            </Card>
                        </div>
                    </div>
                )}

                {seasonStats.length > 0 && (
                    <SeasonBreakdownTable seasons={seasonStats} />
                )}

                <div className="mb-2">
                    <Link to="/player" className="btn btn-outline-primary btn-sm">
                        ← All players
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default PlayerDetail;
