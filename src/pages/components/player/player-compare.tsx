/*
 * Player comparison — head-to-head leads with charts © 2026
 */

import {type FC, useCallback, useMemo, useState} from "react";
import Chart from "react-apexcharts";
import type {ApexOptions} from "apexcharts";
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
    type PlayerListEntry,
} from "../../../data/player/player-aggregate";
import {useCachedFetcher} from "../cache/data-loader";
import Loader from "../loader";
import ErrorDisplay from "../error-display";
import {useTheme} from "../theme";
import {chartPalette} from "../charts/chart-theme";

const numberFormat = Intl.NumberFormat("en-US", {
    style: "decimal",
    maximumFractionDigits: 1,
});

interface StatDef {
    key: keyof Pick<
        PlayerListEntry,
        "average" | "games" | "pinfall" | "highGame" | "highSeries" | "games200"
    >;
    label: string;
    higherIsBetter: boolean;
    format: (v: number | null | undefined) => string;
}

const STATS: StatDef[] = [
    {
        key: "average",
        label: "Average",
        higherIsBetter: true,
        format: (v) => (v != null ? numberFormat.format(v) : "—"),
    },
    {
        key: "games",
        label: "Games",
        higherIsBetter: true,
        format: (v) => (v != null ? String(v) : "—"),
    },
    {
        key: "pinfall",
        label: "Pinfall",
        higherIsBetter: true,
        format: (v) => (v != null ? String(v) : "—"),
    },
    {
        key: "highGame",
        label: "High game",
        higherIsBetter: true,
        format: (v) => (v != null ? String(v) : "—"),
    },
    {
        key: "highSeries",
        label: "High series",
        higherIsBetter: true,
        format: (v) => (v != null ? String(v) : "—"),
    },
    {
        key: "games200",
        label: "200+ games",
        higherIsBetter: true,
        format: (v) => (v != null ? String(v) : "—"),
    },
];

function num(v: number | null | undefined): number {
    return v == null || Number.isNaN(v) ? 0 : v;
}

const LeadBars: FC<{a: PlayerListEntry; b: PlayerListEntry}> = ({a, b}) => {
    const {theme} = useTheme();
    const palette = chartPalette(theme);
    const colorA = palette.series[0];
    const colorB = palette.series[2];

    const categories = STATS.map((s) => s.label);
    const seriesA = STATS.map((s) => num(a[s.key] as number | null));
    const seriesB = STATS.map((s) => num(b[s.key] as number | null));

    const normA: number[] = [];
    const normB: number[] = [];
    for (let i = 0; i < STATS.length; i++) {
        const max = Math.max(seriesA[i], seriesB[i], 1);
        normA.push(Math.round((seriesA[i] / max) * 1000) / 10);
        normB.push(Math.round((seriesB[i] / max) * 1000) / 10);
    }

    const options: ApexOptions = {
        chart: {
            type: "bar",
            background: "transparent",
            toolbar: {show: false},
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        },
        theme: {mode: theme},
        plotOptions: {
            bar: {
                horizontal: true,
                borderRadius: 6,
                barHeight: "68%",
                dataLabels: {position: "top"},
            },
        },
        colors: [colorA, colorB],
        dataLabels: {
            enabled: true,
            formatter: (_val, opts) => {
                const i = opts?.dataPointIndex ?? 0;
                const seriesIndex = opts?.seriesIndex ?? 0;
                const raw = seriesIndex === 0 ? seriesA[i] : seriesB[i];
                return STATS[i].format(raw);
            },
            style: {
                fontSize: "11px",
                fontWeight: 600,
                colors: [palette.textStrong],
            },
            offsetX: 6,
        },
        xaxis: {
            categories,
            max: 100,
            labels: {show: false},
            axisBorder: {show: false},
            axisTicks: {show: false},
        },
        yaxis: {
            labels: {
                style: {colors: palette.text, fontSize: "12px", fontWeight: 600},
            },
        },
        grid: {
            borderColor: palette.grid,
            xaxis: {lines: {show: false}},
        },
        legend: {
            position: "top",
            horizontalAlign: "right",
            labels: {colors: palette.text},
        },
        tooltip: {
            theme,
            y: {
                formatter: (_val, opts) => {
                    const i = opts?.dataPointIndex ?? 0;
                    const seriesIndex = opts?.seriesIndex ?? 0;
                    const raw = seriesIndex === 0 ? seriesA[i] : seriesB[i];
                    return STATS[i].format(raw);
                },
            },
        },
    };

    return (
        <Chart
            options={options}
            series={[
                {name: a.name, data: normA},
                {name: b.name, data: normB},
            ]}
            type="bar"
            height={Math.max(280, STATS.length * 52)}
        />
    );
};

const DeltaChart: FC<{a: PlayerListEntry; b: PlayerListEntry}> = ({a, b}) => {
    const {theme} = useTheme();
    const palette = chartPalette(theme);

    const categories: string[] = [];
    const deltas: number[] = [];

    for (const s of STATS) {
        const av = num(a[s.key] as number | null);
        const bv = num(b[s.key] as number | null);
        const d = av - bv;
        categories.push(s.label);
        deltas.push(Math.round(d * 10) / 10);
    }

    const options: ApexOptions = {
        chart: {
            type: "bar",
            background: "transparent",
            toolbar: {show: false},
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        },
        theme: {mode: theme},
        plotOptions: {
            bar: {
                horizontal: true,
                borderRadius: 6,
                barHeight: "60%",
                colors: {
                    ranges: [
                        {from: -1e9, to: -0.0001, color: palette.series[2]},
                        {from: 0, to: 0, color: palette.grid},
                        {from: 0.0001, to: 1e9, color: palette.series[0]},
                    ],
                },
            },
        },
        colors: [palette.series[0]],
        dataLabels: {
            enabled: true,
            formatter: (val) => {
                const n = Number(val);
                return n > 0 ? `+${n}` : String(n);
            },
            style: {fontSize: "11px", fontWeight: 700, colors: [palette.textStrong]},
        },
        xaxis: {
            categories,
            labels: {style: {colors: palette.text, fontSize: "11px"}},
            axisBorder: {show: false},
        },
        yaxis: {
            labels: {style: {colors: palette.text, fontSize: "12px", fontWeight: 600}},
        },
        grid: {borderColor: palette.grid},
        tooltip: {
            theme,
            y: {
                formatter: (val) => {
                    const n = Number(val);
                    return n > 0 ? `+${n}` : String(n);
                },
            },
        },
        legend: {show: false},
    };

    return (
        <Chart
            options={options}
            series={[{name: `${a.name} − ${b.name}`, data: deltas}]}
            type="bar"
            height={Math.max(260, STATS.length * 48)}
        />
    );
};

const PlayerCompare: FC = () => {
    const fetcher = useCallback(buildFullPlayerList, []);
    const {data, isLoading, error} = useCachedFetcher<PlayerListEntry[]>(
        fetcher,
        PLAYER_INDEX_CACHE_CATEGORY
    );

    const [idA, setIdA] = useState("");
    const [idB, setIdB] = useState("");

    const players = useMemo(() => {
        if (!data) return [];
        return [...data].sort((x, y) => x.name.localeCompare(y.name));
    }, [data]);

    const a = players.find((p) => p.id === idA);
    const b = players.find((p) => p.id === idB);

    const leads = useMemo(() => {
        if (!a || !b) return null;
        let scoreA = 0;
        let scoreB = 0;
        const rows = STATS.map((s) => {
            const av = num(a[s.key] as number | null);
            const bv = num(b[s.key] as number | null);
            let leader: "a" | "b" | "tie" = "tie";
            if (av > bv) {
                leader = "a";
                scoreA++;
            } else if (bv > av) {
                leader = "b";
                scoreB++;
            }
            return {stat: s, av, bv, leader};
        });
        return {rows, scoreA, scoreB};
    }, [a, b]);

    return (
        <div className="bls-compare">
            <div className="bls-compare-hero mb-3">
                <span className="bls-hero-kicker">Head to head</span>
                <h1>Player comparison</h1>
                <p className="text-body-secondary mb-0">
                    Pick two bowlers to see who leads each career stat.
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
                            <Row className="g-3 align-items-end">
                                <Col md={5}>
                                    <Form.Label className="bls-meta-label">Player A</Form.Label>
                                    <Form.Select
                                        value={idA}
                                        onChange={(e) => setIdA(e.target.value)}
                                        aria-label="Select player A"
                                    >
                                        <option value="">Select bowler…</option>
                                        {players.map((p) => (
                                            <option key={p.id} value={p.id} disabled={p.id === idB}>
                                                {p.name}
                                                {p.average != null
                                                    ? ` (${numberFormat.format(p.average)})`
                                                    : ""}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Col>
                                <Col md={2} className="text-center">
                                    <Badge bg="secondary" pill className="fs-6 px-3 py-2">
                                        vs
                                    </Badge>
                                </Col>
                                <Col md={5}>
                                    <Form.Label className="bls-meta-label">Player B</Form.Label>
                                    <Form.Select
                                        value={idB}
                                        onChange={(e) => setIdB(e.target.value)}
                                        aria-label="Select player B"
                                    >
                                        <option value="">Select bowler…</option>
                                        {players.map((p) => (
                                            <option key={p.id} value={p.id} disabled={p.id === idA}>
                                                {p.name}
                                                {p.average != null
                                                    ? ` (${numberFormat.format(p.average)})`
                                                    : ""}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Col>
                            </Row>
                        </CardBody>
                    </Card>

                    {a && b && leads && (
                        <>
                            <Row className="g-3 mb-3">
                                <Col md={6}>
                                    <Card className="bls-profile-card h-100 bls-compare-card">
                                        <CardHeader className="d-flex justify-content-between align-items-center">
                                            <span>{a.name}</span>
                                            <Badge bg={leads.scoreA >= leads.scoreB ? "primary" : "secondary"} pill>
                                                {leads.scoreA} leads
                                            </Badge>
                                        </CardHeader>
                                        <CardBody>
                                            <div className="bls-kpi-big" style={{fontSize: "2.25rem"}}>
                                                {a.average != null ? numberFormat.format(a.average) : "—"}
                                            </div>
                                            <div className="bls-kpi-big-label">Career average</div>
                                        </CardBody>
                                    </Card>
                                </Col>
                                <Col md={6}>
                                    <Card className="bls-profile-card h-100 bls-compare-card">
                                        <CardHeader className="d-flex justify-content-between align-items-center">
                                            <span>{b.name}</span>
                                            <Badge bg={leads.scoreB >= leads.scoreA ? "primary" : "secondary"} pill>
                                                {leads.scoreB} leads
                                            </Badge>
                                        </CardHeader>
                                        <CardBody>
                                            <div className="bls-kpi-big" style={{fontSize: "2.25rem"}}>
                                                {b.average != null ? numberFormat.format(b.average) : "—"}
                                            </div>
                                            <div className="bls-kpi-big-label">Career average</div>
                                        </CardBody>
                                    </Card>
                                </Col>
                            </Row>

                            <Card className="bls-profile-card mb-3">
                                <div className="bls-profile-card-head">Stat-by-stat lead</div>
                                <CardBody>
                                    <div className="table-responsive">
                                        <table className="table bls-appear-table mb-0">
                                            <thead>
                                                <tr>
                                                    <th>Stat</th>
                                                    <th className="text-end">{a.name}</th>
                                                    <th className="text-end">{b.name}</th>
                                                    <th className="text-center">Lead</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {leads.rows.map(({stat, av, bv, leader}) => (
                                                    <tr key={stat.key}>
                                                        <td className="fw-semibold">{stat.label}</td>
                                                        <td
                                                            className={`text-end tabular-nums${
                                                                leader === "a" ? " fw-bold text-primary" : ""
                                                            }`}
                                                        >
                                                            {stat.format(av)}
                                                        </td>
                                                        <td
                                                            className={`text-end tabular-nums${
                                                                leader === "b" ? " fw-bold text-primary" : ""
                                                            }`}
                                                        >
                                                            {stat.format(bv)}
                                                        </td>
                                                        <td className="text-center">
                                                            {leader === "tie" ? (
                                                                <span className="text-body-secondary">Tie</span>
                                                            ) : (
                                                                <Badge bg="success" pill>
                                                                    {leader === "a" ? a.name : b.name}
                                                                </Badge>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardBody>
                            </Card>

                            <Row className="g-3 mb-3">
                                <Col lg={6}>
                                    <Card className="bls-profile-card h-100">
                                        <div className="bls-profile-card-head">Normalized comparison</div>
                                        <CardBody>
                                            <LeadBars a={a} b={b} />
                                            <p className="fs-xs text-body-secondary mb-0 mt-2">
                                                Bars are scaled per stat so the leader reaches 100%. Labels show real values.
                                            </p>
                                        </CardBody>
                                    </Card>
                                </Col>
                                <Col lg={6}>
                                    <Card className="bls-profile-card h-100">
                                        <div className="bls-profile-card-head">
                                            Margin ({a.name} − {b.name})
                                        </div>
                                        <CardBody>
                                            <DeltaChart a={a} b={b} />
                                            <p className="fs-xs text-body-secondary mb-0 mt-2">
                                                Positive bars favor {a.name}; negative favor {b.name}.
                                            </p>
                                        </CardBody>
                                    </Card>
                                </Col>
                            </Row>
                        </>
                    )}

                    {(!a || !b) && (
                        <Card className="bls-profile-card">
                            <CardBody className="text-body-secondary text-center py-5">
                                Select two different bowlers to unlock the comparison charts.
                            </CardBody>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
};

export default PlayerCompare;
