/*
 * Copyright (c) 2025. Bindul Bhowmik
 * Player links enabled © 2026
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

import type {Players} from "../../../data/player/player-info";
import {PLAYER_LIST_CACHE_CATEGORY, playerListFetcher} from "../../../data/player/player-api";
import Loader from "../loader";
import {useCachedFetcher} from "../cache/data-loader";
import ErrorDisplay from "../error-display";

const PlayerList :FC = ()=> {
    const { data, isLoading, error } = useCachedFetcher<Players>(playerListFetcher, PLAYER_LIST_CACHE_CATEGORY);

    return (
        <Card className="mb-3">
            <CardHeader as="h3">Players</CardHeader>
            {isLoading && <div className="card-body"><Loader /></div>}
            {(error != null) && <ErrorDisplay message="Error loading players. Lots of things on the site will probably not work." error={error}/>}
            {data &&
                <CardBody className="border-primary p-0">
                    <div className="px-3 pt-3 pb-2 text-body-secondary fs-sm d-flex align-items-center gap-2">
                        <PeopleFill/> Stats across tracked leagues
                    </div>
                    <ListGroup variant="flush">
                        {data.players.map((player) => (
                            <ListGroupItem
                                key={player.id}
                                action
                                as={Link}
                                to={`/player/${player.id}`}
                                className="d-flex justify-content-between align-items-center"
                            >
                                <span className="fw-medium">{player.name}</span>
                                {player.lastBowled && (
                                    <span className="fs-xs text-body-secondary">
                                        {player.lastBowled.format("MMM D, YYYY")}
                                    </span>
                                )}
                            </ListGroupItem>
                        ))}
                    </ListGroup>
                </CardBody>
            }
            <CardFooter className="text-muted text-center">
                List sorted by when someone last bowled descending and player initials ascending.
            </CardFooter>
        </Card>
    );
}

export default PlayerList;
