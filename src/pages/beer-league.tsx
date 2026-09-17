import {type FC, useEffect, useMemo, useState} from "react";
import {Accordion, Alert, Badge, Card, Col, Row, Spinner, Table} from "react-bootstrap";

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

const BeerLeague: FC = () => {
    const [data, setData] = useState<BeerLeagueData | null>(null);
    const [error, setError] = useState<string | null>(null);

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

    if (error) return <Alert variant="danger">Could not load the imported Beer League data: {error}</Alert>;
    if (!data) return <div className="d-flex align-items-center gap-2"><Spinner size="sm"/><span>Loading Beer League data…</span></div>;
    if (data.status !== "ready") return <Alert variant="info">{data.message ?? "Beer League import has not run yet."}</Alert>;

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

            <Row className="g-3 mb-4">
                <Col xs={6} md={3}><Card><Card.Body><div className="small text-body-secondary">Teams</div><div className="fs-3 fw-semibold">{data.standings.length}</div></Card.Body></Card></Col>
                <Col xs={6} md={3}><Card><Card.Body><div className="small text-body-secondary">Bowlers</div><div className="fs-3 fw-semibold">{data.teams.reduce((sum, team) => sum + team.players.length, 0)}</div></Card.Body></Card></Col>
                <Col xs={6} md={3}><Card><Card.Body><div className="small text-body-secondary">Divisions</div><div className="fs-3 fw-semibold">{Math.max(divisions.length, 1)}</div></Card.Body></Card></Col>
                <Col xs={6} md={3}><Card><Card.Body><div className="small text-body-secondary">Subs</div><div className="fs-3 fw-semibold">{data.substitutes?.length ?? 0}</div></Card.Body></Card></Col>
            </Row>

            <Card className="mb-4">
                <Card.Header className="fw-semibold">League Standings</Card.Header>
                <Card.Body className="p-0">
                    <div className="table-responsive">
                        <Table hover className="mb-0 align-middle">
                            <thead><tr>{divisions.length > 0 && <th>Division</th>}<th>Place</th><th>Team</th><th className="text-end">W</th><th className="text-end">L</th><th className="text-end">Avg</th><th className="text-end">HDCP</th><th className="text-end d-none d-lg-table-cell">Scratch Pins</th><th className="text-end d-none d-md-table-cell">High Game</th><th className="text-end d-none d-md-table-cell">High Series</th></tr></thead>
                            <tbody>
                                {data.standings.map((team) => (
                                    <tr key={team.number}>
                                        {divisions.length > 0 && <td><Badge bg="secondary">{team.division}</Badge></td>}
                                        <td>{team.place}</td><td><strong>#{team.number} {team.name}</strong></td><td className="text-end">{team.won}</td><td className="text-end">{team.lost}</td><td className="text-end">{team.average}</td><td className="text-end">{team.handicap}</td><td className="text-end d-none d-lg-table-cell">{team.scratchPins.toLocaleString()}</td><td className="text-end d-none d-md-table-cell">{team.highScratchGame}</td><td className="text-end d-none d-md-table-cell">{team.highScratchSeries}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                </Card.Body>
            </Card>

            <h2 className="h4 mb-3">Team Rosters</h2>
            <Accordion alwaysOpen>
                {data.teams.map((team, index) => (
                    <Accordion.Item eventKey={String(index)} key={team.number}>
                        <Accordion.Header><span className="fw-semibold me-2">#{team.number} {team.name}</span>{team.place != null && <span className="text-body-secondary small">· {team.division ? `${team.division} · ` : ""}#{team.place}</span>}</Accordion.Header>
                        <Accordion.Body className="p-0">
                            <div className="table-responsive">
                                <Table hover className="mb-0 align-middle">
                                    <thead><tr><th>Bowler</th><th className="text-end">Avg</th><th className="text-end">HDCP</th><th className="text-end">Games</th><th className="text-end">Pins</th><th className="text-end">High</th><th className="text-end">Series</th><th className="text-end d-none d-md-table-cell">Latest</th></tr></thead>
                                    <tbody>{team.players.map((player) => (<tr key={`${team.number}-${player.name}`}><td>{player.name}</td><td className="text-end">{player.average}</td><td className="text-end">{player.handicap}</td><td className="text-end">{player.games}</td><td className="text-end">{player.pins.toLocaleString()}</td><td className="text-end">{player.highGame}</td><td className="text-end">{player.highSeries}</td><td className="text-end d-none d-md-table-cell">{player.weekScoresRaw.length ? player.weekScoresRaw.join(" / ") : "—"}</td></tr>))}</tbody>
                                </Table>
                            </div>
                        </Accordion.Body>
                    </Accordion.Item>
                ))}
            </Accordion>
        </div>
    );
};

export default BeerLeague;
