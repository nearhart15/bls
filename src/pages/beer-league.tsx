import {type FC, useCallback, useEffect, useMemo, useState} from "react";
import {Link} from "react-router";
import {Accordion, Alert, Badge, Button, ButtonGroup, Card, Col, Form, Row, Spinner, Tab, Table, Tabs} from "react-bootstrap";

import {buildFullPlayerList, PLAYER_INDEX_CACHE_CATEGORY, type PlayerListEntry} from "../data/player/player-aggregate";
import {useCachedFetcher} from "./components/cache/data-loader";

interface BeerStanding {
    division: string | null;
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

interface BeerPlayer {
    name: string;
    average: number;
    handicap: number;
    pins: number;
    games: number;
    highGame: number;
    highSeries: number;
    highHandicapGame?: number;
    highHandicapSeries?: number;
    weekScoresRaw: string[];
    weekScores: (number | null)[];
    weekTotal: number | null;
}

interface BeerTeam {
    division?: string | null;
    place?: number;
    number: number;
    name: string;
    won?: number;
    lost?: number;
    average?: number;
    handicap?: number;
    players: BeerPlayer[];
}

interface BeerLeagueData {
    status: "pending" | "ready";
    message?: string;
    generatedAt: string | null;
    source?: { directoryUrl: string; leaguePageUrl: string | null; pdfUrl: string | null; };
    league?: { name: string; date: string | null; week: number | null; totalWeeks: number | null; day: string; time: string | null; season: string | null; };
    standings: BeerStanding[];
    teams: BeerTeam[];
    substitutes?: BeerPlayer[];
}

interface LeaguePlayerRow extends BeerPlayer {
    teamNumber: number | null;
    teamName: string;
    division: string | null;
    isSub: boolean;
    framePlayer?: PlayerListEntry;
}

type PlayerFilter = "all" | "frame" | "website";

function normalizeName(name: string): string {
    return name.toLocaleLowerCase().normalize("NFKD").replace(/[^a-z0-9]/g, "");
}

const PlayerSourceBadge: FC<{hasFrames: boolean}> = ({hasFrames}) => hasFrames
    ? <Badge bg="success">Frame data</Badge>
    : <Badge bg="secondary">Website stats</Badge>;

const BeerLeague: FC = () => {
    const [data, setData] = useState<BeerLeagueData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [playerFilter, setPlayerFilter] = useState<PlayerFilter>("all");
    const [playerSearch, setPlayerSearch] = useState("");

    const frameFetcher = useCallback(() => buildFullPlayerList(), []);
    const {data: framePlayers, isLoading: framePlayersLoading} = useCachedFetcher<PlayerListEntry[]>(frameFetcher, PLAYER_INDEX_CACHE_CATEGORY);

    useEffect(() => {
        const url = `${import.meta.env.BASE_URL}data/beer-league.json?ts=${Date.now()}`;
        fetch(url, {cache: "no-store"})
            .then((response) => {
                if (!response.ok) throw new Error(`Beer League data returned ${response.status}.`);
                return response.json() as Promise<BeerLeagueData>;
            })
            .then((value) => { setData(value); })
            .catch((reason: unknown) => { setError(reason instanceof Error ? reason.message : String(reason)); });
    }, []);

    const divisions = useMemo(() => [...new Set((data?.standings ?? []).map((team) => team.division).filter(Boolean))] as string[], [data]);
    const frameByName = useMemo(() => new Map((framePlayers ?? []).map((player) => [normalizeName(player.name), player])), [framePlayers]);

    const allPlayers = useMemo<LeaguePlayerRow[]>(() => {
        if (!data) return [];
        const rosterPlayers = data.teams.flatMap((team) => team.players.map((player) => ({
            ...player,
            teamNumber: team.number,
            teamName: team.name,
            division: team.division ?? null,
            isSub: false,
            framePlayer: frameByName.get(normalizeName(player.name)),
        })));
        const subs = (data.substitutes ?? []).map((player) => ({
            ...player,
            teamNumber: null,
            teamName: "Substitute",
            division: null,
            isSub: true,
            framePlayer: frameByName.get(normalizeName(player.name)),
        }));
        return [...rosterPlayers, ...subs];
    }, [data, frameByName]);

    const activePlayers = useMemo(() => allPlayers.filter((player) => player.games > 0), [allPlayers]);
    const frameDataPlayers = useMemo(() => allPlayers.filter((player) => Boolean(player.framePlayer)), [allPlayers]);
    const websitePlayers = useMemo(() => allPlayers.filter((player) => !player.framePlayer), [allPlayers]);

    const visiblePlayers = useMemo(() => {
        const query = normalizeName(playerSearch);
        return allPlayers
            .filter((player) => playerFilter === "all" || (playerFilter === "frame" ? Boolean(player.framePlayer) : !player.framePlayer))
            .filter((player) => !query || normalizeName(`${player.name} ${player.teamName}`).includes(query))
            .sort((a, b) => b.games - a.games || b.average - a.average || a.name.localeCompare(b.name));
    }, [allPlayers, playerFilter, playerSearch]);

    const leaders = useMemo(() => {
        const eligible = activePlayers.filter((player) => !player.isSub);
        const byAverage = [...eligible].sort((a, b) => b.average - a.average || b.games - a.games).slice(0, 10);
        const byHighGame = [...eligible].sort((a, b) => b.highGame - a.highGame || b.average - a.average).slice(0, 10);
        const byHighSeries = [...eligible].sort((a, b) => b.highSeries - a.highSeries || b.average - a.average).slice(0, 10);
        const byPins = [...eligible].sort((a, b) => b.pins - a.pins || b.games - a.games).slice(0, 10);
        return {byAverage, byHighGame, byHighSeries, byPins};
    }, [activePlayers]);

    if (error) return <Alert variant="danger">Could not load the imported Beer League data: {error}</Alert>;
    if (!data) return <div className="d-flex align-items-center gap-2"><Spinner size="sm"/><span>Loading Beer League data…</span></div>;
    if (data.status !== "ready") return <Alert variant="info">{data.message ?? "Beer League import has not run yet."}</Alert>;

    const renderPlayerName = (player: LeaguePlayerRow) => player.framePlayer
        ? <Link to={`/player/${player.framePlayer.id}`} className="fw-semibold text-decoration-none">{player.name}</Link>
        : <span className="fw-semibold">{player.name}</span>;

    const leaderTable = (players: LeaguePlayerRow[], value: (player: LeaguePlayerRow) => number, label: string) => (
        <div className="table-responsive">
            <Table hover size="sm" className="mb-0 align-middle">
                <thead><tr><th>#</th><th>Bowler</th><th>Team</th><th className="text-end">{label}</th></tr></thead>
                <tbody>{players.map((player, index) => (
                    <tr key={`${label}-${player.teamNumber}-${player.name}`}>
                        <td>{index + 1}</td>
                        <td>{renderPlayerName(player)} <span className="ms-1"><PlayerSourceBadge hasFrames={Boolean(player.framePlayer)}/></span></td>
                        <td className="text-body-secondary">{player.teamName}</td>
                        <td className="text-end fw-semibold">{value(player).toLocaleString()}</td>
                    </tr>
                ))}</tbody>
            </Table>
        </div>
    );

    return (
        <div>
            <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-4">
                <div>
                    <p className="text-uppercase text-body-secondary small fw-semibold mb-1">Arapahoe Bowling Center</p>
                    <h1 className="mb-1">{data.league?.name ?? "Beer League"}</h1>
                    <div className="text-body-secondary">
                        {data.league?.season} · {data.league?.day} {data.league?.time}
                        {data.league?.week != null && <> · Week {data.league.week}{data.league.totalWeeks ? ` of ${data.league.totalWeeks}` : ""}</>}
                    </div>
                </div>
                <div className="text-end small text-body-secondary">
                    <div>Sheet date: {data.league?.date ?? "Unknown"}</div>
                    {data.generatedAt && <div>Imported: {new Date(data.generatedAt).toLocaleString()}</div>}
                    {data.source?.pdfUrl && <a href={data.source.pdfUrl} target="_blank" rel="noreferrer">Open source PDF</a>}
                </div>
            </div>

            <Alert variant="light" className="border d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div><strong>Two data levels:</strong> bowlers with BLS frame data keep their full shot-by-shot profiles. Everyone else gets league-sheet stats from the automatically imported website PDF.</div>
                {framePlayersLoading && <span className="small text-body-secondary"><Spinner size="sm" className="me-1"/>Matching frame profiles…</span>}
            </Alert>

            <Tabs defaultActiveKey="overview" className="mb-4" mountOnEnter>
                <Tab eventKey="overview" title="Overview">
                    <Row className="g-3 mb-4">
                        <Col xs={6} md={3}><Card className="h-100"><Card.Body><div className="small text-body-secondary">Teams</div><div className="fs-3 fw-semibold">{data.standings.length}</div></Card.Body></Card></Col>
                        <Col xs={6} md={3}><Card className="h-100"><Card.Body><div className="small text-body-secondary">Active Bowlers</div><div className="fs-3 fw-semibold">{activePlayers.length}</div></Card.Body></Card></Col>
                        <Col xs={6} md={3}><Card className="h-100"><Card.Body><div className="small text-body-secondary">Frame Profiles</div><div className="fs-3 fw-semibold">{frameDataPlayers.length}</div><div className="small text-body-secondary">Full BLS detail</div></Card.Body></Card></Col>
                        <Col xs={6} md={3}><Card className="h-100"><Card.Body><div className="small text-body-secondary">Website Players</div><div className="fs-3 fw-semibold">{websitePlayers.length}</div><div className="small text-body-secondary">League-sheet stats</div></Card.Body></Card></Col>
                    </Row>

                    {divisions.length > 0 ? divisions.map((division) => (
                        <Card className="mb-4" key={division}>
                            <Card.Header className="fw-semibold">{division} Standings</Card.Header>
                            <Card.Body className="p-0">
                                <div className="table-responsive">
                                    <Table hover className="mb-0 align-middle">
                                        <thead><tr><th>Place</th><th>Team</th><th className="text-end">W</th><th className="text-end">L</th><th className="text-end">Avg</th><th className="text-end">HDCP</th><th className="text-end d-none d-lg-table-cell">Scratch Pins</th><th className="text-end d-none d-md-table-cell">High Game</th><th className="text-end d-none d-md-table-cell">High Series</th></tr></thead>
                                        <tbody>{data.standings.filter((team) => team.division === division).map((team) => (
                                            <tr key={team.number}><td>{team.place}</td><td><strong>#{team.number} {team.name}</strong></td><td className="text-end">{team.won}</td><td className="text-end">{team.lost}</td><td className="text-end">{team.average}</td><td className="text-end">{team.handicap}</td><td className="text-end d-none d-lg-table-cell">{team.scratchPins.toLocaleString()}</td><td className="text-end d-none d-md-table-cell">{team.highScratchGame}</td><td className="text-end d-none d-md-table-cell">{team.highScratchSeries}</td></tr>
                                        ))}</tbody>
                                    </Table>
                                </div>
                            </Card.Body>
                        </Card>
                    )) : null}
                </Tab>

                <Tab eventKey="teams" title="Teams">
                    <Accordion alwaysOpen>
                        {data.teams.map((team, index) => (
                            <Accordion.Item eventKey={String(index)} key={team.number}>
                                <Accordion.Header>
                                    <span className="fw-semibold me-2">#{team.number} {team.name}</span>
                                    {team.place != null && <span className="text-body-secondary small">· {team.division ? `${team.division} · ` : ""}#{team.place} · {team.won}-{team.lost}</span>}
                                </Accordion.Header>
                                <Accordion.Body className="p-0">
                                    <div className="table-responsive">
                                        <Table hover className="mb-0 align-middle">
                                            <thead><tr><th>Bowler</th><th>Data</th><th className="text-end">Avg</th><th className="text-end">HDCP</th><th className="text-end">Games</th><th className="text-end">Pins</th><th className="text-end">High</th><th className="text-end">Series</th><th className="text-end d-none d-md-table-cell">Latest</th></tr></thead>
                                            <tbody>{team.players.map((player) => {
                                                const row = allPlayers.find((candidate) => candidate.teamNumber === team.number && candidate.name === player.name);
                                                return <tr key={`${team.number}-${player.name}`}><td>{row ? renderPlayerName(row) : player.name}</td><td>{<PlayerSourceBadge hasFrames={Boolean(row?.framePlayer)}/>}</td><td className="text-end">{player.average || "—"}</td><td className="text-end">{player.handicap || "—"}</td><td className="text-end">{player.games}</td><td className="text-end">{player.pins.toLocaleString()}</td><td className="text-end">{player.highGame || "—"}</td><td className="text-end">{player.highSeries || "—"}</td><td className="text-end d-none d-md-table-cell">{player.weekScoresRaw.length ? player.weekScoresRaw.join(" / ") : "—"}</td></tr>;
                                            })}</tbody>
                                        </Table>
                                    </div>
                                </Accordion.Body>
                            </Accordion.Item>
                        ))}
                    </Accordion>
                </Tab>

                <Tab eventKey="players" title="Players">
                    <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
                        <ButtonGroup aria-label="Player data source">
                            <Button size="sm" variant={playerFilter === "all" ? "primary" : "outline-primary"} onClick={() => setPlayerFilter("all")}>All ({allPlayers.length})</Button>
                            <Button size="sm" variant={playerFilter === "frame" ? "primary" : "outline-primary"} onClick={() => setPlayerFilter("frame")}>Frame data ({frameDataPlayers.length})</Button>
                            <Button size="sm" variant={playerFilter === "website" ? "primary" : "outline-primary"} onClick={() => setPlayerFilter("website")}>Website stats ({websitePlayers.length})</Button>
                        </ButtonGroup>
                        <Form.Control size="sm" type="search" value={playerSearch} onChange={(event) => setPlayerSearch(event.target.value)} placeholder="Search bowler or team" style={{maxWidth: 280}} aria-label="Search bowlers"/>
                    </div>
                    <Card>
                        <Card.Body className="p-0">
                            <div className="table-responsive">
                                <Table hover className="mb-0 align-middle">
                                    <thead><tr><th>Bowler</th><th>Data</th><th>Team</th><th className="text-end">Avg</th><th className="text-end">HDCP</th><th className="text-end">Games</th><th className="text-end">Pins</th><th className="text-end">High</th><th className="text-end">Series</th></tr></thead>
                                    <tbody>{visiblePlayers.map((player) => (
                                        <tr key={`${player.isSub ? "sub" : player.teamNumber}-${player.name}`}>
                                            <td>{renderPlayerName(player)}</td><td><PlayerSourceBadge hasFrames={Boolean(player.framePlayer)}/></td><td>{player.teamName}</td><td className="text-end">{player.average || "—"}</td><td className="text-end">{player.handicap || "—"}</td><td className="text-end">{player.games}</td><td className="text-end">{player.pins.toLocaleString()}</td><td className="text-end">{player.highGame || "—"}</td><td className="text-end">{player.highSeries || "—"}</td>
                                        </tr>
                                    ))}</tbody>
                                </Table>
                            </div>
                        </Card.Body>
                    </Card>
                    <p className="small text-body-secondary mt-2 mb-0">Frame-data names link to the existing BLS player profile, where strike, spare, first-ball, frame and other detailed metrics remain available. Website-only bowlers intentionally show only statistics supported by the league sheet.</p>
                </Tab>

                <Tab eventKey="leaders" title="Leaders">
                    <Row className="g-4">
                        <Col xs={12} xl={6}><Card className="h-100"><Card.Header className="fw-semibold">Average Leaders</Card.Header><Card.Body className="p-0">{leaderTable(leaders.byAverage, (player) => player.average, "Avg")}</Card.Body></Card></Col>
                        <Col xs={12} xl={6}><Card className="h-100"><Card.Header className="fw-semibold">High Game</Card.Header><Card.Body className="p-0">{leaderTable(leaders.byHighGame, (player) => player.highGame, "Game")}</Card.Body></Card></Col>
                        <Col xs={12} xl={6}><Card className="h-100"><Card.Header className="fw-semibold">High Series</Card.Header><Card.Body className="p-0">{leaderTable(leaders.byHighSeries, (player) => player.highSeries, "Series")}</Card.Body></Card></Col>
                        <Col xs={12} xl={6}><Card className="h-100"><Card.Header className="fw-semibold">Total Pinfall</Card.Header><Card.Body className="p-0">{leaderTable(leaders.byPins, (player) => player.pins, "Pins")}</Card.Body></Card></Col>
                    </Row>
                </Tab>
            </Tabs>
        </div>
    );
};

export default BeerLeague;
