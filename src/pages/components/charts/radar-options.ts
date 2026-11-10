import type {ApexOptions} from "apexcharts";
import type {ThemeMode} from "../theme";
import {chartPalette} from "./chart-theme";

export function radarOptions(theme: ThemeMode, narrow: boolean, categories: string[], displayVals: string[], opacity = 0.2): ApexOptions {
    const palette = chartPalette(theme);
    return {
        chart: {type: "radar", background: "transparent", toolbar: {show: false}, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', parentHeightOffset: 0},
        theme: {mode: theme},
        colors: ["#ffd60a"],
        fill: {opacity},
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
}
