/*
 * Copyright (c) 2025. Bindul Bhowmik
 * Dark mode contrast fixes © 2026
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type {FC, ReactNode} from "react";
import {useEffect, useState} from "react";
import moment from "moment";

import {Card, CardBody, CardHeader, Col, Container, Row} from "react-bootstrap";
import {
    CaretDownFill, CaretLeft, CaretRight, CaretUpFill
} from "react-bootstrap-icons";

import {TrackedLeagueTeam} from "../../../data/league/league-team-details";
import type {LeagueMatchup} from "../../../data/league/league-matchup";
import type {LeagueDetails} from "../../../data/league/league-details";
import {isNumeric} from "../../../data/utils/utils";

import Loader from "../loader";
import {type Breakpoint} from "../ui-utils";
import LeagueTeamRoster from "./league-team-roster";
import LeagueTeamMatchup from "./league-team-matchup";
import TeamStatGraph from "./league-team-details-graph";

export interface TeamPositionScoreData {
    bowlDate: Date;
    position: number;
    scratchSeries: number;
}
function buildTeamPositionScoreData (teamDetails: TrackedLeagueTeam): TeamPositionScoreData[] {
    const today = moment();
    const currentRank = isNumeric(teamDetails.currentRank) ? Number.parseInt(teamDetails.currentRank) : 0;
    const filteredMatchups = teamDetails.matchups.filter(matchup =>
        matchup.bowlDate && matchup.bowlDate.isBefore(today) && matchup.scores?.series);

    return filteredMatchups.map((matchup, idx) => {
            let nextRank = currentRank;
            if (filteredMatchups.length > (idx + 1)) {
                const nextRankCandidate = filteredMatchups[idx + 1].enteringRank;
                if (isNumeric(nextRankCandidate)) {
                    nextRank = Number.parseInt(nextRankCandidate);
                }
            }
            return {
                bowlDate: matchup.scheduledDate?.toDate() ?? new Date(), // Using scheduled date here or the graph gets wonky with pre-bowls and post-bowls
                position: nextRank,
                scratchSeries: matchup.scores?.series.effectiveScratchScore ?? 0
            };
        });
}

type DataColRowStyle = "Default" | "Success";
interface DataColRowProps {
    defn: ReactNode;
    value: ReactNode;
    doubleWidth?: boolean;
    style?: DataColRowStyle;
}
const DataColRow :FC<DataColRowProps> = ({defn, value, doubleWidth = false, style = "Default"} : DataColRowProps)=> {
    // Theme-aware backgrounds so labels stay readable in both light and dark mode
    const rowBorder = style === "Success" ? "border-success-subtle" : "border-secondary-subtle";
    const colDefnClass = style === "Success"
        ? "bg-success-subtle text-success-emphasis"
        : "bg-body-secondary text-body-emphasis";
    const mdColCount = doubleWidth ? 6 : 3;
    return (
        <Col xs={12} md={mdColCount}>
            <Row className={`border rounded-1 ${rowBorder} overflow-hidden`}>
                <Col className={`${colDefnClass} px-1 ${doubleWidth ? 'col-auto' : ''}`}>{defn}<span className="float-end">:</span></Col>
                <Col className={`px-1 text-body ${doubleWidth ? 'col-auto' : ''}`}>{value}</Col>
            </Row>
        </Col>
    );
}

interface LeagueTeamProps {
    teamDetails: TrackedLeagueTeam;
    leagueDetails: LeagueDetails | null;
}
const LeagueTeamDetailsSummary :FC<LeagueTeamProps> = ({teamDetails, leagueDetails} : LeagueTeamProps)=> {
    const [teamPositionScoreData, setTeamPositionScoreData] = useState<TeamPositionScoreData[]>([]);
    const [lastMatchup, setLastMatchup] = useState<LeagueMatchup | null>(null);
    const [nextMatchup, setNextMatchup] = useState<LeagueMatchup | null>(null);

    useEffect(() => {

        if (teamDetails != null) {
            setTeamPositionScoreData(buildTeamPositionScoreData(teamDetails));

            for (let i = 0; i < teamDetails.matchups.length; i++) {
                const matchup = teamDetails.matchups[i];
                if (!matchup.scores?.playerScores || matchup.scores.playerScores.length === 0) {
                    // We have hit the first matchup without scores
                    setNextMatchup(matchup);
                    if (i > 0) {
                        setLastMatchup(teamDetails.matchups[i - 1]);
                    }
                    break;
                }
            }
        }

    }, [teamDetails]);

    const rankComparison = () => {
        let retVal = <></>
        if (teamDetails && isNumeric(teamDetails.currentRank) && isNumeric(lastMatchup?.enteringRank)) {
            const lastMatchupRank = parseInt(lastMatchup?.enteringRank ?? "");
            const currentRank = parseInt(teamDetails.currentRank);
            if (lastMatchupRank > currentRank) {
                retVal = <span className="text-success"><CaretUpFill/></span>
            } else if (lastMatchupRank < currentRank) {
                retVal = <span className="text-danger"><CaretDownFill/></span>
            } else {
                retVal = <span><CaretLeft/><CaretRight/></span>; // No Change
            }
        }
        return retVal;
    }

    const formatNextMatchupLanes = () => {
        return String(nextMatchup?.lanes[0] ?? "") + " - " + String(nextMatchup?.lanes[1] ?? "");
    }
    const formatNextMatchupOpponent = () => {
        const nextOpponent = nextMatchup?.opponent;
        if (nextOpponent != undefined) {
            const otherTeam = leagueDetails?.otherTeams.find(ot => ot.id === nextOpponent.teamId);
            if (otherTeam) {
                let retVal = "#" + otherTeam.number.toString() + " " + String(otherTeam.name);
                if (nextOpponent.enteringRank.length > 0) {
                    retVal = retVal + " [" + nextOpponent.enteringRank + "]";
                }
                return retVal;
            }
        }
    }

    return (
        <>
            <Container fluid="true">
                <Card className="text-start mx-0 mb-0 h-100" border="secondary">
                    <CardBody className="pt-1 pt-sm-2">
                        <Row className="gx-5 gy-1 mb-1">
                            <DataColRow defn="Division" value={teamDetails.division}/>
                            <DataColRow defn="Current Rank" value={<>{teamDetails.currentRank} {rankComparison()}</>}/>
                            <DataColRow defn="Points"
                                        value={`${String(teamDetails.pointsWonLost[0])} - ${String(teamDetails.pointsWonLost[1])}`}/>
                            <DataColRow defn="Starting Average" value={teamDetails.teamStats?.average}/>
                            <DataColRow defn="Starting Handicap" value={teamDetails.teamStats?.handicap}/>
                            <DataColRow defn="Low Game" value={teamDetails.teamStats?.lowGame}/>
                            <DataColRow defn="High Game" value={teamDetails.teamStats?.highGame}/>
                            <DataColRow defn="Low Series" value={teamDetails.teamStats?.lowSeries}/>
                            <DataColRow defn="High Series" value={teamDetails.teamStats?.highSeries}/>
                            <DataColRow defn="Scratch Pins" value={teamDetails.teamStats?.scratchPins}/>
                        </Row>
                        {nextMatchup &&
                            <Row className="gx-5 gy-1">
                                <DataColRow defn="Next Matchup Lanes" value={formatNextMatchupLanes()} style="Success"/>
                                <DataColRow defn="Next Opponent" value={formatNextMatchupOpponent()} style="Success"
                                            doubleWidth={true}/>
                            </Row>
                        }
                    </CardBody>
                    <CardBody className="pb-1 pb-sm-2">
                        <TeamStatGraph teamPosScores={teamPositionScoreData}/>
                    </CardBody>
                </Card>
            </Container>
        </>
    );
}

interface LeagueTeamDetailsProps {
    leagueDetails: LeagueDetails | null;
    leagueDetailsLoading: boolean;
    currentBreakpoint: Breakpoint;
    teamId?: string;
    children?: ReactNode;
}
const LeagueTeamDetails : FC<LeagueTeamDetailsProps> = ({leagueDetails, leagueDetailsLoading, currentBreakpoint, teamId}: LeagueTeamDetailsProps) => {
    const [teamDetails, setTeamDetails] = useState<TrackedLeagueTeam | null>(null);

    useEffect(() => {
        if (leagueDetails && teamId) {
            for (const item of leagueDetails.teams) {
                if (item.id === teamId) {
                    setTeamDetails(item);
                    break;
                }
            }
        }
    }, [teamId, leagueDetails]);

    return (<>
        <Card border="primary" className="mt-2 mb-2 mx-0 px-0">
            {/*Still Loading*/}
            {leagueDetailsLoading && <div className="card-body"><Loader/></div>}
            {teamDetails &&
                <>
                    <CardHeader className="px-2 py-1 bg-primary text-white">
                        <div className="text-center fw-bolder">#{teamDetails.number} {teamDetails.name}</div>
                    </CardHeader>
                    <CardBody className="px-2 py-1">
                        <LeagueTeamDetailsSummary teamDetails={teamDetails} leagueDetails={leagueDetails}/>
                    </CardBody>
                    <LeagueTeamRoster teamDetails={teamDetails} leagueDetailsLoading={leagueDetailsLoading} currentBreakpoint={currentBreakpoint}/>
                    <LeagueTeamMatchup leagueDetails={leagueDetails} teamDetails={teamDetails} leagueDetailsLoading={leagueDetailsLoading} currentBreakpoint={currentBreakpoint}/>
                </>
            }
        </Card>
    </>);
}

export default LeagueTeamDetails;
