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

import type {ApexOptions} from "apexcharts";
import Chart from "react-apexcharts";

import {Col, Container, Row} from "react-bootstrap";

import {BS_BP_LG, BS_BP_XS, BS_BP_XXL} from "../ui-utils";
import type {PlayerDayData} from "./league-team-roster";
import {useTheme} from "../theme";

interface TeamPlayerStatGraphProps {
    playerData: PlayerDayData[];
}
const TeamPlayerStatGraph: FC<TeamPlayerStatGraphProps> = ({playerData}) => {
    const {theme} = useTheme();

    const chartOptions : ApexOptions = {
        chart: {
            id: 'Player-Averages',
            background: 'transparent',
            foreColor: theme === 'dark' ? '#adb5bd' : '#373d3f',
        },
        theme: {
            mode: theme,
        },
        series: [
            {
                name: 'Weekly Average',
                type: 'line',
                data: playerData.map(p => {
                    return {
                        x: p.bowlDate.getTime(),
                        y: p.average
                    }
                })
            },
            {
                name: 'Running Average',
                type: 'line',
                data: playerData.map(p => {
                    return {
                        x: p.bowlDate.getTime(),
                        y: p.runningAverageAfter
                    };
                }),
            },
            {
                name: '200 Games',
                type: 'line',
                data: playerData.map(p => {
                    let count = 0;
                    if (p.game1 >= 200) {
                        count ++;
                    }
                    if (p.game2 >= 200) {
                        count ++;
                    }
                    if (p.game3 >= 200) {
                        count ++;
                    }
                    if (count == 0) {
                        return {
                            x: p.bowlDate.getTime(),
                            y: null
                        };
                    } else {
                        return {
                            x: p.bowlDate.getTime(),
                            y: count
                        };
                    }
                }),
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
                seriesName: ['Weekly Average', 'Running Average'],
                title: {
                    text: "Scratch Pins"
                },
                min: playerData.reduce((minVal, p) => Math.min(minVal, p.average), 300,) * 0.9,
                decimalsInFloat: 0
            },
            {
                title: {
                    text: "Games"
                },
                opposite: true,
                max: 3,
                min: 0,
                decimalsInFloat: 0
            },
        ],
        stroke: {
            curve: ["smooth", "smooth", "smooth"],
            width: [2, 3, 0]
        },
        markers: {
            size: [0, 0, 5]
        },
        title: {
            text: "Player Averages"
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
                    />
                </Col>
            </Row>
        </Container>
    );
}

export default TeamPlayerStatGraph;
