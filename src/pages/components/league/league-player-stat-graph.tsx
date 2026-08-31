/*
 * Player averages chart — mobile-friendly © 2026
 */

import type {FC} from "react";

import type {ApexOptions} from "apexcharts";
import Chart from "react-apexcharts";

import type {PlayerDayData} from "./league-team-roster";
import {useTheme} from "../theme";
import {baseChartOptions, chartPalette} from "../charts/chart-theme";

interface TeamPlayerStatGraphProps {
    playerData: PlayerDayData[];
}

function count200s(p: PlayerDayData): number {
    let count = 0;
    if (p.game1 >= 200) count++;
    if (p.game2 >= 200) count++;
    if (p.game3 >= 200) count++;
    return count;
}

const TeamPlayerStatGraph: FC<TeamPlayerStatGraphProps> = ({playerData}) => {
    const {theme} = useTheme();
    const palette = chartPalette(theme);
    const base = baseChartOptions(theme, "Player Averages");

    const minAvg =
        playerData.length > 0
            ? playerData.reduce((minVal, p) => Math.min(minVal, p.average), 300) * 0.9
            : 100;

    const series: ApexOptions["series"] = [
        {
            name: "Weekly Avg",
            type: "line",
            data: playerData.map((p) => ({
                x: p.bowlDate.getTime(),
                y: Math.round(p.average * 10) / 10,
            })),
        },
        {
            name: "Running Avg",
            type: "line",
            data: playerData.map((p) => ({
                x: p.bowlDate.getTime(),
                y: Math.round(p.runningAverageAfter * 10) / 10,
            })),
        },
        {
            name: "200+ Games",
            type: "scatter",
            data: playerData.map((p) => {
                const count = count200s(p);
                return {
                    x: p.bowlDate.getTime(),
                    y: count > 0 ? count : null,
                };
            }),
        },
    ];

    const options: ApexOptions = {
        ...base,
        chart: {
            ...base.chart,
            id: "Player-Averages",
            height: 320,
            type: "line",
        },
        series,
        colors: [palette.series[0], palette.series[3], palette.series[2]],
        stroke: {
            curve: ["smooth", "smooth", "smooth"],
            width: [2.5, 3, 0],
        },
        markers: {
            size: [0, 0, 6],
            strokeWidth: 0,
            hover: {
                size: 7,
            },
        },
        xaxis: {
            type: "datetime",
            labels: {
                datetimeUTC: false,
                format: "dd MMM",
                style: {
                    colors: palette.text,
                    fontSize: "11px",
                },
            },
            axisBorder: {
                show: false,
            },
            axisTicks: {
                show: false,
            },
            tooltip: {
                enabled: false,
            },
        },
        yaxis: [
            {
                seriesName: ["Weekly Avg", "Running Avg"],
                title: {
                    text: "Average",
                    style: {
                        color: palette.series[0],
                        fontSize: "11px",
                        fontWeight: 600,
                    },
                },
                min: Math.floor(minAvg),
                decimalsInFloat: 0,
                labels: {
                    style: {
                        colors: palette.text,
                        fontSize: "11px",
                    },
                    formatter: (v) => (v == null ? "" : Math.round(v).toString()),
                },
            },
            {
                seriesName: "200+ Games",
                opposite: true,
                title: {
                    text: "200s",
                    style: {
                        color: palette.series[2],
                        fontSize: "11px",
                        fontWeight: 600,
                    },
                },
                min: 0,
                max: 3,
                tickAmount: 3,
                decimalsInFloat: 0,
                labels: {
                    style: {
                        colors: palette.text,
                        fontSize: "11px",
                    },
                    formatter: (v) => (v == null ? "" : Math.round(v).toString()),
                },
            },
        ],
        tooltip: {
            ...base.tooltip,
            shared: true,
            intersect: false,
            y: {
                formatter: (val, opts) => {
                    if (val == null) return "—";
                    if (opts?.seriesIndex === 2) {
                        return `${Math.round(val)} game${val === 1 ? "" : "s"}`;
                    }
                    return Number(val).toFixed(1);
                },
            },
        },
    };

    return (
        <div className="bls-chart">
            <Chart options={options} series={series} type="line" width="100%" height={320} />
        </div>
    );
};

export default TeamPlayerStatGraph;
