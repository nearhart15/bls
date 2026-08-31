/*
 * Team performance chart — mobile-friendly © 2026
 */

import type {FC} from "react";

import Chart from "react-apexcharts";
import type {ApexOptions} from "apexcharts";

import type {TeamPositionScoreData} from "./league-team-details";
import {useTheme} from "../theme";
import {baseChartOptions, chartPalette} from "../charts/chart-theme";

interface TeamStatGraphProps {
    teamPosScores: TeamPositionScoreData[];
}

const TeamStatGraph: FC<TeamStatGraphProps> = ({teamPosScores}) => {
    const {theme} = useTheme();
    const palette = chartPalette(theme);
    const base = baseChartOptions(theme, "Team Scores & Rank");

    const series: NonNullable<ApexOptions["series"]> = [
        {
            name: "Scratch Series",
            type: "line",
            data: teamPosScores.map((tps) => ({
                x: tps.bowlDate.getTime(),
                y: tps.scratchSeries,
            })),
        },
        {
            name: "League Rank",
            type: "line",
            data: teamPosScores
                .filter((tps) => tps.position > 0)
                .map((tps) => ({
                    x: tps.bowlDate.getTime(),
                    y: tps.position,
                })),
        },
    ];

    const options: ApexOptions = {
        ...base,
        chart: {
            ...base.chart,
            id: "team-performance",
            type: "line",
            height: 320,
            stacked: false,
            zoom: {
                enabled: true,
                type: "x",
                autoScaleYaxis: true,
                allowMouseWheelZoom: true,
            },
            toolbar: {
                show: true,
                autoSelected: "zoom",
                tools: {
                    download: false,
                    selection: true,
                    zoom: true,
                    zoomin: true,
                    zoomout: true,
                    pan: true,
                    reset: true,
                },
            },
        },
        series,
        colors: [palette.series[0], palette.series[1]],
        stroke: {
            curve: ["smooth", "stepline"],
            width: [3, 2.5],
        },
        markers: {
            size: [0, 0],
            hover: {
                size: 5,
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
                seriesName: "Scratch Series",
                title: {
                    text: "Series",
                    style: {
                        color: palette.series[0],
                        fontSize: "11px",
                        fontWeight: 600,
                    },
                },
                labels: {
                    style: {
                        colors: palette.text,
                        fontSize: "11px",
                    },
                    formatter: (v) => (v == null ? "" : Math.round(v).toString()),
                },
                decimalsInFloat: 0,
                forceNiceScale: true,
            },
            {
                seriesName: "League Rank",
                opposite: true,
                reversed: true,
                title: {
                    text: "Rank",
                    style: {
                        color: palette.series[1],
                        fontSize: "11px",
                        fontWeight: 600,
                    },
                },
                labels: {
                    style: {
                        colors: palette.text,
                        fontSize: "11px",
                    },
                    formatter: (v) => (v == null ? "" : Math.round(v).toString()),
                },
                decimalsInFloat: 0,
                forceNiceScale: true,
                min: 1,
            },
        ],
        tooltip: {
            ...base.tooltip,
            shared: true,
            intersect: false,
            y: {
                formatter: (val, opts) => {
                    if (val == null) return "—";
                    if (opts?.seriesIndex === 1) {
                        return `#${Math.round(val)}`;
                    }
                    return Math.round(val).toString();
                },
            },
        },
    };

    return (
        <div className="bls-chart">
            <Chart
                key={`team-chart-${theme}-${teamPosScores.length}`}
                options={options}
                series={series}
                type="line"
                width="100%"
                height={320}
            />
        </div>
    );
};

export default TeamStatGraph;
