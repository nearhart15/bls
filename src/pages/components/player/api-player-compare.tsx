import {type FC, useMemo, useState} from "react";
import {Badge, Card, CardBody, Col, Form, Row} from "react-bootstrap";
import type {PlayerListEntry} from "../../../data/player/player-aggregate";
import {apiStats} from "../../../data/player/api-player-data";
import ErrorDisplay from "../error-display";
import Loader from "../loader";
import {usePlayerIndexData} from "./use-player-index-data";

const numberFormat = Intl.NumberFormat("en-US", {maximumFractionDigits: 1});
const integerFormat = Intl.NumberFormat("en-US", {maximumFractionDigits: 0});
const COLOR_A = "#ff2d55";
const COLOR_B = "#00d4ff";

type TabId = "scoring" | "volume" | "latest";

interface Metric {
    key: string;
    label: string;
    get: (player: PlayerListEntry) => number | null;
    integer?: boolean;
}

const SCORING: Metric[] = [
    {key: "average", label: "Average", get: player => player.average},
    {key: "handicap", label: "Handicap", get: player => apiStats(player)?.handicap ?? null, integer: true},
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
    const valueA = metric.get(playerA);
    const valueB = metric.get(playerB);
    const a = valueA ?? 0;
    const b = valueB ?? 0;
    const total = Math.max(0, a) + Math.max(0, b);
    const fill = total > 0 ? Math.max(a, b) / total * 100 : 50;
    const leader: "a" | "b" | "tie" = valueA == null || valueB == null || a === b ? "tie" : a > b ? "a" : "b";
    const color = leader === "a" ? COLOR_A : leader === "b" ? COLOR_B : "#6e6e73";
    return (
        <div className="bls-fifa-row">
            <div className="bls-fifa-row-label">{metric.label}</div>
            <div className="bls-fifa-row-trackline">
                <span className={`bls-fifa-val${leader === "a" ? " is-lead" : ""}`} style={{color: COLOR_A}}>{display(valueA, metric.integer)}</span>
                <div className="bls-fifa-track">
                    <div className="bls-fifa-fill" style={{width: `${fill}%`, background: color, boxShadow: leader === "tie" ? undefined : `0 0 10px ${color}`, marginLeft: leader === "b" ? "auto" : 0}} />
                </div>
                <span className={`bls-fifa-val${leader === "b" ? " is-lead" : ""}`} style={{color: COLOR_B}}>{display(valueB, metric.integer)}</span>
            </div>
        </div>
    );
};

const PlayerCard: FC<{
    side: "a" | "b";
    player: PlayerListEntry;
    players: PlayerListEntry[];
    selectedId: string;
    otherId: string;
    onChange: (id: string) => void;
}> = ({side, player, players, selectedId, otherId, onChange}) => {
    const color = side === "a" ? COLOR_A : COLOR_B;
    return (
        <div className={`bls-fifa-pcard bls-fifa-pcard-${side}`} style={{borderColor: color, boxShadow: `0 0 18px ${color}40`}}>
            <div className="bls-fifa-pcard-badge" style={{borderColor: color, color}}>{display(player.average)}</div>
            <div className="bls-fifa-pcard-body">
                <div className="bls-fifa-pcard-name" style={{color}}>{player.name}</div>
                <div className="bls-fifa-pcard-meta"><span>{teamName(player)}</span><span>{integerFormat.format(player.games)} games</span></div>
                <Form.Select size="sm" className="bls-fifa-change" value={selectedId} onChange={event => { onChange(event.target.value); }} style={{borderColor: color}}>
                    {players.map(candidate => <option key={candidate.id} value={candidate.id} disabled={candidate.id === otherId}>{candidate.name} · {teamName(candidate)}</option>)}
                </Form.Select>
            </div>
        </div>
    );
};

const ApiPlayerCompare: FC = () => {
    const {data, isLoading, error} = usePlayerIndexData();
    const [idA, setIdA] = useState("");
    const [idB, setIdB] = useState("");
    const [tab, setTab] = useState<TabId>("scoring");
    const players = useMemo(() => [...(data ?? [])].sort((a, b) => a.name.localeCompare(b.name)), [data]);
    const playerA = players.find(player => player.id === idA);
    const playerB = players.find(player => player.id === idB);
    const activeMetrics = tab === "scoring" ? SCORING : tab === "volume" ? VOLUME : LATEST;

    if (isLoading) return <Loader />;
    if (error != null) return <ErrorDisplay message="Error loading API player comparison." error={error} />;

    return (
        <div className="container-md bls-compare bls-fifa-compare">
            <div className="bls-compare-hero mb-3">
                <span className="bls-hero-kicker">API Data · Head to head</span>
                <h1>Player Compare</h1>
                <div className="text-body-secondary">Only statistics published by the Arapahoe league sheet are compared.</div>
            </div>
            {!playerA || !playerB ? (
                <Card className="bls-profile-card mb-3 bls-fifa-panel">
                    <CardBody>
                        <Row className="g-3">
                            <Col xs={12} md={6}>
                                <Form.Label>Player A</Form.Label>
                                <Form.Select value={idA} onChange={event => { setIdA(event.target.value); }} style={{borderColor: COLOR_A}}>
                                    <option value="">Select bowler…</option>
                                    {players.map(player => <option key={player.id} value={player.id} disabled={player.id === idB}>{player.name} · {teamName(player)}</option>)}
                                </Form.Select>
                            </Col>
                            <Col xs={12} md={6}>
                                <Form.Label>Player B</Form.Label>
                                <Form.Select value={idB} onChange={event => { setIdB(event.target.value); }} style={{borderColor: COLOR_B}}>
                                    <option value="">Select bowler…</option>
                                    {players.map(player => <option key={player.id} value={player.id} disabled={player.id === idA}>{player.name} · {teamName(player)}</option>)}
                                </Form.Select>
                            </Col>
                        </Row>
                    </CardBody>
                </Card>
            ) : (
                <>
                    <div className="bls-fifa-heads mb-3">
                        <PlayerCard side="a" player={playerA} players={players} selectedId={idA} otherId={idB} onChange={setIdA} />
                        <div className="bls-fifa-vs"><span>VS</span><Badge pill style={{background: "#6e6e73", color: "#fff"}}>API</Badge></div>
                        <PlayerCard side="b" player={playerB} players={players} selectedId={idB} otherId={idA} onChange={setIdB} />
                    </div>
                    <div className="bls-fifa-tabs" role="tablist">
                        {([["scoring", "Scoring"], ["volume", "Volume"], ["latest", "Latest Series"]] as [TabId, string][]).map(([id, label]) => (
                            <button key={id} type="button" className={`bls-fifa-tab${tab === id ? " is-active" : ""}`} onClick={() => { setTab(id); }}>{label}</button>
                        ))}
                    </div>
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
