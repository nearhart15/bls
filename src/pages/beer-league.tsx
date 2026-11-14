import LeagueStandings from "./components/league/league-standings";
import {RankingTable} from "./components/player/ranking-table";
import {beerSheetFetcher as beerLeagueFetcher, apiPlayerId, normalizePlayerName as normalizeName, type BeerLeagueData, type BeerPlayer} from "../data/league/beer-sheet";
import {SortHeader} from "./components/sort-header";
import {type FC,useCallback,useMemo,useState} from "react";
import {Link} from "react-router";
import {Accordion,Alert,Card,Col,Form,Row,Spinner,Tab,Table,Tabs} from "react-bootstrap";
import {buildFullPlayerList,PLAYER_INDEX_CACHE_CATEGORY,type PlayerListEntry} from "../data/player/player-aggregate";
import {useCachedFetcher} from "./components/cache/data-loader";
import {safeArapahoeLink} from "../data/utils/safe-link";

type PlayerSortKey="name"|"teamName"|"average"|"handicap"|"games"|"pins"|"highGame"|"highSeries";
interface LeaguePlayerRow extends BeerPlayer{teamNumber:number|null;teamName:string;division:string|null;isSub:boolean;apiPlayerId:string;framePlayer?:PlayerListEntry}


const BEER_LEAGUE_CACHE_CATEGORY = "beer-league-import-v1";
function errorMessage(error:unknown){return error instanceof Error?error.message:typeof error==="string"?error:"Unknown error";}

const BeerLeague:FC=()=>{
 const[playerSearch,setPlayerSearch]=useState("");
 const[playerSort,setPlayerSort]=useState<{key:PlayerSortKey;direction:"asc"|"desc"}>({key:"games",direction:"desc"});
 const dataFetcher=useCallback(()=>beerLeagueFetcher(),[]);
 const{data,isLoading,error}=useCachedFetcher<BeerLeagueData>(dataFetcher,BEER_LEAGUE_CACHE_CATEGORY);
 const frameFetcher=useCallback(()=>buildFullPlayerList(),[]);const{data:framePlayers}=useCachedFetcher<PlayerListEntry[]>(frameFetcher,PLAYER_INDEX_CACHE_CATEGORY);
 const frameByName=useMemo(()=>new Map((framePlayers??[]).map(p=>[normalizeName(p.name),p])),[framePlayers]);
 const allPlayers=useMemo<LeaguePlayerRow[]>(()=>{if(!data)return[];const roster=data.teams.flatMap(team=>team.players.map((player,index)=>({...player,teamNumber:team.number,teamName:team.name,division:team.division??null,isSub:false,apiPlayerId:apiPlayerId(team.number,player.name,index),framePlayer:frameByName.get(normalizeName(player.name))})));const subs=(data.substitutes??[]).map((player,index)=>({...player,teamNumber:null,teamName:"Substitute",division:null,isSub:true,apiPlayerId:apiPlayerId(null,player.name,index),framePlayer:frameByName.get(normalizeName(player.name))}));return[...roster,...subs];},[data,frameByName]);
 const playerByTeamAndName=useMemo(()=>new Map(allPlayers.map(player=>[`${player.teamNumber??"sub"}:${normalizeName(player.name)}`,player])),[allPlayers]);
 const activePlayers=useMemo(()=>allPlayers.filter(p=>p.games>0),[allPlayers]);
 const visiblePlayers=useMemo(()=>{const q=normalizeName(playerSearch);return allPlayers.filter(p=>!q||normalizeName(`${p.name} ${p.teamName}`).includes(q)).sort((a,b)=>{const av=a[playerSort.key],bv=b[playerSort.key];const comparison=typeof av==="string"&&typeof bv==="string"?av.localeCompare(bv,undefined,{numeric:true,sensitivity:"base"}):Number(av)-Number(bv);return comparison*(playerSort.direction==="asc"?1:-1)||b.average-a.average||a.name.localeCompare(b.name);});},[allPlayers,playerSearch,playerSort]);
 const leaders=useMemo(()=>{const e=activePlayers.filter(p=>!p.isSub);return{byAverage:[...e].sort((a,b)=>b.average-a.average||b.games-a.games).slice(0,10),byHighGame:[...e].sort((a,b)=>b.highGame-a.highGame||b.average-a.average).slice(0,10),byHighSeries:[...e].sort((a,b)=>b.highSeries-a.highSeries||b.average-a.average).slice(0,10),byPins:[...e].sort((a,b)=>b.pins-a.pins||b.games-a.games).slice(0,10)};},[activePlayers]);
 if(error)return <Alert variant="danger">Could not load the imported Beer League data: {errorMessage(error)}</Alert>;if(isLoading||!data)return <div className="d-flex align-items-center gap-2"><Spinner size="sm"/><span>Loading Beer League data…</span></div>;
 const playerSortHeader=(key:PlayerSortKey,label:string)=><SortHeader nativeButton key={key} label={label} sortKey={key} active={playerSort.key} dir={playerSort.direction} className={key==="name"||key==="teamName"?undefined:"text-end"} onSort={next=>setPlayerSort(current=>({key:next,direction:current.key===next?(current.direction==="asc"?"desc":"asc"):(next==="name"||next==="teamName"?"asc":"desc")}))}/>;
 const renderPlayerName=(p:LeaguePlayerRow)=><Link to={`/player/${p.framePlayer?.id??p.apiPlayerId}`} className="fw-semibold text-decoration-none">{p.name}</Link>;
 const leaderTable=(players:LeaguePlayerRow[],value:(p:LeaguePlayerRow)=>number,label:string)=><RankingTable compact rows={players} rowKey={p=>`${label}-${p.teamNumber}-${p.name}`} renderName={renderPlayerName} teamName={p=>p.teamName} value={p=>value(p).toLocaleString()} valueLabel={label}/>;
 return <div>
  <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-4"><div><p className="text-uppercase text-body-secondary small fw-semibold mb-1">Arapahoe Bowling Center</p><h1 className="mb-1">{data.league?.name??"Beer League"}</h1><div className="text-body-secondary">{data.league?.season} · {data.league?.day} {data.league?.time}{data.league?.week!=null&&<> · Week {data.league.week}{data.league.totalWeeks?` of ${data.league.totalWeeks}`:""}</>}</div></div><div className="text-end small text-body-secondary"><div>Sheet date: {data.league?.date??"Unknown"}</div>{data.generatedAt&&<div>Imported: {new Date(data.generatedAt).toLocaleString()}</div>}{safeArapahoeLink(data.source?.pdfUrl??undefined)&&<a href={safeArapahoeLink(data.source?.pdfUrl??undefined)} target="_blank" rel="noopener noreferrer">Open source PDF</a>}</div></div>
  <Tabs defaultActiveKey="overview" className="mb-4" mountOnEnter unmountOnExit>
   <Tab eventKey="overview" title="Overview" unmountOnExit={false}>
    <LeagueStandings standings={data.standings} teams={data.teams} sheetDate={data.league?.date}
        renderPlayerName={(teamNumber, player) => {
            const row = playerByTeamAndName.get(String(teamNumber) + ":" + normalizeName(player.name));
            return row ? renderPlayerName(row) : player.name;
        }}/>
   </Tab>
   <Tab eventKey="teams" title="Teams"><Accordion alwaysOpen>{data.teams.map((team,index)=><Accordion.Item eventKey={String(index)} key={team.number}><Accordion.Header><span className="fw-semibold me-2">#{team.number} {team.name}</span>{team.place!=null&&<span className="text-body-secondary small">· {team.division?`${team.division} · `:""}#{team.place} · {team.won}-{team.lost}</span>}</Accordion.Header><Accordion.Body className="p-0"><div className="table-responsive"><Table className="mb-0 align-middle"><thead><tr><th>Bowler</th><th className="text-end">Avg</th><th className="text-end">HDCP</th><th className="text-end">Games</th><th className="text-end">Pins</th><th className="text-end">High</th><th className="text-end">Series</th><th className="text-end d-none d-md-table-cell">Latest</th></tr></thead><tbody>{team.players.map(player=>{const row=playerByTeamAndName.get(`${team.number}:${normalizeName(player.name)}`);return <tr key={`${team.number}-${player.name}`}><td>{row?renderPlayerName(row):player.name}</td><td className="text-end">{player.average||"—"}</td><td className="text-end">{player.handicap||"—"}</td><td className="text-end">{player.games}</td><td className="text-end">{player.pins.toLocaleString()}</td><td className="text-end">{player.highGame||"—"}</td><td className="text-end">{player.highSeries||"—"}</td><td className="text-end d-none d-md-table-cell">{player.weekScoresRaw.length?player.weekScoresRaw.join(" / "):"—"}</td></tr>;})}</tbody></Table></div></Accordion.Body></Accordion.Item>)}</Accordion></Tab>
   <Tab eventKey="players" title="Players"><div className="d-flex flex-wrap gap-2 justify-content-end align-items-center mb-3"><Form.Control size="sm" type="search" value={playerSearch} onChange={e=>setPlayerSearch(e.target.value)} placeholder="Search bowler or team" style={{maxWidth:280}} aria-label="Search bowlers"/></div><Card><Card.Body className="p-0"><div className="table-responsive"><Table className="mb-0 align-middle"><thead><tr>{playerSortHeader("name","Bowler")}{playerSortHeader("teamName","Team")}{playerSortHeader("average","Avg")}{playerSortHeader("handicap","HDCP")}{playerSortHeader("games","Games")}{playerSortHeader("pins","Pins")}{playerSortHeader("highGame","High")}{playerSortHeader("highSeries","Series")}</tr></thead><tbody>{visiblePlayers.map(p=><tr key={`${p.isSub?"sub":p.teamNumber}-${p.name}`}><td>{renderPlayerName(p)}</td><td>{p.teamName}</td><td className="text-end">{p.average||"—"}</td><td className="text-end">{p.handicap||"—"}</td><td className="text-end">{p.games}</td><td className="text-end">{p.pins.toLocaleString()}</td><td className="text-end">{p.highGame||"—"}</td><td className="text-end">{p.highSeries||"—"}</td></tr>)}</tbody></Table></div></Card.Body></Card><p className="small text-body-secondary mt-2 mb-0">Every bowler name links directly to a player profile. Bowlers with frame data open their full BLS profile; website-only bowlers open their API league-sheet profile.</p></Tab>
   <Tab eventKey="leaders" title="Leaders"><Row className="g-4"><Col xs={12} xl={6}><Card className="h-100"><Card.Header className="fw-semibold">Average Leaders</Card.Header><Card.Body className="p-0">{leaderTable(leaders.byAverage,p=>p.average,"Avg")}</Card.Body></Card></Col><Col xs={12} xl={6}><Card className="h-100"><Card.Header className="fw-semibold">High Game</Card.Header><Card.Body className="p-0">{leaderTable(leaders.byHighGame,p=>p.highGame,"Game")}</Card.Body></Card></Col><Col xs={12} xl={6}><Card className="h-100"><Card.Header className="fw-semibold">High Series</Card.Header><Card.Body className="p-0">{leaderTable(leaders.byHighSeries,p=>p.highSeries,"Series")}</Card.Body></Card></Col><Col xs={12} xl={6}><Card className="h-100"><Card.Header className="fw-semibold">Total Pinfall</Card.Header><Card.Body className="p-0">{leaderTable(leaders.byPins,p=>p.pins,"Pins")}</Card.Body></Card></Col></Row></Tab>
  </Tabs>
 </div>;
};
export default BeerLeague;
