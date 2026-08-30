/*
 * Copyright (c) 2025. Bindul Bhowmik
 * Portrait/narrow layout improvements © 2026
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
import {Badge, Card, CardBody, CardFooter, CardHeader, CardTitle, Col, Container, Row} from "react-bootstrap";
import {PlayCircleFill} from "react-bootstrap-icons";

import type {LeagueAccoladeType, LeagueDetails} from "../../../data/league/league-details";
import Loader from "../loader";
import {type Breakpoint, BS_BP_XS} from "../ui-utils";
import {VacantOrAbsentOpponentScoring} from "../../../data/league/league-setup-config";
import {CollapsibleContainer} from "../collapsible-container";

interface CodeMaps {
    code: string;
    label: string;
}

const durationWeekLabels: CodeMaps[] = [
    {code: "WK", label: "Weeks"},
    {code: "MT", label: "Months"},
    {code: "TW", label: "Two Times a Week"},
    {code: "TW", label: "Fortnights"}
]

interface PropValueLineProps {
    prop: string;
    value: ReactNode;
}
/** Label + value row that stays readable on narrow/portrait widths */
const PropValueLine :FC<PropValueLineProps> = ({ prop, value }: PropValueLineProps)=> {
    return (
        <div className="d-flex flex-wrap align-items-baseline column-gap-2 row-gap-0 py-1 border-bottom border-secondary-subtle">
            <span className="text-primary-emphasis fw-medium text-nowrap">{prop}</span>
            <span className="text-body-secondary user-select-none">:</span>
            <span className="text-body flex-grow-1 text-break">{value}</span>
        </div>
    );
}

const LeagueSummaryInfo :FC<LeagueSummaryDataProps> = ({leagueDetails}: LeagueSummaryDataProps)=> {
    const mapDurationUnits = (code: string | undefined) => {
        return durationWeekLabels.find(dl => dl.code === code)?.label ?? "";
    }
    return (
        <>
            <PropValueLine prop="USBC Sanctioned" value={leagueDetails.usbcSanctioned ? "Yes" : "No"}/>
            <PropValueLine prop="Bowls On" value={leagueDetails.bowlingDays?.bowlsOn?.format("dddd[s]")}/>
            <PropValueLine prop="Practice Starts" value={leagueDetails.bowlingDays?.startTime?.format("h:mm a")}/>
            <PropValueLine prop="Start Date" value={leagueDetails.bowlingDays?.startDate?.format("ddd, MMM Do YYYY")}/>
            <PropValueLine prop="Games per Matchup" value={leagueDetails.bowlingDays?.gamesPerWeek}/>
            <PropValueLine prop="Duration" value={
                String(leagueDetails.bowlingDays?.duration) + " " + mapDurationUnits(leagueDetails.bowlingDays?.durationUnit)
            }/>
            {leagueDetails.bowlingDays?.positionRounds &&
                <PropValueLine prop="Position Rounds" value={
                    leagueDetails.bowlingDays.positionRounds.map((element, index) => {
                        let val = "";
                        if (index == 0) {
                            val = mapDurationUnits(element.substring(0, 2)) + " "
                        }
                        val += element.substring(2) + " ";
                        return val;
                    })
                }/>
            }
            {leagueDetails.onlineScoring.map((o, i) =>
                <Card border="info" className="mt-2 mb-1 p-0" key={"league-online-scoring-" + i.toString()}>
                    <CardHeader className="py-1 px-2">Online Scoring</CardHeader>
                    <CardBody className="py-1 px-2">
                        <PropValueLine prop="Platform" value={o.platform}/>
                        {o.leagueSecretary && <>
                            <PropValueLine prop="Center Id" value={o.leagueSecretary.centerId}/>
                            <PropValueLine prop="League Id" value={o.leagueSecretary.leagueId}/>
                            <div className="d-flex flex-wrap gap-3 mt-1">
                                {o.leagueSecretary.centerDashboardUrl &&
                                    <a href={o.leagueSecretary.centerDashboardUrl} target="_blank" rel="noreferrer">Center Dashboard</a>}
                                {o.leagueSecretary.leagueDashboardUrl &&
                                    <a href={o.leagueSecretary.leagueDashboardUrl} target="_blank" rel="noreferrer">League Dashboard</a>}
                            </div>
                        </>
                        }
                    </CardBody>
                </Card>
            )}
        </>);
}

const LeagueRules :FC<LeagueSummaryDataProps> = ({leagueDetails}: LeagueSummaryDataProps)=> {
    const scoringRules = leagueDetails.scoringRules;
    if (scoringRules == undefined) {
        return <></>;
    }
    const createVacantOrAbsentScoringStatement = (voaos :VacantOrAbsentOpponentScoring | undefined) => {
        let out = "";
        if (voaos?.allowed) {
            if (voaos.scoringType === "FORFEIT") {
                out += "Opponent Forfeit, all points awarded";
            } else if (voaos.scoringType === "POINTS_WITHIN_AVG") {
                out += "Score within"
                if (voaos.pointsWithinAverageConfig?.pointsWithinTeamAverage) {
                    out = out + " " + String(voaos.pointsWithinAverageConfig.pointsWithinTeamAverage);
                }
                out += " pins of team average / game"
            }
        }
        return out;
    }

    return (<>
        <PropValueLine prop="Team Lineup / Roster Size" value={`${String(scoringRules.lineup)} / ${String(scoringRules.roster)}`}/>
        <PropValueLine prop="Legal Minimum Lineup" value={scoringRules.legalMinLineup}/>
        <PropValueLine prop="Substitutes Allowed" value={scoringRules.subsAllowed ? "Yes" : "No"}/>
        <PropValueLine prop="Handicapped" value={scoringRules.handicap?.type != "NONE" ? "Yes" : "No"}/>
        {scoringRules.handicap &&
            scoringRules.handicap.type === "PCT_AVG_TO_TGT" &&
            scoringRules.handicap.pctAvgToTargetConfig &&
            <PropValueLine prop="Handicap" value={<>
                <span className="text-info-emphasis">{scoringRules.handicap.pctAvgToTargetConfig.pctToTarget}%</span> of
                (<span className="text-info-emphasis">{scoringRules.handicap.pctAvgToTargetConfig.target}</span> - AVG)
            </>}/>
        }
        <PropValueLine prop="Blinds Allowed" value={scoringRules.blindPenalty?.allowed ? "Yes" : "No"}/>
        <PropValueLine prop="Blind Penalty" value={scoringRules.blindPenalty?.defaultPenalty}/>
        {scoringRules.blindPenalty?.missedMatchupsPenalty &&
            scoringRules.blindPenalty.missedMatchupsPenalty > 0 &&
            <PropValueLine prop="Missed Days Blind Penalty" value={<>
                <span className="text-info-emphasis">{scoringRules.blindPenalty.missedMatchupsPenalty}</span> pins after&nbsp;
                <span className="text-info-emphasis">{scoringRules.blindPenalty.missedMatchupsThreshold}</span> days
            </>}/>
        }
        <PropValueLine prop="Vacancy Score Allowed" value={scoringRules.vacancyScore?.allowed ? "Yes" : "No"}/>
        {scoringRules.vacancyScore?.allowed &&
            <PropValueLine prop="Vacancy Score" value={<>
                <span className="text-info-emphasis">{scoringRules.vacancyScore?.scratchScore}</span> pins +&nbsp;
                <span className="text-info-emphasis">{scoringRules.vacancyScore?.handicap}</span> hdcp
            </>}/>
        }
        {scoringRules.pointScoring?.matchupPointScoringRule &&
            scoringRules.pointScoring.matchupPointScoringRule === "PPG_PPS" &&
            scoringRules.pointScoring.ppgPpsMatchupPointScoringConfig && <>
                <PropValueLine prop="Point Scoring" value={<>
                    <span className="text-info-emphasis">{scoringRules.pointScoring.ppgPpsMatchupPointScoringConfig.pointsPerGame}</span> /game +&nbsp;
                    <span className="text-info-emphasis">{scoringRules.pointScoring.ppgPpsMatchupPointScoringConfig.pointsPerSeries}</span> /series
                </>}/>
                <PropValueLine prop="Point On Tie" value={<>
                    <span className="text-info-emphasis">{scoringRules.pointScoring.ppgPpsMatchupPointScoringConfig.pointsPerGameOnTie}</span> /game +&nbsp;
                    <span className="text-info-emphasis">{scoringRules.pointScoring.ppgPpsMatchupPointScoringConfig.pointsPerSeriesOnTie}</span> /series
                </>}/>
                {/* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */}
                {scoringRules.pointScoring.ppgPpsMatchupPointScoringConfig.absentOpponentAllowed && <PropValueLine prop="Absent Opponent Scoring" value={scoringRules.pointScoring.ppgPpsMatchupPointScoringConfig.absentOpponentAllowed ? "Yes | " + createVacantOrAbsentScoringStatement(scoringRules.pointScoring.absentOpponentScoring) : "No"}/>}
                {/* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */}
                {scoringRules.pointScoring.ppgPpsMatchupPointScoringConfig.vacantOpponentAllowed && <PropValueLine prop="Vacant Team Opponent Scoring" value={scoringRules.pointScoring.ppgPpsMatchupPointScoringConfig.vacantOpponentAllowed ? "Yes | " + createVacantOrAbsentScoringStatement(scoringRules.pointScoring.vacantOpponentScoring) : "No"}/>}
            </>
        }
    </>);
}

const LeagueHonorRoll :FC<LeagueSummaryDataProps> = ({leagueDetails} : LeagueSummaryDataProps)=> {
    const findPlayer = (playerId: string) => {
        for (const team of leagueDetails.teams) {
            for (const player of team.roster) {
                if (player.id === playerId) {
                    return player.name;
                }
            }
        }
        return "UNKNOWN";
    }
    const findTeam = (teamId: string) => {
        return leagueDetails.teams.filter(team => team.id === teamId).map(team => team.name);
    }

    const accoladeLabels = new Map<LeagueAccoladeType, string>([
        ["IND-SCRATCH-GAME", "Scratch Game"],
        ["IND-SCRATCH-SERIES", "Scratch Series"],
        ["IND-GAME-OVER-AVERAGE", "Game over Average"],
        ["IND-SERIES-OVER-AVERAGE", "Series over Average"],
        ["IND-HIGH-AVERAGE", "High Average"],
        ["TEAM-SCRATCH-GAME", "Team Scratch Game"],
        ["TEAM-SCRATCH-SERIES", "Team Scratch Series"]
    ])

    const numberFormat = Intl.NumberFormat("en-US", {style: "decimal", maximumFractionDigits: 2})
    return (<>
        <Card border="info" className="mt-1 mb-1 p-0">
            <CardHeader className="py-1 px-2 text-white bg-info"><span className="fs-6">Honor Roll</span></CardHeader>
            {leagueDetails.leagueAccolades.map((accolade, idx) => (
                <CardBody className="py-1 px-1 my-0 mx-2" key={"league-accolage-" + idx.toString()}>
                    <div className="rounded-1 px-2 py-1 mb-1 bg-info-subtle text-info-emphasis fw-medium">
                        {accoladeLabels.get(accolade.type)}
                    </div>
                    <div className="d-flex flex-wrap align-items-baseline column-gap-2 px-1">
                        <span className="text-nowrap">{accolade.when?.format("DD MMM")}</span>
                        <span className="flex-grow-1 text-break">
                            {accolade.type.startsWith("IND") ? findPlayer(accolade.who) : findTeam(accolade.who)}
                        </span>
                        <span className="ms-auto text-end text-nowrap fw-semibold">
                            {(accolade.description && accolade.description.length > 0)
                                ? accolade.description
                                : numberFormat.format(accolade.howMuch)}
                        </span>
                    </div>
                </CardBody>))}
            <CardFooter><small>Honor Roll only considers achievements from <em>tracked teams</em>.</small></CardFooter>
        </Card>
    </>);
}

interface LeagueSummaryDataProps {
    leagueDetails: LeagueDetails;
    currentBreakpoint?: Breakpoint;
}
const LeagueSummaryData :FC<LeagueSummaryDataProps> = ({leagueDetails, currentBreakpoint}: LeagueSummaryDataProps) => {
    return (
    <>
        <Container fluid="true">
            {/* Stack on phones & tablets; 3 columns only on large (lg+) screens */}
            <Row className="g-2 g-lg-3">
                <Col xs={12} lg={4} className="mb-2 mb-lg-0">
                    <Card className="text-start mx-0 mb-0 h-100" border="secondary">
                        <CollapsibleContainer divId="league-honor-roll" headerTitle="Honor Roll" currentBreakpoint={currentBreakpoint} hideBelowBreakpoint={BS_BP_XS}>
                            <CardBody className="py-1 py-sm-2">
                                <LeagueHonorRoll leagueDetails={leagueDetails}/>
                            </CardBody>
                        </CollapsibleContainer>
                    </Card>
                </Col>
                <Col xs={12} lg={4} className="mb-2 mb-lg-0">
                    <Card className="text-start mx-0 mb-0 h-100" border="secondary">
                        <CollapsibleContainer divId="league-rules" headerTitle="League Rules" currentBreakpoint={currentBreakpoint} hideBelowBreakpoint={BS_BP_XS}>
                            <CardBody className="py-1 py-sm-2">
                                <LeagueRules leagueDetails={leagueDetails}/>
                            </CardBody>
                        </CollapsibleContainer>
                    </Card>
                </Col>
                <Col xs={12} lg={4}>
                    <Card className="text-start mx-0 mb-0 h-100" border="secondary">
                        <CollapsibleContainer divId="league-info" headerTitle="League Info" currentBreakpoint={currentBreakpoint} hideBelowBreakpoint={BS_BP_XS}>
                            <CardBody className="py-1 py-sm-2">
                                <LeagueSummaryInfo leagueDetails={leagueDetails} />
                            </CardBody>
                        </CollapsibleContainer>
                    </Card>
                </Col>
            </Row>
        </Container>
    </>);
}

export interface LeagueSummaryParams {
    leagueDetails: LeagueDetails | null;
    leagueDetailsLoading: boolean;
    currentBreakpoint: Breakpoint;
    children?: ReactNode;
}
const LeagueSummary: FC<LeagueSummaryParams> = ({leagueDetails, leagueDetailsLoading, currentBreakpoint, children}) => {
    return (
        <>
            <Card border="primary" className="mb-2 mx-0 px-0">
                <CardHeader className="px-2">
                    League Summary
                    {leagueDetails && !leagueDetails.completed && <Badge bg="success" className="align-middle float-end"><PlayCircleFill/> Ongoing</Badge>}
                </CardHeader>
                {/*Still Loading*/}
                {leagueDetailsLoading && <div className="card-body"><Loader/></div>}
                {leagueDetails &&
                    <CardBody className="px-2">
                        <CardTitle as="h4" className="pb-2 d-flex justify-content-center">
                            <div className="text-center">{leagueDetails.season} {leagueDetails.name}&nbsp;<small className="text-body-secondary">@ {leagueDetails.center}</small></div>
                        </CardTitle>
                        <LeagueSummaryData leagueDetails={leagueDetails} currentBreakpoint={currentBreakpoint}/>
                    </CardBody>
                    }
            </Card>
            {children}
        </>);
}

export default LeagueSummary;
