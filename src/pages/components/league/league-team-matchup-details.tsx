/*
 * Copyright (c) 2025. Bindul Bhowmik
 * Dark mode / modern frame sheet © 2026
 */

import {type FC, createContext, useContext, useEffect, useMemo, useState} from "react";

import {
    Row,
    Col,
    Badge,
    Table,
    Card,
    CardBody,
    CardFooter,
    Stack,
    ListGroup,
    ListGroupItem
} from "react-bootstrap";
import * as icons from 'react-bootstrap-icons';

import type {LeagueDetails} from "../../../data/league/league-details";
import {
    Frame,
    type FrameAttributes,
    type LeagueMatchup,
    type ScoreLabel,
    TeamPlayerGameScore
} from "../../../data/league/league-matchup";
import {TrackedLeagueTeam} from "../../../data/league/league-team-details";
import {type Breakpoint, BS_BP_SM, BS_BP_XS, isBreakpointSmallerThan} from "../ui-utils";
import {CollapsibleContainer} from "../collapsible-container";

interface IconProps extends icons.IconProps {
    iconName: keyof typeof icons;
}
export const Icon :FC<IconProps> = ({iconName, ...props}: IconProps) => {
    const BootstrapIcon = icons[iconName];
    return <BootstrapIcon {...props}/>;
}

interface FrameAttributeIconInfo {
    attribute: FrameAttributes;
    description: string;
    iconColor: string;
    iconName: keyof typeof icons;
}
const FrameAttributeIcons  = new Map<FrameAttributes, FrameAttributeIconInfo>([
    ["Hung", {attribute: "Hung", description: "Got Hung!", iconColor: "#ff6b6b", iconName: "Icon0CircleFill"}],
    ["Star", {attribute: "Star", description: "Beer / Star Frame!", iconColor: "#a78bfa", iconName: "Icon1CircleFill"}],
    ["Gutter-Spare", {attribute: "Gutter-Spare", description: "Gutter - Spare!", iconColor: "#2dd4bf", iconName: "Icon2CircleFill"}],
    ["Turkey", {attribute: "Turkey", description: "Gobble Gobble... Turkey!", iconColor: "#fbbf24", iconName: "Icon3CircleFill"}],
    ["Split-Picked-Up", {attribute: "Split-Picked-Up", description: "Split 2 Spare!", iconColor: "#22d3ee", iconName: "Icon4CircleFill"}],
    ["Parking-Lot", {attribute: "Parking-Lot", description: "In the Parking Lot...", iconColor: "#f472b6", iconName: "Icon5CircleFill"}],
    ["Clean-Game", {attribute: "Clean-Game", description: "Clean Game!", iconColor: "#4ade80", iconName: "Icon8CircleFill"}],
    ["Perfect-Game", {attribute: "Perfect-Game", description: "Perfect Game!!!", iconColor: "#fb923c", iconName: "Icon9CircleFill"}],
]);

interface FrameScoreLabelInfo {
    label: string;
    altText: string;
    iconName: keyof typeof icons;
}
const FrameScoreLabels  = new Map<string, FrameScoreLabelInfo>([
    ["X", {label: "X", altText: "Strike", iconName: "FileExcel"}],
    ["/", {label: "/", altText: "Spare", iconName: "SlashSquare"}],
    ["1S", {label: "1S", altText: "1 Split", iconName: "Icon1Circle"}],
    ["2S", {label: "2S", altText: "2 Split", iconName: "Icon2Circle"}],
    ["3S", {label: "3S", altText: "3 Split", iconName: "Icon3Circle"}],
    ["4S", {label: "4S", altText: "4 Split", iconName: "Icon4Circle"}],
    ["5S", {label: "5S", altText: "5 Split", iconName: "Icon5Circle"}],
    ["6S", {label: "6S", altText: "6 Split", iconName: "Icon6Circle"}],
    ["7S", {label: "7S", altText: "7 Split", iconName: "Icon7Circle"}],
    ["8S", {label: "8S", altText: "8 Split", iconName: "Icon8Circle"}],
    ["9S", {label: "9S", altText: "9 Split", iconName: "Icon9Circle"}],
    ["-", {label: "-", altText: "Gutter", iconName: "Dash"}],
    ["F", {label: "F", altText: "Fault", iconName: "ExclamationTriangle"}],
    ["A", {label: "A", altText: "Absent", iconName: "DashCircleDotted"}]
])

const findPlayer = (teamDetails: TrackedLeagueTeam, playerId: string | undefined) => {
    const playerName = teamDetails.roster.find(player => player.id === playerId)?.name ?? playerId;
    return playerName ? playerName : "UNKNOWN";
}

const FrameAttrHintContext = createContext<{
    active: FrameAttributeIconInfo | null;
    setActive: (info: FrameAttributeIconInfo) => void;
}>({active: null, setActive: () => undefined});

interface FrameAttributeIconProps {
    attribute: FrameAttributes;
}
const FrameAttributeIcon :FC<FrameAttributeIconProps> = ({attribute}: FrameAttributeIconProps) => {
    const iconInfo = FrameAttributeIcons.get(attribute);
    const {setActive, active} = useContext(FrameAttrHintContext);
    if (!iconInfo) return null;
    const isOn = active?.attribute === iconInfo.attribute;
    return (
        <button
            type="button"
            className={`bls-attr-btn${isOn ? " is-active" : ""}`}
            aria-label={iconInfo.description}
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActive(iconInfo);
            }}
        >
            <Icon iconName={iconInfo.iconName} color={iconInfo.iconColor}/>
        </button>
    );
}

const FrameAttributeIconLegend :FC = () => {
    const {active, setActive} = useContext(FrameAttrHintContext);
    return (
        <div className="bls-attr-legend">
            <div className="bls-attr-legend-icons">
                {Array.from(FrameAttributeIcons.values()).map((icn) => {
                    const isOn = active?.attribute === icn.attribute;
                    return (
                        <button
                            key={icn.attribute}
                            type="button"
                            className={`bls-attr-btn bls-attr-legend-item${isOn ? " is-active" : ""}`}
                            aria-label={icn.description}
                            onClick={() => setActive(icn)}
                        >
                            <Icon iconName={icn.iconName} color={icn.iconColor}/>
                        </button>
                    );
                })}
            </div>
            <div className="bls-attr-callout" aria-live="polite">
                {active ? (
                    <>
                        <Icon iconName={active.iconName} color={active.iconColor}/>
                        <span style={{color: active.iconColor}}>{active.description}</span>
                    </>
                ) : (
                    <span className="text-body-secondary">Tap a numbered badge, or read the full list below</span>
                )}
            </div>
            <ul className="bls-attr-guide">
                {Array.from(FrameAttributeIcons.values()).map((icn) => {
                    const isOn = active?.attribute === icn.attribute;
                    return (
                        <li key={icn.attribute}>
                            <button
                                type="button"
                                className={`bls-attr-guide-row${isOn ? " is-active" : ""}`}
                                onClick={() => setActive(icn)}
                            >
                                <Icon iconName={icn.iconName} color={icn.iconColor}/>
                                <span>{icn.description}</span>
                            </button>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
const EmptyFrames: Frame[] = [
    { number: 1, ballScores: [[0, "A"]], cumulativeScore: 0, attributes: []},
    { number: 2, ballScores: [[0, "A"]], cumulativeScore: 0, attributes: []},
    { number: 3, ballScores: [[0, "A"]], cumulativeScore: 0, attributes: []},
    { number: 4, ballScores: [[0, "A"]], cumulativeScore: 0, attributes: []},
    { number: 5, ballScores: [[0, "A"]], cumulativeScore: 0, attributes: []},
    { number: 6, ballScores: [[0, "A"]], cumulativeScore: 0, attributes: []},
    { number: 7, ballScores: [[0, "A"]], cumulativeScore: 0, attributes: []},
    { number: 8, ballScores: [[0, "A"]], cumulativeScore: 0, attributes: []},
    { number: 9, ballScores: [[0, "A"]], cumulativeScore: 0, attributes: []},
    { number: 10, ballScores: [[0, "A"]], cumulativeScore: 0, attributes: []},
];
interface TeamIndSeriesGameFramesProps extends MatchupDetailsDisplayProps {
    gameIdx: number;
}
const TeamIndSeriesGameFramesV2 :FC<TeamIndSeriesGameFramesProps> = ({matchup, teamDetails, currentBreakpoint, gameIdx}: TeamIndSeriesGameFramesProps) => {

    const [smallScreen, setSmallScreen] = useState(false);

    const playerNames: string[] | undefined = useMemo(() => matchup.scores?.playerScores.map(ps => findPlayer(teamDetails, ps.player)), [matchup, teamDetails]);
    const frames: Frame[][] | undefined = useMemo(() => matchup.scores?.playerScores.map(ps => ps.games[gameIdx].frames), [matchup, gameIdx]);
    const hasAttributes: boolean[] | undefined = useMemo(() => matchup.scores?.playerScores.map(ps =>
            !ps.games[gameIdx].frames.find(f => f.attributes.length > 0)),
        [matchup, gameIdx]);

    useEffect(() => {
        setSmallScreen(isBreakpointSmallerThan(currentBreakpoint, BS_BP_XS) ?? false);
    }, [currentBreakpoint]);

    const writeScoreOrLabel = (b: [number, ScoreLabel?]) => {
        let frameScoreLabel: FrameScoreLabelInfo | undefined = undefined;
        if (b[1]) {
            if (b[1] === "S") {
                frameScoreLabel = FrameScoreLabels.get(b[0].toString() + "S");
            } else {
                frameScoreLabel = FrameScoreLabels.get(b[1]);
            }
        }
        return frameScoreLabel ? <Icon iconName={frameScoreLabel.iconName} title={frameScoreLabel.altText}/> : <>{b[0]}</>;
    }

    const writeScoreLabelRow = (f: Frame)=> {
        return (<>
            <div>{writeScoreOrLabel(f.ballScores[0])}</div>
            {f.ballScores.length > 1 && <div>{writeScoreOrLabel(f.ballScores[1])}</div>}
            {f.number == 10 && (f.ballScores.length > 2 && <div>{writeScoreOrLabel(f.ballScores[2])}</div>)}
        </>);
    }

    const frameDivW = (f: Frame)=> {
        return f.number == 10 ? "13%" : "9%";
    }

    const pickFrames = (frames: Frame[])=> {
        return frames.length > 0 ? frames : EmptyFrames;
    }

    const keyPrefix = "fd-wk-" + matchup.week.toString() + "-" + gameIdx.toString() + "-";
    return (<>
        {playerNames && frames && hasAttributes && playerNames.map((pn, pi) => <div key={keyPrefix + pi.toString()} className="mb-2">
            {smallScreen &&
                <Row key={keyPrefix + "pn-ss-" + pi.toString()}>
                    <Col className="col-md-2">
                        <div className="bls-player-name fs-sm">{pn}</div>
                    </Col>
                </Row>
            }
            <Row className="g-1 align-items-center">
                {!smallScreen &&
                    <Col className="col-md-2" key={keyPrefix + "pn-nss-" + pi.toString()}>
                        <div className="bls-player-name">{pn}</div>
                    </Col>
                }
                <Col className="col-md-10">
                    <Stack direction="horizontal" gap={1}>
                        {pickFrames(frames[pi]).map(frame => (
                            <div className="bls-frame"
                                 style={{width: frameDivW(frame), maxWidth: "48px"}}
                                 key={keyPrefix + "pn-nss-" + pi.toString() + "-f-" + frame.number.toString()}>
                                <div className="bls-frame-balls">
                                    {writeScoreLabelRow(frame)}
                                </div>
                                <div className="bls-frame-cum">{frame.cumulativeScore}</div>
                                <div className="bls-frame-attrs fs-xxs">
                                    {frame.attributes.map((a, i) =>
                                        <FrameAttributeIcon attribute={a} key={keyPrefix + "pn-nss-" + pi.toString() + "-f-" + frame.number.toString() + "-att-" + i.toString()}/>
                                    )}
                                    {(!hasAttributes[pi] && frame.attributes.length == 0) && <>&nbsp;</>}
                                </div>
                            </div>
                        ))}
                    </Stack>
                </Col>
            </Row>
        </div>
        )}
    </>)
}

const TeamIndSeriesGameScoresSummary :FC<MatchupDetailsDisplayProps> = ({matchup, teamDetails, currentBreakpoint}: MatchupDetailsDisplayProps) => {
    const keyPrefix = Math.random().toString();
    const blindOrVacant = (g :TeamPlayerGameScore) => {
        if (g.blind || g.vacant) {
            return <>
                <Badge bg="dark" className="float-start">
                    {g.blind ? "B" : "V"}
                </Badge>
            </>
        }
        return <></>;
    }
    return (<>
        <Table size="sm" bordered striped responsive={true} className={`bls-score-table p-0 lh-1 my-1 text-end ${isBreakpointSmallerThan(currentBreakpoint, BS_BP_XS) ? "fs-xs" : ""}`}>
            <thead>
                <tr>
                    <th>Player</th>
                    <th scope="col">Ent Avg</th>
                    <th scope="col">Gm 1</th>
                    <th scope="col">Gm 2</th>
                    <th scope="col">Gm 3</th>
                    <th scope="col">SS</th>
                    <th scope="col">+ Hdcp</th>
                </tr>
            </thead>
            <tbody>
                {matchup.scores?.playerScores.map(ps =>
                <tr key={String(ps.player) + "-" + keyPrefix}>
                    <th scope="row text-truncate">{findPlayer(teamDetails, ps.player)}</th>
                    <td className="text-body-tertiary text-end">{ps.enteringAverage}</td>
                    {ps.games.map((g, i) =>
                        <td className="text-end" key={"scratch-" + String(ps.player) + "-" + keyPrefix + "-" + i.toString()}>
                            {blindOrVacant(g)}{g.effectiveScratchScore}
                        </td>
                    )}
                    <td className="text-body-emphasis text-end">{ps.series.effectiveScratchScore}</td>
                    <td className="text-body-emphasis text-end">{ps.series.hdcpScore}</td>
                </tr>
                )}
                <tr>
                    <th scope="row" colSpan={2}>Team Gm</th>
                    {matchup.scores?.games.map((g, i) =>
                        <td className="text-body-emphasis text-end" key={"scratch-" + keyPrefix + "-" + i.toString()}>{g.effectiveScratchScore}</td>
                    )}
                    <td className="text-end">{matchup.scores?.series.effectiveScratchScore}</td>
                    <td></td>
                </tr>
                <tr>
                    <th scope="row" colSpan={2}>+ HDCP</th>
                    {matchup.scores?.games.map((g, i) =>
                        <td className="text-primary-emphasis text-end" key={"hdcp-" + keyPrefix + "-" + i.toString()}>{g.hdcpScore}</td>
                    )}
                    <td className="text-primary-emphasis text-end">{matchup.scores?.series.hdcpScore}</td>
                    <td></td>
                </tr>
                {((matchup.opponent?.vacant || matchup.opponent?.absent) && (matchup.scores?.absentVacantHdcpGameTarget ?? 0) > 0) &&
                    <tr>
                        <th scope="row" colSpan={2}>Target</th>
                        {matchup.scores?.games.map((_, i) =>
                            <td className="text-secondary text-end" key={"tgt-" + keyPrefix + "-" + i.toString()}>{matchup.scores?.absentVacantHdcpGameTarget}</td>
                        )}
                        <td className="text-secondary text-end">{matchup.scores?.absentVacantHdcpSeriesTarget}</td>
                        <td></td>
                    </tr>
                }
            </tbody>
        </Table>
    </>);
}

interface MatchupDetailsDisplayProps {
    leagueDetails: LeagueDetails | null;
    matchup: LeagueMatchup;
    teamDetails: TrackedLeagueTeam;
    currentBreakpoint?: Breakpoint;
}
const MatchupDetailsDisplay: FC<MatchupDetailsDisplayProps> = ({leagueDetails, matchup, teamDetails, currentBreakpoint}: MatchupDetailsDisplayProps) => {
    const [hasFrameData, setHasFrameData] = useState(true);
    const [activeAttr, setActiveAttr] = useState<FrameAttributeIconInfo | null>(null);

    useEffect(() => {
        setHasFrameData(true);
        matchup.scores?.playerScores.forEach(ps => {
            ps.games.forEach(psg => {
                if (!psg.blind && !psg.vacant && psg.frames.length == 0) {
                    setHasFrameData(false);
                }
            });
        })
    }, [matchup]);

    return (
    <FrameAttrHintContext.Provider value={{active: activeAttr, setActive: setActiveAttr}}>
        <Row className="gy-1 gx-1">
            <Col>
                <Card className="my-1 mx-0">
                    <CardBody className="p-1">
                        <TeamIndSeriesGameScoresSummary leagueDetails={leagueDetails} matchup={matchup} teamDetails={teamDetails} currentBreakpoint={currentBreakpoint}/>
                    </CardBody>
                </Card>
            </Col>
        </Row>
            {hasFrameData &&
                <Row className="gy-1 gx-1">
                    <Col>
                        <Card className="p-0 m-0">
                            <CollapsibleContainer headerTitle={"Frame Data"} divId={matchup.week.toString() + "-framedata"} currentBreakpoint={currentBreakpoint} hideBelowBreakpoint={BS_BP_SM}>
                                <CardBody className="px-0 py-2 m-0">
                                    <Row className="row-cols-1 gy-2 gx-2 m-0 p-0">
                                        {matchup.scores?.games.map((_game, g) =>
                                            <Col key={"frames-" + matchup.week.toString() + "-" + g.toString()}>
                                                <Card className="my-1 mx-0 h-100">
                                                    <CardBody className="p-2">
                                                        <div className={`bls-game-header ${isBreakpointSmallerThan(currentBreakpoint, BS_BP_SM) ? "fs-sm" : "fs-6"}`}>
                                                            Game {g + 1}
                                                        </div>
                                                        <TeamIndSeriesGameFramesV2 leagueDetails={leagueDetails}
                                                                                   matchup={matchup}
                                                                                   teamDetails={teamDetails}
                                                                                   currentBreakpoint={currentBreakpoint}
                                                                                   gameIdx={g}/>
                                                    </CardBody>
                                                </Card>
                                            </Col>
                                        )}
                                    </Row>
                                </CardBody>
                                <CardFooter className="fs-xs text-center text-body-secondary">
                                    <FrameAttributeIconLegend/>
                                </CardFooter>
                            </CollapsibleContainer>
                        </Card>
                    </Col>
                </Row>
            }
        {matchup.notes.length > 0 &&
            <Row>
                <Col>
                    <Card className="my-2 mx-0">
                        <CardBody className="p-1">
                            <Card.Subtitle className="p-2 mb-0">Notes</Card.Subtitle>
                            <ListGroup variant="flush">
                                {matchup.notes.map((n, i) =>
                                    <ListGroupItem className="fs-sm py-0 px-2 m-0" key={"notes-" + matchup.week.toString() + "-" + i.toString()}>{n}</ListGroupItem>
                                )}
                            </ListGroup>
                        </CardBody>
                    </Card>
                </Col>
            </Row>
        }
    </FrameAttrHintContext.Provider>
    );
}

export default MatchupDetailsDisplay;
