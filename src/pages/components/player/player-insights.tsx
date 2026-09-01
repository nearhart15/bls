/*
 * Player performance insights
 */

import {type FC, useMemo, useState} from "react";
import {Badge, Card, CardBody} from "react-bootstrap";

import type {PlayerLeagueAppearance, PlayerSeasonStats} from "../../../data/player/player-aggregate";
import type {PlayerStats, RatioGroup} from "../../../data/player/player-stats";

function pct(rg?: RatioGroup | null): number | null {
    if (!rg || rg.denominator <= 0) return null;
    return Math.round(rg.pct * 1000) / 10;
}

function fmt(n: number | null | undefined, digits = 1): string {
    if (n == null || Number.isNaN(n)) return "--";
    return (Math.round(n * 10 ** digits) / 10 ** digits).toFixed(digits);
}

function clamp(n: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, n));
}

function typicalHandicap(avg: number): number {
    return Math.max(0, Math.round(0.9 * (220 - avg)));
}

interface Expectation {
    avg: number;
    hdcp: number;
    strike: number;
    spare: number;
    single: number;
    open: number;
    firstBall: number;
    split: number;
    hung: number;
    clean: number;
    turkey: number;
    twoHundred: number;
    sd: number;
}

function expectationsForAverage(avg: number): Expectation {
    const a = clamp(avg, 110, 230);
    return {
        avg,
        hdcp: typicalHandicap(avg),
        strike: Math.round((28 + (a - 150) * 0.37) * 10) / 10,
        spare: Math.round((42 + (a - 150) * 0.33) * 10) / 10,
        single: Math.round((70 + (a - 150) * 0.33) * 10) / 10,
        open: Math.round(clamp(26 - (a - 150) * 0.27, 6, 40) * 10) / 10,
        firstBall: Math.round((7.6 + (a - 150) * 0.023) * 10) / 10,
        split: Math.round(clamp(12 - (a - 150) * 0.08, 4, 16) * 10) / 10,
        hung: Math.round(clamp(18 - (a - 150) * 0.1, 6, 22) * 10) / 10,
        clean: Math.round(clamp(8 + (a - 150) * 0.2, 4, 28) * 10) / 10,
        turkey: Math.round(clamp(4 + (a - 150) * 0.12, 2, 16) * 10) / 10,
        twoHundred: Math.round(clamp(8 + (a - 150) * 0.35, 2, 40) * 10) / 10,
        sd: Math.round(clamp(32 - (a - 150) * 0.08, 18, 36) * 10) / 10,
    };
}

type Priority = "focus" | "watch" | "strength";

interface Insight {
    id: string;
    priority: Priority;
    title: string;
    metric: string;
    why: string;
    workOn: string[];
}

function gradeGap(actual: number, expected: number, worseIsHigher = false): Priority | null {
    const gap = worseIsHigher ? actual - expected : expected - actual;
    if (gap >= 6) return "focus";
    if (gap >= 3) return "watch";
    if (gap <= -4) return "strength";
    return null;
}

function buildInsights(stats: PlayerStats, seasons: PlayerSeasonStats[], name: string): Insight[] {
    const games = stats.gameStats.count || 0;
    const avg = stats.gameStats.average || 0;
    if (games <= 0 || avg <= 0) return [];
    const exp = expectationsForAverage(avg);
    const strike = pct(stats.strikes);
    const spare = pct(stats.spares);
    const single = pct(stats.singlePinSpares);
    const open = pct(stats.opens);
    const out: Insight[] = [];
    const level = `${fmt(avg)} avg / ~${exp.hdcp} hdcp`;

    if (open != null) {
        const g = gradeGap(open, exp.open, true);
        if (g) {
            out.push({
                id: "opens",
                priority: g,
                title: g === "strength" ? "Open frames are under control" : "More open frames than this average usually has",
                metric: `${fmt(open)}% open | ${level} target ${fmt(exp.open)}%`,
                why: `${name} opens ${fmt(open)}% of frames vs ${fmt(exp.open)}% expected at this average.`,
                workOn: ["Make single-pin spares first", "Use a committed spare line", "Count 7s and 10s after each session"],
            });
        }
    }
    if (single != null) {
        const g = gradeGap(single, exp.single);
        if (g) {
            out.push({
                id: "single-pin",
                priority: g,
                title: g === "strength" ? "Corner pins match this average" : "Single-pin conversion is below this average",
                metric: `${fmt(single)}% single-pin | target ${fmt(exp.single)}%`,
                why: `Single-pin make rate is ${fmt(single)}% vs ${fmt(exp.single)}% expected.`,
                workOn: ["Pick one spare system and stay with it", "Throw dedicated 7 and 10 pin shots in practice"],
            });
        }
    }
    if (spare != null) {
        const g = gradeGap(spare, exp.spare);
        if (g) {
            out.push({
                id: "spares",
                priority: g,
                title: g === "strength" ? "Spare rate fits this average" : "Spare game is light for this average",
                metric: `${fmt(spare)}% spare | target ${fmt(exp.spare)}%`,
                why: `Spare rate is ${fmt(spare)}% vs ${fmt(exp.spare)}% expected.`,
                workOn: ["Practice multi-pin leaves", "Track spare make % separately from strike %"],
            });
        }
    }
    if (strike != null) {
        const g = gradeGap(strike, exp.strike);
        if (g) {
            out.push({
                id: "strikes",
                priority: g,
                title: g === "strength" ? "Strike rate is ahead of this average" : "Strike rate is behind this average",
                metric: `${fmt(strike)}% strike | target ${fmt(exp.strike)}%`,
                why: `Strike rate is ${fmt(strike)}% vs ${fmt(exp.strike)}% expected.`,
                workOn: ["Get the ball to the pocket first", "Play one tighter line for a night"],
            });
        }
    }
    const latest = [...seasons].sort((a, b) => b.season.localeCompare(a.season))[0];
    const prior = [...seasons].sort((a, b) => b.season.localeCompare(a.season))[1];
    if (latest && prior && latest.games >= 6 && prior.games >= 6 && latest.average - prior.average <= -6) {
        out.push({
            id: "trend",
            priority: "focus",
            title: "This season is off the prior pace",
            metric: `${latest.season} ${fmt(latest.average)} vs ${prior.season} ${fmt(prior.average)}`,
            why: "A multi-pin drop vs last season changes the handicap you are bowling off.",
            workOn: ["Go back to the last good line and ball", "Give spare shooting extra attention"],
        });
    }
    const rank = {focus: 0, watch: 1, strength: 2};
    out.sort((a, b) => rank[a.priority] - rank[b.priority]);
    return out;
}

function buildGrokPrompt(
    name: string,
    stats: PlayerStats,
    seasons: PlayerSeasonStats[],
    insights: Insight[],
    appearances: PlayerLeagueAppearance[],
): string {
    const avg = stats.gameStats.average || 0;
    const exp = expectationsForAverage(avg || 160);
    const latest = [...seasons].sort((a, b) => b.season.localeCompare(a.season))[0];
    const lines = [
        `You are an experienced USBC league bowling coach. ${name} wants a specific practice plan.`,
        "Use ONLY the numbers in this brief. Do not invent stats that are not here.",
        `Hold them to a ${fmt(avg)} scratch average (~${exp.hdcp} pins of 90/220 handicap). Do not coach them like a 220 scratch bowler.`,
        "Rank the top 3 focus areas with the numbers vs expected rates, then give a 7-day practice plan.",
        "",
        "Expected rates:",
        `- Strike ${fmt(exp.strike)}% | spare ${fmt(exp.spare)}% | single-pin ${fmt(exp.single)}% | open ${fmt(exp.open)}% | first ball ${fmt(exp.firstBall)} | clean ${fmt(exp.clean)}% | hung ${fmt(exp.hung)}% | turkey ${fmt(exp.turkey)}% | 200s ${fmt(exp.twoHundred)}% | SD under ${fmt(exp.sd)}`,
        "",
        "Career stats:",
        `- Games ${stats.gameStats.count}, pinfall ${stats.pinfall}, avg ${fmt(stats.gameStats.average)}, min/max ${stats.gameStats.min}/${stats.gameStats.max}, SD ${fmt(stats.gameStats.sd)}`,
        `- Series avg ${fmt(stats.seriesStats.average)}, min/max ${stats.seriesStats.min}/${stats.seriesStats.max}`,
        `- First ball ${fmt(stats.firstBallAverage)}, pinfall/frame ${fmt(stats.avgPinfallPerFrame)}`,
        `- Strike ${fmt(pct(stats.strikes))}% (${stats.strikes.numerator}/${stats.strikes.denominator})`,
        `- Spare ${fmt(pct(stats.spares))}% | single-pin ${fmt(pct(stats.singlePinSpares))}% | open ${fmt(pct(stats.opens))}% | split ${fmt(pct(stats.splitsOccurred) ?? pct(stats.splits))}%`,
        `- Clean ${stats.cleanGames}, hung ${stats.hungCount}, turkeys ${stats.turkeyCount}, 200s ${stats.games200}, 300s ${stats.games300}, 600s ${stats.series600}`,
        `- 10th marks ${stats.tenthMarkGames ? fmt(stats.avgTenthMarks) : "n/a"}`,
        `- Pace to 50/100/150/200 frames: ${(stats.paceAvgFrames ?? []).map((n) => fmt(n)).join(" / ") || "n/a"}`,
        `- Frame pinfall 1-10: ${(stats.framePinfallAvg ?? []).map((n) => fmt(n)).join(", ") || "n/a"}`,
    ];
    if (insights.length) {
        lines.push("", "Site read:");
        insights.forEach((i) => lines.push(`- ${i.priority}: ${i.title} | ${i.metric} | ${i.why}`));
    }
    if (seasons.length) {
        lines.push("", "Seasons:");
        [...seasons].sort((a, b) => b.season.localeCompare(a.season)).forEach((s) => {
            lines.push(`- ${s.season}: ${s.games} games, avg ${fmt(s.average)}, HG ${s.highGame}, 200s ${s.games200}, clean ${s.cleanGames}, hung ${s.hungCount}, turkeys ${s.turkeyCount}`);
        });
    }
    if (latest) lines.push("", `Most recent season: ${latest.season}`);
    if (appearances.length) {
        lines.push("", "Leagues:");
        appearances.forEach((a) => {
            const s = a.stats;
            lines.push(`- ${a.season} | ${a.leagueName} | ${a.teamName} | ${a.status}${s ? ` | ${s.gameStats.count} games avg ${fmt(s.gameStats.average)} strike ${fmt(pct(s.strikes))}% spare ${fmt(pct(s.spares))}% open ${fmt(pct(s.opens))}%` : ""}`);
        });
    }
    lines.push("", "Output: 1) verdict 2) top 3 focus areas 3) leave-alone strengths 4) this week practice plan 5) what to watch next league night.");
    return lines.join("\n");
}

const PRIORITY_LABEL: Record<Priority, string> = {
    focus: "Work on this",
    watch: "Keep an eye on",
    strength: "Strength",
};

export const InsightsPanel: FC<{
    name: string;
    stats: PlayerStats;
    seasons: PlayerSeasonStats[];
    appearances?: PlayerLeagueAppearance[];
}> = ({name, stats, seasons, appearances = []}) => {
    const insights = useMemo(() => buildInsights(stats, seasons, name), [stats, seasons, name]);
    const prompt = useMemo(
        () => buildGrokPrompt(name, stats, seasons, insights, appearances),
        [name, stats, seasons, insights, appearances],
    );
    const [copied, setCopied] = useState(false);
    const focus = insights.filter((i) => i.priority !== "strength");
    const strengths = insights.filter((i) => i.priority === "strength");
    const headline = focus[0];
    const avg = stats.gameStats.average || 0;
    const exp = expectationsForAverage(avg || 160);

    const copyPrompt = async () => {
        try {
            await navigator.clipboard.writeText(prompt);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1800);
        } catch {
            setCopied(false);
        }
    };

    if (stats.gameStats.count <= 0) {
        return (
            <Card className="bls-profile-card">
                <div className="bls-profile-card-head">Performance insights</div>
                <CardBody className="text-body-secondary">Not enough games yet for a useful read.</CardBody>
            </Card>
        );
    }

    return (
        <div className="bls-insights">
            <Card className="bls-profile-card mb-3">
                <div className="bls-profile-card-head">Expectations for this average</div>
                <CardBody>
                    <p className="mb-3">
                        {name} is a <strong>{fmt(avg)}</strong> scratch bowler (~<strong>{exp.hdcp}</strong> pins of 90/220 handicap).
                    </p>
                    <div className="bls-allstats-grid">
                        <div className="bls-allstats-cell"><div className="bls-allstats-val">{fmt(exp.strike)}%</div><div className="bls-allstats-lbl">Expected strike</div></div>
                        <div className="bls-allstats-cell"><div className="bls-allstats-val">{fmt(exp.spare)}%</div><div className="bls-allstats-lbl">Expected spare</div></div>
                        <div className="bls-allstats-cell"><div className="bls-allstats-val">{fmt(exp.single)}%</div><div className="bls-allstats-lbl">Expected single-pin</div></div>
                        <div className="bls-allstats-cell"><div className="bls-allstats-val">{fmt(exp.open)}%</div><div className="bls-allstats-lbl">Expected opens</div></div>
                        <div className="bls-allstats-cell"><div className="bls-allstats-val">{fmt(exp.firstBall)}</div><div className="bls-allstats-lbl">Expected first ball</div></div>
                        <div className="bls-allstats-cell"><div className="bls-allstats-val">{exp.hdcp}</div><div className="bls-allstats-lbl">Typical 90/220 hdcp</div></div>
                    </div>
                </CardBody>
            </Card>

            {strengths.length > 0 && (
                <Card className="bls-profile-card mb-3">
                    <div className="bls-profile-card-head">What is already working</div>
                    <CardBody>
                        {strengths.map((item) => (
                            <div key={item.id} className="bls-insight-strength mb-3">
                                <div className="bls-insight-strength-title">{item.title}</div>
                                <div className="bls-insight-metric">{item.metric}</div>
                                <p className="mb-0 fs-sm">{item.why}</p>
                            </div>
                        ))}
                    </CardBody>
                </Card>
            )}

            {headline && (
                <Card className="bls-profile-card bls-insight-hero mb-3">
                    <div className="bls-profile-card-head">Start here</div>
                    <CardBody>
                        <div className="bls-insight-kicker">{PRIORITY_LABEL[headline.priority]}</div>
                        <h2 className="bls-insight-title">{headline.title}</h2>
                        <p className="bls-insight-metric">{headline.metric}</p>
                        <p className="mb-3">{headline.why}</p>
                        <ul className="bls-insight-list">
                            {headline.workOn.map((item) => <li key={item}>{item}</li>)}
                        </ul>
                    </CardBody>
                </Card>
            )}

            <div className="row g-3 mb-3">
                {focus.slice(1).map((item) => (
                    <div className="col-md-6" key={item.id}>
                        <Card className={`bls-profile-card bls-insight-card is-${item.priority} h-100`}>
                            <CardBody>
                                <Badge bg={item.priority === "focus" ? "danger" : "warning"} text={item.priority === "watch" ? "dark" : undefined} className="mb-2">
                                    {PRIORITY_LABEL[item.priority]}
                                </Badge>
                                <h3 className="bls-insight-card-title">{item.title}</h3>
                                <p className="bls-insight-metric">{item.metric}</p>
                                <p className="fs-sm mb-2">{item.why}</p>
                                <ul className="bls-insight-list">
                                    {item.workOn.map((step) => <li key={step}>{step}</li>)}
                                </ul>
                            </CardBody>
                        </Card>
                    </div>
                ))}
            </div>

            <Card className="bls-profile-card mb-3">
                <div className="bls-profile-card-head">Ask Grok</div>
                <CardBody>
                    <p className="fs-sm text-body-secondary">
                        Paste this brief into Grok for a second opinion. It includes career, season, and league numbers.
                    </p>
                    <div className="d-flex flex-wrap gap-2 mb-3">
                        <button type="button" className="bls-insight-btn" onClick={copyPrompt}>
                            {copied ? "Copied" : "Copy Grok prompt"}
                        </button>
                        <a className="bls-insight-btn is-ghost" href="https://grok.com" target="_blank" rel="noreferrer">Open Grok</a>
                    </div>
                    <pre className="bls-insight-prompt">{prompt}</pre>
                </CardBody>
            </Card>
        </div>
    );
};

export default InsightsPanel;
