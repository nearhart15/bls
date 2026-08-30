/*
 * Modern player detail © 2026
 */

import type {FC} from "react";
import {Link} from "react-router";
import {
    Badge,
    Card,
    CardBody,
    CardHeader,
    Col,
    Container,
    Row,
    Table,
} from "react-bootstrap";

import type {
    AggregatedPlayerData,
    PlayerLeagueAppearance,
    PlayerSeasonStats,
} from "../../../data/player/player-aggregate";
import type {PlayerStats, RatioGroup} from "../../../data/player/player-stats";

const numberFormat = Intl.NumberFormat("en-US", {style: "decimal", maximumFractionDigits: 2});
const percentFormat = Intl.NumberFormat("en-US", {style: "percent", maximumFractionDigits: 1});

function formatRatio(rg: RatioGroup): string {
    if (rg.denominator <= 0) {
        return "—";
    }
    return `${percentFormat.format(rg.pct)} (${rg.numerator}/${rg.denominator})`;
}

interface StatTileProps {
    label: string;
    value: string | number;
}
const StatTile: FC<StatTileProps> = ({label, value}) => (
    <Col xs={6} sm={4} md={3} className="mb-2">
        <div className="bls-stat-tile">
            <div className="bls-stat-label">{label}</div>
            <div className="bls-stat-value">{value}</div>
        </div>
    </Col>
);

interface CareerStatsProps {
    stats: PlayerStats;
}
const CareerStatsPanel: FC<CareerStatsProps> = ({stats}) => {
    if (stats.gameStats.count === 0) {
        return (
            <Card className="mb-3">
                <CardBody className="text-body-secondary">No scored games found for this player yet.</CardBody>
            </Card>
        );
    }

    return (
        <Card className="mb-3">
            <CardHeader className="bg-primary text-white">Career Stats</CardHeader>
            <CardBody>
                <Row className="g-2">
                    <StatTile label="Games" value={stats.gameStats.count}/>
                    <StatTile label="Average" value={numberFormat.format(stats.gameStats.average)}/>
                    <StatTile label="Pinfall" value={stats.pinfall}/>
                    <StatTile label="High Game" value={stats.gameStats.max}/>
                    <StatTile label="Low Game" value={stats.gameStats.min}/>
                    <StatTile label="Series" value={stats.seriesStats.count}/>
                    <StatTile label="Series Avg" value={numberFormat.format(stats.seriesStats.average)}/>
                    <StatTile label="High Series" value={stats.seriesStats.max}/>
                    <StatTile label="200 Games" value={stats.games200}/>
                    <StatTile label="300 Games" value={stats.games300}/>
                    <StatTile label="600 Series" value={stats.series600}/>
                    <StatTile label="Clean Games" value={stats.cleanGames}/>
                    <StatTile label="First Ball Avg" value={numberFormat.format(stats.firstBallAverage)}/>
                    <StatTile label="Strikes" value={formatRatio(stats.strikes)}/>
                    <StatTile label="Spares" value={formatRatio(stats.spares)}/>
                    <StatTile label="Single Pin Spares" value={formatRatio(stats.singlePinSpares)}/>
                    <StatTile label="Splits Picked Up" value={formatRatio(stats.splits)}/>
                    <StatTile label="Open Frames" value={formatRatio(stats.opens)}/>
                </Row>
                {stats.incompleteFrameData && (
                    <p className="fs-xs text-body-secondary mt-2 mb-0">
                        Some frame-level stats may be incomplete where frame data was missing.
                    </p>
                )}
            </CardBody>
        </Card>
    );
};

interface SeasonStatsProps {
    seasons: PlayerSeasonStats[];
}
const SeasonStatsPanel: FC<SeasonStatsProps> = ({seasons}) => {
    if (seasons.length === 0) {
        return null;
    }

    return (
        <Card className="mb-3">
            <CardHeader>By Season</CardHeader>
            <CardBody className="p-0">
                <Table responsive hover size="sm" className="mb-0 bls-score-table">
                    <thead>
                        <tr>
                            <th>Season</th>
                            <th className="text-end">Leagues</th>
                            <th className="text-end">Games</th>
                            <th className="text-end">Average</th>
                            <th className="text-end">Pinfall</th>
                            <th className="text-end">High Gm</th>
                            <th className="text-end">High Ser</th>
                            <th className="text-end">200s</th>
                        </tr>
                    </thead>
                    <tbody>
                        {seasons.map((s) => (
                            <tr key={s.season}>
                                <td className="text-nowrap fw-semibold">{s.season}</td>
                                <td className="text-end">{s.leagues || "—"}</td>
                                <td className="text-end">{s.games || "—"}</td>
                                <td className="text-end">
                                    {s.games > 0 ? numberFormat.format(s.average) : "—"}
                                </td>
                                <td className="text-end">{s.games > 0 ? s.pinfall : "—"}</td>
                                <td className="text-end">{s.games > 0 ? s.highGame : "—"}</td>
                                <td className="text-end">{s.highSeries > 0 ? s.highSeries : "—"}</td>
                                <td className="text-end">{s.games200 || "—"}</td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </CardBody>
        </Card>
    );
};

interface AppearancesProps {
    appearances: PlayerLeagueAppearance[];
}
const AppearancesPanel: FC<AppearancesProps> = ({appearances}) => {
    if (appearances.length === 0) {
        return (
            <Card className="mb-3">
                <CardBody className="text-body-secondary">
                    This player was not found on any tracked team roster.
                </CardBody>
            </Card>
        );
    }

    return (
        <Card className="mb-3">
            <CardHeader>League Appearances</CardHeader>
            <CardBody className="p-0">
                <Table responsive hover size="sm" className="mb-0 bls-score-table">
                    <thead>
                        <tr>
                            <th>Season</th>
                            <th>League</th>
                            <th>Team</th>
                            <th>Status</th>
                            <th className="text-end">Games</th>
                            <th className="text-end">Avg</th>
                            <th className="text-end">Hdcp</th>
                            <th className="text-end">High Gm</th>
                        </tr>
                    </thead>
                    <tbody>
                        {appearances.map((a) => (
                            <tr key={`${a.leagueId}-${a.teamId}`}>
                                <td className="text-nowrap">{a.season}</td>
                                <td>
                                    <Link className="bls-link" to={`/league/${a.leagueId}`}>{a.leagueName}</Link>
                                </td>
                                <td>
                                    <Link className="bls-link" to={`/league/${a.leagueId}/${a.teamId}`}>
                                        #{a.teamNumber} {a.teamName}
                                    </Link>
                                </td>
                                <td>
                                    <Badge bg={a.status === "REGULAR" ? "primary" : "secondary"}>
                                        {a.status === "REGULAR" ? "Regular" : "Sub"}
                                    </Badge>
                                </td>
                                <td className="text-end">{a.stats?.gameStats.count ?? "—"}</td>
                                <td className="text-end">
                                    {a.stats ? numberFormat.format(a.stats.gameStats.average) : "—"}
                                </td>
                                <td className="text-end">
                                    {a.stats ? numberFormat.format(a.stats.leagueHandicap) : "—"}
                                </td>
                                <td className="text-end">{a.stats?.gameStats.max ?? "—"}</td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </CardBody>
        </Card>
    );
};

interface PlayerDetailProps {
    data: AggregatedPlayerData;
}
const PlayerDetail: FC<PlayerDetailProps> = ({data}) => {
    const {player, appearances, careerStats, seasonStats} = data;

    return (
        <Container fluid="true" className="px-0">
            <div className="bls-hero mb-3">
                <h1 className="mb-1">{player.name}</h1>
                <p>
                    {appearances.length} league appearance{appearances.length === 1 ? "" : "s"}
                    {careerStats.gameStats.count > 0 && (
                        <> · Career avg {numberFormat.format(careerStats.gameStats.average)}</>
                    )}
                </p>
            </div>

            <CareerStatsPanel stats={careerStats}/>
            <SeasonStatsPanel seasons={seasonStats}/>
            <AppearancesPanel appearances={appearances}/>

            <div className="mb-3">
                <Link to="/player" className="btn btn-outline-primary btn-sm">← All players</Link>
            </div>
        </Container>
    );
};

export default PlayerDetail;
