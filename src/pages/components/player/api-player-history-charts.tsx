/* Historical API player charts © 2026 */

import {type FC, useMemo, useState} from "react";
import type {ApexOptions} from "apexcharts";
import {Form} from "react-bootstrap";

import Chart from "../charts/safe-chart";
import {baseChartOptions, chartPalette} from "../charts/chart-theme";
import {useTheme} from "../theme";
import type {ApiHistoricalPlayer} from "../../../data/player/api-player-history";
import {
    API_PLAYER_PROGRESS_OPTIONS,
    API_PLAYER_TIMEFRAME_OPTIONS,
    buildApiPlayerProgress,
    pointsForApiPlayerTimeframe,
    type ApiPlayerProgressMetric,
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
    const [metric, setMetric] = useState<ApiPlayerProgressMetric>("average");
    const points = useMemo(
        () => pointsForApiPlayerTimeframe(historical.history, timeframe),
        [historical.history, timeframe],
    );
    const progress = useMemo(
        () => buildApiPlayerProgress(points, metric),
        [points, metric],
    );
    if (points.length < 2) return null;

    const palette = chartPalette(theme);
    const timeframeLabel = API_PLAYER_TIMEFRAME_OPTIONS.find(option => option.value === timeframe)?.label ?? "Career";
    const metricOption = API_PLAYER_PROGRESS_OPTIONS.find(option => option.value === metric) ?? API_PLAYER_PROGRESS_OPTIONS[0];
    const hasValues = progress.some(point => point.value != null);
    const chartBase = baseChartOptions(theme, `${metricOption.label} over time`);

    const chartSeries: NonNullable<ApexOptions["series"]> = metric === "average"
        ? [
              {
                  name: "Running Avg",
                  type: "line",
                  data: progress.map(point => ({x: dateValue(point.date), y: point.value})),
              },
              {
                  name: "Weekly Avg",
                  type: "line",
                  data: progress.map(point => ({x: dateValue(point.date), y: point.weeklyValue ?? null})),
              },
          ]
        : [{
              name: metricOption.label,
              type: "line",
              data: progress.map(point => ({x: dateValue(point.date), y: point.value})),
          }];

    const chartOptions: ApexOptions = {
        ...chartBase,
        chart: {
            ...chartBase.chart,
            id: `api-player-progress-${historical.sourcePlayerId}-${metric}`,
            height: 330,
            type: "line",
        },
        series: chartSeries,
        stroke: metric === "average" ? {curve: ["smooth", "straight"], width: [3, 2]} : {curve: "smooth", width: 3},
        markers: metric === "average" ? {size: [2, 4], strokeWidth: 0} : {size: 3, strokeWidth: 0},
        xaxis: {
            type: "datetime",
            labels: {datetimeUTC: false, format: "MMM yy", style: {colors: palette.text, fontSize: "11px"}},
            axisBorder: {show: false},
            axisTicks: {show: false},
        },
        yaxis: {
            decimalsInFloat: metricOption.integer ? 0 : 1,
            labels: {
                style: {colors: palette.text, fontSize: "11px"},
                formatter: value => metricOption.integer ? Math.round(value).toLocaleString() : Number(value).toFixed(1),
            },
        },
        tooltip: {
            ...chartBase.tooltip,
            shared: metric === "average",
            intersect: false,
            x: {format: "dd MMM yyyy"},
            y: {
                formatter: value => {
                    if (value == null) return "—";
                    return metricOption.integer ? Math.round(Number(value)).toLocaleString() : Number(value).toFixed(1);
                },
            },
        },
    };

    return (
        <div className="mb-3">
            <div className="d-flex flex-wrap align-items-end justify-content-between gap-3 mb-2">
                <div>
                    <h2 className="h5 mb-1">Progress over time</h2>
                    <span className="text-secondary small">{importedWeeks} Pins Go Boom league weeks · {timeframeLabel}</span>
                </div>
                <div style={{minWidth: 210}}>
                    <Form.Label className="small mb-1" htmlFor="api-player-progress-stat">Stat</Form.Label>
                    <Form.Select
                        id="api-player-progress-stat"
                        size="sm"
                        value={metric}
                        onChange={event => { setMetric(event.target.value as ApiPlayerProgressMetric); }}
                    >
                        {API_PLAYER_PROGRESS_OPTIONS.map(option => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </Form.Select>
                </div>
            </div>
            <p className="text-secondary small mb-3">
                Choose any player stat to see how it changed during the selected time frame. Totals, highs and achievement counts rebuild from the first recorded week in that range; absentee or vacant scores stay out.
            </p>
            <div className="bls-surface-card p-2 p-md-3">
                {hasValues ? (
                    <div className="bls-chart">
                        <Chart
                            key={`progress-${theme}-${historical.sourcePlayerId}-${timeframe}-${metric}-${points.length}`}
                            options={chartOptions}
                            series={chartSeries}
                            type="line"
                            width="100%"
                            height={330}
                        />
                    </div>
                ) : (
                    <div className="text-secondary small text-center py-5">
                        No historical {metricOption.label.toLocaleLowerCase()} data is available for this time frame.
                    </div>
                )}
            </div>
        </div>
    );
};

export default ApiPlayerHistoryCharts;
