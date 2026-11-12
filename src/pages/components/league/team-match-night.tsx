import {type FC, type ReactNode, useId, useState} from "react";
import {Link} from "react-router";
import type {TrackedLeagueTeam} from "../../../data/league/league-team-details";
import type {LeagueDetails} from "../../../data/league/league-details";
import {opponentDisplay} from "../../../data/league/opponent-display";
import {matchupComparisonUrl} from "../../../data/league/league-comparison";
import {matchupSchedule} from "./league-matchup-schedule";
import "../../../sass/team-match-night.scss";

const numberFormat = Intl.NumberFormat("en-US", {maximumFractionDigits: 1});
const statValue = (value: number | undefined) =>
    value != null && Number.isFinite(value) && value !== Number.MAX_SAFE_INTEGER ? numberFormat.format(value) : "—";

interface TeamMatchNightProps {
    team: TrackedLeagueTeam;
    league: LeagueDetails | null;
    children?: ReactNode;
}

const TeamMatchNight: FC<TeamMatchNightProps> = ({team, league, children}) => {
    const titleId = useId();
    const [detailsOpen, setDetailsOpen] = useState(false);
    const {nextMatchup, lastMatchup, pendingMatchups} = matchupSchedule(team.matchups);
    const featured = nextMatchup ?? lastMatchup;
    const opponent = opponentDisplay(league, featured?.opponent);
    const lastOpponent = opponentDisplay(league, lastMatchup?.opponent);
    const featuredDate = nextMatchup?.scheduledDate ?? (lastMatchup?.bowlDate?.isValid() ? lastMatchup.bowlDate : lastMatchup?.scheduledDate);
    const lastDate = lastMatchup?.bowlDate?.isValid() ? lastMatchup.bowlDate : lastMatchup?.scheduledDate;
    const lanes = featured?.lanes.filter(lane => Number.isInteger(lane) && lane > 0) ?? [];
    const comparison = featured && !featured.opponent?.absent && !featured.opponent?.vacant
        ? matchupComparisonUrl(league, team, featured) : null;
    const hasLastScores = (lastMatchup?.scores?.games.length ?? 0) > 0;
    const hasLastPoints = hasLastScores && Boolean(lastMatchup?.opponent?.scores?.games.length || lastMatchup?.opponent?.absent || lastMatchup?.opponent?.vacant);
    const hasSchedule = team.matchups.some(matchup => matchup.scheduledDate?.isValid());
    const seasonStats = [
        ["Starting average", team.teamStats?.average],
        ["Starting handicap", team.teamStats?.handicap],
        ["Low game", team.teamStats?.lowGame],
        ["High game", team.teamStats?.highGame],
        ["Low series", team.teamStats?.lowSeries],
        ["High series", team.teamStats?.highSeries],
        ["Scratch pins", team.teamStats?.scratchPins],
    ] as const;

    return <section className="bls-match-night" aria-labelledby={titleId}>
        <header className="bls-match-night-heading">
            <div>
                <p className="bls-match-night-kicker">Team briefing · #{team.number}</p>
                <h2 id={titleId}>{team.name ?? "Your team"}</h2>
                <p className="bls-match-night-context">{[league?.season, league?.name, league?.center].filter(Boolean).join(" · ")}</p>
            </div>
            {hasSchedule && <button type="button" className="bls-match-night-jump" onClick={() => document.getElementById("bls-current-week")?.scrollIntoView({behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start"})}>
                Jump to current week <span aria-hidden="true">↓</span>
            </button>}
        </header>
        <div className="bls-match-night-grid">
            <article className="bls-match-night-fixture">
                <div className="bls-match-night-fixture-top">
                    <h3>{nextMatchup ? "Up next" : lastMatchup ? "Last recorded matchup" : "Your schedule"}</h3>
                    {featured && <span>{league?.bowlingDays?.durationUnit === "WK" ? "Week " : "Matchup "}{featured.week}</span>}
                </div>
                {featured ? <>
                    <p className="bls-match-night-date">{featuredDate?.format("dddd, MMM D, YYYY")}</p>
                    <div className="bls-match-night-pairing">
                        <div className="bls-match-night-opponent">
                            <span>Against {opponent.number != null ? "#" + opponent.number : ""}</span>
                            <strong>{opponent.name}</strong>
                            {comparison && <Link to={comparison}>Compare teams <span aria-hidden="true">↗</span></Link>}
                        </div>
                        <div className="bls-match-night-lanes">
                            <span>{lanes.length === 1 ? "Lane" : "Lanes"}</span>
                            {lanes.length > 0 ? <strong>{lanes.join(" / ")}</strong> : <p>To be assigned</p>}
                        </div>
                    </div>
                    {nextMatchup && league?.bowlingDays?.startTime?.isValid() && <p className="bls-match-night-note">Practice starts {league.bowlingDays.startTime.format("h:mm a")}</p>}
                    {!nextMatchup && <p className="bls-match-night-note">No upcoming matchups scheduled.</p>}
                </> : <p className="bls-match-night-no-data">{pendingMatchups.length > 0 ? "No upcoming matchups scheduled. Earlier matchups are awaiting results." : "No matchups are posted yet. The team’s schedule will appear here when available."}</p>}
            </article>
            <article className="bls-match-night-result">
                <h3>Last recorded result</h3>
                {lastMatchup ? <>
                    <p className="bls-match-night-result-date">{lastDate?.format("MMM D, YYYY")} · {league?.bowlingDays?.durationUnit === "WK" ? "Week " : "Matchup "}{lastMatchup.week}</p>
                    <p className="bls-match-night-result-opponent">vs {lastOpponent.name}</p>
                    {hasLastScores ? <>
                        <div className="bls-match-night-points">
                            {hasLastPoints ? <><strong>{statValue(lastMatchup.pointsWonLost[0])}<span> / </span>{statValue(lastMatchup.pointsWonLost[1])}</strong><span>Points won / lost</span></> : <p>Points not yet available</p>}
                        </div>
                        <dl className="bls-match-night-result-scores">
                            <div><dt>Credited scratch</dt><dd>{statValue(lastMatchup.scores?.series.effectiveScratchScore)}</dd></div>
                            <div><dt>With handicap</dt><dd>{statValue(lastMatchup.scores?.series.hdcpScore)}</dd></div>
                        </dl>
                    </> : <p>Team totals are not available.</p>}
                </> : <p className="bls-match-night-no-data">No results recorded yet.</p>}
            </article>
        </div>
        {pendingMatchups.length > 0 && <p className="bls-match-night-pending" role="status">
            <strong>{pendingMatchups.length} {pendingMatchups.length === 1 ? "matchup awaiting results" : "matchups awaiting results"}</strong>
            <span>{pendingMatchups[0].scheduledDate?.format("MMM D")}{pendingMatchups.length > 1 ? " – " + pendingMatchups[pendingMatchups.length - 1].scheduledDate?.format("MMM D, YYYY") : ", " + pendingMatchups[0].scheduledDate?.format("YYYY")}</span>
        </p>}
        <dl className="bls-match-night-standing">
            <div><dt>Division</dt><dd>{team.division || "—"}</dd></div>
            <div><dt>Current rank</dt><dd>{team.currentRank && team.currentRank !== "PENDING" ? team.currentRank : "—"}</dd></div>
            <div><dt>Season points won</dt><dd>{statValue(team.pointsWonLost[0])}</dd></div>
            <div><dt>Season points lost</dt><dd>{statValue(team.pointsWonLost[1])}</dd></div>
        </dl>
        <details className="bls-match-night-details" onToggle={event => { setDetailsOpen(event.currentTarget.open); }}>
            <summary>Season numbers &amp; trend</summary>
            {detailsOpen && <div className="bls-match-night-details-body">
                <dl className="bls-match-night-season-stats">
                    {seasonStats.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{statValue(value)}</dd></div>)}
                </dl>
                {children}
            </div>}
        </details>
    </section>;
};

export default TeamMatchNight;
