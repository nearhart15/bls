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

const League: FC<{league: LeagueInfo}> = ({league}) => {
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

};

const LeagueList: FC = () => {
    const fetcher=useCallback(()=>leagueInfoListFetcher(),[]);
    const {data,isLoading,error}=useCachedFetcher<AvailableLeagues>(fetcher,LEAGUE_LIST_CACHE_CATEGORY);
    return <Card className="mb-0 h-100"><CardHeader className="d-flex align-items-center justify-content-between"><span>Leagues & Teams</span></CardHeader>{isLoading&&<div className="card-body"><Loader/></div>}{error!=null&&<ErrorDisplay message="Error loading leagues. Nothing else on the site will probably work." error={error}/>} {data?.seasons.map(season=><CardBody className="py-2 px-3" key={season.season}><div className="bls-section-title mb-1">{season.season} Season</div><ListGroup variant="flush" className="bls-league-list-compact">{season.leagues.map(league=><League league={league} key={league.id}/>)}</ListGroup></CardBody>)}<CardFooter className="text-center">USBC seasons run September → August</CardFooter></Card>;
};
export default LeagueList;
