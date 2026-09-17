/* Modern league list © 2026 */
import {type FC, useCallback} from "react";
import {Link} from "react-router";
import {Badge, Card, CardBody, CardFooter, CardHeader, ListGroup, ListGroupItem} from "react-bootstrap";
import {PlayCircleFill} from "react-bootstrap-icons";
import {AvailableLeagues, LeagueInfo} from "../../../data/league/league-info";
import {LEAGUE_LIST_CACHE_CATEGORY, leagueInfoListFetcher} from "../../../data/league/league-api";
import Loader from "../loader";
import ErrorDisplay from "../error-display";
import {useCachedFetcher} from "../cache/data-loader";

const League: FC<{league: LeagueInfo; compact: boolean}> = ({league, compact}) => {
    if (compact) {
        return <ListGroupItem className="d-flex flex-wrap align-items-center gap-2 py-2">
            <span className="text-body-secondary me-1">{league.name}</span>
            <span className="d-flex flex-wrap align-items-center gap-2">
                {league.teams.map((team, index) => <span key={team.id} className="d-inline-flex align-items-center gap-2">
                    {index > 0 && <span className="text-body-secondary" aria-hidden="true">·</span>}
                    {league.hasData() ? <Link className="bls-link fw-semibold" to={`/league/${String(league.id)}/${String(team.id)}`}>{team.name}</Link> : <span className="text-body-secondary">{team.name}</span>}
                </span>)}
            </span>
            {league.ongoing && <Badge bg="success" className="d-inline-flex align-items-center gap-1 ms-auto"><PlayCircleFill size={12}/> Live</Badge>}
        </ListGroupItem>;
    }
    return <>{league.teams.map(team => league.hasData() ?
        <Link to={`/league/${String(league.id)}/${String(team.id)}`} key={team.id} className="list-group-item list-group-item-action d-flex justify-content-between align-items-center bls-link-row"><div className="me-2"><div className="fs-xs text-body-secondary mb-0">{league.name}</div><span className="bls-link-text">{team.name}</span></div>{league.ongoing&&<Badge bg="success" className="d-inline-flex align-items-center gap-1"><PlayCircleFill size={12}/> Live</Badge>}</Link> :
        <ListGroupItem key={team.id} eventKey={team.id} className="text-body-secondary opacity-75"><div className="fs-xs mb-0">{league.name}</div><span>{team.name}</span></ListGroupItem>)}</>;
};

interface LeagueListProps { compact?: boolean; }
const LeagueList: FC<LeagueListProps> = ({compact=false}) => {
    const fetcher=useCallback(()=>leagueInfoListFetcher(),[]);
    const {data,isLoading,error}=useCachedFetcher<AvailableLeagues>(fetcher,LEAGUE_LIST_CACHE_CATEGORY);
    return <Card className="mb-0 h-100"><CardHeader className="d-flex align-items-center justify-content-between"><span>Leagues & Teams</span></CardHeader>{isLoading&&<div className="card-body"><Loader/></div>}{error!=null&&<ErrorDisplay message="Error loading leagues. Nothing else on the site will probably work." error={error}/>} {data?.seasons.map(season=><CardBody className={compact?"py-2 px-3":"py-3"} key={season.season}><div className={`bls-section-title${compact?" mb-1":""}`}>{season.season} Season</div><ListGroup variant="flush" className={compact?"bls-league-list-compact":""} style={compact?undefined:{marginLeft:"-1.15rem",marginRight:"-1.15rem"}}>{season.leagues.map(league=><League league={league} compact={compact} key={league.id}/>)}</ListGroup></CardBody>)}<CardFooter className="text-center">USBC seasons run September → August</CardFooter></Card>;
};
export default LeagueList;
