import {type FC, useMemo, useState} from "react";
import {Link} from "react-router";
import {Alert, Badge, Card, CardBody, Col, Dropdown, Form, Row, Table} from "react-bootstrap";

import type {PlayerListEntry} from "../../../data/player/player-aggregate";
import ErrorDisplay from "../error-display";
import Loader from "../loader";
import {usePlayerIndexData} from "./use-player-index-data";

const numberFormat = Intl.NumberFormat("en-US", {maximumFractionDigits: 1});

type ApiSort = "average" | "games" | "pinfall" | "highGame" | "highSeries";
type ApiPlayerListSort = "name" | "team" | ApiSort;
type SortDir = "asc" | "desc";

function teamName(player: PlayerListEntry): string {
    return player.appearanceSlices[0]?.teamName ?? "—";
}

function value(player: PlayerListEntry, key: ApiSort): number {
    return player[key] ?? 0;
}

function compareApiPlayers(a: PlayerListEntry, b: PlayerListEntry, key: ApiPlayerListSort, dir: SortDir): number {
    const multiplier = dir === "asc" ? 1 : -1;
    let comparison: number;
    if (key === "name") comparison = a.name.localeCompare(b.name);
    else if (key === "team") comparison = teamName(a).localeCompare(teamName(b));
    else comparison = value(a, key) - value(b, key);
    if (comparison === 0) comparison = a.name.localeCompare(b.name);
    return comparison * multiplier;
}

const SortHeader: FC<{
    label: string;
    sortKey: ApiPlayerListSort;
    active: ApiPlayerListSort;
    dir: SortDir;
    onSort: (key: ApiPlayerListSort) => void;
    className?: string;
}> = ({label, sortKey, active, dir, onSort, className}) => {
    const selected = active === sortKey;
    return (
        <th
            className={`bls-sortable-th ${className ?? ""}${selected ? " is-sorted" : ""}`}
            onClick={() => { onSort(sortKey); }}
            onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSort(sortKey);
                }
            }}
            role="button"
            tabIndex={0}
            aria-sort={selected ? (dir === "asc" ? "ascending" : "descending") : "none"}
        >
            {label}{selected ? (dir === "asc" ? " ▲" : " ▼") : ""}
        </th>
    );
};

const ApiSourceNotice: FC = () => (
    <Alert variant="info" className="py-2">
        <strong>API Data:</strong> these stats come from the bowling center's published league sheet. Frame-only stats such as strike %, spare %, opens and shot-by-shot detail are available in Frame Data mode.
    </Alert>
);

export const ApiPlayerList: FC<{title?: string; limit?: number}> = ({title = "API Player Stats", limit}) => {
    const {data, isLoading, error} = usePlayerIndexData();
    const [query, setQuery] = useState("");
    const [sort, setSort] = useState<ApiPlayerListSort>("average");
    const [sortDir, setSortDir] = useState<SortDir>("desc");
    const [selectedTeams, setSelectedTeams] = useState<string[]>([]);

    const teams = useMemo(() => Array.from(new Set((data ?? []).map(teamName))).sort((a, b) => a.localeCompare(b)), [data]);
    const onSort = (key: ApiPlayerListSort) => {
        if (key === sort) setSortDir((current) => current === "asc" ? "desc" : "asc");
        else {
            setSort(key);
            setSortDir(key === "name" || key === "team" ? "asc" : "desc");
        }
    };
    const toggleTeam = (team: string) => {
        setSelectedTeams((current) => current.includes(team) ? current.filter((name) => name !== team) : [...current, team]);
    };
    const players = useMemo(() => {
        const q = query.trim().toLocaleLowerCase();
        const rows = (data ?? [])
            .filter((player) => selectedTeams.length === 0 || selectedTeams.includes(teamName(player)))
            .filter((player) => !q || `${player.name} ${teamName(player)}`.toLocaleLowerCase().includes(q))
            .sort((a, b) => compareApiPlayers(a, b, sort, sortDir));
        return limit ? rows.slice(0, limit) : rows;
    }, [data, query, sort, sortDir, selectedTeams, limit]);

    if (isLoading) return <Loader />;
    if (error != null) return <ErrorDisplay message="Error loading API player stats." error={error} />;

    const teamLabel = selectedTeams.length === 0 ? "All teams" : selectedTeams.length === 1 ? selectedTeams[0] : `${selectedTeams.length} teams`;

    return (
        <div>
            <ApiSourceNotice />
            <Card className="bls-profile-card">
                <CardBody className="d-flex flex-wrap gap-2 align-items-center justify-content-between">
                    <div><strong>{title}</strong> <Badge bg="secondary" pill>{players.length} bowlers</Badge></div>
                    <div className="d-flex flex-wrap gap-2">
                        <Form.Control size="sm" type="search" placeholder="Search bowler or team" value={query} onChange={(event) => { setQuery(event.target.value); }} style={{maxWidth: 240}} />
                        <Dropdown autoClose="outside">
                            <Dropdown.Toggle size="sm" variant="outline-secondary" aria-label="Filter API players by team">{teamLabel}</Dropdown.Toggle>
                            <Dropdown.Menu style={{maxHeight: 320, overflowY: "auto", minWidth: 220}}>
                                <Dropdown.Header>Teams</Dropdown.Header>
                                <Dropdown.Item as="button" onClick={() => { setSelectedTeams([]); }} active={selectedTeams.length === 0}>All teams</Dropdown.Item>
                                <Dropdown.Divider />
                                {teams.map((team) => (
                                    <div className="px-3 py-1" key={team}>
                                        <Form.Check
                                            type="checkbox"
                                            id={`api-team-${team.replace(/[^a-z0-9]+/gi, "-").toLocaleLowerCase()}`}
                                            label={team}
                                            checked={selectedTeams.includes(team)}
                                            onChange={() => { toggleTeam(team); }}
                                        />
                                    </div>
                                ))}
                            </Dropdown.Menu>
                        </Dropdown>
                    </div>
                </CardBody>
                <div className="table-responsive">
                    <Table hover size="sm" className="mb-0 align-middle">
                        <thead><tr><th>#</th><SortHeader label="Bowler" sortKey="name" active={sort} dir={sortDir} onSort={onSort} /><SortHeader label="Team" sortKey="team" active={sort} dir={sortDir} onSort={onSort} /><SortHeader label="Avg" sortKey="average" active={sort} dir={sortDir} onSort={onSort} className="text-end" /><SortHeader label="Games" sortKey="games" active={sort} dir={sortDir} onSort={onSort} className="text-end" /><SortHeader label="Pins" sortKey="pinfall" active={sort} dir={sortDir} onSort={onSort} className="text-end d-none d-md-table-cell" /><SortHeader label="HG" sortKey="highGame" active={sort} dir={sortDir} onSort={onSort} className="text-end" /><SortHeader label="HS" sortKey="highSeries" active={sort} dir={sortDir} onSort={onSort} className="text-end d-none d-sm-table-cell" /></tr></thead>
                        <tbody>
                            {players.length === 0 && <tr><td colSpan={8} className="text-center text-body-secondary py-4">No bowlers match the selected teams and search.</td></tr>}
                            {players.map((player, index) => (
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
