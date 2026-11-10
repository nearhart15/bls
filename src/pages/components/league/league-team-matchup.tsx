import {type FC, useId, useState} from "react";
import moment from "moment";
import {Badge, Card, CardBody, CardHeader, Col, Row, Stack, Table} from "react-bootstrap";
import {ArrowLeftRight, ArrowsCollapse, ArrowsExpand, BoxArrowDown, BoxArrowUp, PersonX} from "react-bootstrap-icons";
import {Link} from "react-router";

import {isNonEmptyString} from "../../../data/utils/utils";
import type {LeagueDetails} from "../../../data/league/league-details";
import {TrackedLeagueTeam} from "../../../data/league/league-team-details";
import {opponentDisplay} from "../../../data/league/opponent-display";
import {matchupComparisonUrl} from "../../../data/league/league-comparison";
import {type Breakpoint, BS_BP_XS, isBreakpointSmallerThan} from "../ui-utils";
import Loader from "../loader";
import {type GameScore, type LeagueMatchup, type MatchupType, SeriesScore, TeamScore} from "../../../data/league/league-matchup";
import MatchupDetailsDisplay from "./league-team-matchup-details";

const MatchupTypeConversion = new Map<MatchupType, string>([
    ["REGULAR-DIVISION", "Division"], ["REGULAR-INTER-DIVISION", "Inter Division"], ["POSITION", "Position"],
    ["POSITION-INTER-DIVISION", "Position"], ["POSITION-INTRA-DIVISION", "Position"], ["FUN", "Non League"], ["OTHERS", "Non League"]
]);

interface TeamNameInfoProps { teamNumber?: number; name?: string; enteringPosition?: string; }
const TeamNameInfo: FC<TeamNameInfoProps> = ({teamNumber, name, enteringPosition}) => <>
    <span>{teamNumber != null && teamNumber > 0 && <>#{teamNumber} </>}{name}&nbsp;{isNonEmptyString(enteringPosition) && <small> [ {enteringPosition} ]</small>}</span>
</>;

interface GameSummaryAndPointsProps { teamNumber?: number; teamScore?: TeamScore; isBlindOrAbsent?: boolean; matchupGames?: number; currentBreakpoint?: Breakpoint; }
const GameSummaryAndPoints: FC<GameSummaryAndPointsProps> = ({teamNumber, teamScore, isBlindOrAbsent, matchupGames = 3, currentBreakpoint}) => {
    const showBlindAbsent = isBlindOrAbsent ?? false;
    const keyPrefix = useId();
    const gameLoopArray = new Array<number>(matchupGames).fill(0);
    return <Table bordered size="sm" className={`bls-matchup-score-table p-0 lh-1 my-1 text-end ${isBreakpointSmallerThan(currentBreakpoint, BS_BP_XS) ? "fs-xs" : ""}`}><tbody>
        <tr>
            {teamNumber != null && teamNumber > 0 && <td rowSpan={2} className="align-middle text-center fw-semibold">#{teamNumber}{showBlindAbsent && <PersonX/>}</td>}
            {!showBlindAbsent ? <>{teamScore?.games.map((g, i) => <td className="p-1" key={`scratch-${keyPrefix}-${i}`}>{g.effectiveScratchScore}</td>)}<td className="p-1">{teamScore?.series.effectiveScratchScore}</td></> : <>{gameLoopArray.map((_g, i) => <td className="p-1 text-decoration-line-through" key={`scratch-${keyPrefix}-${i}`}>0</td>)}<td className="p-1 text-decoration-line-through">0</td></>}
        </tr>
        <tr>
            {!showBlindAbsent ? <>{teamScore?.games.map((g, i) => <td className={`p-1 ${g.pointsWon > 0 ? "bg-success-subtle" : ""}`} key={`hdcp-${keyPrefix}-${i}`}>{g.hdcpScore}</td>)}<td className={`p-1 ${(teamScore?.series.pointsWon ?? 0) > 0 ? "bg-success-subtle" : ""}`}>{teamScore?.series.hdcpScore}</td></> : <>{gameLoopArray.map((_g, i) => <td className="p-1 text-decoration-line-through" key={`hdcp-${keyPrefix}-${i}`}>0</td>)}<td className="p-1 text-decoration-line-through">0</td></>}
        </tr>
    </tbody></Table>;
};

const calculateTeamHdcp = (gameScores?: GameScore[], seriesScore?: SeriesScore, preCalcHdcp?: number) => {
    if (gameScores?.length) {
        const handicaps = gameScores.map(game => game.hdcp);
        const average = handicaps.reduce((sum, value) => sum + value, 0) / handicaps.length;
        return handicaps.every(value => value === handicaps[0])
            ? String(handicaps[0])
            : String(Math.round(average));
    }
    if (seriesScore?.hdcp && seriesScore.games) return Math.round(seriesScore.hdcp / seriesScore.games).toString();
    return preCalcHdcp && preCalcHdcp > 0 ? Math.round(preCalcHdcp).toString() : "UNKNOWN";
};
const twoDigitNumberFormat = Intl.NumberFormat("en-US", {style: "decimal", minimumIntegerDigits: 2});

interface MatchupDisplayProps { anchorId?: string; leagueDetails: LeagueDetails | null; matchup: LeagueMatchup; teamDetails: TrackedLeagueTeam; currentBreakpoint?: Breakpoint; }
const MatchupDisplay: FC<MatchupDisplayProps> = ({leagueDetails, matchup, teamDetails, currentBreakpoint, anchorId}) => {
    const [detailsExpanded, setDetailsExpanded] = useState(false);
    const showMatchupDetails = Boolean(matchup.bowlDate && !matchup.bowlDate.isAfter(moment()) && matchup.scores?.games.length);
    const isOpponentVacantOrAbsent = Boolean(matchup.opponent?.absent || matchup.opponent?.vacant);
    const opponent = opponentDisplay(leagueDetails, matchup.opponent);
    const weekPrefix = leagueDetails?.bowlingDays?.durationUnit ?? "WK";
    const gamesPerMatchup = leagueDetails?.bowlingDays?.gamesPerWeek ?? 3;
    const compareUrl = matchupComparisonUrl(leagueDetails, teamDetails, matchup);

    return <Col id={anchorId} className="bls-matchup-week-anchor"><Card border={showMatchupDetails ? "primary" : "dark"} className="bls-matchup-card mx-auto px-0 py-0 w-100">
        <CardHeader className="bls-matchup-week-header fw-semibold px-2 py-1"><Stack direction="horizontal" gap={3}>
            <div>{weekPrefix} {twoDigitNumberFormat.format(matchup.week)}</div><div>{matchup.scheduledDate?.format("DD MMM")}</div>
            <div className="me-auto">{matchup.bowlDate && !matchup.bowlDate.isSame(matchup.scheduledDate, "day") && <>&nbsp;<small><Badge bg="light">{matchup.bowlDate.isBefore(matchup.scheduledDate, "day") ? "Pre-Bowl" : "Post-Bowl"}</Badge></small></>}</div>
            <div>Lanes {twoDigitNumberFormat.format(matchup.lanes[0])} - {twoDigitNumberFormat.format(matchup.lanes[1])}</div>
        </Stack></CardHeader>
        <CardBody className="py-0 px-1 mb-auto"><Stack direction="horizontal" gap={2}>
            <div className="bls-matchup-team bls-matchup-team-home"><Stack direction="vertical" className="mx-auto"><div className="align-middle"><TeamNameInfo teamNumber={teamDetails.number} name={teamDetails.name} enteringPosition={matchup.enteringRank}/><br/><span className="fs-sm">hdcp: {calculateTeamHdcp(matchup.scores?.games, matchup.scores?.series, teamDetails.teamStats?.handicap)}</span></div><div className="d-none d-sm-block">{showMatchupDetails && <GameSummaryAndPoints teamScore={matchup.scores} currentBreakpoint={currentBreakpoint}/>}</div></Stack></div>
            <div className="bls-matchup-center"><Stack direction="vertical" className="text-center h-100">
                <div><small className={matchup.matchup.startsWith("POSITION") ? "text-danger" : ""}>{MatchupTypeConversion.get(matchup.matchup)}</small></div>
                <div className="my-auto align-middle">{showMatchupDetails && <span className="fs-5">{matchup.pointsWonLost[0]} - {matchup.pointsWonLost[1]}</span>}</div>
                {compareUrl && <div className="d-none d-sm-block my-1"><Link className="bls-matchup-desktop-action" to={compareUrl}>Team Compare</Link></div>}
                <div className="d-none d-sm-block w-auto">{showMatchupDetails && <button type="button" className="bls-details-toggle bls-matchup-desktop-action" onClick={() => { setDetailsExpanded(expanded => !expanded); }}>{detailsExpanded ? <><ArrowsCollapse/><span>Hide Game Details</span></> : <><ArrowsExpand/><span>Game Details</span></>}</button>}</div>
            </Stack></div>
            <div className="bls-matchup-team bls-matchup-team-away"><Stack direction="vertical" className="mx-auto"><div className="text-end align-middle"><TeamNameInfo teamNumber={opponent.number} name={opponent.name} enteringPosition={opponent.enteringRank}/><br/>{isOpponentVacantOrAbsent && <><PersonX/>&nbsp;</>}<span className="fs-sm">hdcp: <span className={isOpponentVacantOrAbsent ? "text-decoration-line-through" : ""}>{calculateTeamHdcp(matchup.opponent?.scores?.games, matchup.opponent?.scores?.series, matchup.opponent?.teamHdcp)}</span></span></div><div className="d-none d-sm-block">{showMatchupDetails && <GameSummaryAndPoints teamScore={matchup.opponent?.scores} matchupGames={gamesPerMatchup} isBlindOrAbsent={isOpponentVacantOrAbsent} currentBreakpoint={currentBreakpoint}/>}</div></Stack></div>
        </Stack>
        <Stack direction="horizontal" gap={0} className="d-block d-sm-none my-1">
            <div>{showMatchupDetails && <GameSummaryAndPoints teamNumber={teamDetails.number} teamScore={matchup.scores} currentBreakpoint={currentBreakpoint}/>}</div>
            <div>{showMatchupDetails && <GameSummaryAndPoints teamNumber={opponent.number} teamScore={matchup.opponent?.scores} matchupGames={gamesPerMatchup} isBlindOrAbsent={isOpponentVacantOrAbsent} currentBreakpoint={currentBreakpoint}/>}</div>
            <div className="bls-matchup-mobile-actions">
                {showMatchupDetails && <button type="button" className="bls-matchup-mobile-action" onClick={() => { setDetailsExpanded(expanded => !expanded); }}>{detailsExpanded ? <><BoxArrowUp/> Hide Details</> : <><BoxArrowDown/> Show Details</>}</button>}
                {compareUrl && <Link className="bls-matchup-mobile-action" to={compareUrl}><ArrowLeftRight/> Team Compare</Link>}
            </div>
        </Stack>
        </CardBody>
        <CardBody className={`p-0 mx-1 my-1 ${detailsExpanded ? "d-block" : "d-none"}`}>{showMatchupDetails && <MatchupDetailsDisplay teamDetails={teamDetails} matchup={matchup} currentBreakpoint={currentBreakpoint}/>}</CardBody><div className="my-auto"/>
    </Card></Col>;
};

interface LeagueTeamMatchupsProps { leagueDetails: LeagueDetails | null; teamDetails: TrackedLeagueTeam; currentBreakpoint: Breakpoint; leagueDetailsLoading: boolean; }
const LeagueTeamMatchup: FC<LeagueTeamMatchupsProps> = ({leagueDetails, teamDetails, leagueDetailsLoading, currentBreakpoint}) => {
    const today = moment();
    const scheduled = teamDetails.matchups.filter(matchup => matchup.scheduledDate);
    const current = scheduled.filter(matchup => !matchup.scheduledDate?.isAfter(today, "day")).slice(-1)[0] ?? scheduled[0];
    return <>
        {leagueDetailsLoading && <div className="card-body"><Loader/></div>}
        <CardBody className="px-0 py-1 border border-secondary-subtle">
            <Card className="mx-1">
                <CardHeader className="text-white bg-dark text-center fw-bolder py-1">Matchups</CardHeader>
                <CardBody className="mx-0 px-1 px-sm-2 py-2">
                    <Row className="row-cols-1 row-cols-lg-2 g-2">
                        {teamDetails.matchups.map(matchup => <MatchupDisplay
                            anchorId={matchup === current ? "bls-current-week" : undefined}
                            key={`${leagueDetails?.id}-${teamDetails.id}-${matchup.week}`}
                            leagueDetails={leagueDetails}
                            matchup={matchup}
                            teamDetails={teamDetails}
                            currentBreakpoint={currentBreakpoint}
                        />)}
                    </Row>
                </CardBody>
            </Card>
        </CardBody>
    </>;
};

export default LeagueTeamMatchup;
