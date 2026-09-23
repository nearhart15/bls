/* Historical API player charts © 2026 */

import {type FC, useMemo} from "react";
import type {ApexOptions} from "apexcharts";

import Chart from "../charts/safe-chart";
import {baseChartOptions, chartPalette} from "../charts/chart-theme";
import {useTheme} from "../theme";
import type {ApiHistoricalPlayer} from "../../../data/player/api-player-history";
import {
    API_PLAYER_TIMEFRAME_OPTIONS,
    pointsForApiPlayerTimeframe,
    type ApiPlayerTimeframe,
} from "../../../data/player/api-player-timeframe";

interface Props {
    historical: ApiHistoricalPlayer;
    importedWeeks: number;
    timeframe: ApiPlayerTimeframe;
}

function dateValue(date: string): number {
    return Date.parse(`${date}T12:00:00`);
}

const ApiPlayerHistoryCharts: FC<Props> = ({historical, importedWeeks, timeframe}) => {
    const {theme} = useTheme();
    const points = useMemo(
        () => pointsForApiPlayerTimeframe(historical.history, timeframe),
        [historical.history, timeframe],
    );
    if (points.length < 2) return null;

    const palette = chartPalette(theme);
    const timeframeLabel = API_PLAYER_TIMEFRAME_OPTIONS.find(option => option.value === timeframe)?.label ?? "Career";
    const avgBase = baseChartOptions(theme, "Average over time");
    const avgSeries: NonNullable<ApexOptions["series"]> = [
        {
            name: "Weekly Avg",
            type: "line",
            data: points.map(point => ({x: dateValue(point.date), y: point.weekAverage})),
        },
        {
            name: "Season Avg",
            type: "line",
            data: points.map(point => ({x: dateValue(point.date), y: point.seasonAverage})),
        },
    ];
    const avgOptions: ApexOptions = {
        ...avgBase,
        chart: {...avgBase.chart, id: `api-player-average-${historical.sourcePlayerId}`, height: 320, type: "line"},
        series: avgSeries,
        stroke: {curve: ["straight", "smooth"], width: [2, 3]},
        markers: {size: [3, 0], strokeWidth: 0},
        xaxis: {
            type: "datetime",
            labels: {datetimeUTC: false, format: "MMM yy", style: {colors: palette.text, fontSize: "11px"}},
            axisBorder: {show: false},
            axisTicks: {show: false},
        },
        yaxis: {
            decimalsInFloat: 0,
            labels: {style: {colors: palette.text, fontSize: "11px"}, formatter: value => Math.round(value).toString()},
        },
        tooltip: {
            ...avgBase.tooltip,
            shared: true,
            intersect: false,
            x: {format: "dd MMM yyyy"},
            y: {formatter: value => value == null ? "—" : Number(value).toFixed(1)},
        },
    };

    const seriesBase = baseChartOptions(theme, "Weekly series over time");
    const seriesData: NonNullable<ApexOptions["series"]> = [{
        name: "Scratch series",
        type: "line",
        data: points.map(point => ({x: dateValue(point.date), y: point.weekSeries})),
    }];
    const seriesOptions: ApexOptions = {
        ...seriesBase,
        chart: {...seriesBase.chart, id: `api-player-series-${historical.sourcePlayerId}`, height: 300, type: "line"},
        series: seriesData,
        stroke: {curve: "straight", width: 2.5},
        markers: {size: 4, strokeWidth: 0},
        xaxis: {
            type: "datetime",
            labels: {datetimeUTC: false, format: "MMM yy", style: {colors: palette.text, fontSize: "11px"}},
            axisBorder: {show: false},
            axisTicks: {show: false},
        },
        yaxis: {
            decimalsInFloat: 0,
            labels: {style: {colors: palette.text, fontSize: "11px"}, formatter: value => Math.round(value).toString()},
        },
        tooltip: {
            ...seriesBase.tooltip,
            shared: false,
            intersect: false,
            x: {format: "dd MMM yyyy"},
            y: {formatter: value => value == null ? "No recorded series" : `${Math.round(value)}`},
        },
    };

    return (
        <div className="mb-3">
            <div className="d-flex flex-wrap align-items-baseline justify-content-between gap-2 mb-2">
                <h2 className="h5 mb-0">Historical trends</h2>
                <span className="text-secondary small">{importedWeeks} Pins Go Boom league weeks · {timeframeLabel}</span>
            </div>
            <p className="text-secondary small mb-3">
                LeagueSecretary history uses the recorded weekly scratch scores. Season average is rebuilt from scratch pinfall and games; absentee or vacant scores stay out of the trend.
            </p>
            <div className="bls-surface-card p-2 p-md-3 mb-3">
                <div className="bls-chart">
                    <Chart key={`avg-${theme}-${historical.sourcePlayerId}-${timeframe}-${points.length}`} options={avgOptions} series={avgSeries} type="line" width="100%" height={320} />
                </div>
            </div>
            <div className="bls-surface-card p-2 p-md-3">
                <div className="bls-chart">
                    <Chart key={`series-${theme}-${historical.sourcePlayerId}-${timeframe}-${points.length}`} options={seriesOptions} series={seriesData} type="line" width="100%" height={300} />
                </div>
            </div>
        </div>
    );
};

export default ApiPlayerHistoryCharts;
