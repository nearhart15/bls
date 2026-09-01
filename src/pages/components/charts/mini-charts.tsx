/*
 * Inline micro-bar + sparkline charts for performance tables
 */

import type {FC} from "react";
import {OverlayTrigger, Popover} from "react-bootstrap";

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

export const MicroBarChart: FC<MicroBarChartProps> = ({values, isDark = true, height = 28}) => {
    if (!values.length) return <span className="bls-mini-empty">-</span>;
    const max = Math.max(...values, 1);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return (
        <div className="bls-micro-bars" style={{height}} title="Weekly series trend">
            {values.map((v, i) => (
                <span key={i} className="bls-micro-bar" style={{height: `${Math.max(12, (v / max) * 100)}%`, background: barColor(v, mean, isDark)}} />
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

export const Sparkline: FC<SparklineProps> = ({values, isDark = true, width = 72, height = 28}) => {
    if (values.length < 2) return <span className="bls-mini-empty">-</span>;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const pad = 2;
    const innerW = width - pad * 2;
    const innerH = height - pad * 2;
    const points = values.map((v, i) => {
        const x = pad + (i / (values.length - 1)) * innerW;
        const y = pad + innerH - ((v - min) / range) * innerH;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
    const up = values[values.length - 1] >= values[0];
    const stroke = up ? (isDark ? "#30d158" : "#34c759") : (isDark ? "#ff9f0a" : "#ff9500");
    return (
        <svg className="bls-sparkline" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
            <polyline fill="none" stroke={stroke} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" points={points} />
        </svg>
    );
};

export function performanceGradeFromDelta(delta: number | null | undefined): string {
    if (delta == null || Number.isNaN(delta)) return "-";
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
    if (score == null || score <= 0) return "-";
    if (handicapBasis != null && handicapBasis > 0) return performanceGradeFromDelta(score - handicapBasis);
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
    if (grade === "-") return "bls-grade-na";
    return "bls-grade-d";
}

export function performanceRatingFromDelta(delta: number | null | undefined): number | null {
    if (delta == null || Number.isNaN(delta)) return null;
    return Math.round(Math.max(0, Math.min(100, 70 + delta * 1.2)));
}

export function performanceRatingFromAverage(avg: number | null | undefined): number | null {
    if (avg == null || avg <= 0) return null;
    return Math.round(Math.max(0, Math.min(100, 70 + (avg - 180) * 0.5)));
}

export function ratingClass(rating: number | null): string {
    if (rating == null) return "bls-grade-na";
    if (rating >= 80) return "bls-grade-a";
    if (rating >= 65) return "bls-grade-b";
    if (rating >= 50) return "bls-grade-c";
    return "bls-grade-d";
}

function fmt1(n: number): string {
    return (Math.round(n * 10) / 10).toFixed(1);
}

export interface RatingBadgeProps {
    rating: number | null;
    delta?: number | null;
    bookAverage?: number | null;
    comparedAverage?: number | null;
    sampleLabel?: string;
}

export const RatingBadge: FC<RatingBadgeProps> = ({
    rating, delta, bookAverage, comparedAverage,
    sampleLabel = "each game vs entering average / handicap basis",
}) => {
    if (rating == null) return <span className={`bls-grade ${ratingClass(null)}`}>-</span>;
    const usedDelta = delta != null && !Number.isNaN(delta);
    const body = usedDelta ? (
        <>
            <p className="mb-2">Rating is each game versus the average your handicap is based on ({sampleLabel}).</p>
            <ul className="mb-2 ps-3">
                {comparedAverage != null && <li>Compared avg: <strong>{fmt1(comparedAverage)}</strong></li>}
                {bookAverage != null && <li>Book / entering avg: <strong>{fmt1(bookAverage)}</strong></li>}
                <li>Difference: <strong>{delta! >= 0 ? "+" : ""}{fmt1(delta!)} pins</strong></li>
            </ul>
            <p className="mb-1"><strong>Formula</strong></p>
            <p className="mb-1 font-monospace small">rating = 70 + (difference x 1.2)</p>
            <p className="mb-2 font-monospace small">70 + ({fmt1(delta!)} x 1.2) = {fmt1(70 + delta! * 1.2)} -> <strong>{rating}</strong></p>
            <p className="mb-0 text-body-secondary small">Bowling your handicap average is about a 70. Most nights land in the 60-80 range. Capped at 0 and 100.</p>
        </>
    ) : (
        <>
            <p className="mb-2">No per-game handicap comparison is available yet, so this uses scratch average as a stand-in.</p>
            {bookAverage != null && <p className="mb-2">Scratch average: <strong>{fmt1(bookAverage)}</strong></p>}
            <p className="mb-1"><strong>Fallback formula</strong></p>
            <p className="mb-2 font-monospace small">rating = 70 + (average - 180) x 0.5{bookAverage != null ? ` -> 70 + (${fmt1(bookAverage)} - 180) x 0.5 = ${rating}` : ""}</p>
            <p className="mb-0 text-body-secondary small">A 180 average is about a 70 on this fallback. Game-vs-handicap ratings replace this when scores exist.</p>
        </>
    );
    const pop = (
        <Popover id={`rating-explain-${rating}-${usedDelta ? "d" : "a"}`}>
            <Popover.Header>How this rating is calculated</Popover.Header>
            <Popover.Body>{body}</Popover.Body>
        </Popover>
    );
    return (
        <OverlayTrigger trigger="click" rootClose placement="left" overlay={pop}>
            <button type="button" className={`bls-grade bls-grade-btn ${ratingClass(rating)}`} aria-label={`Rating ${rating}. Tap to see how it is calculated.`}>
                {rating}
            </button>
        </OverlayTrigger>
    );
};
