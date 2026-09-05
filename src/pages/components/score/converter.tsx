import {convertScore as parseScore} from "../../../data/utils/bowling-input";
/*
 * Copyright (c) 2025. Bindul Bhowmik
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

import type {SubmitEvent, ChangeEvent, FC} from "react";
import {Fragment, useState} from "react";
import {Link} from "react-router";
import {
    Card,
    CardHeader,
    CardBody,
    Form,
    Button,
    Alert,
    Row,
    Col,
    CardTitle, Stack
} from "react-bootstrap";
import {DashSquareFill, PlusSquareFill} from "react-bootstrap-icons";
import stringify from "json-stringify-pretty-compact"

import {isNonEmptyString} from "../../../data/utils/utils";
import {LeagueTeamPlayerScore, TeamPlayerGameScore} from "../../../data/league/league-matchup";
import {createJsonConverter} from "../../../data/utils/json-utils";
import {accumulateFrameScores, buildFrames} from "../../../data/league/league-calculators";



const convertScore = parseScore;

interface GameScoreForm {
    game: number;
    isBlind: boolean;
    isVacant: boolean;
    arsenal: string[];
    rawScore: string;
    formattedScore: string[][];
    error: string;
    calculatedScore: number;
}

interface PlayerScoreForm {
    playerId: string;
    hdcpSettingDay: boolean;
    enteringAvg: number;
    games: GameScoreForm[];
}

function createGameScoreForm (data: Partial<GameScoreForm>): GameScoreForm {
    const defaultGameScoreForm: GameScoreForm = {
        game: 0,
        isBlind: false,
        isVacant: false,
        arsenal: [],
        rawScore: '',
        formattedScore: [],
        error: '',
        calculatedScore: 0
    }

    return {
        ...defaultGameScoreForm,
        ...data,
    };
}

function formatPlayerScore (data: PlayerScoreForm) {
    if (!/^[A-Za-z0-9_-]{1,80}$/.test(data.playerId)) throw new Error("Enter a valid player ID (letters, numbers, underscores or hyphens)");
    if (!Number.isFinite(data.enteringAvg) || data.enteringAvg < 0 || data.enteringAvg > 300) throw new Error("Entering average must be between 0 and 300");
    const ltps :LeagueTeamPlayerScore = new LeagueTeamPlayerScore();
    ltps.player = data.playerId;
    ltps.hdcpSettingDay = data.hdcpSettingDay;
    if (!ltps.hdcpSettingDay) {
        ltps.enteringAverage = data.enteringAvg;
    }
    ltps.games = data.games.map(gsf => {
        if (gsf.isBlind && gsf.isVacant) throw new Error("A game cannot be both blind and vacant");
        const g = new TeamPlayerGameScore();
        g.blind = gsf.isBlind;
        g.vacant = gsf.isVacant;
        g.arsenal = gsf.arsenal;
        if (!g.blind && !g.vacant) {
            g.inFrames = convertScore(gsf.rawScore);
        }
        return g;
    })

    const jsonObject: unknown = createJsonConverter().serialize(ltps, LeagueTeamPlayerScore);
    // return JSON.stringify(jsonObject, null, 2);
    const filteredKeys = ["scratch-score", "hdcp", "hdcp-score"]
    const filteredBooleanDefaults = ["blind", "vacant", "hdcp-setting-day"]
    const filteredEmptyArrays = ["arsenal", "frames"]
    return stringify(jsonObject, {maxLength: 150, indent: 2, replacer: (key: string, value: unknown) => {
            if (filteredKeys.includes(key)) {
                return undefined;
            } else if (filteredBooleanDefaults.includes(key) && value === false) {
                return undefined;
            } else if (filteredEmptyArrays.includes(key) && Array.isArray(value) && value.length == 0) {
                return undefined;
            }
            return value;
        }});
}

const ScoreConverter : FC = () => {

    const [formattedScore, setFormattedScore] = useState<string | null>(null);
    const [error, setError] = useState<string>("");

    const [playerId, setPlayerId] = useState<string>('');
    const [isHdcpSettingDay, setHdcpSettingDay] = useState<boolean>(false);
    const [enteringAvg, setEnteringAvg] = useState<number>(0);
    const [gameScores, setGameScores] = useState<GameScoreForm[]>([
        createGameScoreForm({game: 1}),
        createGameScoreForm({game: 2}),
        createGameScoreForm({game: 3})
    ]);

    const updateScore = (updatedScore: GameScoreForm, value: string) => {
        updatedScore.rawScore = value;
        updatedScore.error = "";
        try {
            if (isNonEmptyString(value)) {
                updatedScore.formattedScore = convertScore(value);
                updatedScore.calculatedScore = accumulateFrameScores(buildFrames(updatedScore.formattedScore));
            } else {
                updatedScore.formattedScore = [];
                updatedScore.calculatedScore = 0;
            }
        } catch (e) {
            updatedScore.formattedScore = [];
            updatedScore.calculatedScore = 0;
            if (e instanceof Error) {
                updatedScore.error = e.message;
            }
        }
    }

    const handleRawScoreChange = (index: number, event: ChangeEvent<HTMLInputElement>) => {
        const {value} = event.target;
        const updatedScores = [...gameScores];
        updateScore(updatedScores[index], value);
        setGameScores(updatedScores);
    }

    const handleHdcpSettingDayChange = (event: ChangeEvent<HTMLInputElement>) => {
        setHdcpSettingDay(event.target.checked);
        if (!isHdcpSettingDay) {
            setEnteringAvg(0);
        }
    }

    const handleBlindOrVacantChange= (index: number, event: ChangeEvent<HTMLInputElement>)=> {
        const {name, checked} = event.target;
        const updatedScores = [...gameScores];
        if (name === "is-blind") {
            updatedScores[index].isBlind = checked;
            if (checked) updatedScores[index].isVacant = false;
        } else if (name === "is-vacant") {
            updatedScores[index].isVacant = checked;
            if (checked) updatedScores[index].isBlind = false;
        }
        if (checked) {
            updateScore(updatedScores[index], "");
        }
        setGameScores(updatedScores);
    }

    const handleArsenalChange = (gameIdx: number, arsenalIdx: number, event: ChangeEvent<HTMLInputElement>) => {
        const {value} = event.target;
        const updatedScores = [...gameScores];
        const updatedArsenal = [...updatedScores[gameIdx].arsenal];
        updatedArsenal[arsenalIdx] = value;

        updatedScores[gameIdx].arsenal = updatedArsenal;
        setGameScores(updatedScores);
    }
    const handleArsenalAdd = (gameIdx: number) => {
        const updatedScores = [...gameScores];
        updatedScores[gameIdx].arsenal = [...updatedScores[gameIdx].arsenal, ""];
        setGameScores(updatedScores);
    }
    const handleArsenalRemove = (gameIdx: number, arsenalIdx: number) => {
        const updatedScores = [...gameScores];
        updatedScores[gameIdx].arsenal = updatedScores[gameIdx].arsenal.filter((_item, index) => index != arsenalIdx);
        setGameScores(updatedScores);
    }

    const handleChange = () => {
        setFormattedScore(null);
        setError("");
    }

    const handleClear = () => {
        handleChange();

        setPlayerId('');
        setHdcpSettingDay(false);
        setEnteringAvg(0);
        setGameScores([
            createGameScoreForm({game: 1}),
            createGameScoreForm({game: 2}),
            createGameScoreForm({game: 3})
        ]);
    }

    const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        try {
            const playerData: PlayerScoreForm = {
                playerId: playerId,
                hdcpSettingDay: isHdcpSettingDay,
                enteringAvg: enteringAvg,
                games: gameScores
            }
            // setFormattedScore(convertScore(f.get("rawScore")));
            setFormattedScore(formatPlayerScore(playerData));
        } catch (e) {
            console.log(e);
            if (e instanceof Error) {
                setError(e.message);
            }
        }
    }

    return (<>
        <Card border="success" className="mb-3 justify-content-center">
            <CardHeader as="h4">Frame Score Converter</CardHeader>
            <Form onSubmit={handleSubmit} onChange={handleChange} noValidate={false}>
                <CardBody className="border border-secondary py-1 my-1">
                    <Row>
                        <Col>
                            <Form.Group controlId="player-id">
                                <Form.Label>Player</Form.Label>
                                <Form.Control type="text" placeholder="Player Id" value={playerId} name="player-id"
                                    onChange={(e :ChangeEvent<HTMLInputElement>) => { setPlayerId(e.target.value); }} />
                            </Form.Group>
                        </Col>
                        <Col>
                            <Form.Group controlId="hdcp-setting-day">
                                <Form.Label>Handicap Setting Day</Form.Label>
                                <Form.Check type="switch" checked={isHdcpSettingDay} name="hdcp-setting-day" onChange={handleHdcpSettingDayChange}/>
                            </Form.Group>
                        </Col>
                        <Col>
                            <Form.Group controlId="entering-avg">
                                <Form.Label>Entering Average</Form.Label>
                                <Form.Control type="number" min={0} max={300} name="entering-avg" disabled={isHdcpSettingDay}
                                    placeholder="0" value={enteringAvg}
                                    onChange={(e :ChangeEvent<HTMLInputElement>) => { setEnteringAvg(e.target.valueAsNumber); }}/>
                            </Form.Group>
                        </Col>
                    </Row>
                </CardBody>
                {gameScores.map((gameScore, index) => (
                    <CardBody className="border bg-secondary-subtle py-1 my-2 mx-1" key={index}>
                        <CardTitle className="text-muted bg-secondary p-1">Game: {gameScore.game}</CardTitle>
                            <Row>
                                <Col>
                                    <Form.Group controlId={"is-blind-" + index}>
                                        <Form.Label>Blind ?</Form.Label>
                                        <Form.Check type="switch" checked={gameScore.isBlind} name="is-blind"
                                            onChange={(e) => { handleBlindOrVacantChange(index, e); }}/>
                                    </Form.Group>
                                </Col>
                                <Col>
                                    <Form.Group controlId={"is-vacant-" + index}>
                                        <Form.Label>Vacant ?</Form.Label>
                                        <Form.Check type="switch" checked={gameScore.isVacant} name="is-vacant"
                                             onChange={(e) => { handleBlindOrVacantChange(index, e); }}/>
                                    </Form.Group>
                                </Col>
                                <Col>
                                    <Form.Group controlId={"arsenal-" + index}>
                                        <Form.Label>Arsenal</Form.Label>&nbsp;<Link to="#" onClick={() => { handleArsenalAdd(index); }}><PlusSquareFill/></Link>
                                        <Stack direction="horizontal" gap={1}>
                                            {gameScore.arsenal.map((arsenal, aIndex) => (<Fragment key={aIndex}>
                                                <div>
                                                    <Form.Control size="sm" type="text" placeholder="Arsenal" maxLength={8}
                                                                  name="arsenal" value={arsenal}
                                                                  onChange={(e: ChangeEvent<HTMLInputElement>) => { handleArsenalChange(index, aIndex, e); }}/>
                                                </div>
                                                <div>
                                                    <Link to="#" onClick={() => { handleArsenalRemove(index, aIndex); }}><DashSquareFill/></Link>
                                                </div>
                                            </Fragment>))}
                                        </Stack>
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Row>
                                <Col>
                                    <Form.Group controlId="raw-score">
                                        <Form.Label>Frame Scores (raw)</Form.Label>
                                        <Form.Control type="text" placeholder="Enter Raw Frame Scores" name="raw-score" value={gameScore.rawScore}
                                            onChange={(e :ChangeEvent<HTMLInputElement>) => { handleRawScoreChange(index, e); }}/>
                                        <Form.Text className="text-muted">Enter all frame score lines for player without spaces, suffix splits with 'S'</Form.Text>
                                    </Form.Group>
                                    {gameScore.error && <Alert variant="warning">{gameScore.error}</Alert>}
                                </Col>
                                <Col>
                                    <Form.Label>Frame Scores (formatted)</Form.Label>
                                    <Stack direction="horizontal" gap={1} className="me-auto">
                                        {gameScore.formattedScore && gameScore.formattedScore.map((fs, fidx) => (
                                            <div className="border rounded-1 border-dark-subtle border-opacity-10 h-100"
                                                 style={{width: "10%", maxWidth: "45px"}} key={`g-${index}-f-${fidx}`}>
                                                <Stack direction="horizontal" className="fs-6 justify-content-evenly">
                                                    {fs.map((b, bidx) => (
                                                        <div key={`g-${index}-f-${fidx}-b-${bidx}`}>{b}</div>
                                                    ))}
                                                </Stack>
                                            </div>
                                        ))}
                                        <div className="me-auto"/>
                                        <div className="border rounded-1 border-dark bg-dark text-white text-center fs-6 fw-bold px-2">{gameScore.calculatedScore}</div>
                                    </Stack>
                                </Col>
                            </Row>
                    </CardBody>
                ))}
                <CardBody className="border border-secondary py-1 my-1">
                    <Row>
                        <Col><Button variant="primary" type="submit">Convert for BLS</Button></Col>
                        <Col><div className="me-auto"/></Col>
                        <Col><Button variant="secondary" type="reset" onClick={() => { handleClear(); }}>Clear</Button></Col>
                    </Row>
                </CardBody>
                {error &&
                    <CardBody className="border border-secondary py-1 my-1">
                        <Alert variant="danger">{error}</Alert>
                    </CardBody>
                }
            </Form>
        </Card>
        {formattedScore &&
            <Card bg="secondary">
                <CardBody>
                    <pre>
                        <code>{formattedScore}</code>
                    </pre>
                </CardBody>
            </Card>
        }
    </>)
}

export default ScoreConverter;
