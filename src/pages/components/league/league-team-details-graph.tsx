/*
 * Copyright (c) 2025. Bindul Bhowmik
 * Dark mode additions © 2026
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

import type {FC} from "react";

import Chart from "react-apexcharts";
import type {ApexOptions} from "apexcharts";

import {Col, Container, Row} from "react-bootstrap";
import {BS_BP_LG, BS_BP_XS, BS_BP_XXL} from "../ui-utils";

import type {TeamPositionScoreData} from "./league-team-details";
import {useTheme} from "../theme";

interface TeamStatGraphProps {
    teamPosScores: TeamPositionScoreData[];
}
const TeamStatGraph : FC<TeamStatGraphProps> = ({teamPosScores} : TeamStatGraphProps) => {
    const {theme} = useTheme();

    const chartOptions : ApexOptions = {
        chart: {
            id: 'Team-Performance',
            type: 'line',
            background: 'transparent',
            foreColor: theme === 'dark' ? '#adb5bd' : '#373d3f',
        },
        theme: {
            mode: theme,
        },
        series: [{
                name: 'Team Scratch Series',
                data: teamPosScores.map(tps => [tps.bowlDate.getTime(), tps.scratchSeries])
            },
            {
                name: 'Team League Rank',
                data: teamPosScores.filter(tps => tps.position > 0).map(tps => [tps.bowlDate.getTime(), tps.position])
            }
        ],
        xaxis: {
            type: "datetime",
            labels: {
                format: 'dd-MMM'
            }
        },
        yaxis: [
            {
                decimalsInFloat: 0
            },
            {
                opposite: true,
                reversed: true,
                decimalsInFloat: 0,
                forceNiceScale: true,
                stepSize: 5
            }
        ],
        stroke: {
            curve: ["monotoneCubic", "stepline"],
            width: [3, 3]
        },
        title: {
            text: "Team Scores and Rank"
        },
        noData: {
            text: "Loading..."
        },
        responsive: [
            {
                breakpoint: BS_BP_XS.maxWidth,
                options: {
                    chart: {
                        width: 300
                    },
                    legend: {
                        position: "bottom"
                    }
                }
            },
            {
                breakpoint: BS_BP_LG.maxWidth,
                options: {
                    chart: {
                        width: 450
                    }
                }
            },
            {
                breakpoint: BS_BP_XXL.maxWidth,
                options: {
                    chart: {
                        width: 600
                    }
                }
            }
        ]
    };

    return (
        <Container fluid="true">
            <Row>
                <Col className="d-flex justify-content-center">
                    <Chart
                        options={chartOptions}
                        series={chartOptions.series}
                        type="line"
                    />
                </Col>
            </Row>
        </Container>
    );
}

export default TeamStatGraph;
