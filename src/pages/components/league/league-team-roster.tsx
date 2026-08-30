/*
 * Copyright (c) 2025. Bindul Bhowmik
 * Dark mode contrast fixes © 2026
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import {type FC, type ReactNode, useEffect, useState} from "react";
import {Link} from "react-router";

import {Card, CardBody, CardFooter, CardHeader, Col, Container, OverlayTrigger, Row, Table, Tooltip} from "react-bootstrap";
import {DashSquare, Icon9Square, PersonAdd, PersonFillLock, XCircle} from "react-bootstrap-icons";

import Loader from "../loader";
import {type Breakpoint, BS_BP_SM, BS_BP_XS} from "../ui-utils";

import type {LeagueAccolade} from "../../../data/league/league-details";
import {
    LeaguePlayer,
    LeaguePlayerCarryOverStats,
    LeaguePlayerStats,
    TrackedLeagueTeam
} from "../../../data/league/league-team-details";
import {RatioGroup} from "../../../data/player/player-stats";
import {type LeagueMatchup, LeagueTeamPlayerScore} from "../../../data/league/league-matchup";
import TeamPlayerStatGraph from "./league-player-stat-graph";

// TODO Change 3 game assumption later
export interface PlayerDayData {
    week: number;
    bowlDate: Date;
    enteringAvg: number;
    game1: number;
    game2: number;
    game3: number;
    series: number;
    average: number;
    runningAverageAfter: number;
}
function createGameTableData(teamDetails: TrackedLeagueTeam, playerId: string) {

    interface MatchupPlayerScore {
        matchup: LeagueMatchup;
        playerScore: LeagueTeamPlayerScore;
    }

    const currentPlayerAvg = teamDetails.roster.find(player => player.id === playerId)?.playerStats?.gameStats.average ?? 0;
    // We do this in 2 steps since we are grabbing average from the next matchup
    // TODO This is an ugly temporary solution until we move calculations to the backend and its hopefully calculated there
    const matchupPlayerScores : MatchupPlayerScore[] = [];
    teamDetails.matchups.forEach(matchup => {
        const playerScore = matchup.scores?.playerScores.find(ps => ps.player === playerId);
        if (playerScore && !playerScore.games[0].blind) { // Assuming one game blind is all games blind
            matchupPlayerScores.push({
                matchup: matchup,
                playerScore: playerScore
            });
        }
    });

    const data : PlayerDayData[] = matchupPlayerScores.map((mps, idx) => {
        let runningAvgAfter = currentPlayerAvg;
        if (matchupPlayerScores.length > (idx + 1)) {
            const nextMatchupPlayerScore = matchupPlayerScores[idx + 1].playerScore;
            if (nextMatchupPlayerScore.enteringAverage) {
                runningAvgAfter = nextMatchupPlayerScore.enteringAverage;
            }
        }
        return {
            week: mps.matchup.week,
            bowlDate: mps.matchup.scheduledDate?.toDate() ?? new Date(), // Using scheduled date here or the graph gets wonky with pre-bowls and post-bowls
            enteringAvg: mps.playerScore.hdcpSettingDay ? 0 : mps.playerScore.enteringAverage,
            game1: mps.playerScore.games[0].scratchScore,
            game2: mps.playerScore.games[1].scratchScore,
            game3: mps.playerScore.games[2].scratchScore,
            series: mps.playerScore.series.scratchScore,
            average: mps.playerScore.series.average,
            runningAverageAfter: runningAvgAfter
        };
    });
    return data;
}

interface PlayerStatsDisplayProps {
    playerStats: LeaguePlayerStats;
    carryOverStats?: LeaguePlayerCarryOverStats;
}
function PlayerStatsDisplay ({playerStats, carryOverStats}: PlayerStatsDisplayProps) {
    const writeAccolade = (accolade?: LeagueAccolade)=> {
        let retStr = "";
        if (accolade) {
            retStr = (accolade.description && accolade.description.length > 0) ? accolade.description : String(accolade.howMuch);
            retStr += " on ";
            retStr += accolade.when?.format("DD MMM") ?? "";
        }
        return retStr;
    }

    const numberFormat = Intl.NumberFormat("en-US", {style: "decimal", maximumFractionDigits: 2});
    const percentFormat = Intl.NumberFormat("en-US", {style: "percent", maximumFractionDigits: 2});
    const writeRatioGroup = (rg : RatioGroup) => {
        let val = "";
        if (rg.denominator > 0) {
            val = percentFormat.format(rg.pct) + " (" + String(rg.numerator) + "/" + String(rg.denominator) + ")";
        }
        return val;
    }
    const displayColLg = 3;
    const displayColMd = 6;

    return (<>
        <Container fluid="true">
            <Row className="gx-2">
                <Col md={displayColMd} lg={displayColLg}>
                    <Card className="text-start mx-0 mb-0 h-100" border="secondary">
                        <CardBody className="py-1 py-sm-2">
                            <StatRow defn="Games" value={playerStats.gameStats.count}/>
                            <StatRow defn="Pinfall" value={playerStats.pinfall}/>
                            <StatRow defn="Games - Avg" value={numberFormat.format(playerStats.gameStats.average)}/>
                            <StatRow defn="Games - Min" value={playerStats.gameStats.min}/>
                            <StatRow defn="Games - Max" value={playerStats.gameStats.max}/>
                            <StatRow defn="Games - SD" value={numberFormat.format(playerStats.gameStats.sd)}/>
                            <StatRow defn="200 Games" value={playerStats.games200}/>
                            <StatRow defn="300 Games" value={playerStats.games300}/>
                            {playerStats.gameAverages.map((ga, idx) =>
                                <StatRow defn={`Games ${String(idx + 1)} Avg`} value={numberFormat.format(ga)} key={"game-avg-" + idx.toString() + "-" + ga.toString()}/>
                            )}
                        </CardBody>
                    </Card>
                </Col>
                <Col md={displayColMd} lg={displayColLg}>
                    <Card className="text-start mx-0 mb-0 h-100" border="secondary">
                        <CardBody className="py-1 py-sm-2">
                            <StatRow defn="Series" value={playerStats.seriesStats.count}/>
                            <StatRow defn="Series - Avg" value={numberFormat.format(playerStats.seriesStats.average)}/>
                            <StatRow defn="Series - Min" value={playerStats.seriesStats.min}/>
                            <StatRow defn="Series - Max" value={playerStats.seriesStats.max}/>
                            <StatRow defn="Series - SD" value={numberFormat.format(playerStats.seriesStats.sd)}/>
                            <StatRow defn="600 Series" value={playerStats.series600}/>
                            <StatRow defn="800 Series" value={playerStats.series800}/>
                        </CardBody>
                    </Card>
                </Col>
                <Col md={displayColMd} lg={displayColLg}>
                    <Card className="text-start mx-0 mb-0 h-100" border="secondary">
                        <CardBody className="py-1 py-sm-2">
                            {carryOverStats && <>
                                <StatRow defn="Carry-Over Pinfall" value={carryOverStats.pins}/>
                                <StatRow defn="Carry-Over Games" value={carryOverStats.games}/>
                                <StatRow defn="Entering Handicap" value={carryOverStats.enteringHdcp}/>
                            </>}
                            <StatRow defn="League Games" value={playerStats.leagueGames} toolTipText={`Includes carry-over games`}/>
                            <StatRow defn="League Pinfall" value={playerStats.leaguePinfall} toolTipText={`Includes carry-over games`}/>
                            <StatRow defn="League Average" value={numberFormat.format(playerStats.leagueAverage)} toolTipText={`Includes carry-over games`}/>
                            <StatRow defn="League Handicap" value={numberFormat.format(playerStats.leagueHandicap)} toolTipText={`Includes carry-over games`}/>
                            <StatRow defn="Average Booster" value={playerStats.averageBoosterSeries}
                                     toolTipText={`Bowl a series of at least this number to increase average by 1 pin.`}/>
                            <StatRow defn="Best Game over Avg" value={writeAccolade(playerStats.bestGameOverAverage)}/>
                            <StatRow defn="Best Series over Avg" value={writeAccolade(playerStats.bestSeriesOverAverage)}/>
                        </CardBody>
                    </Card>
                </Col>
                <Col md={displayColMd} lg={displayColLg}>
                    <Card className="text-start mx-0 mb-0 h-100" border="secondary">
                        <CardBody className="py-1 py-sm-2">
                            <StatRow defn="First Ball Average" value={numberFormat.format(playerStats.firstBallAverage)}/>
                            <StatRow defn="Clean Games" value={playerStats.cleanGames}/>
                            <StatRow defn="Strikes" value={writeRatioGroup(playerStats.strikes)}/>
                            <StatRow defn="Spares" value={writeRatioGroup(playerStats.spares)}/>
                            <StatRow defn="Single Pin Spares" value={writeRatioGroup(playerStats.singlePinSpares)}/>
                            <StatRow defn="Picked up Splits" value={writeRatioGroup(playerStats.splits)}/>
                            <StatRow defn="Opens" value={writeRatioGroup(playerStats.opens)}/>
                            <StatRow defn="Consecutive Strikes" value={<>
                                {playerStats.strikesInARow.map(s => <StatRow defn={s[0]} value={s[1]} key={"strikes-row-" + s[0].toString() + "-" + s[1].toString()}/>)}
                            </>}/>
                            <StatRow defn="Strike Spare Ratio" value={writeRatioGroup(playerStats.strikesToSpares)}/>
                            <StatRow defn={<><Icon9Square/><DashSquare/> Picked Up Avg</>}
                                          value={numberFormat.format(playerStats.allSinglePinsPickedUpAverage)}
                                          toolTipText="Potential Average if all single pin spares were picked up."/>
                        </CardBody>
                        {playerStats.incompleteFrameData &&
                            <CardFooter><small>Some stats may be missing or incomplete as frame data is missing for some games.</small></CardFooter>
                        }
                    </Card>
                </Col>
            </Row>
        </Container>
    </>);
}

interface StatRowProps {
    defn: ReactNode;
    value: ReactNode;
    toolTipText?: string;
}
const StatRow :FC<StatRowProps> = ({defn, value, toolTipText} : StatRowProps)=> {
    return (
        <Row className="border rounded-1 border-secondary-subtle overflow-hidden">
            <Col className="bg-body-secondary text-body-emphasis px-1">
                {toolTipText && <OverlayTrigger overlay={
                    <Tooltip id={Math.random().toString()}>{toolTipText}</Tooltip>}>
                    <a href="#" onClick={(e) => { e.preventDefault(); }}>{defn}</a>
                </OverlayTrigger>}
                {!toolTipText && defn}
                <span className="float-end">:</span>
            </Col>
            <Col className="px-1 text-body">{value}</Col>
        </Row>
    );
}

interface PlayerGamesTableProps {
    playerGameData : PlayerDayData[];
    currentBreakPoint : Breakpoint;
}
const PlayerGamesTable :FC<PlayerGamesTableProps> = ({playerGameData, currentBreakPoint}: PlayerGamesTableProps) => {
    const [transpose, setTranspose] = useState(false);

    useEffect(() => {
        let hideBelowBreakpoint: Breakpoint | null = null;
        if (playerGameData.length > 4) {
            hideBelowBreakpoint = BS_BP_XS;
        } else if (playerGameData.length > 8) {
            hideBelowBreakpoint = BS_BP_SM;
        }
        if (hideBelowBreakpoint && currentBreakPoint.order <= hideBelowBreakpoint.order) {
            setTranspose(true);
        }
    }, [currentBreakPoint, playerGameData]);

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
                                    <th scope="col">Gm 1</th>
                                    <th scope="col">Gm 2</th>
                                    <th scope="col">Gm 3</th>
                                    <th scope="col">Ser</th>
                                    <th scope="col">Avg</th>
                                </tr>
                            </thead>
                            <tbody>
                            {playerGameData.map(p =>
                                <tr key={"pgd-" + p.week.toString() + p.series.toString()}>
                                    <td>{p.week}</td>
                                    <td>{p.enteringAvg}</td>
                                    <td>{p.game1}</td>
                                    <td>{p.game2}</td>
                                    <td>{p.game3}</td>
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
                                    {playerGameData.map(p => <th scope="col" key={"gw-" + p.week.toString() + "-" + Math.random().toString()}>{p.week}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <th scope="row">Entering Avg</th>
                                    {playerGameData.map(p => <td key={"gea-" + p.week.toString() + "-" + Math.random().toString()}>{p.enteringAvg}</td>)}
                                </tr>
                                <tr>
                                    <th scope="row">Game 1</th>
                                    {playerGameData.map(p => <td key={"g1-" + p.week.toString() + "-" + Math.random().toString()}>{p.game1}</td>)}
                                </tr>
                                <tr>
                                    <th scope="row">Game 2</th>
                                    {playerGameData.map(p => <td key={"g2-" + p.week.toString() + "-" + Math.random().toString()}>{p.game2}</td>)}
                                </tr>
                                <tr>
                                    <th scope="row">Game 3</th>
                                    {playerGameData.map(p => <td key={"g3-" + p.week.toString() + "-" + Math.random().toString()}>{p.game3}</td>)}
                                </tr>
                                <tr>
                                    <th scope="row">Series</th>
                                    {playerGameData.map(p => <td  key={"gs-" + p.week.toString() + "-" + Math.random().toString()}>{p.series}</td>)}
                                </tr>
                                <tr>
                                    <th scope="row">Average</th>
                                    {playerGameData.map(p =>
                                        <td className={p.average < p.enteringAvg ? "text-danger" : ""} key={"gavg-" + p.week.toString() + "-" + Math.random().toString()}>
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

    const [playerGameData, setPlayerGameData] = useState<PlayerDayData[]>([]);

    useEffect(() => {
        setPlayerGameData(createGameTableData(teamDetails, playerDetailsDisplay));
    }, [teamDetails, playerDetailsDisplay]);

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
const LeagueTeamRoster: FC<LeagueTeamRosterProps> = ({teamDetails, currentBreakpoint, leagueDetailsLoading}: LeagueTeamRosterProps) => {
    const [playerDetailsDisplay, setPlayerDetailsDisplay] = useState<string | undefined>(undefined);

    useEffect(() => {
        // Team details changed, switch out displayed player
        setPlayerDetailsDisplay(undefined);
    }, [teamDetails]);

    const closePlayerDetails = () => {
        setPlayerDetailsDisplay(undefined);
    }

    return (<>
        {leagueDetailsLoading && <div className="card-body"><Loader/></div>}
        <CardBody className="px-0 py-1 border border-secondary-subtle">
            <Card className="mx-2">
                <CardHeader className="text-white bg-dark text-center fw-bolder py-1">Roster</CardHeader>
                <CardBody className="mx-0 px-0 py-2">
                        <Table responsive={true} size="sm" >
                            <thead>
                            <tr>
                                {/*Some columns are hidden on smaller screens*/}
                                <th>Player</th>
                                <th>Games</th>
                                <th className="d-none d-md-block">Scratch Pins</th>
                                <th>Average</th>
                                <th className="d-none d-md-block">
                                    <OverlayTrigger overlay={<Tooltip id={Math.random().toString()}>League Average includes games from first half of split season leagues</Tooltip>}>
                                        <a href="#" onClick={(e) => { e.preventDefault(); }}>League Average</a>
                                    </OverlayTrigger>
                                </th>
                                <th>
                                    <OverlayTrigger overlay={<Tooltip id={Math.random().toString()}>Handicap includes games from first half of split season leagues</Tooltip>}>
                                        <a href="#" onClick={(e) => { e.preventDefault(); }}>Handicap</a>
                                    </OverlayTrigger>
                                </th>
                                <th className="d-none d-md-block">Series Avg</th>
                            </tr>
                            </thead>
                            <tbody>
                            {teamDetails.roster.map(p => (
                                <tr key={p.id}>
                                    <td>
                                        {p.status === "REGULAR" ? <PersonFillLock/> : <PersonAdd/>}
                                        <Link to="#" onClick={() => { setPlayerDetailsDisplay(p.id); }}>{p.name}</Link>
                                    </td>
                                    <td>{p.playerStats?.gameStats.count}</td>
                                    <td className="d-none d-md-block">{p.playerStats?.pinfall}</td>
                                    <td>{p.playerStats?.gameStats.average.toFixed(2)}</td>
                                    <td className="d-none d-md-block">
                                        {p.playerStats?.leagueAverage.toFixed(2)}
                                    </td>
                                    <td>{p.playerStats?.leagueHandicap}</td>
                                    <td className="d-none d-md-block">
                                        {p.playerStats?.seriesStats.average.toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </Table>
                </CardBody>
                <CardFooter><small>Click on player names to see more stats</small></CardFooter>
            </Card>
            {playerDetailsDisplay &&
                <PlayerDetails playerDetailsDisplay={playerDetailsDisplay} teamDetails={teamDetails}
                                   closePlayerDetails={closePlayerDetails} currentBreakpoint={currentBreakpoint}/>
            }
        </CardBody>
    </>);
}

export default LeagueTeamRoster;
