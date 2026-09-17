import {type FC, useMemo, useState} from "react";
import {Card, CardBody, Col, Form, Row} from "react-bootstrap";
import type {PlayerListEntry} from "../../../data/player/player-aggregate";
import {apiStats} from "../../../data/player/api-player-data";
import ErrorDisplay from "../error-display";
import Loader from "../loader";
import {usePlayerIndexData} from "./use-player-index-data";

const numberFormat = Intl.NumberFormat("en-US", {maximumFractionDigits: 1});
const integerFormat = Intl.NumberFormat("en-US", {maximumFractionDigits: 0});

interface Metric {
    label: string;
    get: (player: PlayerListEntry) => number | null;
    integer?: boolean;
}

const metrics: Metric[] = [
    {label: "Average", get: player => player.average},
    {label: "Handicap", get: player => apiStats(player)?.handicap ?? null, integer: true},
    {label: "Games", get: player => player.games, integer: true},
    {label: "Series Bowled", get: player => apiStats(player)?.seriesCount ?? null, integer: true},
    {label: "Pinfall", get: player => player.pinfall, integer: true},
    {label: "Avg Series", get: player => apiStats(player)?.averageSeries ?? null},
    {label: "High Game", get: player => player.highGame || null, integer: true},
    {label: "High Series", get: player => player.highSeries || null, integer: true},
    {label: "High Hdcp Game", get: player => apiStats(player)?.highHandicapGame || null, integer: true},
    {label: "High Hdcp Series", get: player => apiStats(player)?.highHandicapSeries || null, integer: true},
    {label: "Known 200+ Games", get: player => apiStats(player)?.known200Games ?? null, integer: true},
    {label: "Known 600+ Series", get: player => apiStats(player)?.known600Series ?? null, integer: true},
    {label: "Known 700+ Series", get: player => apiStats(player)?.known700Series ?? null, integer: true},
    {label: "Latest Series", get: player => apiStats(player)?.latestSeries ?? null, integer: true},
    {label: "Latest Series Avg", get: player => apiStats(player)?.latestAverage ?? null},
    {label: "Latest High Game", get: player => apiStats(player)?.latestHighGame ?? null, integer: true},
    {label: "Latest Low Game", get: player => apiStats(player)?.latestLowGame ?? null, integer: true},
    {label: "Latest Hdcp Series", get: player => apiStats(player)?.latestHandicapSeries ?? null, integer: true},
];

function teamName(player: PlayerListEntry): string {
    return player.appearanceSlices[0]?.teamName ?? "Substitute";
}

function display(value: number | null, integer = false): string {
    if (value == null) return "—";
    return integer ? integerFormat.format(value) : numberFormat.format(value);
}

const ApiPlayerCompare: FC = () => {
    const {data, isLoading, error} = usePlayerIndexData();
    const [idA, setIdA] = useState("");
    const [idB, setIdB] = useState("");
    const players = useMemo(() => [...(data ?? [])].sort((a, b) => a.name.localeCompare(b.name)), [data]);
    const playerA = players.find(player => player.id === idA);
    const playerB = players.find(player => player.id === idB);

    if (isLoading) return <Loader />;
    if (error != null) return <ErrorDisplay message="Error loading API player comparison." error={error} />;

    return (
        <div className="container-md bls-compare">
            <div className="bls-compare-hero mb-3">
                <span className="bls-hero-kicker">API Data</span>
                <h1>Player Compare</h1>
                <div className="text-body-secondary">Only statistics published by the Arapahoe league sheet are compared.</div>
            </div>
            <Card className="bls-profile-card mb-3">
                <CardBody>
                    <Row className="g-3">
                        <Col xs={12} md={6}>
                            <Form.Label>Player A</Form.Label>
                            <Form.Select value={idA} onChange={event => { setIdA(event.target.value); }}>
                                <option value="">Select bowler…</option>
                                {players.map(player => <option key={player.id} value={player.id} disabled={player.id === idB}>{player.name} · {teamName(player)}</option>)}
                            </Form.Select>
                        </Col>
                        <Col xs={12} md={6}>
                            <Form.Label>Player B</Form.Label>
                            <Form.Select value={idB} onChange={event => { setIdB(event.target.value); }}>
                                <option value="">Select bowler…</option>
                                {players.map(player => <option key={player.id} value={player.id} disabled={player.id === idA}>{player.name} · {teamName(player)}</option>)}
                            </Form.Select>
                        </Col>
                    </Row>
                </CardBody>
            </Card>
            {playerA && playerB && (
                <Card className="bls-profile-card">
                    <CardBody>
                        <Row className="g-2 align-items-end mb-3 text-center">
                            <Col xs={5}><div className="fw-semibold fs-5">{playerA.name}</div><div className="small text-body-secondary">{teamName(playerA)}</div></Col>
                            <Col xs={2}><div className="small fw-semibold text-body-secondary">VS</div></Col>
                            <Col xs={5}><div className="fw-semibold fs-5">{playerB.name}</div><div className="small text-body-secondary">{teamName(playerB)}</div></Col>
                        </Row>
                        <div className="table-responsive">
                            <table className="table align-middle mb-0">
                                <thead><tr><th className="text-end" style={{width:"32%"}}>{playerA.name}</th><th className="text-center">Statistic</th><th style={{width:"32%"}}>{playerB.name}</th></tr></thead>
                                <tbody>
                                    {metrics.map(metric => {
                                        const a = metric.get(playerA);
                                        const b = metric.get(playerB);
                                        return <tr key={metric.label}><td className={`text-end${a != null && b != null && a > b ? " fw-bold" : ""}`}>{display(a, metric.integer)}</td><th className="text-center fw-normal text-body-secondary">{metric.label}</th><td className={a != null && b != null && b > a ? "fw-bold" : ""}>{display(b, metric.integer)}</td></tr>;
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </CardBody>
                </Card>
            )}
        </div>
    );
};

export default ApiPlayerCompare;
