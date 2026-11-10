import RivalryStudio, {useRivalryMatchup} from "../comparison/rivalry-studio";
import {availableSeasons} from "../../../data/player/season-scope";
import {ComparisonBar,ComparisonCard,ComparisonTabs} from "../comparison/comparison-ui";
import {type FC, useMemo, useState} from "react";
import {Badge, Card, CardBody} from "react-bootstrap";
import type {PlayerListEntry} from "../../../data/player/player-aggregate";
import {apiStats} from "../../../data/player/api-player-data";
import ErrorDisplay from "../error-display";
import Loader from "../loader";
import {usePlayerIndexData} from "./use-player-index-data";

const numberFormat = Intl.NumberFormat("en-US", {maximumFractionDigits: 1});
const integerFormat = Intl.NumberFormat("en-US", {maximumFractionDigits: 0});

type TabId = "scoring" | "volume" | "latest";

interface Metric {
    key: string;
    label: string;
    get: (player: PlayerListEntry) => number | null;
    integer?: boolean;
    lowerIsBetter?: boolean;
}

const SCORING: Metric[] = [
    {key: "average", label: "Average", get: player => player.average},
    {key: "handicap", label: "Handicap", get: player => apiStats(player)?.handicap ?? null, integer: true, lowerIsBetter: true},
    {key: "averageSeries", label: "Avg Series", get: player => apiStats(player)?.averageSeries ?? null},
    {key: "highGame", label: "High Game", get: player => player.highGame || null, integer: true},
    {key: "highSeries", label: "High Series", get: player => player.highSeries || null, integer: true},
    {key: "highHandicapGame", label: "High Hdcp Game", get: player => apiStats(player)?.highHandicapGame || null, integer: true},
    {key: "highHandicapSeries", label: "High Hdcp Series", get: player => apiStats(player)?.highHandicapSeries || null, integer: true},
];

const VOLUME: Metric[] = [
    {key: "games", label: "Games", get: player => player.games, integer: true},
    {key: "seriesCount", label: "Series Bowled", get: player => apiStats(player)?.seriesCount ?? null, integer: true},
    {key: "pinfall", label: "Pinfall", get: player => player.pinfall, integer: true},
    {key: "known200Games", label: "Known 200+ Games", get: player => apiStats(player)?.known200Games ?? null, integer: true},
    {key: "known600Series", label: "Known 600+ Series", get: player => apiStats(player)?.known600Series ?? null, integer: true},
    {key: "known700Series", label: "Known 700+ Series", get: player => apiStats(player)?.known700Series ?? null, integer: true},
];

const LATEST: Metric[] = [
    {key: "latestSeries", label: "Latest Series", get: player => apiStats(player)?.latestSeries ?? null, integer: true},
    {key: "latestAverage", label: "Latest Series Avg", get: player => apiStats(player)?.latestAverage ?? null},
    {key: "latestHighGame", label: "Latest High Game", get: player => apiStats(player)?.latestHighGame ?? null, integer: true},
    {key: "latestLowGame", label: "Latest Low Game", get: player => apiStats(player)?.latestLowGame ?? null, integer: true},
    {key: "latestHandicapSeries", label: "Latest Hdcp Series", get: player => apiStats(player)?.latestHandicapSeries ?? null, integer: true},
];

function teamName(player: PlayerListEntry): string {
    return player.appearanceSlices[0]?.teamName ?? "Substitute";
}

function display(value: number | null, integer = false): string {
    if (value == null) return "—";
    return integer ? integerFormat.format(value) : numberFormat.format(value);
}

const CompareBar: FC<{metric: Metric; playerA: PlayerListEntry; playerB: PlayerListEntry}> = ({metric, playerA, playerB}) => {
    return <ComparisonBar label={metric.label} valueA={metric.get(playerA)} valueB={metric.get(playerB)} lowerIsBetter={metric.lowerIsBetter} format={value=>display(value,metric.integer)}/>;
};
const PlayerCard: FC<{side: "a" | "b"; player: PlayerListEntry}> = ({side, player}) => (
    <ComparisonCard side={side} badge={<>{display(player.average)}</>} name={player.name}
        metadata={<><span>{teamName(player)}</span><span>{integerFormat.format(player.games)} games</span></>}>{null}</ComparisonCard>
);

const ApiPlayerCompare: FC = () => {
    const {data, isLoading, error} = usePlayerIndexData("api");
    const [tab, setTab] = useState<TabId>("scoring");
    const players = useMemo(() => [...(data ?? [])].sort((a, b) => a.name.localeCompare(b.name)), [data]);
    const rows = useMemo(() => players.map(player => ({id: player.id, name: player.name, average: player.average, games: player.games, teamName: teamName(player)})), [players]);
    const matchup = useRivalryMatchup(rows, "api");
    const idA = matchup.a?.id ?? "", idB = matchup.b?.id ?? "";
    const playerA = players.find(player => player.id === idA);
    const playerB = players.find(player => player.id === idB);
    const activeMetrics = tab === "scoring" ? SCORING : tab === "volume" ? VOLUME : LATEST;

    if (isLoading) return <Loader />;
    if (error != null) return <ErrorDisplay message="Error loading A.B.C. player comparison." error={error} />;

    return (
        <div className="container-md bls-compare bls-fifa-compare">
            <RivalryStudio source="api" rows={rows} matchup={matchup} scopeLabel={"Current league sheet · " + (availableSeasons(players)[0] ?? "Season unavailable")}/>
            <p className="small text-body-secondary">Only statistics published by the Arapahoe league sheet are compared.</p>
            {playerA && playerB && (
                <>
                    <div className="bls-fifa-heads mb-3">
                        <PlayerCard side="a" player={playerA}/>
                        <div className="bls-fifa-vs"><span>VS</span><Badge pill style={{background: "#6e6e73", color: "#fff"}}>A.B.C.</Badge></div>
                        <PlayerCard side="b" player={playerB}/>
                    </div>
                    <ComparisonTabs<TabId> active={tab} onChange={setTab} tabs={[["scoring","Scoring"],["volume","Volume"],["latest","Latest Series"]]}/>
                    <Card className="bls-profile-card bls-fifa-panel">
                        <CardBody>
                            <div className="bls-fifa-col">
                                <div className="bls-fifa-col-title">{tab === "scoring" ? "Scoring" : tab === "volume" ? "Workload & milestones" : "Latest series"}</div>
                                {activeMetrics.map(metric => <CompareBar key={metric.key} metric={metric} playerA={playerA} playerB={playerB} />)}
                            </div>
                        </CardBody>
                    </Card>
                </>
            )}
        </div>
    );
};

export default ApiPlayerCompare;
