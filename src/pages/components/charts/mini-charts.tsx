/*
 * Inline micro-bar + sparkline charts for performance tables © 2026
 */

import type {FC} from "react";

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

export const MicroBarChart: FC<MicroBarChartProps> = ({
    values,
    isDark = true,
    height = 28,
}) => {
    if (!values.length) return <span className="bls-mini-empty">—</span>;
    const max = Math.max(...values, 1);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return (
        <div className="bls-micro-bars" style={{height}} title="Weekly series trend">
            {values.map((v, i) => (
                <span
                    key={i}
                    className="bls-micro-bar"
                    style={{height: `${Math.max(12, (v / max) * 100)}%`, background: barColor(v, mean, isDark)}}
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

export const Sparkline: FC<SparklineProps> = ({
    values,
    isDark = true,
    width = 72,
    height = 28,
}) => {
    if (values.length < 2) return <span className="bls-mini-empty">—</span>;
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
    const stroke = up ? (isDark ? "#30d158" : "#34c759") : (isDark ? "#ff9f0a" : "#ff9500");
    return (
        <svg className="bls-sparkline" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
            <polyline fill="none" stroke={stroke} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" points={points} />
        </svg>
    );
};

/** Letter grade from pins over/under the handicap line (score − book/entering average). */
export function performanceGradeFromDelta(delta: number | null | undefined): string {
    if (delta == null || Number.isNaN(delta)) return "—";
    if (delta >= 15) return "A+";
    if (delta >= 10) return "A";
    if (delta >= 6) return "A-";
    if (delta >= 3) return "B+";
    if (delta >= 0) return "B";
    if (delta >= -3) return "B-";
    if (delta >= -6) return "C+";
    if (delta >= -10) return "C";
    if (delta >= -15) return "C-";
    return "D";
}

export function performanceGrade(score: number | null | undefined, handicapBasis?: number | null): string {
    if (score == null || score <= 0) return "—";
    if (handicapBasis != null && handicapBasis > 0) {
        return performanceGradeFromDelta(score - handicapBasis);
    }
    if (score >= 220) return "A+";
    if (score >= 210) return "A";
    if (score >= 200) return "A-";
    if (score >= 190) return "B+";
    if (score >= 180) return "B";
    if (score >= 170) return "B-";
    if (score >= 160) return "C+";
    if (score >= 150) return "C";
    if (score >= 140) return "C-";
    return "D";
}

export function gradeClass(grade: string): string {
    if (grade.startsWith("A")) return "bls-grade-a";
    if (grade.startsWith("B")) return "bls-grade-b";
    if (grade.startsWith("C")) return "bls-grade-c";
    if (grade === "—") return "bls-grade-na";
    return "bls-grade-d";
}
