import {ComparisonBar,ComparisonCard,ComparisonTabs,COLOR_A,COLOR_B} from "../comparison/comparison-ui";
import {beerSheetFetcher as fetchApiTeams, type BeerStanding as ApiStanding, type BeerPlayer as ApiRosterPlayer, type BeerLeagueData as ApiLeagueData} from "../../../data/league/beer-sheet";
import {type FC, useCallback, useMemo, useState} from "react";
import {Badge, Card, CardBody, Form, Table} from "react-bootstrap";
import {Link, useSearchParams} from "react-router";
import {LEAGUE_DETAILS_CACHE_CATEGORY, LEAGUE_LIST_CACHE_CATEGORY, leagueDetailsFetcher, leagueInfoListFetcher} from "../../../data/league/league-api";
import type {LeagueDetails} from "../../../data/league/league-details";
import type {AvailableLeagues} from "../../../data/league/league-info";
import {apiComparisonIssue} from "../../../data/league/league-comparison";
import {useContextCache} from "../cache/context-cache";

import {performanceRatingFromAverage} from "../charts/performance-rating";

import {useCachedFetcher} from "../cache/data-loader";
import ErrorDisplay from "../error-display";
import Loader from "../loader";

const numberFormat = Intl.NumberFormat("en-US", {maximumFractionDigits: 1});
const integerFormat = Intl.NumberFormat("en-US", {maximumFractionDigits: 0});
const API_TEAM_CACHE = "api-team-compare";

type TabId = "scoring" | "record" | "roster";

interface Metric {
    key: string;
    label: string;
    get: (team: ApiStanding) => number | null;
    integer?: boolean;
    lowerIsBetter?: boolean;
}

const SCORING: Metric[] = [
    {key: "average", label: "Team Average", get: team => team.average, integer: true},
    {key: "handicap", label: "Team Handicap", get: team => team.handicap, integer: true, lowerIsBetter: true},
    {key: "scratchPins", label: "Scratch Pinfall", get: team => team.scratchPins, integer: true},
    {key: "pinsWithHandicap", label: "Hdcp Pinfall", get: team => team.pinsWithHandicap, integer: true},
    {key: "highScratchGame", label: "High Scratch Game", get: team => team.highScratchGame, integer: true},
    {key: "highScratchSeries", label: "High Scratch Series", get: team => team.highScratchSeries, integer: true},
    {key: "highHandicapGame", label: "High Hdcp Game", get: team => team.highHandicapGame, integer: true},
    {key: "highHandicapSeries", label: "High Hdcp Series", get: team => team.highHandicapSeries, integer: true},
];

const RECORD: Metric[] = [
    {key: "won", label: "Points Won", get: team => team.won},
    {key: "lost", label: "Points Lost", get: team => team.lost, lowerIsBetter: true},
    {key: "winPct", label: "Point Win %", get: team => {
        const total = team.won + team.lost;
        return total > 0 ? team.won / total * 100 : null;
    }},
    {key: "place", label: "Division Place", get: team => team.place, integer: true, lowerIsBetter: true},
];

function display(value: number | null, integer = false): string {
    if (value == null) return "—";
    return integer ? integerFormat.format(value) : numberFormat.format(value);
}

const CompareBar: FC<{metric: Metric; teamA: ApiStanding; teamB: ApiStanding}> = ({metric, teamA, teamB}) => {
    return <ComparisonBar label={metric.label} valueA={metric.get(teamA)} valueB={metric.get(teamB)} lowerIsBetter={metric.lowerIsBetter} format={value=>display(value,metric.integer)}/>;
};
const TeamRosterCard: FC<{side: "a" | "b"; team: ApiStanding; players: ApiRosterPlayer[]; opponentPlayers?: ApiRosterPlayer[]}> = ({side, team, players, opponentPlayers = []}) => {
    const color = side === "a" ? COLOR_A : COLOR_B;
    // Players with no games are rostered but are not eligible for an active matchup row.
    const sortedPlayers = players.filter(player => player.games > 0);

    return <Card className="bls-profile-card bls-fifa-panel h-100" style={{borderTop: `3px solid ${color}`}}>
        <CardBody className="p-0">
            <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap p-3 border-bottom">
                <div>
                    <div className="fw-semibold" style={{color}}>{team.name}</div>
                    <div className="small text-body-secondary">{sortedPlayers.length} active bowler{sortedPlayers.length === 1 ? "" : "s"} · normal lineup order · player-rating edge highlighted</div>
                </div>
                <Badge pill style={{background: color, color: "#fff"}}>Roster</Badge>
            </div>
            {sortedPlayers.length > 0 ? <div className="table-responsive">
                <Table hover size="sm" className="mb-0 align-middle">
                    <thead><tr><th>Row</th><th>Bowler</th><th className="text-end">Rating</th><th className="text-end">Games</th></tr></thead>
                    <tbody>{sortedPlayers.map((player, index) => {
                        const opponentPlayer = opponentPlayers.filter(opponent => opponent.games > 0)[index];
                        const playerRating = performanceRatingFromAverage(player.average);
                        const opponentRating = opponentPlayer ? performanceRatingFromAverage(opponentPlayer.average) : null;
                        const rowWinner = playerRating == null || opponentRating == null
                            ? null
                            : playerRating === opponentRating ? "tie" : playerRating > opponentRating ? side : side === "a" ? "b" : "a";
                        const isWinner = rowWinner === side;
                        return <tr key={player.name} style={isWinner ? {background: `${color}14`} : undefined}>
                        <td className="fw-semibold">{index + 1}</td>
                        <td>{player.name}{player.status === "SUBSTITUTE" && <Badge bg="secondary" className="ms-2">Sub</Badge>}{isWinner && <Badge pill className="ms-2" style={{background: color, color: "#fff"}}>Row edge</Badge>}</td>
                        <td className="text-end">{playerRating == null ? "—" : numberFormat.format(playerRating)}</td>
                        <td className="text-end">{player.games}</td>
                    </tr>; })}</tbody>
                </Table>
            </div> : <div className="p-3 text-body-secondary">No roster data is available for this team.</div>}
        </CardBody>
    </Card>;
};

const TeamCard: FC<{side: "a" | "b"; team: ApiStanding; teams: ApiStanding[]; otherNumber: number; onChange: (number: number) => void}> = ({side, team, teams, otherNumber, onChange}) => {
    const color = side === "a" ? COLOR_A : COLOR_B;
    return <ComparisonCard side={side} badge={<>#{team.number}</>} name={<>{team.name}</>} metadata={<><span>{team.division} · #{team.place}</span><span>{integerFormat.format(team.average)} avg</span></>}>
        <Form.Select size="sm" className="bls-fifa-change" value={team.number} onChange={event => { onChange(Number(event.target.value)); }} style={{borderColor: color}}>
                {teams.map(candidate => <option key={candidate.number} value={candidate.number} disabled={candidate.number === otherNumber}>{candidate.name}</option>)}
            </Form.Select>
    </ComparisonCard>;
};

const ApiTeamCompare: FC = () => {
    const [params, setParams] = useSearchParams();
    const {data, isLoading, error} = useCachedFetcher<ApiLeagueData>(fetchApiTeams, API_TEAM_CACHE);
    const cache = useContextCache();
    const requestedLeague = params.get("league") ?? "";
    const contextFetcher = useCallback(async (): Promise<{league?: LeagueDetails}> => {
        if (!requestedLeague) return {};
        const index = cache?.get(LEAGUE_LIST_CACHE_CATEGORY) as AvailableLeagues | null ?? await leagueInfoListFetcher();
        const info = index.findLeague(requestedLeague);
        if (!info?.dataLoc) throw new Error("The comparison league is unavailable.");
        const league = cache?.get(LEAGUE_DETAILS_CACHE_CATEGORY, requestedLeague) as LeagueDetails | null
            ?? await leagueDetailsFetcher(info.dataLoc, info.id);
        return {league};
    }, [cache, requestedLeague]);
    const {data: context, isLoading: contextLoading, error: contextError} = useCachedFetcher(contextFetcher, "api-comparison-context", requestedLeague || "current");
    const [tab, setTab] = useState<TabId>("scoring");
    const teams = useMemo(() => [...(data?.standings ?? [])].sort((a, b) => a.name.localeCompare(b.name)), [data]);
    const requestedA = Number(params.get("a"));
    const requestedB = Number(params.get("b"));
    const teamA = params.has("a") ? teams.find(team => team.number === requestedA) : teams[0];
    const teamB = params.has("b") ? teams.find(team => team.number === requestedB && team.number !== teamA?.number) : teams.find(team => team.number !== teamA?.number);
    const activeMetrics = tab === "scoring" ? SCORING : RECORD;

    const updateSelection = (key: "a" | "b", value: number) => {
        const next = new URLSearchParams(params);
        next.set(key, String(value));
        if (data?.league?.date) next.set("sheet", data.league.date);
        setParams(next);
    };

    if (isLoading || contextLoading) return <Loader/>;
    if (error) return <ErrorDisplay message="Error loading A.B.C. team comparison data." error={error}/>;
    const linkedNumbers = params.has("a") || params.has("b");
    const comparisonIssue = contextError ? "The league in this comparison link is unavailable."
        : data && context?.league ? apiComparisonIssue(data, context.league, teamA, teamB)
        : linkedNumbers && (!data?.league?.date || params.get("sheet") !== data.league.date)
            ? "This comparison link does not identify the current league sheet. Select teams from the current sheet to avoid reusing historical team numbers."
            : linkedNumbers && (!teamA || !teamB) ? "The selected teams are unavailable on the current sheet." : null;

    return <div className="container-md bls-compare bls-fifa-compare">
        <div className="bls-compare-hero mb-3">
            <span className="bls-hero-kicker">A.B.C. Data · Head to head</span>
            <h1>Team Compare</h1>
            <div className="text-body-secondary">Only team statistics published by the Arapahoe league sheet are compared.</div>
        </div>
        <Card className="bls-profile-card mb-3 bls-fifa-panel"><CardBody>
            <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap"><div><strong>{data?.league?.name ?? "Beer League"}</strong>{data?.league ? <div className="text-body-secondary">{[data.league.season, data.league.week != null ? `Week ${data.league.week}` : null, data.league.date ? `Sheet ${data.league.date}` : null].filter(Boolean).join(" · ")}</div> : null}</div><Badge bg="info">A.B.C. Data</Badge></div>
        </CardBody></Card>
        {comparisonIssue ? <Card className="bls-profile-card"><CardBody><p role="status">{comparisonIssue}</p><Link to="/team/compare?source=api">Choose teams from the current A.B.C. sheet</Link></CardBody></Card> : teamA && teamB ? <>
            <div className="bls-fifa-heads mb-3">
                <TeamCard side="a" team={teamA} teams={teams} otherNumber={teamB.number} onChange={number => { updateSelection("a", number); }}/>
                <div className="bls-fifa-vs"><span>VS</span><Badge pill style={{background: "#6e6e73", color: "#fff"}}>A.B.C.</Badge></div>
                <TeamCard side="b" team={teamB} teams={teams} otherNumber={teamA.number} onChange={number => { updateSelection("b", number); }}/>
            </div>
            <ComparisonTabs<TabId> active={tab} onChange={setTab} tabs={[["scoring","Scoring"],["record","League Record"],["roster","Rosters"]]}/>
            {tab === "roster" ? (() => {
                const playersA = data?.teams?.find(team => team.number === teamA.number)?.players ?? [];
                const playersB = data?.teams?.find(team => team.number === teamB.number)?.players ?? [];
                return <div className="row g-3">
                    <div className="col-12 col-lg-6"><TeamRosterCard side="a" team={teamA} players={playersA} opponentPlayers={playersB}/></div>
                    <div className="col-12 col-lg-6"><TeamRosterCard side="b" team={teamB} players={playersB} opponentPlayers={playersA}/></div>
                </div>;
            })() : <Card className="bls-profile-card bls-fifa-panel"><CardBody><div className="bls-fifa-col">
                <div className="bls-fifa-col-title">{tab === "scoring" ? "Team scoring" : "League record"}</div>
                {activeMetrics.map(metric => <CompareBar key={metric.key} metric={metric} teamA={teamA} teamB={teamB}/>) }
            </div></CardBody></Card>}
        </> : <Card className="bls-profile-card"><CardBody>No two A.B.C. teams with statistics are available.</CardBody></Card>}
    </div>;
};

export default ApiTeamCompare;
