/*
 * Player performance insights — stat-based coaching plus a Grok prompt
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
    if (n == null || Number.isNaN(n)) return "—";
    return `${(Math.round(n * 10 ** digits) / 10 ** digits).toFixed(digits)}${suffix}`;
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

function buildInsights(stats: PlayerStats, seasons: PlayerSeasonStats[], name: string): Insight[] {
    const games = stats.gameStats.count || 0;
    if (games <= 0) return [];

    const strike = pct(stats.strikes);
    const spare = pct(stats.spares);
    const single = pct(stats.singlePinSpares);
    const open = pct(stats.opens);
    const split = pct(stats.splits);
    const firstBall = stats.firstBallAverage || null;
    const sd = stats.gameStats.sd || null;
    const avg = stats.gameStats.average || null;
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

    if (open != null && open > 22) {
        out.push({
            id: "opens",
            priority: open > 30 ? "focus" : "watch",
            title: "Too many open frames",
            metric: `${fmt(open)}% open  ·  target under 18%`,
            why: `${name} is leaving ${fmt(open)}% of frames open. Opens are usually a bigger average killer than raw strike rate.`,
            workOn: [
                "Make the single-pin spares first — they should be automatic",
                "Have a spare ball or a committed spare line instead of striking at every leftover",
                "Count the 7 and 10 specifically after each session",
            ],
        });
    }

    if (single != null && single < 78) {
        out.push({
            id: "single-pin",
            priority: single < 68 ? "focus" : "watch",
            title: "Single-pin conversion is leaking pins",
            metric: `${fmt(single)}% single-pin  ·  target 80%+`,
            why: `League averages jump quickly when the corner pins start going. ${fmt(single)}% means several free pins are walking each night.`,
            workOn: [
                "Pick one spare system (2-and-1 or 3-6-9) and use it every shot",
                "Throw 20 dedicated 7-pins and 20 dedicated 10-pins in practice",
                "If the first ball is light, walk through the spare before the next frame",
            ],
        });
    }

    if (spare != null && spare < 50) {
        out.push({
            id: "spares",
            priority: spare < 42 ? "focus" : "watch",
            title: "Spare game is holding the average down",
            metric: `${fmt(spare)}% spare  ·  target 52%+`,
            why: "A modest strike night can still score well if the multi-pin leftovers get picked up. This spare rate is leaving series on the table.",
            workOn: [
                "Practice 2–8 / 3–9 / 4–6–7 / 4–6–10 looks, not just pocket strikes",
                "Slow down on leftovers — spare shots do not need strike speed",
                "Track spare make % separately from strike % for a month",
            ],
        });
    }

    if (strike != null && strike < 35) {
        out.push({
            id: "strikes",
            priority: strike < 28 ? "focus" : "watch",
            title: "Pocket strike rate needs a bump",
            metric: `${fmt(strike)}% strike  ·  target 38%+`,
            why: "Without enough strikes, even a clean spare night tops out. First-ball quality is the next lever.",
            workOn: [
                "Film two games from behind and check release repeatability",
                "Play one tighter line for a night instead of chasing hook",
                "Get the ball to the pocket, then adjust leftover shape — not the other way around",
            ],
        });
    }

    if (firstBall != null && firstBall < 8.3) {
        out.push({
            id: "first-ball",
            priority: firstBall < 8.0 ? "focus" : "watch",
            title: "First ball is leaving too much wood",
            metric: `${fmt(firstBall)} first-ball avg  ·  target 8.5+`,
            why: "A lower first-ball average means more multi-pin spares and more chance of an open. Pocket quality comes before spare gymnastics.",
            workOn: [
                "Watch the 3-6 or 2-8 leave — that usually means light or high",
                "Keep speed and axis tilt in a narrower window for a full series",
                "If the lane is tight, move in before you start forcing hook",
            ],
        });
    }

    if (split != null && split > 8) {
        out.push({
            id: "splits",
            priority: split > 12 ? "focus" : "watch",
            title: "Splits are showing up too often",
            metric: `${fmt(split)}% splits  ·  keep under 6–8%`,
            why: "Frequent splits usually mean the first ball is light, high, or rolling out. That is a line/speed issue more than a spare issue.",
            workOn: [
                "Check if splits are coming from light hits vs. high hits",
                "Start the night with a control ball if the fresh shot is jumpy",
                "Move sooner when the pocket starts to stand the 10 or 7 up",
            ],
        });
    }

    if (hungRate != null && hungRate > 12) {
        out.push({
            id: "hung",
            priority: "watch",
            title: "Getting hung is eating strings",
            metric: `${stats.hungCount} hung  ·  ${fmt(hungRate)}% of games`,
            why: "A hung 10 (or 7) after a good look stops a string cold. That is usually a touch light or a ball that is rolling out.",
            workOn: [
                "Note whether hungs are the same corner pin every time",
                "If it is always the 10, the ball is likely finishing behind the head pin",
                "Try one board right/left before changing balls",
            ],
        });
    }

    if (sd != null && sd > 28 && games >= 12) {
        out.push({
            id: "consistency",
            priority: "watch",
            title: "Scoring is streaky from game to game",
            metric: `SD ${fmt(sd)}  ·  average ${fmt(avg)}`,
            why: "A wide game-to-game spread means the look is not repeating. Consistency work will raise the floor faster than chasing a 250.",
            workOn: [
                "Use the same pre-shot routine for every shot in a series",
                "Limit mid-game ball changes unless the leave pattern is obvious",
                "Aim to keep every game of a series within 20 pins of each other",
            ],
        });
    }

    if (seasonDrop != null && seasonDrop <= -6) {
        out.push({
            id: "trend",
            priority: "focus",
            title: "This season is off the prior pace",
            metric: `${latest!.season} avg ${fmt(latest!.average)}  vs  ${prior!.season} ${fmt(prior!.average)} (${fmt(seasonDrop)})`,
            why: "A multi-pin drop vs. last season is a signal to simplify — not to keep adding equipment or speed.",
            workOn: [
                "Compare first-ball leave charts from this season vs. last",
                "Go back to the line and ball that produced the last good block",
                "Give spare shooting extra attention until the average flattens",
            ],
        });
    }

    if (strike != null && strike >= 38) {
        out.push({
            id: "strike-strength",
            priority: "strength",
            title: "Strike rate is a real weapon",
            metric: `${fmt(strike)}% strikes`,
            why: `${name} is already generating enough pocket strikes to score. Protect that look and spend practice on conversion.`,
            workOn: ["Keep the current first-ball routine", "Do not over-adjust after one light hit"],
        });
    }

    if (single != null && single >= 82) {
        out.push({
            id: "spare-strength",
            priority: "strength",
            title: "Single pins are getting picked up",
            metric: `${fmt(single)}% single-pin`,
            why: "That spare floor keeps bad strike nights from collapsing. Keep it sharp so the average stays honest.",
            workOn: ["Stay in spare-shot rhythm during league, not just practice"],
        });
    }

    if (cleanRate != null && cleanRate >= 18) {
        out.push({
            id: "clean-strength",
            priority: "strength",
            title: "Clean games are showing up",
            metric: `${stats.cleanGames} clean  ·  ${fmt(cleanRate)}% of games`,
            why: "Clean games mean the spare game is holding. Strings and 200s will follow if first-ball quality stays up.",
            workOn: ["Treat every open as a post-game note, not just a bad frame"],
        });
    }

    if (turkeyRate != null && turkeyRate >= 8) {
        out.push({
            id: "turkey-strength",
            priority: "strength",
            title: "Strings are available",
            metric: `${stats.turkeyCount} turkeys  ·  ${fmt(twoHundredRate)}% of games are 200+`,
            why: "Once two strikes go up, a third is happening often enough to chase 200s. Do not change lines just because the first turkey ended.",
            workOn: ["Stay with the shot that started the string unless the leave tells you otherwise"],
        });
    }

    const rank = {focus: 0, watch: 1, strength: 2};
    out.sort((a, b) => rank[a.priority] - rank[b.priority]);
    return out;
}

function buildGrokPrompt(name: string, stats: PlayerStats, seasons: PlayerSeasonStats[]): string {
    const latest = [...seasons].sort((a, b) => b.season.localeCompare(a.season))[0];
    const lines = [
        `You are an experienced bowling coach. Give ${name} practical, specific things to work on.`,
        "Use the league stats below. Be direct. Rank the top 3 focus areas and explain why with the numbers.",
        "",
        "Career stats:",
        `- Games: ${stats.gameStats.count}`,
        `- Scratch average: ${fmt(stats.gameStats.average)}`,
        `- High game / low game: ${stats.gameStats.max} / ${stats.gameStats.min}`,
        `- Game SD: ${fmt(stats.gameStats.sd)}`,
        `- First-ball average: ${fmt(stats.firstBallAverage)}`,
        `- Strike %: ${fmt(pct(stats.strikes))}% (${stats.strikes.numerator}/${stats.strikes.denominator})`,
        `- Spare %: ${fmt(pct(stats.spares))}% (${stats.spares.numerator}/${stats.spares.denominator})`,
        `- Single-pin spare %: ${fmt(pct(stats.singlePinSpares))}%`,
        `- Open %: ${fmt(pct(stats.opens))}%`,
        `- Split %: ${fmt(pct(stats.splits))}%`,
        `- Strike-to-spare %: ${fmt(pct(stats.strikesToSpares))}%`,
        `- Clean games: ${stats.cleanGames}`,
        `- Got hung: ${stats.hungCount}`,
        `- Turkeys: ${stats.turkeyCount}`,
        `- 200+ games: ${stats.games200}`,
        `- 300s: ${stats.games300}`,
    ];
    if (latest) {
        lines.push("", `Most recent season (${latest.season}): avg ${fmt(latest.average)}, ${latest.games} games, HG ${latest.highGame}, clean ${latest.cleanGames}, hung ${latest.hungCount}, turkeys ${latest.turkeyCount}`);
    }
    lines.push("", "Tell them what to practice this week and what to ignore.");
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

            <Card className="bls-profile-card mb-3">
                <div className="bls-profile-card-head">Ask Grok</div>
                <CardBody>
                    <p className="fs-sm text-body-secondary">
                        These notes are generated from {name}'s actual league numbers on this site.
                        GitHub Pages cannot call Grok directly, but you can paste a full stat brief into Grok for a second opinion.
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
