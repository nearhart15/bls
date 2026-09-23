/* Historical API player charts © 2026 */

import {type FC, useCallback, useMemo, useState} from "react";
import type {ApexOptions} from "apexcharts";
import {Form} from "react-bootstrap";

import Chart from "../charts/safe-chart";
import {baseChartOptions, chartPalette} from "../charts/chart-theme";
import {useTheme} from "../theme";
import {useCachedFetcher} from "../cache/data-loader";
import {
    API_LEAGUE_HISTORY_CACHE_CATEGORY,
    apiHistoricalLeagueFetcher,
    type ApiHistoricalLeagueHistory,
    type ApiHistoricalPlayer,
} from "../../../data/player/api-player-history";
import {
    API_PLAYER_PROGRESS_OPTIONS,
    API_PLAYER_TIMEFRAME_OPTIONS,
    buildApiLeagueProgress,
    buildApiPlayerProgress,
    pointsForApiPlayerTimeframe,
    type ApiPlayerProgressMetric,
    type ApiPlayerTimeframe,
} from "../../../data/player/api-player-timeframe";

interface Props {
    historical: ApiHistoricalPlayer;
    importedWeeks: number;
    timeframe: ApiPlayerTimeframe;
    onTimeframeChange: (timeframe: ApiPlayerTimeframe) => void;
}

function dateValue(date: string): number {
    return Date.parse(`${date}T12:00:00`);
}

const ApiPlayerHistoryCharts: FC<Props> = ({historical, importedWeeks, timeframe, onTimeframeChange}) => {
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
    const leagueFetcher = useCallback(() => apiHistoricalLeagueFetcher(), []);
    const {data: leagueData} = useCachedFetcher<ApiHistoricalLeagueHistory>(
        leagueFetcher,
        API_LEAGUE_HISTORY_CACHE_CATEGORY,
    );
    const leagueProgress = useMemo(
        () => buildApiLeagueProgress(
            leagueData?.weeks ?? [],
            metric,
            points[0]?.date,
            points[points.length - 1]?.date,
        ),
        [leagueData, metric, points],
    );
    if (points.length < 2) return null;

    const palette = chartPalette(theme);
    const timeframeLabel = API_PLAYER_TIMEFRAME_OPTIONS.find(option => option.value === timeframe)?.label ?? "Career";
    const metricOption = API_PLAYER_PROGRESS_OPTIONS.find(option => option.value === metric) ?? API_PLAYER_PROGRESS_OPTIONS[0];
    const hasValues = progress.some(point => point.value != null);
    const chartBase = baseChartOptions(theme, `${metricOption.label} over time`);

    const leagueSeries = {
        name: "League Avg",
        type: "line" as const,
        data: leagueProgress.map(point => ({x: dateValue(point.date), y: point.value})),
    };
    const chartSeries: NonNullable<ApexOptions["series"]> = metric === "average"
        ? [
              {
                  name: historical.name,
                  type: "line",
                  data: progress.map(point => ({x: dateValue(point.date), y: point.value})),
              },
              {
                  name: "Weekly Avg",
                  type: "line",
                  data: progress\n                      .filter(point => point.weeklyValue != null)\n                      .map(point => ({x: dateValue(point.date), y: point.weeklyValue as number})),
              },
              leagueSeries,
          ]
        : [
              {
                  name: historical.name,
                  type: "line",
                  data: progress.map(point => ({x: dateValue(point.date), y: point.value})),
              },
              leagueSeries,
          ];

    const chartOptions: ApexOptions = {
        ...chartBase,
        chart: {
            ...chartBase.chart,
            id: `api-player-progress-${historical.sourcePlayerId}-${metric}`,
            height: 390,
            type: "line",
        },
        series: chartSeries,
        stroke: metric === "average"
            ? {curve: ["smooth", "straight", "smooth"], width: [3, 2, 2.5]}
            : {curve: ["smooth", "smooth"], width: [3, 2.5]},
        markers: metric === "average"
            ? {size: [2, 4, 0], strokeWidth: 0}
            : {size: [3, 0], strokeWidth: 0},
        xaxis: {
            type: "datetime",
            labels: {datetimeUTC: false, format: "MMM yy", style: {colors: palette.text, fontSize: "11px"}},
            axisBorder: {show: false},
            axisTicks: {show: false},
        },
        grid: {
            ...chartBase.grid,
            padding: {bottom: 20},
        },
        legend: {
            ...chartBase.legend,
            offsetY: 6,
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
            shared: true,
            intersect: false,
            x: {format: "dd MMM yyyy"},
            y: {
                formatter: (value, opts) => {
                    if (value == null) return "—";
                    const isLeagueAverage = opts?.seriesIndex === chartSeries.length - 1;
                    if (metricOption.integer && isLeagueAverage) return Number(value).toFixed(1);
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
                <div
                    className="d-grid gap-2"
                    style={{gridTemplateColumns: "repeat(2, minmax(0, 1fr))", width: "min(100%, 440px)"}}
                >
                    <div>
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
                    <div>
                        <Form.Label className="small mb-1" htmlFor="api-player-timeframe">Time frame</Form.Label>
                        <Form.Select
                            id="api-player-timeframe"
                            size="sm"
                            value={timeframe}
                            onChange={event => { onTimeframeChange(event.target.value as ApiPlayerTimeframe); }}
                        >
                            {API_PLAYER_TIMEFRAME_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </Form.Select>
                    </div>
                </div>
            </div>
            <p className="text-secondary small mb-3">
                Choose any player stat to see how it changed during the selected time frame. The League Avg line uses the same dates and calculation rules, so you can see how the player stacked up against the league. Totals, highs and achievement counts rebuild from the first recorded week in that range; absentee or vacant scores stay out.
            </p>
            <div className="bls-surface-card p-2 p-md-3">
                {hasValues ? (
                    <div className="bls-chart pb-3">
                        <Chart
                            key={`progress-${theme}-${historical.sourcePlayerId}-${timeframe}-${metric}-${points.length}`}
                            options={chartOptions}
                            series={chartSeries}
                            type="line"
                            width="100%"
                            height={390}
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
