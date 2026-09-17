import {type FC, useCallback, useEffect, useMemo, useState} from "react";
import {Badge, Card, CardBody, Col, Form, Row} from "react-bootstrap";
import {useSearchParams} from "react-router";

import {LEAGUE_DETAILS_CACHE_CATEGORY, LEAGUE_LIST_CACHE_CATEGORY, leagueDetailsFetcher, leagueInfoListFetcher} from "../data/league/league-api";
import type {LeagueDetails} from "../data/league/league-details";
import {AvailableLeagues} from "../data/league/league-info";
import type {TrackedLeagueTeam} from "../data/league/league-team-details";
import {useCachedFetcher} from "./components/cache/data-loader";
import ErrorDisplay from "./components/error-display";
import Loader from "./components/loader";

const COLOR_A = "#ff2d55";
const COLOR_B = "#00d4ff";
const numberFormat = Intl.NumberFormat("en-US", {maximumFractionDigits: 1});
const integerFormat = Intl.NumberFormat("en-US", {maximumFractionDigits: 0});

type TabId = "scoring" | "record";

interface Metric {
    key: string;
    label: string;
    get: (team: TrackedLeagueTeam) => number | null;
    integer?: boolean;
    lowerIsBetter?: boolean;
}

const SCORING: Metric[] = [
    {key: "average", label: "Team Average", get: team => team.teamStats?.average ?? null},
    {key: "handicap", label: "Team Handicap", get: team => team.teamStats?.handicap ?? null, integer: true, lowerIsBetter: true},
    {key: "scratchPins", label: "Scratch Pinfall", get: team => team.teamStats?.scratchPins ?? null, integer: true},
    {key: "highGame", label: "High Game", get: team => team.teamStats?.highGame ?? null, integer: true},
    {key: "highSeries", label: "High Series", get: team => team.teamStats?.highSeries ?? null, integer: true},
    {key: "lowGame", label: "Low Game", get: team => team.teamStats?.lowGame ?? null, integer: true},
    {key: "lowSeries", label: "Low Series", get: team => team.teamStats?.lowSeries ?? null, integer: true},
];

const RECORD: Metric[] = [
    {key: "pointsWon", label: "Points Won", get: team => team.pointsWonLost[0]},
    {key: "pointsLost", label: "Points Lost", get: team => team.pointsWonLost[1], lowerIsBetter: true},
    {key: "winPct", label: "Point Win %", get: team => {
        const total = team.pointsWonLost[0] + team.pointsWonLost[1];
        return total > 0 ? team.pointsWonLost[0] / total * 100 : null;
    }},
];

function display(value: number | null, integer = false): string {
    if (value == null) return "—";
    return integer ? integerFormat.format(value) : numberFormat.format(value);
}

const CompareBar: FC<{metric: Metric; teamA: TrackedLeagueTeam; teamB: TrackedLeagueTeam}> = ({metric, teamA, teamB}) => {
    const valueA = metric.get(teamA);
    const valueB = metric.get(teamB);
    const a = valueA ?? 0;
    const b = valueB ?? 0;
    const leader: "a" | "b" | "tie" = valueA == null || valueB == null || a === b
        ? "tie"
        : (metric.lowerIsBetter ? a < b : a > b) ? "a" : "b";
    const scaleA = metric.lowerIsBetter ? (a > 0 ? 1 / a : 0) : Math.max(0, a);
    const scaleB = metric.lowerIsBetter ? (b > 0 ? 1 / b : 0) : Math.max(0, b);
    const total = scaleA + scaleB;
    const fill = total > 0 ? Math.max(scaleA, scaleB) / total * 100 : 50;
    const color = leader === "a" ? COLOR_A : leader === "b" ? COLOR_B : "#6e6e73";

    return <div className="bls-fifa-row">
        <div className="bls-fifa-row-label">{metric.label}</div>
        <div className="bls-fifa-row-trackline">
            <span className={`bls-fifa-val${leader === "a" ? " is-lead" : ""}`} style={{color: COLOR_A}}>{display(valueA, metric.integer)}</span>
            <div className="bls-fifa-track">
                <div className="bls-fifa-fill" style={{width: `${fill}%`, background: color, boxShadow: leader === "tie" ? undefined : `0 0 10px ${color}`, marginLeft: leader === "b" ? "auto" : 0}} />
            </div>
            <span className={`bls-fifa-val${leader === "b" ? " is-lead" : ""}`} style={{color: COLOR_B}}>{display(valueB, metric.integer)}</span>
        </div>
    </div>;
};

const TeamCard: FC<{side: "a" | "b"; team: TrackedLeagueTeam; teams: TrackedLeagueTeam[]; otherId: string; onChange: (id: string) => void}> = ({side, team, teams, otherId, onChange}) => {
    const color = side === "a" ? COLOR_A : COLOR_B;
    return <div className={`bls-fifa-pcard bls-fifa-pcard-${side}`} style={{borderColor: color, boxShadow: `0 0 18px ${color}40`}}>
        <div className="bls-fifa-pcard-badge" style={{borderColor: color, color}}>#{team.number}</div>
        <div className="bls-fifa-pcard-body">
            <div className="bls-fifa-pcard-name" style={{color}}>{team.name}</div>
            <div className="bls-fifa-pcard-meta"><span>{team.currentRank || "Team"}</span><span>{display(team.teamStats?.average ?? null)} avg</span></div>
            <Form.Select size="sm" className="bls-fifa-change" value={team.id} onChange={event => { onChange(event.target.value); }} style={{borderColor: color}}>
                {teams.map(candidate => <option key={candidate.id} value={candidate.id} disabled={candidate.id === otherId}>{candidate.name}</option>)}
            </Form.Select>
        </div>
    </div>;
};

const TeamCompare: FC = () => {
    const [params, setParams] = useSearchParams();
    const {data: leagueList, isLoading: listLoading, error: listError} = useCachedFetcher<AvailableLeagues>(leagueInfoListFetcher, LEAGUE_LIST_CACHE_CATEGORY);
    const availableLeagues = useMemo(() => leagueList?.seasons.flatMap(season => season.leagues.filter(league => league.hasData() && league.teams.length > 1)) ?? [], [leagueList]);
    const requestedLeague = params.get("league") ?? "";
    const leagueInfo = availableLeagues.find(league => league.id === requestedLeague) ?? availableLeagues[0];
    const fetcher = useCallback((dataLoc: string) => leagueDetailsFetcher(dataLoc), []);
    const {data: leagueDetails, isLoading: detailsLoading, error: detailsError} = useCachedFetcher<LeagueDetails>(fetcher.bind(null, leagueInfo?.dataLoc ?? "will-fail.json"), LEAGUE_DETAILS_CACHE_CATEGORY, leagueInfo?.id ?? "team-compare");
    const [tab, setTab] = useState<TabId>("scoring");

    useEffect(() => {
        if (leagueInfo && requestedLeague !== leagueInfo.id) {
            setParams({league: leagueInfo.id ?? ""}, {replace: true});
        }
    }, [leagueInfo, requestedLeague, setParams]);

    const teams = leagueDetails?.teams.filter(team => team.teamStats != null) ?? [];
    const requestedA = params.get("a") ?? "";
    const requestedB = params.get("b") ?? "";
    const teamA = teams.find(team => team.id === requestedA) ?? teams[0];
    const teamB = teams.find(team => team.id === requestedB && team.id !== teamA?.id) ?? teams.find(team => team.id !== teamA?.id);
    const activeMetrics = tab === "scoring" ? SCORING : RECORD;

    const updateSelection = (changes: {league?: string; a?: string; b?: string}) => {
        const next = new URLSearchParams(params);
        for (const [key, value] of Object.entries(changes)) {
            if (value) next.set(key, value);
            else next.delete(key);
        }
        setParams(next);
    };

    if (listLoading || detailsLoading) return <Loader/>;
    if (listError) return <ErrorDisplay message="Error loading leagues for team comparison." error={listError}/>;
    if (detailsError) return <ErrorDisplay message="Error loading team comparison data." error={detailsError}/>;

    return <div className="container-md bls-compare bls-fifa-compare">
        <div className="bls-compare-hero mb-3">
            <span className="bls-hero-kicker">BinBin Data · Head to head</span>
            <h1>Team Compare</h1>
            <div className="text-body-secondary">Compare team-level scoring and league performance.</div>
        </div>
        <Card className="bls-profile-card mb-3 bls-fifa-panel"><CardBody>
            <Form.Label>League</Form.Label>
            <Form.Select value={leagueInfo?.id ?? ""} onChange={event => { updateSelection({league: event.target.value, a: "", b: ""}); }}>
                {availableLeagues.map(league => <option key={league.id} value={league.id}>{league.name}</option>)}
            </Form.Select>
        </CardBody></Card>
        {teamA && teamB ? <>
            <div className="bls-fifa-heads mb-3">
                <TeamCard side="a" team={teamA} teams={teams} otherId={teamB.id ?? ""} onChange={id => { updateSelection({a: id}); }}/>
                <div className="bls-fifa-vs"><span>VS</span><Badge pill style={{background: "#6e6e73", color: "#fff"}}>TEAM</Badge></div>
                <TeamCard side="b" team={teamB} teams={teams} otherId={teamA.id ?? ""} onChange={id => { updateSelection({b: id}); }}/>
            </div>
            <div className="bls-fifa-tabs" role="tablist">
                <button type="button" className={`bls-fifa-tab${tab === "scoring" ? " is-active" : ""}`} onClick={() => { setTab("scoring"); }}>Scoring</button>
                <button type="button" className={`bls-fifa-tab${tab === "record" ? " is-active" : ""}`} onClick={() => { setTab("record"); }}>League Record</button>
            </div>
            <Card className="bls-profile-card bls-fifa-panel"><CardBody><div className="bls-fifa-col">
                <div className="bls-fifa-col-title">{tab === "scoring" ? "Team scoring" : "League record"}</div>
                {activeMetrics.map(metric => <CompareBar key={metric.key} metric={metric} teamA={teamA} teamB={teamB}/>) }
            </div></CardBody></Card>
        </> : <Card className="bls-profile-card"><CardBody>No two tracked teams with statistics are available for this league.</CardBody></Card>}
    </div>;
};

export default TeamCompare;
