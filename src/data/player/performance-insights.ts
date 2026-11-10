import type {PlayerPerformanceSession} from "./player-aggregate";
import {mergeStats} from "./merge-stats";
import type {PlayerStats, RatioGroup} from "./player-stats";

export interface PerformanceMetric {
    id: string;
    label: string;
    recent: number | null;
    previous: number | null;
    unit: string;
    threshold: number;
    lowerIsBetter?: boolean;
    practice: string;
}
function rate(group: RatioGroup): number | null {
    return group.denominator >= 10 ? 100 * group.numerator / group.denominator : null;
}
export function comparePerformance(sessions: PlayerPerformanceSession[], windowSize = 6, leagueId = "all") {
    // Keep an entire bowling date in one period, including multiple team appearances.
    const dates = new Map<string, PlayerStats[]>();
    for (const session of sessions) {
        if (leagueId !== "all" && session.leagueId !== leagueId) continue;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(session.date) || !Number.isFinite(Date.parse(session.date)) || session.stats.gameStats.count <= 0) continue;
        const group = dates.get(session.date) ?? [];
        group.push(session.stats);
        dates.set(session.date, group);
    }
    const history = [...dates].sort(([a], [b]) => b.localeCompare(a)).map(([date, stats]) => ({date, stats: mergeStats(stats)}));
    const size = Math.min(Math.max(1, Math.floor(windowSize)), Math.floor(history.length / 2));
    const recent = history.slice(0, size), previous = history.slice(size, size * 2);
    const recentStats = mergeStats(recent.map(s => s.stats)), previousStats = mergeStats(previous.map(s => s.stats));
    const enoughGames = size >= 2 && recentStats.gameStats.count >= 6 && previousStats.gameStats.count >= 6;
    const frameRate = (stats: PlayerStats, key: "strikes" | "spares" | "singlePinSpares" | "opens") => stats.incompleteFrameData ? null : rate(stats[key]);
    const metrics: PerformanceMetric[] = [
        {id:"average", label:"Scratch average", recent:recentStats.gameStats.count ? recentStats.gameStats.average : null, previous:previousStats.gameStats.count ? previousStats.gameStats.average : null, unit:"pins", threshold:3, practice:"Track your starting line and each lane adjustment; review the games where your score drops."},
        {id:"strikes", label:"Strike rate", recent:frameRate(recentStats,"strikes"), previous:frameRate(previousStats,"strikes"), unit:"pp", threshold:3, practice:"Practice pocket control with a repeatable target and record which moves restore your strike line."},
        {id:"spares", label:"Spare conversion", recent:frameRate(recentStats,"spares"), previous:frameRate(previousStats,"spares"), unit:"pp", threshold:3, practice:"Give spare practice a dedicated block; track the leaves you miss and repeat those shots."},
        {id:"single", label:"Single-pin conversion", recent:frameRate(recentStats,"singlePinSpares"), previous:frameRate(previousStats,"singlePinSpares"), unit:"pp", threshold:3, practice:"Repeat your most-missed single-pin leaves with the same spare ball, starting position and target."},
        {id:"opens", label:"Open frames", recent:frameRate(recentStats,"opens"), previous:frameRate(previousStats,"opens"), unit:"pp", threshold:3, lowerIsBetter:true, practice:"Log the leaves behind your open frames and work on the most frequent makeable spare first."},
        {id:"firstBall", label:"First-ball average", recent:!recentStats.incompleteFrameData && recentStats.firstBallCount >= 20 ? recentStats.firstBallAverage : null, previous:!previousStats.incompleteFrameData && previousStats.firstBallCount >= 20 ? previousStats.firstBallAverage : null, unit:"pins", threshold:0.2, practice:"Work on a repeatable release and pocket entry; track first-ball pinfall while testing one adjustment at a time."},
    ];
    const trends = metrics.flatMap(metric => {
        if (!enoughGames || metric.recent == null || metric.previous == null) return [];
        const delta = metric.recent - metric.previous, improvement = delta * (metric.lowerIsBetter ? -1 : 1);
        return [{...metric, delta, improvement, status:improvement <= -metric.threshold ? "declining" as const : improvement >= metric.threshold ? "improving" as const : "steady" as const}];
    });
    const focus = trends.filter(t => t.status === "declining").sort((a,b) => a.improvement/a.threshold - b.improvement/b.threshold);
    const strengths = trends.filter(t => t.status === "improving").sort((a,b) => b.improvement/b.threshold - a.improvement/a.threshold);
    return {history, size, recent, previous, recentStats, previousStats, enoughGames, metrics, trends, focus, strengths};
}
