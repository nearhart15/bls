/*
 * Inline micro-bar + sparkline charts for performance tables © 2026
 */

import type {FC} from "react";

/** Color a bar by how it compares to the series mean */
function barColor(value: number, mean: number, isDark: boolean): string {
    if (mean <= 0) return isDark ? "#30d158" : "#34c759";
    const ratio = value / mean;
    if (ratio >= 1.05) return isDark ? "#30d158" : "#34c759";
    if (ratio >= 0.97) return isDark ? "#ffd60a" : "#ffcc00";
    if (ratio >= 0.9) return isDark ? "#ff9f0a" : "#ff9500";
    return isDark ? "#ff453a" : "#ff3b30";
}

interface MicroBarChartProps {
    values: number[];
    isDark?: boolean;
    height?: number;
}

/** Vertical micro-bar chart (season / weekly series trend) */
export const MicroBarChart: FC<MicroBarChartProps> = ({
    values,
    isDark = true,
    height = 28,
}) => {
    if (!values.length) {
        return <span className="bls-mini-empty">—</span>;
    }
    const max = Math.max(...values, 1);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;

    return (
        <div className="bls-micro-bars" style={{height}} title="Weekly series trend">
            {values.map((v, i) => (
                <span
                    key={i}
                    className="bls-micro-bar"
                    style={{
                        height: `${Math.max(12, (v / max) * 100)}%`,
                        background: barColor(v, mean, isDark),
                    }}
                />
            ))}
        </div>
    );
};

interface SparklineProps {
    values: number[];
    isDark?: boolean;
    width?: number;
    height?: number;
}

/** Simple SVG sparkline for running average / weekly trend */
export const Sparkline: FC<SparklineProps> = ({
    values,
    isDark = true,
    width = 72,
    height = 28,
}) => {
    if (values.length < 2) {
        return <span className="bls-mini-empty">—</span>;
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const pad = 2;
    const innerW = width - pad * 2;
    const innerH = height - pad * 2;

    const points = values
        .map((v, i) => {
            const x = pad + (i / (values.length - 1)) * innerW;
            const y = pad + innerH - ((v - min) / range) * innerH;
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(" ");

    const last = values[values.length - 1];
    const first = values[0];
    const up = last >= first;
    const stroke = up
        ? isDark
            ? "#30d158"
            : "#34c759"
        : isDark
          ? "#ff9f0a"
          : "#ff9500";

    return (
        <svg
            className="bls-sparkline"
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            aria-hidden
        >
            <polyline
                fill="none"
                stroke={stroke}
                strokeWidth="1.75"
                strokeLinejoin="round"
                strokeLinecap="round"
                points={points}
            />
        </svg>
    );
};

/** Letter grade from scratch average */
export function performanceGrade(avg: number | null | undefined): string {
    if (avg == null || avg <= 0) return "—";
    if (avg >= 220) return "A+";
    if (avg >= 210) return "A";
    if (avg >= 200) return "A-";
    if (avg >= 190) return "B+";
    if (avg >= 180) return "B";
    if (avg >= 170) return "B-";
    if (avg >= 160) return "C+";
    if (avg >= 150) return "C";
    if (avg >= 140) return "C-";
    return "D";
}

export function gradeClass(grade: string): string {
    if (grade.startsWith("A")) return "bls-grade-a";
    if (grade.startsWith("B")) return "bls-grade-b";
    if (grade.startsWith("C")) return "bls-grade-c";
    if (grade === "—") return "bls-grade-na";
    return "bls-grade-d";
}
