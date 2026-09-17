import {type FC, useMemo, useState} from "react";
import {Link} from "react-router";
import {Alert, Badge, Card, CardBody, Col, Form, Row, Table} from "react-bootstrap";

import type {PlayerListEntry} from "../../../data/player/player-aggregate";
import ErrorDisplay from "../error-display";
import Loader from "../loader";
import {usePlayerIndexData} from "./use-player-index-data";

const numberFormat = Intl.NumberFormat("en-US", {maximumFractionDigits: 1});

type ApiSort = "average" | "games" | "pinfall" | "highGame" | "highSeries";

function teamName(player: PlayerListEntry): string {
    return player.appearanceSlices[0]?.teamName ?? "—";
}

function value(player: PlayerListEntry, key: ApiSort): number {
    return player[key] ?? 0;
}

const ApiSourceNotice: FC = () => (
    <Alert variant="info" className="py-2">
        <strong>API Data:</strong> these stats come from the bowling center's published league sheet. Frame-only stats such as strike %, spare %, opens and shot-by-shot detail are available in Frame Data mode.
    </Alert>
);

export const ApiPlayerList: FC<{title?: string; limit?: number}> = ({title = "API Player Stats", limit}) => {
    const {data, isLoading, error} = usePlayerIndexData();
    const [query, setQuery] = useState("");
    const [sort, setSort] = useState<ApiSort>("average");
    const players = useMemo(() => {
        const q = query.trim().toLocaleLowerCase();
        const rows = (data ?? [])
            .filter((player) => !q || `${player.name} ${teamName(player)}`.toLocaleLowerCase().includes(q))
            .sort((a, b) => value(b, sort) - value(a, sort) || a.name.localeCompare(b.name));
        return limit ? rows.slice(0, limit) : rows;
    }, [data, query, sort, limit]);

    if (isLoading) return <Loader />;
    if (error != null) return <ErrorDisplay message="Error loading API player stats." error={error} />;

    return (
        <div>
            <ApiSourceNotice />
            <Card className="bls-profile-card">
                <CardBody className="d-flex flex-wrap gap-2 align-items-center justify-content-between">
                    <div><strong>{title}</strong> <Badge bg="secondary" pill>{players.length} bowlers</Badge></div>
                    <div className="d-flex flex-wrap gap-2">
                        <Form.Control size="sm" type="search" placeholder="Search bowler or team" value={query} onChange={(event) => { setQuery(event.target.value); }} style={{maxWidth: 240}} />
                        <Form.Select size="sm" value={sort} onChange={(event) => { setSort(event.target.value as ApiSort); }} style={{maxWidth: 170}} aria-label="Sort API players">
                            <option value="average">Average</option>
                            <option value="games">Games</option>
                            <option value="pinfall">Pins</option>
                            <option value="highGame">High game</option>
                            <option value="highSeries">High series</option>
                        </Form.Select>
                    </div>
                </CardBody>
                <div className="table-responsive">
                    <Table hover size="sm" className="mb-0 align-middle">
                        <thead><tr><th>#</th><th>Bowler</th><th>Team</th><th className="text-end">Avg</th><th className="text-end">Games</th><th className="text-end d-none d-md-table-cell">Pins</th><th className="text-end">HG</th><th className="text-end d-none d-sm-table-cell">HS</th></tr></thead>
                        <tbody>{players.map((player, index) => (
                            <tr key={player.id}>
                                <td className="text-body-secondary">{index + 1}</td>
                                <td><Link className="bls-link fw-semibold" to={`/player/${player.id}`}>{player.name}</Link></td>
                                <td>{teamName(player)}</td>
                                <td className="text-end fw-semibold">{player.average != null ? numberFormat.format(player.average) : "—"}</td>
                                <td className="text-end">{player.games || "—"}</td>
                                <td className="text-end d-none d-md-table-cell">{player.pinfall.toLocaleString()}</td>
                                <td className="text-end">{player.highGame || "—"}</td>
                                <td className="text-end d-none d-sm-table-cell">{player.highSeries || "—"}</td>
                            </tr>
                        ))}</tbody>
                    </Table>
                </div>
            </Card>
        </div>
    );
};

export const ApiPlayerDetail: FC<{playerId: string}> = ({playerId}) => {
    const {data, isLoading, error} = usePlayerIndexData();
    const player = data?.find((candidate) => candidate.id === playerId);
    if (isLoading) return <Loader />;
    if (error != null) return <ErrorDisplay message="Error loading API player stats." error={error} />;
    if (!player) return <ErrorDisplay message={`Player not found in API data: ${playerId}`} />;
    const appearance = player.appearanceSlices[0];
    return (
        <div className="container-md">
            <ApiSourceNotice />
            <div className="bls-compare-hero mb-3"><span className="bls-hero-kicker">API Player</span><h1>{player.name}</h1><div className="text-body-secondary">{appearance?.teamName ?? "Substitute"} · {appearance?.leagueName ?? "Beer League"}</div></div>
            <Row className="g-3">
                {[
                    ["Average", player.average != null ? numberFormat.format(player.average) : "—"],
                    ["Games", player.games || "—"],
                    ["Pinfall", player.pinfall ? player.pinfall.toLocaleString() : "—"],
                    ["High Game", player.highGame || "—"],
                    ["High Series", player.highSeries || "—"],
                    ["Team", appearance?.teamName ?? "—"],
                ].map(([label, stat]) => <Col xs={6} md={4} key={label}><Card className="h-100 bls-profile-card"><CardBody><div className="small text-body-secondary">{label}</div><div className="fs-4 fw-semibold">{stat}</div></CardBody></Card></Col>)}
            </Row>
        </div>
    );
};

export const ApiPlayerLeaderboard: FC = () => {
    const {data, isLoading, error} = usePlayerIndexData();
    const [stat, setStat] = useState<ApiSort>("average");
    const [minGames, setMinGames] = useState(1);
    const ranked = useMemo(() => (data ?? []).filter((player) => player.games >= minGames).sort((a, b) => value(b, stat) - value(a, stat) || a.name.localeCompare(b.name)), [data, stat, minGames]);
    if (isLoading) return <Loader />;
    if (error != null) return <ErrorDisplay message="Error loading API leaderboard." error={error} />;
    return (
        <div className="container-md">
            <div className="bls-compare-hero mb-3"><span className="bls-hero-kicker">API Data</span><h1>Leaderboard</h1></div>
            <ApiSourceNotice />
            <Card className="bls-profile-card mb-3"><CardBody><Row className="g-3"><Col md={6}><Form.Label>Stat</Form.Label><Form.Select value={stat} onChange={(event) => { setStat(event.target.value as ApiSort); }}><option value="average">Average</option><option value="games">Games</option><option value="pinfall">Total pinfall</option><option value="highGame">High game</option><option value="highSeries">High series</option></Form.Select></Col><Col md={6}><Form.Label>Minimum games</Form.Label><Form.Select value={minGames} onChange={(event) => { setMinGames(Number(event.target.value)); }}>{[1,3,6,9,12].map((games) => <option key={games} value={games}>{games}+</option>)}</Form.Select></Col></Row></CardBody></Card>
            <Card className="bls-profile-card"><div className="table-responsive"><Table hover className="mb-0"><thead><tr><th>#</th><th>Bowler</th><th>Team</th><th className="text-end">Value</th></tr></thead><tbody>{ranked.map((player, index) => <tr key={player.id}><td>{index + 1}</td><td><Link className="bls-link fw-semibold" to={`/player/${player.id}`}>{player.name}</Link></td><td>{teamName(player)}</td><td className="text-end fw-semibold">{stat === "average" ? numberFormat.format(value(player, stat)) : value(player, stat).toLocaleString()}</td></tr>)}</tbody></Table></div></Card>
        </div>
    );
};

export const ApiPlayerCompare: FC = () => {
    const {data, isLoading, error} = usePlayerIndexData();
    const players = useMemo(() => [...(data ?? [])].sort((a, b) => a.name.localeCompare(b.name)), [data]);
    const [idA, setIdA] = useState("");
    const [idB, setIdB] = useState("");
    const a = players.find((player) => player.id === idA);
    const b = players.find((player) => player.id === idB);
    if (isLoading) return <Loader />;
    if (error != null) return <ErrorDisplay message="Error loading API player comparison." error={error} />;
    const stats: {label: string; key: ApiSort}[] = [{label:"Average",key:"average"},{label:"Games",key:"games"},{label:"Pinfall",key:"pinfall"},{label:"High Game",key:"highGame"},{label:"High Series",key:"highSeries"}];
    return (
        <div className="container-md">
            <div className="bls-compare-hero mb-3"><span className="bls-hero-kicker">API Data</span><h1>Player Compare</h1></div>
            <ApiSourceNotice />
            <Card className="bls-profile-card mb-3"><CardBody><Row className="g-3"><Col md={6}><Form.Label>Player A</Form.Label><Form.Select value={idA} onChange={(event) => { setIdA(event.target.value); }}><option value="">Select bowler…</option>{players.map((player) => <option key={player.id} value={player.id} disabled={player.id === idB}>{player.name} — {teamName(player)}</option>)}</Form.Select></Col><Col md={6}><Form.Label>Player B</Form.Label><Form.Select value={idB} onChange={(event) => { setIdB(event.target.value); }}><option value="">Select bowler…</option>{players.map((player) => <option key={player.id} value={player.id} disabled={player.id === idA}>{player.name} — {teamName(player)}</option>)}</Form.Select></Col></Row></CardBody></Card>
            {a && b && <Card className="bls-profile-card"><CardBody><div className="table-responsive"><Table className="mb-0 align-middle"><thead><tr><th>Stat</th><th className="text-end">{a.name}</th><th className="text-end">{b.name}</th></tr></thead><tbody>{stats.map(({label,key}) => <tr key={key}><td>{label}</td><td className="text-end fw-semibold">{key === "average" ? numberFormat.format(value(a,key)) : value(a,key).toLocaleString()}</td><td className="text-end fw-semibold">{key === "average" ? numberFormat.format(value(b,key)) : value(b,key).toLocaleString()}</td></tr>)}</tbody></Table></div></CardBody></Card>}
        </div>
    );
};
