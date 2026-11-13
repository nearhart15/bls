import {FullStatsGrid} from "../player/player-detail-tables";
/*
 * Copyright (c) 2025. Bindul Bhowmik
 * Dark mode contrast fixes © 2026
 * Dashboard roster table © 2026
 */

import {type FC, useMemo, useState} from "react";

import {Card, CardBody, CardFooter, CardHeader, Col, Container, Row, Table} from "react-bootstrap";
import {XCircle} from "react-bootstrap-icons";

import Loader from "../loader";
import {type Breakpoint, BS_BP_SM, BS_BP_XS} from "../ui-utils";

import {
    LeaguePlayer,
    LeaguePlayerCarryOverStats,
    LeaguePlayerStats,
    TrackedLeagueTeam
} from "../../../data/league/league-team-details";
import TeamPlayerStatGraph from "./league-player-stat-graph";
import LeagueRosterPerformanceTable from "./league-roster-performance-table";
import {createGameTableData, type PlayerDayData} from "./league-team-roster-data";

interface PlayerStatsDisplayProps {
    playerStats: LeaguePlayerStats;
    carryOverStats?: LeaguePlayerCarryOverStats;
}
function PlayerStatsDisplay({playerStats, carryOverStats}: PlayerStatsDisplayProps) {
    return <FullStatsGrid stats={playerStats} leagueExtras={playerStats} carryOverStats={carryOverStats}/>;
}



interface PlayerGamesTableProps {
    playerGameData : PlayerDayData[];
    currentBreakPoint : Breakpoint;
}
const PlayerGamesTable :FC<PlayerGamesTableProps> = ({playerGameData, currentBreakPoint}: PlayerGamesTableProps) => {
    const hideBelowBreakpoint = playerGameData.length > 8 ? BS_BP_SM : playerGameData.length > 4 ? BS_BP_XS : null;
    const transpose = Boolean(hideBelowBreakpoint && currentBreakPoint.order <= hideBelowBreakpoint.order);
    const gameColumns = Array.from({length: Math.max(0, ...playerGameData.map(p => p.games.length))}, (_, i) => i);

    const numberFormat = Intl.NumberFormat("en-US", {style: "decimal", maximumFractionDigits: 2});
    return (<>
        <Container fluid="true">
            <Row>
                <Col className="align-content-center">
                    {transpose &&
                        <Table responsive={true} size="sm" bordered={true}>
                            <thead className="table-dark">
                                <tr>
                                    <th scope="col">Wk</th>
                                    <th scope="col">Avg In</th>
                                    {gameColumns.map(i => <th scope="col" key={i}>Gm {i + 1}</th>)}
                                    <th scope="col">Ser</th>
                                    <th scope="col">Avg</th>
                                </tr>
                            </thead>
                            <tbody>
                            {playerGameData.map(p =>
                                <tr key={"pgd-" + p.week.toString() + p.series.toString()}>
                                    <td>{p.week}</td>
                                    <td>{p.enteringAvg}</td>
                                    {gameColumns.map(i => <td key={i}>{p.games[i] ?? "—"}</td>)}
                                    <td>{p.series}</td>
                                    <td className={p.average < p.enteringAvg ? "text-danger" : ""}>
                                        {numberFormat.format(p.average)}
                                    </td>
                                </tr>)}
                            </tbody>
                        </Table>
                    }
                    {!transpose &&
                        <Table responsive={true} size="sm" bordered={true}>
                            <thead className="table-dark">
                                <tr>
                                    <th scope="col">Week</th>
                                    {playerGameData.map(p => <th scope="col" key={"gw-" + p.week.toString()}>{p.week}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <th scope="row">Entering Avg</th>
                                    {playerGameData.map(p => <td key={"gea-" + p.week.toString()}>{p.enteringAvg}</td>)}
                                </tr>
                                {gameColumns.map(i => <tr key={i}><th scope="row">Game {i + 1}</th>{playerGameData.map(p => <td key={p.week}>{p.games[i] ?? "—"}</td>)}</tr>)}
                                <tr>
                                    <th scope="row">Series</th>
                                    {playerGameData.map(p => <td key={"gs-" + p.week.toString()}>{p.series}</td>)}
                                </tr>
                                <tr>
                                    <th scope="row">Average</th>
                                    {playerGameData.map(p =>
                                        <td className={p.average < p.enteringAvg ? "text-danger" : ""} key={"gavg-" + p.week.toString()}>
                                            {numberFormat.format(p.average)}
                                        </td>
                                    )}
                                </tr>
                            </tbody>
                        </Table>
                    }
                </Col>
            </Row>
        </Container>
    </>);
}

interface PlayerDetailsProps {
    playerDetailsDisplay: string;
    teamDetails: TrackedLeagueTeam;
    closePlayerDetails: () => void;
    currentBreakpoint: Breakpoint;
}
const PlayerDetails :FC<PlayerDetailsProps> = ({playerDetailsDisplay, teamDetails, closePlayerDetails, currentBreakpoint} : PlayerDetailsProps) => {

    const playerGameData = useMemo(
        () => createGameTableData(teamDetails, playerDetailsDisplay),
        [teamDetails, playerDetailsDisplay]
    );

    const player: LeaguePlayer | undefined = teamDetails.roster.find(p => p.id == playerDetailsDisplay);
    const playerStats: LeaguePlayerStats | undefined = player?.playerStats;

    return (
        <Card border="dark" className="mt-1 mb-1 p-0 mx-2">
            <CardHeader className="py-1 px-2 text-white bg-dark">
                <span className="fs-6">{player?.name}</span>
                <span className="float-end"><a onClick={closePlayerDetails}><XCircle/></a></span>
            </CardHeader>
            {playerStats && (<>
                <CardBody className="px-2 py-2">
                    <PlayerStatsDisplay playerStats={playerStats} carryOverStats={player?.carryOverStats}/>
                </CardBody>
                <CardBody className={"px-2 py-2"}>
                    <PlayerGamesTable playerGameData={playerGameData} currentBreakPoint={currentBreakpoint}/>
                </CardBody>
                <CardBody className={"px-2 py-2"}>
                    <TeamPlayerStatGraph playerData={playerGameData}/>
                </CardBody>
            </>)}
        </Card>
    );
}

interface LeagueTeamRosterProps {
    teamDetails: TrackedLeagueTeam;
    currentBreakpoint: Breakpoint;
    leagueDetailsLoading: boolean;
}
const TeamRoster: FC<LeagueTeamRosterProps> = ({teamDetails, currentBreakpoint, leagueDetailsLoading}: LeagueTeamRosterProps) => {
    const [playerDetailsDisplay, setPlayerDetailsDisplay] = useState<string | undefined>(undefined);

    const closePlayerDetails = () => {
        setPlayerDetailsDisplay(undefined);
    }

    return (<>
        {leagueDetailsLoading && <div className="card-body"><Loader/></div>}
        <div className="bls-team-roster">
            <Card className="bls-perf-card bls-team-panel">
                <CardHeader className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                    <h2 className="bls-team-panel-title">Bowler Performance</h2>
                    <span className="fs-xs text-body-secondary">Tap a row for full stats</span>
                </CardHeader>
                <LeagueRosterPerformanceTable
                    teamDetails={teamDetails}
                    selectedPlayerId={playerDetailsDisplay}
                    onSelectPlayer={setPlayerDetailsDisplay}
                />
                <CardFooter className="text-center">Tap a bowler for game-by-game detail</CardFooter>
            </Card>
            {playerDetailsDisplay &&
                <PlayerDetails playerDetailsDisplay={playerDetailsDisplay} teamDetails={teamDetails}
                                   closePlayerDetails={closePlayerDetails} currentBreakpoint={currentBreakpoint}/>
            }
        </div>
    </>);
}

const LeagueTeamRoster: FC<LeagueTeamRosterProps> = props => (
    <TeamRoster key={props.teamDetails.id} {...props}/>
);

export default LeagueTeamRoster;
