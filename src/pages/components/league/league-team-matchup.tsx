import {useId} from "react";
import {type FC, useEffect, useState} from "react";
import moment from "moment";
import {Badge, Card, CardBody, CardHeader, Col, Row, Stack, Table} from "react-bootstrap";
import {ArrowLeftRight, ArrowsCollapse, ArrowsExpand, BoxArrowDown, BoxArrowUp, PersonX} from "react-bootstrap-icons";
import {Link} from "react-router";

import {isNonEmptyString} from "../../../data/utils/utils";
import type {LeagueDetails} from "../../../data/league/league-details";
import {TrackedLeagueTeam} from "../../../data/league/league-team-details";
import {opponentDisplay} from "../../../data/league/opponent-display";
import {type Breakpoint, BS_BP_XS, isBreakpointSmallerThan} from "../ui-utils";
import Loader from "../loader";
import {type GameScore, type LeagueMatchup, type MatchupType, SeriesScore, TeamScore} from "../../../data/league/league-matchup";
import MatchupDetailsDisplay from "./league-team-matchup-details";
import type {LeagueBowlingDurationUnit} from "../../../data/league/league-setup-config";

const MatchupTypeConversion = new Map<MatchupType, string>([
    ["REGULAR-DIVISION", "Division"], ["REGULAR-INTER-DIVISION", "Inter Division"], ["POSITION", "Position"],
    ["POSITION-INTER-DIVISION", "Position"], ["POSITION-INTRA-DIVISION", "Position"], ["FUN", "Non League"], ["OTHERS", "Non League"]
]);

interface TeamNameInfoProps { division?: string; teamNumber?: number; name?: string; enteringPosition?: string; }
const TeamNameInfo: FC<TeamNameInfoProps> = ({teamNumber, name, enteringPosition}) => <>
    <span>{teamNumber != null && teamNumber > 0 && <>#{teamNumber} </>}{name}&nbsp;{isNonEmptyString(enteringPosition) && <small> [ {enteringPosition} ]</small>}</span>
</>;

interface GameSummaryAndPointsProps { teamNumber?: number; teamScore?: TeamScore; isBlindOrAbsent?: boolean; matchupGames?: number; currentBreakpoint?: Breakpoint; }
const GameSummaryAndPoints: FC<GameSummaryAndPointsProps> = ({teamNumber, teamScore, isBlindOrAbsent, matchupGames = 3, currentBreakpoint}) => {
    const [showBlindAbsent, setShowBlindAbsent] = useState(false);
    const keyPrefix = useId();
    const gameLoopArray = new Array<number>(matchupGames).fill(0);
    useEffect(() => { setShowBlindAbsent(isBlindOrAbsent ?? false); }, [isBlindOrAbsent]);
    return <Table bordered size="sm" className={`p-0 lh-1 my-1 text-end ${isBreakpointSmallerThan(currentBreakpoint, BS_BP_XS) ? "fs-xs" : ""}`}><tbody>
        <tr>
            {teamNumber != null && teamNumber > 0 && <td rowSpan={2} className="align-middle text-center fw-semibold">#{teamNumber}{showBlindAbsent && <PersonX/>}</td>}
            {!showBlindAbsent ? <>{teamScore?.games.map((g, i) => <td className="p-1" key={`scratch-${keyPrefix}-${i}`}>{g.effectiveScratchScore}</td>)}<td className="p-1">{teamScore?.series.effectiveScratchScore}</td></> : <>{gameLoopArray.map((_g, i) => <td className="p-1 text-decoration-line-through" key={`scratch-${keyPrefix}-${i}`}>0</td>)}<td className="p-1 text-decoration-line-through">0</td></>}
        </tr>
        <tr>
            {!showBlindAbsent ? <>{teamScore?.games.map((g, i) => <td className={`p-1 ${g.pointsWon > 0 ? "bg-success-subtle" : ""}`} key={`hdcp-${keyPrefix}-${i}`}>{g.hdcpScore}</td>)}<td className={`p-1 ${(teamScore?.series.pointsWon ?? 0) > 0 ? "bg-success-subtle" : ""}`}>{teamScore?.series.hdcpScore}</td></> : <>{gameLoopArray.map((_g, i) => <td className="p-1 text-decoration-line-through" key={`hdcp-${keyPrefix}-${i}`}>0</td>)}<td className="p-1 text-decoration-line-through">0</td></>}
        </tr>
    </tbody></Table>;
};

interface MatchupDetailsExpandedProps { week: number; expanded: boolean; }
interface MatchupDisplayProps { leagueDetails: LeagueDetails | null; matchup: LeagueMatchup; teamDetails: TrackedLeagueTeam; currentBreakpoint?: Breakpoint; }
const MatchupDisplay: FC<MatchupDisplayProps> = ({leagueDetails, matchup, teamDetails, currentBreakpoint}) => {
    const [matchupDetailsExpanded, setMatchupDetailsExpanded] = useState<MatchupDetailsExpandedProps[]>([]);
    const [showMatchupDetails, setShowMatchupDetails] = useState(true);
    const isOpponentVacantOrAbsent = Boolean(matchup.opponent?.absent || matchup.opponent?.vacant);
    const opponent = opponentDisplay(leagueDetails, matchup.opponent);
    const [weekPrefix, setWeekPrefix] = useState<LeagueBowlingDurationUnit>("WK");
    const [gamesPerMatchup, setGamesPerMatchup] = useState(3);
    const trackedOpponent = leagueDetails?.teams.find(team => team.id === matchup.opponent?.teamId);
    const hasApiPair = teamDetails.number > 0 && (opponent.number ?? 0) > 0;
    const canOpenCompare = Boolean(leagueDetails?.id && teamDetails.id && (trackedOpponent?.id || hasApiPair));
    const compareParams = new URLSearchParams();
    if (trackedOpponent?.id && teamDetails.id && leagueDetails?.id) {
        compareParams.set("source", "frame");
        compareParams.set("league", leagueDetails.id);
        compareParams.set("a", teamDetails.id);
        compareParams.set("b", trackedOpponent.id);
    } else if (hasApiPair) {
        compareParams.set("source", "api");
        compareParams.set("a", String(teamDetails.number));
        compareParams.set("b", String(opponent.number));
    }
    const compareUrl = `/team/compare?${compareParams.toString()}`;

    useEffect(() => {
        const today = moment();
        setShowMatchupDetails(Boolean(matchup.bowlDate && !matchup.bowlDate.isAfter(today) && matchup.scores?.games?.length));
        if (leagueDetails?.bowlingDays) { setWeekPrefix(leagueDetails.bowlingDays.durationUnit); setGamesPerMatchup(leagueDetails.bowlingDays.gamesPerWeek); }
    }, [matchup, leagueDetails]);

    useEffect(() => { setMatchupDetailsExpanded(prev => prev.map(item => ({...item, expanded: false}))); }, [teamDetails]);
    const isVisible = (week: number) => matchupDetailsExpanded.some(item => item.week === week && item.expanded);
    const toggleVisibility = (week: number) => { setMatchupDetailsExpanded(prev => prev.some(item => item.week === week) ? prev.map(item => item.week === week ? {...item, expanded: !item.expanded} : item) : [...prev, {week, expanded: true}]); };
    const calculateTeamHdcp = (gameScores?: GameScore[], seriesScore?: SeriesScore, preCalcHdcp?: number) => {
        if (gameScores?.length) {
            const handicaps = gameScores.map(game => game.hdcp);
            const average = handicaps.reduce((sum, value) => sum + value, 0) / handicaps.length;
            return handicaps.every(value => value === handicaps[0])
                ? String(handicaps[0])
                : `~${average.toFixed(0)} [${handicaps.join(", ")}]`;
        }
        if (seriesScore?.hdcp && seriesScore.games) return Math.round(seriesScore.hdcp / seriesScore.games).toString();
        return preCalcHdcp && preCalcHdcp > 0 ? Math.round(preCalcHdcp).toString() : "UNKNOWN";
    };
    const twoDigitNumberFormat = Intl.NumberFormat("en-US", {style: "decimal", minimumIntegerDigits: 2});

    return <Col><Card border={showMatchupDetails ? "primary" : "dark"} className="mx-auto px-0 py-0 w-100">
        <CardHeader className={`text-light fw-semibold px-2 py-0 ${showMatchupDetails ? "bg-primary" : "bg-dark"}`}><Stack direction="horizontal" gap={3}>
            <div>{weekPrefix} {twoDigitNumberFormat.format(matchup.week)}</div><div>{matchup.scheduledDate?.format("DD MMM")}</div>
            <div className="me-auto">{matchup.bowlDate && !matchup.bowlDate.isSame(matchup.scheduledDate, "day") && <>&nbsp;<small><Badge bg="light">{matchup.bowlDate.isBefore(matchup.scheduledDate, "day") ? "Pre-Bowl" : "Post-Bowl"}</Badge></small></>}</div>
            <div>Lanes {twoDigitNumberFormat.format(matchup.lanes[0])} - {twoDigitNumberFormat.format(matchup.lanes[1])}</div>
        </Stack></CardHeader>
        <CardBody className="py-0 px-1 mb-auto"><Stack direction="horizontal" gap={2}>
            <div className="me-auto"><Stack direction="vertical" className="mx-auto"><div className="align-middle"><TeamNameInfo division={teamDetails.division} teamNumber={teamDetails.number} name={teamDetails.name} enteringPosition={matchup.enteringRank}/><br/><span className="fs-sm">hdcp: {calculateTeamHdcp(matchup.scores?.games, matchup.scores?.series, teamDetails.teamStats?.handicap)}</span></div><div className="d-none d-sm-block">{showMatchupDetails && <GameSummaryAndPoints teamScore={matchup.scores} currentBreakpoint={currentBreakpoint}/>}</div></Stack></div>
            <div><Stack direction="vertical" className="text-center h-100">
                <div><small className={matchup.matchup.startsWith("POSITION") ? "text-danger" : ""}>{MatchupTypeConversion.get(matchup.matchup)}</small></div>
                <div className="my-auto align-middle">{showMatchupDetails && <span className="fs-5">{matchup.pointsWonLost[0]} - {matchup.pointsWonLost[1]}</span>}</div>
                {canOpenCompare && <div className="d-none d-sm-block my-1"><Link className="btn btn-outline-primary btn-sm py-0 px-2" to={compareUrl}>Team Compare</Link></div>}
                <div className="d-none d-sm-block w-auto">{showMatchupDetails && <button type="button" className="bls-details-toggle" onClick={() => { toggleVisibility(matchup.week); }}>{isVisible(matchup.week) ? <><ArrowsCollapse className="fw-bold"/><br/><span className="fs-xs">Hide Game Details</span></> : <><ArrowsExpand className="fw-bold"/><br/><span className="fs-xs">Game Details</span></>}</button>}</div>
            </Stack></div>
            <div className="ms-auto"><Stack direction="vertical" className="mx-auto"><div className="text-end align-middle"><TeamNameInfo division={opponent.division} teamNumber={opponent.number} name={opponent.name} enteringPosition={opponent.enteringRank}/><br/>{isOpponentVacantOrAbsent && <><PersonX/>&nbsp;</>}<span className="fs-sm">hdcp: <span className={isOpponentVacantOrAbsent ? "text-decoration-line-through" : ""}>{calculateTeamHdcp(matchup.opponent?.scores?.games, matchup.opponent?.scores?.series, matchup.opponent?.teamHdcp)}</span></span></div><div className="d-none d-sm-block">{showMatchupDetails && <GameSummaryAndPoints teamScore={matchup.opponent?.scores} matchupGames={gamesPerMatchup} isBlindOrAbsent={isOpponentVacantOrAbsent} currentBreakpoint={currentBreakpoint}/>}</div></Stack></div>
        </Stack>
        <Stack direction="horizontal" gap={0} className="d-block d-sm-none my-1">
            <div>{showMatchupDetails && <GameSummaryAndPoints teamNumber={teamDetails.number} teamScore={matchup.scores} currentBreakpoint={currentBreakpoint}/>}</div>
            <div>{showMatchupDetails && <GameSummaryAndPoints teamNumber={opponent.number} teamScore={matchup.opponent?.scores} matchupGames={gamesPerMatchup} isBlindOrAbsent={isOpponentVacantOrAbsent} currentBreakpoint={currentBreakpoint}/>}</div>
            <div className="bls-matchup-mobile-actions">
                {showMatchupDetails && <button type="button" className="bls-matchup-mobile-action" onClick={() => { toggleVisibility(matchup.week); }}>{isVisible(matchup.week) ? <><BoxArrowUp/> Hide Details</> : <><BoxArrowDown/> Show Details</>}</button>}
                {canOpenCompare && <Link className="bls-matchup-mobile-action" to={compareUrl}><ArrowLeftRight/> Team Compare</Link>}
            </div>
        </Stack>
        </CardBody>
        <CardBody className={`p-0 mx-1 my-1 ${isVisible(matchup.week) ? "d-block" : "d-none"}`}>{showMatchupDetails && <MatchupDetailsDisplay leagueDetails={leagueDetails} teamDetails={teamDetails} matchup={matchup} currentBreakpoint={currentBreakpoint}/>}</CardBody><div className="my-auto"/>
    </Card></Col>;
};

interface LeagueTeamMatchupsProps { leagueDetails: LeagueDetails | null; teamDetails: TrackedLeagueTeam; currentBreakpoint: Breakpoint; leagueDetailsLoading: boolean; }
const LeagueTeamMatchup: FC<LeagueTeamMatchupsProps> = ({leagueDetails, teamDetails, leagueDetailsLoading, currentBreakpoint}) => {
    const [teamDtls, setTeamDtls] = useState(teamDetails);
    useEffect(() => { setTeamDtls(teamDetails); }, [leagueDetails, teamDetails]);
    return <>{leagueDetailsLoading && <div className="card-body"><Loader/></div>}{teamDtls && <CardBody className="px-0 py-1 border border-secondary-subtle"><Card className="mx-1"><CardHeader className="text-white bg-dark text-center fw-bolder py-1">Matchups</CardHeader><CardBody className="mx-0 px-1 px-sm-2 py-2"><Row className="row-cols-1 row-cols-lg-2 g-2">{teamDtls.matchups.map(matchup => <MatchupDisplay leagueDetails={leagueDetails} matchup={matchup} teamDetails={teamDtls} currentBreakpoint={currentBreakpoint} key={`league-matchup-${matchup.week}`}/>)}</Row></CardBody></Card></CardBody>}</>;
};

export default LeagueTeamMatchup;
