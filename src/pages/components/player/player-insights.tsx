/*
 * Player performance insights - targets scaled to the bowler's average / handicap
 */

import {type FC, useMemo, useState} from "react";
import {Badge, Card, CardBody} from "react-bootstrap";

import type {PlayerSeasonStats} from "../../../data/player/player-aggregate";
import type {PlayerStats, RatioGroup} from "../../../data/player/player-stats";

function pct(rg?: RatioGroup | null): number | null {
    if (!rg || rg.denominator <= 0) return null;
    return Math.round(rg.pct * 1000) / 10;
}

function fmt(n: number | null | undefined, digits = 1, suffix = ""): string {
    if (n == null || Number.isNaN(n)) return "--";
    return `${(Math.round(n * 10 ** digits) / 10 ** digits).toFixed(digits)}${suffix}`;
}

function clamp(n: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, n));
}

/** Typical house handicap: 90% of 220. */
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
    const split = pct(stats.splits);
    const firstBall = stats.firstBallAverage || null;
    const sd = stats.gameStats.sd || null;
    const cleanRate = games > 0 ? (stats.cleanGames / games) * 100 : null;
    const hungRate = games > 0 ? (stats.hungCount / games) * 100 : null;
    const turkeyRate = games > 0 ? (stats.turkeyCount / games) * 100 : null;
    const twoHundredRate = games > 0 ? (stats.games200 / games) * 100 : null;

    const latest = [...seasons].sort((a, b) => b.season.localeCompare(a.season))[0];
    const prior = [...seasons].sort((a, b) => b.season.localeCompare(a.season))[1];
    const seasonDrop = latest && prior && latest.games >= 6 && prior.games >= 6
        ? latest.average - prior.average
        : null;

    const out: Insight[] = [];
    const level = `${fmt(avg)} avg / ~${exp.hdcp} hdcp`;

    if (open != null) {
        const g = gradeGap(open, exp.open, true);
        if (g) {
            out.push({
                id: "opens",
                priority: g,
                title: g === "strength" ? "Open frames are under control for this average" : "More open frames than this average usually has",
                metric: `${fmt(open)}% open | ${level} target ${fmt(exp.open)}%`,
                why: g === "strength"
                    ? `${name} is closing frames better than a ${fmt(avg)} bowler typically does. That is how handicap nights get protected.`
                    : `A ${fmt(avg)} scratch bowler (~${exp.hdcp} pins of 90/220 handicap) usually opens about ${fmt(exp.open)}% of frames. ${fmt(open)}% is costing pins that handicap is not fully covering.`,
                workOn: [
                    "Make the single-pin spares first - they should be automatic at this average",
                    "Have a spare ball or a committed spare line instead of striking at every leftover",
                    "Count the 7 and 10 specifically after each session",
                ],
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
                metric: `${fmt(single)}% single-pin | ${level} target ${fmt(exp.single)}%`,
                why: g === "strength"
                    ? `At ${fmt(avg)}, ${fmt(exp.single)}% single-pin is the bar. ${name} is above that, which keeps handicap games from slipping.`
                    : `For a ${fmt(avg)} average, single pins should be made about ${fmt(exp.single)}% of the time. ${fmt(single)}% is leaving free pins on the table.`,
                workOn: [
                    "Pick one spare system (2-and-1 or 3-6-9) and use it every shot",
                    "Throw 20 dedicated 7-pins and 20 dedicated 10-pins in practice",
                    "If the first ball is light, walk through the spare before the next frame",
                ],
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
                metric: `${fmt(spare)}% spare | ${level} target ${fmt(exp.spare)}%`,
                why: g === "strength"
                    ? `A ${fmt(avg)} bowler is doing well at ${fmt(exp.spare)}% spares. ${name} is clearing that mark.`
                    : `Expected spare rate at ${fmt(avg)} is about ${fmt(exp.spare)}%. Getting back there is usually worth more than chasing extra hook.`,
                workOn: [
                    "Practice 2-8 / 3-9 / 4-6-7 / 4-6-10 looks, not just pocket strikes",
                    "Slow down on leftovers - spare shots do not need strike speed",
                    "Track spare make % separately from strike % for a month",
                ],
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
                metric: `${fmt(strike)}% strike | ${level} target ${fmt(exp.strike)}%`,
                why: g === "strength"
                    ? `${fmt(strike)}% strikes is above what a ${fmt(avg)} / ~${exp.hdcp} hdcp bowler usually posts. Protect that look.`
                    : `Around ${fmt(avg)}, a realistic strike rate is about ${fmt(exp.strike)}%, not a house-shot pro number. ${fmt(strike)}% is the gap to close.`,
                workOn: [
                    "Film two games from behind and check release repeatability",
                    "Play one tighter line for a night instead of chasing hook",
                    "Get the ball to the pocket, then adjust leftover shape - not the other way around",
                ],
            });
        }
    }

    if (firstBall != null) {
        const g = gradeGap(firstBall * 10, exp.firstBall * 10);
        if (g) {
            out.push({
                id: "first-ball",
                priority: g,
                title: g === "strength" ? "First ball is strong for this average" : "First ball is leaving more wood than this average",
                metric: `${fmt(firstBall)} first-ball | ${level} target ${fmt(exp.firstBall)}`,
                why: g === "strength"
                    ? `A ${fmt(exp.firstBall)} first-ball average is typical at ${fmt(avg)}. ${name} is beating that.`
                    : `At ${fmt(avg)}, first ball should be around ${fmt(exp.firstBall)} pins. Lower than that creates extra multi-pin spares handicap will not fully erase.`,
                workOn: [
                    "Watch the 3-6 or 2-8 leave - that usually means light or high",
                    "Keep speed and axis tilt in a narrower window for a full series",
                    "If the lane is tight, move in before you start forcing hook",
                ],
            });
        }
    }

    if (split != null) {
        const g = gradeGap(split, exp.split, true);
        if (g) {
            out.push({
                id: "splits",
                priority: g,
                title: g === "strength" ? "Splits are in range for this average" : "Splits are high for this average",
                metric: `${fmt(split)}% splits | ${level} target under ${fmt(exp.split)}%`,
                why: g === "strength"
                    ? `Fewer splits than a ${fmt(avg)} bowler typically sees. That is first-ball control.`
                    : `A ${fmt(avg)} bowler usually lives around ${fmt(exp.split)}% splits. More than that is a line/speed issue, not a spare issue.`,
                workOn: [
                    "Check if splits are coming from light hits vs. high hits",
                    "Start the night with a control ball if the fresh shot is jumpy",
                    "Move sooner when the pocket starts to stand the 10 or 7 up",
                ],
            });
        }
    }

    if (hungRate != null) {
        const g = gradeGap(hungRate, exp.hung, true);
        if (g) {
            out.push({
                id: "hung",
                priority: g === "focus" ? "watch" : g,
                title: g === "strength" ? "Not getting hung much for this average" : "Getting hung more than this average",
                metric: `${stats.hungCount} hung | ${fmt(hungRate)}% of games | ${level} target under ${fmt(exp.hung)}%`,
                why: g === "strength"
                    ? `Hung shots are under the ${fmt(exp.hung)}% mark that is normal at ${fmt(avg)}.`
                    : `At ${fmt(avg)}, hanging more than about ${fmt(exp.hung)}% of games starts cutting strings that this handicap expects to finish.`,
                workOn: [
                    "Note whether hungs are the same corner pin every time",
                    "If it is always the 10, the ball is likely finishing behind the head pin",
                    "Try one board right/left before changing balls",
                ],
            });
        }
    }

    if (sd != null && games >= 12) {
        const g = gradeGap(sd, exp.sd, true);
        if (g) {
            out.push({
                id: "consistency",
                priority: g === "focus" ? "watch" : g,
                title: g === "strength" ? "Game-to-game spread is tight for this average" : "Scoring is streakier than this average",
                metric: `SD ${fmt(sd)} | ${level} target under ${fmt(exp.sd)}`,
                why: g === "strength"
                    ? `A ${fmt(avg)} bowler is doing well if game SD stays near ${fmt(exp.sd)}. This is tighter than that.`
                    : `At ${fmt(avg)}, a realistic game-to-game SD is around ${fmt(exp.sd)}. Wider than that drops the handicap floor.`,
                workOn: [
                    "Use the same pre-shot routine for every shot in a series",
                    "Limit mid-game ball changes unless the leave pattern is obvious",
                    "Aim to keep every game of a series within 20 pins of each other",
                ],
            });
        }
    }

    if (seasonDrop != null && seasonDrop <= -6) {
        out.push({
            id: "trend",
            priority: "focus",
            title: "This season is off the prior pace",
            metric: `${latest!.season} avg ${fmt(latest!.average)} vs ${prior!.season} ${fmt(prior!.average)} (${fmt(seasonDrop)})`,
            why: `A multi-pin drop vs. last season changes the handicap you are bowling off. Simplify before adding equipment.`,
            workOn: [
                "Compare first-ball leave charts from this season vs. last",
                "Go back to the line and ball that produced the last good block",
                "Give spare shooting extra attention until the average flattens",
            ],
        });
    }

    if (cleanRate != null) {
        const g = gradeGap(cleanRate, exp.clean);
        if (g === "strength") {
            out.push({
                id: "clean-strength",
                priority: "strength",
                title: "Clean games are ahead of this average",
                metric: `${stats.cleanGames} clean | ${fmt(cleanRate)}% | ${level} target ${fmt(exp.clean)}%`,
                why: `At ${fmt(avg)}, about ${fmt(exp.clean)}% clean games is a solid mark. ${name} is above that.`,
                workOn: ["Treat every open as a post-game note, not just a bad frame"],
            });
        }
    }

    if (turkeyRate != null) {
        const g = gradeGap(turkeyRate, exp.turkey);
        if (g === "strength") {
            out.push({
                id: "turkey-strength",
                priority: "strength",
                title: "Strings are available for this average",
                metric: `${stats.turkeyCount} turkeys | ${fmt(twoHundredRate)}% of games are 200+ | target ${fmt(exp.turkey)}% turkeys`,
                why: `A ${fmt(avg)} bowler does not need 12-baggers. Hitting the ${fmt(exp.turkey)}% turkey mark is enough to feed 200s.`,
                workOn: ["Stay with the shot that started the string unless the leave tells you otherwise"],
            });
        }
    }

    const rank = {focus: 0, watch: 1, strength: 2};
    out.sort((a, b) => rank[a.priority] - rank[b.priority]);
    return out;
}

function buildGrokPrompt(name: string, stats: PlayerStats, seasons: PlayerSeasonStats[]): string {
    const latest = [...seasons].sort((a, b) => b.season.localeCompare(a.season))[0];
    const avg = stats.gameStats.average || 0;
    const exp = expectationsForAverage(avg || 160);
    const lines = [
        `You are an experienced bowling coach. Give ${name} practical, specific things to work on.`,
        `Hold them to a ${fmt(avg)} scratch average (~${exp.hdcp} pins of handicap on a 90% of 220 house). Do not compare them to a 220 scratch bowler.`,
        "Be direct. Rank the top 3 focus areas and explain why with the numbers vs those expected rates.",
        "",
        "Career stats:",
        `- Games: ${stats.gameStats.count}`,
        `- Scratch average: ${fmt(stats.gameStats.average)}`,
        `- Typical 90/220 handicap: ${exp.hdcp}`,
        `- High game / low game: ${stats.gameStats.max} / ${stats.gameStats.min}`,
        `- Game SD: ${fmt(stats.gameStats.sd)} (expected under ${fmt(exp.sd)})`,
        `- First-ball average: ${fmt(stats.firstBallAverage)} (expected ${fmt(exp.firstBall)})`,
        `- Strike %: ${fmt(pct(stats.strikes))}% (expected ${fmt(exp.strike)}%)`,
        `- Spare %: ${fmt(pct(stats.spares))}% (expected ${fmt(exp.spare)}%)`,
        `- Single-pin spare %: ${fmt(pct(stats.singlePinSpares))}% (expected ${fmt(exp.single)}%)`,
        `- Open %: ${fmt(pct(stats.opens))}% (expected ${fmt(exp.open)}%)`,
        `- Split %: ${fmt(pct(stats.splits))}% (expected under ${fmt(exp.split)}%)`,
        `- Clean games: ${stats.cleanGames}`,
        `- Got hung: ${stats.hungCount}`,
        `- Turkeys: ${stats.turkeyCount}`,
        `- 200+ games: ${stats.games200}`,
        `- 300s: ${stats.games300}`,
    ];
    if (latest) {
        lines.push("", `Most recent season (${latest.season}): avg ${fmt(latest.average)}, ${latest.games} games, HG ${latest.highGame}, clean ${latest.cleanGames}, hung ${latest.hungCount}, turkeys ${latest.turkeyCount}`);
    }
    lines.push("", "Tell them what to practice this week and what to ignore at this average.");
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
}> = ({name, stats, seasons}) => {
    const insights = useMemo(() => buildInsights(stats, seasons, name), [stats, seasons, name]);
    const prompt = useMemo(() => buildGrokPrompt(name, stats, seasons), [name, stats, seasons]);
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
                        {name} is a <strong>{fmt(avg)} scratch</strong> bowler
                        {" "}(~<strong>{exp.hdcp}</strong> pins of handicap on a typical 90% of 220 house).
                        Targets below are what that average usually looks like - not a 220 scratch standard.
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
                        <div className="bls-insight-strengths">
                            {strengths.map((item) => (
                                <div key={item.id} className="bls-insight-strength">
                                    <div className="bls-insight-strength-title">{item.title}</div>
                                    <div className="bls-insight-metric">{item.metric}</div>
                                    <p className="mb-0 fs-sm">{item.why}</p>
                                </div>
                            ))}
                        </div>
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
                        These notes compare {name} to what a {fmt(avg)} average / ~{exp.hdcp} handicap bowler usually shoots.
                        GitHub Pages cannot call Grok directly, but you can paste the brief below for a second opinion.
                    </p>
                    <div className="d-flex flex-wrap gap-2 mb-3">
                        <button type="button" className="bls-insight-btn" onClick={copyPrompt}>
                            {copied ? "Copied" : "Copy Grok prompt"}
                        </button>
                        <a className="bls-insight-btn is-ghost" href="https://grok.com" target="_blank" rel="noreferrer">
                            Open Grok
                        </a>
                    </div>
                    <pre className="bls-insight-prompt">{prompt}</pre>
                </CardBody>
            </Card>
        </div>
    );
};

export default InsightsPanel;
