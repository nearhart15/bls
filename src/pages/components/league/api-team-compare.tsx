import {fetchJson} from "../../../data/utils/fetch-json";
import {type FC, useMemo, useState} from "react";
import {Badge, Card, CardBody, Form} from "react-bootstrap";
import {useSearchParams} from "react-router";

import {useCachedFetcher} from "../cache/data-loader";
import ErrorDisplay from "../error-display";
import Loader from "../loader";

const COLOR_A = "#ff2d55";
const COLOR_B = "#00d4ff";
const numberFormat = Intl.NumberFormat("en-US", {maximumFractionDigits: 1});
const integerFormat = Intl.NumberFormat("en-US", {maximumFractionDigits: 0});
const API_TEAM_CACHE = "api-team-compare";

type TabId = "scoring" | "record";

interface ApiStanding {
    division: string;
    place: number;
    number: number;
    name: string;
    won: number;
    lost: number;
    average: number;
    handicap: number;
    pinsWithHandicap: number;
    scratchPins: number;
    highHandicapGame: number;
    highHandicapSeries: number;
    highScratchGame: number;
    highScratchSeries: number;
}

interface ApiLeagueData {
    status: "pending" | "ready";
    league?: {name: string; season: string | null};
    standings: ApiStanding[];
}

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

async function fetchApiTeams(): Promise<ApiLeagueData> {
    const data = await fetchJson(`${import.meta.env.BASE_URL}data/beer-league.json?ts=${Date.now()}`) as unknown as ApiLeagueData;
    if (data.status !== "ready" || !Array.isArray(data.standings)) throw new Error("A.B.C. data is not ready or is malformed.");
    return data;
}

function display(value: number | null, integer = false): string {
    if (value == null) return "—";
    return integer ? integerFormat.format(value) : numberFormat.format(value);
}

const CompareBar: FC<{metric: Metric; teamA: ApiStanding; teamB: ApiStanding}> = ({metric, teamA, teamB}) => {
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
            <div className="bls-fifa-track"><div className="bls-fifa-fill" style={{width: `${fill}%`, background: color, boxShadow: leader === "tie" ? undefined : `0 0 10px ${color}`, marginLeft: leader === "b" ? "auto" : 0}} /></div>
            <span className={`bls-fifa-val${leader === "b" ? " is-lead" : ""}`} style={{color: COLOR_B}}>{display(valueB, metric.integer)}</span>
        </div>
    </div>;
};

const TeamCard: FC<{side: "a" | "b"; team: ApiStanding; teams: ApiStanding[]; otherNumber: number; onChange: (number: number) => void}> = ({side, team, teams, otherNumber, onChange}) => {
    const color = side === "a" ? COLOR_A : COLOR_B;
    return <div className={`bls-fifa-pcard bls-fifa-pcard-${side}`} style={{borderColor: color, boxShadow: `0 0 18px ${color}40`}}>
        <div className="bls-fifa-pcard-badge" style={{borderColor: color, color}}>#{team.number}</div>
        <div className="bls-fifa-pcard-body">
            <div className="bls-fifa-pcard-name" style={{color}}>{team.name}</div>
            <div className="bls-fifa-pcard-meta"><span>{team.division} · #{team.place}</span><span>{integerFormat.format(team.average)} avg</span></div>
            <Form.Select size="sm" className="bls-fifa-change" value={team.number} onChange={event => { onChange(Number(event.target.value)); }} style={{borderColor: color}}>
                {teams.map(candidate => <option key={candidate.number} value={candidate.number} disabled={candidate.number === otherNumber}>{candidate.name}</option>)}
            </Form.Select>
        </div>
    </div>;
};

const ApiTeamCompare: FC = () => {
    const [params, setParams] = useSearchParams();
    const {data, isLoading, error} = useCachedFetcher<ApiLeagueData>(fetchApiTeams, API_TEAM_CACHE);
    const [tab, setTab] = useState<TabId>("scoring");
    const teams = useMemo(() => [...(data?.standings ?? [])].sort((a, b) => a.name.localeCompare(b.name)), [data]);
    const requestedA = Number(params.get("a"));
    const requestedB = Number(params.get("b"));
    const teamA = teams.find(team => team.number === requestedA) ?? teams[0];
    const teamB = teams.find(team => team.number === requestedB && team.number !== teamA?.number) ?? teams.find(team => team.number !== teamA?.number);
    const activeMetrics = tab === "scoring" ? SCORING : RECORD;

    const updateSelection = (key: "a" | "b", value: number) => {
        const next = new URLSearchParams(params);
        next.set(key, String(value));
        setParams(next);
    };

    if (isLoading) return <Loader/>;
    if (error) return <ErrorDisplay message="Error loading A.B.C. team comparison data." error={error}/>;

    return <div className="container-md bls-compare bls-fifa-compare">
        <div className="bls-compare-hero mb-3">
            <span className="bls-hero-kicker">A.B.C. Data · Head to head</span>
            <h1>Team Compare</h1>
            <div className="text-body-secondary">Only team statistics published by the Arapahoe league sheet are compared.</div>
        </div>
        <Card className="bls-profile-card mb-3 bls-fifa-panel"><CardBody>
            <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap"><div><strong>{data?.league?.name ?? "Beer League"}</strong>{data?.league?.season ? <div className="text-body-secondary">{data.league.season}</div> : null}</div><Badge bg="info">A.B.C. Data</Badge></div>
        </CardBody></Card>
        {teamA && teamB ? <>
            <div className="bls-fifa-heads mb-3">
                <TeamCard side="a" team={teamA} teams={teams} otherNumber={teamB.number} onChange={number => { updateSelection("a", number); }}/>
                <div className="bls-fifa-vs"><span>VS</span><Badge pill style={{background: "#6e6e73", color: "#fff"}}>A.B.C.</Badge></div>
                <TeamCard side="b" team={teamB} teams={teams} otherNumber={teamA.number} onChange={number => { updateSelection("b", number); }}/>
            </div>
            <div className="bls-fifa-tabs" role="tablist">
                <button type="button" className={`bls-fifa-tab${tab === "scoring" ? " is-active" : ""}`} onClick={() => { setTab("scoring"); }}>Scoring</button>
                <button type="button" className={`bls-fifa-tab${tab === "record" ? " is-active" : ""}`} onClick={() => { setTab("record"); }}>League Record</button>
            </div>
            <Card className="bls-profile-card bls-fifa-panel"><CardBody><div className="bls-fifa-col">
                <div className="bls-fifa-col-title">{tab === "scoring" ? "Team scoring" : "League record"}</div>
                {activeMetrics.map(metric => <CompareBar key={metric.key} metric={metric} teamA={teamA} teamB={teamB}/>) }
            </div></CardBody></Card>
        </> : <Card className="bls-profile-card"><CardBody>No two A.B.C. teams with statistics are available.</CardBody></Card>}
    </div>;
};

export default ApiTeamCompare;