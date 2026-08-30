/*
 * Modern league list © 2026
 */
import {type FC, type ReactNode, useCallback} from "react";
import {Link, type To} from "react-router";

import {Badge, Card, CardBody, CardFooter, CardHeader, ListGroup, ListGroupItem} from 'react-bootstrap';
import {PlayCircleFill} from "react-bootstrap-icons";

import {AvailableLeagues, LeagueInfo} from "../../../data/league/league-info";
import {
    LEAGUE_LIST_CACHE_CATEGORY,
    leagueInfoListFetcher
} from "../../../data/league/league-api";
import Loader from "../loader";
import ErrorDisplay from "../error-display";
import {useCachedFetcher} from "../cache/data-loader";

interface LeagueLinkProps {
    hasData :boolean;
    teamId? :string;
    to? :To;
    children? :ReactNode;
}
const LeagueLink :FC<LeagueLinkProps> = ({hasData, teamId, to, children}) => {
    if (hasData && to != undefined) {
        return (
            <Link to={to} key={teamId} className="list-group-item list-group-item-action d-flex justify-content-between align-items-center bls-link-row">
                {children}
            </Link>
        );
    } else {
        return (<ListGroupItem eventKey={teamId} className="text-body-secondary opacity-75">{children}</ListGroupItem>);
    }
}

interface LeagueProps {
    league: LeagueInfo;
}
const League :FC<LeagueProps> = ({league} :LeagueProps)=> {
    return (<>
        {league.teams.map(team => (
            <LeagueLink hasData={league.hasData()} teamId={team.id} to={`/league/${String(league.id)}/${String(team.id)}`} key={team.id}>
                <div className="me-2">
                    <div className="fs-xs text-body-secondary mb-0">{league.name}</div>
                    <span className={league.hasData() ? "bls-link-text" : ""}>{team.name}</span>
                </div>
                {league.ongoing && (
                    <Badge bg="success" className="d-inline-flex align-items-center gap-1">
                        <PlayCircleFill size={12}/> Live
                    </Badge>
                )}
            </LeagueLink>
        ))}
    </>);
}

const LeagueList :FC = ()=> {
    const fetcher = useCallback(leagueInfoListFetcher, []);
    const { data, isLoading, error } = useCachedFetcher<AvailableLeagues>(fetcher, LEAGUE_LIST_CACHE_CATEGORY);

    return (
        <Card className="mb-0 h-100">
            <CardHeader className="d-flex align-items-center justify-content-between">
                <span>Leagues & Teams</span>
            </CardHeader>
            {isLoading && <div className="card-body"><Loader /></div>}
            {(error != null) && <ErrorDisplay message="Error loading leagues. Nothing else on the site will probably work." error={error}/>}
            {data?.seasons.map(season => (
                <CardBody className="py-3" key={season.season}>
                    <div className="bls-section-title">{season.season} Season</div>
                    <ListGroup variant="flush" className="mx-n3" style={{marginLeft: '-1.15rem', marginRight: '-1.15rem'}}>
                        {season.leagues.map(league => (
                            <League league={league} key={league.id}/>
                        ))}
                    </ListGroup>
                </CardBody>
            ))}
            <CardFooter className="text-center">
                USBC seasons run September → August
            </CardFooter>
        </Card>
    );
}

export default LeagueList;
