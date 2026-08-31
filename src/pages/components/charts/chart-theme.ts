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
                        // Keep zoom toolbar on phones — was previously hidden
                        toolbar: {
                            show: true,
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
