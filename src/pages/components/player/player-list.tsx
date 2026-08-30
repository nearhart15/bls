/*
 * Copyright (c) 2025. Bindul Bhowmik
 * Full roster list with averages © 2026
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

import type {FC} from "react";
import {Link} from "react-router";

import {PeopleFill} from "react-bootstrap-icons";
import {Card, CardBody, CardFooter, CardHeader, ListGroup, ListGroupItem} from "react-bootstrap";

import {
    buildFullPlayerList,
    type PlayerListEntry,
    PLAYER_INDEX_CACHE_CATEGORY,
} from "../../../data/player/player-aggregate";
import Loader from "../loader";
import {useCachedFetcher} from "../cache/data-loader";
import ErrorDisplay from "../error-display";

const numberFormat = Intl.NumberFormat("en-US", {style: "decimal", maximumFractionDigits: 2});

const PlayerList :FC = ()=> {
    const { data, isLoading, error } = useCachedFetcher<PlayerListEntry[]>(
        buildFullPlayerList,
        PLAYER_INDEX_CACHE_CATEGORY
    );

    return (
        <Card className="mb-3">
            <CardHeader as="h3">Players</CardHeader>
            {isLoading && <div className="card-body"><Loader /></div>}
            {(error != null) && <ErrorDisplay message="Error loading players." error={error}/>}
            {data &&
                <CardBody className="border-primary p-0">
                    <div className="px-3 pt-3 pb-2 text-body-secondary fs-sm d-flex align-items-center gap-2">
                        <PeopleFill/> All bowlers on tracked teams · sorted by average
                    </div>
                    <ListGroup variant="flush">
                        {data.map((player) => (
                            <ListGroupItem
                                key={player.id}
                                action
                                as={Link}
                                to={`/player/${player.id}`}
                                className="d-flex justify-content-between align-items-center bls-link-row"
                            >
                                <span className="bls-link-text fw-medium">{player.name}</span>
                                <span className="fs-sm text-body-emphasis text-nowrap">
                                    {player.average != null
                                        ? numberFormat.format(player.average)
                                        : "—"}
                                    {player.games > 0 && (
                                        <span className="fs-xs text-body-secondary ms-1">
                                            ({player.games} gm)
                                        </span>
                                    )}
                                </span>
                            </ListGroupItem>
                        ))}
                    </ListGroup>
                </CardBody>
            }
            <CardFooter className="text-muted text-center">
                Average is across all tracked leagues. Click a name for full stats.
            </CardFooter>
        </Card>
    );
}

export default PlayerList;
