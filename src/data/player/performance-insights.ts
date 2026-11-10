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
export function comparePerformance(sessions: PlayerPerformanceSession[], windowSize: number | "season" = 6, leagueId = "all") {
    // Keep an entire bowling date in one period, including multiple team appearances.
    const seasonMode = windowSize === "season";
    const eligible = sessions.filter(session =>
        (leagueId === "all" || (seasonMode ? session.leagueName === leagueId : session.leagueId === leagueId))
        && /^\d{4}-\d{2}-\d{2}$/.test(session.date) && Number.isFinite(Date.parse(session.date)) && session.stats.gameStats.count > 0
    );
    const groupDates = (rows: PlayerPerformanceSession[]) => {
        const dates = new Map<string, PlayerStats[]>();
        for (const session of rows) {
            const group = dates.get(session.date) ?? [];
            group.push(session.stats);
            dates.set(session.date, group);
        }
        return [...dates].sort(([a], [b]) => b.localeCompare(a)).map(([date, stats]) => ({date, stats: mergeStats(stats)}));
    };
    const history = groupDates(eligible);
    const seasons = [...new Set(eligible.map(s => s.season).filter((s): s is string => Boolean(s)))].sort((a,b) =>
        Number(/\d{4}/.exec(b)?.[0] ?? 0) - Number(/\d{4}/.exec(a)?.[0] ?? 0) || b.localeCompare(a));
    const recentSeason = seasons[0], previousSeason = seasons[1];
    const size = seasonMode ? 0 : Math.min(Math.max(1, Math.floor(windowSize)), Math.floor(history.length / 2));
    const recent = seasonMode ? groupDates(eligible.filter(s => s.season === recentSeason && Boolean(recentSeason))) : history.slice(0,size);
    const previous = seasonMode ? groupDates(eligible.filter(s => s.season === previousSeason && Boolean(previousSeason))) : history.slice(size,size*2);
    const recentStats = mergeStats(recent.map(s => s.stats)), previousStats = mergeStats(previous.map(s => s.stats));
    const enoughGames = recent.length >= 2 && previous.length >= 2 && recentStats.gameStats.count >= 6 && previousStats.gameStats.count >= 6;
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
    return {history, size, seasonMode, recentSeason, previousSeason, recent, previous, recentStats, previousStats, enoughGames, metrics, trends, focus, strengths};
}

export function buildPracticePlan(comparison: ReturnType<typeof comparePerformance>) {
    if (!comparison.enoughGames) return [];
    const {trends, recentStats} = comparison;
    const skillTrends = trends.filter(t => t.id !== "average");
    const ordered = [...skillTrends].sort((a,b) => {
        const declineA = a.status === "declining", declineB = b.status === "declining";
        if (declineA !== declineB) return declineA ? -1 : 1;
        if (declineA) return a.improvement/a.threshold - b.improvement/b.threshold;
        const priority: Record<string,number> = {single:0,spares:1,firstBall:2,strikes:3,opens:4};
        return priority[a.id] - priority[b.id];
    });
    const seen = new Set<string>();
    const selected = ordered.filter(item => {
        const group = ["single","spares","opens"].includes(item.id) ? "spares" : "strike-ball";
        if (seen.has(group)) return false;
        seen.add(group); return true;
    }).slice(0,2);
    if (!selected.length) {
        const average = trends.find(t => t.id === "average");
        return average ? [{id:"score",title:"Find what changes between your high and low games",status:"Track",evidence:`Scratch average: ${average.previous!.toFixed(1)} → ${average.recent!.toFixed(1)} across ${recentStats.gameStats.count} recent games.`,reason:"Frame data is too limited to identify a specific shot to practice.",drill:["For the next three sessions, record your starting line, ball and each lane adjustment.","After each game, note one change that helped or hurt your pocket control."],goal:"Build a complete shot and spare log before choosing a technical change.",review:"Review the log after three sessions alongside the same comparison window."}] : [];
    }
    return selected.map(item => {
        const digits = item.id === "firstBall" ? 2 : 1;
        const unit = item.unit === "pp" ? "%" : " pins";
        const best = item.lowerIsBetter ? Math.min(item.recent!,item.previous!) : Math.max(item.recent!,item.previous!);
        const target = best.toFixed(digits);
        const drills: Record<string,string[]> = {
            single:["Spend 10 minutes on single-pin leaves: 10 shots at the 7 pin and 10 at the 10 pin, using a consistent spare setup.","Record makes out of 20. Repeat the weaker side before changing your approach."],
            spares:["Log the makeable spare leaves you miss during your next session.","Use a 15-minute practice block to repeat the two most frequent misses, 10 attempts per leave. Record each make."],
            opens:["Separate missed makeable spares from splits in your next session’s notes.","Spend 15 minutes repeating the two makeable leaves that caused the most opens, 10 attempts each."],
            firstBall:["Use a 20-shot practice block on one lane with the same ball and starting target; record first-ball pinfall.","Test one line adjustment for the next 10 shots and compare pocket hits before keeping it."],
            strikes:["Track pocket hits and strikes over a 20-shot practice block with a consistent starting line.","When the pocket changes, test one feet or target adjustment at a time and record whether contact improves."],
        };
        return {
            id:item.id,
            title:item.id === "single" ? "Make your single-pin routine repeatable" : item.id === "spares" ? "Turn recurring spare misses into makes" : item.id === "opens" ? "Close more makeable frames" : item.id === "firstBall" ? "Improve first-ball pocket control" : "Build a repeatable strike line",
            status:item.status === "declining" ? "Rebuild" : item.status === "improving" ? "Build on progress" : "Build consistency",
            evidence:`${item.label}: ${item.previous!.toFixed(digits)}${unit} → ${item.recent!.toFixed(digits)}${unit} across ${recentStats.gameStats.count} recent games.`,
            reason:item.status === "declining" ? "This measure has dropped versus your previous period, making it a priority to work on." : "Use a measured practice block to reinforce this part of your game and build on your current results.",
            drill:drills[item.id],
            goal:`${item.status === "declining" ? "Work back toward" : "Match or improve on"} your own ${target}${unit} ${item.label.toLowerCase()} over your next three sessions${item.lowerIsBetter ? "; lower is better" : ""}.`,
            review:"Record the practice result, then review after three sessions under similar lane conditions.",
        };
    });
}
