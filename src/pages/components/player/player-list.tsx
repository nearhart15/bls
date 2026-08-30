/*
 * Modern player list © 2026
 */

import type {FC} from "react";
import {Link} from "react-router";

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
        <Card className="mb-0 h-100">
            <CardHeader>Players</CardHeader>
            {isLoading && <div className="card-body"><Loader /></div>}
            {(error != null) && <ErrorDisplay message="Error loading players." error={error}/>}
            {data &&
                <CardBody className="p-0">
                    <div className="px-3 pt-3 pb-2 bls-section-title mb-0">
                        Sorted by games played
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
                                <span className="bls-link-text">{player.name}</span>
                                <span className="text-nowrap d-flex align-items-baseline gap-2">
                                    <span className="fw-bold" style={{fontVariantNumeric: 'tabular-nums'}}>
                                        {player.average != null
                                            ? numberFormat.format(player.average)
                                            : "—"}
                                    </span>
                                    {player.games > 0 && (
                                        <span className="fs-xs text-body-secondary">
                                            {player.games} gm
                                        </span>
                                    )}
                                </span>
                            </ListGroupItem>
                        ))}
                    </ListGroup>
                </CardBody>
            }
            <CardFooter className="text-center">
                Career average across tracked leagues · tap a name for details
            </CardFooter>
        </Card>
    );
}

export default PlayerList;
