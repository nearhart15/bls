/*
 * Shared ApexCharts theming for mobile-friendly graphs © 2026
 */

import type {ApexOptions} from "apexcharts";
import type {ThemeMode} from "../theme";

export function chartPalette(theme: ThemeMode) {
    const isDark = theme === "dark";
    return {
        isDark,
        text: isDark ? "#a1a1a6" : "#6e6e73",
        textStrong: isDark ? "#f5f5f7" : "#1d1d1f",
        grid: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
        tooltipBg: isDark ? "#111111" : "#ffffff",
        series: isDark
            ? ["#2997ff", "#30d158", "#ff9f0a", "#bf5af2", "#ff375f"]
            : ["#0071e3", "#34c759", "#ff9500", "#af52de", "#ff3b30"],
    };
}

/**
 * Selection-zoom icon: corner brackets + horizontal span
 * Reads as "drag a range" instead of another magnifying glass.
 */
const ICON_SELECT_RANGE =
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M4 9V5a1 1 0 0 1 1-1h4"/>' +
    '<path d="M4 15v4a1 1 0 0 0 1 1h4"/>' +
    '<path d="M20 9V5a1 1 0 0 0-1-1h-4"/>' +
    '<path d="M20 15v4a1 1 0 0 1-1 1h-4"/>' +
    '<path d="M8 12h8"/>' +
    '<path d="M10 10l-2 2 2 2"/>' +
    '<path d="M14 10l2 2-2 2"/>' +
    "</svg>";

/** Shared toolbar: custom range-select icon, no redundant selection tool */
export const chartToolbarTools: NonNullable<
    NonNullable<ApexOptions["chart"]>["toolbar"]
>["tools"] = {
    download: false,
    selection: false,
    zoom: ICON_SELECT_RANGE,
    zoomin: true,
    zoomout: true,
    pan: true,
    reset: true,
};

/** Base options shared by all BLS charts */
export function baseChartOptions(theme: ThemeMode, title: string): ApexOptions {
    const p = chartPalette(theme);

    return {
        chart: {
            background: "transparent",
            foreColor: p.text,
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            toolbar: {
                show: true,
                offsetX: 0,
                offsetY: 0,
                autoSelected: "zoom",
                tools: chartToolbarTools,
            },
            zoom: {
                enabled: true,
                type: "x",
                autoScaleYaxis: true,
                allowMouseWheelZoom: true,
            },
            selection: {
                enabled: true,
                type: "x",
            },
            animations: {
                enabled: true,
                speed: 350,
            },
            parentHeightOffset: 0,
            redrawOnParentResize: true,
            redrawOnWindowResize: true,
        },
        theme: {
            mode: theme,
        },
        colors: p.series,
        title: {
            text: title,
            align: "left",
            margin: 8,
            style: {
                fontSize: "15px",
                fontWeight: 600,
                color: p.textStrong,
            },
        },
        grid: {
            borderColor: p.grid,
            strokeDashArray: 3,
            padding: {
                left: 8,
                right: 12,
                top: 12,
                bottom: 0,
            },
        },
        legend: {
            position: "bottom",
            horizontalAlign: "center",
            fontSize: "12px",
            fontWeight: 500,
            markers: {
                size: 6,
                offsetX: -2,
            },
            itemMargin: {
                horizontal: 10,
                vertical: 4,
            },
        },
        tooltip: {
            theme: theme,
            style: {
                fontSize: "12px",
            },
            x: {
                format: "dd MMM yyyy",
            },
        },
        dataLabels: {
            enabled: false,
        },
        noData: {
            text: "No data yet",
            style: {
                color: p.text,
                fontSize: "14px",
            },
        },
        responsive: [
            {
                breakpoint: 576,
                options: {
                    chart: {
                        height: 280,
                        toolbar: {
                            show: true,
                            tools: chartToolbarTools,
                        },
                    },
                    title: {
                        style: {
                            fontSize: "14px",
                        },
                    },
                    legend: {
                        position: "bottom",
                        fontSize: "11px",
                        itemMargin: {
                            horizontal: 6,
                            vertical: 2,
                        },
                    },
                    xaxis: {
                        labels: {
                            rotate: -45,
                            rotateAlways: true,
                            style: {
                                fontSize: "10px",
                            },
                            offsetY: 2,
                        },
                        tickAmount: 4,
                    },
                    stroke: {
                        width: 2,
                    },
                },
            },
            {
                breakpoint: 992,
                options: {
                    chart: {
                        height: 300,
                    },
                    legend: {
                        position: "bottom",
                    },
                    xaxis: {
                        labels: {
                            style: {
                                fontSize: "11px",
                            },
                        },
                        tickAmount: 6,
                    },
                },
            },
        ],
    };
}
